import {
  addDays,
  compareSimulationMoments,
  daysBetween,
  simulationMinutesBetween,
} from "./dates";
import { evaluateDecision } from "./decisions";
import { scheduleFutureDueItem } from "./future-transitions";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { favorEntries } from "./life-favors";
import { currentLifeCutoff } from "./life-queries";
import { createMindProvenance, recordGoalState } from "./mind";
import { personName } from "./people";
import { CONTACT_LOCATION_KEY, contactProposals } from "./people-contact";
import { studyCollaborators, studyPeers } from "./people-study";
import { studyPlanSettled } from "./people-study-plan";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { recordClaim, recordEventKnowledge } from "./records";
import {
  advanceWorldMinutes,
  cancelScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import { recordWorldEvent } from "./world";
import type {
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  IsoDate,
  ScheduledActivityRecord,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";

/**
 * People keep living between the player's visits (MUSE-PEOPLE A).
 *
 * This module connects what the record already holds — shared experiences,
 * personal intentions (mind goal states), commitments, knowledge, memories and
 * traits — to what non-player people do next. It owns three things:
 *
 * 1. an NPC intention ledger, kept as ordinary mind goal states so every other
 *    reader (integrity, saves, Journal) already understands it;
 * 2. a commitment reader with real availability, so a reliable person can
 *    refuse a new request to honour an existing one and a proposed alternative
 *    is never recorded as mutual agreement;
 * 3. statement handling that keeps truth, knowledge, interpretation and exact
 *    words apart: a reminder can correct uncertainty through a real source, a
 *    sincere mistake is not a deliberate lie, and the explicit Lie route is
 *    untouched.
 *
 * Nothing here invents scoring weights: NPC answers go through the existing
 * decision evaluator with trait and shared-history considerations. Quiet and
 * no-action outcomes are valid results, and an NPC-to-NPC undertaking can
 * progress without the player ever being told.
 */

export const CONTINUING_LIFE_TAG = "continuing-life.v1";
export const CONTINUING_LIFE_TRANSITION_KEY = "people:continuing-life";
export const NPC_INTENTION_EVENT = "life.npc-intention-formed";
export const NPC_INTENTION_PROGRESS_EVENT = "life.npc-intention-progressed";
export const NPC_UNDERTAKING_EVENT = "life.npc-undertaking-progressed";

/** How far ahead an NPC looks when they take something on, in days. */
const INTENTION_HORIZON_DAYS = 30;
/** How often an unpursued intention is reconsidered, in days. */
const INTENTION_REVIEW_DAYS = 7;
/**
 * Days agreed shared work sits before its coming-due; the same value as the
 * follow-through family's own (a literal here to keep the import one-way).
 */
const SHARED_WORK_COMING_DUE_DAYS = 21;
/** A fixed Monday the weekly review counts from, so a week is a week. */
const REVIEW_WEEK_ORIGIN = "2000-01-03" as IsoDate;
/** How often an NPC-to-NPC undertaking moves without the player, in days. */
const UNDERTAKING_STEP_DAYS = 14;

/** What an NPC's intention can be about. Authored kinds, not free text. */
export const NPC_INTENTION_KINDS = [
  "follow-up",
  "keep-commitment",
  "reconnect",
  "repair",
  "introduce",
  "collaborate",
] as const;

export type NpcIntentionKind = (typeof NPC_INTENTION_KINDS)[number];

export function isNpcIntentionKind(value: string): value is NpcIntentionKind {
  return (NPC_INTENTION_KINDS as readonly string[]).includes(value);
}

export interface NpcIntentionInput {
  readonly npcId: EntityId;
  /** The player or other NPC this is aimed at, when it is aimed at anyone. */
  readonly targetPersonId: EntityId | null;
  readonly kind: NpcIntentionKind;
  /** What they mean to do, in plain words. */
  readonly objective: string;
  /** The shared experience this comes from, when there is one. */
  readonly sourceEventId: EntityId | null;
  readonly deadline: IsoDate | null;
}

export interface NpcIntention {
  readonly goalId: EntityId;
  readonly npcId: EntityId;
  readonly targetPersonId: EntityId | null;
  readonly kind: NpcIntentionKind;
  readonly objective: string;
  readonly status: string;
  readonly sourceEventId: EntityId | null;
  readonly deadline: IsoDate | null;
}

function intentionKindOf(goalKey: string): NpcIntentionKind | null {
  const kind = goalKey.split(":")[1];
  return kind && isNpcIntentionKind(kind) ? kind : null;
}

/**
 * Record that an NPC has taken something on.
 *
 * The intention is an ordinary mind goal state, so old saves simply have none
 * and every existing goal reader already understands the record. Asking is not
 * doing: the goal starts active, and only a later progress record says whether
 * it was kept, renegotiated or failed.
 */
export function recordNpcIntention(
  world: World,
  input: NpcIntentionInput,
): { world: World; goalId: EntityId } {
  const npc = world.people[input.npcId];
  if (!npc) throw new Error("An intention needs a person who has it.");
  if (input.targetPersonId !== null && !world.people[input.targetPersonId]) {
    throw new Error("An intention cannot aim at someone the world has not.");
  }
  if (input.sourceEventId !== null) {
    const source = world.history.events.find(
      (event) => event.id === input.sourceEventId,
    );
    if (!source) throw new Error("An intention cannot come from nothing.");
    if (
      !source.involvedEntityIds.includes(input.npcId) ||
      (input.targetPersonId !== null &&
        !source.involvedEntityIds.includes(input.targetPersonId))
    ) {
      throw new Error(
        "An intention's source must actually involve the people it names.",
      );
    }
  }
  if (!input.objective.trim()) throw new Error("An intention says what it is.");
  if (!isNpcIntentionKind(input.kind)) {
    throw new Error(`Not an intention anybody can hold: ${String(input.kind)}`);
  }
  const goalKey = `continuing:${input.kind}:${world.history.nextSequence}`;
  // How far ahead they look when they take something on: an intention without
  // a day attached is still owed, but it is owed within the month, not
  // forever. An explicit deadline is never moved.
  const deadline =
    input.deadline ?? addDays(world.currentDate, INTENTION_HORIZON_DAYS);
  let next = recordGoalState(world, {
    stableKey: `${CONTINUING_LIFE_TAG}:intention:${goalKey}`,
    personId: input.npcId,
    goalKey,
    recordedAt: world.currentDate,
    objective: input.objective,
    domain: "commitment",
    scope: "shared-life",
    priority: "moderate",
    status: "active",
    targetEntityId: input.targetPersonId,
    deadline,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note:
        input.sourceEventId === null
          ? "Taken on independently."
          : `Taken on after ${input.sourceEventId}.`,
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
  const record = next.history.goalStates.at(-1)!;
  next = recordWorldEvent(next, {
    stableKey: `${CONTINUING_LIFE_TAG}:intention:${goalKey}:noted`,
    type: NPC_INTENTION_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: npc.homeJurisdictionId,
    involvedEntityIds:
      input.targetPersonId === null
        ? [input.npcId]
        : [input.npcId, input.targetPersonId],
    participants: [
      {
        personId: input.npcId,
        role: "agency:actor",
        detail: input.objective,
      },
    ],
    personFactConstraints: [],
    // An intention is not yet news. Who learns of it learns it when the NPC
    // acts on it, not when they form it.
    visibility: "private",
    tags: [
      CONTINUING_LIFE_TAG,
      `continuing.kind:${input.kind}`,
      ...(input.sourceEventId === null
        ? []
        : [`continuing.source:${input.sourceEventId}`]),
    ],
    summary: `${personName(npc)} took on: ${input.objective}`,
    context: {
      location: null,
      socialContext: "Somebody deciding to do something.",
      pressure: null,
      choice: input.objective,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, goalId: record.goalId };
}

/** Every intention on record for an NPC, newest first. */
export function npcIntentions(
  world: World,
  npcId: EntityId,
): readonly NpcIntention[] {
  // One entry per intention: settling writes a new state for the same goal,
  // so only the latest state says what it is now. Kept, failed and
  // abandoned are different records underneath, not different flags.
  const latest = new Map<EntityId, (typeof world.history.goalStates)[number]>();
  for (const record of world.history.goalStates) {
    if (
      record.personId !== npcId ||
      record.domain !== "commitment" ||
      !record.goalKey.startsWith("continuing:")
    ) {
      continue;
    }
    latest.set(record.goalId, record);
  }
  // The source is carried on the event that noted the intention, so older
  // intentions recorded without one simply read as sourceless.
  const sources = new Map<string, EntityId>();
  for (const event of world.history.events) {
    if (event.type !== NPC_INTENTION_EVENT) continue;
    const source = event.tags.find((tag) =>
      tag.startsWith("continuing.source:"),
    );
    if (!source) continue;
    sources.set(
      event.stableKey,
      source.slice("continuing.source:".length) as EntityId,
    );
  }
  return [...latest.values()]
    .map((record) => ({
      goalId: record.goalId,
      npcId,
      targetPersonId: record.targetEntityId,
      kind: intentionKindOf(record.goalKey) ?? "follow-up",
      objective: record.objective,
      status: record.status,
      sourceEventId:
        sources.get(
          `${CONTINUING_LIFE_TAG}:intention:${record.goalKey}:noted`,
        ) ?? null,
      deadline: record.deadline,
    }))
    .reverse();
}

/** Move an intention to a terminal state. Kept, failed and abandoned differ. */
export function settleNpcIntention(
  world: World,
  npcId: EntityId,
  goalId: EntityId,
  status: "completed" | "failed" | "abandoned",
  outcome: string,
): World {
  const current = world.history.goalStates
    .filter((record) => record.goalId === goalId && record.personId === npcId)
    .at(-1);
  if (!current) throw new Error("That intention is not on record.");
  if (!outcome.trim())
    throw new Error("A settled intention says how it ended.");
  const npc = world.people[npcId];
  if (!npc) throw new Error("An intention needs a person who has it.");
  let next = recordGoalState(world, {
    stableKey: `${CONTINUING_LIFE_TAG}:intention:${goalId}:${status}:${world.history.nextSequence}`,
    personId: npcId,
    goalKey: current.goalKey,
    recordedAt: world.currentDate,
    objective: current.objective,
    domain: current.domain,
    scope: current.scope,
    priority: current.priority,
    status,
    targetEntityId: current.targetEntityId,
    deadline: current.deadline,
    outcome,
    provenance: createMindProvenance("authored", { note: outcome }),
    replacesGoalId: null,
    supersedesGoalStateId: current.id,
  });
  next = recordWorldEvent(next, {
    stableKey: `${CONTINUING_LIFE_TAG}:intention:${goalId}:${status}`,
    type: NPC_INTENTION_PROGRESS_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: npc.homeJurisdictionId,
    involvedEntityIds:
      current.targetEntityId === null
        ? [npcId]
        : [npcId, current.targetEntityId],
    participants: [{ personId: npcId, role: "agency:actor", detail: outcome }],
    personFactConstraints: [],
    visibility: "private",
    tags: [CONTINUING_LIFE_TAG, `continuing.outcome:${status}`],
    summary: `${personName(npc)}: ${outcome}`,
    context: {
      location: null,
      socialContext: "How something somebody took on actually ended.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return next;
}
/* -------------------------------------------------------------------------- */
/* Commitments: what is actually owed, and whether a day is actually free      */
/* -------------------------------------------------------------------------- */

export type OpenCommitmentKind =
  "favour-owed" | "favour-due" | "study-plan" | "meeting";

export interface OpenCommitment {
  readonly kind: OpenCommitmentKind;
  readonly counterpartPersonId: EntityId;
  readonly counterpartName: string;
  readonly task: string;
  /** The event that created it: request, collaboration or proposal. */
  readonly eventId: EntityId;
  readonly agreedOn: IsoDate;
}

/**
 * Everything this person has taken on and not yet finished, failed or
 * cancelled. Kept, declined, failed and renegotiated are different records and
 * read as different commitments here: only what is still owed is owed.
 */
export function openCommitments(
  world: World,
  personId: EntityId,
): readonly OpenCommitment[] {
  const found: OpenCommitment[] = [];
  for (const entry of favorEntries(world, personId)) {
    if (entry.status !== "agreed") continue;
    const mine = entry.request.participants.some(
      (participant) =>
        participant.personId === personId &&
        participant.role === "agency:asked",
    );
    found.push({
      kind: mine ? "favour-due" : "favour-owed",
      counterpartPersonId: entry.counterpartId,
      counterpartName: entry.name,
      task: entry.details.task,
      eventId: entry.request.id,
      agreedOn: entry.response?.occurredAt ?? entry.request.occurredAt,
    });
  }
  for (const peer of studyPeers(world, personId)) {
    if (!studyCollaborators(world, personId).includes(peer.personId)) continue;
    if (studyPlanSettled(world, personId, peer.personId)) continue;
    const collaboration = world.history.events.find(
      (event) =>
        event.tags.includes("study.v1") &&
        event.involvedEntityIds.includes(personId) &&
        event.involvedEntityIds.includes(peer.personId),
    );
    if (!collaboration) continue;
    found.push({
      kind: "study-plan",
      counterpartPersonId: peer.personId,
      counterpartName: peer.name,
      task: `Work out how to study together (${peer.programName})`,
      eventId: collaboration.id,
      agreedOn: collaboration.occurredAt,
    });
  }
  for (const proposal of contactProposals(world, personId)) {
    if (proposal.answered || proposal.activityId != null) continue;
    const other =
      proposal.fromPersonId === personId
        ? proposal.toPersonId
        : proposal.fromPersonId;
    if (!world.people[other]) continue;
    const event = world.history.events.find(
      (entry) => entry.id === proposal.eventId,
    );
    if (!event) continue;
    found.push({
      kind: "meeting",
      counterpartPersonId: other,
      counterpartName: personName(world.people[other]!),
      task: proposal.purpose,
      eventId: proposal.eventId,
      agreedOn: event.occurredAt,
    });
  }
  return found;
}

/**
 * Whether this person already has something standing on a day: a scheduled,
 * non-cancelled activity on their calendar.
 *
 * An invitation is not attendance, acceptance is not performance, and a
 * proposal is not confirmation, so only the activity's own state counts — and
 * only for the exact day asked about. An open favour with no date is real
 * load, not a calendar conflict; it weighs on the NPC's answer through
 * {@link openCommitmentLoad}, not here. Reading this never writes.
 */
export function commitmentConflict(
  world: World,
  personId: EntityId,
  on: IsoDate,
): boolean {
  for (const activity of world.history.scheduledActivities) {
    if (!activity.participantPersonIds.includes(personId)) continue;
    let state: { start: { date: IsoDate }; status: string };
    try {
      state = scheduledActivityState(world, activity.id);
    } catch {
      continue;
    }
    if (state.status === "cancelled") continue;
    if (state.start.date !== on) continue;
    return true;
  }
  return false;
}

/**
 * How much this person is already carrying: open commitments with nobody's
 * date on them are not a conflict, but they are a reason a reliable person
 * says they cannot take on more. Zero is uncommitted, not unwilling.
 */
export function openCommitmentLoad(world: World, personId: EntityId): number {
  return openCommitments(world, personId).length;
}
/* -------------------------------------------------------------------------- */
/* What an NPC does about an open thread, decided from their own position      */
/* -------------------------------------------------------------------------- */

export type NpcFollowUpOutcome =
  "reach-out" | "keep-quiet" | "let-drop" | "renegotiate" | "refuse-new";

export interface NpcFollowUpInput {
  readonly npcId: EntityId;
  readonly playerId: EntityId;
  /** The open commitment or new request being weighed, when there is one. */
  readonly commitmentEventId: EntityId | null;
  /** The day a new request would need, when one is on the table. */
  readonly neededOn: IsoDate | null;
  /**
   * What makes this a separate decision, when not the day itself: a weekly
   * review passes its week, so looking again the same week is the same look.
   */
  readonly decisionScope?: string;
}

/**
 * Whether this NPC reaches out, holds to what they already owe, quietly lets
 * something drop, asks to change it, or refuses something new to honour what
 * stands.
 *
 * Traits are contextual tendencies: reliability weighs heaviest where an open
 * commitment exists, sociability where nothing is owed, and a crowded calendar
 * or a heavy load changes the options without any new weight being invented.
 * A quiet person can still initiate something important: where the thread is a
 * commitment they made, keeping it speaks louder than sociability.
 */
export function decideNpcFollowUp(
  world: World,
  input: NpcFollowUpInput,
): { readonly outcome: NpcFollowUpOutcome; readonly world: World } {
  const npc = world.people[input.npcId];
  if (!npc) throw new Error("A follow-up needs the person doing it.");
  const withTraits = ensurePeopleTraits(world, [input.npcId]);
  const standing = openCommitments(withTraits, input.npcId);
  const load = standing.length;
  const conflict =
    input.neededOn !== null &&
    commitmentConflict(withTraits, input.npcId, input.neededOn);
  const owes = load > 0;
  // Reliability refuses something new only to honour what stands: with
  // nothing owed, a reliable person has nothing to hold against the ask.
  const reliabilityLeans: {
    optionKey: string;
    trait: "reliability";
    pole: "high";
    explanation: string;
  }[] = [
    {
      optionKey: "keep-quiet",
      trait: "reliability",
      pole: "high",
      explanation: "They follow through on things and expect the same.",
    },
    ...(owes
      ? [
          {
            optionKey: "refuse-new",
            trait: "reliability" as const,
            pole: "high" as const,
            explanation:
              "They would rather honour what they already owe than take on more.",
          },
        ]
      : []),
  ];
  const considerations: DecisionConsideration[] = [
    ...traitConsiderations(
      withTraits,
      input.npcId,
      `follow-up:${input.npcId}`,
      reliabilityLeans,
    ),
    ...traitConsiderations(
      withTraits,
      input.npcId,
      `follow-up:${input.npcId}`,
      [
        {
          optionKey: "reach-out",
          trait: "sociability",
          pole: "high",
          explanation: "They are the one who picks up the phone.",
        },
        {
          optionKey: "let-drop",
          trait: "sociability",
          pole: "low",
          explanation: "They wait to be called.",
        },
        {
          optionKey: "renegotiate",
          trait: "deliberation",
          pole: "high",
          explanation: "They want to know where it stands before carrying on.",
        },
        {
          optionKey: "renegotiate",
          trait: "conflict",
          pole: "low",
          explanation: "They would rather ask than argue about it.",
        },
      ],
    ),
    ...sharedHistoryConsiderations(
      withTraits,
      input.npcId,
      input.playerId,
      `follow-up:${input.npcId}`,
    ),
  ];
  if (conflict) {
    considerations.push({
      stableKey: `follow-up:${input.npcId}:calendar`,
      optionKey: "refuse-new",
      sourceType: "context:calendar",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: `They already have something standing on ${input.neededOn}.`,
      sourceRefs: [],
    });
  }
  if (owes && !conflict) {
    considerations.push({
      stableKey: `follow-up:${input.npcId}:load`,
      optionKey: "keep-quiet",
      sourceType: "social:commitment",
      direction: "supports",
      importance: load >= 3 ? "strong" : "moderate",
      confidence: "medium",
      explanation: `They still owe ${load === 1 ? "something" : `${load} things`} they agreed to.`,
      sourceRefs: standing.slice(0, 3).map((commitment) => ({
        kind: "historical-event" as const,
        eventId: commitment.eventId,
      })),
    });
  }
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `follow-up:${input.npcId}:${input.commitmentEventId ?? "open"}:${input.decisionScope ?? withTraits.currentDate}`,
    decisionType: "people.continuing-follow-up",
    actorPersonId: input.npcId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "open-thread", entityId: null },
    options: [
      {
        key: "reach-out",
        label: "Get in touch",
        description: "Raise it with the other person.",
      },
      {
        key: "keep-quiet",
        label: "Keep at it quietly",
        description: "Carry on without making it anyone else's business.",
      },
      {
        key: "let-drop",
        label: "Let it drop",
        description: "Leave it alone. A quiet outcome is still an outcome.",
      },
      {
        key: "renegotiate",
        label: "Ask to change it",
        description: "Ask whether the arrangement can move.",
      },
      {
        key: "refuse-new",
        label: "Turn the new thing down",
        description: "Honour what stands instead of taking on more.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  return {
    outcome: (evaluation.selectedOptionKey ??
      "keep-quiet") as NpcFollowUpOutcome,
    world: withTraits,
  };
}

/**
 * What actually passed between two people, as shared-history considerations
 * for an NPC weighing what to do. Strengthened history leans towards raising
 * it; harder history leans towards letting it lie. This reads the record, the
 * way the life-callback handler does — not a flag on anybody.
 */
export function sharedHistoryConsiderations(
  world: World,
  npcId: EntityId,
  otherId: EntityId,
  stableScope: string,
): DecisionConsideration[] {
  // Formed or strengthened ties lean towards raising it; strained or ended
  // ones towards letting it lie; a merely maintained tie leans neither way.
  return world.history.relationshipInteractions
    .filter(
      (interaction) =>
        interaction.personIds.includes(npcId) &&
        interaction.personIds.includes(otherId),
    )
    .slice(-6)
    .flatMap((interaction, index) => {
      if (interaction.change === "maintained") return [];
      return [{ interaction, index }];
    })
    .map(({ interaction, index }) => ({
      stableKey: `${stableScope}:shared-history:${index}`,
      optionKey:
        interaction.change === "formed" || interaction.change === "strengthened"
          ? "reach-out"
          : "let-drop",
      sourceType: "social:relationship",
      direction: "supports",
      importance: interaction.significance === "major" ? "strong" : "moderate",
      confidence: "medium",
      explanation: interaction.summary,
      sourceRefs: [
        { kind: "relationship-interaction", interactionId: interaction.id },
      ],
    }));
}

/* -------------------------------------------------------------------------- */
/* The boundary runner: follow-up happens when days pass, not when panels open */
/* -------------------------------------------------------------------------- */

/**
 * The decision scope for a boundary review: one look per thread per week,
 * however many times that week the days advance, so pacing comes from the
 * calendar rather than from how often the player presses on.
 */
export function reviewWeekScope(world: World, family: string): string {
  const week = Math.floor(
    daysBetween(REVIEW_WEEK_ORIGIN, world.currentDate) / INTENTION_REVIEW_DAYS,
  );
  return `${family}:week-${week}`;
}

/**
 * Give an NPC who is owed something by the player a chance to decide what to
 * do about it, at a legitimate clock boundary. Called when ordinary days
 * actually pass — never when a panel opens, never when a life is read.
 *
 * Only a concrete thread is reviewed: agreed shared work the player has not
 * done. An NPC with nothing owed has nothing to follow up here; their other
 * reasons to get in touch belong to the follow-through families, which carry
 * their own eligibility. Each thread is looked at once a week at most, and the
 * look is the same look however many times that week the days advance.
 *
 * Deciding to raise it is an intention the NPC holds privately — a mind goal
 * state naming the exact ask — which the ask's own coming-due later acts on
 * (people-social-followthrough). Keeping quiet or letting it drop writes
 * nothing at all; a quiet outcome is still an outcome.
 */
export function produceContinuingLife(
  inputWorld: World,
  playerPersonId: EntityId,
): World {
  let world = inputWorld;
  if (
    world.control.kind !== "person" ||
    world.control.personId !== playerPersonId
  ) {
    return world;
  }
  for (const thread of followUpThreads(world, playerPersonId)) {
    world = reviewNpcThread(world, playerPersonId, thread);
  }
  return world;
}

/**
 * Agreed shared work the player still owes, one per request. Bank favours keep
 * their own callbacks, so only the follow-through family's asks are read.
 */
export function followUpThreads(
  world: World,
  playerPersonId: EntityId,
): readonly OpenCommitment[] {
  const owedByPlayer = new Set(
    favorEntries(world, playerPersonId)
      .filter(
        (entry) =>
          entry.status === "agreed" &&
          !entry.outcome &&
          entry.request.tags.includes(
            "followthrough.family:shared-work-request",
          ) &&
          entry.request.participants.some(
            (participant) =>
              participant.personId === playerPersonId &&
              participant.role === "agency:asked",
          ),
      )
      .map((entry) => entry.request.id),
  );
  const threads: OpenCommitment[] = [];
  for (const id of [
    ...new Set(
      favorEntries(world, playerPersonId).map((entry) => entry.counterpartId),
    ),
  ].sort()) {
    if (!world.people[id]) continue;
    for (const commitment of openCommitments(world, id)) {
      if (
        commitment.counterpartPersonId === playerPersonId &&
        commitment.kind === "favour-owed" &&
        owedByPlayer.has(commitment.eventId)
      ) {
        threads.push({ ...commitment, counterpartPersonId: id });
      }
    }
  }
  return threads;
}

/** The NPC's still-active intention to follow up this exact thread, if any. */
export function activeFollowUpIntention(
  world: World,
  npcId: EntityId,
  threadEventId: EntityId,
): NpcIntention | null {
  return (
    npcIntentions(world, npcId).find(
      (intention) =>
        intention.status === "active" &&
        intention.kind === "follow-up" &&
        intention.sourceEventId === threadEventId,
    ) ?? null
  );
}

function reviewNpcThread(
  inputWorld: World,
  playerPersonId: EntityId,
  thread: OpenCommitment,
): World {
  // openCommitments was read from the NPC's side; counterpartPersonId was
  // rewritten to the NPC in followUpThreads.
  const npcId = thread.counterpartPersonId;
  const world = inputWorld;
  if (!isPersonAliveAt(world, npcId, currentLifeCutoff(world))) return world;
  // Only while it is sitting undone and not yet come due: at the coming-due
  // the ask's own callback acts, and after that this is not a thread to chase.
  if (
    daysBetween(thread.agreedOn, world.currentDate) >=
    SHARED_WORK_COMING_DUE_DAYS
  ) {
    return world;
  }
  if (activeFollowUpIntention(world, npcId, thread.eventId)) return world;
  if (
    npcIntentions(world, npcId).some(
      (intention) =>
        intention.kind === "follow-up" &&
        intention.sourceEventId === thread.eventId,
    )
  ) {
    // Already raised once and settled: the thread's history is its own.
    return world;
  }
  const { outcome, world: decided } = decideNpcFollowUp(world, {
    npcId,
    playerId: playerPersonId,
    commitmentEventId: thread.eventId,
    neededOn: null,
    decisionScope: reviewWeekScope(world, "shared-work"),
  });
  if (outcome !== "reach-out" && outcome !== "renegotiate") return decided;
  return recordNpcIntention(decided, {
    npcId,
    targetPersonId: playerPersonId,
    kind: "follow-up",
    objective:
      outcome === "renegotiate"
        ? `Ask where things stand with: ${thread.task}`
        : `Bring up the ${lowerFirstWord(thread.task)} that was agreed and not done`,
    sourceEventId: thread.eventId,
    deadline: null,
  }).world;
}

function lowerFirstWord(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
/* -------------------------------------------------------------------------- */
/* Agreed meetings: going is not the same as agreeing, and neither is calling  */
/* it off                                                                      */
/* -------------------------------------------------------------------------- */

export const MEETING_CALLED_OFF_EVENT = "life.meeting-called-off";

/**
 * A confirmed contact meeting between the player and someone else that is
 * still to happen, today. Reading this writes nothing.
 */
export function contactMeetingToday(
  world: World,
  playerId: EntityId,
): ScheduledActivityRecord | null {
  for (const activity of world.history.scheduledActivities) {
    if (
      activity.kind !== "confirmed" ||
      activity.location.locationKey !== CONTACT_LOCATION_KEY ||
      !activity.participantPersonIds.includes(playerId)
    ) {
      continue;
    }
    const state = scheduledActivityState(world, activity.id);
    if (state.status !== "scheduled") continue;
    if (state.start.date !== world.currentDate) continue;
    if (compareSimulationMoments(state.end, world.currentMoment) <= 0) continue;
    return activity;
  }
  return null;
}

/**
 * Go to an agreed meeting: the clock moves to its start and through its own
 * disclosed minutes, once, through the ordinary activity route. Only the
 * person carrying out their side can go; a meeting recorded before this
 * route existed names the asker instead, and can still be called off.
 */
export function attendContactMeeting(
  world: World,
  playerId: EntityId,
  activityId: EntityId,
  handlers: FutureTransitionHandlerRegistry,
): World {
  if (world.control.kind !== "person" || world.control.personId !== playerId) {
    throw new Error("Only the person being played can go to their meeting.");
  }
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  if (
    !activity ||
    activity.location.locationKey !== CONTACT_LOCATION_KEY ||
    !activity.participantPersonIds.includes(playerId)
  ) {
    throw new Error("That is not a meeting of yours.");
  }
  if (activity.responsiblePersonId !== playerId) return world;
  const state = scheduledActivityState(world, activityId);
  if (state.status !== "scheduled") return world;
  let next = world;
  if (compareSimulationMoments(next.currentMoment, state.start) < 0) {
    next = advanceWorldMinutes(
      next,
      simulationMinutesBetween(next.currentMoment, state.start),
      handlers,
    );
    if (compareSimulationMoments(next.currentMoment, state.start) < 0) {
      // Something earlier holds the clock; nothing is claimed.
      return world;
    }
  }
  return performScheduledActivity(next, activityId, handlers);
}

/**
 * Call an agreed meeting off. Nothing is broken silently: the other person is
 * told, in the player's words, and the evening is freed. Calling off is a
 * record of its own — not a decline of the original ask, and not a lie.
 */
export function callOffContactMeeting(
  world: World,
  playerId: EntityId,
  activityId: EntityId,
  statement: string,
): World {
  if (world.control.kind !== "person" || world.control.personId !== playerId) {
    throw new Error("Only the person being played can call off their meeting.");
  }
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  if (
    !activity ||
    activity.location.locationKey !== CONTACT_LOCATION_KEY ||
    !activity.participantPersonIds.includes(playerId)
  ) {
    throw new Error("That is not a meeting of yours.");
  }
  if (scheduledActivityState(world, activityId).status !== "scheduled") {
    return world;
  }
  if (!statement.trim()) throw new Error("Calling it off says something.");
  const otherId = activity.participantPersonIds.find((id) => id !== playerId);
  const other = otherId ? world.people[otherId] : undefined;
  if (!otherId || !other) throw new Error("A meeting needs someone to meet.");
  const player = world.people[playerId]!;
  const stableKey = `${CONTINUING_LIFE_TAG}:meeting:${activityId}:called-off`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: MEETING_CALLED_OFF_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: player.homeJurisdictionId,
    involvedEntityIds: [playerId, otherId, activityId],
    participants: [
      { personId: playerId, role: "agency:actor", detail: statement },
      {
        personId: otherId,
        role: "focus:respondent",
        detail: "Was told the meeting was off",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [CONTINUING_LIFE_TAG, `continuing.meeting:${activityId}`],
    summary: `${personName(player)} called off meeting ${personName(other)}.`,
    context: {
      location: null,
      socialContext: "Somebody calling off an agreed meeting.",
      pressure: null,
      choice: "Call off the meeting",
      motivation: null,
      immediateReaction: statement,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:told`,
    personId: otherId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: playerId, claimId: null },
  });
  return cancelScheduledActivity(next, activityId);
}

/* -------------------------------------------------------------------------- */
/* Statements: exact words, and what anybody knows because of them             */
/* -------------------------------------------------------------------------- */

export interface RecordNpcStatementInput {
  /** The scene, meeting or exchange event in which the words were said. */
  readonly hostEventId: EntityId;
  readonly speakerPersonId: EntityId;
  readonly listenerPersonIds: readonly EntityId[];
  /** The exact words, as the scene showed them. */
  readonly statement: string;
  /**
   * Whether the speaker believes what they say. A sincere mistake
   * (`believes-true` said from memory or in good faith) is not a deliberate
   * lie (`believes-false`): the contradiction machinery stays the owner of
   * lies, and nothing here writes a deceive stance.
   */
  readonly speakerBelief: "believes-true" | "uncertain";
}

/**
 * What somebody said, and — separately — what each listener now knows.
 *
 * Listeners learn the words, not the truth: their knowledge is recorded with
 * unknown accuracy and a told-by source naming the claim, exactly the way the
 * engine records the player's own claims. The statement, the belief behind it
 * and the truth of it are three records, not one.
 */
export function recordNpcStatement(
  world: World,
  input: RecordNpcStatementInput,
): { world: World; claimId: EntityId } {
  const speaker = world.people[input.speakerPersonId];
  if (!speaker) throw new Error("A statement needs its speaker.");
  const host = world.history.events.find(
    (event) => event.id === input.hostEventId,
  );
  if (!host) throw new Error("A statement is said somewhere real.");
  if (!host.involvedEntityIds.includes(input.speakerPersonId)) {
    throw new Error("The speaker was not there when this was said.");
  }
  if (!input.statement.trim()) throw new Error("A statement says something.");
  let next = recordClaim(world, {
    stableKey: `${CONTINUING_LIFE_TAG}:statement:${input.hostEventId}:${input.speakerPersonId}:${world.history.nextSequence}`,
    speakerPersonId: input.speakerPersonId,
    eventId: input.hostEventId,
    madeAt: world.currentDate,
    audience: input.listenerPersonIds.length > 2 ? "public" : "private",
    statement: input.statement,
    relationshipToTruth: "unknown",
    provenance: { kind: "direct-record" },
  });
  const claim = next.history.claims.at(-1)!;
  const name = personName(speaker);
  for (const listenerId of input.listenerPersonIds) {
    if (listenerId === input.speakerPersonId || !next.people[listenerId]) {
      continue;
    }
    next = recordEventKnowledge(next, {
      stableKey: `${CONTINUING_LIFE_TAG}:statement:${input.hostEventId}:${listenerId}:${world.history.nextSequence}`,
      personId: listenerId,
      eventId: input.hostEventId,
      learnedAt: next.currentDate,
      believedSummary: `${name} said: “${input.statement}”`,
      accuracy: "unknown",
      confidence: "high",
      source: {
        kind: "told-by",
        sourcePersonId: input.speakerPersonId,
        claimId: claim.id,
      },
    });
  }
  return { world: next, claimId: claim.id };
}

export interface CorrectMistakeInput {
  /** The person whose uncertainty is being corrected. */
  readonly personId: EntityId;
  /** The event their uncertain knowledge is about. */
  readonly eventId: EntityId;
  /** The real source that settles it: an event they saw or were shown. */
  readonly sourceEventId: EntityId;
  /** What is actually so, in plain words. */
  readonly correctedSummary: string;
  /** Who showed them, when they did not see it themselves. */
  readonly shownByPersonId: EntityId | null;
}

/**
 * Correct uncertainty through a real source.
 *
 * A reminder can fix a sincere mistake because the source is named and on
 * record: presence at the source event is direct knowledge, otherwise the
 * correction is told-by whoever showed them. Nothing here forgives anything —
 * there is no forgiveness meter to move — and nothing here touches a deliberate
 * lie, which belongs to the contradiction route.
 */
export function correctSincereMistake(
  world: World,
  input: CorrectMistakeInput,
): World {
  const person = world.people[input.personId];
  const source = world.history.events.find(
    (event) => event.id === input.sourceEventId,
  );
  if (!person || !source) {
    throw new Error("A correction needs the person and the real source.");
  }
  if (!input.correctedSummary.trim()) {
    throw new Error("A correction says what is actually so.");
  }
  const present = source.involvedEntityIds.includes(input.personId);
  if (!present && input.shownByPersonId === null) {
    throw new Error(
      "Somebody who was not there learns it from somebody who shows them.",
    );
  }
  if (input.shownByPersonId !== null && !world.people[input.shownByPersonId]) {
    throw new Error("A correction is shown by someone the world has.");
  }
  return recordEventKnowledge(world, {
    stableKey: `${CONTINUING_LIFE_TAG}:corrected:${input.eventId}:${input.personId}:${world.history.nextSequence}`,
    personId: input.personId,
    eventId: input.eventId,
    learnedAt: world.currentDate,
    believedSummary: input.correctedSummary,
    accuracy: "accurate",
    confidence: "high",
    source: present
      ? { kind: "direct" }
      : {
          kind: "told-by",
          sourcePersonId: input.shownByPersonId!,
          claimId: null,
        },
  });
}

/* -------------------------------------------------------------------------- */
/* NPC-to-NPC undertakings: a life that continues without the player           */
/* -------------------------------------------------------------------------- */

export interface RecordUndertakingInput {
  readonly firstPersonId: EntityId;
  readonly secondPersonId: EntityId;
  /** What the two of them are doing, in plain words. */
  readonly undertaking: string;
  /** Steps left before it is done. Small, or it would never finish. */
  readonly stepsTotal: number;
}

/**
 * Something two NPCs are doing together, which progresses without the player.
 *
 * Their activity is private: no knowledge is written for anyone outside the
 * two of them, and nothing is reported to the player. The player may hear of
 * it later only through an NPC who chooses to mention it, through the same
 * statement machinery as anything else anybody says.
 */
export function recordNpcUndertaking(
  world: World,
  input: RecordUndertakingInput,
): { world: World; undertakingKey: string } {
  const first = world.people[input.firstPersonId];
  const second = world.people[input.secondPersonId];
  if (!first || !second || input.firstPersonId === input.secondPersonId) {
    throw new Error("An undertaking needs two different real people.");
  }
  if (!input.undertaking.trim()) {
    throw new Error("An undertaking says what it is.");
  }
  if (!Number.isInteger(input.stepsTotal) || input.stepsTotal < 1) {
    throw new Error("An undertaking takes at least one step.");
  }
  const parties = [input.firstPersonId, input.secondPersonId].sort();
  const undertakingKey = `undertaking:${world.history.nextSequence}:${parties[0]}:${parties[1]}`;
  let next = recordWorldEvent(world, {
    stableKey: `${CONTINUING_LIFE_TAG}:${undertakingKey}:begun`,
    type: NPC_UNDERTAKING_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: first.homeJurisdictionId,
    involvedEntityIds: [input.firstPersonId, input.secondPersonId],
    participants: [
      {
        personId: input.firstPersonId,
        role: "agency:actor",
        detail: input.undertaking,
      },
      {
        personId: input.secondPersonId,
        role: "agency:actor",
        detail: input.undertaking,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      CONTINUING_LIFE_TAG,
      `continuing.undertaking:${undertakingKey}`,
      `continuing.steps-left:${input.stepsTotal}`,
    ],
    summary: `${personName(first)} and ${personName(second)}: ${input.undertaking}`,
    context: {
      location: null,
      socialContext: "Two people with plans of their own.",
      pressure: null,
      choice: input.undertaking,
      motivation: null,
      immediateReaction: null,
    },
  });
  next = scheduleFutureDueItem(next, {
    stableKey: `${CONTINUING_LIFE_TAG}:${undertakingKey}:step-1`,
    dueAt: addDays(next.currentDate, UNDERTAKING_STEP_DAYS),
    transitionKey: CONTINUING_LIFE_TRANSITION_KEY,
    entityIds: [...parties],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [] },
  });
  return { world: next, undertakingKey };
}

/**
 * Advance one NPC undertaking a step, or finish it. Runs at a clock boundary
 * through the future-transition registry — never because a panel opened.
 */
export function continuingLifeTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== CONTINUING_LIFE_TRANSITION_KEY) {
    throw new Error("The continuing-life handler received another transition.");
  }
  const [firstId, secondId] = dueItem.entityIds;
  const first = firstId ? world.people[firstId] : undefined;
  const second = secondId ? world.people[secondId] : undefined;
  if (!firstId || !first || !secondId || !second) {
    return {
      world,
      status: "blocked",
      reasonKey: "life:nobody-to-carry-it",
      context: "Diagnostic: an undertaking party is absent from the record.",
      outcomeEventId: null,
    };
  }
  const cutoff = currentLifeCutoff(world);
  if (
    !isPersonAliveAt(world, firstId, cutoff) ||
    !isPersonAliveAt(world, secondId, cutoff)
  ) {
    return {
      world,
      status: "cancelled",
      reasonKey: "life:actor-lost-standing",
      context: "Diagnostic: an undertaking party is no longer living.",
      outcomeEventId: null,
    };
  }
  // A review tick carries no undertaking key: nothing is owed, nothing ends.
  const undertakingKey = undertakingKeyOf(dueItem.stableKey);
  if (!undertakingKey) {
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "A quiet review passed with nothing to do.",
      outcomeEventId: null,
    };
  }
  const undertakingTag = `continuing.undertaking:${undertakingKey}`;
  const begun = world.history.events.find(
    (event) =>
      event.type === NPC_UNDERTAKING_EVENT &&
      event.tags.includes(undertakingTag),
  );
  if (!begun) {
    return {
      world,
      status: "blocked",
      reasonKey: "life:nobody-to-carry-it",
      context: "Diagnostic: an undertaking step names nothing on record.",
      outcomeEventId: null,
    };
  }
  const stepsDone = world.history.events.filter(
    (event) =>
      event.type === NPC_UNDERTAKING_EVENT &&
      event.tags.includes(undertakingTag) &&
      event.id !== begun.id,
  ).length;
  const totalTag = begun.tags.find((tag) =>
    tag.startsWith("continuing.steps-left:"),
  );
  const total = totalTag
    ? Number.parseInt(totalTag.slice("continuing.steps-left:".length), 10)
    : 1;
  const finished = stepsDone + 1 >= total;
  const stepKey = `${CONTINUING_LIFE_TAG}:${undertakingKey}:${finished ? "done" : `step-${stepsDone + 1}`}`;
  let next = recordWorldEvent(world, {
    stableKey: stepKey,
    type: NPC_UNDERTAKING_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: first.homeJurisdictionId,
    involvedEntityIds: [firstId, secondId],
    participants: [
      { personId: firstId, role: "agency:actor", detail: begun.summary },
      { personId: secondId, role: "agency:actor", detail: begun.summary },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [CONTINUING_LIFE_TAG, undertakingTag],
    summary: finished
      ? `${personName(first)} and ${personName(second)} finished: ${begun.summary}`
      : begun.summary,
    context: {
      location: null,
      socialContext: "Two people with plans of their own.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  if (!finished) {
    next = scheduleFutureDueItem(next, {
      stableKey: `${CONTINUING_LIFE_TAG}:${undertakingKey}:step-${stepsDone + 2}`,
      dueAt: addDays(next.currentDate, UNDERTAKING_STEP_DAYS),
      transitionKey: CONTINUING_LIFE_TRANSITION_KEY,
      entityIds: [firstId, secondId].sort(),
      jurisdictionId: null,
      provenance: { kind: "simulated", sourceEntityIds: [begun.id] },
    });
  }
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: finished
      ? "An NPC undertaking finished without the player."
      : "An NPC undertaking moved a step without the player.",
    outcomeEventId: next.history.events.at(-1)!.id,
  };
}

/**
 * The undertaking key carried inside a due-item stable key, or null for a
 * review tick. Stable keys read
 * `continuing-life.v1:undertaking:<sequence>:<first>:<second>:step-<n>`.
 */
export function undertakingKeyOf(stableKey: string): string | null {
  const prefix = `${CONTINUING_LIFE_TAG}:`;
  if (!stableKey.startsWith(prefix)) return null;
  const rest = stableKey.slice(prefix.length);
  if (!rest.startsWith("undertaking:")) return null;
  const stepIndex = rest.lastIndexOf(":step-");
  if (stepIndex === -1) return null;
  return rest.slice(0, stepIndex);
}

export const PEOPLE_CONTINUING_LIFE_HANDLERS: FutureTransitionHandlerRegistry =
  createFutureTransitionHandlerRegistry([
    [CONTINUING_LIFE_TRANSITION_KEY, continuingLifeTransitionHandler],
  ]);
