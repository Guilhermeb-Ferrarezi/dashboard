import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "@/components/ui/icons";

interface StatCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: LucideIcon;
  iconTone?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: React.ReactNode;
  footer?: React.ReactNode;
}

function StatCard({
  icon: Icon,
  iconTone = "bg-primary/10 text-primary",
  label,
  value,
  hint,
  trend,
  footer,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card className={cn("border-border/60", className)} {...props}>
      <CardHeader className="border-b border-border/40 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {Icon ? (
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-md",
                iconTone,
              )}
            >
              <Icon className="size-3.5" />
            </span>
          ) : null}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          {trend}
        </div>
        {hint ? (
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {hint}
          </p>
        ) : null}
        {footer}
      </CardContent>
    </Card>
  );
}

export { StatCard };
