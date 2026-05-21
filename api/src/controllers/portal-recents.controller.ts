import type { Request, Response } from "express";

import {
  getPortalRecents,
  togglePortalRecentPin,
  trackPortalRecent,
} from "../lib/portal-recents-store";

export async function listPortalRecents(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const items = await getPortalRecents(userId);
  return res.json({ items });
}

export async function trackPortalRecentHandler(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const item = req.body?.item ?? req.body;
  const items = await trackPortalRecent(userId, item);

  if (!items) {
    return res.status(400).json({ message: "Recent invalido." });
  }

  return res.json({ items });
}

export async function togglePortalRecentPinHandler(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Missing token" });
  }

  const id = typeof req.body?.id === "string" ? req.body.id : null;
  if (!id) {
    return res.status(400).json({ message: "id obrigatorio." });
  }

  const items = await togglePortalRecentPin(userId, id);
  return res.json({ items });
}
