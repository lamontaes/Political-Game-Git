import type { AdultAftermathKind } from "./adult-situations";
import { applyCharacterHistoryPlan } from "./character-history";
import { addDays, makeIsoDate } from "./dates";
import { evaluateDecision } from "./decisions";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  activeLifeCommitmentsAt,
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "./life-queries";
import type {
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  IsoDate,
  LifeSituationKey,
  World,
} from "./types";

/**
 * Whether anything comes of a choice, decided later and from the world.
 *
 * This module exists to keep two things apart that a simpler design would have
 * merged, and the separation is the point of the whole wave.
 *
 * The adaptive layer decides *what to offer*. It knows about cross-pressure,
 * stakes tiers and why a situation looked interesting. None of that appears in
 * any type in this file, and none of it can: what is passed here is what
 * happened — which situation, which option, who else was involved, when — and
 * the world as it stands. A moment the selector found agonising and a moment it
 * offered because nothing else was available reach this code as the same shape
 * of thing, so the second cannot be quietly made less consequential than the
 * first. If it could, a player would learn to read importance off the
 * presentation, and every hard-looking decision would become a promise.
 *
 * And when nothing follows, nothing follows *for a reason that is in the
 * world*. Not a die that nullifies. The person who would have carried the
 * grievance is no longer anywhere the player is; the commitment the promise was
 * about has ended; the position was taken where nobody was listening. Each of
 * those is a real fact, recorded as the reason a scheduled thing was cancelled,
 * and each is answerable afterwards.
 */

export const LIFE_CALLBACK_TRANSITION_KEY = "life:callback" as const;

/**
 * What it reads like when it comes back.
 *
 * Written per family rather than once, because "something you decided a long
 * time ago turned out to still be there" three times in a row reads as the
 * record stuttering rather than as a life. The sentence says what returned; it
 * does not say what it is going to cost, because at this point nobody knows
 * and the record should not pretend to.
 *
 * Two rules the P2A2 editorial review made necessary. Twenty of these opened
 * "Your decision about", and thirty-one of thirty-three ended in some form of
 * "came back up" — one frame applied to a family fortnight, a debt, a colleague
 * and a candidacy alike, which is what made the whole surface read as a single
 * sentence with the nouns swapped.
 *
 * So: name the thing rather than the player's decision about the thing, and say
 * only what the callback has actually established. By the time a line here is
 * reached the handler has confirmed that the other person is still connected
 * and that they chose to raise it, so these say it was raised — which is a fact
 * — and stop. None of them says what was said, how it went, or what it cost.
 */
export const RETURN_SUMMARY: Readonly<Record<string, string>> = {
  "adult.family-request":
    "Your family raised the fortnight they had asked you for.",
  // Not "the care". What was asked of you has a task behind it, and the
  // handler has already confirmed the undertaking is still running — but which
  // way the player answered is not knowable here, so this says what was asked
  // rather than what was given.
  "adult.care-request": "The help that was asked of you was raised again.",
  "adult.friend-favour": "The favour was put to you once more.",
  // A private disclosure, raised by the person who made it. It does not say
  // that no one else has heard since; nothing in the world records that.
  "adult.friend-in-difficulty":
    "They came back to you about what they had told you.",
  "adult.friend-good-news": "Their good news was mentioned to you again.",
  "adult.work-credit": "Whose work it had been came up at work again.",
  "adult.work-extra-hours": "The extra hours were put to you once more.",
  // The adult scene has senior staff and colleagues in it, not a customer;
  // that detail belonged to the formative bank and was never true here.
  "adult.work-rule-pressure": "The rule at work is being argued over again.",
  "adult.work-colleague-struggling":
    "Your colleague’s difficulty came up in conversation again.",
  "adult.local-dispute": "The dispute was put back in front of you.",
  "adult.community-building": "The building came up for discussion again.",
  "adult.petition-ask": "You were asked to sign it after all.",
  // Running for office, in those words. Somebody deciding whether to put their
  // name on a ballot has to be told that is what this is about.
  "adult.candidacy-approach":
    "Somebody asked you about running for office again.",
  "adult.incident-aftermath":
    "What you did after the incident was brought up with you.",
  // No incident kind is claimed: the incident engine decides what happened,
  // and "the flooding" was an invention on top of it.
  "adult.incident-neighbour-help": "Helping the neighbours came back to you.",
  "adult.promise-comes-due": "The promise came back round to you.",
  "adult.old-favour-returns": "The old favour got a mention.",
  "adult.household-standing": "Who covers what at home is being asked again.",
  "adult.household-quiet-evening": "That evening came up between you again.",
  "adult.partner-plan": "The plans were put in front of you again.",
  "adult.work-offer-elsewhere": "The other job is on the table again.",
  "adult.debt-call": "Repayment came up between you again.",
  "adult.housing-cost-change": "What it costs to stay came round again.",
  "adult.help-with-strings": "The offer of help was put to you once more.",
  "adult.volunteer-ask": "You were asked to help out again.",
  "adult.weekend-invitation": "You were asked along again.",
  // These four situations are withheld from new play, but a save made before
  // the withholding can still carry a scheduled callback naming them, and a
  // record that comes due must still read as itself.
  "adult.household-repair": "The repair at home is still being asked about.",
  "adult.household-money-shortfall":
    "The shortfall was put in front of you again.",
  "adult.housing-repair-standoff":
    "The repairs and the rent are still between you.",
  "adult.small-windfall": "What happened to the money got mentioned.",
  "conversation.subject.household-obligation":
    "What was said at home about it was raised again.",
  "conversation.subject.neighborhood-meeting":
    "The neighbourhood meeting came up again.",
  "conversation.subject.school-project":
    "The school project was brought up with you again.",
};

