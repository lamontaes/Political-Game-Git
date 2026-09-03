/**
 * WHAT MODULAR-PERSON ART IS ACTUALLY MISSING.
 *
 * "We need more character art" is not a queue. It is the sentence a queue
 * exists to replace, and the reason is that most of what looks missing is not:
 * it is banked here and unreleased, or sitting in Drive at the wrong
 * resolution, or covered by a development fixture that nobody has noticed is a
 * fixture. Generating art for any of those wastes the generation, and worse,
 * quietly produces a second version of something the project already has.
 *
 * So every entry says where the art IS, not just that it is wanted:
 *
 * - `missing` — nothing exists anywhere. This is the only status that means
 *   "generate something", and it is the minority.
 * - `banked-here` — a candidate is in this repository, hashed and reproducible,
 *   waiting on a person to accept how it looks. Generating a replacement before
 *   that judgement is made is doing the work twice.
 * - `in-drive-usable` — the file exists outside the repository and passes the
 *   intake's own measurement. It needs collecting, not creating.
 * - `in-drive-below-standard` — the file exists and fails a specific,
 *   quantified minimum. That is a re-generation at a stated size, which is a
 *   much smaller and better-specified task than "make one of these".
 * - `dev-fixture-only` — a procedural placeholder is standing in. The slot
 *   resolves and the person renders, so nothing looks broken, which is exactly
 *   why this needs writing down.
 *
 * Every measurement cited below comes from `npm run inventory:masters` against
 * the Drive folder, recorded in `art/qa/banked_master_inventory.json`. Nothing
 * here is an impression of what might be needed.
 */

import type { CharacterComponentKind } from "../presentation/character-components";

export type GenerationQueueStatus =
  | "missing"
  | "banked-here"
  | "in-drive-usable"
  | "in-drive-below-standard"
  | "dev-fixture-only";

export const GENERATION_QUEUE_STATUSES: readonly GenerationQueueStatus[] = [
  "missing",
  "banked-here",
  "in-drive-usable",
  "in-drive-below-standard",
  "dev-fixture-only",
];

/** Statuses that call for a generation rather than a collection or a decision. */
export const STATUSES_NEEDING_GENERATION: readonly GenerationQueueStatus[] = [
  "missing",
  "in-drive-below-standard",
  "dev-fixture-only",
];

export interface GenerationQueueEntry {
  readonly entryId: string;
  readonly kind: CharacterComponentKind;
  /** What the part is, in the terms an art brief would use. */
  readonly description: string;
  readonly status: GenerationQueueStatus;
  /** How many distinct assets this entry stands for. */
  readonly count: number;
  /**
   * Where the art is, when it is anywhere. Required for every status except
   * `missing`, because "it exists" without "here" is not usable information.
   */
  readonly location?: string;
  /**
   * The measured reason a file falls short, quoted from the inventory.
   * Required for `in-drive-below-standard`.
   */
  readonly shortfall?: string;
  /** What has to happen before this entry can be worked at all. */
  readonly blockedBy?: string;
  readonly note?: string;
}

export type GenerationQueueFindingCode =
  | "unknown-status"
  | "duplicate-entry-id"
  | "non-missing-without-location"
  | "below-standard-without-shortfall"
  | "missing-with-location"
  | "zero-count";

export interface GenerationQueueFinding {
  readonly code: GenerationQueueFindingCode;
  readonly severity: "error" | "warning";
  readonly entryId: string;
  readonly message: string;
}

export interface GenerationQueueValidation {
  readonly valid: boolean;
  readonly findings: readonly GenerationQueueFinding[];
}

export function validateGenerationQueue(
  entries: readonly GenerationQueueEntry[],
): GenerationQueueValidation {
  const findings: GenerationQueueFinding[] = [];
  const seen = new Set<string>();
  const add = (
    code: GenerationQueueFindingCode,
    entryId: string,
    message: string,
  ) => findings.push({ code, severity: "error", entryId, message });

  for (const entry of entries) {
    if (seen.has(entry.entryId)) {
      add("duplicate-entry-id", entry.entryId, "Two entries share this id.");
    }
    seen.add(entry.entryId);

    if (!GENERATION_QUEUE_STATUSES.includes(entry.status)) {
      add(
        "unknown-status",
        entry.entryId,
        `Status '${entry.status}' is not one of ${GENERATION_QUEUE_STATUSES.join(", ")}.`,
      );
    }
    if (entry.count <= 0) {
      add(
        "zero-count",
        entry.entryId,
        "An entry stands for at least one asset.",
      );
    }
    if (entry.status !== "missing" && !entry.location) {
      add(
        "non-missing-without-location",
        entry.entryId,
        "Art that exists has to say where, or the queue is telling somebody to look for it.",
      );
    }
    if (entry.status === "missing" && entry.location) {
      add(
        "missing-with-location",
        entry.entryId,
        "An entry with a location is not missing; give it the status that matches.",
      );
    }
    if (entry.status === "in-drive-below-standard" && !entry.shortfall) {
      add(
        "below-standard-without-shortfall",
        entry.entryId,
        "A file that falls short must say by how much, or the re-generation has no target.",
      );
    }
  }

  return {
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}

export interface GenerationQueueSummary {
  readonly entries: number;
  readonly assets: number;
  /** Assets that genuinely have to be made or re-made. */
  readonly toGenerate: number;
  /** Assets that exist somewhere and need collecting or deciding, not making. */
  readonly alreadyExists: number;
  readonly byStatus: Readonly<Record<string, number>>;
}

export function summarizeGenerationQueue(
  entries: readonly GenerationQueueEntry[],
): GenerationQueueSummary {
  const byStatus: Record<string, number> = {};
  for (const entry of entries) {
    byStatus[entry.status] = (byStatus[entry.status] ?? 0) + entry.count;
  }
  const assets = entries.reduce((total, entry) => total + entry.count, 0);
  const toGenerate = entries
    .filter((entry) => STATUSES_NEEDING_GENERATION.includes(entry.status))
    .reduce((total, entry) => total + entry.count, 0);
  return {
    entries: entries.length,
    assets,
    toGenerate,
    alreadyExists: assets - toGenerate,
    byStatus,
  };
}
