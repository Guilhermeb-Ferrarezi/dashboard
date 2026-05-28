import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import {
  atribuirTimesAutomatico,
  atualizarInscricao,
  atualizarStatusInscricoes,
  preencherTime,
  listarInscricoes,
  removerTime,
} from "./vct.controller";
import { VCT_INSCRICAO_STATUS } from "../lib/vct-inscricao-status";
import { VctInscricao } from "../models/VctInscricao";
import { VctTime } from "../models/VctTime";
import { createMockContext } from "../test-utils/mock-context";

describe("atualizarInscricao", () => {
  const originalFindByIdAndUpdate = VctInscricao.findByIdAndUpdate;

  beforeEach(() => {
    VctInscricao.findByIdAndUpdate = mock((
      id: string,
      update: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => {
      if (options?.runValidators) {
        throw new Error("runValidators should not be enabled for edit updates");
      }

      return {
        lean: async () => ({ _id: id, ...update }),
      };
    }) as typeof VctInscricao.findByIdAndUpdate;
  });

  test("persists the inscription detail fields edited from the details modal", async () => {
    const c = createMockContext({
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
    });

    const response = await atualizarInscricao(c);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
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

  test("aceita salvar uma edicao quando campos legados do compromisso estao vazios", async () => {
    const c = createMockContext({
      params: { id: "inscricao-2" },
      body: {
        nome: " Guilherme ",
        nick: " guma ",
        email: " GUMA@MAIL.COM ",
        whatsapp: " 16999990000 ",
        elo: " Platina 1 ",
        pico: " Platina 2 ",
        funcaoPrimaria: " Duelista ",
        funcaoSecundaria: " Flex ",
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
        tags: [],
        observacoes: "",
        highlightColor: "",
      },
    });

    const response = await atualizarInscricao(c);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      ok: true,
      inscricao: {
        _id: "inscricao-2",
        compromisso: "",
        rotinaFixa: "",
        horariosDefinidos: "",
        capitao: "",
        presencial: "",
        deslocamento: "",
        autorizacaoContato: "",
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
  const originalBulkWrite = VctInscricao.bulkWrite;
  const originalTimeFind = VctTime.find;

  afterEach(() => {
    VctInscricao.find = originalFind;
    VctInscricao.updateMany = originalUpdateMany;
    VctInscricao.bulkWrite = originalBulkWrite;
    VctTime.find = originalTimeFind;
  });

  test("mover inscricoes para fora do campeonato tambem remove o time", async () => {
    let updatePayload: Record<string, unknown> | null = null;
    VctInscricao.updateMany = mock((_filter: unknown, update: Record<string, unknown>) => {
      updatePayload = update;
      return Promise.resolve({ modifiedCount: 2 });
    }) as typeof VctInscricao.updateMany;

    const c = createMockContext({
      body: {
        ids: ["inscricao-1", "inscricao-2"],
        status: VCT_INSCRICAO_STATUS.INACTIVE,
      },
    });

    const response = await atualizarStatusInscricoes(c);
    const data = await response.json();

    expect(data).toMatchObject({
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
    let updateManyFilter: unknown = null;
    let updateManyUpdate: unknown = null;
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
    VctInscricao.updateMany = mock((filter: unknown, update: unknown) => {
      updateManyFilter = filter;
      updateManyUpdate = update;
      return Promise.resolve({ modifiedCount: 1 });
    }) as typeof VctInscricao.updateMany;

    const c = createMockContext({
      params: { numero: "1" },
      body: {},
    });

    await preencherTime(c);

    expect(updateManyFilter).toEqual({ _id: { $in: ["ativo"] } });
    expect(updateManyUpdate).toEqual({ time: 1 });
  });

  test("formacao automatica ignora inscricoes fora do campeonato", async () => {
    let bulkWriteOps: unknown[] | null = null;
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
    VctInscricao.bulkWrite = mock((ops: unknown[]) => {
      bulkWriteOps = ops;
      return Promise.resolve({ ok: 1 });
    }) as typeof VctInscricao.bulkWrite;
    VctTime.find = mock(() => ({
      select: () => ({
        lean: async () => [{ numero: 1 }],
      }),
    })) as typeof VctTime.find;

    const c = createMockContext({ body: {} });

    await atribuirTimesAutomatico(c);

    expect(bulkWriteOps).toEqual([
      { updateOne: { filter: { _id: "ativo" }, update: { $set: { time: 1 } } } },
    ]);
  });
});

describe("modalidades de inscricao", () => {
  const originalFind = VctInscricao.find;
  const originalUpdateMany = VctInscricao.updateMany;

  afterEach(() => {
    VctInscricao.find = originalFind;
    VctInscricao.updateMany = originalUpdateMany;
  });

  test("listar inscricoes filtra pela modalidade solicitada", async () => {
    let filterUsed: unknown = null;
    VctInscricao.find = mock((filter: unknown) => {
      filterUsed = filter;
      return {
        sort: () => ({
          lean: async () => [{ _id: "cs-1", modalidade: "counter-strike" }],
        }),
      };
    }) as typeof VctInscricao.find;

    const c = createMockContext({ query: { modalidade: "counter-strike" } });

    const response = await listarInscricoes(c);
    const data = await response.json();

    expect(filterUsed).toEqual({ modalidade: "counter-strike" });
    expect(data).toMatchObject({
      ok: true,
      inscricoes: [{ _id: "cs-1", modalidade: "counter-strike" }],
    });
  });

  test("listar inscricoes de valorant tambem inclui registros antigos sem modalidade", async () => {
    let filterUsed: unknown = null;
    VctInscricao.find = mock((filter: unknown) => {
      filterUsed = filter;
      return {
        sort: () => ({
          lean: async () => [{ _id: "legacy-1" }],
        }),
      };
    }) as typeof VctInscricao.find;

    const c = createMockContext({ query: { modalidade: "valorant" } });

    const response = await listarInscricoes(c);
    const data = await response.json();

    expect(filterUsed).toEqual({
      $or: [
        { modalidade: "valorant" },
        { modalidade: { $exists: false } },
      ],
    });
    expect(data).toMatchObject({
      ok: true,
      inscricoes: [{ _id: "legacy-1" }],
    });
  });

  test("preencher time usa apenas jogadores da modalidade solicitada", async () => {
    let filterUsed: unknown = null;
    let updateManyFilter: unknown = null;
    let updateManyUpdate: unknown = null;
    VctInscricao.find = mock((filter: unknown) => {
      filterUsed = filter;
      return {
        lean: async () => [
          {
            _id: "cs-ativo",
            modalidade: "counter-strike",
            elo: "Ouro 2",
            time: null,
            status: VCT_INSCRICAO_STATUS.ACTIVE,
          },
        ],
      };
    }) as typeof VctInscricao.find;
    VctInscricao.updateMany = mock((filter: unknown, update: unknown) => {
      updateManyFilter = filter;
      updateManyUpdate = update;
      return Promise.resolve({ modifiedCount: 1 });
    }) as typeof VctInscricao.updateMany;

    const c = createMockContext({
      params: { numero: "1" },
      query: { modalidade: "counter-strike" },
      body: {},
    });

    await preencherTime(c);

    expect(filterUsed).toEqual({ modalidade: "counter-strike" });
    expect(updateManyFilter).toEqual({ _id: { $in: ["cs-ativo"] } });
    expect(updateManyUpdate).toEqual({ time: 1 });
  });
});

describe("remocao de time", () => {
  const originalExists = VctInscricao.exists;
  const originalFindOneAndDelete = VctTime.findOneAndDelete;

  afterEach(() => {
    VctInscricao.exists = originalExists;
    VctTime.findOneAndDelete = originalFindOneAndDelete;
  });

  test("remove o time vazio da modalidade solicitada", async () => {
    let existsFilter: unknown = null;
    let deleteFilter: unknown = null;

    VctInscricao.exists = mock((filter: unknown) => {
      existsFilter = filter;
      return Promise.resolve(null);
    }) as typeof VctInscricao.exists;
    VctTime.findOneAndDelete = mock((filter: unknown) => {
      deleteFilter = filter;
      return {
        lean: async () => ({ numero: 8 }),
      };
    }) as typeof VctTime.findOneAndDelete;

    const c = createMockContext({
      params: { numero: "8" },
      query: { modalidade: "lol" },
      body: {},
    });

    const response = await removerTime(c);
    const data = await response.json();

    expect(existsFilter).toEqual({ modalidade: "lol", time: 8 });
    expect(deleteFilter).toEqual({ modalidade: "lol", numero: 8 });
    expect(data).toMatchObject({ ok: true, removido: 8 });
  });

  test("bloqueia a remocao quando o time ainda tem inscritos", async () => {
    VctInscricao.exists = mock(() => Promise.resolve({ _id: "tem-gente" })) as typeof VctInscricao.exists;
    let deleteCalled = false;
    VctTime.findOneAndDelete = mock(() => {
      deleteCalled = true;
      return {
        lean: async () => null,
      };
    }) as typeof VctTime.findOneAndDelete;

    const c = createMockContext({
      params: { numero: "8" },
      body: {},
    });

    const response = await removerTime(c);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data).toMatchObject({
      ok: false,
      message: "Limpe o time antes de removê-lo.",
    });
    expect(deleteCalled).toBe(false);
  });
});
