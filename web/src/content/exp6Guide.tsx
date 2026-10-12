// Exp 6 beginner helpers: the live "the app calculated" panels of the Run steps and the guided
// step-by-step analysis (§6.5–6.7) for one material at a time. Every number comes from the engine
// (extra.guide); this file only lays them out next to the formula they came from.
import { useEffect, useState, type ReactNode } from "react";
import { Field } from "../components/Field";
import { Plot } from "../components/Plot";
import { Tex } from "../components/Tex";
import type { EngineResult, Step } from "../lib/engineTypes";
import { go } from "../lib/router";
import { getPath, setPath } from "../lib/store";
import type { AnalysisProps } from "./types";

export const MATS = ["Al", "Fe", "Pb"] as const;

interface GRow {
  id: string; no: string; shared: boolean; excluded: boolean; x: string; t: string; t_default: boolean;
  H: string; L: string; R: string; RmL: string; A: string; rate: string; ln: string; ratio: string;
}
interface Axis { from: string; to: string; per_cm: string; per_mm: string; fill_pct: string }
interface GFit {
  n: number; a: string; b: string; s_a: string; s_b: string; R2: string; mu: string; s_mu: string; mu_r: string; unc_r: string;
  report: string; unc_digits: number | null; rel_pct: string; check: { x1: string; y1: string; x2: string; y2: string };
  sums: { x: string; y: string; xx: string; xy: string; yy: string }[]; totals: { x: string; y: string; xx: string; xy: string; yy: string }; steps: Step[];
}
interface Guide {
  symbol: string; name: string; Z: string; rho: string; rows: GRow[]; n: number; ready: boolean; has_zero: boolean;
  mu_ref?: string; x_e?: string; factor?: string; factor_ok?: boolean;
  graph?: { paper: string; x: Axis; y: Axis; points: { x: string; y: string }[] };
  xcom?: { mu: string; dev_pct: string; z: string | null; ok: boolean };
  fit?: GFit;
  conclusion?: Record<string, string>;
  graph_mu?: { mu: string; latex: string; mu_max?: string; mu_min?: string; sigma?: string; sigma_latex?: string; report?: string | null;
    q6?: { graph: string; lsq: string; diff: string; z: string | null; significant: boolean | null; rel_pct?: string } };
}

const guideOf = (r: EngineResult | null, sym: string): Guide | undefined => r?.extra?.guide?.[sym];
const NAMES: Record<string, string> = { Al: "aluminium", Fe: "iron", Pb: "lead" };
const used = (g: Guide) => g.rows.filter((x) => !x.excluded);

/** The three cell formulas of one table row, with that row's numbers in them. */
export function WorkedRow({ row }: { row: GRow }) {
  return (
    <div className="calc num">
      <p><span>Area = ½ · (R − L) · H</span> <span>= ½ · ({row.R} − {row.L}) · {row.H}</span> <span>= ½ · {row.RmL} · {row.H}</span> <span>= <b>{row.A}</b> counts</span></p>
      <p><span>Area/t = {row.A} / {row.t}</span> <span>= <b>{row.rate}</b> s⁻¹</span></p>
      <p><span>ln(Area/t) = ln({row.rate})</span> <span>= <b>{row.ln}</b></span></p>
    </div>
  );
}

