import type { ExperimentDef, RunStep, TableDef } from "./types";
import { LiveTable } from "../components/LiveTable";
import { Exp6Analysis, MATS, materialPanel, materialResult, zeroPanel } from "./exp6Guide";

const MAT_NAME: Record<string, string> = { Al: "Aluminium", Fe: "Iron", Pb: "Lead" };
const EXAMPLE_X: Record<string, string> = { Al: "1", Fe: "0.3", Pb: "0.2" };

// Two Run steps per material: the measuring loop (one table row per stack), then its result.
const matSteps = (sym: string, i: number): RunStep[] => [
  {
    id: sym.toLowerCase(), role: ["OP", "RD", "AN"], title: `${MAT_NAME[sym]}: one row per stack (thickness, measure, read the peak)`, expanded: true,
    safety: sym === "Pb" ? "Lead is toxic: wear gloves or wash your hands afterwards. No food at the bench." : undefined,
    how: `Repeat this loop for each ${sym} thickness:\n\n1. **OP** ${i > 0 ? "takes the previous material out, then " : ""}puts ${sym} sheets (only ${sym}!) flat and centred in the absorber holder.\n2. **OP** measures the total thickness of the stack with the caliper (or adds up the labels) and says it **in cm**: 1 mm = 0.1 cm.\n3. **AN** taps **“Next ${sym} thickness”** and types x.\n4. Start CASSY (stopwatch button) and the app's timer together. Wait the full 100 s.\n5. **RD** reads the new peak exactly as for x = 0, and AN types it in. L and R are pre-filled from the previous spectrum: change them only if the peak's feet have moved.\n6. Look at the box under the inputs: the app shows A(x), A₀/A(x) and y = ln(A₀/A(x)), and whether the stack is thick enough yet.\n7. Add sheets and start again at 1.`,
    cells: [
      { name: "x (cm)", text: `total thickness of all ${sym} sheets in the holder, in cm (e.g. ${EXAMPLE_X[sym]})` },
      { name: "L, R (ch)", text: "the peak's feet. Pre-filled from the previous spectrum: keep them if the feet are still there" },
      { name: "H (counts)", text: "the new peak height. It gets smaller as the stack gets thicker" },
    ],
    timer: { seconds: 100, label: "Spectrum 100 s" },
    entry: { kind: "row", table: sym, fields: ["x", "L", "R", "H"], addLabel: `Next ${sym} thickness`, carry: { L: "zero.L", R: "zero.R" } },
    meanwhile: "While a spectrum runs, OP prepares and measures the next stack.",
    decision: `If the app says A₀/A(x) has not yet reached 2.72 (y = ln(A₀/A) below 1), add more sheets. Not enough ${sym}? Use all of it and note this in the report.`,
    panel: materialPanel(sym),
  },
  {
    id: `${sym.toLowerCase()}-done`, role: ["ALL"], title: `${MAT_NAME[sym]} done: check the result before moving on`, expanded: true,
    how: `The app has already analysed your ${sym} table. Look at the result below:\n- μ within a few % of the NIST value? Good.\n- A point flagged, or μ far off? Re-measure that thickness now, while the setup is still in place.\n\nThe button opens the full step-by-step analysis for ${sym}, with every number you need for the report.`,
    panel: materialResult(sym),
  },
];

const empty = () => ({
  x_unit: "cm",
  zero: { H: "", L: "", R: "" },
  thickness_tool: "",
  materials: MATS.map((symbol) => ({ symbol, rows: [], graphical: {} })),
});

const matTable = (i: number, sym: string): TableDef => ({
  id: sym,
  title: `${sym} — one table per material (§6.4)`,
  path: `materials.${i}.rows`,
  columns: [
    { key: "x", label: "Thickness", unit: "cm", hint: "whole stack, in cm" },
    { key: "H", label: "Height", unit: "counts", hint: "peak top above its feet" },
    { key: "L", label: "Left channel", unit: "ch", hint: "left foot of the peak" },
    { key: "R", label: "Right channel", unit: "ch", hint: "right foot, > L" },
  ],
  defaults: {},
  engineTable: `data.${sym}`,
  derived: [{ key: "A", label: "Area A(x)", unit: "counts" }, { key: "ratio", label: "A₀/A(x)" }, { key: "y", label: "y = ln(A₀/A(x))" }],
  rowLabel: (r, j) => `${sym} #${j + 1}` + (r.x ? ` · x = ${r.x} cm` : ""),
  note: "Every spectrum is measured for 100 s, so no time is recorded. A₀ is the area of the x = 0 row, which comes from the shared no-absorber spectrum unless you add one here. The Analysis tab works out every calculated cell.",
});

