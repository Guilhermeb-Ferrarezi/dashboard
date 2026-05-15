export interface CodexAccountStatus {
  connected: boolean;
  authMode: string | null;
  requiresOpenaiAuth: boolean;
  planType: string | null;
  email: string | null;
  sharedAccountLabel: string | null;
  codexAccessTokenActive: boolean;
  codexAccessTokenRequired: boolean;
  codexAccessBlockedReason: string | null;
}

export type CodexSourceKind =
  | "conversation"
  | "documentation"
  | "openapi"
  | "workspace"
  | "web";

export type CodexToolKind = "read" | "write" | "execute" | "search" | "present";

export interface CodexSourceDescriptor {
  id: string;
  kind: CodexSourceKind;
  label: string;
  description: string;
  available: boolean;
  requiresConfirmation: boolean;
}

export interface CodexToolDescriptor {
  id: string;
  kind: CodexToolKind;
  label: string;
  description: string;
  requiresConfirmation: boolean;
}

export interface CodexRuntimeTool {
  id: string;
  label: string;
  description: string;
  kind: "read" | "write" | "diagnostic" | "presentation";
  requiresConfirmation: boolean;
  parameters: {
    type: "object";
    required: string[];
    properties: Record<
      string,
      {
        type: "string" | "number" | "boolean" | "object";
        description: string;
        enum?: string[];
      }
    >;
  };
}

export interface CodexRoutingRule {
  intent: string;
  preferredSourceId: string;
  preferredToolId: string;
  description: string;
}

export interface CodexAgentCapabilities {
  workspaceRoot: string;
  executionMode: string;
  selectionPolicy: string[];
  sources: CodexSourceDescriptor[];
  tools: CodexToolDescriptor[];
  routingRules: CodexRoutingRule[];
  responsePolicy: string[];
  suggestOnlyRules: string[];
}

export interface CodexThreadSummary {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  createdAt: number;
  status: string;
  lastOpenedAt: string | null;
}

export type CodexTimelineEntry =
  | {
      id: string;
      kind: "user" | "assistant" | "system";
      text: string;
      status?: string | null;
      turnId: string;
    }
  | {
      id: string;
      kind: "command";
      command: string;
      output: string;
      status: string;
      exitCode: number | null;
      turnId: string;
    }
  | {
      id: string;
      kind: "file-change";
      changes: Array<{
        path: string;
        kind: string;
        diff: string;
      }>;
      status: string;
      turnId: string;
    };

export interface CodexThreadDetail {
  thread: CodexThreadSummary;
  timeline: CodexTimelineEntry[];
}

export interface CodexConfirmationRequest {
  requestId: string;
  prompt: string;
  riskLevel: "low" | "elevated" | "high";
  reasons: string[];
}
