export type DashboardWindowKey = "24h" | "7d" | "30d";

export interface DashboardTimelinePoint {
  label: string;
  registrations: number;
  logs: number;
  errors: number;
  avgDurationMs: number;
}

export interface DashboardWindowSummary {
  key: DashboardWindowKey;
  label: string;
  registrations: number;
  logs: number;
  errors: number;
  avgDurationMs: number;
  p95DurationMs: number;
  buckets: DashboardTimelinePoint[];
}

export interface DashboardRecentRegistration {
  id: string;
  nome: string;
  nick: string;
  modalidade: string;
  createdAt: string;
  status: string;
}

export interface DashboardRecentLog {
  id: string;
  projectId: string;
  projectName: string;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  occurredAt: string;
}

export interface DashboardProjectHealth {
  id: string;
  name: string;
  totalLogs: number;
  errorLogs: number;
  avgDurationMs: number;
  latestAt: string | null;
  latestEndpoint: string | null;
  latestStatus: number | null;
}

export interface DashboardSummary {
  generatedAt: string;
  windows: DashboardWindowSummary[];
  recentRegistrations: DashboardRecentRegistration[];
  recentLogs: DashboardRecentLog[];
  slowRequests: DashboardRecentLog[];
  projects: DashboardProjectHealth[];
}

export interface DashboardApiResponse {
  summary: DashboardSummary;
  totals: {
    registrations: number;
    users: number;
    logProjects: number;
    logs: number;
    errorLogs: number;
  };
}
