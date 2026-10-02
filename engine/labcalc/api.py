"""Single JSON entry point: ``dispatch(tool, params, constants, options) -> dict``.

Request (from the Web Worker):  {tool, params, constants: 'codata'|'guide', options}
Response: {ok: True, result: {...}} or {ok: False, error: {code, message, field}}
"""

from __future__ import annotations

import json
import traceback

from mpmath import mp, mpf, workdps

from . import CHECK_DPS, WORK_DPS, constants, counting, decay, graphical, linfit, montecarlo, propagate, stats, units
from .experiments import exp3, exp4, exp5, exp6, exp7
from .parse import ParseError, is_blank, parse_list, parse_number, parse_optional, split_list
from .result import Result, cell, num
from .rounding import fmt_sig, full, round_report, tex_sig as t
from .experiments.common import compare as _compare, fit_plot, fit_values, fit_warnings

# ---------------------------------------------------------------------------------------------
# Generic tools
# ---------------------------------------------------------------------------------------------


def _values(params, key="values"):
    v = params.get(key)
    if isinstance(v, str):
        v = split_list(v)
    return parse_list(v, key)


def tool_parse(p, k, o):
    res = Result()
    x = parse_number(p.get("text"), "text")
    res.value("x", x, None, "", "parsed value", sig=15)
    return res.to_json()


def tool_stats(p, k, o):
    res = Result(o.get("round_up", False))
    xs = _values(p)
    tm = parse_optional(p.get("true_mean"), "true_mean")
    d = stats.describe(xs, tm)
    unit = p.get("unit", "")
    res.value("n", d["n"], None, "", "N")
    res.value("mean", d["mean"], d.get("sem"), unit, "mean ± standard error of the mean")
    res.value("mean_full", d["mean"], None, unit, "mean (full)", sig=12)
    res.value("min", d["min"], None, unit, "minimum", sig=10)
    res.value("max", d["max"], None, unit, "maximum", sig=10)
    if "s" in d:
        res.value("s", d["s"], None, unit, "sample standard deviation s (N − 1)")
        res.value("sem", d["sem"], None, unit, "standard error s/√N")
    else:
        res.warn("n1", "One value only — no standard deviation.")
    if "s_true" in d:
        res.value("s_true", d["s_true"], None, unit, "σ about the true mean (eq. A.1, 1/N)")
    res.steps_from(stats.describe_steps(d, t))
    return res.to_json()


def tool_counting(p, k, o):
    res = Result(o.get("round_up", False))
    mode = p.get("mode", "rate")
    if mode == "count":
        N = parse_number(p.get("N"), "N")
        _, s = counting.count(N)
        res.value("N", N, s, "counts", "N ± √N")
        res.step("Poisson uncertainty (App. A.3)", r"\sigma_N=\sqrt{N}", rf"\sigma_N=\sqrt{{{t(N, 10)}}}", t(s))
    elif mode == "rate":
        N = parse_number(p.get("N"), "N")
        tt = parse_number(p.get("t"), "t")
        n, s = counting.rate(N, tt)
        res.value("n", n, s, "s⁻¹", "rate n = N/t")
        res.value("rel", s / n * 100 if n else 0, None, "%", "relative uncertainty", sig=3)
        res.step("Count rate", r"n=\frac{N}{t},\quad\sigma_n=\frac{\sqrt N}{t}", rf"n=\frac{{{t(N, 10)}}}{{{t(tt)}}}", rf"{t(n)}\pm{t(s, 3)}")
        if not is_blank(p.get("Nb")) and not is_blank(p.get("tb")):
            nb, sb = counting.rate(parse_number(p.get("Nb"), "Nb"), parse_number(p.get("tb"), "tb"))
            d, sd = counting.subtract(n, s, nb, sb)
            res.value("nb", nb, sb, "s⁻¹", "background rate")
            res.value("net", d, sd, "s⁻¹", "net rate n − n_b")
            res.step("Background subtraction", r"n=n'-n_b,\ \sigma=\sqrt{\sigma_{n'}^2+\sigma_{n_b}^2}", rf"{t(n)}-{t(nb)}", rf"{t(d)}\pm{t(sd, 3)}")
            if d <= 0:
                res.warn("nonpositive", "Net rate ≤ 0 after background subtraction.")
    elif mode in ("ratio", "product"):
        a, sa = parse_number(p.get("n1"), "n1"), parse_number(p.get("s1"), "s1")
        b, sb = parse_number(p.get("n2"), "n2"), parse_number(p.get("s2"), "s2")
        v, s = (counting.ratio if mode == "ratio" else counting.product)(a, sa, b, sb)
        res.value("v", v, s, "", "n₁/n₂" if mode == "ratio" else "n₁·n₂")
    elif mode == "planner":
        n = parse_number(p.get("n"), "n")
        eps = parse_number(p.get("eps"), "eps") / 100
        nb = parse_optional(p.get("nb"), "nb")
        tb = parse_optional(p.get("tb"), "tb")
        tt, N = counting.planner(n, eps, nb, tb)
        if tt is None:
            res.warn("impossible", "The background uncertainty alone exceeds the target — measure the background longer.")
        else:
            res.value("t", tt, None, "s", "counting time needed", sig=3)
            res.value("N", N, None, "counts", "counts needed", sig=3)
            res.step("Counting-time planner", r"\frac{\sigma_n}{n}=\frac{1}{\sqrt{n t}}=\varepsilon\ \Rightarrow\ t=\frac{1}{n\varepsilon^2}",
                     rf"t=\frac{{1}}{{{t(n)}\cdot({t(eps)})^2}}" if nb is None else "", t(tt, 3))
    else:
        raise ParseError(f"Unknown mode {mode}", field="mode")
    return res.to_json()


