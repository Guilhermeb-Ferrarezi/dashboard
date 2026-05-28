export type DashboardWindowKey = "24h" | "7d" | "30d";

export type DashboardTimelinePoint = {
  label: string;
  registrations: number;
  logs: number;
  errors: number;
  avgDurationMs: number;
};

export type DashboardWindowSummary = {
  key: DashboardWindowKey;
  label: string;
  registrations: number;
  logs: number;
  errors: number;
  avgDurationMs: number;
  p95DurationMs: number;
  buckets: DashboardTimelinePoint[];
};

export type DashboardRecentRegistration = {
  id: string;
  nome: string;
  nick: string;
  modalidade: string;
  createdAt: string;
  status: string;
};

export type DashboardRecentLog = {
  id: string;
  projectId: string;
  projectName: string;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  occurredAt: string;
};

export type DashboardProjectHealth = {
  id: string;
  name: string;
  totalLogs: number;
  errorLogs: number;
  avgDurationMs: number;
  latestAt: string | null;
  latestEndpoint: string | null;
  latestStatus: number | null;
};

export type DashboardSummary = {
  generatedAt: string;
  windows: DashboardWindowSummary[];
  recentRegistrations: DashboardRecentRegistration[];
  recentLogs: DashboardRecentLog[];
  slowRequests: DashboardRecentLog[];
  projects: DashboardProjectHealth[];
};

export type DashboardRegistrationRecord = {
  id: string;
  nome: string;
  nick: string;
  modalidade: string;
  status: string;
  createdAt: string | Date | null | undefined;
};

export type DashboardLogRecord = {
  id: string;
  projectId: string;
  projectName: string;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  occurredAt: string | Date | null | undefined;
};

export type DashboardProjectInput = {
  id: string;
  name: string;
};

type WindowDefinition = {
  key: DashboardWindowKey;
  label: string;
  bucketCount: number;
  bucketMs: number;
  windowMs: number;
};

const WINDOW_DEFINITIONS: WindowDefinition[] = [
  {
    key: "24h",
    label: "24 horas",
    bucketCount: 24,
    bucketMs: 1000 * 60 * 60,
    windowMs: 1000 * 60 * 60 * 24,
  },
  {
    key: "7d",
    label: "7 dias",
    bucketCount: 7,
    bucketMs: 1000 * 60 * 60 * 24,
    windowMs: 1000 * 60 * 60 * 24 * 7,
  },
  {
    key: "30d",
    label: "30 dias",
    bucketCount: 30,
    bucketMs: 1000 * 60 * 60 * 24,
    windowMs: 1000 * 60 * 60 * 24 * 30,
  },
];

