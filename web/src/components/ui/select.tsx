"use client";

import * as React from "react";

import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  /** Largura do popup — `match-trigger` (default) ou um valor CSS arbitrário. */
  popupWidth?: "match-trigger" | string;
}

/**
 * Select Linear-style — trigger como botão estilo Input, popup com opções
 * clicáveis. Sem input editável (use Combobox quando precisar de busca).
 *
 * Por que não usar `<select>` HTML? O popup nativo herda estilos do SO em
 * vez do tema do app, ficando ilegível em paletas escuras customizadas
 * (Onix) ou claras de alto contraste.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Selecionar…",
  className,
  id,
  disabled,
  popupWidth = "match-trigger",
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Quando abre, posiciona o highlight na opção atual.
  React.useEffect(() => {
    if (open) {
      const currentIndex = options.findIndex((o) => o.value === value);
      setHighlight(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [open, options, value]);

  const selected = options.find((option) => option.value === value);

  function selectIndex(index: number) {
    const option = options[index];
    if (option) {
      onValueChange?.(option.value);
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm shadow-xs transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-labelledby={id}
          style={popupWidth === "match-trigger" ? undefined : { width: popupWidth }}
          className={cn(
            "absolute top-full left-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border/60 bg-popover/97 p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md",
            popupWidth === "match-trigger" && "w-full",
          )}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((current) => Math.min(current + 1, options.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              selectIndex(highlight);
            } else if (event.key === "Escape") {
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          {options.map((option, index) => {
            const active = option.value === value;
            const highlighted = index === highlight;
            return (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={active}
                data-highlighted={highlighted ? "true" : undefined}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => selectIndex(index)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  highlighted ? "bg-foreground/8 text-foreground" : "text-foreground/85 hover:bg-foreground/5",
                  active && "font-medium bg-foreground/10",
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.hint ? (
                  <span className="ml-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {option.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