def _xy(p):
    x = _values(p, "x")
    y = _values(p, "y")
    if len(x) != len(y):
        raise ParseError(f"x has {len(x)} values but y has {len(y)}", field="y")
    return x, y


def tool_linfit(p, k, o):
    res = Result(o.get("round_up", False))
    x, y = _xy(p)
    mode = p.get("mode", "ols")
    xu, yu = p.get("xunit", ""), p.get("yunit", "")
    thr = mpf(str(o.get("outlier_threshold", "2.5")))
    if mode == "weighted":
        sy = _values(p, "sy")
        if len(sy) != len(y):
            raise ParseError("Give one σ per y value", field="sy")
        f = linfit.weighted(x, y, sy, through_origin=bool(p.get("origin")))
        res.value("a_ext", f.a, f.s_a_ext, "", "slope (external σ, χ²_red-scaled)")
        if f.kind == "weighted":
            res.value("b_ext", f.b, f.s_b_ext, "", "intercept (external σ)")
    elif mode == "origin":
        f = linfit.origin(x, y)
    else:
        f = linfit.ols(x, y)
    ids = list(range(len(x)))
    labels = [f"#{i + 1}" for i in ids]
    fit_warnings(res, f, ids, labels, thr, "Fit")
    au = f"{yu}/{xu}" if xu and yu else (yu or (f"1/{xu}" if xu else ""))
    fit_values(res, "fit", f, au, yu)
    res.steps_from(linfit.steps(f, "x", "y"))
    res.table("residuals", "Residuals", [{"key": "i", "label": "#", "unit": ""}, {"key": "x", "label": "x", "unit": xu}, {"key": "y", "label": "y", "unit": yu},
              {"key": "yhat", "label": "ŷ", "unit": yu}, {"key": "r", "label": "residual", "unit": yu}, {"key": "z", "label": "standardised", "unit": ""}],
              [{"id": str(i), "i": str(i + 1), "x": cell(f.x[i], None, 8), "y": cell(f.y[i], None, 8), "yhat": cell(f.yhat[i], None, 8),
                "r": cell(f.res[i], None, 4), "z": cell(f.std_res[i], None, 3)} for i in ids])
    res.plot(fit_plot("fit", "Fit", {"label": p.get("xlabel", "x"), "unit": xu}, {"label": p.get("ylabel", "y"), "unit": yu}, f,
                      _values(p, "sy") if mode == "weighted" else None, ids, labels, res.extra.get("flags")))
    if not is_blank(p.get("y0")) and f.kind in ("ols", "weighted"):
        y0 = parse_number(p.get("y0"), "y0")
        sy0 = parse_optional(p.get("sy0"), "sy0") or mpf(0)
        x0, sx0 = linfit.inverse_predict(f, y0, sy0)
        res.value("x0", x0, sx0, xu, "inverse prediction x₀ = (y₀ − b)/a")
        res.step("Inverse prediction (calibration)", r"x_0=\frac{y_0-b}{a},\ \sigma_{x_0}^2=\frac{\sigma_{y_0}^2+s_b^2+x_0^2s_a^2+2x_0\,\mathrm{cov}(a,b)}{a^2}",
                 rf"x_0=\frac{{{t(y0)}-{t(f.b)}}}{{{t(f.a)}}}", rf"{t(x0)}\pm{t(sx0, 3)}")
    return res.to_json()


