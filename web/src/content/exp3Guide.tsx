// Exp 3 helpers: the live "the app calculated" panels of the Run steps and the guided analysis
// (§3.5–3.7) laid out like the final sheet: tables → λ → 1/λ² → graph 1 + LSM (B, A) → λ_H →
// λ_H⁻¹, n_i⁻² → graph 2 + LSM (R_H, s_ε², s_RH) → conclusions. Graphical method on both graphs.
// Every number comes from the engine (extra.guide): each written value is the rounded result of its
// formula applied to the values written before it, so every line can be redone on a calculator.
import type { ReactNode } from "react";
import { Field } from "../components/Field";
import { Plot } from "../components/Plot";
import { Tex } from "../components/Tex";
import type { EngineResult } from "../lib/engineTypes";
import { go } from "../lib/router";
import { getPath, setPath } from "../lib/store";
import type { AnalysisProps } from "./types";

interface HgRow { id: string; lam: string; x: string; X: string; excluded: boolean; tex: string }
interface HRow {
  id: string; line: string; line_tex: string; n: string; x: string; excluded: boolean; bad?: boolean;
  lam?: string; inv?: string; n2?: string; lam_tex?: string; inv_tex?: string; n2_tex?: string; ref?: string; dev?: string;
}
interface Axis { from: string; to: string; per_cm: string; per_mm: string }
interface Graph { paper: string; x: Axis; y: Axis; points: { x: string; y: string }[] }
interface Check { x1: string; y1: string; x2: string; y2: string }
interface Cal {
  m: number; Sx: string; Sy: string; Sxy: string; Sxx: string; B: string; A: string;
  tex: { Sx: string; Sy: string; Sxy: string; Sxx: string; num: string; den: string; B: string; A: string; line: string; lam: string };
  check: Check; graph?: Graph | null;
  graphical?: { B: string; A: string; B_tex: string; A_tex: string; dB_pct: string; dA: string };
}
interface Ryd {
  m: number; R: string; R4: string; se2: string; sR?: string; report?: string; report7?: string; unc_digits?: number; rel_pct?: string;
  R_r?: string | null; s_r?: string | null; negative: boolean; codata: string; dev_pct: string; z?: string;
  tex: { Sx: string; Sy: string; Sxy: string; Sxx: string; Syy: string; num: string; den: string; R: string; terms: string; se2: string; sR?: string; result?: string };
  check: Check; graph?: Graph | null;
  graphical?: {
    R: string; tex: string; R_max?: string; R_min?: string; sigma?: string; sigma_tex?: string; report?: string;
    diff: string; rel_pct: string; z?: string; significant?: boolean;
  };
}
interface Guide { hg: HgRow[]; h: HRow[]; stage: number; n_hg?: number; n_h?: number; cal?: Cal; ryd?: Ryd }

const guideOf = (r: EngineResult | null): Guide | undefined => r?.extra?.guide;

function GStep({ n, title, guide, children }: { n: string; title: string; guide?: string; children: ReactNode }) {
  return (
    <section className="ga-step">
      <h3><span className="ga-num">{n}</span>{title}{guide && <span className="ga-ref"> {guide}</span>}</h3>
      {children}
    </section>
  );
}

const T = ({ t }: { t: string }) => <Tex tex={t} display />;

