import { describe, expect, test } from "bun:test";

import { parsePeriodo } from "./corujao-painel.controller";

describe("parsePeriodo", () => {
  test("default (sem periodo) → 'mes' do mês corrente", () => {
    const out = parsePeriodo({});
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.from).toMatch(/^\d{4}-\d{2}-01$/);
      expect(out.value.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("periodo=mes → from=primeiro dia do mês, to=hoje", () => {
    const out = parsePeriodo({ periodo: "mes" });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.from.endsWith("-01")).toBe(true);
    }
  });

  test("periodo=semana → from=hoje-6 dias", () => {
    const out = parsePeriodo({ periodo: "semana" });
    expect(out.ok).toBe(true);
    if (out.ok) {
      const from = new Date(`${out.value.from}T00:00:00`);
      const to = new Date(`${out.value.to}T00:00:00`);
      const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      expect(diff).toBe(6); // 7 dias inclusivos = diferença de 6
    }
  });

  test("periodo=todos → from=1970-01-01", () => {
    const out = parsePeriodo({ periodo: "todos" });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value.from).toBe("1970-01-01");
  });

  test("periodo=custom com datas válidas", () => {
    const out = parsePeriodo({ periodo: "custom", from: "2026-01-01", to: "2026-01-31" });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.from).toBe("2026-01-01");
      expect(out.value.to).toBe("2026-01-31");
    }
  });

  test("periodo=custom sem from/to → erro específico", () => {
    expect(parsePeriodo({ periodo: "custom" })).toEqual({
      ok: false,
      error: "Datas custom obrigatórias: from e to (YYYY-MM-DD)."
    });
  });

  test("periodo=custom com formato errado → erro", () => {
    expect(parsePeriodo({ periodo: "custom", from: "01/01/2026", to: "31/01/2026" })).toEqual({
      ok: false,
      error: "Datas custom obrigatórias: from e to (YYYY-MM-DD)."
    });
  });

  test("periodo=custom com from > to → erro", () => {
    expect(parsePeriodo({ periodo: "custom", from: "2026-12-01", to: "2026-01-01" })).toEqual({
      ok: false,
      error: "Data inicial não pode ser maior que a final."
    });
  });

  test("periodo desconhecido → erro", () => {
    expect(parsePeriodo({ periodo: "ano" })).toEqual({
      ok: false,
      error: "Período inválido. Use mes, semana, todos ou custom."
    });
  });
});
