"""Monte Carlo propagation (GUM Supplement 1 / JCGM 101) — an *advanced cross-check*.

Statistical by nature, so it runs in Python floats with a seeded generator (decision D15).
"""

from __future__ import annotations

import math
import random

from .parse import ParseError


def cholesky(V):
    n = len(V)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                d = V[i][i] - s
                if d < -1e-30:
                    raise ParseError("The covariance matrix is not positive definite", field="cov")
                L[i][j] = math.sqrt(max(d, 0.0))
            else:
                L[i][j] = (V[i][j] - s) / L[j][j] if L[j][j] > 0 else 0.0
    return L


def run(fun, means: list, V: list, n: int = 200000, seed: int = 12345) -> dict:
    """Sample correlated normals, evaluate ``fun`` (float callable), summarise."""
    if n < 1000:
        raise ParseError("Use at least 1000 samples", field="n")
    if n > 2_000_000:
        raise ParseError("At most 2×10⁶ samples", field="n")
    rng = random.Random(seed)
    m = len(means)
    mu = [float(v) for v in means]
    L = cholesky([[float(V[i][j]) for j in range(m)] for i in range(m)])
    out = []
    bad = 0
    gauss = rng.gauss
    for _ in range(n):
        z = [gauss(0.0, 1.0) for _ in range(m)]
        x = [mu[i] + sum(L[i][k] * z[k] for k in range(i + 1)) for i in range(m)]
        try:
            v = fun(*x)
            if isinstance(v, complex) or v != v or v in (math.inf, -math.inf):
                bad += 1
                continue
            out.append(float(v))
        except (ValueError, ZeroDivisionError, OverflowError):
            bad += 1
    if len(out) < n // 2:
        raise ParseError("Most samples fall outside the domain of the expression", field="expr")
    out.sort()
    k = len(out)
    mean = math.fsum(out) / k
    sd = math.sqrt(math.fsum((v - mean) ** 2 for v in out) / (k - 1))
    lo = out[int(0.025 * (k - 1))]
    hi = out[int(math.ceil(0.975 * (k - 1)))]
    med = out[k // 2]
    # histogram for plotting
    bins = 40
    a, b = out[int(0.001 * (k - 1))], out[int(0.999 * (k - 1))]
    width = (b - a) / bins if b > a else 1.0
    hist = [0] * bins
    for v in out:
        idx = int((v - a) / width)
        if 0 <= idx < bins:
            hist[idx] += 1
    return {"n": k, "rejected": bad, "mean": mean, "sd": sd, "median": med, "lo95": lo, "hi95": hi,
            "hist": {"start": a, "width": width, "counts": hist}}
