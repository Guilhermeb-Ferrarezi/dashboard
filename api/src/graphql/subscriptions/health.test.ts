import { describe, it, expect } from "bun:test";
import { healthPingGenerator } from "./health";

describe("healthPingGenerator", () => {
  it("emite o primeiro valor imediatamente", async () => {
    const gen = healthPingGenerator();
    const first = await gen.next();
    expect(first.done).toBe(false);
    expect(typeof first.value?.serverTs).toBe("number");
    await gen.return(undefined);
  });

  it("fecha em < 100ms quando .return() é chamado entre pings (cleanup via stop signal)", async () => {
    const gen = healthPingGenerator();

    // Consume o primeiro ping (emitido imediatamente no Repeater)
    const first = await gen.next();
    expect(first.done).toBe(false);

    // Agora o Repeater está aguardando o próximo setInterval (30s)
    // Com Repeater, .return() resolve o stop signal imediatamente
    const start = Date.now();
    const closeResult = await Promise.race([
      gen.return(undefined),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("cleanup demorou mais de 100ms")), 100),
      ),
    ]);
    const elapsed = Date.now() - start;

    expect(closeResult.done).toBe(true);
    expect(elapsed).toBeLessThan(100);
  });
});
