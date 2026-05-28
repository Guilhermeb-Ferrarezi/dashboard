import { execFile } from "node:child_process";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";
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

function getSingleTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

function getModalidadeFromContext(c: Context<AppEnv>, body?: Record<string, unknown>) {
  return normalizeModalidade(
    getSingleTextValue(c.req.query("modalidade") ?? body?.modalidade)
  );
}

function getModalidadeFilter(modalidade: Modalidade) {
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

export async function criarInscricao(c: Context<AppEnv>): Promise<Response> {
  const body = await c.req.json();
  const modalidade = getModalidadeFromContext(c, body);
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
  } = body;

  for (const field of CREATE_REQUIRED_INSCRICAO_FIELDS) {
    const value = body[field];
    if (typeof value !== "string" || value.trim() === "") {
      return c.json({ ok: false, message: "Todos os campos são obrigatórios." }, 400);
    }
  }

  if (getEloScore(elo.trim(), modalidade) < 0 || getEloScore(pico.trim(), modalidade) < 0) {
    return c.json({ ok: false, message: "Elo inválido." }, 400);
  }

  if (isPicoBelowElo(elo.trim(), pico.trim(), modalidade)) {
    return c.json({ ok: false, message: "O pico de elo não pode ser menor que o elo atual." }, 400);
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
    return c.json({ ok: true, message: "Inscrição realizada com sucesso.", id: inscricao._id }, 201);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: number }).code === 11000) {
      const key = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})[0];
      const label = key ? CAMPO_LABEL[key] ?? key : "Campo";
      return c.json({ ok: false, message: `${label} já cadastrado.` }, 409);
    }
    throw error;
  }
}

export async function listarInscricoes(c: Context<AppEnv>): Promise<Response> {
  const modalidade = getModalidadeFromContext(c);
  const inscricoes = await VctInscricao.find(getModalidadeFilter(modalidade)).sort({ createdAt: -1 }).lean();
  return c.json({ ok: true, inscricoes });
}

