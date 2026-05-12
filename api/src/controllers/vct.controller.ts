import { execFile } from "node:child_process";
import type { Request, Response } from "express";
import { VctInscricao } from "../models/VctInscricao";
import { VctTime } from "../models/VctTime";
import {
  VCT_INSCRICAO_STATUS,
  normalizeVctInscricaoStatus,
  type VctInscricaoStatus,
} from "../lib/vct-inscricao-status";
import {
  getFormationFiltersByTeamFromBody,
  getFormationFiltersFromBody,
  getEloScore as scoreElo,
  getFormationDetailScore,
  pickBestCandidateForTeam,
  pickBestTeamForPlayer,
  type VctFormationFilters,
  type VctInscricaoLike,
  type VctTeamCandidate,
  type VctTeamState,
} from "../lib/vct-team-formation";

const CAMPO_LABEL: Record<string, string> = {
  nick: "Nick",
  email: "Email",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

const MODALIDADES = ["valorant", "counter-strike", "lol"] as const;
type Modalidade = (typeof MODALIDADES)[number];

function normalizeModalidade(value: unknown): Modalidade {
  return MODALIDADES.includes(value as Modalidade) ? (value as Modalidade) : "valorant";
}

function getModalidadeFromRequest(req: Request) {
  return normalizeModalidade(req.query?.modalidade ?? req.body?.modalidade);
}

function getModalidadeFilter(req: Request) {
  const modalidade = getModalidadeFromRequest(req);

  if (modalidade === "valorant") {
    return {
      $or: [
        { modalidade },
        { modalidade: { $exists: false } },
      ],
    };
  }

  return { modalidade };
}

const REQUIRED_EDIT_INSCRICAO_FIELDS = [
  "nome",
  "nick",
  "email",
  "whatsapp",
  "elo",
  "pico",
  "funcaoPrimaria",
  "funcaoSecundaria",
] as const;

const CREATE_REQUIRED_INSCRICAO_FIELDS = [
  ...REQUIRED_EDIT_INSCRICAO_FIELDS,
  "cidade",
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
] as const;

const OPTIONAL_INSCRICAO_FIELDS = [
  "cidade",
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
  "riotName",
  "riotTag",
  "riotPuuid",
  "valorantRegion",
  "valorantAccountLevel",
  "valorantCardSmall",
  "valorantCardWide",
  "valorantCurrentRank",
  "valorantPeakRank",
  "tags",
  "observacoes",
  "highlightColor",
  "status",
  "time",
] as const;

const VALORANT_ELO_ORDER = [
  "Sem elo",
  "Ferro",
  "Ferro 1",
  "Ferro 2",
  "Ferro 3",
  "Bronze",
  "Bronze 1",
  "Bronze 2",
  "Bronze 3",
  "Prata",
  "Prata 1",
  "Prata 2",
  "Prata 3",
  "Ouro",
  "Ouro 1",
  "Ouro 2",
  "Ouro 3",
  "Platina",
  "Platina 1",
  "Platina 2",
  "Platina 3",
  "Diamante",
  "Diamante 1",
  "Diamante 2",
  "Diamante 3",
  "Ascendente",
  "Ascendente 1",
  "Ascendente 2",
  "Ascendente 3",
  "Imortal",
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

const ELO_ORDER_BY_MODALIDADE: Record<Modalidade, readonly string[]> = {
  valorant: VALORANT_ELO_ORDER,
  "counter-strike": COUNTER_STRIKE_ELO_ORDER,
  lol: LOL_ELO_ORDER,
};

function getEloScore(value: string, modalidade: Modalidade = "valorant") {
  const order = ELO_ORDER_BY_MODALIDADE[modalidade];
  return Object.fromEntries(order.map((item, index) => [item, index]))[value] ?? -1;
}

function buildTeamState(inscricoes: VctInscricaoLike[], numero: number): VctTeamState {
  const TIME_CAP = 5;
  const members = inscricoes.filter((i) => i.time === numero);
  return {
    members,
    memberCount: members.length,
    eloSum: members.reduce((acc, m) => acc + scoreElo(m.elo), 0),
    vacancies: TIME_CAP - members.length,
  };
}

function isValidTeamNumber(numero: number) {
  return Number.isInteger(numero) && numero >= 1;
}

function isPicoBelowElo(elo: string, pico: string, modalidade: Modalidade = "valorant") {
  return getEloScore(pico, modalidade) < getEloScore(elo, modalidade);
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeStatusField(value: unknown) {
  return normalizeVctInscricaoStatus(value);
}

function isActiveInscricao(inscricao: VctInscricaoLike & { status?: unknown }) {
  return normalizeVctInscricaoStatus(inscricao.status) === VCT_INSCRICAO_STATUS.ACTIVE;
}

function duplicateFieldMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error && (error as { code: number }).code === 11000) {
    const key = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})[0];
    const label = key ? CAMPO_LABEL[key] ?? key : "Campo";
    return `${label} ja cadastrado.`;
  }
  return null;
}

