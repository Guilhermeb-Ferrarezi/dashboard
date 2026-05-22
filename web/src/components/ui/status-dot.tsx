import * as React from "react";

import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "error" | "info" | "idle";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
  info: "bg-sky-500",
  idle: "bg-muted-foreground/60",
};

interface StatusDotProps extends React.ComponentProps<"span"> {
  tone?: StatusTone;
  pulse?: boolean;
  size?: "xs" | "sm" | "md";
}

const SIZE_CLASS: Record<NonNullable<StatusDotProps["size"]>, string> = {
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2.5",
};

const TONE_LABEL: Record<StatusTone, string> = {
  success: "operacional",
  warning: "atenção",
  error: "indisponível",
  info: "informativo",
  idle: "inativo",
};

function StatusDot({
  tone = "idle",
  pulse = false,
  size = "sm",
  title,
  className,
  ...props
}: StatusDotProps) {
  return (
    <span
      role="status"
      aria-label={title ?? TONE_LABEL[tone]}
      title={title ?? TONE_LABEL[tone]}
      data-tone={tone}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        SIZE_CLASS[size],
        className,
      )}
      {...props}
    >
      {pulse ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-75",
            TONE_CLASS[tone],
          )}
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          "relative inline-flex size-full rounded-full",
          TONE_CLASS[tone],
        )}
      />
    </span>
  );
}

export { StatusDot, type StatusTone };
