"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClockIcon,
  CopyIcon,
  CrosshairIcon,
  InboxIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  SearchCheckIcon,
  SaveIcon,
  SearchIcon,
  SparklesIcon,
  StickyNoteIcon,
  TagsIcon,
  Trash2Icon,
  UserMinusIcon,
  UsersIcon,
  WandSparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { clientApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { VctInscricaoSummary, VctTimeSummary } from "@/types/portal";

interface VctInscricoesPanelProps {
  initialInscricoes: VctInscricaoSummary[];
  initialTimes: VctTimeSummary[];
}

const ELO_VALUES: Record<string, number> = {
  Ferro: 1,
  Bronze: 2,
  Prata: 3,
  Ouro: 4,
  Platina: 5,
  Diamante: 6,
  Ascendente: 7,
  Imortal: 8,
  Radiante: 9,
};

const TIMES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const TIME_CAP = 5;
const FUNCOES = ["Duelista", "Controlador", "Sentinela", "Iniciador", "Flex"] as const;
const ELOS = Object.keys(ELO_VALUES);
const TAG_SUGGESTIONS = ["Confirmado", "Pendente", "Capitao", "Sub", "Prioridade", "Revisar"];
const RECENT_FILTERS = [
  { label: "Todos", value: "all", minutes: null },
  { label: "30m", value: "30m", minutes: 30 },
  { label: "1h", value: "1h", minutes: 60 },
  { label: "6h", value: "6h", minutes: 360 },
  { label: "24h", value: "24h", minutes: 1440 },
] as const;
const INSCRITOS_PAGE_SIZE = 10;
const HIGHLIGHT_COLORS = [
  { label: "Sem cor", value: "", className: "", swatch: "bg-background" },
  {
    label: "Amarelo",
    value: "yellow",
    className: "border-amber-500/35 bg-amber-500/12 hover:bg-amber-500/18",
    swatch: "bg-amber-400",
  },
  {
    label: "Verde",
    value: "green",
    className: "border-emerald-500/35 bg-emerald-500/12 hover:bg-emerald-500/18",
    swatch: "bg-emerald-400",
  },
  {
    label: "Azul",
    value: "blue",
    className: "border-sky-500/35 bg-sky-500/12 hover:bg-sky-500/18",
    swatch: "bg-sky-400",
  },
  {
    label: "Rosa",
    value: "pink",
    className: "border-rose-500/35 bg-rose-500/12 hover:bg-rose-500/18",
    swatch: "bg-rose-400",
  },
  {
    label: "Roxo",
    value: "purple",
    className: "border-violet-500/35 bg-violet-500/12 hover:bg-violet-500/18",
    swatch: "bg-violet-400",
  },
] as const;
const TAG_COLOR_CLASSES: Record<string, string> = {
  confirmado: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pendente: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  capitao: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  sub: "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  prioridade: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  revisar: "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300",
};
const DEFAULT_TAG_COLOR_CLASS = "border-slate-500/40 bg-slate-500/15 text-slate-700 dark:text-slate-300";

type VctEditForm = {
  riotId: string;
  riotName: string;
  riotTag: string;
  riotPuuid: string;
  valorantRegion: string;
  valorantAccountLevel: number | null;
  valorantCardSmall: string;
  valorantCardWide: string;
  valorantCurrentRank: string;
  valorantPeakRank: string;
  nome: string;
  nick: string;
  email: string;
  whatsapp: string;
  instagram: string;
  elo: string;
  pico: string;
  funcaoPrimaria: string;
  funcaoSecundaria: string;
  tagsText: string;
  observacoes: string;
  highlightColor: string;
};

type ValorantLookupAccount = {
  riotName: string;
  riotTag: string;
  riotPuuid: string;
  region?: string;
  accountLevel?: number | null;
  cardSmall?: string;
  cardWide?: string;
  currentRank?: string;
  peakRank?: string;
};

function eloScore(elo: string) {
  return ELO_VALUES[elo] ?? 0;
}

function formatAvg(n: number) {
  return n > 0 ? n.toFixed(1) : "—";
}

function getInstagramHandle(instagram: string) {
  return instagram.startsWith("@") ? instagram : `@${instagram}`;
}

function formatInscricaoDate(createdAt?: string) {
  if (!createdAt) return "--";

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPlayerTags(player: VctInscricaoSummary) {
  return player.tags ?? [];
}

function getHighlightColorClass(value?: string) {
  return HIGHLIGHT_COLORS.find((color) => color.value === value)?.className ?? "";
}

function getEditForm(player: VctInscricaoSummary): VctEditForm {
  const riotName = player.riotName ?? "";
  const riotTag = player.riotTag ?? "";
  return {
    riotId: riotName && riotTag ? `${riotName}#${riotTag}` : player.nick,
    riotName,
    riotTag,
    riotPuuid: player.riotPuuid ?? "",
    valorantRegion: player.valorantRegion ?? "",
    valorantAccountLevel: player.valorantAccountLevel ?? null,
    valorantCardSmall: player.valorantCardSmall ?? "",
    valorantCardWide: player.valorantCardWide ?? "",
    valorantCurrentRank: player.valorantCurrentRank ?? "",
    valorantPeakRank: player.valorantPeakRank ?? "",
    nome: player.nome,
    nick: player.nick,
    email: player.email,
    whatsapp: player.whatsapp,
    instagram: player.instagram,
    elo: player.elo,
    pico: player.pico,
    funcaoPrimaria: player.funcaoPrimaria,
    funcaoSecundaria: player.funcaoSecundaria,
    tagsText: getPlayerTags(player).join(", "),
    observacoes: player.observacoes ?? "",
    highlightColor: player.highlightColor ?? "",
  };
}

function parseTags(tagsText: string) {
  return tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function onlyDigits(value: string) {
  return value.replace(/\D/gu, "");
}

function isWithinRecentFilter(createdAt: string | undefined, filter: typeof RECENT_FILTERS[number]["value"]) {
  const selected = RECENT_FILTERS.find((item) => item.value === filter);
  if (!selected?.minutes) return true;
  if (!createdAt) return false;

  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;

  return Date.now() - created <= selected.minutes * 60 * 1000;
}

function getTagColorClass(tag: string) {
  return TAG_COLOR_CLASSES[tag.trim().toLowerCase()] ?? DEFAULT_TAG_COLOR_CLASS;
}

function parseRiotIdInput(value: string) {
  const [name, ...tagParts] = value.split("#");
  const tag = tagParts.join("#");

  if (!name?.trim() || !tag?.trim()) return null;

  return {
    name: name.trim(),
    tag: tag.trim(),
  };
}

function getPlayerRiotId(player: VctInscricaoSummary) {
  if (player.riotName && player.riotTag) {
    return `${player.riotName}#${player.riotTag}`;
  }

  return parseRiotIdInput(player.nick) ? player.nick : "";
}

function PlayerNickWithNotes({
  player,
  className,
  onCopyClick,
  onMiddleClick,
}: {
  player: VctInscricaoSummary;
  className?: string;
  onCopyClick?: (text: string) => void;
  onMiddleClick?: (player: VctInscricaoSummary) => void;
}) {
  const notes = player.observacoes?.trim();
  const content = (
    <span
      className={className}
      onMouseDown={(event) => {
        if (event.button === 1 && onMiddleClick) {
          event.preventDefault();
        }
      }}
      onClick={() => onCopyClick?.(player.nick)}
      onAuxClick={(event) => {
        if (event.button !== 1 || !onMiddleClick) return;
        event.preventDefault();
        onMiddleClick(player);
      }}
    >
      {player.nick}
    </span>
  );

  if (!notes) return content;

  return (
    <Tooltip>
      <TooltipTrigger render={content} />
      <TooltipContent side="top" align="start" className="max-w-80 whitespace-normal text-left">
        {notes}
      </TooltipContent>
    </Tooltip>
  );
}

function ValorantProfileSummary({ player }: { player: VctInscricaoSummary }) {
  const hasAnyInfo =
    player.valorantAccountLevel ||
    player.valorantCurrentRank ||
    player.valorantPeakRank ||
    player.valorantRegion ||
    player.valorantCardWide;

  if (!hasAnyInfo) return null;

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-muted/30">
      {player.valorantCardWide ? (
        <div
          className="h-16 bg-cover bg-center"
          style={{ backgroundImage: `url(${player.valorantCardWide})` }}
        />
      ) : null}
      <div className="flex flex-wrap gap-1 p-2">
        {player.valorantCurrentRank ? (
          <Badge variant="secondary" className="text-[10px]">
            Rank {player.valorantCurrentRank}
          </Badge>
        ) : null}
        {player.valorantPeakRank ? (
          <Badge variant="outline" className="text-[10px]">
            Peak {player.valorantPeakRank}
          </Badge>
        ) : null}
        {player.valorantAccountLevel ? (
          <Badge variant="outline" className="text-[10px]">
            Lvl {player.valorantAccountLevel}
          </Badge>
        ) : null}
        {player.valorantRegion ? (
          <Badge variant="outline" className="text-[10px] uppercase">
            {player.valorantRegion}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function ValorantEditPreview({ form }: { form: VctEditForm }) {
  const hasAnyInfo =
    form.valorantCardWide ||
    form.valorantCurrentRank ||
    form.valorantPeakRank ||
    form.valorantAccountLevel ||
    form.valorantRegion;

  if (!hasAnyInfo) return null;

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background">
      {form.valorantCardWide ? (
        <div
          className="h-24 bg-cover bg-center"
          style={{ backgroundImage: `url(${form.valorantCardWide})` }}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2 p-3">
        {form.valorantCardSmall ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.valorantCardSmall}
            alt=""
            className="size-10 rounded-md border border-border/60 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {form.riotName && form.riotTag ? `${form.riotName}#${form.riotTag}` : form.riotId}
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            {form.valorantCurrentRank ? (
              <Badge variant="secondary" className="text-[10px]">
                Rank {form.valorantCurrentRank}
              </Badge>
            ) : null}
            {form.valorantPeakRank ? (
              <Badge variant="outline" className="text-[10px]">
                Peak {form.valorantPeakRank}
              </Badge>
            ) : null}
            {form.valorantAccountLevel ? (
              <Badge variant="outline" className="text-[10px]">
                Lvl {form.valorantAccountLevel}
              </Badge>
            ) : null}
            {form.valorantRegion ? (
              <Badge variant="outline" className="text-[10px] uppercase">
                {form.valorantRegion}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VctInscricoesPanel({
  initialInscricoes,
  initialTimes,
}: VctInscricoesPanelProps) {
  const [inscricoes, setInscricoes] = useState(initialInscricoes);
  const [timeNames, setTimeNames] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const t of initialTimes) map[t.numero] = t.nome ?? "";
    return map;
  });
  const [query, setQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [recentFilter, setRecentFilter] = useState<typeof RECENT_FILTERS[number]["value"]>("all");
  const [visibleSemTimeCount, setVisibleSemTimeCount] = useState(INSCRITOS_PAGE_SIZE);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pendingTimes, setPendingTimes] = useState<Set<number>>(new Set());
  const [autoPending, setAutoPending] = useState(false);
  const [groupModalTime, setGroupModalTime] = useState<number | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<VctInscricaoSummary | null>(null);
  const [editForm, setEditForm] = useState<VctEditForm | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [riotLookupPending, setRiotLookupPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VctInscricaoSummary | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const semTime = useMemo(
    () => inscricoes.filter((i) => i.time === null || i.time === undefined),
    [inscricoes],
  );

  const filteredSemTime = useMemo(() => {
    const q = query.trim().toLowerCase();
    const phone = onlyDigits(phoneQuery);

    return semTime.filter((i) => {
      const matchesText =
        !q ||
        [i.nome, i.nick, i.email, i.whatsapp, i.instagram, i.elo, i.pico, i.funcaoPrimaria, i.funcaoSecundaria, i.observacoes, ...(i.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
      const matchesPhone = !phone || onlyDigits(i.whatsapp).includes(phone);
      const matchesRecent = isWithinRecentFilter(i.createdAt, recentFilter);

      return matchesText && matchesPhone && matchesRecent;
    });
  }, [phoneQuery, query, recentFilter, semTime]);

  useEffect(() => {
    setVisibleSemTimeCount(INSCRITOS_PAGE_SIZE);
  }, [filteredSemTime]);

  const visibleSemTime = useMemo(
    () => filteredSemTime.slice(0, visibleSemTimeCount),
    [filteredSemTime, visibleSemTimeCount],
  );

  const teamStats = useMemo(() => {
    return TIMES.map((t) => {
      const members = inscricoes.filter((i) => i.time === t);
      const avg =
        members.length > 0
          ? members.reduce((acc, m) => acc + eloScore(m.elo), 0) / members.length
          : 0;
      const roles = new Set<string>();
      members.forEach((m) => {
        roles.add(m.funcaoPrimaria);
      });
      return { time: t, members, avg, roles };
    });
  }, [inscricoes]);

  const selectedGroup = useMemo(() => {
    if (groupModalTime === null) return null;
    return teamStats.find((team) => team.time === groupModalTime) ?? null;
  }, [groupModalTime, teamStats]);

  async function reloadInscricoes() {
    const updated = await clientApi<{ inscricoes: VctInscricaoSummary[] }>(
      "/vct/inscricoes",
    );
    setInscricoes(updated.inscricoes);
  }

  async function handleTimeChange(id: string, value: number | null) {
    setPendingIds((prev) => new Set(prev).add(id));

    try {
      await clientApi<{ inscricao: VctInscricaoSummary }>(
        `/vct/inscricao/${id}/time`,
        {
          method: "PATCH",
          body: JSON.stringify({ time: value }),
        },
      );
      setInscricoes((current) =>
        current.map((i) => (i._id === id ? { ...i, time: value } : i)),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar o time.",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function openEditPlayer(player: VctInscricaoSummary) {
    setEditingPlayer(player);
    setEditForm(getEditForm(player));
  }

  function updateEditForm<K extends keyof VctEditForm>(field: K, value: VctEditForm[K]) {
    setEditForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function toggleTagSuggestion(tag: string) {
    setEditForm((current) => {
      if (!current) return current;
      const tags = parseTags(current.tagsText);
      const hasTag = tags.some((item) => item.toLowerCase() === tag.toLowerCase());
      const nextTags = hasTag
        ? tags.filter((item) => item.toLowerCase() !== tag.toLowerCase())
        : [...tags, tag];
      return { ...current, tagsText: nextTags.join(", ") };
    });
  }

  async function handleSaveEdit() {
    if (!editingPlayer || !editForm) return;

    setEditPending(true);
    try {
      const payload = {
        riotName: editForm.riotName,
        riotTag: editForm.riotTag,
        riotPuuid: editForm.riotPuuid,
        valorantRegion: editForm.valorantRegion,
        valorantAccountLevel: editForm.valorantAccountLevel,
        valorantCardSmall: editForm.valorantCardSmall,
        valorantCardWide: editForm.valorantCardWide,
        valorantCurrentRank: editForm.valorantCurrentRank,
        valorantPeakRank: editForm.valorantPeakRank,
        nome: editForm.nome,
        nick: editForm.nick,
        email: editForm.email,
        whatsapp: editForm.whatsapp,
        instagram: editForm.instagram,
        elo: editForm.elo,
        pico: editForm.pico,
        funcaoPrimaria: editForm.funcaoPrimaria,
        funcaoSecundaria: editForm.funcaoSecundaria,
        tags: parseTags(editForm.tagsText),
        observacoes: editForm.observacoes,
        highlightColor: editForm.highlightColor,
      };
      const res = await clientApi<{ inscricao: VctInscricaoSummary }>(
        `/vct/inscricao/${editingPlayer._id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      setInscricoes((current) =>
        current.map((item) => (item._id === editingPlayer._id ? res.inscricao : item)),
      );
      setEditingPlayer(null);
      setEditForm(null);
      toast.success("Inscricao atualizada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel atualizar a inscricao.",
      );
    } finally {
      setEditPending(false);
    }
  }

  async function fetchValorantAccount(riotId: string) {
    const parsed = parseRiotIdInput(riotId);
    if (!parsed) {
      throw new Error("Use o formato Nome#TAG para buscar a conta.");
    }

    const response = await fetch("/api/valorant-account/lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ riotId }),
    });

    const contentType = response.headers.get("content-type") ?? "";
    const res = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as {
      message?: string;
      account?: ValorantLookupAccount;
    } | null)
      : null;

    const account = res?.account;

    if (!response.ok || !account) {
      throw new Error(
        res?.message ||
          `A busca Valorant retornou erro ${response.status}. Verifique a configuracao da HenrikDev na producao.`,
      );
    }

    return account;
  }

  async function handleValorantLookup() {
    if (!editForm) return;

    setRiotLookupPending(true);
    try {
      const account = await fetchValorantAccount(editForm.riotId);

      setEditForm((current) =>
        current
          ? {
              ...current,
              riotId: `${account.riotName}#${account.riotTag}`,
              riotName: account.riotName,
              riotTag: account.riotTag,
              riotPuuid: account.riotPuuid,
              valorantRegion: account.region ?? "",
              valorantAccountLevel: account.accountLevel ?? null,
              valorantCardSmall: account.cardSmall ?? "",
              valorantCardWide: account.cardWide ?? "",
              valorantCurrentRank: account.currentRank ?? "",
              valorantPeakRank: account.peakRank ?? "",
              nick: account.riotName,
            }
          : current,
      );

      toast.success(
        account.accountLevel
          ? `Conta encontrada: ${account.riotName}#${account.riotTag} · lvl ${account.accountLevel}`
          : `Conta encontrada: ${account.riotName}#${account.riotTag}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel buscar a conta Valorant.",
      );
    } finally {
      setRiotLookupPending(false);
    }
  }

  async function handleQuickValorantLookup(player: VctInscricaoSummary) {
    const riotId = getPlayerRiotId(player);
    if (!riotId) {
      toast.error("Esse usuario precisa de um nick no formato Nome#TAG ou Riot ID salvo.");
      return;
    }

    setPendingIds((prev) => new Set(prev).add(player._id));
    try {
      const account = await fetchValorantAccount(riotId);
      const res = await clientApi<{ inscricao: VctInscricaoSummary }>(
        `/vct/inscricao/${player._id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            riotName: account.riotName,
            riotTag: account.riotTag,
            riotPuuid: account.riotPuuid,
            valorantRegion: account.region ?? "",
            valorantAccountLevel: account.accountLevel ?? null,
            valorantCardSmall: account.cardSmall ?? "",
            valorantCardWide: account.cardWide ?? "",
            valorantCurrentRank: account.currentRank ?? "",
            valorantPeakRank: account.peakRank ?? "",
            nome: player.nome,
            nick: player.nick,
            email: player.email,
            whatsapp: player.whatsapp,
            instagram: player.instagram,
            elo: player.elo,
            pico: player.pico,
            funcaoPrimaria: player.funcaoPrimaria,
            funcaoSecundaria: player.funcaoSecundaria,
            tags: player.tags ?? [],
            observacoes: player.observacoes ?? "",
            highlightColor: player.highlightColor ?? "",
          }),
        },
      );

      setInscricoes((current) =>
        current.map((item) => (item._id === player._id ? res.inscricao : item)),
      );
      toast.success(
        account.currentRank
          ? `${player.nick}: ${account.currentRank} atualizado.`
          : `${player.nick}: perfil Valorant atualizado.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel buscar a conta Valorant.",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(player._id);
        return next;
      });
    }
  }

  async function handleDeletePlayer(player: VctInscricaoSummary) {
    setDeletingIds((prev) => new Set(prev).add(player._id));
    try {
      await clientApi<{ removida: string }>(`/vct/inscricao/${player._id}`, {
        method: "DELETE",
      });
      setInscricoes((current) => current.filter((item) => item._id !== player._id));
      if (editingPlayer?._id === player._id) {
        setEditingPlayer(null);
        setEditForm(null);
      }
      setDeleteTarget(null);
      toast.success("Inscricao removida.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel remover a inscricao.",
      );
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(player._id);
        return next;
      });
    }
  }

  async function handleAutoForm() {
    if (semTime.length === 0) {
      toast.info("Não há inscritos sem time.");
      return;
    }
    setAutoPending(true);
    try {
      const res = await clientApi<{ atribuidos: number }>("/vct/times/auto", {
        method: "POST",
      });
      await reloadInscricoes();
      toast.success(`${res.atribuidos} jogadores atribuídos por proximidade de elo.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível formar times.",
      );
    } finally {
      setAutoPending(false);
    }
  }

  async function handleFillTeam(numero: number) {
    setPendingTimes((prev) => new Set(prev).add(numero));
    try {
      const res = await clientApi<{ atribuidos: number }>(
        `/vct/times/${numero}/fill`,
        { method: "POST" },
      );
      await reloadInscricoes();
      if (res.atribuidos === 0) toast.info("Nenhum jogador disponível para este time.");
      else toast.success(`${res.atribuidos} jogadores adicionados ao Time ${numero}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível preencher o time.",
      );
    } finally {
      setPendingTimes((prev) => {
        const next = new Set(prev);
        next.delete(numero);
        return next;
      });
    }
  }

  async function handleClearTeam(numero: number) {
    setPendingTimes((prev) => new Set(prev).add(numero));
    try {
      await clientApi<{ removidos: number }>(`/vct/times/${numero}/clear`, {
        method: "POST",
      });
      await reloadInscricoes();
      toast.success(`Time ${numero} limpo.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível limpar o time.",
      );
    } finally {
      setPendingTimes((prev) => {
        const next = new Set(prev);
        next.delete(numero);
        return next;
      });
    }
  }

  function handleCopyRoster(numero: number) {
    const team = teamStats.find((t) => t.time === numero);
    if (!team || team.members.length === 0) {
      toast.info("Time vazio.");
      return;
    }
    const name = timeNames[numero]?.trim();
    const header = name ? `Time ${numero} — ${name}` : `Time ${numero}`;
    const lines = team.members.map(
      (m) => `• ${m.nick} (${m.elo}) — ${m.funcaoPrimaria}`,
    );
    const text = `${header}\n${lines.join("\n")}\nMédia elo: ${formatAvg(team.avg)}`;
    navigator.clipboard.writeText(text).then(
      () => toast.success("Roster copiado."),
      () => toast.error("Não foi possível copiar."),
    );
  }

  function handleCopyValue(label: string, text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copiado.`),
      () => toast.error(`Nao foi possivel copiar ${label.toLowerCase()}.`),
    );
  }

  function handleInscritosScroll(currentTarget: HTMLDivElement) {
    const isNearBottom =
      currentTarget.scrollTop + currentTarget.clientHeight >= currentTarget.scrollHeight - 120;

    if (!isNearBottom) return;

    handleLoadMoreInscritos();
  }

  function handleLoadMoreInscritos() {
    setVisibleSemTimeCount((current) =>
      Math.min(current + INSCRITOS_PAGE_SIZE, filteredSemTime.length),
    );
  }

  async function handleTimeNameBlur(numero: number, nome: string) {
    try {
      await clientApi<{ time: VctTimeSummary }>(`/vct/time/${numero}`, {
        method: "PUT",
        body: JSON.stringify({ nome }),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar o nome.",
      );
    }
  }

  function openGroupModal(numero: number) {
    setGroupModalTime(numero);
  }

  function handleCopyGroupContacts(numero: number) {
    const team = teamStats.find((item) => item.time === numero);
    if (!team || team.members.length === 0) {
      toast.info("Time vazio.");
      return;
    }

    const name = timeNames[numero]?.trim();
    const header = name ? `Time ${numero} — ${name}` : `Time ${numero}`;
    const lines = team.members.map(
      (member) => `${member.whatsapp} — ${member.nome}`,
    );

    navigator.clipboard.writeText(`${header}\n${lines.join("\n")}`).then(
      () => toast.success("Contatos do grupo copiados."),
      () => toast.error("Não foi possível copiar os contatos."),
    );
  }

  function renderPlayerActions(
    player: VctInscricaoSummary,
    currentTime: number,
    variant: "dropdown" | "context",
  ) {
    const Label = variant === "context" ? ContextMenuLabel : DropdownMenuLabel;
    const Separator =
      variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;
    const Group = variant === "context" ? ContextMenuGroup : DropdownMenuGroup;
    const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;

    return (
      <>
        <Label className="truncate">{player.nick}</Label>
        <Separator />
        <Item onClick={() => openEditPlayer(player)}>
          <PencilIcon />
          Editar dados
        </Item>
        <Item onClick={() => openGroupModal(currentTime)}>
          <UsersIcon />
          Formar grupo
        </Item>
        <Separator />
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
          Mover para
        </Label>
        <Group>
          {teamStats.map((target) => {
            const disabled =
              target.time === currentTime || target.members.length >= TIME_CAP;
            return (
              <Item
                key={target.time}
                disabled={disabled}
                onClick={() => handleTimeChange(player._id, target.time)}
              >
                Time {target.time}
                <span className="ml-auto text-xs text-muted-foreground">
                  {target.members.length}/{TIME_CAP}
                </span>
              </Item>
            );
          })}
        </Group>
        <Separator />
        <Item
          variant="destructive"
          onClick={() => handleTimeChange(player._id, null)}
        >
          <UserMinusIcon />
          Remover do time
        </Item>
        <Item
          variant="destructive"
          disabled={deletingIds.has(player._id)}
          onClick={() => setDeleteTarget(player)}
        >
          <Trash2Icon />
          Remover inscricao
        </Item>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ============ SEÇÃO 1: INSCRITOS SEM TIME ============ */}
      <section className="flex w-full flex-col gap-4 xl:mx-[calc((100%-100vw+16rem)/2)] xl:w-[calc(100vw-16rem)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <InboxIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Inscritos</h2>
              <p className="text-xs text-muted-foreground">
                {semTime.length} jogadores aguardando time · {visibleSemTime.length}/{filteredSemTime.length} exibidos
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            <div className="relative w-full md:w-64">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar inscrito..."
                className="pl-9"
              />
            </div>
            <div className="relative w-full md:w-52">
              <PhoneIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(onlyDigits(e.target.value))}
                placeholder="Filtrar telefone..."
                inputMode="numeric"
                className="pl-9"
              />
            </div>
            <div className="relative w-full md:w-40">
              <ClockIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={recentFilter}
                onChange={(e) =>
                  setRecentFilter(e.target.value as typeof RECENT_FILTERS[number]["value"])
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
              >
                {RECENT_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleAutoForm} disabled={autoPending}>
              {autoPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SparklesIcon />
              )}
              Formar times por elo
            </Button>
          </div>
        </div>

        <Card className="border-border/60 bg-card/90">
          <CardContent className="p-0">
            {filteredSemTime.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                <UsersIcon className="size-8" />
                <p className="text-sm">
                  {semTime.length === 0
                    ? "Todos os inscritos estão em times."
                    : "Nenhum inscrito encontrado."}
                </p>
              </div>
            ) : (
              <div
                className="max-h-[640px] overflow-auto"
                onScroll={(event) => handleInscritosScroll(event.currentTarget)}
              >
                <Table className="min-w-[1580px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nick</TableHead>
                      <TableHead>Inscricao</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Elo</TableHead>
                      <TableHead>Pico</TableHead>
                      <TableHead>Prim.</TableHead>
                      <TableHead>Sec.</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Instagram</TableHead>
                      <TableHead>Atribuir</TableHead>
                      <TableHead>Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSemTime.map((i) => {
                      const isPending = pendingIds.has(i._id);
                      return (
                        <TableRow
                          key={i._id}
                          className={cn(getHighlightColorClass(i.highlightColor))}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <PlayerNickWithNotes
                                player={i}
                                onCopyClick={(value) => handleCopyValue("Nick", value)}
                                onMiddleClick={handleQuickValorantLookup}
                                className={cn(
                                  "cursor-pointer font-medium underline decoration-dotted underline-offset-4 hover:text-primary",
                                  i.observacoes && "cursor-help",
                                )}
                              />
                              {i.valorantCurrentRank ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {i.valorantCurrentRank}
                                </Badge>
                              ) : null}
                              {getPlayerTags(i).length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {getPlayerTags(i).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className={cn("text-[10px]", getTagColorClass(tag))}
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                            {formatInscricaoDate(i.createdAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{i.nome}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {i.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{i.elo}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{i.pico}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{i.funcaoPrimaria}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {i.funcaoSecundaria}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <button
                              type="button"
                              onClick={() => handleCopyValue("WhatsApp", i.whatsapp)}
                              className="cursor-pointer underline decoration-dotted underline-offset-4 transition-colors hover:text-primary"
                            >
                              {i.whatsapp}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {i.instagram}
                          </TableCell>
                          <TableCell>
                            <select
                              value=""
                              disabled={isPending}
                              onChange={(e) =>
                                handleTimeChange(i._id, Number(e.target.value))
                              }
                              className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium outline-none transition-colors focus:border-ring disabled:opacity-50"
                            >
                              <option value="" disabled>
                                Escolher time
                              </option>
                              {teamStats.map((t) => (
                                <option
                                  key={t.time}
                                  value={t.time}
                                  disabled={t.members.length >= TIME_CAP}
                                >
                                  Time {t.time} ({t.members.length}/{TIME_CAP})
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => openEditPlayer(i)}
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                disabled={deletingIds.has(i._id)}
                                onClick={() => setDeleteTarget(i)}
                              >
                                {deletingIds.has(i._id) ? (
                                  <LoaderCircleIcon className="animate-spin" />
                                ) : (
                                  <Trash2Icon />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {visibleSemTime.length < filteredSemTime.length ? (
                  <div className="sticky bottom-0 flex items-center justify-center border-t border-border/60 bg-card/95 px-4 py-2 backdrop-blur">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadMoreInscritos}
                    >
                      Carregar mais 10 inscritos
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ============ SEÇÃO 2: TIMES ============ */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CrosshairIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Times</h2>
            <p className="text-xs text-muted-foreground">
              {inscricoes.length - semTime.length} jogadores distribuídos · 8 times · {TIME_CAP} por time
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {teamStats.map((t) => {
            const full = t.members.length >= TIME_CAP;
            const isTeamPending = pendingTimes.has(t.time);
            return (
              <Card
                key={t.time}
                className={cn(
                  "border-border/60 bg-card/90",
                  full && "border-primary/60",
                )}
              >
                <CardHeader className="space-y-2 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Time {t.time}</CardTitle>
                      <Badge variant={full ? "default" : "secondary"} className="text-[10px]">
                        {t.members.length}/{TIME_CAP}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <CardDescription className="text-xs">
                        avg <span className="font-bold text-foreground">{formatAvg(t.avg)}</span>
                      </CardDescription>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-xs" />}
                          disabled={isTeamPending}
                        >
                          {isTeamPending ? (
                            <LoaderCircleIcon className="animate-spin" />
                          ) : (
                            <MoreHorizontalIcon />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Time {t.time}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={full}
                            onClick={() => handleFillTeam(t.time)}
                          >
                            <WandSparklesIcon />
                            Preencher com elo próximo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={t.members.length === 0}
                            onClick={() => handleCopyRoster(t.time)}
                          >
                            <CopyIcon />
                            Copiar roster
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={t.members.length === 0}
                            onClick={() => handleClearTeam(t.time)}
                          >
                            <Trash2Icon />
                            Limpar time
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <Input
                    value={timeNames[t.time] ?? ""}
                    onChange={(e) =>
                      setTimeNames((prev) => ({ ...prev, [t.time]: e.target.value }))
                    }
                    onBlur={(e) => handleTimeNameBlur(t.time, e.target.value)}
                    placeholder="Nome do time..."
                    maxLength={60}
                    className="h-8 text-sm"
                  />
                  <div className="flex flex-wrap gap-1">
                    {FUNCOES.map((f) => (
                      <Badge
                        key={f}
                        variant={t.roles.has(f) ? "default" : "outline"}
                        className={cn(
                          "text-[10px]",
                          !t.roles.has(f) && "opacity-40",
                        )}
                      >
                        {f}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {t.members.length === 0 ? (
                    <div className="px-6 py-6 text-center text-xs italic text-muted-foreground/60">
                      Sem jogadores
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 p-3">
                      {t.members.map((m) => {
                        const isPending = pendingIds.has(m._id);
                        return (
                          <ContextMenu key={m._id}>
                            <ContextMenuTrigger>
                              <div
                                className={cn(
                                  "flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-3 transition-colors",
                                  "hover:bg-muted/60",
                                  getHighlightColorClass(m.highlightColor),
                                  isPending && "opacity-70"
                                )}
                              >
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <PlayerNickWithNotes
                                      player={m}
                                      onCopyClick={(value) => handleCopyValue("Nick", value)}
                                      onMiddleClick={handleQuickValorantLookup}
                                      className={cn(
                                        "cursor-pointer text-sm font-semibold underline decoration-dotted underline-offset-4 hover:text-primary",
                                        m.observacoes && "cursor-help",
                                      )}
                                    />
                                    {m.riotName && m.riotTag ? (
                                      <span className="font-mono text-[11px] text-muted-foreground">
                                        {m.riotName}#{m.riotTag}
                                      </span>
                                    ) : null}
                                    <span className="text-xs text-muted-foreground">
                                      {m.nome}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px]"
                                    >
                                      {m.elo}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      Pico {m.pico}
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap gap-1">
                                    <Badge className="text-[10px]">
                                      {m.funcaoPrimaria}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {m.funcaoSecundaria}
                                    </Badge>
                                    {getPlayerTags(m).map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="outline"
                                        className={cn("gap-1 text-[10px]", getTagColorClass(tag))}
                                      >
                                        <TagsIcon className="size-3" />
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>

                                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                    <span className="font-mono">
                                      Inscrito em {formatInscricaoDate(m.createdAt)}
                                    </span>
                                    <span className="font-mono">{m.email}</span>
                                    <span className="font-mono">
                                      {getInstagramHandle(m.instagram)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="gap-1 text-[11px] font-mono"
                                    >
                                      <PhoneIcon className="size-3" />
                                      <button
                                        type="button"
                                        onClick={() => handleCopyValue("WhatsApp", m.whatsapp)}
                                        className="cursor-pointer underline decoration-dotted underline-offset-4"
                                      >
                                        {m.whatsapp}
                                      </button>
                                    </Badge>
                                  </div>
                                  <ValorantProfileSummary player={m} />
                                  {m.observacoes ? (
                                    <div className="flex gap-2 rounded-md border border-border/50 bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                                      <StickyNoteIcon className="mt-0.5 size-3 shrink-0" />
                                      <span>{m.observacoes}</span>
                                    </div>
                                  ) : null}

                                  
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={<Button variant="ghost" size="icon-xs" />}
                                    disabled={isPending}
                                  >
                                    {isPending ? (
                                      <LoaderCircleIcon className="animate-spin" />
                                    ) : (
                                      <MoreHorizontalIcon />
                                    )}
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    {renderPlayerActions(m, t.time, "dropdown")}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-56">
                              {renderPlayerActions(m, t.time, "context")}
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Dialog open={groupModalTime !== null} onOpenChange={(open) => !open && setGroupModalTime(null)}>
        {selectedGroup ? (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Formar grupo do Time {selectedGroup.time}
              </DialogTitle>
              <DialogDescription>
                {timeNames[selectedGroup.time]?.trim()
                  ? `${timeNames[selectedGroup.time]} · `
                  : ""}
                {selectedGroup.members.length} pessoas com telefone pronto para organizar o grupo.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {selectedGroup.members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-3"
                >
                  <span className="font-mono text-sm text-foreground">
                    {member.whatsapp}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {member.nome}
                  </span>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleCopyGroupContacts(selectedGroup.time)}
              >
                <CopyIcon />
                Copiar contatos
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog
        open={editingPlayer !== null}
        onOpenChange={(open) => {
          if (!open && !editPending) {
            setEditingPlayer(null);
            setEditForm(null);
          }
        }}
      >
        {editingPlayer && editForm ? (
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar inscricao</DialogTitle>
              <DialogDescription>
                Atualize dados do jogador, tags operacionais e observacoes internas.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
              <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Riot ID</span>
                  <div className="flex gap-2">
                    <Input
                      value={editForm.riotId}
                      onChange={(e) => updateEditForm("riotId", e.target.value)}
                      placeholder="Nome#TAG"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={riotLookupPending}
                      onClick={handleValorantLookup}
                    >
                      {riotLookupPending ? (
                        <LoaderCircleIcon className="animate-spin" />
                      ) : (
                        <SearchCheckIcon />
                      )}
                      Buscar
                    </Button>
                  </div>
                </label>

                <div className="grid gap-2 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Nome Riot</span>
                    <Input
                      value={editForm.riotName}
                      onChange={(e) => updateEditForm("riotName", e.target.value)}
                      placeholder="Separado automaticamente"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Tag</span>
                    <Input
                      value={editForm.riotTag}
                      onChange={(e) => updateEditForm("riotTag", e.target.value)}
                      placeholder="BR1"
                    />
                  </label>
                </div>
                <ValorantEditPreview form={editForm} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Nick</span>
                  <Input
                    value={editForm.nick}
                    onChange={(e) => updateEditForm("nick", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Nome</span>
                  <Input
                    value={editForm.nome}
                    onChange={(e) => updateEditForm("nome", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Email</span>
                  <Input
                    value={editForm.email}
                    onChange={(e) => updateEditForm("email", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">WhatsApp</span>
                  <Input
                    value={editForm.whatsapp}
                    onChange={(e) => updateEditForm("whatsapp", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Instagram</span>
                  <Input
                    value={editForm.instagram}
                    onChange={(e) => updateEditForm("instagram", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Elo atual</span>
                  <select
                    value={editForm.elo}
                    onChange={(e) => updateEditForm("elo", e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {ELOS.map((elo) => (
                      <option key={elo} value={elo}>
                        {elo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Pico</span>
                  <select
                    value={editForm.pico}
                    onChange={(e) => updateEditForm("pico", e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {ELOS.map((elo) => (
                      <option key={elo} value={elo}>
                        {elo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Funcao primaria</span>
                  <select
                    value={editForm.funcaoPrimaria}
                    onChange={(e) => updateEditForm("funcaoPrimaria", e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {FUNCOES.map((funcao) => (
                      <option key={funcao} value={funcao}>
                        {funcao}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Funcao secundaria</span>
                  <select
                    value={editForm.funcaoSecundaria}
                    onChange={(e) => updateEditForm("funcaoSecundaria", e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {FUNCOES.map((funcao) => (
                      <option key={funcao} value={funcao}>
                        {funcao}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <TagsIcon className="size-3.5" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {TAG_SUGGESTIONS.map((tag) => {
                    const active = parseTags(editForm.tagsText).some(
                      (item) => item.toLowerCase() === tag.toLowerCase(),
                    );
                    return (
                      <Button
                        key={tag}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "border",
                          active ? getTagColorClass(tag) : "border-border/70",
                        )}
                        onClick={() => toggleTagSuggestion(tag)}
                      >
                        {tag}
                      </Button>
                    );
                  })}
                </div>
                <Input
                  value={editForm.tagsText}
                  onChange={(e) => updateEditForm("tagsText", e.target.value)}
                  placeholder="Tags separadas por virgula"
                />
              </div>

              <label className="block space-y-1.5">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <StickyNoteIcon className="size-3.5" />
                  Observacoes
                </span>
                <div className="flex flex-wrap gap-2">
                  {HIGHLIGHT_COLORS.map((color) => {
                    const active = editForm.highlightColor === color.value;
                    return (
                      <Button
                        key={color.value || "none"}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "gap-2",
                          active && color.className,
                        )}
                        onClick={() => updateEditForm("highlightColor", color.value)}
                      >
                        <span
                          className={cn(
                            "size-3 rounded-full border border-border",
                            color.swatch,
                          )}
                        />
                        {color.label}
                      </Button>
                    );
                  })}
                </div>
                <Textarea
                  value={editForm.observacoes}
                  onChange={(e) => updateEditForm("observacoes", e.target.value)}
                  placeholder="Preferencias, restricoes, status de contato ou qualquer nota interna..."
                  className="min-h-24"
                />
              </label>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={editPending}
                onClick={() => {
                  setEditingPlayer(null);
                  setEditForm(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={editPending}>
                {editPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                Salvar alteracoes
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && deleteTarget && !deletingIds.has(deleteTarget._id)) {
            setDeleteTarget(null);
          }
        }}
      >
        {deleteTarget ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remover inscricao</DialogTitle>
              <DialogDescription>
                Esta acao remove {deleteTarget.nick} da base do VCT e tambem tira o jogador de qualquer time.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
              <div className="font-medium">{deleteTarget.nick}</div>
              <div className="text-xs text-muted-foreground">
                {deleteTarget.nome} · {deleteTarget.email}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={deletingIds.has(deleteTarget._id)}
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deletingIds.has(deleteTarget._id)}
                onClick={() => handleDeletePlayer(deleteTarget)}
              >
                {deletingIds.has(deleteTarget._id) ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <Trash2Icon />
                )}
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
