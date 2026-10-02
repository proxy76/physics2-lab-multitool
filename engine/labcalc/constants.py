"""Physical constants and reference data, each with source and year (see docs/SOURCES.md).

Two global constant sets:

* ``codata`` (default): exact SI 2019 values + CODATA 2022 (NIST, fetched 2026-10-02).
* ``guide``: the rounded values printed in LaboratoryGuide.pdf, so students can reproduce
  the guide's own numbers (e.g. the 3.3×10⁻¹⁰ of eq. 4.8).

Values are stored as decimal strings and turned into ``mpf`` at the *current* precision on
every call, so the dps = 100 self-check really recomputes everything at 100 digits.
"""

from __future__ import annotations

from mpmath import mpf, sqrt

CODATA_SRC = "CODATA 2022, NIST (physics.nist.gov/cuu/Constants), accessed 2026-10-02"
SI_SRC = "SI 2019 exact definition"

# name: (value string, unit, symbol, source, description)
_CODATA = {
    "c": ("299792458", "m/s", "c", SI_SRC, "speed of light in vacuum"),
    "h": ("6.62607015e-34", "J·s", "h", SI_SRC, "Planck constant"),
    "e": ("1.602176634e-19", "C", "e", SI_SRC, "elementary charge"),
    "me": ("9.1093837139e-31", "kg", "m_e", CODATA_SRC, "electron mass (u = 2.8e-40 kg)"),
    "mec2_MeV": ("0.51099895069", "MeV", "m_ec^2", CODATA_SRC, "electron rest energy"),
    "eps0": ("8.8541878188e-12", "F/m", r"\varepsilon_0", CODATA_SRC, "vacuum electric permittivity"),
    "mu0": ("1.25663706127e-6", "N/A²", r"\mu_0", CODATA_SRC, "vacuum magnetic permeability"),
    "Rinf": ("10973731.568157", "m⁻¹", r"R_\infty", CODATA_SRC, "Rydberg constant (infinite nuclear mass)"),
    "mp_me": ("1836.152673426", "", r"m_p/m_e", CODATA_SRC, "proton–electron mass ratio"),
}

GUIDE_SRC = "LaboratoryGuide.pdf"
_GUIDE = {
    "c": ("3e8", "m/s", "c", GUIDE_SRC + " §4.2", "speed of light"),
    "h": ("6.626e-34", "J·s", "h", GUIDE_SRC + " §3.2 (Exp. 4 uses 6.63e-34)", "Planck constant"),
    "e": ("1.6e-19", "C", "e", GUIDE_SRC + " §3.2, §4.2", "elementary charge"),
    "me": ("9.1e-31", "kg", "m_e", GUIDE_SRC + " §3.2, §4.2", "electron mass"),
    "mec2_MeV": None,  # derived from me, c, e below
    "eps0": ("8.854e-12", "F/m", r"\varepsilon_0", GUIDE_SRC + " §3.2", "vacuum permittivity"),
    "mu0": ("1.2566370614359172954e-6", "N/A²", r"\mu_0", GUIDE_SRC + " §1.2 (4π×10⁻⁷)", "magnetic constant"),
    "Rinf": ("1.09737e7", "m⁻¹", "R", GUIDE_SRC + " §3.8 Q3", "Rydberg constant"),
    "mp_me": ("1836.152673426", "", r"m_p/m_e", CODATA_SRC, "proton–electron mass ratio"),
}

# Per-experiment overrides of the guide set (the guide prints different rounding per chapter)
GUIDE_OVERRIDES = {
    "exp4": {"h": "6.63e-34"},
}


def get(set_name: str = "codata", exp: str | None = None) -> dict:
    """Return a dict of mpf constants for ``set_name`` ('codata' | 'guide')."""
    src = _GUIDE if set_name == "guide" else _CODATA
    k = {}
    for name, item in src.items():
        if item is None:
            continue
        k[name] = mpf(item[0])
    if set_name == "guide" and exp in GUIDE_OVERRIDES:
        for name, v in GUIDE_OVERRIDES[exp].items():
            k[name] = mpf(v)
    if "mec2_MeV" not in k:
        k["mec2_MeV"] = k["me"] * k["c"] ** 2 / k["e"] / mpf("1e6")
    # derived (never typed)
    k["hc_eVnm"] = k["h"] * k["c"] / k["e"] * mpf("1e9")
    k["hc_e"] = k["h"] * k["c"] / k["e"]  # V·m
    k["RH"] = k["Rinf"] / (1 + 1 / k["mp_me"])
    k["eV"] = k["e"]
    k["set"] = set_name
    return k


