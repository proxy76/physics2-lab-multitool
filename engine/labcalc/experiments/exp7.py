"""Experiment 7 — Photoelectric effect, capacitor method: Planck's constant.

e·U₀ = h·ν − W (7.3). Least squares of Ū₀ (V) against ν (Hz): slope a = h/e ⇒ h = e·a, σ_h = e·s_a;
intercept b = −W/e ⇒ W = −e·b; threshold ν₀ = −b/a (σ includes cov(a,b)); λ_max = c/ν₀.
"""

from __future__ import annotations

from mpmath import mpf, sqrt

from .. import graphical, linfit, stats
from ..parse import ParseError, is_blank, parse_number, parse_optional, split_list
from ..result import Result, cell, cell_val_unc, num
from ..rounding import fmt_sig, tex_sig as t
from .common import compare, fit_plot, fit_values, fit_warnings, series_line

H_REF = mpf("6.62607015e-34")
CHECK_PAIRS = [("404.7", "578.2"), ("435.8", "546.1")]


def _readings(f, i):
    r = f.get("readings")
    if isinstance(r, str):
        r = split_list(r)
    out = []
    for j, v in enumerate(r or []):
        if is_blank(v):
            continue
        out.append(parse_number(v, f"filters[{i}].readings[{j}]"))
    return out


