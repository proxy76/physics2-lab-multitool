from decimal import Decimal

import pytest

from labcalc.rounding import round_report, round_uncertainty


@pytest.mark.parametrize("u,expected", [
    ("0.096", "0.1"), ("0.0149", "0.015"), ("0.15", "0.15"), ("1.96", "2.0"), ("19.6", "2E+1"),
    ("23", "2E+1"), ("0.04", "0.04"), ("0.0996", "0.1"), ("0.995", "1"), ("0.0196", "0.020"), ("0.25", "0.3"),
    ("0.35", "0.4"), ("4e-36", "4E-36"), ("0.145", "0.15"), ("1.05", "1.1"),
])
def test_uncertainty_digits(u, expected):
    ur, q, n = round_uncertainty(Decimal(u))
    assert ur == Decimal(expected)
    assert str(ur) == expected or ur.normalize() == Decimal(expected).normalize()


def test_brief_examples():
    assert round_report("12345.678", "23").text() == "(1.235 ± 0.002)×10⁴"
    # The brief's table lists u = 0.4×10⁻³⁵ (= 4×10⁻³⁶) next to "(6.626 ± 0.004)×10⁻³⁴"; those disagree
    # (see docs/DECISIONS.md D17). Both readings are tested:
    assert round_report("6.62607015e-34", "0.4e-35").text("J·s") == "(6.63 ± 0.04)×10⁻³⁴ J·s"
    assert round_report("6.62607015e-34", "0.4e-36").text("J·s") == "(6.626 ± 0.004)×10⁻³⁴ J·s"
    assert round_report("12345.678", "23").text("Bq") == "(1.235 ± 0.002)×10⁴ Bq"


@pytest.mark.parametrize("v,u,txt", [
    ("5.3421", "0.096", "5.3 ± 0.1"),
    ("5.3421", "0.0149", "5.342 ± 0.015"),
    ("5.3421", "0.15", "5.34 ± 0.15"),
    ("53.421", "1.96", "53.4 ± 2.0"),
    ("534.21", "19.6", "(5.34 ± 0.20)×10²"),
    ("5342.1", "19.6", "(5.342 ± 0.020)×10³"),
    ("534.21", "2.6", "534 ± 3"),
    ("10.05762", "0.027", "10.06 ± 0.03"),
    ("0.000123456", "0.0000021", "(1.23 ± 0.02)×10⁻⁴"),
    ("0.000123456", "0.0000013", "(1.235 ± 0.013)×10⁻⁴"),
    ("-2.345", "0.05", "−2.35 ± 0.05"),
    ("0.5", "0.25", "0.5 ± 0.3"),
])
def test_value_rounding(v, u, txt):
    assert round_report(v, u).text() == txt


def test_round_half_up_not_bankers():
    assert round_report("2.25", "0.05").text() == "2.25 ± 0.05"
    assert round_report("2.5", "3").text() == "3 ± 3"  # banker's would give 2
    assert round_report("2.5", "1").text() == "2.5 ± 1.0"  # leading digit 1 -> two digits
    assert round_report("0.125", "0.03").text() == "0.13 ± 0.03"


def test_round_up_option():
    assert round_report("10.0", "0.21", round_up=True).text() == "10.0 ± 0.3"
    assert round_report("10.0", "0.21").text() == "10.0 ± 0.2"


def test_no_uncertainty_sig():
    assert round_report("299792458", None, plain_sig=4).text() == "2.998×10⁸"
    assert round_report("0.00012345", None, plain_sig=3).text() == "1.23×10⁻⁴"
    assert round_report("1.5", None, plain_sig=3).text() == "1.50"
