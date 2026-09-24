import { describe, expect, test } from "bun:test";
import {
  expandirOcorrencias,
  formatDataLocal,
  parseDataLocal,
  type AvulsaInput,
  type ExcecaoInput,
  type RecorrenteInput,
} from "./aulas-ocorrencias";

function recorrente(overrides: Partial<RecorrenteInput> = {}): RecorrenteInput {
  return {
    id: "r1",
    titulo: "Jackson",
    professor: "Rodrigo",
    turmaDescricao: "",
    diasSemana: ["quarta"],
    horarioInicio: "19:00",
    horarioFim: "20:00",
    conteudo: ["Python"],
    ativo: true,
    dataInicio: "2026-01-01",
    dataFim: null,
    ...overrides,
  };
}

describe("parseDataLocal / formatDataLocal", () => {
  test("faz round-trip sem deslocar dia por fuso", () => {
    expect(formatDataLocal(parseDataLocal("2026-09-24"))).toBe("2026-09-24");
  });
});

describe("expandirOcorrencias", () => {
  test("expande turma recorrente nas datas do dia da semana dentro do range", () => {
    const ocorrencias = expandirOcorrencias({
      recorrentes: [recorrente()],
      excecoes: [],
      avulsas: [],
      from: "2026-09-01",
      to: "2026-09-30",
    });

    // Setembro/2026: quartas são 2, 9, 16, 23, 30.
    expect(ocorrencias.map((o) => o.data)).toEqual([
      "2026-09-02",
      "2026-09-09",
      "2026-09-16",
      "2026-09-23",
      "2026-09-30",
    ]);
    expect(ocorrencias[0]!.cancelada).toBe(false);
  });

  test("respeita dataInicio e dataFim da turma", () => {
    const ocorrencias = expandirOcorrencias({
      recorrentes: [recorrente({ dataInicio: "2026-09-10", dataFim: "2026-09-20" })],
      excecoes: [],
      avulsas: [],
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(ocorrencias.map((o) => o.data)).toEqual(["2026-09-16"]);
  });

  test("turma inativa não gera ocorrências", () => {
    const ocorrencias = expandirOcorrencias({
      recorrentes: [recorrente({ ativo: false })],
      excecoes: [],
      avulsas: [],
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(ocorrencias).toEqual([]);
  });

  test("exceção 'cancelada' marca a ocorrência daquele dia como cancelada, sem remover as outras", () => {
    const excecoes: ExcecaoInput[] = [
      {
        id: "e1",
        recorrenteId: "r1",
        data: "2026-09-09",
        tipo: "cancelada",
        novaData: null,
        novoHorarioInicio: null,
        novoHorarioFim: null,
        motivo: "feriado",
      },
    ];
    const ocorrencias = expandirOcorrencias({
      recorrentes: [recorrente()],
      excecoes,
      avulsas: [],
      from: "2026-09-01",
      to: "2026-09-30",
    });
    const cancelada = ocorrencias.find((o) => o.data === "2026-09-09");
    expect(cancelada?.cancelada).toBe(true);
    expect(ocorrencias.filter((o) => o.cancelada)).toHaveLength(1);
    expect(ocorrencias).toHaveLength(5);
  });

  test("exceção 'reagendada' com nova data move a ocorrência (não duplica)", () => {
    const excecoes: ExcecaoInput[] = [
      {
        id: "e1",
        recorrenteId: "r1",
        data: "2026-09-09",
        tipo: "reagendada",
        novaData: "2026-09-11",
        novoHorarioInicio: "10:00",
        novoHorarioFim: "11:00",
        motivo: "troca de sala",
      },
    ];
    const ocorrencias = expandirOcorrencias({
      recorrentes: [recorrente()],
      excecoes,
      avulsas: [],
      from: "2026-09-01",
      to: "2026-09-30",
    });

    expect(ocorrencias.some((o) => o.data === "2026-09-09")).toBe(false);
    const movida = ocorrencias.find((o) => o.data === "2026-09-11");
    expect(movida).toBeDefined();
    expect(movida?.horarioInicio).toBe("10:00");
    expect(movida?.reagendadaDe).toBe("2026-09-09");
    // As outras quartas continuam intactas.
    expect(ocorrencias).toHaveLength(5);
  });

  test("exceção 'reagendada' só de horário (sem novaData) não duplica nem move", () => {
    const excecoes: ExcecaoInput[] = [
      {
        id: "e1",
        recorrenteId: "r1",
        data: "2026-09-09",
        tipo: "reagendada",
        novaData: null,
        novoHorarioInicio: "21:00",
        novoHorarioFim: "22:00",
        motivo: "",
      },
    ];
    const ocorrencias = expandirOcorrencias({
      recorrentes: [recorrente()],
      excecoes,
      avulsas: [],
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(ocorrencias).toHaveLength(5);
    const alterada = ocorrencias.find((o) => o.data === "2026-09-09");
    expect(alterada?.horarioInicio).toBe("21:00");
  });

  test("mescla aulas avulsas dentro do range e ignora as fora", () => {
    const avulsas: AvulsaInput[] = [
      {
        id: "a1",
        titulo: "Aula experimental — Rodrigo",
        professor: "Rodrigo",
        turmaDescricao: "",
        conteudo: [],
        data: "2026-09-24",
        horarioInicio: "09:00",
        horarioFim: "10:00",
        status: "agendada",
      },
      {
        id: "a2",
        titulo: "Fora do range",
        professor: "Rodrigo",
        turmaDescricao: "",
        conteudo: [],
        data: "2026-10-05",
        horarioInicio: "09:00",
        horarioFim: "10:00",
        status: "agendada",
      },
    ];
    const ocorrencias = expandirOcorrencias({
      recorrentes: [],
      excecoes: [],
      avulsas,
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(ocorrencias).toHaveLength(1);
    expect(ocorrencias[0]!.origem).toBe("avulsa");
    expect(ocorrencias[0]!.data).toBe("2026-09-24");
  });

  test("resultado vem ordenado por data e horário", () => {
    const ocorrencias = expandirOcorrencias({
      recorrentes: [
        recorrente({ id: "r1", diasSemana: ["quarta"], horarioInicio: "19:00" }),
        recorrente({ id: "r2", diasSemana: ["quarta"], horarioInicio: "08:00" }),
      ],
      excecoes: [],
      avulsas: [],
      from: "2026-09-02",
      to: "2026-09-02",
    });
    expect(ocorrencias.map((o) => o.recorrenteId)).toEqual(["r2", "r1"]);
  });
});
