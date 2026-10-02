# PDF analysis — coverage checklist (Experiments 3–7)

Source: `LaboratoryGuide.pdf` (64 pages, printed page numbers = PDF page indices).
Every item has an ID. The **Feature** column names where the app covers it:

- `RUN:<exp>#<step>` — Run tab step card
- `DATA:<exp>/<table>` — Data tab table
- `RES:<exp>/<item>` — Results tab (engine pipeline `expN.analyze`)
- `Q:<exp>.<n>` — Answers (Questions tab and Answers tab)
- `BRIEF:<exp>` — Brief tab
- `NOTE:<id>` — Guide note (see `ERRATA.md`)
- `CALC:Gn` — generic Calculator tool

Shared conventions read from Experiments 1, 2, 8 and the appendices are listed first, because every experiment relies on them.

---

## 0. Shared conventions

| ID | Item (guide wording, condensed) | Where | Feature |
|---|---|---|---|
| S-1 | GUM JCGM 100:2008 §7.2.6 quoted; "we can use a single significant digit (or two if that significant digit is 1)" for the uncertainty; result rounded consistently | §2.8 note, §5.8 note | `labcalc.rounding`, every `report` string, Q:5.7 |
| S-2 | Propagation formulas for f = x+y (absolute), x·y and x/y (relative) | §2.8 Q3 | CALC:G4 quick rules |
| S-3 | Counting uncertainty σ_N = √N, rate uncertainty √N/t (Poisson) | §2.8 Q6, App. A.3 | CALC:G2, exp5 derived columns |
| S-4 | Experimental mean x̄_e = Σ/N; sample variance with 1/N about the true mean (A.1) and 1/(N−1) about the experimental mean | App. A.1 | CALC:G1, Q:7.3 |
| S-5 | Binomial (A.3), mean pn (A.4), variance np(1−p); Poisson (A.5/A.6) σ² = x̄; Gaussian (A.7) | App. A.2 | Reference text in Calculator G2 "theory" panel |
| S-6 | Single-measurement estimate σ = √x | App. A.3 | CALC:G2 |
| S-7 | Least squares y = a·x + b: a (B.2/B.7), b (B.3/B.8), s_a² (B.4/B.10), s_b² (B.5/B.11), s_ε² (B.9); sums S_x,S_y,S_xx,S_xy,S_yy (B.6) | App. B | CALC:G3; every pipeline's "show steps" uses B.6–B.11 |
| S-8 | Interaction of photons with matter: photoelectric / Compton / pair production; Fig. C.1 (Pb cross-sections) | App. C | BRIEF:6, Q:6.3, Q:6.5 |
| S-9 | Every experiment: "If a data point is too far from [the line], repeat the measurement" | §3.5, §4.5 (and §1.5) | Data tab outlier flag + "Re-measure?" prompt |
| S-10 | Comparisons "Compare your results with …" | §3.7 (implied), §4.7, §1.7 | CALC:G6 comparison, RES compare panels |

---

## Experiment 3 — Determination of Rydberg constant (pp. 17–22)

**Purpose (§3.1).** Determine the wavelengths of the Balmer series of atomic hydrogen by comparison with the mercury spectrum; use them to calculate the Rydberg constant.

**Theory (§3.2–3.3).** f = (E_ni − E_nf)/h (3.1); Bohr energy E_n = −m_e e⁴/(8 ε₀² h²)·1/n² (3.2, printed with h³ — see ERRATA); E_1 = −13.6 eV (3.3, also printed h³); emission frequencies (3.4, printed h⁴, correct h³); Rydberg formula 1/λ = R_H(1/n_f² − 1/n_i²) (3.5); Bohr form (3.6, printed c h⁴); R_H = m_e e⁴/(8 c ε₀² h³) (3.7, printed c h⁴); Balmer formula n_f = 2 (3.8); Cauchy x(λ) = A + B/λ² (3.9). Constants printed: h = 6.626×10⁻³⁴ J·s, ε₀ = 8.854×10⁻¹² F/m, e = 1.6×10⁻¹⁹ C, m_e = 9.1×10⁻³¹ kg.

**Apparatus (§3.3).** Spectrogram plate with Hg and H spectra (dark lines on white, Fig. 3.1); optical microscope (Fig. 3.2); XY translation stage with (a) spectrogram holder, (b) graduated locator: main scale in mm, vernier 0.1 mm (Fig. 3.3).

