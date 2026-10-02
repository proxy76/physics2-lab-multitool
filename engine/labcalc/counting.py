"""Counting statistics (G2) — Appendix A.3: σ_N = √N, n = N/t, σ_n = √N/t."""

from __future__ import annotations

from mpmath import mpf, sqrt

from .parse import ParseError


def count(N):
    if N < 0:
        raise ParseError("A number of counts cannot be negative", field="N")
    return N, sqrt(N)


def rate(N, t):
    if t <= 0:
        raise ParseError("Counting time must be positive", field="t")
    if N < 0:
        raise ParseError("A number of counts cannot be negative", field="N")
    return N / t, sqrt(N) / t


def subtract(n1, s1, n2, s2):
    """n = n1 − n2, σ = √(σ1² + σ2²) (background subtraction)."""
    return n1 - n2, sqrt(s1 ** 2 + s2 ** 2)


def ratio(n1, s1, n2, s2):
    r = n1 / n2
    return r, abs(r) * sqrt((s1 / n1) ** 2 + (s2 / n2) ** 2)


def product(n1, s1, n2, s2):
    p = n1 * n2
    return p, abs(p) * sqrt((s1 / n1) ** 2 + (s2 / n2) ** 2)


def planner(n, eps, nb=None, tb=None):
    """Counting time needed for relative precision ``eps`` on a rate ``n`` (s⁻¹).

    Without background: σ_n/n = 1/√(n t) → t = 1/(n ε²).
    With a background rate nb measured for tb: σ² = (n+nb)/t + nb/tb must equal (ε·n)², so
    t = (n + nb) / ((ε n)² − nb/tb) (infinite if the background term alone exceeds the target).
    Here ``n`` is the net (background-subtracted) rate.
    """
    if n <= 0 or eps <= 0:
        raise ParseError("Rate and target precision must be positive", field="n")
    if nb is None or nb == 0:
        return 1 / (n * eps ** 2), 1 / eps ** 2
    var_b = nb / tb if tb else mpf(0)
    den = (eps * n) ** 2 - var_b
    if den <= 0:
        return None, None
    t = (n + nb) / den
    return t, (n + nb) * t
