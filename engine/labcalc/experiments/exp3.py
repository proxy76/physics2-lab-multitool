"""Experiment 3 — Rydberg constant from the Balmer series (prism spectrogram).

Calibration (Cauchy, eq. 3.9): x = A + B/λ²  — least squares of x_Hg (mm) against X = λ⁻² (µm⁻²).
Hydrogen: λ_H = √(B/(x_H − A)).  Rydberg (eq. 3.8): 1/λ = R/4 − R·(1/n²) — least squares of 1/λ
against 1/n²: slope = −R_H (the guide says "+R", see ERRATA E3-slope), intercept = R_H/4.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal, InvalidOperation, localcontext

from mpmath import mpf, nstr, sqrt

from .. import graphical, linfit
from ..constants import BALMER, HG_LINES_GUIDE, HG_LINES_NIST
from ..parse import ParseError, is_blank, normalise, parse_number, parse_optional
from ..result import Result, cell, cell_val_unc, num
from ..rounding import fmt_sig, round_report, tex_sig as t
from .common import as_read, compare, fit_plot, fit_values, fit_warnings, series_points

NIST_OF_GUIDE = dict(zip(HG_LINES_GUIDE, HG_LINES_NIST))
UM = mpf("1e-3")  # nm → µm

# ------------------------------------------------------------------------------------------------
# The worked sheet (Analysis tab), laid out like the team's final sheet: λ → 1/λ², LSM of x_Hg vs
# 1/λ² (B, A), λ_H = √(B/(x_H − A)), λ_H⁻¹ and n_i⁻², LSM of λ_H⁻¹ vs n_i⁻² (−R_H, s_ε², s_RH).
# Every number written on the sheet is the rounded result of its formula applied to the numbers
# written before it (exact decimal arithmetic), so each line can be checked on a calculator 1:1.
# Units as on the sheet: 1/λ² in 10¹² m⁻², x in a.u. (the locator reading), 1/λ in 10⁶ m⁻¹.
# ------------------------------------------------------------------------------------------------

LINE_TEX = {"Hα": r"H_\alpha", "Hβ": r"H_\beta", "Hγ": r"H_\gamma", "Hδ": r"H_\delta", "Hε": r"H_\varepsilon"}
LINE_OF_N = {3: "Hα", 4: "Hβ", 5: "Hγ", 6: "Hδ", 7: "Hε"}


def _D(text) -> Decimal:
    return Decimal(normalise(str(text)))


def _rsig(d: Decimal, n: int) -> Decimal:
    """``d`` rounded half-up to ``n`` significant digits (the digits that are written down)."""
    if d == 0:
        return Decimal(0)
    with localcontext() as ctx:
        ctx.prec = 60
        r = d.quantize(Decimal(1).scaleb(d.adjusted() - n + 1), rounding=ROUND_HALF_UP)
        if r.adjusted() > d.adjusted():  # 9.9996 → 10.00, keep n digits
            r = d.quantize(Decimal(1).scaleb(r.adjusted() - n + 1), rounding=ROUND_HALF_UP)
    return r


def _rA(d: Decimal) -> Decimal:
    """A: 4 significant digits but never fewer than 2 decimals (65.76)."""
    r = _rsig(d, 4)
    return d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if r.as_tuple().exponent > -2 else r


def _s(d: Decimal, tex: bool = False) -> str:
    """A written number, digits exactly as kept ("6.100", "0.0625")."""
    s = format(d, "f")
    return s if tex or not s.startswith("-") else "−" + s[1:]


def _e(d: Decimal, tex: bool = False) -> str:
    """An exact sum/product, all digits but no trailing zeros ("46.057", "392.5", "100")."""
    if d == d.to_integral_value():
        return _s(d.quantize(Decimal(1)), tex)
    return _s(d.normalize(), tex)


def _p(s: str) -> str:
    return f"({s})" if s.startswith("-") else s


def _sum_tex(lhs: str, terms: list[str], per: int, scale: str, total: str, unit: str) -> str:
    """S = (t₁ + t₂ + …)·10ᵏ = total, with ``per`` terms per line (``\\qquad`` stacks on a phone)."""
    chunks = ["+".join(terms[i:i + per]) for i in range(0, len(terms), per)]
    sc = rf"\cdot{scale}" if scale else ""
    return rf"{lhs}=(" + r"\qquad +".join(chunks) + rf"){sc}\qquad ={total}{sc}" + (rf"\ \mathrm{{{unit}}}" if unit else "")


def _sums(xs: list[Decimal], ys: list[Decimal]) -> dict:
    with localcontext() as ctx:
        ctx.prec = 60
        return {"Sx": sum(xs, Decimal(0)), "Sy": sum(ys, Decimal(0)), "Sxy": sum((x * y for x, y in zip(xs, ys)), Decimal(0)),
                "Sxx": sum((x * x for x in xs), Decimal(0)), "Syy": sum((y * y for y in ys), Decimal(0))}


def _axis(ax: dict) -> dict:
    nice = lambda v: _e(_rsig(Decimal(nstr(mpf(v), 12)), 6))  # noqa: E731
    return {"from": nice(ax["origin"]), "to": nice(ax["end"]), "per_cm": nice(ax["scale"]), "per_mm": nice(ax["scale"] / 10)}


def _graph(xs: list[Decimal], ys: list[Decimal]) -> dict | None:
    if len(xs) < 2 or max(xs) == min(xs) or max(ys) == min(ys):
        return None
    try:
        lay = graphical.a4_layout(mpf(str(min(xs))), mpf(str(max(xs))), mpf(str(min(ys))), mpf(str(max(ys))), landscape=True)
    except ParseError:
        return None
    return {"paper": lay["paper"], "x": _axis(lay["x"]), "y": _axis(lay["y"]), "points": [{"x": _s(x), "y": _s(y)} for x, y in zip(xs, ys)]}


def _points(gr: dict, prefix: str, field: str):
    keys = [f"{prefix}{k}" for k in ("x1", "y1", "x2", "y2")]
    if any(is_blank(gr.get(k)) for k in keys):
        return None
    for k in keys:
        parse_number(gr.get(k), f"{field}.{k}")  # same validation (and error field) as every other input
    P = [_D(gr.get(k)) for k in keys]
    if P[2] == P[0]:
        raise ParseError("The two points must have different x", field=f"{field}.{prefix}x2")
    return P


def _slope(P) -> Decimal:
    with localcontext() as ctx:
        ctx.prec = 60
        return (P[3] - P[1]) / (P[2] - P[0])


def _cal_graph(gr: dict, A: Decimal, B: Decimal) -> dict | None:
    P = _points(gr, "", "graphical.cal")
    if P is None:
        return None
    x1, y1, x2, y2 = P
    Bg = _rsig(_slope(P), 4)
    Ag = _rA(y1 - Bg * x1)
    return {"B": _s(Bg), "A": _s(Ag),
            "B_tex": rf"B=\frac{{y_2-y_1}}{{x_2-x_1}}\qquad=\frac{{{_e(y2, True)}-{_p(_e(y1, True))}}}{{{_e(x2, True)}-{_p(_e(x1, True))}}}\cdot10^{{-12}}"
                     rf"\qquad\approx{_s(Bg, True)}\cdot10^{{-12}}\ \mathrm{{m^2\cdot a.u.}}",
            "A_tex": rf"A=y_1-B\,x_1\qquad={_e(y1, True)}-{_p(_s(Bg, True))}\cdot{_p(_e(x1, True))}\approx{_s(Ag, True)}\ \mathrm{{a.u.}}",
            "dB_pct": fmt_sig(abs(Bg - B) / abs(B) * 100, 2) if B else "", "dA": _s(abs(Ag - A))}


def _ryd_graph(gr: dict, R: Decimal, sR: Decimal | None) -> dict | None:
    P = _points(gr, "", "graphical.ryd")
    if P is None:
        return None
    x1, y1, x2, y2 = P
    a = _rsig(_slope(P), 4)
    g = {"R": _s(-a), "tex": rf"-R_H=\frac{{y_2-y_1}}{{x_2-x_1}}\qquad=\frac{{{_e(y2, True)}-{_p(_e(y1, True))}}}{{{_e(x2, True)}-{_p(_e(x1, True))}}}\cdot10^6"
                               rf"\qquad\approx{_s(a, True)}\cdot10^6\ \mathrm{{m^{{-1}}}}\qquad\Rightarrow\ R_H={_s(-a, True)}\cdot10^6\ \mathrm{{m^{{-1}}}}"}
    Pmax, Pmin = _points(gr, "max_", "graphical.ryd"), _points(gr, "min_", "graphical.ryd")
    sg = None
    if Pmax and Pmin:
        rmax, rmin = _rsig(-_slope(Pmax), 4), _rsig(-_slope(Pmin), 4)
        sg = _rsig(abs(rmax - rmin) / 2, 3)
        g.update({"R_max": _s(rmax), "R_min": _s(rmin), "sigma": _s(sg),
                  "sigma_tex": rf"\sigma_{{R_H}}=\frac{{|R_{{max}}-R_{{min}}|}}{{2}}\qquad=\frac{{|{_s(rmax, True)}-{_p(_s(rmin, True))}|}}{{2}}\cdot10^6\approx{_s(sg, True)}\cdot10^6\ \mathrm{{m^{{-1}}}}"})
        if sg > 0:
            gr_ = round_report(-a, sg)
            g["report"] = f"({gr_.value_mant} ± {gr_.unc_mant})·10⁶ m⁻¹" if not gr_.exponent else gr_.text("·10⁶ m⁻¹")
    d = abs(-a - R)
    g["diff"] = _s(_rsig(d, 3)) if d else "0"
    g["rel_pct"] = fmt_sig(d / R * 100, 2) if R else ""
    if sg is not None and sR is not None and (sg > 0 or sR > 0):
        with localcontext() as ctx:
            ctx.prec = 30
            z = d / (sg * sg + sR * sR).sqrt()
        g["z"] = fmt_sig(z, 2)
        g["significant"] = bool(z > 2)
    return g


def _sheet(cal: list, params: dict, k: dict) -> dict:
    """Everything the Analysis tab writes, computed from the tables alone (see the block comment above)."""
    out: dict = {"hg": [], "h": [], "stage": 0}
    with localcontext() as ctx:
        ctx.prec = 60
        # --- λ → 1/λ² (10¹² m⁻², 4 significant digits as on the sheet) ---------------------------
        hg = []
        for c in cal:
            lam = _D(c["lam_txt"])
            X = _rsig(Decimal(10) ** 6 / (lam * lam), 4)
            hg.append({"id": c["id"], "lam": _s(lam), "x": c["x_txt"], "X": _s(X), "excluded": c["excluded"],
                       "tex": rf"\frac{{1}}{{({_s(lam, True)}\cdot10^{{-9}})^2}}\approx{_s(X, True)}\cdot10^{{12}}\ \mathrm{{m^{{-2}}}}",
                       "_X": X, "_x": _D(c["x_txt"])})
        out["hg"] = [{kk: v for kk, v in r.items() if not kk.startswith("_")} for r in hg]
        use = [r for r in hg if not r["excluded"]]
        # --- the H table as typed (λ_H filled once the calibration exists) -------------------------
        hrows = []
        for i, r in enumerate(params.get("h") or []):
            if is_blank(r.get("x")):
                continue
            n = int(parse_number(r.get("n"), f"h[{i}].n"))
            label = r.get("line") or LINE_OF_N.get(n, f"n={n}")
            hrows.append({"id": r.get("id", f"h{i}"), "line": label, "line_tex": LINE_TEX.get(label, "H"), "n": str(n), "x": str(r.get("x")).strip(),
                          "excluded": bool(r.get("excluded")), "_n": n, "_x": _D(r.get("x"))})
        out["h"] = hrows
        out["n_hg"] = len(use)
        if len(use) < 3:
            out["h"] = [{kk: v for kk, v in r.items() if not kk.startswith("_")} for r in hrows]
            return out
        out["stage"] = 1
        # --- LSM of x_Hg (y) vs 1/λ² (x): B = slope, A = intercept --------------------------------
        xs, ys = [r["_X"] for r in use], [r["_x"] for r in use]
        m = len(use)
        S = _sums(xs, ys)
        num_B = m * S["Sxy"] - S["Sx"] * S["Sy"]
        den_B = m * S["Sxx"] - S["Sx"] ** 2
        if den_B == 0:
            out["h"] = [{kk: v for kk, v in r.items() if not kk.startswith("_")} for r in hrows]
            return out
        B = _rsig(num_B / den_B, 4)
        A = _rA((S["Sy"] - B * S["Sx"]) / m)
        T = lambda d: _e(d, True)  # noqa: E731  (exact sums: all digits, no trailing zeros)
        W = lambda d: _s(d, True)  # noqa: E731  (written values: digits as kept)
        sign = "-" if B < 0 else "+"
        out["cal"] = {
            "m": m, "Sx": _e(S["Sx"]), "Sy": _e(S["Sy"]), "Sxy": _e(S["Sxy"]), "Sxx": _e(S["Sxx"]), "B": _s(B), "A": _s(A),
            "num": _e(num_B), "den": _e(den_B),
            "tex": {
                "Sx": _sum_tex("S_x", [W(x) for x in xs], 4, "10^{12}", T(S["Sx"]), "m^{-2}"),
                "Sy": _sum_tex("S_y", [W(y) for y in ys], 5, "", T(S["Sy"]), "a.u."),
                "Sxy": _sum_tex("S_{xy}", [rf"{W(x)}\cdot{W(y)}" for x, y in zip(xs, ys)], 2, "10^{12}", T(S["Sxy"]), r"m^{-2}\cdot a.u."),
                "Sxx": _sum_tex("S_{xx}", [rf"{W(x)}^2" for x in xs], 3, "10^{24}", T(S["Sxx"]), "m^{-4}"),
                # numerator and denominator on their own lines: each fits a phone and is one calculator entry
                "num": rf"m S_{{xy}}-S_xS_y\qquad={m}\cdot{T(S['Sxy'])}-{T(S['Sx'])}\cdot{T(S['Sy'])}\qquad={T(num_B)}",
                "den": rf"m S_{{xx}}-(S_x)^2\qquad={m}\cdot{T(S['Sxx'])}-{T(S['Sx'])}^2\qquad={T(den_B)}",
                "B": rf"B=\frac{{{T(num_B)}\cdot10^{{12}}}}{{{T(den_B)}\cdot10^{{24}}}}\qquad\approx{_s(B, True)}\cdot10^{{-12}}\ \mathrm{{m^2\cdot a.u.}}",
                "A": rf"A=\frac{{S_y-B\,S_x}}{{m}}\qquad=\frac{{{T(S['Sy'])}-{_p(_s(B, True))}\cdot{T(S['Sx'])}}}{{{m}}}\qquad\approx{_s(A, True)}\ \mathrm{{a.u.}}",
                "line": rf"x(\lambda)={_s(A, True)}{sign}\frac{{{_s(abs(B), True)}\cdot10^{{-12}}}}{{\lambda^2}}",
                "lam": rf"\lambda_H=\sqrt{{\frac{{{_s(B, True)}\cdot10^{{-12}}}}{{x_H-{_p(_s(A, True))}}}}}",
            },
            "check": {"x1": _e(min(xs)), "y1": _s(_rsig(A + B * min(xs), 4)), "x2": _e(max(xs)), "y2": _s(_rsig(A + B * max(xs), 4))},
            "graph": _graph(xs, ys),
        }
        gr = params.get("graphical") or {}
        cg = _cal_graph(gr.get("cal") or {}, A, B)
        if cg:
            out["cal"]["graphical"] = cg
        # --- λ_H = √(B/(x_H − A)), then λ_H⁻¹ (10⁶ m⁻¹) and n_i⁻² ---------------------------------
        for r in hrows:
            d = r["_x"] - A
            if d == 0 or (B / d) <= 0:
                r["bad"] = True
                continue
            lam_um = _rsig((B / d).sqrt(), 4)  # √(B·10⁻¹²/(x − A)) m = √(B/(x − A))·10⁻⁶ m
            lam_nm = lam_um * 1000
            inv = _rsig(1 / lam_um, 4)  # 10⁶ m⁻¹
            n2_exact = Decimal(1) / (r["_n"] ** 2)
            n2 = _rsig(n2_exact, 4).normalize()
            lt = r["line_tex"]
            eq = "=" if n2 == n2_exact else r"\approx"
            xt = _e(r["_x"], True)
            r.update({"lam": _e(lam_nm), "inv": _s(inv), "n2": _e(n2), "_lam": lam_nm, "_inv": inv, "_n2": n2,
                      "lam_tex": rf"x_{{{lt}}}={xt}\qquad\Rightarrow\ \lambda_{{{lt}}}=\sqrt{{\frac{{{_s(B, True)}\cdot10^{{-12}}}}{{{xt}-{_p(_s(A, True))}}}}}"
                                 rf"\qquad\approx{_s(lam_um, True)}\cdot10^{{-6}}\ \mathrm{{m}}={_e(lam_nm, True)}\ \mathrm{{nm}}",
                      "inv_tex": rf"({_e(lam_nm, True)})^{{-1}}\approx{_s(inv.scaleb(-3), True)}\ \mathrm{{nm^{{-1}}}}\qquad={_s(inv, True)}\cdot10^6\ \mathrm{{m^{{-1}}}}",
                      "n2_tex": rf"{r['_n']}^{{-2}}{eq}{_e(n2, True)}"})
            ref = next((Decimal(lr) for _, nn, lr in BALMER if nn == r["_n"]), None)
            if ref is not None:
                r["ref"] = _e(ref)
                r["dev"] = _s((lam_nm - ref).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))
        hu = [r for r in hrows if not r["excluded"] and "_inv" in r]
        out["h"] = [{kk: v for kk, v in r.items() if not kk.startswith("_")} for r in hrows]
        out["n_h"] = len(hu)
        if len(hu) < 3:
            return out
        out["stage"] = 2
        # --- LSM of λ_H⁻¹ (y) vs n_i⁻² (x): slope = −R_H ------------------------------------------
        xs, ys = [r["_n2"] for r in hu], [r["_inv"] for r in hu]
        m = len(hu)
        S = _sums(xs, ys)
        num_a = m * S["Sxy"] - S["Sx"] * S["Sy"]
        den = m * S["Sxx"] - S["Sx"] ** 2
        a_w = _rsig(num_a / den, 7)  # 7 digits: s_ε² below is a small difference of large numbers
        R = -a_w
        t1, t2, t3 = m * S["Syy"], S["Sy"] ** 2, _rsig(a_w * a_w * den, 8)
        br = t1 - t2 - t3
        se2 = _rsig(br / (m * (m - 2)), 3) if m > 2 and br != 0 else Decimal(0)
        sR = _rsig((m * se2 / den).sqrt(), 3) if se2 > 0 else None
        ryd = {
            "m": m, "Sx": _e(S["Sx"]), "Sy": _e(S["Sy"]), "Sxy": _e(S["Sxy"]), "Sxx": _e(S["Sxx"]), "Syy": _e(S["Syy"]),
            "num": _e(num_a), "den": _e(den), "R": _s(R), "R4": _s(_rsig(R, 4)), "se2": _s(se2), "bracket": _e(br), "negative": bool(br < 0),
            "tex": {
                "Sx": _sum_tex("S_x", [W(x) for x in xs], 3, "", T(S["Sx"]), ""),
                "Sy": _sum_tex("S_y", [W(y) for y in ys], 3, "10^6", T(S["Sy"]), "m^{-1}"),
                "Sxy": _sum_tex("S_{xy}", [rf"{W(x)}\cdot{W(y)}" for x, y in zip(xs, ys)], 2, "10^6", T(S["Sxy"]), "m^{-1}"),
                "Sxx": _sum_tex("S_{xx}", [rf"{W(x)}^2" for x in xs], 3, "", T(S["Sxx"]), ""),
                "Syy": _sum_tex("S_{yy}", [rf"{W(y)}^2" for y in ys], 3, "10^{12}", T(S["Syy"]), "m^{-2}"),
                "num": rf"m S_{{xy}}-S_xS_y\qquad={m}\cdot{T(S['Sxy'])}-{T(S['Sx'])}\cdot{T(S['Sy'])}\qquad={T(num_a)}\cdot10^6",
                "den": rf"m S_{{xx}}-(S_x)^2\qquad={m}\cdot{T(S['Sxx'])}-{T(S['Sx'])}^2\qquad={T(den)}",
                "R": rf"-R_H=\frac{{{T(num_a)}}}{{{T(den)}}}\cdot10^6\qquad\approx{_s(a_w, True)}\cdot10^6\ \mathrm{{m^{{-1}}}}"
                     rf"\qquad\Rightarrow\ R_H={_s(R, True)}\cdot10^6\ \mathrm{{m^{{-1}}}}",
                # the bracket of B.9 term by term (each term one calculator entry), then s_ε²
                "terms": rf"m S_{{yy}}={m}\cdot{T(S['Syy'])}={T(t1)}\qquad S_y^2={T(S['Sy'])}^2={T(t2)}"
                         rf"\qquad R_H^2\,(m S_{{xx}}-S_x^2)\qquad={_s(R, True)}^2\cdot{T(den)}\qquad={T(t3)}",
                "se2": rf"[\ \dots\ ]={T(t1)}-{T(t2)}\qquad -{T(t3)}={T(br)}"
                       rf"\qquad s_\varepsilon^2=\frac{{{T(br)}}}{{{m}({m}-2)}}\cdot10^{{12}}\qquad\approx{_s(se2, True)}\cdot10^{{12}}\ \mathrm{{m^{{-2}}}}",
            },
            "graph": _graph(xs, ys),
            "check": {"x1": _e(min(xs)), "y1": _s(_rsig(a_w * min(xs) + (S["Sy"] - a_w * S["Sx"]) / m, 4)),
                      "x2": _e(max(xs)), "y2": _s(_rsig(a_w * max(xs) + (S["Sy"] - a_w * S["Sx"]) / m, 4))},
        }
        if sR is not None:
            rr = round_report(R, sR)
            ryd.update({"sR": _s(sR), "R_r": rr.value_mant if not rr.exponent else None, "s_r": rr.unc_mant if not rr.exponent else None,
                        "report": f"({rr.value_mant} ± {rr.unc_mant})·10⁶ m⁻¹" if not rr.exponent else rr.text("·10⁶ m⁻¹"), "unc_digits": rr.unc_digits,
                        "report7": "({0.value_mant} ± {0.unc_mant})·10⁷ m⁻¹".format(round_report(R / 10, sR / 10)),
                        "rel_pct": fmt_sig(sR / R * 100, 2) if R else ""})
            ryd["tex"]["sR"] = (rf"s_{{R_H}}=\sqrt{{\frac{{m\,s_\varepsilon^2}}{{m S_{{xx}}-S_x^2}}}}\qquad=\sqrt{{\frac{{{m}\cdot{_s(se2, True)}\cdot10^{{12}}}}{{{T(den)}}}}}"
                                rf"\qquad\approx{_s(sR, True)}\cdot10^6\ \mathrm{{m^{{-1}}}}")
            ryd["tex"]["result"] = rf"R_H=({rr.value_mant}\pm{rr.unc_mant})\cdot10^6\ \mathrm{{m^{{-1}}}}" if not rr.exponent else rf"R_H={rr.latex('m^{-1}')}"
        RH = Decimal(str(k["RH"]))
        ryd["codata"] = _s(_rsig(RH / 10 ** 6, 5))
        ryd["dev_pct"] = fmt_sig((R * 10 ** 6 - RH) / RH * 100, 2)
        if sR:
            ryd["z"] = fmt_sig(abs(R * 10 ** 6 - RH) / (sR * 10 ** 6), 2)
        rg = _ryd_graph(gr.get("ryd") or {}, R, sR)
        if rg:
            ryd["graphical"] = rg
        out["ryd"] = ryd
        out["stage"] = 3
    return out


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
                    "xread": as_read(r.get("x"), x), "x_txt": str(r.get("x")).strip(),
                    "lam_txt": NIST_OF_GUIDE.get(lam_txt, lam_txt) if use_nist else lam_txt})
    res.table("hg", "Table 3.1 — mercury calibration", [{"key": "lam", "label": "λ_Hg", "unit": "nm"}, {"key": "x", "label": "x_Hg", "unit": "mm"},
              {"key": "X", "label": "λ⁻²", "unit": "µm⁻²"}],
              [{"id": c["id"], "lam": fmt_sig(c["lam"], 7), "x": c["xread"], "X": cell(c["X"], None, 6), "excluded": c["excluded"]} for c in cal])
    try:
        res.extra["guide"] = _sheet(cal, params, k)
    except (ArithmeticError, InvalidOperation):  # pragma: no cover - degenerate input; the main path reports it
        res.extra["guide"] = {"hg": [], "h": [], "stage": 0}
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
