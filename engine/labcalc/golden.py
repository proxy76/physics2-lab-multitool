"""Golden synthetic datasets generated from known truths (brief §4.6).

``make(exp, noise=None)`` returns pipeline params as strings. With ``noise=None`` the values carry
50 significant digits so the pipeline must recover the truth to ≥ 30 digits. With ``rng`` set,
realistic noise is added and values are rounded like real instrument readings (used for the
coverage tests and the app's "load example data").

    python -m labcalc.golden   # prints the realistic example datasets as JSON (seed 2026)
"""

from __future__ import annotations

import json
import math
import random

from mpmath import mp, mpf, nstr, sqrt, workdps

from .constants import HG_LINES_GUIDE, get
from .experiments.exp4 import lam_nonrel  # noqa: F401  (documentation of the model)
from .experiments.exp5 import g_exact, x_approx

TRUTH = {
    "exp5": {"lambda": "1.0e5", "nb": "2.5"},
    "exp6": {"Al": "0.20", "Fe": "0.58", "Pb": "1.25", "rate0": "60"},
    "exp7": {"h": "6.62607015e-34", "W_eV": "1.55"},
    "exp3": {"R": "1.0967758e7", "A": "80", "B": "-10"},
    "exp4": {"d1": "2.13e-10", "d2": "1.23e-10"},
}

EXP5_R = ["2", "3", "4", "5", "6", "8", "10", "12", "15"]
EXP6_X = {"Al": ["0", "1", "2", "3", "4", "5", "6"], "Fe": ["0", "0.3", "0.6", "1.0", "1.4", "1.8", "2.2"], "Pb": ["0", "0.2", "0.4", "0.6", "0.8", "1.0", "1.2"]}
EXP7_L = [("violet", "404.7"), ("blue", "435.8"), ("green", "546.1"), ("yellow", "578.2")]  # the 4 filters on the wheel
EXP4_U = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"]


def s(x, digits=50):
    return nstr(mpf(x), digits, strip_zeros=False, min_fixed=-30, max_fixed=30)


def _r(x, step):
    """Round a float reading to an instrument step."""
    return round(round(x / step) * step, 10)


def fmt(x, decimals):
    return f"{x:.{decimals}f}"


def make(exp: str, rng: random.Random | None = None, model: str = "exact", **kw) -> dict:
    with workdps(60):
        return _MAKERS[exp](rng, model, **kw)


def _exp5(rng, model, **kw):
    T = TRUTH["exp5"]
    lam, nb, eps, S, D = mpf(T["lambda"]), mpf(T["nb"]), mpf("0.2"), mpf(1), mpf("2.54")
    t, tb = mpf(100), mpf(600)
    rs = kw.get("r", EXP5_R)
    rows = []
    for i, r in enumerate(rs):
        geo = g_exact(mpf(r), D) if model == "exact" else x_approx(mpf(r), D)
        mean = (lam * geo * eps * S + nb) * t
        if rng is None:
            N = s(mean)
        else:
            N = str(_poisson(rng, float(mean)))
        rows.append({"id": f"r{i}", "r": r, "t": "100", "N": N})
    Nb = s(nb * tb) if rng is None else str(_poisson(rng, float(nb * tb)))
    return {"background": {"N": Nb, "t": "600"}, "rows": rows, "eps": "0.2", "S": "1", "D": "2.54"}


def _exp6(rng, model, **kw):
    T = TRUTH["exp6"]
    t = mpf(100)  # the professor fixes one measuring time for every spectrum
    Lc, Rc = mpf(400), mpf(480)
    mats = []
    for sym in ("Al", "Fe", "Pb"):
        mu = mpf(T[sym])
        rows = []
        for i, x in enumerate(EXP6_X[sym]):
            rate = mpf(T["rate0"]) * mp.e ** (-mu * mpf(x))
            if rng is not None:
                rate *= mp.e ** mpf(rng.gauss(0, kw.get("sigma_ln", 0.02)))
            H = rate * t * 2 / (Rc - Lc)
            rows.append({"id": f"{sym}{i}", "x": x, "H": s(H) if rng is None else fmt(float(H), 1), "L": "400", "R": "480"})
        mats.append({"symbol": sym, "rows": rows})
    return {"materials": mats, "x_unit": "cm"}


