"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronRightIcon,
  PanelRightOpenIcon,
} from "@/components/ui/icons";

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
import { CodexDrawer } from "@/components/portal/codex-drawer";
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

const CODEX_DRAWER_WIDTH_KEY = "portal:codex-drawer-width";
const CODEX_DRAWER_DEFAULT_WIDTH = 520;
const CODEX_DRAWER_MIN_WIDTH = 360;
const CODEX_DRAWER_MAX_WIDTH = 760;

function clampCodexDrawerWidth(width: number) {
  return Math.min(CODEX_DRAWER_MAX_WIDTH, Math.max(CODEX_DRAWER_MIN_WIDTH, width));
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
  const [logsProjectName, setLogsProjectName] = useState<string | null>(null);
  const [codexOpen, setCodexOpen] = useState(false);
  const [codexWidth, setCodexWidth] = useState(() => {
    if (typeof window === "undefined") {
      return CODEX_DRAWER_DEFAULT_WIDTH;
    }

    const saved = Number(window.localStorage.getItem(CODEX_DRAWER_WIDTH_KEY));
    return Number.isFinite(saved) ? clampCodexDrawerWidth(saved) : CODEX_DRAWER_DEFAULT_WIDTH;
  });
  const codexDragActiveRef = useRef(false);

  useEffect(() => {
    function handleLastProjectChanged(event: Event) {
      const customEvent = event as CustomEvent<{ projectId?: string; projectName?: string }>;
      const projectId = customEvent.detail?.projectId;
      const projectName = customEvent.detail?.projectName ?? null;
      setLogsHref(projectId ? `/logs/${projectId}` : "/logs");
      setLogsProjectName(projectId ? projectName : null);
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

  useEffect(() => {
    if (pathname === "/logs") {
      setLogsProjectName(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CODEX_DRAWER_WIDTH_KEY, String(codexWidth));
  }, [codexWidth]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!codexDragActiveRef.current) {
        return;
      }

      const nextWidth = clampCodexDrawerWidth(window.innerWidth - event.clientX);
      setCodexWidth(nextWidth);
    }

    function handlePointerUp() {
      codexDragActiveRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
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

  function startCodexResize(event: ReactPointerEvent<HTMLButtonElement>) {
    codexDragActiveRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    event.currentTarget.setPointerCapture(event.pointerId);
  }

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
            className="relative w-full h-9 !py-0 !pl-2 !pr-8 !flex items-center gap-2"
            aria-expanded={isOpen}
            aria-controls={`${item.href.slice(1)}-submenu`}
            onClick={() => {
              setOpenMenus((current) => ({
                ...current,
                [item.href]: !(current[item.href] ?? routeOpenMenus[item.href] ?? false),
              }));
            }}
          >
            <span className="min-w-0 truncate text-sm leading-5">{item.label}</span>
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
            className="relative w-full h-9 !py-0 !pl-8 !pr-2 !flex items-center gap-2"
          >
            <span className="min-w-0 truncate text-sm leading-5">{item.label}</span>
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
                    className="w-full max-w-none h-8 !py-0 !pl-2 !pr-2 !flex items-center justify-start gap-2 text-left"
                  >
                    <span className="min-w-0 truncate text-sm leading-5">{child.label}</span>
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
              <div className="flex size-11 items-center justify-center rounded-2xl text-sidebar-primary-foreground shadow-sm">
                <Image
                    src="/assets/Logo.png"
                    alt="Santos Tech"
                    width={48}
                    height={48}
                    priority
                  />
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
              <span className="min-w-0 flex-1 truncate text-sm leading-5">Home</span>
            </SidebarMenuButton>
          </div>

          <PortalRecentSection
            userId={user.id}
            pathname={pathname}
            logsHref={logsHref}
            logsProjectName={logsProjectName}
          />

          {visibleSidebarGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <Button
                type="button"
                variant="ghost"
                className="mb-1 flex h-9 w-full items-center justify-between gap-2 rounded-md px-2 text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground aria-expanded:bg-sidebar-foreground/10 aria-expanded:text-sidebar-foreground"
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
            "flex min-h-screen",
            lockViewport && "h-screen min-h-0 overflow-hidden",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col">
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
                {user.role === "admin" ? (
                  <Button
                    type="button"
                    variant={codexOpen ? "default" : "outline"}
                    className="gap-2"
                    onClick={() => setCodexOpen((current) => !current)}
                  >
                    <PanelRightOpenIcon className="size-4" />
                    {codexOpen ? "Fechar IA" : "Abrir IA"}
                  </Button>
                ) : null}
              </div>
            </header>

            <div
              className={cn(
                "flex w-full flex-1 min-h-0 px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]",
                lockViewport && "overflow-hidden",
              )}
            >
              <main
                className={cn(
                  "flex min-h-0 min-w-0 flex-1 flex-col",
                  lockViewport && "overflow-hidden",
                )}
              >
                <div
                  className={cn(
                    "flex min-h-0 w-full flex-1 flex-col",
                    fullWidth ? "max-w-none" : "mx-auto max-w-7xl",
                  )}
                >
                  {children}
                </div>
              </main>
            </div>
          </div>

          {user.role === "admin" ? (
            <div
              className={cn(
                "relative shrink-0 transition-[width,opacity] duration-300 ease-out",
                codexOpen
                  ? "opacity-100"
                  : "w-0 opacity-0 pointer-events-none",
              )}
              style={codexOpen ? { width: `${codexWidth}px` } : undefined}
            >
              {codexOpen ? (
                <button
                  type="button"
                  aria-label="Redimensionar chat"
                  onPointerDown={startCodexResize}
                  className="fixed inset-y-0 z-30 w-3 -translate-x-1/2 cursor-col-resize"
                  style={{ right: `${codexWidth}px` }}
                >
                  <span className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 rounded-full bg-border/70 transition-colors hover:bg-primary/70" />
                </button>
              ) : null}

              <aside
                className={cn(
                  "fixed right-0 top-0 z-20 h-screen min-h-0 min-w-0 overflow-hidden border-l border-border/60 bg-background/95 transition-[padding] duration-300 ease-out",
                  codexOpen
                    ? "px-3 py-[var(--app-page-padding-y)]"
                    : "px-0 py-0",
                )}
                style={codexOpen ? { width: `${codexWidth}px` } : undefined}
              >
                {codexOpen ? (
                  <CodexDrawer
                    user={user}
                    open={codexOpen}
                    onOpenChange={setCodexOpen}
                  />
                ) : null}
              </aside>
            </div>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
