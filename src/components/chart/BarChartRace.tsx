import { useMemo } from "react";
import { scaleLinear } from "d3-scale";
import { useStudioStore, selectT01 } from "@/store/useStudioStore";
import { getChartTokens } from "@/theme/tokens";
import { makeColorResolver } from "@/theme/palettes";
import { makeFormatter, compactNumber, compoundNumber } from "@/utils/format";
import { formatDate } from "@/utils/period";
import { resolveIso } from "@/data/countries";
import { getFlagDataUri } from "@/data/flagRegistry";

interface Props {
  width: number;
  height: number;
}

export function BarChartRace({ width, height }: Props) {
  const engine = useStudioStore((s) => s.engine);
  const config = useStudioStore((s) => s.config);
  const theme = useStudioStore((s) => s.theme);
  const colorBy = useStudioStore((s) => s.colorBy);
  const t01 = useStudioStore(selectT01);

  const tokens = getChartTokens(theme);
  const canvasBg = config.canvasBg ?? tokens.canvasBg;

  const frame = useMemo(() => engine.sample(t01), [engine, t01]);

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

  // ---- Layout ----------------------------------------------------------
  const longestName = useMemo(
    () => engine.names.reduce((m, n) => Math.max(m, n.length), 0),
    [engine.names],
  );
  const contentLeft = config.showEntityLabels
    ? Math.min(210, 20 + longestName * config.labelFontSize * 0.6)
    : 8;
  const marginLeft = config.padLeft + contentLeft;
  const marginTop = config.padTop + (config.showHeader ? config.headerFontSize + 16 : 8);
  const marginBottom = config.padBottom + (config.showXAxis ? 34 : 8);

  const plotTop = marginTop;
  const plotHeight = Math.max(10, height - marginTop - marginBottom);

  const n = Math.min(config.numBars, engine.names.length);
  const band = plotHeight / n;
  const barHeight = band * (1 - config.barPadding);
  const flagH = Math.min(barHeight * config.flagScale, barHeight);
  const flagW = flagH * 1.35;
  const iconOutside = config.flagPosition === "outside";
  const pIn = config.paddingInside; // content inset inside a bar
  const pOut = config.paddingOutside; // gap from bar end to outside content

  // Right margin adapts to the widest value label (using the *global* max so
  // it stays stable during playback) plus any outside icon.
  const outsideLabel = config.showDataLabels && config.labelPosition === "outside";
  let contentRight = outsideLabel
    ? fmtValue(engine.globalMax).length * config.labelFontSize * 0.62 + pOut + 6
    : 18;
  if (config.showFlags && iconOutside) contentRight += flagW + pOut;
  const marginRight = config.padRight + contentRight;

  const plotLeft = marginLeft;
  const plotWidth = Math.max(10, width - marginLeft - marginRight);

  const x = scaleLinear().domain([0, frame.maxValue]).range([0, plotWidth]);
  const totalNames = engine.names.length;
  const ticks = x.ticks(6);

  // Header horizontal position
  const headerX =
    config.headerAlign === "left"
      ? plotLeft
      : config.headerAlign === "right"
        ? plotLeft + plotWidth
        : plotLeft + plotWidth / 2;
  const headerAnchor =
    config.headerAlign === "left" ? "start" : config.headerAlign === "right" ? "end" : "middle";

  // Date counter
  const counterSize = Math.min(plotHeight * config.dateCounterScale, plotWidth * 0.6);
  const counterFill = config.dateCounterColor ?? tokens.text;

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
        <clipPath id="plot-clip">
          <rect x={0} y={plotTop} width={width} height={plotHeight} />
        </clipPath>
        <clipPath id="flag-clip">
          <rect x={0} y={0} width={flagW} height={flagH} rx={2.5} />
        </clipPath>
      </defs>

      {/* Canvas background (stripped for transparent exports) */}
      <rect data-role="canvas-bg" x={0} y={0} width={width} height={height} fill={canvasBg} />

      {/* Gridlines */}
      {config.showGridlines &&
        ticks.map((t) => (
          <line
            key={`grid-${t}`}
            x1={plotLeft + x(t)}
            x2={plotLeft + x(t)}
            y1={plotTop}
            y2={plotTop + plotHeight}
            stroke={tokens.grid}
            strokeWidth={1}
          />
        ))}

      {/* Date counter (big, faded, bottom-right of plot) */}
      {config.showDateCounter && (
        <text
          x={plotLeft + plotWidth - 8}
          y={plotTop + plotHeight - 6}
          data-role="counter"
          textAnchor="end"
          fill={counterFill}
          opacity={config.dateCounterOpacity}
          style={{
            fontFamily: "Oswald, sans-serif",
            fontSize: counterSize,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {formatDate(frame.dateValue, config.dateFormat)}
        </text>
      )}

      {/* Bars + labels (vertically clipped to the plot) */}
      <g clipPath="url(#plot-clip)">
        {frame.entries.map((e) => {
          const effRank = config.sort === "ascending" ? totalNames - 1 - e.rank : e.rank;
          if (effRank >= n + 0.5) return null;

          const barW = Math.max(0, x(e.value));
          const barEnd = plotLeft + barW;
          const yTop = plotTop + effRank * band + (band - barHeight) / 2;
          const yMid = yTop + barHeight / 2;
          const opacity = config.barOpacity * Math.max(0, Math.min(1, n - effRank));
          const color = colorFor(e.name, e.category);

          const customImg = config.barImages[e.name];
          const iconUri = config.showFlags
            ? (customImg ?? getFlagDataUri(resolveIso(e.name)))
            : null;
          const flagVisible = !!iconUri && (iconOutside || barW > flagW + pIn + 3);
          // Inside icon alignment: left / center / right within the bar.
          let flagX: number;
          if (iconOutside) {
            flagX = barEnd + pOut;
          } else if (config.iconAlign === "left") {
            flagX = plotLeft + pIn;
          } else if (config.iconAlign === "center") {
            flagX = plotLeft + barW / 2 - flagW / 2;
          } else {
            flagX = barEnd - flagW - pIn;
          }
          flagX = Math.max(plotLeft + 3, flagX);
          const iconAtEnd = !iconOutside && flagVisible && config.iconAlign === "right";

          // Value label placement — kept clear of an end-aligned flag, and
          // auto-flipped outside when the bar is too short to hold the text.
          const labelText = fmtValue(e.value);
          const estTextW = labelText.length * config.labelFontSize * 0.6;
          const insideFlagW = iconAtEnd ? flagW + pIn : 0;
          const fitsInside = estTextW <= barW - pIn * 2 - insideFlagW;
          const placeOutside = config.labelPosition === "outside" || !fitsInside;

          let valueX: number;
          let valueAnchor: "start" | "end" | "middle" = "start";
          let valueFill = tokens.text;
          if (placeOutside) {
            valueX = iconOutside && flagVisible ? flagX + flagW + pOut : barEnd + pOut;
          } else if (config.labelPosition === "right") {
            valueAnchor = "end";
            valueFill = tokens.labelInside;
            valueX = iconAtEnd ? flagX - pIn : barEnd - pIn;
          } else if (config.labelPosition === "middle") {
            valueAnchor = "middle";
            valueFill = tokens.labelInside;
            valueX = plotLeft + barW / 2;
          } else {
            // left
            valueFill = tokens.labelInside;
            valueX = plotLeft + pIn;
          }

          return (
            <g key={e.name} data-name={e.name} opacity={opacity}>
              <rect
                x={plotLeft}
                y={yTop}
                width={barW}
                height={barHeight}
                rx={Math.min(config.barCornerRadius, barHeight / 2)}
                fill={color}
              />

              {/* Entity name (left of the bar) */}
              {config.showEntityLabels && (
                <text
                  x={plotLeft - 10}
                  y={yMid}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={tokens.text}
                  style={{ fontSize: config.labelFontSize, fontWeight: 600 }}
                >
                  {e.name}
                </text>
              )}

              {/* Flag (inline data-URI image, export-safe) */}
              {flagVisible && (
                <g transform={`translate(${flagX}, ${yMid - flagH / 2})`}>
                  <image
                    href={iconUri!}
                    width={flagW}
                    height={flagH}
                    clipPath="url(#flag-clip)"
                    preserveAspectRatio={customImg ? "xMidYMid meet" : "xMidYMid slice"}
                  />
                  {config.iconBorder && (
                    <rect
                      width={flagW}
                      height={flagH}
                      rx={2.5}
                      fill="none"
                      stroke="rgba(0,0,0,0.18)"
                      strokeWidth={1}
                    />
                  )}
                </g>
              )}

              {/* Value label */}
              {config.showDataLabels && (
                <text
                  data-role="value"
                  x={valueX}
                  y={yMid}
                  textAnchor={valueAnchor}
                  dominantBaseline="central"
                  fill={valueFill}
                  style={{ fontSize: config.labelFontSize, fontWeight: 600 }}
                >
                  {labelText}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* X-axis */}
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
          {ticks.map((t) => (
            <text
              key={`tick-${t}`}
              x={plotLeft + x(t)}
              y={plotTop + plotHeight + 20}
              textAnchor="middle"
              fill={tokens.subtle}
              style={{ fontSize: 12 }}
            >
              {compactNumber(t)}
            </text>
          ))}
        </g>
      )}

      {/* Header */}
      {config.showHeader && config.header && (
        <text
          x={headerX}
          y={config.padTop}
          textAnchor={headerAnchor}
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
