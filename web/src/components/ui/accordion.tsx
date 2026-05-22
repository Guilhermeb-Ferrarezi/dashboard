"use client";

import * as React from "react";

import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  type: "single" | "multiple";
  values: Set<string>;
  toggle: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

interface AccordionProps extends React.ComponentProps<"div"> {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
}

function Accordion({
  type = "single",
  defaultValue,
  className,
  children,
  ...props
}: AccordionProps) {
  const initial = React.useMemo<Set<string>>(() => {
    const set = new Set<string>();
    if (Array.isArray(defaultValue)) defaultValue.forEach((v) => set.add(v));
    else if (defaultValue) set.add(defaultValue);
    return set;
  }, [defaultValue]);
  const [values, setValues] = React.useState<Set<string>>(initial);

  const toggle = React.useCallback(
    (value: string) => {
      setValues((current) => {
        const next = new Set(current);
        if (next.has(value)) {
          next.delete(value);
        } else {
          if (type === "single") next.clear();
          next.add(value);
        }
        return next;
      });
    },
    [type],
  );

  return (
    <AccordionContext.Provider value={{ type, values, toggle }}>
      <div className={cn("divide-y divide-border/50", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

const ItemContext = React.createContext<{ value: string; open: boolean } | null>(
  null,
);

function AccordionItem({
  value,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionItem must be inside Accordion");
  const open = ctx.values.has(value);
  return (
    <ItemContext.Provider value={{ value, open }}>
      <div data-state={open ? "open" : "closed"} className={cn("py-1", className)} {...props}>
        {children}
      </div>
    </ItemContext.Provider>
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  const root = React.useContext(AccordionContext);
  const item = React.useContext(ItemContext);
  if (!root || !item) throw new Error("AccordionTrigger needs Accordion + Item");
  return (
    <button
      type="button"
      aria-expanded={item.open}
      onClick={() => root.toggle(item.value)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    >
      <span className="flex-1">{children}</span>
      <ChevronDownIcon
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          item.open && "rotate-180 text-primary",
        )}
      />
    </button>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const item = React.useContext(ItemContext);
  if (!item) throw new Error("AccordionContent needs Item");
  if (!item.open) return null;
  return (
    <div
      className={cn(
        "overflow-hidden px-2 pb-2 pt-1 text-sm text-foreground/85 animate-in fade-in-0 slide-in-from-top-1 duration-150",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
