import { describe, expect, test } from "bun:test";
import { normalizeEmail, escapeHtml } from "./normalize";

describe("normalizeEmail", () => {
  test("converte para minúsculas e remove espaços", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  test("retorna undefined para valor vazio", () => {
    expect(normalizeEmail("")).toBeUndefined();
    expect(normalizeEmail(undefined)).toBeUndefined();
  });
});

describe("escapeHtml", () => {
  test("escapa tags HTML de script", () => {
    const input = '<script>alert("xss")</script>';
    expect(escapeHtml(input)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
  });

  test("escapa injeção via atributo onerror", () => {
    const input = "<img src=x onerror=alert(1)>";
    expect(escapeHtml(input)).toBe(
      "&lt;img src=x onerror=alert(1)&gt;"
    );
  });

  test("escapa ampersand", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  test("escapa aspas simples e duplas", () => {
    expect(escapeHtml(`"olá" e 'mundo'`)).toBe(
      "&quot;olá&quot; e &#39;mundo&#39;"
    );
  });

  test("preserva texto simples sem alteração", () => {
    const text = "Promoção válida até 31/12";
    expect(escapeHtml(text)).toBe(text);
  });

  test("escapa corretamente conteúdo multiline (body de email)", () => {
    const body = "<b>Desconto</b>\n50%";
    const escaped = escapeHtml(body).replace(/\n/g, "<br>");
    expect(escaped).toBe("&lt;b&gt;Desconto&lt;/b&gt;<br>50%");
  });
});
