"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

interface ComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  inputClassName?: string;
}

function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Selecionar…",
  emptyMessage = "Nenhuma opção",
  className,
  inputClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const selected = options.find((option) => option.value === value);
  const displayValue = open ? query : selected?.label ?? "";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={displayValue}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlight((current) => Math.min(current + 1, filtered.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter") {
            const option = filtered[highlight];
            if (option) {
              event.preventDefault();
              onValueChange?.(option.value);
              setOpen(false);
              setQuery("");
              setHighlight(0);
            }
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={cn("pr-7", inputClassName)}
      />
      <ChevronDownIcon
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground transition-transform",
          open && "rotate-180",
        )}
      />
      {open ? (
        <div
          role="listbox"
          className="absolute top-full left-0 z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border/60 bg-popover/97 p-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            filtered.map((option, index) => {
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
                  onClick={() => {
                    onValueChange?.(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    highlighted ? "bg-muted/60" : "hover:bg-muted/40",
                    active && "bg-primary/12 text-foreground shadow-[inset_2px_0_0_var(--primary)]",
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
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export { Combobox, type ComboboxOption };
