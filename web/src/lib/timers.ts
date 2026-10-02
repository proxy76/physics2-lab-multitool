// Team-coordination timers (the lab counters have their own). Timestamp-based, so they keep running
// across tab switches, reloads and a locked phone; persisted in localStorage.
import { useEffect, useState, useSyncExternalStore } from "react";

export interface Timer {
  id: string;
  label: string;
  kind: "countdown" | "stopwatch";
  duration: number; // ms (countdown)
  startedAt: number | null; // running since
  elapsed: number; // ms accumulated while paused
  laps: number[];
  done?: boolean;
}

const KEY = "lc-timers";
let timers: Timer[] = load();
const ls = new Set<() => void>();

function load(): Timer[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(timers));
  } catch {
    /* ignore */
  }
  ls.forEach((l) => l());
}

export const elapsedOf = (t: Timer, now = Date.now()) => t.elapsed + (t.startedAt ? now - t.startedAt : 0);
export const remainingOf = (t: Timer, now = Date.now()) => Math.max(0, t.duration - elapsedOf(t, now));

export function startCountdown(seconds: number, label: string): Timer {
  const t: Timer = { id: Math.random().toString(36).slice(2), label, kind: "countdown", duration: seconds * 1000, startedAt: Date.now(), elapsed: 0, laps: [] };
  timers = [...timers, t];
  save();
  unlockAudio();
  return t;
}

export function startStopwatch(label = "Stopwatch"): Timer {
  const t: Timer = { id: Math.random().toString(36).slice(2), label, kind: "stopwatch", duration: 0, startedAt: Date.now(), elapsed: 0, laps: [] };
  timers = [...timers, t];
  save();
  return t;
}

export function toggle(id: string) {
  timers = timers.map((t) => (t.id !== id ? t : t.startedAt ? { ...t, elapsed: elapsedOf(t), startedAt: null } : { ...t, startedAt: Date.now(), done: false }));
  save();
}

export function lap(id: string) {
  timers = timers.map((t) => (t.id === id ? { ...t, laps: [...t.laps, elapsedOf(t)] } : t));
  save();
}

export function remove(id: string) {
  timers = timers.filter((t) => t.id !== id);
  save();
}

export function useTimers(): Timer[] {
  return useSyncExternalStore(
    (l) => {
      ls.add(l);
      return () => ls.delete(l);
    },
    () => timers,
  );
}

export function useNow(active: boolean, every = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const h = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(h);
  }, [active, every]);
  return now;
}

let ctx: AudioContext | null = null;
function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no audio */
  }
}

function beep() {
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    [0, 0.35, 0.7].forEach((d) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.25);
      o.connect(g).connect(ctx!.destination);
      o.start(t0 + d);
      o.stop(t0 + d + 0.3);
    });
  } catch {
    /* ignore */
  }
}

/** Called every second from the app shell: fires the end-of-countdown alert once. */
export function tick(onDone: (t: Timer) => void) {
  const now = Date.now();
  let changed = false;
  timers = timers.map((t) => {
    if (t.kind === "countdown" && t.startedAt && !t.done && remainingOf(t, now) === 0) {
      changed = true;
      navigator.vibrate?.([400, 150, 400, 150, 400]);
      beep();
      onDone(t);
      return { ...t, done: true, elapsed: t.duration, startedAt: null };
    }
    return t;
  });
  if (changed) save();
}

export function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtPrecise(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`;
}
