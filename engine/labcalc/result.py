"""Result container shared by every tool. Serialises to the worker JSON contract.

```
{ values: {name: {value, unc?, unit, report, latex, label}},
  tables: [{id, title, columns:[{key,label,unit}], rows:[{key: display}]}],
  plots:  [{id, title, x:{label,unit}, y:{label,unit}, series:[...], residuals?}],
  steps:  [{title, latex, substituted, result}],
  warnings: [{code, message}],
  extra: {...} }
```
"""

from __future__ import annotations

from mpmath import mpf

from .rounding import full, round_report, tex_sig
from .units import unit_latex


def num(x) -> float:
    """Float for chart coordinates only (never used in the result path)."""
    return float(mpf(x))


class Result:
    def __init__(self, round_up: bool = False):
        self.values: dict = {}
        self.tables: list = []
        self.plots: list = []
        self.steps: list = []
        self.warnings: list = []
        self.extra: dict = {}
        self.round_up = round_up
        self._raw: dict = {}

    # values -----------------------------------------------------------------
    def value(self, name: str, value, unc=None, unit: str = "", label: str = "", sig: int = 6, group: str | None = None):
        """Register a numeric result. ``unc`` may be None (then ``sig`` digits are shown)."""
        entry = {"value": full(value), "unit": unit, "label": label or name}
        if group:
            entry["group"] = group
        self._raw[name] = (mpf(value), None if unc is None else mpf(unc))
        if unc is not None and mpf(unc) > 0:
            r = round_report(value, unc, round_up=self.round_up)
            entry["unc"] = full(unc)
            entry["rel"] = full(abs(mpf(unc) / mpf(value))) if mpf(value) != 0 else None
        else:
            r = round_report(value, None, plain_sig=sig)
            if unc is not None:
                entry["unc"] = "0"
        entry["report"] = r.text(unit)
        entry["latex"] = r.latex(unit_latex(unit))
        self.values[name] = entry
        return entry

    def raw(self, name):
        return self._raw[name]

    # warnings -----------------------------------------------------------------
    def warn(self, code: str, message: str, severity: str = "warn"):
        w = {"code": code, "message": message, "severity": severity}
        if w not in self.warnings:
            self.warnings.append(w)

    def info(self, code: str, message: str):
        self.warn(code, message, "info")

    # steps ----------------------------------------------------------------------
    def step(self, title: str, latex: str = "", substituted: str = "", result: str = ""):
        self.steps.append({"title": title, "latex": latex, "substituted": substituted, "result": result})

    def steps_from(self, steps: list, prefix: str = ""):
        for s in steps:
            s = dict(s)
            if prefix:
                s["title"] = f"{prefix}: {s['title']}"
            self.steps.append(s)

    # tables / plots -------------------------------------------------------------------
    def table(self, id: str, title: str, columns: list, rows: list, note: str = ""):
        t = {"id": id, "title": title, "columns": columns, "rows": rows}
        if note:
            t["note"] = note
        self.tables.append(t)
        return t

    def plot(self, plot: dict):
        self.plots.append(plot)
        return plot

    def to_json(self) -> dict:
        return {
            "values": self.values,
            "tables": self.tables,
            "plots": self.plots,
            "steps": self.steps,
            "warnings": self.warnings,
            "extra": self.extra,
        }


def cell(value, unc=None, sig: int = 6) -> str:
    """Display string for a table cell (lab rule if an uncertainty is given)."""
    if value is None:
        return ""
    if unc is not None and mpf(unc) > 0:
        return round_report(value, unc).text()
    return round_report(value, None, plain_sig=sig).text()


def cell_val_unc(value, unc) -> tuple[str, str]:
    """Value and uncertainty rounded together but displayed in separate columns."""
    if unc is None or mpf(unc) <= 0:
        return cell(value), ""
    r = round_report(value, unc)
    if r.exponent:
        from .rounding import sup

        return f"{r.value_mant}×10{sup(r.exponent)}", f"{r.unc_mant}×10{sup(r.exponent)}"
    return r.value_mant, r.unc_mant


def tx(x, sig: int = 6) -> str:
    return tex_sig(x, sig)
