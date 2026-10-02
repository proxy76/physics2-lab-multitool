"""Unit display helpers and conversions (G7).

Units are carried as display strings with Unicode superscripts, e.g. ``"m⁻¹"``, ``"J·s"``.
All pipelines normalise inputs to SI internally; conversions here are exact rational factors
or derived from the selected constant set.
"""

from __future__ import annotations

import re

from mpmath import mpf

from .parse import ParseError

_SUP_TO_ASCII = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺", "0123456789-+")


def unit_latex(unit: str) -> str:
    """Convert a display unit (``"cm²/g"``, ``"m·V^½"``) into LaTeX for ``\\mathrm{}``."""
    if not unit:
        return ""
    u = unit.replace("½", "1/2").replace("µ", r"\mu ").replace("μ", r"\mu ").replace("Ω", r"\Omega ")
    u = re.sub(r"([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+)", lambda m: "^{" + m.group(1).translate(_SUP_TO_ASCII) + "}", u)
    u = re.sub(r"\^\(?([-+]?[0-9/]+)\)?", r"^{\1}", u)
    u = u.replace("·", r"\cdot ").replace("%", r"\%")
    return u


# ---------------------------------------------------------------------------------------------
# Conversions
# ---------------------------------------------------------------------------------------------

LENGTH = {"m": mpf(1), "cm": mpf("0.01"), "mm": mpf("0.001"), "µm": mpf("1e-6"), "nm": mpf("1e-9"), "pm": mpf("1e-12"), "Å": mpf("1e-10")}
VOLTAGE = {"V": mpf(1), "kV": mpf(1000), "mV": mpf("0.001"), "MV": mpf("1e6")}
TIME = {"s": mpf(1), "min": mpf(60), "h": mpf(3600), "d": mpf(86400), "y": mpf("365.25") * 86400}
ACTIVITY = {"Bq": mpf(1), "kBq": mpf(1000), "MBq": mpf("1e6"), "GBq": mpf("1e9"), "Ci": mpf("3.7e10"), "mCi": mpf("3.7e7"), "µCi": mpf("3.7e4")}
DENSITY = {"g/cm³": mpf(1000), "kg/m³": mpf(1)}
ATTEN = {"cm⁻¹": mpf(100), "mm⁻¹": mpf(1000), "m⁻¹": mpf(1)}
MASS_ATTEN = {"cm²/g": mpf("0.1"), "m²/kg": mpf(1)}

SIMPLE = {"length": LENGTH, "voltage": VOLTAGE, "time": TIME, "activity": ACTIVITY, "density": DENSITY,
          "attenuation": ATTEN, "mass_attenuation": MASS_ATTEN}

# photon "spectral" quantities convert through hc (non-linear for wavelength)
SPECTRAL = ["nm", "m", "Hz", "THz", "eV", "J", "cm⁻¹"]


def _category(unit: str):
    for name, table in SIMPLE.items():
        if unit in table:
            return name, table
    return None, None


def convert(value, frm: str, to: str, k: dict):
    """Convert ``value`` from unit ``frm`` to unit ``to``. ``k`` is a constant set (needs h, c, e)."""
    value = mpf(value)
    if frm == to:
        return value
    cf, tf = _category(frm), _category(to)
    if cf[0] and cf[0] == tf[0]:
        return value * cf[1][frm] / tf[1][to]
    if frm in SPECTRAL and to in SPECTRAL:
        return _spectral(value, frm, to, k)
    raise ParseError(f"Cannot convert {frm} to {to}", field="unit", code="unit")


def _spectral(value, frm: str, to: str, k: dict):
    h, c, e = k["h"], k["c"], k["e"]
    # to energy in J
    if frm == "nm":
        E = h * c / (value * mpf("1e-9"))
    elif frm == "m":
        E = h * c / value
    elif frm == "Hz":
        E = h * value
    elif frm == "THz":
        E = h * value * mpf("1e12")
    elif frm == "eV":
        E = value * e
    elif frm == "J":
        E = value
    elif frm == "cm⁻¹":
        E = h * c * value * 100
    else:  # pragma: no cover
        raise ParseError(frm)
    if E == 0:
        raise ParseError("Zero energy cannot be converted to a wavelength", field="value")
    if to == "nm":
        return h * c / E / mpf("1e-9")
    if to == "m":
        return h * c / E
    if to == "Hz":
        return E / h
    if to == "THz":
        return E / h / mpf("1e12")
    if to == "eV":
        return E / e
    if to == "J":
        return E
    if to == "cm⁻¹":
        return E / (h * c) / 100
    raise ParseError(to)  # pragma: no cover


def unit_options() -> dict:
    opts = {name: list(t.keys()) for name, t in SIMPLE.items()}
    opts["spectral"] = SPECTRAL
    return opts