function parseRiotId(value: unknown) {
  if (typeof value !== "string") return null;

  const [name, ...tagParts] = value.split("#");
  const tag = tagParts.join("#");

  if (!name?.trim() || !tag?.trim()) return null;

  return {
    name: name.trim(),
    tag: tag.trim(),
  };
}

type HenrikAccountResponse = {
  status?: number;
  data?: {
    puuid?: string;
    name?: string;
    tag?: string;
    region?: string;
    account_level?: number;
    card?: {
      small?: string;
      large?: string;
      wide?: string;
      id?: string;
    };
  };
  errors?: Array<{ message?: string }>;
};

type HenrikHttpResponse = {
  status: number;
  ok: boolean;
  payload: HenrikAccountResponse | null;
};

function parseJsonSafely(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

async function fetchWithNodeFallback(endpoint: string, apiKey: string | undefined): Promise<HenrikHttpResponse> {
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = apiKey;

  try {
    const response = await fetch(endpoint, { headers });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as HenrikAccountResponse | null)
      : null;

    return {
      status: response.status,
      ok: response.ok,
      payload,
    };
  } catch {
    const script = `
      const endpoint = process.argv[1];
      const headers = {};
      if (process.env.HENRIK_AUTH) headers.Authorization = process.env.HENRIK_AUTH;
      try {
        const response = await fetch(endpoint, { headers });
        const contentType = response.headers.get("content-type") || "";
        const body = await response.text();
        console.log(JSON.stringify({ status: response.status, ok: response.ok, contentType, body }));
      } catch (error) {
        console.error(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
        process.exit(1);
      }
    `;

    const result = await new Promise<{ status: number; ok: boolean; contentType: string; body: string }>((resolve, reject) => {
      execFile(
        "node",
        ["--input-type=module", "-e", script, endpoint],
        {
          env: {
            ...process.env,
            HENRIK_AUTH: apiKey ?? "",
          },
          timeout: 15000,
          maxBuffer: 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (error) {
            const details = parseJsonSafely(stderr.trim());
            reject(
              new Error(
                typeof details === "object" && details && "message" in details
                  ? String((details as { message: unknown }).message)
                  : error.message,
              ),
            );
            return;
          }

          const parsed = parseJsonSafely(stdout.trim());
          if (!parsed || typeof parsed !== "object") {
            reject(new Error("Resposta invalida do fallback Node."));
            return;
          }

          resolve(parsed as { status: number; ok: boolean; contentType: string; body: string });
        },
      );
    });

    return {
      status: result.status,
      ok: result.ok,
      payload: result.contentType.includes("application/json")
        ? (parseJsonSafely(result.body) as HenrikAccountResponse | null)
        : null,
    };
  }
}

