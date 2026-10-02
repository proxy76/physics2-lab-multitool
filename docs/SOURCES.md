# Sources

All values below were fetched from the primary source on **2026-10-02** and are hard-coded in `engine/labcalc/constants.py` with the same citation. Anything not confirmed here is marked **Verify in lab** in the app.

## 1. Fundamental constants — CODATA 2022 (NIST)

URL: <https://physics.nist.gov/cuu/Constants/Table/allascii.txt> ("2022 CODATA adjustment").

| Quantity | Value | Std. unc. |
|---|---|---|
| c | 299 792 458 m s⁻¹ | exact |
| h | 6.626 070 15 × 10⁻³⁴ J Hz⁻¹ | exact |
| e | 1.602 176 634 × 10⁻¹⁹ C | exact |
| 1 eV | 1.602 176 634 × 10⁻¹⁹ J | exact |
| m_e | 9.109 383 7139 × 10⁻³¹ kg | 0.000 000 0028 × 10⁻³¹ |
| e/m_e | −1.758 820 008 38 × 10¹¹ C kg⁻¹ | 0.000 000 000 55 × 10¹¹ |
| m_e c² | 0.510 998 950 69 MeV | 0.000 000 000 16 |
| ε₀ | 8.854 187 8188 × 10⁻¹² F m⁻¹ | 0.000 000 0014 × 10⁻¹² |
| μ₀ | 1.256 637 061 27 × 10⁻⁶ N A⁻² | 0.000 000 000 20 × 10⁻⁶ |
| R_∞ | 10 973 731.568 157 m⁻¹ | 0.000 012 |
| m_p/m_e | 1836.152 673 426 | 0.000 000 032 |

Derived in the engine (not typed): hc/e, R_H = R_∞/(1 + m_e/m_p) = 10 967 758.34… m⁻¹.

## 2. Photon attenuation — NIST XCOM

- XCOM: Photon Cross Sections Database (Berger, Hubbell, Seltzer, Chang, Coursey, Sukumar, Zucker, Olsen), <https://physics.nist.gov/PhysRefData/Xcom/html/xcom1.html>. Queried for Z = 13, 26, 82 at E = 0.661657 MeV (XCOM uses 4 significant figures, i.e. 0.6617 MeV).

| Material | Coherent | Incoherent | Photoelectric | Total with coherent (cm²/g) | Total w/o coherent (cm²/g) |
|---|---|---|---|---|---|
| Al (Z = 13) | 3.280e-4 | 7.428e-2 | 6.566e-5 | **7.468e-2** | 7.435e-2 |
| Fe (Z = 26) | 9.965e-4 | 7.161e-2 | 8.724e-4 | **7.348e-2** | 7.248e-2 |
| Pb (Z = 82) | 6.674e-3 | 6.015e-2 | 4.338e-2 | **1.102e-1** | 1.035e-1 |

- Cross-check: NIST X-Ray Mass Attenuation Coefficients (Hubbell & Seltzer), Table 3, <https://physics.nist.gov/PhysRefData/XrayMassCoef/ElemTab/z13.html> (z26, z82): μ/ρ at 0.6 / 0.8 MeV = Al 7.802e-2 / 6.841e-2, Fe 7.704e-2 / 6.699e-2, Pb 1.248e-1 / 8.870e-2 cm²/g. Log–log interpolation to 0.661657 MeV gives Al 0.07461, Fe 0.07346, Pb 0.1111 — consistent with XCOM at the 0.1–1 % level (Pb is curved across the interval, so the direct XCOM value is used).
- Densities and Z/A: Hubbell & Seltzer Table 1, <https://physics.nist.gov/PhysRefData/XrayMassCoef/tab1.html>: Al ρ = 2.699 g/cm³ (Z/A = 0.48181), Fe ρ = 7.874 (0.46556), Pb ρ = 11.35 (0.39575).

Expected μ (= μ/ρ · ρ): Al 0.2016 cm⁻¹, Fe 0.5786 cm⁻¹, Pb 1.251 cm⁻¹.

## 3. Spectral lines — NIST Atomic Spectra Database (ASD v5)

Query: <https://physics.nist.gov/cgi-bin/ASD/lines1.pl> (spectra "H I" and "Hg I", 380–700 nm, air wavelengths, observed).

**H I (Balmer), observed air wavelengths:** Hα 656.279, Hβ 486.135, Hγ 434.0472, Hδ 410.1734, Hε 397.0075 nm.

**Hg I lines in Table 3.1 (observed air):** 404.6565, 407.7837, 433.92232, 434.74945, 435.8335, 535.4034, 546.0750, 576.9610, 579.0670, 612.327, 623.436 nm. The guide's rounded values (404.7 … 623.4) agree to ≤ 0.05 nm and are the default; the app offers the NIST values in Advanced.

