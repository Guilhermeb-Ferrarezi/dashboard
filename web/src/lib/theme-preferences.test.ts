import { describe, expect, test } from "bun:test";

import {
  DEFAULT_THEME_PREFERENCES,
  getThemeVariables,
  normalizeThemePreferences,
} from "./theme-preferences";

describe("theme-preferences", () => {
  test("keeps onix as a valid accent", () => {
    expect(
      normalizeThemePreferences({
        accent: "onix",
      }),
    ).toMatchObject({
      accent: "onix",
    });
  });

  test("maps onix to a black primary palette", () => {
    const variables = getThemeVariables(
      {
        ...DEFAULT_THEME_PREFERENCES,
        accent: "onix",
      },
      "light",
    );

    expect(variables["--primary"]).toBe("oklch(0 0 0)");
    expect(variables["--ring"]).toBe("oklch(0 0 0)");
  });
});
