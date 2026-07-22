import { useMemo } from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, area as d3area, curveMonotoneX, curveLinear } from "d3-shape";
import { useStudioStore, selectT01 } from "@/store/useStudioStore";
import { getChartTokens } from "@/theme/tokens";
import { makeColorResolver } from "@/theme/palettes";
import { makeFormatter, compactNumber, compoundNumber } from "@/utils/format";
import { formatDate } from "@/utils/period";
import { buildLineTimeMap } from "@/engine/lineTimeline";

interface Props {
  width: number;
  height: number;
}

interface Pt {
  x: number;
  y: number;
}
interface Series {
  name: string;
  category: string;
  points: Pt[]; // sorted by x
}

/** Linear interpolation of a series' value at an arbitrary x (null if out of range). */
function valueAt(points: Pt[], x: number): number | null {
  if (points.length === 0) return null;
  if (x < points[0].x || x > points[points.length - 1].x) return null;
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i].x) {
      const a = points[i - 1];
      const b = points[i];
      if (b.x === a.x) return b.y;
      return a.y + (b.y - a.y) * ((x - a.x) / (b.x - a.x));
    }
  }
  return points[points.length - 1].y;
}

/** Points of a series revealed up to headX, with an interpolated head point. */
function revealed(points: Pt[], headX: number): Pt[] {
  if (points.length === 0 || headX < points[0].x) return [];
  const out = points.filter((p) => p.x <= headX);
  const last = points[points.length - 1];
  if (headX < last.x) {
    const y = valueAt(points, headX);
    if (y !== null && (out.length === 0 || out[out.length - 1].x < headX)) {
      out.push({ x: headX, y });
    }
  }
  return out;
}