// The last resort, for an origin whose tag no summary covers. A test holds
// that every situation able to schedule an aftermath has its own family
// sentence, so this stays unreachable in ordinary play rather than becoming
// the corpus's vaguest line by volume.
const GENERIC_RETURN = "Something from a while back came up again.";

/** Why nothing was scheduled, or why a scheduled thing came to nothing. */
export type LifeCallbackReason =
  /** Nobody is left who would carry it. */
  | "life:nobody-to-carry-it"
  /** It happened where nobody could hear it. */
  | "life:nobody-heard"
  /** The thing it was about has ended. */
  | "life:issue-overtaken"
  /** The person who would have acted is no longer in a position to. */
  | "life:actor-lost-standing"
  /** Attention moved on to something else. */
  | "life:attention-moved"
  /** It came back. */
  | "life:came-back";

/**
 * How long these take to come round, in days.
 *
 * Presentation pacing, and labelled as such. There is no survey that says how
 * long a favour stays owed, and the research is explicit that inventing one
 * would be worse than admitting the gap. What these numbers do is stop
 * everything landing in the same month.
 */
const AFTERMATH_DELAY_DAYS: Readonly<Record<AdultAftermathKind, number>> = {
  obligation: 96,
  grievance: 187,
  goodwill: 251,
  standing: 314,
};

export interface AftermathContext {
  readonly world: World;
  readonly personId: EntityId;
  /** What was chosen. Not why it was offered. */
  /**
   * What produced this, said in the vocabulary of whatever produced it.
   *
   * Situations and episode stages name themselves with a life-situation key.
   * A conversation names itself `conversation:<subject>`, because a promise
   * made in a room is the same kind of thing as a promise made by pressing a
   * button and must reach the same three questions — but calling it a
   * situation it is not would put a word in the record that is not true.
   *
   * Nothing in this module branches on it. It is carried so that whatever
   * reads the scheduled item later can say where it came from.
   */
  readonly situationKey: LifeSituationKey | `conversation:${string}`;
  readonly optionKey: string;
  readonly aftermath: AdultAftermathKind | null;
  readonly counterpartPersonId: EntityId | null;
  readonly occurredAt: IsoDate;
  readonly eventId: EntityId;
  readonly stableKey: string;
}

export type AftermathDecision =
  | { readonly kind: "nothing-follows"; readonly reason: LifeCallbackReason }
  | {
      readonly kind: "schedule";
      readonly dueAt: IsoDate;
      readonly aftermath: AdultAftermathKind;
    };

