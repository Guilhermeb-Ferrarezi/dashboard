import { describe, expect, test } from "bun:test";

import {
  parseFormaPagamento,
  parseVisitaAmount,
  parseVisitaDate
} from "./corujao-visitas.controller";

describe("parseVisitaDate", () => {
  test.each([undefined, null, "", 19900101, {}])(
    "input inválido (%p) → erro",
    (input) => {
      const out = parseVisitaDate(input);
      expect(out.ok).toBe(false);
    }
  );

  test("data válida no passado → mesma string", () => {
    expect(parseVisitaDate("2024-01-15")).toEqual({
      ok: true,
      value: "2024-01-15"
    });
  });

  test("hoje é aceito (margem de fuso)", () => {
    const hoje = new Date().toISOString().slice(0, 10);
    expect(parseVisitaDate(hoje)).toEqual({ ok: true, value: hoje });
  });

  test("formato errado → erro genérico", () => {
    expect(parseVisitaDate("15/01/2024")).toEqual({
      ok: false,
      error: "Data da visita inválida."
    });
  });

  test("data futura → erro específico", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureStr = future.toISOString().slice(0, 10);
    expect(parseVisitaDate(futureStr)).toEqual({
      ok: false,
      error: "Data da visita não pode ser no futuro."
    });
  });
});

describe("parseFormaPagamento", () => {
  test.each(["pix", "dinheiro", "cartao", "gateway", "cortesia", "outro"])(
    "valor válido (%p) → mesmo valor",
    (input) => {
      expect(parseFormaPagamento(input)).toEqual({ ok: true, value: input });
    }
  );

  test.each([undefined, null, "", "boleto", 1])(
    "valor inválido (%p) → erro",
    (input) => {
      expect(parseFormaPagamento(input)).toEqual({
        ok: false,
        error: "Forma de pagamento inválida."
      });
    }
  );
});

describe("parseVisitaAmount", () => {
  test("inteiro positivo + pix → ok", () => {
    expect(parseVisitaAmount(4500, "pix")).toEqual({ ok: true, value: 4500 });
  });

  test("0 + cortesia → ok", () => {
    expect(parseVisitaAmount(0, "cortesia")).toEqual({ ok: true, value: 0 });
  });

  test("0 + pix → erro específico", () => {
    expect(parseVisitaAmount(0, "pix")).toEqual({
      ok: false,
      error: "Valor 0 só é permitido quando a forma de pagamento é Cortesia."
    });
  });

  test.each([-1, -100])("negativo (%p) → erro", (input) => {
    expect(parseVisitaAmount(input, "pix")).toEqual({
      ok: false,
      error: "Valor da visita não pode ser negativo."
    });
  });

  test.each([45.5, NaN, Infinity, "4500", null, undefined, {}])(
    "tipo inválido (%p) → erro",
    (input) => {
      expect(parseVisitaAmount(input, "pix")).toEqual({
        ok: false,
        error: "Valor da visita inválido. Envie o valor em centavos (inteiro)."
      });
    }
  );
});
