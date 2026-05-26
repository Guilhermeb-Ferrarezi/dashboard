import { describe, expect, test } from "bun:test";

import {
  parseSessaoData,
  parseSessaoDataAceitaPassado,
  parseSessaoStatus,
  parseTotalVagas
} from "./corujao-sessoes.controller";

describe("parseSessaoData", () => {
  test.each([undefined, null, "", 20260528, {}])("input inválido (%p) → erro", (input) => {
    expect(parseSessaoData(input).ok).toBe(false);
  });

  test("formato errado → erro genérico", () => {
    expect(parseSessaoData("28/05/2026")).toEqual({
      ok: false,
      error: "Data da sessão inválida."
    });
  });

  test("hoje é aceito", () => {
    const hoje = new Date().toISOString().slice(0, 10);
    expect(parseSessaoData(hoje)).toEqual({ ok: true, value: hoje });
  });

  test("futuro é aceito", () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const futureStr = future.toISOString().slice(0, 10);
    expect(parseSessaoData(futureStr)).toEqual({ ok: true, value: futureStr });
  });

  test("passado → erro específico", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const pastStr = past.toISOString().slice(0, 10);
    expect(parseSessaoData(pastStr)).toEqual({
      ok: false,
      error: "Data da sessão não pode ser no passado."
    });
  });
});

describe("parseSessaoDataAceitaPassado", () => {
  test("passado é aceito (PATCH corrige histórico)", () => {
    expect(parseSessaoDataAceitaPassado("2020-01-15")).toEqual({
      ok: true,
      value: "2020-01-15"
    });
  });

  test("formato errado → erro", () => {
    expect(parseSessaoDataAceitaPassado("15/01/2020").ok).toBe(false);
  });
});

describe("parseTotalVagas", () => {
  test.each([10, 1, 100])("inteiro >= 1 (%p) → ok", (input) => {
    expect(parseTotalVagas(input)).toEqual({ ok: true, value: input });
  });

  test.each([0, -5])("inteiro < 1 (%p) → erro específico", (input) => {
    expect(parseTotalVagas(input)).toEqual({
      ok: false,
      error: "Total de vagas deve ser pelo menos 1."
    });
  });

  test.each([10.5, NaN, "10", null, undefined, {}])("não-inteiro (%p) → erro", (input) => {
    expect(parseTotalVagas(input)).toEqual({
      ok: false,
      error: "Total de vagas inválido. Use inteiro."
    });
  });
});

describe("parseSessaoStatus", () => {
  test.each(["planejado", "aberto", "lotado", "realizado", "cancelado"])(
    "valor válido (%p) → mesmo valor",
    (input) => {
      expect(parseSessaoStatus(input)).toEqual({ ok: true, value: input });
    }
  );

  test.each([undefined, null, "", "concluido", 1])("valor inválido (%p) → erro", (input) => {
    expect(parseSessaoStatus(input)).toEqual({
      ok: false,
      error: "Status de sessão inválido."
    });
  });
});
