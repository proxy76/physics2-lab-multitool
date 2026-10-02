// App state: settings + experiment sessions. Autosaved to IndexedDB on every edit (debounced, and
// flushed on pagehide/visibilitychange so a phone lock or a killed tab loses nothing).
import { get as idbGet, set as idbSet } from "idb-keyval";
import { useSyncExternalStore } from "react";
import type { ConstantsSet } from "./engineTypes";

export type Theme = "dark" | "light" | "darkroom";
export type ExpId = "5" | "6" | "7" | "3" | "4";

export interface Settings {
  constants: ConstantsSet;
  theme: Theme;
  outlierThreshold: string;
  roundUp: boolean;
  selfcheck: boolean;
  fullDigits: number;
  role: "" | "OP" | "RD" | "AN";
}

export interface Session {
  id: string;
  exp: ExpId;
  name: string;
  created: number;
  updated: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  step: number;
  checks: Record<string, boolean>;
  analysed?: boolean;
}

export interface AppState {
  settings: Settings;
  sessions: Record<string, Session>;
  active: Partial<Record<ExpId, string>>;
  lastRoute: string;
  lastExp?: ExpId;
}

export const DEFAULT_SETTINGS: Settings = {
  constants: "codata",
  theme: "dark",
  outlierThreshold: "2.5",
  roundUp: false,
  selfcheck: false,
  fullDigits: 15,
  role: "",
};

const KEY = "lab-companion-state-v1";
let state: AppState = { settings: DEFAULT_SETTINGS, sessions: {}, active: {}, lastRoute: "#/" };
const listeners = new Set<() => void>();
let saveTimer: number | undefined;
let dirty = false;

export async function loadState(): Promise<void> {
  try {
    const saved = (await idbGet(KEY)) as AppState | undefined;
    if (saved) state = { ...state, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } };
  } catch {
    /* private mode / blocked storage: run in memory */
  }
  applyTheme(state.settings.theme);
  const flush = () => {
    if (dirty) void persist();
  };
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
}

async function persist() {
  dirty = false;
  try {
    await idbSet(KEY, state);
  } catch {
    /* ignore */
  }
}

function emit() {
  listeners.forEach((l) => l());
  dirty = true;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void persist(), 250);
}

export function getState() {
  return state;
}

export function getSettings() {
  return state.settings;
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(state);
  emit();
}

export function useAppState<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
  );
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  if (patch.theme) applyTheme(patch.theme);
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("lc-theme", t);
  } catch {
    /* ignore */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", t === "light" ? "#f3f6f9" : t === "darkroom" ? "#000000" : "#13202e");
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

// ---------------------------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------------------------

export function createSession(exp: ExpId, data: unknown, name?: string): Session {
  const now = Date.now();
  const s: Session = { id: uid(), exp, name: name || defaultName(), created: now, updated: now, data, step: 0, checks: {} };
  setState((st) => ({ ...st, sessions: { ...st.sessions, [s.id]: s }, active: { ...st.active, [exp]: s.id } }));
  return s;
}

function defaultName() {
  const d = new Date();
  return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} run`;
}

export function updateSession(id: string, fn: (s: Session) => Session) {
  setState((st) => {
    const cur = st.sessions[id];
    if (!cur) return st;
    return { ...st, sessions: { ...st.sessions, [id]: { ...fn(cur), updated: Date.now() } } };
  });
}

export function deleteSession(id: string) {
  setState((st) => {
    const sessions = { ...st.sessions };
    const exp = sessions[id]?.exp;
    delete sessions[id];
    const active = { ...st.active };
    if (exp && active[exp] === id) {
      const other = Object.values(sessions).filter((s) => s.exp === exp).sort((a, b) => b.updated - a.updated)[0];
      if (other) active[exp] = other.id;
      else delete active[exp];
    }
    return { ...st, sessions, active };
  });
}

export function setActive(exp: ExpId, id: string) {
  setState((st) => ({ ...st, active: { ...st.active, [exp]: id } }));
}

export function resetAll() {
  state = { settings: state.settings, sessions: {}, active: {}, lastRoute: "#/" };
  emit();
}

// ---------------------------------------------------------------------------------------------
// path helpers for nested experiment data ("materials.0.rows")
// ---------------------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPath(obj: any, path: string): any {
  if (!path) return obj;
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setPath(obj: any, path: string, value: unknown): any {
  const keys = path.split(".");
  const rec = (o: any, i: number): any => {
    const k = keys[i];
    const isIdx = /^\d+$/.test(k);
    const base = o == null ? (isIdx ? [] : {}) : Array.isArray(o) ? [...o] : { ...o };
    base[isIdx ? Number(k) : k] = i === keys.length - 1 ? value : rec(o?.[k], i + 1);
    return base;
  };
  return rec(obj, 0);
}
