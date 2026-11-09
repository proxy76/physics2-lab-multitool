// Exp 2 helpers: the live "the app calculated" panels of the Run steps and the guided analysis
// (§2.5–2.7) laid out like the team's final sheet: table → formulas → τ per set → σ_τ per set →
// conclusions table + why the sets are not averaged. Every number comes from the engine (extra.guide).
import type { ReactNode } from "react";
import { Tex } from "../components/Tex";
import type { EngineResult } from "../lib/engineTypes";
import type { AnalysisProps } from "./types";

interface GSet {
  id: string; no: string; T: string; complete: boolean; excluded?: boolean;
  Nb: string; N1: string; N2: string; N12: string; nb: string; n1: string; n2: string; n12: string;
  X?: string; Y?: string; tau_us?: string; sX?: string; sY?: string; s_tau_us?: string; pm?: string;
  report?: string; rel_pct?: string; tau_r?: string; s_r?: string; exp?: number; unc_digits?: number;
  Ncomb?: string; Nsum?: string; X_rates?: string;
  tex?: { rates: string[]; tau: string; XY: string; X_counts: string; sX: string; sY: string; s_tau?: string };
}
interface Guide { sets: GSet[]; n: number; nb0?: string | null }

const guideOf = (r: EngineResult | null): Guide | undefined => r?.extra?.guide;
const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];
const circ = (no: string) => CIRCLED[Number(no) - 1] ?? `(${no})`;

function GStep({ n, title, guide, children }: { n: string; title: string; guide?: string; children: ReactNode }) {
  return (
    <section className="ga-step">
      <h3><span className="ga-num">{n}</span>{title}{guide && <span className="ga-ref"> {guide}</span>}</h3>
      {children}
    </section>
  );
}

