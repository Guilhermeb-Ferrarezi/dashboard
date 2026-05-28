# Design: Migração Express → Hono + GraphQL

**Data:** 2026-05-28  
**Status:** Aprovado (implícito via Ralph Loop)  
**Escopo:** `api/` — backend Bun

---

## Contexto

A API atual roda em **Express 5 + Mongoose + Drizzle ORM** com Bun como runtime. O objetivo é:

1. **Fase 1 — Hono:** Substituir Express por Hono (mesmo comportamento, zero breaking changes).
2. **Fase 2 — GraphQL:** Adicionar `graphql-yoga + Pothos` montado em `/graphql`, cobrindo todos os domínios da API. Os endpoints REST são **mantidos** (o Codex embarcado os consome via OpenAPI).

---

## Fase 1 — Express → Hono

### Framework e runtime

- **Hono** rodando nativamente no Bun via `Bun.serve({ fetch: app.fetch })`.
- Sem `@hono/node-server` — o Bun já serve `app.fetch` diretamente.
- `server.ts` vira o entry point com `Bun.serve()`.

### Mapeamento de conceitos

| Express | Hono |
|---|---|
| `req`, `res`, `next` | `c: Context` |
| `req.user` (type augmentation) | `c.get('user')` com `Variables` type |
| `app.use(errorHandler)` | `app.onError((err, c) => ...)` |
| `asyncHandler(fn)` | removido — Hono é async-native |
| `Router()` | `new Hono()` + `app.route('/prefix', sub)` |
| `res.json(data)` | `return c.json(data)` |
| `res.status(n).json(data)` | `return c.json(data, n)` |
| `compression` middleware | middleware Hono com `ReadableStream` + Bun compress |
| `cookie-parser` | `hono/cookie` built-in |
| `express.json()` | `hono/body-limit` ou nativo |
| `cors` | `hono/cors` built-in |

### Middlewares portados

Todos reescritos para a assinatura `(c, next) => Promise<Response | void>`:

- `auth.middleware.ts` — lê cookie/header, seta `c.set('user', payload)`
- `codex-service-auth.ts` — idem
- `codex-access.ts` — idem
- `role.ts` / `role.middleware.ts` — lê `c.get('user').role`
- `rate-limit.ts` — adaptado para Hono (ou usando `hono-rate-limiter`)
- `request-logs.ts` — log via `c.req` e `c.res`
- `require-permission.ts` — lê `c.get('user')`
- `jwe.ts` — idem

### Rotas (sem mudança de path)

Cada arquivo `*.routes.ts` vira um `new Hono()` com os mesmos paths e métodos. Montados via `app.route('/api/auth', authRouter)` etc.

### Codex WebSocket Gateway

**Situação atual:** `attachCodexGateway(server: HttpServer)` usa a lib `ws` acoplada ao evento `upgrade` do Node.js HTTP server.

**Migração:** Bun tem WebSocket nativo em `Bun.serve()`. O gateway é refatorado para:

```typescript
const server = Bun.serve({
  fetch: app.fetch,
  websocket: {
    open(ws) { codexOnOpen(ws) },
    message(ws, msg) { codexOnMessage(ws, msg) },
    close(ws) { codexOnClose(ws) },
  }
})

// Upgrade manual no handler Hono:
app.get('/api/codex/ws', (c) => {
  const upgraded = server.upgrade(c.req.raw)
  if (!upgraded) return c.text('WebSocket upgrade failed', 400)
})
```

A lógica interna (`codex-agent-runtime`, `codex-tool-runtime`, `codex-sources`, etc.) **não muda**. Só o transporte (lib `ws` → Bun native WS).

### SSE (Fase 1 — mantidos como Hono routes)

Os dois SSEs (`/api/health/sse` e SSE de vagas) são portados para Hono usando `streamSSE()`:

```typescript
import { streamSSE } from 'hono/streaming'

app.get('/api/health/sse', (c) =>
  streamSSE(c, async (stream) => {
    // broadcast loop
  })
)
```

Os SSEs serão **substituídos** por GraphQL Subscriptions na Fase 2.

### Tipos compartilhados

`api/src/types/express.d.ts` é removido. Em seu lugar:

```typescript
// api/src/types/hono.ts
type Variables = {
  user: AuthUserPayload
}
type AppEnv = { Variables: Variables }
const app = new Hono<AppEnv>()
```

### Tratamento de erros

```typescript
app.onError((err, c) => {
  if (err instanceof AppError) return c.json({ message: err.message }, err.statusCode)
  console.error('Unhandled error:', err)
  return c.json({ message: 'Erro interno do servidor' }, 500)
})
```

### Dependências removidas

- `express`, `@types/express`
- `compression`, `cookie-parser`, `cors` (substituídos por built-ins do Hono)
- `express-rate-limit` (substituído por `hono-rate-limiter` ou implementação própria)

### Dependências adicionadas

- `hono`
- `hono-rate-limiter` (opcional, se preferir manter rate-limit)

---

## Fase 2 — GraphQL (graphql-yoga + Pothos)

### Montagem no Hono

```typescript
import { createYoga } from 'graphql-yoga'
import { schema } from './graphql/schema'

const yoga = createYoga({ schema, graphqlEndpoint: '/graphql' })

app.on(['GET', 'POST'], '/graphql', (c) => yoga.fetch(c.req.raw, c.env))
```

### Schema (Pothos code-first)

**Builder:**
```typescript
import SchemaBuilder from '@pothos/core'
// plugins: withInput, relay (opcional), errors

const builder = new SchemaBuilder<{
  Context: { user: AuthUserPayload | null }
}>({})
```

