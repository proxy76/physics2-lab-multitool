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
    r2 = run("exp2", ex["exp2"])
    for i in (1, 2, 3):
        assert mpf("20") < val(r2, f"tau{i}") < mpf("1000")  # μs
    r5 = run("exp5", ex["exp5"])
    assert val(r5, "lambda1") > 0 and val(r5, "lambda2") > 0


# ------------------------------------------------------------------------------------------------
# precision self-check (dps 50 vs 100)
# ------------------------------------------------------------------------------------------------


@pytest.mark.parametrize("exp", ["exp2", "exp3", "exp4", "exp5", "exp6", "exp7"])
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
    ("exp7", "h", TRUTH["exp7"]["h"], 2, None),
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


def test_exp5_near_points_not_flagged_for_remeasure():
    # The example data includes r = 2–4 cm, where D²/16r² is 7–30 % too large: those points sit far
    # below the Method II line by design and must be explained, not sent back for re-measurement.
    ex = golden.examples()["exp5"]
    res = run("exp5", ex)
    flags = res["extra"]["flags"]
    assert not any("outlier" in f for f in flags.values())
    assert "expected" in flags["r0"]
    assert not any(w["code"] == "outlier" for w in res["warnings"])


def test_tables_echo_readings_as_typed():
    p = golden.examples()["exp5"]
    p["rows"][1]["r"] = "3,0"  # decimal comma keeps its digit
    row = run("exp5", p)["tables"][0]["rows"]
    assert row[0]["N"] == p["rows"][0]["N"] and "×" not in row[0]["N"]
    assert row[1]["r"] == "3.0"
    p6 = golden.examples()["exp6"]
    p6["materials"][1]["rows"][1]["x"] = "0.30"
    t6 = next(t for t in run("exp6", p6)["tables"] if t["id"] == "data.Fe")
    assert t6["rows"][1]["x"] == "0.30"


def test_exp5_real_mistake_flagged_against_exact_model():
    p = golden.make("exp5", random.Random(7))
    p["rows"][5]["N"] = str(int(int(p["rows"][5]["N"]) * 1.15))  # 15 % mis-read count at r = 8 cm
    res = run("exp5", p)
    assert "outlier" in res["extra"]["flags"][p["rows"][5]["id"]]
    assert any(w["code"] == "outlier" and "Method I" in w["message"] for w in res["warnings"])


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


# an earlier team's sheet (2026-10): λ written as 578/546/436/405, the 4th (violet) filter was defective
TEAM7 = [("yellow", "578", "0.483 0.482 0.484 0.485 0.478 0.492 0.490 0.487 0.489 0.494"),
         ("green", "546", "0.653 0.649 0.648 0.647 0.655 0.657 0.652 0.65 0.651 0.658"),
         ("blue", "436", "1.086 1.084 1.1 1.083 1.082"),
         ("violet", "405", "1.04 1.035 1.045 1.042 1.038")]


def test_exp7_team_sheet_nu_column_and_defective_filter():
    filters = [{"id": f"f{i}", "color": c, "lambda": lam, "readings": r.split()} for i, (c, lam, r) in enumerate(TEAM7)]
    res = run("exp7", {"filters": filters})
    data = {r["filter"]: r for r in next(t for t in res["tables"] if t["id"] == "data")["rows"]}
    assert data["yellow"]["nu"] == "5.187" and data["green"]["nu"] == "5.491"  # ν = c/λ, 10¹⁴ s⁻¹
    assert data["yellow"]["U0"].startswith("0.486") and data["green"]["U0"].startswith("0.652")
    sheet = next(t for t in res["tables"] if t["id"] == "sheet")
    assert [c["key"] for c in sheet["columns"]][1:5] == ["filter", "lambda", "nu", "U"]  # ν right next to λ
    assert len(sheet["rows"]) == 30 and sheet["rows"][0]["nu"] == "5.187" and sheet["rows"][1]["nu"] == ""
    assert sheet["rows"][9]["U"] == "0.494" and sheet["rows"][17]["U"] == "0.65"  # as typed
    chk = {c["pair"]: c for c in res["extra"]["difference_check"]}
    assert "measured" in chk["U₀(435.8 nm) − U₀(546.1 nm)"]  # "436" still matches 435.8
    assert any(w["code"] == "filter_defective" and "violet" in w["message"] for w in res["warnings"])

    filters[3]["excluded"] = True
    res = run("exp7", {"filters": filters})
    assert not any(w["code"] in ("filter_defective", "not_increasing") for w in res["warnings"])
    assert mpf("5e-34") < val(res, "h") < mpf("6.5e-34")


def test_guide_constants_reproduce_eq48():
    r = api.dispatch("exp4.analyze", {**golden.make("exp4"), "C_mode": "guide"}, "guide")
    assert r["ok"]
    assert r["result"]["values"]["C"]["value"].startswith("3.3")


