"use client";

import {
  startTransition,
  useEffect,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  LogOutIcon,
  PaletteIcon,
  ShieldIcon,
  UserRoundPenIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { AppearanceSettingsPanel } from "@/components/portal/appearance-settings-panel";
import { CodexAccessPanel } from "@/components/portal/codex-access-panel";
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
  initialSection?: SettingsSection;
}

type SettingsSection = "account" | "preferences" | "session" | "codex";

function buildSettingsSections() {
  return [
    { id: "account", label: "Minha conta", icon: UserRoundPenIcon },
    { id: "preferences", label: "Preferências", icon: PaletteIcon },
    { id: "codex", label: "Acesso Codex", icon: ShieldIcon },
    { id: "session", label: "Sessão", icon: ShieldIcon },
  ] as Array<{
    id: SettingsSection;
    label: string;
    icon: ComponentType<{ className?: string }>;
  }>;
}

export function AccountSettingsDialog({
  user,
  open,
  onOpenChange,
  onLogout,
  initialSection = "account",
}: AccountSettingsDialogProps) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email ?? "");
  const [pending, setPending] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const settingsSections = buildSettingsSections();

  useEffect(() => {
    setUsername(user.username);
    setEmail(user.email ?? "");
  }, [user.email, user.username]);

  useEffect(() => {
    if (open) {
      setActiveSection(initialSection);
    }
  }, [initialSection, open]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
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
      <DialogContent className="grid h-[min(760px,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] !gap-0 overflow-hidden !p-0 sm:!max-w-5xl">
        <div className="grid min-h-0 md:grid-cols-[250px_1fr]">
          <aside className="flex min-h-0 flex-col border-b border-border bg-muted/35 p-4 md:border-r md:border-b-0">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.username}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {user.role}
                </p>
              </div>
            </div>

            <nav className="mt-6 space-y-5 text-sm">
              <div className="space-y-0.5">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  Conta
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
                        "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors",
                        active
                          ? "bg-foreground/8 font-medium text-foreground"
                          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {section.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-0.5 border-t border-border/70 pt-4">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                  Acesso
                </p>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOutIcon className="size-4" />
                  Sair da conta
                </button>
              </div>
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col bg-popover">
            {/* Anula -mx-4/-mt-4 do DialogHeader shadcn (que assume pai com
               p-4). Nosso DialogContent é !p-0 (layout split) — sem isso,
               a border-b vaza a largura do content e o título cola no
               topo do dialog. */}
            <DialogHeader className="!mx-0 !mt-0 border-b border-border/60 px-5 py-4">
              <DialogTitle>
                {activeSection === "account"
                  ? "Minha conta"
                  : activeSection === "preferences"
                    ? "Preferências"
                    : activeSection === "codex"
                      ? "Acesso Codex"
                    : "Sessão"}
              </DialogTitle>
              <DialogDescription>
                {activeSection === "account"
                  ? "Dados básicos usados no portal."
                  : activeSection === "preferences"
                    ? "Tema, aparência e conforto visual."
                    : activeSection === "codex"
                      ? "Gere um token de conta ou um token do Codex."
                    : "Controle de acesso da sessão atual."}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              {activeSection === "account" ? (
                <form className="mx-auto max-w-2xl space-y-6" onSubmit={handleProfileSubmit}>
                  {/* Header enxuto Linear-style: avatar size-10 sem ring,
                     nome + role discreto. Sem banner gradient/decorativo. */}
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {user.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.username}</p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        {user.role}
                      </p>
                    </div>
                  </div>

                  {/* Form-table denso: label fixa à esquerda, controle à
                     direita. Sem botão por linha — submit único no rodapé. */}
                  <div className="divide-y divide-border/60 rounded-md border border-border/60">
                    <label className="grid gap-2 px-4 py-3 md:grid-cols-[160px_1fr] md:items-center md:gap-4">
                      <span className="text-sm text-muted-foreground">Nome exibido</span>
                      <Input
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        minLength={3}
                        required
                        className="h-9"
                      />
                    </label>
                    <label className="grid gap-2 px-4 py-3 md:grid-cols-[160px_1fr] md:items-center md:gap-4">
                      <span className="text-sm text-muted-foreground">E-mail</span>
                      <Input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="voce@santos-tech.com"
                        className="h-9"
                      />
                    </label>
                    <div className="grid gap-2 px-4 py-3 md:grid-cols-[160px_1fr] md:items-center md:gap-4">
                      <span className="text-sm text-muted-foreground">Perfil</span>
                      <span className="text-sm text-foreground">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={pending}>
                      {pending ? <Spinner size="sm" /> : null}
                      Salvar alterações
                    </Button>
                  </div>
                </form>
              ) : null}

              {activeSection === "preferences" ? (
                <div className="mx-auto max-w-3xl">
                  <AppearanceSettingsPanel preferences={user.preferences} framed={false} />
                </div>
              ) : null}

              {activeSection === "codex" ? (
                <div className="mx-auto max-w-4xl">
                  <CodexAccessPanel />
                </div>
              ) : null}

              {activeSection === "session" ? (
                <div className="mx-auto max-w-2xl space-y-5">
                  {/* Sessão Linear-style: form-table denso, sem ícone
                     destructive decorativo. Botão "Sair" no rodapé. */}
                  <div className="divide-y divide-border/60 rounded-md border border-border/60">
                    <div className="grid gap-2 px-4 py-3 md:grid-cols-[160px_1fr] md:items-center md:gap-4">
                      <span className="text-sm text-muted-foreground">Usuário</span>
                      <span className="text-sm text-foreground">{user.username}</span>
                    </div>
                    <div className="grid gap-2 px-4 py-3 md:grid-cols-[160px_1fr] md:items-center md:gap-4">
                      <span className="text-sm text-muted-foreground">E-mail</span>
                      <span className="text-sm text-foreground">
                        {user.email ?? "sem-email@santos-tech.com"}
                      </span>
                    </div>
                    <div className="grid gap-2 px-4 py-3 md:grid-cols-[160px_1fr] md:items-center md:gap-4">
                      <span className="text-sm text-muted-foreground">Autenticação</span>
                      <span className="text-sm text-foreground">Cookie + JWT</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" variant="destructive" size="sm" onClick={onLogout}>
                      <LogOutIcon className="size-4" />
                      Sair da conta
                    </Button>
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
