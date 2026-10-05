// Labels are written with ASCII subscripts ("σ_n′", "N_b", "λ_{Hg}"); this renders them as real
// subscripts so a symbol on screen looks like the one in the guide.
import { Fragment, type ReactNode } from "react";

const SUB = /_(\{[^}]+\}|[\p{L}\p{Nd}′]+)/gu; // \p{Nd}: decimal digits only, so "σ_n²" keeps its exponent

export function subParts(text: string): { base: string; sub?: string }[] {
  const out: { base: string; sub?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(SUB)) {
    out.push({ base: text.slice(last, m.index), sub: m[1].replace(/^\{|\}$/g, "") });
    last = m.index! + m[0].length;
  }
  if (last < text.length || !out.length) out.push({ base: text.slice(last) });
  return out;
}

export function Sym({ text }: { text: string }): ReactNode {
  if (!text.includes("_")) return text;
  return subParts(text).map((p, i) => (
    <Fragment key={i}>
      {p.base}
      {p.sub !== undefined && <sub>{p.sub}</sub>}
    </Fragment>
  ));
}
