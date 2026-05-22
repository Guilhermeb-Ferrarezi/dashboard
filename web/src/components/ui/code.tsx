import * as React from "react";

import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

function Code({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="code"
      className={cn(
        "rounded-md border border-border/50 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground",
        className,
      )}
      {...props}
    />
  );
}

interface CodeBlockProps extends React.ComponentProps<"pre"> {
  copyValue?: string;
}

function CodeBlock({ className, copyValue, children, ...props }: CodeBlockProps) {
  return (
    <div data-slot="code-block-wrapper" className="relative">
      <pre
        data-slot="code-block"
        className={cn(
          "overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground",
          copyValue ? "pr-10" : undefined,
          className,
        )}
        {...props}
      >
        {children}
      </pre>
      {copyValue ? (
        <CopyButton
          value={copyValue}
          className="absolute top-1.5 right-1.5 size-6"
        />
      ) : null}
    </div>
  );
}

export { Code, CodeBlock };
