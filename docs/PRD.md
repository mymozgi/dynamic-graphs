# Chart Studio — PRD (condensed) & MVP status

> Full vision: a production app for creating professional animated data
> visualizations (à la Flourish, amCharts, Datawrapper, Filmora animated
> charts). This document tracks the vision against what the **MVP** ships.

## Mission

Let anyone turn a table of data into a polished, animated, exportable chart —
with a live inspector, theming, and playback — entirely in the browser.

## Milestone 1 — Bar Chart Race ✅ (this repo)

A single chart type built end-to-end so the studio *works*, rather than a wide
shell of stubs. Delivered:

- SVG bar chart race: smooth value + rank interpolation, reordering, flags,
  animated date counter, SI axis, gridlines.
- Playback: play/pause/restart, loop, scrub, duration, speed.
- Live inspector: theme, palettes, font, bars, labels, axes, header,
  background, number format, animation.
- Canvas aspect-ratio presets.
- Editable data grid + import (CSV / TSV / JSON, wide & long, **monthly
  YYYY-MM** periods) with a monthly social-media sample dataset (2004–2009).
- Per-entity custom images (upload / paste) rendered inside bars, with
  left/center/right alignment; adjustable canvas padding.
- Light / Dark theme engine that updates UI + canvas + chart together.
- Export: PNG / JPG / SVG (hi-res, transparent), clipboard, and WebM video
  (up to 2K).

## Vision backlog (not yet built)

Grouped roughly by the original master PRD. Ordered by suggested priority.

### Export
- [x] PNG / JPG / SVG snapshot of the visible canvas (+ transparent bg)
- [x] WebM via frame capture (MediaRecorder + captureStream)
- [x] Copy PNG to clipboard
- [x] Hi-res render (1× / 2× / 4×)
- [ ] MP4 / GIF via FFmpeg.wasm
- [ ] 8K render sizes

### Data
- [x] CSV / TSV / JSON import (upload + paste), wide & long formats
- [x] Add / remove entities + periods, inline editing
- [x] Flag auto-resolution for ~45 countries (with name aliases)
- [ ] Excel (.xlsx) import
- [ ] Google Sheets / REST API sources, realtime updates

### More chart types
- [ ] Line, Area, Pie, Donut (share the current store + engine)
- [ ] Scatter, Bubble, Radar, Treemap, Funnel, …

### Studio / platform
- [ ] Scene system with transitions
- [ ] Undo / redo + autosave (IndexedDB)
- [ ] AI: suggest chart type, palettes, titles from a dataset
- [ ] Desktop shell (Tauri/Electron) for native export
- [ ] Split `engine/`, `theme/`, `ui/` into monorepo `packages/*`

## Non-negotiables (carried from the master PRD)

Maintainability, modular architecture, clean code, 60 fps preview, accessible
controls, and a theme engine that updates everything at once.

## Architecture pointer

See the [README](../README.md#architecture). The core idea: a
config-agnostic `RaceEngine` + a single Zustand store, so new chart types and
features attach without reworking the animation core.
