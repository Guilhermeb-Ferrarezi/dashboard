import { describe, expect, test } from "bun:test";

import {
  CREATE_INSCRICAO_REQUIRED_FIELDS,
  buildCreateInscricaoPayload,
  createBlankInscricaoForm,
  isCreateInscricaoFormComplete,
} from "./vct-inscricoes-panel";

describe("vct-inscricoes-panel", () => {
  test("prepara um formulário vazio com valores iniciais válidos", () => {
    const form = createBlankInscricaoForm(["Sem elo", "Ferro 1"], ["Duelista", "Flex"]);

    expect(form.elo).toBe("Sem elo");
    expect(form.pico).toBe("Sem elo");
    expect(form.funcaoPrimaria).toBe("Duelista");
    expect(form.funcaoSecundaria).toBe("Duelista");
  });

  test("detecta quando campos obrigatórios ainda estão vazios", () => {
    const form = createBlankInscricaoForm(["Sem elo"], ["Duelista"]);

    expect(isCreateInscricaoFormComplete(form)).toBe(false);
    expect(CREATE_INSCRICAO_REQUIRED_FIELDS.length).toBeGreaterThan(0);
  });

  test("monta o payload de criação com os campos editáveis", () => {
    const form = createBlankInscricaoForm(["Sem elo", "Ferro 1"], ["Duelista", "Flex"]);
    const payload = buildCreateInscricaoPayload(
      {
        ...form,
        nome: "Ana",
        nick: "ana#123",
        email: "ANA@MAIL.COM",
        whatsapp: "16999990000",
        instagram: "@ana",
        cidade: "Ribeirao Preto",
        elo: "Ferro 1",
        pico: "Ferro 1",
        funcaoPrimaria: "Flex",
        funcaoSecundaria: "Duelista",
        diasTreino: "2x por semana",
        diasSemana: "Segunda e quarta",
        horariosTreino: "Noite",
        melhorJanela: "Tarde",
        compromisso: "Quero competir",
        rotinaFixa: "Sim",
        horariosDefinidos: "Sim",
        capitao: "Nao",
        presencial: "Sim",
        deslocamento: "Sim",
        autorizacaoContato: "Sim",
        riotName: "ana",
        riotTag: "BR1",
      },
      "valorant",
    );

    expect(payload).toMatchObject({
      modalidade: "valorant",
      nome: "Ana",
      nick: "ana#123",
      email: "ANA@MAIL.COM",
      whatsapp: "16999990000",
      instagram: "@ana",
      cidade: "Ribeirao Preto",
      elo: "Ferro 1",
      pico: "Ferro 1",
      funcaoPrimaria: "Flex",
      funcaoSecundaria: "Duelista",
      riotName: "ana",
      riotTag: "BR1",
    });
  });
});