def tool_propagate_quick(p, k, o):
    res = Result(o.get("round_up", False))
    rule = p.get("rule", "sum")
    x = parse_number(p.get("x"), "x")
    sx = parse_number(p.get("sx"), "sx")
    y = parse_optional(p.get("y"), "y")
    sy = parse_optional(p.get("sy"), "sy")
    kk = parse_optional(p.get("k"), "k")
    if rule in ("sum", "diff", "product", "quotient") and (y is None or sy is None):
        raise ParseError("Enter y and σ_y", field="y")
    if rule in ("power", "scale") and kk is None:
        raise ParseError("Enter the exponent / constant", field="k")
    f, s, rel, steps = propagate.quick(rule, x, sx, y, sy, kk)
    res.value("f", f, s, p.get("unit", ""), "f ± σ_f")
    if rel is not None:
        res.value("rel", rel * 100, None, "%", "relative uncertainty", sig=3)
    res.steps_from(steps)
    return res.to_json()


def _vars(p):
    out = {}
    for i, v in enumerate(p.get("variables") or []):
        name = (v.get("name") or "").strip()
        if not name:
            continue
        out[name] = (parse_number(v.get("value"), f"variables[{i}].value"), parse_number(v.get("sigma") or "0", f"variables[{i}].sigma"))
    if not out:
        raise ParseError("Add at least one variable", field="variables", code="empty")
    return out


def _matrix(p, names):
    m = p.get("corr")
    if not m:
        return None
    out = []
    for i in range(len(names)):
        row = []
        for j in range(len(names)):
            try:
                v = m[i][j]
            except (IndexError, TypeError):
                v = None
            row.append(mpf(1) if i == j else (parse_number(v, f"corr[{i}][{j}]") if not is_blank(v) else mpf(0)))
        out.append(row)
    for i in range(len(names)):
        for j in range(len(names)):
            if abs(out[i][j]) > 1:
                raise ParseError("Correlation coefficients must be between −1 and 1", field=f"corr[{i}][{j}]")
    return out


def tool_propagate(p, k, o):
    res = Result(o.get("round_up", False))
    variables = _vars(p)
    corr = _matrix(p, list(variables))
    r = propagate.general(p.get("expr", ""), variables, corr=corr)
    unit = p.get("unit", "")
    res.value("f", r["f"], r["sigma"], unit, "f ± σ_f (first order)")
    res.value("f_full", r["f"], None, unit, "f (full precision)", sig=15)
    res.step("Function", "f=" + r["latex"], "", "")
    res.step("First-order propagation (GUM)", r"\sigma_f^2=\sum_{i,j}\frac{\partial f}{\partial x_i}\frac{\partial f}{\partial x_j}\,\mathrm{cov}(x_i,x_j)", "", t(r["sigma"]))
    rows = []
    for tm in r["terms"]:
        res.step(f"∂f/∂{tm['name']}", rf"\frac{{\partial f}}{{\partial {tm['name']}}}=" + tm["derivative_latex"], "", t(tm["derivative"]))
        rows.append({"id": tm["name"], "name": tm["name"], "deriv": cell(tm["derivative"], None, 6), "sigma": cell(variables[tm["name"]][1], None, 4),
                     "contrib": cell(tm["contribution"], None, 4), "share": fmt_sig(tm["share"] * 100, 3)})
    if r["cross"] != 0:
        rows.append({"id": "cross", "name": "correlations", "deriv": "", "sigma": "", "contrib": cell(r["cross"], None, 4),
                     "share": fmt_sig(r["cross"] / r["var"] * 100, 3) if r["var"] else ""})
    res.table("budget", "Uncertainty budget", [{"key": "name", "label": "variable", "unit": ""}, {"key": "deriv", "label": "∂f/∂x", "unit": ""},
              {"key": "sigma", "label": "σ", "unit": ""}, {"key": "contrib", "label": "(∂f/∂x·σ)²", "unit": ""}, {"key": "share", "label": "share of σ_f²", "unit": "%"}], rows)
    if p.get("mc"):
        _mc(res, r, p, o)
    return res.to_json()


