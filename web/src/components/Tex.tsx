import katex from "katex";
import "katex/dist/katex.min.css";
import { memo } from "react";

const cache = new Map<string, string>();

function render(tex: string, display: boolean): string {
  const key = (display ? "D" : "I") + tex;
  let html = cache.get(key);
  if (html === undefined) {
    html = katex.renderToString(display ? stacked(tex) : tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "html" });
    cache.set(key, html);
  }
  return html;
}

export const Tex = memo(function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  if (!tex) return null;
  return <span className={className ?? (display ? "tex-block" : "tex")} dangerouslySetInnerHTML={{ __html: render(tex, display) }} />;
});

// Display equations written side by side ("a,\qquad b") are stacked so they fit a phone.
export function stacked(tex: string) {
  const parts = tex.split(/,?\s*\\qquad\s*/);
  return parts.length < 2 ? tex : String.raw`\begin{gathered}` + parts.join(String.raw`\\[6pt]`) + String.raw`\end{gathered}`;
}
