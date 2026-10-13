# Errata in `LaboratoryGuide.pdf`

Each item is shown in the app as a **Guide note** at the place where it matters (the ID in brackets is the note's ID in `web/src/content/notes.ts`). The app always implements the corrected physics and maths; the headline method is still the guide's method.

Severity: **M** = mathematics/physics slip (the app computes the corrected form), **R** = wrong cross-reference or typo (no effect on numbers), **D** = discussion point (guide simplification, not an error to fix in the headline result).

## Appendix A — Counting statistics

| ID | Where | What the guide says | Correct | Sev. |
|---|---|---|---|---|
| A-mean | A.2.2, Poisson "mean value" | x̄ = Σ (x − x̄)² P(x) = pn | x̄ = Σ x·P(x) = pn. The printed sum is the *variance*. | M |
| A-var | A.1, line after A.1 | N−1 variance typeset as "s² = N 1 1 Σ…" (garbled) | s² = 1/(N−1) · Σ (xᵢ − x̄_e)² | R |
| A-A1 | A.1 eq. A.1 | Uses 1/N with the *true* mean | Correct as written, but only usable when x̄ (true) is known. With the experimental mean use 1/(N−1). The app's G1 uses N−1. | D |

## Appendix B — Least squares

| ID | Where | What the guide says | Correct | Sev. |
|---|---|---|---|---|
| B-db | ∂S²/∂b line | −2Σyᵢ + 2a·**Σyᵢ** + 2bΣ1 | −2Σyᵢ + 2a·**Σxᵢ** + 2bΣ1 | M |
| B-B1 | eq. B.1, 2nd equation | Σyᵢ − a·**Σyᵢ** − b·n = 0 | Σyᵢ − a·**Σxᵢ** − b·n = 0 | M |
| B-final | B.2–B.11 | — | Correct; implemented and verified against NIST StRD (Norris) to ≥ 12 digits. | — |

## Experiment 3 — Rydberg constant

| ID | Where | What the guide says | Correct | Sev. |
|---|---|---|---|---|
| E3-h | eqs. 3.2, 3.3 | m_e e⁴ / (8 ε₀² **h³**) | m_e e⁴ / (8 ε₀² **h²**) — otherwise the units are not energy. | M |
| E3-h2 | eqs. 3.4, 3.6, 3.7 | … / (8 ε₀² **h⁴**), … / (8 c ε₀² **h⁴**) | … / (8 ε₀² **h³**), R_H = m_e e⁴ / (8 c ε₀² **h³**). The app evaluates 3.7 with the corrected exponent: 1.0973731…×10⁷ m⁻¹ (R_∞ with m_e; with the reduced mass it gives R_H). | M |
| E3-En | eq. 3.3 | "E_n = … = −13.6 eV" | This is E₁ (n = 1). | R |
| E3-nm | §3.2 after 3.5 | "two integer numbers, n and m"; "for n = 2" | n_f and n_i; Balmer series is n_f = 2. | R |
| E3-eq5 | §3.2 | "Bohr model result (3)", "According to eq 5" | eq. 3.4 / 3.2 and eq. 3.6. | R |
| E3-fig | §3.4 step 4 | "Hγ lines up with the 434.7 nm line … (see figure 3.2)" | Fig. 3.2 is the microscope photo. The alignment is seen on the plate (Fig. 3.1) / in the eyepiece. | R |
| E3-slope | §3.5 step 3 | "a straight line whose slope is equal to Rydberg constant" | 1/λ = R/4 − R·(1/n²): slope = **−R_H**, intercept = R_H/4. The app reports R = −slope (and the cross-check R = 4·intercept). | M |
| E3-attn | §3.6 | "uncertainty of the attenuation coefficient" | Copy-paste from Exp. 6: it is the uncertainty of the **Rydberg constant**, σ_R = s_a. | R |
| E3-Q4 | §3.8 Q4 | "… fill the 4-th column in the table above. x_Hg is on the abscissa." | The fragment "x_Hg is on the abscissa" belongs to the graph instructions (§3.5 step 1, where actually x_Hg is on the *ordinate* and λ⁻² on the abscissa). | R |
| E3-T | §3.4 | "Table 1", "Table 2" | Tables 3.1 and 3.2. | R |

## Experiment 4 — Electron diffraction

| ID | Where | What the guide says | Correct | Sev. |
|---|---|---|---|---|
| E4-fig3 | §4.2 | "Figure 3a / 3b / 3c" | Figs. 4.3, 4.4, 4.5 | R |
| E4-fig14 | §4.3 | "(see the theoretical considerations, Figures 1 and 4)" | Figs. 4.1 and 4.6 | R |
| E4-fig45 | §4.3 | "(see Figures 4 and 5)" | Figs. 4.6 and 4.7 | R |
| E4-in42 | §4.2 | "in 4.2, two such planes …", "From 4.2 …" | Fig. 4.1 (Fig. 4.2 is the graphene spot pattern). | R |
| E4-eq | §4.3 | "For the first order of diffraction 1n= the condition for a maximum (4.5) reads" | "For n = 1 the condition for a maximum (4.4) reads" | R |
| E4-eq5 | §4.8 Q3, Q5 | "eq. 2", "eq. 5" | eqs. 4.2 and 4.5 | R |
| E4-rings | §4.4 step 4 | "the two diffraction" | the two diffraction **rings** | R |
| E4-1D | §4.3 | "1D and 2D", "1d and 2d" | D₁, D₂, d₁, d₂ (subscripts lost in typesetting) | R |
| E4-approx | eq. 4.5 | tan 2θ = D/2L ≈ sin 2θ ≈ 2 sin θ | Approximate. At D = 6 cm the chain is ≈ 1.8 % off (Q5). The app keeps the guide's formula in the headline and shows the exact geometry in Advanced. | D |
| E4-const | eq. 4.8 | 3.3×10⁻¹⁰ (SI) | With CODATA: C = 2Lh/√(2m_e e) = 3.3112…×10⁻¹⁰ m·V^½. The app shows both; "Guide constants" mode reproduces 3.3×10⁻¹⁰. | D |

## Experiment 5 — Source activity

| ID | Where | What the guide says | Correct | Sev. |
|---|---|---|---|---|
| E5-prof | §5.3 | "assisting processor" | assisting professor | R |
| E5-sigma | §5.4 table | last header "σ…(…)" | σ_n (uncertainty of the background-corrected rate) | R |
| E5-S | §5.2, §5.5 | "Every time one of these nuclei decays it emits one photon"; S = 1 | ¹³⁷Cs → ¹³⁷ᵐBa emits the 661.657 keV γ in 85.1 % (NNDC) / 85.01 % (LNHB) of decays. With the real yield Λ_true ≈ Λ(S = 1)/0.851. Discussion point only; headline uses S = 1 as instructed. | D |
| E5-approx | eq. 5.3 | n = Λ·D²/(16r²)·ε·S used for all distances | The approximation over-estimates Ω by ≈ 3u²/16 (u = D/r); ≈ 13 % at 3 cm. Method II therefore biases Λ **low** if near points are included. Shown as a warning and in the Q6 table. | D |
| E5-dt | eq. 5.1 vs 5.3 | n = N/Δt in 5.1/5.3, N/t in the table | Same quantity (counting time). | R |

## Experiment 6 — Attenuation

| ID | Where | What the guide says | Correct | Sev. |
|---|---|---|---|---|
| E6-fig | §6.2 | "slab of material as depicted in Figure 6.2" | Fig. 6.1 (Fig. 6.2 is the setup photo). | R |
| E6-mass | §6.1 vs §6.5–6.7 | Purpose: *mass* attenuation coefficient; analysis/conclusions: μ | The app reports both μ (cm⁻¹) and μ/ρ (cm²/g); the conclusions table keeps the guide's μ column and the density column, plus μ/ρ. | D |
| E6-time | Table §6.4 | No time column | The professor fixes t = 100 s for every spectrum, so time cancels and is not recorded. The table has A₀/A(x) and y = ln(A₀/A(x)) instead of Area/t and ln(Area/t). | D |

## Experiment 7 — Photoelectric effect

| ID | Where | What the guide says | Correct | Sev. |
|---|---|---|---|---|
| E7-app | §7.3 | "(see appendix 7.3.2)" | §7.3.2 is a section, not an appendix. | R |
| E7-yellow | §7.3.2 | 578.2 nm yellow-orange | Unresolved doublet 576.96 / 579.07 nm (NIST ASD); 578.2 nm is a reasonable mean for a yellow filter. | D |
| E7-order | §7.4 | Lamp switched on in step 4 | The lamp needs 5–10 min, so the Run guide switches it on first (no change to the physics). | D |
| E7-W | eq. 7.3 | W_extraction | Experimentally W includes the contact potential between the electrodes; W and ν₀ are "effective" values. | D |
