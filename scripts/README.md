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
  renderer stops immediately with an install hint (no hang).
