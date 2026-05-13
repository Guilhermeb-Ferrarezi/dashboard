import { describe, expect, test } from "bun:test";

import {
  buildFormacaoEditorPayload,
  createEmptyFormacaoForm,
  createFormacaoFormFromSummary,
  isFormacaoEditorFormComplete,
} from "./vct-formacao-editor-dialog";
import type { VctFormacaoSummary } from "@/types/portal";

function makeFormacao(): VctFormacaoSummary {
  return {
    _id: "formacao-1",
    modalidade: "valorant",
    nome: "Time Alpha",
    tag: "ALP",
    logoKey: "logo-key",
    logoUrl: "https://example.com/logo.png",
    membroCount: 5,
    createdAt: "2026-05-13T16:37:00.000Z",
    membros: [
      {
        _id: "1",
        modalidade: "valorant",
        formacaoTimeId: "formacao-1",
        ordem: 0,
        papel: "capitao",
        nome: "Capita",
        email: "capita@example.com",
        instagram: "@capita",
        whatsapp: "16999990000",
        nick: "capita#0001",
        eloAtual: "Ouro 1",
        peakRanking: "Platina 1",
      },
      {
        _id: "2",
        modalidade: "valorant",
        formacaoTimeId: "formacao-1",
        ordem: 1,
        papel: "jogador",
        nome: "Jogador 1",
        email: "j1@example.com",
        instagram: "@j1",
        whatsapp: "16999990001",
        nick: "j1#0001",
        eloAtual: "Prata 1",
        peakRanking: "Prata 2",
      },
      {
        _id: "3",
        modalidade: "valorant",
        formacaoTimeId: "formacao-1",
        ordem: 2,
        papel: "jogador",
        nome: "Jogador 2",
        email: "j2@example.com",
        instagram: "@j2",
        whatsapp: "16999990002",
        nick: "j2#0001",
        eloAtual: "Prata 1",
        peakRanking: "Prata 2",
      },
      {
        _id: "4",
        modalidade: "valorant",
        formacaoTimeId: "formacao-1",
        ordem: 3,
        papel: "jogador",
        nome: "Jogador 3",
        email: "j3@example.com",
        instagram: "@j3",
        whatsapp: "16999990003",
        nick: "j3#0001",
        eloAtual: "Prata 1",
        peakRanking: "Prata 2",
      },
      {
        _id: "5",
        modalidade: "valorant",
        formacaoTimeId: "formacao-1",
        ordem: 4,
        papel: "jogador",
        nome: "Jogador 4",
        email: "j4@example.com",
        instagram: "@j4",
        whatsapp: "16999990004",
        nick: "j4#0001",
        eloAtual: "Prata 1",
        peakRanking: "Prata 2",
      },
    ],
  };
}

describe("vct-formacao-editor-dialog", () => {
  test("prepara um formulário vazio", () => {
    const form = createEmptyFormacaoForm();
    expect(form.jogadores).toHaveLength(4);
    expect(isFormacaoEditorFormComplete(form)).toBe(false);
  });

  test("hidrata o formulário a partir da formação existente", () => {
    const formacao = makeFormacao();
    const form = createFormacaoFormFromSummary(formacao);

    expect(form.nome).toBe("Time Alpha");
    expect(form.tag).toBe("ALP");
    expect(form.capitao.nome).toBe("Capita");
    expect(form.jogadores[0]?.nome).toBe("Jogador 1");
  });

  test("monta o payload com capitão e jogadores", () => {
    const form = createFormacaoFormFromSummary(makeFormacao());
    const payload = buildFormacaoEditorPayload(form, "valorant");

    expect(payload).toMatchObject({
      modalidade: "valorant",
      time: { nome: "Time Alpha", tag: "ALP" },
      capitao: { nome: "Capita", nick: "capita#0001" },
    });
    expect(payload.jogadores).toHaveLength(4);
  });
});
