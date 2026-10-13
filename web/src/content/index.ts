import answers from "./generated/answers.json";
import examples from "./generated/examples.json";
import { exp3 } from "./exp3";
import { exp4 } from "./exp4";
import { exp5 } from "./exp5";
import { exp6 } from "./exp6";
import { exp7 } from "./exp7";
import type { ExperimentDef } from "./types";
import type { ExpId } from "../lib/store";

/** The team's order: 5 → 6 → 7 → 3 → 4. */
export const EXPERIMENTS: ExperimentDef[] = [exp5, exp6, exp7, exp3, exp4];
export const EXP: Record<ExpId, ExperimentDef> = { "5": exp5, "6": exp6, "7": exp7, "3": exp3, "4": exp4 };

export const ANSWERS = answers as Record<string, unknown>;

/** Look up an engine-generated answer number by dotted path, e.g. "exp4.q1.lambda". */
export function answer(path: string): string {
  const v = path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), ANSWERS);
  if (v && typeof v === "object" && "d" in (v as object)) return (v as { d: string }).d;
  if (typeof v === "string" || typeof v === "number") return String(v);
  return `⟨missing ${path}⟩`;
}

/** Example (golden, seeded) dataset for an experiment — for a dry run or to learn the app. */
export function exampleData(exp: ExpId): unknown {
  const ex = (examples as Record<string, Record<string, unknown>>)[`exp${exp}`];
  const base = EXP[exp].initialData() as Record<string, unknown>;
  const copy = JSON.parse(JSON.stringify(ex));
  if (exp === "6") {
    // the shared x = 0 spectrum (Run step "measure with no absorber") = Al's x = 0 reading
    const z = copy.materials?.[0]?.rows?.find((r: Record<string, string>) => Number(r.x) === 0);
    copy.zero = z ? { H: z.H, L: z.L, R: z.R } : { H: "", L: "", R: "" };
    copy.thickness_tool = "caliper, 0.05 mm least count";
  }
  if (exp === "7") copy.graphical = {};
  return { ...base, ...copy };
}
