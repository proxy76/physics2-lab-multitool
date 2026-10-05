import { useState } from "react";
import { DataTable } from "../../components/DataTable";
import { Field } from "../../components/Field";
import { Plot } from "../../components/Plot";
import { TableBlock, Warnings } from "../../components/ResultView";
import type { ExperimentDef } from "../../content/types";
import type { Analysis } from "../../lib/engine";
import { getPath, setPath } from "../../lib/store";

export function DataTab({ def, data, setData, analysis }: { def: ExperimentDef; data: unknown; setData: (d: unknown) => void; analysis: Analysis }) {
  const r = analysis.result;
  const [sel, setSel] = useState<string | null>(null);
  const [tableIdx, setTableIdx] = useState(0);
  const table = def.tables[Math.min(tableIdx, def.tables.length - 1)];
  const engTables = r?.tables.filter((t) => t.id !== "conclusions") ?? [];
  return (
    <div className="data-tab">
      <div className="data-grid">
        <section className="data-input">
          {def.tables.length > 1 && (
            <div className="chips" role="tablist" aria-label="Tables">
              {def.tables.map((t, i) => (
                <button key={t.id} type="button" role="tab" aria-selected={i === tableIdx} className="chip" onClick={() => setTableIdx(i)}>{t.short ?? t.title.split(" — ")[0]}</button>
              ))}
            </div>
          )}
          <h2>{table.title}</h2>
          <DataTable def={table} data={data} onChange={setData} result={r} errorField={analysis.error?.field} />
          {def.params && (
            <details className="params">
              <summary>Parameters and constants of this experiment</summary>
              <div className="param-grid">
                {def.params.map((f) => (
                  <Field key={f.path} label={f.label} unit={f.unit} hint={f.hint} text={f.text} options={f.options}
                    value={String(getPath(data, f.path) ?? "")} onChange={(v) => setData(setPath(data, f.path, v))} />
                ))}
              </div>
            </details>
          )}
        </section>
        <section className="data-live" aria-live="polite">
          {!r ? (
            <p className="muted live-wait">{analysis.pending ? "Analysing…" : "Derived columns and the live plot appear when the engine is ready and enough rows are filled."}</p>
          ) : (
            <>
              {r.plots.map((p) => <Plot key={p.id} plot={p} selected={sel} onSelect={setSel} />)}
              {def.livePanel?.(r, data)}
              <Warnings r={r} />
            </>
          )}
        </section>
      </div>
      {engTables.length > 0 && (
        <details className="full-tables">
          <summary>Full tables with derived columns (for the report)</summary>
          {engTables.map((t) => <TableBlock key={t.id} t={t} exportName={`exp${def.n}`} />)}
        </details>
      )}
    </div>
  );
}
