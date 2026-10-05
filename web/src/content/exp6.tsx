import type { ExperimentDef, FieldDef, TableDef } from "./types";
import { LiveTable } from "../components/LiveTable";

const MATS = ["Al", "Fe", "Pb"] as const;

const empty = () => ({
  x_unit: "cm",
  t_default: "120",
  zero: { t: "", H: "", L: "", R: "" },
  thickness_tool: "",
  materials: MATS.map((symbol) => ({ symbol, rows: [], graphical: {} })),
});

const matTable = (i: number, sym: string): TableDef => ({
  id: sym,
  title: `${sym} — one table per material (§6.4)`,
  path: `materials.${i}.rows`,
  columns: [
    { key: "x", label: "Thickness", unit: "cm" },
    { key: "t", label: "t", unit: "s" },
    { key: "H", label: "Height", unit: "counts" },
    { key: "L", label: "Left channel", unit: "ch" },
    { key: "R", label: "Right channel", unit: "ch" },
  ],
  defaults: {},
  engineTable: `data.${sym}`,
  derived: [{ key: "A", label: "Area", unit: "counts" }, { key: "rate", label: "Area/t", unit: "s⁻¹" }, { key: "ln", label: "ln(Area/t)" }],
  rowLabel: (r, j) => `${sym} #${j + 1}` + (r.x ? ` · x = ${r.x} cm` : ""),
  note: "Leave t empty to use the default measuring time set under Data → parameters.",
});

const graphical = (i: number, sym: string): FieldDef[] => [
  { path: `materials.${i}.graphical.x1`, label: `${sym}: P₁ x`, unit: "cm" },
  { path: `materials.${i}.graphical.y1`, label: `${sym}: P₁ ln(Area/t)` },
  { path: `materials.${i}.graphical.x2`, label: `${sym}: P₂ x`, unit: "cm" },
  { path: `materials.${i}.graphical.y2`, label: `${sym}: P₂ ln(Area/t)` },
  { path: `materials.${i}.graphical.max_x1`, label: `${sym}: steepest line P₁ x` },
  { path: `materials.${i}.graphical.max_y1`, label: `${sym}: steepest line P₁ y` },
  { path: `materials.${i}.graphical.max_x2`, label: `${sym}: steepest line P₂ x` },
  { path: `materials.${i}.graphical.max_y2`, label: `${sym}: steepest line P₂ y` },
  { path: `materials.${i}.graphical.min_x1`, label: `${sym}: shallowest line P₁ x` },
  { path: `materials.${i}.graphical.min_y1`, label: `${sym}: shallowest line P₁ y` },
  { path: `materials.${i}.graphical.min_x2`, label: `${sym}: shallowest line P₂ x` },
  { path: `materials.${i}.graphical.min_y2`, label: `${sym}: shallowest line P₂ y` },
];

