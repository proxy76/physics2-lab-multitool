// Renders an engine result: headline values, warnings, comparisons, plots, tables (with exports),
// show-your-work steps and grouped advanced values.
import { useState } from "react";
import type { EngineResult, ResultTable, Value } from "../lib/engineTypes";
import { copy, tableToCSV, tableToLatex, tableToMarkdown } from "../lib/export";
import { Plot, download } from "./Plot";
import { Tex } from "./Tex";
import { toast } from "./Toast";

export function ValueLine({ v, emphasis }: { v: Value; emphasis?: boolean }) {
  return (
    <div className={`value-line${emphasis ? " emph" : ""}`}>
      <span className="value-label">{v.label}</span>
      <span className="value-report num">{v.report}</span>
    </div>
  );
}

export function Warnings({ r }: { r: EngineResult }) {
  if (!r.warnings.length) return null;
  return (
    <ul className="warnings" aria-live="polite">
      {r.warnings.map((w, i) => (
        <li key={i} className={`warn-${w.severity}`}>{w.message}</li>
      ))}
    </ul>
  );
}

export function TableBlock({ t, exportName }: { t: ResultTable; exportName: string }) {
  const doCopy = async (s: string, what: string) => toast((await copy(s)) ? `${what} copied` : "Copy failed");
  return (
    <section className="result-table">
      <h4>{t.title}</h4>
      <div className="table-scroll">
        <table className="rich-table num">
          <thead>
            <tr>{t.columns.map((c) => <th key={c.key}>{c.label}{c.unit ? <span className="th-unit"> ({c.unit})</span> : null}</th>)}</tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i} className={r.excluded ? "excluded" : undefined}>{t.columns.map((c) => <td key={c.key}>{String(r[c.key] ?? "")}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.note && <p className="muted small">{t.note}</p>}
      <div className="table-tools">
        <button type="button" className="btn small ghost" onClick={() => doCopy(tableToLatex(t), "LaTeX table")}>Copy LaTeX</button>
        <button type="button" className="btn small ghost" onClick={() => doCopy(tableToMarkdown(t), "Markdown table")}>Copy Markdown</button>
        <button type="button" className="btn small ghost" onClick={() => download(`${exportName}-${t.id}.csv`, tableToCSV(t), "text/csv")}>CSV</button>
      </div>
    </section>
  );
}

export function Steps({ r }: { r: EngineResult }) {
  const [open, setOpen] = useState(false);
  if (!r.steps.length) return null;
  return (
    <section className="steps">
      <button type="button" className="disclosure" aria-expanded={open} onClick={() => setOpen(!open)}>
        Show steps ({r.steps.length})
      </button>
      {open && (
        <ol className="step-list">
          {r.steps.map((s, i) => (
            <li key={i}>
              <h5>{s.title}</h5>
              {s.latex && <Tex tex={s.latex} display />}
              {s.substituted && <Tex tex={s.substituted} display />}
              {s.result && <div className="step-result"><Tex tex={"=" + s.result.replace(/^=/, "")} display /></div>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function Compare({ r }: { r: EngineResult }) {
  const c = r.extra?.compare;
  if (!c?.length) return null;
  return (
    <section className="compare">
      <h4>Comparison with reference values</h4>
      <ul>
        {c.map((x, i) => (
          <li key={i}>
            <span>{x.label}</span>
            <span className="num">Δ = {x.dev_pct} %{x.z ? `, z = ${x.z}` : ""}</span>
            {x.verdict && <span className={x.verdict.startsWith("compatible") ? "ok" : "bad"}>{x.verdict}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

const GROUP_TITLES: Record<string, string> = {
  advanced: "Advanced / cross-checks (not required by the guide)",
  honesty: "Honesty check: uncertainty from the known data errors",
};

export function Groups({ r, groups, exclude = [] }: { r: EngineResult; groups?: string[]; exclude?: string[] }) {
  const by = new Map<string, [string, Value][]>();
  Object.entries(r.values).forEach(([k, v]) => {
    const g = v.group ?? "other";
    if (exclude.includes(g) || (groups && !groups.includes(g))) return;
    by.set(g, [...(by.get(g) ?? []), [k, v]]);
  });
  return (
    <>
      {[...by.entries()].map(([g, vals]) => (
        <details key={g} className={`group group-${g}`} open={g === "honesty"}>
          <summary>{GROUP_TITLES[g] ?? g.charAt(0).toUpperCase() + g.slice(1)}</summary>
          {vals.map(([k, v]) => <ValueLine key={k} v={v} />)}
        </details>
      ))}
    </>
  );
}

export function SelfCheck({ r }: { r: EngineResult }) {
  if (!r.selfcheck) return null;
  return (
    <p className={`selfcheck ${r.selfcheck.ok ? "ok" : "bad"}`}>
      Precision self-check (50 vs 100 digits): {r.selfcheck.ok ? "agree" : "DISAGREE"} to {r.selfcheck.min_digits} significant digits
    </p>
  );
}

export function GenericResult({ r, name }: { r: EngineResult; name: string }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="result">
      <div className="values">
        {Object.entries(r.values).filter(([, v]) => !v.group).map(([k, v]) => <ValueLine key={k} v={v} />)}
      </div>
      <Warnings r={r} />
      <Compare r={r} />
      {r.plots.map((p) => <Plot key={p.id} plot={p} selected={sel} onSelect={setSel} />)}
      {r.tables.map((t) => <TableBlock key={t.id} t={t} exportName={name} />)}
      <Groups r={r} />
      <Steps r={r} />
      <SelfCheck r={r} />
    </div>
  );
}
