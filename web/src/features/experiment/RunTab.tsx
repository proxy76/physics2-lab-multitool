import { useEffect, useRef, useState } from "react";
import { DataTable, newRow, type Row } from "../../components/DataTable";
import { Field } from "../../components/Field";
import { GuideNote } from "../../components/GuideNote";
import { Plot } from "../../components/Plot";
import { ValueLine, Warnings } from "../../components/ResultView";
import { Inline, Rich } from "../../components/Rich";
import { TimerButton } from "../../components/Timers";
import type { Entry, ExperimentDef, RunStep } from "../../content/types";
import type { Analysis } from "../../lib/engine";
import { getPath, setPath, updateSession, useAppState, type Session } from "../../lib/store";
import { startStopwatch } from "../../lib/timers";
import { useWakeLock } from "../../lib/wakelock";

type SetData = (d: unknown) => void;

function Roles({ roles }: { roles: RunStep["role"] }) {
  return (
    <span className="role-tags">
      {roles.map((r) => <span key={r} className={`role role-${r}`}>{r === "ALL" ? "All" : r}</span>)}
    </span>
  );
}

function FieldsEntry({ entry, data, setData }: { entry: Extract<Entry, { kind: "fields" }>; data: unknown; setData: SetData }) {
  const refs = useRef<HTMLDivElement>(null);
  const focusNext = (i: number) => refs.current?.querySelectorAll<HTMLInputElement>("input")[i + 1]?.focus();
  return (
    <div className="entry-fields" ref={refs}>
      {entry.fields.map((f, i) => (
        <Field key={f.path} big label={f.label} unit={f.unit} hint={f.hint} text={f.text} placeholder={f.placeholder} options={f.options}
          value={String(getPath(data, f.path) ?? "")} onChange={(v) => setData(setPath(data, f.path, v))} onEnter={() => focusNext(i)} />
      ))}
    </div>
  );
}

function RowEntry({ def, entry, data, setData, analysis }: { def: ExperimentDef; entry: Extract<Entry, { kind: "row" }>; data: unknown; setData: SetData; analysis: Analysis }) {
  const table = def.tables.find((t) => t.id === entry.table)!;
  const rows: Row[] = getPath(data, table.path) ?? [];
  const firstIncomplete = rows.find((r) => entry.fields.some((k) => !String(r[k] ?? "").trim()));
  const [sel, setSel] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === sel) ?? firstIncomplete ?? rows[rows.length - 1];
  const add = () => {
    const r = newRow(table, entry.defaults);
    setData(setPath(data, table.path, [...rows, r]));
    setSel(r.id);
  };
  return (
    <div className="row-entry">
      {rows.length > 0 && (
        <div className="chips" role="tablist" aria-label="Choose row">
          {rows.map((r, i) => {
            const done = entry.fields.every((k) => String(r[k] ?? "").trim());
            return (
              <button key={r.id} type="button" role="tab" aria-selected={selected?.id === r.id} className={`chip${done ? " done" : ""}`} onClick={() => setSel(r.id)}>
                {table.rowLabel ? table.rowLabel(r as Record<string, string>, i) : `#${i + 1}`}
              </button>
            );
          })}
        </div>
      )}
      {selected ? (
        <DataTable def={table} data={data} onChange={setData} result={analysis.result} errorField={analysis.error?.field} only={entry.fields} rowId={selected.id} compact />
      ) : (
        <p className="muted">No rows yet.</p>
      )}
      {!table.fixed && (
        <button type="button" className="btn primary" onClick={add}>{entry.addLabel ?? "Add row"}</button>
      )}
    </div>
  );
}

