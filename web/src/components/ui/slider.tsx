"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  ...props
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onValueChange?.(Number(event.target.value))}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-primary/30 [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-background",
        "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary",
        className,
      )}
      style={{
        background: `linear-gradient(90deg, var(--primary) 0%, var(--primary) ${percent}%, transparent ${percent}%, transparent 100%), var(--muted)`,
      }}
      {...props}
    />
  );
}

export { Slider };
