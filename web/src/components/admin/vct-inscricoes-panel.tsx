"use client";

import { useMemo, useState } from "react";
import {
  CopyIcon,
  CrosshairIcon,
  InboxIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  SearchIcon,
  SparklesIcon,
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

function eloScore(elo: string) {
  return ELO_VALUES[elo] ?? 0;
}

function formatAvg(n: number) {
  return n > 0 ? n.toFixed(1) : "—";
}

function getInstagramHandle(instagram: string) {
  return instagram.startsWith("@") ? instagram : `@${instagram}`;
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
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [pendingTimes, setPendingTimes] = useState<Set<number>>(new Set());
  const [autoPending, setAutoPending] = useState(false);
  const [groupModalTime, setGroupModalTime] = useState<number | null>(null);

  const semTime = useMemo(
    () => inscricoes.filter((i) => i.time === null || i.time === undefined),
    [inscricoes],
  );

  const filteredSemTime = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return semTime;
    return semTime.filter((i) =>
      [i.nome, i.nick, i.email, i.whatsapp, i.instagram, i.elo, i.pico, i.funcaoPrimaria, i.funcaoSecundaria]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, semTime]);

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
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ============ SEÇÃO 1: INSCRITOS SEM TIME ============ */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <InboxIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Inscritos</h2>
              <p className="text-xs text-muted-foreground">
                {semTime.length} jogadores aguardando time · {filteredSemTime.length} exibidos
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nick</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Elo</TableHead>
                      <TableHead>Pico</TableHead>
                      <TableHead>Prim.</TableHead>
                      <TableHead>Sec.</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Instagram</TableHead>
                      <TableHead>Atribuir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSemTime.map((i) => {
                      const isPending = pendingIds.has(i._id);
                      return (
                        <TableRow key={i._id}>
                          <TableCell className="font-medium">{i.nick}</TableCell>
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
                          <TableCell className="font-mono text-xs">{i.whatsapp}</TableCell>
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
                                  isPending && "opacity-70"
                                )}
                              >
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold">
                                      {m.nick}
                                    </span>
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
                                  </div>

                                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
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
                                      {m.whatsapp}
                                    </Badge>
                                  </div>

                                  
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
    </div>
  );
}
