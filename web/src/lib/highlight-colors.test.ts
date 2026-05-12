import { describe, expect, test } from "bun:test";

import {
  HIGHLIGHT_COLOR_OPTIONS,
  getHighlightColorClass,
  getHighlightColorLabel,
  getHighlightColorOption,
  getHighlightColorPickerValue,
  getHighlightColorStyle,
} from "./highlight-colors";

describe("highlight-colors", () => {
  test("exposes a larger preset palette", () => {
    expect(HIGHLIGHT_COLOR_OPTIONS.length).toBeGreaterThan(10);
    expect(HIGHLIGHT_COLOR_OPTIONS.some((option) => option.value === "cyan")).toBe(true);
    expect(HIGHLIGHT_COLOR_OPTIONS.some((option) => option.value === "rose")).toBe(true);
  });

  test("returns the default option for unknown values", () => {
    expect(getHighlightColorOption("not-a-color").value).toBe("");
    expect(getHighlightColorClass("not-a-color")).toContain("var(--highlight-color)");
  });

  test("creates inline styles for free-form colors", () => {
    expect(getHighlightColorStyle("#7c3aed")).toEqual({
      "--highlight-color": "#7c3aed",
    });
  });

  test("keeps the raw label for free-form colors", () => {
    expect(getHighlightColorLabel("#7c3aed")).toBe("#7c3aed");
  });

  test("maps preset colors to picker-ready hex values", () => {
    expect(getHighlightColorPickerValue("green")).toBe("#22c55e");
    expect(getHighlightColorPickerValue("#7c3aed")).toBe("#7c3aed");
  });
});
