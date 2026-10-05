"""Experiment 5 — Source activity by the solid-angle method (scintillation detector).

n = Λ·(Ω/4π)·ε·S (5.1);  Ω/4π = ½ − 1/√(4 + (D/r)²) ≈ D²/(16r²) (5.2);  n = Λ·D²/(16r²)·ε·S (5.3)

Method I  (guide §5.5 step 2, "use the answer to Q4"): fit the exact geometry n = K·g(r) through the
           origin, extrapolate n(0) = K/2 (Ω → 2π), Λ_I = 2·n(0)/(εS) = K/(εS).
Method II (guide §5.5 step 3): least squares of n against X = D²/(16r²): Λ_II = a/(εS), σ = s_a/(εS).
"""

from __future__ import annotations

from datetime import date

from mpmath import fsum, mp, mpf, sqrt

from .. import counting, decay, linfit
from ..constants import CS137, EXP5
from ..parse import ParseError, is_blank, parse_number, parse_optional
from ..result import Result, cell, cell_val_unc, num
from ..rounding import fmt_sig, tex_sig as t
from .common import as_read, compare, fit_plot, fit_values, fit_warnings, opt, rows_complete, series_line, series_points

TITLE = "Experiment 5 — Source activity (solid-angle method)"


def g_exact(r, D):
    """Ω/4π for a point source on the axis of a disc of diameter D at distance r (exact)."""
    if r == 0:
        return mpf(1) / 2
    return mpf(1) / 2 - 1 / sqrt(4 + (D / r) ** 2)


def x_approx(r, D):
    return D ** 2 / (16 * r ** 2)


def _flag_fit(use, xkey, fit, origin=False):
    """Fit used only to flag outliers. The Poisson σ of n differs ×10–100 between slots, so the
    unweighted studentised residual flags whichever point carries the most absolute noise (D21/D22).
    With every σ_n known, the residual in units of its own σ (weighted fit) is the honest test."""
    if any(p["sn"] <= 0 for p in use):
        return fit
    return linfit.weighted([p[xkey] for p in use], [p["n"] for p in use], [p["sn"] for p in use], through_origin=origin)


