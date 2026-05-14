# Codex Admin Access Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-admin Codex access token that is shown once on creation, can be revoked, and blocks Codex access until a token exists.

**Architecture:** Introduce a dedicated AdminAccessToken model in the API, keep only a token hash in Mongo, and expose CRUD endpoints for admins. The Codex controller and gateway will read the active Codex token for the current admin and refuse to start or open the Codex experience when no active token exists. The portal settings dialog will get a Codex access section that creates/revokes the token and reveals the raw value only once.

**Tech Stack:** Bun, Express, Mongoose, JWT-based session auth, React 19, vinext, Sonner, existing portal shell and Codex drawer.

---

### Task 1: Backend token model and service

**Files:**
- Create: `api/src/models/AdminAccessToken.ts`
- Create: `api/src/lib/admin-access-token.ts`
- Create: `api/src/lib/admin-access-token.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "bun:test";
import {
  createAdminAccessTokenValue,
  hashAdminAccessToken,
} from "./admin-access-token";

describe("admin access token helpers", () => {
  test("gera um token forte e hash deterministico", () => {
    const token = createAdminAccessTokenValue();

    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(32);
    expect(hashAdminAccessToken(token)).toBe(hashAdminAccessToken(token));
    expect(hashAdminAccessToken(token)).not.toBe(token);
  });
});
```

Run: `cd api && bun test src/lib/admin-access-token.test.ts -v`
Expected: FAIL because `admin-access-token.ts` does not exist yet.

- [ ] **Step 2: Implement the minimal model and service**

Create a Mongoose model with these fields:

```ts
adminId: string;
type: "codex" | string;
label: string;
tokenHash: string;
createdAt: Date;
revokedAt: Date | null;
lastUsedAt: Date | null;
```

Implement these exports in `api/src/lib/admin-access-token.ts`:

```ts
export function createAdminAccessTokenValue(): string;
export function hashAdminAccessToken(token: string): string;
export async function createAdminAccessToken(params: {
  adminId: string;
  type: string;
  label: string;
}): Promise<{ id: string; plaintextToken: string }>;
export async function listAdminAccessTokens(adminId: string): Promise<AdminAccessTokenSummary[]>;
export async function revokeAdminAccessToken(adminId: string, tokenId: string): Promise<boolean>;
export async function getActiveAdminAccessToken(adminId: string, type: string): Promise<AdminAccessTokenSummary | null>;
```

Behavior required by the service:
- `createAdminAccessTokenValue()` returns a random bearer token string.
- `hashAdminAccessToken()` uses a deterministic SHA-256 hash.
- creating a `codex` token revokes any previous active `codex` token for the same admin before saving the new one.
- `listAdminAccessTokens()` never returns the raw token.
- `revokeAdminAccessToken()` marks `revokedAt`.
- `getActiveAdminAccessToken()` returns only a non-revoked token of the requested type.

- [ ] **Step 3: Run the helper tests**

Run: `cd api && bun test src/lib/admin-access-token.test.ts -v`
Expected: PASS with the helper assertions above.

- [ ] **Step 4: Add one storage-level test for the service contract**

```ts
import { describe, expect, mock, test } from "bun:test";
import { createAdminAccessToken } from "./admin-access-token";

describe("admin access token service", () => {
  test("revoke previous codex token before creating a new one", async () => {
    const result = await createAdminAccessToken({
      adminId: "admin-1",
      type: "codex",
      label: "Codex",
    });

    expect(result.plaintextToken.length).toBeGreaterThan(32);
  });
});
```

The implementation should keep this test unit-level by mocking the Mongoose model methods, following the style used in `api/src/controllers/vct.controller.test.ts`.

---

### Task 2: Admin token CRUD API

**Files:**
- Create: `api/src/controllers/admin-access-token.controller.ts`
- Create: `api/src/controllers/admin-access-token.controller.test.ts`
- Modify: `api/src/routes/admin.routes.ts`
- Modify: `api/src/server.ts` only if the route wiring needs a new mount point

- [ ] **Step 1: Write the failing controller tests**

```ts
import { describe, expect, mock, test } from "bun:test";
import { createAdminAccessTokenHandler, listAdminAccessTokensHandler } from "./admin-access-token.controller";

describe("admin access token controller", () => {
  test("creates a codex token and returns the raw token once", async () => {
    const req = {
      user: { id: "admin-1", role: "admin" },
      body: { type: "codex", label: "Codex" },
    } as never;
    const res = {
      status: mock(() => res),
      json: mock(() => res),
    } as never;

    await createAdminAccessTokenHandler(req, res);

    expect((res as never as { json: ReturnType<typeof mock> }).json).toHaveBeenCalled();
  });
});
```

