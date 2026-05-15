# Codex OpenAPI Strict Mode Design

## Goal

Fazer o agente Codex operar consultas e acoes de negocio pelo mesmo padrao de um assistente operacional tipo Cloudflare: descobrir capacidades no projeto, mas executar leituras e escritas somente por endpoints internos formalizados no OpenAPI.

## Decision

O agente pode inspecionar codigo para descobrir que uma rota existe, mas nao pode usar essa rota para responder ou agir enquanto ela nao estiver documentada em `api/codex/openapi.yaml`.

## Rules

1. Consultas de negocio devem preferir endpoints internos documentados no OpenAPI.
2. OpenAPI serve como contrato obrigatorio para `execute_internal_api`.
3. Se a rota existir no codigo, mas nao no OpenAPI, o agente deve parar e informar que a formalizacao no contrato e obrigatoria antes do uso.
4. Shell, comando ad hoc e acesso indireto a banco nao podem ser usados como caminho primario para dado de negocio.
5. Workspace e codigo continuam validos para descoberta, debugging e reconciliacao entre implementacao e contrato.

## Scope

- Endurecer o prompt operacional do agente.
- Endurecer as instrucoes injetadas em `CODEX_HOME`.
- Validar no runtime que `execute_internal_api` so aceita paths documentados no OpenAPI.
- Expandir o OpenAPI com as rotas VCT de leitura ja existentes no backend.

## Initial OpenAPI Coverage

- `GET /api/vct/inscricoes`
- `GET /api/vct/times`
- `GET /api/vct/formacoes`

Todas com filtro opcional `modalidade` e schemas de resposta suficientes para uso administrativo pelo agente.

## Expected Behavior

- Pergunta: "tem quantos times inscritos?"
- Fluxo: o agente procura endpoint documentado de leitura, chama a API interna e responde.
- Se a rota existir so no codigo: o agente informa que a rota precisa entrar no OpenAPI antes de ser usada.

## Error Handling

- Path fora do OpenAPI: resposta operacional de bloqueio, sem chamar a API.
- Erro HTTP: manter classificacao normalizada existente.
- Divergencia entre OpenAPI e implementacao: o agente pode inspecionar `api/src` para diagnosticar, mas nao deve inventar payload ou path.

## Testing

- Teste de runtime para bloquear path nao documentado.
- Teste de runtime para permitir path documentado.
- Verificacao de busca no OpenAPI para as rotas VCT novas.
- Build e testes focados do backend/frontend.
