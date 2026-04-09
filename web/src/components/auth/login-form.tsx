"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { KeyRoundIcon, LoaderCircleIcon, User2Icon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clientApi } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      await clientApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      startTransition(() => {
        router.replace("/home");
        router.refresh();
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel entrar.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,117,24,0.18),_transparent_36%),linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent)]" />
      <Card className="w-full max-w-md border-border/60 bg-card/92 shadow-2xl shadow-black/25 backdrop-blur">
        <CardHeader className="gap-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background/60">
              <Image
                src="/assets/logo.png"
                alt="Santos Tech"
                width={48}
                height={48}
                priority
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">
                Santos Tech
              </p>
              <CardTitle className="text-2xl">Universal Home</CardTitle>
              <p className="text-sm text-muted-foreground">
                Entre com usuario ou email para abrir seus projetos.
              </p>
            </div>
          </div>
          <Alert>
            <AlertTitle>SSO piloto ativo</AlertTitle>
            <AlertDescription>
              O portal ja prepara tickets de acesso para integracoes com o
              admin-portal.
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">
                Usuario ou email
              </span>
              <div className="relative">
                <User2Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="voce@santos-tech.com"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Senha</span>
              <div className="relative">
                <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
              Entrar no portal
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
