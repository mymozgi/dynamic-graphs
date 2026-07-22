/**
 * Timeline mapping for the line chart's moving head.
 *
 * Maps normalized playback time (0..1) to a data-X position. When "hold" dates
 * are supplied, the mapping inserts a flat dwell at each of them so the drawing
 * head pauses there for a moment ("director's camera") before continuing.
 *
 * The total dwell is capped so motion always keeps at least 10% of the
 * timeline, no matter how many/long the holds are.
 */
export function buildLineTimeMap(
  x0: number,
  x1: number,
  holdDates: number[],
  dwellFracEach: number,
): (t01: number) => number {
  if (!(x1 > x0)) return () => x0;

  const holds = holdDates
    .filter((d) => d > x0 && d < x1)
    .sort((a, b) => a - b);

  const totalDwell = Math.min(0.9, Math.max(0, holds.length * dwellFracEach));
  const dwell = holds.length > 0 ? totalDwell / holds.length : 0;
  const motion = 1 - totalDwell;
  const span = x1 - x0;

  // Piecewise-linear breakpoints: [time01, dataX]. Each hold adds an "arrive"
  // point and a "depart" point at the same X (the flat dwell segment).
  const bp: [number, number][] = [[0, x0]];
  holds.forEach((xh, i) => {
    const u = (xh - x0) / span;
    const tArrive = u * motion + i * dwell;
    bp.push([tArrive, xh]);
    bp.push([tArrive + dwell, xh]);
  });
  bp.push([1, x1]);

  return (t01: number) => {
    const t = Math.min(1, Math.max(0, t01));
    for (let i = 1; i < bp.length; i++) {
      const [tA, xA] = bp[i - 1];
      const [tB, xB] = bp[i];
      if (t <= tB) {
        if (tB <= tA) return xB;
        return xA + (xB - xA) * ((t - tA) / (tB - tA));
      }
    }
    return x1;
  };
}
