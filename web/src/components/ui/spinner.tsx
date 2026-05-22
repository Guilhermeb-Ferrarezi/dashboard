import * as React from "react";

import { LoaderCircleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const SIZE: Record<string, string> = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

function Spinner({
  className,
  size = "md",
  label,
  ...props
}: React.ComponentProps<"span"> & {
  size?: keyof typeof SIZE;
  label?: string;
}) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <LoaderCircleIcon
        className={cn("animate-spin text-current", SIZE[size])}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export { Spinner };
