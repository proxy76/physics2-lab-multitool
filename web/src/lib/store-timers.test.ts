import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, deleteSession, getPath, getState, resetAll, setActive, setPath, updateSession } from "./store";
import { elapsedOf, remainingOf, type Timer } from "./timers";

describe("path helpers for nested experiment data", () => {
  it("reads and writes without mutating the original", () => {
    const d = { materials: [{ rows: [{ x: "1" }] }] };
    expect(getPath(d, "materials.0.rows.0.x")).toBe("1");
    const d2 = setPath(d, "materials.0.rows.0.x", "2");
    expect(getPath(d2, "materials.0.rows.0.x")).toBe("2");
    expect(d.materials[0].rows[0].x).toBe("1");
    expect(d2.materials).not.toBe(d.materials);
  });
  it("creates arrays for numeric keys and objects otherwise", () => {
    const d = setPath({}, "graphical.points.1", "P2");
    expect(Array.isArray(getPath(d, "graphical.points"))).toBe(true);
    expect(getPath(d, "graphical.points.1")).toBe("P2");
    expect(getPath(d, "missing.path")).toBeUndefined();
  });
});

describe("sessions", () => {
  beforeEach(() => resetAll());

  it("a new session becomes the active one; deleting it falls back to the newest other", () => {
    const a = createSession("5", { rows: [] }, "Tuesday run");
    expect(getState().active["5"]).toBe(a.id);
    const b = createSession("5", { rows: [] }, "Retake");
    expect(getState().active["5"]).toBe(b.id);
    setActive("5", a.id);
    deleteSession(a.id);
    expect(getState().active["5"]).toBe(b.id);
    deleteSession(b.id);
    expect(getState().active["5"]).toBeUndefined();
  });

  it("updates bump the timestamp and keep other experiments untouched", () => {
    const s5 = createSession("5", { rows: [] });
    const s6 = createSession("6", { materials: [] });
    updateSession(s5.id, (s) => ({ ...s, data: { rows: [{ r: "2" }] } }));
    expect(getState().sessions[s5.id].data.rows[0].r).toBe("2");
    expect(getState().sessions[s6.id].data).toEqual({ materials: [] });
    expect(getState().sessions[s5.id].updated).toBeGreaterThanOrEqual(s5.updated);
  });
});

describe("timers are timestamp-based (survive tab switches and a locked phone)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("counts down from the start time, pauses with the elapsed time kept", () => {
    const now = Date.now();
    const t: Timer = { id: "t", label: "Background", kind: "countdown", duration: 600_000, startedAt: now, elapsed: 0, laps: [] };
    expect(remainingOf(t, now + 59_000)).toBe(541_000);
    const paused = { ...t, elapsed: elapsedOf(t, now + 100_000), startedAt: null };
    expect(remainingOf(paused, now + 500_000)).toBe(500_000);
    expect(remainingOf(t, now + 700_000)).toBe(0);
  });
});
