# Build status and handoff

Last updated: 2026-10-06. Read this first when resuming.

## Where things stand

Brief milestones M0–M4 are complete, and most of M5 (device QA) is done. Everything below is committed on `main` and **not pushed**.

| Area | State |
|---|---|
| Engine (`engine/`) | Exp 3–7 pipelines, G1–G8 tools. Tests passing: fast suite (`-m "not slow"`), slow 1000-trial coverage tests (`-m slow`), Pyodide smoke test (`npm run test:pyodide`). |
| Web app (`web/`) | All screens built. Visual QA done on phone screenshots (dark theme for all screens, plus dark-room and light). |
| Unit tests | Vitest suite, 55 tests (`npm test`). Includes a check that every guide/answer formula compiles in KaTeX. |
| e2e | Playwright suite, 24 tests (12 per phone project; `npm run build && npm run e2e`), all passing. Covers offline mode, persistence, share link, Run-screen entry, overflow, tap targets, plot export and the CSP. It also passes against the real Caddy config (`BASE_URL=http://localhost:8088/`), and twice over with `--repeat-each 2` (48/48). The airplane-mode test needs up to about 2.5 min under parallel load, so it has its own 4-minute budget. |
| Deploy | `deploy/Caddyfile` (validated with Caddy 2.11.7), `nginx.conf`, `Dockerfile`, `deploy.sh setup` / `deploy.sh`. The Docker image has **not** been built locally (Docker Desktop was not running). CI builds it. |
| CI | `.github/workflows/ci.yml` (engine on 3.12 and 3.14; web unit/build/Pyodide/e2e on preview and Caddy; Docker build and smoke test). It has **never run**: the repo has not been pushed since it was added. |
| Lighthouse (mobile, against Caddy) | Performance 96 (91–96 across runs), Accessibility 100, Best practices 100, PWA 100 (Lighthouse 11). SEO is 63 by design: `robots.txt` disallows indexing for a private team site. |

## Notable changes in the 2026-10-05 session

- Fixed a crash on every experiment page (React #185, an unstable `useAppState` selector).
- Display math in the answers was broken because `\frac` and `\nu` in plain template literals became control characters. Answers now use `String.raw`, and a test guards against a repeat.
- Exp 5 outlier flags now follow D22: no "re-measure?" prompt on near slots; mistakes are flagged against the exact model using the known Poisson σ.
- Tables echo readings exactly as typed; subscripts render; nothing scrolls sideways on phones; fixed-column labels are fixed.
- The full-precision view (tap a result) uses the "digits" setting.
- Bundle: 846 kB became 389 kB main (128 kB gzipped). `react-dom/server` was removed and KaTeX loads lazily.
- Startup order: a static first-paint shell in `index.html`, the engine warms on idle, and the service worker registers on `load`.
- The CSP moved the theme bootstrap out of `index.html`. The theme is now applied at the top of `main.tsx`.
- 2026-10-06: the suspected e2e regression was a test time budget, not an app bug: the offline result was on screen when the 120 s timeout hit under load. Exp 4 labels and plots now use D₁/D₂ and d₁/d₂.
- 2026-10-06, step-by-step walk-through of all 43 Run steps and 5 cheat cards (emulated phone), fixes:
  - Exp 7 step 7 scrolled sideways (its live table widened a grid column). All single-column grids now use `minmax(0, 1fr)`, and the e2e overflow test now checks every Run step.
  - Step titles, safety, "You should see", "If" and "Meanwhile" text, verify items and cheat cards render subscripts and formatting (`N_b` → N<sub>b</sub>).
  - Timer buttons are labelled in seconds, as the guide and the counters are ("Start 600 s timer (10 min)", not "10:00").
  - "How" texts that mix a paragraph, a list and a closing line render as a real list (Exp 7 A–E).
  - Exp 6: example data fills the shared x = 0 spectrum, and the step explains how it is reused for all three materials.

## 2026-10-12: Exp 6 beginner guide and Analysis tab

- Exp 6 Run steps were rewritten as 17 beginner steps. "How" opens by default (`RunStep.expanded`). A "What goes in each box" list (`RunStep.cells`) explains each input. Each material has a measuring-loop step and a "done" step.
- Live "the app calculated" panels (`RunStep.panel`) show Area = ½(R−L)H, Area/t and ln(Area/t) with the row's numbers, plus the ×e check and, on the "done" steps, μ with the plot.
- New rows pre-fill L and R from the previous spectrum, or from the x = 0 spectrum for the first row (`Entry.carry`).
- New **Analysis** tab (`ExperimentDef.analysis`, Exp 6 only, `#/exp/6/analysis/<Al|Fe|Pb>`). It covers §6.5–6.7 for one material at a time from that table alone: Q1, the completed table with worked cells, millimetre-paper scales and points, graphical μ (inputs moved here from Results), the least-squares sums table and Appendix B formulas, rounding, the conclusions row, NIST and Q6.
- The engine provides it all as `extra.guide[sym]` (`exp6._guide_material` / `_guide_fit`). `linfit.steps` now brackets a negative slope ("−(−0.2)").
- `npm run walkthrough` now opens only collapsed "How" sections.
- e2e: on this machine the default parallel workers starve Pyodide on the android project (stuck at "Starting Python"). Run `npx playwright test --workers=2`: 26/26 pass.

## Next steps

1. **Push**, then check the first CI run, especially the Docker job and the Caddy e2e step (`git push origin main`).
2. **Final walk-through on a real phone** (brief §11). The emulated-phone pass is done: `npm run walkthrough` screenshots every Run step with "How" open and every cheat card, and each was reviewed. What is left is the hands-on version: a real phone, one-handed, ideally in a dim room (Exp 4 dark-room theme).
3. Deploy to the VM: `DEPLOY_HOST=… LAB_DOMAIN=… deploy/deploy.sh setup`, then `deploy/deploy.sh`. On two phones, check that airplane mode and the QR transfer work.
4. Optional polish:
   - Example datasets occasionally show a legitimate 2.5–8σ outlier flag (Exp 3, 4, 6, 7). Decide whether to keep them as demos.
   - Exp 4/Exp 3 `fit_warnings` still use the unweighted studentised residual (D21), which is fragile with only 4 degrees of freedom.

## Gotchas

- In this Windows setup, the Bash tool collapses `\\` to `\` in commands and heredocs. Edit files that contain TeX backslashes with an editor or Write tool, never through shell or Python heredocs.
- Run `python -m labcalc.answers` and `python -m labcalc.golden` with `PYTHONIOENCODING=utf-8` on Windows.
- `web/public/pyodide` and `web/public/py` are generated by `scripts/fetch-py.mjs` and are git-ignored.
- `npm run screens` writes screenshots for visual review. It needs `npm run preview` running.