@pytest.mark.parametrize("exp", ["exp2", "exp3", "exp4", "exp5", "exp6", "exp7"])
def test_json_serialisable(exp):
    import json

    for params in (golden.examples()[exp], golden.make(exp)):
        out = json.loads(api.dispatch_json(json.dumps({"id": "x", "tool": f"{exp}.analyze", "params": params, "options": {"selfcheck": True}})))
        assert out["ok"], out.get("error")


def test_exp6_guide_one_table_is_enough():
    # The Analysis tab works material by material: Al alone (plus the shared x = 0 spectrum) gives
    # the worked cells, graph scales, sums table, μ ± σ and the conclusions row.
    p = golden.examples()["exp6"]
    al = p["materials"][0]["rows"]
    p["zero"] = {k: al[0][k] for k in ("H", "L", "R")}
    p["materials"][0]["rows"] = al[1:]
    for m in p["materials"][1:]:
        m["rows"] = []
    p["materials"][0]["graphical"] = {"x1": "0", "y1": "0", "x2": "6", "y2": "1.22"}
    res = run("exp6", p)
    g = res["extra"]["guide"]["Al"]
    assert g["ready"] and g["rows"][0]["shared"] and g["rows"][0]["RmL"] == "80"
    assert g["rows"][0]["A"] == "6104" and g["A0"] == "6104"  # ½·(480 − 400)·152.6
    assert g["rows"][0]["ratio"] == "1.000" and g["rows"][0]["y"] == "0.000"  # A₀/A₀ = 1, ln 1 = 0
    assert g["factor_ok"] and g["graph"]["x"]["from"] == "0"
    f = g["fit"]
    assert f["n"] == 7 and len(f["sums"]) == 7 and f["report"].endswith("cm⁻¹")
    assert rel_digits(mpf(f["mu"]), val(res, "Al.mu")) >= 5
    assert g["conclusion"]["Z"] == "13" and g["graph_mu"]["mu"] == "0.203"
    assert "--" not in "".join(s["substituted"] for s in f["steps"])  # negative slope is bracketed
    # Fe and Pb have only the shared x = 0 row: one usable point, not ready, no fit
    assert not res["extra"]["guide"]["Fe"]["ready"] and "fit" not in res["extra"]["guide"]["Fe"]


def test_exp6_ratio_and_log_by_hand():
    # Professor's version: t is fixed (100 s), so y = ln(A₀/A(x)) and μ = +slope. Check every cell
    # against a direct computation and that μ equals the slope of ln A vs x with the sign flipped.
    from mpmath import log

    from labcalc import linfit

    p = golden.examples()["exp6"]
    res = run("exp6", p)
    for m in p["materials"]:
        sym = m["symbol"]
        area = [(mpf(r["R"]) - mpf(r["L"])) * mpf(r["H"]) / 2 for r in m["rows"]]
        A0 = area[0]
        tab = next(t for t in res["tables"] if t["id"] == f"data.{sym}")
        for r, A in zip(tab["rows"], area):
            assert rel_digits(mpf(r["ratio"].replace("−", "-")), A0 / A) >= 5
            if A != A0:
                assert rel_digits(mpf(r["y"].replace("−", "-")), log(A0 / A)) >= 5
        assert "t" not in {c["key"] for c in tab["columns"]}
        f = linfit.ols([mpf(r["x"]) for r in m["rows"]], [log(A) for A in area])
        assert rel_digits(val(res, f"{sym}.mu"), -f.a) >= 25  # values are serialised to 30 digits
        assert abs(val(res, f"{sym}.fit.b")) < mpf("0.1")  # the line passes near (0, 0)


def test_exp6_needs_x0():
    p = golden.examples()["exp6"]
    for m in p["materials"]:
        m["rows"] = [r for r in m["rows"] if r["x"] != "0"]
    res = run("exp6", p)
    assert "Al.mu" not in res["values"]
    assert any(w["code"] == "need_zero" for w in res["warnings"])


# ------------------------------------------------------------------------------------------------
# Exp 2 — dead time, two-source method
# ------------------------------------------------------------------------------------------------

# The team's final sheet (photographed, 2026-11-09): T = 60 s, three sets.
EXP2_SHEET = [("60", "76", "7047", "8630", "15358"), ("60", "67", "7075", "8542", "15235"), ("60", "77", "6969", "8666", "14979")]


def exp2_sheet():
    return {"sets": [dict(zip(("T", "Nb", "N1", "N2", "N12"), r), id=f"s{i}") for i, r in enumerate(EXP2_SHEET)]}


def test_exp2_exact_eq23():
    # n'_12b chosen so that eq. 2.3 holds exactly: the headline recovers τ to ≥ 30 digits
    res = run("exp2", golden.make("exp2", model="approx"))
    for i in (1, 2, 3):
        assert rel_digits(val(res, f"tau{i}") / mpf("1e6"), TRUTH["exp2"]["tau"]) >= 30