export async function buscarContaValorant(c: Context<AppEnv>): Promise<Response> {
  const body = await c.req.json();
  const riotId = parseRiotId(body.riotId);

  if (!riotId) {
    return c.json({ ok: false, message: "Informe o Riot ID no formato Nome#TAG." }, 400);
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
    return c.json({
      ok: false,
      message: `Nao foi possivel conectar na HenrikDev agora. ${message}`,
    }, 502);
  }

  if (!henrikResponse.ok || !henrikResponse.payload?.data) {
    const message =
      henrikResponse.payload?.errors?.[0]?.message ||
      (henrikResponse.status >= 500
        ? "HenrikDev indisponivel no momento."
        : "Nao foi possivel encontrar essa conta na HenrikDev.");
    return c.json({ ok: false, message }, henrikResponse.ok ? 404 : henrikResponse.status as any);
  }

  const account = henrikResponse.payload.data;

  return c.json({
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

export async function atualizarInscricao(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param("id");
  const body = await c.req.json();
  const modalidade = getModalidadeFromContext(c, body);
  const update: Record<string, unknown> = {};

  for (const field of REQUIRED_EDIT_INSCRICAO_FIELDS) {
    const value = body[field];
    if (typeof value !== "string" || value.trim() === "") {
      return c.json({ ok: false, message: "Todos os campos principais sao obrigatorios." }, 400);
    }
    update[field] = value.trim();
  }

  update.email = String(update.email).toLowerCase();
  update.modalidade = modalidade;
  if (typeof body.instagram === "string") update.instagram = body.instagram.trim();
  for (const field of OPTIONAL_INSCRICAO_FIELDS) {
    const value = body[field];
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
  update.tags = normalizeTags(body.tags);
  update.observacoes = typeof body.observacoes === "string" ? body.observacoes.trim() : "";
  update.highlightColor = typeof body.highlightColor === "string" ? body.highlightColor.trim() : "";
  update.status = normalizeStatusField(getSingleTextValue(body.status));

  if (getEloScore(String(update.elo), modalidade) < 0 || getEloScore(String(update.pico), modalidade) < 0) {
    return c.json({ ok: false, message: "Elo inválido." }, 400);
  }

  if (isPicoBelowElo(String(update.elo), String(update.pico), modalidade)) {
    return c.json({ ok: false, message: "O pico de elo não pode ser menor que o elo atual." }, 400);
  }

  try {
    const inscricao = await VctInscricao.findByIdAndUpdate(id, update, {
      new: true,
    }).lean();

    if (!inscricao) {
      return c.json({ ok: false, message: "Inscricao nao encontrada." }, 404);
    }

    return c.json({ ok: true, inscricao });
  } catch (error: unknown) {
    const duplicateMessage = duplicateFieldMessage(error);
    if (duplicateMessage) {
      return c.json({ ok: false, message: duplicateMessage }, 409);
    }
    throw error;
  }
}

export async function removerInscricao(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param("id");
  const inscricao = await VctInscricao.findByIdAndDelete(id).lean();

  if (!inscricao) {
    return c.json({ ok: false, message: "Inscricao nao encontrada." }, 404);
  }

  return c.json({ ok: true, removida: id });
}

export async function atualizarTime(c: Context<AppEnv>): Promise<Response> {
  const id = c.req.param("id");
  const body = await c.req.json();
  const { time } = body;

  if (time !== null && (typeof time !== "number" || !isValidTeamNumber(time))) {
    return c.json({
      ok: false,
      message: "Time inválido. Use um número inteiro positivo ou null.",
    }, 400);
  }

  const inscricao = await VctInscricao.findByIdAndUpdate(id, { time }, { new: true }).lean();
  if (!inscricao) {
    return c.json({ ok: false, message: "Inscrição não encontrada." }, 404);
  }

  return c.json({ ok: true, inscricao });
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

export async function atualizarStatusInscricao(c: Context<AppEnv>): Promise<Response> {
  const id = getSingleTextValue(c.req.param("id"));
  if (!id) {
    return c.json({ ok: false, message: "Inscricao invalida." }, 400);
  }
  const body = await c.req.json();
  const rawStatus = body.status;
  const result = await atualizarStatusInterno(
    [id],
    rawStatus === VCT_INSCRICAO_STATUS.INACTIVE
      ? VCT_INSCRICAO_STATUS.INACTIVE
      : VCT_INSCRICAO_STATUS.ACTIVE,
  );
  return c.json({
    ok: true,
    atualizados: result.modifiedCount ?? 0,
    status:
      rawStatus === VCT_INSCRICAO_STATUS.INACTIVE
        ? VCT_INSCRICAO_STATUS.INACTIVE
        : VCT_INSCRICAO_STATUS.ACTIVE,
  });
}

export async function atualizarStatusInscricoes(c: Context<AppEnv>): Promise<Response> {
  const body = await c.req.json();
  const ids = normalizeIdList(body.ids);
  if (ids.length === 0) {
    return c.json({ ok: false, message: "Selecione pelo menos uma inscrição." }, 400);
  }

  const rawStatus = body.status;
  const status =
    rawStatus === VCT_INSCRICAO_STATUS.INACTIVE
      ? VCT_INSCRICAO_STATUS.INACTIVE
      : VCT_INSCRICAO_STATUS.ACTIVE;
  const result = await atualizarStatusInterno(ids, status);
  return c.json({ ok: true, atualizados: result.modifiedCount ?? 0, status });
}

export async function listarTimes(c: Context<AppEnv>): Promise<Response> {
  const modalidade = getModalidadeFromContext(c);
  const times = await VctTime.find(getModalidadeFilter(modalidade)).sort({ numero: 1 }).lean();
  return c.json({ ok: true, times });
}

export async function atualizarNomeTime(c: Context<AppEnv>): Promise<Response> {
  const body = await c.req.json();
  const modalidade = getModalidadeFromContext(c, body);
  const numero = Number(c.req.param("numero"));
  const { nome } = body;

  if (!isValidTeamNumber(numero)) {
    return c.json({ ok: false, message: "Número do time inválido." }, 400);
  }
  if (typeof nome !== "string") {
    return c.json({ ok: false, message: "Nome inválido." }, 400);
  }

  const time = await VctTime.findOneAndUpdate(
    { modalidade, numero },
    { modalidade, nome: nome.trim() },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return c.json({ ok: true, time });
}

export async function preencherTime(c: Context<AppEnv>): Promise<Response> {
  const TIME_CAP = 5;

  const numero = Number(c.req.param("numero"));
  if (!isValidTeamNumber(numero)) {
    return c.json({ ok: false, message: "Número do time inválido." }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const modalidade = getModalidadeFromContext(c, body);
  const inscricoes = await VctInscricao.find(getModalidadeFilter(modalidade)).lean();
  const jogadores = (inscricoes as unknown as Array<VctInscricaoLike & { status?: unknown }>).filter(isActiveInscricao);
  const filters = getFormationFiltersFromBody(body) as VctFormationFilters;
  const team = buildTeamState(jogadores, numero);
  const { vacancies } = team;

  if (vacancies <= 0) {
    return c.json({ ok: true, atribuidos: 0, message: "Time já está cheio." });
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

  if (chosen.length > 0) {
    await VctInscricao.updateMany(
      { _id: { $in: chosen.map((p) => String(p._id)) } },
      { time: numero },
    );
  }

  return c.json({ ok: true, atribuidos: chosen.length });
}

export async function limparTime(c: Context<AppEnv>): Promise<Response> {
  const body = await c.req.json().catch(() => ({}));
  const modalidade = getModalidadeFromContext(c, body);
  const numero = Number(c.req.param("numero"));
  if (!isValidTeamNumber(numero)) {
    return c.json({ ok: false, message: "Número do time inválido." }, 400);
  }

  const result = await VctInscricao.updateMany({ modalidade, time: numero }, { time: null });
  return c.json({ ok: true, removidos: result.modifiedCount });
}

export async function removerTime(c: Context<AppEnv>): Promise<Response> {
  const body = await c.req.json().catch(() => ({}));
  const modalidade = getModalidadeFromContext(c, body);
  const numero = Number(c.req.param("numero"));

  if (!isValidTeamNumber(numero)) {
    return c.json({ ok: false, message: "Número do time inválido." }, 400);
  }

  const occupied = await VctInscricao.exists({ modalidade, time: numero });
  if (occupied) {
    return c.json({
      ok: false,
      message: "Limpe o time antes de removê-lo.",
    }, 409);
  }

  const result = await VctTime.findOneAndDelete({ modalidade, numero }).lean();

  if (!result) {
    return c.json({ ok: false, message: "Time não encontrado." }, 404);
  }

  return c.json({ ok: true, removido: numero });
}

export async function atribuirTimesAutomatico(c: Context<AppEnv>): Promise<Response> {
  const TIME_CAP = 5;
  const body = await c.req.json().catch(() => ({}));
  const teamFilters = getFormationFiltersByTeamFromBody(body);
  const modalidade = getModalidadeFromContext(c, body);

  const inscricoes = await VctInscricao.find(getModalidadeFilter(modalidade)).lean();
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
  for (const time of await VctTime.find(getModalidadeFilter(modalidade)).select("numero").lean()) {
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

  if (assignments.length > 0) {
    await VctInscricao.bulkWrite(
      assignments.map((a) => ({
        updateOne: {
          filter: { _id: a.id },
          update: { $set: { time: a.time } },
        },
      })),
    );
  }

  return c.json({ ok: true, atribuidos: assignments.length });
}
