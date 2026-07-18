import { useEffect, useRef, useState } from "react";
import { useStudioStore } from "@/store/useStudioStore";
import { Section } from "@/components/ui/Section";
import { Field, Segmented, Select, Toggle } from "@/components/ui/controls";
import { buildEmbeddedFontCss } from "@/export/fontEmbed";
import {
  copyPNGToClipboard,
  downloadBlob,
  pickSaveFile,
  exportJPG,
  exportPNG,
  exportSVGFile,
  getRaceSvg,
} from "@/export/exportImage";
import { pickMimeType, recordWebM } from "@/export/exportVideo";
import { getAspect } from "@/constants/aspects";
import { getStudioSnapshot } from "@/store/useStudioStore";

type ImgFormat = "png" | "jpg" | "svg";

export function ExportSection() {
  const config = useStudioStore((s) => s.config);
  const theme = useStudioStore((s) => s.theme);
  const duration = useStudioStore((s) => s.playback.duration);
  const pause = useStudioStore((s) => s.pause);
  const seek01 = useStudioStore((s) => s.seek01);
  const aspectId = useStudioStore((s) => s.aspectId);
  const loadState = useStudioStore((s) => s.loadState);
  const configFileRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<ImgFormat>("png");
  const [scale, setScale] = useState(2);
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok?: boolean } | null>(null);

  const [fps, setFps] = useState(30);
  const [videoHeight, setVideoHeight] = useState(1080); // target export height (px)
  const [bpp, setBpp] = useState(0.15); // bits per pixel per frame (quality tier)
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // One-click offline render (dev server does the FFmpeg work — see vite.config).
  const [serverAvailable, setServerAvailable] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const [serverPct, setServerPct] = useState(0);
  const serverAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/render", { method: "GET" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setServerAvailable(!!j.ok))
      .catch(() => setServerAvailable(false));
  }, []);

  const bgColor = config.canvasBg ?? (theme === "dark" ? "#0b0f14" : "#ffffff");
  const allowTransparent = format !== "jpg";
  const useTransparent = allowTransparent && transparent;

  const outW = Math.round(videoHeight * getAspect(aspectId).ratio);
  const estMbps = Math.min(80, Math.round((outW * videoHeight * fps * bpp) / 1e6));
  const videoSummary = `${outW}×${videoHeight} · ${fps} fps · ~${estMbps} Mbps`;

  async function handleDownload() {
    const svg = getRaceSvg();
    if (!svg) return setStatus({ msg: "Chart not ready" });
    setBusy(true);
    setStatus({ msg: "Embedding fonts…" });
    try {
      const fontCss = await buildEmbeddedFontCss(config.fontFamily);
      if (format === "png") {
        await exportPNG(svg, { scale, transparent: useTransparent, fontCss, fileName: "chart-race.png" });
      } else if (format === "jpg") {
        await exportJPG(svg, { scale, bgColor, fontCss, fileName: "chart-race.jpg" });
      } else {
        exportSVGFile(svg, { transparent: useTransparent, fontCss, fileName: "chart-race.svg" });
      }
      setStatus({ msg: "Downloaded ✓", ok: true });
    } catch (e) {
      console.error(e);
      setStatus({ msg: "Export failed — see console" });
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    const svg = getRaceSvg();
    if (!svg) return;
    setBusy(true);
    setStatus({ msg: "Copying…" });
    try {
      const fontCss = await buildEmbeddedFontCss(config.fontFamily);
      await copyPNGToClipboard(svg, { scale, transparent: useTransparent, fontCss });
      setStatus({ msg: "Copied to clipboard ✓", ok: true });
    } catch (e) {
      console.error(e);
      setStatus({ msg: (e as Error).message || "Copy failed" });
    } finally {
      setBusy(false);
    }
  }

  async function handleRecord() {
    const svg = getRaceSvg();
    if (!svg) return;
    if (!pickMimeType()) return setStatus({ msg: "WebM not supported in this browser" });

    // Ask WHERE to save first — the folder picker needs a fresh user gesture,
    // and recording takes a while (would be too late to ask afterwards).
    const target = await pickSaveFile("chart-race.webm", { "video/webm": [".webm"] });
    if (target === "cancelled") return setStatus({ msg: "Cancelled" });

    pause();
    const ac = new AbortController();
    abortRef.current = ac;
    setRecording(true);
    setProgress(0);
    setStatus({ msg: "Rendering video…" });
    try {
      const fontCss = await buildEmbeddedFontCss(config.fontFamily);
      // Scale the canvas so the output reaches the chosen height (e.g. 4K).
      const canvasW = Number(svg.getAttribute("width")) || 1280;
      const canvasH = Number(svg.getAttribute("height")) || 720;
      const scale = Math.max(0.5, Math.min(8, videoHeight / canvasH));
      const pixels = canvasW * scale * canvasH * scale;
      const bitrate = Math.min(80_000_000, Math.round(pixels * fps * bpp));
      const blob = await recordWebM(svg, {
        fps,
        scale,
        duration,
        fillBg: bgColor,
        fontCss,
        bitrate,
        seek: (t) => seek01(t),
        onProgress: ({ frame, total }) => setProgress(frame / total),
        signal: ac.signal,
      });
      if (target) {
        await target.write(blob);
        setStatus({ msg: "Video saved ✓", ok: true });
      } else {
        downloadBlob(blob, "chart-race.webm");
        setStatus({ msg: "Video downloaded ✓", ok: true });
      }
    } catch (e) {
      if ((e as DOMException).name === "AbortError") setStatus({ msg: "Cancelled" });
      else {
        console.error(e);
        setStatus({ msg: "Video export failed — see console" });
      }
    } finally {
      setRecording(false);
      abortRef.current = null;
      seek01(0);
    }
  }

  async function handleServerRender() {
    setServerBusy(true);
    setServerPct(0);
    setStatus({ msg: "Starting render…" });
    const ac = new AbortController();
    serverAbort.current = ac;
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: getStudioSnapshot(), format: "mp4", fps, height: videoHeight }),
        signal: ac.signal,
      });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let donePath: string | null = null;
      let errMsg: string | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        if (buf.length > 6000) buf = buf.slice(-6000); // markers + progress stay at the tail
        const di = buf.indexOf("__DONE__");
        const ei = buf.indexOf("__ERROR__");
        if (di >= 0) {
          donePath = buf.slice(di + 8).trim();
          break;
        }
        if (ei >= 0) {
          errMsg = buf.slice(ei + 9).trim();
          break;
        }
        const m = buf.match(/(\d+)\/(\d+) \((\d+)%\)[^\r\n]*/g);
        if (m) {
          const last = m[m.length - 1].trim();
          setServerPct((Number(last.match(/\((\d+)%\)/)?.[1] ?? 0)) / 100);
          setStatus({ msg: `Rendering… ${last}` });
        }
      }
      if (errMsg) setStatus({ msg: "Render failed: " + errMsg.split(/[\r\n]/)[0].slice(0, 160) });
      else if (donePath) setStatus({ msg: `Saved ✓ — opened the folder\n${donePath}`, ok: true });
      else setStatus({ msg: "Render finished.", ok: true });
    } catch (e) {
      if ((e as DOMException).name === "AbortError") setStatus({ msg: "Cancelled" });
      else setStatus({ msg: "Render server not reachable — is `npm run dev` running?" });
    } finally {
      setServerBusy(false);
      serverAbort.current = null;
    }
  }

  function handleExportConfig() {
    const blob = new Blob([JSON.stringify(getStudioSnapshot(), null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, "chart-config.json");
    setStatus({ msg: "Config saved — now run: npm run export", ok: true });
  }

  async function handleLoadConfig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const s = JSON.parse(await file.text());
      if (!Array.isArray(s.rows) || s.rows.length === 0 || !s.config) throw new Error("bad");
      loadState({
        version: 1,
        rows: s.rows,
        config: s.config,
        easing: s.easing ?? "linear",
        colorBy: s.colorBy ?? "name",
        theme: s.theme ?? "dark",
        aspectId: s.aspectId ?? "16:9",
        duration: s.duration ?? 12,
      });
      setStatus({ msg: "Config loaded ✓", ok: true });
    } catch {
      setStatus({ msg: "Not a valid chart config file" });
    }
  }

  return (
    <Section title="Export" defaultOpen>
      <Field label="Format">
        <Segmented<ImgFormat>
          value={format}
          onChange={setFormat}
          options={[
            { value: "png", label: "PNG" },
            { value: "jpg", label: "JPG" },
            { value: "svg", label: "SVG" },
          ]}
        />
      </Field>

      <Field label="Resolution">
        <Segmented<string>
          value={String(scale)}
          onChange={(v) => setScale(Number(v))}
          options={[
            { value: "1", label: "1×" },
            { value: "2", label: "2×", title: "≈ HD" },
            { value: "4", label: "4×", title: "≈ 4K" },
          ]}
        />
      </Field>

      {allowTransparent && (
        <Field label="Transparent BG">
          <Toggle checked={transparent} onChange={setTransparent} />
        </Field>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={handleDownload} disabled={busy || recording}>
          Download
        </button>
        <button type="button" className="btn" onClick={handleCopy} disabled={busy || recording || format === "svg"}>
          Copy PNG
        </button>
      </div>

      <div className="export-divider" />
      <div className="export-subhead">Video · WebM (in-browser)</div>
      <p className="export-status">Saves to a folder you choose. Best for short clips.</p>

      <Field label="Frame rate">
        <Select<string>
          value={String(fps)}
          onChange={(v) => setFps(Number(v))}
          options={[
            { value: "24", label: "24 fps" },
            { value: "30", label: "30 fps" },
            { value: "60", label: "60 fps" },
            { value: "120", label: "120 fps" },
          ]}
        />
      </Field>
      <Field label="Resolution" stack>
        <Segmented<string>
          full
          value={String(videoHeight)}
          onChange={(v) => setVideoHeight(Number(v))}
          options={[
            { value: "720", label: "720p" },
            { value: "1080", label: "1080p" },
            { value: "1440", label: "2K" },
            { value: "2160", label: "4K" },
          ]}
        />
      </Field>
      <Field label="Bitrate" hint="Higher = cleaner source for editing">
        <Segmented<string>
          value={String(bpp)}
          onChange={(v) => setBpp(Number(v))}
          options={[
            { value: "0.08", label: "Std" },
            { value: "0.15", label: "High" },
            { value: "0.3", label: "Max" },
          ]}
        />
      </Field>
      <div className="export-status">{videoSummary}</div>

      {recording ? (
        <>
          <div className="progress">
            <div className="progress__bar" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
              Cancel ({Math.round(progress * 100)}%)
            </button>
          </div>
        </>
      ) : (
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={handleRecord} disabled={busy}>
            Render & save ({duration}s)
          </button>
        </div>
      )}

      <div className="export-divider" />
      <div className="export-subhead">Offline render · MP4 near-lossless · any length</div>

      {serverAvailable ? (
        <>
          <p className="export-status">
            One click: renders on your machine via FFmpeg (no browser limits),
            saves to the <code>renders</code> folder and opens it. Near-lossless
            (CRF 16) — handles 10–20 min at full quality. Uses the resolution and
            frame rate set above.
          </p>
          {serverBusy ? (
            <>
              <div className="progress">
                <div className="progress__bar" style={{ width: `${Math.round(serverPct * 100)}%` }} />
              </div>
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => serverAbort.current?.abort()}>
                  Cancel ({Math.round(serverPct * 100)}%)
                </button>
              </div>
            </>
          ) : (
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleServerRender}
                disabled={busy || recording}
              >
                Render MP4 → folder ({duration}s)
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="export-status">
          For a one-click MP4 render, run <code>npm run dev</code>. Otherwise save
          this config and run <code>npm run export</code> in a terminal.
        </p>
      )}

      <div className="export-divider" />
      <div className="export-subhead">Backup / move project</div>
      <div className="btn-row">
        <button type="button" className="btn" onClick={handleExportConfig}>
          Save config
        </button>
        <button type="button" className="btn" onClick={() => configFileRef.current?.click()}>
          Load config
        </button>
        <input
          ref={configFileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleLoadConfig}
        />
      </div>
      <p className="export-status">
        Your work auto-saves in this browser — reloading restores it. Save/Load config
        to back it up or move between projects.
      </p>

      {status && <div className={`export-status ${status.ok ? "is-ok" : ""}`}>{status.msg}</div>}
    </Section>
  );
}