export const exp6: ExperimentDef = {
  id: "6",
  n: 6,
  title: "Attenuation of γ radiation in Al, Fe and Pb",
  short: "μ for Al, Fe, Pb",
  tool: "exp6.analyze",
  notes: ["E6-mass", "E6-time", "E6-fig"],
  brief: {
    measure: "The linear attenuation coefficient μ (and μ/ρ) of Al, Fe and Pb for the 661.7 keV γ line of ¹³⁷Cs, from the photopeak area at several absorber thicknesses.",
    formula: String.raw`I(x)=I_0e^{-\mu x}\ \Rightarrow\ \ln\frac{A}{t}=\ln I_0-\mu x,\qquad A=\tfrac12(R-L)\,H`,
    expected: [
      { label: "Detector high voltage", value: "0.67 kV (Fig. 6.2)" },
      { label: "CASSY Gain Box A1", value: "≈ −5.81" },
      { label: "μ (NIST XCOM)", value: "Al {{exp6.materials.0.mu}}, Fe {{exp6.materials.1.mu}}, Pb {{exp6.materials.2.mu}} cm⁻¹" },
      { label: "Thickest stack must reach x ≳ 1/μ", value: "Al ≳ {{exp6.materials.0.x_e}} cm, Fe ≳ {{exp6.materials.1.x_e}} cm, Pb ≳ {{exp6.materials.2.x_e}} cm" },
    ],
    safety: [
      "The professor places and removes the source.",
      "Lead is toxic: handle Pb sheets with gloves or wash your hands afterwards; no food at the bench.",
      "Do not touch the high-voltage supply settings.",
    ],
    roles: {
      OP: "Stacks the absorber sheets, measures their thickness, starts/stops CASSY.",
      RD: "Reads L, R and H from the spectrum cursor and calls them out.",
      AN: "Types the triangle values, watches ln(Area/t) vs x, checks the e-factor.",
    },
    before: [
      "Answer Q1 (the linear form) — the analysis starts with it (§6.5).",
      "Plan thicknesses: 5–7 values from 0 to at least 1/μ for each material (see above). Al needs the most sheets.",
      "Learn the CASSY steps of §6.3.1.",
    ],
    why: "Only full-energy photons that crossed the absorber without interacting end up in the photopeak; scattered photons fall into the Compton region. Using the photopeak area approximates the narrow-beam (good-geometry) condition that Lambert's law assumes.",
    duration: "≈ 60–75 min",
  },
  steps: [
    {
      id: "identify", role: ["ALL"], title: "Identify source holder, absorber holder, detector, HV supply, PC",
      how: "Fig. 6.2: source holder on top, absorber plate holder (green outline), scintillation detector with photomultiplier below facing up, high-voltage supply with display, CASSY interface and PC.",
    },
    {
      id: "hv", role: ["OP"], title: "Switch the detector supply on; check the display reads 0.67 kV",
      safety: "Do not adjust the high voltage.",
      verify: ["HV display shows 0.67 kV"],
    },
    {
      id: "cassy", role: ["AN"], title: "Start CASSY Lab and set Gain Box A1 to about −5.81",
      how: "1. Launch CASSYlab — a “Settings” window opens.\n2. Click the red button to activate the measuring channel — “Measuring parameters” opens.\n3. Move the Gain Box A1 slider to ≈ −5.81.\n4. Close both windows.\n5. If a measuring time can be set, use the same fixed time (e.g. 120 s) for every spectrum. Otherwise note the time shown in the upper-right corner.",
      verify: ["Where CASSY lets you fix the measuring time", "CASSY peak tools (Gaussian fit / integral) as an optional cross-check"],
      entry: { kind: "fields", fields: [{ path: "t_default", label: "Measuring time used for every spectrum", unit: "s" }] },
    },
    {
      id: "bg", role: ["AN"], title: "Optional: record a background spectrum (no source)", optional: true,
      how: "Not needed for the photopeak triangle method, but it shows you where the peak region is empty.",
    },
    {
      id: "zero", role: ["OP", "RD", "AN"], title: "Professor places the source; measure with no absorber (x = 0)",
      timer: { seconds: 120, label: "Spectrum 120 s" },
      see: "A sharp photopeak on the right and the broad Compton continuum on the left (Fig. 6.3).",
      how: "Read the photopeak as a triangle (Fig. 6.4): left foot channel L (A), right foot channel R (B), height H above the baseline (C). Area = ½(R − L)·H. Use the same convention for every spectrum — consistency matters more than perfection.\n\nThis x = 0 spectrum is used for all three materials. If you re-measure x = 0 later (to check for drift), enter it as a row of that material's table; that material then uses its own.",
      entry: { kind: "fields", fields: [{ path: "zero.L", label: "L (left foot)", unit: "ch" }, { path: "zero.R", label: "R (right foot)", unit: "ch" }, { path: "zero.H", label: "H (height)", unit: "counts" }, { path: "zero.t", label: "t (empty = default)", unit: "s" }] },
    },
    {
      id: "al", role: ["OP", "RD", "AN"], title: "Aluminium: add sheets, record total thickness, measure, read the triangle",
      how: "Stack sheets flat and centred on the beam axis. Measure the total thickness with a caliper/micrometer (or add the labelled values). 5–7 thicknesses from 0 up to ≳ {{exp6.materials.0.x_e}} cm.",
      timer: { seconds: 120, label: "Spectrum 120 s" },
      entry: { kind: "row", table: "Al", fields: ["x", "L", "R", "H", "t"], addLabel: "Next Al thickness" },
      meanwhile: "During each spectrum OP prepares and measures the next stack; AN computes nothing by hand — the app does it.",
      decision: "If the largest thickness has not reduced Area/t by ≈ e (×2.7), add sheets. Not enough Al? Use all of it and note this in the report.",
      live: "plot",
    },
    {
      id: "fe", role: ["OP", "RD", "AN"], title: "Iron: repeat with Fe sheets only — never mix materials",
      how: "Thicknesses from 0 to ≳ {{exp6.materials.1.x_e}} cm. The x = 0 measurement is shared; re-measure it if time allows to detect drift.",
      timer: { seconds: 120, label: "Spectrum 120 s" },
      entry: { kind: "row", table: "Fe", fields: ["x", "L", "R", "H", "t"], addLabel: "Next Fe thickness" },
      live: "plot",
    },
    {
      id: "pb", role: ["OP", "RD", "AN"], title: "Lead: repeat with Pb sheets only",
      how: "Thicknesses from 0 to ≳ {{exp6.materials.2.x_e}} cm.",
      safety: "Lead is toxic — gloves or wash hands afterwards.",
      timer: { seconds: 120, label: "Spectrum 120 s" },
      entry: { kind: "row", table: "Pb", fields: ["x", "L", "R", "H", "t"], addLabel: "Next Pb thickness" },
      live: "plot",
    },
    {
      id: "save", role: ["AN"], title: "Save the spectra in CASSY and photograph the screen",
      entry: { kind: "fields", fields: [{ path: "thickness_tool", label: "Thickness instrument and least count (for Q2)", text: true, placeholder: "e.g. caliper 0.05 mm" }] },
    },
    { id: "finish", role: ["ALL"], title: "Professor removes the source; shut down", safety: "Wash your hands after handling lead." },
  ],
  cheat: [
    "Detector on, HV display 0.67 kV. CASSYlab → red button → Gain Box A1 ≈ −5.81 → close windows.",
    "Same measuring time for every spectrum (e.g. 120 s).",
    "x = 0 spectrum: triangle L, R, H (Fig. 6.4). Area = ½(R−L)H.",
    "Al, then Fe, then Pb: 5–7 thicknesses each, up to ≳ 1/μ (Al ≈ 5 cm, Fe ≈ 1.7 cm, Pb ≈ 0.8 cm).",
    "Never mix materials in a stack. Same triangle convention every time.",
    "Save spectra + photo of the screen. Note the thickness instrument for Q2.",
  ],
  tables: MATS.map((s, i) => matTable(i, s)),
  params: [
    { path: "t_default", label: "Default measuring time", unit: "s" },
    { path: "zero.L", label: "x = 0: left channel L", unit: "ch" },
    { path: "zero.R", label: "x = 0: right channel R", unit: "ch" },
    { path: "zero.H", label: "x = 0: height H", unit: "counts" },
    { path: "zero.t", label: "x = 0: time (empty = default)", unit: "s" },
    { path: "thickness_tool", label: "Thickness instrument (Q2)", text: true },
  ],
  resultInputs: MATS.map((s, i) => ({
    title: `Graphical method — ${s}`,
    help: "On your millimetre-paper graph of ln(Area/t) vs x, draw the best line and read two points far apart on it (not data points). For the uncertainty also read two points on the steepest and on the shallowest acceptable lines. μ = −slope.",
    fields: graphical(i, s),
  })),
  initialData: empty,
  headline: [{ key: "Al.mu", label: "Al" }, { key: "Fe.mu", label: "Fe" }, { key: "Pb.mu", label: "Pb" }],
  complete: (d) => (d.materials || []).every((m: { rows: Record<string, string>[] }) => m.rows.filter((r) => r.x && r.H && r.L && r.R).length >= 3),
  livePanel: (r) =>
    r?.extra?.q6 ? (
      <LiveTable title="Graphical vs least squares (Q6)" cols={[["mat", "Material"], ["graph", "μ graph"], ["lsq", "μ LSQ"], ["diff", "|Δμ|"], ["z", "z"]]}
        rows={Object.entries(r.extra.q6).map(([mat, v]) => ({ mat, ...(v as Record<string, string>) }))} />
    ) : null,
  questions: [
    {
      id: "q1", n: "1", text: "Starting from relation 6.2, write a linear relation between the intensity of the radiation and the thickness of material.",
      answer: String.raw`Take the natural logarithm of I(x) = I₀e^(−μx):

$$\ln I(x)=\ln I_0-\mu x$$

A straight line in (x, ln I) with **slope −μ** and **intercept ln I₀**. Equivalently ln(I₀/I) = μx, a line through the origin with slope μ. Since I ∝ Area/t, we plot ln(Area/t) against x.`,
    },
    {
      id: "q2", n: "2", text: "What is the uncertainty of the foil thickness. Why?",
      answer: String.raw`It is set by the **measuring instrument's resolution** (Type B uncertainty), because a single reading of a thickness has no statistical scatter to evaluate:

- caliper with 0.05 mm least count: ± {{exp6.q2.caliper_half}} (half the least count), or {{exp6.q2.caliper_gum}} with the GUM rectangular rule (least count/(2√3));
- micrometer with 0.01 mm: ± {{exp6.q2.micrometer_half}}, or {{exp6.q2.micrometer_gum}} (GUM);
- labelled sheet thicknesses: ± half of the last printed digit.

For a stack of k sheets measured one by one, σ = √k·σ_sheet if the errors are independent (k·σ_sheet if systematic); measuring the whole stack at once keeps it at one σ.

It is small compared with the counting/triangle scatter of ln(Area/t) (≈ 1–3 %), which is why the least-squares fit treats x as exact.`,
      live: (_r, d) => (d?.thickness_tool ? <p className="live-note">Your instrument: <b>{d.thickness_tool}</b></p> : null),
    },
    {
      id: "q3", n: "3", text: "Which of the three materials is the most useful for creating a shield to protect ourselves from gamma radiation? Why? How thick should such a shield be to reduce the incoming radiation by a factor of 1000?",
      answer: String.raw`**Lead.** It has by far the largest μ per centimetre, for two reasons:

- high density (11.35 g/cm³): Compton scattering, dominant at 662 keV, scales with the electron density ∝ ρZ/A;
- high Z = 82: photoelectric absorption grows roughly as Z⁴–Z⁵ and still gives {{exp6.materials.2.photo_pct}} % of μ/ρ for Pb at 662 keV (only {{exp6.materials.1.photo_pct}} % for Fe).

Thickness for a factor 1000: e^(−μx) = 1/1000 ⇒

$$x=\frac{\ln 1000}{\mu}=\frac{6.908}{\mu}$$

With the NIST value μ_Pb = {{exp6.materials.2.mu}} cm⁻¹: x ≈ **{{exp6.q3_ref_x1000}}**. Use your own μ (below) with its propagated uncertainty σ_x = (ln 1000)·σ_μ/μ². Real broad-beam shields need a little more because of build-up of scattered photons.`,
      live: (r) => r?.extra?.q3 ? <p className="live-note">Your data: best shield <b>{r.extra.q3.material}</b>, μ = {r.extra.q3.mu} cm⁻¹ → x₁₀₀₀ = <b>{r.extra.q3.x1000} cm</b></p> : null,
    },
    {
      id: "q4", n: "4", text: "In a shielding application (where a certain material is placed between us and the source) what is better: to use a single piece of thickness x or two pieces of thickness x/3 and 2x/3? Why?",
      answer: String.raw`**They are equivalent.** Attenuation is multiplicative:

$$e^{-\mu x/3}\cdot e^{-2\mu x/3}=e^{-\mu x}$$

Only the total thickness counts in the narrow-beam law (e.g. Pb, x = 3 cm: {{exp6.q4.single}} either way). In practice a single piece is preferable: no gaps or misalignment between pieces where radiation could stream through.`,
    },
    {
      id: "q5", n: "5", text: "Knowing that the materials you are using as absorbers are Fe, Pb and Al, how do you identify them?",
      answer: String.raw`**Without radiation:** density (weigh a sheet and measure its volume): Al 2.70, Fe 7.87, Pb 11.35 g/cm³. A magnet attracts only iron. Lead is very heavy, soft (scratches with a fingernail) and dull grey; aluminium is light and bright.

**With radiation:** μ per cm is ordered Pb > Fe > Al ({{exp6.materials.2.mu}} > {{exp6.materials.1.mu}} > {{exp6.materials.0.mu}} cm⁻¹, NIST).

**Subtle point:** μ/ρ is almost the same for Al and Fe at 662 keV ({{exp6.materials.0.mu_rho}} vs {{exp6.materials.1.mu_rho}} cm²/g) because Compton scattering dominates and Z/A ≈ {{exp6.materials.0.ZA}} vs {{exp6.materials.1.ZA}}. Pb's μ/ρ = {{exp6.materials.2.mu_rho}} cm²/g is clearly larger because of the photoelectric effect. So μ separates Al from Fe only through density.`,
    },
    {
      id: "q6", n: "6", text: "Do you see any difference between the attenuation coefficients calculated with the graphical method vs using the least square method? If you do, is this difference significant?",
      answer: String.raw`Compare the two with their uncertainties:

$$z=\frac{|\mu_{graph}-\mu_{LSQ}|}{\sqrt{\sigma_{graph}^2+\sigma_{LSQ}^2}}$$

σ_graph comes from the steepest/shallowest-line method, σ_LSQ = s_a. The difference is **significant if z > 2**. Usually z < 2: the hand-drawn line agrees with least squares within its (larger) uncertainty; least squares is objective and gives a smaller, statistically defined σ.

Enter your graph points under Results → Graphical method; the table below fills in.`,
      live: (r) => r?.extra?.q6 ? <LiveTable title="Your data" cols={[["mat", "Material"], ["graph", "μ graph"], ["lsq", "μ LSQ"], ["diff", "|Δμ|"], ["z", "z"]]}
        rows={Object.entries(r.extra.q6).map(([mat, v]) => ({ mat, ...(v as Record<string, string>), z: (v as Record<string, string>).z ?? "—" }))} /> : null,
    },
  ],
};
