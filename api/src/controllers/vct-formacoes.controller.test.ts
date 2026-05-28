import { afterEach, describe, expect, mock, test } from "bun:test";

import { removerFormacao, listarFormacoes } from "./vct-formacoes.controller";
import { VctFormacaoJogador } from "../models/VctFormacaoJogador";
import { VctFormacaoTime } from "../models/VctFormacaoTime";
import { createMockContext } from "../test-utils/mock-context";

describe("formacoes", () => {
  const originalFindOne = VctFormacaoTime.findOne;
  const originalDeleteMany = VctFormacaoJogador.deleteMany;
  const originalDeleteOne = VctFormacaoTime.deleteOne;
  const originalFind = VctFormacaoTime.find;
  const originalJogadorFind = VctFormacaoJogador.find;

  afterEach(() => {
    VctFormacaoTime.findOne = originalFindOne;
    VctFormacaoJogador.deleteMany = originalDeleteMany;
    VctFormacaoTime.deleteOne = originalDeleteOne;
    VctFormacaoTime.find = originalFind;
    VctFormacaoJogador.find = originalJogadorFind;
  });

  test("remove a formação e limpa os membros associados", async () => {
    let deleteManyFilter: unknown = null;
    let deleteOneFilter: unknown = null;
    VctFormacaoTime.findOne = mock(() => ({
      lean: async () => ({
        _id: "formacao-1",
        logoKey: "vct/formacoes/formacao-1/logo.png",
      }),
    })) as typeof VctFormacaoTime.findOne;
    VctFormacaoJogador.deleteMany = mock((filter: unknown) => {
      deleteManyFilter = filter;
      return Promise.resolve({});
    }) as typeof VctFormacaoJogador.deleteMany;
    VctFormacaoTime.deleteOne = mock((filter: unknown) => {
      deleteOneFilter = filter;
      return Promise.resolve({});
    }) as typeof VctFormacaoTime.deleteOne;

    const c = createMockContext({
      params: { id: "formacao-1" },
      query: { modalidade: "valorant" },
    });

    const response = await removerFormacao(c);
    const data = await response.json();

    expect(deleteManyFilter).toEqual({ formacaoTimeId: "formacao-1" });
    expect(deleteOneFilter).toEqual({ _id: "formacao-1" });
    expect(data).toMatchObject({ ok: true, removida: "formacao-1" });
  });

  test("lista formações juntando o time aos seus membros", async () => {
    VctFormacaoTime.find = mock(() => ({
      sort: () => ({
        lean: async () => [
          {
            _id: "formacao-1",
            modalidade: "valorant",
            nome: "Alpha",
            tag: "ALP",
            logoKey: "logo",
            logoUrl: "https://example.com/logo.png",
            membroCount: 5,
          },
        ],
      }),
    })) as typeof VctFormacaoTime.find;
    VctFormacaoJogador.find = mock(() => ({
      sort: () => ({
        lean: async () => [
          {
            _id: "m1",
            modalidade: "valorant",
            formacaoTimeId: "formacao-1",
            ordem: 0,
            papel: "capitao",
            nome: "Cap",
            email: "cap@example.com",
            instagram: "@cap",
            whatsapp: "16999990000",
            nick: "cap#1",
            eloAtual: "Ouro 1",
            peakRanking: "Ouro 3",
          },
        ],
      }),
    })) as typeof VctFormacaoJogador.find;

    const c = createMockContext({ query: { modalidade: "valorant" } });

    const response = await listarFormacoes(c);
    const data = await response.json();

    expect(data).toMatchObject({
      ok: true,
      formacoes: [
        {
          _id: "formacao-1",
          membros: [
            {
              _id: "m1",
              nick: "cap#1",
            },
          ],
        },
      ],
    });
  });
});
