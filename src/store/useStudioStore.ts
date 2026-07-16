import { create } from "zustand";
import { RaceEngine } from "@/engine/raceEngine";
import type { ChartConfig, EasingMode, PlaybackState, RaceRow, ThemeMode } from "@/engine/types";
import { getSampleRows } from "@/data/sampleData";

export type ColorBy = "name" | "category";

/** A complete, serializable studio state — used for config export + offline render. */
export interface StudioSnapshot {
  version: number;
  rows: RaceRow[];
  config: ChartConfig;
  easing: EasingMode;
  colorBy: ColorBy;
  theme: ThemeMode;
  aspectId: string;
  duration: number;
}

const FRAMES_PER_TRANSITION = 24;

const DEFAULT_CONFIG: ChartConfig = {
  showHeader: true,
  header: "Social Media Users",
  headerAlign: "left",
  headerFontSize: 22,

  numBars: 10,
  sort: "descending",
  barOpacity: 1,
  barCornerRadius: 6,
  barPadding: 0.28,
  paddingInside: 6,
  paddingOutside: 8,
  barColors: {},

  showDataLabels: true,
  labelPosition: "outside",
  labelFontSize: 13,
  showEntityLabels: true,

  showFlags: true,
  flagScale: 0.7,
  flagPosition: "inside",
  iconAlign: "right",
  iconBorder: true,
  barImages: {},

  padTop: 16,
  padRight: 24,
  padBottom: 16,
  padLeft: 16,

  showXAxis: true,
  showGridlines: true,

  showDateCounter: true,
  dateCounterScale: 0.34,
  dateCounterColor: null,
  dateCounterOpacity: 0.12,
  dateFormat: "monthYear",

  numberFormat: ",.0f",
  prefix: "",
  suffix: "",

  paletteId: "vivid",
  fontFamily: "Montserrat",
  canvasBg: null,
};

const DEFAULT_PLAYBACK: PlaybackState = {
  playing: false,
  time: 0,
  duration: 12,
  speed: 1,
  loop: true,
};

interface StudioState {
  rows: RaceRow[];
  engine: RaceEngine;
  config: ChartConfig;
  playback: PlaybackState;
  theme: ThemeMode;
  colorBy: ColorBy;
  aspectId: string;
  easing: EasingMode;

  // data
  setRows: (rows: RaceRow[]) => void;
  updateCell: (name: string, date: number, value: number) => void;
  loadSample: () => void;
  addEntity: (name: string) => void;
  addPeriod: (date: number) => void;
  removeEntity: (name: string) => void;
  loadState: (snap: StudioSnapshot) => void;

  // canvas
  setAspect: (id: string) => void;

  // config / theme
  updateConfig: (patch: Partial<ChartConfig>) => void;
  setTheme: (mode: ThemeMode) => void;
  setColorBy: (mode: ColorBy) => void;
  setBarColor: (name: string, color: string) => void;
  resetBarColors: () => void;
  setBarImage: (name: string, dataUrl: string) => void;
  clearBarImage: (name: string) => void;
  setEasing: (mode: EasingMode) => void;

  // playback
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek01: (t01: number) => void;
  setSpeed: (speed: number) => void;
  setDuration: (duration: number) => void;
  toggleLoop: () => void;
  /** Advance the clock by `dt` real seconds (called by the rAF loop). */
  advance: (dt: number) => void;
}

const uniqueCount = (rows: RaceRow[], key: "name" | "date") =>
  new Set(rows.map((r) => r[key])).size;

/** Keep total interpolated keyframes bounded (~280) regardless of how many
 *  periods the data has — dense monthly data uses fewer frames per step. */
const buildEngine = (rows: RaceRow[], easing: EasingMode) => {
  const transitions = Math.max(1, uniqueCount(rows, "date") - 1);
  const framesPerTransition = Math.max(4, Math.min(FRAMES_PER_TRANSITION, Math.round(280 / transitions)));
  return new RaceEngine(rows, { framesPerTransition, easing });
};

/** Monthly data (non-integer periods) should default to a Month-Year counter. */
const detectDateFormat = (rows: RaceRow[]): "year" | "monthYear" =>
  rows.some((r) => !Number.isInteger(r.date)) ? "monthYear" : "year";

const initialRows = getSampleRows();

