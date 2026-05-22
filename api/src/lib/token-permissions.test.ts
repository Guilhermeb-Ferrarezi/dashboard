import { describe, expect, test } from "bun:test";

import { hasTokenPermission, validatePermissions } from "./token-permissions";

describe("hasTokenPermission", () => {
  test("array vazio concede acesso total (comportamento legado)", () => {
    expect(hasTokenPermission([], "checkout:read")).toBe(true);
    expect(hasTokenPermission([], "admin:admin")).toBe(true);
    expect(hasTokenPermission([], "*:read")).toBe(true);
  });

  test("*:admin cobre qualquer escopo", () => {
    expect(hasTokenPermission(["*:admin"], "checkout:read")).toBe(true);
    expect(hasTokenPermission(["*:admin"], "admin:write")).toBe(true);
    expect(hasTokenPermission(["*:admin"], "codex:write")).toBe(true);
  });

  test("*:read cobre leitura de qualquer recurso", () => {
    expect(hasTokenPermission(["*:read"], "checkout:read")).toBe(true);
    expect(hasTokenPermission(["*:read"], "projects:read")).toBe(true);
    expect(hasTokenPermission(["*:read"], "checkout:write")).toBe(false);
    expect(hasTokenPermission(["*:read"], "checkout:admin")).toBe(false);
  });

  test("*:write cobre leitura e escrita", () => {
    expect(hasTokenPermission(["*:write"], "checkout:read")).toBe(true);
    expect(hasTokenPermission(["*:write"], "checkout:write")).toBe(true);
    expect(hasTokenPermission(["*:write"], "checkout:admin")).toBe(false);
  });

  test("recurso especifico cobre apenas aquele recurso", () => {
    expect(hasTokenPermission(["checkout:read"], "checkout:read")).toBe(true);
    expect(hasTokenPermission(["checkout:read"], "projects:read")).toBe(false);
    expect(hasTokenPermission(["checkout:write"], "checkout:read")).toBe(true);
    expect(hasTokenPermission(["checkout:write"], "checkout:write")).toBe(true);
    expect(hasTokenPermission(["checkout:write"], "checkout:admin")).toBe(false);
  });

  test("multiplas permissoes sao verificadas individualmente", () => {
    const perms = ["checkout:read", "projects:write"];
    expect(hasTokenPermission(perms, "checkout:read")).toBe(true);
    expect(hasTokenPermission(perms, "projects:read")).toBe(true);
    expect(hasTokenPermission(perms, "projects:write")).toBe(true);
    expect(hasTokenPermission(perms, "logs:read")).toBe(false);
    expect(hasTokenPermission(perms, "admin:admin")).toBe(false);
  });
});

describe("validatePermissions", () => {
  test("filtra escopos invalidos", () => {
    const result = validatePermissions(["checkout:read", "invalid:scope", "fake"]);
    expect(result).toEqual(["checkout:read"]);
  });

  test("retorna array vazio para entrada nao-array", () => {
    expect(validatePermissions(null)).toEqual([]);
    expect(validatePermissions("checkout:read")).toEqual([]);
    expect(validatePermissions(42)).toEqual([]);
  });

  test("aceita todos os escopos validos", () => {
    const result = validatePermissions(["checkout:read", "codex:write", "admin:admin"]);
    expect(result).toEqual(["checkout:read", "codex:write", "admin:admin"]);
  });
});
