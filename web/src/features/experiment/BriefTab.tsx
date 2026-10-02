import { GuideNote } from "../../components/GuideNote";
import { Inline, Rich } from "../../components/Rich";
import { Tex } from "../../components/Tex";
import type { ExperimentDef } from "../../content/types";
import { go } from "../../lib/router";

export function BriefTab({ def }: { def: ExperimentDef }) {
  const b = def.brief;
  return (
    <div className="brief">
      <section className="brief-measure">
        <p className="lede">{b.measure}</p>
        <div className="formula-card mm-paper"><Tex tex={b.formula} display /></div>
        <p className="muted small">Takes {b.duration}.</p>
      </section>
      <section>
        <h2>Expected values</h2>
        <dl className="expected">
          {b.expected.map((e) => (
            <div key={e.label}><dt>{e.label}</dt><dd><Inline text={e.value} /></dd></div>
          ))}
        </dl>
      </section>
      {b.safety.length > 0 && (
        <section className="hazard" aria-label="Safety">
          <h2>Safety</h2>
          <ul>{b.safety.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      )}
      <section>
        <h2>Who does what</h2>
        <dl className="roles">
          {(["OP", "RD", "AN"] as const).map((r) => (
            <div key={r}><dt className={`role role-${r}`}>{r}</dt><dd>{b.roles[r]}</dd></div>
          ))}
        </dl>
      </section>
      <section>
        <h2>Before the lab</h2>
        <ul className="checklist">{b.before.map((s) => <li key={s}><Inline text={s} /></li>)}</ul>
      </section>
      {b.why && (
        <section>
          <h2>Why it works</h2>
          <Rich text={b.why} />
        </section>
      )}
      {def.notes.length > 0 && (
        <section>
          <h2>Guide notes</h2>
          {def.notes.map((n) => <GuideNote key={n} id={n} />)}
        </section>
      )}
      <div className="cta-row">
        <button type="button" className="btn primary big" onClick={() => go(`exp/${def.id}/run`)}>Start the run guide</button>
      </div>
    </div>
  );
}
