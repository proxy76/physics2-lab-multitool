import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/app.css";
import { App } from "./App";
import { startEngine } from "./lib/engine";
import { loadState } from "./lib/store";

// Warm the engine immediately: guides, answers and data entry never wait for it.
startEngine();

loadState().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