export async function criarInscricao(req: Request, res: Response) {
  const modalidade = getModalidadeFromRequest(req);
  const {
    nome,
    nick,
    email,
    whatsapp,
    instagram,
    cidade,
    elo,
    pico,
    funcaoPrimaria,
    funcaoSecundaria,
    diasTreino,
    diasSemana,
    horariosTreino,
    melhorJanela,
    compromisso,
    rotinaFixa,
    horariosDefinidos,
    capitao,
    presencial,
    deslocamento,
    autorizacaoContato,
    riotName,
    riotTag,
    riotPuuid,
    valorantRegion,
    valorantAccountLevel,
    valorantCardSmall,
    valorantCardWide,
    valorantCurrentRank,
    valorantPeakRank,
  } = req.body;

  for (const field of CREATE_REQUIRED_INSCRICAO_FIELDS) {
    const value = req.body[field];
    if (typeof value !== "string" || value.trim() === "") {
      res.status(400).json({ ok: false, message: "Todos os campos são obrigatórios." });
      return;
    }
  }

  if (getEloScore(elo.trim(), modalidade) < 0 || getEloScore(pico.trim(), modalidade) < 0) {
    res.status(400).json({ ok: false, message: "Elo inválido." });
    return;
  }

  if (isPicoBelowElo(elo.trim(), pico.trim(), modalidade)) {
    res.status(400).json({ ok: false, message: "O pico de elo não pode ser menor que o elo atual." });
    return;
  }

  try {
    const inscricao = new VctInscricao({
      modalidade,
      nome: nome.trim(),
      nick: nick.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
      instagram: typeof instagram === "string" ? instagram.trim() : "",
      cidade: cidade.trim(),
      elo: elo.trim(),
      pico: pico.trim(),
      funcaoPrimaria: funcaoPrimaria.trim(),
      funcaoSecundaria: funcaoSecundaria.trim(),
      diasTreino: diasTreino.trim(),
      diasSemana: diasSemana.trim(),
      horariosTreino: horariosTreino.trim(),
      melhorJanela: melhorJanela.trim(),
      compromisso: compromisso.trim(),
      rotinaFixa: rotinaFixa.trim(),
      horariosDefinidos: horariosDefinidos.trim(),
      capitao: capitao.trim(),
      presencial: presencial.trim(),
      deslocamento: deslocamento.trim(),
      autorizacaoContato: autorizacaoContato.trim(),
      riotName: typeof riotName === "string" ? riotName.trim() : "",
      riotTag: typeof riotTag === "string" ? riotTag.trim() : "",
      riotPuuid: typeof riotPuuid === "string" ? riotPuuid.trim() : "",
      valorantRegion: typeof valorantRegion === "string" ? valorantRegion.trim() : "",
      valorantAccountLevel: typeof valorantAccountLevel === "number" ? valorantAccountLevel : null,
      valorantCardSmall: typeof valorantCardSmall === "string" ? valorantCardSmall.trim() : "",
      valorantCardWide: typeof valorantCardWide === "string" ? valorantCardWide.trim() : "",
      valorantCurrentRank: typeof valorantCurrentRank === "string" ? valorantCurrentRank.trim() : "",
      valorantPeakRank: typeof valorantPeakRank === "string" ? valorantPeakRank.trim() : "",
      status: VCT_INSCRICAO_STATUS.ACTIVE,
    });
    await inscricao.save();
    res.status(201).json({ ok: true, message: "Inscrição realizada com sucesso.", id: inscricao._id });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: number }).code === 11000) {
      const key = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})[0];
      const label = key ? CAMPO_LABEL[key] ?? key : "Campo";
      res.status(409).json({ ok: false, message: `${label} já cadastrado.` });
      return;
    }
    throw error;
  }
}

export async function listarInscricoes(req: Request, res: Response) {
  const inscricoes = await VctInscricao.find(getModalidadeFilter(req)).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, inscricoes });
}

