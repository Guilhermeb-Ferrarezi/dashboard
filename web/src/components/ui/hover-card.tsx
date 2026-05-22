"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface HoverCardContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  openDelay: number;
  closeDelay: number;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

interface HoverCardProps {
  openDelay?: number;
  closeDelay?: number;
  children: React.ReactNode;
}

function HoverCard({ openDelay = 200, closeDelay = 150, children }: HoverCardProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <HoverCardContext.Provider value={{ open, setOpen, openDelay, closeDelay }}>
      {children}
    </HoverCardContext.Provider>
  );
}

function useHoverCard() {
  const ctx = React.useContext(HoverCardContext);
  if (!ctx) throw new Error("HoverCard subcomponents must be inside HoverCard");
  return ctx;
}

function HoverCardTrigger({
  children,
  asChild = false,
}: {
  children: React.ReactElement<{ onMouseEnter?: () => void; onMouseLeave?: () => void; onFocus?: () => void; onBlur?: () => void }>;
  asChild?: boolean;
}) {
  const { setOpen, openDelay, closeDelay } = useHoverCard();
  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);

  function clearTimers() {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }

  function scheduleOpen() {
    clearTimers();
    openTimer.current = window.setTimeout(() => setOpen(true), openDelay);
  }
  function scheduleClose() {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(false), closeDelay);
  }

  void asChild;
  return React.cloneElement(children, {
    onMouseEnter: scheduleOpen,
    onMouseLeave: scheduleClose,
    onFocus: scheduleOpen,
    onBlur: scheduleClose,
  });
}

function HoverCardContent({
  children,
  className,
  side = "bottom",
}: {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom";
}) {
  const { open } = useHoverCard();
  if (!open) return null;
  return (
    <div
      role="tooltip"
      data-side={side}
      className={cn(
        "absolute left-0 z-50 w-64 rounded-lg border border-border/60 bg-popover/97 p-3 text-xs text-popover-foreground shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45),0_2px_6px_-2px_rgba(0,0,0,0.18)] ring-1 ring-border/40 backdrop-blur-md",
        side === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