**Types principais:**

| Pothos Type | Fonte de dados |
|---|---|
| `User` | Mongoose `User` model |
| `UserAccessToken` | Mongoose `UserAccessToken` model |
| `AdminAccessToken` | Mongoose `AdminAccessToken` model |
| `Project` | `api/src/config/projects.ts` |
| `Log` | Mongoose (coleções de log por projeto) |
| `DashboardSummary` | `lib/dashboard-summary.ts` |
| `CorujaoSessao` | Drizzle `corujaoSessoes` |
| `CorujaoVisita` | Drizzle `corujaoVisitas` |
| `CorujaoColaborador` | Drizzle `corujaoColaboradores` |
| `VctTime` | Mongoose `VctTime` |
| `VctInscricao` | Mongoose `VctInscricao` |
| `VctFormacao` | Mongoose `VctFormacaoTime` |

**Queries (espelham GETs REST):**

```graphql
me: User
projects: [Project!]!
dashboardSummary(projectId: String!): DashboardSummary
logs(projectId: String!, page: Int, limit: Int): LogPage
corujaoSessoes(status: [SessaoStatus!]): [CorujaoSessao!]!
vctTimes: [VctTime!]!
vctInscricoes(timeId: ID): [VctInscricao!]!
adminTokens: [AdminAccessToken!]!
userTokens: [UserAccessToken!]!
```

**Mutations (espelham POSTs/PUTs/DELETEs REST):**

```graphql
createUserToken(input: CreateTokenInput!): UserAccessToken!
revokeUserToken(tokenId: ID!): Boolean!
updateProfile(input: UpdateProfileInput!): User!
updatePreferences(input: UpdatePreferencesInput!): User!
createCorujaoSessao(input: CorujaoSessaoInput!): CorujaoSessao!
checkoutVaga(input: CheckoutInput!): CheckoutResult!
# ... outros conforme controllers
```

**Subscriptions (equivalentes aos SSEs):**

```graphql
healthPing: HealthPing!    # equivale a GET /api/health/sse
vagasUpdate: VagasPayload  # equivale ao SSE de vagas
```

Implementadas com `graphql-ws` integrado ao yoga (transport via WebSocket nativo do Bun ou via HTTP chunked).

> **Nota:** Os endpoints SSE REST (`/api/health/sse` e `/api/corujao/public/vagas-sse`) são **mantidos** na Fase 2 para não quebrar o frontend existente. As Subscriptions GraphQL são adicionais. A remoção dos SSEs REST fica como passo opcional futuro, coordenado com migração do frontend.

### Contexto e autenticação

O context do yoga extrai o token do cookie/header usando a mesma lógica de `verifyJWTOrCodexServiceToken`:

```typescript
const yoga = createYoga({
  schema,
  context: async ({ request }) => {
    const user = await extractUserFromRequest(request)
    return { user }
  }
})
```

Resolvers que requerem auth usam `builder.queryField` com verificação de `ctx.user` — ou um plugin Pothos de authorization.

### Rotas REST mantidas

**Todas as rotas REST continuam existindo.** O Codex embarcado consome via OpenAPI e não é migrado para GraphQL. O `/graphql` é um endpoint completamente adicional.

### Estrutura de arquivos nova (Fase 2)

```
api/src/
  graphql/
    schema.ts          ← builder + export do schema
    context.ts         ← extração de user do request
    types/
      user.ts
      project.ts
      dashboard.ts
      corujao.ts
      vct.ts
    queries/
      user.ts
      dashboard.ts
      corujao.ts
      vct.ts
    mutations/
      user.ts
      corujao.ts
      vct.ts
      checkout.ts
    subscriptions/
      health.ts
      vagas.ts
```

### Dependências adicionadas (Fase 2)

- `graphql`
- `graphql-yoga`
- `@pothos/core`
- `@pothos/plugin-errors` (opcional, para erros tipados)

---

## Invariantes que não mudam

- Mongoose + Drizzle ORM — sem toque nos models ou schemas de BD
- Lógica de negócio nos `lib/` — sem toque
- `api/codex/openapi.yaml` — sem toque
- Variáveis de ambiente — sem toque
- Dockerfile — ajuste mínimo (entry point)
- Testes `*.test.ts` — sem toque (testam lib pura)

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Codex WebSocket quebra na migração Bun native WS | Testar gateway isolado antes de portar rotas |
| SSE subscriptions com Bun — chunked encoding pode variar | Usar `streamSSE()` do Hono que já lida com isso |
| Upload de arquivos (admin-r2 usa multer) | Hono tem `parseBody()` nativo que lida com multipart |
| Rate-limit por IP com Hono | Usar `hono-rate-limiter` com store Redis existente |
| GraphQL N+1 em queries aninhadas | Adicionar DataLoader por type se necessário |

---

## Critérios de conclusão

### Fase 1
- [ ] `bun run dev` sobe sem erro
- [ ] Todas as rotas REST respondem igual ao Express (status codes, bodies)
- [ ] Codex WebSocket funciona (login, run tool, SSE de thread)
- [ ] `bun test` mantém mesmos resultados de pass/fail

### Fase 2
- [ ] `/graphql` responde (playground acessível em dev)
- [ ] Queries cobrem todos os domínios listados
- [ ] Mutations espelham operações de escrita REST
- [ ] Subscriptions `healthPing` e `vagasUpdate` funcionam
- [ ] Auth por JWT/cookie funciona nos resolvers
