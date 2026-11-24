/**
 * The traceability ledger: which declarations a release actually consumed.
 *
 * It is the memory that makes a replayed event a no-op and a duplicated
 * identifier an error. Change identifiers live here rather than in the player
 * notes, so the notes stay prose and the bookkeeping stays machine-readable.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const LEDGER_PATH = join("docs", "release", "consumed-changes.json");

export interface LedgerEntry {
  /** The accepted version this batch produced. */
  readonly version: string;
  /** ISO calendar date of the release. */
  readonly releasedOn: string;
  /** The exact source revision the release described and validated. */
  readonly revision: string;
  /** Declaration ids consumed, sorted. */
  readonly changeIds: readonly string[];
}

export interface Ledger {
  readonly entries: readonly LedgerEntry[];
}

export const EMPTY_LEDGER: Ledger = { entries: [] };

export function parseLedger(text: string, where: string): Ledger {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${where}: not valid JSON (${(error as Error).message}).`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${where}: must be a JSON object.`);
  }
  const entries = (parsed as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) {
    throw new Error(`${where}: missing an 'entries' array.`);
  }
  const seen = new Set<string>();
  const result: LedgerEntry[] = [];
  for (const raw of entries) {
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`${where}: every entry must be an object.`);
    }
    const entry = raw as Record<string, unknown>;
    const version = entry.version;
    const releasedOn = entry.releasedOn;
    const revision = entry.revision;
    const changeIds = entry.changeIds;
    if (typeof version !== "string" || typeof releasedOn !== "string") {
      throw new Error(
        `${where}: entry needs string 'version' and 'releasedOn'.`,
      );
    }
    if (typeof revision !== "string") {
      throw new Error(`${where}: entry ${version} needs a string 'revision'.`);
    }
    if (
      !Array.isArray(changeIds) ||
      changeIds.some((id) => typeof id !== "string")
    ) {
      throw new Error(
        `${where}: entry ${version} needs a 'changeIds' string array.`,
      );
    }
    for (const id of changeIds as string[]) {
      if (seen.has(id)) {
        throw new Error(
          `${where}: change id '${id}' is recorded as consumed more than once.`,
        );
      }
      seen.add(id);
    }
    result.push({
      version,
      releasedOn,
      revision,
      changeIds: [...(changeIds as string[])].sort(),
    });
  }
  return { entries: result };
}

export function loadLedger(root: string): Ledger {
  const path = join(root, LEDGER_PATH);
  if (!existsSync(path)) return EMPTY_LEDGER;
  return parseLedger(readFileSync(path, "utf8"), LEDGER_PATH);
}

export function consumedIds(ledger: Ledger): Set<string> {
  const ids = new Set<string>();
  for (const entry of ledger.entries) {
    for (const id of entry.changeIds) ids.add(id);
  }
  return ids;
}

/** Newest entry first, so the file reads the way the patch notes do. */
export function appendEntry(ledger: Ledger, entry: LedgerEntry): Ledger {
  return { entries: [entry, ...ledger.entries] };
}

export function serializeLedger(ledger: Ledger): string {
  return `${JSON.stringify(ledger, null, 2)}\n`;
}
