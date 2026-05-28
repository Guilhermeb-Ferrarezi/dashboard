import { describe, expect, mock, test } from "bun:test";

import { addHealthClient, broadcast } from "./health-sse";

function makeMockRes(onWrite?: (msg: string) => void) {
  let closeFn: () => void = () => {};
  const res = {
    writeHead: mock(() => {}),
    flushHeaders: mock(() => {}),
    write: mock((msg: string) => {
      onWrite?.(msg);
    }),
    on: mock((event: string, cb: () => void) => {
      if (event === "close") closeFn = cb;
    }),
    simulateClose: () => closeFn(),
  };
  return res as unknown as typeof res & { simulateClose: () => void };
}

describe("health-sse broadcast", () => {
  test("entrega mensagem para clientes saudáveis", () => {
    const received: string[] = [];
    const client = makeMockRes((m) => received.push(m));
    addHealthClient(client as any);
    const before = received.length;

    broadcast();

    expect(received.length).toBeGreaterThan(before);
    client.simulateClose();
  });

  test("não lança exceção quando write de um cliente falha", () => {
    let callCount = 0;
    let closeFn = () => {};
    const badRes = {
      writeHead: mock(() => {}),
      flushHeaders: mock(() => {}),
      write: mock(() => {
        callCount++;
        // primeiras 2 chamadas são de addHealthClient (":ok" + payload inicial)
        if (callCount > 2) throw new Error("broken pipe");
      }),
      on: mock((event: string, cb: () => void) => {
        if (event === "close") closeFn = cb;
      }),
    } as any;

    addHealthClient(badRes);
    expect(() => broadcast()).not.toThrow();
    closeFn();
  });

  test("continua enviando para outros clientes após falha de um write", () => {
    // bad adicionado primeiro para ser iterado antes do good
    let badCallCount = 0;
    let badCloseFn = () => {};
    const badRes = {
      writeHead: mock(() => {}),
      flushHeaders: mock(() => {}),
      write: mock(() => {
        badCallCount++;
        if (badCallCount > 2) throw new Error("socket destroyed");
      }),
      on: mock((event: string, cb: () => void) => {
        if (event === "close") badCloseFn = cb;
      }),
    } as any;

    const goodMessages: string[] = [];
    let goodCloseFn = () => {};
    const goodRes = {
      writeHead: mock(() => {}),
      flushHeaders: mock(() => {}),
      write: mock((m: string) => goodMessages.push(m)),
      on: mock((event: string, cb: () => void) => {
        if (event === "close") goodCloseFn = cb;
      }),
    } as any;

    addHealthClient(badRes);
    addHealthClient(goodRes);
    const before = goodMessages.length;

    expect(() => broadcast()).not.toThrow();
    expect(goodMessages.length).toBeGreaterThan(before);

    goodCloseFn();
    badCloseFn();
  });

  test("cliente com falha no write é removido do Set após o broadcast", () => {
    let callCount = 0;
    let closeFn = () => {};
    const badRes = {
      writeHead: mock(() => {}),
      flushHeaders: mock(() => {}),
      write: mock(() => {
        callCount++;
        if (callCount > 2) throw new Error("broken pipe");
      }),
      on: mock((event: string, cb: () => void) => {
        if (event === "close") closeFn = cb;
      }),
    } as any;

    addHealthClient(badRes);

    broadcast(); // expulsa badRes do Set por exceção

    // Segundo broadcast não deve chamar write em badRes
    const writesBefore = (badRes.write as ReturnType<typeof mock>).mock.calls.length;
    broadcast();
    const writesAfter = (badRes.write as ReturnType<typeof mock>).mock.calls.length;

    expect(writesAfter).toBe(writesBefore);
    closeFn();
  });
});
