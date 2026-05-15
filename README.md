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

## Docker Compose

```bash
docker compose up -d --build
```

- A API agora sobe com bypass de sandbox interna por padrão, para evitar falhas com `bwrap` em container ou workspace já sandboxado.
- Se quiser reativar o comportamento sem bypass, defina `CODEX_DANGEROUSLY_BYPASS_APPROVALS_AND_SANDBOX=0`.
- O `CODEX_HOME` fica persistido em `./.codex-home`.
- No boot, o container copia `AGENTS.override.md` e `openapi.yaml` para `CODEX_HOME` para guiar o Codex com a API do projeto.
- O compose também sobe Mongo e Redis locais para o stack completo.
- As portas do `web` e da `api` ficam presas em `127.0.0.1`, então não ficam abertas para fora da VPS.
