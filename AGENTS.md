# AGENTS.md — Santos Tech Home

Guia para agentes (Claude Code, Codex CLI e similares) trabalharem neste repositório. Toda comunicação, mensagens de commit, comentários e respostas devem ser em **português do Brasil**, com acentuação correta.

> O agente Codex embarcado no portal segue um contrato separado em `api/codex/AGENTS.md`. Este arquivo é para agentes externos que operam o repositório.

## Visão geral

Santos Tech Home é um portal interno multi-módulo com:

- **API** (`api/`) — Bun + Express 5, Mongoose, Redis, integração com Cloudflare R2 e runtime do Codex CLI embarcado.
- **Web** (`web/`) — Next.js 16 servido via `vinext` (Vite), React 19, Tailwind v4 e shadcn.
- **Site router** (`nginx/`, `site-routes/`) — nginx servindo ZIPs publicados pelo "Publicador" do admin.
- **Santos Tech Home Page** (`docker/`) — site público clonado de repositório externo.
- **Codex embarcado** (`api/src/lib/codex*`, `api/codex/`) — agente operando endpoints internos via contrato OpenAPI.

Subdomínios e SSO compartilhado integram este portal a outros projetos da Santos Tech (admin portal, banco de talentos etc.).

## Layout do repositório

```
api/                     Backend Bun + Express
  src/
    config/              Configuração estática (lista de projects)
    controllers/         Handlers HTTP (admin, auth, codex, vct, dashboard, logs, sso, projects, user)
    lib/                 Domínio + integrações (codex-*, site-publisher, dashboard-summary, theme-preferences, vct-*, token-vault)
    middlewares/         auth, role, codex-access, codex-service-auth, request-logs, jwe
    models/              Schemas Mongoose (User, AdminAccessToken, UserAccessToken, CodexThreadSession, VctTime, VctInscricao, VctFormacao*)
    routes/              Routers por área (admin, auth, codex, dashboard, projects, logs, sso, vct, valorant)
    server.ts            Bootstrap Express + Mongo + Codex gateway
  codex/                 AGENTS.md, AGENTS.override.md e openapi.yaml copiados para CODEX_HOME no boot
  scripts/               ensure-dev-mongo.mjs (sobe Mongo local para dev)
web/                     Frontend Next 16 + vinext
  src/
    app/                 Rotas (admin, auth, counter-strike, home, league-of-legends, login, logs, projects, vct, api)
    components/          admin, auth, logs, navigation, portal, ui (shadcn)
    hooks/               use-mobile
    lib/                 api-core, api-server, api, codex, dashboard, env, session, theme-preferences, utils, portal-projects
docker/                  Dockerfile do santos-tech-home (clona repo externo)
docs/                    Documentação interna (logs-structure.md, superpowers/{plans,specs})
nginx/                   Config do site-router
site-routes/             ZIPs publicados (montado nos containers api e site-router)
docker-compose.yml       Stack completa (mongo, redis, api, web, site-router, santos-tech-home)
```

## Comandos

Use **bun** em tudo — não substitua por npm/pnpm/yarn.

### API

```bash
cd api
bun install
bun run mongo:dev    # sobe Mongo local (scripts/ensure-dev-mongo.mjs)
bun run dev          # mongo:dev + bun --watch src/server.ts (porta 4000)
bun run start        # produção, sem watch
bun test             # roda *.test.ts com bun:test (não há script "test" no package.json)
```

### Web

```bash
cd web
bun install
bun run dev          # vinext dev na porta 3001
bun run build        # vinext build
bun run start        # vinext start
bun run lint         # eslint
```

### Login local (dev login bypass)

O auth de produção é delegado a `auth.santos-games.com`. Esse fluxo **não funciona em localhost** porque o auth externo não conhece `localhost` como client autorizado, e cookies setados em `.santos-games.com` não chegam pro browser local.

Em desenvolvimento (`NODE_ENV !== "production"`), existe um **dev login bypass**:

