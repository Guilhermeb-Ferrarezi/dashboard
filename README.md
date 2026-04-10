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
