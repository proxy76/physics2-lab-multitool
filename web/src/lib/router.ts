import { useSyncExternalStore } from "react";

const subscribe = (l: () => void) => {
  addEventListener("hashchange", l);
  return () => removeEventListener("hashchange", l);
};

export function useRoute(): string[] {
  const h = useSyncExternalStore(subscribe, () => location.hash || "#/");
  return h.replace(/^#\/?/, "").split("/").filter(Boolean);
}

export function go(path: string) {
  const h = path.startsWith("#") ? path : `#/${path.replace(/^\//, "")}`;
  if (location.hash !== h) location.hash = h;
  window.scrollTo({ top: 0 });
}
