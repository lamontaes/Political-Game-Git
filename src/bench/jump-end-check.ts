// How a calendar jump may end (M0-03): at its target, at a stop, or on an election morning the
// player is rightly stopped for (the polling place on the day, or a candidate's own morning). A
// jump that ends short with none of those is a skipped-past defect, so it still fails.
import type { IsoDate } from "../core2/kernel/brands";

export interface JumpEnd {
  /** The packet the jump ended on. */
  readonly kind: string;
  readonly date: IsoDate;
  /** The day the jump was asked to reach. */
  readonly target: IsoDate;
  /** The polling visit the player was stopped at, by its record id. */
  readonly pollingRecordId?: string;
  /** The day the player's own race is on the ballot, when the jump stopped for it. */
  readonly candidateMorning?: IsoDate;
}

/** Whether the jump ended legitimately, and the reason in words, naming the record. */
export function judgeJumpEnd(end: JumpEnd): { ok: boolean; why: string } {
  if (end.kind === "stop") return { ok: true, why: "stopped" };
  if (end.kind !== "complete")
    return { ok: false, why: `ended as ${end.kind}` };
  if (end.date === end.target) return { ok: true, why: "reached its target" };
  if (end.pollingRecordId)
    return {
      ok: true,
      why: `stopped for election morning at the polling visit ${end.pollingRecordId}`,
    };
  if (end.candidateMorning && end.candidateMorning === end.date)
    return {
      ok: true,
      why: `stopped for the player's own election morning ${end.candidateMorning}`,
    };
  return { ok: false, why: `ended early on ${end.date} with no stop` };
}
