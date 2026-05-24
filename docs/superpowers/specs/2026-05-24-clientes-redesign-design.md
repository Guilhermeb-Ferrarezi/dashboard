# Design — Redesign da seção de Clientes (estilo AbacatePay)

**Data:** 2026-05-24  
**Status:** Aprovado

---

## Contexto

A seção de clientes atual (`/checkout/clientes`) é um painel único com tabela densa, cards de stats, gráfico sparkline, filtros de período/produto, expand inline de pedidos e ações de editar/deletar por linha. O objetivo é simplificar para o padrão do AbacatePay: lista limpa → clicar navega para página de detalhe completa.

---

## Arquitetura

Dois componentes/rotas no lugar do painel único:

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/checkout/clientes` | `web/src/app/checkout/clientes/page.tsx` (existente) | Lista paginada de clientes |
| `/checkout/clientes/[id]` | `web/src/app/checkout/clientes/[id]/page.tsx` (novo) | Detalhe do cliente |

Componentes principais:

- `web/src/components/checkout/checkout-clientes-lista.tsx` — substitui `checkout-clientes-panel.tsx`
- `web/src/components/checkout/checkout-cliente-detalhe.tsx` — componente novo para a página de detalhe

O arquivo `checkout-clientes-panel.tsx` atual será substituído. A lógica de formatação (`formatBRL`, `formatDate`, `getAvatarColor`) pode ser movida para `web/src/lib/format.ts` se não existir ainda.

---

## Página de lista — `/checkout/clientes`

### Layout

```
[título "Clientes"]
[barra de busca: "Pesquisar por login, e-mail…"]
[tabela]
  ID do cliente | Login | E-mail | Data de criação
  cust_abc…     | joao  | j@ex…  | 12 abr. 2026, 22:08
  ...
[paginação: Página N  ‹  ›]
```

### Comportamento

- Busca filtra localmente por `userLogin` e `userEmail` (client-side, igual ao atual).
- Clicar em qualquer linha faz `router.push('/checkout/clientes/' + cliente.userId)`.
- Paginação: 20 itens por página (PAGE_SIZE mantido).
- Sem ações por linha, sem expand inline, sem botão de exportar CSV.

### O que é removido

- Cards de stats (total de clientes, receita, VIPs, top spender)
- Gráfico sparkline de novos por mês
- Filtros de período (7d/30d/90d/365d) e filtro por produto
- Colunas: total gasto, nº de pedidos, último produto
- Botões de editar, deletar, copiar e expandir por linha
- Botão "Exportar CSV"
- Sort por coluna

### Dados necessários

`GET /checkout/clientes` — retorna `CheckoutClienteSummary[]`. Campos usados na lista: `userId`, `userLogin`, `userEmail`, `createdAt`. Os demais campos do summary são usados na página de detalhe.

---

## Página de detalhe — `/checkout/clientes/[id]`

### Cabeçalho do cliente

```
[Nome completo ou userLogin em destaque — font-size grande, font-weight bold]
ID: [cust_xxx…]  [ícone copiar]
Login: [userLogin]
E-mail: [userEmail]  [ícone copiar]
Criado em: [data formatada]
```

Se `isVip === true`, exibir badge "VIP ⭐" ao lado do nome.

### Grid de stats (1 linha × 4 cards)

| Card | Valor | Fonte |
|------|-------|-------|
| Total faturado | `formatBRL(totalSpentCents)` | `CheckoutClienteSummary.totalSpentCents` |
| Pedidos | `orderCount` | `CheckoutClienteSummary.orderCount` |
| Último produto | `lastPaidProduct` ou "Nenhum" | `CheckoutClienteSummary.lastPaidProduct` |
| Comportamento | badge "VIP" (se `isVip`) ou "Recompra" (se `orderCount > 1`) ou "Novo" | derivado |

### Abas

**Aba "Pedidos"** (padrão ativo):

- Dropdown de filtro por produto (`purchasedProducts[]` do summary para popular as opções).
- Tabela de pedidos carregada via `GET /checkout/clientes/{userId}/pedidos` (lazy, igual ao atual).

Colunas da tabela:

| Coluna | Fonte |
|--------|-------|
| Produto | `CheckoutClientePedido.description` |
| Valor | `formatBRL(amountCents)` |
| Status | badge com cor semântica |
| ID do pedido | `id` (truncado com `…`, copiável) |
| Data | `formatDate(createdAt)` |
| Ações | botão `⋮` |

**Badges de status:**

| Status | Cor |
|--------|-----|
| `paid` | Verde (bg-green-50, text-green-700) |
| `pending` | Amarelo (bg-yellow-50, text-yellow-700) |
| `expired` | Vermelho (bg-red-50, text-red-600) |
| `cancelled` | Cinza (bg-gray-100, text-gray-600) |
| `failed` | Vermelho escuro |
| `refunded` | Vermelho (bg-red-50, text-red-600) |

**Menu `⋮` por pedido** (Dropdown/Popover):

1. **Ver detalhes** — abre modal com todos os campos do pedido
2. **Comprovante** — abre URL do comprovante (se disponível na API) ou exibe toast "indisponível"
3. **Reembolsar** — abre dialog de confirmação → chama endpoint de reembolso (a implementar no backend se não existir)
4. **Emitir nota fiscal** — chama endpoint de NF-e (a implementar no backend se não existir)

> Ações 3 e 4 que ainda não tiverem endpoint no backend devem exibir toast "em breve" por ora.

**Aba "Produtos comprados":**

Lista simples dos produtos em `purchasedProducts[]` — nome do produto, sem interação adicional. Pode ser implementada depois; na primeira versão, exibir a lista em cards ou pills simples.

### Navegação

- Breadcrumb no topo: `Checkout › Clientes › [userLogin]`
- Botão "← Voltar" ou clicar em "Clientes" no breadcrumb volta para a lista.
- A página de detalhe é um Server Component que busca os dados do cliente via `serverApi('/checkout/clientes')` e filtra pelo `id`, ou via endpoint específico `GET /checkout/clientes/{id}` se existir.

---

## Tema visual

Seguir o padrão do AbacatePay adaptado ao tema dark/neutro do projeto:

- Fundo dos cards: `bg-card` (shadcn)
- Bordas: `border border-border`
- Badges com `bg-{color}/10 text-{color}-600` (light) ou equivalente dark
- Tabela: linhas com `hover:bg-muted/50`, sem zebra striping
- Tipografia: tamanho de fonte do cabeçalho do cliente maior (`text-2xl font-bold`)
- Menu `⋮`: usar `DropdownMenu` do shadcn

---

## O que NÃO muda

- Rota de autenticação e redirect (mantém verificação de role admin)
- Endpoint de API do backend (`/checkout/clientes`, `/checkout/clientes/{userId}/pedidos`)
- Tipos em `portal.ts` (`CheckoutClienteSummary`, `CheckoutClientePedido`)
- `AppShell` como wrapper

---

## Fora de escopo

- Editar dados do cliente (login/email) — removido da UI de lista; pode ser adicionado na página de detalhe num iteração futura
- Deletar cliente — removido desta versão
- Export CSV — removido desta versão
- Endpoint de reembolso e NF-e no backend — exibir "em breve" se não existir
