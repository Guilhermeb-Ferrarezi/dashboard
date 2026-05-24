import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutClienteDetalheLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* PageHeader */}
      <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-56" />
      </div>

      {/* Meta (ID, email, data) */}
      <div className="flex flex-wrap items-center gap-6">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-5 w-44" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/60 p-4">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Skeleton className="h-9 w-full rounded-lg" />

      {/* Table */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="flex gap-6 border-b border-border/40 px-4 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-6 border-b border-border/20 px-4 py-3.5">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
