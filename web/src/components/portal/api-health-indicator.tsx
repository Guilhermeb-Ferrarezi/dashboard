"use client";

import { useApiHealth } from "@/hooks/use-api-health";
import { StatusDot, type StatusTone } from "@/components/ui/status-dot";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Paleta alinhada com StatusBadge do projeto (bg-X-500/15 text-X-400
// border-X-500/30). Mantemos os 4 tons semânticos; 'info' e 'idle' viram
// neutros pra não competir com o ember do tema.
const TONE_BORDER: Record<StatusTone, string> = {
  success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  error: "border-red-500/30 bg-red-500/15 text-red-400",
  info: "border-border/60 bg-muted/40 text-muted-foreground",
  idle: "border-border/60 bg-muted/40 text-muted-foreground",
};

export function ApiHealthIndicator({ className }: { className?: string }) {
  const state = useApiHealth();

  const lastChecked =
    state.checkedAt > 0
      ? new Date(state.checkedAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "—";

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
            TONE_BORDER[state.tone],
            className,
          )}
          aria-label={`Status do backend: ${state.label}`}
        >
          <StatusDot tone={state.tone} pulse={state.tone === "success"} size="xs" />
          <span>{state.label}</span>
          {state.latencyMs != null ? (
            <span className="hidden tabular-nums opacity-80 sm:inline">
              · {state.latencyMs}ms
            </span>
          ) : null}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-0.5">
            <p className="font-semibold">{state.detail}</p>
            <p className="text-muted-foreground">Última verificação: {lastChecked}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
