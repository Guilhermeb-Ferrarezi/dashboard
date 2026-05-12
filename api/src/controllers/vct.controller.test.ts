import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Request, Response } from "express";

import {
  atribuirTimesAutomatico,
  atualizarInscricao,
  atualizarStatusInscricoes,
  preencherTime,
} from "./vct.controller";
import { VCT_INSCRICAO_STATUS } from "../lib/vct-inscricao-status";
import { VctInscricao } from "../models/VctInscricao";
import { VctTime } from "../models/VctTime";

type MockResponse = Partial<Response> & {
  statusCode?: number;
  body?: unknown;
};

function makeResponse(): MockResponse {
  const res: MockResponse = {};
  res.status = mock((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.json = mock((body: unknown) => {
    res.body = body;
    return res as Response;
  });
  return res;
}

describe("atualizarInscricao", () => {
  const originalFindByIdAndUpdate = VctInscricao.findByIdAndUpdate;

  beforeEach(() => {
    VctInscricao.findByIdAndUpdate = mock((id: string, update: Record<string, unknown>) => ({
      lean: async () => ({ _id: id, ...update }),
    })) as typeof VctInscricao.findByIdAndUpdate;
  });

  test("persists the inscription detail fields edited from the details modal", async () => {
    const req = {
      params: { id: "inscricao-1" },
      body: {
        nome: " Guilherme ",
        nick: " guma ",
        email: " GUMA@MAIL.COM ",
        whatsapp: " 16999990000 ",
        elo: " Platina 1 ",
        pico: " Platina 2 ",
        funcaoPrimaria: " Duelista ",
        funcaoSecundaria: " Flex ",
        cidade: " Ribeirao Preto ",
        diasTreino: " Segunda e Quarta ",
        diasSemana: " Segunda, Quarta e Sexta ",
        horariosTreino: " Noite ",
        melhorJanela: " Tarde ",
        compromisso: " Quero jogar e competir ",
        rotinaFixa: " Sim ",
        horariosDefinidos: " Nao ",
        capitao: " Sim ",
        presencial: " Confirmado ",
        deslocamento: " Confirmado ",
        autorizacaoContato: " Sim ",
        tags: ["Confirmado"],
        observacoes: "  precisa revisar  ",
        highlightColor: " blue ",
      },
    } as Request;
    const res = makeResponse();

    await atualizarInscricao(req, res as Response);

    expect(res.statusCode).toBeUndefined();
    expect(res.body).toMatchObject({
      ok: true,
      inscricao: {
        _id: "inscricao-1",
        cidade: "Ribeirao Preto",
        diasTreino: "Segunda e Quarta",
        diasSemana: "Segunda, Quarta e Sexta",
        horariosTreino: "Noite",
        melhorJanela: "Tarde",
        compromisso: "Quero jogar e competir",
        rotinaFixa: "Sim",
        horariosDefinidos: "Nao",
        capitao: "Sim",
        presencial: "Confirmado",
        deslocamento: "Confirmado",
        autorizacaoContato: "Sim",
        observacoes: "precisa revisar",
        highlightColor: "blue",
      },
    });
  });

  afterEach(() => {
    VctInscricao.findByIdAndUpdate = originalFindByIdAndUpdate;
  });
});

describe("status de participacao no campeonato", () => {
  const originalFind = VctInscricao.find;
  const originalUpdateMany = VctInscricao.updateMany;
  const originalUpdateOne = VctInscricao.updateOne;
  const originalTimeFind = VctTime.find;

  afterEach(() => {
    VctInscricao.find = originalFind;
    VctInscricao.updateMany = originalUpdateMany;
    VctInscricao.updateOne = originalUpdateOne;
    VctTime.find = originalTimeFind;
  });

  test("mover inscricoes para fora do campeonato tambem remove o time", async () => {
    let updatePayload: Record<string, unknown> | null = null;
    VctInscricao.updateMany = mock((_filter: unknown, update: Record<string, unknown>) => {
      updatePayload = update;
      return Promise.resolve({ modifiedCount: 2 });
    }) as typeof VctInscricao.updateMany;

    const req = {
      body: {
        ids: ["inscricao-1", "inscricao-2"],
        status: VCT_INSCRICAO_STATUS.INACTIVE,
      },
    } as Request;
    const res = makeResponse();

    await atualizarStatusInscricoes(req, res as Response);

    expect(res.body).toMatchObject({
      ok: true,
      atualizados: 2,
      status: VCT_INSCRICAO_STATUS.INACTIVE,
    });
    expect(updatePayload).toEqual({
      status: VCT_INSCRICAO_STATUS.INACTIVE,
      time: null,
    });
  });

  test("preencher time ignora inscricoes fora do campeonato", async () => {
    const updates: Array<{ id: string; time: number }> = [];
    VctInscricao.find = mock(() => ({
      lean: async () => [
        {
          _id: "inativo",
          elo: "Radiante",
          time: null,
          status: VCT_INSCRICAO_STATUS.INACTIVE,
        },
        {
          _id: "ativo",
          elo: "Ouro 2",
          time: null,
          status: VCT_INSCRICAO_STATUS.ACTIVE,
        },
      ],
    })) as typeof VctInscricao.find;
    VctInscricao.updateOne = mock((filter: { _id: string }, update: { time: number }) => {
      updates.push({ id: filter._id, time: update.time });
      return Promise.resolve({});
    }) as typeof VctInscricao.updateOne;

    const req = { params: { numero: "1" }, body: {} } as unknown as Request;
    const res = makeResponse();

    await preencherTime(req, res as Response);

    expect(updates).toEqual([{ id: "ativo", time: 1 }]);
  });

  test("formacao automatica ignora inscricoes fora do campeonato", async () => {
    const updates: Array<{ id: string; time: number }> = [];
    VctInscricao.find = mock(() => ({
      lean: async () => [
        {
          _id: "inativo",
          elo: "Radiante",
          time: null,
          status: VCT_INSCRICAO_STATUS.INACTIVE,
        },
        {
          _id: "ativo",
          elo: "Ouro 2",
          time: null,
          status: VCT_INSCRICAO_STATUS.ACTIVE,
        },
      ],
    })) as typeof VctInscricao.find;
    VctInscricao.updateOne = mock((filter: { _id: string }, update: { time: number }) => {
      updates.push({ id: filter._id, time: update.time });
      return Promise.resolve({});
    }) as typeof VctInscricao.updateOne;
    VctTime.find = mock(() => ({
      select: () => ({
        lean: async () => [{ numero: 1 }],
      }),
    })) as typeof VctTime.find;

    const req = { body: {} } as Request;
    const res = makeResponse();

    await atribuirTimesAutomatico(req, res as Response);

    expect(updates).toEqual([{ id: "ativo", time: 1 }]);
  });
});
