import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";

const PORT = 5173;

/**
 * Dev-only "one-click render" endpoint. The app POSTs the current chart to
 * /api/render; we run the same offline renderer (scripts/render.mjs → FFmpeg),
 * stream progress back, save the file under renders/, and open the folder.
 * This removes the manual "save config → run npm run export" steps.
 */
function renderServerPlugin(): PluginOption {
  return {
    name: "offline-render-endpoint",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/render", (req: IncomingMessage, res: ServerResponse) => {
        // Health check: the app pings GET to decide if one-click is available.
        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }

        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          let payload: { snapshot?: unknown; format?: string; fps?: number; height?: number };
          try {
            payload = JSON.parse(body);
          } catch {
            res.statusCode = 400;
            res.end("__ERROR__ bad request body");
            return;
          }
          const format = (payload.format || "mp4").toLowerCase();
          const fps = Number(payload.fps) || 30;
          const height = Number(payload.height) || 1080;
          const ext = format === "png" ? "" : `.${format}`;

          const root = process.cwd();
          const rendersDir = join(root, "renders");
          mkdirSync(rendersDir, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
          const outPath = join(rendersDir, `chart-race-${stamp}${ext}`);

          // Stash the snapshot the renderer will load.
          const cfgPath = join(tmpdir(), `chart-render-${Date.now()}.json`);
          writeFileSync(cfgPath, JSON.stringify(payload.snapshot ?? {}));

          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache");

          const child = spawn(
            process.execPath,
            [
              join("scripts", "render.mjs"),
              "--config", cfgPath,
              "--format", format,
              "--fps", String(fps),
              "--height", String(height),
              "--url", `http://${req.headers.host || `127.0.0.1:${PORT}`}/`,
              "--out", outPath,
            ],
            { cwd: root },
          );
          let finished = false;
          child.stdout.on("data", (d) => res.write(d));
          child.stderr.on("data", (d) => res.write(d));
          child.on("error", (e) => {
            finished = true;
            res.write(`\n__ERROR__ ${e.message}`);
            res.end();
          });
          child.on("close", (code) => {
            finished = true;
            if (code === 0) {
              res.write(`\n__DONE__ ${outPath}`);
              openFolder(outPath);
            } else {
              res.write(`\n__ERROR__ renderer exited with code ${code}`);
            }
            res.end();
          });
          // If the app cancels (client disconnects before we finish), stop the render.
          res.on("close", () => {
            if (!finished && !child.killed) child.kill();
          });
        });
      });
    },
  };
}

/** Reveal the finished file in the OS file manager. */
function openFolder(filePath: string): void {
  try {
    if (process.platform === "win32") spawn("explorer", [`/select,${filePath}`]);
    else if (process.platform === "darwin") spawn("open", ["-R", filePath]);
    else spawn("xdg-open", [join(filePath, "..")]);
  } catch {
    /* best-effort */
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), renderServerPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: PORT,
    open: false,
  },
  build: {
    // Flags are intentionally inlined as data URIs (self-contained export).
    chunkSizeWarningLimit: 700,
  },
});
