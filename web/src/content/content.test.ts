// Guards the guide/answer content: every string is clean text and every formula compiles in KaTeX.
// (A plain template literal turns "\frac" into a form feed + "rac" — this caught exactly that.)
import katex from "katex";
import { describe, expect, it } from "vitest";
import { ANSWERS, EXP, EXPERIMENTS, answer, exampleData } from ".";
import { NOTES } from "./notes";

function strings(o: unknown, path = "", out: [string, string][] = []): [string, string][] {
  if (typeof o === "string") out.push([path, o]);
  else if (Array.isArray(o)) o.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (o && typeof o === "object") Object.entries(o).forEach(([k, v]) => strings(v, path ? `${path}.${k}` : k, out));
  return out;
}

const all = [...EXPERIMENTS.flatMap((e) => strings(e, `exp${e.id}`)), ...strings(NOTES, "notes")];

describe("content strings", () => {
  it("contain no control characters (broken escapes)", () => {
    // eslint-disable-next-line no-control-regex
    const bad = all.filter(([, s]) => /[\u0000-\u0009\u000B-\u001F]/.test(s));
    expect(bad.map(([p]) => p)).toEqual([]);
  });

  it("have every formula compile in KaTeX", () => {
    const failures: string[] = [];
    for (const [path, s] of all) {
      const texts = [...s.matchAll(/\$\$([\s\S]+?)\$\$/g)].map((m) => m[1]);
      const rest = s.replace(/\$\$[\s\S]+?\$\$/g, "");
      texts.push(...[...rest.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]));
      if (path.endsWith(".formula")) texts.push(s);
      for (const t of texts) {
        try {
          katex.renderToString(t.replace(/\{\{[\w.]+\}\}/g, "1"), { throwOnError: true });
        } catch (e) {
          failures.push(`${path}: ${(e as Error).message.slice(0, 120)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("reference only answer numbers that the engine generated", () => {
    const missing = all.flatMap(([path, s]) => [...s.matchAll(/\{\{([\w.]+)\}\}/g)].map((m) => [path, m[1]] as const))
      .filter(([, key]) => answer(key).startsWith("⟨missing"));
    expect(missing).toEqual([]);
    expect(Object.keys(ANSWERS).length).toBeGreaterThan(0);
  });
});

describe("experiments", () => {
  it("are in the team's order 5 → 6 → 7 → 3 → 4", () => {
    expect(EXPERIMENTS.map((e) => e.id)).toEqual(["5", "6", "7", "3", "4"]);
  });

  it.each(EXPERIMENTS.map((e) => [e.id, e] as const))("Exp %s: every question has an answer, every step a role and a title", (_, e) => {
    expect(e.questions.length).toBeGreaterThan(0);
    for (const q of e.questions) expect(q.answer.trim().length, `Q${q.n}`).toBeGreaterThan(20);
    for (const s of e.steps) {
      expect(s.role.length, s.id).toBeGreaterThan(0);
      expect(s.title.split(/\s+/).length, `step ${s.id} headline ≤ ~15 words`).toBeLessThanOrEqual(16);
    }
    expect(e.cheat.length).toBeGreaterThan(3);
  });

  it.each(EXPERIMENTS.map((e) => [e.id] as const))("Exp %s: example data counts as complete", (id) => {
    expect(EXP[id].complete(exampleData(id) as never)).toBe(true);
    expect(EXP[id].complete(EXP[id].initialData() as never)).toBe(false);
  });
});
