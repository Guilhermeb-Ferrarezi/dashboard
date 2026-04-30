"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  CircleDotIcon,
  LoaderCircleIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  PanelTopIcon,
  Rows3Icon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { clientApi } from "@/lib/api";
import {
  applyThemePreferencesToDocument,
  DEFAULT_THEME_PREFERENCES,
  THEME_ACCENT_OPTIONS,
  THEME_DENSITY_OPTIONS,
  THEME_MODE_OPTIONS,
  THEME_RADIUS_OPTIONS,
  type ThemeAccent,
  type ThemeDensity,
  type ThemeMode,
  type ThemePreferences,
  type ThemeRadius,
} from "@/lib/theme-preferences";

interface AppearanceSettingsPanelProps {
  preferences: ThemePreferences;
  framed?: boolean;
}

const modeIcons: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

const accentSwatches: Record<ThemeAccent, string> = {
  ember: "bg-[oklch(0.69_0.17_28)]",
  sky: "bg-[oklch(0.74_0.13_250)]",
  emerald: "bg-[oklch(0.73_0.12_155)]",
  violet: "bg-[oklch(0.74_0.14_300)]",
  custom: "",
};

const radiusPreview: Record<ThemeRadius, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-xl",
};

const densityPreview: Record<ThemeDensity, string> = {
  compact: "gap-1",
  comfortable: "gap-1.5",
  spacious: "gap-2.5",
};

function PreferenceSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function AppearanceSettingsPanel({
  preferences,
  framed = true,
}: AppearanceSettingsPanelProps) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [draft, setDraft] = useState<ThemePreferences>(preferences);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  useEffect(() => {
    const effectiveTheme: "light" | "dark" =
      draft.mode === "dark"
        ? "dark"
        : draft.mode === "light"
          ? "light"
          : resolvedTheme === "dark"
            ? "dark"
            : "light";

    applyThemePreferencesToDocument(
      document.documentElement,
      draft,
      effectiveTheme,
    );
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [draft, resolvedTheme]);

  function updatePreference<K extends keyof ThemePreferences>(
    key: K,
    value: ThemePreferences[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setPending(true);

    try {
      const response = await clientApi<{
        preferences: ThemePreferences;
      }>("/user/preferences", {
        method: "PUT",
        body: JSON.stringify({ preferences: draft }),
      });

      setDraft(response.preferences);
      setTheme(response.preferences.mode);
      startTransition(() => {
        router.refresh();
      });
      toast.success("Preferencias salvas na sua conta.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar as preferencias.",
      );
    } finally {
      setPending(false);
    }
  }

  const content = (
    <>
      {framed ? (
        <CardHeader>
          <CardTitle>Aparencia</CardTitle>
          <CardDescription>
            Tema, cores e densidade ficam salvos na sua conta e acompanham o
            login em qualquer dispositivo.
          </CardDescription>
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-4", !framed && "px-0")}>
        {!framed ? (
          <div>
            <CardTitle>Aparencia</CardTitle>
            <CardDescription>
              Tema, cores, cantos e densidade do portal.
            </CardDescription>
          </div>
        ) : null}
        <PreferenceSection
          title="Modo do tema"
          description="Controle como a interface acompanha luz, escuro ou o aparelho."
          icon={PanelTopIcon}
        >
          <div className="grid overflow-hidden rounded-lg border border-border bg-muted/40 p-1 sm:grid-cols-3">
            {THEME_MODE_OPTIONS.map((option) => {
              const Icon = modeIcons[option.value];
              const active = draft.mode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updatePreference("mode", option.value)}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </PreferenceSection>

        <PreferenceSection
          title="Cor de destaque"
          description="Escolha a cor dos botoes, foco, sidebar e destaques."
          icon={PaletteIcon}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {THEME_ACCENT_OPTIONS.map((option) => {
              const active = draft.accent === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updatePreference("accent", option.value)}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:border-primary/45 hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-black/10",
                      option.value !== "custom" && accentSwatches[option.value],
                    )}
                    style={
                      option.value === "custom"
                        ? { backgroundColor: draft.customAccentColor }
                        : undefined
                    }
                  >
                    {active ? (
                      <CheckIcon className="size-4 text-white drop-shadow" />
                    ) : null}
                  </span>
                    <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="block text-xs leading-snug text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {draft.accent === "custom" ? (
            <div className="mt-3 rounded-lg border border-border bg-muted/35 p-3">
              <label className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <span
                  className="size-11 rounded-lg border border-border shadow-inner"
                  style={{ backgroundColor: draft.customAccentColor }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    Cor personalizada
                  </span>
                  <span className="block font-mono text-xs uppercase text-muted-foreground">
                    {draft.customAccentColor}
                  </span>
                </span>
                <input
                  type="color"
                  value={draft.customAccentColor}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      accent: "custom",
                      customAccentColor: event.target.value,
                    }))
                  }
                  className="h-10 w-full cursor-pointer rounded-md border border-border bg-transparent p-1 sm:w-16"
                  aria-label="Selecionar cor personalizada"
                />
              </label>
            </div>
          ) : null}
        </PreferenceSection>

        <div className="grid gap-4 lg:grid-cols-2">
          <PreferenceSection
            title="Raio dos cantos"
            description="Defina se os elementos ficam mais retos ou suaves."
            icon={CircleDotIcon}
          >
            <div className="space-y-2">
              {THEME_RADIUS_OPTIONS.map((option) => {
                const active = draft.radius === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePreference("radius", option.value)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/45 hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "size-9 shrink-0 border-2 border-primary/70 bg-primary/10",
                        radiusPreview[option.value],
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    {active ? <CheckIcon className="size-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </PreferenceSection>

          <PreferenceSection
            title="Densidade visual"
            description="Ajuste o respiro entre blocos do layout."
            icon={Rows3Icon}
          >
            <div className="space-y-2">
              {THEME_DENSITY_OPTIONS.map((option) => {
                const active = draft.density === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePreference("density", option.value)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/45 hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 flex-col justify-center rounded-md border border-border bg-background p-1.5",
                        densityPreview[option.value],
                      )}
                    >
                      <span className="h-1 rounded-full bg-primary/75" />
                      <span className="h-1 rounded-full bg-primary/45" />
                      <span className="h-1 rounded-full bg-primary/25" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    {active ? <CheckIcon className="size-4 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </PreferenceSection>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-popover/95 pt-4 backdrop-blur">
          <Button onClick={handleSave} disabled={pending}>
            {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
            Salvar aparencia
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(DEFAULT_THEME_PREFERENCES);
              setTheme(DEFAULT_THEME_PREFERENCES.mode);
            }}
          >
            Restaurar padrao
          </Button>
        </div>
      </CardContent>
    </>
  );

  if (!framed) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <Card className="border-border/60 bg-card/90">
      {content}
    </Card>
  );
}
