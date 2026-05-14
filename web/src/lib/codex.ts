export function getCodexWebSocketUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;

  if (apiUrl && /^https?:\/\//.test(apiUrl)) {
    return `${apiUrl.replace(/^http/i, "ws").replace(/\/$/, "")}/codex/ws`;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/api/codex/ws`;
}

export function formatCodexTimestamp(value: string | number | null) {
  if (!value) {
    return "";
  }

  const date = new Date(typeof value === "number" ? value * 1000 : value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