export const useStudioStore = create<StudioState>((set, get) => ({
  rows: initialRows,
  engine: buildEngine(initialRows, "linear"),
  config: DEFAULT_CONFIG,
  playback: DEFAULT_PLAYBACK,
  theme: "dark",
  colorBy: "name",
  aspectId: "16:9",
  easing: "linear",

  setAspect: (id) => set({ aspectId: id }),

  setRows: (rows) =>
    // numBars is a stable preference; the renderer shows min(numBars, entities).
    set((s) => ({
      rows,
      engine: buildEngine(rows, s.easing),
      config: { ...s.config, dateFormat: detectDateFormat(rows) },
      playback: { ...s.playback, time: 0, playing: false },
    })),

  updateCell: (name, date, value) => {
    const rows = get().rows.map((r) =>
      r.name === name && r.date === date ? { ...r, value } : r,
    );
    set({ rows, engine: buildEngine(rows, get().easing) });
  },

  loadSample: () => get().setRows(getSampleRows()),

  loadState: (snap) =>
    set((s) => ({
      rows: snap.rows,
      engine: buildEngine(snap.rows, snap.easing),
      config: snap.config,
      easing: snap.easing,
      colorBy: snap.colorBy,
      theme: snap.theme,
      aspectId: snap.aspectId,
      playback: { ...s.playback, duration: snap.duration, time: 0, playing: false },
    })),

  addEntity: (name) => {
    const clean = name.trim();
    const { rows } = get();
    if (!clean || rows.some((r) => r.name === clean)) return;
    const dates = [...new Set(rows.map((r) => r.date))];
    const added = dates.map((date) => ({ name: clean, date, value: 0 }));
    const next = [...rows, ...added];
    set({ rows: next, engine: buildEngine(next, get().easing) });
  },

  addPeriod: (date) => {
    const { rows } = get();
    if (!Number.isFinite(date) || rows.some((r) => r.date === date)) return;
    const catByName = new Map(rows.map((r) => [r.name, r.category]));
    const names = [...new Set(rows.map((r) => r.name))];
    const added = names.map((name) => ({ name, date, value: 0, category: catByName.get(name) }));
    const next = [...rows, ...added];
    set({ rows: next, engine: buildEngine(next, get().easing) });
  },

  removeEntity: (name) => {
    const next = get().rows.filter((r) => r.name !== name);
    if (next.length === 0) return; // keep at least one entity
    set((s) => ({ rows: next, engine: buildEngine(next, s.easing) }));
  },

  updateConfig: (patch) => set({ config: { ...get().config, ...patch } }),
  setTheme: (mode) => set({ theme: mode }),
  setColorBy: (mode) => set({ colorBy: mode }),
  setBarColor: (name, color) =>
    set((s) => ({ config: { ...s.config, barColors: { ...s.config.barColors, [name]: color } } })),
  resetBarColors: () => set((s) => ({ config: { ...s.config, barColors: {} } })),
  setBarImage: (name, dataUrl) =>
    set((s) => ({ config: { ...s.config, barImages: { ...s.config.barImages, [name]: dataUrl } } })),
  clearBarImage: (name) =>
    set((s) => {
      const barImages = { ...s.config.barImages };
      delete barImages[name];
      return { config: { ...s.config, barImages } };
    }),
  setEasing: (mode) => set((s) => ({ easing: mode, engine: buildEngine(s.rows, mode) })),

  play: () => {
    const { playback } = get();
    // Restart from the top if we're parked at the end.
    const time = playback.time >= playback.duration ? 0 : playback.time;
    set({ playback: { ...playback, playing: true, time } });
  },
  pause: () => set({ playback: { ...get().playback, playing: false } }),
  togglePlay: () => (get().playback.playing ? get().pause() : get().play()),

  seek01: (t01) => {
    const { playback } = get();
    const clamped = Math.min(1, Math.max(0, t01));
    set({ playback: { ...playback, time: clamped * playback.duration } });
  },

  setSpeed: (speed) => set({ playback: { ...get().playback, speed } }),
  setDuration: (duration) =>
    set({ playback: { ...get().playback, duration: Math.max(1, duration) } }),
  toggleLoop: () => set({ playback: { ...get().playback, loop: !get().playback.loop } }),

  advance: (dt) => {
    const { playback } = get();
    if (!playback.playing) return;
    let time = playback.time + dt * playback.speed;
    if (time >= playback.duration) {
      if (playback.loop) {
        time = time % playback.duration;
      } else {
        set({ playback: { ...playback, time: playback.duration, playing: false } });
        return;
      }
    }
    set({ playback: { ...playback, time } });
  },
}));

/** Convenience selector: normalized timeline position (0..1). */
export const selectT01 = (s: StudioState) =>
  s.playback.duration > 0 ? s.playback.time / s.playback.duration : 0;

/** Serialize the full studio state (data + all settings) for export / render. */
export function getStudioSnapshot(): StudioSnapshot {
  const s = useStudioStore.getState();
  return {
    version: 1,
    rows: s.rows,
    config: s.config,
    easing: s.easing,
    colorBy: s.colorBy,
    theme: s.theme,
    aspectId: s.aspectId,
    duration: s.playback.duration,
  };
}

// Dev-only: expose the store for debugging + automated verification.
if (import.meta.env.DEV) {
  (window as unknown as { __studio?: typeof useStudioStore }).__studio = useStudioStore;
}
