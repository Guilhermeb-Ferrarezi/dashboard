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

export const THEME_MODE_OPTIONS: Array<{
  value: ThemeMode;
  label: string;
  description: string;
}> = [
  { value: "system", label: "Sistema", description: "Segue o modo do aparelho." },
  { value: "light", label: "Claro", description: "Forca uma interface clara." },
  { value: "dark", label: "Escuro", description: "Forca uma interface escura." },
];

export const THEME_ACCENT_OPTIONS: Array<{
  value: ThemeAccent;
  label: string;
  description: string;
}> = [
  { value: "ember", label: "Ember", description: "Tom quente e atual." },
  { value: "sky", label: "Sky", description: "Azul mais tecnico." },
  { value: "emerald", label: "Emerald", description: "Verde mais neutro." },
  { value: "violet", label: "Violet", description: "Acento mais expressivo." },
  { value: "custom", label: "Custom", description: "Escolha uma cor." },
];

export const THEME_RADIUS_OPTIONS: Array<{
  value: ThemeRadius;
  label: string;
  description: string;
}> = [
  { value: "sm", label: "Pequeno", description: "Bordas mais retas." },
  { value: "md", label: "Padrao", description: "Equilibrio visual atual." },
  { value: "lg", label: "Grande", description: "Cantos mais suaves." },
];

export const THEME_DENSITY_OPTIONS: Array<{
  value: ThemeDensity;
  label: string;
  description: string;
}> = [
  { value: "compact", label: "Compacta", description: "Menos espaco entre blocos." },
  { value: "comfortable", label: "Confortavel", description: "Espacamento padrao." },
  { value: "spacious", label: "Ampla", description: "Mais respiro visual." },
];

type ThemePalette = {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarRing: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
};

const THEME_PALETTES: Record<
  Exclude<ThemeAccent, "custom">,
  Record<"light" | "dark", ThemePalette>
