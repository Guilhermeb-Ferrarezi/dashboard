# CLAUDE.md — Santos Tech Home

Instruções para o Claude Code neste repositório. **O guia canônico fica em [`AGENTS.md`](./AGENTS.md)** — leia primeiro para visão geral, layout, comandos, convenções, variáveis de ambiente e detalhes do Codex embarcado. Este arquivo cobre apenas o que é específico do Claude Code.

## Idioma

Responda sempre em **português do Brasil** com acentuação completa. Termos técnicos e identificadores de código permanecem no idioma original.

## Stack rápida

- **Backend** (`api/`) — Bun + **Hono** + Mongoose + Redis. Em migração de Express 5 → Hono (branch `feat/hono-graphql-migration`). Testes com `bun:test`. Veja `AGENTS.md` para comandos.
- **GraphQL** — `graphql-yoga` + `@pothos/core` montado em `/graphql` (adicionado na mesma migração). Schema em `api/src/graphql/`.
- **Frontend** (`web/`) — Next 16 via `vinext` (Vite + RSC), React 19, Tailwind v4, shadcn. Sem suite de testes — valide UI no browser.
- **Codex CLI** embarcado em `api/src/lib/codex*` com contrato em `api/codex/openapi.yaml`.

Sempre use `bun` (nunca npm/pnpm/yarn).

> **Migração em andamento:** A API está sendo migrada de Express 5 para Hono na branch `feat/hono-graphql-migration`. Spec em `docs/superpowers/specs/2026-05-28-hono-graphql-migration-design.md`, plano em `docs/superpowers/plans/2026-05-28-hono-graphql-migration.md`.

## Como navegar

- Visão geral, layout e comandos: [`AGENTS.md`](./AGENTS.md).
- Contrato HTTP que o agente Codex consome: [`api/codex/openapi.yaml`](./api/codex/openapi.yaml).
- Instruções carregadas em `CODEX_HOME` no boot: [`api/codex/AGENTS.md`](./api/codex/AGENTS.md).
- Estrutura de logs: [`docs/logs-structure.md`](./docs/logs-structure.md).
- Planos e specs internas: `docs/superpowers/{plans,specs}`.

## Trabalho típico no Claude Code

### Mudanças no backend

1. Identifique rota/controller em `api/src/routes` ou `api/src/controllers`.
2. Rotas usam `new Hono<AppEnv>()` (não `Router()` do Express). Controllers recebem `c: Context<AppEnv>` e retornam `return c.json(...)`.
3. Tipos compartilhados do Hono em `api/src/types/hono.ts` (`AppEnv`, `AuthUserPayload`, `Variables`).
4. Lib de domínio fica em `api/src/lib` — extraia para lá se a lógica não for trivial.
5. Se a rota for consumida pelo Codex embarcado, **atualize `api/codex/openapi.yaml`** com path, método, schema e `x-codex-risk`. O agente Codex recusa rotas não documentadas.
6. Adicione `*.test.ts` ao lado do arquivo quando o comportamento for não trivial. Rode `bun test` em `api/`.
7. Confira `bun run dev` para validar boot.

### Mudanças no GraphQL

- Schema em `api/src/graphql/` — builder Pothos em `builder.ts`, context em `context.ts`, types/queries/mutations/subscriptions em subpastas.
- Montar novo field: `builder.queryField(...)` ou `builder.mutationField(...)` no arquivo de domínio relevante, e importar em `schema.ts`.
- O endpoint REST equivalente **deve ser mantido** — o Codex embarcado consome REST.

### Mudanças no frontend

1. Rotas em `web/src/app/<area>/page.tsx`. Componentes em `web/src/components/<area>`.
2. Cliente HTTP em `web/src/lib/api*.ts`. Use `api-server.ts` em RSC/server actions (lê `API_INTERNAL_URL`) e `api.ts` no browser (lê `NEXT_PUBLIC_API_URL`).
3. UI segue shadcn + Tailwind v4. Reutilize componentes existentes em `web/src/components/ui` antes de criar novos.
4. Rode `bun run dev` (porta 3001) e **abra no browser** para validar o fluxo. Sem teste automatizado: se não puder testar visualmente, declare isso.
5. Lint com `bun run lint`.

### Quando mexer no Codex embarcado

Detalhes completos em `AGENTS.md` e `api/codex/AGENTS.md`. Pontos cegos comuns:

- Tools são definidas no runtime (`codex-tool-runtime.ts`) e expostas em `GET /api/codex/tools`. Não crie tool nova sem registrar no catálogo.
- Risco vem do OpenAPI (`x-codex-risk`). Operações `elevated` e `high` pedem confirmação na UI.
- Não logue nem ecoe `CODEX_INTERNAL_API_TOKEN`.

## Preferências de execução

- **Confirme antes de agir** em operações destrutivas/irreversíveis (force push, drop, reset --hard, modificar CI, mexer em `.env`).
- **Não amende commits** anteriores sem pedido explícito. Sempre crie commits novos.
- **Não faça push** automático nem abra PR sem pedido explícito.
- Para mudanças de UI, **rode o dev server e teste no browser** antes de declarar pronto.
- Atualize `api/codex/openapi.yaml` em **toda** rota nova consumida pelo Codex embarcado — caso contrário o agente Codex para de funcionar para aquela operação.
