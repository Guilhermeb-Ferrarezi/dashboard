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

const SLOW_THRESHOLD_MS = 800;

const INITIAL_STATE: ApiHealthState = {
  tone: "idle",
  label: "Verificando",
  detail: "Consultando backend…",
  latencyMs: null,
  checkedAt: 0,
};

let cached: ApiHealthState | null = null;
const listeners = new Set<(state: ApiHealthState) => void>();
let eventSource: EventSource | null = null;

function emit(state: ApiHealthState) {
  cached = state;
  for (const listener of listeners) listener(state);
}

function stateFromServerTs(serverTs: number): ApiHealthState {
  const latencyMs = Math.max(0, Math.round(Date.now() - serverTs));
  const tone: StatusTone = latencyMs >= SLOW_THRESHOLD_MS ? "warning" : "success";
  return {
    tone,
    label: tone === "warning" ? "Lento" : "Online",
    detail: `Backend respondendo em ${latencyMs} ms`,
    latencyMs,
    checkedAt: Date.now(),
  };
}

function startSSEOnce() {
  if (eventSource) return;
  const url = `${getClientApiBaseUrl()}/health/sse`;
  const es = new EventSource(url);
  eventSource = es;

  es.onmessage = (event) => {
    try {
      const { serverTs } = JSON.parse(event.data as string) as { serverTs: number };
      emit(stateFromServerTs(serverTs));
    } catch {
      // ignorar eventos malformados
    }
  };

  es.onerror = () => {
    if (es.readyState === EventSource.CLOSED) {
      emit({
        tone: "error",
        label: "Offline",
        detail: "Sem resposta do backend.",
        latencyMs: null,
        checkedAt: Date.now(),
      });
    }
  };
}

function stopSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  cached = null;
}

export function useApiHealth(): ApiHealthState {
  const [state, setState] = useState<ApiHealthState>(cached ?? INITIAL_STATE);

  useEffect(() => {
    listeners.add(setState);
    startSSEOnce();
    if (cached) setState(cached);
    return () => {
      listeners.delete(setState);
      if (listeners.size === 0) stopSSE();
    };
  }, []);

  return state;
}
