import { EXP, EXPERIMENTS } from "../../content";
import type { ExperimentDef } from "../../content/types";
import { go } from "../../lib/router";
import { decodeShare } from "../../lib/share";
import { createSession, useAppState, type AppState, type ExpId } from "../../lib/store";
import { toast } from "../../components/Toast";

export type Status = "not started" | "in progress" | "data complete" | "analysed";

export function statusOf(def: ExperimentDef, s: AppState): Status {
  const id = s.active[def.id];
  const ses = id ? s.sessions[id] : undefined;
  if (!ses) return "not started";
  if (ses.analysed && def.complete(ses.data)) return "analysed";
  if (def.complete(ses.data)) return "data complete";
  return "in progress";
}

function Card({ def, index, next }: { def: ExperimentDef; index: number; next: boolean }) {
  const st = useAppState((s) => statusOf(def, s));
  return (
    <a className={`exp-card${next ? " next" : ""}`} href={`#/exp/${def.id}`} data-status={st}>
      <span className="exp-order" aria-label={`Lab ${index + 1} of 5`}>{index + 1}</span>
      <span className="exp-num">Exp. {def.n}</span>
      <span className="exp-title">{def.title}</span>
      <span className="exp-status"><span className="status-dot" aria-hidden="true" />{st}</span>
      {next && <span className="next-badge">Next up</span>}
    </a>
  );
}

export function ExperimentCards() {
  const state = useAppState((s) => s);
  const next = EXPERIMENTS.find((d) => statusOf(d, state) !== "analysed");
  return (
    <div className="exp-cards">
      {EXPERIMENTS.map((d, i) => <Card key={d.id} def={d} index={i} next={d === next} />)}
    </div>
  );
}

export function Home() {
  const lastRoute = useAppState((s) => s.lastRoute);
  const lastExp = useAppState((s) => s.lastExp);
  const role = useAppState((s) => s.settings.role);
  return (
    <div className="page home">
      <section className="home-intro">
        <h1>Physics 2 lab</h1>
        <p className="lede">Five experiments in your order. Each has a 60-second brief, a step-by-step run guide split by role, data entry where the numbers appear, the analysis exactly as the guide asks, and the answer key.</p>
        {lastExp && lastRoute !== "#/" && (
          <button type="button" className="btn primary big" onClick={() => go(lastRoute)}>
            Continue Exp. {EXP[lastExp]?.n} where you left off
          </button>
        )}
      </section>
      <ExperimentCards />
      <section className="roles-help">
        <h2>Roles</h2>
        <dl className="roles">
          <div><dt className="role role-OP">OP</dt><dd>Operator — touches the apparatus.</dd></div>
          <div><dt className="role role-RD">RD</dt><dd>Reader — reads instruments, runs the timers.</dd></div>
          <div><dt className="role role-AN">AN</dt><dd>Analyst — types the data, watches the live plot, checks sanity.</dd></div>
        </dl>
        <p className="muted small">Rotate roles between experiments so everyone learns every set-up. {role ? `This phone is set to ${role} (Settings).` : "Set this phone's role in Settings to highlight your steps."}</p>
      </section>
    </div>
  );
}

export function ExperimentsList() {
  return (
    <div className="page">
      <h1>Experiments</h1>
      <p className="lede">In the order the team runs them: 5 → 6 → 7 → 3 → 4.</p>
      <ExperimentCards />
    </div>
  );
}

export function ImportView({ code }: { code: string }) {
  const p = decodeShare(code);
  if (!p) return <div className="page"><h1>Import</h1><p>This link is damaged or incomplete. Ask your teammate to share it again, or use a JSON file (Data → Share).</p></div>;
  const def = EXP[p.exp as ExpId];
  return (
    <div className="page">
      <h1>Import shared data</h1>
      <p>Exp. {def.n} — {def.title}: “{p.name}”, last edited {new Date(p.at).toLocaleString("en-GB")}.</p>
      <p className="muted">It is added as a new session; nothing on this phone is overwritten.</p>
      <button type="button" className="btn primary big" onClick={() => { createSession(p.exp, p.data, `${p.name} (shared)`); toast("Imported"); go(`exp/${p.exp}/data`); }}>
        Import as a new session
      </button>
    </div>
  );
}