/** The paper table: No. | T | N_b | n_b | N₁b | n₁b | N₂b | n₂b | N₁₂b | n₁₂b | τ ± σ_τ. */
export function SheetTable({ sets }: { sets: GSet[] }) {
  return (
    <div className="table-scroll">
      <table className="rich-table num">
        <thead>
          <tr>
            <th>No.</th><th>T (s)</th><th>N<sub>b</sub></th><th>n<sub>b</sub> (c/s)</th><th>N<sub>1b</sub></th><th>n<sub>1b</sub> (c/s)</th>
            <th>N<sub>2b</sub></th><th>n<sub>2b</sub> (c/s)</th><th>N<sub>12b</sub></th><th>n<sub>12b</sub> (c/s)</th><th>τ ± σ<sub>τ</sub> (μs)</th>
          </tr>
        </thead>
        <tbody>
          {sets.map((s) => (
            <tr key={s.id} className={s.excluded ? "excluded" : undefined}>
              <td>{s.no}.</td><td>{s.T}</td><td>{s.Nb}</td><td>{s.nb}</td><td>{s.N1}</td><td>{s.n1}</td>
              <td>{s.N2}</td><td>{s.n2}</td><td>{s.N12}</td><td>{s.n12}</td><td>{s.pm ?? (s.tau_us || "—")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Lines({ tex }: { tex: string[] }) {
  return <>{tex.map((t) => <Tex key={t} tex={t} display />)}</>;
}

// --------------------------------------------------------------------------------- Run step panels

const RATE: Record<string, { N: keyof GSet; n: keyof GSet; label: ReactNode }> = {
  N1: { N: "N1", n: "n1", label: <>n<sub>1b</sub> = N<sub>1b</sub>/T</> },
  N2: { N: "N2", n: "n2", label: <>n<sub>2b</sub> = N<sub>2b</sub>/T</> },
  N12: { N: "N12", n: "n12", label: <>n<sub>12b</sub> = N<sub>12b</sub>/T</> },
};

/** Under a count entry (source 1, source 2, both): that rate for the newest set that has it. */
export function ratePanel(key: "N1" | "N2" | "N12") {
  return function RatePanel(r: EngineResult | null): ReactNode {
    const f = RATE[key];
    const s = guideOf(r)?.sets.filter((x) => x[f.n]).pop();
    if (!s) return <p className="calc-wait">Type the count above: the app divides it by T here.</p>;
    const extra = key === "N12" && s.n1 && s.n2 ? (
      <p className="small">Check: n<sub>12b</sub> should be a little <b>less</b> than n<sub>1b</sub> + n<sub>2b</sub> = {(Number(s.n1) + Number(s.n2)).toFixed(2)} c/s. The missing counts are the dead-time loss.</p>
    ) : null;
    return (
      <section className="calc-panel" aria-live="polite">
        <p className="calc-title">The app calculated (set {s.no})</p>
        <div className="calc num"><p><span>{f.label}</span> <span>= {String(s[f.N])} / {s.T}</span> <span>= <b>{String(s[f.n])}</b> c/s</span></p></div>
        {extra}
      </section>
    );
  };
}

/** After the covered (background) count: the whole set worked out, as on the sheet. */
export function setPanel(r: EngineResult | null): ReactNode {
  const g = guideOf(r);
  const s = g?.sets.filter((x) => x.complete && !x.excluded).pop();
  if (!s?.tex) return <p className="calc-wait">When all four counts of a set are typed (source 1, source 2, both, covered), the app computes τ for that set here.</p>;
  return (
    <section className="calc-panel" aria-live="polite">
      <p className="calc-title">The app calculated (set {s.no})</p>
      <Lines tex={s.tex.rates} />
      <Tex tex={s.tex.tau} display />
      {s.report && <p className="calc-big num">τ = {s.pm} μs → {s.report}</p>}
      {Number(s.X) <= 0
        ? <p className="calc-warn">τ ≤ 0 for this set: the counting loss is hidden by statistics (Q7). Measure another set.</p>
        : <p className="calc-ok">✓ Set {s.no} done. {g!.n < 3 ? `You need ${3 - g!.n} more set${3 - g!.n === 1 ? "" : "s"} (the guide asks for at least three).` : "You have three sets or more — enough for the report."}</p>}
    </section>
  );
}

// --------------------------------------------------------------------------------- Analysis tab

export function Exp2Analysis({ result, pending }: AnalysisProps) {
  const g = guideOf(result);
  const done = g?.sets.filter((s) => s.complete && s.tex && !s.excluded) ?? [];
  const first = done[0];
  return (
    <div className="ga">
      <p className="ga-intro">
        The guide's data analysis (§2.5), uncertainty (§2.6) and conclusions (§2.7), in the order of the final sheet. Every number is shown inside
        its formula, so you can copy each line onto paper.
      </p>
      {!result ? (
        <p className="muted live-wait">{pending ? "Analysing…" : "Enter data first: the analysis appears as soon as the engine can run."}</p>
      ) : !g || g.sets.length === 0 ? (
        <p className="calc-warn">No counts yet. Fill the sets in the Run tab (or the Data tab) and come back.</p>
      ) : (
        <>
          <GStep n="1" title="The table" guide="§2.4">
            <p>Three sets of four 60 s counts, the rates n = N/T next to each count, and the result of each set in the last column:</p>
            <SheetTable sets={g.sets} />
            <ul className="ga-tips">
              <li>Rates in counts per second (c/s) with <b>2 decimals</b>: 7047/60 = 117.45.</li>
              <li>The last column is filled after step 4: τ ± σ<sub>τ</sub> in μs.</li>
              {g.sets.some((s) => s.excluded) && <li>Struck-through sets are excluded (Data tab): they stay in the table but are left out of τ and the conclusions.</li>}
              {g.nb0 && <li>First background (procedure step 1): n<sub>b</sub> = {g.nb0} c/s. Every set's n<sub>b</sub> should be close to it.</li>}
            </ul>
          </GStep>

          <GStep n="2" title="The formulas" guide="§2.2 · eq. 2.3">
            <Tex tex={String.raw`n_b=\frac{N_b}{T};\quad n_{1b}=\frac{N_{1b}}{T};\qquad n_{2b}=\frac{N_{2b}}{T};\quad n_{12b}=\frac{N_{12b}}{T}`} display />
            <Tex tex={String.raw`\tau=\frac{n_{1b}+n_{2b}-n_{12b}-n_b}{2\,(n_{1b}\cdot n_{2b}-n_{12b}\cdot n_b)}`} display />
            <p className="muted small">These are the measured rates (the guide writes them with a prime, n′). b = background is included in every one of them.</p>
          </GStep>

          {done.length === 0 ? (
            <p className="calc-warn">No complete set yet: a set needs T and all four counts (N<sub>b</sub>, N<sub>1b</sub>, N<sub>2b</sub>, N<sub>12b</sub>).</p>
          ) : (
            <>
              <GStep n="3" title="τ for each set" guide="§2.5">
                {done.map((s) => (
                  <div key={s.id} className="ga-formula">
                    <p className="ga-formula-title">{circ(s.no)} Set {s.no}</p>
                    <Tex tex={s.tex!.tau} display />
                  </div>
                ))}
                {first?.X_rates && (
                  <p className="small">
                    Tip: compute the numerator from the counts, X = (N<sub>1b</sub> + N<sub>2b</sub> − N<sub>12b</sub> − N<sub>b</sub>)/T = {first.Ncomb}/{first.T} = <b>{first.X}</b> c/s.
                    With the rates already rounded to 2 decimals you would get {first.X_rates}: X is a small difference of large numbers.
                  </p>
                )}
              </GStep>

              <GStep n="4" title="Uncertainty of τ" guide="§2.6 · Q3, Q4, Q6">
                <p>From the questions (Q3c: relative error of a quotient; Q3a: error of a sum; Q3b: of a product; Q6: σ<sub>N</sub> = √N), write τ = X/Y:</p>
                <Tex tex={String.raw`\sigma_\tau=\frac{X}{Y}\sqrt{\frac{\sigma_X^2}{X^2}+\frac{\sigma_Y^2}{Y^2}}`} display />
                <Tex tex={String.raw`X=n_{1b}+n_{2b}-n_{12b}-n_b,\qquad Y=2\,(n_{1b}\cdot n_{2b}-n_{12b}\cdot n_b)`} display />
                <p>with σ<sub>n</sub> = √N/T for every rate:</p>
                <Tex tex={String.raw`\sigma_X=\sqrt{\sigma_{n_{1b}}^2+\sigma_{n_{2b}}^2+\sigma_{n_{12b}}^2+\sigma_{n_b}^2}\qquad=\sqrt{\frac{N_{1b}+N_{2b}+N_{12b}+N_b}{T^2}}`} display />
                <Tex tex={String.raw`\sigma_Y=2\sqrt{S}\qquad S=n_{2b}^2\,\sigma_{n_{1b}}^2+n_{1b}^2\,\sigma_{n_{2b}}^2\qquad +\,n_b^2\,\sigma_{n_{12b}}^2+n_{12b}^2\,\sigma_{n_b}^2`} display />
                <p className="muted small">On paper this is one line: σ<sub>Y</sub> = 2√(n<sub>2b</sub>²σ²<sub>n1b</sub> + n<sub>1b</sub>²σ²<sub>n2b</sub> + n<sub>b</sub>²σ²<sub>n12b</sub> + n<sub>12b</sub>²σ²<sub>nb</sub>), with σ²<sub>n</sub> = N/T². Below, each of the four terms is worked out first.</p>
                {done.map((s) => (
                  <div key={s.id} className="ga-formula">
                    <p className="ga-formula-title">{circ(s.no)} Set {s.no}: X = {s.X}, Y = {s.Y}, σ<sub>X</sub> = {s.sX}, σ<sub>Y</sub> = {s.sY}</p>
                    <Tex tex={s.tex!.sX} display />
                    <Tex tex={s.tex!.sY} display />
                    {s.tex!.s_tau ? <Tex tex={s.tex!.s_tau} display /> : <p className="calc-warn">X = 0: the relative error is undefined for this set.</p>}
                    {s.s_tau_us && <p className="calc-big num">⇒ τ = ({s.tau_us} ± {s.s_tau_us})·10⁻⁶ s</p>}
                  </div>
                ))}
                <p className="muted small">
                  σ<sub>X</sub>/X is about {first?.rel_pct ?? "70"} % while σ<sub>Y</sub>/Y is under 2 %: the uncertainty of τ comes almost entirely from the numerator,
                  the small difference of large count rates.
                </p>
              </GStep>

              <GStep n="5" title="Rounding" guide="§2.8 note · Q5">
                <ol>
                  <li>Round σ<sub>τ</sub> to <b>1 significant digit</b> (2 if the first digit is 1).</li>
                  <li>Round τ to the <b>same decimal place</b>.</li>
                </ol>
                <div className="table-scroll">
                  <table className="rich-table num">
                    <thead><tr><th>Set</th><th>τ (μs)</th><th>σ<sub>τ</sub> (μs)</th><th>Rounded</th></tr></thead>
                    <tbody>{done.map((s) => <tr key={s.id}><td>{s.no}</td><td>{s.tau_us}</td><td>{s.s_tau_us ?? "—"}</td><td>{s.report ?? "—"}</td></tr>)}</tbody>
                  </table>
                </div>
              </GStep>

              <GStep n="6" title="Conclusions" guide="§2.7">
                <p>The following values have been obtained:</p>
                <div className="table-scroll">
                  <table className="rich-table num">
                    <thead><tr><th>Measured dead-time (τ) (μs)</th><th>Uncertainty (μs)</th></tr></thead>
                    <tbody>{done.map((s) => <tr key={s.id}><td>{s.tau_us}</td><td>{s.s_tau_us ?? "—"}</td></tr>)}</tbody>
                  </table>
                </div>
                <p className="calc">
                  An average value of the dead time cannot be recorded, as the equation used to compute it (2.3) is a non-linear one, and each
                  measurement set has a different uncertainty, because it depends on the number of counts recorded in that separate set.
                </p>
                <p className="muted small">
                  The guide's §2.7 note asks for the value of the one set whose uncertainty you calculated. The final sheet calculated σ<sub>τ</sub> for every
                  set, so it lists all of them. Pooling the counts of all sets (Results → Advanced) is the correct way to combine them — not asked by the guide.
                </p>
              </GStep>
            </>
          )}
        </>
      )}
    </div>
  );
}