def test_exp2_exact_physics():
    # non-paralysable detector: the exact solution of eq. 2.2 recovers τ; eq. 2.3 (first order) is ~2 % low
    res = run("exp2", golden.make("exp2"))
    assert rel_digits(val(res, "adv.exact1") / mpf("1e6"), TRUTH["exp2"]["tau"]) >= 30
    assert mpf("0.95") < val(res, "tau1") / val(res, "adv.exact1") < 1


def test_exp2_team_sheet():
    # Every number the sheet writes, to the sheet's precision.
    res = run("exp2", exp2_sheet())
    g = res["extra"]["guide"]["sets"]
    assert [(s["nb"], s["n1"], s["n2"], s["n12"]) for s in g][0] == ("1.27", "117.45", "143.83", "255.97")
    assert [s["X"] for s in g] == ["4.05", "5.25", "9.65"]
    assert [s["Y"] for s in g] == ["33138.00", "33007.73", "32911.10"]
    assert [s["tau_us"] for s in g] == ["122.22", "159.05", "293.21"]
    assert [s["sX"] for s in g] == ["2.94", "2.93", "2.92"]
    assert [s["sY"] for s in g] == ["547.6", "544.2", "544.8"]
    assert [s["s_tau_us"] for s in g] == ["88.7", "88.8", "88.9"]
    assert [s["report"] for s in g] == ["(1.2 ± 0.9)×10² μs", "(1.6 ± 0.9)×10² μs", "(2.9 ± 0.9)×10² μs"]
    assert g[0]["pm"] == "122.22 ± 88.7"
    # X from the counts (243/60 = 4.05); the sheet's 2-decimal rates would give 4.04
    assert g[0]["Ncomb"] == "243" and g[0]["X_rates"] == "4.04"
    sheet = next(t for t in res["tables"] if t["id"] == "sheet")
    assert [r["no"] for r in sheet["rows"]] == ["1", "2", "3"] and sheet["rows"][2]["N12"] == "14979"
    concl = next(t for t in res["tables"] if t["id"] == "conclusions")
    assert [r["tau"] for r in concl["rows"]] == ["122.22", "159.05", "293.21"]
    assert not [w for w in res["warnings"] if w["severity"] == "warn"]
    # the full gradient (X and Y share the rates) gives a slightly smaller σ
    assert mpf("80") < val(res, "adv.grad1") < mpf("88.7")


def test_exp2_negative_tau_and_partial_sets():
    p = exp2_sheet()
    p["sets"][1]["N12"] = "15700"  # n12 + nb > n1 + n2
    p["sets"].append({"id": "s3", "T": "60", "N1": "7000"})  # set 4 started: source 1 only
    res = run("exp2", p)
    assert any(w["code"] == "negative" and "Set 2" in w["message"] for w in res["warnings"])
    assert val(res, "tau2") < 0
    g = res["extra"]["guide"]["sets"]
    assert len(g) == 4 and not g[3]["complete"] and g[3]["n1"] == "116.67" and "tau_us" not in g[3]
    assert "tau4" not in res["values"]


def test_exp2_no_complete_set():
    res = run("exp2", {"sets": [{"id": "a", "T": "60", "Nb": "70"}]})
    assert any(w["code"] == "need_sets" for w in res["warnings"]) and not res["values"]


def test_exp2_field_errors():
    p = exp2_sheet()
    p["sets"][0]["T"] = "0"
    r = api.dispatch("exp2.analyze", p)
    assert not r["ok"] and r["error"]["field"] == "sets[0].T"


def test_exp2_background_check():
    p = exp2_sheet()
    p["background0"] = {"N": "300", "T": "60"}
    res = run("exp2", p)
    assert any(w["code"] == "background" for w in res["warnings"])


@pytest.mark.slow
def test_coverage_exp2_poisson_sigma():
    """Exp 2 with Poisson counts: the quotient-rule σ_τ of the sheet is honest (≈ 95 % within 2σ)."""
    f = coverage_z("exp2", "tau1", mpf(TRUTH["exp2"]["tau"]) * mpf("1e6"), trials=1000)
    assert 0.93 <= f <= 0.98, f


def test_exp2_excluded_set():
    p = exp2_sheet()
    p["sets"][2]["excluded"] = True
    res = run("exp2", p)
    assert "tau3" not in res["values"] and "tau2" in res["values"]
    sheet = next(t for t in res["tables"] if t["id"] == "sheet")
    assert len(sheet["rows"]) == 3 and sheet["rows"][2]["excluded"]
    concl = next(t for t in res["tables"] if t["id"] == "conclusions")
    assert [r["no"] for r in concl["rows"]] == ["1", "2"]