> = {
  ember: {
    light: {
      primary: "oklch(0.55 0.17 28)",
      primaryForeground: "oklch(0.99 0.01 95)",
      accent: "oklch(0.91 0.05 73)",
      accentForeground: "oklch(0.25 0.03 240)",
      ring: "oklch(0.55 0.17 28)",
      sidebarPrimary: "oklch(0.69 0.17 28)",
      sidebarPrimaryForeground: "oklch(0.99 0.01 95)",
      sidebarAccent: "oklch(0.32 0.03 248)",
      sidebarAccentForeground: "oklch(0.98 0.01 95)",
      sidebarRing: "oklch(0.69 0.17 28)",
      chart1: "oklch(0.7 0.18 28)",
      chart2: "oklch(0.72 0.15 130)",
      chart3: "oklch(0.68 0.13 235)",
      chart4: "oklch(0.77 0.13 78)",
      chart5: "oklch(0.6 0.08 310)",
    },
    dark: {
      primary: "oklch(0.69 0.17 28)",
      primaryForeground: "oklch(0.16 0.02 248)",
      accent: "oklch(0.31 0.04 76)",
      accentForeground: "oklch(0.97 0.01 95)",
      ring: "oklch(0.69 0.17 28)",
      sidebarPrimary: "oklch(0.69 0.17 28)",
      sidebarPrimaryForeground: "oklch(0.18 0.02 248)",
      sidebarAccent: "oklch(0.26 0.03 248)",
      sidebarAccentForeground: "oklch(0.98 0.01 95)",
      sidebarRing: "oklch(0.69 0.17 28)",
      chart1: "oklch(0.69 0.17 28)",
      chart2: "oklch(0.72 0.15 130)",
      chart3: "oklch(0.7 0.13 235)",
      chart4: "oklch(0.77 0.13 78)",
      chart5: "oklch(0.63 0.08 310)",
    },
  },
  sky: {
    light: {
      primary: "oklch(0.57 0.15 250)",
      primaryForeground: "oklch(0.99 0.01 95)",
      accent: "oklch(0.93 0.03 240)",
      accentForeground: "oklch(0.24 0.03 240)",
      ring: "oklch(0.57 0.15 250)",
      sidebarPrimary: "oklch(0.67 0.15 250)",
      sidebarPrimaryForeground: "oklch(0.99 0.01 95)",
      sidebarAccent: "oklch(0.33 0.03 248)",
      sidebarAccentForeground: "oklch(0.98 0.01 95)",
      sidebarRing: "oklch(0.67 0.15 250)",
      chart1: "oklch(0.67 0.15 250)",
      chart2: "oklch(0.72 0.15 130)",
      chart3: "oklch(0.68 0.13 235)",
      chart4: "oklch(0.77 0.13 78)",
      chart5: "oklch(0.6 0.08 310)",
    },
    dark: {
      primary: "oklch(0.74 0.13 250)",
      primaryForeground: "oklch(0.17 0.02 248)",
      accent: "oklch(0.3 0.04 248)",
      accentForeground: "oklch(0.97 0.01 95)",
      ring: "oklch(0.74 0.13 250)",
      sidebarPrimary: "oklch(0.74 0.13 250)",
      sidebarPrimaryForeground: "oklch(0.17 0.02 248)",
      sidebarAccent: "oklch(0.26 0.03 248)",
      sidebarAccentForeground: "oklch(0.98 0.01 95)",
      sidebarRing: "oklch(0.74 0.13 250)",
      chart1: "oklch(0.74 0.13 250)",
      chart2: "oklch(0.72 0.15 130)",
      chart3: "oklch(0.7 0.13 235)",
      chart4: "oklch(0.77 0.13 78)",
      chart5: "oklch(0.63 0.08 310)",
    },
  },
  emerald: {
    light: {
      primary: "oklch(0.58 0.13 155)",
      primaryForeground: "oklch(0.99 0.01 95)",
      accent: "oklch(0.94 0.03 155)",
      accentForeground: "oklch(0.24 0.03 240)",
      ring: "oklch(0.58 0.13 155)",
      sidebarPrimary: "oklch(0.68 0.13 155)",
      sidebarPrimaryForeground: "oklch(0.99 0.01 95)",
      sidebarAccent: "oklch(0.32 0.03 248)",
      sidebarAccentForeground: "oklch(0.98 0.01 95)",
      sidebarRing: "oklch(0.68 0.13 155)",
      chart1: "oklch(0.68 0.13 155)",
      chart2: "oklch(0.72 0.15 130)",
      chart3: "oklch(0.68 0.13 235)",
      chart4: "oklch(0.77 0.13 78)",
      chart5: "oklch(0.6 0.08 310)",
    },
    dark: {
      primary: "oklch(0.73 0.12 155)",
      primaryForeground: "oklch(0.17 0.02 248)",
      accent: "oklch(0.3 0.04 155)",
      accentForeground: "oklch(0.97 0.01 95)",
      ring: "oklch(0.73 0.12 155)",
      sidebarPrimary: "oklch(0.73 0.12 155)",
      sidebarPrimaryForeground: "oklch(0.17 0.02 248)",
      sidebarAccent: "oklch(0.26 0.03 248)",
      sidebarAccentForeground: "oklch(0.98 0.01 95)",
      sidebarRing: "oklch(0.73 0.12 155)",
      chart1: "oklch(0.73 0.12 155)",
      chart2: "oklch(0.72 0.15 130)",
      chart3: "oklch(0.7 0.13 235)",
      chart4: "oklch(0.77 0.13 78)",
      chart5: "oklch(0.63 0.08 310)",
    },
  },
  violet: {
    light: {
      primary: "oklch(0.57 0.15 300)",
      primaryForeground: "oklch(0.99 0.01 95)",
      accent: "oklch(0.93 0.04 300)",
      accentForeground: "oklch(0.24 0.03 240)",
      ring: "oklch(0.57 0.15 300)",
      sidebarPrimary: "oklch(0.68 0.15 300)",
      sidebarPrimaryForeground: "oklch(0.99 0.01 95)",
      sidebarAccent: "oklch(0.32 0.03 248)",
      sidebarAccentForeground: "oklch(0.98 0.01 95)",
      sidebarRing: "oklch(0.68 0.15 300)",
      chart1: "oklch(0.68 0.15 300)",
      chart2: "oklch(0.72 0.15 130)",
      chart3: "oklch(0.68 0.13 235)",
      chart4: "oklch(0.77 0.13 78)",
      chart5: "oklch(0.6 0.08 310)",
    },
    dark: {
      primary: "oklch(0.74 0.14 300)",
      primaryForeground: "oklch(0.17 0.02 248)",
      accent: "oklch(0.3 0.04 300)",
      accentForeground: "oklch(0.97 0.01 95)",
      ring: "oklch(0.74 0.14 300)",
      sidebarPrimary: "oklch(0.74 0.14 300)",
      sidebarPrimaryForeground: "oklch(0.17 0.02 248)",
      sidebarAccent: "oklch(0.26 0.03 248)",
      sidebarAccentForeground: "oklch(0.98 0.01 95)",
      sidebarRing: "oklch(0.74 0.14 300)",
      chart1: "oklch(0.74 0.14 300)",
      chart2: "oklch(0.72 0.15 130)",
      chart3: "oklch(0.7 0.13 235)",
      chart4: "oklch(0.77 0.13 78)",
      chart5: "oklch(0.63 0.08 310)",
    },
  },
};

