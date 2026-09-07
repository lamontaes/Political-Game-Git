import { createHash } from "node:crypto";
import { assertNoIdCollisions } from "./ids";
import {
  adultProseRecords,
  formativeProseRecords,
  ordinaryProseRecords,
  setupProseRecords,
} from "./sources/banks";
import { extractComputedProse } from "./sources/computed";
import { episodeProseRecords } from "./sources/episodes";
import type { AnchorProblem } from "./anchors";
import type { ProseReachability, ProseRecord, ProseSurface } from "./types";

/**
 * The whole current-main player-facing prose inventory, built the same way
 * every time.
 *
 * Ordering is by semantic ID, not by the order the adapters happen to run, so
 * two runs over the same repository produce byte-identical output and a
 * differential report against a later branch compares like with like.
 *
 * There is no expected number of records. A bank that grows, shrinks or
 * arrives later is an ordinary inventory, not a broken one — and the coverage
 * check, not a count in here, is what says whether anything was missed.
 */

export interface ProseInventory {
  readonly records: readonly ProseRecord[];
  /**
   * Computed sites the anchor sidecar could not account for.
   *
   * Carried on the inventory rather than thrown, so the CLI can report every
   * one of them at once. It is a hard error: a site without settled identity is
   * exactly the state in which owner feedback slides onto another sentence.
   */
  readonly anchorProblems: readonly AnchorProblem[];
  /** Digest of the whole inventory, so two reports can be told apart. */
  readonly digest: string;
  readonly counts: {
    readonly total: number;
    readonly byDomain: Readonly<Record<string, number>>;
    readonly bySurface: Readonly<Record<string, number>>;
    readonly byReachability: Readonly<Record<string, number>>;
    readonly byRealization: Readonly<Record<string, number>>;
  };
}

function tally<T extends string>(
  records: readonly ProseRecord[],
  pick: (record: ProseRecord) => T,
): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const record of records) {
    const key = pick(record);
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(out).sort(([left], [right]) => (left < right ? -1 : 1)),
  );
}

export function buildProseInventory(): ProseInventory {
  const computed = extractComputedProse();
  const records = [
    ...episodeProseRecords(),
    ...formativeProseRecords(),
    ...adultProseRecords(),
    ...setupProseRecords(),
    ...ordinaryProseRecords(),
    ...computed.records,
  ].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );

  // Fail closed. Two records claiming the same coordinates would make an
  // owner's mark ambiguous and a differential report unable to say which line
  // changed, so this is an error rather than a warning.
  assertNoIdCollisions(records);

  const digest = createHash("sha256")
    .update(
      records
        .map(
          (record) =>
            `${record.id} ${record.textRevision} ${record.contextRevision}`,
        )
        .join(""),
    )
    .digest("hex")
    .slice(0, 16);

  return {
    records,
    anchorProblems: computed.problems,
    digest,
    counts: {
      total: records.length,
      byDomain: tally(records, (record) => record.domain),
      bySurface: tally(records, (record) => record.surface as ProseSurface),
      byReachability: tally(
        records,
        (record) => record.reachability as ProseReachability,
      ),
      byRealization: tally(records, (record) => record.realization),
    },
  };
}

/** CSV a reviewer can open in a spreadsheet. Quoted per RFC 4180. */
export function inventoryCsv(inventory: ProseInventory): string {
  const header = [
    "semantic_id",
    "domain",
    "bank",
    "stable_key",
    "field",
    "surface",
    "reachability",
    "reachability_reason",
    "realization",
    "slots",
    "source_path",
    "source_symbol",
    "grounding",
    "text",
  ];
  const rows = inventory.records.map((record) => [
    record.id,
    record.domain,
    record.bank,
    record.stableKey,
    record.field,
    record.surface,
    record.reachability,
    record.reachabilityReason,
    record.realization,
    record.slots.join(" "),
    record.sourcePath,
    record.sourceSymbol,
    record.grounding.map((entry) => entry.key).join(" "),
    record.text,
  ]);
  return [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")
    .concat("\n");
}

const CSV_NEEDS_QUOTING = new RegExp('["' + ",\\n\\r]");

function csvCell(value: string): string {
  if (CSV_NEEDS_QUOTING.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
