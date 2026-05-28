import { describe, it, expect } from "bun:test";
import { healthPingGenerator } from "./health";

describe("healthPingGenerator", () => {
  it("fecha dentro de 500ms quando .return() é chamado durante o sleep", async () => {
    const gen = healthPingGenerator();
    const first = await gen.next();
    expect(first.done).toBe(false);
    expect(first.value).toHaveProperty("serverTs");

    const closePromise = gen.return(undefined);
    const result = await Promise.race([
      closePromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("generator não fechou a tempo")), 500),
      ),
    ]);
    expect(result.done).toBe(true);
  });
});
