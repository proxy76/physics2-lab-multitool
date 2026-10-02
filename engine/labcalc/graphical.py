"""Graphical-method helper (G5): slope from a hand-drawn line, max/min slopes, A4 axis scales."""

from __future__ import annotations

from mpmath import ceil, floor, log10, mpf

from .parse import ParseError


def two_point(x1, y1, x2, y2):
    """Slope and intercept of the line through P1 and P2 (read off the student's best line)."""
    if x2 == x1:
        raise ParseError("The two points must have different x", field="x2")
    a = (y2 - y1) / (x2 - x1)
    b = y1 - a * x1
    return a, b


def max_min(a_max, a_min):
    """Graphical uncertainty from the steepest and shallowest acceptable lines."""
    a_mid = (a_max + a_min) / 2
    return a_mid, abs(a_max - a_min) / 2


NICE = [1, 2, 5]


def axis_scale(lo, hi, length_cm, include_zero: bool = False, min_fill=mpf(2) / 3):
    """Propose a round scale (1, 2 or 5 × 10^k units per cm) for an axis of ``length_cm``.

    Returns the smallest scale (largest drawing) whose span fits on the axis. The origin is
    rounded down to a whole multiple of the scale. Reports the fill fraction.
    """
    lo, hi = mpf(lo), mpf(hi)
    if include_zero:
        lo = min(lo, mpf(0))
        hi = max(hi, mpf(0))
    if hi <= lo:
        raise ParseError("The data range is empty", field="data")
    L = mpf(length_cm)
    raw = (hi - lo) / L
    k = int(floor(log10(raw))) - 1
    for _ in range(8):
        for m in NICE:
            s = mpf(m) * mpf(10) ** k
            origin = floor(lo / s) * s
            top = origin + s * L
            if top >= hi:
                fill = (hi - lo) / (s * L)
                return {"scale": s, "origin": origin, "end": top, "fill": fill, "ok": fill >= min_fill,
                        "major": s, "label": f"{_fmt(s)} per cm"}
        k += 1
    raise ParseError("Could not find a scale", field="data")  # pragma: no cover


def _fmt(s):
    from .rounding import fmt_sig

    return fmt_sig(s, 3)


def a4_layout(xlo, xhi, ylo, yhi, landscape: bool = False, include_zero_x=False, include_zero_y=False):
    """A4 millimetre paper: usable area ≈ 18 × 27 cm (portrait). x is the horizontal axis."""
    wx, wy = (mpf(27), mpf(18)) if landscape else (mpf(18), mpf(27))
    return {"x": axis_scale(xlo, xhi, wx, include_zero_x), "y": axis_scale(ylo, yhi, wy, include_zero_y),
            "paper": "A4 landscape" if landscape else "A4 portrait", "width_cm": wx, "height_cm": wy}
