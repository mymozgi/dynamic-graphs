import { useStudioStore } from "@/store/useStudioStore";
import { getAspect } from "@/constants/aspects";
import { useElementSize } from "@/hooks/useElementSize";
import { BarChartRace } from "@/components/chart/BarChartRace";

const PADDING = 28;

/** Fits a chart canvas of the chosen aspect ratio inside the available area. */
export function CanvasStage() {
  const aspectId = useStudioStore((s) => s.aspectId);
  const config = useStudioStore((s) => s.config);
  const theme = useStudioStore((s) => s.theme);
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();

  const ratio = getAspect(aspectId).ratio;
  const availW = Math.max(0, width - PADDING * 2);
  const availH = Math.max(0, height - PADDING * 2);

  // Contain: largest w×h with the target ratio that fits the available box.
  let canvasW = availW;
  let canvasH = canvasW / ratio;
  if (canvasH > availH) {
    canvasH = availH;
    canvasW = canvasH * ratio;
  }

  const bg = config.canvasBg ?? (theme === "dark" ? "#0b0f14" : "#ffffff");

  return (
    <div className="canvas-stage" ref={ref}>
      {width > 0 && (
        <div
          className="canvas-frame"
          style={{ width: canvasW, height: canvasH, background: bg }}
        >
          <BarChartRace width={Math.round(canvasW)} height={Math.round(canvasH)} />
        </div>
      )}
    </div>
  );
}
