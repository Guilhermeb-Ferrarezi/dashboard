import { builder } from "../builder";

export interface DashboardSummaryShape {
  projectId: string;
  totalRequests: number;
  errorRate: number;
  avgDurationMs: number;
  latestAt?: Date | null;
}

export const DashboardSummaryRef = builder.objectRef<DashboardSummaryShape>("DashboardSummary");

builder.objectType(DashboardSummaryRef, {
  fields: (t) => ({
    projectId: t.exposeString("projectId"),
    totalRequests: t.exposeInt("totalRequests"),
    errorRate: t.exposeFloat("errorRate"),
    avgDurationMs: t.exposeFloat("avgDurationMs"),
    latestAt: t.field({
      type: "Date",
      nullable: true,
      resolve: (d) => (d.latestAt ? new Date(d.latestAt) : null),
    }),
  }),
});
