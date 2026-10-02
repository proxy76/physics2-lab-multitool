"""Golden datasets (brief §4.6): zero-noise recovery to ≥ 30 digits, honest uncertainties under noise,
dps-50 vs dps-100 self-check, dimension sanity, and field-level errors."""

import math
import random

import pytest
from mpmath import mpf
from scipy import stats as sstats

from labcalc import api, golden

from conftest import rel_digits

TRUTH = golden.TRUTH


def run(exp, params, **opts):
    r = api.dispatch(f"{exp}.analyze", params, "codata", opts)
    assert r["ok"], r.get("error")
    return r["result"]


def val(res, key):
    return mpf(res["values"][key]["value"])


def unc(res, key):
    return mpf(res["values"][key]["unc"])


# ------------------------------------------------------------------------------------------------
# zero-noise recovery
# ------------------------------------------------------------------------------------------------


def test_exp5_exact_method1():
    res = run("exp5", golden.make("exp5"))
    assert rel_digits(val(res, "lambda1"), TRUTH["exp5"]["lambda"]) >= 30
    assert rel_digits(val(res, "nb"), TRUTH["exp5"]["nb"]) >= 30


def test_exp5_exact_method2_on_approx_model():
    res = run("exp5", golden.make("exp5", model="approx"))
    assert rel_digits(val(res, "lambda2"), TRUTH["exp5"]["lambda"]) >= 30
    assert abs(val(res, "m2.b")) < mpf("1e-30")


def test_exp6_exact():
    res = run("exp6", golden.make("exp6"))
    for sym in ("Al", "Fe", "Pb"):
        assert rel_digits(val(res, f"{sym}.mu"), TRUTH["exp6"][sym]) >= 30


def test_exp7_exact():
    res = run("exp7", golden.make("exp7"))
    assert rel_digits(val(res, "h"), TRUTH["exp7"]["h"]) >= 30
    assert rel_digits(val(res, "W"), TRUTH["exp7"]["W_eV"]) >= 30


def test_exp3_exact():
    res = run("exp3", golden.make("exp3"))
    assert rel_digits(val(res, "R"), TRUTH["exp3"]["R"]) >= 30
    assert rel_digits(val(res, "A"), TRUTH["exp3"]["A"]) >= 30
    assert rel_digits(val(res, "B"), TRUTH["exp3"]["B"]) >= 30
    assert rel_digits(val(res, "R_intercept"), TRUTH["exp3"]["R"]) >= 30


def test_exp4_exact():
    res = run("exp4", golden.make("exp4"))
    assert rel_digits(val(res, "d1"), TRUTH["exp4"]["d1"]) >= 30
    assert rel_digits(val(res, "d2"), TRUTH["exp4"]["d2"]) >= 30


# ------------------------------------------------------------------------------------------------
# dimension sanity (brief §4.6)
# ------------------------------------------------------------------------------------------------


def test_dimension_sanity():
    ex = golden.examples()
    r4 = run("exp4", ex["exp4"])
    assert mpf("5e-11") < val(r4, "d1") < mpf("5e-10")
    r3 = run("exp3", ex["exp3"])
    assert mpf("5e6") < val(r3, "R") < mpf("5e7")
    r7 = run("exp7", ex["exp7"])
    assert mpf("1e-34") < val(r7, "h") < mpf("1e-33")
    r6 = run("exp6", ex["exp6"])
    for s in ("Al", "Fe", "Pb"):
        assert mpf("0.1") <= val(r6, f"{s}.mu") <= mpf("2")
    r5 = run("exp5", ex["exp5"])
    assert val(r5, "lambda1") > 0 and val(r5, "lambda2") > 0


# ------------------------------------------------------------------------------------------------
# precision self-check (dps 50 vs 100)
# ------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("exp", ["exp3", "exp4", "exp5", "exp6", "exp7"])
def test_selfcheck(exp):
    res = run(exp, golden.examples()[exp], selfcheck=True)
    sc = res["selfcheck"]
    assert sc["ok"], sc
    assert sc["min_digits"] >= 40


# ------------------------------------------------------------------------------------------------
# honest uncertainties: 1000 seeded noisy trials (decision D19)
# ------------------------------------------------------------------------------------------------

TRIALS = 1000


def coverage(exp, key, truth, df, make_kw=None, trials=TRIALS):
    inside2, inside_t = 0, 0
    tq = sstats.t.ppf(0.975, df)
    for seed in range(trials):
        rng = random.Random(10_000 + seed)
        res = run(exp, golden.make(exp, rng, **(make_kw or {})))
        z = abs(val(res, key) - mpf(truth)) / unc(res, key)
        inside2 += z <= 2
        inside_t += z <= tq
    p2 = 2 * sstats.t.cdf(2, df) - 1
    f2, ft = inside2 / trials, inside_t / trials
    tol = 3.5 * math.sqrt(p2 * (1 - p2) / trials)
    return f2, ft, p2, tol


