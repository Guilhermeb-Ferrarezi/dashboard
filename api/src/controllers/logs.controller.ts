import crypto from "node:crypto";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import type { CollectionInfo } from "mongodb";

const LOGS_DB_NAME = process.env.LOGS_MONGO_DB_NAME?.trim() || "logs";
const LOG_PROJECTS_COLLECTION =
  process.env.LOGS_PROJECTS_COLLECTION?.trim() || "log_projects";

type LogProjectMetadata = {
  _id?: string;
  name: string;
  slug: string;
  apiKey: string;
  collectionName: string;
  createdAt: string;
};

function getLogsDb() {
  return mongoose.connection.getClient().db(LOGS_DB_NAME);
}

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugToCollectionName(slug: string) {
  return `${slug.replace(/-/g, "_")}_logs`;
}

function collectionNameToSlug(collectionName: string) {
  return collectionName.replace(/_logs$/u, "").replace(/_/g, "-");
}

function slugToName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getProjectPayload(
  collectionName: string,
  metadata?: LogProjectMetadata | null,
) {
  const slug = metadata?.slug || collectionNameToSlug(collectionName);

  return {
    id: collectionName,
    name: metadata?.name || slugToName(slug),
    slug,
    apiKey: metadata?.apiKey || "",
    collectionName,
  };
}

async function getProjectSummary(collectionName: string) {
  const db = getLogsDb();
  const collection = db.collection(collectionName);
  const [totalLogs, latestEntry] = await Promise.all([
    collection.countDocuments({}),
    collection.find({}).sort({ occurredAt: -1, _id: -1 }).limit(1).next(),
  ]);

  const latest =
    latestEntry && typeof latestEntry === "object"
      ? {
          occurredAt:
            typeof latestEntry.occurredAt === "string"
              ? latestEntry.occurredAt
              : null,
          method:
            typeof latestEntry.method === "string" ? latestEntry.method : null,
          status:
            typeof latestEntry.statusCode === "number"
              ? latestEntry.statusCode
              : typeof latestEntry.response?.statusCode === "number"
                ? latestEntry.response.statusCode
                : null,
          endpoint: getEndpointFromLogEntry(latestEntry as Record<string, unknown>),
        }
      : null;

  return {
    totalLogs,
    latest,
  };
}

function getEndpointFromLogEntry(entry: Record<string, unknown>) {
  const path =
    typeof entry.path === "string"
      ? entry.path
      : typeof entry.route === "string"
        ? entry.route
        : null;

  if (path) {
    return path;
  }

  if (typeof entry.url === "string") {
    try {
      return new URL(entry.url).pathname;
    } catch {
      return entry.url;
    }
  }

  return "/";
}

function getLogUser(entry: Record<string, unknown>) {
  const user = entry.user;

  if (typeof user !== "object" || user === null) {
    return null;
  }

  const actor = user as Record<string, unknown>;

  return {
    id: typeof actor.id === "string" ? actor.id : "",
    name: typeof actor.name === "string" ? actor.name : "",
    email: typeof actor.email === "string" ? actor.email : null,
    role: typeof actor.role === "string" ? actor.role : null,
  };
}

export async function listLogProjects(_req: Request, res: Response) {
  const db = getLogsDb();
  const [collections, metadataEntries] = await Promise.all([
    db.listCollections().toArray(),
    db
      .collection<LogProjectMetadata>(LOG_PROJECTS_COLLECTION)
      .find({})
      .toArray()
      .catch(() => []),
  ]);

  const metadataByCollection = new Map(
    metadataEntries.map((entry: LogProjectMetadata) => [entry.collectionName, entry]),
  );

  const projectNames = collections
    .map((collection: CollectionInfo) => collection.name)
    .filter(
      (name: string) =>
        name !== LOG_PROJECTS_COLLECTION && !name.startsWith("system."),
    )
    .sort((left: string, right: string) => left.localeCompare(right));

  const projects = await Promise.all(
    projectNames.map(async (collectionName: string) => {
      const summary = await getProjectSummary(collectionName);

      return {
        ...getProjectPayload(collectionName, metadataByCollection.get(collectionName)),
        ...summary,
      };
    }),
  );

  return res.json({ projects });
}

