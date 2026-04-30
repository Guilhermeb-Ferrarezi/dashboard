export type ThemeMode = "light" | "dark" | "system";
export type ThemeAccent = "ember" | "sky" | "emerald" | "violet" | "custom";
export type ThemeRadius = "sm" | "md" | "lg";
export type ThemeDensity = "compact" | "comfortable" | "spacious";

export interface ThemePreferences {
  mode: ThemeMode;
  accent: ThemeAccent;
  customAccentColor: string;
  radius: ThemeRadius;
  density: ThemeDensity;
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  mode: "system",
  accent: "ember",
  customAccentColor: "#f97316",
  radius: "md",
  density: "comfortable",
};

const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];
const THEME_ACCENTS: ThemeAccent[] = ["ember", "sky", "emerald", "violet", "custom"];
const THEME_RADII: ThemeRadius[] = ["sm", "md", "lg"];
const THEME_DENSITIES: ThemeDensity[] = ["compact", "comfortable", "spacious"];
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function isAllowedValue<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === "string" && allowedValues.includes(value as T);
}

export function normalizeThemePreferences(input?: Partial<ThemePreferences> | null): ThemePreferences {
  const preferences = input ?? {};
  const customAccentColor =
    typeof preferences.customAccentColor === "string" &&
    HEX_COLOR_PATTERN.test(preferences.customAccentColor)
      ? preferences.customAccentColor.toLowerCase()
      : DEFAULT_THEME_PREFERENCES.customAccentColor;

  return {
    mode: isAllowedValue(preferences.mode, THEME_MODES)
      ? preferences.mode
      : DEFAULT_THEME_PREFERENCES.mode,
    accent: isAllowedValue(preferences.accent, THEME_ACCENTS)
      ? preferences.accent
      : DEFAULT_THEME_PREFERENCES.accent,
    customAccentColor,
    radius: isAllowedValue(preferences.radius, THEME_RADII)
      ? preferences.radius
      : DEFAULT_THEME_PREFERENCES.radius,
    density: isAllowedValue(preferences.density, THEME_DENSITIES)
      ? preferences.density
      : DEFAULT_THEME_PREFERENCES.density,
  };
}
