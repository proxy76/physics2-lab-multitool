// Editable table that mirrors one of the guide's tables. Rows are cards on phones; derived columns
// come from the engine's result table (matched by row id). Each row: note, exclude, undo, timestamp.
import { useRef, useState } from "react";
import type { TableDef } from "../content/types";
import type { EngineResult } from "../lib/engineTypes";
import { getPath, setPath, uid } from "../lib/store";
import { Field } from "./Field";
import { Sym } from "./Sym";

export type Row = Record<string, unknown> & { id: string; note?: string; ts?: number; excluded?: boolean };

export function newRow(def: TableDef, extra: Record<string, string> = {}): Row {
  const r: Row = { id: uid(), ...Object.fromEntries(def.columns.map((c) => [c.key, c.kind === "readings" ? Array(c.count ?? 10).fill("") : ""])), ...(def.defaults ?? {}), ...extra };
  return r;
}

const time = (ts?: number) => (ts ? new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");

interface Props {
  def: TableDef;
  data: unknown;
  onChange: (data: unknown) => void;
  result: EngineResult | null;
  errorField?: string | null;
  only?: string[]; // limit visible input columns (Run-mode entry)
  rowId?: string | null; // show only this row
  compact?: boolean;
}

export function DataTable({ def, data, onChange, result, errorField, only, rowId, compact }: Props) {
  const rows: Row[] = (getPath(data, def.path) as Row[]) ?? [];
  const history = useRef(new Map<string, Row[]>());
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const eng = result?.tables.find((t) => t.id === def.engineTable);
  const flags = result?.extra?.flags ?? {};
  const cols = def.columns.filter((c) => !only || only.includes(c.key));

  const setRows = (next: Row[]) => onChange(setPath(data, def.path, next));
  const update = (i: number, patch: Partial<Row>) => {
    const old = rows[i];
    const h = history.current.get(old.id) ?? [];
    if (h.length === 0 || JSON.stringify(h[h.length - 1]) !== JSON.stringify(old)) history.current.set(old.id, [...h.slice(-19), old]);
    const next = rows.slice();
    next[i] = { ...old, ...patch, ts: old.ts ?? Date.now() };
    setRows(next);
  };
  const undo = (i: number) => {
    const h = history.current.get(rows[i].id);
    if (!h?.length) return;
    const prev = h.pop()!;
    const next = rows.slice();
    next[i] = prev;
    setRows(next);
  };
  const remove = (i: number) => {
    const next = rows.slice();
    const [gone] = next.splice(i, 1);
    history.current.set("__deleted", [gone]);
    setRows(next);
  };
  const restore = () => {
    const g = history.current.get("__deleted");
    if (!g?.length) return;
    setRows([...rows, g[0]]);
    history.current.delete("__deleted");
  };

  const shown = rows.map((r, i) => ({ r, i })).filter(({ r }) => !rowId || r.id === rowId);
  const fieldErr = (i: number, key: string) => {
    if (!errorField) return null;
    const p = `${def.path.split(".").slice(-1)[0]}[${i}].${key}`;
    return errorField.endsWith(p) ? "The engine could not read this value" : null;
  };

  return (
    <div className={`dtable${compact ? " compact" : ""}`}>
      {shown.map(({ r, i }) => {
        const derived = eng?.rows.find((x) => x.id === r.id);
        const flag = flags[r.id]?.outlier;
        const expected = !flag ? flags[r.id]?.expected : undefined;
        return (
          <article key={r.id} className={`row-card${r.excluded ? " excluded" : ""}${flag ? " flagged" : ""}`}>
            <header className="row-head">
              <span className="row-label">{def.rowLabel ? def.rowLabel(r as Record<string, string>, i) : `Row ${i + 1}`}</span>
              {r.ts ? <span className="row-time num">{time(r.ts as number)}</span> : null}
            </header>
            {flag && <p className="row-flag">{flag} σ from the line — re-measure?</p>}
            {expected && <p className="row-flag expected">{expected[0].toUpperCase() + expected.slice(1)}.</p>}
            <div className="row-fields">
              {cols.map((c) =>
                c.kind === "fixed" ? (
                  <div key={c.key} className="field fixed">
                    <span className="field-label"><Sym text={c.label} /></span>
                    <span className="num fixed-val">{String(r[c.key] ?? "")}{c.unit ? ` ${c.unit}` : ""}</span>
                  </div>
                ) : c.kind === "readings" ? (
                  <Readings key={c.key} label={c.label} unit={c.unit} values={(r[c.key] as string[]) ?? []}
                    onChange={(v) => update(i, { [c.key]: v })} errorPrefix={errorField && errorField.includes(`[${i}].readings`) ? errorField : null} />
                ) : (
                  <Field key={c.key} label={c.label} unit={c.unit} hint={c.hint} text={c.kind === "text"} value={String(r[c.key] ?? "")}
                    error={fieldErr(i, c.key)} onChange={(v) => update(i, { [c.key]: v })} />
                ),
              )}
            </div>
            {derived && def.derived && (
              <dl className="derived num">
                {def.derived.map((d) => (derived[d.key] !== undefined && derived[d.key] !== "" ? (
                  <div key={d.key}><dt><Sym text={d.label} />{d.unit ? ` (${d.unit})` : ""}</dt><dd>{String(derived[d.key])}</dd></div>
                ) : null))}
              </dl>
            )}
            {noteOpen === r.id && (
              <Field label="Note" text value={String(r.note ?? "")} onChange={(v) => update(i, { note: v })} placeholder="e.g. repeated, shield moved" />
            )}
            {r.note && noteOpen !== r.id ? <p className="row-note">{String(r.note)}</p> : null}
            {!compact && (
              <div className="row-actions">
                <button type="button" className="btn small ghost" onClick={() => setNoteOpen(noteOpen === r.id ? null : r.id)}>Note</button>
                <button type="button" className="btn small ghost" aria-pressed={!!r.excluded} onClick={() => update(i, { excluded: !r.excluded })}>
                  {r.excluded ? "Include" : "Exclude"}
                </button>
                <button type="button" className="btn small ghost" disabled={!history.current.get(r.id)?.length} onClick={() => undo(i)}>Undo</button>
                {!def.fixed && <button type="button" className="btn small ghost danger" onClick={() => remove(i)}>Delete</button>}
              </div>
            )}
          </article>
        );
      })}
      {!compact && !def.fixed && (
        <div className="table-actions">
          <button type="button" className="btn" onClick={() => setRows([...rows, newRow(def)])}>Add row</button>
          {history.current.get("__deleted")?.length ? <button type="button" className="btn ghost" onClick={restore}>Undo delete</button> : null}
        </div>
      )}
      {def.note && !compact && <p className="muted small">{def.note}</p>}
    </div>
  );
}

function Readings({ label, unit, values, onChange, errorPrefix }: { label: string; unit?: string; values: string[]; onChange: (v: string[]) => void; errorPrefix: string | null }) {
  const set = (j: number, v: string) => {
    const next = values.slice();
    next[j] = v;
    onChange(next);
  };
  return (
    <fieldset className="readings">
      <legend><Sym text={label} />{unit ? ` (${unit})` : ""}</legend>
      <div className="readings-grid">
        {values.map((v, j) => (
          <Field key={j} label={`${j + 1}`} value={v} onChange={(x) => set(j, x)}
            error={errorPrefix?.endsWith(`readings[${j}]`) ? "Not readable" : null}
            onEnter={() => (document.querySelectorAll<HTMLInputElement>(".readings-grid input")[j + 1] as HTMLInputElement | undefined)?.focus()} />
        ))}
      </div>
    </fieldset>
  );
}
