import type { RaceRow } from "@/engine/types";

/**
 * Sample dataset: monthly active users of early social networks, 2004–2009.
 * Long format (Date, Platform, Users) with YYYY-MM style periods — matching the
 * classic "evolution of social media" bar chart race. Values are generated from
 * simple growth curves (bump = rise + fall, logistic = rise to dominance).
 */

const START_YEAR = 2004;
const MONTHS = 72; // 2004-01 .. 2009-12

interface PlatformSpec {
  name: string;
  kind: "bump" | "logistic";
  peak: number;
  center: number; // month index of the peak (bump) or midpoint (logistic)
  width: number;
}

const PLATFORMS: PlatformSpec[] = [
  { name: "Friendster", kind: "bump", peak: 4_200_000, center: 9, width: 13 },
  { name: "LiveJournal", kind: "bump", peak: 16_000_000, center: 30, width: 34 },
  { name: "MySpace", kind: "bump", peak: 76_000_000, center: 45, width: 21 },
  { name: "hi5", kind: "bump", peak: 54_000_000, center: 41, width: 16 },
  { name: "Orkut", kind: "bump", peak: 62_000_000, center: 53, width: 22 },
  { name: "Bebo", kind: "bump", peak: 38_000_000, center: 47, width: 14 },
  { name: "Facebook", kind: "logistic", peak: 360_000_000, center: 55, width: 8 },
  { name: "Twitter", kind: "logistic", peak: 82_000_000, center: 61, width: 7 },
];

function usersAt(p: PlatformSpec, i: number): number {
  const v =
    p.kind === "bump"
      ? p.peak * Math.exp(-Math.pow((i - p.center) / p.width, 2))
      : p.peak / (1 + Math.exp(-(i - p.center) / p.width));
  return Math.max(0, Math.round(v / 100) * 100); // round to hundreds
}

/** Long-format rows for the engine. `date` is a fractional year (2004-02 -> 2004.083). */
export function getSampleRows(): RaceRow[] {
  const rows: RaceRow[] = [];
  for (const p of PLATFORMS) {
    for (let i = 0; i < MONTHS; i++) {
      rows.push({ name: p.name, date: START_YEAR + i / 12, value: usersAt(p, i) });
    }
  }
  return rows;
}
