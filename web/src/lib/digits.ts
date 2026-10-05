// Rounding of the engine's decimal strings for the "full precision" view. Pure string/digit
// manipulation: JavaScript never turns a result into a float (brief §3.2, decision D5).

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const sup = (e: number) => String(e).replace(/./g, (c) => SUP[c] ?? c);

/** Split "−1.2345e-7" into sign, digit string without leading zeros, and the decimal exponent of the first digit. */
export function parseDecimal(s: string): { neg: boolean; digits: string; exp: number } | null {
  const m = /^\s*([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?\s*$/.exec(s.replace("−", "-"));
  if (!m || (!m[2] && !m[3])) return null;
  const int = m[2] || "";
  const frac = m[3] || "";
  let all = int + frac;
  let exp = int.length - 1 + (m[4] ? parseInt(m[4], 10) : 0);
  const lead = all.search(/[1-9]/);
  if (lead < 0) return { neg: false, digits: "0", exp: 0 };
  all = all.slice(lead);
  exp -= lead;
  return { neg: m[1] === "-", digits: all.replace(/0+$/, "") || "0", exp };
}

/** Round half-up to n significant digits; returns digits (length n) and the possibly bumped exponent. */
export function roundDigits(digits: string, exp: number, n: number): { digits: string; exp: number } {
  const d = digits.padEnd(n, "0");
  if (d.length <= n) return { digits: d, exp };
  const kept = d.slice(0, n).split("").map(Number);
  if (Number(d[n]) >= 5) {
    let i = n - 1;
    while (i >= 0) {
      if (kept[i] < 9) {
        kept[i] += 1;
        break;
      }
      kept[i] = 0;
      i -= 1;
    }
    if (i < 0) return { digits: "1" + "0".repeat(n - 1), exp: exp + 1 };
  }
  return { digits: kept.join(""), exp };
}

/** "123.456789…" → "123.457" (n = 6); very large/small magnitudes use ×10ⁿ. */
export function roundSig(s: string, n: number): string {
  const p = parseDecimal(s);
  if (!p) return s;
  if (p.digits === "0") return "0";
  const r = roundDigits(p.digits, p.exp, Math.max(1, n));
  const sign = p.neg ? "−" : "";
  if (r.exp >= -4 && r.exp < Math.max(n, 6)) {
    if (r.exp < 0) return `${sign}0.${"0".repeat(-r.exp - 1)}${r.digits}`;
    const int = r.digits.slice(0, r.exp + 1).padEnd(r.exp + 1, "0");
    const frac = r.digits.slice(r.exp + 1);
    return sign + int + (frac ? "." + frac : "");
  }
  return `${sign}${r.digits[0]}${r.digits.length > 1 ? "." + r.digits.slice(1) : ""}×10${sup(r.exp)}`;
}
