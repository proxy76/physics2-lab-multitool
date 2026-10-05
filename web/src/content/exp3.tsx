import type { ExperimentDef } from "./types";
import { LiveTable } from "../components/LiveTable";

const HG = ["404.7", "407.8", "433.9", "434.7", "435.8", "535.4", "546.1", "577.0", "579.0", "612.3", "623.4"];
const H: [string, string][] = [["Hα", "3"], ["Hβ", "4"], ["Hγ", "5"], ["Hδ", "6"], ["Hε", "7"]];

const empty = () => ({
  hg: HG.map((lambda, i) => ({ id: `hg${i}`, lambda, x: "" })),
  h: H.map(([line, n], i) => ({ id: `h${i}`, line, n, x: "" })),
  sigma_x: "0.05",
  lambda_set: "guide",
});

export const exp3: ExperimentDef = {
  id: "3",
  n: 3,
  title: "Rydberg constant from the Balmer series",
  short: "R_H from a spectrogram",
  tool: "exp3.analyze",
  notes: ["E3-slope", "E3-h", "E3-attn", "E3-fig", "E3-nm", "E3-Q4", "E3-honesty"],
  brief: {
    measure: "Positions x of 11 Hg lines and 5 Balmer lines on a prism spectrogram. The Hg lines calibrate x(λ) (Cauchy), which gives the hydrogen wavelengths and then R_H.",
    formula: String.raw`x=A+\frac{B}{\lambda^2},\qquad \frac1{\lambda}=R_H\left(\frac1{2^2}-\frac1{n_i^2}\right)`,
    expected: [
      { label: "Vernier", value: "main scale mm + vernier 0.1 mm" },
      { label: "Balmer lines (Q3)", value: "656.1, 486.0, 433.9, 410.1, 396.9 nm" },
      { label: "R_H (CODATA)", value: "{{exp3.RH_codata}}" },
      { label: "Hα and Hε", value: "outside the Hg range → extrapolated, largest errors" },
    ],
    safety: ["Handle the spectrogram plate by its metal holder — never touch the emulsion.", "Rest your eyes between lines; switch eyes on the eyepiece."],
    roles: {
      OP: "Moves the stage (always from the same side), centres each line under the reticle.",
      RD: "Reads the locator: mm on the main scale + vernier line × 0.1 mm.",
      AN: "Types each reading, watches the calibration line and the predicted H positions.",
    },
    before: [
      "Answer Q3 — the predicted Balmer wavelengths help you find the lines.",
      "Learn the vernier reading: main-scale mm before the vernier zero + (number of the coinciding vernier line) × 0.1 mm.",
      "Memorise the pattern: triplet 433.9/434.7/435.8 nm with 2 lines on one side and 6 on the other.",
    ],
    why: "Misidentifying a line is the most common failure. Once the Hg calibration is in, the app predicts where each H line must be — look there.",
    duration: "≈ 45 min",
  },
  steps: [
    {
      id: "mount", role: ["OP"], title: "Mount the spectrogram, focus, lines parallel to the reticle",
      how: "Rotate the plate in its holder until the spectral lines are parallel to the reticle line in the eyepiece.",
    },
    {
      id: "find-hg", role: ["OP"], title: "Find the mercury spectrum (the one with many lines)",
      how: "x knob: perpendicular to the lines; y knob: along them. Hg shows the tight triplet 433.9/434.7/435.8 nm and the yellow doublet 577.0/579.0 nm. The H spectrum has a few strong, widely spaced lines (ignore faint molecular H₂ lines).",
    },
    {
      id: "orient", role: ["OP", "AN"], title: "Orientation check: start at 404.7 nm, x must increase with λ",
      how: "Find the triplet. One side has 2 lines (404.7, 407.8 nm), the other 6 (535.4, 546.1, 577.0, 579.0, 612.3, 623.4 nm). Start at 404.7 nm.",
      decision: "If the locator reading decreases with wavelength, flip the plate.",
    },
    {
      id: "hg", role: ["OP", "RD", "AN"], title: "Read the locator for each of the 11 Hg lines (Table 3.1)",
      how: "Centre each line under the reticle, always approaching from the same direction (removes backlash). RD reads mm + vernier × 0.1 mm.",
      entry: { kind: "table", table: "hg" },
      decision: "If a point is more than ≈ 0.1–0.2 mm off the calibration line (flagged), re-measure it.",
      live: "plot",
    },
    {
      id: "find-h", role: ["OP"], title: "Bring the H spectrum into view with the y knob",
      how: "Hγ lines up with Hg 434.7 nm. Hδ (410.2 nm) is just beyond Hg 407.8 nm; Hε (397.0 nm) is before 404.7 nm near the edge and faint; Hβ (486.1 nm) is in the big gap between 435.8 and 535.4 nm; Hα (656.3 nm) is beyond 623.4 nm at the far end.",
      see: "The predicted positions (below) tell you where to look.",
      live: "check",
      notes: ["E3-fig"],
    },
    {
      id: "h", role: ["OP", "RD", "AN"], title: "Read the locator for Hα … Hε (Table 3.2)",
      entry: { kind: "table", table: "h" },
      decision: "If a λ_H comes out several nm from the expected value, the line is probably misidentified — check the prediction.",
      live: "check",
    },
    { id: "reread", role: ["RD"], title: "Optional: a second person re-reads every line", optional: true, how: "Average the two readings before typing, or note the difference as an estimate of σ_x." },
  ],
  cheat: [
    "Mount plate, focus, lines ∥ reticle.",
    "Hg spectrum: triplet 433.9/434.7/435.8; 2 lines one side, 6 the other. Start at 404.7. x must grow with λ — else flip the plate.",
    "Read all 11 Hg lines, same approach direction (backlash). mm + vernier × 0.1 mm.",
    "y knob → H spectrum. Hγ ↔ Hg 434.7. Use the app's predicted positions.",
    "Read Hα, Hβ, Hγ, Hδ, Hε.",
  ],
  tables: [
    {
      id: "hg", short: "Hg lines", title: "Table 3.1 — mercury lines", path: "hg", fixed: true,
      columns: [{ key: "lambda", label: "λ_Hg", unit: "nm", kind: "fixed" }, { key: "x", label: "x_Hg", unit: "mm" }],
      engineTable: "hg", derived: [{ key: "X", label: "λ⁻²", unit: "µm⁻²" }],
      rowLabel: (r) => `Hg ${r.lambda} nm`,
    },
    {
      id: "h", short: "H lines", title: "Table 3.2 — hydrogen lines", path: "h", fixed: true,
      columns: [{ key: "line", label: "Spectral line", kind: "fixed" }, { key: "n", label: "n_i", kind: "fixed" }, { key: "x", label: "x_H", unit: "mm" }],
      engineTable: "h", derived: [{ key: "lam", label: "λ_H", unit: "nm" }, { key: "ref", label: "NIST air", unit: "nm" }, { key: "dev", label: "λ − NIST", unit: "nm" }],
      rowLabel: (r) => `${r.line} (n = ${r.n})`,
    },
  ],
  params: [
    { path: "sigma_x", label: "σ_x of one reading (Advanced)", unit: "mm", hint: "half the 0.1 mm vernier step" },
    { path: "lambda_set", label: "Hg wavelengths", options: [{ value: "guide", label: "Guide (Table 3.1)" }, { value: "nist", label: "NIST ASD (Advanced)" }] },
  ],
  initialData: empty,
  headline: [{ key: "R", label: "R_H" }, { key: "A", label: "Cauchy A" }, { key: "B", label: "Cauchy B" }],
  complete: (d) => d.hg.filter((r: Record<string, string>) => r.x).length >= 5 && d.h.filter((r: Record<string, string>) => r.x).length >= 3,
  livePanel: (r) =>
    r?.extra?.predicted ? (
      <LiveTable title="Where to look for the H lines (from your calibration)" cols={[["line", "Line"], ["lambda", "λ NIST (nm)"], ["x", "look near x (mm)"], ["sx", "±"]]}
        rows={r.extra.predicted.map((p: Record<string, string | boolean>) => ({ ...p, line: `${p.line}${p.extrapolated ? " (extrapolated)" : ""}` }))} />
    ) : null,
  questions: [
    {
      id: "q1", n: "1", text: "What is the relation between the energy and the frequency of a photon? What about the dependence of energy on wavelength?",
      answer: String.raw`**E = hf** — proportional to the frequency. With f = c/λ: **E = hc/λ**, inversely proportional to the wavelength.

Handy form: hc = {{exp3.hc_eVnm}}, so E(eV) ≈ 1239.84/λ(nm); e.g. 500 nm → {{exp3.q1_example_E}}.`,
    },
    {
      id: "q2", n: "2", text: "Can one see radiation in the Lyman series? Justify your answer. Paschen spectral series.",
      answer: String.raw`**Lyman (n_f = 1): no.** With R = 1.09737×10⁷ m⁻¹ the lines run from Lyα = {{exp3.lyman_alpha_R}} (n_i = 2) down to the series limit {{exp3.lyman_limit_R}} — all ultraviolet, far below the ≈ 380 nm edge of vision (and absorbed by air and glass).

**Paschen (n_f = 3): no.** From Pα = {{exp3.paschen_alpha_R}} (n_i = 4) down to the limit {{exp3.paschen_limit_R}} — all infrared, above ≈ 750 nm.

(With R_H instead of R∞: Lyα {{exp3.lyman_alpha_RH}}, Pα {{exp3.paschen_alpha_RH}}.) Only the Balmer series (n_f = 2) has lines in the visible.`,
    },
    {
      id: "q3", n: "3", text: "Calculate five wavelengths in the visible light range for the hydrogen gas emission by applying eq. 3.8. Record your results in the increasing of order in the first 3 columns of the data table bellow. Use R_H = 1.09737 × 10⁷ m⁻¹",
      answer: String.raw`λ = 1/[R(1/4 − 1/n_i²)], in increasing order of n_i:

|n_i|n_f|λ_H (nm)|Colour|
|---|---|---|---|
|3|2|{{exp3.q3_table.0.lambda}}|{{exp3.q3_table.0.colour}}|
|4|2|{{exp3.q3_table.1.lambda}}|{{exp3.q3_table.1.colour}}|
|5|2|{{exp3.q3_table.2.lambda}}|{{exp3.q3_table.2.colour}}|
|6|2|{{exp3.q3_table.3.lambda}}|{{exp3.q3_table.3.colour}}|
|7|2|{{exp3.q3_table.4.lambda}}|{{exp3.q3_table.4.colour}}|

These are vacuum wavelengths for an infinitely heavy nucleus. The measured air wavelengths (NIST: 656.28, 486.13, 434.05, 410.17, 397.01 nm) differ by ≈ 0.03 %: the reduced-mass correction adds +0.054 %, the refractive index of air subtracts ≈ 0.028 %.`,
    },
    {
      id: "q4", n: "4", text: "Find the colour of the lines in the Balmer series and fill the 4-th column in the table above. x_Hg is on the abscissa.",
      answer: String.raw`Hα 656 nm **red**; Hβ 486 nm **cyan (blue-green)**; Hγ 434 nm **blue-violet**; Hδ 410 nm **violet**; Hε 397 nm **deep violet**, at the edge of visibility (near UV). See the table in Q3.

> Guide note: “x_Hg is on the abscissa” is a stray fragment from the graph instructions, not part of this question.`,
    },
    {
      id: "theory", n: "Eq. 3.7", text: "(Check) R_H has the theoretical expression R_H = mₑe⁴/(8cε₀²h³) — eq. 3.7 with the corrected power of h.",
      answer: String.raw`With CODATA constants eq. 3.7 gives **{{exp3.eq37_codata}}** = R∞ (infinitely heavy nucleus); with the guide's rounded constants {{exp3.eq37_guide}}. For hydrogen the reduced mass gives R_H = R∞/(1 + mₑ/m_p) = {{exp3.RH_codata}} ({{exp3.RH_Rinf_diff_pct}} smaller). Eq. 3.3 with h² gives E₁ = {{exp3.E1_codata}}.

> The guide prints h³ in eq. 3.2–3.3 and h⁴ in 3.4–3.7; only h² and h³ give the right units.`,
    },
  ],
};
