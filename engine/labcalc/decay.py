"""Radioactive decay correction (G8): A(t) = A₀·2^(−Δt/T½)."""

from __future__ import annotations

from datetime import date

from mpmath import log, mpf, sqrt

from .parse import ParseError

DAYS_PER_YEAR = mpf("365.25")


def parse_date(s: str, field: str) -> date:
    try:
        return date.fromisoformat(str(s).strip())
    except ValueError:
        raise ParseError("Use the date format YYYY-MM-DD", field=field)


def correct(A0, sA0, t_ref: date, t_meas: date, T_half_y, sT=0):
    """Activity at ``t_meas`` from a reference activity at ``t_ref``. Returns (A, σ_A, Δt in years)."""
    dt = mpf((t_meas - t_ref).days) / DAYS_PER_YEAR
    f = mpf(2) ** (-dt / T_half_y)
    A = A0 * f
    # ∂A/∂T½ = A·ln2·Δt/T½²
    dA_dT = A * log(2) * dt / T_half_y ** 2
    sA = sqrt((f * sA0) ** 2 + (dA_dT * sT) ** 2)
    return A, sA, dt
