import { useId, type KeyboardEvent } from "react";

// Mirrors labcalc.parse (the engine is the authority; this only gives instant feedback).
const NUM = /^\s*[+\-−–]?(\d[\d\s]*([.,]\d*)?|[.,]\d+)\s*(([eE][+\-−–]?\d+)|([×x*·]\s*10\s*\^?\s*\(?[+\-−–]?\d+\)?)|(10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+))?\s*$/;

export function looksNumeric(s: string): boolean {
  if (!s || !s.trim()) return true;
  const c = (s.match(/,/g) || []).length;
  if (c > 1 || (c === 1 && s.includes("."))) return false;
  return NUM.test(s.replace(/×\s*10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/, "e1"));
}

export interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: string;
  text?: boolean;
  signed?: boolean;
  big?: boolean;
  error?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  options?: { value: string; label: string }[];
  className?: string;
}

export function Field({ label, value, onChange, unit, hint, text, signed, big, error, placeholder, autoFocus, onEnter, options, className }: FieldProps) {
  const id = useId();
  const bad = !text && !options && !looksNumeric(value ?? "");
  const msg = error || (bad ? "Not a number — e.g. 12,5 or 1.6e-19" : null);
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.();
    }
  };
  return (
    <div className={`field${big ? " field-big" : ""}${msg ? " field-bad" : ""}${className ? " " + className : ""}`}>
      <label htmlFor={id}>
        <span className="field-label">{label}</span>
        {unit && <span className="field-unit">{unit}</span>}
      </label>
      {options ? (
        <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          id={id}
          className={text ? "" : `num${big ? " mm-paper" : ""}`}
          type="text"
          inputMode={text ? "text" : signed ? "text" : "decimal"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={onEnter ? "next" : "done"}
          value={value ?? ""}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={!!msg}
          aria-describedby={msg || hint ? id + "-h" : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
        />
      )}
      {(msg || hint) && <span id={id + "-h"} className={msg ? "field-msg" : "field-hint"}>{msg || hint}</span>}
    </div>
  );
}
