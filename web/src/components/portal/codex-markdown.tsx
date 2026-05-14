"use client";

import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

interface CodexMarkdownProps {
  children: string;
  className?: string;
  tone?: "default" | "inverse" | "muted";
}

function languageFromClassName(className: string | undefined) {
  if (!className) {
    return null;
  }

  const match = className.match(/language-([\w-]+)/);
  return match?.[1] ?? null;
}

function CodeBlock({
  inline,
  className,
  children,
}: {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const language = languageFromClassName(className);
  const code = Array.isArray(children) ? children.join("") : String(children);

  if (inline) {
    return (
      <code className="rounded-md border border-border/60 bg-background/70 px-1.5 py-0.5 font-mono text-[0.92em] text-foreground">
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-border/70 bg-[#0e1117] shadow-[0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-white/5 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <span>{language ?? "code"}</span>
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground/80">codex</span>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-6 text-slate-200">
        <code className="font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-0.5 leading-7 text-inherit">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-inherit">{children}</strong>,
  em: ({ children }) => <em className="italic text-inherit">{children}</em>,
  del: ({ children }) => <del className="text-muted-foreground/80">{children}</del>,
  a: ({ href, children }) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer noopener" : undefined}
      className="font-medium text-primary underline underline-offset-4 decoration-primary/40 decoration-1 hover:decoration-primary"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1 text-inherit">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1 text-inherit">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-primary/40 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border/70" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-border/60">
      <table className="min-w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-background/70">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-border/40 px-3 py-2 align-top">{children}</td>,
  tr: ({ children }) => <tr className="odd:bg-background/20">{children}</tr>,
  h1: ({ children }) => <h1 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-foreground">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 text-lg font-semibold tracking-[-0.025em] text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 text-base font-semibold tracking-[-0.02em] text-foreground">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-3 text-sm font-semibold text-foreground">{children}</h4>,
  h5: ({ children }) => <h5 className="mt-2 text-sm font-semibold text-foreground">{children}</h5>,
  h6: ({ children }) => <h6 className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</h6>,
  code: ({ inline, className, children }) => <CodeBlock inline={inline} className={className}>{children}</CodeBlock>,
};

export function CodexMarkdown({ children, className, tone = "default" }: CodexMarkdownProps) {
  return (
    <div
      className={cn(
        "codex-markdown whitespace-normal break-words",
        tone === "inverse" && "text-primary-foreground",
        tone === "muted" && "text-muted-foreground",
        tone === "default" && "text-foreground",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
