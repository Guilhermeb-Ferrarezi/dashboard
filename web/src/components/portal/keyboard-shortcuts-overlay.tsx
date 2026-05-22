"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

type ShortcutGroup = {
  label: string;
  items: Array<{ keys: string[]; description: string }>;
};

const SHORTCUTS: ShortcutGroup[] = [
  {
    label: "Navegação",
    items: [
      { keys: ["⌘", "K"], description: "Abrir busca rápida" },
      { keys: ["⌘", "⇧", "P"], description: "Abrir paleta de ações" },
      { keys: ["⌘", "B"], description: "Alternar barra lateral" },
      { keys: ["⌘", "1–9"], description: "Pular para a N-ésima seção da barra lateral" },
      { keys: ["Esc"], description: "Fechar diálogos e overlays" },
    ],
  },
  {
    label: "Dashboard",
    items: [{ keys: ["R"], description: "Atualizar dashboard" }],
  },
  {
    label: "Geral",
    items: [{ keys: ["?"], description: "Mostrar este guia" }],
  },
];

function isTypingInField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingInField(event.target)) return;
      if (event.key === "?" || (event.shiftKey && event.key === "/")) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>
            Acelere o uso do portal com estes comandos. Pressione{" "}
            <Kbd>?</Kbd> a qualquer momento para reabrir este guia.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {SHORTCUTS.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
                {group.label}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.description}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="text-foreground/85">{item.description}</span>
                    <KbdGroup>
                      {item.keys.map((key, index) => (
                        <span key={`${item.description}-${index}`} className="inline-flex items-center gap-0.5">
                          {index > 0 ? (
                            <span aria-hidden className="text-muted-foreground/60">
                              +
                            </span>
                          ) : null}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </KbdGroup>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
