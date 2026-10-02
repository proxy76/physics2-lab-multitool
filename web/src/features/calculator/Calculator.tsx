// Generic tools G1–G8. Each tool is a small form whose values (strings) go straight to the engine.
import { useState } from "react";
import { Field } from "../../components/Field";
import { GenericResult } from "../../components/ResultView";
import { useAnalysis, useEngineStatus } from "../../lib/engine";
import { go } from "../../lib/router";

type F = { key: string; label: string; unit?: string; text?: boolean; area?: boolean; hint?: string; options?: { value: string; label: string }[]; when?: (v: Record<string, string>) => boolean };

interface Tool {
  id: string;
  code: string;
  title: string;
  blurb: string;
  engine: string;
  fields: F[];
  defaults: Record<string, string>;
  build?: (v: Record<string, string>, extra: Extra) => unknown;
  custom?: "propagate";
}

interface Extra {
  vars: { name: string; value: string; sigma: string }[];
  corr: string[][];
}

const has = (k: string, ...vals: string[]) => (v: Record<string, string>) => vals.includes(v[k]);

const TOOLS: Tool[] = [
  {
    id: "stats", code: "G1", title: "Descriptive statistics", blurb: "Mean, s (N − 1), standard error s/√N, min, max.", engine: "stats",
    fields: [{ key: "values", label: "Values (one per line, or separated by ; or spaces)", area: true }, { key: "unit", label: "Unit", text: true }, { key: "true_mean", label: "True mean (optional, eq. A.1)" }],
    defaults: { values: "", unit: "", true_mean: "" },
  },
  {
    id: "counting", code: "G2", title: "Counting statistics", blurb: "√N, rates, background subtraction, ratios and the counting-time planner (App. A.3).", engine: "counting",
    fields: [
      { key: "mode", label: "Calculation", options: [{ value: "rate", label: "Rate n = N/t (and background)" }, { value: "count", label: "σ of a count, √N" }, { value: "planner", label: "Counting-time planner" }, { value: "ratio", label: "Ratio of two rates" }, { value: "product", label: "Product of two rates" }] },
      { key: "N", label: "Counts N", when: has("mode", "rate", "count") }, { key: "t", label: "Time t", unit: "s", when: has("mode", "rate") },
      { key: "Nb", label: "Background counts N_b (optional)", when: has("mode", "rate") }, { key: "tb", label: "Background time t_b", unit: "s", when: has("mode", "rate") },
      { key: "n", label: "Net rate n", unit: "s⁻¹", when: has("mode", "planner") }, { key: "eps", label: "Target relative precision", unit: "%", when: has("mode", "planner") },
      { key: "nb", label: "Background rate n_b (optional)", unit: "s⁻¹", when: has("mode", "planner") }, { key: "tb", label: "Background time t_b", unit: "s", when: has("mode", "planner") },
      { key: "n1", label: "n₁", when: has("mode", "ratio", "product") }, { key: "s1", label: "σ₁", when: has("mode", "ratio", "product") },
      { key: "n2", label: "n₂", when: has("mode", "ratio", "product") }, { key: "s2", label: "σ₂", when: has("mode", "ratio", "product") },
    ],
    defaults: { mode: "rate", N: "", t: "100", Nb: "", tb: "600", n: "", eps: "3", nb: "" },
  },
  {
    id: "linfit", code: "G3", title: "Linear least squares", blurb: "y = a·x + b (Appendix B), through the origin, or weighted; residuals, cov(a,b), inverse prediction.", engine: "linfit",
    fields: [
      { key: "mode", label: "Model", options: [{ value: "ols", label: "y = a·x + b (guide, App. B)" }, { value: "origin", label: "y = a·x (through origin)" }, { value: "weighted", label: "Weighted, with σ_y" }] },
      { key: "x", label: "x values", area: true }, { key: "y", label: "y values", area: true },
      { key: "sy", label: "σ_y values", area: true, when: has("mode", "weighted") },
      { key: "xunit", label: "x unit", text: true }, { key: "yunit", label: "y unit", text: true },
      { key: "y0", label: "Inverse prediction: measured y₀ (optional)", when: has("mode", "ols", "weighted") }, { key: "sy0", label: "σ of y₀", when: has("mode", "ols", "weighted") },
    ],
    defaults: { mode: "ols", x: "", y: "", sy: "", xunit: "", yunit: "", y0: "", sy0: "" },
  },
  {
    id: "quick", code: "G4", title: "Propagation — quick rules", blurb: "Exp. 2 Q3 rules: σ for x ± y; relative σ for x·y, x/y, xᵏ, c·x.", engine: "propagate.quick",
    fields: [
      { key: "rule", label: "f =", options: [{ value: "sum", label: "x + y" }, { value: "diff", label: "x − y" }, { value: "product", label: "x · y" }, { value: "quotient", label: "x / y" }, { value: "power", label: "x^k" }, { value: "scale", label: "c · x" }] },
      { key: "x", label: "x" }, { key: "sx", label: "σ_x" },
      { key: "y", label: "y", when: has("rule", "sum", "diff", "product", "quotient") }, { key: "sy", label: "σ_y", when: has("rule", "sum", "diff", "product", "quotient") },
      { key: "k", label: "k or c", when: has("rule", "power", "scale") },
    ],
    defaults: { rule: "product", x: "", sx: "", y: "", sy: "", k: "" },
  },
  {
    id: "propagate", code: "G4", title: "Propagation — any expression", blurb: "Type f(x, y, …); SymPy differentiates, mpmath evaluates. Uncertainty budget, correlations, Monte Carlo check.", engine: "propagate",
    fields: [{ key: "expr", label: "f =", text: true, hint: "e.g. sqrt(B/(x-A)), ln(I0/I)/x; functions: sqrt exp log ln sin cos tan …" }, { key: "unit", label: "Unit of f", text: true },
      { key: "mc", label: "Monte Carlo cross-check", options: [{ value: "", label: "Off" }, { value: "1", label: "On (2×10⁵ samples)" }] }],
    defaults: { expr: "", unit: "", mc: "" },
    custom: "propagate",
    build: (v, e) => ({ expr: v.expr, unit: v.unit, mc: !!v.mc, mc_n: 200000, variables: e.vars, corr: e.corr }),
  },
  {
    id: "graphical", code: "G5", title: "Graphical method", blurb: "Slope from two points on your drawn line, max/min slopes, and A4 millimetre-paper scales.", engine: "graphical",
    fields: [
      { key: "mode", label: "Tool", options: [{ value: "two_point", label: "Slope from two points" }, { value: "max_min", label: "Max/min slope uncertainty" }, { value: "scale", label: "A4 axis scales" }] },
      ...["x1", "y1", "x2", "y2"].map((k) => ({ key: k, label: `${k.toUpperCase()[0]}${k[1] === "1" ? "₁" : "₂"} (${k[0]})`, when: has("mode", "two_point") })),
      ...["max_x1", "max_y1", "max_x2", "max_y2", "min_x1", "min_y1", "min_x2", "min_y2"].map((k) => ({ key: k, label: k.replace("_", " line ").replace("max", "steepest").replace("min", "shallowest"), when: has("mode", "max_min") })),
      { key: "x", label: "x data", area: true, when: has("mode", "scale") }, { key: "y", label: "y data", area: true, when: has("mode", "scale") },
      { key: "landscape", label: "Paper", options: [{ value: "", label: "A4 portrait (18 × 27 cm)" }, { value: "1", label: "A4 landscape (27 × 18 cm)" }], when: has("mode", "scale") },
      { key: "zero_x", label: "Include x = 0", options: [{ value: "", label: "No" }, { value: "1", label: "Yes" }], when: has("mode", "scale") },
      { key: "zero_y", label: "Include y = 0", options: [{ value: "", label: "No" }, { value: "1", label: "Yes" }], when: has("mode", "scale") },
    ],
    defaults: { mode: "two_point" },
    build: (v) => ({ ...v, landscape: !!v.landscape, zero_x: !!v.zero_x, zero_y: !!v.zero_y }),
  },
  {
    id: "report", code: "G6", title: "Report & compare", blurb: "Applies the lab rounding rule; compares with a reference (z, %) or with a second value of your own.", engine: "report",
    fields: [{ key: "value", label: "Value" }, { key: "unc", label: "Uncertainty" }, { key: "unit", label: "Unit", text: true },
      { key: "ref", label: "Reference value (optional)" }, { key: "sref", label: "Reference uncertainty" },
      { key: "value2", label: "Second value of yours (optional)" }, { key: "unc2", label: "Its uncertainty" }],
    defaults: { value: "", unc: "", unit: "", ref: "", sref: "", value2: "", unc2: "" },
  },
  {
    id: "units", code: "G7", title: "Units & constants", blurb: "eV ↔ J; nm ↔ Hz ↔ eV ↔ cm⁻¹; Bq ↔ Ci; lengths, densities, kV. Constants with sources.", engine: "units",
    fields: [{ key: "value", label: "Value" }, { key: "from", label: "From", options: ["nm", "Hz", "THz", "eV", "J", "cm⁻¹", "m", "cm", "mm", "µm", "Å", "pm", "Bq", "kBq", "MBq", "Ci", "mCi", "µCi", "g/cm³", "kg/m³", "V", "kV", "mV", "s", "min", "h", "d", "y", "cm²/g", "m²/kg"].map((u) => ({ value: u, label: u })) }],
    defaults: { value: "", from: "nm" },
  },
  {
    id: "decay", code: "G8", title: "Decay correction", blurb: "A = A₀·2^(−Δt/T½); default ¹³⁷Cs T½ = 30.08 y (NNDC).", engine: "decay",
    fields: [{ key: "A0", label: "Reference activity A₀" }, { key: "sA0", label: "σ of A₀" }, { key: "unit", label: "Unit", text: true },
      { key: "date_ref", label: "Reference date", text: true, hint: "YYYY-MM-DD" }, { key: "date", label: "Measurement date", text: true, hint: "YYYY-MM-DD" },
      { key: "T_half", label: "Half-life T½ (empty = ¹³⁷Cs)", unit: "y" }],
    defaults: { A0: "", sA0: "", unit: "Bq", date_ref: "", date: new Date().toISOString().slice(0, 10), T_half: "" },
  },
];

