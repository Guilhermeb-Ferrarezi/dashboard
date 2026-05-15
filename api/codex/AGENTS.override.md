# Santos Tech Home Codex Instructions

This file is injected into `CODEX_HOME` on every container start.

## How to use the API

- Read `${CODEX_HOME}/openapi.yaml` before making requests.
- Use the Codex access token from `CODEX_ACCESS_TOKEN` when calling protected endpoints.
- Send the token as either `Authorization: Bearer <token>` or `X-Codex-Access-Token: <token>`.
- Do not log, print, or hardcode the token.

## Base URL

- Inside the API container, use `http://127.0.0.1:4000/api`.
- From the web container or another Docker service on the same network, use `http://api:4000/api`.

## Relevant endpoints

- `GET /api/codex/account`
- `POST /api/codex/account/logout`
- `GET /api/codex/threads`
- `GET /api/codex/threads/{threadId}`
- `GET /api/vct/inscricoes`
- `GET /api/vct/times`
- `GET /api/vct/formacoes`
- `GET /api/admin/tokens`
- `POST /api/admin/tokens`
- `POST /api/admin/tokens/{tokenId}/revoke`

## Workflow

1. Read the OpenAPI file.
2. Verify that the route is documented in the OpenAPI file before using it.
3. Verify which token/header the endpoint expects.
4. Call the API with the injected token.
5. If the OpenAPI file and the implementation disagree, inspect the current route/controller files under `api/src`.
6. If the route exists only in code, stop and report that it must be added to the OpenAPI contract before the agent can use it.
