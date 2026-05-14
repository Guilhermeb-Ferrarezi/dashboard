"use client";

import type { PortalRecentItem } from "@/components/portal/portal-shell-data";

const PORTAL_RECENTS_KEY_PREFIX = "portal:recents:";
const PORTAL_RECENTS_CHANGED_EVENT = "portal:recents-changed";
const PORTAL_RECENTS_OPEN_EVENT = "portal:quicksearch-open";
const PORTAL_RECENTS_OPEN_KEY_PREFIX = "portal:recents-open:";
const MAX_RECENTS = 5;

function isLogsRecentItem(item: Pick<PortalRecentItem, "id" | "href">) {
  return item.id === "logs" || item.href === "/logs" || item.href.startsWith("/logs/");
}

function normalizePortalRecentItem(item: PortalRecentItem): PortalRecentItem {
  if (!isLogsRecentItem(item)) {
    return item;
  }

  return {
    ...item,
    id: "logs",
  };
}

function getPortalRecentId(item: Pick<PortalRecentItem, "id" | "href">) {
  return isLogsRecentItem(item) ? "logs" : item.id;
}

function mergePortalRecentItems(items: PortalRecentItem[]) {
  const merged = new Map<string, PortalRecentItem>();

  for (const item of items) {
    const normalizedItem = normalizePortalRecentItem(item);
    const current = merged.get(normalizedItem.id);

    if (!current) {
      merged.set(normalizedItem.id, normalizedItem);
      continue;
    }

    merged.set(normalizedItem.id, {
      ...current,
      ...normalizedItem,
      pinned: current.pinned || normalizedItem.pinned,
      updatedAt: Math.max(current.updatedAt, normalizedItem.updatedAt),
    });
  }

  return [...merged.values()];
}

export function getPortalRecentsKey(userId: string) {
  return `${PORTAL_RECENTS_KEY_PREFIX}${userId}`;
}

export function getPortalRecentsOpenKey(userId: string) {
  return `${PORTAL_RECENTS_OPEN_KEY_PREFIX}${userId}`;
}

export function dispatchPortalQuickSearchOpen() {
  window.dispatchEvent(new Event(PORTAL_RECENTS_OPEN_EVENT));
}

export function readPortalRecents(userId: string) {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(getPortalRecentsKey(userId));

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as PortalRecentItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortPortalRecents(
      mergePortalRecentItems(
        parsed
          .filter(
            (item) => Boolean(item?.id && item?.href && item?.label) && item.id !== "home",
          )
          .map((item) => normalizePortalRecentItem(item)),
      ),
    );
  } catch {
    return [];
  }
}

function writePortalRecents(userId: string, items: PortalRecentItem[]) {
  window.localStorage.setItem(
    getPortalRecentsKey(userId),
    JSON.stringify(mergePortalRecentItems(items).slice(0, MAX_RECENTS)),
  );
  window.dispatchEvent(new Event(PORTAL_RECENTS_CHANGED_EVENT));
}

function sortPortalRecents(items: PortalRecentItem[]) {
  return [...items].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return Number(right.pinned) - Number(left.pinned);
    }

    return right.updatedAt - left.updatedAt;
  });
}

export function trackPortalRecent(
  userId: string,
  item: Omit<PortalRecentItem, "pinned" | "updatedAt">,
) {
  if (typeof window === "undefined") {
    return;
  }

  const currentItems = readPortalRecents(userId);
  const itemId = getPortalRecentId(item);
  const currentPinned = currentItems.find((current) => current.id === itemId)?.pinned ?? false;
  const now = Date.now();
  const updatedItems = sortPortalRecents([
    {
      ...normalizePortalRecentItem({
        ...item,
        id: itemId,
        pinned: currentPinned,
        updatedAt: now,
      }),
    },
    ...currentItems.filter((current) => current.id !== itemId),
  ]);

  writePortalRecents(userId, updatedItems);
}

export function togglePortalRecentPin(userId: string, id: string) {
  if (typeof window === "undefined") {
    return;
  }

  const currentItems = readPortalRecents(userId);
  const updatedItems = sortPortalRecents(
    currentItems.map((item) =>
      item.id === id
        ? { ...item, pinned: !item.pinned, updatedAt: Date.now() }
        : item,
    ),
  );

  writePortalRecents(userId, updatedItems);
}

export function listenPortalRecentsChange(handler: () => void) {
  window.addEventListener(PORTAL_RECENTS_CHANGED_EVENT, handler);

  return () => window.removeEventListener(PORTAL_RECENTS_CHANGED_EVENT, handler);
}

export function listenPortalQuickSearchOpen(handler: () => void) {
  window.addEventListener(PORTAL_RECENTS_OPEN_EVENT, handler);

  return () => window.removeEventListener(PORTAL_RECENTS_OPEN_EVENT, handler);
}

export function readPortalRecentsOpen(userId: string) {
  if (typeof window === "undefined") {
    return true;
  }

  const value = window.localStorage.getItem(getPortalRecentsOpenKey(userId));
  return value === null ? true : value === "true";
}

export function writePortalRecentsOpen(userId: string, open: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getPortalRecentsOpenKey(userId), String(open));
}
