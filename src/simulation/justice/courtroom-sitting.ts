import {
  eventsOfType,
  PROSECUTION_ENDED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  REFERRAL_TAG,
} from "./jail-terms";
import type { EntityId, HistoricalEvent, World } from "../types";

const REFERRED_EVENT = "justice.prosecution-referred";
const MISTRIAL_EVENT = "justice.mistrial";

export type CourtroomSittingStage = "trial" | "verdict" | "sentencing";

/**
 * A day the court sat on a person's case: the people the saved records place
 * in the room. Read-only. A person with no saved record of the role is absent,
 * never invented: defense counsel are not recorded yet, and a day with no
 * sentencing decision carries no judge.
 */
export interface CourtroomSitting {
  readonly referralId: EntityId;
  readonly stage: CourtroomSittingStage;
  readonly venueJurisdictionId: EntityId | null;
  readonly defendantId: EntityId;
  /** The judge whose saved sentencing decision this day names, else null. */
  readonly judgeId: EntityId | null;
  /** The prosecutor who reviewed the referral for charging, else null. */
  readonly prosecutorId: EntityId | null;
  /** Jurors whose saved ballots on this day's trial name them, in id order. */
  readonly jurorIds: readonly EntityId[];
}

/**
 * The court sitting today on this person's own case, from the events that
 * closed it or sentenced it today and the decisions saved with them, or null
 * on a day the court did not sit.
 */
export function courtroomSittingToday(
  world: World,
  personId: EntityId,
): CourtroomSitting | null {
  const today = world.currentDate;
  for (const referral of eventsOfType(world, REFERRED_EVENT)) {
    const defendant = referral.participants.find(
      (entry) => entry.role === "focus:subject",
    )?.personId;
    if (defendant !== personId) continue;
    const todays = (type: HistoricalEvent["type"]) =>
      eventsOfType(world, type).some(
        (event) =>
          event.occurredAt === today &&
          event.tags.includes(`${REFERRAL_TAG}${referral.id}`),
      );
    const sentenced = todays(PROSECUTION_SENTENCED_EVENT);
    const ended = todays(PROSECUTION_ENDED_EVENT) || todays(MISTRIAL_EVENT);
    if (!sentenced && !ended) continue;
    const traces = world.history.decisionTraces.filter(
      (trace) =>
        trace.recordedAt === today &&
        trace.context.stableKey.startsWith(`${referral.stableKey}:`),
    );
    const sentencing = traces.find((trace) =>
      trace.context.stableKey.startsWith(`${referral.stableKey}:sentence`),
    );
    const jurorIds = [
      ...new Set(
        traces
          .filter((trace) =>
            trace.context.stableKey.startsWith(`${referral.stableKey}:trial:`),
          )
          .map((trace) => trace.context.actorPersonId),
      ),
    ].sort();
    const prosecutorId =
      eventsOfType(world, "justice.referral-received")
        .find((event) => event.tags.includes(`${REFERRAL_TAG}${referral.id}`))
        ?.participants.find((entry) => entry.role === "other:prosecutor")
        ?.personId ?? null;
    return {
      prosecutorId,
      referralId: referral.id,
      stage: sentenced ? "sentencing" : jurorIds.length ? "verdict" : "trial",
      venueJurisdictionId: referral.jurisdictionId,
      defendantId: personId,
      judgeId: sentencing?.context.actorPersonId ?? null,
      jurorIds,
    };
  }
  return null;
}
