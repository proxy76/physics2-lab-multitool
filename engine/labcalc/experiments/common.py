"""Helpers shared by the experiment pipelines."""

from __future__ import annotations

from mpmath import mpf, sqrt

from .. import linfit
from ..parse import ParseError, is_blank, parse_number
from ..result import Result, num
from ..rounding import fmt_sig


def opt(params: dict, key: str, default):
    v = (params or {}).get(key)
    return default if v is None else v


def num_or_none(row: dict, key: str, field: str):
    v = row.get(key)
    if is_blank(v):
        return None
    return parse_number(v, field)


def rows_complete(rows: list, keys: list[str], prefix: str):
    """Parse rows; returns list of (index, id, {key: mpf}, raw_row) for rows with all keys present.

    Rows with *some* keys present are reported as incomplete; rows with all keys blank are ignored.
    """
    out, incomplete = [], []
    for i, row in enumerate(rows or []):
        present = [k for k in keys if not is_blank(row.get(k))]
        if not present:
            continue
        if len(present) < len(keys):
            incomplete.append(i)
            continue
        vals = {k: parse_number(row.get(k), f"{prefix}[{i}].{k}") for k in keys}
        out.append((i, row.get("id", str(i)), vals, row))
    return out, incomplete


def compare(res: Result, name: str, value, unc, ref, ref_unc=None, unit: str = "", label: str = "", ref_label: str = ""):
    """Relative deviation and z-score against a reference value (G6). Stores into extra.compare."""
    value, ref = mpf(value), mpf(ref)
    dev = (value - ref) / ref
    den2 = (mpf(unc) ** 2 if unc is not None else 0) + (mpf(ref_unc) ** 2 if ref_unc is not None else 0)
    z = abs(value - ref) / sqrt(den2) if den2 > 0 else None
    item = {"name": name, "label": label or name, "ref": fmt_sig(ref, 6), "ref_label": ref_label, "unit": unit,
            "dev_pct": fmt_sig(dev * 100, 3), "z": fmt_sig(z, 3) if z is not None else None,
            "verdict": None if z is None else ("compatible" if z <= 2 else "not compatible (z > 2)")}
    res.extra.setdefault("compare", []).append(item)
    return dev, z


def fit_warnings(res: Result, fit: linfit.Fit, ids: list, labels: list, threshold, what: str):
    flags = res.extra.setdefault("flags", {})
    for i in linfit.outliers(fit, threshold):
        flags.setdefault(str(ids[i]), {})["outlier"] = fmt_sig(fit.std_res[i], 3)
        res.warn("outlier", f"{what}: point {labels[i]} is {fmt_sig(abs(fit.std_res[i]), 2)} σ from the line — re-measure it?")
    if fit.n == 3 and fit.kind == "ols":
        res.info("few_points", f"{what}: only 3 points (1 degree of freedom) — the uncertainty is very rough.")


def fit_values(res: Result, prefix: str, fit: linfit.Fit, aunit: str = "", bunit: str = "", group: str | None = None):
    res.value(f"{prefix}.a", fit.a, fit.s_a, aunit, "slope a", group=group)
    if fit.kind in ("ols", "weighted"):
        res.value(f"{prefix}.b", fit.b, fit.s_b, bunit, "intercept b", group=group)
        res.value(f"{prefix}.cov", fit.cov, None, "", "cov(a, b)", group=group)
    if fit.r is not None:
        res.value(f"{prefix}.r", fit.r, None, "", "correlation r", sig=6, group=group)
    res.value(f"{prefix}.R2", fit.R2, None, "", "R²", sig=6, group=group)
    res.value(f"{prefix}.n", fit.n, None, "", "points n", group=group)
    if fit.chi2_red is not None:
        res.value(f"{prefix}.chi2_red", fit.chi2_red, None, "", "χ²_red", sig=3, group=group)


def series_points(name, xs, ys, yerr=None, labels=None, ids=None, flags=None, xerr=None):
    s = {"name": name, "kind": "points", "x": [num(v) for v in xs], "y": [num(v) for v in ys]}
    if yerr is not None:
        s["yerr"] = [num(v) for v in yerr]
    if xerr is not None:
        s["xerr"] = [num(v) for v in xerr]
    if labels is not None:
        s["labels"] = labels
    if ids is not None:
        s["ids"] = [str(i) for i in ids]
        if flags:
            s["highlight"] = [str(i) in flags and "outlier" in flags[str(i)] for i in ids]
    return s


def series_line(name, fun, x0, x1, n: int = 2, dash: bool = False):
    x0, x1 = mpf(x0), mpf(x1)
    xs = [x0 + (x1 - x0) * k / (n - 1) for k in range(n)]
    return {"name": name, "kind": "line", "x": [num(v) for v in xs], "y": [num(fun(v)) for v in xs], "dash": dash}


def fit_plot(id, title, x, y, fit: linfit.Fit, yerr=None, ids=None, labels=None, flags=None, name="data",
             line_name="least-squares line", x_from=None, x_to=None, extra_series=None):
    xs = fit.x
    lo = min(xs) if x_from is None else mpf(x_from)
    hi = max(xs) if x_to is None else mpf(x_to)
    pad = (hi - lo) * mpf("0.05")
    lo2 = lo - pad if x_from is None else lo
    hi2 = hi + pad if x_to is None else hi
    series = [series_points(name, xs, fit.y, yerr, labels, ids, flags),
              series_line(line_name, fit.predict, lo2, hi2)]
    if extra_series:
        series.extend(extra_series)
    return {"id": id, "title": title, "x": x, "y": y, "series": series,
            "residuals": {"x": [num(v) for v in xs], "y": [num(v) for v in fit.res], "z": [num(v) for v in fit.std_res],
                          "ids": [str(i) for i in ids] if ids else None}}


def need(n: int, k: int, what: str):
    if n < k:
        raise ParseError(f"{what}: enter at least {k} complete rows (currently {n})", code="too_few")
