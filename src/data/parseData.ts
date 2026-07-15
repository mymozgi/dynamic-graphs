import type { RaceRow } from "@/engine/types";
import { parsePeriod } from "@/utils/period";

export interface ParseResult {
  rows: RaceRow[];
  warnings: string[];
  entities: number;
  periods: number;
}

const NAME_KEYS = [
  "name", "label", "entity", "country", "item", "platform", "company",
  "team", "player", "product", "brand", "channel", "account", "city",
];
const DATE_KEYS = ["date", "year", "period", "time", "month", "quarter"];
const VALUE_KEYS = [
  "value", "val", "amount", "count", "number", "users", "subscribers",
  "followers", "views", "score", "population", "revenue", "sales", "total",
  "gdp", "wins", "points",
];
const CATEGORY_KEYS = ["category", "group", "continent", "region", "type"];

const norm = (s: string) => s.toLowerCase().trim();

function toNum(s: string | number): number {
  if (typeof s === "number") return s;
  const cleaned = String(s).replace(/[, ]/g, "").replace(/[^0-9.\-eE]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Tokenize CSV/TSV text into rows of fields (handles quotes + embedded newlines). */
function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim() !== "") ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  if (tabs >= commas && tabs >= semis && tabs > 0) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function indexOfKey(headers: string[], keys: string[]): number {
  return headers.findIndex((h) => keys.includes(norm(h)));
}

function fromTable(table: string[][]): ParseResult {
  if (table.length < 2) throw new Error("Need a header row and at least one data row.");
  const headers = table[0];
  const body = table.slice(1);
  const warnings: string[] = [];
  const rows: RaceRow[] = [];
  let badValues = 0;

  const nameIdx = indexOfKey(headers, NAME_KEYS);
  const dateIdx = indexOfKey(headers, DATE_KEYS);
  const valueIdx = indexOfKey(headers, VALUE_KEYS);

  if (nameIdx >= 0 && dateIdx >= 0 && valueIdx >= 0) {
    // ---- Long format: name,date,value[,category] ----
    const catIdx = indexOfKey(headers, CATEGORY_KEYS);
    for (const r of body) {
      const name = (r[nameIdx] ?? "").trim();
      const date = parsePeriod(r[dateIdx] ?? "");
      const value = toNum(r[valueIdx]);
      if (!name || !Number.isFinite(date)) continue;
      if (!Number.isFinite(value)) badValues++;
      rows.push({
        name,
        date,
        value: Number.isFinite(value) ? value : 0,
        category: catIdx >= 0 ? (r[catIdx] ?? "").trim() || undefined : undefined,
      });
    }
  } else {
    // ---- Wide format: entity | [category] | period columns ----
    const labelIdx = 0;
    const catIdx = indexOfKey(headers, CATEGORY_KEYS);
    const periodCols: { idx: number; date: number }[] = [];
    headers.forEach((h, idx) => {
      if (idx === labelIdx || idx === catIdx) return;
      const date = parsePeriod(h);
      if (Number.isFinite(date)) periodCols.push({ idx, date });
      else if (h.trim()) warnings.push(`Ignored non-numeric column "${h.trim()}".`);
    });
    if (periodCols.length === 0)
      throw new Error("No numeric time columns found. Expected a header row of years, e.g. 2019, 2020, 2021.");

    for (const r of body) {
      const name = (r[labelIdx] ?? "").trim();
      if (!name) continue;
      const category = catIdx >= 0 ? (r[catIdx] ?? "").trim() || undefined : undefined;
      for (const { idx, date } of periodCols) {
        const value = toNum(r[idx] ?? "");
        if (!Number.isFinite(value)) badValues++;
        rows.push({ name, date, value: Number.isFinite(value) ? value : 0, category });
      }
    }
  }

  return finalize(rows, warnings, badValues);
}

function fromJson(text: string): ParseResult {
  const data = JSON.parse(text);
  const arr: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { rows?: unknown[] }).rows)
      ? ((data as { rows: Record<string, unknown>[] }).rows)
      : [];
  if (arr.length === 0) throw new Error("JSON must be an array of row objects (or { rows: [...] }).");

  const keys = Object.keys(arr[0]).map(norm);
  const hasLong =
    keys.some((k) => NAME_KEYS.includes(k)) &&
    keys.some((k) => DATE_KEYS.includes(k)) &&
    keys.some((k) => VALUE_KEYS.includes(k));

  const warnings: string[] = [];
  const rows: RaceRow[] = [];
  let badValues = 0;

  const findKey = (obj: Record<string, unknown>, wanted: string[]) =>
    Object.keys(obj).find((k) => wanted.includes(norm(k)));

  if (hasLong) {
    for (const obj of arr) {
      const nk = findKey(obj, NAME_KEYS);
      const dk = findKey(obj, DATE_KEYS);
      const vk = findKey(obj, VALUE_KEYS);
      const ck = findKey(obj, CATEGORY_KEYS);
      if (!nk || !dk || !vk) continue;
      const name = String(obj[nk] ?? "").trim();
      const date = parsePeriod(obj[dk] as string | number);
      const value = toNum(obj[vk] as string);
      if (!name || !Number.isFinite(date)) continue;
      if (!Number.isFinite(value)) badValues++;
      rows.push({
        name,
        date,
        value: Number.isFinite(value) ? value : 0,
        category: ck ? String(obj[ck] ?? "").trim() || undefined : undefined,
      });
    }
  } else {
    // Wide: { name: "X", "2019": 1, "2020": 2, category?: "Y" }
    for (const obj of arr) {
      const nk = findKey(obj, NAME_KEYS) ?? Object.keys(obj)[0];
      const ck = findKey(obj, CATEGORY_KEYS);
      const name = String(obj[nk] ?? "").trim();
      if (!name) continue;
      const category = ck ? String(obj[ck] ?? "").trim() || undefined : undefined;
      for (const [k, v] of Object.entries(obj)) {
        if (k === nk || k === ck) continue;
        const date = parsePeriod(k);
        if (!Number.isFinite(date)) continue;
        const value = toNum(v as string);
        if (!Number.isFinite(value)) badValues++;
        rows.push({ name, date, value: Number.isFinite(value) ? value : 0, category });
      }
    }
  }
  return finalize(rows, warnings, badValues);
}

function finalize(rows: RaceRow[], warnings: string[], badValues: number): ParseResult {
  if (rows.length === 0) throw new Error("No usable rows were found in the data.");
  const entities = new Set(rows.map((r) => r.name)).size;
  const periods = new Set(rows.map((r) => r.date)).size;
  if (periods < 2) warnings.push("Only one time period found — the race needs at least two to animate.");
  if (badValues > 0) warnings.push(`${badValues} value(s) weren't numeric and were treated as 0.`);
  return { rows, warnings, entities, periods };
}

/** Parse CSV / TSV / JSON text into engine rows. Throws Error(message) on failure. */
export function parseData(text: string, fileName?: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("The data is empty.");

  const looksJson =
    fileName?.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{");
  if (looksJson) {
    try {
      return fromJson(trimmed);
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error("Invalid JSON: " + e.message);
      throw e;
    }
  }

  const delim = detectDelimiter(trimmed);
  return fromTable(parseDelimited(trimmed, delim));
}
