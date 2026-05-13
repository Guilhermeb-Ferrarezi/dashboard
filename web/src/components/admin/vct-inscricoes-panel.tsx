"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ClockIcon,
  CopyIcon,
  CrosshairIcon,
  InboxIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
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
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { clientApi } from "@/lib/api";
import {
  HIGHLIGHT_COLOR_OPTIONS,
  getHighlightColorClass,
  getHighlightColorPickerValue,
  getHighlightColorStyle,
} from "@/lib/highlight-colors";
import {
  VCT_INSCRICAO_STATUS,
  getVctInscricaoStatusLabel,
  isVctInscricaoInactive,
} from "@/lib/vct-inscricao-status";
import { cn } from "@/lib/utils";
import type { VctInscricaoSummary, VctTimeSummary } from "@/types/portal";
import { HexColorInput, HexColorPicker } from "react-colorful";

interface VctInscricoesPanelProps {
  initialInscricoes: VctInscricaoSummary[];
  initialTimes: VctTimeSummary[];
  modalidade?: GameSlug;
}

type GameSlug = "valorant" | "counter-strike" | "lol";

const VALORANT_ELO_ORDER = [
  "Sem elo",
  "Ferro 1",
  "Ferro 2",
  "Ferro 3",
  "Bronze 1",
  "Bronze 2",
  "Bronze 3",
  "Prata 1",
  "Prata 2",
  "Prata 3",
  "Ouro 1",
  "Ouro 2",
  "Ouro 3",
  "Platina 1",
  "Platina 2",
  "Platina 3",
  "Diamante 1",
  "Diamante 2",
  "Diamante 3",
  "Ascendente 1",
  "Ascendente 2",
  "Ascendente 3",
  "Imortal 1",
  "Imortal 2",
  "Imortal 3",
  "Radiante",
] as const;

const COUNTER_STRIKE_ELO_ORDER = [
  "Sem elo / não ranqueado",
  "Silver I",
  "Silver II",
  "Silver III",
  "Silver IV",
  "Silver Elite",
  "Silver Elite Master",
  "Gold Nova I",
  "Gold Nova II",
  "Gold Nova III",
  "Gold Nova Master",
  "Master Guardian I",
  "Master Guardian II",
  "Master Guardian Elite",
  "Distinguished Master Guardian",
  "Legendary Eagle",
  "Legendary Eagle Master",
  "Supreme Master First Class",
  "Global Elite",
] as const;

const LOL_ELO_ORDER = [
  "Sem elo / não ranqueado",
  "Ferro",
  "Bronze",
  "Prata",
  "Ouro",
  "Platina",
  "Esmeralda",
  "Diamante",
  "Mestre",
  "Grão-mestre",
  "Desafiante",
] as const;

const GAME_CONFIGS: Record<
  GameSlug,
  {
    label: string;
    elos: readonly string[];
    funcoes: readonly string[];
    hasValorantLookup: boolean;
  }
> = {
  valorant: {
    label: "VCT",
    elos: VALORANT_ELO_ORDER,
    funcoes: ["Duelista", "Controlador", "Sentinela", "Iniciador", "Flex"],
    hasValorantLookup: true,
  },
  "counter-strike": {
    label: "Counter-strike",
    elos: COUNTER_STRIKE_ELO_ORDER,
    funcoes: ["Entry fragger", "AWPer", "Rifler", "Lurker", "Suporte", "IGL", "Flex"],
    hasValorantLookup: false,
  },
  lol: {
    label: "League of Legends",
    elos: LOL_ELO_ORDER,
    funcoes: ["Topo", "Caçador", "Meio", "Atirador", "Suporte", "Flex"],
    hasValorantLookup: false,
  },
};

const MIN_TIMES = 8;
const TIME_CAP = 5;
const TAG_SUGGESTIONS = ["Confirmado", "Pendente", "Capitao", "Sub", "Prioridade", "Revisar"];
const RECENT_FILTERS = [
  { label: "Todos", value: "all", minutes: null },
  { label: "30m", value: "30m", minutes: 30 },
  { label: "1h", value: "1h", minutes: 60 },
  { label: "6h", value: "6h", minutes: 360 },
  { label: "24h", value: "24h", minutes: 1440 },
] as const;
const INSCRITOS_PAGE_SIZE = 10;
const TAG_COLOR_CLASSES: Record<string, string> = {
  confirmado: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  pendente: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  capitao: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  sub: "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300",
  prioridade: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  revisar: "border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300",
};
const DEFAULT_TAG_COLOR_CLASS = "border-slate-500/40 bg-slate-500/15 text-slate-700 dark:text-slate-300";

type TeamFormationFilters = {
  sameTrainingDays: boolean;
  sameAvailability: boolean;
  confirmedTravelOnly: boolean;
  prioritizeCaptainIfMissing: boolean;
  singleCaptainPerTeam: boolean;
  maxEloPerTeam: string | null;
};

function createDefaultTeamFormationFilters(): TeamFormationFilters {
  return {
    sameTrainingDays: false,
    sameAvailability: false,
    confirmedTravelOnly: false,
    prioritizeCaptainIfMissing: false,
    singleCaptainPerTeam: false,
    maxEloPerTeam: null,
  };
}

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
  cidade: string;
  diasTreino: string;
  diasSemana: string;
  horariosTreino: string;
  melhorJanela: string;
  compromisso: string;
  rotinaFixa: string;
  horariosDefinidos: string;
  capitao: string;
  presencial: string;
  deslocamento: string;
  autorizacaoContato: string;
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

function eloScore(elo: string, elos: readonly string[] = VALORANT_ELO_ORDER) {
  return Object.fromEntries(elos.map((value, index) => [value, index]))[elo] ?? 0;
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
    cidade: player.cidade ?? "",
    diasTreino: player.diasTreino ?? "",
    diasSemana: player.diasSemana ?? "",
    horariosTreino: player.horariosTreino ?? "",
    melhorJanela: player.melhorJanela ?? "",
    compromisso: player.compromisso ?? "",
    rotinaFixa: player.rotinaFixa ?? "",
    horariosDefinidos: player.horariosDefinidos ?? "",
    capitao: player.capitao ?? "",
    presencial: player.presencial ?? "",
    deslocamento: player.deslocamento ?? "",
    autorizacaoContato: player.autorizacaoContato ?? "",
    tagsText: getPlayerTags(player).join(", "),
    observacoes: player.observacoes ?? "",
    highlightColor: player.highlightColor ?? "",
  };
}

export const CREATE_INSCRICAO_REQUIRED_FIELDS: Array<keyof VctEditForm> = [
  "nome",
  "nick",
  "email",
  "whatsapp",
  "cidade",
  "elo",
  "pico",
  "funcaoPrimaria",
  "funcaoSecundaria",
  "diasTreino",
  "diasSemana",
  "horariosTreino",
  "melhorJanela",
  "compromisso",
  "rotinaFixa",
  "horariosDefinidos",
  "capitao",
  "presencial",
  "deslocamento",
  "autorizacaoContato",
];