function RowsTable({ g, full }: { g: Guide; full?: boolean }) {
  return (
    <div className="table-scroll">
      <table className="rich-table num">
        <thead>
          <tr>
            <th>No</th><th>x (cm)</th>
            {full && <><th>t (s)</th><th>H</th><th>L</th><th>R</th><th>R − L</th></>}
            <th>Area</th><th>Area/t (s⁻¹)</th><th>ln(Area/t)</th>{!full && <th>drop ×</th>}
          </tr>
        </thead>
        <tbody>
          {g.rows.map((r) => (
            <tr key={r.id} className={r.excluded ? "excluded" : undefined}>
              <td>{r.no}{r.shared ? "*" : ""}</td><td>{r.x}</td>
              {full && <><td>{r.t}</td><td>{r.H}</td><td>{r.L}</td><td>{r.R}</td><td>{r.RmL}</td></>}
              <td>{r.A}</td><td>{r.rate}</td><td>{r.ln}</td>{!full && <td>{r.ratio || "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {g.rows.some((r) => r.shared) && <p className="muted small">* the shared x = 0 spectrum (Run step “No absorber”).</p>}
    </div>
  );
}

function FactorNote({ g }: { g: Guide }) {
  if (!g.has_zero) return <p className="calc-warn">No x = 0 measurement yet: the app needs it to know how much the rate has dropped.</p>;
  if (!g.factor) return null;
  return g.factor_ok ? (
    <p className="calc-ok">✓ Area/t has dropped ×{g.factor} — at least e ≈ 2.72, as the guide requires. Enough thicknesses for {g.symbol} once you have 5–7 rows.</p>
  ) : (
    <p className="calc-warn">Area/t has dropped only ×{g.factor} so far; the guide needs at least ×2.72 (e). Add more {g.symbol} sheets — aim for a total of about {g.x_e} cm.</p>
  );
}

// --------------------------------------------------------------------------------- Run step panels

/** Under the x = 0 entry: the three cells of the no-absorber row. */
export function zeroPanel(r: EngineResult | null) {
  const row = MATS.map((m) => guideOf(r, m)?.rows.find((x) => x.shared || x.x === "0")).find(Boolean);
  if (!row) return <p className="calc-wait">Type L, R and H above — the app then computes the area of the triangle here.</p>;
  return (
    <section className="calc-panel" aria-live="polite">
      <p className="calc-title">The app calculated (x = 0)</p>
      <WorkedRow row={row} />
      <p className="muted small">This is your I₀: every later spectrum is compared with this rate.</p>
    </section>
  );
}

/** Under a material's row entry: the newest row worked out, the table so far and the e-factor check. */
export function materialPanel(sym: string) {
  return function MaterialPanel(r: EngineResult | null): ReactNode {
    const g = guideOf(r, sym);
    const rows = g ? used(g) : [];
    const last = rows.filter((x) => !x.shared).pop();
    if (!g || !last)
      return <p className="calc-wait">After you type x, L, R and H for a {sym} stack, the app computes Area, Area/t and ln(Area/t) here and tells you when you have enough sheets.</p>;
    return (
      <section className="calc-panel" aria-live="polite">
        <p className="calc-title">The app calculated (row {last.no}, x = {last.x} cm)</p>
        <WorkedRow row={last} />
        <FactorNote g={g} />
        <details className="calc-more">
          <summary>Your {sym} table so far ({rows.length} rows)</summary>
          <RowsTable g={g} />
        </details>
      </section>
    );
  };
}

/** "Material done" step: the result from this one table, with a link to the full worked analysis. */
export function materialResult(sym: string) {
  return function MaterialResult(r: EngineResult | null): ReactNode {
    const g = guideOf(r, sym);
    if (!g?.fit)
      return (
        <p className="calc-warn">
          Not enough {sym} data yet: {g ? `${g.n} usable thickness${g.n === 1 ? "" : "es"}` : "no rows"}. The app needs at least 3 (x = 0 counts) — the guide wants 5–7. Go back one step and add rows.
        </p>
      );
    const plot = r?.plots.find((p) => p.id === `fit.${sym}`);
    return (
      <section className="calc-panel" aria-live="polite">
        <p className="calc-title">Your {NAMES[sym] ?? sym} result, from the {sym} table alone</p>
        <p className="calc-big num">μ<sub>{sym}</sub> = {g.fit.report}</p>
        {g.xcom && <p className="small">NIST reference {g.xcom.mu} cm⁻¹: yours differs by {g.xcom.dev_pct} % {g.xcom.ok ? "✓ (compatible)" : "— check the triangle readings and the thicknesses"}.</p>}
        <FactorNote g={g} />
        {plot && <Plot plot={plot} />}
        <p><button type="button" className="btn" onClick={() => go(`exp/6/analysis/${sym}`)}>Step-by-step analysis for {sym} →</button></p>
      </section>
    );
  };
}

// --------------------------------------------------------------------------------- Analysis tab

function GStep({ n, title, guide, children }: { n: string; title: string; guide?: string; children: ReactNode }) {
  return (
    <section className="ga-step">
      <h3><span className="ga-num">{n}</span>{title}{guide && <span className="ga-ref"> {guide}</span>}</h3>
      {children}
    </section>
  );
}

// A phone is narrow: the list of sums goes one per line and the result gets its own line
// (Tex stacks the parts separated by \qquad).
const stackList = (tex: string) => tex.replace(/,\\ /g, String.raw`\qquad `);

function FitStep({ s }: { s: Step }) {
  const sub = s.result ? String.raw`${s.substituted}\qquad =${s.result}` : s.substituted;
  return (
    <div className="ga-formula">
      <p className="ga-formula-title">{s.title}</p>
      <Tex tex={stackList(s.latex)} display />
      <Tex tex={stackList(sub)} display />
    </div>
  );
}

export function Exp6Analysis({ data, setData, result, pending, sub }: AnalysisProps) {
  const fromRoute = MATS.includes(sub as never) ? (sub as string) : null;
  const [sym, setSym] = useState<string>(fromRoute ?? "Al");
  const [rowSel, setRowSel] = useState<string | null>(null);
  useEffect(() => {
    if (fromRoute) setSym(fromRoute);
  }, [fromRoute]);
  const mi = Math.max(0, (data?.materials ?? []).findIndex((m: { symbol: string }) => m.symbol === sym));
  const g = guideOf(result, sym);
  const fit = g?.fit;
  const gp = (k: string) => `materials.${mi}.graphical.${k}`;
  const field = (k: string, label: string, unit = "") => (
    <Field key={k} label={label} unit={unit} signed value={String(getPath(data, gp(k)) ?? "")} onChange={(v) => setData(setPath(data, gp(k), v))} />
  );
  const row = g?.rows.find((r) => r.id === rowSel) ?? g?.rows.find((r) => !r.shared && !r.excluded) ?? g?.rows[0];
  const plot = result?.plots.find((p) => p.id === `fit.${sym}`);

  return (
    <div className="ga">
      <p className="ga-intro">
        The guide's data analysis (§6.5), uncertainty (§6.6) and conclusions (§6.7), one material at a time. Fill one material's table
        (Run or Data tab) and everything below is calculated from that table alone, with every number shown in its formula so you can
        copy it into your report.
      </p>
      <div className="chips" role="tablist" aria-label="Material">
        {MATS.map((m) => (
          <button key={m} type="button" role="tab" aria-selected={m === sym} className={`chip${guideOf(result, m)?.fit ? " done" : ""}`}
            onClick={() => { setSym(m); setRowSel(null); }}>
            {m} — {NAMES[m]}
          </button>
        ))}
      </div>

      {!result ? (
        <p className="muted live-wait">{pending ? "Analysing…" : "Enter data first: the analysis appears as soon as the engine can run."}</p>
      ) : !g ? (
        <p className="calc-warn">No {NAMES[sym]} data yet. Fill the {sym} table in the Run tab (or Data → {sym}) and come back.</p>
      ) : (
        <>
          {!g.ready && (
            <p className="calc-warn">
              You have {g.n} usable thickness{g.n === 1 ? "" : "es"} for {sym}. The fit needs at least 3 (x = 0 counts); the guide wants 5–7.
              Steps 1–2 work already; steps 3–7 appear when there are enough rows.
            </p>
          )}

          <GStep n="1" title="Turn Lambert's law into a straight line" guide="§6.5.1 · Q1">
            <p>The guide's law (6.2) is a curve. Take the natural logarithm of both sides:</p>
            <Tex tex={String.raw`I=I_0e^{-\mu x}\ \Rightarrow\ \ln I=\ln I_0-\mu x`} display />
            <p>
              The photopeak <b>Area</b> is proportional to I·t, so I ∝ Area/t. This is the straight line <b>y = a·x + b</b> with
              y = ln(Area/t), x = thickness, slope <b>a = −μ</b> and intercept b = ln I₀. So: <b>μ = −slope</b>. This is also your answer to Q1.
            </p>
          </GStep>

          <GStep n="2" title={`Complete the ${sym} table`} guide="§6.4 table">
            <p>You measured x, t, H, L and R. The last three columns are calculated. The app's values:</p>
            <RowsTable g={g} full />
            <p className="ga-sub">How each calculated cell is made — tap a row number to see its numbers:</p>
            <div className="chips" role="tablist" aria-label="Row">
              {g.rows.map((r) => (
                <button key={r.id} type="button" role="tab" aria-selected={row?.id === r.id} className="chip" onClick={() => setRowSel(r.id)}>
                  No {r.no}{r.shared ? "*" : ""}
                </button>
              ))}
            </div>
            {row && <WorkedRow row={row} />}
            <ul className="ga-tips">
              <li><b>Area</b> (counts): the triangle under the photopeak, Fig. 6.4. Write it as a whole number.</li>
              <li><b>Area/t</b> (s⁻¹): divides out the measuring time, so spectra of different lengths compare. 4 significant digits are plenty.</li>
              <li><b>ln(Area/t)</b>: the “ln” key of your calculator, applied to Area/t. Write 3 decimals. This is the y of your graph.</li>
            </ul>
          </GStep>

          {g.graph && (
            <GStep n="3" title="Draw the graph on millimetre paper" guide="§6.5.2">
              <p>Plot <b>ln(Area/t)</b> on the vertical axis against <b>thickness x</b> on the horizontal axis. Suggested scales for {g.graph.paper} (18 cm wide, 27 cm tall):</p>
              <div className="table-scroll">
              <table className="rich-table">
                <thead><tr><th>Axis</th><th>Start at</th><th>1 cm of paper</th><th>1 mm of paper</th><th>Ends at</th></tr></thead>
                <tbody>
                  <tr><td>Horizontal: x (cm)</td><td className="num">{g.graph.x.from}</td><td className="num">{g.graph.x.per_cm} cm</td><td className="num">{g.graph.x.per_mm} cm</td><td className="num">{g.graph.x.to}</td></tr>
                  <tr><td>Vertical: ln(Area/t)</td><td className="num">{g.graph.y.from}</td><td className="num">{g.graph.y.per_cm}</td><td className="num">{g.graph.y.per_mm}</td><td className="num">{g.graph.y.to}</td></tr>
                </tbody>
              </table>
              </div>
              <p>Mark one small cross for each point:</p>
              <div className="table-scroll">
                <table className="rich-table num">
                  <thead><tr><th>Point</th>{g.graph.points.map((_, i) => <th key={i}>{i + 1}</th>)}</tr></thead>
                  <tbody>
                    <tr><td>x (cm)</td>{g.graph.points.map((p, i) => <td key={i}>{p.x}</td>)}</tr>
                    <tr><td>ln(Area/t)</td>{g.graph.points.map((p, i) => <td key={i}>{p.y}</td>)}</tr>
                  </tbody>
                </table>
              </div>
              <p className="muted small">Label the axes with the quantity and unit, give the graph a title (“ln(Area/t) vs thickness, {NAMES[sym]}”). The points should lie close to a falling straight line.</p>
              {plot && <Plot plot={plot} />}
            </GStep>
          )}

          {fit && (
            <>
              <GStep n="4" title="μ from your graph (graphical method)" guide="§6.5.3">
                <ol>
                  <li>With a ruler, draw <b>one straight line</b> that passes as close as possible to all the points (about as many points above it as below). It does not have to touch any point.</li>
                  <li>Choose two points <b>on your line</b> (not data points), far apart — near the left and right ends of the line.</li>
                  <li>Read their coordinates from the paper and type them here:</li>
                </ol>
                <div className="param-grid">
                  {field("x1", "P₁ x", "cm")}{field("y1", "P₁ ln(Area/t)")}{field("x2", "P₂ x", "cm")}{field("y2", "P₂ ln(Area/t)")}
                </div>
                <p className="muted small">
                  Check: the least-squares line passes through ({fit.check.x1}, {fit.check.y1}) and ({fit.check.x2}, {fit.check.y2}). A good hand-drawn line is close to these.
                </p>
                {g.graph_mu ? (
                  <div className="calc">
                    <Tex tex={g.graph_mu.latex} display />
                    <p>μ<sub>graph</sub> = <b className="num">{g.graph_mu.mu} cm⁻¹</b> (the minus sign because the line falls).</p>
                  </div>
                ) : <p className="calc-wait">Type both points: the app then computes μ = −(y₂ − y₁)/(x₂ − x₁) here.</p>}
                <details className="calc-more">
                  <summary>Optional: uncertainty of the graphical μ (needed for Q6)</summary>
                  <p>Draw the <b>steepest</b> and the <b>shallowest</b> lines that still pass reasonably through the points. Read two points on each:</p>
                  <div className="param-grid">
                    {field("max_x1", "Steepest P₁ x", "cm")}{field("max_y1", "Steepest P₁ y")}{field("max_x2", "Steepest P₂ x", "cm")}{field("max_y2", "Steepest P₂ y")}
                    {field("min_x1", "Shallowest P₁ x", "cm")}{field("min_y1", "Shallowest P₁ y")}{field("min_x2", "Shallowest P₂ x", "cm")}{field("min_y2", "Shallowest P₂ y")}
                  </div>
                  {g.graph_mu?.sigma_latex && (
                    <div className="calc">
                      <p>Steepest line μ = {g.graph_mu.mu_max}, shallowest μ = {g.graph_mu.mu_min} cm⁻¹.</p>
                      <Tex tex={g.graph_mu.sigma_latex} display />
                      {g.graph_mu.report && <p>μ<sub>graph</sub> = <b className="num">{g.graph_mu.report}</b></p>}
                    </div>
                  )}
                </details>
              </GStep>

              <GStep n="5" title="μ by the least-squares method" guide="§6.5.4 · Appendix B">
                <p>Make this helper table (y = ln(Area/t)) and add up every column — the Σ row:</p>
                <div className="table-scroll">
                  <table className="rich-table num">
                    <thead><tr><th>i</th><th>x</th><th>y</th><th>x²</th><th>x·y</th><th>y²</th></tr></thead>
                    <tbody>
                      {fit.sums.map((s, i) => <tr key={i}><td>{i + 1}</td><td>{s.x}</td><td>{s.y}</td><td>{s.xx}</td><td>{s.xy}</td><td>{s.yy}</td></tr>)}
                      <tr className="sum-row"><td>Σ</td><td>{fit.totals.x}</td><td>{fit.totals.y}</td><td>{fit.totals.xx}</td><td>{fit.totals.xy}</td><td>{fit.totals.yy}</td></tr>
                    </tbody>
                  </table>
                </div>
                <p>Then put the sums into the guide's formulas (n = {fit.n} points):</p>
                {fit.steps.map((s) => <FitStep key={s.title} s={s} />)}
                <div className="calc">
                  <Tex tex={String.raw`\mu=-a=${fit.mu}\ \mathrm{cm^{-1}},\qquad \sigma_\mu=s_a=${fit.s_mu}\ \mathrm{cm^{-1}}`} display />
                </div>
                <p className="muted small">If you rounded ln(Area/t) to 3 decimals, your sums can differ in the last digit — that is normal.</p>
              </GStep>

              <GStep n="6" title="Uncertainty and rounding" guide="§6.6">
                <p>The guide takes the uncertainty of μ from the slope: <b>σ<sub>μ</sub> = s<sub>a</sub> = {fit.s_mu} cm⁻¹</b>.</p>
                <ol>
                  <li>Round σ to <b>1 significant digit</b> (2 if its first digit is 1): here {fit.unc_digits === 2 ? "it starts with 1, so keep 2 digits" : "keep 1 digit"} → <b className="num">{fit.unc_r}</b>.</li>
                  <li>Round μ to the <b>same decimal place</b>: {fit.mu} → <b className="num">{fit.mu_r}</b>.</li>
                </ol>
                <p className="calc-big num">μ<sub>{sym}</sub> = {fit.report}</p>
                <p className="small">Relative uncertainty σ/μ = {fit.rel_pct} %.</p>
              </GStep>

              <GStep n="7" title="Your row of the conclusions table" guide="§6.7">
                {g.conclusion && (
                  <div className="table-scroll">
                    <table className="rich-table num">
                      <thead><tr><th>Material</th><th>μ (cm⁻¹)</th><th>Uncertainty (cm⁻¹)</th><th>Z</th><th>Density (g/cm³)</th><th>μ/ρ (cm²/g)</th></tr></thead>
                      <tbody><tr><td>{g.conclusion.material}</td><td>{g.conclusion.mu}</td><td>{g.conclusion.unc}</td><td>{g.conclusion.Z}</td><td>{g.conclusion.rho}</td><td>{g.conclusion.mu_rho}{g.conclusion.s_mu_rho ? ` ± ${g.conclusion.s_mu_rho}` : ""}</td></tr></tbody>
                    </table>
                  </div>
                )}
                {g.xcom && (
                  <p>
                    NIST XCOM reference: μ = {g.xcom.mu} cm⁻¹. Yours differs by {g.xcom.dev_pct} %{g.xcom.z ? `, z = ${g.xcom.z}` : ""}
                    {g.xcom.ok ? " → compatible (z ≤ 2)." : " → not compatible (z > 2): re-check the thicknesses and the triangle readings."}
                  </p>
                )}
                <FactorNote g={g} />
                {g.graph_mu?.q6 && (
                  <p className="calc">
                    Q6 — graph vs least squares: μ<sub>graph</sub> = {g.graph_mu.q6.graph}, μ<sub>LSQ</sub> = {g.graph_mu.q6.lsq}, difference {g.graph_mu.q6.diff} cm⁻¹
                    {g.graph_mu.q6.z ? `, z = ${g.graph_mu.q6.z} → ${g.graph_mu.q6.significant ? "significant (z > 2)" : "not significant (z ≤ 2)"}.` : ` (${g.graph_mu.q6.rel_pct} %). Add the steepest/shallowest lines in step 4 to test significance.`}
                  </p>
                )}
                <p className="muted small">Do the same for the other two materials (chips at the top). The Results tab collects all three rows for the report.</p>
              </GStep>
            </>
          )}
        </>
      )}
    </div>
  );
}
