from datetime import date

from mpmath import mpf, sqrt

from labcalc import constants, counting, decay, graphical, stats, units


def test_describe():
    d = stats.describe([mpf(v) for v in ["1", "2", "3", "4"]])
    assert d["mean"] == mpf("2.5")
    assert abs(d["s"] - sqrt(mpf(5) / 3)) < mpf("1e-45")
    assert abs(d["sem"] - sqrt(mpf(5) / 3) / 2) < mpf("1e-45")


def test_counting():
    n, s = counting.rate(mpf(10000), mpf(100))
    assert n == 100 and s == 1
    d, sd = counting.subtract(mpf(100), mpf(1), mpf(2), mpf("0.1"))
    assert d == 98 and abs(sd - sqrt(mpf("1.01"))) < mpf("1e-45")
    t, N = counting.planner(mpf(50), mpf(1) / 100)
    assert abs(t - 200) < mpf("1e-40") and abs(N - 10000) < mpf("1e-40")


def test_planner_with_background():
    t, N = counting.planner(mpf(10), mpf("0.05"), nb=mpf(1), tb=mpf(600))
    assert abs(sqrt(mpf(11) / t + mpf(1) / 600) / 10 - mpf("0.05")) < mpf("1e-40")


def test_units_spectral():
    k = constants.get("codata")
    e_eV = units.convert(mpf("500"), "nm", "eV", k)
    assert abs(e_eV - k["hc_eVnm"] / 500) < mpf("1e-40")
    assert abs(units.convert(e_eV, "eV", "nm", k) - 500) < mpf("1e-40")
    assert units.convert(mpf(1), "Ci", "Bq", k) == mpf("3.7e10")
    assert units.convert(mpf("2.5"), "cm", "mm", k) == 25
    assert units.convert(mpf("1.25"), "cm⁻¹", "m⁻¹", k) == 125
    assert abs(units.convert(mpf("1"), "cm⁻¹", "eV", k) - k["hc_eVnm"] * mpf("1e-7")) < mpf("1e-40")


def test_unit_latex():
    assert units.unit_latex("cm²/g") == "cm^{2}/g"
    assert units.unit_latex("J·s") == r"J\cdot s"
    assert units.unit_latex("m⁻¹") == "m^{-1}"


def test_constants_derived():
    k = constants.get("codata")
    from fractions import Fraction

    exact = Fraction(662607015, 10 ** 42) * 299792458 / Fraction(1602176634, 10 ** 28) * 10 ** 9
    assert abs(k["hc_eVnm"] - mpf(exact.numerator) / exact.denominator) < mpf("1e-45")
    assert abs(k["RH"] - mpf("10967758.34")) < mpf("0.01")
    g = constants.get("guide", "exp4")
    assert g["h"] == mpf("6.63e-34") and g["e"] == mpf("1.6e-19")


def test_graphical():
    a, b = graphical.two_point(mpf(1), mpf(3), mpf(5), mpf(11))
    assert a == 2 and b == 1
    mid, s = graphical.max_min(mpf("2.2"), mpf("1.8"))
    assert mid == 2 and abs(s - mpf("0.2")) < mpf("1e-45")
    sc = graphical.axis_scale(mpf("0.11"), mpf("0.45"), 18)
    assert sc["scale"] == mpf("0.02") and sc["origin"] == mpf("0.1") and sc["ok"]


def test_decay():
    A, sA, dt = decay.correct(mpf(1000), mpf(10), date(2000, 1, 1), date(2030, 1, 1), mpf("30.08"))
    assert abs(dt - mpf(10958) / mpf("365.25")) < mpf("1e-40")
    assert abs(A - 1000 * mpf(2) ** (-dt / mpf("30.08"))) < mpf("1e-40")


def test_material():
    m = constants.material("Pb")
    assert abs(m["mu"] - mpf("1.102e-1") * mpf("11.35")) < mpf("1e-40")
