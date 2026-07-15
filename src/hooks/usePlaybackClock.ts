import { useEffect } from "react";
import gsap from "gsap";
import { useStudioStore } from "@/store/useStudioStore";

/**
 * Drives the playback clock using GSAP's ticker (a single shared rAF loop).
 * `advance` is a no-op while paused, so this stays cheap when idle.
 */
export function usePlaybackClock() {
  useEffect(() => {
    const tick = (_time: number, deltaMs: number) => {
      // Clamp large gaps (tab refocus) so we never jump the timeline.
      const dt = Math.min(deltaMs / 1000, 0.1);
      useStudioStore.getState().advance(dt);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
}