function ReadingsEntry({ def, entry, data, setData, analysis }: { def: ExperimentDef; entry: Extract<Entry, { kind: "readings" }>; data: unknown; setData: SetData; analysis: Analysis }) {
  const table = def.tables.find((t) => t.id === entry.table)!;
  const rows: Row[] = getPath(data, table.path) ?? [];
  const [sel, setSel] = useState<string | null>(null);
  const firstOpen = rows.find((r) => ((r.readings as string[]) ?? []).some((x) => !x?.trim()));
  const selected = rows.find((r) => r.id === sel) ?? firstOpen ?? rows[0];
  return (
    <div className="row-entry">
      <div className="chips" role="tablist" aria-label="Choose filter">
        {rows.map((r, i) => {
          const n = ((r.readings as string[]) ?? []).filter((x) => x?.trim()).length;
          return (
            <button key={r.id} type="button" role="tab" aria-selected={selected?.id === r.id} className={`chip${n >= 10 ? " done" : ""}`} onClick={() => setSel(r.id)}>
              {table.rowLabel ? table.rowLabel(r as Record<string, string>, i) : `#${i + 1}`} <span className="num">{n}/10</span>
            </button>
          );
        })}
        <button type="button" className="chip add" onClick={() => { const r = newRow(table, { color: "", lambda: "" }); setData(setPath(data, table.path, [...rows, r])); setSel(r.id); }}>+ filter</button>
      </div>
      {selected && <DataTable def={table} data={data} onChange={setData} result={analysis.result} errorField={analysis.error?.field} rowId={selected.id} compact />}
    </div>
  );
}

function EntryView(props: { def: ExperimentDef; entry: Entry; data: unknown; setData: SetData; analysis: Analysis }) {
  const { entry, def, data, setData, analysis } = props;
  switch (entry.kind) {
    case "fields":
      return <FieldsEntry entry={entry} data={data} setData={setData} />;
    case "row":
      return <RowEntry def={def} entry={entry} data={data} setData={setData} analysis={analysis} />;
    case "readings":
      return <ReadingsEntry def={def} entry={entry} data={data} setData={setData} analysis={analysis} />;
    case "table": {
      const t = def.tables.find((x) => x.id === entry.table)!;
      return <DataTable def={t} data={data} onChange={setData} result={analysis.result} errorField={analysis.error?.field} compact />;
    }
  }
}

export function LivePane({ def, data, analysis, kind }: { def: ExperimentDef; data: unknown; analysis: Analysis; kind?: RunStep["live"] }) {
  const r = analysis.result;
  const [sel, setSel] = useState<string | null>(null);
  if (!r) return <p className="muted live-wait">{analysis.pending ? "Analysing…" : "The live plot appears once there is enough data and the engine is ready."}</p>;
  const plot = r.plots[0];
  return (
    <div className="live-pane">
      {kind !== "check" && plot && <Plot plot={plot} selected={sel} onSelect={setSel} />}
      {def.livePanel?.(r, data)}
      <div className="values compact">
        {def.headline.map((h) => r.values[h.key] && <ValueLine key={h.key} v={{ ...r.values[h.key], label: h.label ?? r.values[h.key].label }} />)}
      </div>
      <Warnings r={r} />
    </div>
  );
}

