"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type RadioGroupContextValue = {
  value: string | undefined;
  onValueChange: (value: string) => void;
  name: string;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
  null,
);

interface RadioGroupProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

function RadioGroup({
  value: controlledValue,
  defaultValue,
  onValueChange,
  name,
  className,
  children,
  ...props
}: RadioGroupProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const value = controlledValue ?? internalValue;
  const generatedName = React.useId();

  const context = React.useMemo<RadioGroupContextValue>(
    () => ({
      value,
      name: name ?? `radio-${generatedName}`,
      onValueChange: (next: string) => {
        if (controlledValue === undefined) setInternalValue(next);
        onValueChange?.(next);
      },
    }),
    [value, name, generatedName, controlledValue, onValueChange],
  );

  return (
    <RadioGroupContext.Provider value={context}>
      <div
        role="radiogroup"
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps extends Omit<React.ComponentProps<"input">, "type" | "name"> {
  value: string;
}

function RadioGroupItem({
  value,
  className,
  disabled,
  ...props
}: RadioGroupItemProps) {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioGroupItem must be used inside RadioGroup");
  const checked = ctx.value === value;
  return (
    <span className="relative inline-flex">
      <input
        type="radio"
        name={ctx.name}
        value={value}
        checked={checked}
        onChange={() => ctx.onValueChange(value)}
        disabled={disabled}
        className={cn(
          "peer size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-input bg-background shadow-xs transition-[background-color,border-color,box-shadow] duration-150 outline-none hover:border-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 checked:border-primary checked:bg-primary",
          className,
        )}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
      />
    </span>
  );
}

export { RadioGroup, RadioGroupItem };