- Endpoint: `POST /api/dev/login` (montado só fora de produção em `server.ts`)
- Recebe `{ username }`, busca o user no Mongo, gera JWT válido com `JWT_SECRET` e retorna o token
- O frontend (`/login` em dev) seta o cookie `sga_auth` no domínio do próprio Next.js (`localhost:3001`) via `document.cookie` — backend NÃO seta porque cookies não cruzam portas (`:4000` ↔ `:3001`)
- Logout em dev apaga o cookie do `:3001` via `document.cookie` também

**Arquivos:**
- `api/src/controllers/dev-login.controller.ts`
- `api/src/routes/dev-login.routes.ts`
- `api/src/server.ts` (monta rota só em non-prod)
- `web/src/app/login/page.tsx` (form de login em dev)
- `web/src/components/portal/user-menu.tsx` (logout em dev)

**Remover quando:** o auth externo aceitar `localhost` como callback válido OU vocês adotarem mock/stub do auth externo. É só apagar os dois arquivos `dev-login.*` e o `if (NODE_ENV !== "production")` no `server.ts`. O resto continua funcionando em prod normalmente.

### Stack completa (Docker)

```bash
docker compose up -d --build
```

- API em `127.0.0.1:4000`, Web em `127.0.0.1:3001`, site-router em `127.0.0.1:3002`, santos-tech-home em `127.0.0.1:3003`.
- Portas presas em `127.0.0.1` de propósito — **não** abrir para fora da VPS sem reverse proxy.
- `CODEX_HOME` persiste em `./.codex-home`. ZIPs publicados em `./site-routes`.
- API roda com `CODEX_DANGEROUSLY_BYPASS_APPROVALS_AND_SANDBOX=1` por padrão (bypass do sandbox interno do Codex CLI para evitar conflito com `bwrap` em container).

## Stack e convenções

### Linguagens e frameworks

- **Backend:** Bun (runtime e package manager), TypeScript ESM, Express 5, Mongoose 9, ws, bcrypt, jsonwebtoken, multer, jszip, @aws-sdk/client-s3.
- **Frontend:** Next 16 + vinext (Vite com plugins React Server Components), React 19, Tailwind v4, shadcn, Phosphor icons, framer-motion, next-themes, sonner, react-markdown.
- **Dados:** MongoDB (Mongoose), Redis (códigos SSO efêmeros), Cloudflare R2 (uploads de imagens e logos VCT).

### Estilo de código

- Texto e UI em **pt-BR** com acentuação completa.
- Sem comentários supérfluos. Comente apenas o **porquê** quando não for óbvio.
- Não introduza abstrações ou flags para cenários hipotéticos. Três linhas parecidas é melhor que uma abstração prematura.
- Validação só em fronteiras de sistema (input de usuário, APIs externas). Não validar entre módulos internos confiáveis.
- Não criar arquivos `.md` ou READMEs sem o usuário pedir.
- Não adicionar emojis em arquivos a menos que o usuário peça.

### Estilo visual

