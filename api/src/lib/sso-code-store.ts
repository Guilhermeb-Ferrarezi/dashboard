import { createClient } from "redis";

export interface PendingSsoCode {
  projectId: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  createdAt: number;
}

const CODE_TTL_MS = 60_000;
const MAX_PENDING = 500;
const redisUrl = process.env.REDIS_URL?.trim();
const redisPrefix = process.env.REDIS_PREFIX?.trim() || "sso:code:";

const memoryPendingCodes = new Map<string, PendingSsoCode>();

type SsoRedisClient = ReturnType<typeof createClient>;

let redisClient: SsoRedisClient | null = null;
let redisConnectPromise: Promise<SsoRedisClient> | null = null;

function pruneExpiredMemoryCodes() {
  const now = Date.now();

  for (const [code, entry] of memoryPendingCodes) {
    if (now - entry.createdAt > CODE_TTL_MS) {
      memoryPendingCodes.delete(code);
    }
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

  const client = createClient({ url: redisUrl });

  client.on("error", (error) => {
    console.error(`Redis SSO error: ${error.message}`);
  });

  redisConnectPromise = client.connect().then(() => {
    redisClient = client;
    console.log("Redis SSO storage conectado.");
    return client;
  });

  try {
    return await redisConnectPromise;
  } finally {
    redisConnectPromise = null;
  }
}

function getRedisKey(code: string) {
  return `${redisPrefix}${code}`;
}

export function getSsoCodeTtlMs() {
  return CODE_TTL_MS;
}

export async function canStorePendingSsoCode() {
  const client = await getRedisClient();

  if (client) {
    return true;
  }

  pruneExpiredMemoryCodes();
  return memoryPendingCodes.size < MAX_PENDING;
}

export async function storePendingSsoCode(
  code: string,
  payload: PendingSsoCode,
) {
  const client = await getRedisClient();

  if (client) {
    await client.set(getRedisKey(code), JSON.stringify(payload), {
      PX: CODE_TTL_MS,
    });
    return;
  }

  pruneExpiredMemoryCodes();
  memoryPendingCodes.set(code, payload);
}

export async function consumePendingSsoCode(code: string) {
  const client = await getRedisClient();

  if (client) {
    const raw = await client.getDel(getRedisKey(code));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as PendingSsoCode;
  }

  pruneExpiredMemoryCodes();

  const entry = memoryPendingCodes.get(code);

  if (!entry) {
    return null;
  }

  memoryPendingCodes.delete(code);
  return entry;
}
