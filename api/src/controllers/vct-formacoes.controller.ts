import { randomUUID } from "node:crypto";
import type { Context } from "hono";
import type { AppEnv } from "../types/hono";

import { VctFormacaoJogador } from "../models/VctFormacaoJogador";
import { VctFormacaoTime } from "../models/VctFormacaoTime";
import { deleteVctFormationLogo, uploadVctFormationLogo } from "../lib/vct-r2";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const REQUIRED_PLAYER_FIELDS = ["nome", "email", "instagram", "whatsapp", "nick", "eloAtual", "peakRanking"] as const;
const REQUIRED_PLAYER_LABELS: Record<(typeof REQUIRED_PLAYER_FIELDS)[number], string> = {
  nome: "nome",
  email: "email",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  nick: "nick",
  eloAtual: "elo atual",
  peakRanking: "peak-ranking",
};
const FORMATION_PLAYER_COUNT = 4;
const MODALIDADES = ["valorant", "counter-strike", "lol"] as const;
type Modalidade = (typeof MODALIDADES)[number];

type FormacaoPlayerPayload = {
  nome: string;
  email: string;
  instagram: string;
  whatsapp: string;
  nick: string;
  eloAtual: string;
  peakRanking: string;
};

type FormacaoPayload = {
  time: {
    nome: string;
    tag: string;
  };
  capitao: FormacaoPlayerPayload;
  jogadores: FormacaoPlayerPayload[];
};

type NormalizedFormacaoMember = FormacaoPlayerPayload & {
  modalidade: Modalidade;
  ordem: number;
  papel: "capitao" | "jogador";
};

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeModalidade(value: unknown): Modalidade {
  return MODALIDADES.includes(value as Modalidade) ? (value as Modalidade) : "valorant";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function sanitizeWhatsApp(value: string) {
  return value.replace(/\D/gu, "").slice(0, 11);
}

function isValidNick(value: string) {
  const [name, ...tagParts] = value.split("#");
  const tag = tagParts.join("#");
  return Boolean(name?.trim() && tag?.trim());
}

function getEloOrder() {
  return [
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
}

function getEloScore(value: string) {
  const order = getEloOrder();
  return Object.fromEntries(order.map((item, index) => [item, index]))[value] ?? -1;
}

function parsePayload(value: unknown): FormacaoPayload | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as Partial<FormacaoPayload>;
    if (!parsed?.time || !parsed?.capitao || !Array.isArray(parsed?.jogadores)) return null;
    return parsed as FormacaoPayload;
  } catch {
    return null;
  }
}

function validateFormacaoPayload(payload: FormacaoPayload) {
  const teamName = sanitizeText(payload.time?.nome);
  const teamTag = sanitizeText(payload.time?.tag);

  if (!teamName || !teamTag) {
    return "Nome e tag do time são obrigatórios.";
  }

  if (payload.jogadores.length !== FORMATION_PLAYER_COUNT) {
    return `Informe exatamente ${FORMATION_PLAYER_COUNT} jogadores.`;
  }

  const captainError = validatePlayer(payload.capitao, "Capitão");
  if (captainError) return captainError;

  for (let index = 0; index < payload.jogadores.length; index += 1) {
    const jogador = payload.jogadores[index]!;
    const error = validatePlayer(jogador, `Jogador ${index + 1}`);
    if (error) return error;
  }

  const allMembers = [payload.capitao, ...payload.jogadores];
  const duplicateFields = ["email", "whatsapp", "nick"] as const;
  for (const field of duplicateFields) {
    const values = allMembers.map((member) => sanitizeText(member[field]).toLowerCase());
    if (new Set(values).size !== values.length) {
      return `Existem ${field === "nick" ? "nicks" : field} repetidos na formação.`;
    }
  }

  return null;
}

function normalizeFormacaoMembers(
  payload: FormacaoPayload,
  modalidade: Modalidade,
): NormalizedFormacaoMember[] {
  return [
    {
      modalidade,
      ordem: 0,
      papel: "capitao",
      nome: sanitizeText(payload.capitao.nome),
      email: sanitizeText(payload.capitao.email).toLowerCase(),
      instagram: sanitizeText(payload.capitao.instagram),
      whatsapp: sanitizeWhatsApp(payload.capitao.whatsapp),
      nick: sanitizeText(payload.capitao.nick),
      eloAtual: sanitizeText(payload.capitao.eloAtual),
      peakRanking: sanitizeText(payload.capitao.peakRanking),
    },
    ...payload.jogadores.map((player, index) => ({
      modalidade,
      ordem: index + 1,
      papel: "jogador" as const,
      nome: sanitizeText(player.nome),
      email: sanitizeText(player.email).toLowerCase(),
      instagram: sanitizeText(player.instagram),
      whatsapp: sanitizeWhatsApp(player.whatsapp),
      nick: sanitizeText(player.nick),
      eloAtual: sanitizeText(player.eloAtual),
      peakRanking: sanitizeText(player.peakRanking),
    })),
  ];
}

