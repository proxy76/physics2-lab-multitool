import { describe, expect, it } from "vitest";
import { looksNumeric } from "./Field";
import { subParts } from "./Sym";

describe("looksNumeric mirrors labcalc.parse (brief §2, §4.6)", () => {
  it.each(["1,5", "1.5", "1.5e-3", "1.5E-3", "1.5×10^-3", "1.5*10^-3", "1.6x10^-19", "−2", " 3 ", "1.6×10⁻¹⁹", ".5", ",5", "+4", ""])("accepts %j", (s) => {
    expect(looksNumeric(s)).toBe(true);
  });
  it.each(["1,2,3", "abc", "1.2.3", "1,2.3", "12a", "--1"])("rejects %j", (s) => {
    expect(looksNumeric(s)).toBe(false);
  });
});

describe("subParts turns ASCII subscripts into parts", () => {
  it("splits symbol and subscript", () => {
    expect(subParts("σ_n′")).toEqual([{ base: "σ", sub: "n′" }]);
    expect(subParts("Background N_b")).toEqual([{ base: "Background N", sub: "b" }]);
    expect(subParts("λ_{Hg} (nm)")).toEqual([{ base: "λ", sub: "Hg" }, { base: " (nm)" }]);
    expect(subParts("n = n′ − n_b, σ_n = √(σ_n′² + σ_nb²)")).toEqual([
      { base: "n = n′ − n", sub: "b" }, { base: ", σ", sub: "n" }, { base: " = √(σ", sub: "n′" }, { base: "² + σ", sub: "nb" }, { base: "²)" },
    ]);
  });
  it("leaves text without underscores alone", () => {
    expect(subParts("Thickness")).toEqual([{ base: "Thickness" }]);
  });
});
