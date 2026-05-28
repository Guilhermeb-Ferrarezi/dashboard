import { builder } from "../builder";
import { DashboardSummaryRef } from "../types/dashboard";
import mongoose from "mongoose";

const LOGS_DB_NAME = process.env.LOGS_MONGO_DB_NAME?.trim() || "logs";

function getLogsDb() {
  return mongoose.connection.getClient().db(LOGS_DB_NAME);
}

builder.queryField("dashboardSummary", (t) =>
  t.field({
    type: DashboardSummaryRef,
    nullable: true,
    args: { projectId: t.arg.string({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new Error("Acesso negado");
      const db = getLogsDb();
      const collections = await db.listCollections({ name: args.projectId }).toArray();
      if (collections.length === 0) return null;
      const collection = db.collection(args.projectId);
      const docs = await collection
        .find({})
        .project({ occurredAt: 1, statusCode: 1, durationMs: 1 })
        .sort({ occurredAt: -1 })
        .limit(10000)
        .toArray();

      const totalRequests = docs.length;
      if (totalRequests === 0) return null;

      const errors = docs.filter((d: any) => {
        const code = d.statusCode ?? 0;
        return typeof code === "number" && code >= 400;
      }).length;

      const durations = docs
        .map((d: any) => typeof d.durationMs === "number" ? d.durationMs : 0)
        .filter((n: number) => n > 0);

      const avgDurationMs =
        durations.length > 0
          ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
          : 0;

      const latestAt =
        docs[0] && typeof (docs[0] as any).occurredAt === "string"
          ? new Date((docs[0] as any).occurredAt)
          : null;

      return {
        projectId: args.projectId,
        totalRequests,
        errorRate: totalRequests > 0 ? errors / totalRequests : 0,
        avgDurationMs,
        latestAt,
      };
    },
  }),
);