/** Table 1 as on the sheet: one row of λ_Hg, one row of x_Hg, a column per line. */
export function HgTable({ g }: { g: Guide }) {
  return (
    <div className="table-scroll">
      <table className="rich-table num">
        <tbody>
          <tr><th>λ<sub>Hg</sub> (nm)</th>{g.hg.map((r) => <td key={r.id} className={r.excluded ? "cell-excluded" : undefined}>{r.lam}</td>)}</tr>
          <tr><th>x<sub>Hg</sub> (a.u.)</th>{g.hg.map((r) => <td key={r.id} className={r.excluded ? "cell-excluded" : undefined}>{r.x}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}

/** Table 2 as on the sheet: spectral line, principal number, x_H, λ_H. */
export function HTable({ g }: { g: Guide }) {
  return (
    <div className="table-scroll">
      <table className="rich-table num">
        <tbody>
          <tr><th>Spectral line</th>{g.h.map((r) => <td key={r.id} className={r.excluded ? "cell-excluded" : undefined}>{r.line}</td>)}</tr>
          <tr><th>Principal numbers (n<sub>i</sub>)</th>{g.h.map((r) => <td key={r.id}>{r.n}</td>)}</tr>
          <tr><th>x<sub>H</sub> (a.u.)</th>{g.h.map((r) => <td key={r.id}>{r.x}</td>)}</tr>
          <tr><th>λ<sub>H</sub> (nm)</th>{g.h.map((r) => <td key={r.id}>{r.lam ?? "—"}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}

function Scales({ graph, xLabel, yLabel }: { graph: Graph; xLabel: ReactNode; yLabel: ReactNode }) {
  return (
    <>
      <p>Suggested scales for {graph.paper} (27 cm wide, 18 cm tall). The axes do not have to start at 0:</p>
      <div className="table-scroll">
        <table className="rich-table">
          <thead><tr><th>Axis</th><th>Start at</th><th>1 cm of paper</th><th>1 mm of paper</th><th>Ends at</th></tr></thead>
          <tbody>
            <tr><td>Horizontal: {xLabel}</td><td className="num">{graph.x.from}</td><td className="num">{graph.x.per_cm}</td><td className="num">{graph.x.per_mm}</td><td className="num">{graph.x.to}</td></tr>
            <tr><td>Vertical: {yLabel}</td><td className="num">{graph.y.from}</td><td className="num">{graph.y.per_cm}</td><td className="num">{graph.y.per_mm}</td><td className="num">{graph.y.to}</td></tr>
          </tbody>
        </table>
      </div>
      <p>Mark one small cross for each point:</p>
      <div className="table-scroll">
        <table className="rich-table num">
          <tbody>
            <tr><th>{xLabel}</th>{graph.points.map((p, i) => <td key={i}>{p.x}</td>)}</tr>
            <tr><th>{yLabel}</th>{graph.points.map((p, i) => <td key={i}>{p.y}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

// --------------------------------------------------------------------------------- Run step panels

/** Under the Hg table: 1/λ² of the newest line, then the calibration line once there are 3 lines. */
export function hgPanel(r: EngineResult | null): ReactNode {
  const g = guideOf(r);
  const last = g?.hg.filter((x) => !x.excluded).pop();
  if (!g || !last) return <p className="calc-wait">Type the locator reading x for a mercury line: the app computes its 1/λ² here.</p>;
  return (
    <section className="calc-panel" aria-live="polite">
      <p className="calc-title">The app calculated (Hg {last.lam} nm, {g.hg.length} of 11 lines)</p>
      <T t={last.tex} />
      {g.cal ? (
        <>
          <p className="small">Calibration line from your {g.cal.m} lines (least squares):</p>
          <T t={g.cal.tex.line} />
        </>
      ) : <p className="calc-wait">With 3 lines or more the app fits x(λ) = A + B/λ² here.</p>}
    </section>
  );
}

/** Under the H table: λ_H of the newest line, then R_H once there are 3 lines. */
export function hPanel(r: EngineResult | null): ReactNode {
  const g = guideOf(r);
  if (!g?.cal) return <p className="calc-wait">The hydrogen wavelengths need the mercury calibration first (at least 3 Hg lines).</p>;
  const last = g.h.filter((x) => x.lam_tex).pop();
  if (!last) return <p className="calc-wait">Type x<sub>H</sub> for a hydrogen line: the app computes its wavelength here.</p>;
  return (
    <section className="calc-panel" aria-live="polite">
      <p className="calc-title">The app calculated ({last.line}, n<sub>i</sub> = {last.n})</p>
      <T t={last.lam_tex!} />
      {last.ref && <p className="small">Expected (NIST, air) {last.ref} nm: yours differs by {last.dev} nm.{Math.abs(Number(last.dev?.replace("−", "-"))) > 3 ? " More than 3 nm: is it the right line?" : ""}</p>}
      {g.ryd?.report ? (
        <p className="calc-ok">✓ R<sub>H</sub> = <b className="num">{g.ryd.report}</b> from your {g.ryd.m} lines.</p>
      ) : <p className="calc-wait">With 3 hydrogen lines or more the app computes R<sub>H</sub> here.</p>}
    </section>
  );
}

/** Last Run step: the result and the way to the worked sheet. */
export function resultPanel(r: EngineResult | null): ReactNode {
  const g = guideOf(r);
  if (!g?.ryd) return <p className="calc-warn">Not enough data yet: the analysis needs at least 3 Hg lines and 3 hydrogen lines (all 11 and all 5 recommended).</p>;
  const plot = r?.plots.find((p) => p.id === "ryd");
  return (
    <section className="calc-panel" aria-live="polite">
      <p className="calc-title">Your result</p>
      {g.ryd.report && <p className="calc-big num">R<sub>H</sub> = {g.ryd.report}</p>}
      <p className="small">CODATA R<sub>H</sub> = {g.ryd.codata}·10⁶ m⁻¹: yours differs by {g.ryd.dev_pct} %.</p>
      {plot && <Plot plot={plot} />}
      <p><button type="button" className="btn" onClick={() => go("exp/3/analysis")}>Step-by-step analysis →</button></p>
    </section>
  );
}

// --------------------------------------------------------------------------------- Analysis tab

export function Exp3Analysis({ data, setData, result, pending }: AnalysisProps) {
  const g = guideOf(result);
  const cal = g?.cal;
  const ryd = g?.ryd;
  const field = (path: string, label: string, unit = "") => (
    <Field key={path} label={label} unit={unit} signed value={String(getPath(data, `graphical.${path}`) ?? "")}
      onChange={(v) => setData(setPath(data, `graphical.${path}`, v))} />
  );
  const calPlot = result?.plots.find((p) => p.id === "cal");
  const rydPlot = result?.plots.find((p) => p.id === "ryd");
  const hOk = g?.h.filter((r) => r.lam_tex) ?? [];
  return (
    <div className="ga">
      <p className="ga-intro">
        The guide's data analysis (§3.5), uncertainty (§3.6) and conclusions (§3.7), in the order of the final sheet, with the graphical
        method and the least-squares method (LSM) for both graphs. Every number is shown inside its formula, so you can copy each line onto paper.
      </p>
      {!result ? (
        <p className="muted live-wait">{pending ? "Analysing…" : "Enter data first: the analysis appears as soon as the engine can run."}</p>
      ) : !g || g.hg.length === 0 ? (
        <p className="calc-warn">No readings yet. Fill the mercury and hydrogen tables in the Run tab (or the Data tab) and come back.</p>
      ) : (
        <>
          <GStep n="1" title="The tables" guide="§3.4 · Tables 1 and 2">
            <p>Table 1, the mercury lines (λ given, x read on the locator):</p>
            <HgTable g={g} />
            <p>Table 2, the hydrogen lines (λ<sub>H</sub> is filled in at step 5):</p>
            {g.h.length ? <HTable g={g} /> : <p className="calc-wait">No hydrogen readings yet.</p>}
            <ul className="ga-tips">
              <li>x is the locator reading (main scale + vernier). The sheet writes it in arbitrary units (a.u.): only differences of x matter, because A and B are fitted.</li>
              <li>Draw both tables across the page, one column per line, as here.</li>
              {g.hg.some((r) => r.excluded) && <li>Struck-through lines are excluded (Data tab): they stay in the table but are left out of the fit.</li>}
            </ul>
          </GStep>

          <GStep n="2" title="λ → 1/λ² for every mercury line" guide="§3.5 step 1">
            <p>λ in nm is λ·10⁻⁹ m. On a calculator: 1 ÷ (404.7E−9)². Write <b>4 significant digits</b> (the unit 10¹² m⁻² is common to all):</p>
            {g.hg.map((r) => <div key={r.id} className={`ga-formula${r.excluded ? " excluded" : ""}`}><T t={r.tex} /></div>)}
            <p className="muted small">Round the 4th digit, do not cut it: 1/(404.7·10⁻⁹)² = 6.1056…·10¹² ≈ 6.106·10¹².</p>
          </GStep>

          {!cal ? (
            <p className="calc-warn">The calibration needs at least 3 mercury lines (all 11 recommended). Steps 3–9 appear when there are enough.</p>
          ) : (
            <>
              <GStep n="3" title="Graph 1: x_Hg against 1/λ² (graphical method)" guide="§3.5 step 1">
                <p>Plot <b>x<sub>Hg</sub> (a.u.)</b> on the vertical axis against <b>1/λ² (10¹² m⁻²)</b> on the horizontal axis. Cauchy's relation x = A + B/λ² is a straight line: slope B, intercept A.</p>
                {cal.graph && <Scales graph={cal.graph} xLabel={<>1/λ² (10¹² m⁻²)</>} yLabel={<>x<sub>Hg</sub> (a.u.)</>} />}
                {calPlot && <Plot plot={calPlot} />}
                <ol>
                  <li>With a ruler, draw <b>one straight line</b> as close as possible to all the points (about as many above it as below).</li>
                  <li>Pick two points <b>on your line</b> (not data points), far apart, and read their coordinates:</li>
                </ol>
                <div className="param-grid">
                  {field("cal.x1", "P₁ 1/λ²", "10¹² m⁻²")}{field("cal.y1", "P₁ x", "a.u.")}{field("cal.x2", "P₂ 1/λ²", "10¹² m⁻²")}{field("cal.y2", "P₂ x", "a.u.")}
                </div>
                <p className="muted small">Check: the least-squares line passes through ({cal.check.x1}, {cal.check.y1}) and ({cal.check.x2}, {cal.check.y2}). A good hand-drawn line is close to these.</p>
                {cal.graphical ? (
                  <div className="calc">
                    <T t={cal.graphical.B_tex} />
                    <T t={cal.graphical.A_tex} />
                    <p className="small">Least squares (step 4): B = {cal.B}·10⁻¹², A = {cal.A}. Your line differs by {cal.graphical.dB_pct} % in B and {cal.graphical.dA} a.u. in A.</p>
                  </div>
                ) : <p className="calc-wait">Type both points: the app computes B = (y₂ − y₁)/(x₂ − x₁) and A = y₁ − B·x₁ here.</p>}
              </GStep>

              <GStep n="4" title="A and B by the least-squares method" guide="§3.5 step 2 · Appendix B">
                <T t={String.raw`x(\lambda)=A+\frac{B}{\lambda^2}\quad\text{(Cauchy dispersion)}`} />
                <T t={String.raw`B=\frac{m S_{xy}-S_x S_y}{m S_{xx}-(S_x)^2},\qquad A=\frac{S_y-B\,S_x}{m}`} />
                <p>Here x = 1/λ², y = x<sub>Hg</sub> and m = {cal.m} lines. The sums:</p>
                <div className="ga-formula"><T t={cal.tex.Sx} /></div>
                <div className="ga-formula"><T t={cal.tex.Sy} /></div>
                <div className="ga-formula"><T t={cal.tex.Sxy} /></div>
                <div className="ga-formula"><T t={cal.tex.Sxx} /></div>
                <p>Then:</p>
                <div className="ga-formula"><T t={cal.tex.num} /></div>
                <div className="ga-formula"><T t={cal.tex.den} /></div>
                <div className="ga-formula"><T t={cal.tex.B} /></div>
                <div className="ga-formula"><T t={cal.tex.A} /></div>
                <p className="calc-big">⇒</p>
                <T t={cal.tex.line} />
                <p className="muted small">Keep every digit of the sums (they are exact). B is written with 4 significant digits; A is computed with that written B.</p>
              </GStep>

              <GStep n="5" title="λ_H of each hydrogen line" guide="§3.5 step 2 · eq. 3.9">
                <p>From the LSM of the graph x<sub>Hg</sub> = x<sub>Hg</sub>(1/λ²):</p>
                <T t={String.raw`x(\lambda)=A+\frac{B}{\lambda^2}\ \Rightarrow\ \lambda=\sqrt{\frac{B}{x-A}}`} />
                <T t={cal.tex.lam} />
                {hOk.length === 0 ? <p className="calc-wait">Type the hydrogen readings x<sub>H</sub> (Table 2).</p> : hOk.map((r) => (
                  <div key={r.id} className={`ga-formula${r.excluded ? " excluded" : ""}`}><T t={r.lam_tex!} /></div>
                ))}
                {g.h.some((r) => r.bad) && <p className="calc-warn">A reading is on the wrong side of A = {cal.A}: B/(x − A) is negative, so it has no wavelength. Check that line.</p>}
                {hOk.length > 0 && (
                  <>
                    <p>Write λ<sub>H</sub> into the last row of Table 2. For your information (not on the sheet), the NIST air wavelengths:</p>
                    <div className="table-scroll">
                      <table className="rich-table num">
                        <thead><tr><th>Line</th><th>λ<sub>H</sub> (nm)</th><th>NIST (nm)</th><th>Difference (nm)</th></tr></thead>
                        <tbody>{hOk.map((r) => <tr key={r.id}><td>{r.line}</td><td>{r.lam}</td><td>{r.ref ?? "—"}</td><td>{r.dev ?? "—"}</td></tr>)}</tbody>
                      </table>
                    </div>
                    <p className="muted small">Hα (656 nm) and Hε (397 nm) are outside the mercury range 404.7–623.4 nm: their λ comes from extrapolating the calibration and has the largest error.</p>
                  </>
                )}
              </GStep>

              {hOk.length > 0 && (
                <GStep n="6" title="λ_H → λ_H⁻¹ and n_i → n_i⁻²" guide="§3.5 step 3">
                  <p>1/λ for each line, written with 4 significant digits in 10⁶ m⁻¹:</p>
                  {hOk.map((r) => <div key={r.id} className="ga-formula"><T t={r.inv_tex!} /></div>)}
                  <p>And 1/n<sub>i</sub>² for each principal number (4 significant digits):</p>
                  <div className="ga-formula">{hOk.map((r) => <T key={r.id} t={r.n2_tex!} />)}</div>
                </GStep>
              )}

              {!ryd ? (
                <p className="calc-warn">R<sub>H</sub> needs at least 3 hydrogen lines (all 5 recommended). Steps 7–9 appear when there are enough.</p>
              ) : (
                <>
                  <GStep n="7" title="Graph 2: λ_H⁻¹ against n_i⁻² (graphical method)" guide="§3.5 step 3">
                    <p>Plot <b>λ<sub>H</sub>⁻¹ (10⁶ m⁻¹)</b> on the vertical axis against <b>n<sub>i</sub>⁻²</b> on the horizontal axis. The Balmer formula makes it a falling straight line with slope −R<sub>H</sub>.</p>
                    {ryd.graph && <Scales graph={ryd.graph} xLabel={<>n<sub>i</sub>⁻²</>} yLabel={<>λ<sub>H</sub>⁻¹ (10⁶ m⁻¹)</>} />}
                    {rydPlot && <Plot plot={rydPlot} />}
                    <p>Draw your best line and read two points on it, far apart:</p>
                    <div className="param-grid">
                      {field("ryd.x1", "P₁ n⁻²")}{field("ryd.y1", "P₁ λ⁻¹", "10⁶ m⁻¹")}{field("ryd.x2", "P₂ n⁻²")}{field("ryd.y2", "P₂ λ⁻¹", "10⁶ m⁻¹")}
                    </div>
                    <p className="muted small">Check: the least-squares line passes through ({ryd.check.x1}, {ryd.check.y1}) and ({ryd.check.x2}, {ryd.check.y2}).</p>
                    {ryd.graphical ? (
                      <div className="calc">
                        <T t={ryd.graphical.tex} />
                        <p>R<sub>H, graph</sub> = <b className="num">{ryd.graphical.R}·10⁶ m⁻¹</b>, minus the slope of your line.</p>
                      </div>
                    ) : <p className="calc-wait">Type both points: the app computes −R<sub>H</sub> = (y₂ − y₁)/(x₂ − x₁) here.</p>}
                    <details className="calc-more">
                      <summary>Optional: uncertainty of the graphical R<sub>H</sub></summary>
                      <p>Draw the <b>steepest</b> and the <b>shallowest</b> lines that still pass reasonably through the points, and read two points on each:</p>
                      <div className="param-grid">
                        {field("ryd.max_x1", "Steepest P₁ n⁻²")}{field("ryd.max_y1", "Steepest P₁ λ⁻¹", "10⁶ m⁻¹")}{field("ryd.max_x2", "Steepest P₂ n⁻²")}{field("ryd.max_y2", "Steepest P₂ λ⁻¹", "10⁶ m⁻¹")}
                        {field("ryd.min_x1", "Shallowest P₁ n⁻²")}{field("ryd.min_y1", "Shallowest P₁ λ⁻¹", "10⁶ m⁻¹")}{field("ryd.min_x2", "Shallowest P₂ n⁻²")}{field("ryd.min_y2", "Shallowest P₂ λ⁻¹", "10⁶ m⁻¹")}
                      </div>
                      {ryd.graphical?.sigma_tex && (
                        <div className="calc">
                          <p>Steepest line R<sub>H</sub> = {ryd.graphical.R_max}·10⁶, shallowest {ryd.graphical.R_min}·10⁶ m⁻¹.</p>
                          <T t={ryd.graphical.sigma_tex} />
                          {ryd.graphical.report && <p>R<sub>H, graph</sub> = <b className="num">{ryd.graphical.report}</b></p>}
                        </div>
                      )}
                    </details>
                  </GStep>

                  <GStep n="8" title="R_H by the least-squares method" guide="§3.5 step 3 · §3.6 · Appendix B">
                    <p>Balmer formula (n<sub>f</sub> = 2) as a straight line in n<sub>i</sub>⁻²:</p>
                    <T t={String.raw`\frac{1}{\lambda}=R_H\left(\frac{1}{n_f^2}-\frac{1}{n_i^2}\right)\qquad\Rightarrow\ \lambda_H^{-1}=-R_H\,n_i^{-2}+\frac{R_H}{4}`} />
                    <T t={String.raw`-R_H=\frac{m S_{xy}-S_x S_y}{m S_{xx}-(S_x)^2}`} />
                    <T t={String.raw`s_\varepsilon^2=\frac{1}{m(m-2)}\Big[m S_{yy}-S_y^2\qquad-R_H^2\,(m S_{xx}-S_x^2)\Big]`} />
                    <T t={String.raw`s_{R_H}^2=\frac{m\,s_\varepsilon^2}{m S_{xx}-(S_x)^2}`} />
                    <p>Here x = n<sub>i</sub>⁻², y = λ<sub>H</sub>⁻¹ and m = {ryd.m} lines. The sums:</p>
                    <div className="ga-formula"><T t={ryd.tex.Sx} /></div>
                    <div className="ga-formula"><T t={ryd.tex.Sy} /></div>
                    <div className="ga-formula"><T t={ryd.tex.Sxy} /></div>
                    <div className="ga-formula"><T t={ryd.tex.Sxx} /></div>
                    <p>The numerator and the denominator, then the slope:</p>
                    <div className="ga-formula"><T t={ryd.tex.num} /></div>
                    <div className="ga-formula"><T t={ryd.tex.den} /></div>
                    <div className="ga-formula"><T t={ryd.tex.R} /></div>
                    <p className="muted small">
                      R<sub>H</sub> is kept with 7 digits here (≈ {ryd.R4}·10⁶ m⁻¹): s<sub>ε</sub>² below is a small difference of large numbers, and a rounded R<sub>H</sub> would change it completely.
                    </p>
                    <p>The uncertainty (guide note: §3.6 says “attenuation coefficient”, it means R<sub>H</sub>) also needs S<sub>yy</sub>:</p>
                    <div className="ga-formula"><T t={ryd.tex.Syy} /></div>
                    <p>The three terms of the bracket (one calculator entry each), then s<sub>ε</sub>²:</p>
                    <div className="ga-formula"><T t={ryd.tex.terms} /></div>
                    <div className="ga-formula"><T t={ryd.tex.se2} /></div>
                    {ryd.tex.sR ? <div className="ga-formula"><T t={ryd.tex.sR} /></div>
                      : <p className="calc-warn">The bracket came out {ryd.negative ? "negative" : "zero"}: the points lie (almost) exactly on a line and the rounding of λ<sub>H</sub>⁻¹ dominates. Use the Results tab value.</p>}
                    {ryd.tex.result && <><p className="calc-big">⇒</p><T t={ryd.tex.result} /></>}
                  </GStep>

                  <GStep n="9" title="Rounding and conclusions" guide="§3.6 · §3.7">
                    {ryd.sR && (
                      <ol>
                        <li>Round s<sub>R<sub>H</sub></sub> = {ryd.sR}·10⁶ m⁻¹ to <b>1 significant digit</b> (2 if the first digit is 1): <b className="num">{ryd.s_r}</b>.</li>
                        <li>Round R<sub>H</sub> = {ryd.R}·10⁶ m⁻¹ to the <b>same decimal place</b>: <b className="num">{ryd.R_r}</b>.</li>
                      </ol>
                    )}
                    {ryd.report && <p className="calc-big num">R<sub>H</sub> = {ryd.report} = {ryd.report7}</p>}
                    <p>The following value has been obtained:</p>
                    <div className="table-scroll">
                      <table className="rich-table num">
                        <thead><tr><th>Rydberg constant R<sub>H</sub> (10⁶ m⁻¹)</th><th>Uncertainty (10⁶ m⁻¹)</th></tr></thead>
                        <tbody><tr><td>{ryd.R_r ?? ryd.R4}</td><td>{ryd.s_r ?? "—"}</td></tr></tbody>
                      </table>
                    </div>
                    <p>
                      Accepted value: R<sub>H</sub> = {ryd.codata}·10⁶ m⁻¹ (CODATA, R∞ corrected for the proton mass). Yours differs by {ryd.dev_pct} %
                      {ryd.z ? `, which is ${ryd.z} standard uncertainties${Number(ryd.z) <= 2 ? " → compatible." : " → more than 2σ: the calibration (A, B) error, common to all five lines, is not in the fit's uncertainty (Results → honesty)."}` : "."}
                    </p>
                    {ryd.graphical && (
                      <p className="calc">
                        Graphical vs least squares: R<sub>H, graph</sub> = {ryd.graphical.R}·10⁶, R<sub>H, LSM</sub> = {ryd.R4}·10⁶ m⁻¹, difference {ryd.graphical.diff}·10⁶ m⁻¹ ({ryd.graphical.rel_pct} %)
                        {ryd.graphical.z ? `, z = ${ryd.graphical.z} → ${ryd.graphical.significant ? "significant (z > 2)." : "not significant (z ≤ 2)."}` : ". Add the steepest/shallowest lines in step 7 to test it."}
                      </p>
                    )}
                    <p className="muted small">
                      The Results tab computes the same fit without rounding anything in between (R = {result.values?.R?.report ?? "—"}). After rounding the two normally agree.
                    </p>
                  </GStep>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
