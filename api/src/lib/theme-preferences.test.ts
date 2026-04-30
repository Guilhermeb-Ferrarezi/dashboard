import { describe, expect, test } from "bun:test";

import {
  DEFAULT_THEME_PREFERENCES,
  normalizeThemePreferences,
} from "./theme-preferences";

describe("normalizeThemePreferences", () => {
  test("returns defaults for missing values", () => {
    expect(normalizeThemePreferences()).toEqual(DEFAULT_THEME_PREFERENCES);
  });

  test("falls back to defaults for invalid values", () => {
    expect(
      normalizeThemePreferences({
        mode: "night" as never,
        accent: "pink" as never,
        customAccentColor: "red",
        radius: "wide" as never,
        density: "dense" as never,
      }),
    ).toEqual(DEFAULT_THEME_PREFERENCES);
  });

  test("keeps a valid custom accent color", () => {
    expect(
      normalizeThemePreferences({
        accent: "custom" as never,
        customAccentColor: "#2563eb",
      }),
    ).toMatchObject({
      accent: "custom",
      customAccentColor: "#2563eb",
    });
  });
});
