import { describe, it, expect, mock } from "bun:test";

mock.module("../../lib/vagas-sse", () => ({
  getVagasPayload: async () => null,
}));

import { vagasUpdateGenerator } from "./vagas";

describe("vagasUpdateGenerator", () => {
  it("emite o primeiro payload imediatamente", async () => {
    const gen = vagasUpdateGenerator();
    const first = await gen.next();
    expect(first.done).toBe(false);
    await gen.return(undefined);
  });

  it("fecha em < 200ms quando .return() é chamado entre polls (cleanup via stop signal)", async () => {
    const gen = vagasUpdateGenerator();

    const first = await gen.next();
    expect(first.done).toBe(false);

    const start = Date.now();
    const closeResult = await Promise.race([
      gen.return(undefined),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("cleanup demorou mais de 200ms")), 200),
      ),
    ]);
    const elapsed = Date.now() - start;

    expect(closeResult.done).toBe(true);
    expect(elapsed).toBeLessThan(200);
  });
});
