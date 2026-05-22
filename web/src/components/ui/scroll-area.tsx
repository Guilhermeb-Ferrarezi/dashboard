import * as React from "react";

import { cn } from "@/lib/utils";

function ScrollArea({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal" | "both";
}) {
  return (
    <div
      data-slot="scroll-area"
      data-orientation={orientation}
      className={cn(
        "relative",
        orientation === "vertical" && "overflow-x-hidden overflow-y-auto",
        orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
        orientation === "both" && "overflow-auto",
        className,
      )}
      {...props}
    />
  );
}

export { ScrollArea };