export function RunTab({ def, session, data, setData, analysis }: { def: ExperimentDef; session: Session; data: unknown; setData: SetData; analysis: Analysis }) {
  const role = useAppState((s) => s.settings.role);
  const [cheat, setCheat] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const steps = def.steps;
  const i = Math.min(session.step, steps.length - 1);
  const step = steps[i];
  useWakeLock(true);
  useEffect(() => setHowOpen(false), [i]);

  const goStep = (n: number) => updateSession(session.id, (s) => ({ ...s, step: Math.max(0, Math.min(steps.length - 1, n)) }));
  const touch = useRef<{ x: number; y: number } | null>(null);
  const mine = !role || step.role.includes("ALL") || step.role.includes(role);

  if (cheat)
    return (
      <div className="run cheat">
        <div className="run-top">
          <h2>Cheat card</h2>
          <button type="button" className="btn" onClick={() => setCheat(false)}>Back to steps</button>
        </div>
        <ol className="cheat-list">{def.cheat.map((c) => <li key={c}><Inline text={c} /></li>)}</ol>
        <div className="hazard"><ul>{def.brief.safety.map((s) => <li key={s}>{s}</li>)}</ul></div>
      </div>
    );

  return (
    <div className="run">
      <div className="run-top">
        <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-label="Run progress">
          <span style={{ transform: `scaleX(${(i + 1) / steps.length})` }} />
        </div>
        <span className="step-count num">Step {i + 1} of {steps.length}</span>
        <button type="button" className="btn small ghost" onClick={() => setCheat(true)}>Cheat card</button>
      </div>
      <div className="run-grid">
        <article className={`step-card${mine ? " mine" : " theirs"}`}
          onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
          onTouchEnd={(e) => {
            const t = touch.current;
            touch.current = null;
            if (!t) return;
            const dx = e.changedTouches[0].clientX - t.x;
            const dy = e.changedTouches[0].clientY - t.y;
            const target = e.target as HTMLElement;
            if (target.closest("input,select,textarea,.chips,.plot")) return;
            if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) goStep(i + (dx < 0 ? 1 : -1));
          }}>
          <header className="step-head">
            <Roles roles={step.role} />
            {step.optional && <span className="tag">optional</span>}
            {!mine && <span className="tag">not your role</span>}
          </header>
          <h2 className="step-title"><Inline text={step.title} /></h2>
          {step.safety && <p className="hazard inline-hazard"><Inline text={step.safety} /></p>}
          {step.how && (
            <div className="how">
              <button type="button" className="disclosure" aria-expanded={howOpen} onClick={() => setHowOpen(!howOpen)}>How</button>
              {howOpen && <Rich text={step.how} />}
            </div>
          )}
          {step.see && <p className="see"><span className="see-label">You should see</span> <Inline text={step.see} /></p>}
          {(step.timer || step.stopwatch) && (
            <div className="btn-row">
              {step.timer && <TimerButton seconds={step.timer.seconds} label={step.timer.label} />}
              {step.stopwatch && <button type="button" className="btn timer-btn" onClick={() => startStopwatch("Readings")}>Start stopwatch (laps)</button>}
            </div>
          )}
          {step.entry && <EntryView def={def} entry={step.entry} data={data} setData={setData} analysis={analysis} />}
          {step.decision && <p className="decision"><span className="decision-label">If</span> <Inline text={step.decision.replace(/^If /, "")} /></p>}
          {step.meanwhile && <p className="meanwhile"><span className="meanwhile-label">Meanwhile</span> <Inline text={step.meanwhile} /></p>}
          {step.verify && (
            <fieldset className="verify">
              <legend>Verify in lab (not confirmed from the guide or online)</legend>
              {step.verify.map((v, k) => {
                const key = `${step.id}:${k}`;
                return (
                  <label key={key} className="check">
                    <input type="checkbox" checked={!!session.checks[key]} onChange={(e) => updateSession(session.id, (s) => ({ ...s, checks: { ...s.checks, [key]: e.target.checked } }))} />
                    <span><Inline text={v} /></span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {step.notes?.map((n) => <GuideNote key={n} id={n} />)}
        </article>
        <aside className="run-side">
          <LivePane def={def} data={data} analysis={analysis} kind={step.live} />
        </aside>
      </div>
      {step.live && (
        <div className="run-live-mobile">
          <LivePane def={def} data={data} analysis={analysis} kind={step.live} />
        </div>
      )}
      <nav className="step-nav" aria-label="Step navigation">
        <button type="button" className="btn big" disabled={i === 0} onClick={() => goStep(i - 1)}>Back</button>
        <ol className="step-dots" aria-hidden="true">
          {steps.map((s, k) => <li key={s.id} className={k === i ? "on" : k < i ? "past" : ""} />)}
        </ol>
        <button type="button" className="btn primary big" disabled={i === steps.length - 1} onClick={() => goStep(i + 1)}>Next</button>
      </nav>
    </div>
  );
}
