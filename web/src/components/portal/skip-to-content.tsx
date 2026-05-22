import { cn } from "@/lib/utils";

export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "fixed left-2 top-2 z-[100] -translate-y-16 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md transition-transform duration-150",
        "focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
      )}
    >
      Pular para o conteúdo
    </a>
  );
}