export async function buscarContaValorant(req: Request, res: Response) {
  const riotId = parseRiotId(req.body.riotId);

  if (!riotId) {
    res.status(400).json({ ok: false, message: "Informe o Riot ID no formato Nome#TAG." });
    return;
  }

  const endpoint = `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(riotId.name)}/${encodeURIComponent(riotId.tag)}`;
  const apiKey =
    process.env.HENRIKDEV_API_KEY?.trim() ||
    process.env.HENRIKDEV_API_DEV?.trim();

  let henrikResponse: HenrikHttpResponse;

  try {
    henrikResponse = await fetchWithNodeFallback(endpoint, apiKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida.";
    res.status(502).json({
      ok: false,
      message: `Nao foi possivel conectar na HenrikDev agora. ${message}`,
    });
    return;
  }

  if (!henrikResponse.ok || !henrikResponse.payload?.data) {
    const message =
      henrikResponse.payload?.errors?.[0]?.message ||
      (henrikResponse.status >= 500
        ? "HenrikDev indisponivel no momento."
        : "Nao foi possivel encontrar essa conta na HenrikDev.");
    res.status(henrikResponse.ok ? 404 : henrikResponse.status).json({ ok: false, message });
    return;
  }

  const account = henrikResponse.payload.data;

  res.json({
    ok: true,
    account: {
      riotName: account.name || riotId.name,
      riotTag: account.tag || riotId.tag,
      riotPuuid: account.puuid || "",
      region: account.region || "",
      accountLevel: account.account_level ?? null,
      card: account.card ?? null,
    },
  });
}

export async function atualizarInscricao(req: Request, res: Response) {
  const { id } = req.params;
  const modalidade = getModalidadeFromRequest(req);
  const update: Record<string, unknown> = {};

  for (const field of REQUIRED_EDIT_INSCRICAO_FIELDS) {
    const value = req.body[field];
    if (typeof value !== "string" || value.trim() === "") {
      res.status(400).json({ ok: false, message: "Todos os campos principais sao obrigatorios." });
      return;
    }
    update[field] = value.trim();
  }

  update.email = String(update.email).toLowerCase();
  update.modalidade = modalidade;
  if (typeof req.body.instagram === "string") update.instagram = req.body.instagram.trim();
  for (const field of OPTIONAL_INSCRICAO_FIELDS) {
    const value = req.body[field];
    if (field === "cidade") {
      if (typeof value === "string") update[field] = value.trim();
      continue;
    }
    if (field === "valorantAccountLevel") {
      if (value === null || typeof value === "number") update[field] = value;
      continue;
    }
    if (field === "tags") {
      update[field] = normalizeTags(value);
      continue;
    }
    if (field === "time") {
      if (value === null || typeof value === "number") update[field] = value;
      continue;
    }
    if (typeof value === "string") {
      update[field] = value.trim();
    }
  }
  update.tags = normalizeTags(req.body.tags);
  update.observacoes = typeof req.body.observacoes === "string" ? req.body.observacoes.trim() : "";
  update.highlightColor = typeof req.body.highlightColor === "string" ? req.body.highlightColor.trim() : "";
  update.status = normalizeStatusField(req.body.status);

  if (getEloScore(String(update.elo), modalidade) < 0 || getEloScore(String(update.pico), modalidade) < 0) {
    res.status(400).json({ ok: false, message: "Elo inválido." });
    return;
  }

  if (isPicoBelowElo(String(update.elo), String(update.pico), modalidade)) {
    res.status(400).json({ ok: false, message: "O pico de elo não pode ser menor que o elo atual." });
    return;
  }

  try {
    const inscricao = await VctInscricao.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!inscricao) {
      res.status(404).json({ ok: false, message: "Inscricao nao encontrada." });
      return;
    }

    res.json({ ok: true, inscricao });
  } catch (error: unknown) {
    const duplicateMessage = duplicateFieldMessage(error);
    if (duplicateMessage) {
      res.status(409).json({ ok: false, message: duplicateMessage });
      return;
    }
    throw error;
  }
}

