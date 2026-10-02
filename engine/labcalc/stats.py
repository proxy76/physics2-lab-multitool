"""Descriptive statistics (G1) — Appendix A.1 and Exp. 7 Q3."""

from __future__ import annotations

from mpmath import fsum, mpf, sqrt

from .parse import ParseError


def mean(xs):
    return fsum(xs) / len(xs)


def describe(xs, true_mean=None) -> dict:
    """n, mean, min, max, sample s (N−1), SEM = s/√N; optional A.1 variance about a true mean."""
    n = len(xs)
    if n == 0:
        raise ParseError("Enter at least one value", field="values", code="empty")
    m = mean(xs)
    out = {"n": n, "mean": m, "min": min(xs), "max": max(xs), "sum": fsum(xs)}
    if n >= 2:
        ss = fsum((x - m) ** 2 for x in xs)
        s = sqrt(ss / (n - 1))
        out.update({"ss": ss, "s": s, "sem": s / sqrt(n), "s_pop": sqrt(ss / n)})
    if true_mean is not None:
        out["s_true"] = sqrt(fsum((x - true_mean) ** 2 for x in xs) / n)
    return out


def describe_steps(d: dict, tx) -> list[dict]:
    steps = [
        {"title": "Mean", "latex": r"\bar{x}=\frac{1}{N}\sum_{i=1}^{N}x_i",
         "substituted": rf"\bar{{x}}=\frac{{{tx(d['sum'], 8)}}}{{{d['n']}}}", "result": tx(d["mean"], 8)},
    ]
    if "s" in d:
        steps.append({"title": "Standard deviation of the data (N − 1)", "latex": r"s=\sqrt{\frac{\sum (x_i-\bar{x})^2}{N-1}}",
                      "substituted": rf"s=\sqrt{{\frac{{{tx(d['ss'], 6)}}}{{{d['n'] - 1}}}}}", "result": tx(d["s"], 6)})
        steps.append({"title": "Standard deviation of the mean", "latex": r"s_{\bar{x}}=\frac{s}{\sqrt{N}}",
                      "substituted": rf"s_{{\bar{{x}}}}=\frac{{{tx(d['s'], 6)}}}{{\sqrt{{{d['n']}}}}}", "result": tx(d["sem"], 6)})
    return steps


def weighted_mean(xs, sigmas) -> tuple:
    w = [1 / s ** 2 for s in sigmas]
    W = fsum(w)
    m = fsum(wi * xi for wi, xi in zip(w, xs)) / W
    return m, 1 / sqrt(W)
