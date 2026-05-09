export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH";

export interface LogsProject {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
  totalLogs?: number;
  latest?: {
    occurredAt: string | null;
    method: string | null;
    status: number | null;
    endpoint: string | null;
  } | null;
}

export interface ProjectLogEntry {
  id: string;
  status: number;
  method: HttpMethod | string;
  endpoint: string;
  url?: string;
  ip: string;
  durationMs: number;
  createdAt: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
}

export interface LogsPagePayload {
  logs: ProjectLogEntry[];
  page: number;
  totalPages: number;
  total: number;
}
