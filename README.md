# Santos Tech Home

## Backend local

```bash
cd api
bun install
bun run mongo:dev
bun run dev
```

Se a API estiver rodando direto no host, use `localhost` no `MONGO_URI`. Hostnames de container, como `guilherme_home-db`, so funcionam quando a API tambem esta na mesma rede Docker.

Em desenvolvimento, o backend tenta `MONGO_FALLBACK_HOST=localhost` automaticamente quando o hostname configurado para o Mongo nao pode ser resolvido.

No `web`, use `NEXT_PUBLIC_API_URL` para o browser e `API_INTERNAL_URL` para o SSR quando o servidor nao puder acessar a URL publica do painel.

O painel do Codex agora expõe um modo de agente com fontes declaradas explicitamente:

- contexto da conversa
- documentacao do projeto
- OpenAPI local
- workspace do projeto
- web e docs publicas

Quando o agente sinaliza uma acao de risco, o drawer pede confirmacao antes de continuar.

A escolha de ferramentas segue a regra: precisao primeiro, completude depois e velocidade apenas como desempate. Respostas que combinam fontes devem ser organizadas por etapas do problema, e nao por lista de ferramentas usadas. Quando faltam dados para identificar o alvo correto, o agente deve perguntar antes de agir.

O runtime de ferramentas fica em `GET /api/codex/tools` e `POST /api/codex/tools/:toolId/run`. Cada ferramenta possui schema fixo de parâmetros; chamadas de escrita por `execute_internal_api` retornam pedido de confirmação quando `confirmed` nao foi enviado.

O agente agora opera em modo estrito para dado de negocio: consultas e acoes internas devem usar endpoints documentados em `api/codex/openapi.yaml`. Se a rota existir no codigo, mas nao estiver no OpenAPI, o agente deve parar e informar que o contrato precisa ser atualizado antes do uso. Shell, script ad hoc e acesso indireto a banco nao valem como caminho primario para resposta operacional.

O backend provisiona automaticamente um token delegado de serviço para o agente. Internamente ele continua sendo resolvido a partir de `CODEX_ACCESS_TOKEN`, mas o processo `codex exec` recebe essa credencial pelos nomes `CODEX_INTERNAL_API_TOKEN` e `CODEX_INTERNAL_API_URL`, para poder consultar a API protegida sem depender do cookie da sessao do navegador e sem conflitar com o JWT interno do proprio CLI.

No frontend, o drawer do Codex oculta por padrao os comandos tecnicos completos e mostra apenas status curtos de atividade. Se quiser exibir todos os blocos tecnicos no chat, defina `NEXT_PUBLIC_CODEX_SHOW_TECHNICAL_DETAILS=true` no ambiente do `web`.

## Docker Compose

```bash
docker compose up -d --build
```

- A API agora sobe com bypass de sandbox interna por padrão, para evitar falhas com `bwrap` em container ou workspace já sandboxado.
- Se quiser reativar o comportamento sem bypass, defina `CODEX_DANGEROUSLY_BYPASS_APPROVALS_AND_SANDBOX=0`.
- O `CODEX_HOME` fica persistido em `./.codex-home`.
- No boot, o container copia `AGENTS.md`, `AGENTS.override.md` e `openapi.yaml` para `CODEX_HOME` para guiar o Codex com a API do projeto.
- O compose também sobe Mongo e Redis locais para o stack completo.
- As portas do `web` e da `api` ficam presas em `127.0.0.1`, então não ficam abertas para fora da VPS.
