"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "portal:recently-visited";
const MAX = 5;

export type RecentlyVisitedEntry = {
  path: string;
  visitedAt: number;
};

function load(): RecentlyVisitedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RecentlyVisitedEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as RecentlyVisitedEntry).path === "string" &&
        typeof (entry as RecentlyVisitedEntry).visitedAt === "number",
    );
  } catch {
    return [];
  }
}

function persist(entries: RecentlyVisitedEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

const SKIP_PATTERNS = [/^\/login/, /^\/api/, /^\/_/];

function shouldSkip(path: string) {
  return SKIP_PATTERNS.some((pattern) => pattern.test(path));
}

export function useTrackRecentlyVisited() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || shouldSkip(pathname)) return;
    const current = load();
    const next: RecentlyVisitedEntry[] = [
      { path: pathname, visitedAt: Date.now() },
      ...current.filter((entry) => entry.path !== pathname),
    ].slice(0, MAX);
    persist(next);
  }, [pathname]);
}

export function useRecentlyVisited(): RecentlyVisitedEntry[] {
  const [entries, setEntries] = useState<RecentlyVisitedEntry[]>([]);
  useEffect(() => {
    setEntries(load());
    function onStorage(event: StorageEvent) {
      if (event.key === KEY) setEntries(load());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return entries;
}
