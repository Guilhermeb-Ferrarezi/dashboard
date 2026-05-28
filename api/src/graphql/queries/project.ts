import { builder } from "../builder";
import { ProjectRef, LogPageRef } from "../types/project";
import { portalProjects } from "../../config/projects";
import mongoose from "mongoose";

function getLogsDb() {
  return mongoose.connection.getClient().db(process.env.LOGS_MONGO_DB_NAME?.trim() || "logs");
}

builder.queryField("projects", (t) =>
  t.field({
    type: [ProjectRef],
    resolve: (_root, _args, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      return portalProjects.map((p) => ({ id: p.id, name: p.name, displayName: null }));
    },
  }),
);

builder.queryField("logs", (t) =>
  t.field({
    type: LogPageRef,
    args: {
      projectId: t.arg.string({ required: true }),
      page: t.arg.int({ defaultValue: 1 }),
      limit: t.arg.int({ defaultValue: 50 }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.user) throw new Error("Não autenticado");
      const page = args.page ?? 1;
      const limit = args.limit ?? 50;
      const db = getLogsDb();
      const collections = await db.listCollections({ name: args.projectId }).toArray();
      if (collections.length === 0) return { items: [], total: 0, page, limit };
      const collection = db.collection(args.projectId);
      const skip = (page - 1) * limit;
      const [total, rawItems] = await Promise.all([
        collection.countDocuments({}),
        collection.find({}).sort({ occurredAt: -1 }).skip(skip).limit(limit).toArray(),
      ]);
      const items = rawItems.map((doc: any) => ({
        id: String(doc._id),
        level: String(doc.level ?? "info"),
        message: String(doc.message ?? doc.url ?? ""),
        occurredAt: doc.occurredAt ?? new Date().toISOString(),
      }));
      return { items, total, page, limit };
    },
  }),
);
