// Guide notes: every place where LaboratoryGuide.pdf is wrong or simplified (docs/ERRATA.md).
export interface GuideNote {
  title: string;
  text: string;
  kind: "error" | "typo" | "discussion";
}

export const NOTES: Record<string, GuideNote> = {
  "A-mean": { kind: "error", title: "Appendix A.2.2: Poisson mean", text: "The guide prints x̄ = Σ(x − x̄)²P(x) = pn. That sum is the variance. The mean is x̄ = Σ x·P(x) = pn." },
  "A-var": { kind: "typo", title: "Appendix A.1: N − 1 variance", text: "The garbled formula is s² = 1/(N − 1)·Σ(xᵢ − x̄_e)². Eq. A.1 (1/N) only applies with the true mean, which is never known." },
  "B-B1": { kind: "error", title: "Appendix B, eq. B.1", text: "In ∂S²/∂b and the second line of B.1, Σyᵢ appears where Σxᵢ belongs: Σyᵢ − a·Σxᵢ − b·n = 0. The final formulas B.2–B.11 are correct (verified against NIST StRD)." },
  "E3-h": { kind: "error", title: "Eqs. 3.2–3.7: powers of h", text: "The guide prints h³ in 3.2/3.3 and h⁴ in 3.4/3.6/3.7. Correct: Eₙ = −mₑe⁴/(8ε₀²h²n²) and R_H = mₑe⁴/(8cε₀²h³). Only then do the units work and eq. 3.7 gives 1.0974×10⁷ m⁻¹." },
  "E3-slope": { kind: "error", title: "§3.5 step 3: sign of the slope", text: "1/λ = R/4 − R·(1/n²): the slope of 1/λ vs 1/n² is −R_H, not +R_H. The app reports R = −slope, and checks it with R = 4·intercept." },
  "E3-attn": { kind: "typo", title: "§3.6: 'attenuation coefficient'", text: "Copy-paste from Exp. 6 — it means the uncertainty of the Rydberg constant, σ_R = s_a." },
  "E3-fig": { kind: "typo", title: "§3.4 step 4: Fig. 3.2", text: "Fig. 3.2 is the microscope. The Hγ ↔ Hg 434.7 nm alignment is seen on the plate itself (Fig. 3.1) through the eyepiece." },
  "E3-nm": { kind: "typo", title: "§3.2: 'n and m', 'eq 5', '(3)'", text: "The two integers are n_f and n_i (Balmer: n_f = 2). 'Eq 5' and '(3)' mean eqs. 3.6 and 3.4/3.2." },
  "E3-Q4": { kind: "typo", title: "Q4: 'x_Hg is on the abscissa'", text: "A stray fragment from the graph instructions; it is not part of the question. In §3.5 x_Hg is plotted against λ⁻²." },
  "E4-fig": { kind: "typo", title: "Figure numbers in Exp. 4", text: "'Figure 3a/3b/3c' = Figs. 4.3–4.5; 'Figures 1 and 4' = Figs. 4.1 and 4.6; 'Figures 4 and 5' = Figs. 4.6 and 4.7; 'in 4.2' = Fig. 4.1; 'condition for a maximum (4.5)' = eq. 4.4/4.6 with n = 1; 'eq. 2', 'eq. 5' in the questions = eqs. 4.2, 4.5." },
  "E4-approx": { kind: "discussion", title: "Eq. 4.5 is an approximation", text: "tan 2θ = D/2L ≈ sin 2θ ≈ 2 sin θ. At D = 6 cm the chain is ≈ 1.8 % off, making d ≈ 1.8 % too small. The headline follows the guide; Advanced shows the exact geometry." },
  "E4-C": { kind: "discussion", title: "Eq. 4.8: 3.3×10⁻¹⁰", text: "With CODATA constants C = 2Lh/√(2mₑe) = 3.311×10⁻¹⁰ m·V^½ (guide constants: 3.317×10⁻¹⁰). The guide rounds to 3.3×10⁻¹⁰, which alone shifts d by 0.3 %." },
  "E5-S": { kind: "discussion", title: "S = 1 and the γ yield", text: "¹³⁷Cs emits the 661.7 keV γ in only 85.1 % of decays (NNDC; LNHB 85.01 %). The guide sets S = 1, so the headline does too; with the real yield Λ ≈ Λ(S = 1)/0.851." },
  "E5-approx": { kind: "discussion", title: "Eq. 5.3 at short distances", text: "D²/16r² over-estimates Ω by ≈ 3(D/r)²/16: 13 % at 3 cm, 4.8 % at 5 cm, 1.2 % at 10 cm. Near points therefore bias Method II low. See Q6." },
  "E5-sigma": { kind: "typo", title: "Table header 'σ…' and 'processor'", text: "The last column of the §5.4 table is σ_n. 'Assisting processor' in §5.3 means assisting professor." },
  "E5-honesty": { kind: "discussion", title: "Least-squares σ vs counting statistics", text: "B.10 assumes every point has the same error. Poisson σ grows with the rate, so near slots are ~10× noisier than far ones, and B.10 can under-estimate σ_Λ. The app also shows σ from counting statistics propagated through the same fit; quote both." },
  "E6-fig": { kind: "typo", title: "§6.2: 'Figure 6.2'", text: "The slab diagram is Fig. 6.1; Fig. 6.2 is the set-up photo." },
  "E6-mass": { kind: "discussion", title: "Mass vs linear attenuation coefficient", text: "The purpose asks for the mass attenuation coefficient μ/ρ, the analysis gives μ. The app reports both (μ/ρ with NIST densities)." },
  "E6-time": { kind: "discussion", title: "Measuring time", text: "§6.3.2 divides areas by time only if spectra have different durations. Here the professor fixes t = 100 s for every spectrum, so the time cancels: I₀/I = A₀/A(x), and the table uses A₀/A(x) and y = ln(A₀/A(x)) with no time column." },
  "E7-app": { kind: "typo", title: "'Appendix 7.3.2'", text: "§7.3.2 is a section, not an appendix." },
  "E7-yellow": { kind: "discussion", title: "578.2 nm", text: "The yellow Hg line is an unresolved doublet 576.96/579.07 nm (NIST); 578.2 nm is a fair mean for a yellow filter." },
  "E7-W": { kind: "discussion", title: "W is an effective value", text: "The contact potential between cathode and anode shifts U₀ by a constant, so W and ν₀ are effective values. The slope h/e is unaffected." },
  "E7-table": { kind: "discussion", title: "§7.4 table: add a ν column", text: "The guide's table has only a wavelength column. The professor wants a frequency column ν = c/λ (s⁻¹) right next to it: Filter | λ (nm) | ν (s⁻¹) | Voltage (V) | Ū₀ (V) | σ_Ū₀ (V). That is the only change." },
  "E7-filter": { kind: "discussion", title: "4 points; a defective 4th filter", text: "There are 4 filters, so the U₀(ν) graph has 4 points. An earlier team's violet filter gave a U₀ below blue's although its frequency is higher: that filter was defective. If yours does the same, leave that point out of the fit (Exclude) and fit the other 3. Mention it in the report." },
  "E7-order": { kind: "discussion", title: "Lamp first", text: "The guide switches the lamp on in step 4; it needs 5–10 min, so the run guide does it first. Nothing else changes." },
  "E3-honesty": { kind: "discussion", title: "Calibration uncertainty in R", text: "The Rydberg fit's s_a ignores the error of A and B, which is common to all five λ_H. The app also shows σ_R including the calibration (√(s_a² + σ_cal²))." },
};
