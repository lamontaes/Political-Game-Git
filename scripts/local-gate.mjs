/* global process */
/** Bounded gate. Main timing is supplied from the coordinated exclusive run. */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";
const args = process.argv.slice(2);
const at = args.indexOf("--baseline");
if (at < 0 || !args[at + 1])
  throw new Error("Provide --baseline <main 3-year speed receipt>");
const baseline = JSON.parse(readFileSync(args[at + 1], "utf8"));
const main = execFileSync("git", ["rev-parse", "origin/main"], {
  encoding: "utf8",
}).trim();
if (
  baseline.sourceMain !== main ||
  baseline.rows.length !== 3 ||
  baseline.rows.some((row, i) => row.year !== i + 1) ||
  !baseline.exclusive
)
  throw new Error(
    "Speed baseline must contain three exclusive years on current origin/main",
  );
const testsAt = args.indexOf("--tests");
const tests = testsAt < 0 ? [] : args.slice(testsAt + 1);
const tracked = execFileSync(
  "git",
  ["diff", "--name-only", "origin/main", "--diff-filter=ACM"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const run = (program, argv) =>
  execFileSync(program, argv, { stdio: "inherit" });
const untracked = execFileSync(
  "git",
  ["ls-files", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const changed = [...new Set([...tracked, ...untracked])];
if (changed.length)
  run("npx", ["--no-install", "prettier", "--check", ...changed]);
const code = changed.filter((file) => /\.(ts|tsx|mjs|js)$/.test(file));
if (code.length) run("npx", ["--no-install", "eslint", ...code]);
const config = ts.readConfigFile("tsconfig.node.json", ts.sys.readFile);
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
  );
const options = ts.convertCompilerOptionsFromJson(
  config.config.compilerOptions,
  process.cwd(),
).options;
const roots = code.filter((file) => /\.tsx?$/.test(file));
if (roots.length) {
  const program = ts.createProgram(roots, {
    ...options,
    composite: false,
    incremental: false,
    noEmit: true,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => "\n",
      }),
    );
}
run("npm", ["run", "release:check", "--", "--mode", "pr"]);
run("npm", ["run", "zero-dice"]);
if (tests.length) run("npx", ["--no-install", "vitest", "run", ...tests]);
run("npm", [
  "run",
  "speed:years",
  "--",
  "--seed",
  baseline.seed,
  "--place",
  baseline.place,
  "--years",
  "3",
  "--exclusive",
  "--baseline",
  args[at + 1],
]);
