# Migração Express → Hono + GraphQL — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar a API de Express 5 para Hono (mantendo todos os endpoints REST) e adicionar um endpoint `/graphql` com graphql-yoga + Pothos cobrindo todos os domínios.

**Architecture:** Fase 1 — troca Express por Hono no `Bun.serve()`, reescrevendo middlewares e rotas com a API `Context` do Hono. Fase 2 — monta `graphql-yoga` como handler Hono em `/graphql`, com schema Pothos code-first espelhando todas as rotas REST.

**Tech Stack:** Bun, Hono, graphql-yoga, @pothos/core, Mongoose, Drizzle ORM, Redis, Zod

---

## Regras de transformação Express → Hono (referência para todos os tasks)

| Express | Hono |
|---|---|
| `import { Router } from "express"` | `import { Hono } from "hono"` |
| `const router = Router()` | `const router = new Hono<AppEnv>()` |
| `export default router` | `export default router` |
| `(req: Request, res: Response, next: NextFunction)` | `(c: Context<AppEnv>, next: Next)` |
| `(req: Request, res: Response)` em controller | `(c: Context<AppEnv>)` em controller — retorna `Response` |
| `req.body` | `await c.req.json()` (ou `await c.req.parseBody()` para form) |
| `req.params.id` | `c.req.param('id')` |
| `req.query.page` | `c.req.query('page')` |
| `req.headers['x-foo']` | `c.req.header('x-foo')` |
| `req.cookies?.name` | `getCookie(c, 'name')` (import from `hono/cookie`) |
| `req.user` | `c.get('user')` |
| `req.codexAccessToken` | `c.get('codexAccessToken')` |
| `req.ip` | `c.req.header('x-forwarded-for') \|\| ''` |
| `req.method` | `c.req.method` |
| `req.path` / `req.originalUrl` | `new URL(c.req.url).pathname` |
| `req.hostname` | `new URL(c.req.url).hostname` |
| `res.json(data)` | `return c.json(data)` |
| `res.status(n).json(data)` | `return c.json(data, n)` |
| `res.status(n).send(text)` | `return c.text(text, n)` |
| `next()` | `await next()` |
| `next(error)` ou `throw` | `throw error` (Hono captura async errors) |
| `return res.status(n).json(...)` | `return c.json(..., n)` (sem `return` extra, Hono retorna `Response`) |
| `app.use(errorHandler)` | `app.onError((err, c) => ...)` |
| `router.get('/path', mw1, mw2, handler)` | `router.get('/path', mw1, mw2, handler)` (igual) |

Controllers passam a ter assinatura `(c: Context<AppEnv>): Promise<Response>` em vez de `void`.
Rotas passam a usar `new Hono<AppEnv>()` e os handlers retornam `Response`.
`asyncHandler` é deletado — Hono já lida com async nativo.

---

## Fase 1 — Migração para Hono

### Task 1: Instalar Hono e criar tipos compartilhados

**Files:**
- Modify: `api/package.json`
- Create: `api/src/types/hono.ts`
- Delete: `api/src/types/express.d.ts`
- Delete: `api/src/lib/async-handler.ts`

- [ ] **Step 1: Adicionar Hono e remover express-rate-limit**

```bash
cd api
bun add hono
bun remove express express-rate-limit compression cookie-parser cors
bun remove @types/express @types/cors @types/cookie-parser
# NÃO remover express ainda — outros arquivos ainda importam. Vai ser removido no Task 14.
# Por hora, só adiciona hono:
bun add hono
```

- [ ] **Step 2: Criar `api/src/types/hono.ts`**

```typescript
import type { AdminAccessTokenSummary } from "../lib/admin-access-token";

export interface AuthUserPayload {
  id: string;
  username: string;
  email?: string | null;
  role: "user" | "admin";
  exp?: number;
  iat?: number;
  authType?: "session" | "token" | "service";
  tokenPermissions?: string[];
}

export type Variables = {
  user: AuthUserPayload;
  codexAccessToken: AdminAccessTokenSummary;
};

export type AppEnv = { Variables: Variables };
```

- [ ] **Step 3: Verificar que o arquivo foi criado corretamente**

```bash
cat api/src/types/hono.ts
```

- [ ] **Step 4: Commit**

```bash
git add api/package.json api/bun.lock api/src/types/hono.ts
git commit -m "chore: instalar hono + criar tipos AppEnv/AuthUserPayload"
```

---

### Task 2: Reescrever middlewares de autenticação e autorização

**Files:**
- Modify: `api/src/middlewares/auth.middleware.ts`
- Modify: `api/src/middlewares/jwe.ts`
- Modify: `api/src/middlewares/codex-service-auth.ts`
- Modify: `api/src/middlewares/codex-access.ts`
- Modify: `api/src/middlewares/role.ts`
- Modify: `api/src/middlewares/require-permission.ts`
- Modify: `api/src/middlewares/error-handler.ts`

- [ ] **Step 1: Reescrever `auth.middleware.ts`**

```typescript
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";
import { verifySessionToken } from "../lib/session-token";

const ADMIN_ROLE = 1;

export async function verifyJWT(c: Context<AppEnv>, next: Next) {
  const token = c.req.header("authorization")?.split(" ")[1];
  if (!token) return c.json({ message: "Token missing" }, 401);

  const session = await verifySessionToken(token, process.env.JWT_SECRET!);
  if (!session) return c.json({ message: "Invalid token" }, 403);

  c.set("user", {
    id: String(session.userId),
    username: session.login,
    email: session.email,
    role: session.role === ADMIN_ROLE ? "admin" : "user",
    authType: "session",
  });
  await next();
}

export async function basicAuth(c: Context<AppEnv>, next: Next) {
  const auth = c.req.header("authorization");
  if (!auth?.startsWith("Basic ")) return c.json({ message: "Missing Basic Auth" }, 401);

  const b64 = auth.split(" ")[1];
  if (!b64) return c.json({ message: "Usuário ou senha incorreta" }, 401);

  const decoded = Buffer.from(b64, "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user === process.env.BASIC_AUTH_USER && pass === process.env.BASIC_AUTH_PASS) {
    await next();
    return;
  }
  return c.json({ message: "Invalid Basic Auth" }, 403);
}
```

- [ ] **Step 2: Reescrever `jwe.ts`**

```typescript
import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../types/hono";
import { verifySessionToken } from "../lib/session-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

export async function verifyJWT(c: Context<AppEnv>, next: Next) {
  let token: string | undefined = getCookie(c, AUTH_COOKIE_NAME);

  if (!token) {
    const authHeader = c.req.header("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }
  }

  if (!token) return c.json({ message: "Missing token" }, 401);

  const session = await verifySessionToken(token, process.env.JWT_SECRET!);
  if (!session) return c.json({ message: "Invalid or expired token" }, 403);

  c.set("user", {
    id: String(session.userId),
    username: session.login,
    email: session.email,
    role: session.role === ADMIN_ROLE ? "admin" : "user",
    authType: "session",
  });
  await next();
}
```

- [ ] **Step 3: Reescrever `codex-service-auth.ts`**

```typescript
import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../types/hono";
import { readCodexServiceTokenFromRequest, resolveCodexServiceToken } from "../lib/codex-service-token";
import { verifySessionToken } from "../lib/session-token";
import { authenticateUserAccessToken, hashUserAccessToken, logUserTokenUsage } from "../lib/user-access-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

function readAuthToken(c: Context<AppEnv>): string | null {
  const cookieToken = getCookie(c, AUTH_COOKIE_NAME);
  if (typeof cookieToken === "string" && cookieToken.trim()) return cookieToken.trim();
  const authHeader = c.req.header("authorization");
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return null;
}

export async function verifyJWTOrCodexServiceToken(c: Context<AppEnv>, next: Next) {
  const authToken = readAuthToken(c);

  if (authToken) {
    const session = await verifySessionToken(authToken, process.env.JWT_SECRET!);
    if (session) {
      c.set("user", {
        id: String(session.userId),
        username: session.login,
        email: session.email,
        role: session.role === ADMIN_ROLE ? "admin" : "user",
        authType: "session",
      });
      await next();
      return;
    }
  }

  const serviceToken = readCodexServiceTokenFromRequest({
    authorization: c.req.header("authorization"),
    "x-codex-access-token": c.req.header("x-codex-access-token"),
  });

  if (serviceToken && serviceToken === resolveCodexServiceToken()) {
    const delegatedUserId = c.req.header("x-codex-user-id")?.trim() ?? "";

    if (!delegatedUserId) {
      c.set("user", { id: "codex-service", username: "codex-agent", role: "admin", authType: "service" });
      await next();
      return;
    }

    const delegatedToken = c.req.header("x-codex-user-token");
    if (delegatedToken) {
      const session = await verifySessionToken(delegatedToken, process.env.JWT_SECRET!);
      if (session) {
        c.set("user", {
          id: String(session.userId),
          username: session.login,
          email: session.email,
          role: session.role === ADMIN_ROLE ? "admin" : "user",
          authType: "service",
        });
        await next();
        return;
      }
    }
    return c.json({ message: "Invalid delegated user" }, 403);
  }

  if (authToken) {
    const authenticatedUserToken = await authenticateUserAccessToken(authToken);
    if (authenticatedUserToken) {
      c.set("user", {
        ...authenticatedUserToken.user,
        authType: "token",
        tokenPermissions: authenticatedUserToken.token.permissions ?? [],
      });
      void logUserTokenUsage({
        tokenId: authenticatedUserToken.token.id,
        tokenHash: hashUserAccessToken(authToken),
        userId: authenticatedUserToken.token.userId,
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: c.req.header("user-agent") ?? null,
      });
      await next();
      return;
    }
  }

  if (!authToken && !serviceToken) return c.json({ message: "Missing token" }, 401);
  return c.json({ message: "Invalid or expired token" }, 403);
}
```