export async function removerInscricao(req: Request, res: Response) {
  const { id } = req.params;
  const inscricao = await VctInscricao.findByIdAndDelete(id).lean();

  if (!inscricao) {
    res.status(404).json({ ok: false, message: "Inscricao nao encontrada." });
    return;
  }

  res.json({ ok: true, removida: id });
}

export async function atualizarTime(req: Request, res: Response) {
  const { id } = req.params;
  const { time } = req.body;

  if (time !== null && (typeof time !== "number" || !isValidTeamNumber(time))) {
    res.status(400).json({
      ok: false,
      message: "Time inválido. Use um número inteiro positivo ou null.",
    });
    return;
  }

  const inscricao = await VctInscricao.findByIdAndUpdate(id, { time }, { new: true }).lean();
  if (!inscricao) {
    res.status(404).json({ ok: false, message: "Inscrição não encontrada." });
    return;
  }

  res.json({ ok: true, inscricao });
}

function normalizeIdList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function atualizarStatusInterno(ids: string[], status: VctInscricaoStatus) {
  const update: Record<string, unknown> = { status };
  if (status === VCT_INSCRICAO_STATUS.INACTIVE) {
    update.time = null;
  }

  return VctInscricao.updateMany({ _id: { $in: ids } }, update);
}

export async function atualizarStatusInscricao(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ ok: false, message: "Inscricao invalida." });
    return;
  }
  const status = normalizeStatusField(req.body.status);
  const result = await atualizarStatusInterno([id], status);
  res.json({ ok: true, atualizados: result.modifiedCount ?? 0, status });
}

export async function atualizarStatusInscricoes(req: Request, res: Response) {
  const ids = normalizeIdList(req.body.ids);
  if (ids.length === 0) {
    res.status(400).json({ ok: false, message: "Selecione pelo menos uma inscrição." });
    return;
  }

  const status = normalizeStatusField(req.body.status);
  const result = await atualizarStatusInterno(ids, status);
  res.json({ ok: true, atualizados: result.modifiedCount ?? 0, status });
}

export async function listarTimes(req: Request, res: Response) {
  const times = await VctTime.find(getModalidadeFilter(req)).sort({ numero: 1 }).lean();
  res.json({ ok: true, times });
}

