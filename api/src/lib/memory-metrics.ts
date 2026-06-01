import { getActiveCodexChildCount } from "./codex";

// Loga RSS/heap periodicamente junto com a contagem de processos `codex` vivos.
// Objetivo: descobrir se os 478MB em produção crescem ao longo do tempo (leak)
// ou são baseline estável, e se o crescimento correlaciona com o codex.
//
// Desligue com MEMORY_METRICS=false. Ajuste o intervalo com
// MEMORY_METRICS_INTERVAL_MS (padrão 60s).

const ENABLED = !/^(0|false|no)$/i.test(
  process.env.MEMORY_METRICS?.trim() || "",
);
const INTERVAL_MS = Number(process.env.MEMORY_METRICS_INTERVAL_MS) || 60_000;

let timer: ReturnType<typeof setInterval> | null = null;

function toMb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

export function logMemoryMetrics(): void {
  const mem = process.memoryUsage();
  console.log(
    `[mem] rss=${toMb(mem.rss)}MB heapUsed=${toMb(mem.heapUsed)}MB ` +
      `heapTotal=${toMb(mem.heapTotal)}MB external=${toMb(mem.external)}MB ` +
      `arrayBuffers=${toMb(mem.arrayBuffers)}MB codexChildren=${getActiveCodexChildCount()}`,
  );
}

export function startMemoryMetrics(): void {
  if (!ENABLED || timer) {
    return;
  }
  logMemoryMetrics();
  timer = setInterval(logMemoryMetrics, INTERVAL_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

export function stopMemoryMetrics(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