export function createBlankInscricaoForm(gameElos: readonly string[], gameFuncoes: readonly string[]) {
  return {
    riotId: "",
    riotName: "",
    riotTag: "",
    riotPuuid: "",
    valorantRegion: "",
    valorantAccountLevel: null,
    valorantCardSmall: "",
    valorantCardWide: "",
    valorantCurrentRank: "",
    valorantPeakRank: "",
    nome: "",
    nick: "",
    email: "",
    whatsapp: "",
    instagram: "",
    elo: gameElos[0] ?? "",
    pico: gameElos[0] ?? "",
    funcaoPrimaria: gameFuncoes[0] ?? "",
    funcaoSecundaria: gameFuncoes[0] ?? "",
    cidade: "",
    diasTreino: "",
    diasSemana: "",
    horariosTreino: "",
    melhorJanela: "",
    compromisso: "",
    rotinaFixa: "",
    horariosDefinidos: "",
    capitao: "",
    presencial: "",
    deslocamento: "",
    autorizacaoContato: "",
    tagsText: "",
    observacoes: "",
    highlightColor: "",
  } satisfies VctEditForm;
}

export function isCreateInscricaoFormComplete(form: VctEditForm) {
  return CREATE_INSCRICAO_REQUIRED_FIELDS.every((field) => String(form[field]).trim().length > 0);
}

