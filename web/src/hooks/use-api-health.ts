"use client";

import { useEffect, useState } from "react";

import type { StatusTone } from "@/components/ui/status-dot";
import { getClientApiBaseUrl } from "@/lib/api";

export type ApiHealthState = {
  tone: StatusTone;
  label: string;
  detail: string;
  latencyMs: number | null;
  checkedAt: number;
};

const POLL_INTERVAL_MS = 30_000;
const SLOW_THRESHOLD_MS = 800;
const TIMEOUT_MS = 5_000;

async function probeHealth(): Promise<ApiHealthState> {
  const base = getClientApiBaseUrl();
  const url = base.endsWith("/api") ? base : `${base.replace(/\/$/u, "")}/api`;
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    const latency = Math.round(performance.now() - start);
    if (!response.ok) {
      return {
        tone: "error",
        label: "Erro",
        detail: `Backend respondeu ${response.status}`,
        latencyMs: latency,
        checkedAt: Date.now(),
      };
    }
    if (latency >= SLOW_THRESHOLD_MS) {
      return {
        tone: "warning",
        label: "Lento",
        detail: `Backend respondendo em ${latency} ms`,
        latencyMs: latency,
        checkedAt: Date.now(),
      };
    }
    return {
      tone: "success",
      label: "Online",
      detail: `Backend respondendo em ${latency} ms`,
      latencyMs: latency,
      checkedAt: Date.now(),
    };
  } catch (error) {
    return {
      tone: "error",
      label: "Offline",
      detail:
        error instanceof Error && error.name === "AbortError"
          ? "Tempo limite excedido."
          : "Sem resposta do backend.",
      latencyMs: null,
      checkedAt: Date.now(),
    };
  } finally {
    clearTimeout(timer);
  }
}

let cached: ApiHealthState | null = null;
const listeners = new Set<(state: ApiHealthState) => void>();
let pollingTimer: number | null = null;

function emit(state: ApiHealthState) {
  cached = state;
  for (const listener of listeners) listener(state);
}

async function tick() {
  const next = await probeHealth();
  emit(next);
}

function startPollingOnce() {
  if (pollingTimer !== null) return;
  tick();
  pollingTimer = window.setInterval(tick, POLL_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisibility);
}

function stopPolling() {
  if (pollingTimer !== null) {
    window.clearInterval(pollingTimer);
    pollingTimer = null;
  }
  document.removeEventListener("visibilitychange", onVisibility);
}

function onVisibility() {
  if (!document.hidden) tick();
}

const INITIAL_STATE: ApiHealthState = {
  tone: "idle",
  label: "Verificando",
  detail: "Consultando backend…",
  latencyMs: null,
  checkedAt: 0,
};

export function useApiHealth(): ApiHealthState {
  const [state, setState] = useState<ApiHealthState>(cached ?? INITIAL_STATE);

  useEffect(() => {
    listeners.add(setState);
    startPollingOnce();
    if (cached) setState(cached);
    return () => {
      listeners.delete(setState);
      if (listeners.size === 0) stopPolling();
    };
  }, []);

  return state;
}