def _mc(res, r, p, o):
    import sympy as sp

    n = int(p.get("mc_n") or 200000)
    f_float = sp.lambdify(r["symbols"], r["expr"], modules="math")
    mcr = montecarlo.run(f_float, [float(v) for v in r["values"]], [[float(x) for x in row] for row in r["V"]], n=n, seed=int(p.get("seed") or 12345))
    res.value("mc.mean", mcr["mean"], None, "", "Monte Carlo mean", sig=6)
    res.value("mc.sd", mcr["sd"], None, "", "Monte Carlo standard deviation", sig=4)
    res.value("mc.lo95", mcr["lo95"], None, "", "95 % interval low", sig=5)
    res.value("mc.hi95", mcr["hi95"], None, "", "95 % interval high", sig=5)
    res.extra["mc"] = {"n": mcr["n"], "rejected": mcr["rejected"], "hist": mcr["hist"]}
    lin = float(r["sigma"])
    if lin > 0 and abs(mcr["sd"] / lin - 1) > 0.10:
        res.warn("nonlinear", f"Monte Carlo σ differs from linear propagation by {abs(mcr['sd'] / lin - 1) * 100:.0f} % — the function is strongly non-linear here; prefer the Monte Carlo interval.")
    else:
        res.info("mc_ok", "Monte Carlo agrees with first-order propagation within 10 %.")


def tool_report(p, k, o):
    res = Result(o.get("round_up", False))
    v = parse_number(p.get("value"), "value")
    u = parse_optional(p.get("unc"), "unc")
    unit = p.get("unit", "")
    if u is None or u == 0:
        res.warn("no_unc", "No uncertainty given — the lab rule cannot be applied; showing 4 significant digits instead of a fake precision.")
        res.value("report", v, None, unit, "value", sig=4)
    else:
        res.value("report", v, u, unit, "reported result")
        rr = round_report(v, u, round_up=o.get("round_up", False))
        res.extra["rule"] = {"digits": rr.unc_digits, "quantum": rr.quantum}
        res.step("Lab rounding rule (GUM 7.2.6, guide §2.8/§5.8)", r"\text{1 significant digit in }\sigma\text{ (2 if it starts with 1); value rounded to the same decimal}",
                 rf"\sigma={t(u, 6)}\ \to\ {rr.unc_mant}", rr.latex())
    ref = parse_optional(p.get("ref"), "ref")
    if ref is not None:
        sref = parse_optional(p.get("sref"), "sref")
        _compare(res, "ref", v, u, ref, sref, unit, "result vs reference")
    v2 = parse_optional(p.get("value2"), "value2")
    if v2 is not None:
        u2 = parse_optional(p.get("unc2"), "unc2")
        _compare(res, "two", v, u, v2, u2, unit, "value 1 vs value 2")
    return res.to_json()


