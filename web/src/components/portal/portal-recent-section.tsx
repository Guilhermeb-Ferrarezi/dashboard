"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Clock3Icon,
  PinFilledIcon,
  PinIcon,
} from "@/components/ui/icons";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  portalIconMap,
  resolvePortalRecentItem,
  type PortalRecentItem,
} from "@/components/portal/portal-shell-data";
import {
  listenPortalRecentsChange,
  readPortalRecents,
  readPortalRecentsOpen,
  togglePortalRecentPin,
  writePortalRecentsOpen,
  trackPortalRecent,
} from "@/components/portal/portal-recents";

interface PortalRecentSectionProps {
  userId: string;
  pathname: string;
  logsHref: string;
  logsProjectName?: string | null;
  className?: string;
}

export function PortalRecentSection({
  userId,
  pathname,
  logsHref,
  logsProjectName,
  className,
}: PortalRecentSectionProps) {
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<PortalRecentItem[]>([]);
  const [flashRecentId, setFlashRecentId] = useState<string | null>(null);

  useEffect(() => {
    setOpen(readPortalRecentsOpen(userId));
    setRecents(readPortalRecents(userId));
  }, [userId]);

  useEffect(() => {
    writePortalRecentsOpen(userId, open);
  }, [open, userId]);

  const recentItem = useMemo(
    () => resolvePortalRecentItem(pathname, logsHref, logsProjectName),
    [logsHref, logsProjectName, pathname],
  );

  useEffect(() => {
    if (!recentItem) {
      return;
    }

    const startTimer = window.setTimeout(() => {
      setFlashRecentId(recentItem.id);
      window.setTimeout(() => {
        setFlashRecentId((current) => (current === recentItem.id ? null : current));
      }, 1200);
    }, 0);

    trackPortalRecent(userId, recentItem);

    return () => window.clearTimeout(startTimer);
  }, [recentItem, userId]);

  useEffect(() => {
    return listenPortalRecentsChange(() => {
      setRecents(readPortalRecents(userId));
    });
  }, [userId]);

  const visibleRecents = useMemo(() => recents.slice(0, 5), [recents]);

  return (
    <SidebarGroup className={className}>
      <Button
        type="button"
        variant="ghost"
        className="mb-1 flex h-9 w-full items-center gap-2 rounded-md px-2 pt-1 text-sidebar-foreground/55 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground aria-expanded:bg-sidebar-foreground/10 aria-expanded:text-sidebar-foreground"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Recolher recentes" : "Expandir recentes"}
        aria-expanded={open}
      >
        <SidebarGroupLabel className="flex min-w-0 flex-1 items-center gap-2 px-0 text-[0.7rem] uppercase tracking-[0.18em] text-sidebar-foreground/55">
          <Clock3Icon className="size-3.5 shrink-0" />
          <span className="truncate">Recentes</span>
        </SidebarGroupLabel>
        <span className="ml-auto flex size-4 shrink-0 items-center justify-center">
          {open ? <ChevronDownIcon className="size-4" /> : <ChevronDownIcon className="size-4 -rotate-90" />}
        </span>
      </Button>
      <SidebarGroupContent className="pb-1">
        <SidebarMenuSub open={open} className="list-fade-in gap-0.5">
          {visibleRecents.length ? (
            visibleRecents.map((item) => {
              const Icon = portalIconMap[item.iconKey];
              return (
                <SidebarMenuSubItem key={item.id} className="group/item">
                  <SidebarMenuSubButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    className={cn(
                      "items-start !h-auto min-h-0 pr-9 py-2 transition-all duration-300",
                      flashRecentId === item.id &&
                        "animate-in fade-in slide-in-from-left-2 bg-sidebar-accent/80 shadow-sm",
                    )}
                  >
                    <Icon className="mt-0.5" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm leading-5">
                        {item.label}
                      </span>
                      <span className="block truncate text-[10px] leading-4 font-semibold uppercase tracking-[0.18em] text-sidebar-primary/75">
                        {item.group}
                      </span>
                    </div>
                  </SidebarMenuSubButton>
                  <button
                    type="button"
                    className={cn(
                      "absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-sidebar-foreground/50 opacity-0 transition hover:bg-sidebar-accent hover:text-sidebar-foreground group-hover/item:opacity-100",
                      item.pinned && "opacity-100 text-sidebar-foreground",
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      togglePortalRecentPin(userId, item.id);
                    }}
                    aria-label={item.pinned ? "Desafixar recente" : "Fixar recente"}
                  >
                    {item.pinned ? (
                      <PinFilledIcon className="size-3.5 fill-current" />
                    ) : (
                      <PinIcon className="size-3.5" />
                    )}
                  </button>
                </SidebarMenuSubItem>
              );
            })
          ) : (
            <div className="px-2 py-2 text-xs text-sidebar-foreground/55">
              Itens recentes aparecerao aqui.
            </div>
          )}
        </SidebarMenuSub>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
