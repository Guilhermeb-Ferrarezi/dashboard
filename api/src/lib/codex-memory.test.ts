import { describe, it, expect } from "bun:test";
import { EventEmitter } from "node:events";
import { trackCodexChild, getActiveCodexChildCount } from "./codex";

// Garante que o contador de processos `codex` vivos DECREMENTA no fim do
// processo — senão a própria métrica de diagnóstico viraria um falso "leak".
describe("registro de processos codex (instrumentação de memória)", () => {
  it("incrementa ao rastrear e decrementa no close", () => {
    const before = getActiveCodexChildCount();
    const child = new EventEmitter();
    trackCodexChild(child as never);
    expect(getActiveCodexChildCount()).toBe(before + 1);

    child.emit("close", 0, null);
    expect(getActiveCodexChildCount()).toBe(before);
  });

  it("decrementa no exit", () => {
    const before = getActiveCodexChildCount();
    const child = new EventEmitter();
    trackCodexChild(child as never);
    expect(getActiveCodexChildCount()).toBe(before + 1);

    child.emit("exit", 0, null);
    expect(getActiveCodexChildCount()).toBe(before);
  });

  it("decrementa no error", () => {
    const before = getActiveCodexChildCount();
    const child = new EventEmitter();
    trackCodexChild(child as never);
    expect(getActiveCodexChildCount()).toBe(before + 1);

    child.emit("error", new Error("falha simulada"));
    expect(getActiveCodexChildCount()).toBe(before);
  });
});
