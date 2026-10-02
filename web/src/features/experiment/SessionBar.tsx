import { useState } from "react";
import { download } from "../../components/Plot";
import { toast } from "../../components/Toast";
import { exampleData } from "../../content";
import type { ExperimentDef } from "../../content/types";
import { copy } from "../../lib/export";
import { parseImportFile, payloadOf, qrSvg, shareLink } from "../../lib/share";
import { createSession, deleteSession, setActive, updateSession, useAppState, type Session } from "../../lib/store";

export function SessionBar({ def, session }: { def: ExperimentDef; session?: Session }) {
  const sessions = useAppState((s) => Object.values(s.sessions).filter((x) => x.exp === def.id).sort((a, b) => a.created - b.created));
  const [qr, setQr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!session) return null;

  const share = async () => {
    const l = shareLink(session);
    setLink(l);
    setQr(await qrSvg(l));
  };
  const importFile = async (f: File) => {
    try {
      const list = parseImportFile(await f.text()).filter((p) => p.exp === def.id);
      if (!list.length) return toast(`No Exp. ${def.n} data in that file`);
      list.forEach((p) => createSession(p.exp, p.data, `${p.name} (imported)`));
      toast(`Imported ${list.length} session(s)`);
    } catch {
      toast("That file is not a Lab Companion JSON export");
    }
  };

  return (
    <details className="session-bar">
      <summary>
        <span className="muted">Session</span> <strong>{session.name}</strong>
        <span className="muted small"> saved {new Date(session.updated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
      </summary>
      <div className="session-body">
        <label className="field">
          <span className="field-label">Active session</span>
          <select value={session.id} onChange={(e) => setActive(def.id, e.target.value)}>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Name</span>
          <input value={session.name} onChange={(e) => updateSession(session.id, (s) => ({ ...s, name: e.target.value }))} />
        </label>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => createSession(def.id, def.initialData(), "Retake")}>New session</button>
          <button type="button" className="btn" onClick={() => { createSession(def.id, exampleData(def.id), "Example data"); toast("Example data loaded in a new session"); }}>Load example data</button>
          <button type="button" className="btn" onClick={share}>Share with teammates</button>
          <button type="button" className="btn" onClick={() => download(`exp${def.n}-${session.name.replace(/\W+/g, "-")}.json`, JSON.stringify(payloadOf(session), null, 1), "application/json")}>Export JSON</button>
          <label className="btn file-btn">
            Import JSON
            <input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])} />
          </label>
          {!confirmDelete ? (
            <button type="button" className="btn ghost danger" onClick={() => setConfirmDelete(true)}>Delete session</button>
          ) : (
            <button type="button" className="btn danger" onClick={() => { deleteSession(session.id); setConfirmDelete(false); toast("Session deleted"); }}>Confirm delete “{session.name}”</button>
          )}
        </div>
        {link && (
          <div className="share-box">
            {qr ? <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} /> : <p className="muted">Too much data for one QR code — send the link or the JSON file instead.</p>}
            <p className="small">Scan with the other phone's camera, or send the link. It opens this data as a new session there.</p>
            <button type="button" className="btn" onClick={async () => toast((await copy(link)) ? "Link copied" : "Copy failed")}>Copy link</button>
            {"share" in navigator && <button type="button" className="btn" onClick={() => void navigator.share({ title: `Exp. ${def.n} data`, url: link }).catch(() => undefined)}>Send…</button>}
          </div>
        )}
      </div>
    </details>
  );
}
