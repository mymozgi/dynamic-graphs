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
  labelImages: {},
  showLabelIcons: false,
  labelIconScale: 0.7,

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

  chartType: "barRace",

  lineWidth: 4,
  lineCurve: "smooth",
  lineDash: "solid",
  lineArea: true,
  lineAreaOpacity: 0.35,
  lineGrowthColor: false,
  lineGrowthUpColor: "#22c55e",
  lineGrowthDownColor: "#ef4444",
  lineShowPoints: true,
  lineShowHeadValue: true,
  lineShowSeriesLabel: true,
  lineHoldEnabled: false,
  lineHoldSeconds: 1,
  lineYFromZero: true,
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
  setLabelImage: (name: string, dataUrl: string) => void;
  clearLabelImage: (name: string) => void;
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

// ---- Local persistence (auto-save your work across reloads) -------------
const PERSIST_KEY = "chart-studio:v1";

function loadPersisted(): StudioSnapshot | null {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && Array.isArray(s.rows) && s.rows.length > 0 && s.config) return s;
  } catch {
    /* corrupt / unavailable */
  }
  return null;
}

function savePersisted(snap: StudioSnapshot) {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(snap));
  } catch {
    // Likely quota (large bar images) — retry without images so at least the
    // data + settings survive a reload.
    try {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({ ...snap, config: { ...snap.config, barImages: {}, labelImages: {} } }));
    } catch {
      /* give up silently */
    }
  }
}

const persisted = typeof localStorage !== "undefined" ? loadPersisted() : null;
const initialRows = persisted?.rows ?? getSampleRows();
const initialEasing: EasingMode = persisted?.easing ?? "linear";
const initialConfig = persisted ? { ...DEFAULT_CONFIG, ...persisted.config } : DEFAULT_CONFIG;

export const useStudioStore = create<StudioState>((set, get) => ({
  rows: initialRows,
  engine: buildEngine(initialRows, initialEasing),
  config: initialConfig,
  playback: { ...DEFAULT_PLAYBACK, duration: persisted?.duration ?? DEFAULT_PLAYBACK.duration },
  theme: persisted?.theme ?? "dark",
  colorBy: persisted?.colorBy ?? "name",
  aspectId: persisted?.aspectId ?? "16:9",
  easing: initialEasing,

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
      engine: buildEngine(snap.rows, snap.easing ?? "linear"),
      config: { ...DEFAULT_CONFIG, ...snap.config },
      easing: snap.easing ?? "linear",
      colorBy: snap.colorBy ?? "name",
      theme: snap.theme ?? "dark",
      aspectId: snap.aspectId ?? "16:9",
      playback: { ...s.playback, duration: snap.duration ?? 12, time: 0, playing: false },
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
  setLabelImage: (name, dataUrl) =>
    set((s) => ({ config: { ...s.config, labelImages: { ...s.config.labelImages, [name]: dataUrl } } })),
  clearLabelImage: (name) =>
    set((s) => {
      const labelImages = { ...s.config.labelImages };
      delete labelImages[name];
      return { config: { ...s.config, labelImages } };
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

// Auto-save to localStorage whenever the data/config/settings change — but not
// on every playback frame (only `time` changes then, which isn't persisted).
if (typeof window !== "undefined") {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let prev = useStudioStore.getState();
  useStudioStore.subscribe((s) => {
    const changed =
      s.rows !== prev.rows ||
      s.config !== prev.config ||
      s.easing !== prev.easing ||
      s.colorBy !== prev.colorBy ||
      s.theme !== prev.theme ||
      s.aspectId !== prev.aspectId ||
      s.playback.duration !== prev.playback.duration;
    prev = s;
    if (!changed) return;
    clearTimeout(timer);
    timer = setTimeout(() => savePersisted(getStudioSnapshot()), 500);
  });
}

/** Clear the saved work and reset to the sample (used by a "Reset" action). */
export function clearPersisted(): void {
  try {
    localStorage.removeItem(PERSIST_KEY);
  } catch {
    /* ignore */
  }
}

// Dev-only: expose the store for debugging + automated verification.
if (import.meta.env.DEV) {
  (window as unknown as { __studio?: typeof useStudioStore }).__studio = useStudioStore;
}