| ID | Procedure step (§3.4, near-verbatim) | Feature |
|---|---|---|
| E3-P1 | Mount the spectrogram device on the stage, focus the microscope; make sure the lines are parallel to the reticle | RUN:3#1–2 |
| E3-P2 | Identify which spectrum is mercury; bring it into view using the x (perpendicular to lines) and y (parallel) knobs | RUN:3#3 |
| E3-P3 | Move the stage until each Hg line is under the reticle; record the locator position (0.1 mm); fill Table 1 with correct wavelength association. Hint: triplet 433.9/434.7/435.8 nm; two lines on one side, six on the other; start with the smallest wavelength and check the reading increases with wavelength, else flip the plate | RUN:3#4–6, DATA:3/T3.1, live calibration plot |
| E3-P4 | Record all hydrogen lines (Table 2); Hγ lines up with Hg 434.7 nm ("see figure 3.2"); use the y knob to bring the H spectrum into view | RUN:3#7–9, predicted-position helper, NOTE:E3-fig |

| ID | Table | Columns (unit) | Measured / given / derived | Feature |
|---|---|---|---|---|
| E3-T1 | Table 3.1 | λ_Hg (nm) given: 404.7, 407.8, 433.9, 434.7, 435.8, 535.4, 546.1, 577.0, 579.0, 612.3, 623.4; x_Hg (mm) measured | λ given, x measured | DATA:3/T3.1 |
| E3-T2 | Table 3.2 | Spectral line Hα…Hε; principal number n_i (given 3…7); x_H (…) measured; λ_H (…) derived | | DATA:3/T3.2 |
| E3-T3 | Q3 table | n_i, n_f = 2, λ_H (nm), Colour | computed | Q:3.3, Q:3.4 |

| ID | Analysis (§3.5) | Feature |
|---|---|---|
| E3-A1 | Graph x_Hg vs λ_Hg⁻²; straight line of slope B, intercept A; repeat far points | RES:3/calibration plot + outlier flags |
| E3-A2 | Least squares → A, B; λ_H from eq. 3.9; fill last line of Table 3.2 | RES:3/λ_H table |
| E3-A3 | Graph λ_H⁻¹ vs n_i⁻²; slope "equal to Rydberg constant"; least squares → R | RES:3/Rydberg fit, NOTE:E3-slope |
| E3-U1 | (§3.6) Uncertainty of "the attenuation coefficient" from slope uncertainty | RES:3/σ_R = s_a, NOTE:E3-attn |
| E3-C1 | (§3.7) Conclusions: Rydberg constant (R_H)(…) | Uncertainty (…) | RES:3/conclusions |

| ID | Question (verbatim) | Feature |
|---|---|---|
| E3-Q1 | "What is the relation between the energy and the frequency of a photon? What about the dependence of energy on wavelength?" | Q:3.1 |
| E3-Q2 | "Can one see radiation in the Lyman series? Justify your answer. Paschen spectral series." | Q:3.2 |
| E3-Q3 | "Calculate five wavelengths in the visible light range for the hydrogen gas emission by applying eq. 3.8. Record your results in the increasing of order in the first 3 columns of the data table bellow. Use R_H = 1.09737 × 10⁷ m⁻¹" | Q:3.3 |
| E3-Q4 | "Find the colour of the lines in the Balmer series and fill the 4-th column in the table above. x_Hg is on the abscissa." | Q:3.4, NOTE:E3-Q4 |

---

## Experiment 4 — Electron diffraction by polycrystalline graphite (pp. 23–31)

**Purpose (§4.1).** Observe electron diffraction by a graphite polycrystal; determine lattice-plane spacings of graphite.

**Theory (§4.2–4.3).** λ = h/p (4.1), h = 6.63×10⁻³⁴ J·s; eU = mv²/2 = p²/2m (4.2), e = 1.6×10⁻¹⁹ C, m = 9.1×10⁻³¹ kg; λ = h/√(2meU) (4.3); Bragg 2d sin θ = nλ (4.4); tan 2θ = D/2L ≈ sin 2θ ≈ 2 sin θ (4.5); first order 2d sin θ = λ (4.6); D = 2Lh/(d√(2me)) · U^(−1/2) (4.7); L = 13.5 cm; D = 3.3×10⁻¹⁰/d · U^(−1/2) SI (4.8). Graphite layers, planes d₁ > d₂ > d₃, ring D₃ is outside the screen (Figs. 4.3–4.5).

