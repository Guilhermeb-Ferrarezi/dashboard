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

export type ScopeGroupDef = {
  label: string;
  description: string;
  actions: Array<{ action: TokenAction; label: string }>;
};

export const SCOPE_GROUPS: Record<string, ScopeGroupDef> = {
  profile: {
    label: "Perfil",
    description: "Dados do perfil do usuário: nome, e-mail e preferências.",
    actions: [
      { action: "read",  label: "Leitura" },
      { action: "write", label: "Escrita" },
    ],
  },
  sessions: {
    label: "Sessões",
    description: "Sessões ativas e controle de acesso do usuário.",
    actions: [
      { action: "read",  label: "Leitura" },
      { action: "admin", label: "Admin" },
    ],
  },
  checkout: {
    label: "Checkout",
    description: "Pedidos, produtos e configurações do sistema de checkout.",
    actions: [
      { action: "read",  label: "Leitura" },
      { action: "write", label: "Escrita" },
      { action: "admin", label: "Admin" },
    ],
  },
  projects: {
    label: "Projetos",
    description: "Projetos e recursos publicados no portal.",
    actions: [
      { action: "read",  label: "Leitura" },
      { action: "write", label: "Escrita" },
    ],
  },
  logs: {
    label: "Logs",
    description: "Logs de requisições e eventos do sistema.",
    actions: [
      { action: "read", label: "Leitura" },
    ],
  },
  codex: {
    label: "Codex",
    description: "Acesso ao agente Codex e suas operações.",
    actions: [
      { action: "read",  label: "Leitura" },
      { action: "write", label: "Escrita" },
    ],
  },
  admin: {
    label: "Admin",
    description: "Área administrativa: usuários, tokens e configurações globais.",
    actions: [
      { action: "read",  label: "Leitura" },
      { action: "write", label: "Escrita" },
      { action: "admin", label: "Admin" },
    ],
  },
};

export const SCOPE_LABELS: Record<string, string> = {
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
