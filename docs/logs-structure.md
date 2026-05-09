# Guia de Estrutura de Logs Para Integracao Nesta Central

Este documento define como outros projetos devem gravar logs no Mongo para que possam ser consumidos por esta central de logs.

O foco aqui nao eh explicar a implementacao interna desta aplicacao, e sim padronizar o contrato que qualquer outro projeto deve seguir para aparecer nesta central.

## Objetivo

Se voce tiver outro backend, API ou servico e quiser que ele seja monitorado por esta central, esse projeto precisa:

1. gravar logs no banco `logs`
2. usar uma collection propria
3. seguir o schema descrito abaixo

## Banco e collection

- Banco Mongo: `logs`
- Uma collection por projeto
- Convencao recomendada de nome:

```text
<slug_do_projeto>_logs
```

Exemplos:

```text
sga_home_logs
santos_tech_home_logs
meu_gateway_pix_logs
portal_aluno_logs
```

Recomendacao:
- use nomes estaveis
- evite espacos
- prefira `snake_case`
- termine sempre com `_logs`

## Documento padrao de log

Cada request HTTP persistida deve seguir este formato base:

```json
{
  "type": "http_request",
  "occurredAt": "2026-05-09T01:37:56.957Z",
  "method": "POST",
  "url": "https://api.exemplo.com/v1/login",
  "path": "/v1/login",
  "route": "/v1/login",
  "statusCode": 200,
  "durationMs": 304,
  "ip": "127.0.0.1",
  "hostname": "api.exemplo.com",
  "userAgent": "Mozilla/5.0 ...",
  "user": {
    "id": "user-id",
    "name": "Guilherme",
    "email": "guibferraezi@gmail.com",
    "role": "admin"
  },
  "requestBody": {
    "email": "guibferraezi@gmail.com",
    "password": "[REDACTED]"
  },
  "responseBody": {
    "message": "Login realizado com sucesso!"
  },
  "request": {
    "params": {},
    "query": {},
    "body": {},
    "headers": {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 ...",
      "origin": "http://localhost:5173",
      "referer": "http://localhost:5173/",
      "authorization": "[REDACTED]",
      "cookie": "[REDACTED]"
    }
  },
  "response": {
    "statusCode": 200,
    "body": {
      "message": "Login realizado com sucesso!"
    }
  }
}
```

## Campos minimos recomendados

Para esta central conseguir mostrar os logs de forma boa, os campos mais importantes sao:

- `type`
- `occurredAt`
- `method`
- `url` ou `path`
- `statusCode`
- `durationMs`
- `ip`
- `request`
- `response`

## Como esta central usa esses campos

Esta central monta a UI a partir destes mapeamentos:

- lista/tabela:
  - status <- `statusCode`
  - metodo <- `method`
  - endpoint <- `path`, `route` ou pathname derivado de `url`
  - ip <- `ip`
  - tempo <- `durationMs`
  - data <- `occurredAt`

- modal de detalhes:
  - request <- `request` ou `requestBody`
  - response <- `response.body` ou `responseBody`
  - endpoint completo <- `url`

- cards de projeto:
  - total de logs <- contagem de documentos da collection
  - ultimo evento <- maior `occurredAt`
  - ultimo metodo/status <- ultimo documento da collection

## Regras de seguranca

Antes de persistir, redija dados sensiveis.

Padrao recomendado de chaves sensiveis:

- `password`
- `token`
- `secret`
- `authorization`
- `cookie`
- `session`
- `key`

Valor recomendado:

```json
"[REDACTED]"
```

## Regras de armazenamento

Cada projeto pode decidir sua propria politica, mas para usar nesta central sem crescer demais o banco, a recomendacao eh:

- gravar `POST`, `PUT`, `PATCH` e `DELETE`
- gravar `GET` com erro
- ignorar `GET` muito ruidoso
- ignorar endpoints de observabilidade da propria central

Exemplos de rotas normalmente boas para ignorar:

- `/api/logs`
- `/api/user/me`
- endpoints de polling
- endpoints de healthcheck
- endpoints publicos muito acessados e sem valor analitico

## Variaveis de ambiente sugeridas

Se o projeto instrumentado usar uma estrategia parecida com a daqui, estas variaveis ajudam:

```env
LOGS_MONGO_DB_NAME=logs
LOGS_HTTP_COLLECTION=meu_projeto_logs
LOGS_ROUTE_BLACKLIST=/api/logs
LOGS_GET_ROUTE_BLACKLIST=/api/user/me,/api/health
```

## Middleware recomendado

Fluxo sugerido para qualquer outro projeto:

1. capturar o horario de inicio da request
2. interceptar `res.json` e `res.send`
3. esperar `res.on("finish")`
4. calcular `durationMs`
5. aplicar blacklist e regra de retencao
6. redigir campos sensiveis
7. montar o documento no formato padrao
8. inserir na collection do projeto dentro do DB `logs`

## Como integrar um novo projeto nesta central

Para um novo projeto passar a aparecer nesta central:

1. escolha um nome de collection, por exemplo `meu_novo_projeto_logs`
2. grave os logs no banco `logs`
3. siga o schema padrao acima

Com isso, esta central conseguira consumir esse projeto junto com os demais.

## Metadados opcionais

Se quiser enriquecer como o projeto aparece nesta central, voce pode manter uma collection separada de metadados.

Shape sugerido:

```json
{
  "name": "Meu Projeto",
  "slug": "meu-projeto",
  "apiKey": "key_xxx",
  "collectionName": "meu_projeto_logs",
  "createdAt": "2026-05-09T01:37:56.957Z"
}
```

Esses metadados sao opcionais.

Sem isso, esta central ainda consegue derivar nome e slug a partir do nome da collection.
