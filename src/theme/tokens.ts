import type { ThemeMode } from "@/engine/types";

/** Resolved color tokens used by the SVG chart for a given theme. */
export interface ChartTokens {
  text: string;
  subtle: string;
  faint: string; // big date counter
  grid: string;
  axis: string;
  canvasBg: string;
  labelInside: string;
}

const DARK: ChartTokens = {
  text: "#e8eaed",
  subtle: "rgba(232,234,237,0.55)",
  faint: "rgba(232,234,237,0.10)",
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.22)",
  canvasBg: "#0b0f14",
  labelInside: "#ffffff",
};

const LIGHT: ChartTokens = {
  text: "#1f2937",
  subtle: "rgba(31,41,55,0.55)",
  faint: "rgba(31,41,55,0.09)",
  grid: "rgba(0,0,0,0.06)",
  axis: "rgba(0,0,0,0.22)",
  canvasBg: "#ffffff",
  labelInside: "#ffffff",
};

export function getChartTokens(theme: ThemeMode): ChartTokens {
  return theme === "dark" ? DARK : LIGHT;
}
