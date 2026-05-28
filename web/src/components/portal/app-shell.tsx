"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronRightIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
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
import { useTrackRecentlyVisited } from "@/hooks/use-recently-visited";
import { ApiHealthIndicator } from "@/components/portal/api-health-indicator";
import { CommandPalette } from "@/components/portal/command-palette";
import { KeyboardShortcutsOverlay } from "@/components/portal/keyboard-shortcuts-overlay";
import { SkipToContent } from "@/components/portal/skip-to-content";
import { SystemBanner } from "@/components/portal/system-banner";
import { ThemeCycleButton } from "@/components/portal/theme-cycle-button";
import { UserMenu } from "@/components/portal/user-menu";
import {
  PortalQuickSearchDialog,
  PortalSearchLauncher,
} from "@/components/portal/portal-quick-search";
import {
  PortalRecentSection,
} from "@/components/portal/portal-recent-section";
import { hydratePortalRecentsFromServer } from "@/components/portal/portal-recents";
const CodexDrawer = lazy(() =>
  import("@/components/portal/codex-drawer").then((m) => ({ default: m.CodexDrawer }))
);
import {
  buildPortalSidebarGroups,
  portalIconMap,
  type PortalSidebarItem,
} from "@/components/portal/portal-shell-data";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
  title: string;
  description: string;
  eyebrow?: string;
  breadcrumb?: BreadcrumbItem[];
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

  if (item.href === "/checkout") {
    return pathname === "/checkout";
  }

  if (item.href === "/corujao") {
    return pathname === "/corujao";
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
  breadcrumb,
  fullWidth = true,
  lockViewport = false,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  useTrackRecentlyVisited();
  const [logsHref, setLogsHref] = useState(() => {
    if (typeof window === "undefined") {
      return "/logs";
    }

    const lastProjectId = window.localStorage.getItem("logs:last-project-id");
    return lastProjectId ? `/logs/${lastProjectId}` : "/logs";
  });
  const [logsProjectName, setLogsProjectName] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<"account" | "preferences" | "session" | "codex">("account");
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

  const currentLogsProjectName =
    pathname.startsWith("/logs") && pathname !== "/logs" ? logsProjectName : null;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CODEX_DRAWER_WIDTH_KEY, String(codexWidth));
  }, [codexWidth]);

  useEffect(() => {
    void hydratePortalRecentsFromServer(user.id);
  }, [user.id]);

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

  // Quick switch: ⌘1..⌘9 navega para o N-ésimo item primário visível
  const quickSwitchHrefs = useMemo(() => {
    const hrefs: string[] = ["/painel"];
    for (const group of visibleSidebarGroups) {
      for (const item of group.items) {
        if (item.href && !hrefs.includes(item.href)) hrefs.push(item.href);
        if (hrefs.length >= 9) break;
      }
      if (hrefs.length >= 9) break;
    }
    return hrefs.slice(0, 9);
  }, [visibleSidebarGroups]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.shiftKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      const digit = Number.parseInt(event.key, 10);
      if (Number.isNaN(digit) || digit < 1 || digit > 9) return;
      const href = quickSwitchHrefs[digit - 1];
      if (!href) return;
      event.preventDefault();
      router.push(href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickSwitchHrefs, router]);

  // Scroll-to-top em troca de rota (respeitando navegação por âncoras)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

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
            className="relative w-full h-8 !py-0 !pl-2 !pr-2 !flex items-center gap-2"
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

  const primaryNavigation = [
    {
      href: "/painel",
      label: "Dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      href: "/projects",
      label: "Projetos",
      icon: LayoutGridIcon,
    },
  ] as const;

  return (
    <SidebarProvider>
      <SkipToContent />
      <ThemePreferenceSync preferences={user.preferences} />
      <PortalQuickSearchDialog user={user} logsHref={logsHref} />
      <KeyboardShortcutsOverlay />
      <CommandPalette />
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-3 px-1 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
            <div className="flex size-9 shrink-0 items-center justify-center">
              {/* <img> simples em vez de next/image porque o build vinext
                 não tem o image optimization loader do Next em prod, e
                 quebra o asset. Pra logo 36x36 não há ganho de otimização
                 que justifique a complexidade. */}
              <img
                src="/assets/Logo.png"
                alt="Santos Tech"
                width={36}
                height={36}
                className="size-9 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-heading text-sm font-semibold tracking-tight">
                Santos Tech
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/50">
                Universal Home
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <div className="px-2 py-2 group-data-[collapsible=icon]:px-1.5">
            <PortalSearchLauncher variant="sidebar" />
          </div>

          <div className="px-2 py-2">
            <SidebarMenuButton
              render={<Link href="/painel" />}
              isActive={pathname === "/painel"}
              tooltip="Home"
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
            logsProjectName={currentLogsProjectName}
          />

          {visibleSidebarGroups.map((group) => (
            <SidebarGroup key={group.label} className="mt-2 first:mt-0">
              {/* Header Linear-style: label uppercase tiny + chevron discreto.
                 Ícone de grupo removido — Linear/Vercel não usam, fica mais limpo. */}
              <button
                type="button"
                className="group/group-header mb-0.5 flex h-6 w-full items-center justify-between gap-2 rounded-sm px-2 text-sidebar-foreground/55 transition-colors hover:text-sidebar-foreground/80"
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
                <SidebarGroupLabel className="flex min-w-0 flex-1 items-center px-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-current">
                  <span className="truncate">{group.label}</span>
                </SidebarGroupLabel>
                <ChevronRightIcon
                  className={cn(
                    "size-3 shrink-0 opacity-0 transition-[opacity,transform] group-hover/group-header:opacity-100",
                    (openGroups[group.label] ?? routeOpenGroups[group.label] ?? false) &&
                      "rotate-90 opacity-100",
                  )}
                />
              </button>
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

        </SidebarContent>

        <SidebarFooter>
          <UserMenu
            user={user}
            settingsOpen={settingsOpen}
            settingsSection={settingsSection}
            onOpenSettings={() => {
              setSettingsSection("account");
              setSettingsOpen(true);
            }}
            onSettingsOpenChange={setSettingsOpen}
          />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-sidebar h-screen overflow-hidden border-l border-sidebar-border">
        <div className="relative flex h-full">
          <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
            <SystemBanner />
            {/* Header Linear-style: fino (~44px), tipografia compacta,
               actions ghost com hover sutil. */}
            <header className="shrink-0 z-20 bg-sidebar border-b border-sidebar-border">
              <div className="flex w-full items-center gap-3 px-4 py-2">
                <SidebarTrigger />
                <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground">
                  {breadcrumb ? (
                    breadcrumb.map((item, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <Link href={item.href} className="hover:text-foreground transition-colors">
                          {item.label}
                        </Link>
                        <span className="text-muted-foreground/40">/</span>
                      </span>
                    ))
                  ) : eyebrow ? (
                    eyebrow.split("›").map((segment, i, arr) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <span>{segment.trim()}</span>
                        {i < arr.length - 1 || title ? (
                          <span className="text-muted-foreground/40">/</span>
                        ) : null}
                      </span>
                    ))
                  ) : null}
                  <span className="truncate font-medium text-foreground">{title}</span>
                </nav>
                <div className="flex items-center gap-1">
                  <ApiHealthIndicator className="hidden md:inline-flex" />
                  {user.role === "admin" ? (
                    <Button
                      type="button"
                      variant={codexOpen ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setCodexOpen((current) => !current)}
                    >
                      <PanelRightOpenIcon className="size-4" />
                      <span className="hidden sm:inline">{codexOpen ? "Fechar IA" : "Abrir IA"}</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            </header>

            <div
              className={cn(
                // Padding do gutter externo respeita o switch de densidade
                // (--app-page-padding-* definidos em globals.css).
                "flex w-full flex-1 min-h-0 overflow-hidden",
                "px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]",
              )}
            >
              <main
                id="main-content"
                key={pathname}
                className={cn(
                  // Main é um card visual — raio reduzido (rounded-xl) e
                  // padding usa --card-padding-* pra também responder à densidade.
                  "page-fade-in flex min-h-0 min-w-0 flex-1 flex-col rounded-xl bg-card border border-border/30 shadow-sm overflow-y-auto",
                  "px-[var(--card-padding-x)] py-[var(--card-padding-y)]",
                  lockViewport && "overflow-hidden",
                )}
              >
                {children}
              </main>
            </div>
          </div>

          {user.role === "admin" && codexOpen ? (
            <>
              <button
                type="button"
                aria-label="Redimensionar chat"
                onPointerDown={startCodexResize}
                className="absolute inset-y-0 z-30 hidden w-3 -translate-x-1/2 cursor-col-resize lg:block"
                style={{ left: `calc(100% - ${codexWidth}px)` }}
              >
                <span className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 rounded-full bg-border/70 transition-colors hover:bg-primary/70" />
              </button>

              <aside
                className="hidden min-h-0 min-w-0 shrink-0 overflow-hidden border-l border-border/60 bg-background/95 px-3 py-[var(--app-page-padding-y)] lg:block"
                style={{ width: `${codexWidth}px` }}
              >
                <Suspense fallback={null}>
                  <CodexDrawer
                    user={user}
                    open={codexOpen}
                    onOpenChange={setCodexOpen}
                    onRequestOpenSettings={() => {
                      setSettingsSection("codex");
                      setSettingsOpen(true);
                    }}
                  />
                </Suspense>
              </aside>
            </>
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
