import * as React from "react";
import Link from "next/link";

import { ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface BreadcrumbItemSpec {
  label: React.ReactNode;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps extends React.ComponentProps<"nav"> {
  items: BreadcrumbItemSpec[];
  separator?: React.ReactNode;
}

function Breadcrumb({
  items,
  separator,
  className,
  ...props
}: BreadcrumbProps) {
  const sep =
    separator ?? <ChevronRightIcon aria-hidden className="size-3 opacity-50" />;
  return (
    <nav
      aria-label="Trilha"
      className={cn(
        "flex items-center gap-1.5 text-[11px] text-muted-foreground",
        className,
      )}
      {...props}
    >
      <ol className="flex items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;
          const content = (
            <span className="inline-flex items-center gap-1">
              {Icon ? <Icon className="size-3" /> : null}
              {item.label}
            </span>
          );
          return (
            <li key={index} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {content}
                </Link>
              ) : (
                <span
                  className={cn(isLast && "font-medium text-foreground")}
                  aria-current={isLast ? "page" : undefined}
                >
                  {content}
                </span>
              )}
              {!isLast ? sep : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumb, type BreadcrumbItemSpec };
