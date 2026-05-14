import type { LucideIcon } from "@/components/ui/icons";
import {
  BadgeCheckIcon,
  CrosshairIcon,
  LayoutDashboardIcon,
  LogsIcon,
  LinkIcon,
  SparklesIcon,
  ShieldIcon,
  UserRoundIcon,
} from "@/components/ui/icons";

export type PortalSidebarItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  kind: "page" | "resource";
  children?: PortalSidebarItem[];
};

export type PortalSidebarGroup = {
  label: string;
  iconKey: keyof typeof portalIconMap;
  items: PortalSidebarItem[];
};

export type PortalRecentItem = {
  id: string;
  href: string;
  label: string;
  description: string;
  group: string;
  iconKey: keyof typeof portalIconMap;
  kind: "page" | "resource";
  pinned: boolean;
  updatedAt: number;
};

export const portalIconMap = {
  home: LayoutDashboardIcon,
  logs: LogsIcon,
  users: ShieldIcon,
  account: UserRoundIcon,
  vct: CrosshairIcon,
  admin: BadgeCheckIcon,
  link: LinkIcon,
  sparkles: SparklesIcon,
} as const;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "");
}

export function normalizePortalText(value: string) {
  return normalizeText(value);
}

function portalItem(
  item: Omit<PortalSidebarItem, "keywords"> & { keywords?: string[] },
): PortalSidebarItem {
  return {
    ...item,
    keywords: item.keywords ?? [],
  };
}

export function buildPortalSidebarGroups(logsHref: string): PortalSidebarGroup[] {
  return [
    {
      label: "Operacao",
      iconKey: "logs",
      items: [
        portalItem({
          href: logsHref,
          label: "Logs",
          description: "Observabilidade e historico de eventos",
          icon: LogsIcon,
          kind: "resource",
          keywords: ["logs", "observabilidade", "eventos"],
        }),
      ],
    },
    {
      label: "Jogos",
      iconKey: "vct",
      items: [
        portalItem({
          href: "/vct",
          label: "VCT",
          description: "Area principal do VCT",
          icon: CrosshairIcon,
          kind: "page",
          keywords: ["valorant", "vct", "competitivo"],
          children: [
            portalItem({
              href: "/vct/inscricoes",
              label: "Inscricoes",
              description: "Lista de inscricoes do VCT",
              icon: SparklesIcon,
              kind: "resource",
              keywords: ["inscricoes", "players", "registros"],
            }),
            portalItem({
              href: "/vct/formacoes",
              label: "Formacoes",
              description: "Times e formacoes do VCT",
              icon: BadgeCheckIcon,
              kind: "resource",
              keywords: ["times", "formacoes", "squads"],
            }),
          ],
        }),
        portalItem({
          href: "/counter-strike",
          label: "Counter-strike",
          description: "Area principal do Counter-strike",
          icon: ShieldIcon,
          kind: "page",
          keywords: ["cs", "counter strike"],
          children: [
            portalItem({
              href: "/counter-strike/inscricoes",
              label: "Inscricoes",
              description: "Lista de inscricoes do Counter-strike",
              icon: SparklesIcon,
              kind: "resource",
              keywords: ["inscricoes", "players", "registros"],
            }),
          ],
        }),
        portalItem({
          href: "/league-of-legends",
          label: "League of Legends",
          description: "Area principal do LoL",
          icon: SparklesIcon,
          kind: "page",
          keywords: ["lol", "league", "legends"],
          children: [
            portalItem({
              href: "/league-of-legends/inscricoes",
              label: "Inscricoes",
              description: "Lista de inscricoes do LoL",
              icon: SparklesIcon,
              kind: "resource",
              keywords: ["inscricoes", "players", "registros"],
            }),
          ],
        }),
      ],
    },
    {
      label: "Administracao",
      iconKey: "admin",
      items: [
        portalItem({
          href: "/admin/users",
          label: "Usuarios",
          description: "Base de usuarios e perfis de acesso",
          icon: ShieldIcon,
          kind: "resource",
          keywords: ["usuarios", "admin", "acesso", "perfis"],
        }),
      ],
    },
  ];
}

export function flattenPortalSidebarItems(logsHref: string) {
  return buildPortalSidebarGroups(logsHref).flatMap((group) =>
    group.items.flatMap((item) => [item, ...(item.children ?? [])]),
  );
}

export function findPortalSidebarItem(pathname: string, logsHref: string) {
  const items = flattenPortalSidebarItems(logsHref);
  const exactMatch = items.find((item) => pathname === item.href);
  if (exactMatch) {
    return exactMatch;
  }

  return items.find((item) => {
    if (item.href === logsHref && pathname.startsWith("/logs")) {
      return true;
    }

    return pathname.startsWith(`${item.href}/`);
  });
}

export function buildPortalSearchText(item: PortalSidebarItem) {
  return normalizeText([item.label, item.description, item.keywords.join(" ")].join(" "));
}

export function resolvePortalRecentItem(
  pathname: string,
  logsHref: string,
  logsProjectName?: string | null,
): Omit<PortalRecentItem, "pinned" | "updatedAt"> | null {
  if (pathname === "/home") {
    return null;
  }

  if (pathname === "/profile") {
    return {
      id: "profile",
      href: "/profile",
      label: "Perfil",
      description: "Conta, preferencias e sessao",
      group: "Conta",
      iconKey: "account",
      kind: "page",
    };
  }

  if (pathname === "/logs" || pathname.startsWith("/logs/")) {
    return {
      id: "logs",
      href: pathname,
      label: "Logs",
      description:
        pathname === "/logs"
          ? "Observabilidade e historico de eventos"
          : `Projeto selecionado: ${pathname.split("/").at(-1) ?? "ativo"}`,
      group:
        pathname === "/logs" || !logsProjectName
          ? "Operacao"
          : `Logs / ${logsProjectName}`,
      iconKey: "logs",
      kind: "resource",
    };
  }

  if (pathname === logsHref) {
    return {
      id: "logs",
      href: pathname,
      label: "Logs",
      description: "Observabilidade e historico de eventos",
      group: "Operacao",
      iconKey: "logs",
      kind: "resource",
    };
  }

  const sidebarItem = findPortalSidebarItem(pathname, logsHref);

  if (!sidebarItem) {
    return null;
  }

  const group = buildPortalSidebarGroups(logsHref).find((entry) =>
    entry.items.some(
      (item) =>
        item.href === sidebarItem.href ||
        item.children?.some((child) => child.href === sidebarItem.href),
    ),
  );

  const parentItem = buildPortalSidebarGroups(logsHref)
    .flatMap((entry) => entry.items)
    .find((item) => item.children?.some((child) => child.href === sidebarItem.href));

  return {
    id: pathname,
    href: pathname,
    label: sidebarItem.label,
    description: sidebarItem.description,
    group: parentItem?.label ?? group?.label ?? "Navegacao",
    iconKey:
      sidebarItem.icon === LayoutDashboardIcon
        ? "home"
        : sidebarItem.icon === LogsIcon
          ? "logs"
          : sidebarItem.icon === UserRoundIcon
            ? "account"
            : sidebarItem.icon === ShieldIcon
              ? "users"
            : sidebarItem.icon === CrosshairIcon
              ? "vct"
              : sidebarItem.icon === BadgeCheckIcon
                ? "admin"
                : "sparkles",
    kind: sidebarItem.kind,
  };
}
