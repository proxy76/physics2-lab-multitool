// Worker message contract (brief §4.5). Numbers travel as strings; floats appear only in plot coordinates.

export type ConstantsSet = "codata" | "guide";

export interface EngineOptions {
  outlier_threshold?: string;
  round_up?: boolean;
  selfcheck?: boolean;
}

export interface EngineRequest {
  id: string;
  tool: string;
  params: unknown;
  constants: ConstantsSet;
  options: EngineOptions;
}

export interface Value {
  value: string;
  unc?: string;
  rel?: string | null;
  unit: string;
  label: string;
  report: string;
  latex: string;
  group?: string;
}

export interface Column {
  key: string;
  label: string;
  unit: string;
}

export interface ResultTable {
  id: string;
  title: string;
  columns: Column[];
  rows: Array<Record<string, string | boolean> & { id?: string }>;
  note?: string;
}

export interface Series {
  name: string;
  kind: "points" | "line" | "marker";
  x: number[];
  y: number[];
  yerr?: number[];
  xerr?: number[];
  labels?: string[];
  ids?: string[];
  highlight?: boolean[];
  dash?: boolean;
  label?: string;
}

export interface Plot {
  id: string;
  title: string;
  x: { label: string; unit: string };
  y: { label: string; unit: string };
  series: Series[];
  residuals?: { x: number[]; y: number[]; z: number[]; ids?: (string | null)[] | null; bad?: boolean[] | null };
  xZero?: boolean;
  yZero?: boolean;
}

export interface Step {
  title: string;
  latex: string;
  substituted: string;
  result: string;
}

export interface Warning {
  code: string;
  message: string;
  severity: "warn" | "info";
}

export interface Compare {
  name: string;
  label: string;
  ref: string;
  ref_label: string;
  unit: string;
  dev_pct: string;
  z: string | null;
  verdict: string | null;
}

export interface EngineResult {
  values: Record<string, Value>;
  tables: ResultTable[];
  plots: Plot[];
  steps: Step[];
  warnings: Warning[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra: Record<string, any> & { compare?: Compare[]; flags?: Record<string, { outlier?: string; expected?: string }> };
  selfcheck?: { ok: boolean; min_digits: number; worst: string | null };
  constants?: ConstantsSet;
}

export interface EngineError {
  code: string;
  message: string;
  field?: string | null;
}

export type EngineResponse = { id: string; ok: true; result: EngineResult; ms?: number } | { id: string; ok: false; error: EngineError; ms?: number };

export type EngineStatus = "loading" | "ready" | "error";

export type WorkerMessage =
  | { type: "status"; status: EngineStatus; detail: string; ms?: number; busy?: boolean }
  | { type: "response"; response: EngineResponse };
