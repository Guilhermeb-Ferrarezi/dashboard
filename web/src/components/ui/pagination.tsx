import * as React from "react";

import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface PaginationProps extends React.ComponentProps<"nav"> {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  siblingCount?: number;
}

function range(start: number, end: number) {
  const length = end - start + 1;
  return Array.from({ length }, (_, i) => i + start);
}

function getPages(page: number, pageCount: number, siblings: number): Array<number | "…"> {
  const totalNumbers = siblings * 2 + 5;
  if (pageCount <= totalNumbers) return range(1, pageCount);
  const left = Math.max(page - siblings, 2);
  const right = Math.min(page + siblings, pageCount - 1);
  const showLeftDots = left > 2;
  const showRightDots = right < pageCount - 1;
  const out: Array<number | "…"> = [1];
  if (showLeftDots) out.push("…");
  out.push(...range(left, right));
  if (showRightDots) out.push("…");
  out.push(pageCount);
  return out;
}

function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className,
  ...props
}: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = getPages(page, pageCount, siblingCount);
  return (
    <nav
      role="navigation"
      aria-label="Paginação"
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronRightIcon className="size-4 rotate-180" />
      </Button>
      {pages.map((entry, index) =>
        entry === "…" ? (
          <span
            key={`dots-${index}`}
            className="px-2 text-xs text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Button
            key={entry}
            type="button"
            variant={entry === page ? "default" : "outline"}
            size="icon-sm"
            onClick={() => onPageChange?.(entry)}
            aria-current={entry === page ? "page" : undefined}
            aria-label={`Página ${entry}`}
            className="min-w-7 tabular-nums"
          >
            {entry}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
        aria-label="Próxima página"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </nav>
  );
}

export { Pagination };