Toda UI segue o **Design System Onix** documentado na seção [Design System — Identidade Visual](#design-system--identidade-visual-tema-onix) abaixo. Não usar cores hardcoded, `<select>` HTML nativo, importações diretas de Phosphor, padding fixo, ou border radius grandes. Consulte a checklist de página nova antes de criar qualquer componente.

### Testes

- Testes ao lado do código, sufixo `.test.ts`, usando `bun:test` (`import { describe, expect, test } from "bun:test"`).
- Não há `bun run test` configurado: invoque `bun test` diretamente em `api/`.
- No `web/`, não há suite automatizada — confie em `bun run lint` e em verificação manual no browser para mudanças de UI.

### Convenção de testes manuais (UI)

Para mudanças no frontend, **abra no browser** e exercite o fluxo. Type-check e lint validam código, não comportamento. Se não puder testar a UI, diga isso explicitamente em vez de afirmar sucesso.

## Áreas principais da API

Routers montados em `api/src/server.ts`:

| Prefixo                | Router                       | Responsabilidade                                       |
| ---------------------- | ---------------------------- | ------------------------------------------------------ |
| `/api/auth`            | `auth.routes`                | Login, signup, refresh                                 |
| `/api/admin`           | `admin.routes`               | Usuários, tokens admin, upload R2, publicador de sites |
| `/api/dashboard`       | `dashboard.routes`           | Resumo operacional (dashboard-summary)                 |
| `/api/projects`        | `projects.routes`            | Catálogo de projetos da Santos Tech                    |
| `/api/logs`            | `logs.routes`                | Logs de requisições (request-logs middleware)          |
| `/api/sso`             | `sso.routes`                 | Geração e troca de code SSO (Redis)                    |
| `/api/valorant-account`| `valorant.routes`            | Conta Valorant                                         |
| `/api/vct`             | `vct.routes`                 | Inscrições, formações e times do VCT                   |
| `/api/codex`           | `codex.routes`               | Threads, contas e tools do agente Codex embarcado      |
| `/api/user/*`          | inline em `server.ts`        | Perfil, preferências de tema, tokens pessoais          |

**Autenticação:** `verifyJWTOrCodexServiceToken` aceita JWT da sessão **ou** token de serviço do Codex (`CODEX_INTERNAL_API_TOKEN`). `requireRole("admin")` restringe área admin.

**Contrato OpenAPI:** `api/codex/openapi.yaml` é a fonte de verdade do contrato HTTP usado pelo Codex embarcado. Ao adicionar rota nova que o agente Codex deve consumir, atualize o YAML — o agente recusa rotas não documentadas. O risco por operação fica no campo `x-codex-risk` (`low`, `elevated`, `high`).

## Variáveis de ambiente importantes

API (`api/.env`):

- `JWT_SECRET`, `JWT_EXPIRES_IN` — token de sessão.
- `MONGO_URI`, `MONGO_FALLBACK_HOST`, `MONGO_DB_NAME`, `MONGO_SERVER_SELECTION_TIMEOUT_MS`.
- `REDIS_URL`, `REDIS_PREFIX` — códigos SSO efêmeros.
- `ALLOWED_ORIGINS` — CORS (em dev, localhost:3000/3001/3002/5173 são adicionados automaticamente).
- `SSO_JWT_SECRET`, `SSO_SHARED_SECRET`, `ADMIN_PORTAL_SSO_SECRET`, `STUDENT_PORTAL_SSO_SECRET` — SSO com outros portais.
- `CLOUDFLARE_R2_*` — credenciais R2 (uploads admin e logos VCT).
- `CODEX_HOME`, `CODEX_WORKSPACE_ROOT`, `CODEX_APP_SERVER_PORT`, `CODEX_ACCESS_TOKEN`, `CODEX_DANGEROUSLY_BYPASS_APPROVALS_AND_SANDBOX` — runtime do Codex.
- `SITE_PUBLISHER_STORAGE_DIR` — onde os ZIPs do publicador são gravados.

Web (`web/.env`):

- `NEXT_PUBLIC_API_URL` — URL pública da API (browser).
- `API_INTERNAL_URL` — URL interna (SSR/server actions, ex.: `http://api:4000/api` em Docker).
- `NEXT_PUBLIC_CODEX_SHOW_TECHNICAL_DETAILS` — exibe blocos técnicos completos no drawer do Codex.
- `SSO_PROJECT_ID`, `SSO_SHARED_SECRET`, `SSO_SUCCESS_PATH_*` — troca de code SSO.

Em desenvolvimento, se o hostname configurado em `MONGO_URI` não resolver, a API tenta `MONGO_FALLBACK_HOST` (default `127.0.0.1`) automaticamente.

## Segurança e ações arriscadas

- **Não** logue nem ecoe tokens (`CODEX_INTERNAL_API_TOKEN`, JWTs, tokens de R2, segredos SSO).
- Antes de qualquer ação destrutiva (apagar branch, force push, drop de coleção, `rm -rf`, modificar CI), confirme com o usuário.
- Não pule hooks (`--no-verify`, `--no-gpg-sign`) sem permissão explícita do usuário.
- Não commite arquivos `.env`, `credentials.json` ou similares.
- Ao adicionar dependência, prefira o que já existe no projeto (Phosphor, shadcn, framer-motion, sonner, react-markdown etc.) antes de trazer uma nova.

## Codex embarcado

O portal embarca o `codex` CLI como agente interno via WebSocket (`attachCodexGateway` em `server.ts`). Detalhes:

- Runtime em `api/src/lib/codex-agent-runtime.ts`, `codex-tool-runtime.ts`, `codex.ts`, `codex-bootstrap.ts`.
- Tools fixas (ex.: `execute_internal_api`) com schema rígido em `GET /api/codex/tools`.
- Risco por operação vem do OpenAPI (`x-codex-risk`). `low` executa direto, `elevated`/`high` retornam `requiresConfirmation: true` e exigem `confirmed=true` na próxima chamada.
- Modos de token no painel "Acesso Codex": `Normal` (conta) e `Codex` (token único e rotacionável).
- `CODEX_INTERNAL_API_TOKEN` é provisionado automaticamente como token de serviço delegado — internamente derivado de `CODEX_ACCESS_TOKEN`. Cabeçalhos: `Authorization: Bearer …` e `X-Codex-User-Id: …`.

Veja `api/codex/AGENTS.md` para o guia que o próprio Codex carrega em `CODEX_HOME`.

## Design System — Identidade Visual (tema Onix)

O tema **Onix** é o default do projeto. Toda página nova deve nascer seguindo estas diretrizes. Referências visuais: Vercel, Linear, Cloudflare, Dotfy.

### Paleta Onix (globals.css `.onix`)

| Token | Valor | Uso |
|---|---|---|
| `--background` | `oklch(0.21 0 0)` ~`#333` | Fundo geral da aplicação |
| `--foreground` | `oklch(0.98 0 0)` | Texto principal (branco off-white) |
| `--card` | `oklch(0.24 0 0)` ~`#3a3a3a` | Fundo de cards e containers de conteúdo |
| `--popover` | `oklch(0.22 0 0)` | Fundo de menus dropdown e popovers |
| `--primary` | `oklch(0.96 0 0)` | **Branco** — botões default, links ativos |
| `--primary-foreground` | `oklch(0.1 0 0)` | Texto dentro de botões (preto) |
| `--secondary` | `oklch(0.27 0 0)` | Fundo de botões secundários |
| `--muted` | `oklch(0.26 0 0)` | Fundo de áreas neutras |
| `--muted-foreground` | `oklch(0.65 0 0)` | Texto secundário / labels discretos |
| `--border` | `oklch(1 0 0 / 13%)` | Bordas sutis (branco 13%) |
| `--input` | `oklch(1 0 0 / 15%)` | Borda de inputs |
| `--sidebar` | `oklch(0.18 0 0)` | Fundo da sidebar (mais escuro que `--background`) |
| `--sidebar-accent` | `oklch(0.26 0 0)` | Fundo de itens hover/busca rápida na sidebar |
| `--sidebar-primary` | `oklch(0.96 0 0)` | Indicadores ativos na sidebar (branco) |
| `--sidebar-border` | `oklch(1 0 0 / 13%)` | Bordas da sidebar |

### Princípios visuais

1. **Camadas de profundidade** — sidebar (`0.18`) < background (`0.21`) < card (`0.24`). A diferença entre camadas é sutil mas perceptível, sem saltos bruscos.
2. **Botões brancos** — no tema Onix, `--primary` é branco com texto preto. O JS em `getThemeVariables()` (`theme-preferences.ts`) força esse override quando `preferences.mode === "onix"`, inclusive para `--sidebar-primary`, `--sidebar-ring` e `--ring`.
3. **Sem cores de marca nos botões** — a cor de accent (ember, sky, etc.) NÃO afeta `--primary` no Onix. Botões são sempre brancos.
4. **Linhas divisórias finas** — `border-l border-sidebar-border` entre sidebar e conteúdo; `border-b border-sidebar-border` abaixo do header. Todas com opacidade 13%.
5. **Sidebar ativa com fundo** — item selecionado usa `bg-sidebar-foreground/10` (cinza sutil), NÃO usa linha inset colorida.
6. **Border radius reduzido** — raios pequenos e contidos (sm: `0.25rem`, md: `0.4rem`, lg: `0.625rem`). Card principal do app-shell usa `rounded-xl`, cards internos usam `rounded-lg`. Badges usam `rounded-md` (não `rounded-full`). Nunca usar `rounded-2xl`, `rounded-3xl` ou `rounded-4xl`. Referência: Linear/Vercel/Cloudflare.
7. **Tipografia** — `tracking-tight` em títulos. Labels e eyebrows em `text-[10px] tracking-[0.14em]` uppercase.
8. **Header fino** — altura ~44px, tipografia compacta, botões ghost.

### Componentes e padrões reutilizáveis

| Componente | Arquivo | Quando usar |
|---|---|---|
| `StatusBadge` | `ui/status-badge.tsx` | Status coloridos (emerald/amber/red/blue/muted) |
| `SectionHeader` | `portal/section-header.tsx` | Títulos de seções dentro de cards |
| `Select` Linear-style | `ui/select.tsx` | Selects — nunca usar `<select>` HTML nativo |
| `Table variant="linear"` | `ui/table.tsx` | Tabelas — sem border-b permanente, hover sutil, padding apertado |
| `EmptyState` | `ui/empty-state.tsx` | Estado vazio de listas |
| `Pagination` | `ui/pagination.tsx` | Paginação (PAGE_SIZE = 50) |

### Ícones

- Usar **apenas** `@/components/ui/icons.tsx` — nunca importar direto de `@phosphor-icons/react`.
- Adicionar aliases novos em `icons.tsx` quando precisar de ícones que ainda não estão mapeados.
- WhatsApp: usar `WhatsAppIcon` (Phosphor `WhatsappLogo`) com `className="!size-4"`.

### Tokens de densidade

Padding e gaps usam CSS custom properties que respondem ao switch de densidade em Preferências:

- `--app-page-padding-x/y` — gutter externo da página.
- `--card-padding-x/y` — padding interno de cards.
- `--card-gap` — gap entre elementos dentro de cards.

Ao criar um novo componente, usar `var(--card-padding-x)` / `var(--card-gap)` em vez de valores fixos como `p-5` ou `gap-6`.

### Checklist para página nova

1. Página em `web/src/app/<area>/page.tsx`, protegida com `getSessionUser()` + redirect.
2. Envolver com `<AppShell>` passando `user`, `title`, `description`, `breadcrumb`.
3. Componente principal em `web/src/components/<area>/`.
4. Tabelas com `<Table variant="linear">`.
5. Selects com `<Select>` de `ui/select.tsx`.
6. Status com `<StatusBadge>`.
7. Ícones via `icons.tsx`.
8. Gaps/paddings via tokens de densidade (`var(--card-gap)`, `var(--card-padding-x)`).
9. Tema default Onix — não hardcodar cores. Usar tokens CSS (`bg-card`, `text-muted-foreground`, `border-border/60`, etc.).
10. Testar no browser no tema Onix antes de declarar pronto.

## Commits e PRs

- Mensagens em pt-BR ou inglês curto, focando no **porquê**, não na lista de arquivos.
- Não amende commits anteriores sem pedido explícito do usuário — crie um novo.
- Antes de fazer commit, leia `git status` e `git diff`. Stage por arquivo (`git add caminho/arquivo`), evite `git add -A`.
- Não faça push automático: o usuário pede explicitamente.
