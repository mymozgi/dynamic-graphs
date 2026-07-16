import { format } from "d3-format";

/** Build a value formatter from a d3-format spec plus prefix/suffix. */
export function makeFormatter(spec: string, prefix = "", suffix = "") {
  let f: (n: number) => string;
  try {
    f = format(spec || ",.0f");
  } catch {
    f = format(",.0f");
  }
  return (n: number) => `${prefix}${f(n)}${suffix}`;
}

const trimZeros = (s: string) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);

/**
 * Compact number formatting with K / M / B / T suffixes (~3 significant
 * digits), e.g. 1_411_000_000 -> "1.41B", 121_162_226 -> "121M".
 * Friendlier than d3's SI (which renders billions as "G").
 */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [factor, suffix] of units) {
    if (abs >= factor) {
      const v = n / factor;
      const av = Math.abs(v);
      const digits = av >= 100 ? 0 : av >= 10 ? 1 : 2;
      return trimZeros(v.toFixed(digits)) + suffix;
    }
  }
  return trimZeros(n.toFixed(abs > 0 && abs < 1 ? 2 : 0));
}

/**
 * Compound unit notation showing the top two magnitudes, e.g.
 * 1_032_000 -> "1m 32k", 1_250_500_000 -> "1b 250m". Below a million it
 * collapses to a single unit ("532k"); the second unit is dropped when zero.
 */
export function compoundNumber(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const ladder: [number, string, number, string][] = [
    [1e9, "b", 1e6, "m"],
    [1e6, "m", 1e3, "k"],
  ];
  for (const [factor, suffix, next, nextSuffix] of ladder) {
    if (abs >= factor) {
      const big = Math.floor(abs / factor);
      const small = Math.floor((abs % factor) / next);
      return sign + (small > 0 ? `${big}${suffix} ${small}${nextSuffix}` : `${big}${suffix}`);
    }
  }
  if (abs >= 1e3) return `${sign}${Math.floor(abs / 1e3)}k`;
  return sign + String(Math.round(abs));
}
