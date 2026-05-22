import * as React from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function CardSkeleton({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <Card className={cn("border-border/60", className)}>
      <CardHeader className="border-b border-border/40 py-3">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className={cn("h-3", index === 0 ? "w-2/3" : "w-full")} />
        ))}
      </CardContent>
    </Card>
  );
}

function RowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 px-2 py-2", className)}>
      <Skeleton className="size-8 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-5 w-12 rounded-md" />
    </div>
  );
}

export { CardSkeleton, RowSkeleton };
