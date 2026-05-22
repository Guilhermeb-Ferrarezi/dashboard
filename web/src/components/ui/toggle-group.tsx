"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ToggleGroupContextValue<T extends string = string> = {
  value: T | undefined;
  setValue: (next: T) => void;
};

const ToggleGroupContext =
  React.createContext<ToggleGroupContextValue | null>(null);

interface ToggleGroupProps<T extends string = string>
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
}

function ToggleGroup<T extends string = string>({
  value: controlledValue,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: ToggleGroupProps<T>) {
  const [internal, setInternal] = React.useState<T | undefined>(defaultValue);
  const value = controlledValue ?? internal;
  const ctx: ToggleGroupContextValue<T> = React.useMemo(
    () => ({
      value,
      setValue: (next: T) => {
        if (controlledValue === undefined) setInternal(next);
        onValueChange?.(next);
      },
    }),
    [value, controlledValue, onValueChange],
  );
  return (
    <ToggleGroupContext.Provider
      value={ctx as unknown as ToggleGroupContextValue}
    >
      <div
        role="radiogroup"
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-background/50 p-0.5",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

interface ToggleGroupItemProps extends React.ComponentProps<"button"> {
  value: string;
}

function ToggleGroupItem({
  value,
  className,
  children,
  ...props
}: ToggleGroupItemProps) {
  const ctx = React.useContext(ToggleGroupContext);
  if (!ctx) throw new Error("ToggleGroupItem must be inside ToggleGroup");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-state={active ? "on" : "off"}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "rounded px-2.5 py-1 text-[11px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export { ToggleGroup, ToggleGroupItem };
