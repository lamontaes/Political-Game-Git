import { addDays } from "./dates";
import { evaluateDecision } from "./decisions";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "./future-transitions";
import {
  activePartnershipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
} from "./life-queries";
import { ageOnDate } from "./dates";
import { personName } from "./people";
import { childrenOf, parentsOf, recordFamilyAddition } from "./people-family";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { recordEventKnowledge } from "./records";

import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  World,
} from "./types";

/**
 * Deciding to have a family, and the day it actually happens
 * (CRUNCH47 B1).
 *
 * The dated family commands already existed; nothing in ordinary play ever
 * reached them. This is the route: two adults who are actually together agree
 * to it, and the addition is recorded later on its own day, through the same
 * command a test would use.
 *
 * Both people decide. The player says what they want; the other adult answers
 * from their own temperament and circumstances, and "not now" is a real
 * answer that can be asked again another time.
 *
 * What the game does not claim: this models no biology and no adoption law.
 * The interval before the dated resolution is an authored waiting period, and
 * it is recorded as such. Nobody is given a child to make an heir available.
 */

export const FAMILY_INTENTION_EVENT = "life.family-intended";
export const FAMILY_INTENTION_ANSWERED_EVENT = "life.family-intent-answered";
export const FAMILY_RESOLUTION_TRANSITION_KEY = "people:family-resolution";
export const FAMILY_PLAN_TAG = "family-plan.v1";

/** Authored waiting periods, not medical or legal timelines. */
const WAIT_DAYS: Readonly<Record<FamilyPlanKind, number>> = {
  birth: 273,
  adoption: 210,
};
/** How long the other person takes to answer. */
const ANSWER_DELAY_DAYS = 2;
const MINIMUM_PARENT_AGE = 18;
/** Nobody in this model plans a child past this age. */
const MAXIMUM_PARENT_AGE = 45;

export type FamilyPlanKind = "birth" | "adoption";

export interface FamilyPlan {
  readonly eventId: EntityId;
  readonly kind: FamilyPlanKind;
  readonly personIds: readonly [EntityId, EntityId];
  readonly proposedBy: EntityId;
  readonly answer: "waiting" | "agreed" | "not-now";
  readonly resolvesOn: string | null;
  readonly childPersonId: EntityId | null;
}

function alive(world: World, personId: EntityId): boolean {
  return (
    !!world.people[personId] &&
    isPersonAliveAt(world, personId, currentLifeCutoff(world))
  );
}

export function familyPlans(
  world: World,
  personId: EntityId,
): readonly FamilyPlan[] {
  return world.history.events
    .filter(
      (event) =>
        event.type === FAMILY_INTENTION_EVENT &&
        event.involvedEntityIds.includes(personId),
    )
    .map((event) => {
      const answer = world.history.events.find(
        (candidate) =>
          candidate.type === FAMILY_INTENTION_ANSWERED_EVENT &&
          candidate.tags.includes(`family-plan:${event.id}`),
      );
      const addition = world.history.events.find(
        (candidate) =>
          candidate.type === "life.family-member-added" &&
          candidate.tags.includes(`family-plan:${event.id}`),
      );
      const kind = event.tags.includes("family-plan.kind:adoption")
        ? "adoption"
        : "birth";
      const agreed = answer?.tags.includes("family-plan.agreed") ?? false;
      return {
        eventId: event.id,
        kind: kind as FamilyPlanKind,
        personIds: [...event.involvedEntityIds].sort() as [EntityId, EntityId],
        proposedBy: event.participants.find(
          (entry) => entry.role === "agency:actor",
        )!.personId,
        answer: !answer ? "waiting" : agreed ? "agreed" : "not-now",
        resolvesOn: agreed
          ? (answer!.tags
              .find((tag) => tag.startsWith("family-plan.on:"))
              ?.slice("family-plan.on:".length) ?? null)
          : null,
        childPersonId:
          addition?.participants.find((entry) => entry.role === "focus:subject")
            ?.personId ?? null,
      };
    });
}

/** Whether these two could plan this at all, and why not when they cannot. */
export function familyPlanAvailability(
  world: World,
  personId: EntityId,
): { available: boolean; partnerPersonId: EntityId | null; reason: string } {
  const person = world.people[personId];
  if (!person) return { available: false, partnerPersonId: null, reason: "" };
  const partnership = activePartnershipsAt(world, personId).at(-1);
  const partnerId = partnership?.personIds.find(
    (id: EntityId) => id !== personId,
  );
  if (!partnerId || !alive(world, partnerId)) {
    return {
      available: false,
      partnerPersonId: null,
      reason:
        "This is a decision for two people, and there is nobody to make it with.",
    };
  }
  const shareHome = householdMembershipsAt(world, personId).some((entry) =>
    householdMembershipsAt(world, partnerId).some(
      (theirs) => theirs.household.id === entry.household.id,
    ),
  );
  if (!shareHome) {
    return {
      available: false,
      partnerPersonId: partnerId,
      reason: "You do not share a home yet.",
    };
  }
  for (const id of [personId, partnerId]) {
    const age = ageOnDate(world.people[id]!.birthDate, world.currentDate);
    if (age < MINIMUM_PARENT_AGE || age > MAXIMUM_PARENT_AGE) {
      return {
        available: false,
        partnerPersonId: partnerId,
        reason: "This is not something the two of you are planning now.",
      };
    }
  }
  if (familyPlans(world, personId).some((plan) => plan.answer === "waiting")) {
    return {
      available: false,
      partnerPersonId: partnerId,
      reason: "You have already raised it, and they have not answered yet.",
    };
  }
  return { available: true, partnerPersonId: partnerId, reason: "" };
}

