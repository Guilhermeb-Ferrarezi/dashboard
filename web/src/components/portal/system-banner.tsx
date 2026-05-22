"use client";

import { useEffect, useState } from "react";

import { useApiHealth } from "@/hooks/use-api-health";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OctagonXIcon, TriangleAlertIcon, XIcon } from "@/components/ui/icons";

const DISMISS_KEY = "system-banner:dismissed-at";
const REOPEN_AFTER_MS = 60_000;

export function SystemBanner() {
  const health = useApiHealth();
  const [dismissedAt, setDismissedAt] = useState<number>(0);

  useEffect(() => {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (raw) setDismissedAt(Number.parseInt(raw, 10) || 0);
  }, []);

  function handleDismiss() {
    const now = Date.now();
    setDismissedAt(now);
    window.localStorage.setItem(DISMISS_KEY, String(now));
  }

  // Reset dismiss state when API recovers
  useEffect(() => {
    if (health.tone === "success" && dismissedAt > 0) {
      setDismissedAt(0);
      window.localStorage.removeItem(DISMISS_KEY);
    }
  }, [health.tone, dismissedAt]);

  if (health.tone !== "error" && health.tone !== "warning") return null;
  if (dismissedAt > 0 && Date.now() - dismissedAt < REOPEN_AFTER_MS) return null;

  const isError = health.tone === "error";
  const Icon = isError ? OctagonXIcon : TriangleAlertIcon;

  return (
    <div className="px-[var(--app-page-padding-x)] pt-[var(--app-page-padding-y)]" aria-live="polite">
      <Alert
        variant={isError ? "destructive" : "warning"}
        className="relative pr-10"
        role={isError ? "alert" : "status"}
      >
        <Icon />
        <AlertTitle>
          {isError ? "Backend indisponível" : "Backend respondendo devagar"}
        </AlertTitle>
        <AlertDescription>
          {health.detail}
          {health.latencyMs != null ? ` · ${health.latencyMs} ms` : ""}
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1.5 right-1.5 size-7 text-current opacity-70 hover:opacity-100"
          onClick={handleDismiss}
          aria-label="Fechar aviso"
        >
          <XIcon className="size-3.5" />
        </Button>
      </Alert>
    </div>
  );
}
