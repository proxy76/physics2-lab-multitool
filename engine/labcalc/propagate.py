"""Uncertainty propagation (G4).

* Quick rules, exactly as Experiment 2 §2.8 Q3: σ for x ± y, relative σ for x·y, x/y, x^k, c·x.
* General first-order (GUM) propagation for a typed expression: SymPy differentiates
  symbolically (lazy-loaded — it is ~7 MB in the browser), mpmath evaluates at the working
  precision. Optional correlation/covariance matrix. Returns the uncertainty budget.
"""

from __future__ import annotations

import re

from mpmath import fsum, mpf, sqrt

from .parse import ParseError
from .rounding import tex_sig as t

# ---------------------------------------------------------------------------------------------
# Quick rules
# ---------------------------------------------------------------------------------------------


def quick(rule: str, x, sx, y=None, sy=None, k=None):
    """Return (f, σ_f, relative σ_f, steps) for a quick rule."""
    if rule in ("sum", "diff"):
        f = x + y if rule == "sum" else x - y
        s = sqrt(sx ** 2 + sy ** 2)
        op = "+" if rule == "sum" else "-"
        steps = [{"title": "Sum/difference: absolute uncertainties add in quadrature",
                  "latex": rf"f=x{op}y,\quad \sigma_f=\sqrt{{\sigma_x^2+\sigma_y^2}}",
                  "substituted": rf"\sigma_f=\sqrt{{({t(sx)})^2+({t(sy)})^2}}", "result": t(s)}]
    elif rule in ("product", "quotient"):
        f = x * y if rule == "product" else x / y
        rel = sqrt((sx / x) ** 2 + (sy / y) ** 2)
        s = abs(f) * rel
        op = r"\cdot" if rule == "product" else "/"
        steps = [{"title": "Product/quotient: relative uncertainties add in quadrature",
                  "latex": rf"f=x{op}y,\quad \frac{{\sigma_f}}{{|f|}}=\sqrt{{\left(\frac{{\sigma_x}}{{x}}\right)^2+\left(\frac{{\sigma_y}}{{y}}\right)^2}}",
                  "substituted": rf"\delta_f=\sqrt{{({t(sx / x)})^2+({t(sy / y)})^2}}", "result": rf"\delta_f={t(rel)},\ \sigma_f={t(s)}"}]
    elif rule == "power":
        f = x ** k
        rel = abs(k) * abs(sx / x)
        s = abs(f) * rel
        steps = [{"title": "Power: relative uncertainty multiplied by |k|", "latex": r"f=x^k,\quad \frac{\sigma_f}{|f|}=|k|\frac{\sigma_x}{|x|}",
                  "substituted": rf"\delta_f={t(abs(k))}\cdot{t(abs(sx / x))}", "result": rf"\delta_f={t(rel)},\ \sigma_f={t(s)}"}]
    elif rule == "scale":
        f = k * x
        s = abs(k) * sx
        steps = [{"title": "Constant factor", "latex": r"f=c\,x,\quad \sigma_f=|c|\,\sigma_x",
                  "substituted": rf"\sigma_f={t(abs(k))}\cdot{t(sx)}", "result": t(s)}]
    else:
        raise ParseError(f"Unknown rule '{rule}'", field="rule")
    rel = abs(s / f) if f != 0 else None
    return f, s, rel, steps


# ---------------------------------------------------------------------------------------------
# General expression
# ---------------------------------------------------------------------------------------------

