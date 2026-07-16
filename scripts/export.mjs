/**
 * One-command offline export. Finds the newest chart-config*.json (Downloads
 * or project), renders it, and opens the result — so you don't type paths.
 *
 * Flow:  App → Export → "Config (JSON)"  →  run this.
 *
 * Usage:
 *   npm run export                       # newest config, MP4 1080p 60fps
 *   npm run export -- --format mov --height 2160
 */

import { spawnSync, spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[i + 1];
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));
const format = (args.format || "mp4").toLowerCase();
const height = args.height || "1080";
const fps = args.fps || "60";
const url = args.url || "http://localhost:5173/";

// 1) Find the newest chart-config*.json (Downloads first, then project).
function newestConfig() {
  if (args.config) return args.config;
  const dirs = [
    join(homedir(), "Downloads"),
    join(homedir(), "OneDrive", "Downloads"),
    join(homedir(), "Desktop"),
    join(homedir(), "OneDrive", "Desktop"),
    join(homedir(), "OneDrive", "Рабочий стол"),
    process.cwd(),
  ];
  let best = null;
  let bestT = 0;
  for (const dir of dirs) {
    try {
      for (const f of readdirSync(dir)) {
        if (/^chart-config.*\.json$/i.test(f)) {
          const p = join(dir, f);
          const t = statSync(p).mtimeMs;
          if (t > bestT) {
            bestT = t;
            best = p;
          }
        }
      }
    } catch {
      /* dir missing */
    }
  }
  return best;
}
const config = newestConfig();
if (!config) {
  console.error("No chart-config*.json found in Downloads or the project folder.");
  console.error('In the app: Export → "Config (JSON)", then run this again.');
  process.exit(1);
}
console.log("Config:", config);

// 2) Make sure the dev server is up (the renderer needs it).
try {
  const res = await fetch(url);
  if (!res.ok) throw new Error();
} catch {
  console.error(`Dev server not reachable at ${url}.`);
  console.error("Start it in another terminal:  npm run dev");
  process.exit(1);
}

// 3) Render (reuse render.mjs).
const out = format === "png" ? "frames" : `out.${format}`;
const r = spawnSync(
  process.execPath,
  ["scripts/render.mjs", "--config", config, "--format", format, "--height", height, "--fps", fps, "--out", out],
  { stdio: "inherit" },
);
if (r.status !== 0) process.exit(r.status ?? 1);

// 4) Reveal the result.
try {
  if (process.platform === "win32") spawn("explorer", [process.cwd()], { detached: true });
  else if (process.platform === "darwin") spawn("open", [process.cwd()], { detached: true });
  else spawn("xdg-open", [process.cwd()], { detached: true });
} catch {
  /* opening is best-effort */
}
console.log(`\n✓ Exported → ${join(process.cwd(), out)}`);
