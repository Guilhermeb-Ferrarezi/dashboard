import { cn } from "@/lib/utils"

function Skeleton({
  className,
  shimmer = true,
  ...props
}: React.ComponentProps<"div"> & { shimmer?: boolean }) {
  return (
    <div
      data-slot="skeleton"
      data-shimmer={shimmer ? "true" : "false"}
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/70",
        "data-[shimmer=true]:before:absolute data-[shimmer=true]:before:inset-0 data-[shimmer=true]:before:-translate-x-full data-[shimmer=true]:before:animate-[shimmer_1.6s_ease-in-out_infinite] data-[shimmer=true]:before:bg-gradient-to-r data-[shimmer=true]:before:from-transparent data-[shimmer=true]:before:via-foreground/[0.08] data-[shimmer=true]:before:to-transparent",
        "dark:data-[shimmer=true]:before:via-foreground/[0.06]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
