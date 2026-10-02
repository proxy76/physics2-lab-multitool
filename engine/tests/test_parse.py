import pytest
from mpmath import mpf

from labcalc.parse import ParseError, normalise, parse_number, split_list


@pytest.mark.parametrize("text,expected", [
    ("1,5", "1.5"), ("1.5", "1.5"), ("1.5e-3", "1.5e-3"), ("1.5E-3", "1.5e-3"),
    ("1.5×10^-3", "1.5e-3"), ("1.5*10^-3", "1.5e-3"), ("1.5x10^-3", "1.5e-3"), ("1,5·10^-3", "1.5e-3"),
    ("1.6×10⁻¹⁹", "1.6e-19"), ("10^-3", "1e-3"), ("−2", "-2"), (" 3 ", "3"), ("299 792 458", "299792458"),
    ("-.5", "-.5"), ("+4", "+4"), ("6,62607015e-34", "6.62607015e-34"), ("1.5×10^(−3)", "1.5e-3"),
])
def test_accepts(text, expected):
    assert normalise(text) == expected


def test_exact_value():
    assert parse_number("0,1") == mpf("0.1")
    assert parse_number("1.6×10^-19") == mpf("1.6e-19")


@pytest.mark.parametrize("bad", ["", "   ", "1,2,3", "abc", "1.2.3", "1,2.3", "e5", "--1", "1e", "×10^3x"])
def test_rejects(bad):
    with pytest.raises(ParseError) as ei:
        parse_number(bad, field="N")
    assert ei.value.field == "N"
    assert ei.value.message


def test_empty_code():
    with pytest.raises(ParseError) as ei:
        parse_number("", field="t")
    assert ei.value.code == "empty"


def test_split_list():
    assert split_list("1,2\n3,4\n5") == ["1,2", "3,4", "5"]
    assert split_list("1.2 3.4 5") == ["1.2", "3.4", "5"]
    assert split_list("1.2; 3,4") == ["1.2", "3,4"]
    assert split_list("1.2, 3.4, 5") == ["1.2", "3.4", "5"]
