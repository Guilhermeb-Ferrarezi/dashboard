const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function formatRelativeFromNow(iso: string | number | Date): string {
  const target = typeof iso === "number" ? iso : new Date(iso).getTime();
  if (!Number.isFinite(target)) return "agora";
  const diffSec = Math.round((target - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return relativeFormatter.format(diffSec, "second");
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return relativeFormatter.format(Math.round(diffSec / 86400), "day");
  return relativeFormatter.format(Math.round(diffSec / 604800), "week");
}

const absoluteFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatAbsolute(iso: string | number | Date): string {
  return absoluteFormatter.format(new Date(iso));
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(iso: string | number | Date): string {
  return dateFormatter.format(new Date(iso));
}
