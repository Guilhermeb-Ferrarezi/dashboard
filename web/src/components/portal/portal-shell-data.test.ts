import { describe, expect, test } from "bun:test";

import { buildPortalSidebarGroups, portalIconMap } from "./portal-shell-data";

describe("portal-shell-data", () => {
  test("each sidebar group exposes an icon key for the shared sidebar style", () => {
    const groups = buildPortalSidebarGroups("/logs");

    expect(groups.map((group) => group.label)).toEqual([
      "Negocio",
      "Jogos",
      "Plataforma",
    ]);

    expect(groups.every((group) => group.iconKey in portalIconMap)).toBe(true);
    expect(groups.some((group) => group.label === "Entrada")).toBe(false);
    expect(
      groups
        .find((group) => group.label === "Plataforma")
        ?.items.map((item) => item.label),
    ).toEqual(["Usuarios", "Publicador", "R2", "Logs", "Dashboard Ops"]);
  });
});
