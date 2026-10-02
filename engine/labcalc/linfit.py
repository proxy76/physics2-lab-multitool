"""Linear least squares (G3) — Appendix B of the guide.

The numbers are computed with centred two-pass sums at the working precision (numerically
stable); the "show steps" output displays the guide's raw-sum formulas B.6–B.11, which are
algebraically identical.

* :func:`ols` — y = a·x + b with s_a, s_b (B.4/B.5), cov(a,b) = −x̄·s_a², r, R², residuals.
* :func:`origin` — y = a·x, a = Σxy/Σx², s_a² = SSR/((n−1)·Σx²) (NIST StRD NoInt convention).
* :func:`weighted` — weights 1/σᵢ²; internal and external (χ²_red-scaled) uncertainties.
* :func:`inverse_predict` — x₀ from y₀ for calibration curves, including cov(a,b).
* :func:`general` — linear model with any basis functions (used for the 3-term Cauchy check).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from mpmath import fsum, matrix, mpf, sqrt

from .parse import ParseError


@dataclass
class Fit:
    kind: str
    n: int
    a: mpf
    b: mpf
    s_a: mpf
    s_b: mpf
    cov: mpf
    df: int
    ssr: mpf
    s: mpf  # residual standard deviation s_ε
    r: mpf | None
    R2: mpf
    x: list
    y: list
    yhat: list
    res: list
    std_res: list  # internally studentised residuals r_i / (s·√(1−h_ii))
    leverage: list
    sums: dict = field(default_factory=dict)
    chi2: mpf | None = None
    chi2_red: mpf | None = None
    s_a_ext: mpf | None = None
    s_b_ext: mpf | None = None
    cov_ext: mpf | None = None
    sigma: list | None = None

    def predict(self, x):
        return self.a * x + self.b

    def predict_unc(self, x):
        """Standard uncertainty of the fitted line at x (confidence band, 1σ)."""
        v = x * x * self.s_a ** 2 + self.s_b ** 2 + 2 * x * self.cov
        return sqrt(v) if v > 0 else mpf(0)


def _check(x, y, need: int):
    if len(x) != len(y):
        raise ParseError("x and y must have the same number of values", field="data")
    if len(x) < need:
        raise ParseError(f"At least {need} points are needed for this fit (n − {need - 1} degrees of freedom)", field="data", code="too_few")


def _sums(x, y) -> dict:
    return {"n": len(x), "Sx": fsum(x), "Sy": fsum(y), "Sxx": fsum(xi * xi for xi in x),
            "Sxy": fsum(xi * yi for xi, yi in zip(x, y)), "Syy": fsum(yi * yi for yi in y)}


def ols(x, y) -> Fit:
    """Ordinary least squares y = a·x + b (unweighted), exactly as Appendix B."""
    x = [mpf(v) for v in x]
    y = [mpf(v) for v in y]
    _check(x, y, 3)
    n = len(x)
    xm = fsum(x) / n
    ym = fsum(y) / n
    sxx = fsum((xi - xm) ** 2 for xi in x)
    if sxx == 0:
        raise ParseError("All x values are equal — a slope cannot be determined", field="x", code="degenerate")
    syy = fsum((yi - ym) ** 2 for yi in y)
    sxy = fsum((xi - xm) * (yi - ym) for xi, yi in zip(x, y))
    a = sxy / sxx
    b = ym - a * xm
    yhat = [a * xi + b for xi in x]
    res = [yi - yh for yi, yh in zip(y, yhat)]
    ssr = fsum(r * r for r in res)
    df = n - 2
    s2 = ssr / df
    s = sqrt(s2)
    s_a = sqrt(s2 / sxx)
    s_b = sqrt(s2 * (mpf(1) / n + xm ** 2 / sxx))
    cov = -xm * s2 / sxx
    r = sxy / sqrt(sxx * syy) if syy > 0 else mpf(1)
    R2 = 1 - ssr / syy if syy > 0 else mpf(1)
    lev = [mpf(1) / n + (xi - xm) ** 2 / sxx for xi in x]
    std = [ri / (s * sqrt(1 - h)) if s > 0 and h < 1 else mpf(0) for ri, h in zip(res, lev)]
    sums = _sums(x, y)
    sums.update({"xm": xm, "ym": ym, "sxx_c": sxx, "sxy_c": sxy, "syy_c": syy})
    return Fit("ols", n, a, b, s_a, s_b, cov, df, ssr, s, r, R2, x, y, yhat, res, std, lev, sums)


def origin(x, y) -> Fit:
    """Least squares through the origin, y = a·x."""
    x = [mpf(v) for v in x]
    y = [mpf(v) for v in y]
    _check(x, y, 2)
    n = len(x)
    sxx = fsum(xi * xi for xi in x)
    if sxx == 0:
        raise ParseError("All x values are zero", field="x", code="degenerate")
    sxy = fsum(xi * yi for xi, yi in zip(x, y))
    a = sxy / sxx
    yhat = [a * xi for xi in x]
    res = [yi - yh for yi, yh in zip(y, yhat)]
    ssr = fsum(r * r for r in res)
    df = n - 1
    s2 = ssr / df
    s = sqrt(s2)
    s_a = sqrt(s2 / sxx)
    syy = fsum(yi * yi for yi in y)
    R2 = 1 - ssr / syy if syy > 0 else mpf(1)  # uncentred R² (NIST NoInt convention)
    lev = [xi * xi / sxx for xi in x]
    std = [ri / (s * sqrt(1 - h)) if s > 0 and h < 1 else mpf(0) for ri, h in zip(res, lev)]
    sums = _sums(x, y)
    return Fit("origin", n, a, mpf(0), s_a, mpf(0), mpf(0), df, ssr, s, None, R2, x, y, yhat, res, std, lev, sums)


def weighted(x, y, sigma, through_origin: bool = False) -> Fit:
    """Weighted least squares with weights wᵢ = 1/σᵢ².

    Internal uncertainties come from the σᵢ alone; external ones are scaled by √χ²_red.
    """
    x = [mpf(v) for v in x]
    y = [mpf(v) for v in y]
    sigma = [mpf(v) for v in sigma]
    _check(x, y, 2 if through_origin else 3)
    if any(sg <= 0 for sg in sigma):
        raise ParseError("Every σ must be positive for a weighted fit", field="sigma")
    w = [1 / sg ** 2 for sg in sigma]
    n = len(x)
    W = fsum(w)
    if through_origin:
        Sww = fsum(wi * xi * xi for wi, xi in zip(w, x))
        a = fsum(wi * xi * yi for wi, xi, yi in zip(w, x, y)) / Sww
        b = mpf(0)
        var_a, var_b, cov = 1 / Sww, mpf(0), mpf(0)
        df = n - 1
        lev = [wi * xi * xi / Sww for wi, xi in zip(w, x)]
    else:
        xw = fsum(wi * xi for wi, xi in zip(w, x)) / W
        yw = fsum(wi * yi for wi, yi in zip(w, y)) / W
        Sxx = fsum(wi * (xi - xw) ** 2 for wi, xi in zip(w, x))
        Sxy = fsum(wi * (xi - xw) * (yi - yw) for wi, xi, yi in zip(w, x, y))
        a = Sxy / Sxx
        b = yw - a * xw
        var_a = 1 / Sxx
        var_b = 1 / W + xw ** 2 / Sxx
        cov = -xw / Sxx
        df = n - 2
        lev = [wi * (mpf(1) / W + (xi - xw) ** 2 / Sxx) for wi, xi in zip(w, x)]
    yhat = [a * xi + b for xi in x]
    res = [yi - yh for yi, yh in zip(y, yhat)]
    chi2 = fsum((ri / sg) ** 2 for ri, sg in zip(res, sigma))
    chi2_red = chi2 / df if df > 0 else mpf(0)
    s_a, s_b = sqrt(var_a), sqrt(var_b)
    scale = sqrt(chi2_red) if chi2_red > 0 else mpf(0)
    std = [ri / (sg * sqrt(1 - h)) if h < 1 else mpf(0) for ri, sg, h in zip(res, sigma, lev)]
    ssr = fsum(r * r for r in res)
    f = Fit("weighted_origin" if through_origin else "weighted", n, a, b, s_a, s_b, cov, df, ssr,
            sqrt(ssr / df) if df > 0 else mpf(0), None, mpf(0), x, y, yhat, res, std, lev, _sums(x, y),
            chi2, chi2_red, s_a * scale, s_b * scale, cov * chi2_red, sigma)
    return f


def inverse_predict(fit: Fit, y0, s_y0=0):
    """x₀ = (y₀ − b)/a with σ²(x₀) = [σ_y0² + s_b² + x₀²·s_a² + 2x₀·cov(a,b)] / a²."""
    if fit.a == 0:
        raise ParseError("Slope is zero — cannot invert the calibration", code="degenerate")
    x0 = (y0 - fit.b) / fit.a
    var = (s_y0 ** 2 + fit.s_b ** 2 + x0 ** 2 * fit.s_a ** 2 + 2 * x0 * fit.cov) / fit.a ** 2
    return x0, sqrt(var) if var > 0 else mpf(0)


def general(columns: list[list], y: list) -> dict:
    """Linear least squares y = Σ_j p_j·f_j(x) with design columns f_j(xᵢ). Returns p, cov, ssr."""
    n, m = len(y), len(columns)
    if n <= m:
        raise ParseError(f"Need more than {m} points for a {m}-parameter fit", code="too_few")
    X = matrix(n, m)
    for i in range(n):
        for j in range(m):
            X[i, j] = mpf(columns[j][i])
    Y = matrix([mpf(v) for v in y])
    XtX = X.T * X
    XtY = X.T * Y
    from mpmath import inverse

    C = inverse(XtX)
    p = C * XtY
    res = [Y[i] - fsum(X[i, j] * p[j] for j in range(m)) for i in range(n)]
    ssr = fsum(r * r for r in res)
    s2 = ssr / (n - m)
    params = [p[j] for j in range(m)]
    cov = [[C[i, j] * s2 for j in range(m)] for i in range(m)]
    return {"p": params, "cov": cov, "ssr": ssr, "res": res, "df": n - m, "s": sqrt(s2)}


def outliers(fit: Fit, threshold) -> list[int]:
    """Indices whose |standardised residual| exceeds ``threshold`` (default 2.5 in the UI)."""
    if fit.n < 4:
        return []
    return [i for i, z in enumerate(fit.std_res) if abs(z) > threshold]


def compare_slopes(a1, s1, a2, s2):
    """z = |a1 − a2| / √(s1² + s2²)."""
    d = abs(a1 - a2)
    den = sqrt(s1 ** 2 + s2 ** 2)
    return d, (d / den if den > 0 else None)


def steps(fit: Fit, xs: str = "x", ys: str = "y", sig: int = 6) -> list[dict]:
    """Show-your-work steps using the guide's raw-sum notation (B.6–B.11)."""
    from .rounding import tex_sig as t

    S = fit.sums
    n = fit.n
    out = []
    if fit.kind == "ols":
        out.append({"title": "Sums (B.6)",
                    "latex": r"S_x=\sum x_i,\ S_y=\sum y_i,\ S_{xx}=\sum x_i^2,\ S_{xy}=\sum x_i y_i,\ S_{yy}=\sum y_i^2",
                    "substituted": rf"n={n},\ S_x={t(S['Sx'], sig)},\ S_y={t(S['Sy'], sig)},\ S_{{xx}}={t(S['Sxx'], sig)},\ S_{{xy}}={t(S['Sxy'], sig)},\ S_{{yy}}={t(S['Syy'], sig)}",
                    "result": ""})
        den = n * S["Sxx"] - S["Sx"] ** 2
        out.append({"title": f"Slope a (B.7) — {ys} vs {xs}", "latex": r"a=\frac{nS_{xy}-S_xS_y}{nS_{xx}-S_x^2}",
                    "substituted": rf"a=\frac{{{n}\cdot{t(S['Sxy'], sig)}-{t(S['Sx'], sig)}\cdot{t(S['Sy'], sig)}}}{{{n}\cdot{t(S['Sxx'], sig)}-({t(S['Sx'], sig)})^2}}",
                    "result": t(fit.a, sig + 2)})
        out.append({"title": "Intercept b (B.8)", "latex": r"b=\frac{1}{n}S_y-a\frac{1}{n}S_x",
                    "substituted": rf"b=\frac{{{t(S['Sy'], sig)}}}{{{n}}}-{t(fit.a, sig)}\cdot\frac{{{t(S['Sx'], sig)}}}{{{n}}}",
                    "result": t(fit.b, sig + 2)})
        out.append({"title": "Residual variance (B.9)", "latex": r"s_\varepsilon^2=\frac{1}{n(n-2)}\left[nS_{yy}-S_y^2-a^2(nS_{xx}-S_x^2)\right]",
                    "substituted": rf"s_\varepsilon^2=\frac{{1}}{{{n}\cdot{n - 2}}}\left[{n}\cdot{t(S['Syy'], sig)}-({t(S['Sy'], sig)})^2-({t(fit.a, sig)})^2\cdot{t(den, sig)}\right]",
                    "result": t(fit.s ** 2, sig)})
        out.append({"title": "Uncertainty of the slope (B.10)", "latex": r"s_a^2=\frac{n s_\varepsilon^2}{nS_{xx}-S_x^2}",
                    "substituted": rf"s_a=\sqrt{{\frac{{{n}\cdot{t(fit.s ** 2, sig)}}}{{{t(den, sig)}}}}}", "result": t(fit.s_a, sig)})
        out.append({"title": "Uncertainty of the intercept (B.11)", "latex": r"s_b^2=s_a^2\,\frac{1}{n}S_{xx}",
                    "substituted": rf"s_b=\sqrt{{({t(fit.s_a, sig)})^2\cdot\frac{{{t(S['Sxx'], sig)}}}{{{n}}}}}", "result": t(fit.s_b, sig)})
        out.append({"title": "Covariance of a and b", "latex": r"\operatorname{cov}(a,b)=-\bar{x}\,s_a^2",
                    "substituted": rf"\operatorname{{cov}}(a,b)=-{t(S['xm'], sig)}\cdot({t(fit.s_a, sig)})^2", "result": t(fit.cov, sig)})
    elif fit.kind == "origin":
        out.append({"title": f"Slope through the origin — {ys} vs {xs}", "latex": r"a=\frac{\sum x_iy_i}{\sum x_i^2}",
                    "substituted": rf"a=\frac{{{t(S['Sxy'], sig)}}}{{{t(S['Sxx'], sig)}}}", "result": t(fit.a, sig + 2)})
        out.append({"title": "Uncertainty of the slope", "latex": r"s_a^2=\frac{\sum (y_i-a x_i)^2}{(n-1)\sum x_i^2}",
                    "substituted": rf"s_a=\sqrt{{\frac{{{t(fit.ssr, sig)}}}{{{n - 1}\cdot{t(S['Sxx'], sig)}}}}}", "result": t(fit.s_a, sig)})
    else:
        out.append({"title": f"Weighted fit — {ys} vs {xs}", "latex": r"w_i=1/\sigma_i^2,\quad \chi^2=\sum w_i (y_i-a x_i-b)^2",
                    "substituted": rf"\chi^2={t(fit.chi2, sig)},\ \chi^2_\nu={t(fit.chi2_red, sig)}",
                    "result": rf"a={t(fit.a, sig + 2)},\ s_a^{{int}}={t(fit.s_a, sig)},\ s_a^{{ext}}={t(fit.s_a_ext, sig)}"})
    return out
