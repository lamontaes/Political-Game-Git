/**
 * Emits the R3I coverage reconciliation as a machine-readable evidence file.
 *
 * The reconciliation itself lives in
 * `src/simulation/executive-authority-r3h-reconciliation.ts`, next to the packs
 * it accounts for, and its test checks every claim against the live runtime.
 * This script only serialises it, so the checked-in evidence file can never
 * assert something the module and its test do not already hold.
 *
 * Deterministic: same input, same bytes. Run `npm run reconcile:r3h`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { format } from "prettier";

import {
  EXECUTIVE_AUTHORITY_RULE_PACKS,
  R3H_ACCEPTED_CATEGORY_COUNTS,
  R3H_ACCEPTED_NODE_TOTAL,
  R3H_NODE_RECONCILIATION,
  R3H_PROMOTED_JURISDICTIONS,
  packFieldIsKnown,
  packForEntry,
  summarizeR3hReconciliation,
} from "../../src/simulation/executive-authority-r3h-reconciliation";

const OUTPUT = resolve(
  import.meta.dirname,
  "../../docs/agent/evidence/r3i-r3h-node-reconciliation.json",
);

const byJurisdiction: Record<string, Record<string, number>> = {};
for (const entry of R3H_NODE_RECONCILIATION) {
  const bucket = (byJurisdiction[entry.jurisdictionKey] ??= {});
  bucket[entry.disposition] = (bucket[entry.disposition] ?? 0) + 1;
}

const report = {
  packet: "R3I — bounded runtime compilation from the accepted R3H node set",
  acceptedUniverse: {
    nodes: R3H_ACCEPTED_NODE_TOTAL,
    jurisdictions: R3H_PROMOTED_JURISDICTIONS,
    categoryCounts: R3H_ACCEPTED_CATEGORY_COUNTS,
    excluded:
      "The 356 queued rows and the 45 quarantined jurisdictions are outside the accepted universe and are not represented here or in any pack.",
  },
  summary: summarizeR3hReconciliation(),
  summaryByJurisdiction: byJurisdiction,
  runtimeCheck: R3H_NODE_RECONCILIATION.every((entry) => {
    const pack = packForEntry(entry);
    const resolving =
      entry.disposition === "newly-compiled" ||
      entry.disposition === "already-represented";
    if (!resolving) {
      return entry.targetFields.length === 0;
    }
    return (
      pack !== null &&
      entry.targetFields.length > 0 &&
      entry.targetFields.every((field) => packFieldIsKnown(pack, field))
    );
  }),
  packs: EXECUTIVE_AUTHORITY_RULE_PACKS.map((pack) => ({
    packId: pack.packId,
    jurisdictionKey: pack.jurisdictionKey,
    displayName: pack.displayName,
    unresolvedGaps: pack.unresolvedGaps,
  })),
  nodes: R3H_NODE_RECONCILIATION,
};

// Formatted through the repository's own Prettier configuration so the emitted
// artifact is byte-identical to what `npm run format` expects. Otherwise every
// regeneration would leave the validation gate dirty.
const serialized = await format(JSON.stringify(report), {
  ...(await import("prettier").then((prettier) =>
    prettier.resolveConfig(OUTPUT),
  )),
  filepath: OUTPUT,
  parser: "json",
});

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, serialized, "utf8");
console.log(
  `Wrote ${OUTPUT}: ${R3H_NODE_RECONCILIATION.length} accepted nodes, runtimeCheck=${report.runtimeCheck}.`,
);