FUNCS = ["sqrt", "exp", "log", "ln", "log10", "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "abs", "pi"]
_IDENT = re.compile(r"[A-Za-z_][A-Za-z_0-9]*")
_ALLOWED = re.compile(r"^[A-Za-z0-9_+\-*/^().,\s]*$")


def _sympy():
    import sympy  # lazy: only the custom-propagation tool needs it

    return sympy


def validate_expression(expr: str, names: list[str]) -> str:
    if not expr or not expr.strip():
        raise ParseError("Enter an expression, e.g. sqrt(B/(x-A))", field="expr", code="empty")
    e = expr.replace("−", "-").replace("×", "*").replace("·", "*")
    if not _ALLOWED.match(e):
        raise ParseError("The expression may only contain variables, numbers, + − * / ^ ( ) and functions", field="expr")
    for ident in _IDENT.findall(re.sub(r"\d+\.?\d*[eE][+-]?\d+", "0", e)):
        if ident not in names and ident not in FUNCS:
            raise ParseError(f"Unknown name '{ident}'. Define it as a variable or use one of: {', '.join(FUNCS)}", field="expr")
    return e.replace("^", "**")


def general(expr: str, variables: dict, cov: list | None = None, corr: list | None = None):
    """First-order propagation for ``expr`` with variables {name: (value, sigma)}.

    ``corr`` (correlation matrix) or ``cov`` (covariance matrix) are optional, in the order of
    ``variables``. Returns a dict with f, σ_f, derivatives, budget and LaTeX.
    """
    sp = _sympy()
    names = list(variables.keys())
    e = validate_expression(expr, names)
    syms = {nm: sp.Symbol(nm, real=True) for nm in names}
    local = dict(syms)
    local.update({"ln": sp.log, "log10": lambda z: sp.log(z, 10), "abs": sp.Abs, "pi": sp.pi})
    try:
        f_expr = sp.sympify(e, locals=local, rational=True)
    except Exception as ex:  # sympy raises many exception types
        raise ParseError(f"Could not read the expression: {ex}", field="expr")
    free = {str(s) for s in f_expr.free_symbols}
    unknown = free - set(names)
    if unknown:
        raise ParseError(f"Unknown name(s): {', '.join(sorted(unknown))}", field="expr")
    vals = [variables[nm][0] for nm in names]
    sig = [variables[nm][1] for nm in names]
    m = len(names)
    # covariance matrix
    V = [[mpf(0)] * m for _ in range(m)]
    for i in range(m):
        V[i][i] = sig[i] ** 2
    if corr is not None:
        for i in range(m):
            for j in range(m):
                if i != j and corr[i][j] is not None:
                    V[i][j] = mpf(corr[i][j]) * sig[i] * sig[j]
    elif cov is not None:
        for i in range(m):
            for j in range(m):
                if cov[i][j] is not None:
                    V[i][j] = mpf(cov[i][j])
    for i in range(m):
        for j in range(i + 1, m):
            if V[i][j] != V[j][i]:
                raise ParseError("The covariance/correlation matrix must be symmetric", field="cov")
    sym_list = [syms[nm] for nm in names]
    f_num = sp.lambdify(sym_list, f_expr, modules="mpmath")
    derivs = [sp.diff(f_expr, s) for s in sym_list]
    d_num = [sp.lambdify(sym_list, d, modules="mpmath") for d in derivs]
    try:
        raw = [f_num(*vals)] + [dn(*vals) for dn in d_num]
    except (ZeroDivisionError, ValueError) as ex:
        raise ParseError(f"The expression cannot be evaluated at these values ({ex})", field="expr")
    for v in raw:
        if getattr(v, "imag", 0) != 0:
            raise ParseError("The expression is not real at these values (e.g. square root of a negative number)", field="expr")
    fval = mpf(getattr(raw[0], "real", raw[0]))
    g = [mpf(getattr(v, "real", v)) for v in raw[1:]]
    terms = []
    var_f = mpf(0)
    for i in range(m):
        for j in range(m):
            c = g[i] * g[j] * V[i][j]
            var_f += c
    sf = sqrt(var_f) if var_f > 0 else mpf(0)
    for i in range(m):
        c = (g[i] ** 2) * V[i][i]
        terms.append({"name": names[i], "derivative": g[i], "derivative_latex": sp.latex(derivs[i]),
                      "contribution": c, "share": (c / var_f if var_f > 0 else mpf(0))})
    cross = var_f - fsum(tm["contribution"] for tm in terms)
    return {"f": fval, "sigma": sf, "var": var_f, "terms": terms, "cross": cross, "latex": sp.latex(f_expr),
            "expr": f_expr, "symbols": sym_list, "V": V, "values": vals, "names": names}


def linear(fun, values: list, V: list, h=None):
    """Numerical first-order propagation (mpmath.diff) for an mpmath callable — used internally."""
    from mpmath import diff

    m = len(values)
    g = []
    for i in range(m):
        def part(z, i=i):
            vv = list(values)
            vv[i] = z
            return fun(*vv)
        g.append(diff(part, values[i]))
    var = fsum(g[i] * g[j] * V[i][j] for i in range(m) for j in range(m))
    return fun(*values), (sqrt(var) if var > 0 else mpf(0)), g
