"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  value: string;
  label?: string;
  successMessage?: string | null;
  errorMessage?: string;
}

function CopyButton({
  value,
  label = "Copiar",
  successMessage = "Copiado",
  errorMessage = "Não foi possível copiar",
  variant = "ghost",
  size = "icon-sm",
  className,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const resetTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (successMessage) toast.success(successMessage, { duration: 1500 });
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(errorMessage);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      onClick={handleCopy}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

export { CopyButton };