@pytest.mark.slow
@pytest.mark.parametrize("exp,key,truth,df,kw", [
    ("exp6", "Pb.mu", TRUTH["exp6"]["Pb"], 5, None),
    ("exp6", "Al.mu", TRUTH["exp6"]["Al"], 5, None),
    ("exp7", "h", TRUTH["exp7"]["h"], 3, None),
    ("exp4", "d1", TRUTH["exp4"]["d1"], 4, None),
    ("exp4", "d2", TRUTH["exp4"]["d2"], 4, None),
])
def test_coverage_homoscedastic(exp, key, truth, df, kw):
    f2, ft, p2, tol = coverage(exp, key, truth, df, kw)
    assert abs(f2 - p2) <= tol, (f2, p2)
    assert ft >= 0.93, ft


def coverage_z(exp, key, truth, make_kw=None, trials=TRIALS):
    """Fraction of trials with |value − truth| ≤ 2σ when σ is propagated from *known* data errors."""
    inside = 0
    for seed in range(trials):
        res = run(exp, golden.make(exp, random.Random(20_000 + seed), **(make_kw or {})))
        inside += abs(val(res, key) - mpf(truth)) <= 2 * unc(res, key)
    return inside / trials


@pytest.mark.slow
@pytest.mark.parametrize("key,kw", [("lambda1_count", None), ("lambda2_count", {"model": "approx"})])
def test_coverage_exp5_counting_sigma(key, kw):
    """Exp 5 with Poisson counts: the counting-statistics σ is honest (≈ 95.4 % within 2σ)."""
    f = coverage_z("exp5", key, TRUTH["exp5"]["lambda"], kw)
    assert 0.93 <= f <= 0.975, f


@pytest.mark.slow
def test_exp5_guide_sigma_undercovers_and_is_flagged():
    """Documents why the honesty warning exists: B.10's σ under-covers for Poisson data spanning ×100."""
    res = run("exp5", golden.make("exp5", random.Random(1)))
    assert any(w["code"] == "honesty" for w in res["warnings"])
    f = coverage_z("exp5", "lambda1", TRUTH["exp5"]["lambda"], None, trials=300)
    assert f < 0.9


@pytest.mark.slow
def test_coverage_exp3_complete_sigma():
    """Exp 3: σ fully propagated from σ_x and the calibration covariance is honest."""
    f = coverage_z("exp3", "R_prop", TRUTH["exp3"]["R"], {"sigma_x": 0.02})
    assert 0.93 <= f <= 0.98, f
    f2, ft, p2, tol = coverage("exp3", "R_total", TRUTH["exp3"]["R"], 3, {"sigma_x": 0.02}, trials=500)
    assert ft >= 0.93, ft


# ------------------------------------------------------------------------------------------------
# errors and partial data
# ------------------------------------------------------------------------------------------------


def test_field_error_reported():
    p = golden.make("exp5")
    p["rows"][2]["N"] = "12,3,4"
    r = api.dispatch("exp5.analyze", p)
    assert not r["ok"] and r["error"]["field"] == "rows[2].N"


def test_partial_data_does_not_fail():
    p = golden.make("exp5")
    p["rows"] = p["rows"][:1]
    res = run("exp5", p)
    assert "lambda2" not in res["values"]
    assert any(w["code"] == "need_rows" for w in res["warnings"])


def test_outlier_flagged():
    p = golden.make("exp6")
    p["materials"][2]["rows"][3]["H"] = str(float(mpf(p["materials"][2]["rows"][3]["H"])) * 1.6)
    res = run("exp6", p)
    assert any(w["code"] == "outlier" for w in res["warnings"])
    assert "Pb3" in res["extra"]["flags"]


def test_exp3_misidentification_warning():
    p = golden.make("exp3")
    p["h"][0]["n"], p["h"][1]["n"] = "4", "3"  # swap Hα / Hβ labels
    res = run("exp3", p)
    assert any(w["code"] == "misid" for w in res["warnings"])


def test_exp4_hv_warning():
    p = golden.make("exp4")
    p["rows"][0]["U"] = "6"
    res = run("exp4", p)
    assert any(w["code"] == "hv" for w in res["warnings"])


def test_exp7_difference_check():
    res = run("exp7", golden.make("exp7"))
    chk = {c["pair"]: c for c in res["extra"]["difference_check"]}
    assert chk["U₀(404.7 nm) − U₀(578.2 nm)"]["ratio"] == "1.00"


def test_guide_constants_reproduce_eq48():
    r = api.dispatch("exp4.analyze", {**golden.make("exp4"), "C_mode": "guide"}, "guide")
    assert r["ok"]
    assert r["result"]["values"]["C"]["value"].startswith("3.3")
