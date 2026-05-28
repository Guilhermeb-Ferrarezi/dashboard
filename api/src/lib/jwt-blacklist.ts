const redisUrl = process.env.REDIS_URL?.trim();
const redisPrefix = process.env.REDIS_PREFIX?.trim() || "home:";

interface BlacklistRedisClient {
  isReady: boolean;
  on(event: "error", listener: (error: Error) => void): void;
  connect(): Promise<BlacklistRedisClient>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  get(key: string): Promise<string | null>;
}

let redisClient: BlacklistRedisClient | null = null;
let redisConnectPromise: Promise<BlacklistRedisClient | null> | null = null;
let redisUnavailableLogged = false;

async function createRedisClient(url: string) {
  try {
    const redisModule = (await new Function("return import('redis')")()) as {
      createClient: (options: { url: string }) => BlacklistRedisClient;
    };

    return redisModule.createClient({ url });
  } catch (error) {
    if (!redisUnavailableLogged) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Redis jwt-blacklist indisponivel (${message}). Usando memoria.`,
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
      console.error(`Redis jwt-blacklist error: ${error.message}`);
    });

    await client.connect();
    redisClient = client;
    console.log("Redis jwt-blacklist conectado.");
    return client;
  })().finally(() => {
    redisConnectPromise = null;
  });

  return redisConnectPromise;
}

// --- In-memory fallback ---

const memoryBlacklist = new Map<string, number>();
const MAX_MEMORY_ENTRIES = 1000;

function cleanMemoryBlacklist() {
  const now = Date.now();
  for (const [token, exp] of memoryBlacklist) {
    if (exp < now) memoryBlacklist.delete(token);
  }
}

function redisKey(token: string) {
  return `${redisPrefix}jwt:blacklist:${token}`;
}

// --- Public API ---

export async function blacklistToken(
  token: string,
  expiresAt: number,
): Promise<void> {
  const ttl = Math.max(0, Math.ceil((expiresAt * 1000 - Date.now()) / 1000));
  if (ttl <= 0) return;

  const client = await getRedisClient();
  if (client) {
    await client.set(redisKey(token), "1", { EX: ttl });
  } else {
    cleanMemoryBlacklist();
    if (memoryBlacklist.size < MAX_MEMORY_ENTRIES) {
      memoryBlacklist.set(token, expiresAt * 1000);
    }
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const client = await getRedisClient();
  if (client) {
    const val = await client.get(redisKey(token));
    return val !== null;
  }

  cleanMemoryBlacklist();
  const exp = memoryBlacklist.get(token);
  if (!exp) return false;
  return exp > Date.now();
}
