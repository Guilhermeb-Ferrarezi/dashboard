import { execFile } from "node:child_process";
import type { Request, Response } from "express";
import { VctInscricao } from "../models/VctInscricao";
import { VctTime } from "../models/VctTime";

const CAMPO_LABEL: Record<string, string> = {
  nick: "Nick",
  email: "Email",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

const INSCRICAO_FIELDS = [
  "nome",
  "nick",
  "email",
  "whatsapp",
  "elo",
  "pico",
  "funcaoPrimaria",
  "funcaoSecundaria",
] as const;

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
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
  const {
    nome,
    nick,
    email,
    whatsapp,
    instagram,
    elo,
    pico,
    funcaoPrimaria,
    funcaoSecundaria,
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

  if (!nome || !nick || !email || !whatsapp || !elo || !pico || !funcaoPrimaria || !funcaoSecundaria) {
    res.status(400).json({ ok: false, message: "Todos os campos são obrigatórios." });
    return;
  }

  try {
    const inscricao = new VctInscricao({
      nome,
      nick,
      email,
      whatsapp,
      instagram: typeof instagram === "string" ? instagram.trim() : "",
      elo,
      pico,
      funcaoPrimaria,
      funcaoSecundaria,
      riotName: typeof riotName === "string" ? riotName.trim() : "",
      riotTag: typeof riotTag === "string" ? riotTag.trim() : "",
      riotPuuid: typeof riotPuuid === "string" ? riotPuuid.trim() : "",
      valorantRegion: typeof valorantRegion === "string" ? valorantRegion.trim() : "",
      valorantAccountLevel: typeof valorantAccountLevel === "number" ? valorantAccountLevel : null,
      valorantCardSmall: typeof valorantCardSmall === "string" ? valorantCardSmall.trim() : "",
      valorantCardWide: typeof valorantCardWide === "string" ? valorantCardWide.trim() : "",
      valorantCurrentRank: typeof valorantCurrentRank === "string" ? valorantCurrentRank.trim() : "",
      valorantPeakRank: typeof valorantPeakRank === "string" ? valorantPeakRank.trim() : "",
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

export async function listarInscricoes(_req: Request, res: Response) {
  const inscricoes = await VctInscricao.find().sort({ createdAt: -1 }).lean();
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
  const update: Record<string, unknown> = {};

  for (const field of INSCRICAO_FIELDS) {
    const value = req.body[field];
    if (typeof value !== "string" || value.trim() === "") {
      res.status(400).json({ ok: false, message: "Todos os campos principais sao obrigatorios." });
      return;
    }
    update[field] = value.trim();
  }

  update.email = String(update.email).toLowerCase();
  update.instagram = typeof req.body.instagram === "string" ? req.body.instagram.trim() : "";
  update.riotName = typeof req.body.riotName === "string" ? req.body.riotName.trim() : "";
  update.riotTag = typeof req.body.riotTag === "string" ? req.body.riotTag.trim() : "";
  update.riotPuuid = typeof req.body.riotPuuid === "string" ? req.body.riotPuuid.trim() : "";
  update.valorantRegion = typeof req.body.valorantRegion === "string" ? req.body.valorantRegion.trim() : "";
  update.valorantAccountLevel =
    typeof req.body.valorantAccountLevel === "number" ? req.body.valorantAccountLevel : null;
  update.valorantCardSmall = typeof req.body.valorantCardSmall === "string" ? req.body.valorantCardSmall.trim() : "";
  update.valorantCardWide = typeof req.body.valorantCardWide === "string" ? req.body.valorantCardWide.trim() : "";
  update.valorantCurrentRank =
    typeof req.body.valorantCurrentRank === "string" ? req.body.valorantCurrentRank.trim() : "";
  update.valorantPeakRank = typeof req.body.valorantPeakRank === "string" ? req.body.valorantPeakRank.trim() : "";
  update.tags = normalizeTags(req.body.tags);
  update.observacoes = typeof req.body.observacoes === "string" ? req.body.observacoes.trim() : "";
  update.highlightColor = typeof req.body.highlightColor === "string" ? req.body.highlightColor.trim() : "";

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

  if (time !== null && (typeof time !== "number" || time < 1 || time > 8)) {
    res.status(400).json({ ok: false, message: "Time inválido. Use 1-8 ou null." });
    return;
  }

  const inscricao = await VctInscricao.findByIdAndUpdate(id, { time }, { new: true }).lean();
  if (!inscricao) {
    res.status(404).json({ ok: false, message: "Inscrição não encontrada." });
    return;
  }

  res.json({ ok: true, inscricao });
}

export async function listarTimes(_req: Request, res: Response) {
  const times = await VctTime.find().sort({ numero: 1 }).lean();
  res.json({ ok: true, times });
}

export async function atualizarNomeTime(req: Request, res: Response) {
  const numero = Number(req.params.numero);
  const { nome } = req.body;

  if (!Number.isInteger(numero) || numero < 1 || numero > 8) {
    res.status(400).json({ ok: false, message: "Número do time inválido." });
    return;
  }
  if (typeof nome !== "string") {
    res.status(400).json({ ok: false, message: "Nome inválido." });
    return;
  }

  const time = await VctTime.findOneAndUpdate(
    { numero },
    { nome: nome.trim() },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  res.json({ ok: true, time });
}

export async function preencherTime(req: Request, res: Response) {
  const ELO_VALUES: Record<string, number> = {
    Ferro: 1, Bronze: 2, Prata: 3, Ouro: 4, Platina: 5,
    Diamante: 6, Ascendente: 7, Imortal: 8, Radiante: 9,
  };
  const TIME_CAP = 5;
  const score = (elo: string) => ELO_VALUES[elo] ?? 0;

  const numero = Number(req.params.numero);
  if (!Number.isInteger(numero) || numero < 1 || numero > 8) {
    res.status(400).json({ ok: false, message: "Número do time inválido." });
    return;
  }

  const inscricoes = await VctInscricao.find().lean();
  const members = inscricoes.filter((i) => i.time === numero);
  const vacancies = TIME_CAP - members.length;

  if (vacancies <= 0) {
    res.json({ ok: true, atribuidos: 0, message: "Time já está cheio." });
    return;
  }

  const anchor =
    members.length > 0
      ? members.reduce((acc, m) => acc + score(m.elo), 0) / members.length
      : null;

  const unassigned = inscricoes
    .filter((i) => i.time === null || i.time === undefined)
    .sort((a, b) => {
      if (anchor === null) return score(b.elo) - score(a.elo);
      return Math.abs(score(a.elo) - anchor) - Math.abs(score(b.elo) - anchor);
    });

  const chosen = unassigned.slice(0, vacancies);
  await Promise.all(
    chosen.map((p) => VctInscricao.updateOne({ _id: p._id }, { time: numero })),
  );

  res.json({ ok: true, atribuidos: chosen.length });
}

export async function limparTime(req: Request, res: Response) {
  const numero = Number(req.params.numero);
  if (!Number.isInteger(numero) || numero < 1 || numero > 8) {
    res.status(400).json({ ok: false, message: "Número do time inválido." });
    return;
  }

  const result = await VctInscricao.updateMany({ time: numero }, { time: null });
  res.json({ ok: true, removidos: result.modifiedCount });
}

export async function atribuirTimesAutomatico(_req: Request, res: Response) {
  const ELO_VALUES: Record<string, number> = {
    Ferro: 1, Bronze: 2, Prata: 3, Ouro: 4, Platina: 5,
    Diamante: 6, Ascendente: 7, Imortal: 8, Radiante: 9,
  };
  const TIME_CAP = 5;
  const score = (elo: string) => ELO_VALUES[elo] ?? 0;

  const inscricoes = await VctInscricao.find().lean();
  const unassigned = inscricoes
    .filter((i) => i.time === null || i.time === undefined)
    .sort((a, b) => score(b.elo) - score(a.elo));

  const teams = Array.from({ length: 8 }, (_, idx) => {
    const numero = idx + 1;
    const members = inscricoes.filter((i) => i.time === numero);
    return {
      numero,
      vacancies: TIME_CAP - members.length,
      memberCount: members.length,
      eloSum: members.reduce((acc, m) => acc + score(m.elo), 0),
    };
  });

  const assignments: { id: string; time: number }[] = [];

  for (const player of unassigned) {
    const available = teams.filter((t) => t.vacancies > 0);
    if (available.length === 0) break;

    const playerScore = score(player.elo);
    const withMembers = available.filter((t) => t.memberCount > 0);
    let target: typeof teams[number] | undefined;

    if (withMembers.length > 0) {
      target = withMembers.reduce((best, t) => {
        const avg = t.eloSum / t.memberCount;
        const bestAvg = best.eloSum / best.memberCount;
        return Math.abs(avg - playerScore) < Math.abs(bestAvg - playerScore) ? t : best;
      });

      const avgDiff = Math.abs(target.eloSum / target.memberCount - playerScore);
      const emptyTeam = available.find((t) => t.memberCount === 0);
      if (avgDiff > 1 && emptyTeam) target = emptyTeam;
    } else {
      target = available[0];
    }

    if (!target) break;
    assignments.push({ id: String(player._id), time: target.numero });
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
