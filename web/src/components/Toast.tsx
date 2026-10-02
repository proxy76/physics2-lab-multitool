import { useEffect, useState } from "react";

let push: ((m: string) => void) | null = null;

export function toast(message: string) {
  push?.(message);
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    push = (m) => {
      setMsg(m);
      window.clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2600);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="toast" role="status" aria-live="polite">
      {msg}
    </div>
  );
}