/** One person raises it. Nothing is settled until the other answers. */
export function proposeFamilyPlan(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly kind: FamilyPlanKind;
  },
): World {
  const availability = familyPlanAvailability(world, input.personId);
  if (!availability.available || !availability.partnerPersonId) {
    throw new Error(availability.reason || "That cannot be planned now.");
  }
  const partnerId = availability.partnerPersonId;
  const person = world.people[input.personId]!;
  const partner = world.people[partnerId]!;
  const stableKey = `family-plan:${input.personId}:${partnerId}:${world.currentDate}`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: FAMILY_INTENTION_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [input.personId, partnerId],
    participants: [
      {
        personId: input.personId,
        role: "agency:actor",
        detail:
          input.kind === "birth"
            ? "Said they would like a child"
            : "Said they would like to adopt",
      },
      {
        personId: partnerId,
        role: "focus:asked-of",
        detail: "Was asked what they thought",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [FAMILY_PLAN_TAG, `family-plan.kind:${input.kind}`],
    // Read by the player, who is the one raising it.
    summary:
      input.kind === "birth"
        ? `You told ${personName(partner)} you would like to have a child together.`
        : `You told ${personName(partner)} you would like to adopt a child together.`,
    context: {
      location: null,
      socialContext: "Two people deciding something together.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const intention = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:told`,
    personId: partnerId,
    eventId: intention.id,
    learnedAt: next.currentDate,
    believedSummary: intention.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.personId,
      claimId: null,
    },
  });
  return scheduleFutureDueItem(next, {
    stableKey: `${stableKey}:answer`,
    dueAt: addDays(next.currentDate, ANSWER_DELAY_DAYS),
    transitionKey: FAMILY_RESOLUTION_TRANSITION_KEY,
    entityIds: [intention.id, partnerId].sort(),
    jurisdictionId: person.homeJurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [intention.id] },
  });
}

/** The other person's answer, and — when it is yes — the day it lands on. */
function answerFamilyPlan(
  world: World,
  intentionId: EntityId,
): { world: World; eventId: EntityId; agreed: boolean } {
  const intention = world.history.events.find(
    (event) => event.id === intentionId,
  )!;
  const proposer = intention.participants.find(
    (entry) => entry.role === "agency:actor",
  )!.personId;
  const partnerId = intention.participants.find(
    (entry) => entry.role === "focus:asked-of",
  )!.personId;
  const kind: FamilyPlanKind = intention.tags.includes(
    "family-plan.kind:adoption",
  )
    ? "adoption"
    : "birth";
  const withTraits = ensurePeopleTraits(world, [partnerId]);
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `family-plan:${intentionId}:answer`,
    decisionType: "people.family-plan",
    actorPersonId: partnerId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "family-plan", entityId: null },
    options: [
      {
        key: "agree",
        label: "Yes",
        description: "Go ahead with it together.",
      },
      {
        key: "not-now",
        label: "Not now",
        description: "Leave it for the time being.",
      },
    ],
    constraints: [],
    considerations: traitConsiderations(
      withTraits,
      partnerId,
      `family-plan:${intentionId}`,
      [
        {
          optionKey: "agree",
          trait: "risk",
          pole: "high",
          explanation: "They are ready to take something on.",
        },
        {
          optionKey: "not-now",
          trait: "deliberation",
          pole: "low",
          explanation: "They would rather think it through for longer.",
        },
        {
          optionKey: "agree",
          trait: "reliability",
          pole: "high",
          explanation: "They mean to see things through.",
        },
      ],
    ),
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  const agreed = evaluation.selectedOptionKey === "agree";
  const on = addDays(withTraits.currentDate, WAIT_DAYS[kind]);
  const partner = withTraits.people[partnerId]!;
  let next = recordWorldEvent(withTraits, {
    stableKey: `family-plan:${intentionId}:answer`,
    type: FAMILY_INTENTION_ANSWERED_EVENT,
    occurredAt: withTraits.currentDate,
    recordedAt: withTraits.currentDate,
    jurisdictionId: intention.jurisdictionId,
    involvedEntityIds: [proposer, partnerId],
    participants: [
      {
        personId: partnerId,
        role: "agency:actor",
        detail: agreed ? "Agreed to it" : "Said not now",
      },
      { personId: proposer, role: "focus:asked-of", detail: "Had raised it" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FAMILY_PLAN_TAG,
      `family-plan:${intentionId}`,
      ...(agreed ? ["family-plan.agreed", `family-plan.on:${on}`] : []),
    ],
    summary: agreed
      ? kind === "birth"
        ? `${personName(partner)} said yes to having a child with you.`
        : `${personName(partner)} said yes to adopting a child with you.`
      : `${personName(partner)} would rather wait for now.`,
    context: {
      location: null,
      socialContext: "Two people deciding something together.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const answer = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `family-plan:${intentionId}:answer:told`,
    personId: proposer,
    eventId: answer.id,
    learnedAt: next.currentDate,
    believedSummary: answer.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: partnerId, claimId: null },
  });
  if (agreed) {
    next = scheduleFutureDueItem(next, {
      stableKey: `family-plan:${intentionId}:resolution`,
      dueAt: on,
      transitionKey: FAMILY_RESOLUTION_TRANSITION_KEY,
      entityIds: [intention.id, proposer].sort(),
      jurisdictionId: intention.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [intention.id] },
    });
  }
  return { world: next, eventId: answer.id, agreed };
}

