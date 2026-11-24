/** Check the owned conversion against the exact published shared type. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const root = process.cwd();
const directory = path.join(root, "docs/codex/effect-batches/team-6");
const rows = JSON.parse(
  fs.readFileSync(path.join(directory, "consequence-rows.json"), "utf8"),
);
const missing = JSON.parse(
  fs.readFileSync(path.join(directory, "missing-capabilities.json"), "utf8"),
);
const original = JSON.parse(
  fs.readFileSync(
    path.join(directory, "fourteen-law-effect-list.json"),
    "utf8",
  ),
);
const expected = original.laws.map((row) => row.questionKey).sort();
const keys = Object.keys(rows).sort();
if (JSON.stringify(keys) !== JSON.stringify(expected))
  throw new Error(
    "Input must cover exactly the fourteen assigned canonical questions",
  );
if (
  new Set(missing.missingCapabilities.map((row) => row.questionKey)).size !== 14
)
  throw new Error("Missing-capability coverage is incomplete");
for (const key of keys) {
  const gap = missing.missingCapabilities.find(
    (row) => row.questionKey === key,
  );
  if (!gap || !gap.missingCapabilities.length)
    throw new Error("Missing exact binding reason for " + key);
  if (!Array.isArray(rows[key])) throw new Error("Rows must be arrays");
  // The supplied type has no registry admission table. A guessed name cannot
  // become runnable solely because it passes the shared string field types.
  if (rows[key].length !== 0)
    throw new Error(
      "Capability admission must be supplied before any runnable row: " + key,
    );
}
const source = fs.readFileSync(process.argv[2], "utf8");
if (
  crypto.createHash("sha256").update(source).digest("hex") !==
  missing.contract.typeSourceSha256
)
  throw new Error("Shared type bytes differ from the published pin");
const virtualType = path.join(root, "src/simulation/law-consequence-types.ts");
const virtualInput = path.join(
  root,
  "src/simulation/team6-consequence-input-check.ts",
);
const proposed = missing.missingCapabilities
  .filter((row) => row.proposedRow)
  .map((row) => row.proposedRow);
for (const entry of missing.missingCapabilities.filter(
  (row) => row.proposedRow,
))
  if (entry.proposedRowEnabled !== false)
    throw new Error("Unsupported source binding cannot be enabled");
const input =
  'import type { LawConsequenceRow } from "./law-consequence-types";\nconst inputs = ' +
  JSON.stringify(rows) +
  " satisfies Record<string, LawConsequenceRow[]>;\nconst proposed = " +
  JSON.stringify(proposed) +
  " satisfies LawConsequenceRow[];\nvoid inputs; void proposed;\n";
const config = ts.readConfigFile(
  path.join(root, "tsconfig.app.json"),
  ts.sys.readFile,
);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const options = {
  ...parsed.options,
  composite: false,
  incremental: false,
  noEmit: true,
};
const host = ts.createCompilerHost(options);
const oldExists = host.fileExists.bind(host),
  oldRead = host.readFile.bind(host);
const overlays = new Map([
  [virtualType, source],
  [virtualInput, input],
]);
host.fileExists = (file) => overlays.has(path.resolve(file)) || oldExists(file);
host.readFile = (file) => overlays.get(path.resolve(file)) ?? oldRead(file);
host.getSourceFile = (file, target) => {
  const text = host.readFile(file);
  return text === undefined
    ? undefined
    : ts.createSourceFile(file, text, target, true);
};
const program = ts.createProgram([virtualInput], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  for (const diagnostic of diagnostics)
    console.error(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
  process.exitCode = 1;
} else
  console.log(
    JSON.stringify({
      assignedLaws: keys.length,
      typeSourceHead: missing.contract.typeSourceHead,
      typeErrors: 0,
      admittedRows: 0,
      disabledTypedCostProposals: proposed.length,
      registeredCapabilitiesInvented: 0,
      runtimeProof: "NOT RUN",
    }),
  );