async function removeFormationDocuments(formacaoTimeId: string, logoKey: string) {
  await VctFormacaoJogador.deleteMany({ formacaoTimeId }).catch(() => null);
  if (logoKey) {
    await deleteVctFormationLogo(logoKey).catch(() => null);
  }
  await VctFormacaoTime.deleteOne({ _id: formacaoTimeId }).catch(() => null);
}

function validatePlayer(player: FormacaoPlayerPayload, label: string) {
  for (const field of REQUIRED_PLAYER_FIELDS) {
    if (!sanitizeText(player[field])) {
      return `${label}: informe ${REQUIRED_PLAYER_LABELS[field]}.`;
    }
  }

  if (!isValidEmail(player.email)) {
    return `${label}: informe um email válido.`;
  }

  if (sanitizeWhatsApp(player.whatsapp).length < 10) {
    return `${label}: informe um WhatsApp válido.`;
  }

  if (!isValidNick(player.nick)) {
    return `${label}: informe o nick no formato Nome#TAG.`;
  }

  if (getEloScore(player.peakRanking) < getEloScore(player.eloAtual)) {
    return `${label}: o peak-ranking não pode ser menor que o elo atual.`;
  }

  return null;
}

export async function criarFormacao(c: Context<AppEnv>): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ ok: false, message: "Falha ao processar o upload." }, 400);
  }

  const logoFile = body["logo"];

  if (!(logoFile instanceof File)) {
    return c.json({ ok: false, message: "Envie um logo em imagem." }, 400);
  }

  if (!logoFile.type.startsWith("image/")) {
    return c.json({ ok: false, message: "A logo precisa ser uma imagem." }, 400);
  }

  if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
    return c.json({ ok: false, message: "A logo precisa ter no máximo 5 MB." }, 400);
  }

  const modalidade = normalizeModalidade(body["modalidade"]);
  const payload = parsePayload(body["payload"]);

  if (!payload) {
    return c.json({ ok: false, message: "Payload da formação inválido." }, 400);
  }

  const validationError = validateFormacaoPayload(payload);
  if (validationError) {
    return c.json({ ok: false, message: validationError }, 400);
  }

  const teamName = sanitizeText(payload.time?.nome);
  const teamTag = sanitizeText(payload.time?.tag);
  const allMembers = normalizeFormacaoMembers(payload, modalidade);

  const uploadGroupId = randomUUID();
  let uploadedLogo: Awaited<ReturnType<typeof uploadVctFormationLogo>> | null = null;
  let createdTimeId: string | null = null;

  try {
    const logoBuffer = Buffer.from(await logoFile.arrayBuffer());
    uploadedLogo = await uploadVctFormationLogo({
      buffer: logoBuffer,
      mimeType: logoFile.type,
      fileName: logoFile.name,
      formacaoId: uploadGroupId,
    });

    const time = await VctFormacaoTime.create({
      modalidade,
      nome: teamName,
      tag: teamTag,
      logoKey: uploadedLogo.key,
      logoUrl: uploadedLogo.url,
      membroCount: allMembers.length,
    });
    createdTimeId = String(time._id);

    const jogadores = await VctFormacaoJogador.insertMany(
      allMembers.map((member) => ({
        formacaoTimeId: time._id,
        ...member,
      })),
    );

    return c.json({
      ok: true,
      formacao: {
        ...time.toObject(),
        membros: jogadores,
      },
    }, 201);
  } catch (error) {
    if (createdTimeId) {
      await VctFormacaoJogador.deleteMany({ formacaoTimeId: createdTimeId }).catch(() => null);
      await VctFormacaoTime.deleteOne({ _id: createdTimeId }).catch(() => null);
    }

    if (uploadedLogo) {
      await deleteVctFormationLogo(uploadedLogo.key).catch(() => null);
    }

    const message = error instanceof Error ? error.message : "Falha ao salvar a formação.";
    return c.json({ ok: false, message }, 500);
  }
}

