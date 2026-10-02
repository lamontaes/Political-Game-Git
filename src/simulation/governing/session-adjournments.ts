import { isoDateFromParts } from "../dates";
import { createStableId } from "../ids";
import type { LegislativeRulePack } from "../legislature-rules";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  SessionAdjournmentRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  stateSessionEndEstimate,
  stateSessionEnds,
} from "./statute-effective-date";

/**
 * SESSION ADJOURNMENTS — the day a legislature's leaders ended its regular
 * session. A session with no record here ran to its legal limit; the
 * decision itself is in `leaders-adjourn.ts`.
 */

export const SESSION_ADJOURNMENT_VERSION = "session-adjournment/v1";

/**
 * The last day a state legislature's regular session may run in `year` under
 * its own law: the limit its compiled rules state, else the session-end table
 * every state's effective-date rule reads (`statute-effective-date.ts`),
 * which for a year already over holds the day the session really adjourned.
 * Null where neither was read, or the table's end for the place is only an
 * estimate from other states: a legislature with no limit of its own sits
 * until its leaders adjourn it.
 */
export function sessionLegalLimit(
  pack: LegislativeRulePack,
  year: number,
): IsoDate | null {
  const limit = pack.session.regularSessionLatestAdjournment;
  if (limit) {
    const boundary = year % 2 ? limit.value.oddYear : limit.value.evenYear;
    return isoDateFromParts(year, boundary.month, boundary.day);
  }
  if (!/^US-[A-Z]{2}$/.test(pack.jurisdictionKey)) return null;
  if (stateSessionEndEstimate(pack.jurisdictionKey, year) !== null) return null;
  return stateSessionEnds(pack.jurisdictionKey, year).at(-1) ?? null;
}

/**
 * The day a legislature's regular session in `year` ended or will end: the
 * day its leaders adjourned it, else its legal limit. Null where neither is
 * known.
 */
export function sessionClosesOn(
  world: World,
  pack: LegislativeRulePack,
  year: number,
): IsoDate | null {
  return (
    recordedSessionAdjournment(world, pack.packId, year)?.adjournedOn ??
    sessionLegalLimit(pack, year)
  );
}

/** The recorded adjournment of a legislature's regular session in `year`. */
export function recordedSessionAdjournment(
  world: World,
  rulePackId: string,
  year: number,
  cutoff?: HistoricalCutoff,
): SessionAdjournmentRecord | null {
  return (
    (world.history.sessionAdjournments ?? []).find(
      (record) =>
        record.rulePackId === rulePackId &&
        record.sessionYear === year &&
        (!cutoff ||
          (record.sequence < cutoff.historySequenceExclusive &&
            record.adjournedOn <= cutoff.asOfDate)),
    ) ?? null
  );
}

export interface RecordSessionAdjournmentInput {
  readonly rulePackId: string;
  readonly legislatureName: string;
  readonly jurisdictionId: EntityId;
  readonly sessionYear: number;
  readonly budgetMeasureId: EntityId;
  readonly leftPendingMeasureIds: readonly EntityId[];
  readonly rationale: string;
}

/**
 * Record the regular session ending today. Refuses a second adjournment of
 * the same session; the first stands.
 */
export function recordSessionAdjournment(
  world: World,
  input: RecordSessionAdjournmentInput,
): World {
  if (recordedSessionAdjournment(world, input.rulePackId, input.sessionYear))
    return world;
  const stableKey = `${SESSION_ADJOURNMENT_VERSION}:${input.rulePackId}:${input.sessionYear}`;
  const eventStableKey = `event:${stableKey}`;
  let next = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: "legislation.session-adjourned",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.jurisdictionId, input.budgetMeasureId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.session-adjourned"],
    summary: `The ${input.legislatureName} adjourned its ${input.sessionYear} regular session.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label:
          world.jurisdictions[input.jurisdictionId]?.name ?? "jurisdiction",
        setting: null,
      },
      socialContext: input.rationale,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.find(
    (candidate) => candidate.stableKey === eventStableKey,
  );
  if (!event) throw new Error("Failed to record the session's adjournment.");
  const record: SessionAdjournmentRecord = {
    id: createStableId("session-adjournment", stableKey),
    stableKey,
    sequence: next.history.nextSequence,
    rulePackId: input.rulePackId,
    jurisdictionId: input.jurisdictionId,
    sessionYear: input.sessionYear,
    adjournedOn: next.currentDate as IsoDate,
    budgetMeasureId: input.budgetMeasureId,
    leftPendingMeasureIds: [...input.leftPendingMeasureIds],
    rationale: input.rationale,
    eventId: event.id,
  };
  next = {
    ...next,
    history: {
      ...next.history,
      nextSequence: next.history.nextSequence + 1,
      sessionAdjournments: [
        ...(next.history.sessionAdjournments ?? []),
        record,
      ],
    },
  };
  return next;
}
