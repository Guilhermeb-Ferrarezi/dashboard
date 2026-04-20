import type { Request, Response } from "express";
import { VctInscricao } from "../models/VctInscricao";
import { VctTime } from "../models/VctTime";

const CAMPO_LABEL: Record<string, string> = {
  nick: "Nick",
  email: "Email",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

export async function criarInscricao(req: Request, res: Response) {
  const { nome, nick, email, whatsapp, instagram, elo, pico, funcaoPrimaria, funcaoSecundaria } = req.body;

  if (!nome || !nick || !email || !whatsapp || !instagram || !elo || !pico || !funcaoPrimaria || !funcaoSecundaria) {
    res.status(400).json({ ok: false, message: "Todos os campos são obrigatórios." });
    return;
  }

  try {
    const inscricao = new VctInscricao({ nome, nick, email, whatsapp, instagram, elo, pico, funcaoPrimaria, funcaoSecundaria });
    await inscricao.save();
    res.status(201).json({ ok: true, message: "Inscrição realizada com sucesso.", id: inscricao._id });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: number }).code === 11000) {
      const key = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {})[0];
      const label = CAMPO_LABEL[key] ?? key ?? "Campo";
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