/**
 * Whether this choice leaves anything that can come back.
 *
 * Three questions, all answered from the world:
 *
 * 1. does the option leave the kind of thing that *can* come back at all;
 * 2. is there somebody or something for it to attach to;
 * 3. would anybody have been in a position to notice.
 *
 * A no to any of them is a real answer with a reason, not a failure.
 */
export function decideAftermath(context: AftermathContext): AftermathDecision {
  if (context.aftermath === null) {
    // The commonest case, and it must stay the commonest case. Most of what a
    // person does is finished when they have done it.
    return { kind: "nothing-follows", reason: "life:issue-overtaken" };
  }
  const cutoff = currentLifeCutoff(context.world);

  if (context.aftermath === "standing") {
    // A position only stands where there was somewhere for it to stand. Work,
    // a group, or a posted public agenda; otherwise it was said into a room
    // with nobody in it.
    const somewhereItCounts =
      activeWorkRelationshipsAt(context.world, context.personId, cutoff)
        .length > 0 ||
      activeOrganizationParticipationsAt(
        context.world,
        context.personId,
        cutoff,
      ).length > 0 ||
      context.world.history.workItems.some(
        (item) => item.stableKey === "ordinary-life:public-meeting",
      );
    if (!somewhereItCounts) {
      return { kind: "nothing-follows", reason: "life:nobody-heard" };
    }
  } else {
    // Obligations, grievances and goodwill are all held by somebody. Without a
    // somebody there is nothing to hold them.
    if (
      context.counterpartPersonId === null ||
      !context.world.people[context.counterpartPersonId]
    ) {
      return { kind: "nothing-follows", reason: "life:nobody-to-carry-it" };
    }
    if (
      !stillConnected(
        context.world,
        context.personId,
        context.counterpartPersonId,
      )
    ) {
      return { kind: "nothing-follows", reason: "life:attention-moved" };
    }
  }

  return {
    kind: "schedule",
    dueAt: addDays(
      makeIsoDate(context.occurredAt),
      AFTERMATH_DELAY_DAYS[context.aftermath],
    ),
    aftermath: context.aftermath,
  };
}

/**
 * Whether these two people are still anywhere near each other's lives.
 *
 * Household, kinship, a shared employer, a shared group. Nothing here is a
 * closeness score; it is the question of whether there is still a route by
 * which one of them would come up in the other's week.
 */
function stillConnected(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): boolean {
  const cutoff = currentLifeCutoff(world);
  const myHouseholds = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.membership.householdId,
    ),
  );
  if (
    householdMembershipsAt(world, otherId, cutoff).some((entry) =>
      myHouseholds.has(entry.membership.householdId),
    )
  ) {
    return true;
  }
  if (
    kinshipRelationshipsAt(world, personId, cutoff).some((relationship) =>
      relationship.personIds.includes(otherId),
    )
  ) {
    return true;
  }
  const myEmployers = new Set(
    activeWorkRelationshipsAt(world, personId, cutoff).map(
      (entry) => entry.relationship.organizationId,
    ),
  );
  if (
    activeWorkRelationshipsAt(world, otherId, cutoff).some((entry) =>
      myEmployers.has(entry.relationship.organizationId),
    )
  ) {
    return true;
  }
  const myGroups = new Set(
    activeOrganizationParticipationsAt(world, personId, cutoff).map(
      (entry) => entry.participation.organizationId,
    ),
  );
  return activeOrganizationParticipationsAt(world, otherId, cutoff).some(
    (entry) => myGroups.has(entry.participation.organizationId),
  );
}

/**
 * Puts the callback on the calendar, when the world says there is one.
 *
 * Returns the world unchanged when there is not, which is not a failure and is
 * not reported as one.
 */
export function scheduleAftermath(context: AftermathContext): World {
  const decision = decideAftermath(context);
  if (decision.kind === "nothing-follows") return context.world;
  const entityIds = [...new Set([context.personId, context.eventId])].sort();
  return scheduleFutureDueItem(context.world, {
    stableKey: `${context.stableKey}:callback`,
    dueAt: decision.dueAt,
    transitionKey: LIFE_CALLBACK_TRANSITION_KEY,
    entityIds,
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [context.eventId] },
  });
}