export async function atualizarNomeTime(req: Request, res: Response) {
  const modalidade = getModalidadeFromRequest(req);
  const numero = Number(req.params.numero);
  const { nome } = req.body;

  if (!isValidTeamNumber(numero)) {
    res.status(400).json({ ok: false, message: "Número do time inválido." });
    return;
  }
  if (typeof nome !== "string") {
    res.status(400).json({ ok: false, message: "Nome inválido." });
    return;
  }

  const time = await VctTime.findOneAndUpdate(
    { modalidade, numero },
    { modalidade, nome: nome.trim() },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  res.json({ ok: true, time });
}

export async function preencherTime(req: Request, res: Response) {
  const TIME_CAP = 5;

  const numero = Number(req.params.numero);
  if (!isValidTeamNumber(numero)) {
    res.status(400).json({ ok: false, message: "Número do time inválido." });
    return;
  }

  const inscricoes = await VctInscricao.find(getModalidadeFilter(req)).lean();
  const jogadores = (inscricoes as unknown as Array<VctInscricaoLike & { status?: unknown }>).filter(isActiveInscricao);
  const filters = getFormationFiltersFromBody(req.body) as VctFormationFilters;
  const team = buildTeamState(jogadores, numero);
  const { vacancies } = team;

  if (vacancies <= 0) {
    res.json({ ok: true, atribuidos: 0, message: "Time já está cheio." });
    return;
  }

  const unassigned = jogadores.filter((i) => i.time === null || i.time === undefined);
  const chosen: VctInscricaoLike[] = [];
  let currentTeam: VctTeamState = team;
  let remaining = [...unassigned];

  while (chosen.length < vacancies) {
    const best = pickBestCandidateForTeam(remaining, currentTeam, filters);
    if (!best) break;

    chosen.push(best);
    remaining = remaining.filter((item) => String(item._id) !== String(best._id));
    currentTeam = {
      ...currentTeam,
      members: [...currentTeam.members, best],
      memberCount: currentTeam.memberCount + 1,
      eloSum: currentTeam.eloSum + scoreElo(best.elo),
      vacancies: currentTeam.vacancies - 1,
    };
  }

  await Promise.all(
    chosen.map((p) => VctInscricao.updateOne({ _id: String(p._id) }, { time: numero })),
  );

  res.json({ ok: true, atribuidos: chosen.length });
}

export async function limparTime(req: Request, res: Response) {
  const modalidade = getModalidadeFromRequest(req);
  const numero = Number(req.params.numero);
  if (!isValidTeamNumber(numero)) {
    res.status(400).json({ ok: false, message: "Número do time inválido." });
    return;
  }

  const result = await VctInscricao.updateMany({ modalidade, time: numero }, { time: null });
  res.json({ ok: true, removidos: result.modifiedCount });
}

export async function atribuirTimesAutomatico(req: Request, res: Response) {
  const TIME_CAP = 5;
  const teamFilters = getFormationFiltersByTeamFromBody(req.body);

  const inscricoes = await VctInscricao.find(getModalidadeFilter(req)).lean();
  const jogadores = (inscricoes as unknown as Array<VctInscricaoLike & { status?: unknown }>).filter(isActiveInscricao);
  const hasSoftFilters = Object.values(teamFilters).some(
    (filters) => filters.sameTrainingDays || filters.sameAvailability,
  );
  const unassigned = jogadores
    .filter((i) => i.time === null || i.time === undefined)
    .sort((a, b) => {
      if (hasSoftFilters) {
        const detailDiff = getFormationDetailScore(b) - getFormationDetailScore(a);
        if (detailDiff !== 0) return detailDiff;
      }
      return scoreElo(b.elo) - scoreElo(a.elo);
    });

  const knownTimes = new Set<number>();
  for (const player of jogadores) {
    if (typeof player.time === "number" && isValidTeamNumber(player.time)) {
      knownTimes.add(player.time);
    }
  }
  for (const time of await VctTime.find(getModalidadeFilter(req)).select("numero").lean()) {
    if (isValidTeamNumber(time.numero)) {
      knownTimes.add(time.numero);
    }
  }

  const maxTeamNumber = Math.max(knownTimes.size > 0 ? Math.max(...knownTimes) : 0, 1);
  const defaultFilters = getFormationFiltersFromBody({});
  const teams = Array.from({ length: maxTeamNumber }, (_, idx) => {
    const numero = idx + 1;
    return {
      numero,
      ...buildTeamState(jogadores, numero),
      filters: teamFilters[numero] ?? defaultFilters,
    } satisfies VctTeamCandidate;
  });

  const assignments: { id: string; time: number }[] = [];

  for (const player of unassigned) {
    const available = teams.filter((t) => t.vacancies > 0);
    if (available.length === 0) break;

    const playerScore = scoreElo(player.elo);
    const target = pickBestTeamForPlayer(player, available as VctTeamCandidate[]);

    if (!target) break;
    assignments.push({ id: String(player._id), time: target.numero });
    target.members = [...target.members, player];
    target.vacancies -= 1;
    target.memberCount += 1;
    target.eloSum += playerScore;
  }

  await Promise.all(
    assignments.map((a) =>
      VctInscricao.updateOne({ _id: a.id }, { time: a.time }),
    ),
  );

  res.json({ ok: true, atribuidos: assignments.length });
}
