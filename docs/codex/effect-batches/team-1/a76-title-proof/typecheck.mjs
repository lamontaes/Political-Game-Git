import ts from "/workspace/Political-Game-Git/node_modules/typescript/lib/typescript.js";
import path from "node:path";
const taskRoot = "/workspace/Political-Game-Git";
const roots = [
  "src/simulation/measure-title.ts",
  "src/simulation/measure-title.test.ts",
  "src/simulation/dc-council-acts.test.ts",
  "src/simulation/dc-council-sittings.ts",
  "src/simulation/governing/member-agenda-council.test.ts",
  "src/simulation/governing/member-agenda-settings.ts",
  "src/simulation/governing/member-agenda.ts",
  "src/simulation/legislature-rules.ts",
  "src/simulation/living-world/local-council-meetings.ts",
  "src/simulation/municipal-government.ts",
  "src/simulation/town-council-profile.ts",
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
