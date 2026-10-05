import { describe, expect, it } from "vitest";
import { parseDecimal, roundDigits, roundSig } from "./digits";

describe("parseDecimal", () => {
  it("reads sign, digits and exponent of the first digit", () => {
    expect(parseDecimal("123.45")).toEqual({ neg: false, digits: "12345", exp: 2 });
    expect(parseDecimal("-0.00123")).toEqual({ neg: true, digits: "123", exp: -3 });
    expect(parseDecimal("4.128e-15")).toEqual({ neg: false, digits: "4128", exp: -15 });
    expect(parseDecimal("5.0")).toEqual({ neg: false, digits: "5", exp: 0 });
    expect(parseDecimal("0")).toEqual({ neg: false, digits: "0", exp: 0 });
    expect(parseDecimal("abc")).toBeNull();
  });
});

describe("roundDigits (half-up, carries)", () => {
  it("rounds and carries into a new leading digit", () => {
    expect(roundDigits("12345", 0, 3)).toEqual({ digits: "123", exp: 0 });
    expect(roundDigits("12350", 0, 3)).toEqual({ digits: "124", exp: 0 });
    expect(roundDigits("9996", 0, 3)).toEqual({ digits: "100", exp: 1 });
    expect(roundDigits("5", 0, 3)).toEqual({ digits: "500", exp: 0 });
  });
});

describe("roundSig", () => {
  it("keeps plain notation for moderate magnitudes", () => {
    expect(roundSig("123.456789", 6)).toBe("123.457");
    expect(roundSig("-1.54684526223933206797698251759", 10)).toBe("−1.546845262");
    expect(roundSig("0.00340329921850504976382208325285", 4)).toBe("0.003403");
    expect(roundSig("156410", 6)).toBe("156410");
    expect(roundSig("999.96", 4)).toBe("1000");
  });
  it("uses ×10ⁿ for very large and very small values", () => {
    expect(roundSig("4.12826860122117735217142356573e-15", 6)).toBe("4.12827×10⁻¹⁵");
    expect(roundSig("6.62607015e-34", 15)).toBe("6.62607015000000×10⁻³⁴");
    expect(roundSig("299792458", 6)).toBe("2.99792×10⁸");
  });
  it("never goes through a float: 30 digits survive", () => {
    const s = "1.23456789012345678901234567891";
    expect(roundSig(s, 30)).toBe("1.23456789012345678901234567891");
  });
  it("returns input it cannot read", () => {
    expect(roundSig("n/a", 6)).toBe("n/a");
  });
});
