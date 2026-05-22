import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-3",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-0.5">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/85">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-heading text-base font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { SectionHeader };
