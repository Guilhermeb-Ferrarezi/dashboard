"use client";

import { Shield, Sparkle, Globe, FileText, Code } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CodexAgentCapabilities } from "@/types/codex";

interface CodexAgentStatusProps {
  capabilities: CodexAgentCapabilities | null;
  workspaceRoot: string | null;
}

const SOURCE_ICON_MAP = {
  conversation: Sparkle,
  documentation: FileText,
  openapi: Shield,
  workspace: Code,
  web: Globe,
} as const;

export function formatExecutionMode(mode: string | null) {
  if (!mode) {
    return "modo desconhecido";
  }

  if (mode === "workspace-write") {
    return "workspace write";
  }

  return mode;
}

export function CodexAgentStatus({ capabilities, workspaceRoot }: CodexAgentStatusProps) {
  if (!capabilities) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Modo do agente
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge className="border border-primary/20 bg-primary/10 text-primary">
              <Shield className="mr-1 size-3.5" />
              {formatExecutionMode(capabilities.executionMode)}
            </Badge>
            <span className="truncate text-xs text-muted-foreground">
              {workspaceRoot || capabilities.workspaceRoot}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {capabilities.sources.map((source) => {
          const Icon = SOURCE_ICON_MAP[source.kind];

          return (
            <div
              key={source.id}
              className={cn(
                "rounded-lg border px-3 py-2",
                source.available
                  ? "border-border bg-background/80"
                  : "border-dashed border-border/60 bg-background/50 opacity-70",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="size-3.5 text-primary" />
                <p className="text-sm font-medium">{source.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{source.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
