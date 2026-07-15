import type { AspectPreset } from "@/engine/types";

export const ASPECT_PRESETS: AspectPreset[] = [
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "21:9", label: "21:9", ratio: 21 / 9 },
];

export function getAspect(id: string): AspectPreset {
  return ASPECT_PRESETS.find((a) => a.id === id) ?? ASPECT_PRESETS[0];
}
