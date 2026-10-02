import { EXP, EXPERIMENTS } from "../../content";
import { useAnalysis } from "../../lib/engine";
import { useAppState, type ExpId } from "../../lib/store";
import { QuestionList } from "../experiment/QuestionsTab";

export function AnswersPage({ id }: { id?: string }) {
  const def = EXP[(id as ExpId) ?? "5"] ?? EXP["5"];
  const sid = useAppState((s) => s.active[def.id]);
  const session = useAppState((s) => (sid ? s.sessions[sid] : undefined));
  const a = useAnalysis(def.tool, session?.data ?? null, !!session);
  return (
    <div className="page answers">
      <h1>Answers</h1>
      <nav className="exp-tabs" aria-label="Experiment">
        {EXPERIMENTS.map((d) => (
          <a key={d.id} href={`#/answers/${d.id}`} aria-current={d.id === def.id ? "page" : undefined}>Exp. {d.n}</a>
        ))}
      </nav>
      <h2>Experiment {def.n}: {def.title}</h2>
      <p className="muted small">{session ? `Data-dependent answers use your active session “${session.name}”.` : "Data-dependent answers fill in once you enter data for this experiment."}</p>
      <QuestionList def={def} result={a.result} data={session?.data} />
    </div>
  );
}
