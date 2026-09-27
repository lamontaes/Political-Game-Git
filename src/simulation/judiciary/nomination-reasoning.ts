/** Bounded NPC Senate reasoning for a saved judicial nominee. */

import {
  seatedCongressChamber,
  nationalPartyKeys,
} from "../governing/congress-chambers";
import { publicPartyAffiliation } from "../living-world/congress";
import type { EntityId, LegislativeMemberDisposition, World } from "../types";
import {
  JUDICIAL_CONFIRMATION_HEARING_EVENT,
  JUDICIAL_SENATE_BALLOT_EVENT,
  pendingFederalJudicialNomination,
  recordFederalJudicialSenateBallot,
} from "./federal-confirmation";

/** These weights are a game-profile placeholder, not a statement of Senate practice. */
export const JUDICIAL_NOMINATION_REASONING_PROFILE = {
  id: "judicial-nomination-reasoning/v1",
  sharedParty: 2,
  differentParty: -2,
  knownBarAdmission: 1,
  fiveYearsPractice: 1,
} as const;

export interface JudicialNominationFactor {
  readonly key: "party" | "bar-admission" | "legal-practice";
  readonly score: number;
  readonly explanation: string;
  readonly sourceIds: readonly string[];
}

export type JudicialNominationRecommendation =
  | { readonly state: "unresolved"; readonly reason: string }
  | {
      readonly state: "ready";
      readonly ballot: Extract<
        LegislativeMemberDisposition,
        "yea" | "nay" | "present-not-voting"
      >;
      readonly score: number;
      readonly factors: readonly JudicialNominationFactor[];
      readonly unknownFactors: readonly string[];
      readonly reason: string;
    };

function completedYearsSince(start: string, end: string): number {
  return (
    Number(end.slice(0, 4)) -
    Number(start.slice(0, 4)) -
    (end.slice(5) < start.slice(5) ? 1 : 0)
  );
}

/** A qualification counts only after this Senator learns a linked public record. */
function knownQualification(
  world: World,
  selectionRecordId: string,
  nomineeId: EntityId,
  senatorId: EntityId,
) {
  return [...(world.judiciary?.professionalQualifications ?? [])]
    .filter(
      (record) =>
        record.personId === nomineeId &&
        record.recordedAt <= world.currentDate &&
        record.barAdmittedAt <= world.currentDate,
    )
    .flatMap((record) => {
      const knowledge = world.history.knowledge.find((row) => {
        if (
          row.personId !== senatorId ||
          row.learnedAt > world.currentDate ||
          row.accuracy !== "accurate"
        )
          return false;
        const event = world.history.events.find(
          (candidate) => candidate.id === row.eventId,
        );
        return (
          event?.visibility === "public" &&
          event.occurredAt >= record.recordedAt &&
          event.occurredAt <= world.currentDate &&
          event.tags.includes(`selection:${selectionRecordId}`) &&
          event.tags.includes(`candidate:${nomineeId}`) &&
          event.tags.includes(`qualification:${record.recordId}`) &&
          event.involvedEntityIds.includes(nomineeId)
        );
      });
      return knowledge ? [{ record, knowledge }] : [];
    })
    .sort(
      (left, right) =>
        left.record.recordedAt.localeCompare(right.record.recordedAt) ||
        left.record.recordId.localeCompare(right.record.recordId),
    )
    .at(-1);
}

