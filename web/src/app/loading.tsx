import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <main
      className="min-h-screen bg-background px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/40 pb-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        {/* Status row */}
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>

        {/* KPI cards */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="border-b border-border/40 py-3">
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="space-y-1.5">
                      <Skeleton className="h-2 w-16" />
                      <Skeleton className="h-7 w-20" />
                      <Skeleton className="h-2 w-12" />
                    </div>
                    <div className="space-y-1.5">
                      <Skeleton className="h-2 w-16" />
                      <Skeleton className="h-7 w-20" />
                      <Skeleton className="h-2 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-full rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Charts */}
        <section className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="border-b border-border/40 py-3">
                  <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent className="pt-4">
                  <Skeleton className="h-44 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
