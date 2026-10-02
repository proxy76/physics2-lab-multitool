"""Independent cross-checks (numpy / scipy / uncertainties) — test-only dependencies."""

import math

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from mpmath import mpf
from scipy import optimize, stats
from uncertainties import correlated_values, ufloat
from uncertainties import umath

from labcalc import linfit, montecarlo, propagate


def rel(a, b):
    return abs(float(a) - float(b)) / max(abs(float(b)), 1e-300)


@settings(max_examples=60, deadline=None)
@given(st.integers(min_value=0, max_value=10_000), st.integers(min_value=4, max_value=25))
def test_ols_vs_numpy_scipy(seed, n):
    rng = np.random.default_rng(seed)
    x = np.sort(rng.uniform(-5, 20, n))
    if np.ptp(x) < 1:
        x = np.linspace(-5, 20, n)
    y = 2.7 * x - 1.3 + rng.normal(0, 0.8, n)
    f = linfit.ols([repr(float(v)) for v in x], [repr(float(v)) for v in y])
    lr = stats.linregress(x, y)
    p, cov = np.polyfit(x, y, 1, cov="unscaled")
    assert rel(f.a, lr.slope) < 1e-10
    assert rel(f.b, lr.intercept) < 1e-10
    assert rel(f.s_a, lr.stderr) < 1e-10
    assert rel(f.s_b, lr.intercept_stderr) < 1e-10
    assert rel(f.r, lr.rvalue) < 1e-10
    resid = y - np.polyval(p, x)
    s2 = (resid @ resid) / (n - 2)
    assert rel(f.cov, cov[0, 1] * s2) < 1e-9


def test_origin_vs_numpy():
    rng = np.random.default_rng(1)
    x = np.linspace(0.5, 8, 9)
    y = 3.3 * x + rng.normal(0, 0.2, 9)
    f = linfit.origin([repr(float(v)) for v in x], [repr(float(v)) for v in y])
    A = x[:, None]
    a, ssr, *_ = np.linalg.lstsq(A, y, rcond=None)
    assert rel(f.a, a[0]) < 1e-12
    assert rel(f.s_a, math.sqrt(ssr[0] / (len(x) - 1) / (x @ x))) < 1e-12


def test_weighted_vs_numpy_and_curve_fit():
    rng = np.random.default_rng(7)
    x = np.linspace(1, 10, 8)
    sig = rng.uniform(0.1, 0.6, 8)
    y = 1.5 * x + 0.7 + rng.normal(0, sig)
    f = linfit.weighted([repr(float(v)) for v in x], [repr(float(v)) for v in y], [repr(float(v)) for v in sig])
    p, c_int = np.polyfit(x, y, 1, w=1 / sig, cov="unscaled")
    _, c_ext = np.polyfit(x, y, 1, w=1 / sig, cov=True)
    assert rel(f.a, p[0]) < 1e-11 and rel(f.b, p[1]) < 1e-11
    assert rel(f.s_a, math.sqrt(c_int[0, 0])) < 1e-11
    assert rel(f.s_a_ext, math.sqrt(c_ext[0, 0])) < 1e-10
    assert rel(f.cov, c_int[0, 1]) < 1e-10
    # iterative optimiser agrees to its own tolerance
    p_cf, _ = optimize.curve_fit(lambda t, a, b: a * t + b, x, y, sigma=sig, absolute_sigma=True)
    assert rel(f.a, p_cf[0]) < 1e-6


def test_inverse_prediction_vs_uncertainties():
    x = [1, 2, 3, 4, 5, 6]
    y = ["2.1", "3.9", "6.2", "7.8", "10.1", "12.2"]
    f = linfit.ols(x, y)
    a, b = correlated_values([float(f.a), float(f.b)], [[float(f.s_a) ** 2, float(f.cov)], [float(f.cov), float(f.s_b) ** 2]])
    y0 = ufloat(8.5, 0.2)
    ref = (y0 - b) / a
    x0, s = linfit.inverse_predict(f, mpf("8.5"), mpf("0.2"))
    assert rel(x0, ref.n) < 1e-12
    assert rel(s, ref.s) < 1e-9