export async function createLogProject(req: Request, res: Response) {
  const name =
    typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const slugInput =
    typeof req.body?.slug === "string" ? req.body.slug.trim() : "";
  const slug = normalizeSlug(slugInput);

  if (!name || !slug) {
    return res.status(400).json({ message: "Nome e slug sao obrigatorios." });
  }

  const db = getLogsDb();
  const collectionName = slugToCollectionName(slug);
  const existingCollections = await db.listCollections({ name: collectionName }).toArray();

  if (existingCollections.length > 0) {
    return res.status(409).json({ message: "Ja existe um projeto com esse slug." });
  }

  const metadataCollection = db.collection<LogProjectMetadata>(
    LOG_PROJECTS_COLLECTION,
  );
  const existingMetadata = await metadataCollection.findOne({
    $or: [{ slug }, { collectionName }],
  });

  if (existingMetadata) {
    return res.status(409).json({ message: "Ja existe um projeto com esse slug." });
  }

  await db.createCollection(collectionName);

  const metadata: LogProjectMetadata = {
    name,
    slug,
    apiKey: `key_${crypto.randomBytes(12).toString("hex")}`,
    collectionName,
    createdAt: new Date().toISOString(),
  };

  await metadataCollection.insertOne(metadata);

  return res.status(201).json({
    project: getProjectPayload(collectionName, metadata),
  });
}

export async function listProjectLogs(req: Request, res: Response) {
  const projectId =
    typeof req.query.projectId === "string" ? req.query.projectId : "";
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const method = typeof req.query.method === "string" ? req.query.method.trim().toUpperCase() : "";
  const from = typeof req.query.from === "string" ? req.query.from.trim() : "";
  const to = typeof req.query.to === "string" ? req.query.to.trim() : "";
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  if (!projectId) {
    return res.status(400).json({ message: "projectId e obrigatorio." });
  }

  const db = getLogsDb();
  const collections = await db.listCollections({ name: projectId }).toArray();

  if (collections.length === 0) {
    return res.status(404).json({ message: "Projeto de logs nao encontrado." });
  }

  const filter: Record<string, unknown> = {};

  if (search) {
    filter.$or = [
      { path: { $regex: search, $options: "i" } },
      { route: { $regex: search, $options: "i" } },
      { url: { $regex: search, $options: "i" } },
    ];
  }

  if (method) {
    filter.method = method;
  }

  if (from || to) {
    const occurredAt: Record<string, string> = {};

    if (from) {
      occurredAt.$gte = new Date(`${from}T00:00:00.000Z`).toISOString();
    }

    if (to) {
      occurredAt.$lte = new Date(`${to}T23:59:59.999Z`).toISOString();
    }

    filter.occurredAt = occurredAt;
  }

  const collection = db.collection(projectId);
  const skip = (page - 1) * limit;
  const [total, entries] = await Promise.all([
    collection.countDocuments(filter),
    collection
      .find(filter)
      .sort({ occurredAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  const logs = entries.map((entry: Record<string, unknown>) => {
    const response =
      typeof entry.response === "object" && entry.response !== null
        ? (entry.response as Record<string, unknown>)
        : null;

    return {
      id: String(entry._id),
      status:
        typeof entry.statusCode === "number"
          ? entry.statusCode
          : typeof response?.statusCode === "number"
            ? response.statusCode
            : 0,
      method: typeof entry.method === "string" ? entry.method : "SYSTEM",
      endpoint: getEndpointFromLogEntry(entry),
      url: typeof entry.url === "string" ? entry.url : undefined,
      ip: typeof entry.ip === "string" ? entry.ip : "-",
      durationMs:
        typeof entry.durationMs === "number"
          ? Math.round(entry.durationMs)
          : 0,
      createdAt:
        typeof entry.occurredAt === "string"
          ? entry.occurredAt
          : new Date().toISOString(),
      user: getLogUser(entry),
      requestPayload:
        typeof entry.request === "object" && entry.request !== null
          ? entry.request
          : Object.hasOwn(entry, "requestBody")
            ? entry.requestBody
            : null,
      responsePayload:
        response && Object.hasOwn(response, "body")
          ? response.body
          : Object.hasOwn(entry, "responseBody")
            ? entry.responseBody
            : null,
    };
  });

  return res.json({
    logs,
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
