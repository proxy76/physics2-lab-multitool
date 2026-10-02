// Prepares the self-hosted Python runtime under public/ (decision D2):
//   public/pyodide/  — Pyodide core copied from node_modules/pyodide
//   public/py/       — pinned wheels from PyPI (SHA-256 verified) + labcalc.zip built from ../engine
// Run automatically by `npm run dev` / `npm run build`.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..");
const pub = join(web, "public");
const pyodideSrc = join(web, "node_modules", "pyodide");
const pyodideDst = join(pub, "pyodide");
const pyDst = join(pub, "py");

const WHEELS = [
  {
    file: "mpmath-1.3.0-py3-none-any.whl",
    sha256: "a0b2b9fe80bbcd81a6647ff13108738cfb482d481d826cc0e02f5b35e5c88d2c",
    url: "https://files.pythonhosted.org/packages/43/e3/7d92a15f894aa0c9c4b49b8ee9ac9850d6e63b03c9c32c0367a13ae62209/mpmath-1.3.0-py3-none-any.whl",
  },
  {
    file: "sympy-1.14.0-py3-none-any.whl",
    sha256: "e091cc3e99d2141a0ba2847328f5479b05d94a6635cb96148ccb3f34671bd8f5",
    url: "https://files.pythonhosted.org/packages/a2/09/77d55d46fd61b4a135c444fc97158ef34a095e5681d0a6c10b75bf356191/sympy-1.14.0-py3-none-any.whl",
  },
];

const PYODIDE_FILES = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

mkdirSync(pyodideDst, { recursive: true });
mkdirSync(pyDst, { recursive: true });

for (const f of PYODIDE_FILES) {
  const src = join(pyodideSrc, f);
  if (!existsSync(src)) throw new Error(`pyodide file missing: ${src} (run npm install)`);
  const dst = join(pyodideDst, f);
  if (!existsSync(dst) || statSync(dst).size !== statSync(src).size) copyFileSync(src, dst);
}

for (const w of WHEELS) {
  const dst = join(pyDst, w.file);
  if (existsSync(dst) && sha(readFileSync(dst)) === w.sha256) continue;
  process.stdout.write(`downloading ${w.file} … `);
  const res = await fetch(w.url);
  if (!res.ok) throw new Error(`download failed: ${w.url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = sha(buf);
  if (got !== w.sha256) throw new Error(`SHA-256 mismatch for ${w.file}: ${got}`);
  writeFileSync(dst, buf);
  console.log("ok");
}

// labcalc.zip — only the package's .py files, with a fixed mtime so the build is reproducible
const engineRoot = join(web, "..", "engine");
const pkg = join(engineRoot, "labcalc");
const files = {};
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) {
      if (name !== "__pycache__") walk(p);
    } else if (name.endsWith(".py")) {
      files[relative(engineRoot, p).split(sep).join("/")] = [readFileSync(p), { mtime: new Date("2026-01-01T00:00:00Z") }];
    }
  }
};
walk(pkg);
const zip = zipSync(files, { level: 9 });
writeFileSync(join(pyDst, "labcalc.zip"), zip);
const manifest = { labcalc: sha(zip).slice(0, 16), wheels: WHEELS.map((w) => w.file), pyodide: JSON.parse(readFileSync(join(pyodideSrc, "package.json"), "utf8")).version };
writeFileSync(join(pyDst, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log(`python runtime ready: pyodide ${manifest.pyodide}, labcalc ${manifest.labcalc} (${Object.keys(files).length} files)`);
