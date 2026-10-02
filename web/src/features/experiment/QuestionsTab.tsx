import { Rich } from "../../components/Rich";
import type { ExperimentDef } from "../../content/types";
import type { EngineResult } from "../../lib/engineTypes";

export function QuestionList({ def, result, data }: { def: ExperimentDef; result: EngineResult | null; data: unknown }) {
  return (
    <ol className="questions">
      {def.questions.map((q) => (
        <li key={q.id} id={`q-${def.id}-${q.id}`} className="question">
          <h3><span className="q-num">{/^\d+$/.test(q.n) ? `Q${q.n}` : q.n}</span> <span className="q-text">{q.text}</span></h3>
          <Rich text={q.answer} />
          {q.live && <div className="q-live">{q.live(result, data)}</div>}
        </li>
      ))}
    </ol>
  );
}

export function QuestionsTab({ def, result, data }: { def: ExperimentDef; result: EngineResult | null; data: unknown }) {
  return (
    <div className="questions-tab">
      <p className="muted small">Question wording is copied from the guide. Every number is computed by the engine (CODATA 2022); data-dependent parts fill in from your current session.</p>
      <QuestionList def={def} result={result} data={data} />
    </div>
  );
}
