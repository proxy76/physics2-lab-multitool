import { useState } from "react";
import { Field } from "../../components/Field";
import { download } from "../../components/Plot";
import { toast } from "../../components/Toast";
import { useEngineStatus } from "../../lib/engine";
import { payloadOf } from "../../lib/share";
import { resetAll, updateSettings, useAppState, type Settings } from "../../lib/store";

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      {options.map(([v, l]) => (
        <label key={v} className={`choice-opt${v === value ? " on" : ""}`}>
          <input type="radio" name={label} checked={v === value} onChange={() => onChange(v)} />
          {l}
        </label>
      ))}
    </fieldset>
  );
}

export function SettingsPage() {
  const s = useAppState((x) => x.settings);
  const sessions = useAppState((x) => x.sessions);
  const engine = useEngineStatus();
  const [confirm, setConfirm] = useState("");
  const set = (p: Partial<Settings>) => updateSettings(p);
  return (
    <div className="page settings">
      <h1>Settings</h1>
      <Choice label="Theme" value={s.theme} onChange={(theme) => set({ theme })}
        options={[["dark", "Dark"], ["darkroom", "Dark-room (red, dim)"], ["light", "Light"]]} />
      <Choice label="This phone's role (highlights your steps)" value={s.role || ("" as Settings["role"])} onChange={(role) => set({ role })}
        options={[["" as Settings["role"], "Show all"], ["OP", "OP — operator"], ["RD", "RD — reader"], ["AN", "AN — analyst"]]} />
      <Choice label="Constants" value={s.constants} onChange={(constants) => set({ constants })}
        options={[["codata", "CODATA 2022 / SI 2019 (default)"], ["guide", "Guide's rounded values (e = 1.6×10⁻¹⁹ …)"]]} />
      <Field label="Outlier threshold (|studentised residual|)" value={s.outlierThreshold} onChange={(v) => set({ outlierThreshold: v })} hint="default 2.5" />
      <Choice label="Digits shown when you tap a result (full precision)" value={String(s.fullDigits)} onChange={(d) => set({ fullDigits: Number(d) })}
        options={[["6", "6"], ["10", "10"], ["15", "15"], ["20", "20"], ["30", "30"]]} />
      <label className="check">
        <input type="checkbox" checked={s.roundUp} onChange={(e) => set({ roundUp: e.target.checked })} />
        <span>Round uncertainties up (GUM 7.2.6 permits it; off by default)</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={s.selfcheck} onChange={(e) => set({ selfcheck: e.target.checked })} />
        <span>Precision self-check: recompute every analysis at 100 digits and compare (slower)</span>
      </label>
      <section>
        <h2>Your data</h2>
        <p className="muted">{Object.keys(sessions).length} session(s), saved on this device automatically.</p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => download("lab-companion-all.json", JSON.stringify({ sessions: Object.values(sessions).map(payloadOf) }, null, 1), "application/json")}>Export everything (JSON)</button>
        </div>
        <Field label="Type RESET to delete every session on this device" text value={confirm} onChange={setConfirm} />
        <button type="button" className="btn danger" disabled={confirm !== "RESET"} onClick={() => { resetAll(); setConfirm(""); toast("All data deleted"); }}>Delete all data</button>
      </section>
      <section>
        <h2>About</h2>
        <p className="small">Engine: {engine.detail}{engine.ms ? `, started in ${(engine.ms / 1000).toFixed(1)} s` : ""}. All arithmetic in mpmath at 50 digits, in a Web Worker, offline.</p>
        <p className="small muted">Sources: CODATA 2022 (NIST), NIST XCOM, NIST ASD, NNDC/LNHB, NIST StRD. See docs/SOURCES.md in the repository.</p>
      </section>
    </div>
  );
}
