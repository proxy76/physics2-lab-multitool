import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from mpmath import mp  # noqa: E402

import labcalc  # noqa: E402,F401

DATA = Path(__file__).parent / "data"


def rel_digits(a, b):
    """Number of agreeing significant digits between a and b."""
    from mpmath import fabs, log10, mpf

    a, b = mpf(a), mpf(b)
    if a == b:
        return 99
    return float(-log10(fabs(a - b) / fabs(b)))