def analyze(params: dict, k: dict, options: dict) -> dict:
    res = Result(round_up=options.get("round_up", False))
    thr = mpf(str(options.get("outlier_threshold", "2.5")))
    eps = parse_number(opt(params, "eps", EXP5["eps"]), "eps")
    S = parse_number(opt(params, "S", EXP5["S"]), "S")
    D = parse_number(opt(params, "D", EXP5["D_cm"]), "D")  # cm, same unit as r
    if eps <= 0 or S <= 0 or D <= 0:
        raise ParseError("ε, S and D must be positive", field="eps")
    eS = eps * S

    # --- background -----------------------------------------------------------------------
    bg = params.get("background") or {}
    nb, s_nb = mpf(0), mpf(0)
    have_bg = not is_blank(bg.get("N")) and not is_blank(bg.get("t"))
    if have_bg:
        Nb = parse_number(bg.get("N"), "background.N")
        tb = parse_number(bg.get("t"), "background.t")
        nb, s_nb = counting.rate(Nb, tb)
        res.value("nb", nb, s_nb, "s⁻¹", "background rate n_b", group="background")
        res.step("Background rate (App. A.3)", r"n_b=\frac{N_b}{t_b},\quad \sigma_{n_b}=\frac{\sqrt{N_b}}{t_b}",
                 rf"n_b=\frac{{{t(Nb, 8)}}}{{{t(tb, 6)}}},\ \sigma_{{n_b}}=\frac{{\sqrt{{{t(Nb, 8)}}}}}{{{t(tb, 6)}}}",
                 rf"n_b={t(nb)}\ \mathrm{{s^{{-1}}}},\ \sigma={t(s_nb)}")
    else:
        res.warn("no_background", "No background measured yet — the rates are not background-corrected (Q3).")

    # --- rows -------------------------------------------------------------------------------
    parsed, incomplete = rows_complete(params.get("rows"), ["r", "t", "N"], "rows")
    for i in incomplete:
        res.info("incomplete", f"Row {i + 1} is incomplete and is ignored.")
    table_rows, pts = [], []
    for i, rid, v, raw in parsed:
        r, tt, N = v["r"], v["t"], v["N"]
        if r <= 0:
            raise ParseError("Distance r must be positive", field=f"rows[{i}].r")
        n1, s1 = counting.rate(N, tt)
        n, sn = counting.subtract(n1, s1, nb, s_nb)
        Xa, Xe = x_approx(r, D), g_exact(r, D)
        err = Xa / Xe - 1
        lam_i = n / (Xe * eS)
        s_lam_i = sn / (Xe * eS)
        excluded = bool(raw.get("excluded"))
        pts.append({"i": i, "id": rid, "r": r, "t": tt, "N": N, "n1": n1, "s1": s1, "n": n, "sn": sn, "Xa": Xa, "Xe": Xe,
                    "err": err, "lam": lam_i, "slam": s_lam_i, "excluded": excluded})
        nv, nu = cell_val_unc(n, sn)
        n1v, n1u = cell_val_unc(n1, s1)
        table_rows.append({"id": rid, "r": as_read(raw.get("r"), r), "t": as_read(raw.get("t"), tt), "N": as_read(raw.get("N"), N, 12), "sN": cell(sqrt(N), None, 3),
                           "n1": n1v, "s1": n1u, "n": nv, "sn": nu, "Xa": cell(Xa, None, 5), "Xe": cell(Xe, None, 5),
                           "err": fmt_sig(err * 100, 3), "lam": cell(lam_i, s_lam_i), "excluded": excluded})
        if n <= 0:
            res.warn("nonpositive", f"Row {i + 1} (r = {fmt_sig(r, 4)} cm): rate after background subtraction is ≤ 0.")
        if n1 > 20000:
            res.warn("deadtime", f"Row {i + 1}: count rate {fmt_sig(n1, 3)} s⁻¹ is high — dead-time losses may matter.")
        if N < 1000 and N > 0:
            tneed, _ = counting.planner(n1, mpf("0.03"))
            msg = f"Row {i + 1}: only {fmt_sig(N, 6)} counts (relative σ ≈ {fmt_sig(100 / sqrt(N), 2)} %)."
            if tneed:
                msg += f" For 3 % you would need ≈ {fmt_sig(tneed, 2)} s."
            res.info("low_counts", msg)
    cols = [{"key": "r", "label": "r", "unit": "cm"}, {"key": "t", "label": "t", "unit": "s"}, {"key": "N", "label": "N", "unit": "counts"},
            {"key": "sN", "label": "σ_N", "unit": "counts"}, {"key": "n1", "label": "n′", "unit": "s⁻¹"}, {"key": "s1", "label": "σ_n′", "unit": "s⁻¹"},
            {"key": "n", "label": "n", "unit": "s⁻¹"}, {"key": "sn", "label": "σ_n", "unit": "s⁻¹"},
            {"key": "Xa", "label": "D²/16r²", "unit": ""}, {"key": "Xe", "label": "Ω/4π exact", "unit": ""},
            {"key": "err", "label": "approx. error", "unit": "%"}, {"key": "lam", "label": "Λᵢ (exact Ω)", "unit": "Bq"}]
    res.table("data", "Data table (guide §5.4 + derived columns)", cols, table_rows,
              note="σ_N = √N, n′ = N/t, σ_n′ = √N/t, n = n′ − n_b, σ_n = √(σ_n′² + σ_nb²). 'approx. error' = (D²/16r²)/(Ω/4π) − 1.")
    if pts:
        p0 = pts[0]
        res.step("Example row: rate, background subtraction (App. A.3)",
                 r"n'=\frac{N}{t},\ \sigma_{n'}=\frac{\sqrt N}{t},\ n=n'-n_b,\ \sigma_n=\sqrt{\sigma_{n'}^2+\sigma_{n_b}^2}",
                 rf"n'=\frac{{{t(p0['N'], 8)}}}{{{t(p0['t'])}}}={t(p0['n1'])},\ n={t(p0['n1'])}-{t(nb)}",
                 rf"n={t(p0['n'])}\pm{t(p0['sn'], 3)}\ \mathrm{{s^{{-1}}}}")

    use = [p for p in pts if not p["excluded"]]
    ids = [p["id"] for p in use]
    labels = [f"r = {fmt_sig(p['r'], 4)} cm" for p in use]
    yerr = [p["sn"] for p in use]
    flags = res.extra.setdefault("flags", {})
    concl = []

    # --- Method II (guide's least squares on D²/16r²) --------------------------------------------
    lam2 = None
    if len(use) >= 3:
        f2 = linfit.ols([p["Xa"] for p in use], [p["n"] for p in use])
        # No "re-measure" flags from this line: D²/16r² is a biased model (7–30 % at r = 2–4 cm, still
        # > the Poisson σ further out), so its residuals measure the approximation, not the data.
        # Measuring mistakes are flagged against the exact model in Method I (D22).
        if f2.df >= 2:
            for i in linfit.outliers(f2, thr):
                if use[i]["err"] > mpf("0.05") and use[i]["n"] < f2.a * use[i]["Xa"] + f2.b:
                    flags.setdefault(str(ids[i]), {}).setdefault(
                        "expected", f"below the D²/16r² line as expected: the approximation is {fmt_sig(use[i]['err'] * 100, 2)} % "
                        "too large at this distance (Q6) — not a measuring error")
        fit_values(res, "m2", f2, "s⁻¹", "s⁻¹", group="Method II fit")
        lam2, slam2 = f2.a / eS, f2.s_a / eS
        res.value("lambda2", lam2, slam2, "Bq", "Λ (Method II)", group="results")
        sc2 = _count_sigma(use, [p["Xa"] for p in use], False, s_nb) / eS
        res.value("lambda2_count", lam2, sc2, "Bq", "Λ_II with σ from counting statistics (propagated through the same fit)", group="honesty")
        _honesty(res, "Method II", slam2, sc2)
        res.steps_from(linfit.steps(f2, "D²/16r²", "n"), "Method II")
        res.step("Method II: activity from the slope (eq. 5.3)", r"\Lambda_{II}=\frac{a}{\varepsilon S},\quad \sigma_{\Lambda}=\frac{s_a}{\varepsilon S}",
                 rf"\Lambda_{{II}}=\frac{{{t(f2.a)}}}{{{t(eps)}\cdot{t(S)}}},\ \sigma=\frac{{{t(f2.s_a)}}}{{{t(eS)}}}",
                 rf"\Lambda_{{II}}={t(lam2)}\ \mathrm{{Bq}},\ \sigma={t(slam2, 3)}\ \mathrm{{Bq}}")
        near_any = any(p["err"] > mpf("0.05") for p in use)
        zb = abs(f2.b) / f2.s_b if f2.s_b > 0 else None
        res.extra["intercept_check"] = {"b": fmt_sig(f2.b, 4), "s_b": fmt_sig(f2.s_b, 3), "z": fmt_sig(zb, 3) if zb is not None else None,
                                        "nb": fmt_sig(nb, 4), "ok": bool(zb is not None and zb <= 2)}
        if zb is not None and zb > 2:
            res.info("intercept", f"Method II intercept b = {fmt_sig(f2.b, 3)} s⁻¹ differs from 0 by {fmt_sig(zb, 2)} σ. "
                     + ("Near points bending below the line (Q6) shift b; if it persists without them, check the background subtraction."
                        if near_any else "Check the background subtraction." if have_bg else "Without background subtraction b ≈ n_b is expected."))
        near = [p for p in use if p["err"] > mpf("0.05")]
        if near:
            res.info("approx_bias", "Points closer than " + fmt_sig(max(p["r"] for p in near), 3) +
                     " cm have > 5 % error in D²/16r² (it over-estimates Ω), which biases Method II low. See Q6 and Advanced.")
        res.plot(fit_plot("m2", "Method II: n = f(D²/16r²)", {"label": "D²/16r²", "unit": ""}, {"label": "n", "unit": "s⁻¹"},
                          f2, yerr, ids, labels, flags, x_from=0))
        concl.append(("II", lam2, slam2))
    else:
        res.info("need_rows", "Method II needs at least 3 positions.")

    # --- Method I (exact geometry, extrapolate to r = 0) -----------------------------------------
    lam1 = None
    if len(use) >= 2:
        f1 = linfit.origin([p["Xe"] for p in use], [p["n"] for p in use])
        ff1 = _flag_fit(use, "Xe", f1, origin=True)
        if len(use) >= 4:
            fit_warnings(res, ff1, ids, labels, thr, "Method I")
        K, sK = f1.a, f1.s_a
        n0, sn0 = K / 2, sK / 2
        lam1, slam1 = K / eS, sK / eS
        res.value("m1.K", K, sK, "s⁻¹", "K = Λ·ε·S (fit)", group="Method I fit")
        res.value("n0", n0, sn0, "s⁻¹", "n(0) = K/2", group="results")
        res.value("lambda1", lam1, slam1, "Bq", "Λ (Method I)", group="results")
        sc1 = _count_sigma(use, [p["Xe"] for p in use], True, s_nb) / eS
        res.value("lambda1_count", lam1, sc1, "Bq", "Λ_I with σ from counting statistics (propagated through the same fit)", group="honesty")
        _honesty(res, "Method I", slam1, sc1)
        res.step("Method I: exact solid angle (eq. 5.2, first part)", r"g(r)=\frac{\Omega}{4\pi}=\frac12-\frac{1}{\sqrt{4+(D/r)^2}},\quad n=K\,g(r),\ K=\Lambda\varepsilon S", "", "")
        res.steps_from(linfit.steps(f1, "g(r)", "n"), "Method I")
        res.step("Method I: extrapolate to r = 0 (Q4: Ω → 2π, Ω/4π → ½)", r"n(0)=\frac{K}{2},\quad \Lambda_I=\frac{2\,n(0)}{\varepsilon S}=\frac{K}{\varepsilon S}",
                 rf"n(0)=\frac{{{t(K)}}}{{2}},\ \Lambda_I=\frac{{2\cdot{t(n0)}}}{{{t(eS)}}}",
                 rf"\Lambda_I={t(lam1)}\ \mathrm{{Bq}},\ \sigma={t(slam1, 3)}\ \mathrm{{Bq}}")
        rmax = max(p["r"] for p in use) * mpf("1.08")
        model = series_line("exact model n = K·Ω/4π", lambda r: K * g_exact(r, D), 0, rmax, n=80)
        series = [series_points("n (background-corrected)", [p["r"] for p in use], [p["n"] for p in use], yerr, labels, ids, flags), model,
                  {"name": "n(0) = K/2", "kind": "marker", "x": [0.0], "y": [num(n0)], "label": f"n(0) = {fmt_sig(n0, 4)} s⁻¹"}]
        if lam2 is not None:
            a2 = lam2 * eS
            ymax = max(p["n"] for p in use) * mpf("1.6")
            rmin = D / (4 * sqrt(ymax / a2)) if a2 > 0 else rmax / 10
            series.append(series_line("D²/16r² law (diverges at r → 0)", lambda r: a2 * x_approx(r, D), max(rmin, rmax / 40), rmax, n=60, dash=True))
        ex = [p for p in pts if p["excluded"]]
        if ex:
            series.append(series_points("excluded", [p["r"] for p in ex], [p["n"] for p in ex]))
        res.plot({"id": "m1", "title": "Method I: n = f(r), extrapolated to r = 0", "x": {"label": "r", "unit": "cm"}, "y": {"label": "n", "unit": "s⁻¹"},
                  "series": series, "xZero": True, "yZero": True,
                  "residuals": {"x": [num(p["r"]) for p in use], "y": [num(v) for v in f1.res], "z": [num(v) for v in ff1.std_res], "ids": [str(i) for i in ids],
                                "bad": [str(i) in flags and "outlier" in flags[str(i)] for i in ids]}})
        concl.append(("I", lam1, slam1))
        res.extra["m1"] = {"K": fmt_sig(K, 8), "n0": fmt_sig(n0, 6)}
    else:
        res.info("need_rows", "Method I needs at least 2 positions.")

    # free-hand Method I (student's own extrapolation from their hand-drawn curve)
    fh = params.get("freehand") or {}
    if not is_blank(fh.get("n0")):
        n0f = parse_number(fh.get("n0"), "freehand.n0")
        sn0f = parse_optional(fh.get("sigma"), "freehand.sigma")
        lamf = 2 * n0f / eS
        res.value("lambda1_freehand", lamf, (2 * sn0f / eS) if sn0f else None, "Bq", "Λ (Method I, hand-drawn n(0))", group="results")
        res.step("Method I (hand-drawn curve)", r"\Lambda=\frac{2\,n(0)}{\varepsilon S}", rf"\Lambda=\frac{{2\cdot{t(n0f)}}}{{{t(eS)}}}", rf"{t(lamf)}\ \mathrm{{Bq}}")

    # --- conclusions table (guide §5.7) -------------------------------------------------------------
    rows = []
    for m, v, s in sorted(concl, key=lambda c: c[0] != "I"):
        vv, uu = cell_val_unc(v, s)
        rows.append({"method": m, "activity": vv, "unc": uu})
    res.table("conclusions", "Conclusions (guide §5.7)", [{"key": "method", "label": "Method", "unit": ""},
              {"key": "activity", "label": "Source activity", "unit": "Bq"}, {"key": "unc", "label": "Uncertainty", "unit": "Bq"}], rows)

    if lam1 is not None and lam2 is not None:
        d = lam1 - lam2
        sd = sqrt(slam1 ** 2 + slam2 ** 2)
        z = abs(d) / sd if sd > 0 else None
        res.extra["methods_compare"] = {"diff": fmt_sig(d, 3), "z": fmt_sig(z, 3) if z is not None else None,
                                        "rel": fmt_sig((lam2 / lam1 - 1) * 100, 3)}
        if z is not None and z > 2:
            res.info("methods_differ", f"Methods I and II differ by {fmt_sig(z, 2)} σ ({fmt_sig((lam2 / lam1 - 1) * 100, 2)} %). "
                     "If near points are included this is the expected approximation bias (Q6).")

    # --- Advanced -----------------------------------------------------------------------------------
    adv = res.extra.setdefault("advanced", {})
    if len(use) >= 3:
        fe = linfit.ols([p["Xe"] for p in use], [p["n"] for p in use])
        res.value("adv.lambda2_exact", fe.a / eS, fe.s_a / eS, "Bq", "Method II with exact Ω/4π (Advanced)", group="advanced")
        far = [p for p in use if p["err"] < mpf("0.02")]
        if len(far) >= 3:
            ff = linfit.ols([p["Xa"] for p in far], [p["n"] for p in far])
            res.value("adv.lambda2_far", ff.a / eS, ff.s_a / eS, "Bq", f"Method II, far points only (error < 2 %, n = {len(far)})", group="advanced")
        if len(use) >= 3:
            fw = linfit.weighted([p["Xe"] for p in use], [p["n"] for p in use], [p["sn"] for p in use], through_origin=True)
            res.value("adv.lambda1_weighted", fw.a / eS, max(fw.s_a, fw.s_a_ext) / eS, "Bq", "Method I weighted (1/σ_n²), larger of int./ext. σ", group="advanced")
            res.value("adv.lambda1_weighted_chi2", fw.chi2_red, None, "", "χ²_red of weighted Method I", sig=3, group="advanced")
        off = _offset_fit(use, D)
        if off:
            res.value("adv.delta", off["delta"], off["s_delta"], "cm", "effective distance offset δ (r_eff = r + δ)", group="advanced")
            res.value("adv.lambda_offset", off["K"] / eS, off["s_K"] / eS, "Bq", "Λ with fitted offset δ (discussion only)", group="advanced")
    yield_ = mpf(CS137["I_gamma"])
    for key, v in (("lambda1", lam1), ("lambda2", lam2)):
        if v is not None:
            s = res.raw(key)[1]
            res.value(f"adv.{key}_yield", v / yield_, s / yield_, "Bq", f"{'Method I' if key == 'lambda1' else 'Method II'} with γ yield 0.851 (S = 0.851)", group="advanced")

    # reference activity with decay correction (G8), if the source label is known
    ref = params.get("reference") or {}
    if not is_blank(ref.get("A0")) and not is_blank(ref.get("date")) and lam1 is not None:
        A0 = parse_number(ref.get("A0"), "reference.A0")
        sA0 = parse_optional(ref.get("sigma"), "reference.sigma") or mpf(0)
        d0 = decay.parse_date(ref.get("date"), "reference.date")
        d1 = decay.parse_date(ref.get("measured") or date.today().isoformat(), "reference.measured")
        A, sA, dt = decay.correct(A0, sA0, d0, d1, mpf(CS137["T_half_y"]), mpf(CS137["T_half_unc_y"]))
        res.value("ref.activity", A, sA if sA > 0 else None, "Bq", f"label activity decayed by {fmt_sig(dt, 3)} y", group="reference")
        compare(res, "lambda1_vs_label", lam1, slam1, A, sA if sA > 0 else None, "Bq", "Λ_I vs decayed label activity")
        compare(res, "lambda1_yield_vs_label", lam1 / yield_, slam1 / yield_, A, sA if sA > 0 else None, "Bq", "Λ_I/0.851 vs decayed label")

    # --- live answers (data-dependent) ---------------------------------------------------------------
    res.extra["q6_table"] = [{"r": fmt_sig(p["r"], 4), "u": fmt_sig(D / p["r"], 4), "Xa": fmt_sig(p["Xa"], 5), "Xe": fmt_sig(p["Xe"], 5),
                              "err_pct": fmt_sig(p["err"] * 100, 3), "series_pct": fmt_sig(3 * (D / p["r"]) ** 2 / 16 * 100, 3)} for p in pts]
    res.extra["q2_table"] = [{"r": fmt_sig(p["r"], 4), "ratio": fmt_sig(g_exact(p["r"], D) / g_exact(2 * p["r"], D), 5)} for p in pts]
    if len(pts) >= 2:
        res.extra["sanity"] = {"positive": bool(all(p["n"] > 0 for p in pts))}
    return res.to_json()


