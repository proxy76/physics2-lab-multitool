import type { ResultTable } from "./engineTypes";

const head = (c: { label: string; unit: string }) => (c.unit ? `${c.label} (${c.unit})` : c.label);
const cell = (v: unknown) => (v === true ? "excluded" : v === false || v == null ? "" : String(v));

export function tableToCSV(t: ResultTable): string {
  const esc = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [t.columns.map((c) => esc(head(c))).join(",")];
  for (const r of t.rows) lines.push(t.columns.map((c) => esc(cell(r[c.key]))).join(","));
  return lines.join("\n") + "\n";
}

// Unicode → LaTeX for the symbols the engine uses in labels and reports. Each math token becomes its
// own $…$ and adjacent ones are merged, so words stay in text mode (spaces survive) and symbols,
// subscripts and exponents are typeset properly.
const GREEK: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "varepsilon", θ: "theta", λ: "lambda", μ: "mu", µ: "mu", ν: "nu", π: "pi", ρ: "rho",
  σ: "sigma", τ: "tau", φ: "varphi", χ: "chi", ω: "omega", Δ: "Delta", Λ: "Lambda", Ω: "Omega", Σ: "Sigma",
};
const SUP: Record<string, string> = { "⁻": "-", "⁺": "+", "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "½": "1/2" };
const sup = (g: string) => g.split("").map((c) => SUP[c] ?? c).join("");
const m = (tex: string) => `$${tex}$`;

export function toTex(s: string): string {
  let o = s.replace(/([%&#])/g, "\\$1");
  o = o.replace(/×10([⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, g: string) => m(`\\times10^{${sup(g)}}`));
  o = o.replace(/[⁻⁺⁰¹²³⁴⁵⁶⁷⁸⁹½]+/g, (g) => m(`^{${sup(g)}}`));
  o = o.replace(/_(\{[^}]+\}|[\p{L}\p{Nd}′]+)/gu, (_, g: string) => {
    const t = g.replace(/^\{|\}$/g, "");
    return m(`_{${t.length > 1 ? `\\mathrm{${t}}` : t}}`);
  });
  o = o.replace(/[αβγδεθλμµνπρστφχωΔΛΩΣ]/g, (c) => m(`\\${GREEK[c]} `));
  o = o.replace(/±/g, m("\\pm")).replace(/×/g, m("\\times")).replace(/−/g, m("-")).replace(/·/g, m("\\cdot")).replace(/√/g, m("\\surd"));
  // merge adjacent math ("$\sigma $$_{n}$" → "$\sigma _{n}$"), then drop the space that only
  // protected a command name from the next letter
  return o.replace(/\$\$/g, "").replace(/\\([A-Za-z]+) (?=[_^}$])/g, "\\$1");
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
