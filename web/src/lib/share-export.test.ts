import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import type { ResultTable } from "./engineTypes";
import { tableToCSV, tableToLatex, tableToMarkdown, toTex } from "./export";
import { decodeShare, parseImportFile, payloadOf, shareLink } from "./share";
import type { Session } from "./store";

const session: Session = {
  id: "s1", exp: "5", name: "Tuesday run", created: 1, updated: 2, step: 3, checks: {},
  data: { rows: [{ id: "r0", r: "2,5", t: "100", N: "156410" }], background: { N: "1500", t: "600" } },
};

describe("share links", () => {
  it("round-trips a session through the URL fragment", () => {
    const link = shareLink(session);
    expect(link).toMatch(/#\/import\//);
    const code = link.split("#/import/")[1];
    const p = decodeShare(code);
    expect(p).toEqual(payloadOf(session));
    // strings stay strings: the decimal comma is not touched
    expect((p!.data as typeof session.data).rows[0].r).toBe("2,5");
  });
  it("rejects garbage and payloads without data", () => {
    expect(decodeShare("not-a-code")).toBeNull();
    expect(decodeShare(compressToEncodedURIComponent(JSON.stringify({ v: 1, exp: "5" })))).toBeNull();
  });
  it("imports single, list and 'export everything' JSON files", () => {
    const one = JSON.stringify(payloadOf(session));
    expect(parseImportFile(one)).toHaveLength(1);
    expect(parseImportFile(JSON.stringify([payloadOf(session), payloadOf({ ...session, exp: "6" })])).map((p) => p.exp)).toEqual(["5", "6"]);
    expect(parseImportFile(JSON.stringify({ sessions: [payloadOf(session)] }))[0].name).toBe("Tuesday run");
    expect(parseImportFile(JSON.stringify({ hello: 1 }))).toHaveLength(0);
  });
});

const table: ResultTable = {
  id: "data", title: "Data table (guide §5.4)",
  columns: [{ key: "r", label: "r", unit: "cm" }, { key: "n", label: "σ_n", unit: "s⁻¹" }, { key: "note", label: "note", unit: "" }],
  rows: [{ id: "a", r: "2.0", n: "(1.235 ± 0.002)×10⁴", note: 'shield "moved", re-measured' }, { id: "b", r: "3.0", n: "4", note: "" }],
} as ResultTable;

describe("table exports", () => {
  it("CSV escapes quotes and commas", () => {
    const csv = tableToCSV(table).split("\n");
    expect(csv[0]).toBe("r (cm),σ_n (s⁻¹),note");
    expect(csv[1]).toBe('2.0,(1.235 ± 0.002)×10⁴,"shield ""moved"", re-measured"');
  });
  it("Markdown has a header separator per column", () => {
    const md = tableToMarkdown(table).split("\n");
    expect(md[1]).toBe("| --- | --- | --- |");
    expect(md).toHaveLength(5);
  });
  it("LaTeX converts ±, ×10ⁿ and subscripts", () => {
    expect(toTex("(1.235 ± 0.002)×10⁴")).toBe("(1.235 $\\pm$ 0.002)$\\times10^{4}$");
    expect(toTex("σ_n (s⁻¹)")).toBe("$\\sigma_{n}$ (s$^{-1}$)");
    expect(toTex("x_Hg (mm)")).toBe("x$_{\\mathrm{Hg}}$ (mm)");
    expect(toTex("λ⁻² (µm⁻²)")).toBe("$\\lambda^{-2}$ ($\\mu$m$^{-2}$)");
    expect(toTex("Ω/4π exact")).toBe("$\\Omega$/4$\\pi$ exact");
    expect(toTex("−1.547")).toBe("$-$1.547");
    expect(toTex("approx. error (%)")).toBe("approx. error (\\%)");
    const tex = tableToLatex(table);
    expect(tex).toContain("\\begin{tabular}{ccc}");
    expect(tex.trim().endsWith("\\end{table}")).toBe(true);
  });
});
