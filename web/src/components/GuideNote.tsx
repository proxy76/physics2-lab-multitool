import { useState } from "react";
import { NOTES } from "../content/notes";

export function GuideNote({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const n = NOTES[id];
  if (!n) return null;
  return (
    <div className={`guide-note note-${n.kind}`}>
      <button type="button" className="note-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="note-kind">{n.kind === "error" ? "Guide error" : n.kind === "typo" ? "Guide typo" : "Guide note"}</span>
        <span className="note-title">{n.title}</span>
      </button>
      {open && <p className="note-text">{n.text}</p>}
    </div>
  );
}
