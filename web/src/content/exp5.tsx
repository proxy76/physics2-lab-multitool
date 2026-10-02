import type { ExperimentDef } from "./types";
import { LiveTable } from "../components/LiveTable";

const empty = () => ({
  background: { N: "", t: "600" },
  rows: [],
  eps: "0.2",
  S: "1",
  D: "2.54",
  freehand: { n0: "", sigma: "" },
  reference: { A0: "", sigma: "", date: "", measured: "" },
});

export const exp5: ExperimentDef = {
  id: "5",
  n: 5,
  title: "Source activity by the solid-angle method",
  short: "Activity of ¹³⁷Cs",
  tool: "exp5.analyze",
  notes: ["E5-S", "E5-approx", "E5-sigma", "E5-honesty"],
  brief: {
    measure: "The activity Λ of a ¹³⁷Cs source, from count rates at several source–detector distances r.",
    formula: String.raw`n=\Lambda\,\frac{\Omega}{4\pi}\,\varepsilon S,\qquad \frac{\Omega}{4\pi}=\frac12-\frac{1}{\sqrt{4+(D/r)^2}}\approx\frac{D^2}{16r^2}`,
    expected: [
      { label: "ε, S, D (guide)", value: "0.2, 1, 2.54 cm" },
      { label: "Background count", value: "600 s, no source nearby" },
      { label: "Each position", value: "100 s (guide allows 60–100 s)" },
      { label: "Near points vs D²/16r² line", value: "bend below it — expected (Q6)" },
    ],
    safety: [
      "The source is placed and handled only as the professor or assistant instructs.",
      "Keep the source on its tray; never hold it close to your body or carry it around.",
      "Do not change the detector high voltage or the counter's sensitivity.",
    ],
    roles: {
      OP: "Starts/stops the counter, moves the source tray between slots, places the lead shield.",
      RD: "Measures the slot distances, reads the counter, runs the app timer.",
      AN: "Types every number, watches the live plot, asks for re-measurements.",
    },
    before: [
      "Answer Q3 and Q4 — the analysis uses them (§5.5).",
      "Know the counter's Start, Stop, Reset and On/Off buttons (Fig. 5.2).",
      "Plan: 600 s background while you measure distances, then 100 s per slot.",
    ],
    why: "Method I extrapolates the exact solid angle to r = 0 (Ω → 2π, Q4). Method II is the guide's least-squares line on D²/16r²; it is only valid far from the detector.",
    duration: "≈ 35–45 min",
  },
  steps: [
    {
      id: "identify", role: ["ALL"], title: "Identify the parts of the set-up",
      how: "- Scintillation detector with photomultiplier, vertical in the rack\n- Rack slots — they fix the source–detector distance\n- Plastic source tray\n- Lead shield\n- Digital counter NP-632 (Start, Stop, Reset, On/Off; MODE and PRESET STOPS selectors)",
      verify: ["Counter is the NP-632 shown in Fig. 5.2", "How many slots the rack has"],
    },
    {
      id: "bg-start", role: ["OP"], title: "Switch the counter on and start a 600 s background count",
      how: "No source anywhere near the detector. Press Reset, then Start. If the PRESET STOPS selector offers a time preset, set it to stop by itself; otherwise stop it by hand when the app timer ends.",
      safety: "No radioactive source near the detector during the background count — including Exp. 6's source on the next bench.",
      timer: { seconds: 600, label: "Background 600 s" },
      meanwhile: "RD and AN measure all slot distances (next step) while the background counts.",
      verify: ["MODE/PRESET STOPS positions for a timed count (no NP-632 manual was found)"],
    },
    {
      id: "distances", role: ["RD", "AN"], title: "Measure r for every slot: detector face to tray surface",
      how: "Use a ruler or caliper. Measure each slot twice, by two different people, and type the mean. Write down the resolution of the tool in the note.",
      entry: { kind: "row", table: "rows", fields: ["slot", "r"], addLabel: "Add next slot", defaults: { t: "100" } },
      see: "Distances increase slot by slot; typically a few cm to ~15 cm.",
      verify: ["Where the detector face is inside the housing (the crystal sits behind the window)"],
    },
    {
      id: "bg-record", role: ["RD"], title: "Record the background counts N_b and time t_b",
      entry: { kind: "fields", fields: [{ path: "background.N", label: "N_b", unit: "counts" }, { path: "background.t", label: "t_b", unit: "s" }] },
      see: "A much lower rate than with the source. The app shows n_b = N_b/t_b ± √N_b/t_b.",
    },
    {
      id: "source", role: ["OP"], title: "Ask the professor for the ¹³⁷Cs source",
      safety: "Follow the professor's handling instructions exactly. Hold only the tray, keep the source away from your body, never put it in a pocket.",
    },
    {
      id: "place", role: ["OP"], title: "Centre the source on the tray, slide it into the first slot, shield on",
      how: "Same orientation and centring every time — the geometry must not change between counts.",
    },
    {
      id: "count", role: ["RD", "AN"], title: "Count 100 s and record N for this slot",
      how: "OP: Reset, Start. RD reads N when the count stops. AN types it. Then OP moves the tray to the next slot and you repeat this step.",
      timer: { seconds: 100, label: "Count 100 s" },
      entry: { kind: "row", table: "rows", fields: ["t", "N"], pick: true },
      decision: "If a far slot gives fewer than ≈ 1000 counts, count longer — the warning under the plot tells you how long for 3 %.",
      meanwhile: "AN checks the live plot after each slot.",
      live: "plot",
    },
    {
      id: "check", role: ["AN"], title: "Check the live plot before leaving the bench",
      see: "In n vs D²/16r² the far points lie on a straight line and the nearest points bend below it. That is the approximation failing (Q6), not a mistake.",
      decision: "If a point is flagged ‘re-measure?’, count that slot again now.",
      live: "plot",
    },
    {
      id: "repeat", role: ["OP", "RD"], title: "Optional: repeat one slot to check reproducibility", optional: true,
      how: "Add the repeat as a new row with the same r. Agreement within ≈ 2σ_n is good.",
    },
    {
      id: "finish", role: ["OP"], title: "Return the source and switch everything off",
      safety: "Hand the source back as instructed before you leave the bench.",
    },
  ],
  cheat: [
    "OP: counter on, Reset, Start 600 s background (no source near).",
    "RD+AN meanwhile: measure r (detector face → tray surface) for every slot, twice.",
    "RD: record N_b, t_b = 600 s.",
    "Professor brings the ¹³⁷Cs source.",
    "For each slot: source centred on tray → slot → lead shield → Reset/Start → 100 s → record N.",
    "Far slot < 1000 counts → count longer.",
    "AN: watch n vs D²/16r² — near points bend below the line (expected).",
    "Return the source, switch off.",
  ],
  tables: [
    {
      id: "rows", title: "Positions (guide §5.4 table)", path: "rows",
      columns: [
        { key: "slot", label: "Slot", kind: "text" },
        { key: "r", label: "r", unit: "cm" },
        { key: "t", label: "t", unit: "s" },
        { key: "N", label: "N", unit: "counts" },
      ],
      defaults: { t: "100" },
      engineTable: "data",
      derived: [
        { key: "sN", label: "σ_N", unit: "counts" }, { key: "n1", label: "n′", unit: "s⁻¹" }, { key: "s1", label: "σ_n′", unit: "s⁻¹" },
        { key: "n", label: "n", unit: "s⁻¹" }, { key: "sn", label: "σ_n", unit: "s⁻¹" }, { key: "Xa", label: "D²/16r²" }, { key: "err", label: "approx. error", unit: "%" },
      ],
      rowLabel: (r, i) => (r.slot ? `Slot ${r.slot}` : `Position ${i + 1}`) + (r.r ? ` · r = ${r.r} cm` : ""),
    },
  ],
  params: [
    { path: "background.N", label: "Background N_b", unit: "counts" },
    { path: "background.t", label: "Background t_b", unit: "s" },
    { path: "eps", label: "Efficiency ε", hint: "guide: 0.2" },
    { path: "S", label: "Photons per decay S", hint: "guide: 1" },
    { path: "D", label: "Detector diameter D", unit: "cm", hint: "guide: 2.54 cm" },
  ],
  resultInputs: [
    {
      title: "Method I by hand (optional)",
      help: "Read n(0) off your own hand-drawn curve n = f(r) extrapolated to r = 0, then Λ = 2·n(0)/(εS).",
      fields: [{ path: "freehand.n0", label: "n(0) from your graph", unit: "s⁻¹" }, { path: "freehand.sigma", label: "its uncertainty (optional)", unit: "s⁻¹" }],
    },
    {
      title: "Source label (only if the source has one)",
      help: "If the source shows a reference activity and date, the app decays it to today (T½ = 30.08 y, NNDC) and compares. Ask the professor.",
      fields: [{ path: "reference.A0", label: "Reference activity", unit: "Bq" }, { path: "reference.sigma", label: "its uncertainty", unit: "Bq" },
        { path: "reference.date", label: "Reference date", text: true, placeholder: "YYYY-MM-DD" }, { path: "reference.measured", label: "Measurement date", text: true, placeholder: "YYYY-MM-DD (today if empty)" }],
    },
  ],
  initialData: empty,
  headline: [{ key: "lambda1", label: "Method I" }, { key: "lambda2", label: "Method II" }, { key: "nb", label: "Background" }],
  complete: (d) => (d.rows || []).filter((r: Record<string, string>) => r.r && r.t && r.N).length >= 3 && !!d.background?.N,
  questions: [
    {
      id: "q1", n: "1", text: "Can this method be used to measure the activity of beta- or alpha-radioactive sources?",
      answer: `**No, not with this set-up.** The method assumes that the only thing between source and detector is geometry (the solid angle) and that ε is known. That holds for penetrating γ rays.

- **α particles** have a range of a few cm in air and are stopped by the source capsule and the detector housing/window: ε ≈ 0 and unknown.
- **β particles** have a continuous energy spectrum; they are absorbed and scattered in air, the source cover and the housing, and back-scatter. Their efficiency depends strongly on energy and is not the 0.2 given.
- ¹³⁷Cs itself decays by β⁻; its betas are stopped in the capsule. What we count is the 661.7 keV γ from ¹³⁷ᵐBa.

In principle a thin-window detector in vacuum with a calibrated ε for that particle could use the same solid-angle idea.`,
    },
    {
      id: "q2", n: "2", text: "How does the solid angle of an object change when we double the distance between the apex and the object?",
      answer: `Far from the object Ω ≈ (area)/r² — for our disc Ω ≈ πD²/(4r²) ∝ 1/r² — so doubling r makes Ω **4 times smaller**.

Close to the object it falls by *less* than 4, because the exact Ω/4π = ½ − 1/√(4 + (D/r)²) is not ∝ 1/r². With D = 2.54 cm, going from r = 3 cm to 6 cm divides Ω by **{{exp5.q2.ratio_3_6}}**.`,
      live: (r) => r?.extra?.q2_table?.length ? <LiveTable title="Your distances: Ω(r)/Ω(2r)" cols={[["r", "r (cm)"], ["ratio", "Ω(r)/Ω(2r)"]]} rows={r.extra.q2_table} /> : null,
    },
    {
      id: "q3", n: "3", text: "Why is a measurement of the background necessary? How is the background influencing the measurement result and how can we correct for it?",
      answer: `The detector counts even without the source: cosmic rays, natural radioactivity (⁴⁰K, the U and Th chains, radon), the detector's own materials, and other sources in the room (Exp. 6 uses ¹³⁷Cs too).

That background adds a constant rate n_b at every distance, so it inflates n most at large r, where the source signal is small, and it shows up as a non-zero intercept in Method II.

Correction: measure n_b = N_b/t_b once, long (600 s keeps σ_nb small), and subtract it from every rate:

$$n=n'-n_b,\qquad \sigma_n=\sqrt{\sigma_{n'}^2+\sigma_{n_b}^2},\qquad \sigma_{n'}=\frac{\sqrt N}{t},\ \sigma_{n_b}=\frac{\sqrt{N_b}}{t_b}$$`,
    },
    {
      id: "q4", n: "4", text: "What would the value of the solid angle be if the source could be placed at distance zero from the detector?",
      answer: `**Ω = 2π sr** — a hemisphere: the detector face covers half of all directions, so Ω/4π = ½.

In eq. 5.2, 1/√(4 + (D/r)²) → 0 as r → 0, giving Ω/4π → ½. (The approximation D²/16r² diverges at r = 0 and cannot be used there.)

This is what Method I uses: n(0) = Λ·½·ε·S, so **Λ = 2·n(0)/(εS)**.`,
    },
    {
      id: "q5", n: "5", text: "What is the unit, in SI, for the activity?",
      answer: `The **becquerel**: 1 Bq = 1 decay per second = 1 s⁻¹. (The old unit, the curie: 1 Ci = {{exp5.q5.Ci}}.)`,
    },
    {
      id: "q6", n: "6", text: "Demonstrate the second part of equation 5.2. What assumption was made to obtain it? Is this assumption valid for all measurements?",
      answer: `Let u = D/r. Then

$$\frac{1}{\sqrt{4+u^2}}=\frac12\left(1+\frac{u^2}{4}\right)^{-1/2}=\frac12\left(1-\frac{u^2}{8}+\frac{3u^4}{128}-\dots\right)$$

$$\frac{\Omega}{4\pi}=\frac12-\frac{1}{\sqrt{4+u^2}}=\frac{u^2}{16}-\frac{3u^4}{256}+\dots\approx\frac{D^2}{16r^2}$$

**Assumptions:** D ≪ r (keep only the first term), and a point source on the detector axis.

**Not valid for all measurements.** The approximation over-estimates Ω by ≈ 3u²/16:

|r (cm)|exact Ω/4π|D²/16r²|error|
|---|---|---|---|
|3|{{exp5.q6_table.1.exact}}|{{exp5.q6_table.1.approx}}|{{exp5.q6_table.1.err_pct}} %|
|5|{{exp5.q6_table.3.exact}}|{{exp5.q6_table.3.approx}}|{{exp5.q6_table.3.err_pct}} %|
|10|{{exp5.q6_table.6.exact}}|{{exp5.q6_table.6.approx}}|{{exp5.q6_table.6.err_pct}} %|

So near slots bias Method II low; Method I uses the exact formula and is valid everywhere.`,
      live: (r) => r?.extra?.q6_table?.length ? <LiveTable title="Your distances" cols={[["r", "r (cm)"], ["Xe", "exact Ω/4π"], ["Xa", "D²/16r²"], ["err_pct", "error (%)"], ["series_pct", "≈ 3u²/16 (%)"]]} rows={r.extra.q6_table} /> : null,
    },
    {
      id: "q7", n: "7", text: "How many significant digits should the uncertainty be written with? How many significant digits should the final result be written with?",
      answer: `Following the guide's note on GUM (JCGM 100:2008 §7.2.6): **the uncertainty gets 1 significant digit, or 2 if that digit is 1**. The **result is rounded to the same decimal position** as the uncertainty.

Examples: Λ = 104 873 Bq, σ = 2 361 Bq → **(1.05 ± 0.02)×10⁵ Bq**; σ = 1 487 Bq → **(1.049 ± 0.015)×10⁵ Bq**.

Every result in this app is rounded with that rule (half-up). Scientific notation with a shared exponent avoids ambiguous trailing zeros.`,
    },
  ],
};
