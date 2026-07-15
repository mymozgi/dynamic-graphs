import { useMemo, useRef, useState } from "react";
import { useStudioStore } from "@/store/useStudioStore";
import { parseData, type ParseResult } from "@/data/parseData";
import { parsePeriod, toYearMonth } from "@/utils/period";

type Message = { type: "error" | "warn" | "ok"; text: string };

const PLACEHOLDER = `Date,Platform,Users
2004-01,Friendster,650000
2004-01,MySpace,700000
2004-02,Friendster,708300`;

export function DataPanel() {
  const rows = useStudioStore((s) => s.rows);
  const updateCell = useStudioStore((s) => s.updateCell);
  const setRows = useStudioStore((s) => s.setRows);
  const loadSample = useStudioStore((s) => s.loadSample);
  const addEntity = useStudioStore((s) => s.addEntity);
  const addPeriod = useStudioStore((s) => s.addPeriod);
  const removeEntity = useStudioStore((s) => s.removeEntity);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [msg, setMsg] = useState<Message | null>(null);

  const { names, dates, valueOf } = useMemo(() => {
    const dateSet = new Set<number>();
    const nameSet = new Set<string>();
    const map = new Map<string, number>();
    const lastByName = new Map<string, number>();
    let maxDate = -Infinity;
    for (const r of rows) {
      dateSet.add(r.date);
      nameSet.add(r.name);
      map.set(`${r.name}|${r.date}`, r.value);
      if (r.date > maxDate) maxDate = r.date;
    }
    for (const r of rows) if (r.date === maxDate) lastByName.set(r.name, r.value);
    return {
      names: [...nameSet].sort((a, b) => (lastByName.get(b) ?? 0) - (lastByName.get(a) ?? 0)),
      dates: [...dateSet].sort((a, b) => a - b),
      valueOf: (name: string, date: number) => map.get(`${name}|${date}`) ?? 0,
    };
  }, [rows]);

  const isMonthly = dates.some((d) => !Number.isInteger(d));
  const periodLabel = (d: number) => (isMonthly ? toYearMonth(d) : String(d));

  function applyResult(res: ParseResult) {
    setRows(res.rows);
    if (res.warnings.length) {
      setMsg({ type: "warn", text: `Loaded ${res.entities} × ${res.periods}. ${res.warnings.join(" ")}` });
    } else {
      setMsg({ type: "ok", text: `Loaded ${res.entities} entities × ${res.periods} periods ✓` });
    }
  }

  function ingest(text: string, fileName?: string) {
    try {
      applyResult(parseData(text, fileName));
      return true;
    } catch (e) {
      setMsg({ type: "error", text: (e as Error).message });
      return false;
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    ingest(await file.text(), file.name);
    e.target.value = ""; // allow re-uploading the same file
  }

  function onImportPaste() {
    if (ingest(pasteText)) {
      setPasteOpen(false);
      setPasteText("");
    }
  }

  function onAddEntity() {
    const name = window.prompt("New entity name:");
    if (name) addEntity(name);
  }

  function onAddPeriod() {
    const max = dates.length ? Math.max(...dates) : 2000;
    const next = dates.length ? max + (isMonthly ? 1 / 12 : 1) : max;
    const suggested = isMonthly ? toYearMonth(next) : String(next);
    const input = window.prompt("New period (YYYY-MM or year):", suggested);
    if (input == null) return;
    const date = parsePeriod(input);
    if (Number.isFinite(date)) addPeriod(date);
  }

  return (
    <div className="data-panel">
      <div className="data-toolbar">
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          Upload file
        </button>
        <button type="button" className="btn" onClick={() => setPasteOpen((o) => !o)}>
          Paste data
        </button>
        <button type="button" className="btn" onClick={() => { loadSample(); setMsg({ type: "ok", text: "Sample data loaded ✓" }); }}>
          Load sample
        </button>
        <span className="data-toolbar__spacer" />
        <button type="button" className="btn" onClick={onAddEntity}>+ Entity</button>
        <button type="button" className="btn" onClick={onAddPeriod}>+ Period</button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,.json"
          hidden
          onChange={onFile}
        />
      </div>

      {pasteOpen && (
        <div className="paste-box">
          <textarea
            value={pasteText}
            placeholder={PLACEHOLDER}
            onChange={(e) => setPasteText(e.target.value)}
            spellCheck={false}
          />
          <div className="paste-box__actions">
            <span className="paste-box__hint">
              CSV / TSV / JSON — wide (entity + year columns) or long (name, date, value).
            </span>
            <button type="button" className="btn" onClick={() => setPasteOpen(false)}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={onImportPaste}>Import</button>
          </div>
        </div>
      )}

      {msg && <div className={`data-msg data-msg--${msg.type}`}>{msg.text}</div>}

      <div className="data-panel__scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="data-table__corner">Name</th>
              {dates.map((d) => (
                <th key={d}>{periodLabel(d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((name) => (
              <tr key={name}>
                <th className="data-table__rowhead">
                  <span>{name}</span>
                  <button
                    type="button"
                    className="row-del"
                    aria-label={`Remove ${name}`}
                    title={`Remove ${name}`}
                    onClick={() => removeEntity(name)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </th>
                {dates.map((d) => (
                  <td key={d}>
                    <input
                      type="number"
                      value={valueOf(name, d)}
                      onChange={(e) => updateCell(name, d, Number(e.target.value) || 0)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="data-panel__hint">
        Edit any value inline — the chart and timeline update instantly.
      </p>
    </div>
  );
}