**Apparatus (§4.3).** Electron diffraction tube + 10 kV supply (Figs. 4.6, 4.7): electron gun (filament F1/F2, oxide cathode, C/A system, focusing electrodes), graphite polycrystalline foil at the anode, fluorescent screen on the bulb. L = target-to-screen distance.

**Safety (§4.4).** Never exceed 5 kV (X-rays); do not touch tube/cables (HV); no mechanical stress (implosion); the bright central spot damages the screen — reduce U after each reading.

| ID | Procedure step (§4.4) | Feature |
|---|---|---|
| E4-P1 | Supply off; turn the accelerating-voltage knob fully left | RUN:4#1 |
| E4-P2 | Switch on; wait a minute for cathode thermal stability | RUN:4#2 (60 s timer) |
| E4-P3 | Slowly increase U until rings appear; continue up to 5 kV, NEVER exceed | RUN:4#3 |
| E4-P4 | Choose a set of U; at each, measure inner and outer diameters of both rings | RUN:4#4–5 |
| E4-P5 | Write data in a table; ≥ 5 values of U recommended; reduce U after each measurement | DATA:4/T, RUN:4#5 |
| E4-P6 | Turn down the voltage and unplug | RUN:4#6 |

| ID | Table | Columns | Feature |
|---|---|---|---|
| E4-T1 | Data table | U (…) measured; U^(−1/2) (…) derived; D₁ inner, outer, [mean] (…); D₂ inner, outer, [mean] (…); last row U_max | DATA:4/T |
| E4-T2 | Q3 table | U 3.0–5.0 kV step 0.5: speed, wavelength (non-rel. and rel.) | Q:4.3 |

| ID | Analysis / uncertainty / conclusions | Feature |
|---|---|---|
| E4-A1 | Graph D₁,₂ vs U^(−1/2); check against eq. 4.8; repeat far points | RES:4/plot + outliers |
| E4-A2 | Least squares → d₁ and d₂ | RES:4/d = C/k |
| E4-U1 | Propagate slope uncertainty into σ_d₁, σ_d₂ | RES:4/σ_d = d·s_k/k |
| E4-C1 | Conclusions: d₁ | σ_d₁ | d₂ | σ_d₂; compare with 2.13×10⁻¹⁰ m and 1.23×10⁻¹⁰ m | RES:4/conclusions + G6 compare |

| ID | Question (verbatim) | Feature |
|---|---|---|
| E4-Q1 | "Consider a grain of sand (m = 3 × 10⁻⁸ g) moving at the speed of sound in air (v = 340 m/s). Calculate the de Broglie wavelength and compare it to the carbon atomic diameter (≈ 2.2 × 10⁻¹⁰ m) and to the largest plane spacing in a carbon hexagonal lattice (d₁ = 2.13 × 10⁻¹⁰ m). Is it possible to obtain a diffraction pattern by shooting grains of sand at a carbon crystal lattice?" | Q:4.1 |
| E4-Q2 | "Repeat the calculation in Question 1 by using an electron accelerated under a potential difference of 2 kV as a replacement for the grain of sand. Is it possible to obtain a diffraction pattern by shooting electrons at a carbon crystal lattice?" | Q:4.2 |
| E4-Q3 | "Calculate the speed and the associated wavelength of an electron accelerated under a p.d. of 3 to 5 kV with a step of 0.5 kV and write the results in a table. Was it correct to use the nonrelativistc formula for the kinetic energy in eq. 2?" | Q:4.3 |
| E4-Q4 | "Explain how does this experiment confirm de Broglie hypothesys?" | Q:4.4 |
| E4-Q5 | "Consider a maximum measured value of 6 cm for the diameter of the second diffraction ring. Is the approximation used in tan(2θ) ≈ 2 sin θ (eq. 5) still valid? Justify your answer." | Q:4.5 |
| E4-Q6 | "What type of a dependence exists between the measured diameter value D and the inverse square root value of the accelerating voltage U^(−1/2), D = f(U^(−1/2))?" | Q:4.6 |
| E4-Q7 | "Figure out a linear dependence between the accelerating voltage U and a power of D, U = f(D^x). In such a linear representation what is the equation which connects the slope to the unknown quantity d?" | Q:4.7, RES:4/Q7 cross-check fit |

