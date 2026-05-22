const KEY = "portal:search-history";
const MAX = 8;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

export function pushSearchHistory(query: string) {
  if (typeof window === "undefined") return;
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  const current = getSearchHistory();
  const next = [trimmed, ...current.filter((entry) => entry !== trimmed)].slice(
    0,
    MAX,
  );
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

export function clearSearchHistory() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