- [ ] **Step 4: Reescrever `codex-access.ts`**

```typescript
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";
import { resolveCodexServiceToken } from "../lib/codex-service-token";

export async function requireCodexAccessToken(c: Context<AppEnv>, next: Next) {
  if (!c.get("user")?.id) return c.json({ message: "Missing token" }, 401);
  if (!resolveCodexServiceToken()) {
    return c.json({ message: "Codex sem credencial delegada ativa no servidor." }, 503);
  }
  await next();
}
```

- [ ] **Step 5: Reescrever `role.ts`**

```typescript
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";

export function requireRole(role: "user" | "admin") {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("user");
    if (!user || user.role !== role) return c.json({ message: "Forbidden: incorrect role" }, 403);
    await next();
  };
}
```

- [ ] **Step 6: Reescrever `require-permission.ts`**

```typescript
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";
import { hasTokenPermission, type TokenScope } from "../lib/token-permissions";

export function requirePermission(scope: TokenScope) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("user");
    if (!user) return c.json({ message: "Não autenticado" }, 401);
    if (user.authType === "session" || user.authType === "service") {
      await next();
      return;
    }
    const perms = user.tokenPermissions ?? [];
    if (!hasTokenPermission(perms, scope)) {
      return c.json({ message: "Permissão insuficiente para esta operação" }, 403);
    }
    await next();
  };
}
```

- [ ] **Step 7: Reescrever `error-handler.ts`**

```typescript
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { AppError } from "../lib/app-error";

export function errorHandler(err: Error, c: Context<AppEnv>) {
  if (err instanceof AppError) return c.json({ message: err.message }, err.statusCode);
  console.error("Unhandled error:", err);
  return c.json({ message: "Erro interno do servidor" }, 500);
}
```

- [ ] **Step 8: Deletar `async-handler.ts`**

```bash
rm api/src/lib/async-handler.ts
```

- [ ] **Step 9: Commit**

```bash
git add api/src/middlewares/ api/src/lib/async-handler.ts
git commit -m "refactor: reescrever middlewares de auth/role para Hono Context"
```

---

### Task 3: Reescrever middleware de request-logs e rate-limit

**Files:**
- Modify: `api/src/middlewares/request-logs.ts`
- Modify: `api/src/middlewares/rate-limit.ts`

- [ ] **Step 1: Reescrever `request-logs.ts`**

O Hono não tem `res.json` interceptável diretamente. A solução é usar `c.res` após o `next()`:

```typescript
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";
import mongoose from "mongoose";

const LOGS_DB_NAME = process.env.LOGS_MONGO_DB_NAME?.trim() || "logs";
const LOGS_HTTP_COLLECTION = process.env.LOGS_HTTP_COLLECTION?.trim() || "santos_tech_home_logs";
const LOGS_ROUTE_BLACKLIST = new Set(
  (process.env.LOGS_ROUTE_BLACKLIST?.split(",") || ["/api/logs", "/api/portal/recents"])
    .map((r) => r.trim()).filter(Boolean),
);
const LOGS_GET_ROUTE_BLACKLIST = new Set(
  (process.env.LOGS_GET_ROUTE_BLACKLIST?.split(",") || ["/api/user/me", "/api/vct", "/api/health/sse"])
    .map((r) => r.trim()).filter(Boolean),
);

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /pass(word)?|token|secret|authorization|cookie|session|key/i;

type JsonLike = null | string | number | boolean | JsonLike[] | { [key: string]: JsonLike };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sanitizeValue(value: unknown, seen = new WeakSet<object>()): JsonLike {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (Array.isArray(value)) return value.map((e) => sanitizeValue(e, seen));
  if (!isPlainObject(value)) return String(value);
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  const result: Record<string, JsonLike> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeValue(entry, seen);
  }
  return result;
}

function getLogsCollection() {
  return mongoose.connection.getClient().db(LOGS_DB_NAME).collection(LOGS_HTTP_COLLECTION);
}

export async function requestLogsMiddleware(c: Context<AppEnv>, next: Next) {
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  const method = c.req.method;

  const skipAll = Array.from(LOGS_ROUTE_BLACKLIST).some((r) => pathname.startsWith(r));
  const skipGet = method === "GET" && Array.from(LOGS_GET_ROUTE_BLACKLIST).some((r) => pathname.startsWith(r));
  if (skipAll || skipGet) { await next(); return; }

  const startedAt = Date.now();
  let body: unknown = null;
  if (method !== "GET" && method !== "HEAD") {
    try { body = await c.req.json(); } catch { body = null; }
  }

  await next();

  const statusCode = c.res.status;
  if (method === "GET" && statusCode < 400) return;

  let responseBody: unknown = null;
  try {
    const clone = c.res.clone();
    const ct = clone.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) responseBody = await clone.json();
  } catch { /* ignore */ }

  const user = c.get("user");
  const logEntry = {
    type: "http_request",
    occurredAt: new Date().toISOString(),
    method,
    url: c.req.url,
    path: pathname,
    route: pathname,
    statusCode,
    durationMs: Date.now() - startedAt,
    ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    hostname: url.hostname,
    userAgent: c.req.header("user-agent") ?? null,
    user: user ? { id: user.id, name: user.username, email: user.email ?? null, role: user.role } : null,
    requestBody: sanitizeValue(body),
    responseBody: sanitizeValue(responseBody),
  };

  void getLogsCollection().insertOne(logEntry).catch((err) => {
    console.error(`Falha ao salvar log HTTP: ${err instanceof Error ? err.message : String(err)}`);
  });
}
```

- [ ] **Step 2: Reescrever `rate-limit.ts`**

Hono tem `hono/utils/ipaddr` mas não tem rate-limiter built-in. Implementar um limiter simples em memória usando Map (suficiente para o volume desta API):

```typescript
import type { Context, Next } from "hono";
import type { AppEnv } from "../types/hono";

type WindowEntry = { count: number; resetAt: number };

function createLimiter(opts: { windowMs: number; max: number; message: string }) {
  const store = new Map<string, WindowEntry>();

  return async (c: Context<AppEnv>, next: Next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      ?? c.req.header("x-real-ip")
      ?? "unknown";
    const now = Date.now();
    let entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      store.set(ip, entry);
    }

    entry.count++;
    c.header("X-RateLimit-Limit", String(opts.max));
    c.header("X-RateLimit-Remaining", String(Math.max(0, opts.max - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > opts.max) return c.json({ message: opts.message }, 429);
    await next();
  };
}

export const authLoginLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: "Muitas tentativas de login. Tente novamente em 1 minuto.",
});

export const authRegisterLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: "Muitas tentativas de registro. Tente novamente em 1 minuto.",
});

export const ssoExchangeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Muitas tentativas de troca SSO. Tente novamente em 1 minuto.",
});
```

- [ ] **Step 3: Commit**

```bash
git add api/src/middlewares/request-logs.ts api/src/middlewares/rate-limit.ts
git commit -m "refactor: reescrever request-logs e rate-limit para Hono"
```

---

### Task 4: Portar controllers de auth, user e dev-login

**Files:**
- Modify: `api/src/controllers/auth.controller.ts`
- Modify: `api/src/controllers/user.controller.ts`
- Modify: `api/src/controllers/dev-login.controller.ts`
- Modify: `api/src/routes/auth.routes.ts`
- Modify: `api/src/routes/dev-login.routes.ts`

- [ ] **Step 1: Verificar controllers atuais que precisam de mudança**

```bash
grep -n "req\.\|res\.\|Request\|Response\|NextFunction" api/src/controllers/auth.controller.ts | head -20
grep -n "req\.\|res\.\|Request\|Response\|NextFunction" api/src/controllers/dev-login.controller.ts | head -20
```

- [ ] **Step 2: Atualizar `auth.controller.ts`**

Aplicar as regras de transformação da seção de referência. Importar `Context` do `hono`, `AppEnv` de `../types/hono`. Remover imports do Express. Trocar `req.X` por `c.req.X`, `res.json()` por `return c.json()`, `next(err)` por `throw err`. Assinatura de cada função exportada: `(c: Context<AppEnv>): Promise<Response>`.

Exemplo da função de logout (adapt para o padrão completo do arquivo):
```typescript
import type { Context } from "hono";
import { deleteCookie } from "hono/cookie";
import type { AppEnv } from "../types/hono";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";

export async function logout(c: Context<AppEnv>): Promise<Response> {
  deleteCookie(c, AUTH_COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "Lax" });
  return c.json({ ok: true, message: "Logout realizado com sucesso." });
}
```

- [ ] **Step 3: Atualizar `user.controller.ts`**

Trocar toda assinatura `(req: Request, res: Response)` por `(c: Context<AppEnv>)`:
- `req.user?.id` → `c.get("user")?.id`
- `req.body?.X` → `(await c.req.json())?.X`
- `res.json(...)` → `return c.json(...)`
- `res.status(n).json(...)` → `return c.json(..., n)`

