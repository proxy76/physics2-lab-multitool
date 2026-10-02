import type { ExperimentDef } from "./types";

const U = ["3.0", "3.5", "4.0", "4.5", "5.0"];
const empty = () => ({
  rows: U.map((u, i) => ({ id: `u${i}`, U: u, d1_in: "", d1_out: "", d2_in: "", d2_out: "" })),
  L: "13.5",
  C_mode: "codata",
});

export const exp4: ExperimentDef = {
  id: "4",
  n: 4,
  title: "Electron diffraction by polycrystalline graphite",
  short: "d₁, d₂ of graphite",
  tool: "exp4.analyze",
  notes: ["E4-approx", "E4-C", "E4-fig"],
  brief: {
    measure: "The diameters D₁, D₂ of the two diffraction rings at ≥ 5 accelerating voltages, giving the graphite plane spacings d₁ and d₂.",
    formula: String.raw`D=\frac{2Lh}{\sqrt{2m_ee}}\,\frac{U^{-1/2}}{d}=\frac{C}{d}\,U^{-1/2},\qquad L=13.5\ \mathrm{cm}`,
    expected: [
      { label: "3 kV", value: "D₁ ≈ {{exp4.expected_rings.1.D1_cm}} cm, D₂ ≈ {{exp4.expected_rings.1.D2_cm}} cm" },
      { label: "5 kV", value: "D₁ ≈ {{exp4.expected_rings.5.D1_cm}} cm, D₂ ≈ {{exp4.expected_rings.5.D2_cm}} cm" },
      { label: "Live check at every U", value: "D₂/D₁ ≈ √3 ≈ 1.73" },
      { label: "Reference", value: "d₁ = 2.13×10⁻¹⁰ m, d₂ = 1.23×10⁻¹⁰ m" },
    ],
    safety: [
      "Never exceed 5 kV — X-rays are produced above it.",
      "Do not touch the tube or the cables: high voltage.",
      "No mechanical stress on the tube — it can implode.",
      "The bright central spot damages the screen: lower U right after each reading.",
    ],
    roles: {
      OP: "Controls the voltage knob; lowers U immediately after each reading.",
      RD: "Reads U on the display; measures inner and outer diameters of both rings.",
      AN: "Types the diameters, watches D₂/D₁ and the plot, keeps the clock short.",
    },
    before: [
      "Know the expected ring sizes (above) so you recognise the rings.",
      "Find out what you measure with: vernier caliper or flexible ruler.",
      "Make sure the room can be darkened — switch the app to the Dark-room theme.",
    ],
    why: "The rings scale as U^(−1/2), exactly as λ = h/p predicts — that is the de Broglie test. D₂/D₁ ≈ √3 is the graphite signature (d₁ = a√3/2, d₂ = a/2).",
    duration: "≈ 30 min",
  },
  steps: [
    {
      id: "off", role: ["OP"], title: "Supply off; turn the voltage knob fully left",
      safety: "Never exceed 5 kV. Do not touch the tube or the cables.",
    },
    {
      id: "on", role: ["OP"], title: "Switch the supply on and wait 1 minute for the cathode",
      timer: { seconds: 60, label: "Cathode warm-up" },
      meanwhile: "Darken the room; switch the app to the Dark-room theme (Settings).",
    },
    {
      id: "rings", role: ["OP"], title: "Raise U slowly until the rings appear",
      see: "A bright central spot with two concentric rings, typically from about 2–3 kV.",
      safety: "Lower U again as soon as you have seen the rings.",
    },
    {
      id: "measure", role: ["OP", "RD", "AN"], title: "At each U: set, read, measure both rings, lower U",
      how: "Recommended U: 3.0, 3.5, 4.0, 4.5, 5.0 kV (matches Q3; add 2.5 kV if the rings are clear). RD holds the caliper against the bulb, through the centre, and reads inner and outer diameter of ring 1 and ring 2 quickly. Define the edges the same way every time.",
      safety: "Never above 5 kV. Lower U right after the reading — the central spot burns the screen.",
      entry: { kind: "row", table: "rows", fields: ["U", "d1_in", "d1_out", "d2_in", "d2_out"], pick: true, addLabel: "Add a voltage" },
      decision: "If D₂/D₁ is far from 1.73 or a point is flagged, re-measure that voltage.",
      live: "plot",
    },
    { id: "second", role: ["RD"], title: "Optional: a second person measures the same rings", optional: true, how: "Average both readings before typing them." },
    { id: "finish", role: ["OP"], title: "Turn U down to 0, switch off and unplug" },
  ],
  cheat: [
    "Supply OFF, knob fully left. ON, wait 1 min.",
    "Raise U slowly until two rings appear. NEVER above 5 kV.",
    "For U = 3.0 … 5.0 kV (step 0.5): set U → measure inner/outer D₁, D₂ through the centre → LOWER U.",
    "Check D₂/D₁ ≈ 1.73 for every U.",
    "U to 0, off, unplug.",
  ],
  tables: [
    {
      id: "rows", title: "Ring diameters (guide §4.4 table)", path: "rows",
      columns: [
        { key: "U", label: "U", unit: "kV" },
        { key: "d1_in", label: "D₁ inner", unit: "cm" },
        { key: "d1_out", label: "D₁ outer", unit: "cm" },
        { key: "d2_in", label: "D₂ inner", unit: "cm" },
        { key: "d2_out", label: "D₂ outer", unit: "cm" },
      ],
      engineTable: "data",
      derived: [{ key: "x", label: "U^(−1/2)", unit: "V^(−½)" }, { key: "D1", label: "D₁", unit: "cm" }, { key: "D2", label: "D₂", unit: "cm" }, { key: "ratio", label: "D₂/D₁" }],
      rowLabel: (r) => (r.U ? `U = ${r.U} kV` : "new voltage"),
    },
  ],
  params: [
    { path: "L", label: "Target–screen distance L", unit: "cm", hint: "guide: 13.5 cm" },
    { path: "C_mode", label: "Constant C", options: [{ value: "codata", label: "2Lh/√(2mₑe) from the selected constants" }, { value: "guide", label: "3.3×10⁻¹⁰ (eq. 4.8)" }] },
  ],
  initialData: empty,
  headline: [{ key: "d1", label: "d₁" }, { key: "d2", label: "d₂" }, { key: "d1_d2", label: "d₁/d₂" }],
  complete: (d) => (d.rows || []).filter((r: Record<string, string>) => r.U && r.d1_in && r.d2_in).length >= 3,
  questions: [
    {
      id: "q1", n: "1", text: "Consider a grain of sand (m = 3 × 10⁻⁸ g) moving at the speed of sound in air (v = 340 m/s). Calculate the de Broglie wavelength and compare it to the carbon atomic diameter (≈ 2.2 × 10⁻¹⁰ m) and to the largest plane spacing in a carbon hexagonal lattice (d₁ = 2.13 × 10⁻¹⁰ m). Is it possible to obtain a diffraction pattern by shooting grains of sand at a carbon crystal lattice?",
      answer: `m = 3×10⁻⁸ g = {{exp4.q1.m}}, p = mv = {{exp4.q1.p}}.

λ = h/p = 6.626×10⁻³⁴ / 1.02×10⁻⁸ ≈ **{{exp4.q1.lambda}}**

λ/(2.2×10⁻¹⁰ m) ≈ {{exp4.q1.ratio_atom}} and λ/d₁ ≈ {{exp4.q1.ratio_d1}}: the wavelength is about 10¹⁶ times smaller than any atomic structure.

**No diffraction is possible** — diffraction needs obstacles comparable to λ (up to ~10 λ), and nothing that small exists.`,
    },
    {
      id: "q2", n: "2", text: "Repeat the calculation in Question 1 by using an electron accelerated under a potential difference of 2 kV as a replacement for the grain of sand. Is it possible to obtain a diffraction pattern by shooting electrons at a carbon crystal lattice?",
      answer: `λ = h/√(2mₑeU) with U = 2000 V: **{{exp4.q2.lambda}}** = {{exp4.q2.lambda_pm}} (relativistic: {{exp4.q2.lambda_rel}}, {{exp4.q2.rel_corr_pct}}).

d₁/λ ≈ {{exp4.q2.d1_over_lambda}}: λ is smaller than d₁ but of the same order, and Bragg's condition 2d sin θ = λ (λ ≤ 2d) is satisfied at θ ≈ {{exp4.q2.theta_deg}}.

**Yes — diffraction is possible** (this is the experiment).`,
    },
    {
      id: "q3", n: "3", text: "Calculate the speed and the associated wavelength of an electron accelerated under a p.d. of 3 to 5 kV with a step of 0.5 kV and write the results in a table. Was it correct to use the nonrelativistc formula for the kinetic energy in eq. 2?",
      answer: `Non-relativistic: v = √(2eU/mₑ), λ = h/(mₑv). Relativistic: γ = 1 + eU/(mₑc²), v = c√(1 − 1/γ²), λ = h/√(2mₑeU(1 + eU/2mₑc²)).

|U (kV)|v classical (m/s)|v/c (rel.)|λ classical (pm)|λ rel. (pm)|Δλ|Δv|
|---|---|---|---|---|---|---|
|{{exp4.q3_table.0.U_kV}}|{{exp4.q3_table.0.v_nr}}|{{exp4.q3_table.0.beta_r}}|{{exp4.q3_table.0.lambda_nr_pm}}|{{exp4.q3_table.0.lambda_r_pm}}|{{exp4.q3_table.0.dl_pct}} %|{{exp4.q3_table.0.dv_pct}} %|
|{{exp4.q3_table.1.U_kV}}|{{exp4.q3_table.1.v_nr}}|{{exp4.q3_table.1.beta_r}}|{{exp4.q3_table.1.lambda_nr_pm}}|{{exp4.q3_table.1.lambda_r_pm}}|{{exp4.q3_table.1.dl_pct}} %|{{exp4.q3_table.1.dv_pct}} %|
|{{exp4.q3_table.2.U_kV}}|{{exp4.q3_table.2.v_nr}}|{{exp4.q3_table.2.beta_r}}|{{exp4.q3_table.2.lambda_nr_pm}}|{{exp4.q3_table.2.lambda_r_pm}}|{{exp4.q3_table.2.dl_pct}} %|{{exp4.q3_table.2.dv_pct}} %|
|{{exp4.q3_table.3.U_kV}}|{{exp4.q3_table.3.v_nr}}|{{exp4.q3_table.3.beta_r}}|{{exp4.q3_table.3.lambda_nr_pm}}|{{exp4.q3_table.3.lambda_r_pm}}|{{exp4.q3_table.3.dl_pct}} %|{{exp4.q3_table.3.dv_pct}} %|
|{{exp4.q3_table.4.U_kV}}|{{exp4.q3_table.4.v_nr}}|{{exp4.q3_table.4.beta_r}}|{{exp4.q3_table.4.lambda_nr_pm}}|{{exp4.q3_table.4.lambda_r_pm}}|{{exp4.q3_table.4.dl_pct}} %|{{exp4.q3_table.4.dv_pct}} %|

v/c ≈ 0.11–0.14. **Yes, the non-relativistic formula was acceptable:** it makes λ only 0.15–0.24 % too large, far below the ≈ 2–5 % experimental uncertainty of d.`,
    },
    {
      id: "q4", n: "4", text: "Explain how does this experiment confirm de Broglie hypothesys?",
      answer: `- The rings are an **interference pattern** (Bragg reflection on the randomly oriented crystallites, Debye–Scherrer) — a wave phenomenon that particles alone would not produce.
- Their diameters scale as **U^(−1/2)**, exactly as λ = h/p = h/√(2meU) predicts (our D vs U^(−1/2) plot is a straight line).
- The spacings d₁, d₂ we obtain agree with graphite's known spacings (2.13 and 1.23 Å from X-ray crystallography), and D₂/D₁ ≈ √3 as the hexagonal lattice requires.
- (The rings are made by electrons — a magnet near the bulb would shift them. Mention as an argument only; do not try it without permission.)`,
    },
    {
      id: "q5", n: "5", text: "Consider a maximum measured value of 6 cm for the diameter of the second diffraction ring. Is the approximation used in tan(2θ) ≈ 2 sin θ (eq. 5) still valid? Justify your answer.",
      answer: `tan 2θ = D/2L = 3/13.5 = {{exp4.q5.tan2theta}} ⇒ 2θ = {{exp4.q5.two_theta_deg}}. Then sin 2θ = {{exp4.q5.sin2theta}} and 2 sin θ = {{exp4.q5.two_sin_theta}}.

Using D/2L instead of 2 sin θ is off by **{{exp4.q5.err_pct}}**, so d comes out ≈ 1.8 % too small. That is **borderline**: smaller than a typical 3–5 % uncertainty of d from the fit, but no longer negligible. For D ≲ 4 cm the error drops below 1 %. The app's Advanced panel applies the exact geometry.`,
    },
    {
      id: "q6", n: "6", text: "What type of a dependence exists between the measured diameter value D and the inverse square root value of the accelerating voltage U^(−1/2), D = f(U^(−1/2))?",
      answer: `**Direct proportionality** — a straight line through the origin:

$$D=\frac{C}{d}\,U^{-1/2},\qquad C=\frac{2Lh}{\sqrt{2m_ee}}$$

with C = {{exp4.C_codata}} (CODATA). The slope is C/d, so d = C/slope.`,
    },
    {
      id: "q7", n: "7", text: "Figure out a linear dependence between the accelerating voltage U and a power of D, U = f(D^x). In such a linear representation what is the equation which connects the slope to the unknown quantity d?",
      answer: `Square and invert D = (C/d)·U^(−1/2):

$$U=\frac{C^2}{d^2}\,D^{-2}\qquad (x=-2)$$

U plotted against D⁻² is a straight line through the origin with slope m = C²/d², so **d = C/√m**. The app computes this as a cross-check (Advanced).`,
    },
  ],
};
