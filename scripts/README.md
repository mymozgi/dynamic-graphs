# scripts

Developer tooling (not shipped in the app bundle).

## `verify.mjs`

An end-to-end smoke test that drives the running app in a headless browser
(Playwright) and asserts the core features actually work: monthly data +
counter, the data grid, CSV import, canvas padding, custom bar images, icon
alignment, image export, and 2K video export.

```bash
npm run dev        # start the app on http://localhost:5173 (in one terminal)
npm run verify     # run the checks (in another)
```

It prints a JSON result and exits non-zero if anything fails. Screenshots and
exported files are written to `scripts/out/` (git-ignored).

## `render.mjs` — offline video renderer

Renders long videos (10–20+ min) reliably by driving the app in headless
Chromium and piping frames to FFmpeg — no browser tab/memory limits, and it
runs in the background.

```bash
# 1. In the app: Export → Config (JSON)  →  saves chart-config.json
# 2. With the dev server running:
npm run render -- --config chart-config.json --format mp4 --fps 30 --height 1080
```

| Flag | Default | Notes |
|------|---------|-------|
| `--config` | — | required; JSON exported from the app |
| `--format` | `mp4` | `mp4` (H.264) · `mov` (ProRes) · `webm` · `png` (image sequence) |
| `--fps` | `30` | 24 / 30 / 60 / 120 … |
| `--height` | `1080` | output height in px; width follows the aspect |
| `--out` | `out.<ext>` | output file (or folder for `png`) |
| `--ffmpeg` | auto | explicit FFmpeg path |

**FFmpeg:**
- `png` sequence needs **no** FFmpeg (lossless, best for editors — but large).
- `mp4` / `mov` / `webm` need a **full FFmpeg** on PATH
  (Windows: `choco install ffmpeg`) or `--ffmpeg <path>`. If it's missing the
  renderer stops immediately with an install hint (no hang). The renderer also
  auto-detects FFmpeg in `%LOCALAPPDATA%\ffmpeg\`.

## `export.mjs` — one-command export (`npm run export`)

A friendly wrapper around `render.mjs`: it **auto-finds the newest
`chart-config*.json`** (in Downloads or the project), renders it, and opens the
output folder — so you never type a config path.

```bash
# In the app: Export → "Config (JSON)"   (downloads chart-config.json)
npm run export                          # newest config → MP4 1080p 60fps
npm run export -- --format mov --height 2160   # override defaults
```

For zero terminal, **double-click `export.bat`** in the project root — it runs
`npm run export` and pauses so you can read the result. (The dev server must be
running; it always is while you have the app open.)