---

## Experiment 5 — Source activity by the solid-angle method (pp. 32–37)

**Purpose (§5.1).** Calculate the activity of a radioactive source.

**Theory (§5.2).** n = N/Δt = Λ·(Ω/4π)·ε·S (5.1); Ω = cap area/R² = 2πR(R − r)/R²; with R² = (D/2)² + r²: Ω/4π = ½ − 1/√(4 + (D/r)²) ≈ D²/(16r²) (5.2); n = Λ·D²/(16r²)·ε·S (5.3). ¹³⁷Cs "emits one photon" per decay (guide).

**Apparatus (§5.3).** Scintillation detector with PMT (ε = 0.2); digital counter NP 632 (Fig. 5.2: Start, Stop, Reset, On/Off; also MODE and PRESET STOPS selectors, SENSITIVITY, INPUT — read from the photo); rack for source distances; plastic tray; lead shield; ¹³⁷Cs source (from the professor).

| ID | Procedure step (§5.4) | Feature |
|---|---|---|
| E5-P1 | Identify the components | RUN:5#1 |
| E5-P2 | Background measurement, 600 s | RUN:5#2 (600 s timer) |
| E5-P3 | Measure the distances at which the source will be placed | RUN:5#3, DATA:5/rows r |
| E5-P4 | Ask for the source | RUN:5#5 |
| E5-P5 | Place the source on the tray, tray in one slot | RUN:5#6 |
| E5-P6 | Put the lead shielding in place | RUN:5#6 |
| E5-P7 | Measure the count rate, 60–100 s | RUN:5#7 (100 s timer) |
| E5-P8 | Repeat 5–7 for all positions | RUN:5#8 |

| ID | Table | Columns | Feature |
|---|---|---|---|
| E5-T1 | Data table | r (…), t (…), N (counts) measured; σ_N, n′, σ_n′, n, σ_… (=σ_n) derived; first row "background", then positions | DATA:5/T (background block + rows) |
| E5-T2 | Conclusions | Method I / II: Source activity (…), Uncertainty (…) | RES:5/conclusions |

| ID | Analysis / uncertainty | Feature |
|---|---|---|
| E5-A1 | Answer Q3, Q4 | Q:5.3, Q:5.4 (linked from Results) |
| E5-A2 | Graph count rate = f(distance); estimate Λ using the answer to Q4 (Method I) | RES:5/Method I (exact-model extrapolation to r = 0, free-hand option) |
| E5-A3 | Graph count rate = f(D²/16r²); estimate Λ with eq. 5.3 (Method II) | RES:5/Method II (LSQ slope) |
| E5-A4 | Use ε = 0.2, D = 2.54 cm, S = 1 | constants "guide" set, exp5 parameters |
| E5-U1 | Uncertainty of the activity from slope uncertainty (LSQ) | RES:5/σ_Λ = s_a/(εS) |

