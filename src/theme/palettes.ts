/** Ordered color palettes for bar coloring. */

export interface Palette {
  id: string;
  label: string;
  colors: string[];
}

export const PALETTES: Palette[] = [
  {
    id: "vivid",
    label: "Vivid",
    colors: [
      "#f472b6", "#fb7185", "#fb923c", "#fbbf24", "#a3e635",
      "#4ade80", "#2dd4bf", "#38bdf8", "#6366f1", "#a855f7",
      "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    ],
  },
  {
    id: "ocean",
    label: "Ocean",
    colors: [
      "#0ea5e9", "#38bdf8", "#22d3ee", "#2dd4bf", "#14b8a6",
      "#0891b2", "#0284c7", "#6366f1", "#818cf8", "#a5b4fc",
    ],
  },
  {
    id: "sunset",
    label: "Sunset",
    colors: [
      "#fb7185", "#f43f5e", "#fb923c", "#f97316", "#fbbf24",
      "#f59e0b", "#ec4899", "#e11d48", "#c026d3", "#a855f7",
    ],
  },
  {
    id: "forest",
    label: "Forest",
    colors: [
      "#4ade80", "#22c55e", "#16a34a", "#84cc16", "#a3e635",
      "#65a30d", "#10b981", "#059669", "#14b8a6", "#0d9488",
    ],
  },
  {
    id: "candy",
    label: "Candy",
    colors: [
      "#f472b6", "#c084fc", "#a78bfa", "#818cf8", "#60a5fa",
      "#38bdf8", "#22d3ee", "#2dd4bf", "#34d399", "#a3e635",
    ],
  },
  {
    id: "mono",
    label: "Mono",
    colors: [
      "#94a3b8", "#cbd5e1", "#64748b", "#e2e8f0", "#475569",
      "#a1a1aa", "#d4d4d8", "#71717a", "#e4e4e7", "#52525b",
    ],
  },
];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/**
 * Build a stable name -> color map. Colors are assigned by the entity's
 * index in the (already sorted) names list so a country keeps its color.
 */
export function buildColorScale(names: string[], colors: string[]): Map<string, string> {
  const map = new Map<string, string>();
  names.forEach((name, i) => map.set(name, colors[i % colors.length]));
  return map;
}

/** Build a category -> color map for "color by category". */
export function buildCategoryScale(categories: string[], colors: string[]): Map<string, string> {
  const uniq = [...new Set(categories)].sort();
  const map = new Map<string, string>();
  uniq.forEach((cat, i) => map.set(cat, colors[i % colors.length]));
  return map;
}

/**
 * A single source of truth for a bar's color: a per-entity override wins,
 * otherwise fall back to the palette (by category or by entity). Used by both
 * the chart renderer and the inspector's color list.
 */
export function makeColorResolver(
  names: string[],
  categories: Map<string, string>,
  paletteId: string,
  colorBy: "name" | "category",
  overrides: Record<string, string>,
): (name: string, category: string) => string {
  const colors = getPalette(paletteId).colors;
  const nameScale = buildColorScale(names, colors);
  const catScale = buildCategoryScale([...categories.values()], colors);
  return (name, category) =>
    overrides[name] ??
    (colorBy === "category" ? catScale.get(category) : nameScale.get(name)) ??
    "#888888";
}
