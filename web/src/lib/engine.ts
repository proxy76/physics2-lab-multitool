// Engine client: one worker, warmed the moment the app opens. Requests on the same "channel" are
// coalesced so a fast typist only ever waits for the latest analysis.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { EngineOptions, EngineResponse, EngineResult, EngineStatus, EngineError, WorkerMessage } from "./engineTypes";
import { getSettings } from "./store";

interface StatusState {
  status: EngineStatus;
  detail: string;
  ms?: number;
  busy?: boolean;
}

let worker: Worker | null = null;
let statusState: StatusState = { status: "loading", detail: "Waiting to start" };
const statusListeners = new Set<() => void>();
const pending = new Map<string, (r: EngineResponse) => void>();
let seq = 0;

function setStatus(s: StatusState) {
  statusState = s;
  statusListeners.forEach((l) => l());
}

export function startEngine() {
  if (worker || typeof Worker === "undefined") return;
  worker = new Worker(new URL("../worker/engine.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (ev: MessageEvent<WorkerMessage>) => {
    const m = ev.data;
    if (m.type === "status") setStatus({ status: m.status, detail: m.detail, ms: m.ms, busy: m.busy });
    else {
      const cb = pending.get(m.response.id);
      pending.delete(m.response.id);
      cb?.(m.response);
    }
  };
  worker.onerror = (e) => setStatus({ status: "error", detail: e.message || "Worker failed to start" });
}

export function useEngineStatus(): StatusState {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => statusState,
  );
}

export function engineOptions(extra: EngineOptions = {}): EngineOptions {
  const s = getSettings();
  return { outlier_threshold: s.outlierThreshold, round_up: s.roundUp, selfcheck: s.selfcheck, ...extra };
}

export function call(tool: string, params: unknown, extra: EngineOptions = {}): Promise<EngineResponse> {
  startEngine();
  const id = `r${++seq}`;
  const s = getSettings();
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker!.postMessage({ id, tool, params, constants: s.constants, options: engineOptions(extra) });
  });
}

// latest-wins per channel
const latest = new Map<string, number>();

export interface Analysis {
  result: EngineResult | null;
  error: EngineError | null;
  pending: boolean;
  ms?: number;
}

/** Debounced live analysis. `params` must be JSON-serialisable; identical params are not re-sent. */
export function useAnalysis(tool: string, params: unknown, enabled = true, delay = 250): Analysis {
  const [state, setState] = useState<Analysis>({ result: null, error: null, pending: false });
  const status = useEngineStatus();
  const settingsKey = JSON.stringify(engineOptions()) + getSettings().constants;
  const key = JSON.stringify(params) + settingsKey;
  const lastKey = useRef("");
  useEffect(() => {
    if (!enabled || status.status !== "ready") return;
    if (key === lastKey.current) return;
    setState((s) => ({ ...s, pending: true }));
    const handle = window.setTimeout(async () => {
      const mine = (latest.get(tool) ?? 0) + 1;
      latest.set(tool, mine);
      const r = await call(tool, params);
      if (latest.get(tool) !== mine) return;
      lastKey.current = key;
      setState(r.ok ? { result: r.result, error: null, pending: false, ms: r.ms } : { result: null, error: r.error, pending: false, ms: r.ms });
    }, delay);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, status.status, tool, delay]);
  return state;
}