| ID | Question (verbatim) | Feature |
|---|---|---|
| E5-Q1 | "Can this method be used to measure the activity of beta- or alpha-radioactive sources?" | Q:5.1 |
| E5-Q2 | "How does the solid angle of an object change when we double the distance between the apex and the object?" | Q:5.2 |
| E5-Q3 | "Why is a measurement of the background necessary? How is the background influencing the measurement result and how can we correct for it?" | Q:5.3 |
| E5-Q4 | "What would the value of the solid angle be if the source could be placed at distance zero from the detector?" | Q:5.4 |
| E5-Q5 | "What is the unit, in SI, for the activity?" | Q:5.5 |
| E5-Q6 | "Demonstrate the second part of equation 5.2. What assumption was made to obtain it? Is this assumption valid for all measurements?" | Q:5.6 (+ live error table from the team's distances) |
| E5-Q7 | "How many significant digits should the uncertainty be written with? How many significant digits should the final result be written with?" | Q:5.7 |

---

## Experiment 6 — Attenuation coefficient of gamma radiation (pp. 38–43)

**Purpose (§6.1).** Study attenuation of γ radiation by different materials; determine the **mass** attenuation coefficient for three materials.

**Theory (§6.2).** −dI = μ I dx (6.1); I(x) = I₀ e^(−μx) (6.2) (Lambert's law); values tabulated in NIST XCOM; μ depends on photon energy, density, Z.

**Apparatus (§6.3).** Scintillation detector with PMT; computer with CASSY; ¹³⁷Cs source (placed by the professor); three stacks of materials. Fig. 6.2: source (top), absorber holder (green), detector (bottom), auxiliary systems box with HV display (0.67 kV).

**Start-up (§6.3.1).** HV 0.67 kV; launch "CASSYlab"; "Settings" window; red button activates the channel → "Measuring parameters"; slider "Gain Box A1" ≈ −5.81; close both windows; start with the stopwatch button; time shown upper-right.

**Intensity (§6.3.2).** Spectrum = counts vs deposited energy; use the photopeak (Fig. 6.3); approximate the Gaussian by a triangle (Fig. 6.4, points A, B, C); area ∝ intensity × time — divide by the measuring time if times differ.

| ID | Procedure step (§6.4) | Feature |
|---|---|---|
| E6-P1 | Identify the elements | RUN:6#1 |
| E6-P2 | Turn on computer and detector (§6.3.1) | RUN:6#2–3 |
| E6-P3 | (optional) background spectrum | RUN:6#4 |
| E6-P4 | Measurement with no material (professor places the source) | RUN:6#5–6 |
| E6-P5 | Place absorber sheets; write down material and thickness | RUN:6#7 |
| E6-P6 | Measure; compute from the spectrum a measure of the number of photons; note the duration (§6.3.2) | RUN:6#6–7, triangle-area entry |
| E6-P7 | Don't mix materials; repeat 5–6 for different thicknesses; the largest thickness MUST reduce the rate by at least ≈ e | RUN:6#7, planner in BRIEF:6 and live "factor reached" check |
| E6-P8 | Repeat 5–7 for the other two materials | RUN:6#8 |

| ID | Table | Columns | Feature |
|---|---|---|---|
| E6-T1 | One per material | No, Thickness (…), Height (…), Left channel (…), Right channel (…) measured; Area (…), ln … derived | DATA:6/Al, Fe, Pb (+ time column, required by §6.3.2) |
| E6-T2 | Conclusions | Material, Measured μ (…), Uncertainty (…), Atomic Number Z, Density (…) | RES:6/conclusions (+ μ/ρ) |

| ID | Analysis / uncertainty | Feature |
|---|---|---|
| E6-A1 | Answer Q1 | Q:6.1 |
| E6-A2 | Graphical representation allowing μ to be calculated | RES:6/ln(rate) vs x plot |
| E6-A3 | μ from the analysis of the graph | RES:6/graphical (CALC:G5 two-point + max/min) |
| E6-A4 | μ by least squares | RES:6/LSQ μ = −a |
| E6-U1 | Uncertainty of μ from the slope uncertainty | RES:6/σ_μ = s_a |

| ID | Question (verbatim) | Feature |
|---|---|---|
| E6-Q1 | "Starting from relation 6.2, write a linear relation between the intensity of the radiation and the thickness of material." | Q:6.1 |
| E6-Q2 | "What is the uncertainty of the foil thickness. Why?" | Q:6.2 (team's instrument) |
| E6-Q3 | "Which of the three materials is the most useful for creating a shield to protect ourselves from gamma radiation? Why? How thick should such a shield be to reduce the incoming radiation by a factor of 1000?" | Q:6.3 (live from measured μ_Pb) |
| E6-Q4 | "In a shielding application (where a certain material is placed between us and the source) what is better: to use a single piece of thickness x or two pieces of thickness x/3 and 2x/3? Why?" | Q:6.4 |
| E6-Q5 | "Knowing that the materials you are using as absorbers are Fe, Pb and Al, how do you identify them?" | Q:6.5 |
| E6-Q6 | "Do you see any difference between the attenuation coefficients calculated with the graphical method vs using the least square method? If you do, is this difference significant?" | Q:6.6 (live z-test) |

---

## Experiment 7 — The photoelectric effect (pp. 44–48)

**Purpose (§7.1).** Study the photoelectric effect; determine Planck's constant.

**Theory (§7.2–7.3).** E_photon = W + K (7.1); K = hν − W (7.2); capacitor charges until U₀ where no electron reaches the anode; eU₀ = hν − W (7.3). Circuit (Fig. 7.2): photocell K/A, capacitor C, voltmeter V, external discharge switch (not drawn). Hg lines (§7.3.2): 184.45, 253.7, 365.4 (UV), 404.7 violet, 435.8 blue, 546.1 green, 578.2 yellow-orange.

**Apparatus (§7.3).** Hg light source; rotating filter wheel; diaphragm (intensity); lens (focuses onto the photocell); photocell in a simple circuit. Fig. 7.1 labels A–E (lamp, lens?, diaphragm?, filter wheel, photocell — identification to verify). Fig. 7.3 shows the multimeter and circuit box.

| ID | Procedure step (§7.4) | Feature |
|---|---|---|
| E7-P1 | Identify the circuit elements and the external switch | RUN:7#2 |
| E7-P2 | Explain why eU₀ = hν − W (7.3) | RUN:7#2b, Q:7.step2 |
| E7-P3 | Turn on the multimeter as a voltmeter | RUN:7#3 |
| E7-P4 | Turn on the Hg lamp (5–10 min warm-up) | RUN:7#1 (moved first; 10 min timer) |
| E7-P5 | Select a filter | RUN:7#4 |
| E7-P6 | Discharge the capacitor with the external switch | RUN:7#5 |
| E7-P7 | Wait until charged; read the voltage; write it in the table | RUN:7#6 |
| E7-P8 | Repeat 6–7 for the required number of measurements (or read at 15–20 s intervals without discharging) | RUN:7#6 (stopwatch with laps) |
| E7-P9 | Repeat 5–8 for the other filters | RUN:7#7 |

| ID | Table | Columns | Feature |
|---|---|---|---|
| E7-T1 | Data table | Filter, wavelength (…), Voltage (…) ×10 per filter measured; Ū₀ (…), σ_Ū₀ (…) derived | DATA:7/T |
| E7-T2 | Q2 table | A, B, C, D + two blank rows | Q:7.2 |
| E7-T3 | Conclusions | Planck constant (h)(…), Uncertainty (…) | RES:7/conclusions |

| ID | Analysis / uncertainty (§7.5–7.6) | Feature |
|---|---|---|
| E7-A1 | Ū₀ per filter and the standard deviation of the mean | RES:7/per-filter table (CALC:G1) |
| E7-A2 | On graph paper, U₀ vs frequency (or 1/λ) | RES:7/plot + A4 scale suggester (CALC:G5) |
| E7-A3 | h from the analysis of the graph | RES:7/graphical h |
| E7-A4 | h by least squares | RES:7/h = e·a |
| E7-U1 | Uncertainty of h from the slope uncertainty | RES:7/σ_h = e·s_a |

| ID | Question (verbatim) | Feature |
|---|---|---|
| E7-Q1 | "The relation between the kinetic energy of the photoelectrons and the frecquency of the incoming photons is given by what relation? What type of dependence exists between the the kinetic energy of the photoelectrons and the frequency of the radiation?" | Q:7.1 |
| E7-Q2 | "In figure 7.1 the purpose of the elements is the following: A … B … C … D …" | Q:7.2 |
| E7-Q3 | "If 10 measurements of the same variable xᵢ are made in identical conditions, what is the average value? Write the relation for the standard deviation of the data. Write the relation for the standard deviation of the mean." | Q:7.3 |
| E7-Q4 | "what is the eV (electronvolt)? What is its value in the international system of units?" | Q:7.4 |
| E7-Q5 | "What is the kinetic energy and velocity (as a fraction of c-speed of light) of an electron starting from rest and being accelerated under a potential difference of 10V? What if the potential difference is 100V? What if the potential difference is 10⁸V?" | Q:7.5 |
| E7-Q6 | "From your data analysis, what is the lowest frequency - ν_min or (longest wavelength λ_max) for which the fotoelectric effect can occur? What is the significance of this value?" | Q:7.6 (live ν₀ with cov(a,b)) |
| E7-X1 | Procedure step 2 "explain why …" (embedded prompt) | Q:7.step2 |

---

## Embedded "explain" prompts outside §X.8

| ID | Prompt | Feature |
|---|---|---|
| E7-X1 | Exp 7 §7.4 step 2: explain eq. 7.3 | Q:7.step2 |
| E5-X1 | Exp 5 §5.5 step 1: "Answer questions 3, 4" before analysis | Results tab links to Q:5.3, Q:5.4 |
| E6-X1 | Exp 6 §6.5 step 1: "Answer question 1" | Results tab links to Q:6.1 |
| E2-X1 | Exp 2 §2.7 note (shared reasoning, out of scope): averaging only with uncertainties — not needed | — |
