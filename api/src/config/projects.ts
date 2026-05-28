export type ProjectStatus = "live" | "pilot" | "beta";
export type ProjectSsoMode = "none" | "shared-ticket";

function resolveSharedSecret(envKey: string) {
  return process.env[envKey] || process.env.SSO_SHARED_SECRET;
}

export interface ProjectDefinition {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  audience: string;
  tags: string[];
  icon: string;
  status: ProjectStatus;
  ssoMode: ProjectSsoMode;
  featured: boolean;
  sso?: {
    redirectPath: string;
    sharedSecret: string | undefined;
  };
}

export const portalProjects: ProjectDefinition[] = [
  {
    id: "portal",
    name: "Portal",
    description: "Entrada principal para conteudo, rotinas e operacoes centrais.",
    url: process.env.PORTAL_URL || "https://portal.santos-games.com",
    category: "Operacao",
    audience: "Equipe",
    tags: ["home", "conteudo", "operacao"],
    icon: "grid",
    status: "live",
    ssoMode: "none",
    featured: true,
  },
  {
    id: "admin-portal",
    name: "Admin Portal",
    description: "Painel administrativo com piloto de acesso por ticket SSO.",
    url:
      process.env.ADMIN_PORTAL_URL || "https://admin-portal.santos-games.com",
    category: "Administracao",
    audience: "Interno",
    tags: ["admin", "usuarios", "sso"],
    icon: "shield",
    status: "pilot",
    ssoMode: "shared-ticket",
    featured: true,
    sso: {
      redirectPath: process.env.ADMIN_PORTAL_SSO_PATH || "/auth/sso",
      sharedSecret: resolveSharedSecret("ADMIN_PORTAL_SSO_SECRET"),
    },
  },
];

export function findProjectById(projectId: string) {
  return portalProjects.find((project) => project.id === projectId);
}
