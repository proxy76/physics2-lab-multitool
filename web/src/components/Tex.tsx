// KaTeX is loaded on demand (≈ 330 kB of JS + CSS the first screen does not need). Until it arrives
// (instant from the offline cache) a formula renders as a quiet placeholder of the same font size.
import { memo, useEffect, useState } from "react";

type Katex = typeof import("katex").default;
let katex: Katex | null = null;
let loading: Promise<Katex> | null = null;

export function loadKatex(): Promise<Katex> {
  loading ??= Promise.all([import("katex"), import("katex/dist/katex.min.css")]).then(([m]) => (katex = m.default));
  return loading;
}

const cache = new Map<string, string>();

function render(k: Katex, tex: string, display: boolean): string {
  const key = (display ? "D" : "I") + tex;
  let html = cache.get(key);
  if (html === undefined) {
    html = k.renderToString(display ? stacked(tex) : tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "html" });
    cache.set(key, html);
  }
  return html;
}

export const Tex = memo(function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const [k, setK] = useState<Katex | null>(katex);
  useEffect(() => {
    if (!k) void loadKatex().then(setK);
  }, [k]);
  if (!tex) return null;
  const cls = className ?? (display ? "tex-block" : "tex");
  if (!k) return <span className={`${cls} tex-pending`} aria-busy="true" />;
  return <span className={cls} dangerouslySetInnerHTML={{ __html: render(k, tex, display) }} />;
});

// Display equations written side by side ("a,\qquad b") are stacked so they fit a phone.
export function stacked(tex: string) {
  const parts = tex.split(/,?\s*\\qquad\s*/);
  return parts.length < 2 ? tex : String.raw`\begin{gathered}` + parts.join(String.raw`\\[6pt]`) + String.raw`\end{gathered}`;
}
