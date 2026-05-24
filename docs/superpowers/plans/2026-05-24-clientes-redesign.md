# Redesign da seção de Clientes (estilo AbacatePay) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o painel único de clientes por duas páginas: lista limpa (tabela com ID, Login, E-mail, Data) e página de detalhe com stats, abas e tabela de pedidos com menu de ações.

**Architecture:** A rota `/checkout/clientes` fica como lista simples (Server Component que busca a lista e renderiza `CheckoutClientesLista`). Nova rota `/checkout/clientes/[id]` (Server Component que busca o cliente específico da lista + renderiza `CheckoutClienteDetalhe` com lazy-load de pedidos). Componentes UI existentes (shadcn Table, Tabs, DropdownMenu, CopyButton, Badge, Pagination) são reutilizados.

**Tech Stack:** Next.js 16 (vinext), React 19, Tailwind v4, shadcn components, Bun

**Spec:** `docs/superpowers/specs/2026-05-24-clientes-redesign-design.md`

---

### Task 1: Criar componente da lista de clientes

**Files:**
- Create: `web/src/components/checkout/checkout-clientes-lista.tsx`

- [ ] **Step 1: Criar o componente `CheckoutClientesLista`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { UsersIcon } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { CheckoutClienteSummary } from "@/types/portal";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function truncateId(id: string, maxLen = 20) {
  return id.length > maxLen ? id.slice(0, maxLen) + "…" : id;
}

interface CheckoutClientesListaProps {
  clientes: CheckoutClienteSummary[];
}