def tool_graphical(p, k, o):
    res = Result(o.get("round_up", False))
    mode = p.get("mode", "two_point")
    if mode == "two_point":
        pts = [parse_number(p.get(kk), kk) for kk in ("x1", "y1", "x2", "y2")]
        a, b = graphical.two_point(*pts)
        res.value("a", a, None, "", "slope", sig=6)
        res.value("b", b, None, "", "intercept", sig=6)
        res.step("Slope from two points on the drawn line", r"a=\frac{y_2-y_1}{x_2-x_1},\ b=y_1-a x_1",
                 rf"a=\frac{{{t(pts[3])}-{t(pts[1])}}}{{{t(pts[2])}-{t(pts[0])}}}", t(a))
        if abs(pts[2] - pts[0]) > 0:
            res.info("far_apart", "Choose P₁ and P₂ far apart on the line (not data points) for the best precision.")
    elif mode == "max_min":
        lines = {}
        for nm in ("max", "min"):
            q = [parse_number(p.get(f"{nm}_{kk}"), f"{nm}_{kk}") for kk in ("x1", "y1", "x2", "y2")]
            lines[nm] = graphical.two_point(*q)[0]
        a, s = graphical.max_min(lines["max"], lines["min"])
        res.value("a", a, s, "", "slope ± (a_max − a_min)/2")
        res.value("a_max", lines["max"], None, "", "steepest line slope")
        res.value("a_min", lines["min"], None, "", "shallowest line slope")
        res.step("Max/min slope method", r"a=\frac{a_{max}+a_{min}}{2},\ \sigma_a\approx\frac{a_{max}-a_{min}}{2}",
                 rf"\frac{{{t(lines['max'])}-{t(lines['min'])}}}{{2}}", t(s))
    elif mode == "scale":
        x = _values(p, "x")
        y = _values(p, "y")
        lay = graphical.a4_layout(min(x), max(x), min(y), max(y), bool(p.get("landscape")), bool(p.get("zero_x")), bool(p.get("zero_y")))
        for ax in ("x", "y"):
            a = lay[ax]
            res.value(f"{ax}.scale", a["scale"], None, "", f"{ax}-axis: units per cm", sig=3)
            res.value(f"{ax}.origin", a["origin"], None, "", f"{ax}-axis origin", sig=6)
            res.value(f"{ax}.fill", a["fill"] * 100, None, "%", f"{ax}-axis fill", sig=3)
            if not a["ok"]:
                res.info("fill", f"The {ax} data fill only {fmt_sig(a['fill'] * 100, 2)} % of the axis.")
        res.extra["layout"] = {"paper": lay["paper"], "x": {kk: fmt_sig(v, 6) if not isinstance(v, (bool, str)) else v for kk, v in lay["x"].items()},
                               "y": {kk: fmt_sig(v, 6) if not isinstance(v, (bool, str)) else v for kk, v in lay["y"].items()}}
    else:
        raise ParseError(f"Unknown mode {mode}", field="mode")
    return res.to_json()


def tool_units(p, k, o):
    res = Result()
    v = parse_number(p.get("value"), "value")
    frm, to = p.get("from"), p.get("to")
    targets = [to] if to else None
    if targets is None:
        cat = next((c for c, tb in units.SIMPLE.items() if frm in tb), None)
        targets = [u for u in (units.SPECTRAL if frm in units.SPECTRAL else units.SIMPLE[cat]) if u != frm]
    for u in targets:
        res.value(f"to.{u}", units.convert(v, frm, u, k), None, u, f"in {u}", sig=10)
    return res.to_json()


def tool_constants(p, k, o):
    res = Result()
    res.extra["constants"] = constants.table(p.get("set") or k["set"])
    res.extra["materials"] = {kk: {"name": m["name"], "Z": m["Z"], "rho": m["rho"], "mu_rho": m["mu_rho"]} for kk, m in constants.MATERIALS.items()}
    res.extra["cs137"] = constants.CS137
    res.extra["units"] = units.unit_options()
    return res.to_json()


def tool_decay(p, k, o):
    res = Result(o.get("round_up", False))
    A0 = parse_number(p.get("A0"), "A0")
    sA0 = parse_optional(p.get("sA0"), "sA0") or mpf(0)
    T = parse_optional(p.get("T_half"), "T_half") or mpf(constants.CS137["T_half_y"])
    sT = parse_optional(p.get("sT"), "sT")
    if sT is None:
        sT = mpf(constants.CS137["T_half_unc_y"]) if is_blank(p.get("T_half")) else mpf(0)
    d0 = decay.parse_date(p.get("date_ref"), "date_ref")
    d1 = decay.parse_date(p.get("date"), "date")
    A, sA, dt = decay.correct(A0, sA0, d0, d1, T, sT)
    res.value("dt", dt, None, "y", "elapsed time", sig=5)
    res.value("A", A, sA if sA > 0 else None, p.get("unit", "Bq"), "activity on the measurement date")
    res.value("ratio", A / A0, None, "", "A/A₀", sig=6)
    res.step("Decay correction", r"A=A_0\,2^{-\Delta t/T_{1/2}}", rf"A={t(A0)}\cdot 2^{{-{t(dt, 5)}/{t(T, 5)}}}", t(A))
    return res.to_json()


