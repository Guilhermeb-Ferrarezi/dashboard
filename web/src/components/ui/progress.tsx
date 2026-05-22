import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressTone = "primary" | "success" | "warning" | "error";

const TONE: Record<ProgressTone, string> = {
  primary: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
};

interface ProgressProps extends React.ComponentProps<"div"> {
  value: number;
  max?: number;
  tone?: ProgressTone;
  indeterminate?: boolean;
  showLabel?: boolean;
}

function Progress({
  value,
  max = 100,
  tone = "primary",
  indeterminate = false,
  showLabel = false,
  className,
  ...props
}: ProgressProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : value}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            TONE[tone],
            indeterminate &&
              "w-1/3 animate-[progressIndeterminate_1.4s_ease-in-out_infinite]",
          )}
          style={indeterminate ? undefined : { width: `${percent}%` }}
        />
      </div>
      {showLabel ? (
        <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
          {indeterminate ? "…" : `${Math.round(percent)}%`}
        </p>
      ) : null}
    </div>
  );
}

export { Progress };