export function CheckoutClientesLista({ clientes }: CheckoutClientesListaProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.userLogin.toLowerCase().includes(q) ||
        (c.userEmail?.toLowerCase().includes(q) ?? false)
    );
  }, [clientes, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Checkout" title="Clientes" />

      <div className="relative w-80">
        <Input
          placeholder="Pesquisar por login, e-mail…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="h-9 text-sm"
        />
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Nenhum cliente encontrado"
            description={query ? "Tente outros termos." : "Nenhum cliente cadastrado ainda."}
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID do cliente</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Data de criação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((cliente) => (
                <TableRow
                  key={cliente.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/checkout/clientes/${cliente.userId}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {truncateId(cliente.abacateCustomerId)}
                  </TableCell>
                  <TableCell className="font-medium">{cliente.userLogin}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {cliente.userEmail ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(cliente.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pageCount > 1 && (
        <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `cd /home/guilherme/projetos/sg/home-admin/web && bun run lint`
Expected: sem erros no novo arquivo

- [ ] **Step 3: Commit**

```bash
git add web/src/components/checkout/checkout-clientes-lista.tsx
git commit -m "feat(checkout): componente de lista de clientes (estilo AbacatePay)"
```

---

### Task 2: Atualizar page.tsx da lista para usar o novo componente

**Files:**
- Modify: `web/src/app/checkout/clientes/page.tsx`

- [ ] **Step 1: Substituir o conteúdo do page.tsx**

Substituir todo o arquivo por:

```tsx
import { cookies } from "next/headers";

import { CheckoutClientesLista } from "@/components/checkout/checkout-clientes-lista";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CheckoutClienteSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CheckoutClientesPage() {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  const cookieHeader = (await cookies()).toString();
  const { clientes } = await serverApi<{ clientes: CheckoutClienteSummary[] }>(
    "/checkout/clientes",
    { cookieHeader }
  );

  return (
    <AppShell user={user} title="Clientes" description="Clientes cadastrados no checkout.">
      <div className="p-6">
        <CheckoutClientesLista clientes={clientes} />
      </div>
    </AppShell>
  );
}
```

Mudanças em relação ao original:
- Remove import de `CheckoutClientesPanel`
- Remove import de `CheckoutNovosPorMes`
- Remove fetch de `/checkout/novos-por-mes`
- Passa `clientes` para `CheckoutClientesLista`

- [ ] **Step 2: Verificar compilação**

Run: `cd /home/guilherme/projetos/sg/home-admin/web && bun run lint`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add web/src/app/checkout/clientes/page.tsx
git commit -m "feat(checkout): page.tsx da lista usa novo componente simplificado"
```

---

### Task 3: Criar componente de detalhe do cliente

**Files:**
- Create: `web/src/components/checkout/checkout-cliente-detalhe.tsx`

- [ ] **Step 1: Criar o componente `CheckoutClienteDetalhe`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import {
  MoreHorizontalIcon,
  ShoppingCartIcon
} from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientApi } from "@/lib/api";
import type {
  CheckoutClientePedido,
  CheckoutClienteSummary
} from "@/types/portal";

const PEDIDOS_PAGE_SIZE = 15;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getStatusConfig(status: string): { label: string; className: string } {
  switch (status) {
    case "paid":
      return { label: "Pago", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
    case "pending":
      return { label: "Pendente", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
    case "expired":
      return { label: "Expirado", className: "bg-red-500/15 text-red-400 border-red-500/30" };
    case "cancelled":
      return { label: "Cancelado", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
    case "failed":
      return { label: "Falhou", className: "bg-red-500/15 text-red-400 border-red-500/30" };
    default:
      return { label: status, className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
  }
}

function truncateId(id: string | number, maxLen = 24) {
  const s = String(id);
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function getBehaviorLabel(cliente: CheckoutClienteSummary): { text: string; tone: string } {
  if (cliente.isVip) return { text: "VIP", tone: "bg-amber-500/15 text-amber-400" };
  if (cliente.orderCount > 1) return { text: "Recompra", tone: "bg-emerald-500/15 text-emerald-400" };
  return { text: "Novo", tone: "bg-blue-500/15 text-blue-400" };
}

interface CheckoutClienteDetalheProps {
  cliente: CheckoutClienteSummary;
}

export function CheckoutClienteDetalhe({ cliente }: CheckoutClienteDetalheProps) {
  const [pedidos, setPedidos] = useState<CheckoutClientePedido[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pedidosPage, setPedidosPage] = useState(1);
  const [filterProduct, setFilterProduct] = useState("all");

  const behavior = getBehaviorLabel(cliente);

  async function loadPedidos() {
    if (pedidos !== null || loading) return;
    setLoading(true);
    try {
      const res = await clientApi<{ pedidos: CheckoutClientePedido[] }>(
        `/checkout/clientes/${cliente.userId}/pedidos`
      );
      setPedidos(res.pedidos);
    } catch {
      toast.error("Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  const filteredPedidos = useMemo(() => {
    if (!pedidos) return [];
    if (filterProduct === "all") return pedidos;
    return pedidos.filter((p) => p.description === filterProduct);
  }, [pedidos, filterProduct]);

  const pedidosPageCount = Math.max(1, Math.ceil(filteredPedidos.length / PEDIDOS_PAGE_SIZE));
  const safePedidosPage = Math.min(pedidosPage, pedidosPageCount);
  const paginatedPedidos = filteredPedidos.slice(
    (safePedidosPage - 1) * PEDIDOS_PAGE_SIZE,
    safePedidosPage * PEDIDOS_PAGE_SIZE
  );

  const productOptions = useMemo(() => {
    return [...new Set(cliente.purchasedProducts)].sort();
  }, [cliente.purchasedProducts]);

  function handleMenuAction(action: string, pedido: CheckoutClientePedido) {
    switch (action) {
      case "details":
        toast.info(
          `Pedido #${pedido.id}\n${pedido.description}\n${formatBRL(pedido.amountCents)} — ${getStatusConfig(pedido.status).label}\n${formatDate(pedido.createdAt)}`
        );
        break;
      case "receipt":
        toast("Comprovante — em breve");
        break;
      case "refund":
        toast("Reembolsar — em breve");
        break;
      case "invoice":
        toast("Emitir nota fiscal — em breve");
        break;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <PageHeader
        eyebrow="Checkout › Clientes"
        title={cliente.userLogin}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">ID:</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{cliente.abacateCustomerId}</code>
          <CopyButton value={cliente.abacateCustomerId} label="Copiar ID" />
        </span>
        {cliente.userEmail && (
          <span className="flex items-center gap-1.5">
            <span className="text-muted-foreground">E-mail:</span>
            <span className="font-medium">{cliente.userEmail}</span>
            <CopyButton value={cliente.userEmail} label="Copiar e-mail" />
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Criado em:</span>
          <span>{formatDate(cliente.createdAt)}</span>
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Total faturado</p>
            <p className="text-xl font-bold tabular-nums">{formatBRL(cliente.totalSpentCents)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Pedidos</p>
            <p className="text-xl font-bold tabular-nums">{cliente.orderCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Último produto</p>
            <p className="text-sm font-medium mt-1">{cliente.lastPaidProduct ?? "Nenhum"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Comportamento</p>
            <Badge variant="outline" className={`mt-1 ${behavior.tone}`}>{behavior.text}</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pedidos" onValueChange={(v) => { if (v === "pedidos") void loadPedidos(); }}>
        <TabsList className="w-full">
          <TabsTrigger value="pedidos" className="flex-1" onClick={() => void loadPedidos()}>
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="produtos" className="flex-1">
            Produtos comprados
          </TabsTrigger>
        </TabsList>

        {/* Aba Pedidos */}
        <TabsContent value="pedidos">
          <div className="flex flex-col gap-4 mt-4">
            {/* Filtro de produto */}
            {productOptions.length > 1 && (
              <select
                value={filterProduct}
                onChange={(e) => {
                  setFilterProduct(e.target.value);
                  setPedidosPage(1);
                }}
                className="h-8 w-fit rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="all">Todos os produtos</option>
                {productOptions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}

            <div className="rounded-lg border border-border/60 overflow-hidden">
              {loading && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  Carregando pedidos…
                </div>
              )}

              {!loading && pedidos !== null && filteredPedidos.length === 0 && (
                <EmptyState
                  icon={ShoppingCartIcon}
                  title="Nenhum pedido"
                  description={filterProduct !== "all" ? "Tente outro produto." : "Este cliente ainda não tem pedidos."}
                  className="m-4"
                />
              )}

              {!loading && filteredPedidos.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ID do pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-12">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPedidos.map((pedido) => {
                      const statusCfg = getStatusConfig(pedido.status);
                      return (
                        <TableRow key={pedido.id}>
                          <TableCell className="text-sm">{pedido.description}</TableCell>
                          <TableCell className="text-sm tabular-nums">{formatBRL(pedido.amountCents)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusCfg.className}>
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {truncateId(pedido.id)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateShort(pedido.createdAt)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleMenuAction("details", pedido)}>
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMenuAction("receipt", pedido)}>
                                  Comprovante
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMenuAction("refund", pedido)}>
                                  Reembolsar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMenuAction("invoice", pedido)}>
                                  Emitir nota fiscal
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {pedidosPageCount > 1 && (
              <Pagination page={safePedidosPage} pageCount={pedidosPageCount} onPageChange={setPedidosPage} />
            )}
          </div>
        </TabsContent>

        {/* Aba Produtos */}
        <TabsContent value="produtos">
          <div className="mt-4">
            {cliente.purchasedProducts.length === 0 ? (
              <EmptyState
                icon={ShoppingCartIcon}
                title="Nenhum produto"
                description="Este cliente ainda não comprou nenhum produto."
                className="m-4"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {cliente.purchasedProducts.map((p) => (
                  <Badge key={p} variant="secondary" className="text-sm px-3 py-1">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que o ícone `EllipsisVerticalIcon` existe**

Run: `grep -n "EllipsisVertical\|MoreVertical\|DotsVertical" /home/guilherme/projetos/sg/home-admin/web/src/components/ui/icons.tsx`

Se não existir, usar `MoreHorizontalIcon` ou adicionar o ícone. O nome exato depende do que está no arquivo de ícones do projeto. Ajustar o import conforme o resultado.

- [ ] **Step 3: Verificar compilação**

Run: `cd /home/guilherme/projetos/sg/home-admin/web && bun run lint`
Expected: sem erros

- [ ] **Step 4: Commit**

```bash
git add web/src/components/checkout/checkout-cliente-detalhe.tsx
git commit -m "feat(checkout): componente de detalhe do cliente com stats, tabs e pedidos"
```

---

### Task 4: Criar rota dinâmica `/checkout/clientes/[id]`

**Files:**
- Create: `web/src/app/checkout/clientes/[id]/page.tsx`

- [ ] **Step 1: Criar a pasta e o arquivo de rota**

```tsx
import { cookies } from "next/headers";

import { CheckoutClienteDetalhe } from "@/components/checkout/checkout-cliente-detalhe";
import { ClientRedirect } from "@/components/navigation/client-redirect";
import { AppShell } from "@/components/portal/app-shell";
import { serverApi } from "@/lib/api-server";
import { getSessionUser } from "@/lib/session";
import type { CheckoutClienteSummary } from "@/types/portal";

export const dynamic = "force-dynamic";

export default async function CheckoutClienteDetalhePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();

  if (!user) return <ClientRedirect to="/login" label="login" />;
  if (user.role !== "admin") return <ClientRedirect to="/home" label="dashboard" />;

  const { id } = await params;
  const cookieHeader = (await cookies()).toString();
  const { clientes } = await serverApi<{ clientes: CheckoutClienteSummary[] }>(
    "/checkout/clientes",
    { cookieHeader }
  );

  const cliente = clientes.find((c) => String(c.userId) === id);

  if (!cliente) {
    return <ClientRedirect to="/checkout/clientes" label="clientes" />;
  }

  return (
    <AppShell user={user} title={cliente.userLogin} description="Detalhe do cliente.">
      <div className="p-6">
        <CheckoutClienteDetalhe cliente={cliente} />
      </div>
    </AppShell>
  );
}
```

Nota: `params` é uma `Promise` no Next.js 15+/16.

- [ ] **Step 2: Verificar compilação**

Run: `cd /home/guilherme/projetos/sg/home-admin/web && bun run lint`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add web/src/app/checkout/clientes/\[id\]/page.tsx
git commit -m "feat(checkout): rota dinâmica /checkout/clientes/[id] para detalhe"
```

---

### Task 5: Remover arquivo antigo e testar no browser

**Files:**
- Delete: `web/src/components/checkout/checkout-clientes-panel.tsx`

- [ ] **Step 1: Verificar que nenhum outro arquivo importa `checkout-clientes-panel`**

Run: `grep -rn "checkout-clientes-panel" /home/guilherme/projetos/sg/home-admin/web/src/`

Expected: nenhum resultado (o `page.tsx` já foi atualizado na Task 2). Se algum arquivo ainda importar, ajustar antes de deletar.

- [ ] **Step 2: Deletar o arquivo antigo**

```bash
rm web/src/components/checkout/checkout-clientes-panel.tsx
```

- [ ] **Step 3: Verificar compilação**

Run: `cd /home/guilherme/projetos/sg/home-admin/web && bun run lint`
Expected: sem erros

- [ ] **Step 4: Iniciar o dev server e testar no browser**

Run: `cd /home/guilherme/projetos/sg/home-admin && bun run dev`

Testes manuais:
1. Abrir `http://localhost:3001/checkout/clientes` — deve mostrar a lista limpa com busca + tabela
2. Digitar na busca — deve filtrar em tempo real
3. Clicar em uma linha — deve navegar para `/checkout/clientes/{userId}`
4. Na página de detalhe: verificar cabeçalho (nome, ID copiável, e-mail copiável, data)
5. Verificar grid de stats (total faturado, pedidos, último produto, comportamento)
6. Clicar na aba "Pedidos" — deve carregar pedidos do cliente
7. Verificar badges de status (cores corretas por status)
8. Clicar no menu `⋮` de um pedido — deve mostrar 4 opções (Ver detalhes mostra toast com info, demais mostram "em breve")
9. Clicar na aba "Produtos comprados" — deve listar badges com nomes dos produtos
10. Clicar no breadcrumb "Checkout › Clientes" do PageHeader — verificar navegação de volta

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(checkout): remove painel antigo, redesign completo de clientes"
```
