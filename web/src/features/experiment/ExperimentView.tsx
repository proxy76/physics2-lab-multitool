import { useEffect, useMemo } from "react";
import { EXP } from "../../content";
import { useAnalysis } from "../../lib/engine";
import { go } from "../../lib/router";
import { createSession, updateSession, useAppState, type ExpId } from "../../lib/store";
import { BriefTab } from "./BriefTab";
import { DataTab } from "./DataTab";
import { QuestionsTab } from "./QuestionsTab";
import { ResultsTab } from "./ResultsTab";
import { RunTab } from "./RunTab";
import { SessionBar } from "./SessionBar";

const TABS = [
  ["brief", "Brief"],
  ["run", "Run"],
  ["data", "Data"],
  ["results", "Results"],
  ["questions", "Questions"],
] as const;

export function ExperimentView({ id, tab }: { id: string; tab?: string }) {
  const def = EXP[id as ExpId];
  const sessionId = useAppState((s) => s.active[id as ExpId]);
  const session = useAppState((s) => (sessionId ? s.sessions[sessionId] : undefined));

  useEffect(() => {
    if (def && !sessionId) createSession(def.id, def.initialData());
  }, [def, sessionId]);

  const data = session?.data ?? def?.initialData();
  const params = useMemo(() => data, [data]);
  const analysis = useAnalysis(def?.tool ?? "selftest", params, !!def && !!session);

  useEffect(() => {
    if (tab === "results" && analysis.result && session && !session.analysed) updateSession(session.id, (s) => ({ ...s, analysed: true }));
  }, [tab, analysis.result, session]);

  if (!def) return <div className="page"><h1>Not found</h1><p>There is no experiment {id}. The lab covers Experiments 5, 6, 7, 3 and 4.</p></div>;
  const current = TABS.find(([k]) => k === tab)?.[0] ?? (session && session.step > 0 ? "run" : "brief");
  const setData = (d: unknown) => session && updateSession(session.id, (s) => ({ ...s, data: d }));

  return (
    <div className={`page exp-page tab-${current}`}>
      <header className="exp-head">
        <p className="exp-kicker">Experiment {def.n}</p>
        <h1>{def.title}</h1>
      </header>
      <SessionBar def={def} session={session} />
      <nav className="exp-tabs" aria-label="Experiment sections">
        {TABS.map(([k, label]) => (
          <a key={k} href={`#/exp/${def.id}/${k}`} aria-current={current === k ? "page" : undefined}
            onClick={(e) => { e.preventDefault(); go(`exp/${def.id}/${k}`); }}>
            {label}
          </a>
        ))}
      </nav>
      {analysis.error && current !== "brief" && current !== "questions" && (
        <p className="engine-error" role="alert">
          Can't analyse yet: {analysis.error.message}{analysis.error.field ? ` (field ${analysis.error.field})` : ""}
        </p>
      )}
      {session && (
        <>
          {current === "brief" && <BriefTab def={def} />}
          {current === "run" && <RunTab def={def} session={session} data={data} setData={setData} analysis={analysis} />}
          {current === "data" && <DataTab def={def} data={data} setData={setData} analysis={analysis} />}
          {current === "results" && <ResultsTab def={def} data={data} setData={setData} analysis={analysis} session={session} />}
          {current === "questions" && <QuestionsTab def={def} result={analysis.result} data={data} />}
        </>
      )}
    </div>
  );
}
