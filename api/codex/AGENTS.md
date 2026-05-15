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
- `GET /api/codex/tools`
- `POST /api/codex/tools/{toolId}/run`
- `GET /api/admin/tokens`
- `POST /api/admin/tokens`
- `POST /api/admin/tokens/{tokenId}/revoke`

## Agent sources

- Use the conversation context first for follow-up questions and decisions already taken.
- Use the workspace and local documentation for repo changes, route details, and implementation checks.
- Use the local OpenAPI file before calling HTTP endpoints.
- Use web/docs searches for official documentation or troubleshooting when local context is insufficient.

## Tool selection

- Read `GET /api/codex/tools` when you need the fixed tool catalog.
- Run tools only through `POST /api/codex/tools/{toolId}/run` with the exact schema listed by the catalog.
- Do not invent tool names or parameters.
- Prefer accuracy first, completeness second, and speed only as a tie-breaker.
- For "how do I do X?", use documentation first.
- For business state, prefer a documented internal API endpoint over workspace, shell, or database access.
- For endpoint or payload shape, validate against OpenAPI before any internal API read or write.
- If a route exists in the codebase but is missing from the OpenAPI file, do not use it. Report that it must be added to `openapi.yaml` before the agent can call it.
- The system provides a managed `CODEX_ACCESS_TOKEN` for protected internal calls; use it instead of expecting the browser session cookie.
- Do not use shell, ad hoc scripts, or indirect database access as the primary path for business reads.
- When several sources apply, combine them by problem-solving step rather than by source name.

## Confirmation rule

- If the drawer asks for confirmation, wait for the approval before continuing with the pending action.
- Treat destructive or external changes as confirmed only after the user explicitly approves.
- Read-only actions can run without confirmation.
- Creating, updating, deploying, revoking, or deleting always requires confirmation.

## Suggest-only rule

- Stop and suggest when the action is outside the available tools.
- Ask the user to choose when there are real trade-offs.
- Ask for context when the target zone, project, domain, environment, or file is unclear.
- If an API/tool call fails without a safe automatic recovery, report the exact failure and suggest the manual path.
- For security-sensitive changes, explain the risk before requesting explicit approval.

## Response style

- Present combined evidence as logical steps, not as a list grouped by tool.
- Mention the source only when there is a conflict, a decisive piece of evidence, an error, or the user asks where the information came from.
- After an action, verify the result and state what changed.

## Workflow

1. Read the OpenAPI file.
2. Verify that the target route is documented in the OpenAPI file.
3. Verify which token/header the endpoint expects.
4. Call the API with the injected token.
5. If the OpenAPI file and the implementation disagree, inspect the current route/controller files under `api/src`.
6. If the route exists only in code, stop and report that it must be formalized in OpenAPI first.
7. If the UI asks for confirmation, do not continue until the decision is resolved.
