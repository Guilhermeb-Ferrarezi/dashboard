import { describe, expect, test } from "bun:test";

import {
  DEFAULT_THEME_PREFERENCES,
  getThemeVariables,
  getEffectiveColorScheme,
  normalizeThemePreferences,
} from "./theme-preferences";

describe("theme-preferences", () => {
  test("keeps onix as a valid theme mode", () => {
    expect(
      normalizeThemePreferences({
        mode: "onix",
      }),
    ).toMatchObject({
      mode: "onix",
    });
  });

  test("maps onix to the dark color scheme for accent variables", () => {
    expect(getEffectiveColorScheme("onix", "light")).toBe("dark");

    const variables = getThemeVariables(
      {
        ...DEFAULT_THEME_PREFERENCES,
      },
      "dark",
    );

    expect(variables["--primary"]).toBe("oklch(0.69 0.17 28)");
  });
});
