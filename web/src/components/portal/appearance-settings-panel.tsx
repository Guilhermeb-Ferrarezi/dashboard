"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  MoonStarsIcon,
  SunIcon,
} from "@/components/ui/icons";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  getEffectiveColorScheme,
  type ThemeAccent,
  type ThemeMode,
  type ThemePreferences,
} from "@/lib/theme-preferences";

interface AppearanceSettingsPanelProps {
  preferences: ThemePreferences;
  framed?: boolean;
}

const modeIcons: Record<ThemeMode, React.ComponentType<{ className?: string }>> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
  // Onix = preto OLED. MoonStars carrega "noite mais profunda" sem
  // colidir com Moon (que já é dark).
  onix: MoonStarsIcon,
};

// Swatch hardcoded por accent (oklch). 'custom' usa cor escolhida pelo user.
const ACCENT_SWATCH: Record<Exclude<ThemeAccent, "custom">, string> = {
  ember: "bg-[oklch(0.69_0.17_28)]",
  sky: "bg-[oklch(0.74_0.13_250)]",
  emerald: "bg-[oklch(0.73_0.12_155)]",
  violet: "bg-[oklch(0.74_0.14_300)]",
};

const DENSITY_KEY = "portal:density";

// Linear-style: row enxuto label esquerda, controle direita.
function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 px-4 py-3.5 md:grid-cols-[180px_1fr] md:items-center md:gap-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AppearanceSettingsPanel({
  preferences,
  framed = true,
}: AppearanceSettingsPanelProps) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [draft, setDraft] = useState<ThemePreferences>(preferences);
  const [compactDensity, setCompactDensity] = useState(false);
  const lastSavedRef = useRef<string>(JSON.stringify(preferences));

  // Sync quando o servidor mudar `preferences` (refresh externo).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(preferences);
    lastSavedRef.current = JSON.stringify(preferences);
  }, [preferences]);

  // Densidade local (compact) — separada da `draft.density` (servidor).
  useEffect(() => {
    const stored = window.localStorage.getItem(DENSITY_KEY);
    if (stored === "compact") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompactDensity(true);
      document.documentElement.dataset.density = "compact";
    }
  }, []);

  // Aplica preview ao vivo enquanto o user mexe.
  useEffect(() => {
    const effectiveTheme = getEffectiveColorScheme(draft.mode, resolvedTheme);
    applyThemePreferencesToDocument(document.documentElement, draft, effectiveTheme);
    document.documentElement.style.colorScheme = effectiveTheme;
  }, [draft, resolvedTheme]);

  // Autosalvar debounced 600ms — sem botão "Salvar" sticky. Só dispara
  // quando o draft muda em relação ao último estado persistido.
  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === lastSavedRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        const response = await clientApi<{ preferences: ThemePreferences }>(
          "/user/preferences",
          { method: "PUT", body: JSON.stringify({ preferences: draft }) },
        );
        lastSavedRef.current = JSON.stringify(response.preferences);
        setTheme(response.preferences.mode);
        startTransition(() => router.refresh());
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [draft, router, setTheme]);

  function updatePreference<K extends keyof ThemePreferences>(
    key: K,
    value: ThemePreferences[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleCompactDensity(next: boolean) {
    setCompactDensity(next);
    if (next) {
      document.documentElement.dataset.density = "compact";
      window.localStorage.setItem(DENSITY_KEY, "compact");
    } else {
      delete document.documentElement.dataset.density;
      window.localStorage.removeItem(DENSITY_KEY);
    }
  }

  const content = (
    <>
      {framed ? (
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>
            Mudanças são salvas automaticamente na sua conta.
          </CardDescription>
        </CardHeader>
      ) : null}
      <CardContent className={cn("space-y-6", !framed && "px-0")}>
        {!framed ? (
          <p className="text-xs text-muted-foreground">
            Mudanças são salvas automaticamente na sua conta.
          </p>
        ) : null}

        {/* Form-table denso: cada preferência em uma linha. */}
        <div className="divide-y divide-border/60 rounded-md border border-border/60">
          {/* Modo do tema — 4 chips horizontais */}
          <Row label="Modo do tema" description="Como a interface acompanha luz/escuro.">
            <div className="inline-flex rounded-md border border-border/60 bg-muted/40 p-0.5">
              {THEME_MODE_OPTIONS.map((option) => {
                const Icon = modeIcons[option.value];
                const active = draft.mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePreference("mode", option.value)}
                    title={option.description}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Row>

          {/* Accent — bolinhas alinhadas */}
          <Row label="Cor de destaque" description="Botões, foco e elementos ativos.">
            <div className="flex flex-wrap items-center gap-2">
              {THEME_ACCENT_OPTIONS.map((option) => {
                const active = draft.accent === option.value;
                const isCustom = option.value === "custom";
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePreference("accent", option.value)}
                    title={option.label}
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-full ring-2 transition",
                      active ? "ring-foreground" : "ring-transparent hover:ring-foreground/30",
                    )}
                  >
                    <span
                      className={cn(
                        "size-7 rounded-full",
                        !isCustom &&
                          ACCENT_SWATCH[option.value as Exclude<ThemeAccent, "custom">],
                      )}
                      style={
                        isCustom
                          ? {
                              backgroundColor: draft.customAccentColor,
                              backgroundImage:
                                "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444)",
                            }
                          : undefined
                      }
                    />
                    {active ? (
                      <CheckIcon className="absolute size-3.5 text-white drop-shadow" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Row>

          {/* Custom color picker — visível só quando custom está ativo */}
          {draft.accent === "custom" ? (
            <Row label="Cor personalizada" description="Hex aplicado em tempo real.">
              <label className="flex items-center gap-3">
                <input
                  type="color"
                  value={draft.customAccentColor}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      customAccentColor: event.target.value,
                    }))
                  }
                  className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent p-1"
                  aria-label="Selecionar cor personalizada"
                />
                <span className="font-mono text-xs uppercase text-muted-foreground">
                  {draft.customAccentColor}
                </span>
              </label>
            </Row>
          ) : null}

          {/* Raio dos cantos */}
          <Row label="Raio dos cantos" description="Curvatura dos elementos.">
            <Select
              value={draft.radius}
              onValueChange={(value) =>
                updatePreference("radius", value as ThemePreferences["radius"])
              }
              options={THEME_RADIUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              className="max-w-xs"
            />
          </Row>

          {/* Densidade */}
          <Row label="Densidade visual" description="Respiro entre blocos do layout.">
            <Select
              value={draft.density}
              onValueChange={(value) =>
                updatePreference("density", value as ThemePreferences["density"])
              }
              options={THEME_DENSITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              className="max-w-xs"
            />
          </Row>

          {/* Modo compacto local (localStorage, separado do server) */}
          <Row
            label="Modo compacto"
            description="Reduz paddings/gaps. Salvo apenas neste navegador."
          >
            <Switch
              checked={compactDensity}
              onCheckedChange={toggleCompactDensity}
              label="Alternar modo compacto"
            />
          </Row>
        </div>

        <button
          type="button"
          onClick={() => {
            setDraft(DEFAULT_THEME_PREFERENCES);
            toggleCompactDensity(false);
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Restaurar padrão
        </button>
      </CardContent>
    </>
  );

  if (!framed) {
    return <div>{content}</div>;
  }

  return <Card className="border-border/60 bg-card/90">{content}</Card>;
}
