import { useStudioStore } from "@/store/useStudioStore";
import { PALETTES } from "@/theme/palettes";
import { Section } from "@/components/ui/Section";
import { ExportSection } from "./ExportSection";
import { BarColorList } from "./BarColorList";
import { BarImageList } from "./BarImageList";
import { SunIcon, MoonIcon } from "@/components/ui/icons";
import {
  Field,
  Slider,
  Toggle,
  Segmented,
  Select,
  NumberStepper,
  TextInput,
  TextArea,
  ColorSwatchStrip,
} from "@/components/ui/controls";
import type {
  EasingMode,
  HeaderAlign,
  LabelPosition,
  SortDirection,
  ThemeMode,
} from "@/engine/types";
import type { ColorBy } from "@/store/useStudioStore";

const FONTS = [
  { value: "Montserrat", label: "Montserrat" },
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Roboto", label: "Roboto" },
  { value: "Oswald", label: "Oswald" },
  { value: "system-ui", label: "System" },
];

const FORMATS = [
  { value: ",.0f", label: "1,234,567" },
  { value: ",.2f", label: "1,234,567.89" },
];

export function Inspector() {
  const config = useStudioStore((s) => s.config);
  const update = useStudioStore((s) => s.updateConfig);
  const theme = useStudioStore((s) => s.theme);
  const setTheme = useStudioStore((s) => s.setTheme);
  const colorBy = useStudioStore((s) => s.colorBy);
  const setColorBy = useStudioStore((s) => s.setColorBy);
  const playback = useStudioStore((s) => s.playback);
  const setDuration = useStudioStore((s) => s.setDuration);
  const setSpeed = useStudioStore((s) => s.setSpeed);
  const easing = useStudioStore((s) => s.easing);
  const setEasing = useStudioStore((s) => s.setEasing);
  const totalNames = useStudioStore((s) => s.engine.names.length);

  const defaultBg = theme === "dark" ? "#0b0f14" : "#ffffff";

  return (
    <aside className="inspector">
      {/* Theme (always visible) */}
      <div className="insp-top">
        <div className="insp-top__label">Theme</div>
        <Segmented<ThemeMode>
          full
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: <><SunIcon size={14} /> Light</> },
            { value: "dark", label: <><MoonIcon size={14} /> Dark</> },
          ]}
        />

        <Field label="Color Palette">
          <div className="palette-row">
            {PALETTES.map((p) => (
              <ColorSwatchStrip
                key={p.id}
                colors={p.colors}
                active={config.paletteId === p.id}
                onPick={() => update({ paletteId: p.id })}
              />
            ))}
          </div>
        </Field>

        <Field label="Main Font">
          <Select value={config.fontFamily} options={FONTS} onChange={(v) => update({ fontFamily: v })} />
        </Field>
      </div>

      <ExportSection />

      <Section title="Bars" defaultOpen>
        <Field label="No. of Bars">
          <NumberStepper
            value={Math.min(config.numBars, totalNames)}
            min={3}
            max={Math.max(3, totalNames)}
            onChange={(v) => update({ numBars: v })}
          />
        </Field>
        <Field label="Sort By">
          <Select<SortDirection>
            value={config.sort}
            options={[
              { value: "descending", label: "Descending" },
              { value: "ascending", label: "Ascending" },
            ]}
            onChange={(v) => update({ sort: v })}
          />
        </Field>
        <Field label="Color By">
          <Segmented<ColorBy>
            value={colorBy}
            onChange={setColorBy}
            options={[
              { value: "name", label: "Entity" },
              { value: "category", label: "Category" },
            ]}
          />
        </Field>
        <Field label="Opacity">
          <Slider
            value={Math.round(config.barOpacity * 100)}
            min={10}
            max={100}
            suffix="%"
            onChange={(v) => update({ barOpacity: v / 100 })}
          />
        </Field>
        <Field label="Corner Radius">
          <Slider
            value={config.barCornerRadius}
            min={0}
            max={30}
            onChange={(v) => update({ barCornerRadius: v })}
          />
        </Field>
        <Field label="Spacing" hint="Gap between bars">
          <Slider
            value={Math.round(config.barPadding * 100)}
            min={0}
            max={80}
            onChange={(v) => update({ barPadding: v / 100 })}
          />
        </Field>
        <Field label="Icons">
          <Toggle checked={config.showFlags} onChange={(v) => update({ showFlags: v })} />
        </Field>
        {config.showFlags && (
          <>
            <Field label="Icon Size">
              <Slider
                value={Math.round(config.flagScale * 100)}
                min={30}
                max={100}
                suffix="%"
                onChange={(v) => update({ flagScale: v / 100 })}
              />
            </Field>
            <Field label="Icon Position">
              <Segmented<"inside" | "outside">
                value={config.flagPosition}
                onChange={(v) => update({ flagPosition: v })}
                options={[
                  { value: "inside", label: "Inside" },
                  { value: "outside", label: "Outside" },
                ]}
              />
            </Field>
            {config.flagPosition === "inside" && (
              <Field label="Icon Align">
                <Segmented<"left" | "center" | "right">
                  value={config.iconAlign}
                  onChange={(v) => update({ iconAlign: v })}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                  ]}
                />
              </Field>
            )}
            <BarImageList />
          </>
        )}
        <BarColorList />
      </Section>

      <Section title="Labels">
        <Field label="Data Labels">
          <Toggle checked={config.showDataLabels} onChange={(v) => update({ showDataLabels: v })} />
        </Field>
        <Field label="Position" stack>
          <Segmented<LabelPosition>
            full
            value={config.labelPosition}
            onChange={(v) => update({ labelPosition: v })}
            options={[
              { value: "left", label: "Left" },
              { value: "middle", label: "Middle" },
              { value: "right", label: "Right" },
              { value: "outside", label: "Outside" },
            ]}
          />
        </Field>
        <Field label="Label Size">
          <Slider
            value={config.labelFontSize}
            min={8}
            max={28}
            onChange={(v) => update({ labelFontSize: v })}
          />
        </Field>
        <Field label="Entity Labels">
          <Toggle
            checked={config.showEntityLabels}
            onChange={(v) => update({ showEntityLabels: v })}
          />
        </Field>
      </Section>

      <Section title="Axes & Grid">
        <Field label="X-axis">
          <Toggle checked={config.showXAxis} onChange={(v) => update({ showXAxis: v })} />
        </Field>
        <Field label="Gridlines">
          <Toggle checked={config.showGridlines} onChange={(v) => update({ showGridlines: v })} />
        </Field>
      </Section>

      <Section title="Date Counter">
        <Field label="Show Counter">
          <Toggle checked={config.showDateCounter} onChange={(v) => update({ showDateCounter: v })} />
        </Field>
        <Field label="Format" stack>
          <Segmented<"year" | "monthYear">
            full
            value={config.dateFormat}
            onChange={(v) => update({ dateFormat: v })}
            options={[
              { value: "year", label: "Year" },
              { value: "monthYear", label: "Month Year" },
            ]}
          />
        </Field>
        <Field label="Size">
          <Slider
            value={Math.round(config.dateCounterScale * 100)}
            min={8}
            max={60}
            suffix="%"
            onChange={(v) => update({ dateCounterScale: v / 100 })}
          />
        </Field>
        <Field label="Opacity">
          <Slider
            value={Math.round(config.dateCounterOpacity * 100)}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => update({ dateCounterOpacity: v / 100 })}
          />
        </Field>
        <Field label="Color">
          <div className="color-field">
            <input
              type="color"
              value={config.dateCounterColor ?? (theme === "dark" ? "#e8eaed" : "#1f2937")}
              onChange={(e) => update({ dateCounterColor: e.target.value })}
            />
            {config.dateCounterColor && (
              <button type="button" className="link-btn" onClick={() => update({ dateCounterColor: null })}>
                Reset
              </button>
            )}
          </div>
        </Field>
      </Section>

      <Section title="Header">
        <Field label="Show Header">
          <Toggle checked={config.showHeader} onChange={(v) => update({ showHeader: v })} />
        </Field>
        <Field label="Text" stack>
          <TextArea value={config.header} maxLength={200} onChange={(v) => update({ header: v })} />
        </Field>
        <Field label="Size">
          <Slider
            value={config.headerFontSize}
            min={12}
            max={48}
            onChange={(v) => update({ headerFontSize: v })}
          />
        </Field>
        <Field label="Position" stack>
          <Segmented<HeaderAlign>
            full
            value={config.headerAlign}
            onChange={(v) => update({ headerAlign: v })}
            options={[
              { value: "left", label: "Left" },
              { value: "middle", label: "Middle" },
              { value: "right", label: "Right" },
            ]}
          />
        </Field>
      </Section>

      <Section title="Background">
        <Field label="Canvas Color">
          <div className="color-field">
            <input
              type="color"
              value={config.canvasBg ?? defaultBg}
              onChange={(e) => update({ canvasBg: e.target.value })}
            />
            {config.canvasBg && (
              <button type="button" className="link-btn" onClick={() => update({ canvasBg: null })}>
                Reset
              </button>
            )}
          </div>
        </Field>
      </Section>

      <Section title="Padding">
        <Field label="Top">
          <Slider value={config.padTop} min={0} max={160} onChange={(v) => update({ padTop: v })} />
        </Field>
        <Field label="Right">
          <Slider value={config.padRight} min={0} max={200} onChange={(v) => update({ padRight: v })} />
        </Field>
        <Field label="Bottom">
          <Slider value={config.padBottom} min={0} max={160} onChange={(v) => update({ padBottom: v })} />
        </Field>
        <Field label="Left">
          <Slider value={config.padLeft} min={0} max={200} onChange={(v) => update({ padLeft: v })} />
        </Field>
      </Section>

      <Section title="Format">
        <Field label="Compact" hint="Abbreviate as K / M / B / T">
          <Toggle
            checked={config.compactNumbers}
            onChange={(v) => update({ compactNumbers: v })}
          />
        </Field>
        {!config.compactNumbers && (
          <Field label="Number" stack>
            <Select value={config.numberFormat} options={FORMATS} onChange={(v) => update({ numberFormat: v })} />
          </Field>
        )}
        <Field label="Prefix">
          <TextInput value={config.prefix} placeholder="$" onChange={(v) => update({ prefix: v })} />
        </Field>
        <Field label="Suffix">
          <TextInput value={config.suffix} placeholder="pts" onChange={(v) => update({ suffix: v })} />
        </Field>
      </Section>

      <Section title="Animation">
        <Field label="Bar Motion" stack hint="Easing when bars change position">
          <Segmented<EasingMode>
            full
            value={easing}
            onChange={setEasing}
            options={[
              { value: "linear", label: "Linear" },
              { value: "smooth", label: "Smooth" },
              { value: "easeIn", label: "In" },
              { value: "easeOut", label: "Out" },
            ]}
          />
        </Field>
        <Field label="Duration">
          <Slider
            value={playback.duration}
            min={2}
            max={30}
            suffix="s"
            onChange={(v) => setDuration(v)}
          />
        </Field>
        <Field label="Speed">
          <Slider
            value={playback.speed}
            min={0.25}
            max={3}
            step={0.25}
            suffix="×"
            onChange={(v) => setSpeed(v)}
          />
        </Field>
      </Section>
    </aside>
  );
}
