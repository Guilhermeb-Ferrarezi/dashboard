import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import {
  getPortalRecents,
  togglePortalRecentPin,
  trackPortalRecent,
} from "../lib/portal-recents-store";

export async function listPortalRecents(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const items = await getPortalRecents(userId);
  return c.json({ items });
}

export async function trackPortalRecentHandler(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const body = await c.req.json();
  const item = body?.item ?? body;
  const items = await trackPortalRecent(userId, item);

  if (!items) {
    return c.json({ message: "Recent invalido." }, 400);
  }

  return c.json({ items });
}

export async function togglePortalRecentPinHandler(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get("user")?.id;
  if (!userId) {
    return c.json({ message: "Missing token" }, 401);
  }

  const body = await c.req.json();
  const id = typeof body?.id === "string" ? body.id : null;
  if (!id) {
    return c.json({ message: "id obrigatorio." }, 400);
  }

  const items = await togglePortalRecentPin(userId, id);
  return c.json({ items });
}