/** Read the actor's available inputs; never infer a nominee's bill positions. */
export function judicialNominationRecommendation(
  world: World,
  selectionRecordId: string,
  senatorPersonId: EntityId,
): JudicialNominationRecommendation {
  const pending = pendingFederalJudicialNomination(world, selectionRecordId);
  const senator = seatedCongressChamber(world, "senate")?.body.members.find(
    (member) => member.personId === senatorPersonId,
  );
  if (!senator)
    return {
      state: "unresolved",
      reason: "This person is not a seated Senator.",
    };
  const hearing = world.history.events.find(
    (event) =>
      event.type === JUDICIAL_CONFIRMATION_HEARING_EVENT &&
      event.tags.includes(`selection:${selectionRecordId}`),
  );
  if (
    !hearing ||
    hearing.occurredAt > world.currentDate ||
    !hearing.tags.includes(`candidate:${pending.nomineeId}`) ||
    !hearing.involvedEntityIds.includes(pending.nomineeId) ||
    !world.history.knowledge.some(
      (knowledge) =>
        knowledge.personId === senatorPersonId &&
        knowledge.eventId === hearing.id &&
        knowledge.learnedAt <= world.currentDate &&
        knowledge.accuracy === "accurate",
    )
  )
    return {
      state: "unresolved",
      reason:
        "This Senator has no recorded knowledge of the nomination hearing.",
    };

  const factors: JudicialNominationFactor[] = [];
  const unknownFactors: string[] = [];
  const executiveId = pending.nomination.actorPersonId;
  const executivePartyOrganizationId = executiveId
    ? publicPartyAffiliation(world, executiveId, {
        asOf: pending.nomination.occurredAt,
      })
    : null;
  const executiveParty = executivePartyOrganizationId
    ? (nationalPartyKeys(world).get(executivePartyOrganizationId) ?? null)
    : null;
  const senatorParty = senator.partyKey ?? null;
  if (executiveParty && senatorParty) {
    const shared = executiveParty === senatorParty;
    factors.push({
      key: "party",
      score: shared
        ? JUDICIAL_NOMINATION_REASONING_PROFILE.sharedParty
        : JUDICIAL_NOMINATION_REASONING_PROFILE.differentParty,
      explanation: shared
        ? "The Senator and appointing executive share a recorded party."
        : "The Senator and appointing executive have different recorded parties.",
      sourceIds: [
        senator.memberKey,
        executivePartyOrganizationId!,
        ...(pending.nomination.outcomeEventId
          ? [pending.nomination.outcomeEventId]
          : []),
      ],
    });
  } else {
    unknownFactors.push("party alignment");
  }

  const qualification = knownQualification(
    world,
    selectionRecordId,
    pending.nomineeId,
    senatorPersonId,
  );
  if (qualification) {
    const sourceIds = [
      qualification.record.recordId,
      qualification.knowledge.id,
      qualification.knowledge.eventId,
    ];
    factors.push({
      key: "bar-admission",
      score: JUDICIAL_NOMINATION_REASONING_PROFILE.knownBarAdmission,
      explanation:
        "The Senator has a recorded candidate file with bar admission.",
      sourceIds,
    });
    const practiceSince = qualification.record.legalPracticeSince;
    if (
      practiceSince &&
      completedYearsSince(practiceSince, world.currentDate) >= 5
    ) {
      factors.push({
        key: "legal-practice",
        score: JUDICIAL_NOMINATION_REASONING_PROFILE.fiveYearsPractice,
        explanation:
          "The known candidate file records at least five years of legal practice.",
        sourceIds,
      });
    } else {
      unknownFactors.push("five years of legal practice");
    }
  } else {
    unknownFactors.push("professional qualification known to this Senator");
  }
  unknownFactors.push(
    "prior rulings",
    "home-state courtesy for this seat",
    "targeted group or constituent pressure",
    "hearing performance",
    "nomination-relevant Senator traits",
  );

  const score = factors.reduce((sum, factor) => sum + factor.score, 0);
  const ballot = score > 0 ? "yea" : score < 0 ? "nay" : "present-not-voting";
  const scoredReason = factors
    .map(
      (factor) =>
        `${factor.explanation} (${factor.score > 0 ? "+" : ""}${factor.score})`,
    )
    .join(" ");
  return {
    state: "ready",
    ballot,
    score,
    factors,
    unknownFactors,
    reason: `${scoredReason || "No established factor favors either side."} Unresolved: ${unknownFactors.join(", ")}.`,
  };
}

/** One NPC ballot through the existing writer; a repeat adds no second vote. */
export function recordNpcFederalJudicialSenateBallot(
  world: World,
  selectionRecordId: string,
  senatorPersonId: EntityId,
): World {
  if (
    world.control.kind === "person" &&
    world.control.personId === senatorPersonId
  )
    throw new Error("The player's Senate ballot requires their own choice.");
  const currentSitting = world.history.events.findLast(
    (event) =>
      event.type === "judicial.senate-floor-sitting" &&
      event.tags.includes(`selection:${selectionRecordId}`),
  );
  if (
    world.history.events.some(
      (event) =>
        event.type === JUDICIAL_SENATE_BALLOT_EVENT &&
        event.tags.includes(`selection:${selectionRecordId}`) &&
        event.tags.includes(`senator:${senatorPersonId}`) &&
        (currentSitting
          ? event.tags.includes(`sitting:${currentSitting.id}`)
          : !event.tags.some((tag) => tag.startsWith("sitting:"))),
    )
  )
    return world;
  const recommendation = judicialNominationRecommendation(
    world,
    selectionRecordId,
    senatorPersonId,
  );
  if (recommendation.state !== "ready") throw new Error(recommendation.reason);
  return recordFederalJudicialSenateBallot(world, {
    selectionRecordId,
    senatorPersonId,
    ballot: recommendation.ballot,
    reason: recommendation.reason,
  });
}
