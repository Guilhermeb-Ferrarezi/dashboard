"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useApiHealth } from "@/hooks/use-api-health";

export function ConnectivityToasts() {
  const state = useApiHealth();
  const previousTone = useRef<string>(state.tone);
  const toastId = useRef<string | number | null>(null);

  useEffect(() => {
    const prev = previousTone.current;
    if (prev === state.tone) return;

    // Skip the very first probe (idle → success doesn't deserve a toast)
    if (prev === "idle") {
      previousTone.current = state.tone;
      return;
    }

    // online → offline / error
    if (state.tone === "error" && prev !== "error") {
      toastId.current = toast.error("Conexão com o backend perdida", {
        description: state.detail,
        duration: Infinity,
        id: toastId.current ?? undefined,
      });
    }

    // recovery → success
    if (state.tone === "success" && (prev === "error" || prev === "warning")) {
      if (toastId.current != null) {
        toast.dismiss(toastId.current);
        toastId.current = null;
      }
      toast.success("Conexão restabelecida", {
        description: state.latencyMs != null ? `${state.latencyMs} ms` : undefined,
        duration: 3500,
      });
    }

    // slow warning
    if (state.tone === "warning" && prev === "success") {
      toast.warning("Backend respondendo devagar", {
        description: state.detail,
        duration: 4500,
      });
    }

    previousTone.current = state.tone;
  }, [state]);

  return null;
}
