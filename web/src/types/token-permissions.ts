export type TokenResource = "profile" | "sessions" | "checkout" | "projects" | "logs" | "codex" | "admin" | "*";
export type TokenAction = "read" | "write" | "admin";
export type TokenScope = `${TokenResource}:${TokenAction}`;

export const ALL_SCOPES: TokenScope[] = [
  "profile:read",
  "profile:write",
  "sessions:read",
  "sessions:admin",
  "checkout:read",
  "checkout:write",
  "checkout:admin",
  "projects:read",
  "projects:write",
  "logs:read",
  "codex:read",
  "codex:write",
  "admin:read",
  "admin:write",
  "admin:admin",
];

export const SCOPE_GROUPS: Record<string, { label: string; scopes: TokenScope[] }> = {
  profile:  { label: "Perfil",     scopes: ["profile:read", "profile:write"] },
  sessions: { label: "Sessões",    scopes: ["sessions:read", "sessions:admin"] },
  checkout: { label: "Checkout",   scopes: ["checkout:read", "checkout:write", "checkout:admin"] },
  projects: { label: "Projetos",   scopes: ["projects:read", "projects:write"] },
  logs:     { label: "Logs",       scopes: ["logs:read"] },
  codex:    { label: "Codex",      scopes: ["codex:read", "codex:write"] },
  admin:    { label: "Admin",      scopes: ["admin:read", "admin:write", "admin:admin"] },
};

export const SCOPE_LABELS: Record<TokenScope, string> = {
  "profile:read":    "Perfil — leitura",
  "profile:write":   "Perfil — escrita",
  "sessions:read":   "Sessões — leitura",
  "sessions:admin":  "Sessões — admin",
  "checkout:read":   "Checkout — leitura",
  "checkout:write":  "Checkout — escrita",
  "checkout:admin":  "Checkout — admin",
  "projects:read":   "Projetos — leitura",
  "projects:write":  "Projetos — escrita",
  "logs:read":       "Logs — leitura",
  "codex:read":      "Codex — leitura",
  "codex:write":     "Codex — escrita",
  "admin:read":      "Admin — leitura",
  "admin:write":     "Admin — escrita",
  "admin:admin":     "Admin — admin",
  "*:read":          "Tudo — leitura",
  "*:write":         "Tudo — escrita",
  "*:admin":         "Tudo — admin",
};

export const SCOPE_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  permissions: string[];
}> = [
  {
    id: "full-access",
    label: "Acesso total",
    description: "Todas as permissões",
    permissions: [],
  },
  {
    id: "read-only",
    label: "Somente leitura",
    description: "Apenas operações de leitura",
    permissions: ["*:read"],
  },
  {
    id: "read-write",
    label: "Leitura e escrita",
    description: "Leitura e escrita, sem admin",
    permissions: ["*:read", "*:write"],
  },
  {
    id: "custom",
    label: "Personalizado",
    description: "Escolha permissões específicas",
    permissions: null as unknown as string[],
  },
];
