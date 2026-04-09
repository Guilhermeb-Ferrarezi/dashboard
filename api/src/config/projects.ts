export type ProjectStatus = "live" | "pilot" | "beta";
export type ProjectSsoMode = "none" | "shared-ticket";

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
    name: "portal.santos-tech.com",
    description: "Entrada principal para conteudo, rotinas e operacoes centrais.",
    url: process.env.PORTAL_URL || "https://portal.santos-tech.com",
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
    name: "admin-portal.santos-tech.com",
    description: "Painel administrativo com piloto de acesso por ticket SSO.",
    url:
      process.env.ADMIN_PORTAL_URL || "https://admin-portal.santos-tech.com",
    category: "Administracao",
    audience: "Interno",
    tags: ["admin", "usuarios", "sso"],
    icon: "shield",
    status: "pilot",
    ssoMode: "shared-ticket",
    featured: true,
    sso: {
      redirectPath: process.env.ADMIN_PORTAL_SSO_PATH || "/auth/sso",
      sharedSecret: process.env.ADMIN_PORTAL_SSO_SECRET,
    },
  },
  {
    id: "zap",
    name: "zap.santos-tech.com",
    description: "Ferramentas operacionais para fluxos e automacoes do Zap.",
    url: process.env.ZAP_URL || "https://zap.santos-tech.com",
    category: "Automacao",
    audience: "Operacao",
    tags: ["zap", "mensageria", "atendimento"],
    icon: "bolt",
    status: "beta",
    ssoMode: "none",
    featured: true,
  },
  {
    id: "portal-aluno",
    name: "portaldoaluno.santos-tech.com",
    description: "Cursos, aulas e acompanhamento de alunos em um unico lugar.",
    url:
      process.env.STUDENT_PORTAL_URL || "https://portaldoaluno.santos-tech.com",
    category: "Educacao",
    audience: "Aluno",
    tags: ["curso", "aluno", "trilhas"],
    icon: "academy",
    status: "live",
    ssoMode: "none",
    featured: false,
  },
  {
    id: "alerts",
    name: "alerts.santos-tech.com",
    description: "Central de avisos, incidentes e monitoramento rapido.",
    url: process.env.ALERTS_URL || "https://alerts.santos-tech.com",
    category: "Monitoramento",
    audience: "Time",
    tags: ["alertas", "monitoramento", "avisos"],
    icon: "bell",
    status: "beta",
    ssoMode: "none",
    featured: false,
  },
];

export function findProjectById(projectId: string) {
  return portalProjects.find((project) => project.id === projectId);
}
