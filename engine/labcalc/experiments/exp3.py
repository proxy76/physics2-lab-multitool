"""Experiment 3 — Rydberg constant from the Balmer series (prism spectrogram).

Calibration (Cauchy, eq. 3.9): x = A + B/λ²  — least squares of x_Hg (mm) against X = λ⁻² (µm⁻²).
Hydrogen: λ_H = √(B/(x_H − A)).  Rydberg (eq. 3.8): 1/λ = R/4 − R·(1/n²) — least squares of 1/λ
against 1/n²: slope = −R_H (the guide says "+R", see ERRATA E3-slope), intercept = R_H/4.
"""

from __future__ import annotations

from mpmath import mpf, sqrt

from .. import linfit
from ..constants import BALMER, HG_LINES_GUIDE, HG_LINES_NIST
from ..parse import ParseError, is_blank, parse_number, parse_optional
from ..result import Result, cell, cell_val_unc, num
from ..rounding import fmt_sig, tex_sig as t
from .common import as_read, compare, fit_plot, fit_values, fit_warnings, series_points

NIST_OF_GUIDE = dict(zip(HG_LINES_GUIDE, HG_LINES_NIST))
UM = mpf("1e-3")  # nm → µm


def analyze(params: dict, k: dict, options: dict) -> dict:
    res = Result(round_up=options.get("round_up", False))
    thr = mpf(str(options.get("outlier_threshold", "2.5")))
    use_nist = params.get("lambda_set") == "nist"
    sx = parse_optional(params.get("sigma_x"), "sigma_x")
    if sx is None:
        sx = mpf("0.05")  # half of the 0.1 mm vernier step (decision D14)

    # --- Table 3.1: calibration -----------------------------------------------------------------
    cal = []
    for i, r in enumerate(params.get("hg") or []):
        if is_blank(r.get("x")) or is_blank(r.get("lambda")):
            continue
        lam_txt = str(r.get("lambda")).strip()
        lam = parse_number(NIST_OF_GUIDE.get(lam_txt, lam_txt) if use_nist else lam_txt, f"hg[{i}].lambda")
        x = parse_number(r.get("x"), f"hg[{i}].x")
        cal.append({"id": r.get("id", f"hg{i}"), "lam": lam, "x": x, "X": 1 / (lam * UM) ** 2, "excluded": bool(r.get("excluded")),
                    "xread": as_read(r.get("x"), x)})
    res.table("hg", "Table 3.1 — mercury calibration", [{"key": "lam", "label": "λ_Hg", "unit": "nm"}, {"key": "x", "label": "x_Hg", "unit": "mm"},
              {"key": "X", "label": "λ⁻²", "unit": "µm⁻²"}],
              [{"id": c["id"], "lam": fmt_sig(c["lam"], 7), "x": c["xread"], "X": cell(c["X"], None, 6), "excluded": c["excluded"]} for c in cal])
    use = [c for c in cal if not c["excluded"]]
    if len(use) < 3:
        res.info("need_rows", "Enter at least 3 mercury lines to calibrate (all 11 recommended).")
        return res.to_json()
    srt = sorted(use, key=lambda c: c["lam"])
    if all(b["x"] < a["x"] for a, b in zip(srt, srt[1:])):
        res.warn("orientation", "The locator reading decreases with wavelength — the guide asks you to flip the plate so it increases (the fit itself still works).")
    elif not all(b["x"] > a["x"] for a, b in zip(srt, srt[1:])):
        res.warn("order", "The x readings are not monotonic in λ — a line is probably mis-assigned (check the triplet 433.9/434.7/435.8 nm).")
    ids = [c["id"] for c in use]
    labels = [f"{fmt_sig(c['lam'], 5)} nm" for c in use]
    f = linfit.ols([c["X"] for c in use], [c["x"] for c in use])
    fit_warnings(res, f, ids, labels, thr, "Calibration")
    A, B = f.b, f.a
    res.value("A", A, f.s_b, "mm", "Cauchy A (intercept)", group="calibration")
    res.value("B", B, f.s_a, "mm·µm²", "Cauchy B (slope)", group="calibration")
    res.value("cal.cov", f.cov, None, "", "cov(A, B)", group="calibration")
    res.value("cal.s", f.s, None, "mm", "residual standard deviation", sig=3, group="calibration")
    res.steps_from(linfit.steps(f, "λ⁻² (µm⁻²)", "x_Hg (mm)"), "Calibration")
    flags = res.extra.setdefault("flags", {})
    res.plot(fit_plot("cal", "Calibration: x_Hg vs λ⁻²", {"label": "λ⁻²", "unit": "µm⁻²"}, {"label": "x_Hg", "unit": "mm"}, f, None, ids, labels, flags))
    lam_lo, lam_hi = min(c["lam"] for c in use), max(c["lam"] for c in use)

    # predicted positions of the Balmer lines (identification helper)
    pred = []
    for lab, n, lam_ref in BALMER:
        X = 1 / (mpf(lam_ref) * UM) ** 2
        xp = f.predict(X)
        pred.append({"line": lab, "n": n, "lambda": lam_ref, "x": fmt_sig(xp, 4), "sx": fmt_sig(f.predict_unc(X), 2),
                     "extrapolated": bool(mpf(lam_ref) < lam_lo or mpf(lam_ref) > lam_hi)})
    res.extra["predicted"] = pred

    # --- Table 3.2: hydrogen lines --------------------------------------------------------------
    hrows, hp = [], []
    for i, r in enumerate(params.get("h") or []):
        if is_blank(r.get("x")):
            continue
        n = int(parse_number(r.get("n"), f"h[{i}].n"))
        if n < 3:
            raise ParseError("Balmer lines have n_i ≥ 3", field=f"h[{i}].n")
        xH = parse_number(r.get("x"), f"h[{i}].x")
        if (xH - A) * B <= 0:
            raise ParseError(f"x = {fmt_sig(xH, 5)} mm is on the wrong side of A = {fmt_sig(A, 5)} mm — λ cannot be computed (check the reading / calibration)", field=f"h[{i}].x")
        X, sX = linfit.inverse_predict(f, xH, sx)
        lam_um = 1 / sqrt(X)
        slam_um = lam_um * sX / (2 * X)
        lam_nm, slam_nm = lam_um / UM, slam_um / UM
        label = r.get("line") or {3: "Hα", 4: "Hβ", 5: "Hγ", 6: "Hδ", 7: "Hε"}.get(n, f"n={n}")
        ref = next((mpf(l) for lb, nn, l in BALMER if nn == n), None)
        extrap = lam_nm < lam_lo or lam_nm > lam_hi
        if extrap:
            res.warn("extrapolation", f"{label}: λ = {fmt_sig(lam_nm, 5)} nm is outside the calibration range {fmt_sig(lam_lo, 4)}–{fmt_sig(lam_hi, 4)} nm (extrapolated — larger error expected).")
        if ref is not None and abs(lam_nm - ref) > 3:
            res.warn("misid", f"{label}: λ = {fmt_sig(lam_nm, 5)} nm is {fmt_sig(abs(lam_nm - ref), 2)} nm from the expected {fmt_sig(ref, 5)} nm — possible misidentified line.")
        hp.append({"id": r.get("id", f"h{i}"), "label": label, "n": n, "x": xH, "lam": lam_nm * mpf("1e-9"), "slam": slam_nm * mpf("1e-9"),
                   "lam_nm": lam_nm, "slam_nm": slam_nm, "excluded": bool(r.get("excluded")), "ref": ref})
        lv, lu = cell_val_unc(lam_nm, slam_nm)
        hrows.append({"id": r.get("id", f"h{i}"), "line": label, "n": str(n), "x": as_read(r.get("x"), xH), "lam": cell(lam_nm, None, 6), "lam_r": lv, "slam": lu,
                      "ref": fmt_sig(ref, 6) if ref else "", "dev": fmt_sig((lam_nm - ref), 3) if ref else "", "extrap": extrap, "excluded": bool(r.get("excluded"))})
    res.table("h", "Table 3.2 — hydrogen lines", [{"key": "line", "label": "Spectral line", "unit": ""}, {"key": "n", "label": "n_i", "unit": ""},
              {"key": "x", "label": "x_H", "unit": "mm"}, {"key": "lam", "label": "λ_H", "unit": "nm"}, {"key": "slam", "label": "σ_λ (Adv.)", "unit": "nm"},
              {"key": "ref", "label": "NIST air", "unit": "nm"}, {"key": "dev", "label": "λ − NIST", "unit": "nm"}], hrows,
              note="λ_H = √(B/(x_H − A)). σ_λ propagates σ_x and cov(A,B) (inverse prediction) — an Advanced quantity, not required by the guide.")
    if hp:
        p = hp[0]
        res.step("Hydrogen wavelength from the calibration (eq. 3.9 inverted)", r"\lambda_H=\sqrt{\frac{B}{x_H-A}}",
                 rf"\lambda_{{{p['label']}}}=\sqrt{{\frac{{{t(B)}}}{{{t(p['x'])}-({t(A)})}}}}", rf"{t(p['lam_nm'])}\ \mathrm{{nm}}")
    hu = [p for p in hp if not p["excluded"]]
    if len(hu) < 3:
        res.info("need_rows", "The Rydberg fit needs at least 3 hydrogen lines (all 5 recommended).")
        return res.to_json()
    xs = [mpf(1) / p["n"] ** 2 for p in hu]
    ys = [1 / p["lam"] for p in hu]
    fr = linfit.ols(xs, ys)
    hids = [p["id"] for p in hu]
    hlabels = [p["label"] for p in hu]
    fit_warnings(res, fr, hids, hlabels, thr, "Rydberg fit")
    fit_values(res, "ryd", fr, "m⁻¹", "m⁻¹", group="Rydberg fit")
    R, sR = -fr.a, fr.s_a
    res.value("R", R, sR, "m⁻¹", "Rydberg constant R_H = −slope", group="results")
    res.value("R_intercept", 4 * fr.b, 4 * fr.s_b, "m⁻¹", "cross-check R = 4·intercept", group="results")
    res.steps_from(linfit.steps(fr, "1/n²", "1/λ (m⁻¹)"), "Rydberg")
    res.step("Rydberg constant (eq. 3.8; guide note: slope = −R_H)", r"\frac1\lambda=\frac{R_H}{4}-R_H\frac{1}{n^2}\ \Rightarrow\ R_H=-a,\ \sigma_R=s_a",
             rf"R_H=-({t(fr.a)})", rf"R_H={t(R)}\pm{t(sR, 3)}\ \mathrm{{m^{{-1}}}}")
    res.table("conclusions", "Conclusions (guide §3.7)", [{"key": "R", "label": "Rydberg constant R_H", "unit": "m⁻¹"}, {"key": "unc", "label": "Uncertainty", "unit": "m⁻¹"}],
              [dict(zip(("R", "unc"), cell_val_unc(R, sR)))])
    # complete uncertainty: the calibration (A, B) error is common to every λ_H and is not in s_a
    c = linfit.slope_coeffs(xs)
    Xs = [(p["x"] - A) / B for p in hu]
    JA = [-mpf("1e6") / (2 * sqrt(X) * B) for X in Xs]
    JB = [-mpf("1e6") * sqrt(X) / (2 * B) for X in Xs]
    Jx = [mpf("1e6") / (2 * sqrt(X) * B) for X in Xs]
    vA, vB, cAB = f.s_b ** 2, f.s_a ** 2, f.cov
    m_ = len(hu)
    cov_cal = [[JA[i] * JA[j] * vA + (JA[i] * JB[j] + JB[i] * JA[j]) * cAB + JB[i] * JB[j] * vB for j in range(m_)] for i in range(m_)]
    s_cal = sqrt(max(linfit.sandwich_var(c, cov_cal), mpf(0)))
    s_x = sqrt(linfit.sandwich_var(c, [[Jx[i] ** 2 * sx ** 2 if i == j else 0 for j in range(m_)] for i in range(m_)]))
    s_tot = sqrt(sR ** 2 + s_cal ** 2)
    s_prop = sqrt(s_x ** 2 + s_cal ** 2)
    res.value("R_total", R, s_tot, "m⁻¹", "R_H with σ = √(s_a² + σ_calibration²) (complete)", group="honesty")
    res.value("R_prop", R, s_prop, "m⁻¹", f"R_H with σ fully propagated from σ_x = {fmt_sig(sx, 2)} mm and cov(A,B)", group="honesty")
    res.value("R_cal_part", s_cal, None, "m⁻¹", "σ_R contribution of the calibration (A, B)", sig=3, group="honesty")
    if s_tot > mpf("1.3") * sR:
        res.warn("honesty", f"The Rydberg-fit σ (guide) = {fmt_sig(sR, 2)} m⁻¹ omits the calibration uncertainty, which is common to all lines; "
                 f"including it gives σ = {fmt_sig(s_tot, 2)} m⁻¹. Quote the guide value and mention the complete one.")
    compare(res, "R_H", R, sR, k["RH"], None, "m⁻¹", "R_H vs CODATA R_H = R∞/(1+mₑ/m_p)")
    compare(res, "R_inf", R, sR, k["Rinf"], None, "m⁻¹", "R_H vs R∞")
    res.plot(fit_plot("ryd", "Rydberg: 1/λ vs 1/n²", {"label": "1/n²", "unit": ""}, {"label": "1/λ", "unit": "m⁻¹"}, fr, [1 / p["lam"] ** 2 * p["slam"] for p in hu], hids, hlabels, flags))
    # Advanced -----------------------------------------------------------------------------------------
    fo = linfit.origin([mpf(1) / 4 - x for x in xs], ys)
    res.value("adv.R_origin", fo.a, fo.s_a, "m⁻¹", "R from 1/λ vs (1/4 − 1/n²) through the origin", group="advanced")
    sy = [p["slam"] / p["lam"] ** 2 for p in hu]
    if all(s > 0 for s in sy):
        fw = linfit.weighted(xs, ys, sy)
        res.value("adv.R_weighted", -fw.a, max(fw.s_a, fw.s_a_ext), "m⁻¹", "R, weighted fit with σ(1/λ) from the calibration (larger of int./ext.)", group="advanced")
        res.value("adv.R_weighted_chi2", fw.chi2_red, None, "", "χ²_red of the weighted Rydberg fit", sig=3, group="advanced")
    if len(use) >= 4:
        g = linfit.general([[1] * len(use), [c["X"] for c in use], [c["X"] ** 2 for c in use]], [c["x"] for c in use])
        C = g["p"][2]
        sC = sqrt(g["cov"][2][2])
        res.value("adv.cauchy_C", C, sC, "mm·µm⁴", "3-term Cauchy C (x = A + B/λ² + C/λ⁴)", group="advanced")
        res.value("adv.cauchy_s", g["s"], None, "mm", "3-term residual s (compare with 2-term)", sig=3, group="advanced")
        if sC > 0 and abs(C) / sC > 3:
            res.info("cauchy3", "The C/λ⁴ term is significant (> 3σ): the 2-term Cauchy fit leaves a curved residual pattern. Consider reporting the 3-term λ_H as a cross-check.")
    res.extra["residual_pattern"] = [num(v) for v in f.res]
    return res.to_json()
