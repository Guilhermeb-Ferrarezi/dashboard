"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { clientApi } from "@/lib/api";
import { CheckoutClienteDetalhe } from "@/components/checkout/checkout-cliente-detalhe";
import type { CheckoutClienteSummary } from "@/types/portal";

function DetalheSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-5 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/60 p-4">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="flex gap-6 border-b border-border/40 px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-6 border-b border-border/20 px-4 py-3.5">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CheckoutClienteDetalheLoaderProps {
  userId: string;
}

export function CheckoutClienteDetalheLoader({ userId }: CheckoutClienteDetalheLoaderProps) {
  const router = useRouter();
  const [cliente, setCliente] = useState<CheckoutClienteSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientApi<{ clientes: CheckoutClienteSummary[] }>("/checkout/clientes")
      .then((res) => {
        const found = res.clientes.find((c) => String(c.userId) === userId);
        if (found) {
          setCliente(found);
        } else {
          toast.error("Cliente não encontrado.");
          router.push("/checkout/clientes");
        }
      })
      .catch(() => {
        toast.error("Erro ao carregar cliente.");
      })
      .finally(() => setLoading(false));
  }, [userId, router]);

  if (loading || !cliente) return <DetalheSkeleton />;

  return <CheckoutClienteDetalhe cliente={cliente} />;
}
