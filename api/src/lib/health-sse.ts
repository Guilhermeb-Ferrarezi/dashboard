import type { Response } from "express";

const HEARTBEAT_INTERVAL_MS = 30_000;

const clients = new Set<Response>();

export function addHealthClient(res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write(":ok\n\n");
  clients.add(res);
  res.on("close", () => clients.delete(res));
  res.write(`data: ${JSON.stringify({ serverTs: Date.now() })}\n\n`);
}

function broadcast() {
  if (clients.size === 0) return;
  const message = `data: ${JSON.stringify({ serverTs: Date.now() })}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

let broadcastTimer: NodeJS.Timeout | null = null;

export function startHealthBroadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setInterval(broadcast, HEARTBEAT_INTERVAL_MS);
  if (typeof broadcastTimer.unref === "function") {
    broadcastTimer.unref();
  }
}

export function stopHealthBroadcast() {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
}
