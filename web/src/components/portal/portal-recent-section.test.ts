import { describe, expect, test } from "bun:test";

import { resolvePortalRecentItem } from "./portal-shell-data";

describe("portal-recent-section", () => {
  test("não mostra a rota literal nos dados do recente", () => {
    const recentItem = resolvePortalRecentItem("/vct/inscricoes", "/logs");

    expect(recentItem).not.toBeNull();
    expect(recentItem?.label).toBe("Inscricoes");
    expect(recentItem?.group).toBe("VCT");
    expect(recentItem?.href).toBe("/vct/inscricoes");
  });

  test("nao registra home como recente", () => {
    expect(resolvePortalRecentItem("/home", "/logs")).toBeNull();
  });

  test("logs com colecao usam o nome da colecao no grupo", () => {
    const recentItem = resolvePortalRecentItem("/logs/portal-aluno", "/logs", "Portal aluno");

    expect(recentItem?.label).toBe("Logs");
    expect(recentItem?.group).toBe("Logs / Portal aluno");
  });
});
