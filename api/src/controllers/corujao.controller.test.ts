import { describe, expect, test } from "bun:test";

import {
  parseOptionalBirthDate,
  parseStatusConversa,
  parseStatusPagamento
} from "./corujao.controller";

describe("parseOptionalBirthDate", () => {
  test.each([undefined, null, ""])("input vazio (%p) → ok:true value:null", (input) => {
    expect(parseOptionalBirthDate(input)).toEqual({ ok: true, value: null });
  });

  test("data válida no passado → mesma string", () => {
    expect(parseOptionalBirthDate("1990-05-10")).toEqual({
      ok: true,
      value: "1990-05-10"
    });
  });

  test("formato inválido → erro genérico", () => {
    expect(parseOptionalBirthDate("10/05/1990")).toEqual({
      ok: false,
      error: "Data de nascimento inválida."
    });
  });

  test("tipo não-string → erro genérico", () => {
    expect(parseOptionalBirthDate(19900510)).toEqual({
      ok: false,
      error: "Data de nascimento inválida."
    });
  });

  test("data futura → erro específico", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureStr = future.toISOString().slice(0, 10);
    expect(parseOptionalBirthDate(futureStr)).toEqual({
      ok: false,
      error: "Data de nascimento não pode ser no futuro."
    });
  });
});

describe("parseStatusConversa", () => {
  test.each([undefined, null, ""])("input vazio (%p) → ok:true value:null", (input) => {
    expect(parseStatusConversa(input)).toEqual({ ok: true, value: null });
  });

  test.each(["sem_resposta", "aguardando", "confirmou", "recusou"])(
    "valor válido (%p) → mesmo valor",
    (input) => {
      expect(parseStatusConversa(input)).toEqual({ ok: true, value: input });
    }
  );

  test("valor inválido → erro", () => {
    expect(parseStatusConversa("fechado")).toEqual({
      ok: false,
      error: "Status de conversa inválido."
    });
  });

  test("tipo não-string → erro", () => {
    expect(parseStatusConversa(42)).toEqual({
      ok: false,
      error: "Status de conversa inválido."
    });
  });
});

describe("parseStatusPagamento", () => {
  test.each([undefined, null, ""])("input vazio (%p) → ok:true value:null", (input) => {
    expect(parseStatusPagamento(input)).toEqual({ ok: true, value: null });
  });

  test.each([
    "pendente",
    "confirmou_pagou",
    "confirmou_nao_pagou",
    "paga_na_hora"
  ])("valor válido (%p) → mesmo valor", (input) => {
    expect(parseStatusPagamento(input)).toEqual({ ok: true, value: input });
  });

  test("valor inválido → erro", () => {
    expect(parseStatusPagamento("pago")).toEqual({
      ok: false,
      error: "Status de pagamento inválido."
    });
  });

  test("tipo não-string → erro", () => {
    expect(parseStatusPagamento({ status: "pendente" })).toEqual({
      ok: false,
      error: "Status de pagamento inválido."
    });
  });
});
