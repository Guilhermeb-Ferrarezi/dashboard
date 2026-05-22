import * as React from "react";

import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type ChipTone = "neutral" | "primary" | "success" | "warning" | "error";

const TONE: Record<ChipTone, string> = {
  neutral: "border-border/60 bg-muted/50 text-foreground",
  primary: "border-primary/30 bg-primary/10 text-primary",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  error: "border-rose-500/30 bg-rose-500/10 text-rose-500",
};

interface ChipProps extends React.ComponentProps<"span"> {
  tone?: ChipTone;
  onRemove?: () => void;
  removable?: boolean;
}

function Chip({
  tone = "neutral",
  removable = false,
  onRemove,
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium",
        TONE[tone],
        className,
      )}
      {...props}
    >
      {children}
      {removable ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove?.();
          }}
          className="-mr-0.5 ml-0.5 inline-flex size-3.5 items-center justify-center rounded-full text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Remover"
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export { Chip, type ChipTone };