/**
 * What happens when it comes round.
 *
 * The handler asks the same questions again, months or years later, of a world
 * that has moved. Most of the time the answer is still yes and the thing comes
 * back. Sometimes the person has left, the job has ended, the group has
 * dissolved or the commitment is over, and then it does not — and the record
 * says which of those it was, rather than saying nothing.
 */
export function lifeCallbackTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== LIFE_CALLBACK_TRANSITION_KEY) {
    throw new Error("The life callback handler received another transition.");
  }
  const personId = dueItem.entityIds.find((id) => world.people[id]);
  const originId = dueItem.entityIds.find((id) => id !== personId);
  const origin = world.history.events.find((event) => event.id === originId);
  if (!personId || !origin) {
    return {
      world,
      status: "blocked",
      reasonKey: "life:actor-lost-standing",
      // Audit output, not ordinary-life prose. A broken reference is not
      // something that happened to anybody, so these read as diagnostics in
      // the third person and are never addressed to a player.
      context:
        "Diagnostic: the subject person or the originating event is absent from history.",
      outcomeEventId: null,
    };
  }
  const person = world.people[personId];
  const died = world.history.personDeaths.some(
    (record) => record.personId === personId,
  );
  if (!person || died) {
    return {
      world,
      status: "blocked",
      reasonKey: "life:actor-lost-standing",
      context:
        "Diagnostic: the subject person record is absent, or a death is recorded for them.",
      outcomeEventId: null,
    };
  }

  const cutoff = currentLifeCutoff(world);
  const counterpartId = origin.participants
    .map((participant) => participant.personId)
    .find((candidate) => candidate !== personId);

  // Who and what the situation was about, asked again of a later world.
  //
  // A conversation names itself with its subject tag rather than a situation
  // key, because a promise made in a room is not a situation. Both are read the
  // same way here so a callback does not have to know which produced it.
  const situationTag =
    origin.tags.find((tag) => tag.startsWith("adult.")) ??
    origin.tags.find((tag) => tag.startsWith("conversation.subject."));
  if (
    situationTag === "adult.promise-comes-due" ||
    situationTag === "adult.care-request"
  ) {
    if (activeLifeCommitmentsAt(world, personId, cutoff).length === 0) {
      return {
        world,
        status: "cancelled",
        reasonKey: "life:issue-overtaken",
        context:
          "Diagnostic: no active life commitment remains for this follow-up.",
        outcomeEventId: null,
      };
    }
  }

  if (counterpartId !== undefined) {
    if (!world.people[counterpartId]) {
      return {
        world,
        status: "cancelled",
        reasonKey: "life:nobody-to-carry-it",
        context: "Diagnostic: the counterpart person record is absent.",
        outcomeEventId: null,
      };
    }
    if (!stillConnected(world, personId, counterpartId)) {
      return {
        world,
        status: "cancelled",
        reasonKey: "life:attention-moved",
        context:
          "Diagnostic: no household, kinship, employer or organization link between the two people is on record.",
        outcomeEventId: null,
      };
    }
  }

  // Whether the other person actually raises it is theirs to decide, and it is
  // decided by the same evaluator every other autonomous choice in this
  // simulation goes through — over what the world records passed between the
  // two of them, not over a flag on the content row that produced the moment.
  // A row that said "this option is punished" would be the game deciding an
  // NPC's mind for them; this is the NPC reading their own history.
  if (counterpartId !== undefined) {
    const raised = counterpartRaisesIt(
      world,
      personId,
      counterpartId,
      dueItem,
      situationTag ?? "life.callback",
    );
    if (!raised) {
      return {
        world,
        status: "cancelled",
        reasonKey: "life:attention-moved",
        // Not a diagnostic. Somebody had the chance to raise it and did not,
        // which is a decision they made rather than a row that is missing.
        context:
          "It was still there to be raised, and the person who could have raised it did not.",
        outcomeEventId: null,
      };
    }
  }

  const returned =
    (situationTag ? RETURN_SUMMARY[situationTag] : undefined) ?? GENERIC_RETURN;
  const stableKey = `${dueItem.stableKey}:returned`;
  const applied = applyCharacterHistoryPlan(world, {
    stableKey,
    mode: "played",
    personId,
    transitions: [
      {
        kind: "event",
        input: {
          stableKey: `${stableKey}:event`,
          type: "life.earlier-choice-returned",
          occurredAt: dueItem.dueAt,
          recordedAt: dueItem.dueAt,
          jurisdictionId: origin.context.location?.jurisdictionId ?? null,
          involvedEntityIds: [personId],
          participants: [
            {
              personId,
              role: "focus:subject",
              detail: "The person it came back to",
            },
          ],
          personFactConstraints: [],
          visibility: "limited",
          // Deduplicated: an origin with no situation tag of its own used to
          // produce ["life.callback", "life.callback"], which the world
          // integrity check rejects. Nothing reached that path while every
          // aftermath came from an adult situation.
          tags: [
            ...new Set(["life.callback", situationTag ?? "life.callback"]),
          ],
          summary: returned,
          context: {
            location: null,
            socialContext: situationTag ?? null,
            pressure: null,
            choice: null,
            motivation: null,
            immediateReaction: null,
          },
        },
      },
      {
        kind: "memory",
        input: {
          stableKey: `${stableKey}:memory`,
          personId,
          eventStableKey: `${stableKey}:event`,
          formedAt: dueItem.dueAt,
          rememberedSummary: returned,
          interpretation: returned,
          strength: "moderate",
          relevanceTags: ["life.callback"],
          supersedesMemoryId: null,
        },
      },
    ],
  });

  const recorded = applied.world.history.events.find(
    (event) => event.stableKey === `${stableKey}:event`,
  );
  return {
    world: applied.world,
    status: "resolved",
    reasonKey: "life:came-back",
    context: "An earlier choice was raised again by somebody who was there.",
    outcomeEventId: recorded?.id ?? null,
  };
}

