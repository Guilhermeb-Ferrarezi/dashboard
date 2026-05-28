import { describe, expect, test } from "bun:test";

import { aggregateRealtimeRows } from "../lib/analytics";

describe("aggregateRealtimeRows", () => {
  test("retorna zeros para lista de linhas vazia", () => {
    const result = aggregateRealtimeRows([]);
    expect(result.total).toBe(0);
    expect(result.pages["/play/corujao"]).toBe(0);
    expect(result.pages["/play/mix"]).toBe(0);
  });

  test("retorna zeros para undefined", () => {
    const result = aggregateRealtimeRows(undefined);
    expect(result.total).toBe(0);
  });

  test("identifica página Corujão pela substring 'coruj' no título", () => {
    const result = aggregateRealtimeRows([
      {
        dimensionValues: [{ value: "Corujão — Santos Games Arena" }],
        metricValues: [{ value: "7" }],
      },
    ]);
    expect(result.pages["/play/corujao"]).toBe(7);
    expect(result.pages["/play/mix"]).toBe(0);
    expect(result.total).toBe(7);
  });

  test("identifica página Mix pela substring 'mix' no título", () => {
    const result = aggregateRealtimeRows([
      {
        dimensionValues: [{ value: "Mix — SGA Gaming" }],
        metricValues: [{ value: "3" }],
      },
    ]);
    expect(result.pages["/play/mix"]).toBe(3);
    expect(result.pages["/play/corujao"]).toBe(0);
    expect(result.total).toBe(3);
  });

  test("acumula usuários de múltiplas linhas da mesma página", () => {
    const result = aggregateRealtimeRows([
      {
        dimensionValues: [{ value: "Corujão — Santos Games Arena" }],
        metricValues: [{ value: "5" }],
      },
      {
        dimensionValues: [{ value: "Corujão — SGA" }],
        metricValues: [{ value: "2" }],
      },
    ]);
    expect(result.pages["/play/corujao"]).toBe(7);
    expect(result.total).toBe(7);
  });

  test("soma total inclui páginas fora de SALES_PAGES", () => {
    const result = aggregateRealtimeRows([
      {
        dimensionValues: [{ value: "Home — Santos Tech" }],
        metricValues: [{ value: "10" }],
      },
      {
        dimensionValues: [{ value: "Corujão — SGA" }],
        metricValues: [{ value: "3" }],
      },
    ]);
    expect(result.total).toBe(13);
    expect(result.pages["/play/corujao"]).toBe(3);
  });

  test("comparação é case-insensitive (título em maiúsculas)", () => {
    const result = aggregateRealtimeRows([
      {
        dimensionValues: [{ value: "CORUJÃO ESPECIAL" }],
        metricValues: [{ value: "4" }],
      },
    ]);
    expect(result.pages["/play/corujao"]).toBe(4);
  });

  test("lida com dimensionValues ou metricValues ausentes sem lançar exceção", () => {
    expect(() =>
      aggregateRealtimeRows([{ dimensionValues: undefined, metricValues: undefined }]),
    ).not.toThrow();
  });
});
