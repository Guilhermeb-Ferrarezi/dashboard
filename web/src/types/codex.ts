export interface CodexAccountStatus {
  connected: boolean;
  authMode: string | null;
  requiresOpenaiAuth: boolean;
  planType: string | null;
  email: string | null;
  sharedAccountLabel: string | null;
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