function ConstantsTable() {
  const a = useAnalysis("constants", {}, true, 0);
  const rows = a.result?.extra?.constants as { symbol: string; value: string; unit: string; source: string; description: string }[] | undefined;
  if (!rows) return null;
  return (
    <div className="table-scroll">
      <table className="rich-table">
        <thead><tr><th>Quantity</th><th>Value</th><th>Unit</th><th>Source</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.symbol + r.value}><td>{r.description}</td><td className="num">{r.value}</td><td>{r.unit}</td><td className="small">{r.source}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function ToolView({ tool }: { tool: Tool }) {
  const [v, setV] = useState<Record<string, string>>(tool.defaults);
  const [extra, setExtra] = useState<Extra>({ vars: [{ name: "x", value: "", sigma: "" }, { name: "y", value: "", sigma: "" }], corr: [] });
  const params = tool.build ? tool.build(v, extra) : v;
  const filled = Object.entries(v).some(([k, x]) => x && x !== tool.defaults[k]) || extra.vars.some((x) => x.value);
  const a = useAnalysis(tool.engine, params, filled, 400);
  const status = useEngineStatus();
  const set = (k: string, x: string) => setV((o) => ({ ...o, [k]: x }));
  return (
    <section className="tool">
      <header>
        <h2><span className="tool-code">{tool.code}</span> {tool.title}</h2>
        <p className="muted">{tool.blurb}</p>
      </header>
      <div className="tool-form">
        {tool.fields.filter((f) => !f.when || f.when(v)).map((f) =>
          f.area ? (
            <label key={f.key} className="field area">
              <span className="field-label">{f.label}</span>
              <textarea className="num" rows={4} inputMode="decimal" value={v[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            </label>
          ) : (
            <Field key={f.key} label={f.label} unit={f.unit} text={f.text} hint={f.hint} options={f.options} signed value={v[f.key] ?? ""} onChange={(x) => set(f.key, x)} />
          ),
        )}
        {tool.custom === "propagate" && (
          <div className="vars">
            <h3>Variables</h3>
            {extra.vars.map((x, i) => (
              <div key={i} className="var-row">
                <Field label="name" text value={x.name} onChange={(n) => setExtra((e) => ({ ...e, vars: e.vars.map((y, j) => (j === i ? { ...y, name: n } : y)) }))} />
                <Field label="value" signed value={x.value} onChange={(n) => setExtra((e) => ({ ...e, vars: e.vars.map((y, j) => (j === i ? { ...y, value: n } : y)) }))} />
                <Field label="σ" value={x.sigma} onChange={(n) => setExtra((e) => ({ ...e, vars: e.vars.map((y, j) => (j === i ? { ...y, sigma: n } : y)) }))} />
              </div>
            ))}
            <div className="btn-row">
              <button type="button" className="btn small" onClick={() => setExtra((e) => ({ ...e, vars: [...e.vars, { name: String.fromCharCode(97 + e.vars.length), value: "", sigma: "" }] }))}>Add variable</button>
              {extra.vars.length > 1 && <button type="button" className="btn small ghost" onClick={() => setExtra((e) => ({ ...e, vars: e.vars.slice(0, -1) }))}>Remove last</button>}
            </div>
            {extra.vars.length > 1 && (
              <details>
                <summary>Correlations (optional)</summary>
                {extra.vars.map((xi, i) => extra.vars.slice(i + 1).map((xj, jj) => {
                  const j = i + 1 + jj;
                  return (
                    <Field key={`${i}-${j}`} label={`r(${xi.name}, ${xj.name})`} signed value={extra.corr[i]?.[j] ?? ""}
                      onChange={(n) => setExtra((e) => {
                        const c = extra.vars.map((_, a) => extra.vars.map((__, b) => e.corr[a]?.[b] ?? ""));
                        c[i][j] = n;
                        c[j][i] = n;
                        return { ...e, corr: c };
                      })} />
                  );
                }))}
              </details>
            )}
            <p className="muted small">Loads SymPy (≈ 6 MB, already cached offline) the first time.</p>
          </div>
        )}
      </div>
      <div className="tool-out" aria-live="polite">
        {status.status !== "ready" && <p className="muted">{status.detail}…</p>}
        {a.error && <p className="engine-error" role="alert">{a.error.message}{a.error.field ? ` (${a.error.field})` : ""}</p>}
        {a.pending && <p className="muted small">Calculating…</p>}
        {a.result && <GenericResult r={a.result} name={tool.id} />}
        {tool.id === "units" && <ConstantsTable />}
      </div>
    </section>
  );
}

export function Calculator({ tool }: { tool?: string }) {
  const t = TOOLS.find((x) => x.id === tool);
  if (t)
    return (
      <div className="page calc">
        <button type="button" className="btn ghost small back" onClick={() => go("calc")}>All tools</button>
        <ToolView key={t.id} tool={t} />
      </div>
    );
  return (
    <div className="page calc">
      <h1>Calculator</h1>
      <p className="lede">Every result is computed at 50 significant digits and reported with the lab's rounding rule. Experiment analyses live in each experiment's Results tab.</p>
      <ul className="tool-list">
        {TOOLS.map((x) => (
          <li key={x.id}>
            <a href={`#/calc/${x.id}`}>
              <span className="tool-code">{x.code}</span>
              <span className="tool-name">{x.title}</span>
              <span className="tool-blurb muted">{x.blurb}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
