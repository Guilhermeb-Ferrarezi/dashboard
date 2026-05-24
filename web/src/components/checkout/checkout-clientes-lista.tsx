"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersIcon } from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { clientApi } from "@/lib/api";
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

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-36" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="flex gap-8 border-b border-border/40 px-4 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-24" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-8 border-b border-border/20 px-4 py-3.5">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-28" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckoutClientesLista() {
  const router = useRouter();
  const [clientes, setClientes] = useState<CheckoutClienteSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    clientApi<{ clientes: CheckoutClienteSummary[] }>("/checkout/clientes")
      .then((res) => setClientes(res.clientes))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!clientes) return [];
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

  if (loading) return <ListSkeleton />;

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