/**
 * The registry a life must advance time with.
 *
 * `advanceWorld` refuses to step over a due item it has no handler for, which
 * is right: silently skipping one would lose a consequence the world had
 * already committed to. Every surface that moves an adult life forward passes
 * this.
 */
export const LIFE_TRANSITION_HANDLERS: FutureTransitionHandlerRegistry =
  createFutureTransitionHandlerRegistry([
    [LIFE_CALLBACK_TRANSITION_KEY, lifeCallbackTransitionHandler],
  ]);

/**
 * The other person's own decision about whether to bring it up.
 *
 * Everything weighed here is something the world already recorded: the
 * exchanges between these two people, and which way each of them went. An
 * interaction the record calls strained argues for raising it; one it calls
 * strengthened argues for leaving it. Nothing about the situation's authored
 * content, its stakes tier, or why the player was shown it is in scope, and
 * none of it is passed.
 */
function counterpartRaisesIt(
  world: World,
  personId: EntityId,
  counterpartId: EntityId,
  dueItem: FutureDueItem,
  situationTag: string,
): boolean {
  const between = world.history.relationshipInteractions.filter(
    (interaction) =>
      interaction.personIds.includes(personId) &&
      interaction.personIds.includes(counterpartId) &&
      interaction.sequence < world.history.nextSequence &&
      interaction.occurredAt <= dueItem.dueAt,
  );
  const considerations: DecisionConsideration[] = between.map(
    (interaction, index) => ({
      stableKey: `${dueItem.stableKey}:consideration:${index}`,
      optionKey:
        interaction.change === "strengthened" ? "let-it-lie" : "raise-it",
      sourceType: "social:relationship",
      direction: "supports",
      importance: interaction.significance === "major" ? "strong" : "moderate",
      confidence: "medium",
      explanation: interaction.summary,
      sourceRefs: [
        { kind: "relationship-interaction", interactionId: interaction.id },
      ],
    }),
  );

  const evaluation = evaluateDecision(world, {
    stableKey: `${dueItem.stableKey}:raises-it`,
    decisionType: "life.raise-earlier-matter",
    actorPersonId: counterpartId,
    cutoff: {
      asOfDate: dueItem.dueAt,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: situationTag, entityId: null },
    options: [
      {
        key: "raise-it",
        label: "Bring it up",
        description: "Say something about what happened.",
      },
      {
        key: "let-it-lie",
        label: "Leave it",
        description: "Let it stay where it is.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return evaluation.selectedOptionKey !== "let-it-lie";
}
