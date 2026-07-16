/**
 * Video export: render the race frame-by-frame to a canvas and capture it with
 * MediaRecorder. Uses captureStream(0) + track.requestFrame() so recording is
 * deterministic (not tied to wall-clock), regardless of rasterization speed.
 * Produces WebM (VP9/VP8). MP4/GIF would need FFmpeg.wasm — a later step.
 */

import { rasterize } from "./exportImage";

export interface VideoProgress {
  frame: number;
  total: number;
}

export interface RecordOptions {
  fps: number;
  scale: number;
  duration: number;
  fillBg: string;
  fontCss: string;
  /** Target video bitrate in bits/sec (higher = cleaner for re-editing). */
  bitrate: number;
  seek: (t01: number) => void;
  onProgress?: (p: VideoProgress) => void;
  signal?: AbortSignal;
}

interface FrameTrack extends MediaStreamTrack {
  requestFrame?: () => void;
}

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

function doubleRaf(): Promise<void> {
  return new Promise((res) =>
    requestAnimationFrame(() => requestAnimationFrame(() => res())),
  );
}

export async function recordWebM(svg: SVGSVGElement, opts: RecordOptions): Promise<Blob> {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error("WebM recording is not supported in this browser.");

  const w = Number(svg.getAttribute("width")) || 1280;
  const h = Number(svg.getAttribute("height")) || 720;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * opts.scale);
  canvas.height = Math.round(h * opts.scale);
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as FrameTrack;

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: opts.bitrate });
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

  const total = Math.max(2, Math.round(opts.fps * opts.duration));
  const stopped = new Promise<void>((res) => (recorder.onstop = () => res()));
  recorder.start();

  try {
    for (let i = 0; i < total; i++) {
      if (opts.signal?.aborted) throw new DOMException("Export cancelled", "AbortError");

      opts.seek(total === 1 ? 0 : i / (total - 1));
      await doubleRaf(); // let React repaint the SVG at this time

      const frame = await rasterize(svg, {
        scale: opts.scale,
        fillBg: opts.fillBg,
        fontCss: opts.fontCss,
      });
      ctx.drawImage(frame, 0, 0);
      track.requestFrame?.();
      opts.onProgress?.({ frame: i + 1, total });
    }
  } finally {
    // Flush the last frame before stopping.
    await new Promise((r) => setTimeout(r, 120));
    if (recorder.state !== "inactive") recorder.stop();
  }

  await stopped;
  return new Blob(chunks, { type: mimeType });
}
