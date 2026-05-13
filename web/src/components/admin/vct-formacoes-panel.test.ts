import { describe, expect, test } from "bun:test";

import {
  VCT_FORMACOES_DIALOG_CLASSNAME,
  VCT_FORMACOES_DIALOG_CONTENT_CLASSNAME,
  VCT_FORMACOES_DIALOG_LAYOUT_CLASSNAME,
  VCT_FORMACOES_DIALOG_SIDEBAR_CLASSNAME,
  formatWhatsApp,
  getMemberName,
  getTeamMembers,
} from "./vct-formacoes-panel";
import type { VctFormacaoSummary } from "@/types/portal";

function makeFormacao(overrides: Partial<VctFormacaoSummary["membros"][number]>) {
  return {
    _id: "member-1",
    modalidade: "valorant" as const,
    formacaoTimeId: "team-1",
    ordem: 1,
    papel: "jogador" as const,
    nome: "  ",
    email: "player@example.com",
    instagram: "@player",
    whatsapp: "16999999999",
    nick: "player#001",
    eloAtual: "Ferro 1",
    peakRanking: "Ferro 3",
    ...overrides,
  };
}

describe("vct-formacoes-panel", () => {
  test("keeps the modal wide and scrollable", () => {
    expect(VCT_FORMACOES_DIALOG_CLASSNAME).toContain("!w-[min(96vw,1400px)]");
    expect(VCT_FORMACOES_DIALOG_CLASSNAME).toContain("sm:!max-w-none");
    expect(VCT_FORMACOES_DIALOG_CLASSNAME).toContain("overflow-hidden");
    expect(VCT_FORMACOES_DIALOG_LAYOUT_CLASSNAME).toContain("md:grid-cols-[320px_minmax(0,1fr)]");
    expect(VCT_FORMACOES_DIALOG_SIDEBAR_CLASSNAME).toContain("overflow-y-auto");
    expect(VCT_FORMACOES_DIALOG_CONTENT_CLASSNAME).toContain("overflow-y-auto");
  });

  test("sorts members by ordem before rendering", () => {
    const membros = getTeamMembers({
      _id: "team-1",
      modalidade: "valorant",
      nome: "Team",
      tag: "TST",
      logoKey: "key",
      logoUrl: "url",
      membroCount: 3,
      createdAt: "2026-05-13T16:37:00.000Z",
      membros: [
        makeFormacao({ _id: "3", ordem: 3 }),
        makeFormacao({ _id: "1", ordem: 1 }),
        makeFormacao({ _id: "2", ordem: 2 }),
      ],
    });

    expect(membros.map((member) => member._id)).toEqual(["1", "2", "3"]);
  });

  test("falls back to nick when the name is empty", () => {
    expect(
      getMemberName(
        makeFormacao({
          nome: "   ",
          nick: "fallback#123",
        }),
      ),
    ).toBe("fallback#123");
  });

  test("formats whatsapp numbers in the displayed shape", () => {
    expect(formatWhatsApp("16999999999")).toBe("(16) 99999-9999");
    expect(formatWhatsApp("1699")).toBe("(16) 99");
  });
});
