import ts from "typescript";
import { resolve } from "node:path";

/**
 * The app project excludes every test under src, and the node project picks
 * up tests only for the src directories it names, so tests in any other src
 * directory (presentation, authoring, player today; any new directory
 * tomorrow) are typechecked by nothing, and vitest does not typecheck.
 * A test importing a module or member that does not exist on its own branch
 * passed the gate that way on 2026-09-18. Lifting the exclusion outright
 * surfaces 184 pre-existing type errors across those files, so until that is
 * paid down this narrow pass fails the gate on the one class of error that
 * cannot be a matter of typing style: an import that does not resolve.
 */
const MODULE_RESOLUTION_CODES = new Set([
  2305, // has no exported member
  2306, // is not a module
  2307, // cannot find module
  2614, // no exported member (did you mean default?)
  2724, // has no exported member named (did you mean ...)
]);

const root = process.cwd();
const host = {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (diagnostic: ts.Diagnostic) => {
    throw new Error(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
  },
};
function project(name: string) {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    resolve(root, name),
    { noEmit: true, composite: false, incremental: false },
    host,
  );
  if (!parsed) throw new Error(`${name} could not be read`);
  return parsed;
}
const app = project("tsconfig.app.json");
const node = project("tsconfig.node.json");

// Every test under src/ that neither project's include/exclude globs reach.
// Counted, not assumed: a new top-level src directory inherits the gap.
const covered = new Set([...app.fileNames, ...node.fileNames]);
const testFiles = ts.sys
  .readDirectory(resolve(root, "src"), [".ts", ".tsx"], undefined, [
    "**/*.test.ts",
    "**/*.test.tsx",
  ])
  .filter((file) => !covered.has(file));
const byDirectory = new Map<string, number>();
for (const file of testFiles) {
  const directory = file
    .slice(root.length + 1)
    .split("/")
    .slice(0, 2)
    .join("/");
  byDirectory.set(directory, (byDirectory.get(directory) ?? 0) + 1);
}

const program = ts.createProgram({
  rootNames: testFiles,
  options: { ...node.options, tsBuildInfoFile: undefined },
});
const failures = program
  .getSemanticDiagnostics()
  .filter((diagnostic) => MODULE_RESOLUTION_CODES.has(diagnostic.code))
  .filter(
    (diagnostic) =>
      diagnostic.file && testFiles.includes(diagnostic.file.fileName),
  );

for (const diagnostic of failures) {
  const { line, character } = diagnostic.file!.getLineAndCharacterOfPosition(
    diagnostic.start ?? 0,
  );
  const file = diagnostic.file!.fileName.slice(root.length + 1);
  console.error(
    `${file}(${line + 1},${character + 1}): error TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`,
  );
}
console.log(
  `typecheck-test-imports: ${testFiles.length} test files no typecheck project covers (${[...byDirectory].map(([d, n]) => `${d} ${n}`).join(", ")}), ${failures.length} unresolved import(s).`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
