import { useState } from "react";
import { elapsedOf, fmt, fmtPrecise, lap, remainingOf, remove, startCountdown, startStopwatch, toggle, useNow, useTimers, type Timer } from "../lib/timers";

function TimerChip({ t, now }: { t: Timer; now: number }) {
  const running = !!t.startedAt;
  const shown = t.kind === "countdown" ? fmt(remainingOf(t, now)) : fmtPrecise(elapsedOf(t, now));
  return (
    <div className={`timer-chip${t.done ? " done" : ""}${running ? " running" : ""}`}>
      <div className="timer-main">
        <span className="timer-label">{t.label}</span>
        <span className="timer-time num" aria-live={t.done ? "assertive" : "off"}>{t.done ? "Done" : shown}</span>
      </div>
      <div className="timer-btns">
        {t.kind === "stopwatch" && running && <button type="button" className="btn small" onClick={() => lap(t.id)}>Lap</button>}
        {!t.done && <button type="button" className="btn small ghost" onClick={() => toggle(t.id)}>{running ? "Pause" : "Resume"}</button>}
        <button type="button" className="btn small ghost" aria-label={`Remove ${t.label}`} onClick={() => remove(t.id)}>✕</button>
      </div>
      {t.laps.length > 0 && (
        <ol className="laps num">
          {t.laps.map((l, i) => <li key={i}>{fmtPrecise(l)} <span className="muted">(+{fmtPrecise(l - (t.laps[i - 1] ?? 0))})</span></li>)}
        </ol>
      )}
    </div>
  );
}

export function TimerDock() {
  const timers = useTimers();
  const now = useNow(timers.some((t) => t.startedAt), 200);
  if (!timers.length) return null;
  return (
    <aside className="timer-dock" aria-label="Timers">
      {timers.map((t) => <TimerChip key={t.id} t={t} now={now} />)}
    </aside>
  );
}

export function TimerButton({ seconds, label }: { seconds: number; label: string }) {
  return (
    <button type="button" className="btn timer-btn" onClick={() => startCountdown(seconds, label)}>
      Start {seconds} s timer{seconds >= 300 && seconds % 60 === 0 ? ` (${seconds / 60} min)` : ""}
    </button>
  );
}

export function TimerPanel() {
  const [custom, setCustom] = useState("");
  return (
    <div className="timer-panel">
      <div className="preset-row">
        {[60, 100, 600].map((s) => (
          <button key={s} type="button" className="btn" onClick={() => startCountdown(s, `${s} s`)}>{s} s</button>
        ))}
        <button type="button" className="btn" onClick={() => startStopwatch("Stopwatch")}>Stopwatch</button>
      </div>
      <form className="custom-timer" onSubmit={(e) => { e.preventDefault(); const s = parseFloat(custom.replace(",", ".")); if (s > 0) startCountdown(s, `${s} s`); setCustom(""); }}>
        <label htmlFor="custom-s">Custom (s)</label>
        <input id="custom-s" className="num" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button className="btn" type="submit">Start</button>
      </form>
    </div>
  );
}