def _exp7(rng, model, **kw):
    T = TRUTH["exp7"]
    k = get("codata")
    h, W = mpf(T["h"]), mpf(T["W_eV"])
    filters = []
    for i, (col, lam) in enumerate(kw.get("filters", EXP7_L)):
        nu = k["c"] / (mpf(lam) * mpf("1e-9"))
        U0 = h * nu / k["e"] - W
        if rng is None:
            readings = [s(U0)] * 10
        else:
            sd = kw.get("sigma_U", 0.01)
            readings = [fmt(_r(float(U0) + rng.gauss(0, sd), 0.001), 3) for _ in range(10)]
        filters.append({"id": f"f{i}", "color": col, "lambda": lam, "readings": readings})
    return {"filters": filters}


def _exp3(rng, model, **kw):
    T = TRUTH["exp3"]
    R, A, B = mpf(T["R"]), mpf(T["A"]), mpf(T["B"])
    sd = kw.get("sigma_x", 0.05)
    hg = []
    for i, lam in enumerate(HG_LINES_GUIDE):
        x = A + B / (mpf(lam) * mpf("1e-3")) ** 2
        hg.append({"id": f"hg{i}", "lambda": lam, "x": s(x) if rng is None else fmt(_r(float(x) + rng.gauss(0, sd), 0.1 if kw.get("vernier") else 0.01), 2)})
    hl = []
    for i, (lab, n) in enumerate([("Hα", 3), ("Hβ", 4), ("Hγ", 5), ("Hδ", 6), ("Hε", 7)]):
        lam_um = 1 / (R * (mpf(1) / 4 - mpf(1) / n ** 2)) * mpf("1e6")
        x = A + B / lam_um ** 2
        hl.append({"id": f"h{i}", "line": lab, "n": str(n), "x": s(x) if rng is None else fmt(_r(float(x) + rng.gauss(0, sd), 0.1 if kw.get("vernier") else 0.01), 2)})
    return {"hg": hg, "h": hl, "sigma_x": str(sd) if rng is not None else "0.05"}


def _exp4(rng, model, **kw):
    T = TRUTH["exp4"]
    k = get("codata")
    from .constants import graphite_C

    C = graphite_C(k, mpf("0.135"))
    rows = []
    sd = kw.get("sigma_D", 0.03)
    for i, U in enumerate(EXP4_U):
        Uv = mpf(U) * 1000
        D1 = C / mpf(T["d1"]) / sqrt(Uv) * 100  # cm
        D2 = C / mpf(T["d2"]) / sqrt(Uv) * 100
        w = mpf("0.1")
        if rng is None:
            vals = [s(D1 - w), s(D1 + w), s(D2 - w), s(D2 + w)]
        else:
            vals = [fmt(_r(float(v) + rng.gauss(0, sd), 0.005), 3) for v in (D1 - w, D1 + w, D2 - w, D2 + w)]
        rows.append({"id": f"u{i}", "U": U, "d1_in": vals[0], "d1_out": vals[1], "d2_in": vals[2], "d2_out": vals[3]})
    return {"rows": rows, "L": "13.5"}


def _poisson(rng: random.Random, lam: float) -> int:
    if lam > 500:
        return max(0, int(round(rng.gauss(lam, math.sqrt(lam)))))
    L, kk, p = math.exp(-lam), 0, 1.0
    while True:
        kk += 1
        p *= rng.random()
        if p <= L:
            return kk - 1


_MAKERS = {"exp3": _exp3, "exp4": _exp4, "exp5": _exp5, "exp6": _exp6, "exp7": _exp7}


def examples(seed: int = 2026) -> dict:
    """Realistic example datasets for the app (rounded like real readings)."""
    out = {}
    for e in ("exp5", "exp6", "exp7", "exp3", "exp4"):
        rng = random.Random(seed)
        kw = {"vernier": True} if e == "exp3" else {}
        out[e] = make(e, rng, **kw)
    return out


if __name__ == "__main__":  # pragma: no cover
    print(json.dumps(examples(), ensure_ascii=False, indent=1))