/** The day itself: the dated family command, run for real. */
function resolveFamilyPlan(
  world: World,
  intentionId: EntityId,
): { world: World; eventId: EntityId } | null {
  const intention = world.history.events.find(
    (event) => event.id === intentionId,
  )!;
  const parents = [...intention.involvedEntityIds];
  if (!parents.every((id: EntityId) => alive(world, id))) return null;
  const kind: FamilyPlanKind = intention.tags.includes(
    "family-plan.kind:adoption",
  )
    ? "adoption"
    : "birth";
  // The addition carries the plan that led to it, so a reader can follow it
  // back to the decision the two of them made.
  if (kind === "adoption") {
    // Adoption places a child who already exists. Where nobody has been
    // placed with them, the plan simply does not resolve, and the record says
    // that rather than inventing a child.
    const childPersonId = placeableChild(world, parents);
    if (!childPersonId) return null;
    const added = recordFamilyAddition(world, {
      kind: "adoption",
      stableKey: `family-plan:${intentionId}:child`,
      occurredAt: world.currentDate,
      parentPersonIds: parents,
      childPersonId,
      tags: [`family-plan:${intentionId}`],
    });
    return { world: added.world, eventId: added.eventId };
  }
  const added = recordFamilyAddition(world, {
    kind: "birth",
    stableKey: `family-plan:${intentionId}:child`,
    occurredAt: world.currentDate,
    parentPersonIds: parents,
    tags: [`family-plan:${intentionId}`],
  });
  return { world: added.world, eventId: added.eventId };
}

/**
 * A child already in the world with no recorded parent, young enough to be
 * placed. Nobody is created here; if there is no such child, there is none.
 */
function placeableChild(
  world: World,
  parents: readonly EntityId[],
): EntityId | null {
  for (const personId of world.personOrder) {
    if (parents.includes(personId)) continue;
    const person = world.people[personId];
    if (!person || !alive(world, personId)) continue;
    const age = ageOnDate(person.birthDate, world.currentDate);
    if (age < 0 || age >= 18) continue;
    if (parentsOf(world, personId).length > 0) continue;
    return personId;
  }
  return null;
}

export function familyPlanTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== FAMILY_RESOLUTION_TRANSITION_KEY) {
    throw new Error("The family plan received another transition.");
  }
  const done = (
    reason: string,
    next: World = world,
    outcomeEventId: EntityId | null = null,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: `people:${reason}`,
    context: null,
    outcomeEventId,
  });
  const intentionId = dueItem.entityIds.find((id) =>
    world.history.events.some(
      (event) => event.id === id && event.type === FAMILY_INTENTION_EVENT,
    ),
  );
  if (!intentionId) return done("family-plan-missing");
  const intention = world.history.events.find(
    (event) => event.id === intentionId,
  )!;
  if (!intention.involvedEntityIds.every((id) => alive(world, id))) {
    return done("family-plan-lapsed");
  }
  const answered = world.history.events.some(
    (event) =>
      event.type === FAMILY_INTENTION_ANSWERED_EVENT &&
      event.tags.includes(`family-plan:${intentionId}`),
  );
  if (!answered) {
    const answer = answerFamilyPlan(world, intentionId);
    return done(
      answer.agreed ? "family-plan-agreed" : "family-plan-not-now",
      answer.world,
      answer.eventId,
    );
  }
  const already = world.history.events.some(
    (event) =>
      event.type === "life.family-member-added" &&
      event.tags.includes(`family-plan:${intentionId}`),
  );
  if (already) return done("family-plan-already-resolved");
  const resolved = resolveFamilyPlan(world, intentionId);
  if (!resolved) return done("family-plan-lapsed");
  return done("family-arrived", resolved.world, resolved.eventId);
}

export const PEOPLE_FAMILY_HANDLERS: FutureTransitionHandlerRegistry =
  createFutureTransitionHandlerRegistry([
    [FAMILY_RESOLUTION_TRANSITION_KEY, familyPlanTransitionHandler],
  ]);

/** Children of this pair that the world already records. */
export function childrenTogether(
  world: World,
  personId: EntityId,
  partnerId: EntityId,
): readonly EntityId[] {
  const theirs = new Set(childrenOf(world, partnerId));
  return childrenOf(world, personId).filter((id) => theirs.has(id));
}
