import fs from "fs";
import path from "path";

import {
  parseAssetBankManifest,
  serializeAssetBankManifest,
  summarizeAssetBank,
  validateAssetBankManifest,
} from "../../src/authoring/asset-bank";

/**
 * Usage:
 *   cli-asset-bank.ts validate <asset-bank.json>
 *   cli-asset-bank.ts normalize <asset-bank.json> [--out <file>]
 *
 * The import/export seam an external QA pass writes through.
 *
 * `normalize` re-serializes a manifest into canonical form — sorted keys,
 * sorted entries, unrecognised judgements degraded to `unassessed`. Running it
 * on a file a person or an external tool edited produces a diff that shows only
 * what actually changed, rather than a reordering.
 *
 * `validate` exits non-zero on any error, so it can gate a batch before the
 * art it describes is promoted.
 */

const [command, manifestPath, ...rest] = process.argv.slice(2);

if (!command || !manifestPath) {
  console.error(
    "Usage:\n  cli-asset-bank.ts validate <asset-bank.json>\n  cli-asset-bank.ts normalize <asset-bank.json> [--out <file>]",
  );
  process.exit(2);
}

const resolved = path.resolve(manifestPath);
if (!fs.existsSync(resolved)) {
  console.error(`No asset bank manifest at '${resolved}'.`);
  process.exit(2);
}

const manifest = parseAssetBankManifest(fs.readFileSync(resolved, "utf8"));

if (command === "normalize") {
  const outIndex = rest.indexOf("--out");
  const target =
    outIndex >= 0 && rest[outIndex + 1]
      ? path.resolve(rest[outIndex + 1]!)
      : resolved;
  fs.writeFileSync(target, serializeAssetBankManifest(manifest));
  console.log(`Normalized ${manifest.entries.length} entries into ${target}`);
  process.exit(0);
}

if (command !== "validate") {
  console.error(`Unknown command '${command}'. Use 'validate' or 'normalize'.`);
  process.exit(2);
}

const result = validateAssetBankManifest(manifest);
const counts = summarizeAssetBank(manifest);

console.log(
  `Batch '${manifest.batchId}': ${manifest.entries.length} entr${manifest.entries.length === 1 ? "y" : "ies"} — ` +
    `${counts.production} production, ${counts.reference} reference, ${counts.reject} reject, ${counts.undecided} undecided.`,
);

const unassessed = manifest.entries.filter(
  (entry) => entry.assessedBy === "unassessed",
).length;
if (unassessed > 0) {
  console.log(
    `${unassessed} entr${unassessed === 1 ? "y has" : "ies have"} never been assessed by anyone. That is a recorded state, not a passing one.`,
  );
}

for (const finding of result.findings) {
  console.log(
    `  ${finding.severity}: [${finding.subjectId}] ${finding.message}`,
  );
}

console.log(result.valid ? "\nOK" : "\nFAILED");
if (!result.valid) process.exit(1);
