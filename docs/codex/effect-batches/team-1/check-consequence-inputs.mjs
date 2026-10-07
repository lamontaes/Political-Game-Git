import assert from "node:assert/strict";
import process from "node:process";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../../../..");
const read = (name) =>
  JSON.parse(readFileSync(path.join(directory, name), "utf8"));
const batch = read("consequence-rows.json");
const missing = read("missing-capabilities.json");
const inventory = read("catalog-terms-and-five-part-gaps.json");
const canonical = inventory.laws.map((law) => law.questionKey).sort();
assert.equal(canonical.length, 20);
assert.deepEqual(batch.laws.map((law) => law.questionKey).sort(), canonical);
assert.deepEqual(missing.laws.map((law) => law.questionKey).sort(), canonical);
assert.equal(new Set(canonical).size, canonical.length);
assert.equal(new Set(missing.laws.map((law) => law.id)).size, 20);
for (const law of batch.laws) {
  const gap = missing.laws.find(
    (entry) => entry.id === law.missingCapabilitiesId,
  );
  assert.equal(gap?.questionKey, law.questionKey);
  assert.equal(
    law.consequences.length,
    0,
    "Unregistered bindings must not be runnable",
  );
  for (const key of [
    "requiredLegalTerms",
    "actualRecordBase",
    "termsTimesActualRecords",
    "repealRequirement",
  ])
    assert.equal(typeof gap[key], "string");
  assert.equal(
    gap.lag.days,
    null,
    "Unknown lag must not become a fixed number",
  );
  assert.ok(gap.evidence.length > 0);
}
assert.equal(
  batch.runnableRows,
  batch.laws.flatMap((law) => law.consequences).length,
);
const schemaPath = path.join(root, batch.schemaSource.path);
const schema = execFileSync(
  "git",
  ["show", `${batch.schemaSource.head}:${batch.schemaSource.path}`],
  { cwd: root, encoding: "utf8" },
);
const probePath = path.join(directory, "__consequence-input-typecheck.ts");
const probe = `import type { LawConsequenceRow, LawConsequenceKind } from ${JSON.stringify(schemaPath)};
const groups: Array<{questionKey:string; consequences:LawConsequenceRow[]; missingCapabilitiesId:string}> = ${JSON.stringify(batch.laws)};
const kinds: LawConsequenceKind[] = ${JSON.stringify(missing.laws.map((law) => law.kind))};
const activities: LawConsequenceRow['when'][] = ${JSON.stringify(missing.laws.map((law) => law.when))};
const proposed: LawConsequenceRow[] = ${JSON.stringify(missing.laws.flatMap((law) => (law.proposedConsequenceRow ? [law.proposedConsequenceRow] : [])))};
void proposed; void groups; void kinds; void activities;`;
const config = ts.readConfigFile(
  path.join(root, "tsconfig.app.json"),
  ts.sys.readFile,
);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const host = ts.createCompilerHost({
  ...parsed.options,
  noEmit: true,
  composite: false,
  incremental: false,
});
const originalRead = host.readFile.bind(host);
const originalExists = host.fileExists.bind(host);
host.readFile = (file) =>
  file === schemaPath
    ? schema
    : file === probePath
      ? probe
      : originalRead(file);
host.fileExists = (file) =>
  file === schemaPath || file === probePath || originalExists(file);
const program = ts.createProgram(
  [probePath],
  { ...parsed.options, noEmit: true, composite: false, incremental: false },
  host,
);
const diagnostics = ts.getPreEmitDiagnostics(program);
for (const diagnostic of diagnostics)
  process.stderr.write(
    `${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}\n`,
  );
assert.equal(diagnostics.length, 0, "Exact shared type check failed");
const validationSource = execFileSync(
  "git",
  ["show", `${batch.validatorSource.head}:${batch.validatorSource.path}`],
  { cwd: root, encoding: "utf8" },
);
const compiled = ts.transpileModule(validationSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { validateLawConsequences } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const proposals = missing.laws.flatMap((law) =>
  law.proposedConsequenceRow ? [law.proposedConsequenceRow] : [],
);
const fixtureCapabilities = {
  kinds: new Set(["pay"]),
  selectors: new Set(["active-work-payflows"]),
  actions: new Map([["pay", new Set(["raise-hourly-floor"])]]),
  predicates: new Set(),
};
assert.equal(proposals.length, 1);
assert.deepEqual(validateLawConsequences(proposals, fixtureCapabilities), []);
// These are the published validation-fixture capabilities, not production registration.
process.stdout.write(
  "20 canonical laws; 20 separate missing-binding records; 0 unregistered runnable rows; 1 proposal passes the published capability-fixture validator; shared-type diagnostics 0.\n",
);