function toTimestamp(value: string | Date | null | undefined) {
  if (!value) {
    return Number.NaN;
  }

  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function formatHourLabel(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}h`;
}

function formatDateLabel(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getWindowLabel(definition: WindowDefinition, start: Date, index: number) {
  if (definition.key === "24h") {
    return formatHourLabel(new Date(start.getTime() + index * definition.bucketMs));
  }

  return formatDateLabel(new Date(start.getTime() + index * definition.bucketMs));
}

function percentile(values: number[], target: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const position = Math.ceil((target / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.min(Math.max(position, 0), sorted.length - 1)] ?? 0);
}

function mean(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((acc, value) => acc + value, 0) / values.length);
}

export function buildDashboardSummary(
  input: {
    registrations: DashboardRegistrationRecord[];
    logs: DashboardLogRecord[];
    projects: DashboardProjectInput[];
    now?: number;
  },
): DashboardSummary {
  const now = input.now ?? Date.now();
  const registrationEntries = input.registrations
    .map((item) => ({
      ...item,
      createdAt: toTimestamp(item.createdAt),
    }))
    .filter((item) => Number.isFinite(item.createdAt));

  const logEntries = input.logs
    .map((item) => ({
      ...item,
      occurredAt: toTimestamp(item.occurredAt),
      isError: item.status >= 500,
    }))
    .filter((item) => Number.isFinite(item.occurredAt));

  const recentRegistrations = [...registrationEntries]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      nome: item.nome,
      nick: item.nick,
      modalidade: item.modalidade,
      createdAt: new Date(item.createdAt).toISOString(),
      status: item.status,
    }));

  const recentLogs = [...logEntries]
    .filter((item) => item.isError)
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      projectId: item.projectId,
      projectName: item.projectName,
      endpoint: item.endpoint,
      method: item.method,
      status: item.status,
      durationMs: item.durationMs,
      occurredAt: new Date(item.occurredAt).toISOString(),
    }));

  const slowRequests = [...logEntries]
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      projectId: item.projectId,
      projectName: item.projectName,
      endpoint: item.endpoint,
      method: item.method,
      status: item.status,
      durationMs: item.durationMs,
      occurredAt: new Date(item.occurredAt).toISOString(),
    }));

  const projects = input.projects.map((project) => {
    const projectLogs = logEntries.filter((log) => log.projectId === project.id);

    let latestLog: (typeof projectLogs)[number] | null = null;
    for (const log of projectLogs) {
      if (!latestLog || log.occurredAt > latestLog.occurredAt) {
        latestLog = log;
      }
    }

    return {
      id: project.id,
      name: project.name,
      totalLogs: projectLogs.length,
      errorLogs: projectLogs.filter((log) => log.isError).length,
      avgDurationMs: mean(projectLogs.map((log) => log.durationMs)),
      latestAt: latestLog ? new Date(latestLog.occurredAt).toISOString() : null,
      latestEndpoint: latestLog?.endpoint ?? null,
      latestStatus: latestLog?.status ?? null,
    };
  }).sort((left, right) => right.totalLogs - left.totalLogs);

  const windows = WINDOW_DEFINITIONS.map((definition) => {
    const start = now - definition.windowMs;
    const registrationsInWindow = registrationEntries.filter(
      (item) => item.createdAt >= start && item.createdAt <= now,
    );
    const logsInWindow = logEntries.filter(
      (item) => item.occurredAt >= start && item.occurredAt <= now,
    );

    const timelineBuckets = Array.from({ length: definition.bucketCount }, (_, index) => ({
      label: getWindowLabel(definition, new Date(start), index),
      registrations: 0,
      logs: 0,
      errors: 0,
      durations: [] as number[],
    }));

    for (const registration of registrationsInWindow) {
      const bucketIndex = Math.min(
        definition.bucketCount - 1,
        Math.max(0, Math.floor((registration.createdAt - start) / definition.bucketMs)),
      );
      const bucket = timelineBuckets[bucketIndex];
      if (bucket) {
        bucket.registrations += 1;
      }
    }

    for (const log of logsInWindow) {
      const bucketIndex = Math.min(
        definition.bucketCount - 1,
        Math.max(0, Math.floor((log.occurredAt - start) / definition.bucketMs)),
      );
      const bucket = timelineBuckets[bucketIndex];
      if (!bucket) {
        continue;
      }

      bucket.logs += 1;
      if (log.isError) {
        bucket.errors += 1;
      }
      bucket.durations.push(log.durationMs);
    }

    return {
      key: definition.key,
      label: definition.label,
      registrations: registrationsInWindow.length,
      logs: logsInWindow.length,
      errors: logsInWindow.filter((item) => item.isError).length,
      avgDurationMs: mean(logsInWindow.map((item) => item.durationMs)),
      p95DurationMs: percentile(logsInWindow.map((item) => item.durationMs), 95),
      buckets: timelineBuckets.map((bucket) => ({
        label: bucket.label,
        registrations: bucket.registrations,
        logs: bucket.logs,
        errors: bucket.errors,
        avgDurationMs: mean(bucket.durations),
      })),
    };
  });

  return {
    generatedAt: new Date(now).toISOString(),
    windows,
    recentRegistrations,
    recentLogs,
    slowRequests,
    projects,
  };
}
