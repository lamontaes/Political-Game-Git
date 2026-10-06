import { ageOnDate } from "./dates";
import { evaluateDecision, isSelectedDecision } from "./decisions";
import { createPartnership, recordPartnershipState } from "./life";
import { LIFE_MIND_IDS } from "./life-mind-content";
import { ensurePeopleTraits, personTrait } from "./people-traits";
import {
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  kinshipRelationshipsAt,
  partnershipStateHistory,
} from "./life-queries";
import { factsForPerson, personName } from "./people";
import { latestPersonalValue, latestPersonalValuesForPerson } from "./queries";
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

const ADULT_AGE = 18;

export type WorkplaceRomanceRule = "weigh-against" | "allow" | "refuse";
/** The owner's workplace-romance option b: legal, recorded, and personally complicated. */
export const WORKPLACE_ROMANCE_RULE: WorkplaceRomanceRule = "weigh-against";

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

/**
 * Whether one of them ever raised or cared for the other. It reads the whole
 * record, not what is current: a guardianship ends when the child turns
 * eighteen, and a Rhode Island life whose guardian had no kinship record was
 * then offered a date with her (playtest on main 22b4f13e, 2026-09-23).
 */
function everInTheirCare(world: World, a: EntityId, b: EntityId): boolean {
  const pair = (x: EntityId, y: EntityId) =>
    (x === a && y === b) || (x === b && y === a);
  return (
    world.history.childAuthorities.some(
      (authority) =>
        authority.holder.kind === "person" &&
        pair(authority.holder.personId, authority.childPersonId),
    ) ||
    world.history.careResponsibilities.some((care) =>
      pair(care.caregiverPersonId, care.recipientPersonId),
    )
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
  if (everInTheirCare(world, personId, otherId)) return "You are family.";
  const workplace = workplaceRomanceWeighs(world, personId, otherId);
  if (workplace.refusal) return workplace.refusal;
  /*
   * One person at a time. A Massachusetts life asked a second person to be a
   * couple while still with the first, heard yes, and had two partners; then
   * she was offered a third date (roll call, 2026-09-23). Whether anyone in
   * the game steps out on a partner is the owner's open question, so nothing
   * here offers it: the existing couple stands, and nothing new begins until
   * it has ended.
   */
  const current = withSomebodyElse(world, personId, otherId);
  if (current) {
    const partnerId = current.personIds.find((id) => id !== personId);
    const partner = partnerId ? world.people[partnerId] : undefined;
    return partner
      ? `You are with ${partner.givenName}. That would have to end first.`
      : "You are with somebody else. That would have to end first.";
  }
  if (withSomebodyElse(world, otherId, personId)) {
    return `${world.people[otherId]!.givenName} is with somebody.`;
  }
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
  const workplace = workplaceRomanceWeighs(world, askerId, answererId);
  considerations.push(...workplace.considerations);
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
  const standing = readRelationshipStanding(world, answererId, askerId);
  const readings = standing.readings;
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
  const sharedHistory = world.history.relationshipInteractions.filter(
    (interaction) =>
      interaction.personIds.includes(answererId) &&
      interaction.personIds.includes(askerId),
  );
  if (sharedHistory.length > 0) {
    const recency = standing.absence.currency;
    considerations.push({
      stableKey: `${stableKey}:time-together`,
      optionKey: "accept",
      sourceType: "social:relationship",
      direction: "supports",
      importance:
        readings.warmth.band === "strong" && !readings.warmth.adverse
          ? "strong"
          : "moderate",
      confidence: "high",
      explanation:
        recency === "current" &&
        readings.warmth.band === "strong" &&
        !readings.warmth.adverse
          ? "They have kept finding time for one another."
          : recency === "dormant"
            ? "They spent time together, though it has been a while."
            : "They have spent time together.",
      sourceRefs: sharedHistory.slice(-4).map((interaction) => ({
        kind: "relationship-interaction" as const,
        interactionId: interaction.id,
      })),
    });
  }
  const sharedSettings = new Map<string, typeof sharedHistory>();
  for (const interaction of sharedHistory) {
    const labels = new Set<string>();
    if (
      interaction.kind.startsWith("work:") ||
      interaction.tags.some((tag) => tag.includes("shared-work"))
    )
      labels.add("work");
    if (
      interaction.kind.includes("shared-school") ||
      interaction.tags.some((tag) => tag.includes("shared-school"))
    )
      labels.add("school");
    if (interaction.tags.some((tag) => tag.startsWith("campaign.")))
      labels.add("campaign");
    if (interaction.tags.some((tag) => tag.startsWith("party.")))
      labels.add("party");
    for (const label of labels) {
      const rows = sharedSettings.get(label) ?? [];
      sharedSettings.set(label, [...rows, interaction]);
    }
  }
  for (const [setting, interactions] of sharedSettings) {
    considerations.push({
      stableKey: `${stableKey}:shared-${setting}`,
      optionKey: "accept",
      sourceType: "social:relationship",
      direction: "supports",
      importance: readings.warmth.band === "strong" ? "moderate" : "slight",
      confidence: "medium",
      explanation: `They have crossed paths through ${setting === "work" ? "work" : setting === "school" ? "school" : setting === "campaign" ? "campaign work" : "their party"}.`,
      sourceRefs: interactions.slice(-3).map((interaction) => ({
        kind: "relationship-interaction" as const,
        interactionId: interaction.id,
      })),
    });
  }
  const answererAge = ageOnDate(
    world.people[answererId]!.birthDate,
    world.currentDate,
  );
  const askerAge = ageOnDate(
    world.people[askerId]!.birthDate,
    world.currentDate,
  );
  const youngerAge = Math.min(answererAge, askerAge);
  const ageGap = Math.abs(answererAge - askerAge);
  if (ageGap > 0 && sharedHistory.length > 0) {
    const ageFacts = [answererId, askerId].flatMap((personId) => {
      const fact = factsForPerson(world.people[personId]!).find(
        (candidate) => candidate.kind === "birth-date",
      );
      return fact
        ? [
            {
              kind: "person-fact" as const,
              factId: fact.id,
              personId,
            },
          ]
        : [];
    });
    const gapShare = ageGap / Math.max(1, youngerAge);
    considerations.push({
      stableKey: `${stableKey}:life-stage`,
      optionKey: "decline",
      sourceType: "context:life",
      direction: "supports",
      importance: gapShare > 0.75 ? "moderate" : "slight",
      confidence: "medium",
      explanation:
        youngerAge < 30 && ageGap > 5
          ? "They are at noticeably different stages in life."
          : "They have had different amounts of time to build their lives.",
      sourceRefs: ageFacts,
    });
  }
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
  const answererValues = latestPersonalValuesForPerson(world, answererId);
  const askerValues = latestPersonalValuesForPerson(world, askerId);
  const askerValuesById = new Map(
    askerValues.map((value) => [value.valueId, value]),
  );
  const sharedValues = answererValues.flatMap((value) => {
    const other = askerValuesById.get(value.valueId);
    return other ? [{ value, other }] : [];
  });
  const alignedValues = sharedValues.filter(
    ({ value, other }) => value.orientation === other.orientation,
  );
  const differingValues = sharedValues.filter(
    ({ value, other }) => value.orientation !== other.orientation,
  );
  if (sharedHistory.length > 0 && alignedValues.length > 0) {
    considerations.push({
      stableKey: `${stableKey}:shared-values`,
      optionKey: "accept",
      sourceType: "mind:personal-value",
      direction: "supports",
      importance: alignedValues.length > 1 ? "moderate" : "slight",
      confidence: "medium",
      explanation: "They see eye to eye on some things that matter to them.",
      sourceRefs: alignedValues.flatMap(({ value, other }) => [
        { kind: "personal-value" as const, valueRecordId: value.id },
        {
          kind: "personal-value" as const,
          valueRecordId: other.id,
          personId: other.personId,
        },
      ]),
    });
  }
  if (sharedHistory.length > 0 && differingValues.length > 0) {
    considerations.push({
      stableKey: `${stableKey}:different-values`,
      optionKey: "decline",
      sourceType: "mind:personal-value",
      direction: "supports",
      importance: differingValues.length > 1 ? "moderate" : "slight",
      confidence: "medium",
      explanation: "They see some important things differently.",
      sourceRefs: differingValues.flatMap(({ value, other }) => [
        { kind: "personal-value" as const, valueRecordId: value.id },
        {
          kind: "personal-value" as const,
          valueRecordId: other.id,
          personId: other.personId,
        },
      ]),
    });
  }
  const sociability = personTrait(world, answererId, "sociability");
  if (sociability.recordId !== null && sociability.value !== 0) {
    const outgoing = sociability.value > 0;
    considerations.push({
      stableKey: `${stableKey}:sociability`,
      optionKey: outgoing ? "accept" : "decline",
      sourceType: "mind:personality",
      direction: "supports",
      importance: Math.abs(sociability.value) > 1 ? "moderate" : "slight",
      confidence: "medium",
      explanation: outgoing
        ? "They are usually glad to make room for people."
        : "They usually take their time letting people close.",
      sourceRefs: [
        {
          kind: "personality-tendency",
          tendencyRecordId: sociability.recordId,
        },
      ],
    });
  }
  for (const { personId, role } of [
    { personId: answererId, role: "answerer" },
    { personId: askerId, role: "asker" },
  ] as const) {
    const deliberation = personTrait(world, personId, "deliberation");
    if (deliberation.recordId === null || deliberation.value === 0) continue;
    const takesTime = deliberation.value < 0;
    considerations.push({
      stableKey: `${stableKey}:deliberation:${role}`,
      optionKey: takesTime ? "decline" : "accept",
      sourceType: "mind:personality",
      direction: "supports",
      importance: Math.abs(deliberation.value) > 1 ? "moderate" : "slight",
      confidence: "medium",
      explanation:
        role === "answerer"
          ? takesTime
            ? "They like to take their time before making a commitment."
            : "They are open to acting when the moment feels right."
          : takesTime
            ? "They take a relationship seriously before asking for more."
            : "They can act quickly on a feeling.",
      sourceRefs: [
        {
          kind: "personality-tendency",
          tendencyRecordId: deliberation.recordId,
        },
      ],
    });
  }
  return considerations;
}

/**
 * How a real authority relationship affects the two people's decision.
 * Change this one switch if the owner chooses to remove the personal concern
 * or to forbid these relationships. The default leaves it allowed.
 */
export function workplaceRomanceWeighs(
  world: World,
  askerId: EntityId,
  answererId: EntityId,
): {
  readonly considerations: DecisionConsideration[];
  readonly refusal: string | null;
} {
  if (WORKPLACE_ROMANCE_RULE === "allow")
    return { considerations: [], refusal: null };
  const askerWork = activeWorkRelationshipsAt(world, askerId);
  const answererWork = activeWorkRelationshipsAt(world, answererId);
  const authorityGap = askerWork.some((left) =>
    answererWork.some(
      (right) =>
        left.relationship.organizationId !== null &&
        left.relationship.organizationId ===
          right.relationship.organizationId &&
        ((left.relationship.authority === "directs-others" &&
          right.relationship.authority !== "directs-others") ||
          (right.relationship.authority === "directs-others" &&
            left.relationship.authority !== "directs-others")),
    ),
  );
  if (!authorityGap) return { considerations: [], refusal: null };
  if (WORKPLACE_ROMANCE_RULE === "refuse")
    return {
      considerations: [],
      refusal: "You have authority over one another at work.",
    };
  const value = latestPersonalValue(world, answererId, LIFE_MIND_IDS.privacy);
  return {
    considerations:
      value?.orientation === "embraces"
        ? [
            {
              stableKey: `workplace-romance:${askerId}:${answererId}:${world.currentDate}`,
              optionKey: "decline",
              sourceType: "mind:personal-value",
              direction: "supports",
              importance: "slight",
              confidence: "medium",
              explanation:
                "They prefer to keep their private life separate from a work relationship where one person has authority.",
              sourceRefs: [{ kind: "personal-value", valueRecordId: value.id }],
            },
          ]
        : [],
    refusal: null,
  };
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
  const haveSpentTimeTogether = world.history.relationshipInteractions.some(
    (interaction) =>
      interaction.personIds.includes(personId) &&
      interaction.personIds.includes(otherId),
  );
  if (!haveSpentTimeTogether) {
    return "You have not spent time together yet.";
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
  readonly accepted: boolean | null;
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
  const withTraits = ensurePeopleTraits(world, [otherPersonId]);
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `${key}:answer`,
    decisionType: "people.couple-answer",
    actorPersonId: otherPersonId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
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
    considerations: romanticConsiderations(
      withTraits,
      key,
      otherPersonId,
      personId,
    ),
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  if (!isSelectedDecision(evaluation)) {
    return { world: withTraits, accepted: null };
  }
  // Somebody already with another person does not become a second couple;
  // what weighs on their answer is in `romanticConsiderations`, and this is
  // the one outcome it cannot be.
  const accepted =
    evaluation.selectedOptionKey === "accept" &&
    !withSomebodyElse(withTraits, otherPersonId, personId);
  const summary = accepted
    ? `${personName(asker)} asked ${personName(asked)} to be a couple, and ${asked.givenName} said yes.`
    : `${personName(asker)} asked ${personName(asked)} to be a couple, and ${asked.givenName} said no.`;
  let next = recordWorldEvent(withTraits, {
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
