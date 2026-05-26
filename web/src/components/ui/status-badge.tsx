import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Tons de StatusBadge usados no projeto.
 *
 * Cada tom segue a fórmula `bg-X-500/15 text-X-400 border-X-500/30` (ou
 * o equivalente neutro pra "muted"). Os 5 tons cobrem o vocabulário
 * que o Corujão já usa em status de conversa, pagamento, sessão e
 * forma de visita.
 *
 * Outras telas (VCT, portal-dashboard, api-health, codex, checkout) hoje
 * têm variações dessa fórmula. Quando migrarmos cada uma, basta passar
 * o tone equivalente — sem reinventar palette nova.
 */
export type StatusBadgeTone = "emerald" | "amber" | "red" | "blue" | "muted"

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  red: "bg-red-500/15 text-red-400 border-red-500/30",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  muted: "bg-muted text-muted-foreground border-border/40",
}

type StatusBadgeProps = {
  tone: StatusBadgeTone
  className?: string
  children: React.ReactNode
}

/**
 * Badge de status com paleta padronizada. Sempre `variant="outline"` +
 * `font-normal` — match do uso histórico no Corujão. Passe `className`
 * pra ajustes pontuais (margem, tracking, etc.) sem precisar reescrever
 * o tone.
 */
export function StatusBadge({ tone, className, children }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("font-normal", TONE_CLASSES[tone], className)}>
      {children}
    </Badge>
  )
}
