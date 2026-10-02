import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { TimerDock, TimerPanel } from "./components/Timers";
import { ToastHost, toast } from "./components/Toast";
import { AnswersPage } from "./features/answers/AnswersPage";
import { Calculator } from "./features/calculator/Calculator";
import { ExperimentView } from "./features/experiment/ExperimentView";
import { ExperimentsList, Home, ImportView } from "./features/home/Home";
import { SettingsPage } from "./features/settings/Settings";
import { useEngineStatus } from "./lib/engine";
import { go, useRoute } from "./lib/router";
import { setState, useAppState } from "./lib/store";
import { tick, useTimers } from "./lib/timers";

const TABS = [
  { path: "", label: "Home", icon: "M3 11 12 4l9 7v9h-6v-6H9v6H3z" },
  { path: "exp", label: "Experiments", icon: "M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3" },
  { path: "calc", label: "Calculator", icon: "M6 3h12v18H6zM9 7h6M9 12h1M14 12h1M9 16h1M14 16h1" },
  { path: "answers", label: "Answers", icon: "M5 4h11l3 3v13H5zM9 10h6M9 14h6" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function EnginePill() {
  const s = useEngineStatus();
  const text = s.status === "ready" ? (s.busy ? "Engine busy" : "Engine ready") : s.status === "error" ? "Engine error" : "Engine loading";
  return (
    <span className={`pill engine-${s.status}`} title={s.detail + (s.ms ? ` (${(s.ms / 1000).toFixed(1)} s)` : "")} role="status">
      <span className="dot" aria-hidden="true" />
      {text}
    </span>
  );
}

function Header({ route, offlineReady, needRefresh, update }: { route: string[]; offlineReady: boolean; needRefresh: boolean; update: () => void }) {
  const [timersOpen, setTimersOpen] = useState(false);
  const timers = useTimers();
  const running = timers.filter((t) => t.startedAt).length;
  return (
    <header className="app-header">
      <a href="#/" className="brand" aria-label="Lab Companion home">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-name">Lab Companion</span>
      </a>
      <div className="header-tools">
        <EnginePill />
        {offlineReady && <span className="pill offline" title="Everything is cached — works in airplane mode">Offline ready</span>}
        {needRefresh && <button type="button" className="btn small" onClick={update}>Update</button>}
        <button type="button" className="icon-btn" aria-label="Timers" aria-expanded={timersOpen} onClick={() => setTimersOpen(!timersOpen)}>
          <Icon d="M12 8v5l3 2M9 2h6M12 4a9 9 0 1 0 0 18 9 9 0 0 0 0-18" />
          {running > 0 && <span className="badge">{running}</span>}
        </button>
        <button type="button" className="icon-btn" aria-label="Settings" aria-current={route[0] === "settings" ? "page" : undefined} onClick={() => go("settings")}>
          <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </button>
      </div>
      {timersOpen && (
        <div className="popover" role="dialog" aria-label="Timers">
          <TimerPanel />
          <p className="muted small">The lab counters have their own timers — these are for team coordination. They keep running if you switch tabs.</p>
        </div>
      )}
    </header>
  );
}

export function App() {
  const route = useRoute();
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({ immediate: true });
  const lastRoute = useAppState((s) => s.lastRoute);

  useEffect(() => {
    const h = window.setInterval(() => tick((t) => toast(`${t.label} — time's up`)), 500);
    return () => window.clearInterval(h);
  }, []);

  useEffect(() => {
    const r = "#/" + route.join("/");
    if (route[0] === "exp" && route[1] && r !== lastRoute) setState((s) => ({ ...s, lastRoute: r, lastExp: route[1] as never }));
  }, [route, lastRoute]);

  let page;
  switch (route[0]) {
    case "exp":
      page = route[1] ? <ExperimentView id={route[1]} tab={route[2]} /> : <ExperimentsList />;
      break;
    case "calc":
      page = <Calculator tool={route[1]} />;
      break;
    case "answers":
      page = <AnswersPage id={route[1]} />;
      break;
    case "settings":
      page = <SettingsPage />;
      break;
    case "import":
      page = <ImportView code={route.slice(1).join("/")} />;
      break;
    default:
      page = <Home />;
  }
  const top = route[0] === "settings" || route[0] === "import" ? "" : route[0] ?? "";

  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <Header route={route} offlineReady={offlineReady} needRefresh={needRefresh} update={() => void updateServiceWorker(true)} />
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <a key={t.path} href={`#/${t.path}`} aria-current={top === t.path ? "page" : undefined}>
            <Icon d={t.icon} />
            <span>{t.label}</span>
          </a>
        ))}
      </nav>
      <main id="main" className="app-main">{page}</main>
      <TimerDock />
      <ToastHost />
    </div>
  );
}
