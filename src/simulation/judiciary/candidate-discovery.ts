/** An explicit Presidential review of public seated judges for a real vacancy. */

import { currentPresidentOf } from "../crisis/offices";
import { personName } from "../people";
import { recordEventKnowledge } from "../records";
import { advanceWorldMinutes } from "../time-work";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import { courtById, seatHolderAt } from "./courts";
import {
  openJudicialSelectionFromProfile,
  resolveJudicialSelectionPlan,
} from "./selection";

export const JUDICIAL_ROSTER_REVIEW_EVENT = "judicial.roster-review";
// PLACEHOLDER(overnight): a 30-minute review is a game duration, not a sourced rule.
export const JUDICIAL_ROSTER_REVIEW_MINUTES = 30;

export interface PublicSeatedJudge {
  readonly personId: EntityId;
  readonly name: string;
  readonly seatId: string;
  readonly courtName: string;
}

export type FederalRosterReviewStatus =
  | { readonly state: "ready"; readonly kind: "vacancy" | "new-seat" }
  | { readonly state: "unavailable"; readonly reason: string };

/** Refuse a saved path whose next actor cannot use the Presidential action. */
export function federalRosterReviewStatus(
  world: World,
  seatId: string,
): FederalRosterReviewStatus {
  const president = currentPresidentOf(world);
  if (
    !president ||
    world.control.kind !== "person" ||
    world.control.personId !== president.personId
  )
    return {
      state: "unavailable",
      reason: "Only the player serving as President can review this vacancy.",
    };
  const seat = world.judiciary?.seats[seatId];
  const court = seat ? courtById(world, seat.courtId) : null;
  if (!seat || seat.retiredAt !== null || !court?.level.startsWith("federal-"))
    return {
      state: "unavailable",
      reason: "A current federal judicial seat is required.",
    };
  if (seatHolderAt(world, seatId))
    return { state: "unavailable", reason: "The judicial seat is not vacant." };
  const kind = world.judiciary?.seatTenures.some(
    (tenure) => tenure.seatId === seatId,
  )
    ? "vacancy"
    : "new-seat";
  const resolved = resolveJudicialSelectionPlan(world, seatId, kind);
  if (resolved.state !== "ready")
    return { state: "unavailable", reason: resolved.reason };
  const first = resolved.plan.stages[0];
  if (
    first?.mechanism !== "EXECUTIVE_NOMINATION" ||
    first.actor.value !== "President of the United States"
  )
    return {
      state: "unavailable",
      reason:
        "The recorded vacancy path does not yet authorize a Presidential nomination.",
    };
  return { state: "ready", kind };
}

/** Court service is public; this view reveals no private philosophy or career file. */
export function publicSeatedJudges(world: World): readonly PublicSeatedJudge[] {
  return Object.values(world.judiciary?.seats ?? {})
    .filter((seat) => seat.retiredAt === null)
    .flatMap((seat) => {
      const court = courtById(world, seat.courtId);
      const tenure = seatHolderAt(world, seat.seatId);
      const person = tenure ? world.people[tenure.personId] : null;
      if (!court || !person) return [];
      if (
        world.history.personDeaths.some(
          (death) =>
            death.personId === person.id && death.diedAt <= world.currentDate,
        )
      )
        return [];
      return [
        {
          personId: person.id,
          name: personName(person),
          seatId: seat.seatId,
          courtName: court.name,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) ||
        a.courtName.localeCompare(b.courtName) ||
        a.seatId.localeCompare(b.seatId),
    );
}

/** The controlled President selects real roster entries and opens one vacancy attempt. */
export function reviewFederalJudicialVacancy(
  world: World,
  input: {
    readonly seatId: string;
    readonly candidatePersonIds: readonly EntityId[];
  },
): World {
  const readiness = federalRosterReviewStatus(world, input.seatId);
  if (readiness.state !== "ready") throw new Error(readiness.reason);
  const president = currentPresidentOf(world)!;
  const seat = world.judiciary!.seats[input.seatId]!;
  const court = courtById(world, seat.courtId)!;
  const candidateIds = [...new Set(input.candidatePersonIds)];
  if (
    candidateIds.length === 0 ||
    candidateIds.length !== input.candidatePersonIds.length
  )
    throw new Error("Select distinct sitting judges to review.");
  const available = new Set(
    publicSeatedJudges(world).map((row) => row.personId),
  );
  if (candidateIds.some((personId) => !available.has(personId)))
    throw new Error("Every reviewed candidate must be a living seated judge.");

  let next = advanceWorldMinutes(world, JUDICIAL_ROSTER_REVIEW_MINUTES);
  if (next === world)
    throw new Error("A scheduled commitment prevents this roster review.");
  if (currentPresidentOf(next)?.personId !== president.personId)
    throw new Error("The President left office during the roster review.");
  const afterTime = federalRosterReviewStatus(next, input.seatId);
  if (afterTime.state !== "ready") throw new Error(afterTime.reason);
  const afterReview = new Set(
    publicSeatedJudges(next).map((row) => row.personId),
  );
  if (candidateIds.some((personId) => !afterReview.has(personId)))
    throw new Error("A reviewed judge is no longer seated and living.");
  next = openJudicialSelectionFromProfile(next, {
    seatId: input.seatId,
    kind: afterTime.kind,
    candidatePersonIds: candidateIds,
  });
  const selection = next.judiciary!.selections.at(-1)!;
  next = recordWorldEvent(next, {
    stableKey: `${JUDICIAL_ROSTER_REVIEW_EVENT}:${selection.recordId}`,
    type: JUDICIAL_ROSTER_REVIEW_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: court.jurisdictionId,
    involvedEntityIds: [president.personId, ...candidateIds],
    participants: [
      {
        personId: president.personId,
        role: "focus:actor",
        detail: "President",
      },
      ...candidateIds.map((personId) => ({
        personId,
        role: "focus:subject" as const,
        detail: "Sitting judge under consideration",
      })),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `selection:${selection.recordId}`,
      `seat:${seat.seatId}`,
      ...candidateIds.map((personId) => `candidate:${personId}`),
    ],
    summary: `The President reviewed the public court roster for ${court.name} and identified ${candidateIds.length} sitting ${candidateIds.length === 1 ? "judge" : "judges"} for consideration.`,
    context: {
      location: null,
      socialContext: "Presidential review of a federal judicial vacancy",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const review = next.history.events.at(-1)!;
  return recordEventKnowledge(next, {
    stableKey: `${JUDICIAL_ROSTER_REVIEW_EVENT}:${selection.recordId}:president-learns`,
    personId: president.personId,
    eventId: review.id,
    learnedAt: next.currentDate,
    believedSummary: review.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}