def analyze(params: dict, k: dict, options: dict) -> dict:
    res = Result(round_up=options.get("round_up", False))
    thr = mpf(str(options.get("outlier_threshold", "2.5")))
    e, c, h = k["e"], k["c"], k["h"]
    rows, pts = [], []
    for i, f in enumerate(params.get("filters") or []):
        if is_blank(f.get("lambda")):
            continue
        lam_nm = parse_number(f.get("lambda"), f"filters[{i}].lambda")
        if lam_nm <= 0:
            raise ParseError("Wavelength must be positive", field=f"filters[{i}].lambda")
        U = _readings(f, i)
        name = (f.get("color") or fmt_sig(lam_nm, 4) + " nm").strip()
        nu = c / (lam_nm * mpf("1e-9"))
        row = {"id": f.get("id", str(i)), "filter": name, "lambda": cell(lam_nm, None, 5), "nu": cell(nu / mpf("1e14"), None, 6), "N": str(len(U)),
               "U0": "", "s": "", "sem": "", "readings": ", ".join(fmt_sig(u, 6) for u in U), "excluded": bool(f.get("excluded"))}
        if U:
            d = stats.describe(U)
            sem = d.get("sem")
            row["U0"], row["sem"] = cell_val_unc(d["mean"], sem) if sem else (cell(d["mean"], None, 5), "")
            row["s"] = cell(d["s"], None, 3) if "s" in d else ""
            if len(U) < 10:
                res.info("few_readings", f"{name}: {len(U)} reading(s) — the guide asks for 10.")
            if sem is not None and sem == 0:
                res.info("zero_sem", f"{name}: all readings identical — σ of the mean is 0 (use the meter resolution, see Advanced).")
            if len(U) >= 4:
                half = len(U) // 2
                m1, m2 = stats.mean(U[:half]), stats.mean(U[half:])
                if "s" in d and d["s"] > 0 and abs(m2 - m1) > 2 * d["s"]:
                    res.warn("drift", f"{name}: readings drift ({fmt_sig(m1, 4)} → {fmt_sig(m2, 4)} V). Leakage? Discharge, wait for the plateau, re-read.")
            pts.append({"id": row["id"], "name": name, "lam": lam_nm, "nu": nu, "U0": d["mean"], "sem": sem, "n": len(U), "excluded": row["excluded"],
                        "inv_lam": 1 / (lam_nm * mpf("1e-9"))})
        rows.append(row)
    res.table("data", "Per-filter results (guide §7.4/§7.5)", [
        {"key": "filter", "label": "Filter", "unit": ""}, {"key": "lambda", "label": "wavelength", "unit": "nm"}, {"key": "nu", "label": "ν", "unit": "10¹⁴ Hz"},
        {"key": "N", "label": "N", "unit": ""}, {"key": "U0", "label": "Ū₀", "unit": "V"}, {"key": "sem", "label": "σ_Ū₀", "unit": "V"},
        {"key": "s", "label": "s", "unit": "V"}], rows, note="Ū₀ = mean of the readings; σ_Ū₀ = s/√N (standard deviation of the mean, Q3).")
    if pts:
        d0 = [p for p in pts if p["n"] >= 2]
        if d0:
            p = d0[0]
            res.step("Mean and standard deviation of the mean (Q3)", r"\bar U_0=\frac1N\sum U_i,\quad \sigma_{\bar U_0}=\frac{s}{\sqrt N}", f"\\text{{{p['name']}}}",
                     rf"\bar U_0={t(p['U0'])}\ \mathrm{{V}},\ \sigma={t(p['sem'], 3)}\ \mathrm{{V}}")
        res.step("Frequency of each line", r"\nu=\frac{c}{\lambda}", rf"\nu=\frac{{{t(c, 9)}}}{{{t(pts[0]['lam'])}\times10^{{-9}}}}", rf"{t(pts[0]['nu'])}\ \mathrm{{Hz}}")

    # live sanity check: stopping-voltage differences do not depend on W
    by_lam = {fmt_sig(p["lam"], 4): p for p in pts}
    checks = []
    for l1, l2 in CHECK_PAIRS:
        a, b = by_lam.get(fmt_sig(mpf(l1), 4)), by_lam.get(fmt_sig(mpf(l2), 4))
        expected = k["hc_eVnm"] * (1 / mpf(l1) - 1 / mpf(l2))
        item = {"pair": f"U₀({l1} nm) − U₀({l2} nm)", "expected": fmt_sig(expected, 3)}
        if a and b:
            dm = a["U0"] - b["U0"]
            sd = sqrt((a["sem"] or 0) ** 2 + (b["sem"] or 0) ** 2)
            item.update({"measured": cell(dm, sd) if sd > 0 else fmt_sig(dm, 3), "ratio": fmt_sig(dm / expected, 3)})
        checks.append(item)
    res.extra["difference_check"] = checks

    use = [p for p in pts if not p["excluded"]]
    order = sorted(use, key=lambda p: p["nu"])
    for p1, p2 in zip(order, order[1:]):
        if p2["U0"] <= p1["U0"]:
            res.warn("not_increasing", f"U₀ does not increase with frequency between {p1['name']} and {p2['name']} — check filter identity / plateau.")
    if len(use) < 3:
        res.info("need_rows", "The fit needs at least 3 filters.")
        return res.to_json()
    ids = [p["id"] for p in use]
    labels = [p["name"] for p in use]
    x = [p["nu"] for p in use]
    y = [p["U0"] for p in use]
    f = linfit.ols(x, y)
    fit_warnings(res, f, ids, labels, thr, "U₀(ν)")
    fit_values(res, "fit", f, "V/Hz", "V", group="fit")
    hh, sh = e * f.a, e * f.s_a
    res.value("h", hh, sh, "J·s", "Planck constant h (least squares)", group="results")
    res.steps_from(linfit.steps(f, "ν (Hz)", "Ū₀ (V)"))
    res.step("Planck constant from the slope (7.3)", r"a=\frac{h}{e}\Rightarrow h=e\,a,\quad\sigma_h=e\,s_a",
             rf"h={t(e, 10)}\cdot{t(f.a)}", rf"h={t(hh)}\pm{t(sh, 3)}\ \mathrm{{J\,s}}")
    W_eV, sW = -f.b, f.s_b
    res.value("W", W_eV, sW, "eV", "work function W = −e·b (effective, includes contact potential)", group="results")
    res.value("W_J", W_eV * e, sW * e, "J", "W in joules", group="results")
    nu0 = -f.b / f.a
    # σ²(ν0) = (1/a²)[s_b² + ν0² s_a² + 2 ν0 cov(a,b)]
    var = (f.s_b ** 2 + nu0 ** 2 * f.s_a ** 2 + 2 * nu0 * f.cov) / f.a ** 2
    snu0 = sqrt(var) if var > 0 else mpf(0)
    lam_max = c / nu0
    slam = c * snu0 / nu0 ** 2
    res.value("nu0", nu0, snu0, "Hz", "threshold frequency ν₀ = −b/a (with cov(a,b))", group="results")
    res.value("lam_max", lam_max * mpf("1e9"), slam * mpf("1e9"), "nm", "longest wavelength λ_max = c/ν₀", group="results")
    res.step("Threshold frequency (Q6)", r"\nu_0=-\frac{b}{a},\quad \sigma_{\nu_0}^2=\frac{s_b^2+\nu_0^2s_a^2+2\nu_0\,\mathrm{cov}(a,b)}{a^2}",
             rf"\nu_0=-\frac{{{t(f.b)}}}{{{t(f.a)}}}", rf"\nu_0={t(nu0)}\pm{t(snu0, 3)}\ \mathrm{{Hz}},\ \lambda_{{max}}={t(lam_max * mpf('1e9'))}\ \mathrm{{nm}}")
    compare(res, "h", hh, sh, H_REF, None, "J·s", "h vs SI value 6.62607015×10⁻³⁴ J·s (exact)")
    res.table("conclusions", "Conclusions (guide §7.7)", [{"key": "h", "label": "Planck constant h", "unit": "J·s"}, {"key": "unc", "label": "Uncertainty", "unit": "J·s"}],
              [dict(zip(("h", "unc"), cell_val_unc(hh, sh)))])
    flags = res.extra.setdefault("flags", {})
    plot = fit_plot("fit", "Ū₀ vs frequency", {"label": "ν", "unit": "Hz"}, {"label": "Ū₀", "unit": "V"}, f, [p["sem"] or 0 for p in use], ids, labels, flags)
    res.plot(plot)
    # graphical h
    gr = params.get("graphical") or {}
    if all(not is_blank(gr.get(kk)) for kk in ("x1", "y1", "x2", "y2")):
        xs_scale = parse_optional(gr.get("x_scale"), "graphical.x_scale") or mpf(1)  # e.g. 1e14 if ν read in 10¹⁴ Hz
        P = [parse_number(gr.get(kk), f"graphical.{kk}") for kk in ("x1", "y1", "x2", "y2")]
        a, _ = graphical.two_point(P[0] * xs_scale, P[1], P[2] * xs_scale, P[3])
        hg = e * a
        sg = None
        if all(not is_blank(gr.get(f"{nm}_{kk}")) for nm in ("max", "min") for kk in ("x1", "y1", "x2", "y2")):
            Q = {nm: [parse_number(gr.get(f"{nm}_{kk}"), f"graphical.{nm}_{kk}") for kk in ("x1", "y1", "x2", "y2")] for nm in ("max", "min")}
            amax = graphical.two_point(Q["max"][0] * xs_scale, Q["max"][1], Q["max"][2] * xs_scale, Q["max"][3])[0]
            amin = graphical.two_point(Q["min"][0] * xs_scale, Q["min"][1], Q["min"][2] * xs_scale, Q["min"][3])[0]
            sg = e * graphical.max_min(amax, amin)[1]
        res.value("h_graph", hg, sg, "J·s", "Planck constant h (graphical)", group="results")
        res.step("h from the drawn line", r"h=e\,\frac{U_2-U_1}{\nu_2-\nu_1}", "", t(hg))
    # Advanced -------------------------------------------------------------------------------------
    fi = linfit.ols([p["inv_lam"] for p in use], y)
    res.value("adv.h_invlam", e * fi.a / c, e * fi.s_a / c, "J·s", "h from Ū₀ vs 1/λ (slope = hc/e)", group="advanced")
    sems = [p["sem"] for p in use]
    if all(s is not None and s > 0 for s in sems):
        fw = linfit.weighted(x, y, sems)
        res.value("adv.h_weighted", e * fw.a, e * max(fw.s_a, fw.s_a_ext), "J·s", "h, weighted fit (σ = σ_Ū₀; larger of int./ext.)", group="advanced")
        res.value("adv.chi2", fw.chi2_red, None, "", "χ²_red of the weighted fit", sig=3, group="advanced")
    res.extra["q6"] = {"nu0": cell(nu0, snu0), "lam_max": cell(lam_max * mpf("1e9"), slam * mpf("1e9")), "W": cell(W_eV, sW)}
    return res.to_json()