export function buildCreateInscricaoPayload(form: VctEditForm, modalidade: GameSlug) {
  return {
    modalidade,
    nome: form.nome,
    nick: form.nick,
    email: form.email,
    whatsapp: form.whatsapp,
    instagram: form.instagram,
    cidade: form.cidade,
    elo: form.elo,
    pico: form.pico,
    funcaoPrimaria: form.funcaoPrimaria,
    funcaoSecundaria: form.funcaoSecundaria,
    diasTreino: form.diasTreino,
    diasSemana: form.diasSemana,
    horariosTreino: form.horariosTreino,
    melhorJanela: form.melhorJanela,
    compromisso: form.compromisso,
    rotinaFixa: form.rotinaFixa,
    horariosDefinidos: form.horariosDefinidos,
    capitao: form.capitao,
    presencial: form.presencial,
    deslocamento: form.deslocamento,
    autorizacaoContato: form.autorizacaoContato,
    riotName: form.riotName,
    riotTag: form.riotTag,
    riotPuuid: form.riotPuuid,
    valorantRegion: form.valorantRegion,
    valorantAccountLevel: form.valorantAccountLevel,
    valorantCardSmall: form.valorantCardSmall,
    valorantCardWide: form.valorantCardWide,
    valorantCurrentRank: form.valorantCurrentRank,
    valorantPeakRank: form.valorantPeakRank,
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
      <TooltipContent side="top" align="start" className="max-w-sm">
        <span className="text-xs leading-relaxed">{notes}</span>
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

function getInscricaoFieldValue(value?: string) {
  return value?.trim() || "—";
}

function InscricaoDetailsContent({
  player,
}: {
  player: VctInscricaoSummary;
}) {
  const sections = [
    {
      title: "Base",
      fields: [
        { label: "Cidade", value: getInscricaoFieldValue(player.cidade) },
        { label: "Elo atual", value: getInscricaoFieldValue(player.elo) },
        { label: "Pico", value: getInscricaoFieldValue(player.pico) },
      ],
    },
    {
      title: "Treino",
      fields: [
        { label: "Dias/semana", value: getInscricaoFieldValue(player.diasTreino) },
        { label: "Dias exatos", value: getInscricaoFieldValue(player.diasSemana) },
        { label: "Horários", value: getInscricaoFieldValue(player.horariosTreino) },
        { label: "Melhor janela", value: getInscricaoFieldValue(player.melhorJanela) },
      ],
    },
    {
      title: "Compromisso",
      fields: [
        { label: "Compromisso", value: getInscricaoFieldValue(player.compromisso) },
        { label: "Rotina fixa", value: getInscricaoFieldValue(player.rotinaFixa) },
        { label: "Horários definidos", value: getInscricaoFieldValue(player.horariosDefinidos) },
        { label: "Capitão", value: getInscricaoFieldValue(player.capitao) },
      ],
    },
    {
      title: "Logística",
      fields: [
        { label: "Presencial", value: getInscricaoFieldValue(player.presencial) },
        { label: "Deslocamento", value: getInscricaoFieldValue(player.deslocamento) },
        { label: "Contato", value: getInscricaoFieldValue(player.autorizacaoContato) },
      ],
    },
  ];

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-primary/80">
            {section.title}
          </p>
          <div className="space-y-1.5">
            {section.fields.map((field) => (
              <div
                key={`${section.title}-${field.label}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/60 px-3 py-2.5"
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {field.label}
                </span>
                <span className="text-right text-[11px] font-semibold leading-tight text-foreground">
                  {field.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
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
  modalidade = "valorant",
}: VctInscricoesPanelProps) {
  const gameConfig = GAME_CONFIGS[modalidade];
  const modalidadeQuery = `modalidade=${encodeURIComponent(modalidade)}`;
  const gameElos = gameConfig.elos;
  const gameFuncoes = gameConfig.funcoes;
  const teamEloFilters = ["Sem limite", ...gameElos] as const;
  const withModalidade = (path: string) =>
    `${path}${path.includes("?") ? "&" : "?"}${modalidadeQuery}`;
  const [inscricoes, setInscricoes] = useState(initialInscricoes);
  const [numTimes, setNumTimes] = useState(() => {
    const maxFromTimes = initialTimes.reduce((max, t) => Math.max(max, t.numero), 0);
    const maxFromInscricoes = initialInscricoes.reduce((max, i) => Math.max(max, i.time ?? 0), 0);
    return Math.max(MIN_TIMES, maxFromTimes, maxFromInscricoes);
  });
  const [timeNames, setTimeNames] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const t of initialTimes) map[t.numero] = t.nome ?? "";
    return map;
  });
  const [query, setQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [recentFilter, setRecentFilter] = useState<typeof RECENT_FILTERS[number]["value"]>("all");
  const [eloFilter, setEloFilter] = useState<string>("all");
  const [teamFormationFiltersByTime, setTeamFormationFiltersByTime] = useState<
    Record<number, TeamFormationFilters>
  >(() => {
    const map: Record<number, TeamFormationFilters> = {};
    for (const t of initialTimes) map[t.numero] = createDefaultTeamFormationFilters();
    return map;
  });
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pendingTimes, setPendingTimes] = useState<Set<number>>(new Set());
  const [autoPending, setAutoPending] = useState(false);
  const [groupModalTime, setGroupModalTime] = useState<number | null>(null);
  const [detailsPlayer, setDetailsPlayer] = useState<VctInscricaoSummary | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<VctInscricaoSummary | null>(null);
  const [editForm, setEditForm] = useState<VctEditForm | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [riotLookupPending, setRiotLookupPending] = useState(false);
  const [createForm, setCreateForm] = useState<VctEditForm | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VctInscricaoSummary | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [inscricoesTab, setInscricoesTab] = useState<"ativas" | "fora">("ativas");
  const [selectedInscricoes, setSelectedInscricoes] = useState<Set<string>>(new Set());
  const [visibleActiveCount, setVisibleActiveCount] = useState(INSCRITOS_PAGE_SIZE);
  const [visibleInactiveCount, setVisibleInactiveCount] = useState(INSCRITOS_PAGE_SIZE);
  const [sortConfig, setSortConfig] = useState<{ column: "elo" | "nome" | "inscricao"; direction: "asc" | "desc" } | null>(null);
  const inscricoesScrollRefs = useRef<Record<"ativas" | "fora", HTMLDivElement | null>>({
    ativas: null,
    fora: null,
  });
  const inscricoesScrollPositions = useRef<Record<"ativas" | "fora", number>>({
    ativas: 0,
    fora: 0,
  });

  const activeInscricoes = useMemo(
    () => inscricoes.filter((i) => !isVctInscricaoInactive(i.status)),
    [inscricoes],
  );

  const inactiveInscricoes = useMemo(
    () => inscricoes.filter((i) => isVctInscricaoInactive(i.status)),
    [inscricoes],
  );

  const activeSemTime = useMemo(
    () => activeInscricoes.filter((i) => i.time === null || i.time === undefined),
    [activeInscricoes],
  );

  const matchesCommonFilters = useCallback((i: VctInscricaoSummary) => {
    const q = query.trim().toLowerCase();
    const phone = onlyDigits(phoneQuery);
    const matchesText =
      !q ||
      [i.nome, i.nick, i.email, i.whatsapp, i.instagram, i.elo, i.pico, i.funcaoPrimaria, i.funcaoSecundaria, i.observacoes, ...(i.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    const matchesPhone = !phone || onlyDigits(i.whatsapp).includes(phone);
    const matchesRecent = isWithinRecentFilter(i.createdAt, recentFilter);
    const matchesElo = eloFilter === "all" || i.elo === eloFilter;

    return matchesText && matchesPhone && matchesRecent && matchesElo;
  }, [eloFilter, phoneQuery, query, recentFilter]);

  const filteredActiveSemTime = useMemo(
    () => activeSemTime.filter((i) => matchesCommonFilters(i)),
    [activeSemTime, matchesCommonFilters],
  );

  const filteredInactive = useMemo(
    () => inactiveInscricoes.filter((i) => matchesCommonFilters(i)),
    [inactiveInscricoes, matchesCommonFilters],
  );

  const sortedFilteredActiveSemTime = useMemo(() => {
    if (!sortConfig) return filteredActiveSemTime;
    const { column, direction } = sortConfig;
    return [...filteredActiveSemTime].sort((a, b) => {
      let cmp = 0;
      if (column === "elo") {
        cmp = eloScore(a.elo, gameElos) - eloScore(b.elo, gameElos);
      } else if (column === "nome") {
        cmp = a.nome.localeCompare(b.nome, "pt-BR");
      } else if (column === "inscricao") {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = ta - tb;
      }
      return direction === "asc" ? cmp : -cmp;
    });
  }, [filteredActiveSemTime, gameElos, sortConfig]);

  useEffect(() => {
    setVisibleActiveCount(INSCRITOS_PAGE_SIZE);
  }, [sortedFilteredActiveSemTime]);

  useEffect(() => {
    setVisibleInactiveCount(INSCRITOS_PAGE_SIZE);
  }, [filteredInactive]);

  const timesArray = useMemo(
    () => Array.from({ length: numTimes }, (_, i) => i + 1),
    [numTimes],
  );

  useEffect(() => {
    setTeamFormationFiltersByTime((current) => {
      const next = { ...current };
      for (const numero of timesArray) {
        if (!next[numero]) {
          next[numero] = createDefaultTeamFormationFilters();
        }
      }
      return next;
    });
  }, [timesArray]);

  const teamStats = useMemo(() => {
    return timesArray.map((t) => {
      const members = activeInscricoes.filter((i) => i.time === t);
      const avg =
        members.length > 0
          ? members.reduce((acc, m) => acc + eloScore(m.elo, gameElos), 0) / members.length
          : 0;
      const roles = new Set<string>();
      members.forEach((m) => {
        roles.add(m.funcaoPrimaria);
      });
      return { time: t, members, avg, roles };
    });
  }, [activeInscricoes, gameElos, timesArray]);

  const selectedGroup = useMemo(() => {
    if (groupModalTime === null) return null;
    return teamStats.find((team) => team.time === groupModalTime) ?? null;
  }, [groupModalTime, teamStats]);

  async function reloadInscricoes() {
    const updated = await clientApi<{ inscricoes: VctInscricaoSummary[] }>(
      withModalidade("/vct/inscricoes"),
    );
    setInscricoes(updated.inscricoes);
  }

  function getTeamFormationFilters(numero: number) {
    return teamFormationFiltersByTime[numero] ?? createDefaultTeamFormationFilters();
  }

  function updateTeamFormationFilters(
    numero: number,
    updater: (current: TeamFormationFilters) => TeamFormationFilters,
  ) {
    setTeamFormationFiltersByTime((current) => ({
      ...current,
      [numero]: updater(current[numero] ?? createDefaultTeamFormationFilters()),
    }));
  }

  function buildTeamFormationPayload(numero?: number) {
    if (typeof numero === "number") {
      return {
        ...getTeamFormationFilters(numero),
      };
    }

    return {
      teamFilters: Object.fromEntries(
        timesArray.map((time) => [time, getTeamFormationFilters(time)]),
      ),
    };
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

  async function handleStatusChange(ids: string[], status: "active" | "inactive") {
    if (ids.length === 0) return;

    setPendingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    try {
      await clientApi<{ atualizados: number; status: "active" | "inactive" }>(
        "/vct/inscricoes/status",
        {
          method: "POST",
          body: JSON.stringify({ ids, status }),
        },
      );
      await reloadInscricoes();
      setSelectedInscricoes(new Set());
      toast.success(
        status === VCT_INSCRICAO_STATUS.INACTIVE
          ? "Inscrições movidas para fora do campeonato."
          : "Inscrições reativadas.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar o status.",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  function openEditPlayer(player: VctInscricaoSummary) {
    setDetailsPlayer(null);
    setDetailsExpanded(false);
    setEditingPlayer(player);
    setEditForm(getEditForm(player));
  }

  function openCreatePlayer() {
    setDetailsPlayer(null);
    setDetailsExpanded(false);
    setEditingPlayer(null);
    setEditForm(null);
    setCreateForm(createBlankInscricaoForm(gameElos, gameFuncoes));
  }

  function updateEditForm<K extends keyof VctEditForm>(field: K, value: VctEditForm[K]) {
    setEditForm((current) => {
      if (!current) return current;
      const next = { ...current, [field]: value };
      if (field === "elo") {
        const nextElo = String(value);
        if (next.pico && eloScore(next.pico, gameElos) < eloScore(nextElo, gameElos)) {
          next.pico = "";
        }
      }
      return next;
    });
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
      if (eloScore(editForm.elo, gameElos) < 0 || eloScore(editForm.pico, gameElos) < 0) {
        toast.error("Elo inválido.");
        return;
      }
      if (eloScore(editForm.pico, gameElos) < eloScore(editForm.elo, gameElos)) {
        toast.error("O pico de elo não pode ser menor que o elo atual.");
        return;
      }

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
        modalidade,
        nome: editForm.nome,
        nick: editForm.nick,
        email: editForm.email,
        whatsapp: editForm.whatsapp,
        instagram: editForm.instagram,
        elo: editForm.elo,
        pico: editForm.pico,
        funcaoPrimaria: editForm.funcaoPrimaria,
        funcaoSecundaria: editForm.funcaoSecundaria,
        cidade: editForm.cidade,
        diasTreino: editForm.diasTreino,
        diasSemana: editForm.diasSemana,
        horariosTreino: editForm.horariosTreino,
        melhorJanela: editForm.melhorJanela,
        compromisso: editForm.compromisso,
        rotinaFixa: editForm.rotinaFixa,
        horariosDefinidos: editForm.horariosDefinidos,
        capitao: editForm.capitao,
        presencial: editForm.presencial,
        deslocamento: editForm.deslocamento,
        autorizacaoContato: editForm.autorizacaoContato,
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

  function updateCreateForm<K extends keyof VctEditForm>(field: K, value: VctEditForm[K]) {
    setCreateForm((current) => {
      if (!current) return current;
      const next = { ...current, [field]: value };
      if (field === "elo") {
        const nextElo = String(value);
        if (next.pico && eloScore(next.pico, gameElos) < eloScore(nextElo, gameElos)) {
          next.pico = "";
        }
      }
      return next;
    });
  }

  async function handleCreateInscricao() {
    if (!createForm) return;

    if (!isCreateInscricaoFormComplete(createForm)) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (eloScore(createForm.elo, gameElos) < 0 || eloScore(createForm.pico, gameElos) < 0) {
      toast.error("Elo inválido.");
      return;
    }
    if (eloScore(createForm.pico, gameElos) < eloScore(createForm.elo, gameElos)) {
      toast.error("O pico de elo não pode ser menor que o elo atual.");
      return;
    }

    setCreatePending(true);
    try {
      await clientApi<{ ok: true; id: string }>("/vct/inscricao", {
        method: "POST",
        body: JSON.stringify(buildCreateInscricaoPayload(createForm, modalidade)),
      });
      await reloadInscricoes();
      setCreateForm(null);
      toast.success("Inscrição criada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nao foi possivel criar a inscricao.",
      );
    } finally {
      setCreatePending(false);
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

  async function handleAddTeam() {
    const nextNumero = numTimes + 1;
    setPendingTimes((prev) => new Set(prev).add(nextNumero));

    try {
      await clientApi<{ time: VctTimeSummary }>(`/vct/time/${nextNumero}`, {
        method: "PUT",
        body: JSON.stringify({ nome: "", modalidade }),
      });
      setNumTimes(nextNumero);
      setTimeNames((current) => ({ ...current, [nextNumero]: current[nextNumero] ?? "" }));
      setTeamFormationFiltersByTime((current) => ({
        ...current,
        [nextNumero]: current[nextNumero] ?? createDefaultTeamFormationFilters(),
      }));
      toast.success(`Time ${nextNumero} adicionado.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível adicionar o time.",
      );
    } finally {
      setPendingTimes((prev) => {
        const next = new Set(prev);
        next.delete(nextNumero);
        return next;
      });
    }
  }

  async function handleAutoForm() {
    if (activeSemTime.length === 0) {
      toast.info("Não há inscritos sem time.");
      return;
    }
    setAutoPending(true);
    try {
      const res = await clientApi<{ atribuidos: number }>(withModalidade("/vct/times/auto"), {
        method: "POST",
        body: JSON.stringify(buildTeamFormationPayload()),
      });
      await reloadInscricoes();
      toast.success(
        `${res.atribuidos} jogadores atribuídos com os filtros atuais.`,
      );
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
        withModalidade(`/vct/times/${numero}/fill`),
        {
          method: "POST",
          body: JSON.stringify(buildTeamFormationPayload(numero)),
        },
      );
      await reloadInscricoes();
      if (res.atribuidos === 0) {
        toast.info("Nenhum jogador elegível com os filtros atuais.");
      } else {
        toast.success(`${res.atribuidos} jogadores adicionados ao Time ${numero}.`);
      }
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
      await clientApi<{ removidos: number }>(withModalidade(`/vct/times/${numero}/clear`), {
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

  async function handleDeleteTime(numero: number) {
    setPendingTimes((prev) => new Set(prev).add(numero));
    try {
      await clientApi<{ removido: number }>(withModalidade(`/vct/time/${numero}`), {
        method: "DELETE",
      });
      setNumTimes((current) => Math.max(MIN_TIMES, current - 1));
      setTimeNames((current) => {
        const next = { ...current };
        delete next[numero];
        return next;
      });
      setTeamFormationFiltersByTime((current) => {
        const next = { ...current };
        delete next[numero];
        return next;
      });
      toast.success(`Time ${numero} removido.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover o time.",
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

  function toggleSort(column: "elo" | "nome" | "inscricao") {
    setSortConfig((current) => {
      if (!current || current.column !== column) return { column, direction: "desc" };
      if (current.direction === "desc") return { column, direction: "asc" };
      return null;
    });
  }

  useLayoutEffect(() => {
    const currentTarget = inscricoesScrollRefs.current[inscricoesTab];
    if (currentTarget) {
      currentTarget.scrollTop = inscricoesScrollPositions.current[inscricoesTab];
    }
  }, [inscricoesTab, selectedInscricoes]);

  function preserveInscricoesScroll(tab: "ativas" | "fora") {
    const currentTarget = inscricoesScrollRefs.current[tab];
    if (currentTarget) {
      inscricoesScrollPositions.current[tab] = currentTarget.scrollTop;
    }
  }

  function toggleInscricaoSelection(tab: "ativas" | "fora", id: string) {
    preserveInscricoesScroll(tab);
    setSelectedInscricoes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setInscricoesSelection(tab: "ativas" | "fora", ids: string[]) {
    preserveInscricoesScroll(tab);
    setSelectedInscricoes(new Set(ids));
  }

  function handleInscritosScroll(currentTarget: HTMLDivElement, tab: "ativas" | "fora") {
    inscricoesScrollPositions.current[tab] = currentTarget.scrollTop;
    const isNearBottom =
      currentTarget.scrollTop + currentTarget.clientHeight >= currentTarget.scrollHeight - 120;

    if (!isNearBottom) return;

    handleLoadMoreInscritos(tab);
  }

  function handleLoadMoreInscritos(tab: "ativas" | "fora") {
    if (tab === "ativas") {
      setVisibleActiveCount((current) =>
        Math.min(current + INSCRITOS_PAGE_SIZE, sortedFilteredActiveSemTime.length),
      );
      return;
    }

    setVisibleInactiveCount((current) =>
      Math.min(current + INSCRITOS_PAGE_SIZE, filteredInactive.length),
    );
  }

  async function handleTimeNameBlur(numero: number, nome: string) {
    try {
      await clientApi<{ time: VctTimeSummary }>(`/vct/time/${numero}`, {
        method: "PUT",
        body: JSON.stringify({ nome, modalidade }),
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

  function openDetailsModal(player: VctInscricaoSummary) {
    setDetailsPlayer(player);
    setDetailsExpanded(false);
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
        <Item
          onClick={() =>
            handleStatusChange(
              [player._id],
              isVctInscricaoInactive(player.status)
                ? VCT_INSCRICAO_STATUS.ACTIVE
                : VCT_INSCRICAO_STATUS.INACTIVE,
            )
          }
        >
          <UsersIcon />
          {isVctInscricaoInactive(player.status)
            ? "Reativar inscrição"
            : "Mover para fora do campeonato"}
        </Item>
        <Item onClick={() => openDetailsModal(player)}>
          <InboxIcon />
          Ver detalhes
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

  function InscricoesTable({
    tab,
    players,
    visibleCount,
    onLoadMore,
    allowSelection,
    showTimeSelect,
    emptyMessage,
    bulkActionLabel,
    onBulkAction,
  }: {
    tab: "ativas" | "fora";
    players: VctInscricaoSummary[];
    visibleCount: number;
    onLoadMore: () => void;
    allowSelection: boolean;
    showTimeSelect: boolean;
    emptyMessage: string;
    bulkActionLabel: string;
    onBulkAction: () => void;
  }) {
    const visiblePlayers = players.slice(0, visibleCount);
    const selectedCount = players.filter((player) => selectedInscricoes.has(player._id)).length;
    const allSelected = players.length > 0 && selectedCount === players.length;
    const selectionActive = allowSelection && selectedCount > 0;

    return (
      <Card className="border-border/60 bg-card/90">
        <CardContent className="relative p-3">
          {allowSelection && selectedCount > 0 ? (
            <div
              className="absolute inset-x-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/95 px-3 py-2 shadow-lg backdrop-blur"
            >
              <div className="text-xs text-muted-foreground">
                {selectedCount} inscrição{selectedCount > 1 ? "ões" : ""} selecionada
                {selectedCount > 1 ? "s" : ""}
              </div>
              <Button type="button" size="sm" onClick={onBulkAction}>
                {bulkActionLabel}
              </Button>
            </div>
          ) : null}

          {players.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
              <UsersIcon className="size-8" />
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div
              ref={(node) => {
                inscricoesScrollRefs.current[tab] = node;
              }}
              className="max-h-[640px] overflow-auto rounded-lg"
              onScroll={(event) => handleInscritosScroll(event.currentTarget, tab)}
            >
              <Table className="w-full table-fixed text-xs">
                <colgroup>
                  {allowSelection ? <col className="w-[4%]" /> : null}
                  <col className="w-[31%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[14%]" />
                  <col className={showTimeSelect ? "w-[12%]" : "w-[12%]"} />
                  <col className="w-[13%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    {allowSelection ? (
                      <TableHead className="h-8 py-1.5 text-center">
                        <Checkbox
                          checked={
                            allSelected
                              ? true
                              : selectedCount > 0
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={(checked) =>
                            setInscricoesSelection(
                              tab,
                              checked ? players.map((player) => player._id) : [],
                            )
                          }
                          className={cn(
                            "mx-auto transition-opacity",
                            selectionActive ? "opacity-100" : "pointer-events-none opacity-0",
                          )}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className="h-8 py-1.5">Jogador</TableHead>
                    <TableHead className="h-8 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSort("elo")}
                        className="inline-flex w-full items-center justify-center gap-1 hover:text-foreground"
                      >
                        Elo
                        {sortConfig?.column === "elo" ? (
                          sortConfig.direction === "desc" ? <ArrowDownIcon className="size-3" /> : <ArrowUpIcon className="size-3" />
                        ) : (
                          <ArrowUpDownIcon className="size-3 opacity-40" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="h-8 py-1.5 text-center">Funcoes</TableHead>
                    <TableHead className="h-8 py-1.5 text-center">WhatsApp</TableHead>
                    {showTimeSelect ? (
                      <TableHead className="h-8 py-1.5 text-center">Atribuir</TableHead>
                    ) : (
                      <TableHead className="h-8 py-1.5 text-center">Status</TableHead>
                    )}
                    <TableHead className="h-8 py-1.5 text-center">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePlayers.map((player) => {
                    const isPending = pendingIds.has(player._id);
                    const isSelected = selectedInscricoes.has(player._id);
                    return (
                      <TableRow
                        key={player._id}
                        className={cn(
                          "group/inscricao-row",
                          getHighlightColorClass(player.highlightColor),
                          isVctInscricaoInactive(player.status) && "opacity-70",
                        )}
                        style={getHighlightColorStyle(player.highlightColor)}
                      >
                        {allowSelection ? (
                          <TableCell className="align-middle py-1.5 text-center">
                            <div className="flex h-full min-h-12 items-center justify-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleInscricaoSelection(tab, player._id)}
                                className={cn(
                                  "transition-opacity",
                                  selectionActive || isSelected
                                    ? "opacity-100"
                                    : "pointer-events-none opacity-0 group-hover/inscricao-row:pointer-events-auto group-hover/inscricao-row:opacity-100",
                                )}
                                aria-label={`Selecionar ${player.nick}`}
                              />
                            </div>
                          </TableCell>
                        ) : null}
                        <TableCell className="align-top py-1.5 whitespace-normal break-words">
                          <div className="space-y-1">
                            <PlayerNickWithNotes
                              player={player}
                              onCopyClick={(value) => handleCopyValue("Nick", value)}
                              onMiddleClick={handleQuickValorantLookup}
                              className={cn(
                                "cursor-pointer text-sm font-semibold underline decoration-dotted underline-offset-4 hover:text-primary",
                                player.observacoes && "cursor-help",
                              )}
                            />
                            <div className="text-[11px] text-muted-foreground">
                              {player.nome}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {formatInscricaoDate(player.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle py-1.5 text-center">
                          <div className="flex h-full flex-col items-center justify-center gap-0.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {player.elo}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              Pico {player.pico}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="align-middle py-1.5 text-center">
                          <div className="flex h-full flex-col items-center justify-center gap-0.5">
                            <Badge className="text-[10px]">{player.funcaoPrimaria}</Badge>
                            <div className="text-[11px] text-muted-foreground">
                              {player.funcaoSecundaria}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="relative align-middle p-0 text-center">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleCopyValue("WhatsApp", player.whatsapp)}
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-primary transition-colors hover:opacity-80"
                            >
                              <PhoneIcon className="size-3" />
                              {player.whatsapp}
                            </button>
                          </div>
                        </TableCell>
                        {showTimeSelect ? (
                          <TableCell className="relative align-middle p-0 text-center">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <select
                                value=""
                                disabled={isPending}
                                onChange={(e) =>
                                  handleTimeChange(player._id, Number(e.target.value))
                                }
                                className="h-7 w-full max-w-[124px] rounded-md border border-border bg-background px-2 text-[11px] font-medium outline-none transition-colors focus:border-ring disabled:opacity-50"
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
                            </div>
                          </TableCell>
                        ) : (
                          <TableCell className="align-middle py-1.5 text-center">
                            <Badge variant="secondary" className="text-[10px]">
                              {getVctInscricaoStatusLabel(player.status)}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="relative align-middle p-0 text-center">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="outline"
                                      size="icon-sm"
                                      className="size-7"
                                      onClick={() => openDetailsModal(player)}
                                    />
                                  }
                                >
                                  <InboxIcon />
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                  Ver detalhes
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="outline"
                                      size="icon-sm"
                                      className="size-7"
                                      onClick={() => openEditPlayer(player)}
                                    />
                                  }
                                >
                                  <PencilIcon />
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                  Editar
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="outline"
                                      size="icon-sm"
                                      className="size-7"
                                      disabled={deletingIds.has(player._id)}
                                      onClick={() => setDeleteTarget(player)}
                                    />
                                  }
                                >
                                  {deletingIds.has(player._id) ? (
                                    <LoaderCircleIcon className="animate-spin" />
                                  ) : (
                                    <Trash2Icon />
                                  )}
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                  Excluir
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {visiblePlayers.length < players.length ? (
                <div className="sticky bottom-0 flex items-center justify-center border-t border-border/60 bg-card/95 px-4 py-2 backdrop-blur">
                  <Button type="button" variant="ghost" size="sm" onClick={onLoadMore}>
                    Carregar mais 10 inscritos
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ============ SEÇÃO 1: INSCRITOS ============ */}
      <section className="flex w-full flex-col gap-3 px-4 xl:mx-[calc((100%-100vw+16rem)/2)] xl:w-[calc(100vw-16rem)] xl:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <InboxIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Inscritos</h2>
              <p className="text-xs text-muted-foreground">
                {activeSemTime.length} aguardando time · {inactiveInscricoes.length} fora do campeonato
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
            <select
              value={eloFilter}
              onChange={(e) => setEloFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring md:w-36"
            >
              <option value="all">Todos elos</option>
              {gameElos.map((elo) => (
                <option key={elo} value={elo}>
                  {elo}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={openCreatePlayer}>
              <PlusIcon />
              Nova inscrição
            </Button>
            <Button onClick={handleAutoForm} disabled={autoPending}>
              {autoPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SparklesIcon />
              )}
              Formar times
            </Button>
          </div>
        </div>

        <Tabs
          value={inscricoesTab}
          onValueChange={(value) => {
            setInscricoesTab(value as "ativas" | "fora");
            setSelectedInscricoes(new Set());
          }}
        >
          <TabsList>
            <TabsTrigger value="ativas">
              Participam ({sortedFilteredActiveSemTime.length})
            </TabsTrigger>
            <TabsTrigger value="fora">
              Fora do campeonato ({filteredInactive.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ativas" className="mt-3">
            <InscricoesTable
              tab="ativas"
              players={sortedFilteredActiveSemTime}
              visibleCount={visibleActiveCount}
              onLoadMore={() => handleLoadMoreInscritos("ativas")}
              allowSelection
              showTimeSelect
              emptyMessage={
                activeSemTime.length === 0
                  ? "Todos os inscritos ativos estão em times."
                  : "Nenhum inscrito encontrado."
              }
              bulkActionLabel="Mover para fora do campeonato"
              onBulkAction={() =>
                handleStatusChange(
                  sortedFilteredActiveSemTime
                    .filter((player) => selectedInscricoes.has(player._id))
                    .map((player) => player._id),
                  VCT_INSCRICAO_STATUS.INACTIVE,
                )
              }
            />
          </TabsContent>
          <TabsContent value="fora" className="mt-3">
            <InscricoesTable
              tab="fora"
              players={filteredInactive}
              visibleCount={visibleInactiveCount}
              onLoadMore={() => handleLoadMoreInscritos("fora")}
              allowSelection
              showTimeSelect={false}
              emptyMessage="Nenhuma inscrição fora do campeonato."
              bulkActionLabel="Reativar inscrição"
              onBulkAction={() =>
                handleStatusChange(
                  filteredInactive
                    .filter((player) => selectedInscricoes.has(player._id))
                    .map((player) => player._id),
                  VCT_INSCRICAO_STATUS.ACTIVE,
                )
              }
            />
          </TabsContent>
        </Tabs>
      </section>

      {/* ============ SEÇÃO 2: TIMES ============ */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CrosshairIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Times</h2>
              <p className="text-xs text-muted-foreground">
                {activeInscricoes.length - activeSemTime.length} jogadores distribuídos · {numTimes} times · {TIME_CAP} por time
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTeam}
          >
            <PlusIcon />
            Adicionar time
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {teamStats.map((t) => {
            const full = t.members.length >= TIME_CAP;
            const isTeamPending = pendingTimes.has(t.time);
            const filters = getTeamFormationFilters(t.time);
            const activeFiltersCount = Object.values(filters).filter(Boolean).length;
            return (
              <Card
                key={t.time}
                className={cn(
                  "border-border/60 bg-card/90",
                  full && "border-primary/60",
                )}
              >
                <CardHeader className="space-y-1.5 pb-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Time {t.time}</CardTitle>
                      <Badge variant={full ? "default" : "secondary"} className="text-[10px]">
                        {t.members.length}/{TIME_CAP}
                      </Badge>
                      {activeFiltersCount > 0 ? (
                        <Badge variant="outline" className="text-[10px]">
                          {activeFiltersCount} filtros
                        </Badge>
                      ) : null}
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
                        <DropdownMenuContent align="end" className="w-80">
                          <DropdownMenuLabel>Time {t.time}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <WandSparklesIcon />
                              Filtros de formação
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-80 max-h-[360px] overflow-y-auto">
                              <DropdownMenuLabel>Regra do time</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuCheckboxItem
                                checked={filters.sameTrainingDays}
                                onCheckedChange={(checked) =>
                                  updateTeamFormationFilters(t.time, (current) => ({
                                    ...current,
                                    sameTrainingDays: checked === true,
                                  }))
                                }
                              >
                                Mesmos dias de treino
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={filters.sameAvailability}
                                onCheckedChange={(checked) =>
                                  updateTeamFormationFilters(t.time, (current) => ({
                                    ...current,
                                    sameAvailability: checked === true,
                                  }))
                                }
                              >
                                Mesma disponibilidade
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={filters.confirmedTravelOnly}
                                onCheckedChange={(checked) =>
                                  updateTeamFormationFilters(t.time, (current) => ({
                                    ...current,
                                    confirmedTravelOnly: checked === true,
                                  }))
                                }
                              >
                                Só deslocamento confirmado
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={filters.prioritizeCaptainIfMissing}
                                onCheckedChange={(checked) =>
                                  updateTeamFormationFilters(t.time, (current) => ({
                                    ...current,
                                    prioritizeCaptainIfMissing: checked === true,
                                  }))
                                }
                              >
                                Priorizar capitão
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                checked={filters.singleCaptainPerTeam}
                                onCheckedChange={(checked) =>
                                  updateTeamFormationFilters(t.time, (current) => ({
                                    ...current,
                                    singleCaptainPerTeam: checked === true,
                                  }))
                                }
                                >
                                1 capitão por time
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Elo máximo</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={filters.maxEloPerTeam ?? "Sem limite"}
                                onValueChange={(value) =>
                                  updateTeamFormationFilters(t.time, (current) => ({
                                    ...current,
                                    maxEloPerTeam: value === "Sem limite" ? null : value,
                                  }))
                                }
                              >
                                {teamEloFilters.map((elo) => (
                                  <DropdownMenuRadioItem key={elo} value={elo}>
                                    {elo}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem
                            disabled={full}
                            onClick={() => handleFillTeam(t.time)}
                          >
                            <WandSparklesIcon />
                            Preencher com filtros
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
                          {t.time === numTimes && numTimes > MIN_TIMES ? (
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={t.members.length > 0}
                              onClick={() => handleDeleteTime(t.time)}
                            >
                              <Trash2Icon />
                              Remover time
                            </DropdownMenuItem>
                          ) : null}
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
                    {gameFuncoes.map((f) => (
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
                <CardContent className="p-2">
                  {t.members.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs italic text-muted-foreground/60">
                      Sem jogadores
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 p-1">
                      {t.members.map((m) => {
                        const isPending = pendingIds.has(m._id);
                        const playerCard = (
                          <div
                            className={cn(
                              "flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-3 transition-colors",
                              "hover:bg-muted/60",
                              getHighlightColorClass(m.highlightColor),
                              isPending && "opacity-70",
                            )}
                            style={getHighlightColorStyle(m.highlightColor)}
                          >
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <PlayerNickWithNotes
                                  player={m}
                                  onCopyClick={(value) => handleCopyValue("Nick", value)}
                                  onMiddleClick={
                                    gameConfig.hasValorantLookup
                                      ? handleQuickValorantLookup
                                      : undefined
                                  }
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
                              {gameConfig.hasValorantLookup ? (
                                <ValorantProfileSummary player={m} />
                              ) : null}
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
                        );

                        return (
                          <ContextMenu key={m._id}>
                            <ContextMenuTrigger>
                              <Tooltip>
                                <TooltipTrigger render={playerCard} />
                                <TooltipContent side="top" align="start" className="p-4">
                                  <div className="w-80">
                                    <InscricaoDetailsContent player={m} />
                                  </div>
                                </TooltipContent>
                              </Tooltip>
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
          <DialogContent className="max-w-3xl">
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
        open={detailsPlayer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsPlayer(null);
            setDetailsExpanded(false);
          }
        }}
      >
        {detailsPlayer ? (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Dados da inscrição</DialogTitle>
              <DialogDescription>
                {detailsPlayer.nick} · {detailsPlayer.nome}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={detailsExpanded ? "outline" : "default"}
                  className="h-auto w-full whitespace-normal px-3 py-2 text-center leading-tight"
                  onClick={() => setDetailsExpanded((current) => !current)}
                >
                  {detailsExpanded ? "Ocultar detalhes" : "Mostrar dados"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full whitespace-normal px-3 py-2 text-center leading-tight"
                  onClick={() => detailsPlayer && openEditPlayer(detailsPlayer)}
                >
                  <PencilIcon />
                  Editar dados
                </Button>
              </div>

              {detailsExpanded ? (
                <div className="max-h-[65vh] overflow-y-auto pr-1">
                  <InscricaoDetailsContent player={detailsPlayer} />
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                  Clique no botao acima para ver os dados da inscricao.
                </div>
              )}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog
        open={createForm !== null}
        onOpenChange={(open) => {
          if (!open && !createPending) {
            setCreateForm(null);
          }
        }}
      >
        {createForm ? (
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Nova inscrição</DialogTitle>
              <DialogDescription>
                Crie uma inscrição manualmente. Os campos principais seguem a mesma validação
                do formulário público.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Nome</span>
                  <Input
                    value={createForm.nome}
                    onChange={(e) => updateCreateForm("nome", e.target.value)}
                    placeholder="Nome completo"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Nick</span>
                  <Input
                    value={createForm.nick}
                    onChange={(e) => updateCreateForm("nick", e.target.value)}
                    placeholder="Nome do jogador"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Email</span>
                  <Input
                    value={createForm.email}
                    onChange={(e) => updateCreateForm("email", e.target.value)}
                    placeholder="email@dominio.com"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">WhatsApp</span>
                  <Input
                    value={createForm.whatsapp}
                    onChange={(e) => updateCreateForm("whatsapp", e.target.value)}
                    placeholder="16999990000"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Instagram</span>
                  <Input
                    value={createForm.instagram}
                    onChange={(e) => updateCreateForm("instagram", e.target.value)}
                    placeholder="@usuario"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Cidade</span>
                  <Input
                    value={createForm.cidade}
                    onChange={(e) => updateCreateForm("cidade", e.target.value)}
                    placeholder="Cidade"
                  />
                </label>
              </div>

              {gameConfig.hasValorantLookup ? (
                <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Valorant
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Riot ID</span>
                      <Input
                        value={createForm.riotId}
                        onChange={(e) => updateCreateForm("riotId", e.target.value)}
                        placeholder="Nome#TAG"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Região</span>
                      <Input
                        value={createForm.valorantRegion}
                        onChange={(e) => updateCreateForm("valorantRegion", e.target.value)}
                        placeholder="br"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Elo atual</span>
                  <select
                    value={createForm.elo}
                    onChange={(e) => updateCreateForm("elo", e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {gameElos.map((elo) => (
                      <option key={elo} value={elo}>
                        {elo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Pico</span>
                  <select
                    value={createForm.pico}
                    onChange={(e) => updateCreateForm("pico", e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {gameElos.map((elo) => (
                      <option
                        key={elo}
                        value={elo}
                        disabled={eloScore(elo, gameElos) < eloScore(createForm.elo, gameElos)}
                      >
                        {elo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Função primária
                  </span>
                  <select
                    value={createForm.funcaoPrimaria}
                    onChange={(e) => updateCreateForm("funcaoPrimaria", e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {gameFuncoes.map((funcao) => (
                      <option key={funcao} value={funcao}>
                        {funcao}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Função secundária
                  </span>
                  <select
                    value={createForm.funcaoSecundaria}
                    onChange={(e) => updateCreateForm("funcaoSecundaria", e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {gameFuncoes.map((funcao) => (
                      <option key={funcao} value={funcao}>
                        {funcao}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Dias/semana</span>
                  <Input
                    value={createForm.diasTreino}
                    onChange={(e) => updateCreateForm("diasTreino", e.target.value)}
                    placeholder="2x por semana"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Dias exatos</span>
                  <Input
                    value={createForm.diasSemana}
                    onChange={(e) => updateCreateForm("diasSemana", e.target.value)}
                    placeholder="Segunda e quarta"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Horários</span>
                  <Input
                    value={createForm.horariosTreino}
                    onChange={(e) => updateCreateForm("horariosTreino", e.target.value)}
                    placeholder="Noite"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Melhor janela</span>
                  <Input
                    value={createForm.melhorJanela}
                    onChange={(e) => updateCreateForm("melhorJanela", e.target.value)}
                    placeholder="Tarde"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Compromisso</span>
                  <Input
                    value={createForm.compromisso}
                    onChange={(e) => updateCreateForm("compromisso", e.target.value)}
                    placeholder="Quero competir"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Rotina fixa</span>
                  <Input
                    value={createForm.rotinaFixa}
                    onChange={(e) => updateCreateForm("rotinaFixa", e.target.value)}
                    placeholder="Sim / não"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Horários definidos</span>
                  <Input
                    value={createForm.horariosDefinidos}
                    onChange={(e) => updateCreateForm("horariosDefinidos", e.target.value)}
                    placeholder="Disponível à noite"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Capitão</span>
                  <Input
                    value={createForm.capitao}
                    onChange={(e) => updateCreateForm("capitao", e.target.value)}
                    placeholder="Sim / não"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Presencial</span>
                  <Input
                    value={createForm.presencial}
                    onChange={(e) => updateCreateForm("presencial", e.target.value)}
                    placeholder="Sim / não"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Deslocamento</span>
                  <Input
                    value={createForm.deslocamento}
                    onChange={(e) => updateCreateForm("deslocamento", e.target.value)}
                    placeholder="Sim / não"
                  />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Contato</span>
                  <Input
                    value={createForm.autorizacaoContato}
                    onChange={(e) => updateCreateForm("autorizacaoContato", e.target.value)}
                    placeholder="Pode chamar no WhatsApp"
                  />
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={createPending}
                onClick={() => setCreateForm(null)}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateInscricao} disabled={createPending}>
                {createPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <SaveIcon />
                )}
                Criar inscrição
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
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>Editar inscricao</DialogTitle>
              <DialogDescription>
                Atualize dados do jogador, tags operacionais e observacoes internas.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
              {gameConfig.hasValorantLookup ? (
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
              ) : null}

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
                    {gameElos.map((elo) => (
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
                    {gameElos.map((elo) => (
                      <option
                        key={elo}
                        value={elo}
                        disabled={eloScore(elo, gameElos) < eloScore(editForm.elo, gameElos)}
                      >
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
                    {gameFuncoes.map((funcao) => (
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
                    {gameFuncoes.map((funcao) => (
                      <option key={funcao} value={funcao}>
                        {funcao}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Cor de destaque
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "size-3.5 rounded-full border border-border/70",
                        getHighlightColorClass(editForm.highlightColor) || "bg-background",
                      )}
                      style={getHighlightColorStyle(editForm.highlightColor)}
                    />
                    <span className="max-w-[18rem] truncate font-mono">
                      {editForm.highlightColor || "Sem cor"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 xl:grid-cols-10">
                  {HIGHLIGHT_COLOR_OPTIONS.map((color) => {
                    const active =
                      editForm.highlightColor === color.value ||
                      editForm.highlightColor === color.hex;
                    return (
                      <button
                        key={color.value || "none"}
                        type="button"
                        title={color.label}
                        aria-label={color.label}
                        onClick={() => updateEditForm("highlightColor", color.hex || "")}
                        className={cn(
                          "aspect-square rounded-full border p-0.5 transition-colors",
                          active
                            ? cn("border-primary ring-2 ring-primary/30", color.rowClassName)
                            : "border-border/70 bg-background/70 hover:scale-105 hover:bg-muted/80",
                        )}
                      >
                        <span
                          className={cn(
                            "block size-full rounded-full border border-border/70",
                            color.swatchClassName,
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-background p-3">
                    <HexColorPicker
                      color={getHighlightColorPickerValue(editForm.highlightColor)}
                      onChange={(value) => updateEditForm("highlightColor", value)}
                      style={{ width: "100%", height: 160 }}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <label className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">Cor livre</span>
                      <HexColorInput
                        color={getHighlightColorPickerValue(editForm.highlightColor)}
                        onChange={(value) => updateEditForm("highlightColor", value)}
                        prefixed
                        className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full md:w-auto"
                      onClick={() => updateEditForm("highlightColor", "")}
                    >
                      Limpar cor
                    </Button>
                  </div>
                </div>
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
                <Textarea
                  value={editForm.observacoes}
                  onChange={(e) => updateEditForm("observacoes", e.target.value)}
                  placeholder="Preferencias, restricoes, status de contato ou qualquer nota interna..."
                  className="min-h-24"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Cidade</span>
                  <Input
                    value={editForm.cidade}
                    onChange={(e) => updateEditForm("cidade", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Dias/semana</span>
                  <Input
                    value={editForm.diasTreino}
                    onChange={(e) => updateEditForm("diasTreino", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Dias exatos</span>
                  <Input
                    value={editForm.diasSemana}
                    onChange={(e) => updateEditForm("diasSemana", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Horários</span>
                  <Input
                    value={editForm.horariosTreino}
                    onChange={(e) => updateEditForm("horariosTreino", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Melhor janela</span>
                  <Input
                    value={editForm.melhorJanela}
                    onChange={(e) => updateEditForm("melhorJanela", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Compromisso</span>
                  <Input
                    value={editForm.compromisso}
                    onChange={(e) => updateEditForm("compromisso", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Rotina fixa</span>
                  <Input
                    value={editForm.rotinaFixa}
                    onChange={(e) => updateEditForm("rotinaFixa", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Horários definidos</span>
                  <Input
                    value={editForm.horariosDefinidos}
                    onChange={(e) => updateEditForm("horariosDefinidos", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Capitão</span>
                  <Input
                    value={editForm.capitao}
                    onChange={(e) => updateEditForm("capitao", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Presencial</span>
                  <Input
                    value={editForm.presencial}
                    onChange={(e) => updateEditForm("presencial", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Deslocamento</span>
                  <Input
                    value={editForm.deslocamento}
                    onChange={(e) => updateEditForm("deslocamento", e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Contato</span>
                  <Input
                    value={editForm.autorizacaoContato}
                    onChange={(e) => updateEditForm("autorizacaoContato", e.target.value)}
                  />
                </label>
              </div>
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
                Esta acao remove {deleteTarget.nick} da base de {gameConfig.label} e tambem tira o jogador de qualquer time.
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
