import ts from "/workspace/Political-Game-Git/node_modules/typescript/lib/typescript.js";
import path from "node:path";
const taskRoot = "/workspace/Political-Game-Git";
const roots = [
  "src/simulation/governing/current-services-budget.ts",
  "src/simulation/governing/current-services-budget.test.ts",
  "src/simulation/governing/state-governing.ts",
  "src/simulation/governing/program-governing.ts",
  "src/simulation/governing/legislative-clock.ts",
].map((f) => path.join(taskRoot, f));
const config = ts.readConfigFile(
  path.join(taskRoot, "tsconfig.app.json"),
  ts.sys.readFile,
);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, taskRoot);
const program = ts.createProgram(roots, {
  ...parsed.options,
  composite: false,
  incremental: false,
  noEmit: true,
  types: ["vite/client", "node"],
});
const diagnostics = ts.getPreEmitDiagnostics(program);
const owned = diagnostics.filter(
  (d) => !d.file || roots.includes(path.resolve(d.file.fileName)),
);
for (const d of owned)
  console.log(
    ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    d.file?.fileName,
    d.start === undefined ? "" : d.file?.getLineAndCharacterOfPosition(d.start),
  );
console.log(
  `Scoped diagnostics: ${owned.length}; inherited import diagnostics: ${diagnostics.length - owned.length}`,
);
process.exitCode = owned.length ? 1 : 0;