Cabeçalho do arquivo:
```typescript
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
// (remover: import type { Request, Response } from "express")
```

- [ ] **Step 4: Atualizar `dev-login.controller.ts`**

Aplicar mesma transformação. Importante: `setCookie` via `hono/cookie`:
```typescript
import { setCookie } from "hono/cookie";
// Em vez de: res.cookie(AUTH_COOKIE_NAME, token, { httpOnly: true, ... })
// Usar:       setCookie(c, AUTH_COOKIE_NAME, token, { httpOnly: true, sameSite: "Lax", path: "/" })
```

- [ ] **Step 5: Reescrever `auth.routes.ts`**

```typescript
import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { logout } from "../controllers/auth.controller";

const router = new Hono<AppEnv>();
router.post("/logout", logout);
export default router;
```

- [ ] **Step 6: Reescrever `dev-login.routes.ts`**

```typescript
import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { devLogin } from "../controllers/dev-login.controller";
import { authLoginLimiter } from "../middlewares/rate-limit";

const router = new Hono<AppEnv>();
router.post("/login", authLoginLimiter, devLogin);
export default router;
```

- [ ] **Step 7: Commit**

```bash
git add api/src/controllers/auth.controller.ts api/src/controllers/user.controller.ts api/src/controllers/dev-login.controller.ts api/src/routes/auth.routes.ts api/src/routes/dev-login.routes.ts
git commit -m "refactor: portar auth/user/dev-login controllers e rotas para Hono"
```

---

### Task 5: Portar controllers de admin, dashboard, projects e logs

**Files:**
- Modify: `api/src/controllers/admin.controller.ts`
- Modify: `api/src/controllers/admin-r2.controller.ts`
- Modify: `api/src/controllers/admin-site-publisher.controller.ts`
- Modify: `api/src/controllers/admin-access-token.controller.ts`
- Modify: `api/src/controllers/dashboard.controller.ts`
- Modify: `api/src/controllers/projects.controller.ts`
- Modify: `api/src/controllers/logs.controller.ts`
- Modify: `api/src/routes/admin.routes.ts`
- Modify: `api/src/routes/dashboard.routes.ts`
- Modify: `api/src/routes/projects.routes.ts`
- Modify: `api/src/routes/logs.routes.ts`

- [ ] **Step 1: Verificar imports e padrões dos controllers**

```bash
grep -n "multer\|req\.file\|req\.files" api/src/controllers/admin-r2.controller.ts | head -10
```

- [ ] **Step 2: Atualizar `admin.controller.ts`, `admin-access-token.controller.ts`, `dashboard.controller.ts`, `projects.controller.ts`, `logs.controller.ts`**

Aplicar as regras de transformação da seção de referência para cada arquivo. O padrão é idêntico ao Task 4:
- Trocar imports Express por `Context` do `hono` e `AppEnv` de `../types/hono`
- Assinatura `(c: Context<AppEnv>): Promise<Response>`
- `req.X` → equivalente Hono conforme tabela de referência

- [ ] **Step 3: Atualizar `admin-r2.controller.ts` (upload de arquivos)**

O `admin-r2.controller.ts` usa `multer`. O Hono lida com multipart via `c.req.parseBody()`:

```typescript
// Em vez de: req.file (injetado pelo multer)
// Usar:
const body = await c.req.parseBody();
const file = body["file"]; // File | string
if (!(file instanceof File)) return c.json({ message: "Arquivo não enviado" }, 400);
const buffer = Buffer.from(await file.arrayBuffer());
const filename = file.name;
```

Remover toda referência a `multer` e `req.file`. O middleware `multer()` na rota também é removido.

- [ ] **Step 4: Atualizar `admin-site-publisher.controller.ts`**

Aplicar transformação padrão. Verificar se usa `req.body` para receber JSON ou form-data.

- [ ] **Step 5: Reescrever as 4 rotas**

`admin.routes.ts`:
```typescript
import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";
// (importar controllers do admin)

const router = new Hono<AppEnv>();
router.use(verifyJWTOrCodexServiceToken, requireRole("admin"));
// (montar rotas conforme admin.routes.ts original)
export default router;
```

`dashboard.routes.ts`, `projects.routes.ts`, `logs.routes.ts`: mesmo padrão, copiando paths e middlewares do arquivo Express original mas com `new Hono<AppEnv>()`.

- [ ] **Step 6: Commit**

```bash
git add api/src/controllers/admin*.ts api/src/controllers/dashboard.controller.ts api/src/controllers/projects.controller.ts api/src/controllers/logs.controller.ts api/src/routes/admin.routes.ts api/src/routes/dashboard.routes.ts api/src/routes/projects.routes.ts api/src/routes/logs.routes.ts
git commit -m "refactor: portar admin/dashboard/projects/logs controllers e rotas para Hono"
```

---

### Task 6: Portar controllers de codex, user-access-token e portal

**Files:**
- Modify: `api/src/controllers/codex.controller.ts`
- Modify: `api/src/controllers/user-access-token.controller.ts`
- Modify: `api/src/controllers/portal-recents.controller.ts`
- Modify: `api/src/routes/codex.routes.ts`
- Modify: `api/src/routes/portal.routes.ts`

- [ ] **Step 1: Atualizar `codex.controller.ts`**

Aplicar transformação padrão. Importar `Context` do `hono`, `AppEnv` de `../types/hono`. O controller usa `req.user` e `req.body` — trocar por `c.get("user")` e `await c.req.json()`.

- [ ] **Step 2: Atualizar `user-access-token.controller.ts`**

Aplicar transformação padrão. `req.params.tokenId` → `c.req.param("tokenId")`.

- [ ] **Step 3: Atualizar `portal-recents.controller.ts`**

Aplicar transformação padrão.

- [ ] **Step 4: Reescrever `codex.routes.ts`**

```typescript
import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
import { getCodexAccount, listCodexTools, listCodexThreads, logoutCodex, readCodexThread, runCodexTool } from "../controllers/codex.controller";
import { requireCodexAccessToken } from "../middlewares/codex-access";
import { verifyJWTOrCodexServiceToken } from "../middlewares/codex-service-auth";
import { requireRole } from "../middlewares/role";

const router = new Hono<AppEnv>();
router.use(verifyJWTOrCodexServiceToken, requireRole("admin"), requireCodexAccessToken);
router.get("/account", getCodexAccount);
router.post("/account/logout", logoutCodex);
router.get("/tools", listCodexTools);
router.post("/tools/:toolId/run", runCodexTool);
router.get("/threads", listCodexThreads);
router.get("/threads/:threadId", readCodexThread);
export default router;
```

- [ ] **Step 5: Reescrever `portal.routes.ts`** (mesmo padrão)

- [ ] **Step 6: Commit**

```bash
git add api/src/controllers/codex.controller.ts api/src/controllers/user-access-token.controller.ts api/src/controllers/portal-recents.controller.ts api/src/routes/codex.routes.ts api/src/routes/portal.routes.ts
git commit -m "refactor: portar codex/user-tokens/portal controllers e rotas para Hono"
```

---

### Task 7: Portar controllers de corujão

**Files:**
- Modify: `api/src/controllers/corujao.controller.ts`
- Modify: `api/src/controllers/corujao-sessoes.controller.ts`
- Modify: `api/src/controllers/corujao-visitas.controller.ts`
- Modify: `api/src/controllers/corujao-painel.controller.ts`
- Modify: `api/src/controllers/corujao-colaboradores.controller.ts`
- Modify: `api/src/controllers/corujao-vagas.controller.ts`
- Modify: `api/src/routes/corujao.routes.ts`
- Modify: `api/src/routes/corujao-public.routes.ts`

- [ ] **Step 1: Atualizar todos os controllers de corujão**

Aplicar transformação padrão em cada arquivo:
- Trocar imports Express
- Assinatura `(c: Context<AppEnv>): Promise<Response>`
- `req.body` → `await c.req.json()`
- `req.params.X` → `c.req.param('X')`
- `req.query.X` → `c.req.query('X')`
- `res.json(X)` → `return c.json(X)`
- `res.status(n).json(X)` → `return c.json(X, n)`

