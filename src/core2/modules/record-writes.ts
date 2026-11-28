/**
 * The record engine's id, its vote row, and the writes that need nothing of
 * the run: the vote record's id and the century's past votes.
 * src/core2/modules/record.ts re-exports them and keeps every read and write
 * that calls the core.
 */
import type { ModuleRow } from "../module-data";
import type { CoreAPI } from "../types";
import type { Stance } from "../campaign-data";

export const RECORD_MODULE_ID = "core2-record-v1";

/**
 * A member's vote on one question of one measure: one record per member, per
 * question, per bill. A bill with two sections on two questions leaves two
 * records, and a later bill that reuses the number leaves the first alone.
 */
export function voteRecordId(
  billId: string,
  question: string,
  personId: string,
): string {
  return `vote:${billId}:${question}:${personId}`;
}

/**
 * A vote the century cast before day one, on the record as it was: its own
 * date and its own roll, no news (the past is not told as it happens). The
 * record engine's own write.
 */
export function recordPastVote(api: CoreAPI, row: VoteRecordRow): void {
  api
    .moduleState(RECORD_MODULE_ID)
    .table("votes")
    .put(row as unknown as ModuleRow);
}

export interface VoteRecordRow {
  readonly id: string;
  readonly personId: string;
  readonly date: string;
  readonly body: string;
  /**
   * The measure by its own id: the bill's id (or a past measure's), which no
   * other bill shares. The record keys a vote by this and the question, never
   * by the number below, which repeats across bodies and sessions.
   */
  readonly billId: string;
  /** The measure's designation for display ("H.R. 25", "2026-001"); not a key. */
  readonly measureId: string;
  readonly stance: Stance;
  /** The stance's question again, as the key a person's latest vote on it is found by. */
  readonly question: string;
  readonly passed: boolean | null;
}
