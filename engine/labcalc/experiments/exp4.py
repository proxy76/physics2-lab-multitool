"""Experiment 4 — Electron diffraction by polycrystalline graphite.

D = (2Lh/√(2mₑe))·U^(−1/2)/d = C·U^(−1/2)/d (4.7/4.8). Least squares of D (m) vs U^(−1/2) (V^(−1/2)) per ring:
slope k ⇒ d = C/k, σ_d = d·s_k/k (C exact). Cross-checks: through-origin fit, and Q7's U = (C²/d²)·D⁻².
"""

from __future__ import annotations

from mpmath import asin, atan, mpf, sin, sqrt

from .. import linfit
from ..constants import GRAPHITE_D, graphite_C
from ..parse import ParseError, is_blank, parse_number, parse_optional
from ..result import Result, cell, cell_val_unc, num
from ..rounding import fmt_sig, tex_sig as t
from .common import as_read, compare, fit_plot, fit_values, fit_warnings, series_line, series_points

SQRT3 = sqrt(3)


def lam_nonrel(U, k):
    return k["h"] / sqrt(2 * k["me"] * k["e"] * U)


def lam_rel(U, k):
    return k["h"] / sqrt(2 * k["me"] * k["e"] * U * (1 + k["e"] * U / (2 * k["me"] * k["c"] ** 2)))


