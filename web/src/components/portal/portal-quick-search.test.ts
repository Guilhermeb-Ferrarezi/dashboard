import { describe, expect, test } from "bun:test";

import {
  buildStaticSearchResults,
  buildLogsProjectSearchResult,
  filterPortalSearchResults,
} from "./portal-quick-search";

describe("portal-quick-search", () => {
  test("usa o grupo como contexto para trazer os filhos", () => {
    const staticResults = buildStaticSearchResults("/logs");
    const results = filterPortalSearchResults({
      results: staticResults,
      query: "vct",
    });

    expect(results.every((item) => item.kind !== "group")).toBe(true);
    expect(results[0]?.label).toBe("VCT");
    expect(results.some((item) => item.breadcrumb === "VCT > Inscricoes")).toBe(true);
    expect(results.some((item) => item.breadcrumb === "VCT > Formacoes")).toBe(true);
  });

  test("mostra hierarquia no breadcrumb", () => {
    const staticResults = buildStaticSearchResults("/logs");
    const results = filterPortalSearchResults({
      results: staticResults,
      query: "inscricoes",
    });

    expect(results.some((item) => item.breadcrumb === "VCT > Inscricoes")).toBe(true);
    expect(results.every((item) => item.kind !== "group")).toBe(true);
  });

  test("limita a quantidade de itens visíveis", () => {
    const staticResults = buildStaticSearchResults("/logs");
    const results = filterPortalSearchResults({
      results: staticResults,
      query: "",
    });

    expect(results.length).toBeLessThanOrEqual(6);
  });

  test("filtra por itens dentro de um grupo", () => {
    const staticResults = buildStaticSearchResults("/logs");
    const results = filterPortalSearchResults({
      results: staticResults,
      query: "inscricoes",
    });

    expect(results.some((item) => item.breadcrumb.includes("Inscricoes"))).toBe(true);
    expect(results.every((item) => item.value.toLowerCase().includes("inscricoes"))).toBe(true);
  });

  test("remove duplicatas pela mesma rota e prefere o breadcrumb", () => {
    const results = filterPortalSearchResults({
      results: [
        {
          id: "plain",
          label: "Inscricoes",
          description: "plain",
          value: "inscricoes",
          group: "Jogos",
          contextPath: "Jogos",
          breadcrumb: "Inscricoes",
          kind: "resource",
          href: "/counter-strike/inscricoes",
          iconKey: "sparkles",
        },
        {
          id: "hier",
          label: "Inscricoes",
          description: "hier",
          value: "counter strike inscricoes",
          group: "Jogos / Counter-strike",
          contextPath: "Jogos / Counter-strike",
          breadcrumb: "Counter-strike > Inscricoes",
          kind: "resource",
          href: "/counter-strike/inscricoes",
          iconKey: "sparkles",
        },
      ],
      query: "inscricoes",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.breadcrumb).toBe("Counter-strike > Inscricoes");
  });

  test("os filhos herdam o mesmo icone do pai do grupo", () => {
    const results = filterPortalSearchResults({
      results: buildStaticSearchResults("/logs"),
      query: "vct",
    });

    const parent = results.find((item) => item.breadcrumb === "VCT");
    const child = results.find((item) => item.breadcrumb === "VCT > Inscricoes");

    expect(parent?.iconKey).toBe(child?.iconKey);
  });

  test("os projetos de logs aparecem com breadcrumb hierarquico", () => {
    const result = buildLogsProjectSearchResult({
      id: "portal-aluno",
      name: "Portal aluno",
      slug: "portal-aluno",
      apiKey: "abc",
      totalLogs: 12,
    });

    expect(result.breadcrumb).toBe("Logs > Portal aluno");
    expect(result.group).toBe("Logs");
  });
});