Em `corujao-vagas.controller.ts`, nota sobre timing attack (documentado na PR #13): o `!==` para comparar o secret continua igual à versão Express (melhoria de segurança é trabalho separado).

- [ ] **Step 2: Reescrever `corujao.routes.ts` e `corujao-public.routes.ts`**

```typescript
// corujao.routes.ts
import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
// (importar controllers e middlewares conforme original)
const router = new Hono<AppEnv>();
// (montar rotas com mesmos paths e middlewares do original Express)
export default router;
```

```typescript
// corujao-public.routes.ts
import { Hono } from "hono";
import type { AppEnv } from "../types/hono";
const router = new Hono<AppEnv>();
// (montar rotas públicas conforme original)
export default router;
```

- [ ] **Step 3: Commit**

```bash
git add api/src/controllers/corujao*.ts api/src/routes/corujao*.ts
git commit -m "refactor: portar controllers e rotas do corujão para Hono"
```

---

### Task 8: Portar controllers de VCT, valorant, checkout, email e analytics

**Files:**
- Modify: `api/src/controllers/vct.controller.ts`
- Modify: `api/src/controllers/vct-formacoes.controller.ts`
- Modify: `api/src/controllers/analytics.controller.ts`
- Modify: `api/src/controllers/checkout.controller.ts`
- Modify: `api/src/controllers/email.controller.ts`
- Modify: `api/src/controllers/sso.controller.ts`
- Modify: `api/src/routes/vct.routes.ts`
- Modify: `api/src/routes/valorant.routes.ts`
- Modify: `api/src/routes/analytics.routes.ts`
- Modify: `api/src/routes/checkout.routes.ts`
- Modify: `api/src/routes/email.routes.ts`
- Modify: `api/src/routes/sso.routes.ts`

- [ ] **Step 1: Atualizar `vct.controller.ts` e `vct-formacoes.controller.ts`**

Aplicar transformação padrão. `req.params.timeId` → `c.req.param('timeId')`, etc.

- [ ] **Step 2: Atualizar `checkout.controller.ts`**

Este é o maior controller (877 linhas). Aplicar transformação padrão sistematicamente. Atenção especial a:
- `req.body` em múltiplos handlers → `await c.req.json()`
- `req.params.X` → `c.req.param('X')`
- Todo `return res.status(n).json(...)` → `return c.json(..., n)`

- [ ] **Step 3: Atualizar `analytics.controller.ts`, `email.controller.ts`, `sso.controller.ts`**

Aplicar transformação padrão.

- [ ] **Step 4: Reescrever todas as rotas correspondentes**

Para cada arquivo de rota: trocar `Router()` por `new Hono<AppEnv>()`, manter mesmos paths e middlewares.

- [ ] **Step 5: Commit**

```bash
git add api/src/controllers/vct*.ts api/src/controllers/analytics.controller.ts api/src/controllers/checkout.controller.ts api/src/controllers/email.controller.ts api/src/controllers/sso.controller.ts api/src/routes/vct.routes.ts api/src/routes/valorant.routes.ts api/src/routes/analytics.routes.ts api/src/routes/checkout.routes.ts api/src/routes/email.routes.ts api/src/routes/sso.routes.ts
git commit -m "refactor: portar controllers e rotas de VCT/checkout/email/analytics para Hono"
```

---

### Task 9: Portar SSE endpoints para Hono streamSSE

**Files:**
- Modify: `api/src/lib/health-sse.ts`
- Modify: `api/src/lib/vagas-sse.ts`

- [ ] **Step 1: Reescrever `health-sse.ts`**

```typescript
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

const HEARTBEAT_INTERVAL_MS = 30_000;

let broadcastFn: (() => void) | null = null;
const streamClosers = new Set<() => void>();

export function addHealthClient(c: Context<AppEnv>) {
  return streamSSE(c, async (stream) => {
    stream.writeSSE({ data: JSON.stringify({ serverTs: Date.now() }) });

    const interval = setInterval(() => {
      stream.writeSSE({ data: JSON.stringify({ serverTs: Date.now() }) });
    }, HEARTBEAT_INTERVAL_MS);

    streamClosers.add(() => clearInterval(interval));
    stream.onAbort(() => {
      clearInterval(interval);
      streamClosers.delete(() => clearInterval(interval));
    });

    // manter stream aberto
    await new Promise<void>((resolve) => stream.onAbort(resolve));
  });
}

export function startHealthBroadcast() { /* no-op: cada stream tem seu próprio intervalo */ }
export function stopHealthBroadcast() {
  for (const close of streamClosers) close();
  streamClosers.clear();
}
```

- [ ] **Step 2: Reescrever `vagas-sse.ts`**

```typescript
import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import { getVagasPayload } from "./vagas-sse"; // manter getVagasPayload sem mudança

export function addClient(c: Context<AppEnv>) {
  return streamSSE(c, async (stream) => {
    const payload = await getVagasPayload();
    stream.writeSSE({ event: "vagas-update", data: JSON.stringify(payload) });

    // stream fica aberto aguardando abort (broadcasts vêm de broadcast())
    await new Promise<void>((resolve) => stream.onAbort(resolve));
  });
}
```

Manter `getVagasPayload()` e `broadcast()` sem alteração — `broadcast()` ainda emite para clients registrados externamente se necessário, ou pode ser removido e delegado ao SSE via polling na Fase 2 (Subscriptions).

- [ ] **Step 3: Commit**

```bash
git add api/src/lib/health-sse.ts api/src/lib/vagas-sse.ts
git commit -m "refactor: portar SSE endpoints para hono/streaming"
```

---

### Task 10: Reescrever Codex WebSocket gateway para Bun native WS

**Files:**
- Modify: `api/src/lib/codex.ts`

Este é o task mais complexo da Fase 1. O gateway atual usa `ws.WebSocketServer` acoplado ao `http.Server`. Bun tem WebSocket nativo.

- [ ] **Step 1: Ler o `codex.ts` atual completo**

```bash
wc -l api/src/lib/codex.ts
cat api/src/lib/codex.ts
```

- [ ] **Step 2: Entender o protocolo atual**

O Codex gateway:
1. Na conexão WS, lê o token de auth do cookie/header da request de upgrade
2. Verifica o JWT → associa `userId` ao socket
3. Cria/carrega uma `CodexThreadSession` para o userId
4. Recebe mensagens JSON-RPC do cliente (ex: `{ method: "sendMessage", params: {...} }`)
5. Spawna o processo Codex CLI, streaming resultado de volta via WS
6. Mantém estado do thread em MongoDB

- [ ] **Step 3: Criar interface Bun-compatível para o gateway**

O `codex.ts` deve exportar três funções para o Bun WebSocket server:

```typescript
import type { ServerWebSocket } from "bun";

type WsData = {
  userId: string;
  username: string;
  email: string | null;
  role: "user" | "admin";
  threadSessionId?: string;
};

export type CodexWs = ServerWebSocket<WsData>;

export async function codexWsOpen(ws: CodexWs): Promise<void> {
  // inicializa sessão, carrega thread do MongoDB
}

export async function codexWsMessage(ws: CodexWs, message: string | Buffer): Promise<void> {
  // processa JSON-RPC do cliente
}

export function codexWsClose(ws: CodexWs): void {
  // cleanup da sessão
}
```

- [ ] **Step 4: Criar rota Hono para upgrade WebSocket**

Em `codex.routes.ts`, adicionar:

```typescript
import type { BunServer } from "../types/hono"; // será injetado via server ref

// Este handler é montado no server.ts
// A rota autentica e depois chama server.upgrade()
export function createCodexWsUpgradeHandler(getServer: () => ReturnType<typeof Bun.serve>) {
  return async (c: Context<AppEnv>) => {
    const user = c.get("user");
    if (!user) return c.json({ message: "Unauthorized" }, 401);

    const server = getServer();
    const upgraded = server.upgrade(c.req.raw, {
      data: {
        userId: user.id,
        username: user.username,
        email: user.email ?? null,
        role: user.role,
      } satisfies import("../lib/codex").CodexWs["data"],
    });

    if (!upgraded) return c.json({ message: "WebSocket upgrade failed" }, 400);
    // não retornar nada — Bun assume o controle da resposta
    return new Response(null, { status: 101 }); // satisfaz o type checker
  };
}
```

- [ ] **Step 5: Adaptar lógica interna do `codex.ts`**

Dentro das funções `codexWsOpen/Message/Close`, substituir chamadas da API `ws.WebSocket` (eventos/callbacks) pelo padrão Bun:

| `ws` (lib) | Bun `ServerWebSocket` |
|---|---|
| `ws.send(data)` | `ws.send(data)` (igual) |
| `ws.close()` | `ws.close()` (igual) |
| `ws.on('close', fn)` | handler `codexWsClose` |
| `ws.on('message', fn)` | handler `codexWsMessage` |

A lógica de `buildCodexAgentRuntimeState`, `buildCodexOperationalPrompt`, etc. **não muda**.

- [ ] **Step 6: Remover `attachCodexGateway` e a dependência `ws`**

```bash
bun remove ws @types/ws
```

- [ ] **Step 7: Commit**

```bash
git add api/src/lib/codex.ts api/src/routes/codex.routes.ts
git commit -m "refactor: migrar Codex WebSocket gateway de ws para Bun native WS"
```

---

### Task 11: Reescrever `server.ts` com Hono + Bun.serve()

**Files:**
- Modify: `api/src/server.ts`

- [ ] **Step 1: Reescrever `server.ts`**

```typescript
import dns from "node:dns/promises";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import mongoose from "mongoose";
import dotenv from "dotenv";

import { AppEnv } from "./types/hono";
import { errorHandler } from "./middlewares/error-handler";
import { requestLogsMiddleware } from "./middlewares/request-logs";
import { verifyJWTOrCodexServiceToken } from "./middlewares/codex-service-auth";
import { requireRole } from "./middlewares/role";

import authRoutes from "./routes/auth.routes";
import devLoginRoutes from "./routes/dev-login.routes";
import adminRoutes from "./routes/admin.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import projectRoutes from "./routes/projects.routes";
import logsRoutes from "./routes/logs.routes";
import valorantRoutes from "./routes/valorant.routes";
import vctRoutes from "./routes/vct.routes";
import codexRoutes from "./routes/codex.routes";
import portalRoutes from "./routes/portal.routes";
import checkoutRoutes from "./routes/checkout.routes";
import corujaoRoutes from "./routes/corujao.routes";
import corujaoPublicRoutes from "./routes/corujao-public.routes";
import emailRoutes from "./routes/email.routes";
import analyticsRoutes from "./routes/analytics.routes";

import { startPortalRecentsFlushLoop, stopPortalRecentsFlushLoop } from "./lib/portal-recents-store";
import { startHealthBroadcast, stopHealthBroadcast, addHealthClient } from "./lib/health-sse";
import { addClient as addVagasClient } from "./lib/vagas-sse";
import {
  getCurrentUser,
  updateCurrentUserProfile,
  updateCurrentUserPreferences,
} from "./controllers/user.controller";
import {
  createUserAccessTokenHandler,
  getUserTokenUsageHandler,
  listUserAccessTokensHandler,
  revokeUserAccessTokenHandler,
} from "./controllers/user-access-token.controller";
import {
  codexWsOpen,
  codexWsMessage,
  codexWsClose,
  type CodexWs,
} from "./lib/codex";
import { createCodexWsUpgradeHandler } from "./routes/codex.routes";
import { validateEnv } from "./config/env";

dotenv.config();
validateEnv();

process.on("uncaughtException", (err) => console.error("[process] uncaughtException:", err));
process.on("unhandledRejection", (reason) => console.error("[process] unhandledRejection:", reason));

const isProduction = process.env.NODE_ENV === "production";
const baseAllowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
const allowedOrigins = isProduction
  ? baseAllowedOrigins
  : Array.from(new Set([
      ...baseAllowedOrigins,
      "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173",
      "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002", "http://127.0.0.1:5173",
    ]));

const app = new Hono<AppEnv>();

app.use(cors({
  origin: (origin) => {
    if (!origin) return origin;
    if (allowedOrigins.includes(origin)) return origin;
    if (!isProduction) {
      try {
        const url = new URL(origin);
        if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return origin;
      } catch { /* ignore */ }
    }
    return null;
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.use(compress({ encoding: "gzip" }));
app.use(requestLogsMiddleware);

// Rotas públicas e SSE
app.get("/api/health/sse", addHealthClient);
app.get("/api/corujao/public/vagas-sse", addVagasClient);
app.get("/api", (c) => c.json({ message: "Backend rodando!" }));

// Auth
app.route("/api/auth", authRoutes);
if (!isProduction) {
  app.route("/api/dev", devLoginRoutes);
  console.log("⚠️  Dev login bypass habilitado em POST /api/dev/login");
}

// Rotas autenticadas
app.route("/api/admin", adminRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/projects", projectRoutes);
app.route("/api/logs", logsRoutes);
app.route("/api/valorant-account", valorantRoutes);
app.route("/api/vct", vctRoutes);
app.route("/api/codex", codexRoutes);
app.route("/api/portal", portalRoutes);
app.route("/api/checkout", checkoutRoutes);
app.route("/api/corujao/public", corujaoPublicRoutes);
app.route("/api/corujao", corujaoRoutes);
app.route("/api/email", emailRoutes);
app.route("/api/analytics", analyticsRoutes);

// User routes inline
app.get("/api/user/me", verifyJWTOrCodexServiceToken, getCurrentUser);
app.put("/api/user/profile", verifyJWTOrCodexServiceToken, updateCurrentUserProfile);
app.put("/api/user/preferences", verifyJWTOrCodexServiceToken, updateCurrentUserPreferences);
app.get("/api/user/tokens", verifyJWTOrCodexServiceToken, listUserAccessTokensHandler);
app.post("/api/user/tokens", verifyJWTOrCodexServiceToken, createUserAccessTokenHandler);
app.post("/api/user/tokens/:tokenId/revoke", verifyJWTOrCodexServiceToken, revokeUserAccessTokenHandler);
app.get("/api/user/tokens/:tokenId/usage", verifyJWTOrCodexServiceToken, getUserTokenUsageHandler);
app.get("/api/user", verifyJWTOrCodexServiceToken, requireRole("user"), (c) => c.json({ message: "Area do usuario liberada." }));
app.get("/api/admin-check", verifyJWTOrCodexServiceToken, requireRole("admin"), (c) => c.json({ message: "Area administrativa liberada." }));

// Codex WS upgrade route (precisa do server ref — adicionado após Bun.serve())
// ver abaixo

app.onError(errorHandler);

// Helper para Mongo (copiado do server.ts original sem alteração)
function extractMongoHost(uri: string) { return uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^:/?,]+)/)?.[1] ?? null; }
function replaceMongoHost(uri: string, host: string) { return uri.replace(/^(mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?)([^:/?,]+)(.*)$/u, `$1${host}$3`); }
function describeMongoTarget(uri: string) { const m = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?]+)(\/[^?]*)?/); return `${m?.[1] ?? "?"} ${m?.[2] ?? ""}`; }
function extractMongoDbName(uri: string) { const m = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?[^/?]+\/([^?]+)/); return m?.[1] ? decodeURIComponent(m[1]) : null; }
async function resolveMongoUri(uri: string) {
  if (isProduction || uri.startsWith("mongodb+srv://")) return uri;
  const originalHost = extractMongoHost(uri);
  if (!originalHost || ["localhost", "127.0.0.1", "::1"].includes(originalHost)) {
    return originalHost === "localhost" ? replaceMongoHost(uri, "127.0.0.1") : uri;
  }
  try { await dns.lookup(originalHost); return uri; } catch { /* fallback */ }
  const fallbackHost = process.env.MONGO_FALLBACK_HOST?.trim() || "127.0.0.1";
  console.warn(`Mongo host "${originalHost}" nao resolvido. Tentando "${fallbackHost}".`);
  return replaceMongoHost(uri, fallbackHost);
}

async function start() {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) { console.error("MONGO_URI nao configurada."); process.exit(1); }

  const resolvedMongoUri = await resolveMongoUri(mongoUri);
  const dbName = process.env.MONGO_DB_NAME?.trim() || extractMongoDbName(resolvedMongoUri) || undefined;

  await mongoose.connect(resolvedMongoUri, {
    dbName,
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
  });
  console.log(`Mongo conectado em ${describeMongoTarget(resolvedMongoUri)}`);

  const port = Number(process.env.PORT) || 4000;

  let serverRef: ReturnType<typeof Bun.serve>;

  // Adicionar rota de upgrade WS do Codex (precisa do serverRef)
  const codexWsUpgrade = createCodexWsUpgradeHandler(() => serverRef);
  app.get("/api/codex/ws", verifyJWTOrCodexServiceToken, requireRole("admin"), codexWsUpgrade);

  serverRef = Bun.serve({
    port,
    fetch: app.fetch,
    websocket: {
      open: codexWsOpen,
      message: codexWsMessage,
      close: codexWsClose,
    } as Parameters<typeof Bun.serve>[0]["websocket"],
  });

  console.log(`Backend rodando: http://localhost:${port}`);
  startPortalRecentsFlushLoop();
  startHealthBroadcast();

  function shutdown() {
    console.log("Shutting down…");
    stopPortalRecentsFlushLoop();
    stopHealthBroadcast();
    serverRef.stop();
    setTimeout(() => process.exit(1), 5000);
  }
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

void start();
```

- [ ] **Step 2: Verificar que `bun run dev` inicia sem crash**

```bash
cd api && timeout 10 bun run src/server.ts 2>&1 | head -20
```

Esperado: ver `Mongo conectado` ou erro de conexão Mongo (não erro de importação TypeScript).

- [ ] **Step 3: Commit**

```bash
git add api/src/server.ts
git commit -m "refactor: reescrever server.ts com Hono + Bun.serve() + Codex WS nativo"
```

---

### Task 12: Remover dependências Express e smoke test completo

**Files:**
- Modify: `api/package.json`
- Delete: `api/src/types/express.d.ts`
- Delete: `api/src/lib/async-handler.ts` (se ainda existir)
- Modify: `api/src/middlewares/role.middleware.ts` (consolidar com `role.ts` se houver duplicação)

- [ ] **Step 1: Remover Express e dependências obsoletas**

```bash
cd api
bun remove express express-rate-limit compression cookie-parser cors
bun remove @types/express @types/cors @types/cookie-parser
```

- [ ] **Step 2: Garantir que não há imports de Express restantes**

```bash
grep -r "from \"express\"" api/src/ --include="*.ts"
grep -r "from 'express'" api/src/ --include="*.ts"
```

Resultado esperado: vazio. Se houver arquivos restantes, aplicar transformação do Task 2.

- [ ] **Step 3: Deletar arquivos obsoletos**

```bash
rm -f api/src/types/express.d.ts api/src/lib/async-handler.ts
```

- [ ] **Step 4: Verificar `role.middleware.ts` (possível duplicata de `role.ts`)**

```bash
cat api/src/middlewares/role.middleware.ts
```

Se for duplicata de `role.ts`, deletar e substituir imports onde referenciado.

- [ ] **Step 5: Executar suite de testes**

```bash
cd api && bun test 2>&1 | tail -20
```

Esperado: mesmo número de pass/fail que antes da migração (22 falhas pré-existentes por deps ausentes no ambiente, 57+ pass).

- [ ] **Step 6: Iniciar servidor e testar rotas manualmente**

```bash
cd api && bun run dev &
sleep 3
curl -s http://localhost:4000/api | jq .
curl -s -X POST http://localhost:4000/api/auth/logout | jq .
```

Esperado: `{"message":"Backend rodando!"}` e resposta válida de logout.

- [ ] **Step 7: Commit final da Fase 1**

```bash
git add -A
git commit -m "chore: remover Express + cleanup final — Fase 1 Hono concluída"
```

---

## Fase 2 — GraphQL (graphql-yoga + Pothos)

### Task 13: Instalar dependências GraphQL e criar scaffold do schema

**Files:**
- Modify: `api/package.json`
- Create: `api/src/graphql/schema.ts`
- Create: `api/src/graphql/context.ts`
- Create: `api/src/graphql/builder.ts`

- [ ] **Step 1: Instalar graphql-yoga e Pothos**

```bash
cd api
bun add graphql graphql-yoga @pothos/core
```

- [ ] **Step 2: Criar `api/src/graphql/builder.ts`**

```typescript
import SchemaBuilder from "@pothos/core";
import type { AuthUserPayload } from "../types/hono";

export type GraphQLContext = {
  user: AuthUserPayload | null;
};

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Scalars: {
    Date: { Input: Date; Output: Date };
  };
}>({});

