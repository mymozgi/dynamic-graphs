import { useStudioStore } from "@/store/useStudioStore";
import { makeColorResolver } from "@/theme/palettes";

/** Per-entity color pickers. Each swatch shows the effective color; changing
 *  it writes a per-entity override that wins over the palette. */
export function BarColorList() {
  const names = useStudioStore((s) => s.engine.names);
  const categories = useStudioStore((s) => s.engine.categories);
  const paletteId = useStudioStore((s) => s.config.paletteId);
  const barColors = useStudioStore((s) => s.config.barColors);
  const colorBy = useStudioStore((s) => s.colorBy);
  const setBarColor = useStudioStore((s) => s.setBarColor);
  const resetBarColors = useStudioStore((s) => s.resetBarColors);

  const resolve = makeColorResolver(names, categories, paletteId, colorBy, barColors);
  const hasOverrides = Object.keys(barColors).length > 0;

  return (
    <div className="color-list">
      <div className="color-list__head">
        <span>Bar Colors</span>
        {hasOverrides && (
          <button type="button" className="link-btn" onClick={resetBarColors}>
            Reset all
          </button>
        )}
      </div>
      <div className="color-list__scroll">
        {names.map((name) => {
          const color = resolve(name, categories.get(name) ?? name);
          return (
            <label key={name} className="color-list__row" title={`Color for ${name}`}>
              <input
                type="color"
                value={color}
                onChange={(e) => setBarColor(name, e.target.value)}
              />
              <span>{name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
