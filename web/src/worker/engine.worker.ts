/// <reference lib="webworker" />
// Pyodide engine worker: boots CPython (WebAssembly), installs the self-hosted wheels and labcalc,
// then answers {id, tool, params, constants, options} with labcalc.api.dispatch_json (strings only).
import type { EngineRequest, WorkerMessage } from "../lib/engineTypes";

declare const self: DedicatedWorkerGlobalScope;

type PyProxyFn = ((s: string) => string) & { destroy?: () => void };
interface Pyodide {
  runPython: (code: string) => unknown;
  unpackArchive: (buf: Uint8Array, format: string, opts?: { extractDir?: string }) => void;
}

const BASE = new URL(import.meta.env.BASE_URL, self.location.origin).href;
let py: Pyodide | null = null;
let dispatch: PyProxyFn | null = null;
let sympy: Promise<void> | null = null;
let sitePackages = "";

const post = (m: WorkerMessage) => self.postMessage(m);

async function fetchBytes(path: string): Promise<Uint8Array> {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function boot() {
  const t0 = performance.now();
  post({ type: "status", status: "loading", detail: "Starting Python" });
  const mod = await import(/* @vite-ignore */ BASE + "pyodide/pyodide.mjs");
  py = (await mod.loadPyodide({ indexURL: BASE + "pyodide/" })) as Pyodide;
  post({ type: "status", status: "loading", detail: "Installing mpmath" });
  sitePackages = py.runPython("import site; site.getsitepackages()[0]") as string;
  py.unpackArchive(await fetchBytes("py/mpmath-1.3.0-py3-none-any.whl"), "zip", { extractDir: sitePackages });
  post({ type: "status", status: "loading", detail: "Loading labcalc" });
  py.unpackArchive(await fetchBytes("py/labcalc.zip"), "zip", { extractDir: "/home/pyodide" });
  py.runPython("import sys\nif '/home/pyodide' not in sys.path: sys.path.insert(0, '/home/pyodide')\nfrom labcalc import api, __version__");
  dispatch = py.runPython("api.dispatch_json") as PyProxyFn;
  const version = py.runPython("__version__") as string;
  const pyver = py.runPython("sys.version.split()[0]") as string;
  post({ type: "status", status: "ready", detail: `labcalc ${version} · Python ${pyver}`, ms: Math.round(performance.now() - t0) });
}

function ensureSympy(): Promise<void> {
  if (!sympy) {
    sympy = (async () => {
      post({ type: "status", status: "ready", detail: "Loading SymPy for custom expressions…", busy: true });
      py!.unpackArchive(await fetchBytes("py/sympy-1.14.0-py3-none-any.whl"), "zip", { extractDir: sitePackages });
      py!.runPython("import importlib; importlib.invalidate_caches(); import sympy");
      post({ type: "status", status: "ready", detail: "SymPy loaded" });
    })();
  }
  return sympy;
}

const ready = boot().catch((e: unknown) => {
  post({ type: "status", status: "error", detail: String(e instanceof Error ? e.message : e) });
  throw e;
});

// requests are handled strictly in order; Python is single-threaded anyway
let chain: Promise<unknown> = Promise.resolve();

self.onmessage = (ev: MessageEvent<EngineRequest>) => {
  const req = ev.data;
  chain = chain.then(async () => {
    try {
      await ready;
      if (req.tool === "propagate") await ensureSympy();
      const t = performance.now();
      const out = dispatch!(JSON.stringify(req));
      const parsed = JSON.parse(out);
      parsed.ms = Math.round(performance.now() - t);
      post({ type: "response", response: parsed });
    } catch (e) {
      post({ type: "response", response: { id: req.id, ok: false, error: { code: "engine", message: String(e instanceof Error ? e.message : e) } } });
    }
  });
};