// Scalar Date
builder.scalarType("Date", {
  serialize: (value) => (value instanceof Date ? value.toISOString() : String(value)),
  parseValue: (value) => new Date(String(value)),
});
```

- [ ] **Step 3: Criar `api/src/graphql/context.ts`**

```typescript
import type { YogaInitialContext } from "graphql-yoga";
import { getCookie } from "hono/cookie";
import type { GraphQLContext } from "./builder";
import type { AuthUserPayload } from "../types/hono";
import { verifySessionToken } from "../lib/session-token";
import { authenticateUserAccessToken } from "../lib/user-access-token";
import { readCodexServiceTokenFromRequest, resolveCodexServiceToken } from "../lib/codex-service-token";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sga_auth";
const ADMIN_ROLE = 1;

export async function createGraphQLContext(
  yogaCtx: YogaInitialContext,
): Promise<GraphQLContext> {
  const request = yogaCtx.request;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k?.trim() ?? "", v.join("=")];
    }),
  );

  const cookieToken = cookies[AUTH_COOKIE_NAME]?.trim();
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const authToken = cookieToken || bearerToken;

  if (authToken) {
    const session = await verifySessionToken(authToken, process.env.JWT_SECRET!);
    if (session) {
      const user: AuthUserPayload = {
        id: String(session.userId),
        username: session.login,
        email: session.email,
        role: session.role === ADMIN_ROLE ? "admin" : "user",
        authType: "session",
      };
      return { user };
    }

    const apiToken = await authenticateUserAccessToken(authToken);
    if (apiToken) {
      return {
        user: {
          ...apiToken.user,
          authType: "token",
          tokenPermissions: apiToken.token.permissions ?? [],
        },
      };
    }
  }

  const serviceToken = readCodexServiceTokenFromRequest({
    authorization: authHeader,
    "x-codex-access-token": request.headers.get("x-codex-access-token"),
  });
  if (serviceToken && serviceToken === resolveCodexServiceToken()) {
    return {
      user: { id: "codex-service", username: "codex-agent", role: "admin", authType: "service" },
    };
  }

  return { user: null };
}
```

- [ ] **Step 4: Criar `api/src/graphql/schema.ts`** (vazio por enquanto — será preenchido nas tasks seguintes)

```typescript
import { builder } from "./builder";

