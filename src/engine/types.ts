/**
 * Core domain types for the bar chart race engine and studio config.
 */

/** A single long-format data row: one entity's value at one date. */
export interface RaceRow {
  /** Entity label, e.g. "US". */
  name: string;
  /** Numeric date (used for interpolation), e.g. 1960. */
  date: number;
  /** Measured value at that date. */
  value: number;
  /** Optional grouping used for "color by category". */
  category?: string;
}

/** One entity's interpolated state within a rendered frame. */
export interface EntryFrame {
  name: string;
  value: number;
  /** Fractional rank, 0 = largest. Interpolated for smooth reordering. */
  rank: number;
  category: string;
}

/** A fully interpolated moment in time, ready to render. */
export interface RenderFrame {
  /** Human-readable date label, e.g. "1997". */
  dateLabel: string;
  /** Interpolated numeric date. */
  dateValue: number;
  /** Largest value at this moment — drives the x-axis domain. */
  maxValue: number;
  /** Every entity with its interpolated value + rank. */
  entries: EntryFrame[];
}

export type ThemeMode = "light" | "dark";
export type SortDirection = "descending" | "ascending";
/** How motion interpolates between data points (adjustable bar switching). */
export type EasingMode = "linear" | "smooth" | "easeIn" | "easeOut";
export type LabelPosition = "left" | "middle" | "right" | "outside";
export type HeaderAlign = "left" | "middle" | "right";
export type AxisTiltMode = "flat" | "left" | "straight" | "right";

/** Named canvas aspect ratio preset. */
export interface AspectPreset {
  id: string;
  label: string;
  ratio: number; // width / height
}

/** All visual/behavioral config for the chart (render-time only). */
export interface ChartConfig {
  // Header
  showHeader: boolean;
  header: string;
  headerAlign: HeaderAlign;
  headerFontSize: number;

  // Bars
  numBars: number;
  sort: SortDirection;
  barOpacity: number; // 0..1
  barCornerRadius: number; // px
  barPadding: number; // 0..0.9 (gap between bars as ratio)
  /** Per-entity color overrides (by name); wins over the palette. */
  barColors: Record<string, string>;

  // Labels
  showDataLabels: boolean;
  labelPosition: LabelPosition;
  labelFontSize: number;
  showEntityLabels: boolean;

  // Icons
  showFlags: boolean;
  flagScale: number; // icon height as a fraction of bar height (0.3..1)
  flagPosition: "inside" | "outside";
  /** Horizontal alignment of an inside icon within the bar. */
  iconAlign: "left" | "center" | "right";
  /** Per-entity custom images (data URLs); override the auto flag. */
  barImages: Record<string, string>;

  // Canvas padding (px inset from each edge, on top of content margins)
  padTop: number;
  padRight: number;
  padBottom: number;
  padLeft: number;

  // Axes / grid
  showXAxis: boolean;
  showGridlines: boolean;

  // Date counter
  showDateCounter: boolean;
  dateCounterScale: number; // font size as a fraction of plot height
  dateCounterColor: string | null; // null = theme default
  dateCounterOpacity: number; // 0..1
  dateFormat: "year" | "monthYear";

  // Formatting
  /** d3-format spec, or a sentinel: "compact" (1.2M) / "compound" (1m 32k). */
  numberFormat: string;
  prefix: string;
  suffix: string;

  // Look & feel
  paletteId: string;
  fontFamily: string;

  // Optional explicit canvas background (else theme default)
  canvasBg: string | null;
}

/** Playback / timeline state. */
export interface PlaybackState {
  playing: boolean;
  /** Current position, seconds into the timeline. */
  time: number;
  /** Total timeline length, seconds. */
  duration: number;
  /** Playback speed multiplier. */
  speed: number;
  loop: boolean;
}