Run: `cd api && bun test src/controllers/admin-access-token.controller.test.ts -v`
Expected: FAIL until the handler exists.

- [ ] **Step 2: Implement the endpoints**

Add these routes under the existing admin auth guard in `api/src/routes/admin.routes.ts`:

```ts
router.get("/tokens", listAdminAccessTokens);
router.post("/tokens", createAdminAccessToken);
router.post("/tokens/:tokenId/revoke", revokeAdminAccessToken);
```

Implement the controller behavior:
- `GET /api/admin/tokens` returns the admin's tokens without secrets.
- `POST /api/admin/tokens` returns `{ token, tokenId, label, type }` and exposes the raw token only on creation.
- `POST /api/admin/tokens/:tokenId/revoke` revokes the token for the current admin.
- Requests without admin auth keep the existing `401`/`403` behavior from the route guard.

- [ ] **Step 3: Run the controller tests**

Run: `cd api && bun test src/controllers/admin-access-token.controller.test.ts -v`
Expected: PASS.

- [ ] **Step 4: Verify the route contract manually**

Run:

```bash
curl -i -H 'Authorization: Bearer <admin-jwt>' http://127.0.0.1:4000/api/admin/tokens
```

Expected:
- `200 OK`
- JSON array/list of tokens, with no raw token values

Run:

```bash
curl -i -H 'Authorization: Bearer <admin-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"type":"codex","label":"Codex"}' \
  http://127.0.0.1:4000/api/admin/tokens
```

Expected:
- `201 Created`
- JSON response includes the raw token exactly once

---

### Task 3: Gate Codex access on the active admin token

**Files:**
- Modify: `api/src/controllers/codex.controller.ts`
- Modify: `api/src/lib/codex.ts`
- Create: `api/src/lib/codex-access.test.ts`
- Modify: `api/src/types/express.ts` only if the token lookup needs a typed admin id helper

- [ ] **Step 1: Write the failing Codex gate tests**

```ts
import { describe, expect, test } from "bun:test";
import { resolveCodexAccountStatus } from "./codex.controller";

describe("codex access gate", () => {
  test("marca o codex como bloqueado quando nao existe token ativo", async () => {
    const account = await resolveCodexAccountStatus(async () => {
      throw new Error("codex indisponivel");
    });

    expect(account.connected).toBe(false);
    expect(account.requiresOpenaiAuth).toBe(true);
  });
});
```

Extend this with the new field that indicates whether the admin token exists, for example `adminAccessTokenActive` or `codexAccessTokenActive`.

Run: `cd api && bun test src/controllers/codex.controller.test.ts -v`
Expected: FAIL until the new field and gate logic are added.

- [ ] **Step 2: Add the Codex token lookup and block before app-server startup**

The Codex controller and gateway should:
- read the current admin id from the verified session
- look up the active `codex` token for that admin
- refuse to start `codex app-server` when no active token exists
- return a structured blocked state from `/api/codex/account`

The account response should include a field that the frontend can use directly, such as:

```ts
codexAccessTokenActive: boolean;
codexAccessTokenRequired: boolean;
codexAccessBlockedReason: string | null;
```

`api/src/lib/codex.ts` should also guard the websocket upgrade path so direct socket access is blocked when no active admin token exists.

- [ ] **Step 3: Add the websocket fallback behavior**

If the token is missing:
- do not spawn `codex app-server`
- do not open the browser websocket
- send a clean error payload instead of letting the process crash or hang

If the token exists:
- keep the existing Codex flow unchanged
- preserve `thread/start`, `thread/read`, `turn/start`, and device login behavior

- [ ] **Step 4: Run the Codex tests**

Run: `cd api && bun test src/controllers/codex.controller.test.ts -v`
Expected: PASS with the new blocked-state assertions.

Add a focused manual check:

```bash
curl -i -H 'Authorization: Bearer <admin-jwt>' http://127.0.0.1:4000/api/codex/account
```

Expected:
- `200 OK`
- JSON reports the Codex is blocked when no active token exists

---

### Task 4: Portal settings UI and Codex drawer lock

**Files:**
- Modify: `web/src/components/portal/account-settings-dialog.tsx`
- Create: `web/src/components/portal/codex-access-panel.tsx`
- Modify: `web/src/components/portal/app-shell.tsx`
- Modify: `web/src/components/portal/codex-drawer.tsx`
- Modify: `web/src/app/api/codex/account/route.ts`
- Modify: `web/src/types/codex.ts`
- Create: `web/src/components/portal/codex-access-panel.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```ts
import { describe, expect, test } from "bun:test";
import { buildTokenStatusText } from "./codex-access-panel";

