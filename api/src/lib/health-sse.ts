import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

const HEARTBEAT_INTERVAL_MS = 30_000;

export function addHealthClient(c: Context<AppEnv>) {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ data: JSON.stringify({ serverTs: Date.now() }) });

    const interval = setInterval(async () => {
      try {
        await stream.writeSSE({ data: JSON.stringify({ serverTs: Date.now() }) });
      } catch {
        clearInterval(interval);
      }
    }, HEARTBEAT_INTERVAL_MS);

    stream.onAbort(() => clearInterval(interval));

    // manter stream vivo até o cliente desconectar
    await new Promise<void>((resolve) => stream.onAbort(resolve));
  });
}

// no-op: cada cliente tem seu próprio intervalo via streamSSE
export function broadcast() {}
export function startHealthBroadcast() {}
export function stopHealthBroadcast() {}
