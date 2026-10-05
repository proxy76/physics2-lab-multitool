import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/app.css";
import { App } from "./App";
import { loadKatex } from "./components/Tex";
import { startEngine } from "./lib/engine";
import { loadState } from "./lib/store";

// Saved theme first, before IndexedDB answers (no flash of the wrong theme in a dark room)
try {
  const t = localStorage.getItem("lc-theme");
  if (t) document.documentElement.dataset.theme = t;
} catch {
  /* storage blocked */
}

loadState().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Warm the engine as soon as the first screen is up: guides, answers and data entry never wait
  // for it, and its 6 MB download no longer competes with the app's own first paint.
  const warm = () => {
    startEngine();
    void loadKatex();
  };
  if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 1500 });
  else setTimeout(warm, 200);
});