// types, queries, mutations e subscriptions são registrados via side-effects nos imports abaixo
// (cada arquivo chama builder.objectType / builder.queryField etc.)

// Importar tipos (serão adicionados nas tasks seguintes)
// import "./types/user";
// import "./types/project";
// ...

export const schema = builder.toSchema();
```

- [ ] **Step 5: Montar yoga no `server.ts`**

```typescript
// Adicionar no server.ts após os imports:
import { createYoga } from "graphql-yoga";
import { schema } from "./graphql/schema";
import { createGraphQLContext } from "./graphql/context";

// Antes de `app.onError(errorHandler)`:
const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  context: createGraphQLContext,
  graphiql: !isProduction,
});
app.on(["GET", "POST"], "/graphql", (c) => yoga.fetch(c.req.raw, c.env));
```

- [ ] **Step 6: Verificar que `/graphql` responde**

```bash
cd api && bun run src/server.ts &
sleep 3
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' | jq .
```

Esperado: `{"data":{"__typename":"Query"}}` (schema vazio ainda está OK).

- [ ] **Step 7: Commit**

```bash
git add api/src/graphql/ api/src/server.ts api/package.json api/bun.lock
git commit -m "feat(graphql): scaffold schema + yoga montado em /graphql"
```

---

### Task 14: Types e queries de User e Tokens

**Files:**
- Create: `api/src/graphql/types/user.ts`
- Create: `api/src/graphql/queries/user.ts`

- [ ] **Step 1: Criar `api/src/graphql/types/user.ts`**

```typescript
import { builder } from "../builder";

export const UserType = builder.objectType("User", {
  fields: (t) => ({
    id: t.exposeString("id"),
    username: t.exposeString("username"),
    email: t.string({ nullable: true, resolve: (u) => u.email ?? null }),
    role: t.exposeString("role"),
  }),
});

export const UserAccessTokenType = builder.objectType("UserAccessToken", {
  fields: (t) => ({
    id: t.exposeString("id"),
    label: t.exposeString("label"),
    permissions: t.exposeStringList("permissions"),
    createdAt: t.field({
      type: "Date",
      resolve: (t) => t.createdAt,
    }),
    expiresAt: t.field({
      type: "Date",
      nullable: true,
      resolve: (t) => t.expiresAt ?? null,
    }),
  }),
});
```

- [ ] **Step 2: Criar `api/src/graphql/queries/user.ts`**

```typescript
import { builder } from "../builder";
import { UserType, UserAccessTokenType } from "../types/user";
import { User } from "../../models/User";
import { UserAccessToken } from "../../models/UserAccessToken";

builder.queryField("me", (t) =>
  t.field({
    type: UserType,
    nullable: true,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user) return null;
      const authUserId = Number(ctx.user.id);
      if (Number.isNaN(authUserId)) return null;
      const user = await User.findOne({ authUserId }).lean();
      if (!user) return null;
      return {
        id: String(user.authUserId ?? user._id),
        username: user.username,
        email: user.email ?? null,
        role: user.role,
      };
    },
  }),
);

builder.queryField("userTokens", (t) =>
  t.field({
    type: [UserAccessTokenType],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const tokens = await UserAccessToken.find({ userId: ctx.user.id }).lean();
      return tokens.map((tk) => ({
        id: String(tk._id),
        label: tk.label,
        permissions: tk.permissions ?? [],
        createdAt: tk.createdAt,
        expiresAt: tk.expiresAt ?? null,
      }));
    },
  }),
);
```

- [ ] **Step 3: Registrar imports no `schema.ts`**

```typescript
import "./types/user";
import "./queries/user";
```

- [ ] **Step 4: Testar query**

```bash
cd api && bun run src/server.ts &
sleep 3
# Login via dev endpoint primeiro para obter cookie, depois:
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"query":"{ me { id username email role } }"}' | jq .
```

- [ ] **Step 5: Commit**

```bash
git add api/src/graphql/types/user.ts api/src/graphql/queries/user.ts api/src/graphql/schema.ts
git commit -m "feat(graphql): types e queries de User e UserAccessToken"
```

---

### Task 15: Types e queries de Project, Dashboard e Logs

**Files:**
- Create: `api/src/graphql/types/project.ts`
- Create: `api/src/graphql/types/dashboard.ts`
- Create: `api/src/graphql/queries/project.ts`
- Create: `api/src/graphql/queries/dashboard.ts`

- [ ] **Step 1: Criar `api/src/graphql/types/project.ts`**

```typescript
import { builder } from "../builder";

export const ProjectType = builder.objectType("Project", {
  fields: (t) => ({
    id: t.exposeString("id"),
    name: t.exposeString("name"),
    displayName: t.string({ nullable: true, resolve: (p) => p.displayName ?? null }),
  }),
});

export const LogEntryType = builder.objectType("LogEntry", {
  fields: (t) => ({
    id: t.exposeString("id"),
    level: t.exposeString("level"),
    message: t.exposeString("message"),
    occurredAt: t.field({ type: "Date", resolve: (l) => new Date(l.occurredAt) }),
  }),
});

export const LogPageType = builder.objectType("LogPage", {
  fields: (t) => ({
    items: t.field({ type: [LogEntryType], resolve: (p) => p.items }),
    total: t.exposeInt("total"),
    page: t.exposeInt("page"),
    limit: t.exposeInt("limit"),
  }),
});
```

- [ ] **Step 2: Criar `api/src/graphql/types/dashboard.ts`**

```typescript
import { builder } from "../builder";

export const DashboardSummaryType = builder.objectType("DashboardSummary", {
  fields: (t) => ({
    projectId: t.exposeString("projectId"),
    totalRequests: t.exposeInt("totalRequests"),
    errorRate: t.exposeFloat("errorRate"),
    avgDurationMs: t.exposeFloat("avgDurationMs"),
    latestAt: t.field({ type: "Date", nullable: true, resolve: (d) => d.latestAt ? new Date(d.latestAt) : null }),
  }),
});
```

- [ ] **Step 3: Criar `api/src/graphql/queries/project.ts`**

```typescript
import { builder } from "../builder";
import { ProjectType, LogPageType } from "../types/project";
import { portalProjects } from "../../config/projects";
import mongoose from "mongoose";

