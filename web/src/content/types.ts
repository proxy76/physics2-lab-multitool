import type { ReactNode } from "react";
import type { EngineResult } from "../lib/engineTypes";
import type { ExpId } from "../lib/store";

export type Role = "OP" | "RD" | "AN" | "ALL";

export interface FieldDef {
  path: string;
  label: string;
  unit?: string;
  hint?: string;
  text?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface ColDef {
  key: string;
  label: string;
  unit?: string;
  kind?: "num" | "text" | "fixed" | "readings";
  count?: number; // readings per row
  hint?: string;
}

export interface TableDef {
  id: string;
  title: string;
  short?: string; // chip label when an experiment has several tables
  path: string; // array path in session data
  columns: ColDef[];
  defaults?: Record<string, string>;
  fixed?: boolean; // rows given by the guide (no add/remove)
  engineTable?: string; // result table id with derived columns (matched by row id)
  derived?: { key: string; label: string; unit?: string }[];
  rowLabel?: (row: Record<string, string>, i: number) => string;
  note?: string;
}

export type Entry =
  | { kind: "fields"; fields: FieldDef[] }
  | {
      kind: "row"; table: string; fields: string[]; addLabel?: string; defaults?: Record<string, string>; pick?: boolean;
      /** pre-fill these keys of a new row from the previous row, or (first row) from the given data path */
      carry?: Record<string, string>;
    }
  | { kind: "readings"; table: string }
  | { kind: "table"; table: string };

export interface RunStep {
  id: string;
  role: Role[];
  title: string;
  how?: string;
  see?: string;
  safety?: string;
  timer?: { seconds: number; label: string };
  stopwatch?: boolean;
  entry?: Entry;
  decision?: string;
  meanwhile?: string;
  verify?: string[];
  notes?: string[];
  optional?: boolean;
  live?: "plot" | "check";
  /** show the "How" text open by default (beginner steps) */
  expanded?: boolean;
  /** "What goes in each box": one line per input/cell of this step */
  cells?: { name: string; text: string }[];
  /** live calculation panel inside the step card (engine result → what the app computed from the boxes) */
  panel?: (r: EngineResult | null, data: any) => ReactNode; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface Brief {
  measure: string;
  formula: string; // LaTeX
  expected: { label: string; value: string }[];
  safety: string[];
  roles: Record<"OP" | "RD" | "AN", string>;
  before: string[];
  why?: string;
  duration: string;
}

export interface Question {
  id: string;
  n: string;
  text: string; // verbatim from the guide
  answer: string; // rich markup (see components/Rich.tsx)
  live?: (r: EngineResult | null, data: any) => ReactNode; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ResultInputs {
  title: string;
  help: string;
  fields: FieldDef[];
}

export interface AnalysisProps {
  data: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  setData: (d: unknown) => void;
  result: EngineResult | null;
  pending: boolean;
  sub?: string;
}

export interface ExperimentDef {
  id: ExpId;
  n: number;
  title: string;
  short: string;
  tool: string;
  brief: Brief;
  steps: RunStep[];
  cheat: string[];
  tables: TableDef[];
  params?: FieldDef[];
  resultInputs?: ResultInputs[];
  initialData: () => unknown;
  questions: Question[];
  headline: { key: string; label?: string }[];
  notes: string[];
  /** experiment-specific live panel under the Data tab (e.g. Exp 7 difference check) */
  livePanel?: (r: EngineResult | null, data: any) => ReactNode; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** guided step-by-step analysis, shown as its own "Analysis" tab */
  analysis?: (p: AnalysisProps) => ReactNode;
  /** returns true when the data needed for the analysis is complete */
  complete: (data: any) => boolean; // eslint-disable-line @typescript-eslint/no-explicit-any
}
