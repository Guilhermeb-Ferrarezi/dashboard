import fs from "node:fs";
import path from "node:path";

export type CodexSourceKind =
  | "conversation"
  | "documentation"
  | "openapi"
  | "workspace"
  | "web";

export type CodexToolKind = "read" | "write" | "execute" | "search" | "present";

export type CodexSourceDescriptor = {
  id: string;
  kind: CodexSourceKind;
  label: string;
  description: string;
  available: boolean;
  requiresConfirmation: boolean;
};

export type CodexToolDescriptor = {
  id: string;
  kind: CodexToolKind;
  label: string;
  description: string;
  requiresConfirmation: boolean;
};

export type CodexRoutingRule = {
  intent: string;
  preferredSourceId: string;
  preferredToolId: string;
  description: string;
};

export type CodexAgentCapabilities = {
  workspaceRoot: string;
  executionMode: string;
  selectionPolicy: string[];
  sources: CodexSourceDescriptor[];
  tools: CodexToolDescriptor[];
  routingRules: CodexRoutingRule[];
  responsePolicy: string[];
  suggestOnlyRules: string[];
};

function pathExists(candidate: string) {
  return fs.existsSync(candidate);
}

export function buildCodexSourceCatalog(workspaceRoot: string): CodexSourceDescriptor[] {
  const workspaceOpenApiPath = path.join(workspaceRoot, "api", "codex", "openapi.yaml");
  const workspaceDocsPath = path.join(workspaceRoot, "docs");
  const workspaceReadmePath = path.join(workspaceRoot, "README.md");

  return [
    {
      id: "conversation-context",
      kind: "conversation",
      label: "Contexto da conversa",
      description: "Histórico da thread, decisões anteriores e estado atual do pedido.",
      available: true,
      requiresConfirmation: false,
    },
    {
      id: "project-documentation",
      kind: "documentation",
      label: "Documentação do projeto",
      description: "README, docs e notas internas do repositório.",
      available: pathExists(workspaceDocsPath) || pathExists(workspaceReadmePath),
      requiresConfirmation: false,
    },
    {
      id: "project-openapi",
      kind: "openapi",
      label: "OpenAPI local",
      description: "Especificação HTTP do Codex e rotas internas do projeto.",
      available: pathExists(workspaceOpenApiPath),
      requiresConfirmation: false,
    },
    {
      id: "workspace-files",
      kind: "workspace",
      label: "Workspace do projeto",
      description: "Arquivos, logs e diretórios do workspace ativo.",
      available: pathExists(workspaceRoot),
      requiresConfirmation: true,
    },
    {
      id: "web-docs",
      kind: "web",
      label: "Web e docs públicas",
      description: "Documentação oficial e troubleshooting externo com consulta somente leitura.",
      available: true,
      requiresConfirmation: false,
    },
  ];
}

export function buildCodexToolCatalog(): CodexToolDescriptor[] {
  return [
    {
      id: "workspace.read",
      kind: "read",
      label: "Ler workspace",
      description: "Lê arquivos e contexto do projeto ativo.",
      requiresConfirmation: false,
    },
    {
      id: "workspace.write",
      kind: "write",
      label: "Alterar workspace",
      description: "Escreve ou altera arquivos no repositório ativo.",
      requiresConfirmation: true,
    },
    {
      id: "workspace.execute",
      kind: "execute",
      label: "Executar comandos",
      description: "Roda comandos no workspace local.",
      requiresConfirmation: true,
    },
    {
      id: "web.search",
      kind: "search",
      label: "Buscar na web",
      description: "Consulta documentação pública e troubleshooting.",
      requiresConfirmation: false,
    },
    {
      id: "ui.present",
      kind: "present",
      label: "Apresentar resultado",
      description: "Resume evidências por etapa lógica e aponta fonte só quando ela muda a decisão.",
      requiresConfirmation: false,
    },
  ];
}

export function buildCodexRoutingRules(): CodexRoutingRule[] {
  return [
    {
      intent: "como-fazer",
      preferredSourceId: "project-documentation",
      preferredToolId: "workspace.read",
      description: "Perguntas de orientação usam documentação antes de execução.",
    },
    {
      intent: "estado-atual",
      preferredSourceId: "workspace-files",
      preferredToolId: "workspace.read",
      description: "Estado real do projeto vem do workspace, logs e API interna.",
    },
    {
      intent: "validar-endpoint",
      preferredSourceId: "project-openapi",
      preferredToolId: "workspace.read",
      description: "Chamadas HTTP devem ser conferidas contra OpenAPI antes de escrever.",
    },
    {
      intent: "metricas-ou-agregacao",
      preferredSourceId: "web-docs",
      preferredToolId: "web.search",
      description: "Dados agregados ou externos usam fontes específicas de consulta.",
    },
    {
      intent: "apresentacao",
      preferredSourceId: "conversation-context",
      preferredToolId: "ui.present",
      description: "Respostas combinam fontes em etapas lógicas, não em blocos por ferramenta.",
    },
  ];
}

export function buildCodexAgentCapabilities(workspaceRoot: string, executionMode: string): CodexAgentCapabilities {
  return {
    workspaceRoot,
    executionMode,
    selectionPolicy: [
      "Precisão primeiro.",
      "Completude em segundo.",
      "Velocidade apenas como desempate.",
    ],
    sources: buildCodexSourceCatalog(workspaceRoot),
    tools: buildCodexToolCatalog(),
    routingRules: buildCodexRoutingRules(),
    responsePolicy: [
      "Estruture a resposta por etapas lógicas.",
      "Mostre fonte explicitamente quando houver conflito, evidência decisiva ou pedido do usuário.",
      "Oculte detalhes de fonte quando todas reforçam a mesma conclusão.",
    ],
    suggestOnlyRules: [
      "Pare na sugestão quando a ação estiver fora das ferramentas disponíveis.",
      "Peça escolha quando houver múltiplas opções com trade-offs reais.",
      "Peça contexto quando zona, projeto, domínio ou ambiente não puderem ser inferidos.",
      "Informe erro e sugira caminho manual quando a API falhar sem alternativa segura.",
      "Só execute mudanças de alto risco com confirmação explícita.",
    ],
  };
}