@pytest.mark.parametrize("expr,vals,fn", [
    ("sqrt(B/(x-A))", {"B": ("2.5", "0.02"), "x": ("7.1", "0.05"), "A": ("1.2", "0.03")},
     lambda B, x, A: umath.sqrt(B / (x - A))),
    ("x*y^2/z", {"x": ("3.0", "0.1"), "y": ("2.0", "0.05"), "z": ("5.0", "0.2")}, lambda x, y, z: x * y ** 2 / z),
    ("log(a)*exp(-b)", {"a": ("12", "0.3"), "b": ("0.5", "0.01")}, lambda a, b: umath.log(a) * umath.exp(-b)),
])
def test_general_vs_uncertainties(expr, vals, fn):
    variables = {k: (mpf(v[0]), mpf(v[1])) for k, v in vals.items()}
    r = propagate.general(expr, variables)
    ref = fn(*[ufloat(float(v[0]), float(v[1])) for v in vals.values()])
    assert rel(r["f"], ref.n) < 1e-12
    assert rel(r["sigma"], ref.s) < 1e-9
    total = sum(float(t["share"]) for t in r["terms"])
    assert abs(total - 1) < 1e-12  # no correlations → budget sums to 100 %


def test_general_with_correlation():
    variables = {"a": (mpf("2.0"), mpf("0.1")), "b": (mpf("3.0"), mpf("0.2"))}
    r = propagate.general("a/b", variables, corr=[[1, "0.6"], ["0.6", 1]])
    a, b = correlated_values([2.0, 3.0], [[0.01, 0.6 * 0.02], [0.6 * 0.02, 0.04]])
    ref = a / b
    assert rel(r["sigma"], ref.s) < 1e-9


def test_quick_rules():
    f, s, rel_, _ = propagate.quick("sum", mpf(3), mpf("0.3"), mpf(4), mpf("0.4"))
    assert f == 7 and abs(s - mpf("0.5")) < mpf("1e-40")
    f, s, rel_, _ = propagate.quick("quotient", mpf(6), mpf("0.06"), mpf(3), mpf("0.03"))
    assert abs(rel_ - mpf(2).sqrt() / 100) < mpf("1e-40")
    f, s, rel_, _ = propagate.quick("power", mpf(2), mpf("0.02"), k=mpf(-2))
    assert abs(rel_ - mpf("0.02")) < mpf("1e-40")


def test_mc_matches_linear_for_linear_function():
    V = [[0.04, 0.0], [0.0, 0.09]]
    r = montecarlo.run(lambda x, y: 2 * x - 3 * y, [1.0, 2.0], V, n=200_000, seed=3)
    lin_sd = math.sqrt(4 * 0.04 + 9 * 0.09)
    assert abs(r["mean"] - (2 - 6)) < 4 * lin_sd / math.sqrt(r["n"])
    assert abs(r["sd"] / lin_sd - 1) < 0.01


def test_mc_correlated():
    V = [[1.0, 0.8], [0.8, 1.0]]
    r = montecarlo.run(lambda x, y: x - y, [0.0, 0.0], V, n=200_000, seed=5)
    assert abs(r["sd"] - math.sqrt(0.4)) < 0.01


def test_propagate_rejects_unknown_names():
    from labcalc.parse import ParseError

    with pytest.raises(ParseError):
        propagate.general("x + __import__('os')", {"x": (mpf(1), mpf("0.1"))})
    with pytest.raises(ParseError):
        propagate.general("x + y", {"x": (mpf(1), mpf("0.1"))})
    with pytest.raises(ParseError):
        propagate.general("sqrt(x)", {"x": (mpf(-1), mpf("0.1"))})
