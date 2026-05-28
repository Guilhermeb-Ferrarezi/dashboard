import { describe, expect, test } from "bun:test";

import { shouldSkipLogging } from "./request-logs";

function req(originalUrl: string, method = "GET") {
  return { originalUrl, method };
}

describe("shouldSkipLogging", () => {
  test("suprime rota na blacklist completa independente do método", () => {
    expect(shouldSkipLogging(req("/api/logs", "POST"))).toBe(true);
    expect(shouldSkipLogging(req("/api/logs/anything", "DELETE"))).toBe(true);
    expect(shouldSkipLogging(req("/api/portal/recents", "GET"))).toBe(true);
  });

  test("suprime GET de rota na blacklist de GET", () => {
    expect(shouldSkipLogging(req("/api/user/me"))).toBe(true);
    expect(shouldSkipLogging(req("/api/vct/inscricoes"))).toBe(true);
    expect(shouldSkipLogging(req("/api/health/sse"))).toBe(true);
  });

  test("não suprime POST/PUT/DELETE em rota da blacklist de GET", () => {
    expect(shouldSkipLogging(req("/api/user/me", "POST"))).toBe(false);
    expect(shouldSkipLogging(req("/api/vct", "PUT"))).toBe(false);
  });

  test("não suprime rota fora de qualquer blacklist", () => {
    expect(shouldSkipLogging(req("/api/admin/users", "POST"))).toBe(false);
    expect(shouldSkipLogging(req("/api/dashboard", "GET"))).toBe(false);
    expect(shouldSkipLogging(req("/api/sso/exchange", "POST"))).toBe(false);
  });

  test("usa correspondência por prefixo (startsWith)", () => {
    expect(shouldSkipLogging(req("/api/logs/projects?page=1"))).toBe(true);
    expect(shouldSkipLogging(req("/api/logssomethingelse"))).toBe(true);
  });
});
