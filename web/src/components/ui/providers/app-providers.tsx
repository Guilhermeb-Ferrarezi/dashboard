"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

// Silencia o falso-positivo conhecido "ResizeObserver loop completed with undelivered notifications".
// Bug histórico do browser que aparece quando libs medem layout durante animações.
function SuppressResizeObserverNoise() {
  useEffect(() => {
    const RESIZE_OBSERVER_NOISE = /ResizeObserver loop/;
    function onError(event: ErrorEvent) {
      if (event.message && RESIZE_OBSERVER_NOISE.test(event.message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }
    function onUnhandled(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = typeof reason === "string" ? reason : reason?.message ?? "";
      if (RESIZE_OBSERVER_NOISE.test(message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    }
    window.addEventListener("error", onError, { capture: true });
    window.addEventListener("unhandledrejection", onUnhandled, { capture: true });
    return () => {
      window.removeEventListener("error", onError, { capture: true });
      window.removeEventListener("unhandledrejection", onUnhandled, { capture: true });
    };
  }, []);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={["light", "dark", "onix"]}
      disableTransitionOnChange
    >
      <SuppressResizeObserverNoise />
      <TooltipProvider delay={250} closeDelay={150}>
        {children}
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
