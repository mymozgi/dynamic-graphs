import { ascending, pairs } from "d3-array";
import { easeLinear, easeCubicInOut, easeCubicIn, easeCubicOut } from "d3-ease";
import type { RaceRow, RenderFrame, EntryFrame, EasingMode } from "./types";

const EASINGS: Record<EasingMode, (t: number) => number> = {
  linear: easeLinear,
  smooth: easeCubicInOut,
  easeIn: easeCubicIn,
  easeOut: easeCubicOut,
};

/** A discrete precomputed keyframe (before render-time smoothing). */
interface Keyframe {
  date: number;
  /** value per entity name */
  values: Map<string, number>;
  /** rank per entity name (0 = largest value) */
  ranks: Map<string, number>;
  /** largest value at this keyframe */
  max: number;
}

export interface RaceEngineOptions {
  /** Interpolated frames generated between each pair of real dates. */
  framesPerTransition?: number;
  /** Easing applied to value motion between data points. */
  easing?: EasingMode;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Precomputes a smooth, scrubbable timeline from long-format rows.
 *
 * The engine is intentionally independent of visual config (bar count,
 * palette, sort direction) — those are render-time concerns. Changing them
 * never triggers an expensive rebuild.
 */
export class RaceEngine {
  readonly names: string[];
  readonly categories: Map<string, string>;
  readonly dates: number[];
  /** Largest value across the whole timeline (stable — for layout sizing). */
  readonly globalMax: number;
  private readonly keyframes: Keyframe[];

  constructor(rows: RaceRow[], options: RaceEngineOptions = {}) {
    const k = Math.max(1, options.framesPerTransition ?? 24);
    const ease = EASINGS[options.easing ?? "linear"];

    // Unique, sorted entity names + their category.
    const categories = new Map<string, string>();
    const nameSet = new Set<string>();
    const dateSet = new Set<number>();
    for (const r of rows) {
      nameSet.add(r.name);
      dateSet.add(r.date);
      if (r.category) categories.set(r.name, r.category);
    }
    const names = [...nameSet].sort(ascending);
    const dates = [...dateSet].sort(ascending);

    // value lookup: date -> (name -> value), missing carried forward.
    const rawByDate = new Map<number, Map<string, number>>();
    for (const d of dates) rawByDate.set(d, new Map());
    for (const r of rows) rawByDate.get(r.date)!.set(r.name, r.value);

    // Carry-forward so an entity absent from a later date holds its last value
    // instead of collapsing to zero (avoids ugly flicker).
    const valueByDate = new Map<number, Map<string, number>>();
    const lastSeen = new Map<string, number>();
    for (const d of dates) {
      const src = rawByDate.get(d)!;
      const out = new Map<string, number>();
      for (const name of names) {
        if (src.has(name)) lastSeen.set(name, src.get(name)!);
        out.set(name, lastSeen.get(name) ?? 0);
      }
      valueByDate.set(d, out);
    }

    const rankOf = (values: Map<string, number>): Map<string, number> => {
      const sorted = [...values.entries()].sort((a, b) => b[1] - a[1]);
      const ranks = new Map<string, number>();
      sorted.forEach(([name], i) => ranks.set(name, i));
      return ranks;
    };

    const keyframes: Keyframe[] = [];
    const pushKeyframe = (date: number, values: Map<string, number>) => {
      let max = 0;
      for (const v of values.values()) if (v > max) max = v;
      keyframes.push({ date, values, ranks: rankOf(values), max });
    };

    if (dates.length === 1) {
      pushKeyframe(dates[0], valueByDate.get(dates[0])!);
    } else {
      for (const [da, db] of pairs(dates)) {
        const a = valueByDate.get(da)!;
        const b = valueByDate.get(db)!;
        for (let i = 0; i < k; i++) {
          const t = i / k;
          const tv = ease(t); // ease the value motion; keep time (date) linear
          const values = new Map<string, number>();
          for (const name of names) {
            values.set(name, lerp(a.get(name) ?? 0, b.get(name) ?? 0, tv));
          }
          pushKeyframe(lerp(da, db, t), values);
        }
      }
      // Final exact keyframe at the last date.
      pushKeyframe(dates[dates.length - 1], valueByDate.get(dates[dates.length - 1])!);
    }

    this.names = names;
    this.categories = categories;
    this.dates = dates;
    this.keyframes = keyframes;
    this.globalMax = keyframes.reduce((m, k) => Math.max(m, k.max), 0) || 1;
  }

  get frameCount(): number {
    return this.keyframes.length;
  }

  /**
   * Sample the timeline at normalized position `t` (0..1) with an extra layer
   * of interpolation between keyframes for buttery scrubbing at any speed.
   */
  sample(t: number): RenderFrame {
    const frames = this.keyframes;
    const clamped = Math.min(1, Math.max(0, t));
    const pos = clamped * (frames.length - 1);
    const i0 = Math.floor(pos);
    const i1 = Math.min(frames.length - 1, i0 + 1);
    const frac = pos - i0;

    const a = frames[i0];
    const b = frames[i1];

    const entries: EntryFrame[] = this.names.map((name) => ({
      name,
      value: lerp(a.values.get(name) ?? 0, b.values.get(name) ?? 0, frac),
      rank: lerp(a.ranks.get(name) ?? 0, b.ranks.get(name) ?? 0, frac),
      category: this.categories.get(name) ?? name,
    }));

    const dateValue = lerp(a.date, b.date, frac);
    const maxValue = lerp(a.max, b.max, frac) || 1;

    return {
      dateLabel: String(Math.round(dateValue)),
      dateValue,
      maxValue,
      entries,
    };
  }
}
