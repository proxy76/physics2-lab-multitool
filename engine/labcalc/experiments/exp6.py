"""Experiment 6 — Attenuation coefficient of 661.7 keV γ radiation in Al, Fe and Pb.

I(x) = I₀·e^(−μx) (6.2)  ⇒  ln I = ln I₀ − μ·x (Q1).  Intensity ∝ photopeak area / time, with the
triangle approximation Area = ½·(R − L)·H (Fig. 6.4). Least squares of ln(rate) vs x: μ = −a, σ_μ = s_a.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from mpmath import e as E, log, mpf, nstr, sqrt

from .. import graphical, linfit
from ..constants import MATERIALS, material
from ..parse import ParseError, is_blank, normalise, parse_number, parse_optional
from ..result import Result, cell, cell_val_unc
from ..rounding import _mant, fmt_sig, round_report, tex_sig as t, to_decimal
from .common import as_read, compare, fit_plot, fit_values, fit_warnings, series_line, series_points

def _area(H, L, R):
    return (R - L) * H / 2


def _fix(x, d: int) -> str:
    """``x`` with exactly ``d`` decimals (what to copy into the paper table)."""
    return _mant(to_decimal(x), 0, -d)


def _write(x, sig: int = 4) -> str:
    """A derived cell for the paper table: whole numbers stay whole, else ``sig`` significant digits."""
    return _fix(x, 0) if abs(x) >= mpf(10) ** (sig - 1) else fmt_sig(x, sig)


def _nice(x, sig: int = 6) -> str:
    """Up to ``sig`` significant digits, trailing zeros dropped (0.05 stays "0.05")."""
    s = nstr(mpf(x), sig, strip_zeros=True, min_fixed=-6, max_fixed=10)
    return s[:-2] if s.endswith(".0") else s


def _tn(x, sig: int = 6) -> str:
    s = _nice(x, sig)
    return f"({s})" if s.startswith("-") else s


def _tp(x, sig: int = 4) -> str:
    s = t(x, sig)
    return f"({s})" if s.startswith("-") else s


def _diff_as_read(hi, lo, fallback) -> str:
    """R − L from the readings as typed, so 480 − 400 shows "80", not "80.0000"."""
    try:
        d = Decimal(normalise(hi)) - Decimal(normalise(lo))
        return f"{d:f}".replace("-", "−")
    except (ParseError, InvalidOperation, TypeError):
        return _nice(fallback)


def _axis(ax: dict) -> dict:
    return {"from": _nice(ax["origin"]), "to": _nice(ax["end"]), "per_cm": _nice(ax["scale"]), "per_mm": _nice(ax["scale"] / 10),
            "fill_pct": fmt_sig(ax["fill"] * 100, 2)}


def _guide_material(sym, ref, mat, pts, use, rate0, t_default_raw) -> dict:
    """Everything the step-by-step analysis screen (§6.5) shows for one material, computed from its table alone."""
    rows = []
    for n_, p in enumerate(pts):
        raw = p["raw"]
        t_blank = is_blank(raw.get("t"))
        rows.append({"id": p["id"], "no": str(n_ + 1), "shared": p["id"] == "zero", "excluded": p["excluded"],
                     "x": as_read(raw.get("x"), p["xraw"]), "t": as_read(t_default_raw, p["t"]) if t_blank else as_read(raw.get("t"), p["t"]),
                     "t_default": t_blank, "H": as_read(raw.get("H"), p["H"]), "L": as_read(raw.get("L"), p["L"]), "R": as_read(raw.get("R"), p["R"]),
                     "RmL": _diff_as_read(raw.get("R"), raw.get("L"), p["R"] - p["L"]), "A": _write(p["A"]), "rate": fmt_sig(p["rate"], 4),
                     "ln": _fix(p["ln"], 3), "ratio": fmt_sig(rate0 / p["rate"], 3) if rate0 else ""})
    g = {"symbol": sym, "name": ref["name"] if ref else sym, "Z": str(mat.get("Z") or (ref["Z"] if ref else "")),
         "rho": _nice(ref["rho"], 4) if ref else "", "rows": rows, "n": len(use), "ready": len(use) >= 3,
         "has_zero": any(p["x"] == 0 for p in use)}
    if ref:
        g["mu_ref"] = fmt_sig(ref["mu"], 3)
        g["x_e"] = fmt_sig(1 / ref["mu"], 2)
    xs = [p["x"] for p in use]
    if len(use) >= 2 and max(xs) > min(xs):
        ys = [p["ln"] for p in use]
        try:
            lay = graphical.a4_layout(min(xs), max(xs), min(ys), max(ys), include_zero_x=True)
            g["graph"] = {"paper": lay["paper"], "x": _axis(lay["x"]), "y": _axis(lay["y"]),
                          "points": [{"x": _nice(p["x"]), "y": _fix(p["ln"], 3)} for p in use]}
        except ParseError:
            pass
    return g


def _guide_fit(f, mu, smu, use) -> dict:
    """Least squares the way the guide does it by hand (Appendix B): the sums table, a, s_a, then μ = −a."""
    S = f.sums
    sums = [{"x": _nice(x), "y": _fix(y, 4), "xx": _nice(x * x), "xy": _nice(x * y), "yy": _nice(y * y)} for x, y in zip(f.x, f.y)]
    tot = {"x": _nice(S["Sx"]), "y": _nice(S["Sy"]), "xx": _nice(S["Sxx"]), "xy": _nice(S["Sxy"]), "yy": _nice(S["Syy"])}
    rr = round_report(mu, smu) if smu > 0 else None
    xmax = max(p["x"] for p in use)
    mu_r, unc_r = cell_val_unc(mu, smu)
    return {"n": f.n, "a": fmt_sig(f.a, 6), "b": fmt_sig(f.b, 6), "s_a": fmt_sig(f.s_a, 3), "s_b": fmt_sig(f.s_b, 3), "R2": fmt_sig(f.R2, 4),
            "mu": fmt_sig(mu, 6), "s_mu": fmt_sig(smu, 3), "mu_r": mu_r, "unc_r": unc_r, "report": rr.text("cm⁻¹") if rr else fmt_sig(mu, 4) + " cm⁻¹",
            "unc_digits": rr.unc_digits if rr else None, "rel_pct": fmt_sig(smu / mu * 100, 2) if mu > 0 else "",
            "check": {"x1": "0", "y1": _fix(f.b, 3), "x2": _nice(xmax), "y2": _fix(f.predict(xmax), 3)},
            "sums": sums, "totals": tot,
            "steps": [s for s in linfit.steps(f, "x (cm)", "ln(Area/t)") if not s["title"].startswith("Covariance")]}


def _two_point_tex(P, gmu) -> str:
    x1, y1, x2, y2 = P
    # \qquad separates lines: the app stacks them on a phone
    return (rf"\mu=-\frac{{y_2-y_1}}{{x_2-x_1}}\qquad=-\frac{{{_tn(y2)}-{_tn(y1)}}}{{{_tn(x2)}-{_tn(x1)}}}"
            rf"\qquad={t(gmu, 4)}\ \mathrm{{cm^{{-1}}}}")


def analyze(params: dict, k: dict, options: dict) -> dict:
    res = Result(round_up=options.get("round_up", False))
    thr = mpf(str(options.get("outlier_threshold", "2.5")))
    x_unit = params.get("x_unit", "cm")
    to_cm = {"cm": mpf(1), "mm": mpf("0.1")}.get(x_unit)
    if to_cm is None:
        raise ParseError("Thickness unit must be cm or mm", field="x_unit")
    default_t = parse_optional(params.get("t_default"), "t_default")
    zero = params.get("zero") or {}
    zero_row = None
    if all(not is_blank(zero.get(kk)) for kk in ("H", "L", "R")):
        zero_row = {"id": "zero", "x": "0", "t": zero.get("t"), "H": zero.get("H"), "L": zero.get("L"), "R": zero.get("R")}

    concl, plot_series, fits = [], [], {}
    guide = res.extra.setdefault("guide", {})
    res.step("Linearisation (Q1)", r"I=I_0e^{-\mu x}\ \Rightarrow\ \ln I=\ln I_0-\mu x", "", r"\text{slope}=-\mu")
    res.step("Photopeak area (triangle, Fig. 6.4) and rate", r"A=\tfrac12 (R-L)\,H,\qquad I\propto \frac{A}{t}", "", "")
    best = None
    for mi, mat in enumerate(params.get("materials") or []):
        sym = (mat.get("symbol") or mat.get("name") or f"M{mi + 1}").strip()
        ref = material(sym)
        rows = list(mat.get("rows") or [])
        has_zero = any(not is_blank(r.get("x")) and parse_number(r.get("x"), "x") == 0 for r in rows)
        if zero_row and not has_zero:
            rows = [zero_row] + rows
        parsed, incomplete = [], []
        for i, r in enumerate(rows):
            vals = {}
            present = [kk for kk in ("x", "H", "L", "R") if not is_blank(r.get(kk))]
            if not present:
                continue
            if len(present) < 4:
                incomplete.append(i)
                continue
            for kk in ("x", "H", "L", "R"):
                vals[kk] = parse_number(r.get(kk), f"materials[{mi}].rows[{i}].{kk}")
            tt = parse_optional(r.get("t"), f"materials[{mi}].rows[{i}].t")
            if tt is None:
                tt = default_t
            if tt is None:
                incomplete.append(i)
                continue
            vals["t"] = tt
            parsed.append((i, r.get("id", f"{mi}-{i}"), vals, r))
        for i in incomplete:
            res.info("incomplete", f"{sym}: row {i + 1} is incomplete (needs thickness, H, L, R and time) and is ignored.")
        pts = []
        for i, rid, v, raw in parsed:
            if v["R"] <= v["L"]:
                raise ParseError("Right channel must be larger than the left channel", field=f"materials[{mi}].rows[{i}].R")
            if v["H"] <= 0 or v["t"] <= 0:
                raise ParseError("Height and time must be positive", field=f"materials[{mi}].rows[{i}].H")
            A = _area(v["H"], v["L"], v["R"])
            rate = A / v["t"]
            sA = sqrt(A)  # Poisson estimate for the counts under the peak (Advanced)
            pts.append({"id": rid, "i": i, "x": v["x"] * to_cm, "xraw": v["x"], "t": v["t"], "H": v["H"], "L": v["L"], "R": v["R"],
                        "A": A, "rate": rate, "ln": log(rate), "sln": sA / A, "excluded": bool(raw.get("excluded")), "raw": raw})
        if not pts:
            continue
        rate0 = None
        zeros = [p for p in pts if p["x"] == 0]
        if zeros:
            rate0 = sum(p["rate"] for p in zeros) / len(zeros)
        trows = []
        for n_, p in enumerate(pts):
            trows.append({"id": p["id"], "no": str(n_ + 1), "x": as_read(p["raw"].get("x"), p["xraw"]), "t": as_read(p["raw"].get("t"), p["t"]),
                          "H": as_read(p["raw"].get("H"), p["H"]), "L": as_read(p["raw"].get("L"), p["L"]), "R": as_read(p["raw"].get("R"), p["R"]), "A": cell(p["A"], None, 6), "rate": cell(p["rate"], None, 6),
                          "ln": cell(p["ln"], None, 6), "lnI0I": cell(log(rate0 / p["rate"]), None, 5) if rate0 else "", "excluded": p["excluded"]})
        res.table(f"data.{sym}", f"{sym}: data table (guide §6.4)", [
            {"key": "no", "label": "No", "unit": ""}, {"key": "x", "label": "Thickness", "unit": x_unit}, {"key": "t", "label": "t", "unit": "s"},
            {"key": "H", "label": "Height", "unit": "counts"}, {"key": "L", "label": "Left channel", "unit": "ch"}, {"key": "R", "label": "Right channel", "unit": "ch"},
            {"key": "A", "label": "Area", "unit": "counts"}, {"key": "rate", "label": "Area/t", "unit": "s⁻¹"}, {"key": "ln", "label": "ln(Area/t)", "unit": ""},
            {"key": "lnI0I", "label": "ln(I₀/I)", "unit": ""}], trows)

        use = [p for p in pts if not p["excluded"]]
        g = _guide_material(sym, ref, mat, pts, use, rate0, params.get("t_default"))
        guide[sym] = g
        if len(use) < 3:
            res.info("need_rows", f"{sym}: at least 3 thicknesses (including x = 0) are needed for the fit.")
            continue
        ids = [p["id"] for p in use]
        labels = [f"{sym} x = {fmt_sig(p['xraw'], 4)} {x_unit}" for p in use]
        f = linfit.ols([p["x"] for p in use], [p["ln"] for p in use])
        fits[sym] = f
        fit_warnings(res, f, ids, labels, thr, sym)
        mu, smu = -f.a, f.s_a
        fit_values(res, f"{sym}.fit", f, "cm⁻¹", "", group=f"{sym} fit")
        res.value(f"{sym}.mu", mu, smu, "cm⁻¹", f"μ ({sym}, least squares)", group="results")
        res.steps_from(linfit.steps(f, "x (cm)", "ln(Area/t)"), sym)
        res.step(f"{sym}: attenuation coefficient", r"\mu=-a,\quad\sigma_\mu=s_a", rf"\mu=-({t(f.a)})", rf"\mu={t(mu)}\pm{t(smu, 3)}\ \mathrm{{cm^{{-1}}}}")
        if mu <= 0:
            res.warn("mu_neg", f"{sym}: the fitted μ is not positive — check thickness units and the triangle readings.")
        rho = parse_optional(mat.get("rho"), f"materials[{mi}].rho") or (ref["rho"] if ref else None)
        Z = mat.get("Z") or (ref["Z"] if ref else "")
        row = {"material": sym, "mu": None, "unc": None, "Z": str(Z), "rho": cell(rho, None, 4) if rho else "", "mu_rho": "", "s_mu_rho": ""}
        row["mu"], row["unc"] = cell_val_unc(mu, smu)
        if rho:
            mr, smr = mu / rho, smu / rho
            res.value(f"{sym}.mu_rho", mr, smr, "cm²/g", f"μ/ρ ({sym})", group="results")
            row["mu_rho"], row["s_mu_rho"] = cell_val_unc(mr, smr)
            res.step(f"{sym}: mass attenuation coefficient", r"\mu/\rho", rf"\frac{{{t(mu)}}}{{{t(rho, 5)}}}", rf"{t(mr)}\pm{t(smr, 3)}\ \mathrm{{cm^2/g}}")
        if mu > 0:
            hvl, shvl = log(2) / mu, log(2) * smu / mu ** 2
            x1000, sx1000 = log(1000) / mu, log(1000) * smu / mu ** 2
            res.value(f"{sym}.hvl", hvl, shvl, "cm", f"half-value layer ln2/μ ({sym})", group="derived")
            res.value(f"{sym}.x1000", x1000, sx1000, "cm", f"thickness for ×1000 reduction ln(1000)/μ ({sym})", group="derived")
            if best is None or mu > best[1]:
                best = (sym, mu, smu, x1000, sx1000)
        # guide requirement: the largest thickness must reduce the rate by at least ~e
        xmax = max(p["x"] for p in use)
        if rate0:
            rmin = min(p["rate"] for p in use if p["x"] == xmax)
            factor = rate0 / rmin
            res.value(f"{sym}.factor", factor, None, "", f"I₀/I at the largest thickness ({sym})", sig=3, group="derived")
            if factor < E * mpf("0.95"):
                res.warn("factor_e", f"{sym}: the largest thickness reduces the rate only ×{fmt_sig(factor, 3)} — the guide requires ≳ e ≈ 2.72. Add more sheets (x ≳ {fmt_sig(1 / mu if mu > 0 else 0, 2)} cm).")
        if rate0:
            g["factor"] = fmt_sig(factor, 3)
            g["factor_ok"] = bool(factor >= E * mpf("0.95"))
        if ref:
            dev, z_ref = compare(res, f"{sym}.xcom", mu, smu, ref["mu"], None, "cm⁻¹", f"μ ({sym}) vs NIST XCOM", "XCOM μ/ρ·ρ")
            g["xcom"] = {"mu": fmt_sig(ref["mu"], 4), "dev_pct": fmt_sig(dev * 100, 2), "z": fmt_sig(z_ref, 2) if z_ref is not None else None,
                         "ok": bool(z_ref is not None and z_ref <= 2)}
        g["fit"] = _guide_fit(f, mu, smu, use)
        g["conclusion"] = row
        # graphical method (student's two points + optional max/min lines)
        gr = mat.get("graphical") or {}
        gmu = gs = None
        if all(not is_blank(gr.get(kk)) for kk in ("x1", "y1", "x2", "y2")):
            P = [parse_number(gr.get(kk), f"materials[{mi}].graphical.{kk}") for kk in ("x1", "y1", "x2", "y2")]
            a, b = graphical.two_point(*P)
            a = a / to_cm
            gmu = -a
            gg = {"mu": fmt_sig(gmu, 3), "latex": _two_point_tex(P, gmu)}
            if all(not is_blank(gr.get(f"{nm}_{kk}")) for nm in ("max", "min") for kk in ("x1", "y1", "x2", "y2")):
                amax = graphical.two_point(*[parse_number(gr.get(f"max_{kk}"), f"graphical.max_{kk}") for kk in ("x1", "y1", "x2", "y2")])[0] / to_cm
                amin = graphical.two_point(*[parse_number(gr.get(f"min_{kk}"), f"graphical.min_{kk}") for kk in ("x1", "y1", "x2", "y2")])[0] / to_cm
                _, gs = graphical.max_min(amax, amin)
                gg.update({"mu_max": fmt_sig(-amax, 3), "mu_min": fmt_sig(-amin, 3), "sigma": fmt_sig(gs, 2),
                           "sigma_latex": rf"\sigma_{{\mu}}=\frac{{|\mu_{{max}}-\mu_{{min}}|}}{{2}}\qquad=\frac{{|{t(-amax, 4)}-{_tp(-amin)}|}}{{2}}={t(gs, 2)}\ \mathrm{{cm^{{-1}}}}",
                           "report": round_report(gmu, gs).text("cm⁻¹") if gs > 0 else None})
            g["graph_mu"] = gg
            res.value(f"{sym}.mu_graph", gmu, gs, "cm⁻¹", f"μ ({sym}, graphical)", group="results")
            res.step(f"{sym}: graphical μ (two points on the drawn line)", r"\mu=-\frac{y_2-y_1}{x_2-x_1}", "", rf"{t(gmu)}")
            # Q6
            if gs:
                d = abs(gmu - mu)
                z = d / sqrt(gs ** 2 + smu ** 2)
                res.extra.setdefault("q6", {})[sym] = {"graph": fmt_sig(gmu, 4), "lsq": fmt_sig(mu, 4), "diff": fmt_sig(d, 3), "z": fmt_sig(z, 3),
                                                       "significant": bool(z > 2)}
            else:
                res.extra.setdefault("q6", {})[sym] = {"graph": fmt_sig(gmu, 4), "lsq": fmt_sig(mu, 4), "diff": fmt_sig(abs(gmu - mu), 3), "z": None,
                                                       "rel_pct": fmt_sig(abs(gmu - mu) / mu * 100, 3), "significant": None}
            gg["q6"] = res.extra["q6"][sym]
        concl.append(row)
        flags = res.extra.setdefault("flags", {})
        plot = fit_plot(f"fit.{sym}", f"{sym}: ln(Area/t) vs thickness", {"label": "x", "unit": "cm"}, {"label": "ln(Area/t)", "unit": ""}, f,
                        None, ids, labels, flags, name=sym, line_name=f"{sym} fit", x_from=0)
        if gmu is not None:
            plot["series"].append(series_line(f"{sym} drawn line", lambda x, gmu=gmu, f=f: f.b - gmu * x, 0, xmax, dash=True))
        res.plot(plot)
        plot_series.append(series_points(sym, [p["x"] for p in use], [p["ln"] for p in use], ids=ids))
        plot_series.append(series_line(f"{sym} fit", f.predict, 0, xmax))
        # Advanced: weighted fit with Poisson σ on the area
        fw = linfit.weighted([p["x"] for p in use], [p["ln"] for p in use], [p["sln"] for p in use])
        res.value(f"adv.{sym}.mu_w", -fw.a, max(fw.s_a, fw.s_a_ext), "cm⁻¹", f"μ ({sym}) weighted, σ_ln ≈ 1/√Area (larger of int./ext.)", group="advanced")
        res.value(f"adv.{sym}.chi2", fw.chi2_red, None, "", f"χ²_red ({sym}) — > 1 means the triangle readings scatter more than Poisson", sig=3, group="advanced")

    if plot_series:
        res.plot({"id": "all", "title": "ln(Area/t) vs thickness — all materials", "x": {"label": "x", "unit": "cm"}, "y": {"label": "ln(Area/t)", "unit": ""},
                  "series": plot_series, "xZero": True})
    res.table("conclusions", "Conclusions (guide §6.7, with μ/ρ added)", [
        {"key": "material", "label": "Material", "unit": ""}, {"key": "mu", "label": "Measured μ", "unit": "cm⁻¹"}, {"key": "unc", "label": "Uncertainty", "unit": "cm⁻¹"},
        {"key": "Z", "label": "Atomic number Z", "unit": ""}, {"key": "rho", "label": "Density", "unit": "g/cm³"},
        {"key": "mu_rho", "label": "μ/ρ", "unit": "cm²/g"}, {"key": "s_mu_rho", "label": "σ(μ/ρ)", "unit": "cm²/g"}], concl)
    if best:
        sym, mu, smu, x1000, sx1000 = best
        res.extra["q3"] = {"material": sym, "mu": fmt_sig(mu, 4), "x1000": cell(x1000, sx1000), "x1000_value": fmt_sig(x1000, 4)}
        res.value("q3.x1000", x1000, sx1000, "cm", f"Q3: shield thickness for ×1000 with {sym}", group="answers")
    order = sorted(((s, -f.a) for s, f in fits.items()), key=lambda z: z[1], reverse=True)
    if len(order) >= 2:
        res.extra["order"] = [s for s, _ in order]
        expected = [s for s in ("Pb", "Fe", "Al") if s in fits]
        if [s for s, _ in order if s in expected] != expected:
            res.warn("order", "The measured μ are not ordered Pb > Fe > Al — check material labels (Q5).")
    return res.to_json()


def plan(k=None) -> list[dict]:
    """Before-the-lab thickness plan: x_max ≥ 1/μ so the rate drops by at least e (XCOM values)."""
    out = []
    for sym in MATERIALS:
        m = material(sym)
        out.append({"material": sym, "mu": m["mu"], "x_e": 1 / m["mu"], "hvl": log(2) / m["mu"], "x1000": log(1000) / m["mu"]})
    return out