export const exp6: ExperimentDef = {
  id: "6",
  n: 6,
  title: "Attenuation of γ radiation in Al, Fe and Pb",
  short: "μ for Al, Fe, Pb",
  tool: "exp6.analyze",
  notes: ["E6-mass", "E6-time", "E6-fig"],
  brief: {
    measure: "The linear attenuation coefficient μ (and μ/ρ) of Al, Fe and Pb for the 661.7 keV γ line of ¹³⁷Cs, from the photopeak area at several absorber thicknesses.",
    formula: String.raw`I(x)=I_0e^{-\mu x}\ \Rightarrow\ y=\ln\frac{A_0}{A(x)}=\mu x,\qquad A=\tfrac12(R-L)\,H`,
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
      AN: "Types the triangle values, watches ln(A₀/A) vs x, checks the e-factor.",
    },
    before: [
      "Answer Q1 (the linear form) — the analysis starts with it (§6.5).",
      "Plan thicknesses: 5–7 values from 0 to at least 1/μ for each material (see above). Al needs the most sheets.",
      "Learn the CASSY steps of §6.3.1.",
      "Try a dry run: Session → Load example data, then walk the Run steps and open the Analysis tab to see what the app computes for you.",
    ],
    why: "Only full-energy photons that crossed the absorber without interacting end up in the photopeak; scattered photons fall into the Compton region. Using the photopeak area approximates the narrow-beam (good-geometry) condition that Lambert's law assumes.",
    duration: "≈ 60–75 min",
  },
  steps: [
    {
      id: "identify", role: ["ALL"], title: "Find the parts of the setup on the bench", expanded: true,
      how: "Look at the bench and find each item (Fig. 6.2 of the guide):\n- **Source holder**, at the top. It stays empty until the professor brings the ¹³⁷Cs source. Never put the source in yourself.\n- **Absorber holder**, the plate in the middle (green outline in Fig. 6.2). The metal sheets go here, between the source and the detector.\n- **Detector**, the cylinder underneath, facing up. It registers the γ photons.\n- **High-voltage supply**, the box with a small display. It powers the detector.\n- **PC with CASSY Lab**, which draws the spectrum.\n- **Three stacks of sheets**: aluminium (light and shiny), iron (grey, a magnet sticks to it) and lead (very heavy, dull grey, soft).",
    },
    {
      id: "hv", role: ["OP"], title: "Switch on the detector supply and check it shows 0.67 kV", expanded: true,
      how: "1. Switch on the high-voltage box, and the PC if it is off.\n2. Wait a few seconds, then read the box's display.\n3. It must show **0.67 kV**. If it shows anything else, do not touch the knob: call the professor.",
      safety: "Do not adjust the high voltage.",
      verify: ["HV display shows 0.67 kV"],
    },
    {
      id: "cassy", role: ["AN"], title: "Open CASSY Lab and switch on the measuring channel", expanded: true,
      how: "1. On the PC, double-click **CASSY Lab**. A window called **Settings** opens.\n2. In that window, click the **red button**. This switches on the measuring channel and opens a second window, **Measuring parameters**.",
      see: "Two windows are open: “Settings” and “Measuring parameters”.",
    },
    {
      id: "gain", role: ["AN"], title: "Set Gain Box A1 to about −5.81, then close both windows", expanded: true,
      how: "1. In **Measuring parameters**, find the slider labelled **Gain Box A1**.\n2. Drag it until the number next to it reads about **−5.81**. Close is good enough.\n3. Close **Measuring parameters**, then close **Settings**.",
      see: "An empty graph. The spectrum appears here once you start a measurement.",
    },
    {
      id: "time", role: ["AN"], title: "Measuring time: 100 s for every spectrum", expanded: true,
      how: "The professor fixed the measuring time at **100 s** for every spectrum. Because the time is always the same, the peak areas compare directly: the intensity ratio is just I₀/I = A₀/A(x). So there is **no time to write down** and no Area/t column.\n\nIf CASSY lets you set a measuring time, set it to 100 s. If it does not, start the app's 100 s timer together with CASSY and stop CASSY when the timer rings. The elapsed time is shown in CASSY's top-right corner.",
      verify: ["Where CASSY lets you fix the measuring time", "CASSY peak tools (Gaussian fit / integral) as an optional cross-check"],
    },
    {
      id: "bg", role: ["AN"], title: "Optional: record a background spectrum (no source)", optional: true,
      how: "Not needed for the triangle method. It shows what the screen looks like with no source, so the peak region is easy to recognise later.",
    },
    {
      id: "zero", role: ["OP", "AN"], title: "No sheets: professor places the source, then measure (x = 0)", expanded: true,
      safety: "Only the professor handles the source. Keep your hands out of the beam path.",
      how: "1. Check that the absorber holder is **empty**. x = 0 means no material.\n2. Ask the professor to place the ¹³⁷Cs source.\n3. In CASSY, click the **stopwatch button** to start. At the same moment, start the app's timer below.\n4. Wait for the full 100 s. If CASSY does not stop by itself, stop it when the timer rings.",
      timer: { seconds: 100, label: "Spectrum 100 s" },
      see: "The spectrum grows: a broad bump on the left (the Compton region) and **one sharp, tall peak on the right**. That is the **photopeak** (Fig. 6.3). Only the photopeak is used.",
    },
    {
      id: "zero-read", role: ["RD", "AN"], title: "Read the photopeak as a triangle: L, R and H", expanded: true,
      how: "Treat the photopeak as a triangle (Fig. 6.4: points A, B and C).\n\n1. **L**: put the mouse where the peak starts to rise on the left (its left foot, A). Read the **channel number** on the horizontal axis.\n2. **R**: do the same at the right foot (B), where the peak is back down.\n3. **H**: put the mouse on the top of the peak (C) and read the **counts** on the vertical axis. If the feet are not at 0 counts, subtract the count level at the feet: H = top − feet.\n4. RD says the three numbers aloud and AN types them in.\n\nThe peak stays in the same place for every spectrum, so later you usually keep the same L and R and read only the new H. Pick the feet carefully once and then use the same rule every time: consistency matters more than perfection.",
      cells: [
        { name: "L (ch)", text: "channel number of the left foot of the peak" },
        { name: "R (ch)", text: "channel number of the right foot. Always bigger than L" },
        { name: "H (counts)", text: "height of the peak top above its feet" },
      ],
      verify: ["How CASSY shows the channel and counts under the mouse (hover, or right-click → coordinates)"],
      entry: { kind: "fields", fields: [{ path: "zero.L", label: "L (left foot)", unit: "ch" }, { path: "zero.R", label: "R (right foot)", unit: "ch" }, { path: "zero.H", label: "H (height)", unit: "counts" }] },
      panel: zeroPanel,
    },
    {
      id: "plan", role: ["ALL"], title: "Plan the thicknesses: 5–7 per material, the thickest about 1/μ", expanded: true,
      how: "Each material needs **5–7 different thicknesses**, from thin to thick. The thickest stack must reduce the rate by at least e ≈ 2.7 (the guide requires it). By the NIST values, that means a total thickness of at least:\n- **Al**: about {{exp6.materials.0.x_e}} cm (for example 1, 2, 3, 4, 5, 6 cm)\n- **Fe**: about {{exp6.materials.1.x_e}} cm (for example 0.3, 0.6, 1.0, 1.4, 1.8, 2.2 cm)\n- **Pb**: about {{exp6.materials.2.x_e}} cm (for example 0.2, 0.4, 0.6, 0.8, 1.0 cm)\n\nUse what the sheets allow. **Never mix materials in one stack.** The x = 0 spectrum you just measured counts for all three materials. While you measure, the app tells you when a material has reached the factor e.",
    },
    ...MATS.flatMap((sym, i) => matSteps(sym, i)),
    {
      id: "save", role: ["AN"], title: "Save the spectra in CASSY and photograph the screen",
      how: "Save the CASSY file (File → Save) and take a photo of the screen with the spectra for the report. Then note what you measured the thicknesses with.",
      cells: [{ name: "Thickness instrument", text: "what you measured x with and its smallest division, e.g. “caliper 0.05 mm”. Needed for Q2." }],
      entry: { kind: "fields", fields: [{ path: "thickness_tool", label: "Thickness instrument and least count (for Q2)", text: true, placeholder: "e.g. caliper 0.05 mm" }] },
    },
    {
      id: "finish", role: ["ALL"], title: "Professor removes the source; switch off; go to the Analysis tab",
      safety: "Wash your hands after handling lead.",
      how: "Once the source is out, switch off the high voltage and close CASSY. Your analysis is already done: the **Analysis** tab works through the guide's §6.5–6.7 for each material, with every number in its formula.",
    },
  ],
  cheat: [
    "Detector on: display shows 0.67 kV (don't touch the knob).",
    "CASSY Lab → red button → Gain Box A1 ≈ −5.81 → close both windows.",
    "Every spectrum is 100 s (fixed by the professor; no time column). Start = CASSY stopwatch button + app timer.",
    "x = 0 (no sheets; the professor places the source): read L (left foot), R (right foot), H (peak height).",
    "Per material: 5–7 stacks of that material only, the thickest ≳ 1/μ (Al ≈ 5 cm, Fe ≈ 1.7 cm, Pb ≈ 0.8 cm). x in cm.",
    "Per stack: type x → measure → read H (L and R usually stay the same) → read the app's ×e note.",
    "After each material: check μ on its “done” step. Analysis tab = §6.5–6.7 worked out with your numbers.",
    "Save the spectra + photo of the screen. Note the thickness instrument (Q2).",
  ],
  tables: MATS.map((s, i) => matTable(i, s)),
  params: [
    { path: "zero.L", label: "x = 0: left channel L", unit: "ch" },
    { path: "zero.R", label: "x = 0: right channel R", unit: "ch" },
    { path: "zero.H", label: "x = 0: height H", unit: "counts" },
    { path: "thickness_tool", label: "Thickness instrument (Q2)", text: true },
  ],
  initialData: empty,
  analysis: Exp6Analysis,
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

