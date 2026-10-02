// Tiny rich-text renderer for guide/answer content.
// Blocks (separated by a blank line): paragraphs, "- " bullets, "1. " numbered lists,
// "$$ … $$" display math, "> " callouts, "|a|b|" pipe tables (first row = header, 2nd = ---).
// Inline: **bold**, *italic*, $tex$, {{answers.path}} (engine-generated numbers).
import { Fragment, type ReactNode } from "react";
import { answer } from "../content";
import { Tex } from "./Tex";

export function fill(text: string): string {
  return text.replace(/\{\{([\w.]+)\}\}/g, (_, p: string) => answer(p));
}

function inline(text: string, key = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\$[^$]+\$|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  const t = fill(text);
  while ((m = re.exec(t))) {
    if (m.index > last) out.push(t.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("$")) out.push(<Tex key={key + i++} tex={tok.slice(1, -1)} />);
    else if (tok.startsWith("**")) out.push(<strong key={key + i++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={key + i++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < t.length) out.push(t.slice(last));
  return out;
}

export function Inline({ text }: { text: string }) {
  return <>{inline(text)}</>;
}

function table(lines: string[], k: number) {
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const head = cells(lines[0]);
  const body = lines.slice(lines[1] && /^\|?\s*-+/.test(lines[1]) ? 2 : 1).map(cells);
  return (
    <div className="table-scroll" key={k}>
      <table className="rich-table">
        <thead>
          <tr>{head.map((h, i) => <th key={i}>{inline(h)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Rich({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className={className ?? "rich"}>
      {blocks.map((b, k) => {
        const lines = b.split("\n");
        const trimmed = b.trim();
        if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) return <Tex key={k} tex={fill(trimmed.slice(2, -2))} display />;
        if (lines.every((l) => l.trim().startsWith("|"))) return table(lines, k);
        if (lines.every((l) => /^\s*- /.test(l)))
          return <ul key={k}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*- /, ""), `${k}.${i}`)}</li>)}</ul>;
        if (lines.every((l) => /^\s*\d+\. /.test(l)))
          return <ol key={k}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*\d+\. /, ""), `${k}.${i}`)}</li>)}</ol>;
        if (trimmed.startsWith("> ")) return <p key={k} className="callout">{inline(trimmed.replace(/^> /, ""))}</p>;
        // mixed block: paragraph lines followed by bullets
        const firstBullet = lines.findIndex((l) => /^\s*- /.test(l));
        if (firstBullet > 0 && lines.slice(firstBullet).every((l) => /^\s*- /.test(l)))
          return (
            <Fragment key={k}>
              <p>{inline(lines.slice(0, firstBullet).join(" "))}</p>
              <ul>{lines.slice(firstBullet).map((l, i) => <li key={i}>{inline(l.replace(/^\s*- /, ""))}</li>)}</ul>
            </Fragment>
          );
        return <p key={k}>{inline(lines.join(" "), `${k}`)}</p>;
      })}
    </div>
  );
}
