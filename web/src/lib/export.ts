import type { ResultTable } from "./engineTypes";

const head = (c: { label: string; unit: string }) => (c.unit ? `${c.label} (${c.unit})` : c.label);
const cell = (v: unknown) => (v === true ? "excluded" : v === false || v == null ? "" : String(v));

export function tableToCSV(t: ResultTable): string {
  const esc = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [t.columns.map((c) => esc(head(c))).join(",")];
  for (const r of t.rows) lines.push(t.columns.map((c) => esc(cell(r[c.key]))).join(","));
  return lines.join("\n") + "\n";
}

// Unicode → LaTeX for the symbols the engine uses in reports
const TEX_MAP: [RegExp, string][] = [
  [/±/g, "\\pm "], [/×10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, "\\times10^{$1}"], [/−/g, "-"], [/μ/g, "\\mu "], [/λ/g, "\\lambda "], [/σ/g, "\\sigma "],
  [/Λ/g, "\\Lambda "], [/Ω/g, "\\Omega "], [/ν/g, "\\nu "], [/ρ/g, "\\rho "], [/·/g, "\\cdot "], [/%/g, "\\%"], [/_/g, "\\_"],
];
const SUP: Record<string, string> = { "⁻": "-", "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };

export function toTex(s: string): string {
  let o = s;
  for (const [re, rep] of TEX_MAP) o = o.replace(re, rep);
  o = o.replace(/\{([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)\}/g, (_, g: string) => "{" + g.split("").map((c) => SUP[c] ?? c).join("") + "}");
  o = o.replace(/([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (g: string) => "$^{" + g.split("").map((c) => SUP[c] ?? c).join("") + "}$");
  return /\\(pm|times|mu|lambda|sigma|Lambda|Omega|nu|rho|cdot)/.test(o) ? `$${o.replace(/\$/g, "")}$` : o;
}

export function tableToLatex(t: ResultTable): string {
  const cols = t.columns;
  const lines = [
    "\\begin{table}[h]",
    "\\centering",
    `\\begin{tabular}{${"c".repeat(cols.length)}}`,
    "\\hline",
    cols.map((c) => toTex(head(c))).join(" & ") + " \\\\",
    "\\hline",
    ...t.rows.map((r) => cols.map((c) => toTex(cell(r[c.key]))).join(" & ") + " \\\\"),
    "\\hline",
    "\\end{tabular}",
    `\\caption{${toTex(t.title)}}`,
    "\\end{table}",
  ];
  return lines.join("\n") + "\n";
}

export function tableToMarkdown(t: ResultTable): string {
  const cols = t.columns;
  return [
    `| ${cols.map(head).join(" | ")} |`,
    `| ${cols.map(() => "---").join(" | ")} |`,
    ...t.rows.map((r) => `| ${cols.map((c) => cell(r[c.key])).join(" | ")} |`),
  ].join("\n") + "\n";
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
