import { describe, expect, test } from "bun:test";

import { classifyExecBusinessReadPrompt } from "./codex";

describe("codex exec business reads", () => {
  test("roteia contagem de times inscritos para o endpoint documentado", () => {
    expect(classifyExecBusinessReadPrompt("quantos times estão inscritos")).toEqual({
      kind: "vct_team_count",
      path: "/vct/times",
      modalidade: null,
    });
  });

  test("preserva filtro de modalidade quando o prompt especifica o jogo", () => {
    expect(classifyExecBusinessReadPrompt("quantos times de valorant estão inscritos")).toEqual({
      kind: "vct_team_count",
      path: "/vct/times?modalidade=valorant",
      modalidade: "valorant",
    });
  });

  test("roteia contagem de inscricoes sem mencionar times", () => {
    expect(classifyExecBusinessReadPrompt("quantos inscritos temos hoje")).toEqual({
      kind: "vct_registration_count",
      path: "/vct/inscricoes",
      modalidade: null,
    });
  });
});
