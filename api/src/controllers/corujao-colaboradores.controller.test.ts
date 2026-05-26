import { describe, expect, test } from "bun:test";

import { parseColaboradorNome } from "./corujao-colaboradores.controller";

describe("parseColaboradorNome", () => {
  test.each([undefined, null, 1, true, {}, "", "   "])(
    "input inválido (%p) → erro",
    (input) => {
      expect(parseColaboradorNome(input)).toEqual({
        ok: false,
        error: "Nome do colaborador é obrigatório."
      });
    }
  );

  test("string com espaço nas pontas → trim", () => {
    expect(parseColaboradorNome("  Henrique  ")).toEqual({
      ok: true,
      value: "Henrique"
    });
  });

  test("nome com 1 caractere é aceito", () => {
    expect(parseColaboradorNome("X")).toEqual({ ok: true, value: "X" });
  });

  test("nome com acentuação é mantido", () => {
    expect(parseColaboradorNome("João da Silva")).toEqual({
      ok: true,
      value: "João da Silva"
    });
  });
});
