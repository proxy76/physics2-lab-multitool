// Runs labcalc inside Pyodide under Node: same wheels and zip as the browser build.
import { loadPyodide } from "pyodide";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, "..", "public");
const t0 = Date.now();
const py = await loadPyodide({ indexURL: join(here, "..", "node_modules", "pyodide") + "/" });
const SITE = py.runPython("import site; site.getsitepackages()[0]");
const installWheel = (f) => py.unpackArchive(new Uint8Array(readFileSync(join(pub, "py", f))), "zip", { extractDir: SITE });
installWheel("mpmath-1.3.0-py3-none-any.whl");
py.unpackArchive(new Uint8Array(readFileSync(join(pub, "py", "labcalc.zip"))), "zip", { extractDir: "/home/pyodide" });
py.runPython("import sys; sys.path.insert(0, '/home/pyodide'); from labcalc import api, golden");
console.log(`boot ${Date.now() - t0} ms, python ${py.runPython("import sys; sys.version.split()[0]")}`);
const call = (tool, params, opts = {}) => JSON.parse(py.runPython(`api.dispatch_json(${JSON.stringify(JSON.stringify({ id: "1", tool, params, options: opts }))})`));
const ex = JSON.parse(readFileSync(join(here, "..", "src", "content", "generated", "examples.json"), "utf8"));
let fail = 0;
for (const [exp, key] of [["exp5", "lambda1"], ["exp6", "Pb.mu"], ["exp7", "h"], ["exp3", "R"], ["exp4", "d1"]]) {
  const t1 = Date.now();
  const r = call(`${exp}.analyze`, ex[exp], { selfcheck: true });
  if (!r.ok) { fail++; console.log(exp, "ERROR", r.error); continue; }
  const sc = r.result.selfcheck;
  console.log(exp, r.result.values[key].report, `selfcheck ${sc.min_digits} digits`, `${Date.now() - t1} ms`);
  if (!sc.ok) fail++;
}
// golden exact recovery inside wasm
const g = JSON.parse(py.runPython("import json; json.dumps(golden.make('exp7'))"));
const r7 = call("exp7.analyze", g);
console.log("exp7 exact h =", r7.result.values.h.value.slice(0, 32));
if (r7.result.values.h.value !== "6.62607015e-34") fail++;
// sympy lazy load
const t2 = Date.now();
installWheel("sympy-1.14.0-py3-none-any.whl");
const rp = call("propagate", { expr: "sqrt(B/(x-A))", variables: [{ name: "B", value: "2.5", sigma: "0.02" }, { name: "x", value: "7.1", sigma: "0.05" }, { name: "A", value: "1.2", sigma: "0.03" }], mc: true, mc_n: 20000 });
console.log("propagate", rp.ok ? rp.result.values.f.report : rp.error, `${Date.now() - t2} ms incl. sympy load`);
if (!rp.ok) fail++;
process.exit(fail ? 1 : 0);