or, equivalently,

$$\ln\frac{I_0}{I(x)}=\mu x$$

a straight line through the origin with **slope μ**. Every spectrum is measured for the same 100 s, so I ∝ photopeak area and I₀/I(x) = A₀/A(x). We plot **y = ln(A₀/A(x))** against x: μ is the slope.`,
    },
    {
      id: "q2", n: "2", text: "What is the uncertainty of the foil thickness. Why?",
      answer: String.raw`It is set by the **measuring instrument's resolution** (Type B uncertainty), because a single reading of a thickness has no statistical scatter to evaluate:

- caliper with 0.05 mm least count: ± {{exp6.q2.caliper_half}} (half the least count), or {{exp6.q2.caliper_gum}} with the GUM rectangular rule (least count/(2√3));
- micrometer with 0.01 mm: ± {{exp6.q2.micrometer_half}}, or {{exp6.q2.micrometer_gum}} (GUM);
- labelled sheet thicknesses: ± half of the last printed digit.

For a stack of k sheets measured one by one, σ = √k·σ_sheet if the errors are independent (k·σ_sheet if systematic); measuring the whole stack at once keeps it at one σ.

It is small compared with the counting/triangle scatter of ln(A₀/A) (≈ 1–3 %), which is why the least-squares fit treats x as exact.`,
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

Enter your graph points in the Analysis tab (step 4, one material at a time); the table below fills in.`,
      live: (r) => r?.extra?.q6 ? <LiveTable title="Your data" cols={[["mat", "Material"], ["graph", "μ graph"], ["lsq", "μ LSQ"], ["diff", "|Δμ|"], ["z", "z"]]}
        rows={Object.entries(r.extra.q6).map(([mat, v]) => ({ mat, ...(v as Record<string, string>), z: (v as Record<string, string>).z ?? "—" }))} /> : null,
    },
  ],
};