def table(set_name: str = "codata") -> list[dict]:
    """Constants table for the UI (G7): value, unit, source."""
    src = _GUIDE if set_name == "guide" else _CODATA
    rows = []
    for name, item in src.items():
        if item is None:
            continue
        v, unit, sym, source, desc = item
        rows.append({"name": name, "symbol": sym, "value": v, "unit": unit, "source": source, "description": desc})
    k = get(set_name)
    from .rounding import full

    rows.append({"name": "hc_eVnm", "symbol": "hc", "value": full(k["hc_eVnm"], 20), "unit": "eV·nm", "source": "derived", "description": "h·c/e"})
    rows.append({"name": "RH", "symbol": "R_H", "value": full(k["RH"], 15), "unit": "m⁻¹", "source": "derived: R∞/(1 + mₑ/m_p)", "description": "Rydberg constant for hydrogen"})
    return rows


# ---------------------------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------------------------

XCOM_SRC = "NIST XCOM, total attenuation with coherent scattering at 0.6617 MeV, accessed 2026-10-02"
DENS_SRC = "NIST X-Ray Mass Attenuation Coefficients, Table 1 (Hubbell & Seltzer)"

MATERIALS = {
    # mu_rho in cm²/g (with coherent), rho in g/cm³
    "Al": {"name": "Aluminium", "Z": 13, "rho": "2.699", "mu_rho": "7.468e-2", "mu_rho_nocoh": "7.435e-2",
           "photo": "6.566e-5", "compton": "7.428e-2", "ZA": "0.48181"},
    "Fe": {"name": "Iron", "Z": 26, "rho": "7.874", "mu_rho": "7.348e-2", "mu_rho_nocoh": "7.248e-2",
           "photo": "8.724e-4", "compton": "7.161e-2", "ZA": "0.46556"},
    "Pb": {"name": "Lead", "Z": 82, "rho": "11.35", "mu_rho": "1.102e-1", "mu_rho_nocoh": "1.035e-1",
           "photo": "4.338e-2", "compton": "6.015e-2", "ZA": "0.39575"},
}

CS137 = {
    "T_half_y": "30.08", "T_half_unc_y": "0.09", "T_half_src": "NNDC NuDat 3",
    "T_half_y_lnhb": "30.018", "T_half_unc_y_lnhb": "0.022",
    "E_gamma_keV": "661.657", "I_gamma": "0.8510", "I_gamma_unc": "0.0020", "I_gamma_lnhb": "0.8501",
}

# Exp 3 Table 3.1 (guide) and NIST ASD observed air wavelengths, nm
HG_LINES_GUIDE = ["404.7", "407.8", "433.9", "434.7", "435.8", "535.4", "546.1", "577.0", "579.0", "612.3", "623.4"]
HG_LINES_NIST = ["404.6565", "407.7837", "433.92232", "434.74945", "435.8335", "535.4034", "546.0750", "576.9610", "579.0670", "612.327", "623.436"]

# Balmer lines: (label, n_i, NIST observed air wavelength nm)
BALMER = [("Hα", 3, "656.279"), ("Hβ", 4, "486.135"), ("Hγ", 5, "434.0472"), ("Hδ", 6, "410.1734"), ("Hε", 7, "397.0075")]

# Exp 7 Hg lines (guide §7.3.2)
HG_FILTERS = [("UV", "365.4"), ("violet", "404.7"), ("blue", "435.8"), ("green", "546.1"), ("yellow", "578.2")]

# Exp 4 reference spacings (guide §4.7)
GRAPHITE_D = {"d1": "2.13e-10", "d2": "1.23e-10"}

# Exp 5 guide parameters
EXP5 = {"eps": "0.2", "D_cm": "2.54", "S": "1"}


def material(sym: str) -> dict | None:
    m = MATERIALS.get(sym)
    if not m:
        return None
    out = dict(m)
    for key in ("rho", "mu_rho", "mu_rho_nocoh", "photo", "compton", "ZA"):
        out[key] = mpf(m[key])
    out["mu"] = out["mu_rho"] * out["rho"]
    return out


def hc_check(k: dict):
    """hc/e in V·nm, used by Exp 7's live difference check."""
    return k["h"] * k["c"] / k["e"] * mpf("1e9")


def graphite_C(k: dict, L_m):
    """C = 2 L h / sqrt(2 m_e e) in m·V^(1/2) (eq. 4.7)."""
    return 2 * L_m * k["h"] / sqrt(2 * k["me"] * k["e"])
