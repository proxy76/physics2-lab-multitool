import type { ExperimentDef } from "./types";
import { LiveTable } from "../components/LiveTable";

const FILTERS: [string, string][] = [["yellow", "578.2"], ["green", "546.1"], ["blue", "435.8"], ["violet", "404.7"]];
const blank10 = () => Array.from({ length: 10 }, () => "");

const empty = () => ({
  filters: FILTERS.map(([color, lambda], i) => ({ id: `f${i}`, color, lambda, readings: blank10() })),
  graphical: {},
});

const g = (k: string, label: string, unit?: string) => ({ path: `graphical.${k}`, label, unit });

export const exp7: ExperimentDef = {
  id: "7",
  n: 7,
  title: "Photoelectric effect — Planck's constant",
  short: "h from U₀(ν)",
  tool: "exp7.analyze",
  notes: ["E7-order", "E7-table", "E7-filter", "E7-yellow", "E7-W", "E7-app"],
  brief: {
    measure: "Planck's constant h from the stopping voltage U₀ reached by a capacitor charged by the photocurrent, for several Hg lines selected with filters.",
    formula: String.raw`eU_0=h\nu-W\quad\Rightarrow\quad U_0=\frac{h}{e}\,\nu-\frac{W}{e}`,
    expected: [
      { label: "Lamp warm-up", value: "5–10 min — switch it on first" },
      { label: "U₀(404.7) − U₀(578.2)", value: "≈ {{exp7.diff_405_578}} (ideal; often ~10 % less)" },
      { label: "U₀(435.8) − U₀(546.1)", value: "≈ {{exp7.diff_436_546}} (ideal)" },
      { label: "Readings per filter", value: "10 (every 15–20 s allowed)" },
      { label: "Points on the graph", value: "4 (one per filter); drop the 4th if that filter is defective" },
    ],
    safety: [
      "The Hg lamp housing gets hot — do not touch it, let it cool before moving it.",
      "Do not look into the unfiltered lamp; it emits UV.",
      "Do not touch the leads or the circuit during readings (leakage, pick-up).",
    ],
    roles: {
      OP: "Switches the lamp on, changes filters, presses the discharge switch.",
      RD: "Reads the voltmeter at the plateau, every 15–20 s, runs the stopwatch.",
      AN: "Types the 10 readings per filter, watches the U₀(ν) line and the difference check.",
    },
    before: [
      "Prepare the explanation of eq. 7.3 (procedure step 2) and Q2 (what A–E are).",
      "Know the Hg lines: 578.2 yellow, 546.1 green, 435.8 blue, 404.7 violet (365.4 UV if a UV filter exists).",
      "Check which filters are on the wheel.",
      "Draw the data table before the lab with a frequency column next to wavelength. The guide's table has only wavelength, but the professor wants both: Filter | λ (nm) | ν (s⁻¹) | Voltage (V), 10 rows per filter | Ū₀ (V) | σ_Ū₀ (V).",
      "Fill ν = c/λ in at home: yellow 578.2 nm → 5.185·10¹⁴ s⁻¹, green 546.1 nm → 5.490·10¹⁴ s⁻¹, blue 435.8 nm → 6.879·10¹⁴ s⁻¹, violet 404.7 nm → 7.408·10¹⁴ s⁻¹.",
    ],
    why: "U₀ depends on the frequency of the light, not on its intensity. The differences between filters do not depend on W — use them as a live check that you are reading plateaus.",
    duration: "≈ 40–50 min (incl. warm-up)",
  },
  steps: [
    {
      id: "lamp", role: ["OP"], title: "Switch the Hg lamp on now and start a 10 min warm-up",
      timer: { seconds: 600, label: "Hg lamp warm-up" },
      safety: "Hot housing, UV light: do not touch, do not look into the beam.",
      meanwhile: "Do the next two steps during the warm-up.",
      notes: ["E7-order"],
    },
    {
      id: "identify", role: ["ALL"], title: "Identify A–E in Fig. 7.1, the capacitor box and the discharge switch",
      how: "Tentative (check on the bench):\n- A: Hg lamp in its housing\n- B: lens (thin disc) — focuses the light on the photocell\n- C: iris diaphragm — controls the intensity\n- D: filter wheel\n- E: photocell\nAlso: circuit box with the capacitor, the external discharge push-button, the multimeter (Fig. 7.3).",
      verify: ["B is the lens and C the diaphragm", "Discharge switch location", "Photocell type (likely LD 558 77, potassium cathode)"],
    },
    {
      id: "explain", role: ["AN"], title: "Explain eq. 7.3 aloud (procedure step 2)",
      how: "One photon gives hν to one electron; it spends W to leave the cathode, K_max = hν − W. The electrons charge the capacitor, building a retarding voltage; charging stops at U₀ when even the fastest electrons are turned back: eU₀ = hν − W. Full text: Questions → step 2.",
    },
    {
      id: "meter", role: ["RD"], title: "Set the multimeter to DC volts, a range covering 0–2 V",
      how: "Check the wiring against Fig. 7.2. A high input impedance is needed so the meter does not discharge the capacitor.",
      verify: ["Meter input impedance / whether the circuit box has a buffer"],
    },
    {
      id: "filter", role: ["OP"], title: "Select the first filter (yellow, 578.2 nm)",
      how: "Order does not matter but stay consistent: yellow → green → blue → violet. Keep the diaphragm and geometry unchanged between filters.",
    },
    {
      id: "discharge", role: ["OP"], title: "Press the discharge switch; check the voltage drops to ≈ 0, release",
    },
    {
      id: "read", role: ["RD", "AN"], title: "Wait for the plateau, then read 10 values every 15–20 s",
      stopwatch: true,
      how: "Either discharge and re-wait before each reading, or read every 15–20 s without discharging (both allowed by the guide). AN types each value as RD calls it out.",
      entry: { kind: "readings", table: "filters" },
      decision: "If the readings keep falling steadily (leakage): discharge, wait for the plateau again and read at the plateau every time.",
      live: "check",
    },
    {
      id: "next", role: ["OP", "RD", "AN"], title: "Repeat discharge + 10 readings for every filter",
      how: "Back to ‘select filter’ for green, blue, violet (and UV if present). Do not touch the diaphragm.",
      see: "Ū₀ grows with frequency: yellow < green < blue < violet. The graph has only 4 points, one per filter.",
      decision: "If the 4th filter (violet) gives a lower Ū₀ than blue, that filter is defective (it happened to an earlier team). Tap Exclude on its row: the fit then uses the other 3 points. Say so in the report.",
      notes: ["E7-filter"],
      live: "check",
    },
    {
      id: "intensity", role: ["OP", "RD"], title: "Optional: change the diaphragm on one filter, re-read U₀", optional: true,
      see: "U₀ stays about the same — it depends on frequency, not intensity. A strong report point.",
    },
    { id: "finish", role: ["OP"], title: "Switch off the lamp and the multimeter", safety: "The housing stays hot for a while." },
  ],
  cheat: [
    "Hg lamp ON first — 10 min warm-up.",
    "Meanwhile: identify A–E, discharge switch; meter on DC V, 0–2 V range.",
    "Filter yellow → discharge → wait for plateau → 10 readings (15–20 s apart).",
    "Repeat for green, blue, violet. Never touch the diaphragm or the wires during readings.",
    "Table: Filter | λ (nm) | ν (s⁻¹) | Voltage (V) | Ū₀ | σ_Ū₀. ν = c/λ goes next to λ (the professor wants it).",
    "4 points on the graph. Violet below blue → defective filter: Exclude it, fit 3.",
    "Live check: U₀(violet) − U₀(yellow) ≈ 0.9 V, U₀(blue) − U₀(green) ≈ 0.57 V.",
    "Lamp off (hot!).",
  ],
  tables: [
    {
      id: "filters", title: "Readings per filter (guide §7.4 table, plus ν next to λ)", path: "filters",
      columns: [
        { key: "color", label: "Filter", kind: "text" },
        { key: "lambda", label: "wavelength", unit: "nm" },
        { key: "readings", label: "Voltage", unit: "V", kind: "readings", count: 10 },
      ],
      defaults: { color: "", lambda: "" },
      engineTable: "data",
      derived: [{ key: "nu", label: "ν = c/λ", unit: "10¹⁴ s⁻¹", after: "lambda" }, { key: "N", label: "N" }, { key: "U0", label: "Ū₀", unit: "V" }, { key: "sem", label: "σ_Ū₀", unit: "V" }],
      note: "The guide's table has only a wavelength column; the professor also wants the frequency ν = c/λ next to it. The lab-sheet table in this layout, one reading per line, is under ‘Full tables with derived columns’ below.",
      rowLabel: (r) => `${r.color || "filter"} ${r.lambda ? r.lambda + " nm" : ""}`,
    },
  ],
  resultInputs: [
    {
      title: "Graphical method (h from your graph-paper plot)",
      help: "Read two points far apart on your drawn line U₀ vs ν. If your ν axis is in units of 10¹⁴ s⁻¹, put 1e14 in ‘ν scale’. Optional steepest/shallowest lines give σ.",
      fields: [g("x_scale", "ν scale (e.g. 1e14)"), g("x1", "P₁ ν"), g("y1", "P₁ U₀", "V"), g("x2", "P₂ ν"), g("y2", "P₂ U₀", "V"),
        g("max_x1", "steepest P₁ ν"), g("max_y1", "steepest P₁ U₀", "V"), g("max_x2", "steepest P₂ ν"), g("max_y2", "steepest P₂ U₀", "V"),
        g("min_x1", "shallowest P₁ ν"), g("min_y1", "shallowest P₁ U₀", "V"), g("min_x2", "shallowest P₂ ν"), g("min_y2", "shallowest P₂ U₀", "V")],
    },
  ],
  initialData: empty,
  headline: [{ key: "h", label: "h (LSQ)" }, { key: "W", label: "W" }, { key: "nu0", label: "ν₀" }],
  complete: (d) => (d.filters || []).filter((f: { readings: string[] }) => f.readings.filter((x) => x && x.trim()).length >= 3).length >= 3,
  livePanel: (r) =>
    r?.extra?.difference_check ? (
      <LiveTable title="Live check: voltage differences do not depend on W" cols={[["pair", "Pair"], ["expected", "ideal (V)"], ["measured", "yours (V)"], ["ratio", "ratio"]]}
        rows={r.extra.difference_check} note="Ratios of 0.85–1.0 are typical for the capacitor method (LD instruction sheet 558 77)." />
    ) : null,
  questions: [
    {
      id: "step2", n: "Step 2", text: "Explain why the equation that relates Planck's constant (h) to the voltage reading and the photon wavelength is: eU₀ = hν − W_extraction (7.3)",
      answer: String.raw`1. One photon of energy hν is absorbed by one electron of the cathode.
2. The electron spends the extraction work W to leave the metal; the most energetic electrons leave with K_max = hν − W (eq. 7.2).
3. Electrons that reach the anode charge the capacitor: the anode becomes negative with respect to the cathode, so a **retarding** voltage U builds up.
4. Only electrons with K > eU can still cross; the others are turned back.
5. Charging stops at U₀, when even the fastest electrons cannot reach the anode: **eU₀ = K_max = hν − W**, with ν = c/λ.

The voltmeter therefore measures K_max directly in electronvolts. (Experimentally W also contains the contact potential between the electrodes.)`,
    },
    {
      id: "q1", n: "1", text: "The relation between the kinetic energy of the photoelectrons and the frecquency of the incoming photons is given by what relation? What type of dependence exists between the the kinetic energy of the photoelectrons and the frequency of the radiation?",
      answer: String.raw`Einstein's relation **K_max = hν − W**.

The dependence is **linear (affine), increasing**, with slope h — not proportional, because of the −W term. K_max does not depend on the intensity of the light, and no electrons are emitted below the threshold ν₀ = W/h.`,
    },
    {
      id: "q2", n: "2", text: "In figure 7.1 the purpose of the elements is the following: A … B … C … D … (two more rows)",
      answer: String.raw`|Fig. 7.1|Element|Purpose|
|---|---|---|
|A|Hg lamp in its housing|light source with discrete Hg lines|
|B|lens|concentrates the light on the photocell|
|C|iris diaphragm|controls the light intensity|
|D|filter wheel|selects one Hg line, i.e. one frequency|
|E|photocell|emits the photoelectrons (cathode K, anode A)|
|—|capacitor + discharge switch, voltmeter|charge up to U₀; reset to 0 V; read U₀|

> B and C are identified from the photo and §7.3 — confirm on the bench (Run step 2).`,
    },
    {
      id: "q3", n: "3", text: "If 10 measurements of the same variable xᵢ are made in identical conditions, what is the average value? Write the relation for the standard deviation of the data. Write the relation for the standard deviation of the mean.",
      answer: String.raw`$$\bar x=\frac1N\sum_{i=1}^{N}x_i\qquad s=\sqrt{\frac{\sum_{i=1}^{N}(x_i-\bar x)^2}{N-1}}\qquad s_{\bar x}=\frac{s}{\sqrt N}$$

with N = 10. s describes the scatter of single readings; s_x̄ is the uncertainty of the mean, σ_Ū₀ in the table. (N − 1 because the experimental mean is used — Appendix A.1.)`,
    },
    {
      id: "q4", n: "4", text: "what is the eV (electronvolt)? What is its value in the international system of units?",
      answer: String.raw`The energy gained by a particle of charge e (one electron) accelerated through a potential difference of 1 V. Since 2019 it is exact: **1 eV = {{exp7.eV}}**.`,
    },
    {
      id: "q5", n: "5", text: "What is the kinetic energy and velocity (as a fraction of c-speed of light) of an electron starting from rest and being accelerated under a potential difference of 10V? What if the potential difference is 100V? What if the potential difference is 10⁸V?",
      answer: String.raw`K = eU. Classically v = √(2K/mₑ); relativistically γ = 1 + eU/(mₑc²) and v/c = √(1 − 1/γ²), with mₑc² = {{exp7.mec2}}.

|U|K|v (classical)|v/c classical|γ|v/c (relativistic)|
|---|---|---|---|---|---|
|10 V|10 eV = {{exp7.q5_table.0.K_J}}|{{exp7.q5_table.0.v_cl}}|{{exp7.q5_table.0.beta_cl}}|{{exp7.q5_table.0.gamma}}|{{exp7.q5_table.0.beta}}|
|100 V|100 eV = {{exp7.q5_table.1.K_J}}|{{exp7.q5_table.1.v_cl}}|{{exp7.q5_table.1.beta_cl}}|{{exp7.q5_table.1.gamma}}|{{exp7.q5_table.1.beta}}|
|10⁸ V|100 MeV = {{exp7.q5_table.2.K_J}}|{{exp7.q5_table.2.v_cl}}|{{exp7.q5_table.2.beta_cl}}|{{exp7.q5_table.2.gamma}}|{{exp7.q5_table.2.beta}}|

At 10 V and 100 V the classical formula is fine (γ ≈ 1). At 10⁸ V it would give v ≈ 19.8c — impossible — so the **relativistic formula is mandatory**: v ≈ 0.99999c.`,
    },
    {
      id: "q6", n: "6", text: "From your data analysis, what is the lowest frequency - ν_min or (longest wavelength λ_max) for which the fotoelectric effect can occur? What is the significance of this value?",
      answer: String.raw`Where the fitted line crosses U₀ = 0:

$$\nu_{min}=\nu_0=-\frac{b}{a},\qquad \lambda_{max}=\frac{c}{\nu_0},\qquad \sigma_{\nu_0}^2=\frac{s_b^2+\nu_0^2s_a^2+2\nu_0\,\mathrm{cov}(a,b)}{a^2}$$

(the covariance term matters: a and b are strongly anti-correlated).

**Meaning:** ν₀ is the threshold (cut-off) frequency of the photocathode, W = hν₀. Light of lower frequency ejects no electrons however intense it is — the classical wave picture cannot explain this; the photon picture does. Caveat: the contact potential shifts the intercept, so W and ν₀ from this set-up are effective values.`,
      live: (r) => r?.extra?.q6 ? <LiveTable title="Your data" cols={[["nu0", "ν₀ (s⁻¹)"], ["lam_max", "λ_max (nm)"], ["W", "W (eV)"]]} rows={[r.extra.q6]} /> : null,
    },
  ],
};
