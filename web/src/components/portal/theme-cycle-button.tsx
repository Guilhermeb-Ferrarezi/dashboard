"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MoonIcon, SparklesIcon, SunIcon } from "@/components/ui/icons";

const THEME_ORDER = ["light", "dark", "onix"] as const;
type ThemeKey = (typeof THEME_ORDER)[number];

const THEME_LABEL: Record<ThemeKey, string> = {
  light: "Claro",
  dark: "Escuro",
  onix: "Onix",
};

function ThemeIcon({ value }: { value: ThemeKey }) {
  switch (value) {
    case "light":
      return <SunIcon className="size-4" />;
    case "dark":
      return <MoonIcon className="size-4" />;
    case "onix":
      return <SparklesIcon className="size-4" />;
  }
}

export function ThemeCycleButton({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Carregando tema"
        disabled
        className={className}
      >
        <SunIcon className="size-4 opacity-40" />
      </Button>
    );
  }

  const current: ThemeKey = (() => {
    if (theme && (THEME_ORDER as readonly string[]).includes(theme)) {
      return theme as ThemeKey;
    }
    if (resolvedTheme === "dark") return "dark";
    return "light";
  })();

  const nextTheme: ThemeKey = (() => {
    const idx = THEME_ORDER.indexOf(current);
    return THEME_ORDER[(idx + 1) % THEME_ORDER.length]!;
  })();

  function handleClick() {
    setTheme(nextTheme);
    toast.success(`Tema: ${THEME_LABEL[nextTheme]}`, { duration: 1800 });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={handleClick}
      aria-label={`Tema atual: ${THEME_LABEL[current]}. Clique para alternar para ${THEME_LABEL[nextTheme]}`}
      title={`Tema: ${THEME_LABEL[current]} → ${THEME_LABEL[nextTheme]}`}
      className={className}
    >
      <ThemeIcon value={current} />
    </Button>
  );
}
