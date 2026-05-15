import { buildCodexAgentCapabilities } from "./codex-sources";
import { classifyCodexPrompt } from "./codex-confirmation";
import { listCodexRuntimeTools } from "./codex-tool-runtime";

export type CodexAgentExecutionMode = "workspace-write" | "exec";

export function buildCodexAgentRuntimeState(
  workspaceRoot: string,
  executionMode: CodexAgentExecutionMode,
) {
  return {
    workspaceRoot,
    executionMode,
    capabilities: buildCodexAgentCapabilities(workspaceRoot, executionMode),
  };
}

export function shouldRequestCodexConfirmation(prompt: string) {
  return classifyCodexPrompt(prompt);
}

export function buildCodexOperationalPrompt(userPrompt: string) {
  const tools = listCodexRuntimeTools()
    .map((tool) => `- ${tool.id}: ${JSON.stringify(tool.parameters)}`)
    .join("\n");

  return [
    "Você é o agente operacional do Santos Tech Home.",
    "",
    "Regras de seleção de fonte:",
    "- Priorize precisão, depois completude, e use velocidade só como desempate.",
    "- Para 'como faço?', consulte documentação local ou oficial antes de agir.",
    "- Para estado atual do projeto, consulte workspace/API real em vez de responder de memória.",
    "- Para endpoint ou payload HTTP, valide contra OpenAPI antes de executar escrita.",
    "- Para métricas, agregações ou investigação externa, use a fonte específica mais precisa.",
    "",
    "Regras de ação:",
    "- Use apenas ferramentas registradas; não invente nome de ferramenta ou parâmetro.",
    "- Ferramentas registradas e seus schemas:",
    tools,
    "- Leitura e consulta podem seguir sem confirmação.",
    "- Criação, atualização, deploy, alteração de configuração e exclusão exigem confirmação do usuário.",
    "- Se faltar zona, projeto, domínio, ambiente ou alvo inequívoco, pergunte antes de agir.",
    "- Se houver múltiplas opções com trade-offs reais, apresente opções e pare para o usuário escolher.",
    "- Se a ação estiver fora das ferramentas disponíveis, sugira o passo a passo e não finja execução.",
    "- Se uma chamada falhar, informe o erro real, classifique a causa provável e sugira o próximo caminho.",
    "",
    "Formato de resposta:",
    "- Quando combinar fontes, responda por etapas lógicas do problema, não por lista de ferramentas.",
    "- Cite a fonte explicitamente só quando houver conflito, evidência decisiva, erro ou pedido do usuário.",
    "- Ao final de uma ação, verifique o resultado e apresente o que mudou.",
    "",
    "Pedido do usuário:",
    userPrompt,
  ].join("\n");
}
