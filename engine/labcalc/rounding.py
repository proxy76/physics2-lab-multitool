"""The lab's rounding rule (guide §2.8 / §5.8 notes, quoting GUM JCGM 100:2008 §7.2.6).

* The uncertainty is reported with **1 significant digit, or 2 if that digit is 1**.
  The number of digits is decided from the leading digit of the *unrounded* uncertainty;
  if rounding then carries (0.096 -> 0.1) the carried result is kept.
* The value is rounded to the same decimal position as the uncertainty.
* Rounding is ROUND_HALF_UP (not banker's rounding). Optionally the uncertainty is rounded up
  (GUM 7.2.6 permits it).
* Scientific notation with a shared exponent is used whenever plain notation would leave
  trailing zeros ambiguous or the magnitude is very large/small.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal, localcontext

from mpmath import mpf, nstr

_SUP = str.maketrans("0123456789-+", "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺")


def to_decimal(x, digits: int = 45) -> Decimal:
    """Convert an mpf (or str/int) to Decimal with ``digits`` significant digits."""
    if isinstance(x, Decimal):
        return x
    if isinstance(x, (int, str)):
        return Decimal(x)
    s = nstr(mpf(x), digits, strip_zeros=False, min_fixed=1, max_fixed=0)
    return Decimal(s)


def sup(n: int) -> str:
    return str(n).translate(_SUP)


@dataclass
class Rounded:
    value: Decimal  # rounded value
    unc: Decimal | None  # rounded uncertainty
    quantum: int  # decimal exponent of the last kept digit
    exponent: int  # shared exponent used for display (0 = plain)
    value_mant: str
    unc_mant: str | None
    unc_digits: int | None
    rounded_up: bool = False

    def text(self, unit: str = "") -> str:
        u = f" {unit}" if unit else ""
        if self.unc is None:
            body = self.value_mant + (f"×10{sup(self.exponent)}" if self.exponent else "")
            return body + u
        if self.exponent:
            return f"({self.value_mant} ± {self.unc_mant})×10{sup(self.exponent)}{u}"
        if unit:
            return f"({self.value_mant} ± {self.unc_mant}){u}"
        return f"{self.value_mant} ± {self.unc_mant}"

    def latex(self, unit_latex: str = "") -> str:
        u = rf"\,\mathrm{{{unit_latex}}}" if unit_latex else ""
        if self.unc is None:
            body = self.value_mant + (rf"\times 10^{{{self.exponent}}}" if self.exponent else "")
            return body + u
        core = rf"{self.value_mant} \pm {self.unc_mant}"
        if self.exponent:
            return rf"\left({core}\right)\times 10^{{{self.exponent}}}{u}"
        if unit_latex:
            return rf"\left({core}\right){u}"
        return core


def unc_sig_digits(u: Decimal) -> int:
    """1 significant digit, or 2 if the leading digit is 1 (decided on the unrounded value)."""
    lead = str(u.normalize()).lstrip("0.").replace(".", "")[0]
    return 2 if lead == "1" else 1


def round_uncertainty(u: Decimal, round_up: bool = False) -> tuple[Decimal, int, int]:
    """Return (rounded uncertainty, quantum exponent, number of significant digits kept)."""
    if u <= 0:
        raise ValueError("uncertainty must be positive")
    nsig = unc_sig_digits(u)
    eu = u.adjusted()
    q = eu - nsig + 1
    mode = ROUND_CEILING if round_up else ROUND_HALF_UP
    with localcontext() as ctx:
        ctx.prec = 60
        ur = u.quantize(Decimal(1).scaleb(q), rounding=mode)
        if ur.adjusted() > eu:  # carry, e.g. 0.096 -> 0.10: keep the carried value, drop the extra zero
            q += 1
            ur = ur.quantize(Decimal(1).scaleb(q), rounding=ROUND_HALF_UP)
            nsig = 1
    return ur, q, nsig


def _mant(d: Decimal, exponent: int, q: int) -> str:
    """Format ``d`` / 10**exponent with exactly (exponent - q) decimals."""
    places = max(exponent - q, 0)
    with localcontext() as ctx:
        ctx.prec = 80
        m = d.scaleb(-exponent)
        m = m.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP)
    s = f"{m:f}"
    if s.startswith("-0") and m == 0:
        s = s[1:]
    return s.replace("-", "−")


def _choose_exponent(v: Decimal, q: int, ur: Decimal | None = None) -> int:
    """Shared display exponent: plain notation when unambiguous and readable, else scientific."""
    mag = v.adjusted() if v != 0 else q
    if q > 0:  # trailing zeros would be ambiguous in plain notation
        return mag
    if ur is not None and q == 0 and ur >= 10 and ur % 10 == 0:  # "± 20" with a significant zero
        return mag
    if -3 <= mag <= 3 and q >= -6:
        return 0
    return mag


def round_report(value, unc=None, round_up: bool = False, plain_sig: int = 4) -> Rounded:
    """Round ``value`` ± ``unc`` by the lab rule. ``unc=None`` gives ``plain_sig`` significant digits."""
    v = to_decimal(value)
    if unc is None:
        if v == 0:
            return Rounded(Decimal(0), None, 0, 0, "0", None, None)
        q = v.adjusted() - plain_sig + 1
        with localcontext() as ctx:
            ctx.prec = 80
            vr = v.quantize(Decimal(1).scaleb(q), rounding=ROUND_HALF_UP)
        if vr.adjusted() > v.adjusted():
            q += 1
            vr = vr.quantize(Decimal(1).scaleb(q), rounding=ROUND_HALF_UP)
        e = _choose_exponent(vr, q)
        return Rounded(vr, None, q, e, _mant(vr, e, q), None, None)
    u = abs(to_decimal(unc))
    ur, q, nsig = round_uncertainty(u, round_up)
    with localcontext() as ctx:
        ctx.prec = 80
        vr = v.quantize(Decimal(1).scaleb(q), rounding=ROUND_HALF_UP)
    e = _choose_exponent(vr if vr != 0 else ur, q, ur)
    if abs(vr) < ur and vr != 0:
        e = _choose_exponent(ur, q) if q <= 0 else ur.adjusted()
    return Rounded(vr, ur, q, e, _mant(vr, e, q), _mant(ur, e, q), nsig, round_up)


def fmt_sig(x, sig: int = 6) -> str:
    """Human-readable number with ``sig`` significant digits (no uncertainty)."""
    return round_report(x, None, plain_sig=sig).text()


def tex_sig(x, sig: int = 6) -> str:
    """LaTeX number with ``sig`` significant digits, e.g. ``1.23457\\times 10^{-3}``."""
    r = round_report(x, None, plain_sig=sig)
    return r.latex().replace("−", "-")


def full(x, digits: int = 30) -> str:
    """Full-precision decimal string for transport (about ``digits`` significant digits)."""
    return nstr(mpf(x), digits, strip_zeros=True, min_fixed=-6, max_fixed=10)
