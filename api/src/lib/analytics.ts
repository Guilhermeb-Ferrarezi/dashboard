export const SALES_PAGES = ["/play/corujao", "/play/mix"] as const;

// Substrings únicas para identificar cada página via unifiedScreenName do GA4
// Títulos reais: "Corujão — Santos Games Arena" | "Mix — SGA Gaming"
export const PAGE_TITLES: Record<string, string> = {
  "/play/corujao": "coruj",
  "/play/mix": "mix",
};

export type RealtimeRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};

export function aggregateRealtimeRows(rows: RealtimeRow[] | null | undefined) {
  const pages: Record<string, number> = {};
  for (const page of SALES_PAGES) pages[page] = 0;
  let total = 0;

  for (const row of rows ?? []) {
    const screenName = (row.dimensionValues?.[0]?.value ?? "").toLowerCase();
    const users = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
    total += users;
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (screenName.includes(title)) pages[path] = (pages[path] ?? 0) + users;
    }
  }
  return { pages, total };
}
