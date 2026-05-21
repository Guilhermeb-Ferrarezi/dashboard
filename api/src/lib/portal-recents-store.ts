import PortalRecent, {
  type PortalRecentItemPayload,
} from "../models/PortalRecent";

const MAX_RECENTS = 5;
const REDIS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_BATCH_SIZE = 50;

const redisUrl = process.env.REDIS_URL?.trim();
const redisPrefix = process.env.REDIS_PREFIX?.trim() || "portal:recents:";
const userKeyPrefix = `${redisPrefix}user:`;
const dirtyKey = `${redisPrefix}dirty`;

interface RecentsRedisClient {
  isReady: boolean;
  on(event: "error", listener: (error: Error) => void): void;
  connect(): Promise<RecentsRedisClient>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { PX: number }): Promise<unknown>;
  sAdd(key: string, value: string): Promise<number>;
  sPop(key: string, count: number): Promise<string[] | string | null>;
}

let redisClient: RecentsRedisClient | null = null;
let redisConnectPromise: Promise<RecentsRedisClient | null> | null = null;
let redisUnavailableLogged = false;

const memoryRecents = new Map<string, PortalRecentItemPayload[]>();
const memoryDirty = new Set<string>();

async function createRedisClient(url: string) {
  try {
    const redisModule = (await new Function("return import('redis')")()) as {
      createClient: (options: { url: string }) => RecentsRedisClient;
    };

    return redisModule.createClient({ url });
  } catch (error) {
    if (!redisUnavailableLogged) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Redis portal-recents indisponivel (${message}). Usando memoria.`,
      );
      redisUnavailableLogged = true;
    }
    return null;
  }
}

async function getRedisClient() {
  if (!redisUrl) {
    return null;
  }

  if (redisClient?.isReady) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisConnectPromise = (async () => {
    const client = await createRedisClient(redisUrl);
    if (!client) {
      return null;
    }

    client.on("error", (error) => {
      console.error(`Redis portal-recents error: ${error.message}`);
    });

    await client.connect();
    redisClient = client;
    console.log("Redis portal-recents conectado.");
    return client;
  })().finally(() => {
    redisConnectPromise = null;
  });

  return redisConnectPromise;
}

function userKey(userId: string) {
  return `${userKeyPrefix}${userId}`;
}

function sanitizeItem(raw: unknown): PortalRecentItemPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : null;
  const href = typeof value.href === "string" ? value.href : null;
  const label = typeof value.label === "string" ? value.label : null;
  const updatedAt =
    typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : null;

  if (!id || !href || !label || updatedAt === null) {
    return null;
  }

  const kind = value.kind === "resource" ? "resource" : "page";

  return {
    id,
    href,
    label,
    description: typeof value.description === "string" ? value.description : "",
    group: typeof value.group === "string" ? value.group : "",
    iconKey: typeof value.iconKey === "string" ? value.iconKey : "sparkles",
    kind,
    pinned: Boolean(value.pinned),
    updatedAt,
  };
}

function normalizeItems(items: unknown[]): PortalRecentItemPayload[] {
  const sanitized = items
    .map(sanitizeItem)
    .filter((item): item is PortalRecentItemPayload => item !== null);

  const merged = new Map<string, PortalRecentItemPayload>();
  for (const item of sanitized) {
    const current = merged.get(item.id);
    if (!current) {
      merged.set(item.id, item);
      continue;
    }

    merged.set(item.id, {
      ...current,
      ...item,
      pinned: current.pinned || item.pinned,
      updatedAt: Math.max(current.updatedAt, item.updatedAt),
    });
  }

  return sortItems([...merged.values()]).slice(0, MAX_RECENTS);
}

function sortItems(items: PortalRecentItemPayload[]) {
  return [...items].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return Number(right.pinned) - Number(left.pinned);
    }
    return right.updatedAt - left.updatedAt;
  });
}

async function readFromRedis(userId: string): Promise<PortalRecentItemPayload[] | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const raw = await client.get(userKey(userId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeItems(parsed);
  } catch {
    return [];
  }
}

async function writeToRedis(userId: string, items: PortalRecentItemPayload[]) {
  const client = await getRedisClient();
  if (!client) {
    memoryRecents.set(userId, items);
    memoryDirty.add(userId);
    return;
  }

  await client.set(userKey(userId), JSON.stringify(items), { PX: REDIS_TTL_MS });
  await client.sAdd(dirtyKey, userId);
}

async function readFromMongo(userId: string): Promise<PortalRecentItemPayload[]> {
  const doc = await PortalRecent.findOne({ userId }).lean();
  if (!doc) {
    return [];
  }
  return normalizeItems(doc.items ?? []);
}

export async function getPortalRecents(userId: string) {
  const fromRedis = await readFromRedis(userId);
  if (fromRedis !== null) {
    return fromRedis;
  }

  if (memoryRecents.has(userId)) {
    return memoryRecents.get(userId) ?? [];
  }

  const fromMongo = await readFromMongo(userId);
  if (fromMongo.length > 0) {
    const client = await getRedisClient();
    if (client) {
      await client.set(userKey(userId), JSON.stringify(fromMongo), {
        PX: REDIS_TTL_MS,
      });
    } else {
      memoryRecents.set(userId, fromMongo);
    }
  }

  return fromMongo;
}

export async function trackPortalRecent(userId: string, rawItem: unknown) {
  const sanitized = sanitizeItem({
    ...(typeof rawItem === "object" && rawItem ? rawItem : {}),
    updatedAt:
      (rawItem as { updatedAt?: number })?.updatedAt ?? Date.now(),
  });

  if (!sanitized) {
    return null;
  }

  if (sanitized.id === "home") {
    return getPortalRecents(userId);
  }

  const isLogs =
    sanitized.id === "logs" ||
    sanitized.href === "/logs" ||
    sanitized.href.startsWith("/logs/");
  if (isLogs) {
    sanitized.id = "logs";
  }

  const current = await getPortalRecents(userId);
  const previousPinned = current.find((item) => item.id === sanitized.id)?.pinned ?? false;
  sanitized.pinned = sanitized.pinned || previousPinned;

  const merged = normalizeItems([
    sanitized,
    ...current.filter((item) => item.id !== sanitized.id),
  ]);

  await writeToRedis(userId, merged);
  return merged;
}

export async function togglePortalRecentPin(userId: string, id: string) {
  const current = await getPortalRecents(userId);
  const target = current.find((item) => item.id === id);
  if (!target) {
    return current;
  }

  const updated = normalizeItems(
    current.map((item) =>
      item.id === id
        ? { ...item, pinned: !item.pinned, updatedAt: Date.now() }
        : item,
    ),
  );

  await writeToRedis(userId, updated);
  return updated;
}

async function popDirtyUserIds(limit: number): Promise<string[]> {
  const client = await getRedisClient();
  if (!client) {
    const ids: string[] = [];
    for (const userId of memoryDirty) {
      ids.push(userId);
      if (ids.length >= limit) {
        break;
      }
    }
    for (const id of ids) {
      memoryDirty.delete(id);
    }
    return ids;
  }

  const result = await client.sPop(dirtyKey, limit);
  if (!result) {
    return [];
  }
  if (Array.isArray(result)) {
    return result;
  }
  return [result];
}

async function loadItemsForFlush(userId: string): Promise<PortalRecentItemPayload[] | null> {
  const client = await getRedisClient();
  if (!client) {
    return memoryRecents.get(userId) ?? null;
  }

  const raw = await client.get(userKey(userId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    return normalizeItems(Array.isArray(parsed) ? parsed : []);
  } catch {
    return null;
  }
}

export async function flushDirtyPortalRecents() {
  const userIds = await popDirtyUserIds(FLUSH_BATCH_SIZE);
  if (userIds.length === 0) {
    return 0;
  }

  let flushed = 0;
  for (const userId of userIds) {
    try {
      const items = await loadItemsForFlush(userId);
      if (!items) {
        continue;
      }

      await PortalRecent.findOneAndUpdate(
        { userId },
        { $set: { items } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      flushed += 1;
    } catch (error) {
      console.error(
        `[portal-recents] flush falhou para ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Re-mark as dirty so we try again later.
      const client = await getRedisClient();
      if (client) {
        await client.sAdd(dirtyKey, userId).catch(() => undefined);
      } else {
        memoryDirty.add(userId);
      }
    }
  }

  return flushed;
}

let flushTimer: NodeJS.Timeout | null = null;

export function startPortalRecentsFlushLoop() {
  if (flushTimer) {
    return;
  }

  flushTimer = setInterval(() => {
    void flushDirtyPortalRecents().catch((error) => {
      console.error(
        `[portal-recents] flush loop error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }, FLUSH_INTERVAL_MS);

  if (typeof flushTimer.unref === "function") {
    flushTimer.unref();
  }
}

export function stopPortalRecentsFlushLoop() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}