def _count_sigma(use, xs, origin, s_nb):
    """σ of the unweighted slope from the known Poisson σ of each rate, incl. the shared background.

    Cov(nᵢ, nⱼ) = δᵢⱼ·σ_n′ᵢ² + σ_nb² (the same background is subtracted from every point).
    """
    c = linfit.slope_coeffs(xs, origin)
    m = len(use)
    cov = [[(use[i]["s1"] ** 2 if i == j else 0) + s_nb ** 2 for j in range(m)] for i in range(m)]
    return sqrt(linfit.sandwich_var(c, cov))


def _honesty(res, what, s_lsq, s_count):
    if s_count > mpf("1.3") * s_lsq:
        res.warn("honesty", f"{what}: the least-squares σ (guide, B.10) = {fmt_sig(s_lsq, 2)} Bq is smaller than the counting-statistics σ of the "
                 f"same estimate = {fmt_sig(s_count, 2)} Bq. B.10 assumes equal errors, but near points have much larger Poisson σ. "
                 "Report the guide's value and quote the counting-statistics σ as the more honest one (see Results → honesty check).")


def _offset_fit(use, D):
    """Two-parameter fit n = K·g(r + δ) by Gauss–Newton (Advanced / discussion only)."""
    if len(use) < 4:
        return None
    rs = [p["r"] for p in use]
    ns = [p["n"] for p in use]
    K = fsum(n * g_exact(r, D) for r, n in zip(rs, ns)) / fsum(g_exact(r, D) ** 2 for r in rs)
    delta = mpf(0)
    for _ in range(200):
        J, resid = [], []
        for r, n in zip(rs, ns):
            g0 = g_exact(r + delta, D)
            re_ = r + delta
            dg = -D ** 2 / re_ ** 3 * (4 + (D / re_) ** 2) ** (-mpf(3) / 2)  # analytic dg/dr
            J.append((g0, K * dg))
            resid.append(n - K * g0)
        a11 = fsum(j[0] ** 2 for j in J)
        a12 = fsum(j[0] * j[1] for j in J)
        a22 = fsum(j[1] ** 2 for j in J)
        b1 = fsum(j[0] * rr for j, rr in zip(J, resid))
        b2 = fsum(j[1] * rr for j, rr in zip(J, resid))
        det = a11 * a22 - a12 ** 2
        if det == 0:
            return None
        dK = (a22 * b1 - a12 * b2) / det
        dd = (a11 * b2 - a12 * b1) / det
        K += dK
        delta += dd
        if min(rs) + delta <= 0:
            return None
        tol = mpf(10) ** (-(mp.dps - 6))
        if abs(dd) < tol and abs(dK) < abs(K) * tol:
            break
    ssr = fsum((n - K * g_exact(r + delta, D)) ** 2 for r, n in zip(rs, ns))
    s2 = ssr / (len(rs) - 2)
    return {"K": K, "s_K": sqrt(s2 * a22 / det), "delta": delta, "s_delta": sqrt(s2 * a11 / det)}
