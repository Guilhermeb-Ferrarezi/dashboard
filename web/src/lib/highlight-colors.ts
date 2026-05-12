import type { CSSProperties } from "react";

export type HighlightColorOption = {
  label: string;
  value: string;
  hex: string;
  swatchClassName: string;
  rowClassName: string;
};

export const HIGHLIGHT_COLOR_OPTIONS: HighlightColorOption[] = [
  {
    label: "Sem cor",
    value: "",
    hex: "",
    swatchClassName: "bg-background",
    rowClassName: "",
  },
  {
    label: "Grafite",
    value: "slate",
    hex: "#64748b",
    swatchClassName: "bg-slate-500",
    rowClassName: "border-slate-500/40 bg-slate-500/12 hover:bg-slate-500/18",
  },
  {
    label: "Cinza",
    value: "gray",
    hex: "#6b7280",
    swatchClassName: "bg-gray-500",
    rowClassName: "border-gray-500/40 bg-gray-500/12 hover:bg-gray-500/18",
  },
  {
    label: "Pedra",
    value: "stone",
    hex: "#78716c",
    swatchClassName: "bg-stone-500",
    rowClassName: "border-stone-500/40 bg-stone-500/12 hover:bg-stone-500/18",
  },
  {
    label: "Vermelho",
    value: "red",
    hex: "#ef4444",
    swatchClassName: "bg-red-500",
    rowClassName: "border-red-500/40 bg-red-500/12 hover:bg-red-500/18",
  },
  {
    label: "Laranja",
    value: "orange",
    hex: "#f97316",
    swatchClassName: "bg-orange-500",
    rowClassName: "border-orange-500/40 bg-orange-500/12 hover:bg-orange-500/18",
  },
  {
    label: "Âmbar",
    value: "amber",
    hex: "#f59e0b",
    swatchClassName: "bg-amber-500",
    rowClassName: "border-amber-500/40 bg-amber-500/12 hover:bg-amber-500/18",
  },
  {
    label: "Amarelo",
    value: "yellow",
    hex: "#eab308",
    swatchClassName: "bg-yellow-500",
    rowClassName: "border-yellow-500/40 bg-yellow-500/12 hover:bg-yellow-500/18",
  },
  {
    label: "Lima",
    value: "lime",
    hex: "#84cc16",
    swatchClassName: "bg-lime-500",
    rowClassName: "border-lime-500/40 bg-lime-500/12 hover:bg-lime-500/18",
  },
  {
    label: "Verde",
    value: "green",
    hex: "#22c55e",
    swatchClassName: "bg-green-500",
    rowClassName: "border-green-500/40 bg-green-500/12 hover:bg-green-500/18",
  },
  {
    label: "Esmeralda",
    value: "emerald",
    hex: "#10b981",
    swatchClassName: "bg-emerald-500",
    rowClassName: "border-emerald-500/40 bg-emerald-500/12 hover:bg-emerald-500/18",
  },
  {
    label: "Teal",
    value: "teal",
    hex: "#14b8a6",
    swatchClassName: "bg-teal-500",
    rowClassName: "border-teal-500/40 bg-teal-500/12 hover:bg-teal-500/18",
  },
  {
    label: "Ciano",
    value: "cyan",
    hex: "#06b6d4",
    swatchClassName: "bg-cyan-500",
    rowClassName: "border-cyan-500/40 bg-cyan-500/12 hover:bg-cyan-500/18",
  },
  {
    label: "Azul céu",
    value: "sky",
    hex: "#0ea5e9",
    swatchClassName: "bg-sky-500",
    rowClassName: "border-sky-500/40 bg-sky-500/12 hover:bg-sky-500/18",
  },
  {
    label: "Azul",
    value: "blue",
    hex: "#3b82f6",
    swatchClassName: "bg-blue-500",
    rowClassName: "border-blue-500/40 bg-blue-500/12 hover:bg-blue-500/18",
  },
  {
    label: "Índigo",
    value: "indigo",
    hex: "#6366f1",
    swatchClassName: "bg-indigo-500",
    rowClassName: "border-indigo-500/40 bg-indigo-500/12 hover:bg-indigo-500/18",
  },
  {
    label: "Violeta",
    value: "violet",
    hex: "#8b5cf6",
    swatchClassName: "bg-violet-500",
    rowClassName: "border-violet-500/40 bg-violet-500/12 hover:bg-violet-500/18",
  },
  {
    label: "Roxo",
    value: "purple",
    hex: "#a855f7",
    swatchClassName: "bg-purple-500",
    rowClassName: "border-purple-500/40 bg-purple-500/12 hover:bg-purple-500/18",
  },
  {
    label: "Fúcsia",
    value: "fuchsia",
    hex: "#d946ef",
    swatchClassName: "bg-fuchsia-500",
    rowClassName: "border-fuchsia-500/40 bg-fuchsia-500/12 hover:bg-fuchsia-500/18",
  },
  {
    label: "Rosa",
    value: "pink",
    hex: "#ec4899",
    swatchClassName: "bg-pink-500",
    rowClassName: "border-pink-500/40 bg-pink-500/12 hover:bg-pink-500/18",
  },
  {
    label: "Rosa forte",
    value: "rose",
    hex: "#f43f5e",
    swatchClassName: "bg-rose-500",
    rowClassName: "border-rose-500/40 bg-rose-500/12 hover:bg-rose-500/18",
  },
];

export function getHighlightColorOption(value?: string) {
  return HIGHLIGHT_COLOR_OPTIONS.find((option) => option.value === value) ?? HIGHLIGHT_COLOR_OPTIONS[0];
}

export function getHighlightColorLabel(value?: string) {
  const option = HIGHLIGHT_COLOR_OPTIONS.find((item) => item.value === value);
  if (option) return option.label;
  return value?.trim() || HIGHLIGHT_COLOR_OPTIONS[0].label;
}

export function isPresetHighlightColor(value?: string) {
  return HIGHLIGHT_COLOR_OPTIONS.some((option) => option.value === value);
}

export function getHighlightColorPickerValue(value?: string) {
  const option = HIGHLIGHT_COLOR_OPTIONS.find((item) => item.value === value);
  if (option) return option.hex || "#64748b";
  if (value?.startsWith("#")) return value;
  return "#64748b";
}

export function getHighlightColorClass(value?: string) {
  const option = getHighlightColorOption(value);
  if (option.value === value) return option.rowClassName;
  if (!value) return "";

  return "border-[color:var(--highlight-color)] bg-[color:color-mix(in_srgb,var(--highlight-color)_12%,transparent)]";
}

export function getHighlightColorStyle(value?: string): CSSProperties | undefined {
  if (!value || isPresetHighlightColor(value)) return undefined;
  return { "--highlight-color": value } as CSSProperties;
}