export async function atualizarFormacao(c: Context<AppEnv>): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ ok: false, message: "Falha ao processar o upload." }, 400);
  }

  const logoFile = body["logo"];
  const formacaoId = sanitizeText(c.req.param("id"));

  if (!formacaoId) {
    return c.json({ ok: false, message: "Formação inválida." }, 400);
  }

  const modalidade = normalizeModalidade(body["modalidade"]);
  const payload = parsePayload(body["payload"]);

  if (!payload) {
    return c.json({ ok: false, message: "Payload da formação inválido." }, 400);
  }

  const validationError = validateFormacaoPayload(payload);
  if (validationError) {
    return c.json({ ok: false, message: validationError }, 400);
  }

  const existing = await VctFormacaoTime.findOne({ _id: formacaoId, modalidade }).lean();
  if (!existing) {
    return c.json({ ok: false, message: "Formação não encontrada." }, 404);
  }

  let uploadedLogo: Awaited<ReturnType<typeof uploadVctFormationLogo>> | null = null;
  const nextLogoKey = existing.logoKey;
  const nextLogoUrl = existing.logoUrl;

  try {
    if (logoFile instanceof File && logoFile.type.startsWith("image/")) {
      const logoBuffer = Buffer.from(await logoFile.arrayBuffer());
      uploadedLogo = await uploadVctFormationLogo({
        buffer: logoBuffer,
        mimeType: logoFile.type,
        fileName: logoFile.name,
        formacaoId,
      });
    }

    const time = await VctFormacaoTime.findByIdAndUpdate(
      formacaoId,
      {
        modalidade,
        nome: sanitizeText(payload.time.nome),
        tag: sanitizeText(payload.time.tag),
        logoKey: uploadedLogo?.key ?? nextLogoKey,
        logoUrl: uploadedLogo?.url ?? nextLogoUrl,
        membroCount: FORMATION_PLAYER_COUNT + 1,
      },
      { new: true },
    ).lean();

    if (!time) {
      throw new Error("Formação não encontrada.");
    }

    await VctFormacaoJogador.deleteMany({ formacaoTimeId: formacaoId });
    const jogadores = await VctFormacaoJogador.insertMany(
      normalizeFormacaoMembers(payload, modalidade).map((member) => ({
        formacaoTimeId: formacaoId,
        ...member,
      })),
    );

    if (uploadedLogo && nextLogoKey && uploadedLogo.key !== nextLogoKey) {
      await deleteVctFormationLogo(nextLogoKey).catch(() => null);
    }

    return c.json({
      ok: true,
      formacao: {
        ...time,
        membros: jogadores,
      },
    });
  } catch (error) {
    if (uploadedLogo) {
      await deleteVctFormationLogo(uploadedLogo.key).catch(() => null);
    }

    const message = error instanceof Error ? error.message : "Falha ao atualizar a formação.";
    return c.json({ ok: false, message }, 500);
  }
}

export async function removerFormacao(c: Context<AppEnv>): Promise<Response> {
  const modalidade = normalizeModalidade(c.req.query("modalidade"));
  const formacaoId = sanitizeText(c.req.param("id"));

  if (!formacaoId) {
    return c.json({ ok: false, message: "Formação inválida." }, 400);
  }

  const existing = await VctFormacaoTime.findOne({ _id: formacaoId, modalidade }).lean();
  if (!existing) {
    return c.json({ ok: false, message: "Formação não encontrada." }, 404);
  }

  await removeFormationDocuments(formacaoId, existing.logoKey);
  return c.json({ ok: true, removida: formacaoId });
}

export async function listarFormacoes(c: Context<AppEnv>): Promise<Response> {
  const modalidade = normalizeModalidade(c.req.query("modalidade"));
  const filter = { modalidade };

  const formacoes = await VctFormacaoTime.find(filter).sort({ createdAt: -1 }).lean();
  const membros = await VctFormacaoJogador.find(filter).sort({ ordem: 1 }).lean();

  const membrosPorFormacao = new Map<string, typeof membros>();
  for (const membro of membros) {
    const key = String(membro.formacaoTimeId);
    const current = membrosPorFormacao.get(key) ?? [];
    current.push(membro);
    membrosPorFormacao.set(key, current);
  }

  return c.json({
    ok: true,
    formacoes: formacoes.map((formacao) => ({
      ...formacao,
      membros: membrosPorFormacao.get(String(formacao._id)) ?? [],
    })),
  });
}
