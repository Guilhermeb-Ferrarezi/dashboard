"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemePreferenceSync } from "@/components/ui/providers/theme-preference-sync";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";
import { UserMenu } from "@/components/portal/user-menu";
import {
  PortalQuickSearchDialog,
  PortalSearchLauncher,
} from "@/components/portal/portal-quick-search";
import {
  PortalRecentSection,
} from "@/components/portal/portal-recent-section";
import {
  buildPortalSidebarGroups,
  portalIconMap,
  type PortalSidebarItem,
} from "@/components/portal/portal-shell-data";

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
  title: string;
  description: string;
  eyebrow?: string;
  fullWidth?: boolean;
  lockViewport?: boolean;
}

function isItemActive(item: PortalSidebarItem, pathname: string, logsHref: string) {
  if (item.href === logsHref) {
    return pathname === "/logs" || pathname.startsWith("/logs/");
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isGroupActive(
  group: { items: PortalSidebarItem[] },
  pathname: string,
  logsHref: string,
) {
  return group.items.some((item) => {
    if (isItemActive(item, pathname, logsHref)) {
      return true;
    }

    return item.children?.some((child) => isItemActive(child, pathname, logsHref)) ?? false;
  });
}

export function AppShell({
  user,
  children,
  title,
  description,
  eyebrow,
  fullWidth = false,
  lockViewport = false,
}: AppShellProps) {
  const pathname = usePathname();
  const [logsHref, setLogsHref] = useState(() => {
    if (typeof window === "undefined") {
      return "/logs";
    }

    const lastProjectId = window.localStorage.getItem("logs:last-project-id");
    return lastProjectId ? `/logs/${lastProjectId}` : "/logs";
  });

  useEffect(() => {
    function handleLastProjectChanged(event: Event) {
      const customEvent = event as CustomEvent<{ projectId?: string }>;
      const projectId = customEvent.detail?.projectId;
      setLogsHref(projectId ? `/logs/${projectId}` : "/logs");
    }

    window.addEventListener(
      "logs:last-project-changed",
      handleLastProjectChanged as EventListener,
    );

    return () => {
      window.removeEventListener(
        "logs:last-project-changed",
        handleLastProjectChanged as EventListener,
      );
    };
  }, []);

  const sidebarGroups = useMemo(() => buildPortalSidebarGroups(logsHref), [logsHref]);

  const visibleSidebarGroups = useMemo(
    () =>
      sidebarGroups.filter((group) => {
        if (user.role === "admin") {
          return true;
        }

        return group.label === "Operacao" || group.label === "Jogos";
      }),
    [sidebarGroups, user.role],
  );

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const routeOpenMenus = useMemo(() => {
    const entries: Array<[string, boolean]> = [];

    for (const group of visibleSidebarGroups) {
      for (const item of group.items) {
        if (!item.children?.length) {
          continue;
        }

        entries.push([
          item.href,
          isItemActive(item, pathname, logsHref) ||
            item.children.some((child) => isItemActive(child, pathname, logsHref)),
        ]);
      }
    }

    return Object.fromEntries(entries);
  }, [logsHref, pathname, visibleSidebarGroups]);

  const routeOpenGroups = useMemo(() => {
    const entries: Array<[string, boolean]> = [];

    for (const group of visibleSidebarGroups) {
      entries.push([group.label, isGroupActive(group, pathname, logsHref)]);
    }

    return Object.fromEntries(entries);
  }, [logsHref, pathname, visibleSidebarGroups]);

  function renderSidebarItem(item: PortalSidebarItem) {
    const hasChildren = Boolean(item.children?.length);
    const active = hasChildren
      ? pathname === item.href || (item.href === logsHref && pathname.startsWith("/logs"))
      : isItemActive(item, pathname, logsHref);
    const isOpen =
      hasChildren && (openMenus[item.href] ?? routeOpenMenus[item.href] ?? false);

    return (
      <SidebarMenuItem key={item.href} className="group/menu-item">
        {hasChildren ? (
          <SidebarMenuButton
            render={<button type="button" />}
            isActive={active}
            className="relative w-full h-8 !py-0 !pl-2 !pr-8 !flex items-center gap-2"
            aria-expanded={isOpen}
            aria-controls={`${item.href.slice(1)}-submenu`}
            onClick={() => {
              setOpenMenus((current) => ({
                ...current,
                [item.href]: !(current[item.href] ?? routeOpenMenus[item.href] ?? false),
              }));
            }}
          >
            <span className="min-w-0 truncate text-sm leading-none">{item.label}</span>
            <span className="absolute right-2 top-1/2 flex size-4 shrink-0 -translate-y-1/2 items-center justify-center">
              <ChevronRightIcon
                className={cn("size-4 transition-transform", isOpen && "rotate-90")}
              />
            </span>
          </SidebarMenuButton>
        ) : (
          <SidebarMenuButton
            render={<Link href={item.href} />}
            isActive={active}
            className="relative w-full h-8 !py-0 !pl-8 !pr-2 !flex items-center gap-2"
          >
            <span className="min-w-0 truncate text-sm leading-none">{item.label}</span>
          </SidebarMenuButton>
        )}

        {hasChildren ? (
          <SidebarMenuSub
            open={isOpen}
            id={`${item.href.slice(1)}-submenu`}
            className="!px-0 gap-0.5"
          >
            {item.children!.map((child) => {
              const childActive = isItemActive(child, pathname, logsHref);

              return (
                <SidebarMenuSubItem key={child.href} className="w-full">
                  <SidebarMenuSubButton
                    render={<Link href={child.href} />}
                    isActive={childActive}
                    className="w-full max-w-none h-7 !py-0 !pl-2 !pr-2 !flex items-center justify-start gap-2 text-left"
                  >
                    <span className="min-w-0 truncate text-sm leading-none">{child.label}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        ) : null}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarProvider>
      <ThemePreferenceSync preferences={user.preferences} />
      <PortalQuickSearchDialog user={user} logsHref={logsHref} />
      <Sidebar variant="floating" collapsible="icon">
        <SidebarHeader>
          <div className="overflow-hidden rounded-2xl border border-sidebar-border/60 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--sidebar-primary)_18%,transparent),color-mix(in_oklch,var(--sidebar)_92%,black))] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <SparklesIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Santos Tech</p>
                <p className="truncate text-xs text-sidebar-foreground/70">
                  Portal operacional
                </p>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <div className="px-2 py-2">
            <PortalSearchLauncher variant="sidebar" />
          </div>

          <div className="px-2 py-2">
            <SidebarMenuButton
              render={<Link href="/home" />}
              isActive={pathname === "/home"}
              className="w-full h-10 !py-0 !pl-2 !pr-2 !flex items-center gap-2"
            >
              <portalIconMap.home className="size-4 shrink-0 text-sidebar-foreground/70" />
              <span className="min-w-0 flex-1 truncate text-sm leading-none">Home</span>
            </SidebarMenuButton>
          </div>

          <PortalRecentSection userId={user.id} pathname={pathname} logsHref={logsHref} />

          {visibleSidebarGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <Button
                type="button"
                variant="ghost"
                className="mb-1 flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground aria-expanded:bg-sidebar-foreground/10 aria-expanded:text-sidebar-foreground"
                onClick={() =>
                  setOpenGroups((current) => ({
                    ...current,
                    [group.label]: !(current[group.label] ?? routeOpenGroups[group.label] ?? false),
                  }))
                }
                aria-label={
                  (openGroups[group.label] ?? routeOpenGroups[group.label] ?? false)
                    ? "Recolher grupo"
                    : "Expandir grupo"
                }
                aria-expanded={openGroups[group.label] ?? routeOpenGroups[group.label] ?? false}
              >
                <SidebarGroupLabel className="flex min-w-0 flex-1 items-center gap-2 px-0">
                  {(() => {
                    const GroupIcon = portalIconMap[group.iconKey];
                    return <GroupIcon className="size-4" />;
                  })()}
                  <span className="truncate">{group.label}</span>
                </SidebarGroupLabel>
                <ChevronRightIcon
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    (openGroups[group.label] ?? routeOpenGroups[group.label] ?? false) &&
                      "rotate-90",
                  )}
                />
              </Button>
              <SidebarGroupContent>
                <SidebarMenuSub
                  open={openGroups[group.label] ?? routeOpenGroups[group.label] ?? false}
                  className="gap-0.5"
                >
                  {group.items.map(renderSidebarItem)}
                </SidebarMenuSub>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

          <div className="mx-2 my-2 h-px shrink-0 bg-sidebar-border/60" />
        </SidebarContent>

        <SidebarFooter>
          <UserMenu user={user} />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className={cn(lockViewport && "h-screen overflow-hidden")}>
        <div
          className={cn(
            "flex min-h-screen flex-col",
            lockViewport && "h-screen min-h-0 overflow-hidden",
          )}
        >
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
            <div
              className={cn(
                "flex w-full items-center gap-4 px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]",
                fullWidth ? "max-w-none" : "mx-auto max-w-7xl",
              )}
            >
              <SidebarTrigger />
              <div className="flex min-w-0 flex-1 flex-col">
                {eyebrow ? (
                  <span className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
                    {eyebrow}
                  </span>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
                  <Badge variant="secondary">{user.role.toUpperCase()}</Badge>
                </div>
                <p className="truncate text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </header>

          <main
            className={cn(
              "flex w-full flex-1 flex-col px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]",
              lockViewport && "min-h-0 overflow-hidden",
              fullWidth ? "max-w-none" : "mx-auto max-w-7xl",
            )}
          >
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
