import type { ReactNode } from "react";

/** A labeled row: label on the left, control on the right. */
export function Field({
  label,
  children,
  stack = false,
  hint,
}: {
  label: string;
  children: ReactNode;
  stack?: boolean;
  hint?: string;
}) {
  return (
    <div className={stack ? "field field--stack" : "field"}>
      <div className="field__label">
        {label}
        {hint && <span className="field__hint" title={hint}>ⓘ</span>}
      </div>
      <div className="field__control">{children}</div>
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, var(--track) ${pct}%)` }}
      />
      <span className="slider__value">
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle ${checked ? "toggle--on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__knob" />
    </button>
  );
}

export interface SegOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  full,
}: {
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <div className={`segmented ${full ? "segmented--full" : ""}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          className={`segmented__btn ${value === o.value ? "is-active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="select">
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NumberStepper({
  value,
  min = 1,
  max = 999,
  step = 1,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - step))} aria-label="decrease">
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
      />
      <button type="button" onClick={() => onChange(clamp(value + step))} aria-label="increase">
        +
      </button>
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="text-input"
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextArea({
  value,
  onChange,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <div className="textarea">
      <textarea
        value={value}
        maxLength={maxLength}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
      />
      {maxLength && (
        <span className="textarea__count">
          {value.length} / {maxLength}
        </span>
      )}
    </div>
  );
}

export function ColorSwatchStrip({
  colors,
  active,
  onPick,
}: {
  colors: string[];
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button type="button" className={`swatch-strip ${active ? "is-active" : ""}`} onClick={onPick}>
      {colors.slice(0, 6).map((c, i) => (
        <span key={i} className="swatch-strip__dot" style={{ background: c }} />
      ))}
    </button>
  );
}
