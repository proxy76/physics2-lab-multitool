"""Exact parsing of user-typed numbers.

Accepted forms (whitespace anywhere is ignored):

* ``1.23`` and ``1,23`` (decimal comma, as typed on Romanian keyboards)
* ``1.6e-19``, ``1.6E-19``
* ``1.6×10^-19``, ``1.6*10^-19``, ``1.6x10^-19``, ``1.6·10^-19``, ``1.6×10⁻¹⁹``, ``10^-3``
* Unicode minus (U+2212) and other dash look-alikes as the sign

The string is normalised to a plain decimal literal and handed to ``mpf`` directly, so the
value never passes through a binary float.
"""

from __future__ import annotations

import re

from mpmath import mpf

_SUPERSCRIPT = str.maketrans("⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺", "0123456789-+")
_MINUS_LOOKALIKES = str.maketrans({"−": "-", "–": "-", "—": "-", "‐": "-", "‑": "-", "﹣": "-", "－": "-"})
_TIMES = re.compile(r"(?:×|\*|x|X|·|⋅|∙)")
_MANTISSA = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)"
_RE_PLAIN = re.compile(rf"^({_MANTISSA})(?:[eE]([+-]?\d+))?$")
_RE_POW10 = re.compile(rf"^(?:({_MANTISSA})(?:×))?10\^?\(?([+-]?\d+)\)?$")


class ParseError(ValueError):
    """A field-level input error. ``code`` is machine-readable; ``field`` names the input."""

    def __init__(self, message: str, field: str | None = None, code: str = "parse"):
        super().__init__(message)
        self.message = message
        self.field = field
        self.code = code


def normalise(text: str) -> str:
    """Return the canonical decimal literal for ``text`` (e.g. ``'1.6e-19'``).

    Raises :class:`ParseError` for empty or malformed input.
    """
    if text is None:
        raise ParseError("Empty value", code="empty")
    s = str(text)
    # Superscript exponents: "10⁻¹⁹" -> "10^-19"
    if any(ch in s for ch in "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺"):
        s = re.sub(r"([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+)", lambda m: "^" + m.group(1).translate(_SUPERSCRIPT), s)
    s = s.translate(_MINUS_LOOKALIKES)
    s = re.sub(r"[\s   ]+", "", s)
    if not s:
        raise ParseError("Empty value", code="empty")
    commas, dots = s.count(","), s.count(".")
    if commas:
        if commas == 1 and dots == 0:
            s = s.replace(",", ".")
        else:
            raise ParseError(f"'{text}' is not a single number (use one decimal separator)")
    s = _TIMES.sub("×", s)
    m = _RE_PLAIN.match(s)
    if m:
        mant, exp = m.group(1), m.group(2)
        return mant if exp is None else f"{mant}e{int(exp)}"
    m = _RE_POW10.match(s)
    if m:
        mant = m.group(1) or "1"
        return f"{mant}e{int(m.group(2))}"
    raise ParseError(f"'{text}' is not a number")


def parse_number(text, field: str | None = None) -> mpf:
    """Parse one user value into an ``mpf`` at the current working precision."""
    if isinstance(text, (int,)) and not isinstance(text, bool):
        return mpf(text)
    try:
        lit = normalise(text)
    except ParseError as e:
        e.field = field
        raise
    return mpf(lit)


def parse_optional(text, field: str | None = None):
    """Like :func:`parse_number` but returns ``None`` for empty / missing input."""
    if text is None:
        return None
    if isinstance(text, str) and not text.strip():
        return None
    return parse_number(text, field)


def is_blank(text) -> bool:
    return text is None or (isinstance(text, str) and not text.strip())


def parse_list(items, field: str = "values") -> list:
    """Parse a list of strings; blank entries are skipped, bad entries raise with an index."""
    out = []
    for i, item in enumerate(items or []):
        if is_blank(item):
            continue
        out.append(parse_number(item, f"{field}[{i}]"))
    return out


def split_list(text: str) -> list[str]:
    """Split a pasted list of numbers. Separators: newline, semicolon, tab, or spaces.

    Commas are *not* separators (decimal comma), unless the text contains no other separator
    and every comma is followed by a space ("1, 2, 3").
    """
    if text is None:
        return []
    t = str(text).strip()
    if not t:
        return []
    if re.search(r"[\n;\t]", t):
        parts = re.split(r"[\n;\t]+", t)
    elif re.search(r",\s", t):
        parts = re.split(r",\s+", t)
    else:
        parts = re.split(r"\s+", t)
    return [p for p in (x.strip() for x in parts) if p]
