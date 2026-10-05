# Build status and handoff

Last updated: 2026-10-05 (session paused at the user's request). Read this first when resuming.

## Where things stand

Brief milestones M0–M4 are complete, and most of M5 (device QA) is done. Everything below is committed on `main` and **not pushed**.

| Area | State |
|---|---|
| Engine (`engine/`) | Exp 3–7 pipelines, G1–G8 tools. Tests passing: fast suite (`-m "not slow"`), slow 1000-trial coverage tests (`-m slow`), Pyodide smoke test (`npm run test:pyodide`). |
| Web app (`web/`) | All screens built. Visual QA done on phone screenshots (dark theme for all screens, plus dark-room and light). |
| Unit tests | Vitest suite, about 53 tests (`npm test`). Includes a check that every guide/answer formula compiles in KaTeX. |
| e2e | Playwright suite, 24 tests (12 per phone project; **3–4 currently failing, see Next steps 0**; `npm run build && npm run e2e`). Covers offline mode, persistence, share link, Run-screen entry, overflow, tap targets, plot export and the CSP. The suite also passes against the real Caddy config (`BASE_URL=http://localhost:8088/`). |
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

## Next steps

0. **Fix the e2e regression from the last commit first.** The startup-performance commit (engine warm-up on idle, service worker registered on `load`, static first-paint shell, lazy KaTeX) was followed by a full e2e run in which some tests timed out. The whole run took about 5 minutes instead of about 1.5.
   - Against vite preview, 3 failed: "airplane mode" (android), "no page scrolls sideways" (android) and "plots export" (android).
   - Against Caddy, 4 failed: "airplane mode" on both projects, plus the CSP test and "no page scrolls sideways" (android).
   - The failures wait for "Engine ready" or "Offline ready" and time out. Before that commit, all 24 e2e tests passed on both servers.
   - Suspects, in order: `useRegisterSW({ immediate: false })` (the offline-ready signal may now come late, or never in the test), and `requestIdleCallback` delaying `startEngine()` under parallel load.
   - Start with `npx playwright test --project=android -g airplane`. If needed, revert those two lines in `web/src/App.tsx` and `web/src/main.tsx`, then re-measure Lighthouse. (Before them: perf 90–91. After the shell + lazy KaTeX: 96.)
1. **Push**, then check the first CI run, especially the Docker job and the Caddy e2e step (`git push origin main`).
2. **Final walk-through** (brief §11): go through each experiment's Run guide as a first-time student, on a real phone, using the example data. Fix anything confusing. Not done yet.
3. Deploy to the VM: `DEPLOY_HOST=… LAB_DOMAIN=… deploy/deploy.sh setup`, then `deploy/deploy.sh`. On two phones, check that airplane mode and the QR transfer work.
4. Optional polish:
   - Exp 4 plot axis labels say "D1"/"D2" (SVG text can't use the `<sub>` renderer); switch the engine labels to "D₁".
   - Example datasets occasionally show a legitimate 2.5–8σ outlier flag (Exp 3, 4, 6, 7). Decide whether to keep them as demos.
   - Exp 4/Exp 3 `fit_warnings` still use the unweighted studentised residual (D21), which is fragile with only 4 degrees of freedom.

## Gotchas

- In this Windows setup, the Bash tool collapses `\\` to `\` in commands and heredocs. Edit files that contain TeX backslashes with an editor or Write tool, never through shell or Python heredocs.
- Run `python -m labcalc.answers` and `python -m labcalc.golden` with `PYTHONIOENCODING=utf-8` on Windows.
- `web/public/pyodide` and `web/public/py` are generated by `scripts/fetch-py.mjs` and are git-ignored.
- `npm run screens` writes screenshots for visual review. It needs `npm run preview` running.
