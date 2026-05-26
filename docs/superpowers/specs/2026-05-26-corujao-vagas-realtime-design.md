# Corujão — Contador de Vagas em Tempo Real

## Contexto

O sistema do Corujão já existe no home-admin com sessões, contatos, visitas e controle de vagas (`total_vagas`). Porém:
- A contagem de vagas é interna (admin-only)
- Não há desconto automático de vaga ao receber pagamento via gateway
- A página pública (`/play/corujao` no sga-plataforma) não mostra vagas disponíveis

## Objetivo

1. Exibir contador de vagas em tempo real na landing page pública
2. Descontar vaga automaticamente quando pagamento é confirmado via webhook Dotfy
3. Permitir ajuste manual de vagas pelo admin (vendas em espécie, escassez de marketing)

## Arquitetura

```
Dotfy (pagamento) ──webhook──▶ checkout-api ──POST interno──▶ home-admin API
                                                                    │
                                                       cria visita + emite SSE
                                                                    │
Admin portal ──── ajuste manual (+/-) ─────────────────────────────▶│
                                                                    ▼
Landing page ◀────── SSE stream ────── GET /api/corujao/public/vagas/stream
(/play/corujao)
```

## Componentes

### 1. Endpoints públicos no home-admin API (sem auth)

**`GET /api/corujao/public/vagas`**
- Retorna vagas da próxima sessão com status "aberto" ou "planejado"
- Response: `{ sessaoId, data, totalVagas, vagasVendidas, vagasRestantes }`

**`GET /api/corujao/public/vagas/stream`**
- SSE (Server-Sent Events)
- Envia estado atual como primeiro evento ao conectar
- Emite `event: vagas-update` com payload idêntico ao GET sempre que vagas mudam
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`

### 2. Endpoint interno (auth via secret)

**`POST /api/corujao/vagas/descontar`**
- Headers: `X-Internal-Secret: <CORUJAO_INTERNAL_SECRET>`
- Body: `{ orderId: number, userId: number, amountCents: number }`
- Ação: cria visita na próxima sessão aberta, `forma_pagamento = "gateway"`, vincula `checkout_order_id`
- Emite SSE broadcast após criar a visita
- Retorna 200 se ok, 409 se não há vagas, 404 se não há sessão aberta

### 3. Endpoint admin para ajuste manual

**`POST /api/corujao/vagas/ajustar`**
- Auth: JWT admin (existente)
- Body: `{ sessaoId: number, delta: number, motivo?: string }`
- Delta positivo = adicionar vagas ao `total_vagas`, negativo = reduzir
- Validação: não permite `total_vagas` abaixo de vagas já vendidas
- Emite SSE broadcast após ajuste

### 4. Módulo SSE (lib/vagas-sse.ts)

- `Set<Response>` com clientes conectados
- `addClient(res)` — registra, configura headers, envia estado atual, cleanup no "close"
- `broadcast()` — recalcula vagas da próxima sessão e envia para todos os clientes
- Chamado por: `/vagas/descontar`, `/vagas/ajustar`, `PATCH /sessoes/:id`, `POST /visitas`, `DELETE /visitas/:id`

### 5. Mudanças no checkout-api (infra)

No webhook handler, após marcar pedido como "paid":
1. Busca o order para obter `productId`
2. Verifica se o `productId` está em `CORUJAO_PRODUCT_IDS` (env, lista separada por vírgula)
3. Se for Corujão, faz POST para `CORUJAO_API_URL + "/api/corujao/vagas/descontar"`
4. Se a chamada falhar, loga warning mas não bloqueia (pedido já está pago)

**Novas env vars no checkout-api:**
- `CORUJAO_API_URL` — URL do home-admin
- `CORUJAO_INTERNAL_SECRET` — secret compartilhado
- `CORUJAO_PRODUCT_IDS` — lista de product IDs do Corujão

### 6. Mudanças na landing page (sga-plataforma/web)

**Arquivo:** `src/routes/play.corujao.tsx`

- Hook `useVagasStream(url)` — conecta no SSE, retorna `{ vagasRestantes, totalVagas, data, connected }`
- Na `InfoBar`: badge "X vagas restantes" com barra de progresso ao lado do preço
- No `FinalCTA`: repetir contador
- Animação com framer-motion ao mudar o número
- Nova env: `VITE_CORUJAO_API_URL` (aponta pro home-admin)
- Botão "Garantir minha vaga" redireciona pro checkout-web com o produto Corujão (via pay intent ou URL direta)

### 7. Painel admin — ajuste de vagas

**Arquivo:** componente de sessões no home-admin

- Botões +/- ao lado do contador de vagas de cada sessão aberta
- Chama `POST /api/corujao/vagas/ajustar` com delta +1 ou -1
- Campo de motivo opcional

## Env vars novas

| Var | Onde | Exemplo |
|-----|------|---------|
| `CORUJAO_API_URL` | checkout-api (.env infra) | `https://painel-adm.santos-tech.com` |
| `CORUJAO_INTERNAL_SECRET` | checkout-api + home-admin | `corujao_secret_abc123` |
| `CORUJAO_PRODUCT_IDS` | checkout-api (.env infra) | `5,12` |
| `VITE_CORUJAO_API_URL` | sga-plataforma/web | `https://painel-adm.santos-tech.com` |

## Fluxos

### Pagamento via gateway (automático)
1. Cliente compra ingresso do Corujão no checkout-web
2. Dotfy processa PIX e envia webhook `EVENT:CHARGE_PAID`
3. checkout-api marca pedido como pago
4. checkout-api detecta que é produto Corujão, faz POST pro home-admin `/vagas/descontar`
5. home-admin cria visita, emite SSE
6. Landing page atualiza contador instantaneamente

### Venda em espécie (manual)
1. Admin clica -1 na sessão no painel
2. `POST /vagas/ajustar` com delta -1
3. home-admin atualiza `total_vagas`, emite SSE
4. Landing page atualiza

### Escassez de marketing
1. Admin reduz vagas pra criar urgência (ex: de 10 pra 6)
2. Mesmo fluxo do ajuste manual
