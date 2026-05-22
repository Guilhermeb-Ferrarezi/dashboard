"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import {
  ClockIcon,
  CopyIcon,
  ExternalLinkIcon,
  LogOutIcon,
  MoonIcon,
  RefreshCwIcon,
  SettingsIcon,
  SparklesIcon,
  SunIcon,
} from "@/components/ui/icons";
import { useRecentlyVisited } from "@/hooks/use-recently-visited";
import { clientApi } from "@/lib/api";
import { openPortalQuickSearch } from "@/components/portal/portal-quick-search";

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  group: "Tema" | "Navegação" | "Compartilhar" | "Conta";
  run: () => void | Promise<void>;
};

function isTypingInField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const recents = useRecentlyVisited();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) return;
      if (!event.shiftKey) return;
      if (isTypingInField(event.target) && event.key !== "p" && event.key !== "P") return;
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function runThenClose(handler: () => void | Promise<void>) {
    return async () => {
      setOpen(false);
      await handler();
    };
  }

  async function handleLogout() {
    try {
      await clientApi<{ message: string }>("/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível sair.",
      );
    }
  }

  const actions: Action[] = [
    {
      id: "theme-light",
      label: "Tema claro",
      icon: SunIcon,
      group: "Tema",
      run: runThenClose(() => setTheme("light")),
    },
    {
      id: "theme-dark",
      label: "Tema escuro",
      icon: MoonIcon,
      group: "Tema",
      run: runThenClose(() => setTheme("dark")),
    },
    {
      id: "theme-onix",
      label: "Tema onix",
      icon: SparklesIcon,
      group: "Tema",
      run: runThenClose(() => setTheme("onix")),
    },
    {
      id: "refresh",
      label: "Atualizar página",
      icon: RefreshCwIcon,
      group: "Navegação",
      shortcut: "R",
      run: runThenClose(() => router.refresh()),
    },
    {
      id: "search",
      label: "Abrir busca rápida",
      icon: SettingsIcon,
      group: "Navegação",
      shortcut: "⌘K",
      run: runThenClose(() => openPortalQuickSearch()),
    },
    {
      id: "go-home",
      label: "Ir para o Dashboard",
      icon: SettingsIcon,
      group: "Navegação",
      run: runThenClose(() => router.push("/home")),
    },
    {
      id: "copy-url",
      label: "Copiar URL atual",
      icon: CopyIcon,
      group: "Compartilhar",
      run: runThenClose(async () => {
        const url = window.location.href;
        try {
          await navigator.clipboard.writeText(url);
          toast.success("URL copiada", { description: url });
        } catch {
          toast.error("Não foi possível copiar a URL.");
        }
      }),
    },
    {
      id: "print",
      label: "Imprimir página",
      icon: ExternalLinkIcon,
      group: "Compartilhar",
      run: runThenClose(() => {
        if (typeof window !== "undefined") window.print();
      }),
    },
    {
      id: "share-whatsapp",
      label: "Compartilhar via WhatsApp",
      icon: ExternalLinkIcon,
      group: "Compartilhar",
      run: runThenClose(() => {
        const url = window.location.href;
        const text = encodeURIComponent(`Olha o que estou vendo: ${url}`);
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
      }),
    },
    {
      id: "logout",
      label: "Sair",
      icon: LogOutIcon,
      group: "Conta",
      run: runThenClose(handleLogout),
    },
  ];

  const grouped = actions.reduce<Record<Action["group"], Action[]>>(
    (acc, action) => {
      (acc[action.group] = acc[action.group] ?? []).push(action);
      return acc;
    },
    { Tema: [], Navegação: [], Compartilhar: [], Conta: [] },
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="min-h-[280px]">
        <CommandInput placeholder="Buscar ação… (tema, atalho, conta)" />
        <CommandList>
          {recents.length > 0 ? (
            <CommandGroup heading="Páginas recentes">
              {recents.map((entry) => (
                <CommandItem
                  key={entry.path}
                  value={`recente ${entry.path}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(entry.path);
                  }}
                >
                  <ClockIcon className="size-4" />
                  <span className="flex-1 truncate">{entry.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1.5 px-6 py-8 text-center">
              <p className="text-sm font-medium text-foreground">Nenhuma ação</p>
              <p className="text-xs text-muted-foreground">
                Tente outro termo. Use <Kbd>⌘</Kbd> <Kbd>K</Kbd> para buscar conteúdo.
              </p>
            </div>
          </CommandEmpty>
          {(Object.entries(grouped) as Array<[Action["group"], Action[]]>).map(
            ([group, items]) =>
              items.length > 0 ? (
                <CommandGroup key={group} heading={group}>
                  {items.map((action) => {
                    const Icon = action.icon;
                    return (
                      <CommandItem
                        key={action.id}
                        value={`${action.group} ${action.label}`}
                        onSelect={() => action.run()}
                      >
                        <Icon className="size-4" />
                        <span className="flex-1">{action.label}</span>
                        {action.shortcut ? (
                          <Kbd className="ml-auto">{action.shortcut}</Kbd>
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null,
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
