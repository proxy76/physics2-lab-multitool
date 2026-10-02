"""NIST StRD certified linear-regression datasets (values read from the unmodified .dat files)."""

import re

import pytest
from mpmath import mpf

from labcalc import linfit

from conftest import DATA, rel_digits

MIN_DIGITS = 12


def load(name):
    text = (DATA / "strd" / f"{name}.dat").read_text()
    cert = {}
    for p in ("B0", "B1"):
        m = re.search(rf"^\s+{p}\s+(\S+)\s+(\S+)", text, re.M)
        if m:
            cert[p] = (mpf(m.group(1)), mpf(m.group(2).replace("E", "e")))
    cert["rsd"] = mpf(re.search(r"Standard Deviation\s+(\S+)", text.split("Residual")[1]).group(1))
    cert["R2"] = mpf(re.search(r"R-Squared\s+(\S+)", text).group(1))
    data = text.split("Data:")[-1].strip().splitlines()[1:]
    y, x = [], []
    for line in data:
        parts = line.split()
        if len(parts) == 2:
            y.append(mpf(parts[0]))
            x.append(mpf(parts[1]))
    return x, y, cert


def test_norris():
    x, y, c = load("Norris")
    assert len(x) == 36
    f = linfit.ols(x, y)
    assert rel_digits(f.b, c["B0"][0]) >= MIN_DIGITS
    assert rel_digits(f.a, c["B1"][0]) >= MIN_DIGITS
    assert rel_digits(f.s_b, c["B0"][1]) >= MIN_DIGITS
    assert rel_digits(f.s_a, c["B1"][1]) >= MIN_DIGITS
    assert rel_digits(f.s, c["rsd"]) >= MIN_DIGITS
    assert rel_digits(f.R2, c["R2"]) >= MIN_DIGITS


@pytest.mark.parametrize("name", ["NoInt1", "NoInt2"])
def test_noint(name):
    x, y, c = load(name)
    f = linfit.origin(x, y)
    assert rel_digits(f.a, c["B1"][0]) >= MIN_DIGITS
    assert rel_digits(f.s_a, c["B1"][1]) >= MIN_DIGITS
    assert rel_digits(f.s, c["rsd"]) >= MIN_DIGITS
    assert rel_digits(f.R2, c["R2"]) >= MIN_DIGITS


def test_raw_sum_formulas_match_centred():
    """B.7–B.11 (raw sums) give the same numbers as the centred algorithm."""
    x, y, _ = load("Norris")
    f = linfit.ols(x, y)
    S = f.sums
    n = S["n"]
    a = (n * S["Sxy"] - S["Sx"] * S["Sy"]) / (n * S["Sxx"] - S["Sx"] ** 2)
    b = S["Sy"] / n - a * S["Sx"] / n
    se2 = (n * S["Syy"] - S["Sy"] ** 2 - a ** 2 * (n * S["Sxx"] - S["Sx"] ** 2)) / (n * (n - 2))
    sa2 = n * se2 / (n * S["Sxx"] - S["Sx"] ** 2)
    sb2 = sa2 * S["Sxx"] / n
    assert rel_digits(a, f.a) > 30
    assert rel_digits(b, f.b) > 25
    assert rel_digits(sa2, f.s_a ** 2) > 25
    assert rel_digits(sb2, f.s_b ** 2) > 25


def test_too_few_points():
    from labcalc.parse import ParseError

    with pytest.raises(ParseError):
        linfit.ols([1, 2], [3, 4])
