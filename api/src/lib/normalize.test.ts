import { describe, expect, test } from "bun:test";

import { escapeHtml, normalizeEmail } from "./normalize";

describe("normalizeEmail", () => {
  test("normaliza para minúsculas e remove espaços", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  test("retorna undefined para string vazia", () => {
    expect(normalizeEmail("")).toBeUndefined();
  });

  test("retorna undefined para undefined", () => {
    expect(normalizeEmail(undefined)).toBeUndefined();
  });
});

describe("escapeHtml", () => {
  test("escapa & < > \" '", () => {
    expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe(
      "a &amp; b &lt; c &gt; d &quot;e&quot; &#39;f&#39;",
    );
  });

  test("retorna string sem caracteres especiais inalterada", () => {
    expect(escapeHtml("Santos Tech")).toBe("Santos Tech");
  });

  test("escapa tag de script completa", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  test("escapa atributo HTML com aspas duplas", () => {
    expect(escapeHtml('"><img src=x onerror=alert(1)>')).toBe(
      "&quot;&gt;&lt;img src=x onerror=alert(1)&gt;",
    );
  });

  test("escapa string vazia sem erros", () => {
    expect(escapeHtml("")).toBe("");
  });

  test("escapa chargeId externo com caracteres HTML", () => {
    expect(escapeHtml("ch_abc<>123")).toBe("ch_abc&lt;&gt;123");
  });
});
