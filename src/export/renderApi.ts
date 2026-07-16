/**
 * Dev-only bridge for the offline renderer (scripts/render.mjs).
 * Exposes `window.__render` so a headless browser can load a saved snapshot
 * and pull each frame as a PNG data URL at an exact scale — reusing the same
 * rasterize path (embedded fonts + inline flags) as the in-app image export.
 */

import { useStudioStore, type StudioSnapshot } from "@/store/useStudioStore";
import { getRaceSvg, rasterize } from "./exportImage";
import { buildEmbeddedFontCss } from "./fontEmbed";

const doubleRaf = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export function installRenderApi() {
  Object.assign(window as unknown as Record<string, unknown>, {
    __render: {
      async applySnapshot(snap: StudioSnapshot) {
        useStudioStore.getState().loadState(snap);
        useStudioStore.getState().pause();
        await doubleRaf();
      },
      dims() {
        const svg = getRaceSvg();
        return {
          width: Number(svg?.getAttribute("width")) || 0,
          height: Number(svg?.getAttribute("height")) || 0,
        };
      },
      fontCss() {
        return buildEmbeddedFontCss(useStudioStore.getState().config.fontFamily);
      },
      async frame(t01: number, scale: number, fontCss: string) {
        useStudioStore.getState().seek01(t01);
        await doubleRaf();
        const svg = getRaceSvg();
        if (!svg) throw new Error("chart svg not found");
        const canvas = await rasterize(svg, { scale, fontCss });
        return canvas.toDataURL("image/png");
      },
    },
  });
}
