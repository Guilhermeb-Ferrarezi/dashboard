import { describe, expect, test } from "bun:test";

import { buildDashboardSummary } from "./dashboard-summary";

describe("dashboard-summary", () => {
  test("agrega janelas, recentes e saúde dos projetos", () => {
    const now = Date.parse("2026-05-16T12:00:00.000Z");

    const summary = buildDashboardSummary({
      now,
      projects: [
        { id: "alpha_logs", name: "Alpha" },
        { id: "beta_logs", name: "Beta" },
      ],
      registrations: [
        {
          id: "r-1",
          nome: "Ana",
          nick: "ana",
          modalidade: "valorant",
          status: "active",
          createdAt: "2026-05-16T10:00:00.000Z",
        },
        {
          id: "r-2",
          nome: "Bia",
          nick: "bia",
          modalidade: "lol",
          status: "active",
          createdAt: "2026-05-13T11:00:00.000Z",
        },
        {
          id: "r-3",
          nome: "Caio",
          nick: "caio",
          modalidade: "counter-strike",
          status: "inactive",
          createdAt: "2026-04-30T11:00:00.000Z",
        },
      ],
      logs: [
        {
          id: "l-1",
          projectId: "alpha_logs",
          projectName: "Alpha",
          endpoint: "/api/a",
          method: "GET",
          status: 500,
          durationMs: 2400,
          occurredAt: "2026-05-16T11:20:00.000Z",
        },
        {
          id: "l-2",
          projectId: "alpha_logs",
          projectName: "Alpha",
          endpoint: "/api/b",
          method: "POST",
          status: 200,
          durationMs: 180,
          occurredAt: "2026-05-14T09:00:00.000Z",
        },
        {
          id: "l-3",
          projectId: "beta_logs",
          projectName: "Beta",
          endpoint: "/api/c",
          method: "GET",
          status: 503,
          durationMs: 900,
          occurredAt: "2026-05-06T08:00:00.000Z",
        },
      ],
    });

    expect(summary.windows.find((item) => item.key === "24h")?.registrations).toBe(1);
    expect(summary.windows.find((item) => item.key === "7d")?.registrations).toBe(2);
    expect(summary.windows.find((item) => item.key === "30d")?.registrations).toBe(3);

    expect(summary.windows.find((item) => item.key === "24h")?.errors).toBe(1);
    expect(summary.recentRegistrations[0]?.id).toBe("r-1");
    expect(summary.recentLogs[0]?.id).toBe("l-1");
    expect(summary.slowRequests[0]?.id).toBe("l-1");
    expect(summary.projects[0]?.id).toBe("alpha_logs");
  });
});
