"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircleIcon,
  LogOutIcon,
  PaletteIcon,
  ShieldIcon,
  UserRoundPenIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppearanceSettingsPanel } from "@/components/portal/appearance-settings-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";

interface AccountSettingsDialogProps {
  user: SessionUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => Promise<void>;
}

type SettingsSection = "account" | "preferences" | "session";

const settingsSections: Array<{
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "account", label: "Minha conta", icon: UserRoundPenIcon },
  { id: "preferences", label: "Preferencias", icon: PaletteIcon },
  { id: "session", label: "Sessao", icon: ShieldIcon },
];

export function AccountSettingsDialog({
  user,
  open,
  onOpenChange,
  onLogout,
}: AccountSettingsDialogProps) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email ?? "");
  const [pending, setPending] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");

  useEffect(() => {
    setUsername(user.username);
    setEmail(user.email ?? "");
  }, [user.email, user.username]);

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    try {
      await clientApi<{ user: SessionUser }>("/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          username,
          email: email.trim() || undefined,
        }),
      });

      startTransition(() => {
        router.refresh();
      });
      toast.success("Conta atualizada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel atualizar.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[min(760px,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <div className="grid min-h-0 md:grid-cols-[250px_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-border bg-muted/35 p-4 md:border-r md:border-b-0">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground ring-2 ring-background">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.username}</p>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setActiveSection("account")}
                >
                  Editar perfil
                  <UserRoundPenIcon className="size-3" />
                </button>
              </div>
            </div>

            <div className="mt-5">
              <Input
                readOnly
                value=""
                placeholder="Buscar"
                className="h-9 bg-background/70"
              />
            </div>

            <nav className="mt-5 space-y-6 text-sm">
              <div className="space-y-1">
                <p className="px-2 text-xs font-medium text-muted-foreground">
                  Configuracoes do usuario
                </p>
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left font-medium transition-colors",
                        active
                          ? "bg-primary/12 text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {section.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1 border-t border-border/70 pt-4">
                <p className="px-2 text-xs font-medium text-muted-foreground">
                  Acesso
                </p>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOutIcon className="size-4" />
                  Sair da conta
                </button>
              </div>
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col bg-popover">
            <DialogHeader className="border-b border-border px-5 py-4">
              <DialogTitle>
                {activeSection === "account"
                  ? "Minha conta"
                  : activeSection === "preferences"
                    ? "Preferencias"
                    : "Sessao"}
              </DialogTitle>
              <DialogDescription>
                {activeSection === "account"
                  ? "Dados basicos usados no portal."
                  : activeSection === "preferences"
                    ? "Tema, aparencia e conforto visual."
                    : "Controle de acesso da sessao atual."}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              {activeSection === "account" ? (
                <form className="mx-auto max-w-2xl space-y-5" onSubmit={handleProfileSubmit}>
                  <div className="overflow-hidden rounded-lg border border-border bg-background">
                    <div className="h-24 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_72%,white),color-mix(in_oklch,var(--primary)_42%,black))]" />
                    <div className="px-4 pb-4">
                      <div className="-mt-8 flex items-end justify-between gap-4">
                        <div className="flex items-end gap-3">
                          <div className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground ring-4 ring-background">
                            {user.username.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="pb-1">
                            <p className="text-lg font-semibold">{user.username}</p>
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                              {user.role}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 divide-y divide-border/70 rounded-lg bg-muted/35">
                        <label className="grid gap-2 p-4 md:grid-cols-[160px_1fr_auto] md:items-center">
                          <span className="text-sm font-medium">Nome exibido</span>
                          <Input
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            minLength={3}
                            required
                          />
                          <Button type="submit" size="sm" disabled={pending}>
                            {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
                            Salvar
                          </Button>
                        </label>
                        <label className="grid gap-2 p-4 md:grid-cols-[160px_1fr_auto] md:items-center">
                          <span className="text-sm font-medium">E-mail</span>
                          <Input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="voce@santos-tech.com"
                          />
                          <Button type="submit" variant="outline" size="sm" disabled={pending}>
                            Editar
                          </Button>
                        </label>
                        <div className="grid gap-2 p-4 md:grid-cols-[160px_1fr_auto] md:items-center">
                          <span className="text-sm font-medium">Perfil</span>
                          <span className="text-sm text-muted-foreground">
                            {user.role}
                          </span>
                          <span className="rounded-md border border-border px-2 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            ativo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              ) : null}

              {activeSection === "preferences" ? (
                <div className="mx-auto max-w-3xl">
                  <AppearanceSettingsPanel preferences={user.preferences} framed={false} />
                </div>
              ) : null}

              {activeSection === "session" ? (
                <div className="mx-auto max-w-2xl space-y-5">
                  <div className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <LogOutIcon className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Sessao atual</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.email ?? "sem-email@santos-tech.com"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/35 p-3">
                      <div>
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          Acesso autenticado por cookie e JWT.
                        </p>
                      </div>
                      <Button type="button" variant="destructive" onClick={onLogout}>
                        <LogOutIcon />
                        Sair da conta
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
