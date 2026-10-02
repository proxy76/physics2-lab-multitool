import json

from labcalc import api


def ok(tool, params, **kw):
    r = api.dispatch(tool, params, **kw)
    assert r["ok"], r.get("error")
    return r["result"]


def test_stats_tool():
    r = ok("stats", {"values": "1,2\n1,4\n1,3", "unit": "V"})
    assert r["values"]["mean"]["report"] == "(1.30 ± 0.06) V"


def test_counting_tool_modes():
    r = ok("counting", {"mode": "rate", "N": "10000", "t": "100", "Nb": "600", "tb": "600"})
    assert r["values"]["net"]["report"].startswith("(99")
    r = ok("counting", {"mode": "planner", "n": "50", "eps": "1"})
    assert r["values"]["t"]["report"] == "200 s"


def test_linfit_tool_and_inverse():
    r = ok("linfit", {"x": "1 2 3 4 5", "y": "2.1 3.9 6.2 7.8 10.1", "y0": "5", "sy0": "0.1"})
    assert "x0" in r["values"] and r["plots"][0]["residuals"]


def test_propagate_tool_with_mc():
    r = ok("propagate", {"expr": "x*y", "variables": [{"name": "x", "value": "2", "sigma": "0.1"}, {"name": "y", "value": "3", "sigma": "0.2"}],
                         "mc": True, "mc_n": 20000})
    assert r["values"]["f"]["report"] == "6.0 ± 0.5"
    assert "mc" in r["extra"]


def test_report_tool():
    r = ok("report", {"value": "12345.678", "unc": "23", "unit": "Bq", "ref": "12300", "sref": "10"})
    assert r["values"]["report"]["report"] == "(1.235 ± 0.002)×10⁴ Bq"
    assert r["extra"]["compare"][0]["verdict"] == "compatible"
    r = ok("report", {"value": "1.5"})
    assert r["warnings"][0]["code"] == "no_unc"


def test_graphical_tool():
    r = ok("graphical", {"mode": "max_min", "max_x1": "0", "max_y1": "0", "max_x2": "1", "max_y2": "2.2",
                         "min_x1": "0", "min_y1": "0", "min_x2": "1", "min_y2": "1.8"})
    assert r["values"]["a"]["report"] == "2.0 ± 0.2"
    r = ok("graphical", {"mode": "scale", "x": "0 1 2 3", "y": "0.11 0.45"})
    assert r["extra"]["layout"]["paper"] == "A4 portrait"


def test_units_and_constants():
    r = ok("units", {"value": "546.1", "from": "nm"})
    assert "to.eV" in r["values"]
    r = ok("constants", {"set": "codata"})
    assert any(c["name"] == "me" for c in r["extra"]["constants"])


def test_decay_tool():
    r = ok("decay", {"A0": "370000", "date_ref": "2000-01-01", "date": "2026-10-02"})
    assert float(r["values"]["ratio"]["value"]) < 0.6


def test_errors():
    r = api.dispatch("stats", {"values": "abc"})
    assert not r["ok"] and r["error"]["field"] == "values[0]"
    r = api.dispatch("nope", {})
    assert r["error"]["code"] == "unknown_tool"


def test_dispatch_json_roundtrip():
    out = json.loads(api.dispatch_json(json.dumps({"id": "7", "tool": "selftest", "params": {}})))
    assert out["id"] == "7" and out["ok"]
