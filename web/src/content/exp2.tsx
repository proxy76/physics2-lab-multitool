import type { ExperimentDef } from "./types";
import { Exp2Analysis, ratePanel, setPanel } from "./exp2Guide";

const blankSet = (i: number) => ({ id: `s${i}`, T: "60", Nb: "", N1: "", N2: "", N12: "" });

const empty = () => ({
  sets: [0, 1, 2].map(blankSet),
  background0: { N: "", T: "60" },
});

const timer = (label: string) => ({ seconds: 60, label });

export const exp2: ExperimentDef = {
  id: "2",
  n: 2,
  title: "Dead time of a Geiger–Müller counter (two-source method)",
  short: "τ from two sources",
  tool: "exp2.analyze",
  notes: ["E2-sheet", "E2-us", "E2-prime", "E2-first", "E2-XY", "E2-avg"],
  brief: {
    measure: "The dead time τ of a Geiger–Müller counter, from four count rates per set: source 1, source 2, both sources, and no source (background).",
    formula: String.raw`\tau=\frac{n_{1b}+n_{2b}-n_{12b}-n_b}{2\,(n_{1b}\,n_{2b}-n_{12b}\,n_b)},\qquad n=\frac{N}{T}`,
    expected: [
      { label: "Counting time", value: "60 s per count (front panel; the guide allows 60 or 100 s)" },
      { label: "Background", value: "≈ 1 c/s (≈ 70 counts in 60 s)" },
      { label: "One source", value: "≈ 115–145 c/s (≈ 7 000–8 700 counts in 60 s)" },
      { label: "Both sources", value: "a little less than the two single rates added" },
      { label: "τ per set", value: "≈ 100–300 μs, σ_τ ≈ 90 μs (the guide's “a few μs” is wrong)" },
      { label: "Sets", value: "at least 3 (13 counts of 60 s with the first background)" },
    ],
    safety: [
      "The sources are placed and handled only as the professor instructs. Move them only with the sliding lid of the enclosure.",
      "Do not touch the thin window of the Geiger–Müller probe.",
      "Do not change the high voltage of the counter.",
      "Hand the sources back before leaving the bench.",
    ],
    roles: {
      OP: "Slides the lid (source 1 / source 2 / both / none), presses Start on the counter.",
      RD: "Reads the count when the counter stops, runs the app timer, says which lid position is open.",
      AN: "Types the counts into the right set, checks the live τ after every set.",
    },
    before: [
      "Draw the table before the lab, as on the final sheet: No. | T (s) | N_b | n_b (c/s) | N₁b | n₁b (c/s) | N₂b | n₂b (c/s) | N₁₂b | n₁₂b (c/s) | τ ± σ_τ (μs), three rows.",
      "Prepare Q1–Q6: the uncertainty calculation of §2.6 is built from Q3, Q4 and Q6 (Analysis tab, step 4).",
      "Learn eq. 2.3 and what each of the four rates means: b = background is inside every one of them.",
    ],
    why: "With both sources the detector is busy more often, so it loses more counts: n₁₂b + n_b comes out a little smaller than n₁b + n₂b. That small deficit gives τ — and it is why τ has a large uncertainty (≈ 30–75 %).",
    duration: "≈ 30–40 min",
  },
  steps: [
    {
      id: "identify", role: ["ALL"], title: "Identify the probe, the counter's buttons and the source holder's sliding lid",
      how: "- Geiger–Müller probe with the source holder under it (Fig. 2.2)\n- Auxiliary system / counter: the buttons used are labelled in red in Fig. 2.1 (start, stop/reset, measuring-time selector)\n- Enclosure with two sources: the lid slides so that source 1, source 2, or both are uncovered",
      verify: ["Names of the buttons on the counter (Fig. 2.1)", "Which lid position uncovers which source"],
    },
    {
      id: "time", role: ["OP"], title: "Set the measuring time on the front panel to 60 s",
      how: "The guide allows 60 or 100 s; the final sheet used 60 s. Every count of a set must use the same T. If you choose 100 s, type 100 in the T box of each set.",
    },
    {
      id: "bg0", role: ["OP", "RD"], title: "Count the background first: no sources, 60 s",
      how: "Procedure step 1. Nothing radioactive near the probe — also check the next bench. Reset, Start, and read the count when the counter stops.",
      timer: timer("Background 60 s"),
      entry: { kind: "fields", fields: [{ path: "background0.N", label: "N_b (first background)", unit: "counts" }, { path: "background0.T", label: "T", unit: "s" }] },
      see: "About 60–80 counts (≈ 1 c/s). Each set has its own background count later; this one is the check.",
    },
    {
      id: "sources", role: ["OP"], title: "Ask the professor for the two sources",
      safety: "The professor places the sources and shows how to slide the lid. Do not take them out of the enclosure.",
    },
    {
      id: "s1", role: ["OP", "RD", "AN"], title: "Uncover source 1 only and count 60 s",
      expanded: true,
      how: "OP slides the lid so that only source 1 is open, then Reset + Start. RD reads the count when the counter stops; AN types it into the current set.",
      timer: timer("Source 1, 60 s"),
      entry: { kind: "row", table: "sets", fields: ["T", "N1"], addLabel: "Start another set", defaults: { T: "60" } },
      cells: [{ name: "T", text: "the measuring time of this set, s (60)" }, { name: "N₁b", text: "the count with source 1 open (source + background)" }],
      see: "≈ 7 000 counts (≈ 117 c/s).",
      panel: ratePanel("N1"),
    },
    {
      id: "s2", role: ["OP", "RD", "AN"], title: "Cover source 1, uncover source 2 only, count 60 s",
      timer: timer("Source 2, 60 s"),
      entry: { kind: "row", table: "sets", fields: ["N2"] },
      cells: [{ name: "N₂b", text: "the count with only source 2 open" }],
      see: "≈ 8 600 counts (≈ 143 c/s). Only one source may be open.",
      panel: ratePanel("N2"),
    },
    {
      id: "s12", role: ["OP", "RD", "AN"], title: "Uncover both sources and count 60 s",
      timer: timer("Both sources, 60 s"),
      entry: { kind: "row", table: "sets", fields: ["N12"] },
      cells: [{ name: "N₁₂b", text: "the count with both sources open" }],
      see: "A little less than N₁b + N₂b (≈ 15 000–15 400 counts). The missing counts are the dead-time loss.",
      panel: ratePanel("N12"),
    },
    {
      id: "sb", role: ["OP", "RD", "AN"], title: "Cover both sources and count 60 s: this set's background",
      timer: timer("Background, 60 s"),
      entry: { kind: "row", table: "sets", fields: ["Nb"] },
      cells: [{ name: "N_b", text: "the count with both sources covered (procedure step 6)" }],
      see: "About the same as the first background (≈ 70 counts). The app now computes τ for this set.",
      decision: "If τ comes out negative, or the background is far above the first one (a lid not closed), measure this set again.",
      panel: setPanel,
    },
    {
      id: "repeat", role: ["ALL"], title: "Repeat source 1 → source 2 → both → covered until you have three sets",
      how: "Go back to “Uncover source 1 only”: the app moves to the next set by itself. The guide asks for at least three sets; a fourth is welcome if one τ is negative.",
      see: "The three τ values scatter by about ±90 μs (the final sheet: 122, 159 and 293 μs). That is the counting statistics, not a mistake.",
      live: "plot",
    },
    {
      id: "finish", role: ["OP"], title: "Cover both sources and hand them back to the professor",
      safety: "Return the sources as instructed before you leave the bench.",
      how: "The analysis is ready in the **Analysis** tab: table, τ per set, σ_τ per set, rounding and the conclusions, in the order of the final sheet.",
    },
  ],
  cheat: [
    "Front panel: measuring time 60 s (same T for every count).",
    "Background first: no sources, 60 s → ≈ 70 counts.",
    "Professor brings the sources. Each set: source 1 only → source 2 only → both → both covered, 60 s each.",
    "Expect ≈ 7 000, ≈ 8 600, a bit less than their sum, ≈ 70 counts.",
    "At least 3 sets. τ ≈ 100–300 μs each, σ_τ ≈ 90 μs.",
    "Negative τ or a high background → repeat the set.",
    "Sheet: No. | T | N_b | n_b | N₁b | n₁b | N₂b | n₂b | N₁₂b | n₁₂b | τ ± σ_τ (μs).",
    "Hand the sources back.",
  ],
  tables: [
    {
      id: "sets", title: "Measurement sets (guide §2.4 table)", path: "sets",
      columns: [
        { key: "T", label: "T", unit: "s" },
        { key: "Nb", label: "N_b", unit: "counts", hint: "both sources covered" },
        { key: "N1", label: "N₁b", unit: "counts", hint: "source 1 only" },
        { key: "N2", label: "N₂b", unit: "counts", hint: "source 2 only" },
        { key: "N12", label: "N₁₂b", unit: "counts", hint: "both sources" },
      ],
      defaults: { T: "60" },
      engineTable: "data",
      derived: [
        { key: "nb", label: "n_b", unit: "c/s", after: "Nb" }, { key: "n1", label: "n₁b", unit: "c/s", after: "N1" },
        { key: "n2", label: "n₂b", unit: "c/s", after: "N2" }, { key: "n12", label: "n₁₂b", unit: "c/s", after: "N12" },
        { key: "tau", label: "τ", unit: "μs" }, { key: "s_tau", label: "σ_τ", unit: "μs" },
      ],
      note: "One row per set of four counts. The rates n = N/T appear next to each count, as on the sheet. The lab-sheet table is under ‘Full tables with derived columns’ below and in the Analysis tab.",
      rowLabel: (_r, i) => `Set ${i + 1}`,
    },
  ],
  params: [
    { path: "background0.N", label: "First background N_b", unit: "counts", hint: "procedure step 1 (a check)" },
    { path: "background0.T", label: "Its time T", unit: "s" },
  ],
  initialData: empty,
  headline: [{ key: "tau1", label: "τ, set 1" }, { key: "tau2", label: "τ, set 2" }, { key: "tau3", label: "τ, set 3" }],
  complete: (d) => (d.sets || []).filter((s: Record<string, string>) => ["T", "Nb", "N1", "N2", "N12"].every((k) => s[k] && s[k].trim())).length >= 3,
  analysis: Exp2Analysis,
  questions: [
    {
      id: "q1", n: "1", text: "Explain formula 2.2.",
      answer: String.raw`$$n_{12b}+n_b=n_{1b}+n_{2b}$$

These are the **real** rates (no losses). Call n₁ and n₂ the rates of source 1 and source 2 alone. Every measurement also contains the background n_b:

- source 1 open: n₁b = n₁ + n_b
- source 2 open: n₂b = n₂ + n_b
- both open: n₁₂b = n₁ + n₂ + n_b

Adding the first two: n₁b + n₂b = n₁ + n₂ + 2n_b = n₁₂b + n_b. The real rates add up because the two sources are independent and stay in the same place (the lid only covers or uncovers them).

The **measured** rates do not obey it. With both sources open the detector is dead more often, so it loses proportionally more counts: n′₁₂b + n′_b < n′₁b + n′₂b. Putting n = n′/(1 − n′τ) (eq. 2.1) into 2.2 and keeping the first order in τ turns that deficit into eq. 2.3.`,
    },
    {
      id: "q2", n: "2", text: "Write the uncertainty propagation formula for a function of two variables;",
      answer: String.raw`For f(x, y) with independent x and y:

$$\sigma_f=\sqrt{\left(\frac{\partial f}{\partial x}\right)^2\sigma_x^2+\left(\frac{\partial f}{\partial y}\right)^2\sigma_y^2}$$

The derivatives are taken at the measured values.`,
    },
    {
      id: "q3", n: "3", text: "Using the uncertainty propagation formula calculate: (a) the uncertainty σ_f, if f(x, y) = x + y; (b) the relative uncertainty ε_f, if f(x, y) = x · y; (c) the relative uncertainty ε_f, if f(x, y) = x/y. Use the notations: σ_x — uncertainty of x; ε_x — relative uncertainty of x: ε_x = σ_x/x.",
      answer: String.raw`(a) ∂f/∂x = ∂f/∂y = 1:

$$\sigma_f=\sqrt{\sigma_x^2+\sigma_y^2}$$

(the same for x − y).

(b) ∂f/∂x = y, ∂f/∂y = x, so σ_f² = y²σ_x² + x²σ_y². Divide by f² = x²y²:

$$\varepsilon_f=\sqrt{\varepsilon_x^2+\varepsilon_y^2}$$

(c) ∂f/∂x = 1/y, ∂f/∂y = −x/y². Divide by f² = x²/y²:

$$\varepsilon_f=\sqrt{\varepsilon_x^2+\varepsilon_y^2},\qquad \sigma_f=\frac{x}{y}\sqrt{\frac{\sigma_x^2}{x^2}+\frac{\sigma_y^2}{y^2}}$$

Absolute errors add in quadrature for sums and differences; relative errors add in quadrature for products and quotients.`,
    },
    {
      id: "q4", n: "4", text: "Write the uncertainty propagation formula applied to equation 2.3. Can you simplify it (and/or the calculations) using the results of question 3?",
      answer: String.raw`Directly, τ depends on four rates:

$$\sigma_\tau^2=\left(\frac{\partial\tau}{\partial n_{1b}}\right)^2\sigma_{n_{1b}}^2+\left(\frac{\partial\tau}{\partial n_{2b}}\right)^2\sigma_{n_{2b}}^2\qquad+\left(\frac{\partial\tau}{\partial n_{12b}}\right)^2\sigma_{n_{12b}}^2+\left(\frac{\partial\tau}{\partial n_b}\right)^2\sigma_{n_b}^2$$

**Simplified with Q3.** Write τ = X/Y with X = n₁b + n₂b − n₁₂b − n_b and Y = 2(n₁b·n₂b − n₁₂b·n_b). Then:

- quotient, Q3c:
$$\sigma_\tau=\frac{X}{Y}\sqrt{\frac{\sigma_X^2}{X^2}+\frac{\sigma_Y^2}{Y^2}}$$
- sum, Q3a:
$$\sigma_X=\sqrt{\sigma_{n_{1b}}^2+\sigma_{n_{2b}}^2+\sigma_{n_{12b}}^2+\sigma_{n_b}^2}\qquad=\sqrt{\frac{N_{1b}+N_{2b}+N_{12b}+N_b}{T^2}}$$
- products, Q3b:
$$\sigma_Y=2\sqrt{S}\qquad S=n_{2b}^2\,\sigma_{n_{1b}}^2+n_{1b}^2\,\sigma_{n_{2b}}^2\qquad +\,n_b^2\,\sigma_{n_{12b}}^2+n_{12b}^2\,\sigma_{n_b}^2$$

with σ²_n = N/T² from Q6. In practice σ_X/X ≈ 70 % and σ_Y/Y < 2 %, so σ_τ ≈ τ·σ_X/X: the numerator decides everything.

(X and Y share the same rates, so treating them as independent is an approximation. The full derivatives give a σ_τ about 2 % smaller — see Results → Advanced.)`,
    },
    {
      id: "q5", n: "5", text: "How many significant digits should the uncertainty be written with (see also the the note at the end of this section)? How many significant digits should the final result be written with?",
      answer: String.raw`Following the guide's note on GUM (JCGM 100:2008 §7.2.6): **the uncertainty gets 1 significant digit, or 2 if that digit is 1**. The **result is rounded to the same decimal place** as the uncertainty.

Example from the final sheet: τ = 122.22 μs, σ_τ = 88.7 μs → σ = 90 μs → **τ = (1.2 ± 0.9)×10² μs**. With σ = 14.3 μs it would be (122 ± 14) μs.`,
    },
    {
      id: "q6", n: "6", text: "What is the uncertainty of a counting experiment (assuming a Poisson distribution) when the number of measured counts is N? What is the uncertainty of the count rate? (see Annex A.3)",
      answer: String.raw`For a Poisson distribution the variance equals the mean, so a single count N has

$$\sigma_N=\sqrt N$$

The rate n = N/T has (T is exact):

$$\sigma_n=\frac{\sqrt N}{T}=\sqrt{\frac{n}{T}},\qquad \frac{\sigma_n}{n}=\frac{1}{\sqrt N}$$

Example: N₁b = 7047 in 60 s → n₁b = 117.45 ± 1.40 c/s (1.2 %).`,
    },
    {
      id: "q7", n: "7", text: "(Optional) Is it possible for the measured deadtime to be negative? Justify your answer using equation 2.3.",
      answer: String.raw`**Yes, the measured value can be negative, even though the real dead time is always positive.**

- The denominator 2(n₁b·n₂b − n₁₂b·n_b) is always positive here: n₁b·n₂b ≈ 17 000 c²/s² is much larger than n₁₂b·n_b ≈ 300 c²/s².
- The numerator X = n₁b + n₂b − n₁₂b − n_b is a **small difference of large numbers**: about 4–10 c/s, while its counting error is σ_X ≈ 3 c/s.

A statistical fluctuation of 1.5–3σ makes X < 0, and then τ < 0. Such a value is not physical. It only means that the counting loss is hidden by the counting statistics: count longer (100 s), use stronger sources, or add sets. A set with τ < 0 is a reason to repeat that set.`,
    },
  ],
};
