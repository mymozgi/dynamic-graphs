/**
 * Image export: serialize the live chart SVG (already self-contained — flags
 * are inline data URIs), embed fonts, and rasterize through a single canvas
 * path shared by PNG / JPG / clipboard. SVG export stays vector.
 */

export interface RasterOptions {
  scale: number;
  /** Remove the canvas background rect (transparent output). */
  stripBg?: boolean;
  /** Solid fill painted before the SVG (used for JPG). */
  fillBg?: string | null;
  fontCss?: string;
}

function prepareClone(svg: SVGSVGElement, fontCss: string, stripBg: boolean): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  if (stripBg) {
    clone.querySelector('[data-role="canvas-bg"]')?.remove();
  }
  if (fontCss) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = fontCss;
    clone.insertBefore(style, clone.firstChild);
  }
  return clone;
}

function serialize(svg: SVGSVGElement): string {
  return new XMLSerializer().serializeToString(svg);
}

function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("SVG image failed to load"));
    img.src = src;
  });
}

function dims(svg: SVGSVGElement): { w: number; h: number } {
  return {
    w: Number(svg.getAttribute("width")) || svg.clientWidth || 1280,
    h: Number(svg.getAttribute("height")) || svg.clientHeight || 720,
  };
}

export async function rasterize(svg: SVGSVGElement, opts: RasterOptions): Promise<HTMLCanvasElement> {
  const { w, h } = dims(svg);
  const clone = prepareClone(svg, opts.fontCss ?? "", opts.stripBg ?? false);
  const img = await loadImage(svgToDataUrl(serialize(clone)));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * opts.scale);
  canvas.height = Math.round(h * opts.scale);
  const ctx = canvas.getContext("2d")!;
  if (opts.fillBg) {
    ctx.fillStyle = opts.fillBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality),
  );
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface SavedFile {
  write: (b: Blob) => Promise<void>;
}

/**
 * Open the "save file" picker (folder + name) up-front — must be called within
 * a user gesture, BEFORE any long async work. Returns a writer, "cancelled",
 * or null when the File System Access API is unavailable (fall back to download).
 */
export async function pickSaveFile(
  suggestedName: string,
  accept: Record<string, string[]>,
): Promise<SavedFile | "cancelled" | null> {
  const picker = (
    window as unknown as {
      showSaveFilePicker?: (opts: {
        suggestedName?: string;
        types?: { accept: Record<string, string[]> }[];
      }) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;
    }
  ).showSaveFilePicker;
  if (!picker) return null;
  try {
    const handle = await picker({ suggestedName, types: [{ accept }] });
    return {
      write: async (b: Blob) => {
        const w = await handle.createWritable();
        await w.write(b);
        await w.close();
      },
    };
  } catch (e) {
    if ((e as DOMException).name === "AbortError") return "cancelled";
    return null;
  }
}

export async function exportPNG(
  svg: SVGSVGElement,
  { scale, transparent, fontCss, fileName }: { scale: number; transparent: boolean; fontCss: string; fileName: string },
): Promise<void> {
  const canvas = await rasterize(svg, { scale, stripBg: transparent, fontCss });
  downloadBlob(await toBlob(canvas, "image/png"), fileName);
}

export async function exportJPG(
  svg: SVGSVGElement,
  { scale, bgColor, fontCss, fileName }: { scale: number; bgColor: string; fontCss: string; fileName: string },
): Promise<void> {
  const canvas = await rasterize(svg, { scale, stripBg: false, fillBg: bgColor, fontCss });
  downloadBlob(await toBlob(canvas, "image/jpeg", 0.95), fileName);
}

export function exportSVGFile(
  svg: SVGSVGElement,
  { transparent, fontCss, fileName }: { transparent: boolean; fontCss: string; fileName: string },
): void {
  const clone = prepareClone(svg, fontCss, transparent);
  const blob = new Blob([serialize(clone)], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, fileName);
}

export async function copyPNGToClipboard(
  svg: SVGSVGElement,
  { scale, transparent, fontCss }: { scale: number; transparent: boolean; fontCss: string },
): Promise<void> {
  const canvas = await rasterize(svg, { scale, stripBg: transparent, fontCss });
  const blob = await toBlob(canvas, "image/png");
  // ClipboardItem may be unavailable in some browsers/contexts.
  const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  if (!CI || !navigator.clipboard?.write) {
    throw new Error("Clipboard image copy is not supported in this browser.");
  }
  await navigator.clipboard.write([new CI({ "image/png": blob })]);
}

export function getRaceSvg(): SVGSVGElement | null {
  return document.getElementById("race-svg") as SVGSVGElement | null;
}
