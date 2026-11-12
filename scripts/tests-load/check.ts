// `npm run tests:load`: every tracked test file, and every golden-path command's
// script, must still load. The workflow and the local gate run only the test
// files a change touched, so a source change that breaks how another file loads
// (two engines that import each other, entered by the wrong door) is otherwise
// seen only when someone runs that file. A file's own import lines are imported
// in their order in a fresh process, without running the file's body (many build
// a world at the top and would take hours). Files with the same ordered import
// list load once.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Folders the workflow leaves out of its test step. */
const LEFT_OUT = /^(tests\/e2e|tests\/caller-proofs|desktop|art\/authoring)\//;
const TEST_FILE = /\.(test\.(ts|tsx|mjs)|node-test\.ts)$/;
/** Child processes at once. Engineering value, matching the 4-core machines the gate runs on. */
const PARALLEL = 4;
/** Seconds a single load may take before it counts as stuck. Engineering value. */
const LOAD_SECONDS = 180;
const EXTENSIONS = ["", ".ts", ".tsx", ".mjs", ".js", ".json"];

export interface Target {
  /** What the failure line names: a test file or a command. */
  name: string;
  /** Absolute paths of the modules the file imports, in order. */
  modules: string[];
  /** The file's text has no it( or test( call. */
  noTests: boolean;
}

/** The runtime import specifiers of a module's source, in order (type-only imports are erased and skipped). */
export function importSpecifiers(source: string): string[] {
  const found: { at: number; spec: string }[] = [];
  const re =
    /^import\s+(?!type\b)(?:[^;]*?\sfrom\s*)?["']([^"']+)["']\s*(?:with\s*\{[^}]*\})?\s*;?/gm;
  for (let m = re.exec(source); m; m = re.exec(source))
    found.push({ at: m.index, spec: m[1] });
  return found.map((f) => f.spec);
}

/** Resolves a relative specifier from `from` to a file, trying the extensions a bundler would; null when none exists. */
export function resolveSpecifier(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(from), spec);
  const stem = base.replace(/\.(m?js)$/, "");
  for (const candidate of [base, stem]) {
    for (const ext of EXTENSIONS)
      for (const path of [candidate + ext, join(candidate, "index" + ext)])
        if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
}

/** True when the text has a test call (it, test, with .each, .skip or .only). */
export const hasTests = (source: string): boolean =>
  /(^|[^\w.$])(it|test)(\.\w+)*\s*(\(|\.each)/m.test(source);

const git = (...args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });

/** The tracked test files the check covers. */
export function trackedTests(): string[] {
  return git("ls-files")
    .split("\n")
    .filter((f) => TEST_FILE.test(f) && !LEFT_OUT.test(f));
}

/** The scripts of the roadmap's golden-path commands (docs/roadmap/features.json) that node runs directly. */
export function commandScripts(): { name: string; script: string }[] {
  const path = "docs/roadmap/features.json";
  if (!existsSync(path)) return [];
  const doc = JSON.parse(readFileSync(path, "utf8")) as {
    features?: { id?: string; command?: string }[];
  };
  const out: { name: string; script: string }[] = [];
  for (const f of doc.features ?? []) {
    const m = /\bnode\b[^|&;]*?\s((?:[\w./-]+)\.(?:ts|mjs))(?:\s|$)/.exec(
      f.command ?? "",
    );
    if (m && existsSync(m[1]))
      out.push({ name: `command ${f.id ?? m[1]}`, script: m[1] });
  }
  return out;
}

export function target(name: string, file: string): Target {
  const source = readFileSync(file, "utf8");
  const modules = importSpecifiers(source)
    .map((s) => resolveSpecifier(resolve(file), s))
    // A test file imported by another needs vitest's globals; it is checked as a file of its own.
    .filter((p): p is string => Boolean(p) && !TEST_FILE.test(p));
  return { name, modules, noTests: !hasTests(source) };
}

/** Loads one ordered import list in a fresh process; resolves with an error line or null. */
function load(modules: string[]): Promise<string | null> {
  return new Promise((done) => {
    const child = spawn(
      process.execPath,
      [
        "--max-old-space-size=8192",
        "--import",
        "tsx",
        "scripts/tests-load/load-one.mjs",
        ...modules,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    child.stderr.on("data", (d: Buffer) => (err += d.toString()));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      err = `did not finish loading in ${LOAD_SECONDS} seconds`;
    }, LOAD_SECONDS * 1000);
    child.on("close", (code) => {
      clearTimeout(timer);
      done(code === 0 && !err ? null : err.split("\n")[0] || `exit ${code}`);
    });
  });
}

export interface Report {
  checked: number;
  loads: number;
  failures: string[];
  seconds: number;
}

/** Runs the whole sweep. */
export async function sweep(): Promise<Report> {
  const started = Date.now();
  const targets = [
    ...trackedTests().map((f) => target(f, f)),
    ...commandScripts().map((c) => target(c.name, c.script)),
  ];
  const failures: string[] = [];
  const groups = new Map<string, Target[]>();
  for (const t of targets) {
    if (t.noTests && TEST_FILE.test(t.name))
      failures.push(`${t.name}: holds no it( or test( call`);
    const key = t.modules.join("\n");
    if (!t.modules.length) continue;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const queue = [...groups.values()];
  const worker = async (): Promise<void> => {
    for (let g = queue.shift(); g; g = queue.shift()) {
      const err = await load(g[0].modules);
      if (err) for (const t of g) failures.push(`${t.name}: ${err}`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return {
    checked: targets.length,
    loads: groups.size,
    failures: failures.sort(),
    seconds: Math.round((Date.now() - started) / 1000),
  };
}

if (process.argv[1]?.endsWith("tests-load/check.ts"))
  void sweep().then((r) => {
    for (const f of r.failures) console.log(`FAIL ${f}`);
    console.log(
      `tests:load: ${r.checked} files checked in ${r.loads} loads, ${r.failures.length} failed, ${r.seconds} seconds`,
    );
    process.exit(r.failures.length ? 1 : 0);
  });
