import type { LucideIcon } from "@/components/ui/icons";
import {
  ActivityIcon,
  BadgeCheckIcon,
  CrosshairIcon,
  ImageIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  LogsIcon,
  LinkIcon,
  MoonIcon,
  PackageIcon,
  PhoneIcon,
  ShoppingCartIcon,
  StorefrontIcon,
  StrategyIcon,
  SparklesIcon,
  ShieldIcon,
  SwordIcon,
  TagsIcon,
  UserRoundIcon,
  UsersIcon,
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
  grid: LayoutGridIcon,
  logs: LogsIcon,
  users: ShieldIcon,
  account: UserRoundIcon,
  vct: CrosshairIcon,
  images: ImageIcon,
  admin: BadgeCheckIcon,
  link: LinkIcon,
  sparkles: SparklesIcon,
  cart: ShoppingCartIcon,
  package: PackageIcon,
  clients: UsersIcon,
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
    // Negócio — produtos que geram receita / operação diária.
    // Vem primeiro porque é onde o Henrique passa a maior parte do tempo.
    {
      label: "Negocio",
      iconKey: "cart",
      items: [
        portalItem({
          href: "/corujao/painel",
          label: "Corujão",
          description: "Operação do Corujão — Método 4",
          icon: MoonIcon,
          kind: "page",
          keywords: ["corujao", "contatos", "leads", "prospec", "trabalho", "metodo 4"],
          children: [
            portalItem({
              href: "/corujao/painel",
              label: "Painel",
              description: "Meta vs. realizado — fiscalização do Corujão",
              icon: LayoutDashboardIcon,
              kind: "resource",
              keywords: ["painel", "fiscalizacao", "meta", "metodo 4", "kpi", "vendas"],
            }),
            portalItem({
              href: "/corujao",
              label: "Tela de trabalho",
              description: "Lista priorizada pra encher o próximo Corujão",
              icon: PhoneIcon,
              kind: "resource",
              keywords: ["corujao", "trabalho", "chamar", "whatsapp"],
            }),
            portalItem({
              href: "/corujao/contatos",
              label: "Contatos",
              description: "Base de pessoas pra prospectar e registrar visitas",
              icon: UsersIcon,
              kind: "resource",
              keywords: ["contatos", "leads", "corujao", "prospec"],
            }),
            portalItem({
              href: "/corujao/sessoes",
              label: "Sessões",
              description: "Noites planejadas do Corujão e contagem de vagas",
              icon: MoonIcon,
              kind: "resource",
              keywords: ["sessoes", "corujao", "noite", "vagas", "agenda"],
            }),
            portalItem({
              href: "/corujao/colaboradores",
              label: "Colaboradores",
              description: "Quem fecha venda do Corujão — base do Método 4",
              icon: UsersIcon,
              kind: "resource",
              keywords: ["colaboradores", "corujao", "vendedor", "metodo 4", "atribuicao"],
            }),
          ],
        }),
        portalItem({
          href: "/checkout",
          label: "Checkout",
          description: "Gestao de pagamentos, clientes e produtos",
          icon: StorefrontIcon,
          kind: "page",
          keywords: ["checkout", "pagamento", "clientes", "produtos", "dotfy", "pix"],
          children: [
            portalItem({
              href: "/checkout",
              label: "Dashboard",
              description: "Visao geral do checkout",
              icon: LayoutDashboardIcon,
              kind: "resource",
              keywords: ["dashboard", "checkout", "visao geral", "resumo"],
            }),
            portalItem({
              href: "/checkout/clientes",
              label: "Clientes",
              description: "Clientes cadastrados no checkout",
              icon: UsersIcon,
              kind: "resource",
              keywords: ["clientes", "usuarios", "checkout", "dotfy"],
            }),
            portalItem({
              href: "/checkout/produtos",
              label: "Produtos",
              description: "Catalogo de produtos e planos",
              icon: PackageIcon,
              kind: "resource",
              keywords: ["produtos", "catalogo", "planos", "checkout"],
            }),
            portalItem({
              href: "/checkout/cupons",
              label: "Cupons",
              description: "Cupons de desconto do checkout",
              icon: TagsIcon,
              kind: "resource",
              keywords: ["cupons", "desconto", "promocao", "checkout"],
            }),
          ],
        }),
        portalItem({
          href: "/admin/analytics",
          label: "Analytics",
          description: "Métricas das páginas de venda — Corujão e Mix",
          icon: ActivityIcon,
          kind: "page",
          keywords: ["analytics", "ga4", "metricas", "corujao", "mix", "conversoes", "trafego"],
        }),
      ],
    },
    // Jogos — produtos sazonais (torneios/eventos). Uso esporádico.
    {
      label: "Jogos",
      iconKey: "vct",
      items: [
        portalItem({
          href: "/vct",
          label: "Valorant",
          description: "Inscrições e formações do Valorant",
          icon: CrosshairIcon,
          kind: "page",
          keywords: ["valorant", "vct", "competitivo"],
          children: [
            portalItem({
              href: "/vct/inscricoes",
              label: "Inscricoes",
              description: "Lista de inscricoes do Valorant",
              icon: SparklesIcon,
              kind: "resource",
              keywords: ["inscricoes", "players", "registros"],
            }),
            portalItem({
              href: "/vct/formacoes",
              label: "Formacoes",
              description: "Times e formacoes do Valorant",
              icon: BadgeCheckIcon,
              kind: "resource",
              keywords: ["times", "formacoes", "squads"],
            }),
          ],
        }),
        portalItem({
          href: "/counter-strike",
          label: "Counter-strike",
          description: "Inscrições do Counter-strike",
          icon: SwordIcon,
          kind: "page",
          keywords: ["cs", "counter strike"],
          children: [
            portalItem({
              href: "/counter-strike/inscricoes",
              label: "Inscricoes",
              description: "Lista de inscricoes do Counter-strike",
              icon: SwordIcon,
              kind: "resource",
              keywords: ["inscricoes", "players", "registros"],
            }),
          ],
        }),
        portalItem({
          href: "/league-of-legends",
          label: "League of Legends",
          description: "Inscrições do LoL",
          icon: StrategyIcon,
          kind: "page",
          keywords: ["lol", "league", "legends"],
          children: [
            portalItem({
              href: "/league-of-legends/inscricoes",
              label: "Inscricoes",
              description: "Lista de inscricoes do LoL",
              icon: StrategyIcon,
              kind: "resource",
              keywords: ["inscricoes", "players", "registros"],
            }),
          ],
        }),
      ],
    },
    // Plataforma — infraestrutura/configuração do portal. Uso raro.
    // Logs vive aqui (não merece grupo próprio com 1 item).
    {
      label: "Plataforma",
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
        portalItem({
          href: "/admin/publicador",
          label: "Publicador",
          description: "Envio de ZIPs estaticos para o volume de sites",
          icon: LayoutGridIcon,
          kind: "resource",
          keywords: ["publicador", "zip", "site", "rotas", "volume"],
        }),
        portalItem({
          href: "/admin/r2",
          label: "R2",
          description: "Envio de imagens para o bucket",
          icon: ImageIcon,
          kind: "resource",
          keywords: ["r2", "imagens", "upload", "bucket", "assets"],
        }),
        portalItem({
          href: logsHref,
          label: "Logs",
          description: "Observabilidade e historico de eventos",
          icon: LogsIcon,
          kind: "resource",
          keywords: ["logs", "observabilidade", "eventos"],
        }),
        portalItem({
          href: "/home/ops",
          label: "Dashboard Ops",
          description: "Métricas de infraestrutura e tráfego da API",
          icon: LayoutDashboardIcon,
          kind: "resource",
          keywords: ["dashboard", "operacional", "devops", "infra", "api", "trafego", "metricas"],
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
  if (pathname === "/painel") {
    return null;
  }

  if (pathname === "/projects") {
    return {
      id: "projects",
      href: "/projects",
      label: "Projetos",
      description: "Entrada dedicada para abrir os apps do portal.",
      group: "Operacao",
      iconKey: "grid",
      kind: "page",
    };
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
                : sidebarItem.icon === ImageIcon
                  ? "images"
                  : sidebarItem.icon === BadgeCheckIcon
                    ? "admin"
                    : "sparkles",
    kind: sidebarItem.kind,
  };
}
