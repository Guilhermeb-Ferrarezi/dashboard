import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
import mongoose from "mongoose";

import { User } from "../models/User";
import { VctInscricao } from "../models/VctInscricao";
import {
  buildDashboardSummary,
  type DashboardLogRecord,
  type DashboardProjectInput,
  type DashboardRegistrationRecord,
} from "../lib/dashboard-summary";

const LOGS_DB_NAME = process.env.LOGS_MONGO_DB_NAME?.trim() || "logs";
const LOGS_PROJECTS_COLLECTION =
  process.env.LOGS_PROJECTS_COLLECTION?.trim() || "log_projects";
const LOGS_HTTP_COLLECTION =
  process.env.LOGS_HTTP_COLLECTION?.trim() || "santos_tech_home_logs";

type LogProjectMetadata = {
  name: string;
  slug: string;
  collectionName: string;
};

function getLogsDb() {
  return mongoose.connection.getClient().db(LOGS_DB_NAME);
}

function toIsoDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function loadLogProjects() {
  const db = getLogsDb();
  const [collections, metadataEntries] = await Promise.all([
    db.listCollections().toArray(),
    db
      .collection<LogProjectMetadata>(LOGS_PROJECTS_COLLECTION)
      .find({})
      .toArray()
      .catch(() => []),
  ]);

  const metadataByCollection = new Map(
    metadataEntries.map((entry) => [entry.collectionName, entry]),
  );

  const projectNames = collections
    .map((collection) => collection.name)
    .filter(
      (name) =>
        name !== LOGS_PROJECTS_COLLECTION &&
        name !== LOGS_HTTP_COLLECTION &&
        !name.startsWith("system."),
    )
    .sort((left, right) => left.localeCompare(right));

  return projectNames.map((collectionName) => {
    const metadata = metadataByCollection.get(collectionName);

    return {
      id: collectionName,
      name:
        metadata?.name ||
        collectionName.replace(/_logs$/u, "").replace(/_/g, " "),
    };
  });
}

async function loadRecentLogs(projects: DashboardProjectInput[]) {
  const db = getLogsDb();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const rawEntries = await Promise.all(
    projects.map(async (project) => {
      const docs = await db
        .collection(project.id)
        .find({ occurredAt: { $gte: since } })
        .project({
          occurredAt: 1,
          statusCode: 1,
          durationMs: 1,
          method: 1,
          path: 1,
          route: 1,
          url: 1,
        })
        .toArray();

      return docs.map((entry) => ({
        projectId: project.id,
        projectName: project.name,
        entry,
      }));
    }),
  );

  const logs: DashboardLogRecord[] = [];

  for (const projectEntries of rawEntries) {
    for (const { projectId, projectName, entry } of projectEntries) {
      const response =
        typeof entry.response === "object" && entry.response !== null
          ? (entry.response as Record<string, unknown>)
          : null;

      const occurredAt = typeof entry.occurredAt === "string" ? entry.occurredAt : null;
      const status =
        typeof entry.statusCode === "number"
          ? entry.statusCode
          : typeof response?.statusCode === "number"
            ? response.statusCode
            : 0;

      if (!occurredAt) {
        continue;
      }

      logs.push({
        id: String(entry._id),
        projectId,
        projectName,
        endpoint:
          typeof entry.path === "string"
            ? entry.path
            : typeof entry.route === "string"
              ? entry.route
              : typeof entry.url === "string"
                ? entry.url
                : "/",
        method: typeof entry.method === "string" ? entry.method : "SYSTEM",
        status,
        durationMs:
          typeof entry.durationMs === "number" ? Math.round(entry.durationMs) : 0,
        occurredAt,
      });
    }
  }

  return logs;
}

export async function getDashboardSummary(_c: Context<AppEnv>): Promise<Response> {
  const [registrations, projects] = await Promise.all([
    VctInscricao.find({})
      .select("_id modalidade nome nick status createdAt")
      .sort({ createdAt: -1 })
      .lean(),
    loadLogProjects(),
  ]);

  const registrationRecords: DashboardRegistrationRecord[] = registrations.map((item) => ({
    id: String(item._id),
    nome: item.nome,
    nick: item.nick,
    modalidade: item.modalidade ?? "valorant",
    status: typeof item.status === "string" ? item.status : String(item.status ?? ""),
    createdAt: item.createdAt ?? null,
  }));

  const logRecords = await loadRecentLogs(projects);

  const summary = buildDashboardSummary({
    registrations: registrationRecords,
    logs: logRecords,
    projects,
  });

  return _c.json({
    summary,
    totals: {
      registrations: registrationRecords.length,
      users: await User.countDocuments({}),
      logProjects: projects.length,
      logs: logRecords.length,
      errorLogs: logRecords.filter((log) => log.status >= 500).length,
    },
  });
}