describe("codex access panel", () => {
  test("mostra bloqueio quando nao existe token ativo", () => {
    expect(buildTokenStatusText(false)).toBe("Bloqueado");
  });
});
```

Add a second component-level assertion for the drawer:

```ts
import { describe, expect, test } from "bun:test";
import type { CodexAccountStatus } from "@/types/codex";

describe("codex drawer access gate", () => {
  test("considera o codex bloqueado quando o backend diz que nao ha token", () => {
    const account = {
      connected: false,
      authMode: null,
      requiresOpenaiAuth: true,
      planType: null,
      email: null,
      sharedAccountLabel: null,
      codexAccessTokenActive: false,
      codexAccessTokenRequired: true,
      codexAccessBlockedReason: "Crie um token de acesso.",
    } satisfies CodexAccountStatus;

    expect(account.codexAccessTokenActive).toBe(false);
  });
});
```

Run: `cd web && bun test src/components/portal/codex-access-panel.test.tsx -v`
Expected: FAIL until the panel component exists.

- [ ] **Step 2: Implement the Codex access panel**

Create a `CodexAccessPanel` component that:
- loads `GET /api/admin/tokens`
- filters or displays the active `codex` token state
- shows `Criar token` when missing
- shows `Revogar` when active
- reveals the raw token only once in a modal/alert after creation
- never stores the raw token in state after the modal closes

The settings dialog should gain a new section named `Acesso Codex` that renders this panel.

- [ ] **Step 3: Wire the access state into the drawer**

Update `web/src/components/portal/codex-drawer.tsx` so it:
- reads the new Codex access flag from `CodexAccountStatus`
- blocks the drawer UI when the token is missing
- shows a CTA to open settings and create the token
- skips websocket connection and message handling when blocked

Update `web/src/components/portal/app-shell.tsx` so it passes a callback into the drawer:

```ts
onRequestOpenSettings={() => setSettingsOpen(true)}
```

That callback lets the blocked drawer open the settings dialog directly.

- [ ] **Step 4: Keep the frontend types in sync**

Update `web/src/types/codex.ts` to include the new access-token flags returned by the API. Keep the backend and frontend shape identical so the drawer and settings panel do not drift.

- [ ] **Step 5: Run the frontend tests and build**

Run:

```bash
cd web && bun test src/components/portal/codex-access-panel.test.tsx -v
cd web && bun run build
```

Expected:
- component test passes
- `vinext build` succeeds
- Codex drawer no longer opens as if it were usable when the admin token is missing

---

### Task 5: Final verification and release

**Files:**
- Review: all files changed in Tasks 1-4
- Modify only if verification finds a regression

- [ ] **Step 1: Run the backend and frontend focused tests**

Run:

```bash
cd api && bun test src/lib/admin-access-token.test.ts -v
cd api && bun test src/controllers/admin-access-token.controller.test.ts -v
cd api && bun test src/controllers/codex.controller.test.ts -v
```

Run:

```bash
cd web && bun test src/components/portal/codex-access-panel.test.tsx -v
cd web && bun run build
```

Expected:
- all focused tests pass
- frontend build succeeds

- [ ] **Step 2: Exercise the runtime path**

Check the live behavior locally:

```bash
curl -i -H 'Authorization: Bearer <admin-jwt>' http://127.0.0.1:4000/api/admin/tokens
curl -i -H 'Authorization: Bearer <admin-jwt>' http://127.0.0.1:4000/api/codex/account
```

Expected:
- token list works for the admin
- Codex account response tells the UI whether access is blocked

- [ ] **Step 3: Commit and push**

Commit only the token implementation, Codex gate, and UI files from this plan:

```bash
git add api/src/models/AdminAccessToken.ts api/src/lib/admin-access-token.ts api/src/lib/admin-access-token.test.ts api/src/controllers/admin-access-token.controller.ts api/src/controllers/admin-access-token.controller.test.ts api/src/routes/admin.routes.ts api/src/controllers/codex.controller.ts api/src/lib/codex.ts api/src/lib/codex-access.test.ts web/src/components/portal/account-settings-dialog.tsx web/src/components/portal/codex-access-panel.tsx web/src/components/portal/codex-access-panel.test.tsx web/src/components/portal/app-shell.tsx web/src/components/portal/codex-drawer.tsx web/src/app/api/codex/account/route.ts web/src/types/codex.ts
git commit -m "Add admin Codex access tokens"
git push
```

Expected:
- commit lands cleanly
- Codex access is blocked without a token and enabled with one
