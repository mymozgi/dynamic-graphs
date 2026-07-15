# Chart Studio — Bar Chart Race (MVP)

An animated **bar chart race** studio: a Flourish / amCharts-style tool for
creating professional animated data visualizations. This is the first
milestone of the larger [Chart Studio PRD](./docs/PRD.md) —
one chart type built end-to-end, structured to grow.

![Bar chart race](scripts/shot-dark.png)

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check + production bundle
npm run typecheck  # tsc, no emit
node scripts/smoke.mjs   # headless browser smoke test (needs `npm run dev` running)
```

## What's built

**Center canvas** — smooth, scrubbable bar chart race rendered in **SVG**.
Bars grow, reorder, and fade in/out continuously; real country flags sit at
each bar's end; an animated year counter and SI-formatted axis complete the
scene. Canvas aspect-ratio presets (16:9, 1:1, 9:16, 4:3, 21:9).

**Playback** — play / pause / restart, loop, a draggable scrubber, editable
total duration, and a speed multiplier. Driven by a single GSAP ticker.

**Export** — the chart SVG is fully self-contained (inline flag data-URIs +
fonts embedded at export time), rasterized through one canvas path:

- **PNG** — 1× / 2× (HD) / 4× (4K), optional transparent background
- **JPG** — flattened onto the canvas background
- **SVG** — vector, portable (fonts + flags embedded)
- **Copy PNG** to clipboard
- **WebM video** — frame-by-frame via `MediaRecorder` + `captureStream`,
  with frame-rate and **resolution up to 2K** (720p / 1080p / 2K) plus a
  progress bar (MP4/GIF via FFmpeg.wasm is a follow-on)

**Inspector** (right panel) — live controls wired to the chart:

| Section | Controls |
| --- | --- |
| Export | PNG / JPG / SVG / WebM, resolution, transparency, clipboard |
| Theme | Light / Dark (updates UI, canvas & chart) |
| Palette / Font | 6 color palettes, font family |
| Bars | count, sort, color-by entity/category, per-bar colors, opacity, corner radius, spacing |
| Icons | on/off, size, inside / outside, **align (left/center/right)**, **per-entity custom images** (upload or paste) |
| Labels | data labels, position (auto-flips outside when too long), size, entity labels |
| Axes & Grid | x-axis, gridlines |
| Date Counter | show, Year / Month-Year format, size, color, opacity |
| Header | text, size, alignment |
| Background | canvas color override |
| Padding | **Top / Right / Bottom / Left** canvas insets |
| Format | compact K/M/B/T toggle, number style, prefix / suffix |
| Animation | bar-motion easing (linear / smooth / in / out), duration, speed |

**Data** — a "Data" tab with an editable spreadsheet and **import**:

- **Upload / paste** CSV, TSV, or JSON — in either **wide** layout (entity +
  period columns) or **long** layout (`Date, Platform, Users` style).
- **Monthly periods** — `YYYY-MM` dates are parsed to fractional years, so the
  counter smoothly ticks "Jan 2004 → Feb 2004…"; the grid shows `YYYY-MM` and
  the counter format auto-switches to Month-Year for monthly data.
- Recognizes many column names (name/platform/company…, users/views/revenue…),
  quoted fields, delimiter auto-detection, thousands separators; friendly
  errors/warnings.
- Add / remove entities and periods; edit any cell inline.
- Flags auto-resolve for ~45 common countries; other entities can use pasted
  custom images.

Ships with a monthly social-media dataset (platform users, 2004–2009).

## Architecture

```
src/
├── engine/          # framework-agnostic race engine (raceEngine, types)
├── store/           # Zustand store — data, config, playback, theme (single source of truth)
├── data/            # dataset + parsing (sampleData, parseData, countries, flagRegistry)
├── theme/           # palettes + resolved chart color tokens
├── export/          # image (PNG/JPG/SVG) + WebM video + font embedding
├── hooks/           # ResizeObserver + GSAP playback clock
├── utils/           # format (numbers) + period (dates)
├── constants/       # canvas aspect-ratio presets
├── styles/          # global.css (theme variables + component styles)
└── components/
    ├── chart/           SVG BarChartRace renderer
    ├── center/          canvas stage, playback bar, Preview/Data tabs
    ├── inspector/       property panel + sections (colors, images, export)
    ├── data/            editable data grid + import
    ├── layout/          three-panel app shell + left rail
    └── ui/              reusable controls (slider, toggle, segmented, icons)
```

**Key design decisions**

- **Engine ≠ config.** `RaceEngine` precomputes an interpolated, scrubbable
  timeline from long-format rows and knows nothing about colors or bar counts.
  Changing visual settings never rebuilds it.
- **Continuous interpolation, not step frames.** Every rendered frame lerps
  both *value* and *rank* between keyframes, so bars slide and resize smoothly
  and the timeline scrubs to any position at any speed.
- **Isolated re-renders.** Only the chart and scrubber subscribe to the
  playback clock; the inspector re-renders only on config changes. This keeps
  the animation at 60 fps.
- **SVG + flag-icons.** Real SVG flags (via `<foreignObject>`) render
  consistently cross-platform — including Windows, where emoji flags don't.

## Tech stack

React · TypeScript · Vite · D3 (scale/array/format) · GSAP · Zustand ·
flag-icons.

## Roadmap (toward the full PRD)

The engine and store are chart-type-agnostic on purpose. Natural next steps:

1. **Export** — ✅ PNG/JPG/SVG/WebM shipped. Next: MP4/GIF via FFmpeg.wasm.
2. **Data import** — ✅ CSV / TSV / JSON upload + paste, wide & long formats.
3. **More chart types** — line, area, pie/donut share the same store + engine.
4. **Packages split** — promote `engine/`, `theme/`, `ui/` into the PRD's
   monorepo `packages/*` once a second app or chart type needs them.
```