def analyze(params: dict, k: dict, options: dict) -> dict:
    res = Result(round_up=options.get("round_up", False))
    thr = mpf(str(options.get("outlier_threshold", "2.5")))
    L_cm = parse_number(params.get("L") or "13.5", "L")
    L = L_cm / 100
    U_unit = params.get("U_unit", "kV")
    Uf = {"kV": mpf(1000), "V": mpf(1)}.get(U_unit)
    D_unit = params.get("D_unit", "cm")
    Df = {"cm": mpf("0.01"), "mm": mpf("0.001")}.get(D_unit)
    if Uf is None or Df is None:
        raise ParseError("Units: U in kV or V, D in cm or mm", field="units")
    C = graphite_C(k, L) if params.get("C_mode") != "guide" else mpf("3.3e-10") * L / mpf("0.135")
    res.value("C", C, None, "m·V^½", "C = 2Lh/√(2mₑe)", sig=6, group="constants")
    res.step("Constant of eq. 4.7", r"C=\frac{2Lh}{\sqrt{2m_e e}}", rf"C=\frac{{2\cdot{t(L)}\cdot{t(k['h'], 9)}}}{{\sqrt{{2\cdot{t(k['me'], 9)}\cdot{t(k['e'], 9)}}}}}",
             rf"{t(C)}\ \mathrm{{m\,V^{{1/2}}}}\ (\text{{guide: }}3.3\times10^{{-10}})")

    pts, trows = [], []
    for i, r in enumerate(params.get("rows") or []):
        if is_blank(r.get("U")):
            continue
        U = parse_number(r.get("U"), f"rows[{i}].U") * Uf
        if U <= 0:
            raise ParseError("U must be positive", field=f"rows[{i}].U")
        if U > 5000:
            res.warn("hv", f"Row {i + 1}: U = {fmt_sig(U / 1000, 3)} kV exceeds 5 kV — X-ray hazard. Never exceed 5 kV.")
        vals = {}
        for key in ("d1_in", "d1_out", "d2_in", "d2_out"):
            vals[key] = parse_optional(r.get(key), f"rows[{i}].{key}")
        D1 = _ring(vals["d1_in"], vals["d1_out"])
        D2 = _ring(vals["d2_in"], vals["d2_out"])
        p = {"id": r.get("id", str(i)), "i": i, "U": U, "x": 1 / sqrt(U), "D1": D1 * Df if D1 else None, "D2": D2 * Df if D2 else None,
             "excluded": bool(r.get("excluded"))}
        ratio = D2 / D1 if (D1 and D2) else None
        if ratio is not None and abs(ratio / SQRT3 - 1) > mpf("0.06"):
            res.warn("ratio", f"Row {i + 1}: D₂/D₁ = {fmt_sig(ratio, 3)} (expected ≈ √3 = 1.73) — check which ring is which / the edges.")
        for ring, Dv in (("D1", p["D1"]), ("D2", p["D2"])):
            if Dv and Dv / (2 * L) > mpf("0.15"):
                res.info("approx", f"Row {i + 1}: {ring} = {fmt_sig(Dv * 100, 3)} cm — the small-angle chain of eq. 4.5 is off by ≈ "
                         f"{fmt_sig(_approx_error(Dv, L) * 100, 2)} % here (Q5).")
        pts.append(p)
        rd = {key: as_read(r.get(key), vals[key]) for key in ("d1_in", "d1_out", "d2_in", "d2_out")}
        trows.append({"id": p["id"], "U": as_read(r.get("U"), U / Uf), "x": cell(p["x"], None, 6),
                      "d1_in": rd["d1_in"], "d1_out": rd["d1_out"], "D1": _c(D1), "d2_in": rd["d2_in"], "d2_out": rd["d2_out"], "D2": _c(D2),
                      "ratio": fmt_sig(ratio, 4) if ratio else "", "excluded": p["excluded"]})
    res.table("data", "Data table (guide §4.4)", [{"key": "U", "label": "U", "unit": U_unit}, {"key": "x", "label": "U^(−1/2)", "unit": "V^(−½)"},
              {"key": "d1_in", "label": "D₁ inner", "unit": D_unit}, {"key": "d1_out", "label": "D₁ outer", "unit": D_unit}, {"key": "D1", "label": "D₁", "unit": D_unit},
              {"key": "d2_in", "label": "D₂ inner", "unit": D_unit}, {"key": "d2_out", "label": "D₂ outer", "unit": D_unit}, {"key": "D2", "label": "D₂", "unit": D_unit},
              {"key": "ratio", "label": "D₂/D₁ (≈1.73)", "unit": ""}], trows, note="D = (inner + outer)/2. Live check: D₂/D₁ ≈ √3 for graphite.")

    flags = res.extra.setdefault("flags", {})
    concl = {}
    plot_series = []
    for ring, ref_key in (("D1", "d1"), ("D2", "d2")):
        use = [p for p in pts if p[ring] and not p["excluded"]]
        if len(use) < 3:
            res.info("need_rows", f"Ring {ring[1]}: at least 3 voltages are needed for the fit (≥ 5 recommended).")
            continue
        ids = [p["id"] for p in use]
        labels = [f"U = {fmt_sig(p['U'] / 1000, 3)} kV" for p in use]
        f = linfit.ols([p["x"] for p in use], [p[ring] for p in use])
        fit_warnings(res, f, ids, labels, thr, f"Ring {ring[1]}")
        fit_values(res, f"{ref_key}.fit", f, "m·V^½", "m", group=f"ring {ring[1]} fit")
        kk, sk = f.a, f.s_a
        d, sd = C / kk, C / kk * sk / kk
        res.value(ref_key, d, sd, "m", f"d{ring[1]} (least squares)", group="results")
        res.steps_from(linfit.steps(f, "U^(−1/2) (V^(−1/2))", f"{ring} (m)"), f"Ring {ring[1]}")
        res.step(f"Ring {ring[1]}: lattice spacing", r"d=\frac{C}{k},\quad \sigma_d=d\,\frac{s_k}{k}",
                 rf"d=\frac{{{t(C)}}}{{{t(kk)}}}", rf"d_{ring[1]}={t(d)}\pm{t(sd, 3)}\ \mathrm{{m}}")
        zb = abs(f.b) / f.s_b if f.s_b > 0 else None
        if zb is not None and zb > 2:
            res.info("intercept", f"Ring {ring[1]}: intercept {fmt_sig(f.b * 100, 3)} cm differs from 0 by {fmt_sig(zb, 2)} σ (eq. 4.8 predicts 0; systematic edge/parallax offset?).")
        fo = linfit.origin([p["x"] for p in use], [p[ring] for p in use])
        res.value(f"adv.{ref_key}_origin", C / fo.a, C / fo.a * fo.s_a / fo.a, "m", f"d{ring[1]} from fit through the origin", group="advanced")
        # Q7: U = (C²/d²)·D⁻²
        fq = linfit.ols([1 / p[ring] ** 2 for p in use], [p["U"] for p in use])
        m, sm = fq.a, fq.s_a
        if m > 0:
            dq = C / sqrt(m)
            res.value(f"adv.{ref_key}_q7", dq, dq * sm / (2 * m), "m", f"d{ring[1]} from Q7 linearisation U vs D⁻² (d = C/√m)", group="advanced")
        # exact geometry + relativistic per point
        dex = []
        for p in use:
            theta = atan(p[ring] / (2 * L)) / 2
            dex.append(lam_rel(p["U"], k) / (2 * sin(theta)))
        mean_ex = sum(dex) / len(dex)
        res.value(f"adv.{ref_key}_exact", mean_ex, None, "m", f"d{ring[1]}: exact geometry + relativistic λ, mean of points", sig=4, group="advanced")
        compare(res, ref_key, d, sd, mpf(GRAPHITE_D[ref_key]), None, "m", f"d{ring[1]} vs {GRAPHITE_D[ref_key]} m (guide §4.7)")
        concl[ref_key] = (d, sd)
        p_ = fit_plot(f"fit.{ring}", f"{ring} vs U^(−1/2)", {"label": "U^(−1/2)", "unit": "V^(−½)"}, {"label": ring, "unit": "m"}, f, None, ids, labels, flags,
                      name=ring, line_name=f"{ring} fit", x_from=0)
        res.plot(p_)
        plot_series.append(series_points(ring, [p["x"] for p in use], [p[ring] for p in use], ids=ids))
        plot_series.append(series_line(f"{ring} fit", f.predict, 0, max(p["x"] for p in use) * mpf("1.05")))
    if plot_series:
        res.plot({"id": "both", "title": "D₁ and D₂ vs U^(−1/2)", "x": {"label": "U^(−1/2)", "unit": "V^(−½)"}, "y": {"label": "D", "unit": "m"},
                  "series": plot_series, "xZero": True, "yZero": True})
    if concl:
        row = {}
        for key in ("d1", "d2"):
            if key in concl:
                row[key], row[f"s{key}"] = cell_val_unc(*concl[key])
        res.table("conclusions", "Conclusions (guide §4.7)", [{"key": "d1", "label": "d₁", "unit": "m"}, {"key": "sd1", "label": "Uncertainty of d₁", "unit": "m"},
                  {"key": "d2", "label": "d₂", "unit": "m"}, {"key": "sd2", "label": "Uncertainty of d₂", "unit": "m"}], [row])
    if "d1" in concl and "d2" in concl:
        r12 = concl["d1"][0] / concl["d2"][0]
        res.value("d1_d2", r12, None, "", "d₁/d₂ (graphite: √3 = 1.732)", sig=4, group="results")
    # expected ring sizes for each measured U (helps recognise the rings)
    res.extra["expected"] = [{"U_kV": fmt_sig(p["U"] / 1000, 3), "D1_cm": fmt_sig(C / mpf(GRAPHITE_D["d1"]) * p["x"] * 100, 3),
                              "D2_cm": fmt_sig(C / mpf(GRAPHITE_D["d2"]) * p["x"] * 100, 3)} for p in pts]
    return res.to_json()


def _ring(a, b):
    if a is not None and b is not None:
        if b < a:
            raise ParseError("Outer diameter must be ≥ inner diameter", field="d_out")
        return (a + b) / 2
    return a if a is not None else b


def _c(v):
    return cell(v, None, 5) if v is not None else ""


def _approx_error(D, L):
    """Relative error of D/(2L) ≈ 2 sin θ (eq. 4.5) — Q5."""
    two_theta = atan(D / (2 * L))
    return D / (2 * L) / (2 * sin(two_theta / 2)) - 1


def expected_D(U, d, k, L=mpf("0.135")):
    return graphite_C(k, L) / d / sqrt(U)
