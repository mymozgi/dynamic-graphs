/** Date / period helpers: parsing input periods and formatting them for the
 *  counter and the data grid. Periods are stored as fractional years. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Format an interpolated numeric date for the counter.
 * "monthYear" turns fractional years into months (1965.4 -> "May 1965"),
 * giving a smooth monthly breakdown between yearly data points.
 */
export function formatDate(value: number, mode: "year" | "monthYear"): string {
  if (mode === "monthYear") {
    const year = Math.floor(value);
    const month = Math.min(11, Math.max(0, Math.floor((value - year) * 12)));
    return `${MONTHS[month]} ${year}`;
  }
  return String(Math.round(value));
}

/**
 * Parse a period into a numeric (fractional) year for the engine.
 * Accepts "YYYY", "YYYY-MM", "YYYY-MM-DD" (and / or . separators), or a number.
 * e.g. "2002-02" -> 2002.083. Returns NaN if unparseable.
 */
export function parsePeriod(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const s = raw.trim();
  const m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?$/);
  if (m) {
    const y = +m[1];
    const mo = Math.min(12, Math.max(1, +m[2]));
    const d = m[3] ? Math.min(31, Math.max(1, +m[3])) : 1;
    return y + (mo - 1) / 12 + (d - 1) / 365;
  }
  const n = Number(s.replace(/[, ]/g, "").replace(/[^0-9.\-eE]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** Render a numeric year as "YYYY-MM" (for monthly data grids/headers). */
export function toYearMonth(value: number): string {
  const year = Math.floor(value);
  const month = Math.min(12, Math.max(1, Math.round((value - year) * 12) + 1));
  return `${year}-${String(month).padStart(2, "0")}`;
}