export function LineChart({ width, height }: Props) {
  const rows = useStudioStore((s) => s.rows);
  const engine = useStudioStore((s) => s.engine);
  const config = useStudioStore((s) => s.config);
  const theme = useStudioStore((s) => s.theme);
  const colorBy = useStudioStore((s) => s.colorBy);
  const duration = useStudioStore((s) => s.playback.duration);
  const t01 = useStudioStore(selectT01);

  const tokens = getChartTokens(theme);
  const canvasBg = config.canvasBg ?? tokens.canvasBg;

  const colorFor = useMemo(
    () => makeColorResolver(engine.names, engine.categories, config.paletteId, colorBy, config.barColors),
    [engine, config.paletteId, colorBy, config.barColors],
  );

  const fmtValue = useMemo(() => {
    const { numberFormat, prefix, suffix } = config;
    if (numberFormat === "compact") return (n: number) => `${prefix}${compactNumber(n)}${suffix}`;
    if (numberFormat === "compound") return (n: number) => `${prefix}${compoundNumber(n)}${suffix}`;
    return makeFormatter(numberFormat, prefix, suffix);
  }, [config.numberFormat, config.prefix, config.suffix]);

  // ---- Build series from long-format rows (cap by "No. of Bars") ---------
  const series = useMemo<Series[]>(() => {
    const names = engine.names.slice(0, Math.max(1, config.numBars));
    const byName = new Map<string, Pt[]>();
    for (const r of rows) {
      if (!names.includes(r.name)) continue;
      const arr = byName.get(r.name) ?? [];
      arr.push({ x: r.date, y: r.value });
      byName.set(r.name, arr);
    }
    return names.map((name) => ({
      name,
      category: engine.categories.get(name) ?? name,
      points: (byName.get(name) ?? []).sort((a, b) => a.x - b.x),
    })).filter((s) => s.points.length > 0);
  }, [rows, engine, config.numBars]);

  // ---- Domains (dynamic: fit to the data) --------------------------------
  const allPts = series.flatMap((s) => s.points);
  const x0 = allPts.length ? Math.min(...allPts.map((p) => p.x)) : 0;
  const x1 = allPts.length ? Math.max(...allPts.map((p) => p.x)) : 1;
  const dataYMin = allPts.length ? Math.min(...allPts.map((p) => p.y)) : 0;
  const dataYMax = allPts.length ? Math.max(...allPts.map((p) => p.y)) : 1;
  const yMin = config.lineYFromZero ? Math.min(0, dataYMin) : dataYMin;
  const yMax = dataYMax + (dataYMax - yMin) * 0.08 || 1; // small headroom

  // ---- Layout ------------------------------------------------------------
  const yTickLabelW = Math.max(38, String(compactNumber(yMax)).length * 8 + 16);
  const marginLeft = config.padLeft + yTickLabelW;
  const marginRight = config.padRight + (config.lineShowSeriesLabel ? 78 : 20);
  const marginTop = config.padTop + (config.showHeader ? config.headerFontSize + 16 : 12);
  const marginBottom = config.padBottom + (config.showXAxis ? 32 : 10);

  const plotLeft = marginLeft;
  const plotTop = marginTop;
  const plotWidth = Math.max(10, width - marginLeft - marginRight);
  const plotHeight = Math.max(10, height - marginTop - marginBottom);

  const x = scaleLinear().domain([x0, x1]).range([plotLeft, plotLeft + plotWidth]);
  const y = scaleLinear().domain([yMin, yMax]).range([plotTop + plotHeight, plotTop]);
  const xTicks = x.ticks(Math.min(10, Math.max(2, Math.round(plotWidth / 90))));
  const yTicks = y.ticks(5);
  const baseY = y(yMin);

  // ---- Head position (with freeze/holds) ---------------------------------
  const holdDates = useMemo(() => {
    if (!config.lineHoldEnabled) return [];
    return [...new Set(rows.map((r) => Math.round(r.date)))].filter((d) => d > x0 && d < x1);
  }, [config.lineHoldEnabled, rows, x0, x1]);
  const timeMap = useMemo(
    () => buildLineTimeMap(x0, x1, holdDates, duration > 0 ? config.lineHoldSeconds / duration : 0),
    [x0, x1, holdDates, config.lineHoldSeconds, duration],
  );
  const headX = timeMap(t01);

  const curve = config.lineCurve === "smooth" ? curveMonotoneX : curveLinear;
  const dashArray = config.lineDash === "dotted" ? `1 ${config.lineWidth * 2.2}` : undefined;

  const lineGen = d3line<Pt>().x((p) => x(p.x)).y((p) => y(p.y)).curve(curve);
  const areaGen = d3area<Pt>().x((p) => x(p.x)).y0(baseY).y1((p) => y(p.y)).curve(curve);

  return (
    <svg
      id="race-svg"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", fontFamily: `${config.fontFamily}, sans-serif` }}
    >
      <defs>
        {series.map((s, i) => {
          const color = colorFor(s.name, s.category);
          return (
            <linearGradient key={s.name} id={`area-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={config.lineAreaOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          );
        })}
      </defs>

      {/* Canvas background (stripped for transparent exports) */}
      <rect data-role="canvas-bg" x={0} y={0} width={width} height={height} fill={canvasBg} />

      {/* Gridlines + Y axis labels */}
      {config.showGridlines &&
        yTicks.map((t) => (
          <line
            key={`gy-${t}`}
            x1={plotLeft}
            x2={plotLeft + plotWidth}
            y1={y(t)}
            y2={y(t)}
            stroke={tokens.grid}
            strokeWidth={1}
          />
        ))}
      {config.showXAxis &&
        yTicks.map((t) => (
          <text
            key={`yl-${t}`}
            x={plotLeft - 10}
            y={y(t)}
            textAnchor="end"
            dominantBaseline="central"
            fill={tokens.subtle}
            style={{ fontSize: 12 }}
          >
            {compactNumber(t)}
          </text>
        ))}

      {/* Big faded date counter */}
      {config.showDateCounter && (
        <text
          x={plotLeft + plotWidth - 8}
          y={plotTop + plotHeight - 6}
          data-role="counter"
          textAnchor="end"
          fill={config.dateCounterColor ?? tokens.text}
          opacity={config.dateCounterOpacity}
          style={{
            fontFamily: "Oswald, sans-serif",
            fontSize: Math.min(plotHeight * config.dateCounterScale, plotWidth * 0.6),
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {formatDate(headX, config.dateFormat)}
        </text>
      )}

      {/* Series */}
      {series.map((s, si) => {
        const pts = revealed(s.points, headX);
        if (pts.length === 0) return null;
        const color = colorFor(s.name, s.category);
        const head = pts[pts.length - 1];
        const lastRealX = s.points[s.points.length - 1].x;
        // Real data markers exclude the interpolated head (added when mid-segment).
        const realPts = headX < lastRealX ? pts.slice(0, -1) : pts;
        const rising = pts.length >= 2 ? head.y >= pts[pts.length - 2].y : true;
        const headColor = config.lineGrowthColor
          ? rising ? config.lineGrowthUpColor : config.lineGrowthDownColor
          : color;

        return (
          <g key={s.name}>
            {/* Area gradient under the line */}
            {config.lineArea && pts.length >= 2 && (
              <path d={areaGen(pts) ?? undefined} fill={`url(#area-${si})`} stroke="none" />
            )}

            {/* The line — single path, or per-segment coloured by direction */}
            {config.lineGrowthColor
              ? pts.slice(1).map((p, i) => {
                  const prev = pts[i];
                  const up = p.y >= prev.y;
                  return (
                    <line
                      key={i}
                      x1={x(prev.x)}
                      y1={y(prev.y)}
                      x2={x(p.x)}
                      y2={y(p.y)}
                      stroke={up ? config.lineGrowthUpColor : config.lineGrowthDownColor}
                      strokeWidth={config.lineWidth}
                      strokeLinecap="round"
                      strokeDasharray={dashArray}
                    />
                  );
                })
              : pts.length >= 2 && (
                  <path
                    d={lineGen(pts) ?? undefined}
                    fill="none"
                    stroke={color}
                    strokeWidth={config.lineWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={dashArray}
                  />
                )}

            {/* Markers at each revealed real data point */}
            {config.lineShowPoints &&
              realPts.map((p, i) => (
                <circle
                  key={i}
                  cx={x(p.x)}
                  cy={y(p.y)}
                  r={config.lineWidth * 0.9}
                  fill={canvasBg}
                  stroke={color}
                  strokeWidth={config.lineWidth * 0.6}
                />
              ))}

            {/* Moving head marker */}
            <circle cx={x(head.x)} cy={y(head.y)} r={config.lineWidth * 1.25} fill={headColor} stroke={canvasBg} strokeWidth={config.lineWidth * 0.5} />

            {/* Head value label */}
            {config.lineShowHeadValue && (
              <text
                x={x(head.x) + 10}
                y={y(head.y) - 10}
                fill={headColor}
                style={{ fontSize: config.labelFontSize, fontWeight: 700 }}
              >
                {fmtValue(head.y)}
              </text>
            )}

            {/* Series-name pill at the head */}
            {config.lineShowSeriesLabel && (
              <text
                x={x(head.x) + 12}
                y={y(head.y) + (config.lineShowHeadValue ? 12 : 4)}
                fill={color}
                style={{ fontSize: config.labelFontSize, fontWeight: 600 }}
              >
                {s.name}
              </text>
            )}
          </g>
        );
      })}

      {/* X axis */}
      {config.showXAxis && (
        <g>
          <line
            x1={plotLeft}
            x2={plotLeft + plotWidth}
            y1={plotTop + plotHeight}
            y2={plotTop + plotHeight}
            stroke={tokens.axis}
            strokeWidth={1}
          />
          {xTicks.map((t) => (
            <text
              key={`xt-${t}`}
              x={x(t)}
              y={plotTop + plotHeight + 20}
              textAnchor="middle"
              fill={tokens.subtle}
              style={{ fontSize: 12 }}
            >
              {formatDate(t, config.dateFormat)}
            </text>
          ))}
        </g>
      )}

      {/* Header */}
      {config.showHeader && config.header && (
        <text
          x={config.headerAlign === "left" ? plotLeft : config.headerAlign === "right" ? plotLeft + plotWidth : plotLeft + plotWidth / 2}
          y={config.padTop}
          textAnchor={config.headerAlign === "left" ? "start" : config.headerAlign === "right" ? "end" : "middle"}
          dominantBaseline="hanging"
          fill={tokens.text}
          style={{ fontSize: config.headerFontSize, fontWeight: 700 }}
        >
          {config.header}
        </text>
      )}
    </svg>
  );
}
