import ts from "typescript";
import { resolve } from "node:path";

/**
 * Presentation and authoring tests are excluded from both typecheck projects
 * (tsconfig.node.json excludes them; the app project excludes every test), so
 * `npm run typecheck` says nothing about them and vitest does not typecheck.
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
const config = ts.getParsedCommandLineOfConfigFile(
  resolve(root, "tsconfig.node.json"),
  { noEmit: true, composite: false, incremental: false },
  {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      );
    },
  },
);
if (!config) throw new Error("tsconfig.node.json could not be read");

const testFiles = ts.sys.readDirectory(root, [".ts", ".tsx"], undefined, [
  "src/presentation/**/*.test.ts",
  "src/authoring/**/*.test.ts",
]);
const program = ts.createProgram({
  rootNames: testFiles,
  options: { ...config.options, tsBuildInfoFile: undefined },
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
  `typecheck-test-imports: ${testFiles.length} excluded test files, ${failures.length} unresolved import(s).`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
