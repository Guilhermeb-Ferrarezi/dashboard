import { describe, expect, test } from "bun:test";

import { broadcast, startHealthBroadcast, stopHealthBroadcast } from "./health-sse";

// Após a migração para Hono/streamSSE, o broadcast é por-cliente (cada
// conexão SSE tem seu próprio intervalo). As funções exportadas são no-ops
// mantidos para compatibilidade de importação.
describe("health-sse broadcast", () => {
  test("broadcast não lança exceção (no-op por design)", () => {
    expect(() => broadcast()).not.toThrow();
  });

  test("startHealthBroadcast não lança exceção (no-op por design)", () => {
    expect(() => startHealthBroadcast()).not.toThrow();
  });

  test("stopHealthBroadcast não lança exceção (no-op por design)", () => {
    expect(() => stopHealthBroadcast()).not.toThrow();
  });

  test("chamadas encadeadas não lançam exceção", () => {
    expect(() => {
      startHealthBroadcast();
      broadcast();
      stopHealthBroadcast();
    }).not.toThrow();
  });
});
