"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";

type ClientRedirectProps = {
  to: string;
  label?: string;
};

export function ClientRedirect({ to, label }: ClientRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div className="grid min-h-screen place-items-center px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card/90 p-6 text-center shadow-xl shadow-black/20 backdrop-blur">
        <Spinner size="lg" className="mx-auto text-primary" label={`Redirecionando para ${label ?? to}`} />
        <p className="mt-4 text-sm font-medium text-foreground">
          Abrindo {label ?? to}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}