function getLogsDb() {
  return mongoose.connection.getClient().db(process.env.LOGS_MONGO_DB_NAME?.trim() || "logs");
}

builder.queryField("projects", (t) =>
  t.field({
    type: [ProjectType],
    resolve: (_root, _args, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return portalProjects.map((p) => ({ id: p.id, name: p.name, displayName: p.displayName ?? null }));
    },
  }),
);

builder.queryField("logs", (t) =>
  t.field({
    type: LogPageType,
    args: {
      projectId: t.arg.string({ required: true }),
      page: t.arg.int({ defaultValue: 1 }),
      limit: t.arg.int({ defaultValue: 50 }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const page = args.page ?? 1;
      const limit = args.limit ?? 50;
      const db = getLogsDb();
      const collections = await db.listCollections({ name: args.projectId }).toArray();
      if (collections.length === 0) return { items: [], total: 0, page, limit };
      const collection = db.collection(args.projectId);
      const skip = (page - 1) * limit;
      const [total, rawItems] = await Promise.all([
        collection.countDocuments({}),
        collection.find({}).sort({ occurredAt: -1 }).skip(skip).limit(limit).toArray(),
      ]);
      const items = rawItems.map((doc) => ({
        id: String(doc._id),
        level: String(doc.level ?? "info"),
        message: String(doc.message ?? doc.url ?? ""),
        occurredAt: doc.occurredAt ?? new Date().toISOString(),
      }));
      return { items, total, page, limit };
    },
  }),
);
```

- [ ] **Step 4: Criar `api/src/graphql/queries/dashboard.ts`**

```typescript
import { builder } from "../builder";
import { DashboardSummaryType } from "../types/dashboard";
import { buildDashboardSummary } from "../../lib/dashboard-summary";

builder.queryField("dashboardSummary", (t) =>
  t.field({
    type: DashboardSummaryType,
    nullable: true,
    args: { projectId: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Acesso negado");
      return buildDashboardSummary(args.projectId);
    },
  }),
);
```

- [ ] **Step 5: Registrar no `schema.ts`**

```typescript
import "./types/project";
import "./types/dashboard";
import "./queries/project";
import "./queries/dashboard";
```

- [ ] **Step 6: Commit**

```bash
git add api/src/graphql/types/project.ts api/src/graphql/types/dashboard.ts api/src/graphql/queries/project.ts api/src/graphql/queries/dashboard.ts api/src/graphql/schema.ts
git commit -m "feat(graphql): types e queries de Project/Dashboard/Logs"
```

---

### Task 16: Types e queries de Corujão

**Files:**
- Create: `api/src/graphql/types/corujao.ts`
- Create: `api/src/graphql/queries/corujao.ts`

- [ ] **Step 1: Criar `api/src/graphql/types/corujao.ts`**

```typescript
import { builder } from "../builder";

export const SessaoStatusEnum = builder.enumType("SessaoStatus", {
  values: ["planejado", "aberto", "lotado", "cancelado", "realizado"] as const,
});

export const CorujaoSessaoType = builder.objectType("CorujaoSessao", {
  fields: (t) => ({
    id: t.exposeInt("id"),
    data: t.exposeString("data"),
    totalVagas: t.exposeInt("totalVagas"),
    status: t.field({ type: SessaoStatusEnum, resolve: (s) => s.status as any }),
  }),
});

export const CorujaoVisitaType = builder.objectType("CorujaoVisita", {
  fields: (t) => ({
    id: t.exposeInt("id"),
    sessaoId: t.exposeInt("sessaoId"),
    nomeVisitante: t.exposeString("nomeVisitante"),
    criadoEm: t.field({ type: "Date", resolve: (v) => new Date(v.criadoEm) }),
  }),
});

export const VagasPayloadType = builder.objectType("VagasPayload", {
  fields: (t) => ({
    sessaoId: t.exposeInt("sessaoId"),
    data: t.exposeString("data"),
    totalVagas: t.exposeInt("totalVagas"),
    vagasVendidas: t.exposeInt("vagasVendidas"),
    vagasRestantes: t.exposeInt("vagasRestantes"),
  }),
});
```

- [ ] **Step 2: Criar `api/src/graphql/queries/corujao.ts`**

```typescript
import { builder } from "../builder";
import { CorujaoSessaoType, SessaoStatusEnum } from "../types/corujao";
import { getCheckoutDb, schema } from "../../db/index";
import { inArray } from "drizzle-orm";

builder.queryField("corujaoSessoes", (t) =>
  t.field({
    type: [CorujaoSessaoType],
    args: {
      status: t.arg({ type: [SessaoStatusEnum], required: false }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const db = getCheckoutDb();
      const query = db.select().from(schema.corujaoSessoes);
      if (args.status?.length) {
        return query.where(inArray(schema.corujaoSessoes.status, args.status));
      }
      return query;
    },
  }),
);
```

- [ ] **Step 3: Registrar no `schema.ts`**

```typescript
import "./types/corujao";
import "./queries/corujao";
```

- [ ] **Step 4: Commit**

```bash
git add api/src/graphql/types/corujao.ts api/src/graphql/queries/corujao.ts api/src/graphql/schema.ts
git commit -m "feat(graphql): types e queries do Corujão"
```

---

### Task 17: Types e queries de VCT

**Files:**
- Create: `api/src/graphql/types/vct.ts`
- Create: `api/src/graphql/queries/vct.ts`

- [ ] **Step 1: Criar `api/src/graphql/types/vct.ts`**

```typescript
import { builder } from "../builder";

export const VctTimeType = builder.objectType("VctTime", {
  fields: (t) => ({
    id: t.string({ resolve: (v) => String(v._id) }),
    nome: t.exposeString("nome"),
    tag: t.exposeString("tag"),
  }),
});

export const VctInscricaoType = builder.objectType("VctInscricao", {
  fields: (t) => ({
    id: t.string({ resolve: (i) => String(i._id) }),
    nomeJogador: t.exposeString("nomeJogador"),
    tagRiot: t.exposeString("tagRiot"),
    timeId: t.string({ nullable: true, resolve: (i) => i.timeId ? String(i.timeId) : null }),
    criadoEm: t.field({ type: "Date", resolve: (i) => i.createdAt }),
  }),
});

export const VctFormacaoType = builder.objectType("VctFormacao", {
  fields: (t) => ({
    id: t.string({ resolve: (f) => String(f._id) }),
    timeId: t.string({ resolve: (f) => String(f.timeId) }),
    jogadores: t.stringList({ resolve: (f) => (f.jogadores ?? []).map(String) }),
  }),
});
```

- [ ] **Step 2: Criar `api/src/graphql/queries/vct.ts`**

```typescript
import { builder } from "../builder";
import { VctTimeType, VctInscricaoType, VctFormacaoType } from "../types/vct";
import { VctTime } from "../../models/VctTime";
import { VctInscricao } from "../../models/VctInscricao";
import { VctFormacaoTime } from "../../models/VctFormacaoTime";

builder.queryField("vctTimes", (t) =>
  t.field({
    type: [VctTimeType],
    resolve: async () => VctTime.find().lean(),
  }),
);

builder.queryField("vctInscricoes", (t) =>
  t.field({
    type: [VctInscricaoType],
    args: { timeId: t.arg.string({ required: false }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Acesso negado");
      const filter = args.timeId ? { timeId: args.timeId } : {};
      return VctInscricao.find(filter).lean();
    },
  }),
);

builder.queryField("vctFormacoes", (t) =>
  t.field({
    type: [VctFormacaoType],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Acesso negado");
      return VctFormacaoTime.find().lean();
    },
  }),
);
```

- [ ] **Step 3: Registrar no `schema.ts`**

```typescript
import "./types/vct";
import "./queries/vct";
```

- [ ] **Step 4: Commit**

```bash
git add api/src/graphql/types/vct.ts api/src/graphql/queries/vct.ts api/src/graphql/schema.ts
git commit -m "feat(graphql): types e queries de VCT"
```

---

### Task 18: Mutations de User (tokens)

**Files:**
- Create: `api/src/graphql/mutations/user.ts`

- [ ] **Step 1: Criar `api/src/graphql/mutations/user.ts`**

```typescript
import { builder } from "../builder";
import { UserAccessTokenType } from "../types/user";
import {
  createUserAccessToken,
  revokeUserAccessToken,
} from "../../lib/user-access-token";

const CreateTokenInput = builder.inputType("CreateTokenInput", {
  fields: (t) => ({
    label: t.string({ required: true }),
    permissions: t.stringList({ required: true }),
    expiresInDays: t.int({ required: false }),
  }),
});

builder.mutationField("createUserToken", (t) =>
  t.field({
    type: UserAccessTokenType,
    args: { input: t.arg({ type: CreateTokenInput, required: true }) },
    resolve: async (_root, { input }, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const result = await createUserAccessToken({
        userId: ctx.user.id,
        label: input.label,
        permissions: input.permissions,
        expiresInDays: input.expiresInDays ?? undefined,
      });
      return result;
    },
  }),
);

builder.mutationField("revokeUserToken", (t) =>
  t.field({
    type: "Boolean",
    args: { tokenId: t.arg.string({ required: true }) },
    resolve: async (_root, { tokenId }, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      await revokeUserAccessToken(tokenId, ctx.user.id);
      return true;
    },
  }),
);
```

- [ ] **Step 2: Registrar no `schema.ts`**

```typescript
import "./mutations/user";
```

- [ ] **Step 3: Commit**

```bash
git add api/src/graphql/mutations/user.ts api/src/graphql/schema.ts
git commit -m "feat(graphql): mutations de UserAccessToken (create/revoke)"
```

---

### Task 19: Mutations de Corujão e VCT

**Files:**
- Create: `api/src/graphql/mutations/corujao.ts`
- Create: `api/src/graphql/mutations/vct.ts`

- [ ] **Step 1: Criar `api/src/graphql/mutations/corujao.ts`**

```typescript
import { builder } from "../builder";
import { CorujaoSessaoType, SessaoStatusEnum } from "../types/corujao";
import { getCheckoutDb, schema } from "../../db/index";

const CorujaoSessaoInput = builder.inputType("CorujaoSessaoInput", {
  fields: (t) => ({
    data: t.string({ required: true }),
    totalVagas: t.int({ required: true }),
    status: t.field({ type: SessaoStatusEnum, required: true }),
  }),
});

builder.mutationField("createCorujaoSessao", (t) =>
  t.field({
    type: CorujaoSessaoType,
    args: { input: t.arg({ type: CorujaoSessaoInput, required: true }) },
    resolve: async (_root, { input }, ctx) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Acesso negado");
      const db = getCheckoutDb();
      const [sessao] = await db
        .insert(schema.corujaoSessoes)
        .values({ data: input.data, totalVagas: input.totalVagas, status: input.status })
        .returning();
      return sessao!;
    },
  }),
);
```

- [ ] **Step 2: Criar `api/src/graphql/mutations/vct.ts`**

```typescript
import { builder } from "../builder";
import { VctInscricaoType } from "../types/vct";
import { VctInscricao } from "../../models/VctInscricao";

const VctInscricaoInput = builder.inputType("VctInscricaoInput", {
  fields: (t) => ({
    nomeJogador: t.string({ required: true }),
    tagRiot: t.string({ required: true }),
    timeId: t.string({ required: false }),
  }),
});

builder.mutationField("createVctInscricao", (t) =>
  t.field({
    type: VctInscricaoType,
    args: { input: t.arg({ type: VctInscricaoInput, required: true }) },
    resolve: async (_root, { input }) => {
      const inscricao = new VctInscricao({
        nomeJogador: input.nomeJogador,
        tagRiot: input.tagRiot,
        timeId: input.timeId ?? undefined,
      });
      await inscricao.save();
      return inscricao.toObject();
    },
  }),
);
```

- [ ] **Step 3: Registrar no `schema.ts`**

```typescript
import "./mutations/corujao";
import "./mutations/vct";
```

- [ ] **Step 4: Commit**

```bash
git add api/src/graphql/mutations/corujao.ts api/src/graphql/mutations/vct.ts api/src/graphql/schema.ts
git commit -m "feat(graphql): mutations de Corujão e VCT"
```

---

### Task 20: Subscriptions (healthPing e vagasUpdate)

**Files:**
- Create: `api/src/graphql/subscriptions/health.ts`
- Create: `api/src/graphql/subscriptions/vagas.ts`

- [ ] **Step 1: Criar `api/src/graphql/subscriptions/health.ts`**

```typescript
import { builder } from "../builder";

const HealthPingType = builder.objectType("HealthPing", {
  fields: (t) => ({
    serverTs: t.exposeFloat("serverTs"),
  }),
});

builder.subscriptionField("healthPing", (t) =>
  t.field({
    type: HealthPingType,
    subscribe: async function* () {
      while (true) {
        yield { serverTs: Date.now() };
        await new Promise((resolve) => setTimeout(resolve, 30_000));
      }
    },
    resolve: (payload) => payload,
  }),
);
```

- [ ] **Step 2: Criar `api/src/graphql/subscriptions/vagas.ts`**

```typescript
import { builder } from "../builder";
import { VagasPayloadType } from "../types/corujao";
import { getVagasPayload } from "../../lib/vagas-sse";

builder.subscriptionField("vagasUpdate", (t) =>
  t.field({
    type: VagasPayloadType,
    nullable: true,
    subscribe: async function* () {
      // emite imediatamente e depois a cada 5s
      while (true) {
        yield await getVagasPayload();
        await new Promise((resolve) => setTimeout(resolve, 5_000));
      }
    },
    resolve: (payload) => payload,
  }),
);
```

- [ ] **Step 3: Registrar no `schema.ts`**

```typescript
import "./subscriptions/health";
import "./subscriptions/vagas";
```

- [ ] **Step 4: Testar subscriptions via GraphiQL**

```bash
cd api && bun run src/server.ts &
sleep 3
# Abrir http://localhost:4000/graphql no browser
# Executar: subscription { healthPing { serverTs } }
# Esperado: receber pings a cada 30s
```

- [ ] **Step 5: Commit**

```bash
git add api/src/graphql/subscriptions/ api/src/graphql/schema.ts
git commit -m "feat(graphql): subscriptions healthPing e vagasUpdate"
```

---

### Task 21: Mutations de checkout

**Files:**
- Create: `api/src/graphql/mutations/checkout.ts`

- [ ] **Step 1: Criar `api/src/graphql/mutations/checkout.ts`**

Expor a operação principal de checkout (compra de vaga):

```typescript
import { builder } from "../builder";

const CheckoutInput = builder.inputType("CheckoutInput", {
  fields: (t) => ({
    sessaoId: t.int({ required: true }),
    nomeVisitante: t.string({ required: true }),
    email: t.string({ required: true }),
  }),
});

const CheckoutResultType = builder.objectType("CheckoutResult", {
  fields: (t) => ({
    ok: t.exposeBoolean("ok"),
    message: t.exposeString("message"),
    visitaId: t.int({ nullable: true, resolve: (r) => r.visitaId ?? null }),
  }),
});

builder.mutationField("checkoutVaga", (t) =>
  t.field({
    type: CheckoutResultType,
    args: { input: t.arg({ type: CheckoutInput, required: true }) },
    resolve: async (_root, { input }) => {
      // A lógica de checkout está em checkout.controller.ts — para reutilizar,
      // extraia a função de negócio:
      // 1. Leia api/src/controllers/checkout.controller.ts
      // 2. Identifique a função que cria a visita (provavelmente `createCorujaoVisita` ou similar)
      // 3. Mova a lógica pura (sem req/res) para api/src/lib/checkout-business.ts
      // 4. Importe e chame aqui:
      const { realizarCheckoutCorujao } = await import("../../lib/checkout-business");
      return realizarCheckoutCorujao(input);
    },
  }),
);
```

> **Antes de implementar este resolver:** ler `api/src/controllers/checkout.controller.ts` (877 linhas) e identificar qual handler cria a visita/compra principal. Extrair apenas essa lógica de negócio para `api/src/lib/checkout-business.ts` como função pura (sem `c: Context`). O controller existente continua chamando a mesma função. Isso elimina duplicação entre REST e GraphQL.

- [ ] **Step 2: Registrar no `schema.ts`**

```typescript
import "./mutations/checkout";
```

- [ ] **Step 3: Commit**

```bash
git add api/src/graphql/mutations/checkout.ts api/src/graphql/schema.ts
git commit -m "feat(graphql): mutation checkoutVaga"
```

---

### Task 22: Verificação final e smoke test completo

- [ ] **Step 1: Verificar schema completo**

```bash
cd api && bun run src/server.ts &
sleep 3
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}' | jq '.data.__schema.types[].name' | sort
```

Esperado: listar todos os types: `User`, `UserAccessToken`, `Project`, `DashboardSummary`, `CorujaoSessao`, `VctTime`, `VctInscricao`, `VctFormacao`, `HealthPing`, `VagasPayload`, `CheckoutResult`, etc.

- [ ] **Step 2: Verificar que rotas REST ainda funcionam**

```bash
curl -s http://localhost:4000/api | jq .
curl -s http://localhost:4000/api/vct | head -5
```

Esperado: REST continua respondendo normalmente.

- [ ] **Step 3: Verificar GraphiQL acessível em dev**

Abrir `http://localhost:4000/graphql` no browser. Esperado: GraphiQL com schema navegável.

- [ ] **Step 4: Rodar suite de testes**

```bash
cd api && bun test 2>&1 | tail -10
```

Esperado: mesmo número de pass/fail que antes (testes existentes não afetados).

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(graphql): schema completo — Fase 2 concluída"
```

---

## Critérios de conclusão

**Fase 1 — Hono:**
- [ ] Zero imports de `express` em `api/src/`
- [ ] `bun run dev` inicia sem erro
- [ ] `curl /api` retorna `{"message":"Backend rodando!"}`
- [ ] `bun test` mantém mesmos resultados
- [ ] Codex WebSocket aceita conexão

**Fase 2 — GraphQL:**
- [ ] `POST /graphql` com `{"query":"{ __typename }"}` retorna 200
- [ ] Query `me` retorna usuário autenticado
- [ ] Query `vctTimes` retorna lista (pode ser vazia)
- [ ] Subscription `healthPing` recebe pings no GraphiQL
- [ ] REST endpoints não afetados