def tool_selftest(p, k, o):
    """Tiny smoke test for the worker bootstrap."""
    res = Result()
    res.value("x", mpf(1) / 3, None, "", "1/3", sig=30)
    res.extra["dps"] = mp.dps
    return res.to_json()


TOOLS = {
    "parse": tool_parse,
    "stats": tool_stats,
    "counting": tool_counting,
    "linfit": tool_linfit,
    "propagate.quick": tool_propagate_quick,
    "propagate": tool_propagate,
    "report": tool_report,
    "graphical": tool_graphical,
    "units": tool_units,
    "constants": tool_constants,
    "decay": tool_decay,
    "selftest": tool_selftest,
    "exp3.analyze": lambda p, k, o: exp3.analyze(p, k, o),
    "exp4.analyze": lambda p, k, o: exp4.analyze(p, k, o),
    "exp5.analyze": lambda p, k, o: exp5.analyze(p, k, o),
    "exp6.analyze": lambda p, k, o: exp6.analyze(p, k, o),
    "exp7.analyze": lambda p, k, o: exp7.analyze(p, k, o),
}

EXP_OF = {"exp3.analyze": "exp3", "exp4.analyze": "exp4", "exp5.analyze": "exp5", "exp6.analyze": "exp6", "exp7.analyze": "exp7"}


def _run(tool, params, const_set, options, dps):
    with workdps(dps):
        k = constants.get(const_set, EXP_OF.get(tool))
        return TOOLS[tool](params or {}, k, options or {})


def _selfcheck(a: dict, b: dict) -> dict:
    """Compare every values[*].value between two runs; report the minimum agreeing digits."""
    from mpmath import fabs, log10

    worst, worst_name = 99.0, None
    with workdps(120):
        for name, va in a.get("values", {}).items():
            vb = b.get("values", {}).get(name)
            if not vb:
                continue
            x, y = mpf(va["value"]), mpf(vb["value"])
            if x == y:
                continue
            d = float(-log10(fabs(x - y) / max(fabs(y), mpf("1e-300"))))
            if d < worst:
                worst, worst_name = d, name
    return {"ok": worst >= 40, "min_digits": round(worst, 1), "worst": worst_name}


def dispatch(tool: str, params: dict | None = None, constants_set: str = "codata", options: dict | None = None) -> dict:
    options = options or {}
    if tool not in TOOLS:
        return {"ok": False, "error": {"code": "unknown_tool", "message": f"Unknown tool '{tool}'"}}
    try:
        if options.get("selfcheck"):
            from .result import TRANSPORT

            TRANSPORT["digits"] = 48
            try:
                lo = _run(tool, params, constants_set, options, WORK_DPS)
                hi = _run(tool, params, constants_set, options, CHECK_DPS)
            finally:
                TRANSPORT["digits"] = 30
            result = _run(tool, params, constants_set, options, WORK_DPS)
            result["selfcheck"] = _selfcheck(lo, hi)
        else:
            result = _run(tool, params, constants_set, options, WORK_DPS)
        result["constants"] = constants_set
        return {"ok": True, "result": result}
    except ParseError as e:
        return {"ok": False, "error": {"code": e.code, "message": e.message, "field": e.field}}
    except ZeroDivisionError:
        return {"ok": False, "error": {"code": "math", "message": "Division by zero — check for zero or repeated values."}}
    except Exception as e:  # never crash the worker
        return {"ok": False, "error": {"code": "internal", "message": f"{type(e).__name__}: {e}", "trace": traceback.format_exc(limit=4)}}


def dispatch_json(request_json: str) -> str:
    """Entry point used by the Web Worker (string in, string out)."""
    req = json.loads(request_json)
    out = dispatch(req.get("tool"), req.get("params"), req.get("constants", "codata"), req.get("options"))
    out["id"] = req.get("id")
    return json.dumps(out, ensure_ascii=False)
