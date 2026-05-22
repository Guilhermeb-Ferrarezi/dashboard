import * as React from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ComponentProps<typeof Button> {
  label: string;
  busy?: boolean;
}

function IconButton({
  label,
  busy = false,
  variant = "outline",
  size = "icon-sm",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      className={cn(className)}
      {...props}
    >
      {busy ? <Spinner size="sm" /> : children}
    </Button>
  );
}

export { IconButton };
