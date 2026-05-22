"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SwitchProps
  extends Omit<React.ComponentProps<"button">, "onChange" | "value"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

function Switch({
  checked,
  onCheckedChange,
  label,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={(event) => {
        if (disabled) return;
        onCheckedChange?.(!checked);
        props.onClick?.(event);
      }}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=checked]:shadow-sm data-[state=checked]:shadow-primary/30",
        "data-[state=unchecked]:bg-muted data-[state=unchecked]:ring-1 data-[state=unchecked]:ring-border/70",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-4 rounded-full bg-background shadow-sm ring-1 ring-foreground/10 transition-transform duration-150",
          "translate-x-0.5 data-[state=checked]:translate-x-[1.125rem]",
        )}
        data-state={checked ? "checked" : "unchecked"}
      />
    </button>
  );
}

export { Switch };
