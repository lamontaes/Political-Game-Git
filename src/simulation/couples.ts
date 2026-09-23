import { ageOnDate } from "./dates";
import { evaluateDecision } from "./decisions";
import { createPartnership, recordPartnershipState } from "./life";
import { LIFE_MIND_IDS } from "./life-mind-content";
import {
  activePartnershipsAt,
  currentLifeCutoff,
  kinshipRelationshipsAt,
  partnershipStateHistory,
} from "./life-queries";
import { personName } from "./people";
import { latestPersonalValue } from "./queries";
import { recordRelationshipInteraction } from "./records";
import { readRelationshipStanding } from "./relationship-standing";
import type {
  DecisionConsideration,
  EntityId,
  Partnership,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * Two people going out together, and becoming a couple.
 *
 * The owner ruled on 2026-09-23 that couples go all the way (dating, living
 * together, marriage) and that one-night stands exist. This file holds the
 * first two steps: a date, which is an ordinary meeting both people agreed was
 * a date, and becoming a couple, which one of them asks and the other answers.
 * Living together, marriage, and the rest build on the partnership this
 * writes; nothing in play created one before.
 *
 * Every answer is the other person's, weighed from their own side through the
 * shared decision evaluator, and a no is as real as a yes.
 *
 * PLACEHOLDER, NOT RESEARCH: which considerations bear on saying yes, how much
 * each weighs, and how many dates come before asking are filed with ChatGPT as
 * `how-two-people-become-a-couple` (the rules) and
 * `how-american-couples-form-in-numbers` (the measured pace). The game has no
 * model of attraction; openness to company, how the two of them already
 * stand, and whether the person asked is already with somebody stand in until
 * those answers land.
 */

export const DATE_OCCASION = "date";
export const DATE_OCCASION_TAG = "contact.occasion:date";
export const DATE_KIND = "contact:date";
export const COUPLE_KIND = "romantic:couple";
export const COUPLE_FORMED_EVENT = "life.couple-formed";
export const COUPLE_DECLINED_EVENT = "life.couple-declined";
export const COUPLE_ENDED_EVENT = "life.couple-ended";

/** Calibration: kept dates before either of them may ask. See header. */
export const DATES_BEFORE_ASKING = 2;

const ADULT_AGE = 18;

function isAdult(world: World, personId: EntityId): boolean {
  const person = world.people[personId];
  return (
    !!person && ageOnDate(person.birthDate, world.currentDate) >= ADULT_AGE
  );
}

function areKin(world: World, a: EntityId, b: EntityId): boolean {
  return kinshipRelationshipsAt(world, a, currentLifeCutoff(world)).some(
    (kin) => kin.personIds.includes(b),
  );
}

/** Why these two cannot go out together, or null when they can. */
export function dateRefusal(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): string | null {
  if (personId === otherId) return "A date takes two people.";
  if (!isAdult(world, personId) || !isAdult(world, otherId)) {
    return "Dates are between adults.";
  }
  if (areKin(world, personId, otherId)) return "You are family.";
  return null;
}

/** The couple these two are, if they are one now. */
export function coupleBetween(
  world: World,
  a: EntityId,
  b: EntityId,
): Partnership | null {
  return (
    activePartnershipsAt(world, a, currentLifeCutoff(world)).find(
      (partnership) =>
        partnership.kind === COUPLE_KIND && partnership.personIds.includes(b),
    ) ?? null
  );
}

/** Dates the two of them actually went on, oldest first. */
export function keptDates(world: World, a: EntityId, b: EntityId) {
  return world.history.relationshipInteractions.filter(
    (interaction) =>
      interaction.kind === DATE_KIND &&
      interaction.personIds.includes(a) &&
      interaction.personIds.includes(b),
  );
}

/** Whether somebody is with anyone other than this person right now. */
function withSomebodyElse(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): Partnership | null {
  return (
    activePartnershipsAt(world, personId, currentLifeCutoff(world)).find(
      (partnership) => !partnership.personIds.includes(otherId),
    ) ?? null
  );
}

/**
 * What bears on somebody's answer to a romantic question from somebody else:
 * whether they are already with somebody, whether they want company at all,
 * and how the two of them stand. Used for a date and for becoming a couple.
 */
export function romanticConsiderations(
  world: World,
  stableKey: string,
  answererId: EntityId,
  askerId: EntityId,
): DecisionConsideration[] {
  const considerations: DecisionConsideration[] = [];
  const taken = withSomebodyElse(world, answererId, askerId);
  if (taken) {
    considerations.push({
      stableKey: `${stableKey}:with-somebody`,
      optionKey: "decline",
      sourceType: "context:partnership",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "They are with somebody.",
      sourceRefs: [],
    });
  }
  const connection = latestPersonalValue(
    world,
    answererId,
    LIFE_MIND_IDS.connection,
  );
  if (connection) {
    const embraces = connection.orientation === "embraces";
    considerations.push({
      stableKey: `${stableKey}:connection`,
      optionKey: embraces ? "accept" : "decline",
      sourceType: "mind:personal-value",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation: embraces
        ? "They want people in their life."
        : "They keep to themselves.",
      sourceRefs: [{ kind: "personal-value", valueRecordId: connection.id }],
    });
  }
  const readings = readRelationshipStanding(
    world,
    answererId,
    askerId,
  ).readings;
  // How they stand is read from what passed between them; the latest of it
  // is what the answer cites.
  const latest = world.history.relationshipInteractions
    .filter(
      (interaction) =>
        interaction.personIds.includes(answererId) &&
        interaction.personIds.includes(askerId),
    )
    .at(-1);
  const between = latest
    ? [
        {
          kind: "relationship-interaction" as const,
          interactionId: latest.id,
        },
      ]
    : [];
  if (
    !readings.warmth.adverse &&
    (readings.warmth.band === "marked" || readings.warmth.band === "strong")
  ) {
    considerations.push({
      stableKey: `${stableKey}:warmth`,
      optionKey: "accept",
      sourceType: "social:relationship",
      direction: "supports",
      importance: readings.warmth.band === "strong" ? "strong" : "moderate",
      confidence: "high",
      explanation: "They are glad of the other's company.",
      sourceRefs: between,
    });
  }
  if (
    readings.tension.band === "marked" ||
    readings.tension.band === "strong"
  ) {
    considerations.push({
      stableKey: `${stableKey}:tension`,
      optionKey: "decline",
      sourceType: "social:relationship",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "Something between them is unsettled.",
      sourceRefs: between,
    });
  }
  return considerations;
}

/** Why this person cannot ask the other to be a couple now, or null. */
export function coupleAskRefusal(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): string | null {
  const refusal = dateRefusal(world, personId, otherId);
  if (refusal) return refusal;
  if (coupleBetween(world, personId, otherId))
    return "You are already together.";
  const dates = keptDates(world, personId, otherId).length;
  if (dates < DATES_BEFORE_ASKING) {
    return dates === 0
      ? "You have not been out together yet."
      : "You have only been out together once.";
  }
  if (
    world.history.events.some(
      (event) =>
        event.type === COUPLE_DECLINED_EVENT &&
        event.occurredAt === world.currentDate &&
        event.involvedEntityIds.includes(personId) &&
        event.involvedEntityIds.includes(otherId),
    )
  ) {
    return "You asked today, and they said no.";
  }
  return null;
}

export interface CoupleAnswer {
  readonly world: World;
  readonly accepted: boolean;
}

/**
 * One person asks the other to be a couple, in person, and hears the answer
 * then and there. A yes writes the partnership every other system reads; a no
 * is recorded as a no, and they can still see each other.
 */
export function askToBeACouple(
  world: World,
  input: { readonly personId: EntityId; readonly otherPersonId: EntityId },
): CoupleAnswer {
  const { personId, otherPersonId } = input;
  const refusal = coupleAskRefusal(world, personId, otherPersonId);
  if (refusal) throw new Error(refusal);
  const asker = world.people[personId]!;
  const asked = world.people[otherPersonId]!;
  const key = `couple:${personId}:${otherPersonId}:${world.currentDate}:${world.history.nextSequence}`;
  const evaluation = evaluateDecision(world, {
    stableKey: `${key}:answer`,
    decisionType: "people.couple-answer",
    actorPersonId: otherPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "couple-request", entityId: null },
    options: [
      { key: "accept", label: "Say yes", description: "Be a couple." },
      {
        key: "decline",
        label: "Say no",
        description: "Keep it as it is.",
      },
    ],
    constraints: [],
    considerations: romanticConsiderations(world, key, otherPersonId, personId),
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  const accepted = evaluation.selectedOptionKey === "accept";
  const summary = accepted
    ? `${personName(asker)} asked ${personName(asked)} to be a couple, and ${asked.givenName} said yes.`
    : `${personName(asker)} asked ${personName(asked)} to be a couple, and ${asked.givenName} said no.`;
  let next = recordWorldEvent(world, {
    stableKey: key,
    type: accepted ? COUPLE_FORMED_EVENT : COUPLE_DECLINED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: asker.homeJurisdictionId,
    involvedEntityIds: [personId, otherPersonId],
    participants: [
      { personId, role: "agency:asked", detail: "Asked to be a couple" },
      {
        personId: otherPersonId,
        role: "agency:answered",
        detail: accepted ? "Said yes" : "Said no",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.couple", `life.couple.answer:${accepted ? "yes" : "no"}`],
    summary,
    context: {
      location: null,
      socialContext: "One person asking another to be a couple.",
      pressure: null,
      choice: "Asked to be a couple",
      motivation: null,
      immediateReaction: accepted ? "Yes." : "No.",
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  if (!accepted) return { world: next, accepted };
  next = createPartnership(next, {
    stableKey: `${key}:partnership`,
    personIds: [personId, otherPersonId],
    startedAt: next.currentDate,
    kind: COUPLE_KIND,
    provenance: { kind: "simulated-event", eventId },
  });
  next = recordRelationshipInteraction(next, {
    stableKey: `${key}:interaction`,
    personIds: [personId, otherPersonId],
    eventId,
    occurredAt: next.currentDate,
    kind: "commitment:couple",
    change: "formed",
    significance: "major",
    summary,
    tags: ["life.couple"],
  });
  return { world: next, accepted };
}

/** One of them ends it. Nobody has to agree to a breakup. */
export function endCouple(
  world: World,
  input: { readonly personId: EntityId; readonly otherPersonId: EntityId },
): World {
  const couple = coupleBetween(world, input.personId, input.otherPersonId);
  if (!couple) throw new Error("You are not together.");
  const ender = world.people[input.personId]!;
  const other = world.people[input.otherPersonId]!;
  const key = `couple-ended:${couple.id}`;
  const summary = `${personName(ender)} ended things with ${personName(other)}.`;
  let next = recordWorldEvent(world, {
    stableKey: key,
    type: COUPLE_ENDED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: ender.homeJurisdictionId,
    involvedEntityIds: [input.personId, input.otherPersonId],
    participants: [
      { personId: input.personId, role: "agency:actor", detail: "Ended it" },
      {
        personId: input.otherPersonId,
        role: "impact:affected",
        detail: "Was broken up with",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.couple", "life.couple.ended"],
    summary,
    context: {
      location: null,
      socialContext: "A couple ending.",
      pressure: null,
      choice: "Ended it",
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  const latest = partnershipStateHistory(next, couple.id).at(-1)!;
  next = recordPartnershipState(next, {
    stableKey: `${key}:state`,
    partnershipId: couple.id,
    effectiveAt: next.currentDate,
    status: "ended",
    provenance: { kind: "simulated-event", eventId },
    supersedesStateId: latest.id,
  });
  return recordRelationshipInteraction(next, {
    stableKey: `${key}:interaction`,
    personIds: [input.personId, input.otherPersonId],
    eventId,
    occurredAt: next.currentDate,
    kind: "commitment:couple",
    change: "ended",
    significance: "major",
    summary,
    tags: ["life.couple"],
  });
}
