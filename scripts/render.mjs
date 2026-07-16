/**
 * Offline renderer — drives the app in headless Chromium and pipes frames to
 * FFmpeg. Handles long videos (10-20+ min) without browser tab/memory limits.
 *
 * Prereqs: the dev server running (`npm run dev`).
 *   - `png` sequence needs NO FFmpeg (lossless, best for editors — but large).
 *   - `mp4` / `mov` / `webm` need a real FFmpeg on PATH
 *     (Windows: `choco install ffmpeg`) or `--ffmpeg <path>`.
 *
 * Usage:
 *   npm run render -- --config chart-config.json --format mp4 --fps 30 --height 1080
 */

import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) a[argv[i].slice(2)] = argv[i + 1];
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));

/** Resolve a real FFmpeg binary (Node's spawn on Windows won't search PATH). */
function resolveFfmpeg() {
  if (args.ffmpeg) return args.ffmpeg;
  // system PATH
  try {
    const cmd = process.platform === "win32" ? "where ffmpeg" : "which ffmpeg";
    const hit = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)[0];
    if (hit) return hit;
  } catch {
    /* not on PATH */
  }
  // common no-admin install locations
  const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const candidates = [
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "ffmpeg", exe),
    join(process.cwd(), "tools", exe),
    process.env.FFMPEG_PATH,
  ].filter(Boolean);
  return candidates.find((c) => existsSync(c)) ?? null;
}

const configPath = args.config;
if (!configPath) {
  console.error("Missing --config <path>. Export it from the app: Export → Config (JSON).");
  process.exit(1);
}
const format = (args.format || "mp4").toLowerCase();
const fps = Number(args.fps || 30);
const height = Number(args.height || 1080);
const url = args.url || "http://localhost:5173/";
const out = args.out || (format === "png" ? "frames" : `out.${format}`);
const snapshot = JSON.parse(readFileSync(configPath, "utf8"));

function ffmpegArgs() {
  const base = ["-y", "-f", "image2pipe", "-framerate", String(fps), "-i", "-"];
  const codec = {
    mp4: ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p"],
    mov: ["-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le"],
    webm: ["-c:v", "libvpx-vp9", "-crf", "20", "-b:v", "0", "-pix_fmt", "yuv420p"],
  }[format];
  if (!codec) {
    console.error(`Unknown --format "${format}". Use mp4 | mov | webm | png.`);
    process.exit(1);
  }
  return [...base, ...codec, out];
}

// Video formats need a real FFmpeg; check up-front so we fail fast (not hang).
let ffPath = null;
if (format !== "png") {
  ffPath = resolveFfmpeg();
  if (!ffPath) {
    console.error(`No FFmpeg found — needed for "${format}".`);
    console.error(`Install it (Windows: choco install ffmpeg), pass --ffmpeg <path>,`);
    console.error(`or use --format png (lossless image sequence, no FFmpeg needed).`);
    process.exit(1);
  }
}

// ---- Render ------------------------------------------------------------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on("pageerror", (e) => console.error("page error:", e));

console.log(`Loading ${url} …`);
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__render, null, { timeout: 15000 });

await page.evaluate((s) => window.__render.applySnapshot(s), snapshot);
await page.waitForTimeout(400);

const dims = await page.evaluate(() => window.__render.dims());
const scale = height / dims.height;
const outW = Math.round(dims.width * scale);
const outH = Math.round(dims.height * scale);
const fontCss = await page.evaluate(() => window.__render.fontCss());

const duration = snapshot.duration || 12;
const total = Math.max(2, Math.round(fps * duration));
console.log(`Rendering ${total} frames · ${outW}×${outH} · ${fps}fps · ${duration}s → ${out} (${format})`);

let ff = null;
let framesDir = null;
let ffExit = null; // set when ffmpeg exits — guards against writing to a dead pipe
if (format === "png") {
  framesDir = out;
  mkdirSync(framesDir, { recursive: true });
} else {
  ff = spawn(ffPath, ffmpegArgs(), { stdio: ["pipe", "inherit", "inherit"] });
  ff.on("error", (e) => {
    console.error("\nFailed to start FFmpeg:", e.message);
    process.exit(1);
  });
  ff.on("close", (code) => (ffExit = code ?? 0));
  ff.stdin.on("error", () => {}); // swallow EPIPE if ffmpeg dies mid-stream
}

async function finish(err) {
  try {
    if (ff && ffExit === null) {
      ff.stdin.end();
      await new Promise((res) => ff.on("close", res));
    }
  } catch {
    /* ignore */
  }
  await browser.close();
  if (err) {
    console.error("\n" + err.message);
    process.exit(1);
  }
}

const start = Date.now();
for (let i = 0; i < total; i++) {
  if (ffExit !== null) {
    await finish(new Error(`FFmpeg exited early (code ${ffExit}) — check the args/codec above.`));
  }
  const t01 = total === 1 ? 0 : i / (total - 1);
  const dataUrl = await page.evaluate(
    ([t, sc, fc]) => window.__render.frame(t, sc, fc),
    [t01, scale, fontCss],
  );
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  if (framesDir) {
    writeFileSync(`${framesDir}/frame_${String(i).padStart(6, "0")}.png`, buf);
  } else if (!ff.stdin.write(buf)) {
    await new Promise((r) => ff.stdin.once("drain", r));
  }
  if (i % 15 === 0 || i === total - 1) {
    const pct = Math.round(((i + 1) / total) * 100);
    const eta = Math.round((((Date.now() - start) / (i + 1)) * (total - i - 1)) / 1000);
    process.stdout.write(`\r  ${i + 1}/${total} (${pct}%)  eta ${eta}s   `);
  }
}
process.stdout.write("\n");

if (ff) {
  ff.stdin.end();
  await new Promise((res, rej) =>
    ff.on("close", (code) => (code === 0 || ffExit === 0 ? res() : rej(new Error("ffmpeg exited " + code)))),
  );
}
await browser.close();
console.log(`✓ Done → ${framesDir ?? out}`);