**Hg filter lines in Exp. 7:** 404.6565, 435.8335, 546.0750 nm, yellow doublet 576.9610 / 579.0670 nm (guide: 578.2 nm), UV 365.4 nm (guide value).

## 4. ¹³⁷Cs decay data

- LNHB / DDEP recommended data, <http://www.lnhb.fr/nuclides/Cs-137_tables.pdf>: T½ = 30.018 (22) a; γ(¹³⁷ᵐBa) E = 661.657 (3) keV, I_γ = 85.01 (20) % per decay.
- NNDC NuDat 3, <https://www.nndc.bnl.gov/nudat3/decaysearchdirect.jsp?nuc=137Cs&unc=nds>: T½ = 30.08 (9) y; E_γ = 661.657 (3) keV, I_γ = 85.10 (20) %.
- The app uses the NNDC values by default (the brief's reference) and shows the LNHB values alongside.

## 5. NIST StRD linear regression datasets

<https://www.itl.nist.gov/div898/strd/lls/lls.shtml>; data files `Norris.dat`, `NoInt1.dat`, `NoInt2.dat` downloaded from <https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/> and stored unmodified in `engine/tests/data/strd/`.

## 6. CASSY Lab 2 (Exp. 6)

Leybold/LD Didactic CASSY Lab 2 manual: <https://www.ld-didactic.de/software/524221en.pdf> (not downloadable from this environment at build time). The guide's own steps (§6.3.1) are used verbatim. CASSY's peak tools (right-click in the diagram → *Fit function* → *Gaussians*, or *Calculate peak centre* / *integral*) are offered as an **optional cross-check marked "Verify in lab"**.

## 7. Electron diffraction tube (Exp. 4)

LD Didactic product page 555 626 "Electron diffraction tube", <https://www.leybold-shop.com/physics/physics-equipment/atomic-and-nuclear-physics/physics-of-the-electron/demonstation-tubes/electron-diffraction-tube-555626.html>, and LD experiment P6.1.5.1 <https://www.leybold-shop.com/physics/physics-experiments/atomic-and-nuclear-physics/introductory-experiments/dual-nature-of-wave-and-particle/diffraction-of-electrons-at-a-polycrystalline-lattice-debye-scherrer-diffraction/vp6-1-5-1.html>: graphite-to-screen distance 13.5 cm, screen diameter 90 mm, plane spacings 123 pm and 213 pm, anode voltage 2.5–5 kV. These match the guide (L = 13.5 cm, 5 kV max, third ring off-screen), so the tube is **probably** a 555 626 — the app labels this "Verify in lab". No screen-curvature correction is applied in the headline result.

## 8. Photoelectric apparatus (Exp. 7)

LD Didactic Instruction Sheet 558 77 "Photo cell for determining Planck's constant", <http://www.hep.fsu.edu/~wahl/phy4822/expinfo/photel/55877e.pdf>: potassium cathode; measuring example U₀ = 0.59 V (578 nm), 0.70 V (546 nm), 1.23 V (436 nm), 1.40 V (405 nm), slope 3.8×10⁻¹⁵ V/Hz, h = 6.1×10⁻³⁴ J·s; "the measured values for the voltages U₀ … can vary greatly from device to device … The differences in the voltages, on the other hand, are reproducible". The lab's photocell identity is **not confirmed** (Fig. 7.1 is compatible with an LD optical-bench set-up) — the app labels it "Verify in lab". The ideal differences (from hc/e) are 0.92 V (405 vs 578 nm) and 0.57 V (436 vs 546 nm); LD's example gives 0.81 V and 0.53 V, i.e. capacitor-method results typically fall ≈ 10 % below the ideal slope.

## 9. Counter NP 632 (Exp. 5)

No manual found online. The guide's photo (Fig. 5.2, zoomed) reads "NP-632 NUCLEAR SCALER-TIMER" with buttons Start, Stop, Reset, switch On/Off, rotary selectors MODE (TIME / COUNTS / NORMAL / RECYCLE / TEST, partly legible) and PRESET STOPS, a SENSITIVITY knob and an INPUT connector. The Run guide gives generic Start/Stop/Reset instructions and marks the preset-time setting "Verify in lab".

## 10. Uncertainty conventions

- JCGM 100:2008 (GUM) §7.2.6 — quoted in the guide (§2.8, §5.8); <https://www.bipm.org/documents/20126/2071204/JCGM_100_2008_E.pdf>.
- GUM §4.3.7: rectangular distribution of half-width a → u = a/√3 (Type B). Resolution of a digital or vernier instrument with step δ: half-width a = δ/2 → u = δ/(2√3) ≈ 0.29 δ. The common teaching convention "± half the least count" (u = δ/2) is also offered; the app states which one is used (default: δ/2, as most lab courses expect, with the GUM value shown next to it).
- JCGM 101:2008 (GUM Supplement 1) — Monte Carlo propagation; <https://www.bipm.org/documents/20126/2071204/JCGM_101_2008_E.pdf>.
