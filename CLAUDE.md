# CLAUDE.md — Santos Tech Home

Instruções para o Claude Code neste repositório. **O guia canônico fica em [`AGENTS.md`](./AGENTS.md)** — leia primeiro para visão geral, layout, comandos, convenções, variáveis de ambiente e detalhes do Codex embarcado. Este arquivo cobre apenas o que é específico do Claude Code.

## Idioma

Responda sempre em **português do Brasil** com acentuação completa. Termos técnicos e identificadores de código permanecem no idioma original.

## Stack rápida

- **Backend** (`api/`) — Bun + Express 5 + Mongoose + Redis. Testes com `bun:test`. Veja `AGENTS.md` para comandos.
- **Frontend** (`web/`) — Next 16 via `vinext` (Vite + RSC), React 19, Tailwind v4, shadcn. Sem suite de testes — valide UI no browser.
- **Codex CLI** embarcado em `api/src/lib/codex*` com contrato em `api/codex/openapi.yaml`.

Sempre use `bun` (nunca npm/pnpm/yarn).

## Como navegar

- Visão geral, layout e comandos: [`AGENTS.md`](./AGENTS.md).
- Contrato HTTP que o agente Codex consome: [`api/codex/openapi.yaml`](./api/codex/openapi.yaml).
- Instruções carregadas em `CODEX_HOME` no boot: [`api/codex/AGENTS.md`](./api/codex/AGENTS.md).
- Estrutura de logs: [`docs/logs-structure.md`](./docs/logs-structure.md).
- Planos e specs internas: `docs/superpowers/{plans,specs}`.

## Trabalho típico no Claude Code

### Mudanças no backend

1. Identifique rota/controller em `api/src/routes` ou `api/src/controllers`.
2. Lib de domínio fica em `api/src/lib` — extraia para lá se a lógica não for trivial.
3. Se a rota for consumida pelo Codex embarcado, **atualize `api/codex/openapi.yaml`** com path, método, schema e `x-codex-risk`. O agente Codex recusa rotas não documentadas.
4. Adicione `*.test.ts` ao lado do arquivo quando o comportamento for não trivial. Rode `bun test` em `api/`.
5. Confira `bun run dev` para validar boot.

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
