import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const URL = "http://localhost:5173/";
const OUT = "scripts/out";
mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("#race-svg [data-name]");

const results = {};

// ---- Monthly sample data ----
results.monthly = await page.evaluate(() => {
  const s = window.__studio.getState();
  s.pause();
  s.seek01(0);
  const names = [...new Set(s.rows.map((r) => r.name))];
  return {
    entities: names.length,
    fractionalDates: s.rows.some((r) => !Number.isInteger(r.date)),
    dateFormat: s.config.dateFormat,
    header: s.config.header,
  };
});
await page.waitForTimeout(100);
results.monthly.counter = await page.textContent('[data-role="counter"]');
results.monthly.counterOk = /^[A-Z][a-z]{2} \d{4}$/.test(results.monthly.counter ?? "");

// ---- DataPanel shows YYYY-MM headers ----
await page.getByRole("button", { name: "Data" }).click();
await page.waitForSelector(".data-table");
results.dataHeaders = await page.$$eval(".data-table thead th", (ths) =>
  ths.map((t) => t.textContent).filter((t) => /^\d{4}-\d{2}$/.test(t ?? "")).slice(0, 3),
);

// ---- Import monthly (long) CSV works ----
await page.getByRole("button", { name: "Paste data" }).click();
await page.fill(".paste-box textarea", `Date,Platform,Users
2010-01,Alpha,100
2010-02,Alpha,300
2010-01,Beta,200
2010-02,Beta,250`);
await page.getByRole("button", { name: "Import", exact: true }).click();
await page.waitForSelector(".data-msg--ok", { timeout: 5000 });
results.importMonthly = await page.evaluate(() => {
  const s = window.__studio.getState();
  return { dateFormat: s.config.dateFormat, fractional: s.rows.some((r) => !Number.isInteger(r.date)) };
});

// Reload sample for the rest
await page.getByRole("button", { name: "Load sample" }).click();
await page.getByRole("button", { name: "Preview" }).click();
await page.waitForTimeout(150);

// ---- Padding shifts the plot ----
const barX = () => page.evaluate(() => {
  const r = document.querySelector("#race-svg [data-name] rect");
  return r ? Number(r.getAttribute("x")) : null;
});
await page.evaluate(() => window.__studio.getState().updateConfig({ padLeft: 16 }));
await page.waitForTimeout(80);
const x16 = await barX();
await page.evaluate(() => window.__studio.getState().updateConfig({ padLeft: 120 }));
await page.waitForTimeout(80);
const x120 = await barX();
results.padding = { x16, x120, shifted: x120 - x16 > 80 };
await page.evaluate(() => window.__studio.getState().updateConfig({ padLeft: 16 }));

// ---- Custom bar image + icon alignment ----
const facebookImageLeft = () =>
  page.evaluate(() => {
    const img = document.querySelector('[data-name="Facebook"] image');
    return img ? Math.round(img.getBoundingClientRect().left) : null;
  });

await page.evaluate(() => {
  const s = window.__studio.getState();
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='4' height='3'><rect width='4' height='3' fill='red'/></svg>";
  s.setBarImage("Facebook", "data:image/svg+xml;base64," + btoa(svg));
  s.seek01(0.9); // Facebook is the widest bar here
});
await page.waitForTimeout(120);
results.customImagePresent = (await facebookImageLeft()) !== null;

await page.evaluate(() => window.__studio.getState().updateConfig({ iconAlign: "left" }));
await page.waitForTimeout(80);
const alignLeft = await facebookImageLeft();
await page.evaluate(() => window.__studio.getState().updateConfig({ iconAlign: "center" }));
await page.waitForTimeout(80);
const alignCenter = await facebookImageLeft();
await page.evaluate(() => window.__studio.getState().updateConfig({ iconAlign: "right" }));
await page.waitForTimeout(80);
const alignRight = await facebookImageLeft();
results.iconAlign = {
  left: alignLeft,
  center: alignCenter,
  right: alignRight,
  ordered: alignLeft < alignCenter && alignCenter < alignRight,
};
await page.screenshot({ path: `${OUT}/preview.png` });

