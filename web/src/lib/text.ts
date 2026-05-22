export function truncateMiddle(value: string, max = 24, ellipsis = "…"): string {
  if (!value) return value;
  if (value.length <= max) return value;
  if (max <= ellipsis.length + 2) return value.slice(0, max);
  const sideLength = Math.floor((max - ellipsis.length) / 2);
  const start = value.slice(0, sideLength);
  const end = value.slice(value.length - sideLength);
  return `${start}${ellipsis}${end}`;
}

export function truncateEnd(value: string, max = 64, ellipsis = "…"): string {
  if (!value) return value;
  if (value.length <= max) return value;
  return `${value.slice(0, max - ellipsis.length)}${ellipsis}`;
}

export function pluralize(count: number, singular: string, plural?: string) {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural ?? `${singular}s`}`;
}
