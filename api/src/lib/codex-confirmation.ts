export type CodexConfirmationRiskLevel = "low" | "elevated" | "high";

export type CodexConfirmationClassification = {
  requiresConfirmation: boolean;
  riskLevel: CodexConfirmationRiskLevel;
  reasons: string[];
};

const HIGH_RISK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(delete|remove|apagar|excluir|destroy|drop|truncate)\b/i, reason: "Ação destrutiva." },
  { pattern: /\b(revoke|revogar|invalidar|reset\s+token|rotate\s+token)\b/i, reason: "Mexe com credenciais ou acessos." },
  { pattern: /\b(force\s+push|push\s+--force|rebase\s+--hard|reset\s+--hard)\b/i, reason: "Pode sobrescrever histórico." },
  { pattern: /\b(prod|production|publicar|deploy|release)\b/i, reason: "Pode afetar um ambiente externo." },
  { pattern: /\b(format|wipe|purge)\b/i, reason: "Pode apagar conteúdo em massa." },
  { pattern: /\b(desativar|disable)\b.*\b(firewall|ssl|auth|seguranca|security)\b/i, reason: "Pode reduzir segurança." },
  { pattern: /\b(flexible ssl|ssl flexible|nameserver|nameservers|dns)\b/i, reason: "Pode afetar disponibilidade ou DNS." },
  { pattern: /\brm\s+-rf\b/i, reason: "Comando de remoção destrutiva." },
];

const ELEVATED_RISK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(token|senha|password|secret|credential)\b/i, reason: "Toca em segredos ou credenciais." },
  { pattern: /\b(criar|create|adicionar|add|novo|nova)\b/i, reason: "Cria recurso ou estado novo." },
  { pattern: /\b(alterar|editar|update|atualizar|mudar|replace|configurar|setar)\b/i, reason: "Solicita uma mudança no estado atual." },
  { pattern: /\b(post|put|patch|delete)\b/i, reason: "Indica chamada de escrita." },
];

export function classifyCodexPrompt(prompt: string): CodexConfirmationClassification {
  const normalized = prompt.trim();
  const reasons = new Set<string>();

  for (const entry of HIGH_RISK_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      reasons.add(entry.reason);
    }
  }

  if (reasons.size > 0) {
    return {
      requiresConfirmation: true,
      riskLevel: "high",
      reasons: Array.from(reasons),
    };
  }

  for (const entry of ELEVATED_RISK_PATTERNS) {
    if (entry.pattern.test(normalized)) {
      reasons.add(entry.reason);
    }
  }

  if (reasons.size > 0) {
    return {
      requiresConfirmation: true,
      riskLevel: "elevated",
      reasons: Array.from(reasons),
    };
  }

  return {
    requiresConfirmation: false,
    riskLevel: "low",
    reasons: [],
  };
}

export function buildCodexConfirmationSummary(prompt: string) {
  return classifyCodexPrompt(prompt);
}
