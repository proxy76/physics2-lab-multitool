"""labcalc — high-precision computation engine for the Physics 2 Lab Companion.

All arithmetic on results uses mpmath at ``WORK_DPS`` decimal digits. Inputs arrive as
strings and are parsed exactly (see :mod:`labcalc.parse`); outputs leave as decimal
strings (see :mod:`labcalc.result`).
"""

from mpmath import mp

__version__ = "1.0.0"

WORK_DPS = 50
CHECK_DPS = 100

mp.dps = WORK_DPS
