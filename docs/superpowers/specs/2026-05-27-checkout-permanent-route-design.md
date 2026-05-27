# Checkout — Rota Permanente de Pedido + Link de Produto

**Data:** 2026-05-27
**Escopo:** `infra/apps/checkout-api`, `infra/apps/checkout-web`, `home-admin/web`

---

## Objetivo

1. Todo pedido criado no checkout passa a ter uma URL permanente (`/pay/{orderId}`) que não expira.
2. O admin do home-admin consegue copiar um link direto de produto (`/produto/{productId}`) para compartilhar com clientes.

---

## Contexto

Hoje o fluxo é:

1. Admin/usuário inicia compra → `POST /pay/intent` cria token Redis (30 min TTL) → frontend navega para `/pay/{hextoken}`.
2. Frontend resolve o token (`GET /pay/intent/:token`) → exibe tela de pagamento.
3. Após criar o pedido → URL muda para `/order/{orderId}`.

O problema: `/pay/{hextoken}` expira em 30 min. Ao tentar acessar depois, o link não funciona. O `/order/{orderId}` existe como estado de navegação mas não há componente que o carregue diretamente.

---

## Arquitetura

### Disambiguação de padrões de URL

O token hex tem sempre 32 caracteres (`randomBytes(16).toString("hex")`). Um orderId é numérico. A verificação de rota no `CheckoutApp.tsx` precisa checar **na ordem**:

1. `/^\/produto\/(\d+)$/` → página de produto direto
2. `/^\/pay\/(\d+)$/` → pedido pelo orderId (permanente)
3. `/^\/pay\/([a-f0-9]+)$/` → intent hex (comportamento atual)
4. `/^\/order\/(\d+)$/` → compatibilidade de estado (mantido)

---

## Mudanças por componente

### 1. `checkout-api` — novo endpoint `GET /product/:id`

Não existe `GET /product/:id` (só existe `GET /products` que lista todos). A rota `/produto/{productId}` no frontend precisa carregar um produto por ID.

**Mudança:** Adicionar rota pública em `routes.ts`:

```ts
server.get("/product/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const productId = parseInt(id, 10);
  if (isNaN(productId) || productId <= 0) return reply.code(400).send({ error: "invalid_id" });
  const product = await products.findById(productId);
  if (!product) return reply.code(404).send({ error: "product_not_found" });
  return { product };
});
```

Sem autenticação, igual a `GET /products`.

---

### 2. `checkout-web/src/lib/api.ts` — nova função `getProductById`

```ts
export async function getProductById(id: number): Promise<Product> {
  const res = await fetch(`${API_BASE}/product/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("product_not_found");
  const data = await res.json() as { product: Product };
  return data.product;
}
```

---

### 3. `checkout-web/src/routes/CheckoutApp.tsx`

#### 3a. Novos tipos de AppState

```ts
type AppState =
  | { page: "products" }
  | { page: "product"; productId: number }      // NOVO: /produto/:id
  | { page: "intent"; token: string }
  | { page: "payment"; product: Product }
  | { page: "pay-order"; orderId: number }       // NOVO: /pay/:orderId (permanente)
  | { page: "order"; orderId: number; product: Product; initialPix?: CreateOrderResult };
```

#### 3b. `handlePath` — nova ordem de verificação

```ts
function handlePath() {
  const { pathname } = window.location;
  const produtoMatch = pathname.match(/^\/produto\/(\d+)$/);
  const payOrderMatch = pathname.match(/^\/pay\/(\d+)$/);
  const intentMatch   = pathname.match(/^\/pay\/([a-f0-9]+)$/);
  const orderMatch    = pathname.match(/^\/order\/(\d+)$/);

  if (produtoMatch) {
    setAppState({ page: "product", productId: parseInt(produtoMatch[1], 10) });
  } else if (payOrderMatch) {
    setAppState({ page: "pay-order", orderId: parseInt(payOrderMatch[1], 10) });
  } else if (intentMatch) {
    setAppState({ page: "intent", token: intentMatch[1] });
  } else if (orderMatch) {
    // compatibilidade: /order/:id vira /pay/:id automaticamente
    navigate(`/pay/${orderMatch[1]}`);
  } else {
    setAppState({ page: "products" });
  }
}
```

#### 3c. Pós-criação de pedido — URL muda de `/order/N` para `/pay/N`

```ts
// antes:
window.history.pushState({ ... }, "", `/order/${result.orderId}`);
// depois:
window.history.pushState({ ... }, "", `/pay/${result.orderId}`);
```

#### 3d. `ProductDetailPage` — componente novo

Carrega o produto via `useQuery(["product", productId], () => getProductById(productId))`. Exibe card de produto (nome, valor, benefícios). Botão "Comprar" chama `intentMutation.mutate({ productId })` — mesmo flow de hoje.

#### 3e. `PayOrderPage` — componente novo

Carrega o pedido via `useQuery(["order", orderId], () => getOrder(orderId))`. Reutiliza `OrderDisplay` já existente. Se 401 → redireciona para login. Se 404 → mostra mensagem de erro.

---

### 4. `home-admin/web` — botão "Copiar link" na tabela de produtos

**Arquivo:** `web/src/components/checkout/checkout-produtos-panel.tsx`

Novo botão na coluna de ações (antes do botão de duplicar), com `LinkIcon` (já importado em `icons`):

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="icon-sm"
      className="size-7"
      onClick={() => handleCopyLink(produto)}
    >
      <LinkIcon className="size-3.5" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Copiar link de pagamento</TooltipContent>
</Tooltip>
```

Handler:

```ts
function handleCopyLink(produto: CheckoutProductSummary) {
  const base = process.env.NEXT_PUBLIC_CHECKOUT_WEB_URL ?? "";
  navigator.clipboard.writeText(`${base}/produto/${produto.id}`);
  toast.success("Link copiado!");
}
```

**Variável de ambiente:** `NEXT_PUBLIC_CHECKOUT_WEB_URL` adicionada em `web/.env` (e documentada em `web/.env.example` se existir).

---

## Fluxo completo pós-implementação

```
Admin abre /checkout/produtos
  → clica em LinkIcon no produto "Corujão SGA"
  → copia: https://checkout.santos-games.com/produto/3
  → envia link para cliente

Cliente abre https://checkout.santos-games.com/produto/3
  → vê tela de produto com nome, valor, benefícios
  → clica "Comprar"
  → POST /pay/intent → navega para /pay/abc123...hex
  → preenche dados, paga
  → URL vira /pay/42 (orderId, permanente)
  → cliente pode abrir /pay/42 novamente no futuro e ver o status do pedido
```

---

## Não está no escopo

- Página de produto sem login (autenticação permanece obrigatória)
- Alteração do fluxo de intent ou de pagamento em si
- Envio de e-mail com link de pedido
- Lista de pedidos por produto no admin

---

## Arquivos alterados

| Ação | Arquivo |
|------|---------|
| Modificar | `infra/apps/checkout-api/src/modules/checkout/routes.ts` |
| Modificar | `infra/apps/checkout-web/src/lib/api.ts` |
| Modificar | `infra/apps/checkout-web/src/routes/CheckoutApp.tsx` |
| Modificar | `home-admin/web/src/components/checkout/checkout-produtos-panel.tsx` |
| Modificar | `home-admin/web/.env` (adicionar `NEXT_PUBLIC_CHECKOUT_WEB_URL`) |
