"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

import {
  applyThemePreferencesToDocument,
  getEffectiveColorScheme,
  type ThemePreferences,
} from "@/lib/theme-preferences";

interface ThemePreferenceSyncProps {
  preferences: ThemePreferences;
}

export function ThemePreferenceSync({ preferences }: ThemePreferenceSyncProps) {
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setTheme(preferences.mode);
  }, [preferences.mode, setTheme]);

  useEffect(() => {
    const effectiveTheme = getEffectiveColorScheme(
      preferences.mode,
      resolvedTheme,
    );

    applyThemePreferencesToDocument(
      document.documentElement,
      preferences,
      effectiveTheme,
    );
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [preferences, resolvedTheme]);

  return null;
}