// ---- Image export (PNG + SVG) ----
const download = async (trigger, savePath) => {
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 30000 }), trigger()]);
  await d.saveAs(savePath);
  return savePath;
};
{
  const p = `${OUT}/race.png`;
  await download(() => page.getByRole("button", { name: "Download", exact: true }).click(), p);
  const buf = readFileSync(p);
  results.exportPng = { ok: buf[0] === 0x89 && buf[1] === 0x50, bytes: buf.length };
}
{
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  const p = `${OUT}/race.svg`;
  await download(() => page.getByRole("button", { name: "Download", exact: true }).click(), p);
  const txt = readFileSync(p, "utf8");
  results.exportSvg = { ok: txt.includes("<svg"), hasFontFace: txt.includes("@font-face") };
  await page.getByRole("button", { name: "PNG", exact: true }).click(); // reset to PNG
}

// ---- 2K video export option + short record ----
results.has2K = await page.getByRole("button", { name: "2K", exact: true }).isVisible();
await page.evaluate(() => window.__studio.getState().setDuration(1));
await page.getByRole("button", { name: "2K", exact: true }).click();
await page.locator(".field", { hasText: "Frame rate" }).locator("select").selectOption("24");
const [dl] = await Promise.all([
  page.waitForEvent("download", { timeout: 40000 }),
  page.getByRole("button", { name: /Render & download/ }).click(),
]).catch((e) => [{ error: String(e) }]);
if (dl && !dl.error) {
  const p = `${OUT}/race-2k.webm`;
  await dl.saveAs(p);
  const buf = readFileSync(p);
  results.video2K = { ok: buf[0] === 0x1a && buf[1] === 0x45 && buf.length > 1000, bytes: buf.length };
} else {
  results.video2K = { ok: false, error: dl?.error };
}

// ---- Compound number format ("1m 32k" / "1b 250m") ----
const facebookLabel = () => page.textContent('[data-name="Facebook"] [data-role="value"]');
await page.evaluate(() => {
  const s = window.__studio.getState();
  s.pause();
  s.updateConfig({ numberFormat: "compound" });
  s.seek01(0.9); // Facebook in the hundreds of millions
});
await page.waitForTimeout(120);
const millionsLabel = (await facebookLabel())?.trim();
// Force a billions value on the final frame and re-read.
await page.evaluate(() => {
  const s = window.__studio.getState();
  const dates = [...new Set(s.rows.map((r) => r.date))].sort((a, b) => a - b);
  s.updateCell("Facebook", dates[dates.length - 1], 1_250_500_000);
  s.seek01(1);
});
await page.waitForTimeout(120);
const billionsLabel = (await facebookLabel())?.trim();
results.compound = {
  millions: millionsLabel,
  millionsOk: /^\d+m( \d+k)?$/.test(millionsLabel ?? ""),
  billions: billionsLabel,
  billionsOk: billionsLabel === "1b 250m",
};

await browser.close();
results.consoleErrors = consoleErrors;
console.log(JSON.stringify(results, null, 2));

const pass =
  results.monthly.entities === 8 &&
  results.monthly.fractionalDates === true &&
  results.monthly.dateFormat === "monthYear" &&
  results.monthly.counterOk === true &&
  results.dataHeaders.length >= 2 &&
  results.importMonthly.dateFormat === "monthYear" &&
  results.padding.shifted === true &&
  results.customImagePresent === true &&
  results.iconAlign.ordered === true &&
  results.exportPng.ok === true &&
  results.exportSvg.ok === true &&
  results.exportSvg.hasFontFace === true &&
  results.has2K === true &&
  results.video2K.ok === true &&
  results.compound.millionsOk === true &&
  results.compound.billionsOk === true &&
  consoleErrors.length === 0;
process.exit(pass ? 0 : 1);