function getPalette(accent: ThemeAccent, resolvedTheme: "light" | "dark") {
  if (accent === "custom") {
    return THEME_PALETTES.ember[resolvedTheme];
  }

  return THEME_PALETTES[accent][resolvedTheme];
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function hexToRgb(hex: string) {
  const normalized = HEX_COLOR_PATTERN.test(hex)
    ? hex
    : DEFAULT_THEME_PREFERENCES.customAccentColor;
  const value = normalized.slice(1);

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function getReadableForeground(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.58 ? "oklch(0.17 0.02 248)" : "oklch(0.99 0.01 95)";
}

function getCustomPalette(
  customAccentColor: string,
  resolvedTheme: "light" | "dark",
): ThemePalette {
  const foreground = getReadableForeground(customAccentColor);
  const softAccent =
    resolvedTheme === "dark"
      ? `color-mix(in oklch, ${customAccentColor} 24%, oklch(0.18 0.02 248))`
      : `color-mix(in oklch, ${customAccentColor} 18%, white)`;

  return {
    primary: customAccentColor,
    primaryForeground: foreground,
    accent: softAccent,
    accentForeground:
      resolvedTheme === "dark" ? "oklch(0.97 0.01 95)" : "oklch(0.24 0.03 240)",
    ring: customAccentColor,
    sidebarPrimary: customAccentColor,
    sidebarPrimaryForeground: foreground,
    sidebarAccent:
      resolvedTheme === "dark"
        ? "oklch(0.26 0.03 248)"
        : "oklch(0.32 0.03 248)",
    sidebarAccentForeground: "oklch(0.98 0.01 95)",
    sidebarRing: customAccentColor,
    chart1: customAccentColor,
    chart2: "oklch(0.72 0.15 130)",
    chart3: "oklch(0.68 0.13 235)",
    chart4: "oklch(0.77 0.13 78)",
    chart5: "oklch(0.63 0.08 310)",
  };
}

export function getThemeVariables(
  preferences: ThemePreferences,
  resolvedTheme: "light" | "dark",
) {
  const palette =
    preferences.accent === "custom"
      ? getCustomPalette(preferences.customAccentColor, resolvedTheme)
      : getPalette(preferences.accent, resolvedTheme);

  return {
    "--primary": palette.primary,
    "--primary-foreground": palette.primaryForeground,
    "--accent": palette.accent,
    "--accent-foreground": palette.accentForeground,
    "--ring": palette.ring,
    "--sidebar-primary": palette.sidebarPrimary,
    "--sidebar-primary-foreground": palette.sidebarPrimaryForeground,
    "--sidebar-accent": palette.sidebarAccent,
    "--sidebar-accent-foreground": palette.sidebarAccentForeground,
    "--sidebar-ring": palette.sidebarRing,
    "--chart-1": palette.chart1,
    "--chart-2": palette.chart2,
    "--chart-3": palette.chart3,
    "--chart-4": palette.chart4,
    "--chart-5": palette.chart5,
    "--radius":
      preferences.radius === "sm"
        ? "0.45rem"
        : preferences.radius === "lg"
          ? "0.9rem"
          : "0.625rem",
  } as const;
}

export function applyThemePreferencesToDocument(
  root: HTMLElement,
  preferences: ThemePreferences,
  resolvedTheme: "light" | "dark",
) {
  const variables = getThemeVariables(preferences, resolvedTheme);

  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }

  root.dataset.density = preferences.density;
}

export function normalizeThemePreferences(input?: Partial<ThemePreferences> | null): ThemePreferences {
  return {
    mode:
      input?.mode === "light" || input?.mode === "dark" || input?.mode === "system"
        ? input.mode
        : DEFAULT_THEME_PREFERENCES.mode,
    accent:
      input?.accent === "ember" ||
        input?.accent === "sky" ||
        input?.accent === "emerald" ||
      input?.accent === "violet" ||
      input?.accent === "custom"
        ? input.accent
        : DEFAULT_THEME_PREFERENCES.accent,
    customAccentColor:
      typeof input?.customAccentColor === "string" &&
      HEX_COLOR_PATTERN.test(input.customAccentColor)
        ? input.customAccentColor.toLowerCase()
        : DEFAULT_THEME_PREFERENCES.customAccentColor,
    radius:
      input?.radius === "sm" || input?.radius === "md" || input?.radius === "lg"
        ? input.radius
        : DEFAULT_THEME_PREFERENCES.radius,
    density:
      input?.density === "compact" ||
      input?.density === "comfortable" ||
      input?.density === "spacious"
        ? input.density
        : DEFAULT_THEME_PREFERENCES.density,
  };
}
