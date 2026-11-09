"""Experiment 2 — Dead time of a Geiger–Müller counter, two-source method.

Per measurement set (T s each): background N_b, source 1 N_1b, source 2 N_2b, both N_12b.
Rates n = N/T (measured). Eq. 2.3 (first order in τ):

    τ = X / Y,  X = n_1b + n_2b − n_12b − n_b,  Y = 2(n_1b·n_2b − n_12b·n_b)

Uncertainty (§2.6, Q3/Q4, and the team's final sheet): quotient rule on X and Y with Poisson σ²_n = N/T²:

    σ_τ = |X/Y|·√(σ_X²/X² + σ_Y²/Y²),  σ_X = √(N_1b + N_2b + N_12b + N_b)/T,
    σ_Y = 2√(n_2b²σ²_n1b + n_1b²σ²_n2b + n_b²σ²_n12b + n_12b²σ²_nb)

The sheet computes τ ± σ_τ for every set and lists all of them in the conclusions, with the reason why
they must not be averaged. Display precision follows that sheet: rates and τ (μs) with 2 decimals.
Advanced: the exact non-paralysable solution of eq. 2.2 (Knoll), σ from the full partial derivatives
(X and Y share the rates), and the pooled value (sum the counts of all sets, then eq. 2.3).
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal, localcontext

from mpmath import mpf, sqrt

from ..parse import ParseError, is_blank, parse_number
from ..result import Result, num
from ..rounding import fmt_sig, round_report, tex_sig, to_decimal
from .common import series_points

US = mpf("1e6")
KEYS = ("T", "Nb", "N1", "N2", "N12")


def fix(x, d: int = 2, tex: bool = False) -> str:
    """Fixed number of decimals, half-up, like the sheet ("117.45", "122.22")."""
    v = to_decimal(x)
    with localcontext() as ctx:
        ctx.prec = 80
        r = v.quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP)
    s = f"{r:f}"
    if s.startswith("-"):
        s = ("-" if tex else "−") + s[1:]
    if s in ("−0." + "0" * d, "-0." + "0" * d):
        s = "0." + "0" * d
    return s


def sig(x, n: int, tex: bool = False) -> str:
    return tex_sig(x, n) if tex else fmt_sig(x, n)


def term(x, tex: bool = False) -> str:
    """One σ_Y term as written on paper: 1 decimal from 100 up, else 2 (40497.4, 1383.4, 6.84)."""
    return fix(x, 1 if abs(x) >= 100 else 2, tex)


def whole(x, tex: bool = False) -> str:
    """Counts and sums of counts as typed integers ("243", not "2.43×10²")."""
    return str(int(x)) if x == int(x) else sig(x, 12, tex)


def _num(row, k, i):
    v = row.get(k)
    return None if is_blank(v) else parse_number(v, f"sets[{i}].{k}")


def solve_exact(n1, n2, n12, nb):
    """Exact τ of eq. 2.2 for a non-paralysable detector, n = n'/(1 − n'τ) (Knoll, Radiation Detection
    and Measurement, §4.VII): τ = X(1 − √(1 − Z))/Y. Eq. 2.3 is its first-order expansion."""
    Xk = n1 * n2 - nb * n12
    Yk = n1 * n2 * (n12 + nb) - nb * n12 * (n1 + n2)
    if Xk == 0 or Yk == 0:
        return None
    Z = Yk * (n1 + n2 - n12 - nb) / Xk ** 2
    if Z > 1:
        return None
    return Xk * (1 - sqrt(1 - Z)) / Yk


def tau_of(n1, n2, n12, nb):
    return (n1 + n2 - n12 - nb) / (2 * (n1 * n2 - n12 * nb))


def grad_sigma(n1, n2, n12, nb, T):
    """σ_τ from the full partial derivatives of eq. 2.3 (no X/Y split, so no hidden correlation)."""
    D = 2 * (n1 * n2 - n12 * nb)
    X = n1 + n2 - n12 - nb
    d1 = 1 / D - X * 2 * n2 / D ** 2
    d2 = 1 / D - X * 2 * n1 / D ** 2
    d12 = -1 / D + X * 2 * nb / D ** 2
    db = -1 / D + X * 2 * n12 / D ** 2
    return sqrt(d1 ** 2 * n1 / T + d2 ** 2 * n2 / T + d12 ** 2 * n12 / T + db ** 2 * nb / T)


def _set(i, row):
    """One measurement set: everything the sheet writes for it. Partial rows give partial rates."""
    vals = {k: _num(row, k, i) for k in KEYS}
    T = vals["T"]
    if T is not None and T <= 0:
        raise ParseError("The counting time T must be positive", field=f"sets[{i}].T")
    for k in KEYS[1:]:
        if vals[k] is not None and vals[k] < 0:
            raise ParseError("Counts cannot be negative", field=f"sets[{i}].{k}")
    no = str(i + 1)
    g = {"id": row.get("id", str(i)), "no": no, "T": "" if T is None else fix(T, 0) if T == int(T) else sig(T, 6),
         "complete": all(vals[k] is not None for k in KEYS)}
    for k in KEYS[1:]:
        g[k] = "" if vals[k] is None else str(row.get(k)).strip()
    rates = {}
    if T is not None:
        for k, r in (("Nb", "nb"), ("N1", "n1"), ("N2", "n2"), ("N12", "n12")):
            if vals[k] is not None:
                rates[r] = vals[k] / T
                g[r] = fix(rates[r])
    for r in ("nb", "n1", "n2", "n12"):
        g.setdefault(r, "")
    return g, vals, rates


def _work(g, vals, rates):
    """τ, σ_τ and the substituted formulas of the sheet for one complete set (adds to g in place)."""
    T = vals["T"]
    n1, n2, n12, nb = rates["n1"], rates["n2"], rates["n12"], rates["nb"]
    Ncomb = vals["N1"] + vals["N2"] - vals["N12"] - vals["Nb"]
    X = Ncomb / T
    Y = 2 * (n1 * n2 - n12 * nb)
    if Y == 0:
        raise ParseError(f"Set {g['no']}: n₁b·n₂b = n₁₂b·n_b, so eq. 2.3 divides by zero", field=f"sets[{int(g['no']) - 1}].N12")
    tau = X / Y
    Nsum = vals["N1"] + vals["N2"] + vals["N12"] + vals["Nb"]
    sX = sqrt(Nsum) / T
    var = lambda n: n / T  # σ²_n = N/T² = n/T  # noqa: E731
    sY = 2 * sqrt(n2 ** 2 * var(n1) + n1 ** 2 * var(n2) + nb ** 2 * var(n12) + n12 ** 2 * var(nb))
    rel = sqrt((sX / X) ** 2 + (sY / Y) ** 2) if X != 0 else None
    s_tau = abs(tau) * rel if rel is not None else None
    # the sheet substitutes rates rounded to 2 decimals; X is a small difference of large numbers, so
    # X is taken from the counts (exact) and the app says when the rounded rates would give another X
    X_rounded = sum(Decimal(fix(r).replace("−", "-")) * s for r, s in ((n1, 1), (n2, 1), (n12, -1), (nb, -1)))
    r2 = {k: fix(v, 2, tex=True) for k, v in rates.items()}
    # Parts joined by \qquad are stacked one per line on a phone (components/Tex.tsx), so every line
    # fits 390 px and can be copied onto the sheet as written.
    Tt = g["T"]
    terms = [(r2["n2"], g["N1"], n2 ** 2 * var(n1)), (r2["n1"], g["N2"], n1 ** 2 * var(n2)),
             (r2["nb"], g["N12"], nb ** 2 * var(n12)), (r2["n12"], g["Nb"], n12 ** 2 * var(nb))]
    tex = {
        "rates": [rf"n_b=\frac{{N_b}}{{T}}=\frac{{{g['Nb']}}}{{{Tt}}}={r2['nb']}\ \mathrm{{c/s}}",
                  rf"n_{{1b}}=\frac{{N_{{1b}}}}{{T}}=\frac{{{g['N1']}}}{{{Tt}}}={r2['n1']}\ \mathrm{{c/s}}",
                  rf"n_{{2b}}=\frac{{N_{{2b}}}}{{T}}=\frac{{{g['N2']}}}{{{Tt}}}={r2['n2']}\ \mathrm{{c/s}}",
                  rf"n_{{12b}}=\frac{{N_{{12b}}}}{{T}}=\frac{{{g['N12']}}}{{{Tt}}}={r2['n12']}\ \mathrm{{c/s}}"],
        "tau": rf"\tau=\frac{{{r2['n1']}+{r2['n2']}-{r2['n12']}-{r2['nb']}}}{{2({r2['n1']}\cdot{r2['n2']}-{r2['n12']}\cdot{r2['nb']})}}"
               rf"\qquad\approx{fix(tau * US, 2, True)}\cdot10^{{-6}}\ \mathrm{{s}}",
        "XY": rf"X=n_{{1b}}+n_{{2b}}-n_{{12b}}-n_b={fix(X, 2, True)}\qquad Y=2(n_{{1b}}n_{{2b}}-n_{{12b}}n_b)={fix(Y, 2, True)}",
        "X_counts": rf"X=\frac{{N_{{1b}}+N_{{2b}}-N_{{12b}}-N_b}}{{T}}\qquad=\frac{{{whole(Ncomb, True)}}}{{{Tt}}}={fix(X, 2, True)}\ \mathrm{{c/s}}",
        "sX": rf"\sigma_X=\sqrt{{\frac{{N_{{1b}}+N_{{2b}}+N_{{12b}}+N_b}}{{T^2}}}}\qquad=\frac{{\sqrt{{{whole(Nsum, True)}}}}}{{{Tt}}}\approx{sig(sX, 3, True)}\ \mathrm{{c/s}}",
        # the four terms in the order of the general formula, numbers only (the symbols are just above)
        "sY": r"\qquad ".join([rf"{r}^2\cdot\frac{{{N}}}{{{Tt}^2}}={term(v, True)}" for r, N, v in terms]
                              + [rf"S={term(terms[0][2], True)}+{term(terms[1][2], True)}", rf"+\,{term(terms[2][2], True)}+{term(terms[3][2], True)}",
                                 rf"=\,{term(sum(v for *_, v in terms), True)}",
                                 rf"\sigma_Y=2\sqrt{{S}}\approx{sig(sY, 4, True)}"]),
    }
    if s_tau is not None:
        tex["s_tau"] = (rf"\sigma_\tau=\frac{{X}}{{Y}}\sqrt{{\frac{{\sigma_X^2}}{{X^2}}+\frac{{\sigma_Y^2}}{{Y^2}}}}"
                        rf"\qquad=\frac{{{fix(abs(X), 2, True)}}}{{{fix(abs(Y), 2, True)}}}\sqrt{{\frac{{{sig(sX, 3, True)}^2}}{{{fix(abs(X), 2, True)}^2}}+\frac{{{sig(sY, 4, True)}^2}}{{{fix(abs(Y), 2, True)}^2}}}}"
                        rf"\qquad\approx{sig(s_tau * US, 3, True)}\cdot10^{{-6}}\ \mathrm{{s}}")
    g.update({"X": fix(X), "Y": fix(Y), "tau_us": fix(tau * US), "sX": sig(sX, 3), "sY": sig(sY, 4), "tex": tex, "Ncomb": whole(Ncomb), "Nsum": whole(Nsum),
              "X_rates": f"{X_rounded:f}".replace("-", "−") if X_rounded != Decimal(fix(X).replace("−", "-")) else ""})
    if s_tau is not None and s_tau > 0:
        r = round_report(tau * US, s_tau * US)
        g.update({"s_tau_us": sig(s_tau * US, 3), "report": r.text("μs"), "rel_pct": fmt_sig(rel * 100, 2),
                  "tau_r": r.value_mant, "s_r": r.unc_mant, "exp": r.exponent, "unc_digits": r.unc_digits,
                  "pm": f"{fix(tau * US)} ± {sig(s_tau * US, 3)}"})
    return {"X": X, "Y": Y, "tau": tau, "sX": sX, "sY": sY, "s_tau": s_tau}


def analyze(params: dict, k: dict, options: dict) -> dict:
    res = Result(round_up=options.get("round_up", False))
    sets, data_rows, done = [], [], []
    for i, row in enumerate(params.get("sets") or []):
        if all(is_blank(row.get(kk)) for kk in KEYS[1:]):
            continue
        g, vals, rates = _set(i, row)
        g["excluded"] = bool(row.get("excluded"))
        if g["complete"]:
            w = _work(g, vals, rates)
            if not g["excluded"]:  # Exclude (Data tab): e.g. a set redone after a negative τ — kept in the sheet, left out of the results
                done.append((g, vals, rates, w))
        sets.append(g)
        data_rows.append({"id": g["id"], **{r: g[r] for r in ("nb", "n1", "n2", "n12")},
                          "X": g.get("X", ""), "Y": g.get("Y", ""), "tau": g.get("tau_us", ""), "s_tau": g.get("s_tau_us", "")})

    res.table("data", "Count rates and dead time per set (eq. 2.3)", [
        {"key": "nb", "label": "n_b", "unit": "c/s"}, {"key": "n1", "label": "n₁b", "unit": "c/s"}, {"key": "n2", "label": "n₂b", "unit": "c/s"},
        {"key": "n12", "label": "n₁₂b", "unit": "c/s"}, {"key": "X", "label": "X", "unit": "c/s"}, {"key": "Y", "label": "Y", "unit": "c²/s²"},
        {"key": "tau", "label": "τ", "unit": "μs"}, {"key": "s_tau", "label": "σ_τ", "unit": "μs"}], data_rows,
        note="n = N/T. X = n₁b + n₂b − n₁₂b − n_b, Y = 2(n₁b·n₂b − n₁₂b·n_b), τ = X/Y.")
    res.table("sheet", "Lab-sheet table (§2.4 layout, as on the final sheet)", [
        {"key": "no", "label": "No.", "unit": ""}, {"key": "T", "label": "T", "unit": "s"},
        {"key": "Nb", "label": "N_b", "unit": ""}, {"key": "nb", "label": "n_b", "unit": "c/s"},
        {"key": "N1", "label": "N₁b", "unit": ""}, {"key": "n1", "label": "n₁b", "unit": "c/s"},
        {"key": "N2", "label": "N₂b", "unit": ""}, {"key": "n2", "label": "n₂b", "unit": "c/s"},
        {"key": "N12", "label": "N₁₂b", "unit": ""}, {"key": "n12", "label": "n₁₂b", "unit": "c/s"},
        {"key": "pm", "label": "τ ± σ_τ", "unit": "μs"}],
        [{**{kk: g.get(kk, "") for kk in ("id", "no", "T", "Nb", "nb", "N1", "n1", "N2", "n2", "N12", "n12", "pm")}, "excluded": g["excluded"]} for g in sets],
        note="Rates and τ with 2 decimals, σ_τ with 3 significant digits, as on the sheet. The rounded results are in the conclusions table.")

    # optional first background (procedure step 1) — a check that every set's n_b is the same background
    bg = params.get("background0") or {}
    nb0 = None
    if not is_blank(bg.get("N")) and not is_blank(bg.get("T")):
        N0, T0 = parse_number(bg.get("N"), "background0.N"), parse_number(bg.get("T"), "background0.T")
        if T0 <= 0:
            raise ParseError("The counting time must be positive", field="background0.T")
        nb0, s0 = N0 / T0, sqrt(N0) / T0
        res.value("nb0", nb0, s0 if N0 > 0 else None, "s⁻¹", "first background n_b (procedure step 1)", group="checks")
        for g, vals, rates, _ in done:
            sb = sqrt(vals["Nb"]) / vals["T"]
            den = sqrt(s0 ** 2 + sb ** 2)
            if den > 0 and abs(rates["nb"] - nb0) / den > 3:
                res.warn("background", f"Set {g['no']}: n_b = {g['nb']} c/s differs from the first background {fix(nb0)} c/s by more than 3σ. "
                         "Was a source still uncovered, or a source from the next bench nearby?")

    if not done:
        res.info("need_sets", "Type T and all four counts (N_b, N₁b, N₂b, N₁₂b) of a set to get its dead time.")
        res.extra["guide"] = {"sets": sets, "n": 0}
        return res.to_json()
    if len(done) < 3:
        res.info("few_sets", f"{len(done)} complete set(s); the guide asks for at least three (§2.4 step 7).")

    for g, vals, rates, w in done:
        tag = f"Set {g['no']}"
        if w["tau"] <= 0:
            res.warn("negative", f"{tag}: τ = {g['tau_us']} μs ≤ 0 because n₁₂b + n_b ≥ n₁b + n₂b. The loss of counts is smaller than its own "
                     f"statistical fluctuation (σ_X ≈ {g['sX']} c/s). Possible (Q7), but measure another set, or count 100 s.")
        if rates["n12"] < max(rates["n1"], rates["n2"]):
            res.warn("lid", f"{tag}: the rate with both sources ({g['n12']}) is lower than with one source alone. Was the lid really open on both?")
        if w["s_tau"] is not None and w["s_tau"] > 0:
            res.value(f"tau{g['no']}", w["tau"] * US, w["s_tau"] * US, "μs", f"dead time τ, set {g['no']}", group="results")
        else:
            res.value(f"tau{g['no']}", w["tau"] * US, None, "μs", f"dead time τ, set {g['no']}", sig=5, group="results")
    rel = [w["s_tau"] / abs(w["tau"]) for *_, w in done if w["s_tau"] and w["tau"] != 0]
    if rel and max(rel) > mpf("0.5"):
        res.info("precision", f"σ_τ/τ up to {fmt_sig(max(rel) * 100, 2)} %: normal for 60–100 s counts. X is a small difference of large rates, so its Poisson "
                 "error dominates. σ_τ falls only as 1/√T: four times longer counts halve it.")

    # steps for the first complete set (the sheet works set 1 in full)
    g, vals, rates, w = done[0]
    t = g["tex"]
    res.step(f"Count rates, set {g['no']}", r"n=\frac{N}{T}", r"\qquad ".join(t["rates"]))
    res.step(f"Dead time, set {g['no']} (eq. 2.3)", r"\tau=\frac{n_{1b}+n_{2b}-n_{12b}-n_b}{2(n_{1b}n_{2b}-n_{12b}n_b)}", t["tau"], rf"{g['tau_us']}\ \mathrm{{\mu s}}")
    res.step("Numerator from the counts (exact)", r"X=n_{1b}+n_{2b}-n_{12b}-n_b", t["X_counts"], g["X"])
    res.step("σ_X (Poisson, σ²_n = N/T²)", r"\sigma_X=\sqrt{\sigma_{n_{1b}}^2+\sigma_{n_{2b}}^2+\sigma_{n_{12b}}^2+\sigma_{n_b}^2}", t["sX"], g["sX"])
    res.step("σ_Y", r"\sigma_Y=2\sqrt{n_{2b}^2\sigma_{n_{1b}}^2+n_{1b}^2\sigma_{n_{2b}}^2+n_b^2\sigma_{n_{12b}}^2+n_{12b}^2\sigma_{n_b}^2}", t["sY"], g["sY"])
    if "s_tau" in t:
        res.step("σ_τ (quotient rule, Q3c/Q4)", r"\sigma_\tau=\frac{X}{Y}\sqrt{\frac{\sigma_X^2}{X^2}+\frac{\sigma_Y^2}{Y^2}}", t["s_tau"], rf"{g['s_tau_us']}\ \mathrm{{\mu s}}")

    res.table("conclusions", "Conclusions (guide §2.7)", [
        {"key": "no", "label": "Set", "unit": ""}, {"key": "tau", "label": "Measured dead-time (τ)", "unit": "μs"},
        {"key": "unc", "label": "Uncertainty", "unit": "μs"}, {"key": "report", "label": "Rounded (§2.8 note)", "unit": ""}],
        [{"no": g["no"], "tau": g["tau_us"], "unc": g.get("s_tau_us", ""), "report": g.get("report", "")} for g, *_ in done],
        note="The values are not averaged: see the note under the table on the sheet (Analysis tab, step 6).")

    ids = [g["id"] for g, *_ in done]
    res.plot({"id": "tau", "title": "Dead time of each set", "x": {"label": "set", "unit": ""}, "y": {"label": "τ", "unit": "μs"},
              "series": [series_points("τ ± σ_τ", [mpf(g["no"]) for g, *_ in done], [w["tau"] * US for *_, w in done],
                                       [(w["s_tau"] or 0) * US for *_, w in done], [f"set {g['no']}" for g, *_ in done], ids)]})

    # Advanced -------------------------------------------------------------------------------------
    for g, vals, rates, w in done:
        n1, n2, n12, nb = rates["n1"], rates["n2"], rates["n12"], rates["nb"]
        te = solve_exact(n1, n2, n12, nb)
        if te is not None:
            res.value(f"adv.exact{g['no']}", te * US, None, "μs", f"set {g['no']}: exact solution of eq. 2.2 (non-paralysable, Knoll)", sig=5, group="advanced")
        if w["tau"] != 0:
            res.value(f"adv.grad{g['no']}", grad_sigma(n1, n2, n12, nb, vals["T"]) * US, None, "μs",
                      f"set {g['no']}: σ_τ from the full partial derivatives of eq. 2.3 (quotient rule: {g.get('s_tau_us', '—')} μs)", sig=3, group="advanced")
    if len(done) >= 2:
        T = sum(v["T"] for _, v, _, _ in done)
        tot = {kk: sum(v[kk] for _, v, _, _ in done) for kk in KEYS[1:]}
        p = {"n1": tot["N1"] / T, "n2": tot["N2"] / T, "n12": tot["N12"] / T, "nb": tot["Nb"] / T}
        tp = tau_of(p["n1"], p["n2"], p["n12"], p["nb"])
        sp = grad_sigma(p["n1"], p["n2"], p["n12"], p["nb"], T)
        res.value("adv.pooled", tp * US, sp * US, "μs", "all sets pooled: add the counts and times, then eq. 2.3 (not asked by the guide)", group="advanced")
        if tp > 0:
            res.value("adv.loss12", p["n12"] * tp * 100, None, "%", "counts lost with both sources ≈ n₁₂b·τ", sig=2, group="advanced")

    res.extra["guide"] = {"sets": sets, "n": len(done), "nb0": fix(nb0) if nb0 is not None else None}
    return res.to_json()
