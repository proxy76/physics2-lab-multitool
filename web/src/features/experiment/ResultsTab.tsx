import { useState } from "react";
import { Field } from "../../components/Field";
import { GuideNote } from "../../components/GuideNote";
import { Plot } from "../../components/Plot";
import { Compare, Groups, SelfCheck, Steps, TableBlock, ValueLine, Warnings } from "../../components/ResultView";
import type { ExperimentDef } from "../../content/types";
import type { Analysis } from "../../lib/engine";
import { useEngineStatus } from "../../lib/engine";
import { getPath, setPath, type Session } from "../../lib/store";

export function ResultsTab({ def, data, setData, analysis, session }: { def: ExperimentDef; data: unknown; setData: (d: unknown) => void; analysis: Analysis; session: Session }) {
  const r = analysis.result;
  const status = useEngineStatus();
  const [sel, setSel] = useState<string | null>(null);
  const constants = r?.constants === "guide" ? "guide constants" : "CODATA 2022 / SI 2019 constants";
  return (
    <div className="results-tab printable">
      <header className="print-only">
        <h1>Experiment {def.n}: {def.title}</h1>
        <p>Session “{session.name}”, {new Date(session.updated).toLocaleString("en-GB")}</p>
      </header>
      {!r ? (
        <p className="muted live-wait">
          {status.status !== "ready" ? `${status.detail}…` : analysis.pending ? "Analysing…" : "Enter data in the Data or Run tab — results appear here as soon as the analysis can run."}
        </p>
      ) : (
        <>
          <section className="headline">
            {def.headline.map((h) => r.values[h.key] && <ValueLine key={h.key} emphasis v={{ ...r.values[h.key], label: headlineLabel(h.label, r.values[h.key].label) }} />)}
            <p className="muted small">Lab rounding rule (1 significant digit in σ, 2 if it starts with 1); {constants}.{analysis.ms ? ` Computed in ${analysis.ms} ms at 50 digits.` : ""}</p>
          </section>
          {r.tables.filter((t) => t.id === "conclusions").map((t) => <TableBlock key={t.id} t={t} exportName={`exp${def.n}`} />)}
          <Warnings r={r} />
          <Compare r={r} />
          <Groups r={r} groups={["honesty"]} />
          {r.plots.map((p) => <Plot key={p.id} plot={p} selected={sel} onSelect={setSel} />)}
          <Groups r={r} exclude={["honesty", "advanced"]} />
          <Steps r={r} />
          {r.tables.filter((t) => t.id !== "conclusions").map((t) => <TableBlock key={t.id} t={t} exportName={`exp${def.n}`} />)}
          <Groups r={r} groups={["advanced"]} />
          <SelfCheck r={r} />
        </>
      )}
      {def.resultInputs?.map((ri) => (
        <details key={ri.title} className="result-inputs no-print">
          <summary>{ri.title}</summary>
          <p className="muted small">{ri.help}</p>
          <div className="param-grid">
            {ri.fields.map((f) => (
              <Field key={f.path} label={f.label} unit={f.unit} text={f.text} placeholder={f.placeholder} signed
                value={String(getPath(data, f.path) ?? "")} onChange={(v) => setData(setPath(data, f.path, v))} />
            ))}
          </div>
        </details>
      ))}
      <section className="no-print">
        {def.notes.map((n) => <GuideNote key={n} id={n} />)}
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => window.print()}>Print results page</button>
        </div>
      </section>
    </div>
  );
}

// "Method I" + "Λ (Method I)" → "Λ (Method I)", not "Method I: Λ (Method I)"
function headlineLabel(prefix: string | undefined, label: string) {
  return prefix && !label.toLowerCase().includes(prefix.toLowerCase()) ? `${prefix}: ${label}` : label;
}
