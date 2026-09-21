import {
  addDays,
  addSimulationMinutes,
  compareSimulationMoments,
  daysBetween,
} from "./dates";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "./future-transitions";
import { favorEntries, favorRequestTag } from "./life-favors";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "./life-queries";
import { lifeRequestDetailsTag } from "./life-request-details";
import { personName } from "./people";
import {
  CONTACT_DECLINED_EVENT,
  contactBases,
  contactProposals,
  openProposal,
  proposeContact,
  reachingOutPaced,
} from "./people-contact";
import { assessRelationshipContinuity } from "./relationship-integration";
import {
  activeFollowUpIntention,
  decideNpcFollowUp,
  openCommitments,
  reviewWeekScope,
  settleNpcIntention,
} from "./people-continuing-life";
import {
  STUDY_COLLABORATION_EVENT,
  STUDY_DECLINED_EVENT,
  recordStudyAnswer,
  studyCollaborators,
  studyPeers,
} from "./people-study";
import { PLAN_SETTLED_EVENT, studyPlanSettled } from "./people-study-plan";
import {
  REVISION_AGREED_EVENT,
  REVISION_ASKED_EVENT,
  agreedRevision,
  decidePromiseRenegotiation,
  recordPromiseRenegotiation,
  renegotiationAsked,
} from "./people-promise";
import {
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import {
  controlledCommitmentsBlockingMinuteAdvance,
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import { recordWorldEvent } from "./world";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "./types";
import { isPersonAliveAt } from "./vitality-integrity";

/**
 * What a shared past makes happen later (MUSE-PEOPLE B).
 *
 * Six materially different situation families, each with the same complete
 * shape: a producer-readable eligibility over real records, an NPC decision
 * through the existing evaluator, a persisted outcome in canonical events, and
 * a later callback through the future-transition registry that revalidates
 * before it acts. A filled vacancy, a changed enrollment or a finished favour
 * invalidates a stale offer without rewriting the earlier events.
 *
 * Where a route already exists it is reused, not duplicated: a study
 * follow-up ask is an ordinary favour-requested record, so the favour producer,
 * the bank scene, favour recall and favour performance all read it; a revised
 * arrangement goes through the promise module's own decision and record.
 * What is new here is the causal connection — the later thing happens because
 * of the earlier thing, for an actual reason the record can show.
 */

export const FOLLOWTHROUGH_TAG = "followthrough.v1";
export const FOLLOWTHROUGH_TRANSITION_KEY = "people:social-followthrough";

export const FOLLOWTHROUGH_FAMILIES = [
  "shared-work-request",
  "competing-commitment",
  "remembered-reconnect",
  "disagreement-repair",
  "consented-introduction",
  "continuing-collaboration",
] as const;

export type FollowThroughFamily = (typeof FOLLOWTHROUGH_FAMILIES)[number];

/** Days after a settled plan that a peer may come back with a later ask. */
const SHARED_WORK_FOLLOWUP_AFTER_DAYS = 14;
/** Days agreed shared work may sit undone before the asker may raise it. */
export const AGREED_WORK_COMING_DUE_DAYS = 21;
/** Days an unanswered follow-up waits before the asker reconsider. */
const FOLLOWUP_RECONSIDER_DAYS = 30;
/** How far back a refusal can still be repaired, in days. */
const REPAIR_WINDOW_DAYS = 45;
/** Days of settled study before a regular rhythm is proposed. */
const RECURRING_AFTER_DAYS = 21;
/** Days between recurring sessions. */
const RECURRING_SESSION_DAYS = 7;
/** Recurring sessions proposed before the rhythm is left to run itself. */
const RECURRING_SESSION_COUNT = 3;
/** Days after joining that an organizer checks back in. */

function alive(world: World, personId: EntityId): boolean {
  return (
    !!world.people[personId] &&
    isPersonAliveAt(world, personId, currentLifeCutoff(world))
  );
}

/**
 * Whether two people still share a recorded link: a household, kinship, an
 * employer or an organization. The same question the life-callback handler
 * asks before anything comes back, because the answer going stale is how a
 * stale offer is recognised.
 */
export function followThroughConnected(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): boolean {
  const cutoff = currentLifeCutoff(world);
  const myPrograms = new Set(
    studyPeers(world, personId).map(
      (peer) => `${peer.organizationId}:${peer.programName}`,
    ),
  );
  if (
    studyPeers(world, otherId).some((peer) =>
      myPrograms.has(`${peer.organizationId}:${peer.programName}`),
    )
  ) {
    return true;
  }
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
 * Whether this family has already been raised for this source, so once. The
 * source is whatever the family's key is — an event id, or a standing pair
 * like an introducer and a third person — because the tag only needs to name
 * it, never to resolve it.
 */
export function followThroughAsked(
  world: World,
  family: FollowThroughFamily,
  sourceEventId: string,
): boolean {
  return world.history.events.some(
    (event) =>
      event.tags.includes(`${FOLLOWTHROUGH_TAG}`) &&
      event.tags.includes(`followthrough.family:${family}`) &&
      event.tags.includes(`followthrough.source:${sourceEventId}`),
  );
}

interface ScheduleFollowThroughInput {
  readonly family: FollowThroughFamily;
  readonly personId: EntityId;
  readonly counterpartId: EntityId;
  readonly sourceEventId: EntityId;
  readonly dueInDays: number;
}

function scheduleFollowThrough(
  world: World,
  input: ScheduleFollowThroughInput,
): World {
  return scheduleFutureDueItem(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:family:${input.family}:${input.personId}:${input.counterpartId}:${input.sourceEventId}:${world.currentDate}`,
    dueAt: addDays(world.currentDate, input.dueInDays),
    transitionKey: FOLLOWTHROUGH_TRANSITION_KEY,
    entityIds: [
      input.personId,
      input.counterpartId,
      input.sourceEventId,
    ].sort(),
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [input.sourceEventId] },
  });
}

function familyOfDueItem(dueItem: FutureDueItem): FollowThroughFamily | null {
  const segment = dueItem.stableKey.split(":family:")[1]?.split(":")[0];
  return (FOLLOWTHROUGH_FAMILIES as readonly string[]).includes(segment ?? "")
    ? (segment as FollowThroughFamily)
    : null;
}

/**
 * Who a due item is about. Due-item entities are canonically sorted, so roles
 * never come from positions: the stable key names the player first and the
 * counterpart second, and entity ids never contain a colon.
 */
function partiesOfDueItem(
  dueItem: FutureDueItem,
): { readonly personId: EntityId; readonly counterpartId: EntityId } | null {
  const after = dueItem.stableKey.split(":family:")[1];
  if (!after) return null;
  for (const family of FOLLOWTHROUGH_FAMILIES) {
    if (!after.startsWith(`${family}:`)) continue;
    const rest = after.slice(family.length + 1).split(":");
    if (rest.length < 3 || !rest[0] || !rest[1]) return null;
    return {
      personId: rest[0] as EntityId,
      counterpartId: rest[1] as EntityId,
    };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Family 1 — shared study or work, then a later request                       */
/* -------------------------------------------------------------------------- */

export interface SharedWorkFollowUp {
  readonly peerId: EntityId;
  readonly peerName: string;
  readonly programName: string;
  readonly collaborationId: EntityId;
  readonly settledOn: IsoDate;
}

/**
 * Study peers whose collaboration settled a while ago and who still share the
 * program. The later request comes from the shared work, not from nowhere:
 * they studied together, the plan they settled on held, and now something has
 * come up that the player — who knows the work — is the natural person to ask.
 */
export function sharedWorkFollowUpCandidates(
  world: World,
  personId: EntityId,
): readonly SharedWorkFollowUp[] {
  if (!world.people[personId]) return [];
  const found: SharedWorkFollowUp[] = [];
  for (const peer of studyPeers(world, personId)) {
    if (!alive(world, peer.personId)) continue;
    if (!studyCollaborators(world, personId).includes(peer.personId)) continue;
    if (!studyPlanSettled(world, personId, peer.personId)) continue;
    const settled = world.history.events.find(
      (event) =>
        event.type === PLAN_SETTLED_EVENT &&
        event.involvedEntityIds.includes(personId) &&
        event.involvedEntityIds.includes(peer.personId),
    );
    if (!settled) continue;
    if (
      daysBetween(settled.occurredAt, world.currentDate) <
      SHARED_WORK_FOLLOWUP_AFTER_DAYS
    ) {
      continue;
    }
    const collaboration = world.history.events.find(
      (event) =>
        event.type === STUDY_COLLABORATION_EVENT &&
        event.involvedEntityIds.includes(personId) &&
        event.involvedEntityIds.includes(peer.personId),
    );
    if (!collaboration) continue;
    if (followThroughAsked(world, "shared-work-request", collaboration.id)) {
      continue;
    }
    found.push({
      peerId: peer.personId,
      peerName: peer.name,
      programName: peer.programName,
      collaborationId: collaboration.id,
      settledOn: settled.occurredAt,
    });
  }
  return found.sort((left, right) => left.peerId.localeCompare(right.peerId));
}

export interface RecordSharedWorkRequestInput {
  readonly playerId: EntityId;
  readonly peerId: EntityId;
  readonly collaborationId: EntityId;
  readonly programName: string;
}

/**
 * The peer asks the player for help with the shared work.
 *
 * The ask is an ordinary favour-requested record with authored terms, so
 * favour recall, favour entries and the Journal read it exactly like any
 * other ask. It is answered in its own scene rather than the bank's, because
 * the bank's answer writers name their own picnic proofreading; what makes
 * this family's is the source tag, naming the collaboration it follows from.
 */
export function recordSharedWorkRequest(
  world: World,
  input: RecordSharedWorkRequestInput,
): { world: World; requestId: EntityId } {
  const player = world.people[input.playerId];
  const peer = world.people[input.peerId];
  if (!player || !peer) throw new Error("A later request needs both people.");
  const collaboration = world.history.events.find(
    (event) => event.id === input.collaborationId,
  );
  if (!collaboration)
    throw new Error("A later request follows something real.");
  if (followThroughAsked(world, "shared-work-request", input.collaborationId)) {
    throw new Error("This shared work already produced its later request.");
  }
  const task = `go over the ${input.programName} notes together before the next session`;
  const opening =
    `Could you sit down with me and go over the ${input.programName} notes? ` +
    `I keep getting stuck on the same part, and you know how we worked through it.`;
  const stableKey = `${FOLLOWTHROUGH_TAG}:shared-work:${input.collaborationId}:${world.currentDate}`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: "life.favour-requested",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: player.homeJurisdictionId,
    involvedEntityIds: [input.playerId, input.peerId],
    participants: [
      {
        personId: input.peerId,
        role: "agency:asked",
        detail: `Asked for help with the ${input.programName} notes`,
      },
      {
        personId: input.playerId,
        role: "focus:asked-of",
        detail: "Was asked",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:shared-work-request",
      `followthrough.source:${input.collaborationId}`,
      lifeRequestDetailsTag({
        version: 1,
        task,
        opening,
        condition: "Notes only; no writing it for them",
        minutes: 45,
      }),
    ],
    summary: `${personName(peer)} asked for help going over the ${input.programName} notes.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const asking = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:knowledge`,
    personId: input.playerId,
    eventId: asking.id,
    learnedAt: next.currentDate,
    believedSummary: `${personName(peer)} asked them to ${task}, a 45-minute authored activity.`,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.peerId,
      claimId: null,
    },
  });
  return { world: next, requestId: asking.id };
}

/**
 * One eligible peer, at most, is given the chance to ask — at a clock
 * boundary, never because a panel opened. Whether they ask is theirs to
 * decide: a quiet peer with a settled collaboration behind them can still be
 * the one who picks up the phone.
 */
export function produceSharedWorkRequests(
  world: World,
  playerId: EntityId,
): World {
  const candidates = sharedWorkFollowUpCandidates(world, playerId);
  if (candidates.length === 0) return world;
  const candidate = candidates[0]!;
  const { outcome, world: decided } = decideNpcFollowUp(world, {
    npcId: candidate.peerId,
    playerId,
    commitmentEventId: candidate.collaborationId,
    neededOn: null,
    decisionScope: reviewWeekScope(world, "shared-work-request"),
  });
  if (outcome !== "reach-out") return decided;
  return recordSharedWorkRequest(decided, {
    playerId,
    peerId: candidate.peerId,
    collaborationId: candidate.collaborationId,
    programName: candidate.programName,
  }).world;
}
/* -------------------------------------------------------------------------- */
/* Family 1 answers and performance                                            */
/* -------------------------------------------------------------------------- */

export type SharedWorkAnswer = "agree" | "conditions" | "decline";

export interface AnswerSharedWorkRequestInput {
  readonly playerId: EntityId;
  readonly requestId: EntityId;
  readonly answer: SharedWorkAnswer;
  /** The exact words the peer said in answer, as the scene showed them. */
  readonly statement: string;
}

const FOLLOW_REQUEST = "followthrough.request:";

/**
 * Answer the peer's later request: take it on (with the limit they offered),
 * or turn it down. Kept and declined are different records; asking is always
 * on the record either way. An agreed ask schedules its own coming-due, so
 * the later consequence belongs to this family's callback, not the bank's.
 */
export function answerSharedWorkRequest(
  world: World,
  input: AnswerSharedWorkRequestInput,
): { world: World; responseId: EntityId } {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerId
  ) {
    throw new Error("This request was not asked of you.");
  }
  const entry = favorEntries(world, input.playerId).find(
    (candidate) => candidate.request.id === input.requestId,
  );
  if (!entry) throw new Error("The saved terms are unavailable.");
  if (
    !entry.request.tags.includes("followthrough.family:shared-work-request")
  ) {
    throw new Error("That ask belongs to another route.");
  }
  if (entry.response) return { world, responseId: entry.response.id };
  if (!input.statement.trim()) throw new Error("An answer says something.");
  const condition =
    input.answer === "conditions" ? entry.details.condition : null;
  let next = recordWorldEvent(world, {
    stableKey: `followthrough:shared-work:${input.requestId}:response`,
    type: "life.favour-response",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: entry.request.jurisdictionId,
    involvedEntityIds: [input.playerId, entry.counterpartId],
    participants: [
      {
        personId: input.playerId,
        role: "agency:actor",
        detail:
          input.answer === "decline"
            ? "Declined the request"
            : "Took the shared work on",
      },
      {
        personId: entry.counterpartId,
        role: "presence:participant",
        detail: "Heard the answer",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `${FOLLOW_REQUEST}${input.requestId}`,
      favorRequestTag(input.requestId),
      `origin-choice:${input.requestId}`,
      FOLLOWTHROUGH_TAG,
      "followthrough.family:shared-work-request",
      `followthrough.source:${input.requestId}`,
      `favour.${input.answer === "decline" ? "declined" : input.answer === "conditions" ? "conditions" : "agreed"}`,
    ],
    summary:
      input.answer === "decline"
        ? `You declined to ${entry.details.task} for ${entry.name}.`
        : `You agreed to ${entry.details.task} for ${entry.name}${condition ? `. Limit: ${condition}` : ""}. It has not been done.`,
    context: {
      ...entry.request.context,
      socialContext:
        "Two people who studied together, talking about what's next.",
      pressure: entry.details.task,
      choice:
        input.answer === "decline"
          ? "Decline"
          : condition
            ? `Agree: ${condition}`
            : "Agree to help",
      immediateReaction: input.statement,
    },
  });
  const response = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `followthrough:shared-work:${input.requestId}:told`,
    personId: entry.counterpartId,
    eventId: response.id,
    learnedAt: next.currentDate,
    believedSummary: response.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.playerId,
      claimId: null,
    },
  });
  next = scheduleFollowThrough(next, {
    family: "shared-work-request",
    personId: input.playerId,
    counterpartId: entry.counterpartId,
    sourceEventId: input.requestId,
    dueInDays:
      input.answer === "decline"
        ? FOLLOWUP_RECONSIDER_DAYS
        : AGREED_WORK_COMING_DUE_DAYS,
  });
  return { world: next, responseId: response.id };
}

/**
 * Carry out an agreed later request, in its own minutes, through the ordinary
 * activity route. What was done is the task on record — never a neighbouring
 * errand, and never something the record does not show.
 */
export function performSharedWorkRequest(
  world: World,
  playerId: EntityId,
  requestId: EntityId,
): World {
  if (world.control.kind !== "person" || world.control.personId !== playerId)
    throw new Error("This work is not yours to carry out.");
  const entry = favorEntries(world, playerId).find(
    (candidate) => candidate.request.id === requestId,
  );
  if (!entry) throw new Error("The saved terms are unavailable.");
  if (entry.outcome) return world;
  if (entry.status !== "agreed")
    throw new Error("Agree to the work before carrying it out.");
  if (entry.details.minutes === null)
    throw new Error("Agreed work without minutes cannot be scheduled.");
  if (
    controlledCommitmentsBlockingMinuteAdvance(world, entry.details.minutes)
      .length
  )
    return world;
  const end = addSimulationMinutes(world.currentMoment, entry.details.minutes);
  const handlers = createCampaignElectionTransitionRegistry();
  if (
    handlers.routine
      ?.projectWindows(world, end)
      .some(
        (slot) =>
          slot.kind === "work" &&
          compareSimulationMoments(slot.start, end) < 0 &&
          compareSimulationMoments(world.currentMoment, slot.end) < 0,
      )
  )
    return world;
  const key = `followthrough:shared-work:${requestId}:performance`;
  let candidate = createScheduledActivity(world, {
    stableKey: key,
    title: `Help ${entry.name} (${entry.details.task})`,
    summary: `${entry.details.task}${entry.details.condition ? `. Limit: ${entry.details.condition}` : ""}. No journey is needed.`,
    kind: "flexible",
    start: world.currentMoment,
    end,
    participantPersonIds: [playerId],
    responsiblePersonId: playerId,
    location: {
      locationKey: "followthrough:shared-work",
      label: "Study notes; no journey",
      jurisdictionId: null,
    },
    sourceEntityIds: [requestId, entry.response!.id],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [playerId] },
  });
  const activity = candidate.history.scheduledActivities.at(-1)!;
  candidate = performScheduledActivity(candidate, activity.id, handlers);
  if (scheduledActivityState(candidate, activity.id).status !== "completed")
    return world;
  const stableKey = `${key}:outcome`;
  let next = recordWorldEvent(candidate, {
    stableKey,
    type: "life.favour-performed",
    occurredAt: candidate.currentDate,
    recordedAt: candidate.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [playerId, entry.counterpartId, activity.id],
    participants: [
      {
        personId: playerId,
        role: "agency:actor",
        detail: `Did the shared work: ${entry.details.task}`,
      },
      {
        personId: entry.counterpartId,
        role: "coordination:counterpart",
        detail: "Received the help; not physical presence",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `${FOLLOW_REQUEST}${requestId}`,
      favorRequestTag(requestId),
      `activity:${activity.id}`,
      FOLLOWTHROUGH_TAG,
      "followthrough.family:shared-work-request",
    ],
    summary: `You ${entry.details.task} for ${entry.name}${entry.details.condition ? `. You kept the agreed limit: ${entry.details.condition}` : ""}.`,
    context: {
      location: null,
      socialContext: "Two people who studied together, following through.",
      pressure: entry.details.task,
      choice: "Carry out the agreed work",
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:knowledge`,
    personId: playerId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  next = recordMemory(next, {
    stableKey: `${stableKey}:memory`,
    personId: playerId,
    eventId: event.id,
    formedAt: next.currentDate,
    rememberedSummary: event.summary,
    interpretation: event.summary,
    strength: "moderate",
    relevanceTags: ["life.favour-performed"],
    supersedesMemoryId: null,
  });
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:peer-knowledge`,
    personId: entry.counterpartId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: playerId, claimId: null },
  });
  return recordRelationshipInteraction(next, {
    stableKey: `${stableKey}:interaction`,
    personIds: [playerId, entry.counterpartId],
    eventId: event.id,
    occurredAt: next.currentDate,
    kind: "support:followed-through",
    change: "strengthened",
    significance: "meaningful",
    summary: `${entry.name} received the help with the shared work that was promised.`,
    tags: [FOLLOWTHROUGH_TAG, "followthrough.family:shared-work-request"],
  });
}
/* -------------------------------------------------------------------------- */
/* Family 2 — renegotiating a real competing commitment                       */
/* -------------------------------------------------------------------------- */

export interface CompetingCommitmentCase {
  /** The agreed, unperformed favour that is now hard to keep. */
  readonly requestId: EntityId;
  readonly counterpartId: EntityId;
  readonly counterpartName: string;
  readonly task: string;
  /** What it collides with, in plain words. */
  readonly competing: string;
}

/**
 * Agreed favours that collide with something else the player owes: another
 * open commitment, or a scheduled day that is already spoken for. The promise
 * module owns the asking and the answer; what this family adds is the moment —
 * a real collision, not a change of heart — and what comes due afterwards.
 */
export function competingCommitmentCases(
  world: World,
  playerId: EntityId,
): readonly CompetingCommitmentCase[] {
  const open = openCommitments(world, playerId);
  const found: CompetingCommitmentCase[] = [];
  for (const entry of favorEntries(world, playerId)) {
    if (entry.status !== "agreed") continue;
    if (renegotiationAsked(world, entry.request.id)) continue;
    // Follow-through asks have their own coming-due through this family's
    // sibling callbacks; the bank performance writer names its own picnic.
    if (entry.request.tags.includes(FOLLOWTHROUGH_TAG)) continue;
    const competing = open.find(
      (commitment) => commitment.eventId !== entry.request.id,
    );
    let competingText: string | null = null;
    if (competing) {
      competingText =
        competing.kind === "meeting"
          ? `a meeting ${competing.counterpartName} is counting on`
          : competing.kind === "study-plan"
            ? `the study plan with ${competing.counterpartName}`
            : `the promise to ${competing.counterpartName} (${competing.task})`;
    } else {
      const activity = world.history.scheduledActivities.find((candidate) => {
        if (!candidate.participantPersonIds.includes(playerId)) return false;
        try {
          return (
            scheduledActivityState(world, candidate.id).status !== "cancelled"
          );
        } catch {
          return false;
        }
      });
      if (activity) competingText = "something already on the calendar";
    }
    if (!competingText) continue;
    found.push({
      requestId: entry.request.id,
      counterpartId: entry.counterpartId,
      counterpartName: entry.name,
      task: entry.details.task,
      competing: competingText,
    });
  }
  return found;
}

export interface RecordRevisionAskInput {
  readonly playerId: EntityId;
  readonly counterpartId: EntityId;
  readonly requestId: EntityId;
  readonly revisionId: string;
  /** The exact words the counterpart said in answer, as the scene showed. */
  readonly statement: string;
}

/**
 * Ask to change an agreed arrangement, and record what was actually decided.
 *
 * The counterpart's answer is decided before a word of it is chosen, through
 * the promise module: a reliable person holds the arrangement. Asking is not
 * breaking — the obligation stands unless they agree to move it — and a
 * revised arrangement schedules its own coming-due through this family's
 * callback, 21 days out.
 */
export function askRevisionForCompetingCommitment(
  world: World,
  input: RecordRevisionAskInput,
): { world: World; revised: boolean; outcome: string } {
  const decided = decidePromiseRenegotiation(world, {
    personId: input.playerId,
    counterpartPersonId: input.counterpartId,
    requestEventId: input.requestId,
    revisionId: input.revisionId,
  });
  const entry = favorEntries(decided.world, input.playerId).find(
    (candidate) => candidate.request.id === input.requestId,
  );
  if (!entry) throw new Error("The arrangement is no longer on record.");
  const recorded = recordPromiseRenegotiation(decided.world, {
    personId: input.playerId,
    counterpartPersonId: input.counterpartId,
    requestEventId: input.requestId,
    revisionId: input.revisionId,
    outcome: decided.outcome,
    task: entry.details.task,
    statement: input.statement,
  });
  let next = recorded.world;
  if (recorded.revised) {
    next = scheduleFollowThrough(next, {
      family: "competing-commitment",
      personId: input.playerId,
      counterpartId: input.counterpartId,
      sourceEventId: input.requestId,
      dueInDays: 21,
    });
  }
  return { world: next, revised: recorded.revised, outcome: decided.outcome };
}

/** The revision these two actually agreed for this arrangement, if any. */
export function competingRevisionAgreed(
  world: World,
  requestId: EntityId,
): string | null {
  return agreedRevision(world, requestId)?.id ?? null;
}

/* -------------------------------------------------------------------------- */
/* Family 3 — reconnecting over a specific remembered event                    */
/* -------------------------------------------------------------------------- */

export interface RememberedReconnect {
  readonly counterpartId: EntityId;
  readonly counterpartName: string;
  /** The actual shared moment this is about, in the record's own words. */
  readonly memorySummary: string;
  readonly memoryEventId: EntityId;
  readonly memoryOn: IsoDate;
  readonly lastContactOn: IsoDate;
}

/**
 * People the player has drifted from, where the record still holds something
 * specific they shared: a significant interaction with words attached, not a
 * generic long while. The NPC reaches out about that thing, which is what
 * makes it a reconnection rather than a cold call.
 */
export function rememberedReconnectCandidates(
  world: World,
  playerId: EntityId,
): readonly RememberedReconnect[] {
  if (!world.people[playerId]) return [];
  const counterpartIds = new Set<EntityId>();
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(playerId)) continue;
    for (const id of interaction.personIds) {
      if (id !== playerId && world.people[id]) counterpartIds.add(id);
    }
  }
  const found: RememberedReconnect[] = [];
  for (const counterpartId of [...counterpartIds].sort()) {
    if (openProposal(world, playerId, counterpartId)) continue;
    const remembered = rememberedTieWith(world, playerId, counterpartId);
    if (remembered) found.push(remembered);
  }
  return found;
}

/**
 * The specific shared moment behind a long gap with one person, if the
 * record holds one and it has not already brought them back together: the
 * most recent meaningful moment between them, with words attached. A
 * reconnection names what it remembers; "it's been a while" alone is not a
 * reason.
 */
export function rememberedTieWith(
  world: World,
  playerId: EntityId,
  counterpartId: EntityId,
): RememberedReconnect | null {
  if (!alive(world, counterpartId)) return null;
  const continuity = assessRelationshipContinuity(
    world,
    [playerId, counterpartId],
    currentLifeCutoff(world),
  );
  if (
    continuity.continuity !== "long-gap" &&
    continuity.continuity !== "reconnected"
  ) {
    return null;
  }
  if (!continuity.lastMeaningfulContactAt) return null;
  const memory = [...world.history.relationshipInteractions]
    .reverse()
    .find(
      (interaction) =>
        interaction.personIds.includes(playerId) &&
        interaction.personIds.includes(counterpartId) &&
        interaction.significance !== "minor" &&
        interaction.summary.trim().length > 0,
    );
  if (!memory) return null;
  const memoryEventId = memory.eventId ?? memory.id;
  if (followThroughAsked(world, "remembered-reconnect", memoryEventId)) {
    return null;
  }
  return {
    counterpartId,
    counterpartName: personName(world.people[counterpartId]!),
    memorySummary: memory.summary,
    memoryEventId,
    memoryOn: memory.occurredAt,
    lastContactOn: continuity.lastMeaningfulContactAt,
  };
}

export interface RecordRememberedReconnectInput {
  readonly playerId: EntityId;
  readonly counterpartId: EntityId;
  readonly memoryEventId: EntityId;
  readonly memorySummary: string;
  readonly on: IsoDate;
}

/**
 * The NPC reaches out about the specific thing they shared, asking to meet.
 * The proposal's purpose names the memory, so the meeting scene can say what
 * this is about; the memory itself stays exactly as the record holds it.
 */
export function recordRememberedReconnect(
  world: World,
  input: RecordRememberedReconnectInput,
): { world: World; proposalId: EntityId } {
  const player = world.people[input.playerId];
  const counterpart = world.people[input.counterpartId];
  if (!player || !counterpart) {
    throw new Error("A reconnection needs both people.");
  }
  if (followThroughAsked(world, "remembered-reconnect", input.memoryEventId)) {
    throw new Error("This memory already brought them back together.");
  }
  const moment = rememberedMoment(world, input.memoryEventId);
  const proposed = proposeContact(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:reconnect:${input.counterpartId}:${input.playerId}:${world.currentDate}`,
    fromPersonId: input.counterpartId,
    toPersonId: input.playerId,
    on: input.on,
    purpose: moment
      ? `Catch up after a long while, remembering ${moment.recorded}`
      : "Catch up, after a long while",
    answerInPerson: true,
  });
  return {
    world: markRememberedReconnect(proposed.world, {
      ...input,
      proposalEventId: proposed.proposal.eventId,
    }),
    proposalId: proposed.proposal.eventId,
  };
}

/**
 * Tie a proposal to meet to the moment it remembers: the scene can name the
 * memory, the memory brings them back once, and whether they actually met is
 * looked at after the day has passed.
 */
function markRememberedReconnect(
  world: World,
  input: RecordRememberedReconnectInput & {
    readonly proposalEventId: EntityId;
  },
): World {
  const counterpart = world.people[input.counterpartId]!;
  const moment = rememberedMoment(world, input.memoryEventId);
  const proposalEvent = world.history.events.find(
    (event) => event.id === input.proposalEventId,
  )!;
  let next = recordWorldEvent(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:reconnect:${input.memoryEventId}:marked`,
    type: "life.reconnect-raised",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: counterpart.homeJurisdictionId,
    involvedEntityIds: [input.playerId, input.counterpartId],
    participants: [
      {
        personId: input.counterpartId,
        role: "agency:actor",
        detail: `Reached out about: ${input.memorySummary}`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:remembered-reconnect",
      `followthrough.source:${input.memoryEventId}`,
      `followthrough.proposal:${proposalEvent.id}`,
    ],
    summary: moment
      ? `${personName(counterpart)} got back in touch, remembering ${moment.recorded}.`
      : `${personName(counterpart)} got back in touch after a long while.`,
    context: {
      location: null,
      socialContext: "Somebody getting back in touch over something specific.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  // The later callback: once the proposed day has passed, whether the two of
  // them actually met is what gets remembered — and only if they did.
  next = scheduleFollowThrough(next, {
    family: "remembered-reconnect",
    personId: input.playerId,
    counterpartId: input.counterpartId,
    sourceEventId: proposalEvent.id,
    dueInDays: Math.max(1, daysBetween(next.currentDate, input.on) + 1),
  });
  return next;
}

/**
 * An old contact who got in touch through the ordinary reaching-out route is
 * the same reconnection when the record holds a specific moment between
 * them: the family adopts that proposal — names the moment, and looks later
 * at whether they met — rather than making a second, competing call.
 */
export function adoptRememberedReachOuts(
  world: World,
  playerId: EntityId,
): World {
  let next = world;
  for (const proposal of contactProposals(next, playerId)) {
    if (proposal.answered || proposal.toPersonId !== playerId) continue;
    if (
      next.history.events.some(
        (event) =>
          event.type === "life.reconnect-raised" &&
          event.tags.includes(`followthrough.proposal:${proposal.eventId}`),
      )
    ) {
      continue;
    }
    const tie = rememberedTieWith(next, playerId, proposal.fromPersonId);
    if (!tie) continue;
    next = markRememberedReconnect(next, {
      playerId,
      counterpartId: proposal.fromPersonId,
      memoryEventId: tie.memoryEventId,
      memorySummary: tie.memorySummary,
      on: proposal.on,
      proposalEventId: proposal.eventId,
    });
  }
  return next;
}

/**
 * The remembered moment as words, read from the record's structure — the
 * authored choice behind a childhood acquaintance, or the task in shared work
 * — never by cutting up a summary sentence. `spoken` is the counterpart's own
 * way of saying it to the player; `recorded` is a neutral phrase for the
 * proposal and the Journal. Null when the record carries no such structure;
 * the scene then asks plainly and shows the memory as the player's own note.
 */
export interface RememberedMoment {
  readonly spoken: string;
  readonly recorded: string;
}

const NEIGHBORHOOD_MOMENTS: Readonly<Record<string, RememberedMoment>> = {
  ball: {
    spoken: "playing ball near home when we were kids",
    recorded: "playing ball near home as kids",
  },
  books: {
    spoken: "trading books back and forth when we were kids",
    recorded: "trading books as kids",
  },
  walks: {
    spoken: "those walks around the neighborhood when we were kids",
    recorded: "walks around the neighborhood as kids",
  },
};

export function rememberedMoment(
  world: World,
  memoryEventId: EntityId,
): RememberedMoment | null {
  const event = world.history.events.find(
    (entry) => entry.id === memoryEventId,
  );
  if (!event) return null;
  if (event.type === "life.neighborhood-acquaintance") {
    const key = event.stableKey.split(":event:neighbor:")[1];
    return (key && NEIGHBORHOOD_MOMENTS[key]) || null;
  }
  if (
    event.type === "life.favour-performed" &&
    event.tags.includes("followthrough.family:shared-work-request") &&
    event.context.pressure
  ) {
    return {
      spoken: "going over those notes together",
      recorded: "going over the notes together",
    };
  }
  if (event.type === STUDY_COLLABORATION_EVENT) {
    return {
      spoken: "working on the coursework together",
      recorded: "the coursework they worked on together",
    };
  }
  return null;
}

/**
 * One drifting counterpart, at most, may reach out — at a clock boundary,
 * within the ordinary reaching-out cadence. Reaching out is their decision,
 * looked at once a week, not a schedule.
 */
export function produceRememberedReconnects(
  world: World,
  playerId: EntityId,
): World {
  // The same cadence as any other reaching out after a long gap: nobody
  // calls on top of a recent call, and nobody keeps ringing unanswered.
  const candidate = rememberedReconnectCandidates(world, playerId).find(
    (entry) => reachingOutPaced(world, playerId, entry.counterpartId),
  );
  if (!candidate) return world;
  const { outcome, world: decided } = decideNpcFollowUp(world, {
    npcId: candidate.counterpartId,
    playerId,
    commitmentEventId: candidate.memoryEventId,
    neededOn: null,
    decisionScope: reviewWeekScope(world, "remembered-reconnect"),
  });
  if (outcome !== "reach-out") return decided;
  // Inside the contact module's own notice window (2–45 days): nine days out.
  return recordRememberedReconnect(decided, {
    playerId,
    counterpartId: candidate.counterpartId,
    memoryEventId: candidate.memoryEventId,
    memorySummary: candidate.memorySummary,
    on: addDays(decided.currentDate, 9),
  }).world;
}
/* -------------------------------------------------------------------------- */
/* Family 4 — disagreement, then attempted repair or continued refusal         */
/* -------------------------------------------------------------------------- */

export type RepairOfferKind = "collaborate-now" | "meet-now" | "revise-now";

export interface RepairCandidate {
  /** The NPC who refused. */
  readonly counterpartId: EntityId;
  readonly counterpartName: string;
  /** What they turned down, in the record's own words. */
  readonly refusedSummary: string;
  readonly refusalEventId: EntityId;
  readonly refusalOn: IsoDate;
  readonly offerKind: RepairOfferKind;
  /** What the NPC would now do, concretely. */
  readonly offerText: string;
}

/**
 * Times an NPC turned the player down — a study collaboration, a meeting, or
 * a asked-for revision they held the line on — recent enough to still matter,
 * with the two of them still connected and no repair attempted yet.
 *
 * Being turned down is not a grievance and costs the player nothing; this
 * reads refusals as disagreements that can be revisited, not as debts.
 */
export function repairCandidates(
  world: World,
  playerId: EntityId,
): readonly RepairCandidate[] {
  if (!world.people[playerId]) return [];
  const since = addDays(world.currentDate, -REPAIR_WINDOW_DAYS);
  const found: RepairCandidate[] = [];
  const consider = (candidate: RepairCandidate) => {
    if (candidate.refusalOn < since) return;
    if (!alive(world, candidate.counterpartId)) return;
    if (!followThroughConnected(world, playerId, candidate.counterpartId)) {
      return;
    }
    if (
      followThroughAsked(world, "disagreement-repair", candidate.refusalEventId)
    ) {
      return;
    }
    found.push(candidate);
  };
  for (const event of world.history.events) {
    if (event.type === STUDY_DECLINED_EVENT) {
      const refuser = event.participants.find(
        (entry) => entry.role === "agency:actor",
      )?.personId;
      const asker = event.participants.find(
        (entry) => entry.role === "focus:respondent",
      )?.personId;
      if (refuser === playerId || asker !== playerId || !refuser) continue;
      const peer = world.people[refuser];
      if (!peer) continue;
      consider({
        counterpartId: refuser,
        counterpartName: personName(peer),
        refusedSummary: "working together on coursework",
        refusalEventId: event.id,
        refusalOn: event.occurredAt,
        offerKind: "collaborate-now",
        offerText: "work together on the coursework after all",
      });
    } else if (event.type === CONTACT_DECLINED_EVENT) {
      const refuser = event.participants.find(
        (entry) => entry.role === "agency:actor",
      )?.personId;
      const asker = event.participants.find(
        (entry) => entry.role === "focus:asked-of",
      )?.personId;
      if (refuser === playerId || asker !== playerId || !refuser) continue;
      const other = world.people[refuser];
      if (!other) continue;
      consider({
        counterpartId: refuser,
        counterpartName: personName(other),
        refusedSummary: "meeting up",
        refusalEventId: event.id,
        refusalOn: event.occurredAt,
        offerKind: "meet-now",
        offerText: "meet up after all",
      });
    } else if (
      event.type === REVISION_ASKED_EVENT &&
      event.tags.includes("promise.outcome:holds-boundary")
    ) {
      const asker = event.participants.find(
        (entry) => entry.role === "agency:actor",
      )?.personId;
      const respondent = event.participants.find(
        (entry) => entry.role === "focus:respondent",
      )?.personId;
      if (asker !== playerId || !respondent || respondent === playerId)
        continue;
      const other = world.people[respondent];
      if (!other) continue;
      consider({
        counterpartId: respondent,
        counterpartName: personName(other),
        refusedSummary: "changing the arrangement",
        refusalEventId: event.id,
        refusalOn: event.occurredAt,
        offerKind: "revise-now",
        offerText: "revisit the arrangement after all",
      });
    }
  }
  return found.sort((left, right) =>
    left.counterpartId.localeCompare(right.counterpartId),
  );
}

export interface RecordRepairOfferInput {
  readonly playerId: EntityId;
  readonly counterpartId: EntityId;
  readonly refusalEventId: EntityId;
  readonly offerKind: RepairOfferKind;
  readonly refusedSummary: string;
  readonly offerText: string;
  /** The exact words they opened with, as the scene showed them. */
  readonly statement: string;
}

/**
 * The refuser reaches out to make amends, with a concrete offer — not a
 * vague apology. No forgiveness is recorded and none is asked: whether the
 * player accepts is a separate answer, and a continued refusal is persisted
 * as its own outcome rather than as a failed repair.
 */
export function recordRepairOffer(
  world: World,
  input: RecordRepairOfferInput,
): { world: World; offerId: EntityId } {
  const player = world.people[input.playerId];
  const counterpart = world.people[input.counterpartId];
  if (!player || !counterpart) {
    throw new Error("A repair needs both people.");
  }
  if (followThroughAsked(world, "disagreement-repair", input.refusalEventId)) {
    throw new Error("This disagreement already had its repair attempt.");
  }
  if (!input.statement.trim()) {
    throw new Error("A repair attempt says something.");
  }
  let next = recordWorldEvent(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:repair:${input.refusalEventId}`,
    type: "life.repair-offered",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: counterpart.homeJurisdictionId,
    involvedEntityIds: [input.playerId, input.counterpartId],
    participants: [
      {
        personId: input.counterpartId,
        role: "agency:actor",
        detail: input.statement,
      },
      {
        personId: input.playerId,
        role: "focus:respondent",
        detail: "Heard the repair attempt",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:disagreement-repair",
      `followthrough.source:${input.refusalEventId}`,
      `followthrough.offer:${input.offerKind}`,
    ],
    summary: `${personName(counterpart)} wants to ${input.offerText}, after turning down ${input.refusedSummary}.`,
    context: {
      location: null,
      socialContext: "Somebody trying to mend a refusal.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: input.statement,
    },
  });
  const offer = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:repair:${input.refusalEventId}:told`,
    personId: input.playerId,
    eventId: offer.id,
    learnedAt: next.currentDate,
    believedSummary: offer.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.counterpartId,
      claimId: null,
    },
  });
  return { world: next, offerId: offer.id };
}

export type RepairAnswer = "accept" | "decline";

export interface AnswerRepairOfferInput {
  readonly playerId: EntityId;
  readonly offerId: EntityId;
  readonly answer: RepairAnswer;
  /** The exact words said in answer, as the scene showed them. */
  readonly statement: string;
}

/**
 * Answer the repair attempt. Accepting carries out the concrete offer through
 * the machinery that owns it — a collaboration through the study record, a
 * meeting through a proposal, a revision through the promise record — and
 * schedules this family's later check. Declining persists the continued
 * refusal; the disagreement stands, and it is not raised again.
 */
export function answerRepairOffer(
  world: World,
  input: AnswerRepairOfferInput,
): { world: World; carriedOut: boolean } {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerId
  ) {
    throw new Error("This repair was not offered to you.");
  }
  const offer = world.history.events.find(
    (event) => event.id === input.offerId,
  );
  if (
    !offer ||
    offer.type !== "life.repair-offered" ||
    !offer.involvedEntityIds.includes(input.playerId)
  ) {
    throw new Error("That repair attempt is not on record.");
  }
  const counterpartId = offer.involvedEntityIds.find(
    (id) => id !== input.playerId,
  )!;
  const offerKind = offer.tags
    .find((tag) => tag.startsWith("followthrough.offer:"))
    ?.slice("followthrough.offer:".length);
  const already = world.history.events.some(
    (event) =>
      (event.type === "life.repair-accepted" ||
        event.type === "life.repair-declined") &&
      event.tags.includes(`followthrough.answer:${input.offerId}`),
  );
  if (already) return { world, carriedOut: false };
  if (!input.statement.trim()) throw new Error("An answer says something.");
  let next = world;
  let carriedOut = false;
  if (input.answer === "accept") {
    if (offerKind === "collaborate-now") {
      next = recordStudyAnswer(next, {
        personId: input.playerId,
        peerPersonId: counterpartId,
        outcome: "agrees",
        statement: input.statement,
      }).world;
      carriedOut = true;
    } else if (offerKind === "meet-now") {
      next = proposeContact(next, {
        stableKey: `${FOLLOWTHROUGH_TAG}:repair:${input.offerId}:meeting`,
        fromPersonId: counterpartId,
        toPersonId: input.playerId,
        on: addDays(next.currentDate, 9),
        purpose: "Meet up, to make up for turning it down before",
        answerInPerson: true,
      }).world;
      carriedOut = true;
    } else if (offerKind === "revise-now") {
      // The revision on offer is the one the player originally asked for: it
      // is read off the refusal record, never composed for the moment. The
      // refusal's key reads promise:<request>:<revision>:asked.
      const refusalId = offer.tags
        .find((tag) => tag.startsWith("followthrough.source:"))!
        .slice("followthrough.source:".length) as EntityId;
      const refusal = next.history.events.find(
        (event) => event.id === refusalId,
      );
      if (!refusal) throw new Error("The refused ask is no longer on record.");
      const { requestId, revisionId } = parseRefusedRevision(refusal.stableKey);
      const entry = favorEntries(next, input.playerId).find(
        (candidate) => candidate.request.id === requestId,
      );
      // The ask is already on record (it is the refusal); only the agreement
      // is new. Rewriting the ask would duplicate its stable key, and the
      // arrangement only changes when the other person actually agrees.
      next = recordRepairRevisionAgreed(next, {
        playerId: input.playerId,
        counterpartId,
        requestId,
        revisionId,
        task: entry?.details.task ?? "the arrangement",
        statement: input.statement,
      });
      carriedOut = true;
    }
    next = recordWorldEvent(next, {
      stableKey: `${FOLLOWTHROUGH_TAG}:repair:${input.offerId}:accepted`,
      type: "life.repair-accepted",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: next.people[input.playerId]!.homeJurisdictionId,
      involvedEntityIds: [input.playerId, counterpartId],
      participants: [
        {
          personId: input.playerId,
          role: "agency:actor",
          detail: input.statement,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FOLLOWTHROUGH_TAG,
        "followthrough.family:disagreement-repair",
        `followthrough.answer:${input.offerId}`,
      ],
      summary: `The repair attempt was accepted.`,
      context: {
        location: null,
        socialContext: "A refusal mended by agreement.",
        pressure: null,
        choice: "Accept the repair",
        motivation: null,
        immediateReaction: input.statement,
      },
    });
    next = scheduleFollowThrough(next, {
      family: "disagreement-repair",
      personId: input.playerId,
      counterpartId,
      sourceEventId: input.offerId,
      dueInDays: 14,
    });
  } else {
    next = recordWorldEvent(next, {
      stableKey: `${FOLLOWTHROUGH_TAG}:repair:${input.offerId}:declined`,
      type: "life.repair-declined",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: next.people[input.playerId]!.homeJurisdictionId,
      involvedEntityIds: [input.playerId, counterpartId],
      participants: [
        {
          personId: input.playerId,
          role: "agency:actor",
          detail: input.statement,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FOLLOWTHROUGH_TAG,
        "followthrough.family:disagreement-repair",
        `followthrough.answer:${input.offerId}`,
      ],
      summary: `The repair attempt was turned down; the refusal stands.`,
      context: {
        location: null,
        socialContext: "A refusal that stayed a refusal.",
        pressure: null,
        choice: "Decline the repair",
        motivation: null,
        immediateReaction: input.statement,
      },
    });
  }
  return { world: next, carriedOut };
}

/**
 * The refusal's key reads promise:<request>:<revision>:asked. The revision on
 * offer is matched against the authored revisions the promise module owns, so
 * a refusal never yields a third arrangement nobody asked for.
 */
export function parseRefusedRevision(stableKey: string): {
  readonly requestId: EntityId;
  readonly revisionId: string;
} {
  const withoutPrefix = stableKey.startsWith("promise:")
    ? stableKey.slice("promise:".length)
    : null;
  const withoutSuffix =
    withoutPrefix?.endsWith(":asked") !== true
      ? null
      : withoutPrefix!.slice(0, -":asked".length);
  if (withoutSuffix === null) throw new Error("That is not a refused ask.");
  for (const revisionId of ["more-time", "smaller-part"]) {
    if (withoutSuffix.endsWith(`:${revisionId}`)) {
      return {
        requestId: withoutSuffix.slice(0, -(revisionId.length + 1)) as EntityId,
        revisionId,
      };
    }
  }
  throw new Error("That refusal names no arrangement anybody can ask for.");
}

/**
 * Record that the counterpart granted, now, the revision the player asked
 * for before. Mirrors the agreement half of the promise module's record —
 * same tags, same knowledge — under a repair key, because the ask half is
 * already on record as the refusal and must not be written twice.
 */
function recordRepairRevisionAgreed(
  world: World,
  input: {
    readonly playerId: EntityId;
    readonly counterpartId: EntityId;
    readonly requestId: EntityId;
    readonly revisionId: string;
    readonly task: string;
    readonly statement: string;
  },
): World {
  const player = world.people[input.playerId];
  const counterpart = world.people[input.counterpartId];
  if (!player || !counterpart) {
    throw new Error("A revised arrangement needs both people.");
  }
  const stableKey = `promise:${input.requestId}:${input.revisionId}:agreed:repair`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: REVISION_AGREED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: player.homeJurisdictionId,
    involvedEntityIds: [input.playerId, input.counterpartId],
    participants: [
      {
        personId: input.counterpartId,
        role: "agency:actor",
        detail: input.statement,
      },
      {
        personId: input.playerId,
        role: "focus:respondent",
        detail: `Now owes the revised arrangement on ${input.task}`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "promise.v1",
      `promise.revised:${input.revisionId}`,
      FOLLOWTHROUGH_TAG,
      "followthrough.family:disagreement-repair",
    ],
    summary: `${personName(counterpart)} agreed to revisit the arrangement on ${input.task}.`,
    context: {
      location: null,
      socialContext:
        "An arrangement changed by agreement, the second time asked.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: input.statement,
    },
  });
  const agreedEvent = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${stableKey}:told`,
    personId: input.playerId,
    eventId: agreedEvent.id,
    learnedAt: next.currentDate,
    believedSummary: agreedEvent.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.counterpartId,
      claimId: null,
    },
  });
  return next;
}

/** Authored openings for a repair attempt, one per kind of offer. */
const REPAIR_OPENINGS: Readonly<Record<RepairOfferKind, string>> = {
  "collaborate-now":
    "I've been thinking about the coursework. I'd like to work on it together after all, if you still want to.",
  "meet-now":
    "I said no to meeting, and I've regretted it. Could we try again?",
  "revise-now":
    "About the arrangement — I've turned it over, and I'd like to revisit it.",
};

/**
 * One recent refusal, at most, may get its repair attempt — at a clock
 * boundary. Most refusals stay refused; attempting repair is a decision, and
 * the decision comes with its words already chosen: the offer is recorded
 * with one authored opening per kind of offer, never a placeholder.
 */
export function produceDisagreementRepairs(
  world: World,
  playerId: EntityId,
): World {
  const candidates = repairCandidates(world, playerId);
  if (candidates.length === 0) return world;
  const candidate = candidates[0]!;
  const { outcome, world: decided } = decideNpcFollowUp(world, {
    npcId: candidate.counterpartId,
    playerId,
    commitmentEventId: candidate.refusalEventId,
    neededOn: null,
    decisionScope: reviewWeekScope(world, "disagreement-repair"),
  });
  if (outcome !== "reach-out") return decided;
  return recordRepairOffer(decided, {
    playerId,
    counterpartId: candidate.counterpartId,
    refusalEventId: candidate.refusalEventId,
    offerKind: candidate.offerKind,
    refusedSummary: candidate.refusedSummary,
    offerText: candidate.offerText,
    statement: REPAIR_OPENINGS[candidate.offerKind],
  }).world;
}
/* -------------------------------------------------------------------------- */
/* Family 1 performance withdrawn                                             */
/* -------------------------------------------------------------------------- */

/**
 * Withdraw an agreed later request without doing it. Keeping, declining,
 * failing and renegotiating are different histories: withdrawing after
 * agreeing is failing to keep it, recorded as its own outcome rather than
 * folded into the decline that never happened.
 */
export function withdrawSharedWorkRequest(
  world: World,
  playerId: EntityId,
  requestId: EntityId,
): World {
  if (world.control.kind !== "person" || world.control.personId !== playerId)
    throw new Error("This work is not yours to withdraw.");
  const entry = favorEntries(world, playerId).find(
    (candidate) => candidate.request.id === requestId,
  );
  if (!entry || entry.status !== "agreed") return world;
  if (
    !entry.request.tags.includes("followthrough.family:shared-work-request")
  ) {
    throw new Error("That ask belongs to another route.");
  }
  return recordWorldEvent(world, {
    stableKey: `followthrough:shared-work:${requestId}:withdrawn`,
    type: "life.favour-cancelled",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [playerId, entry.counterpartId],
    participants: [
      {
        personId: playerId,
        role: "agency:actor",
        detail: `Withdrew the commitment: ${entry.details.task}`,
      },
      {
        personId: entry.counterpartId,
        role: "presence:participant",
        detail: "Heard it was withdrawn",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `${FOLLOW_REQUEST}${requestId}`,
      favorRequestTag(requestId),
      FOLLOWTHROUGH_TAG,
      "followthrough.family:shared-work-request",
    ],
    summary: `You withdrew your commitment to ${entry.details.task} for ${entry.name}.`,
    context: {
      location: null,
      socialContext: "Two people who studied together, and something undone.",
      pressure: entry.details.task,
      choice: "Withdraw the commitment",
      motivation: null,
      immediateReaction: null,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Family 5 — a consented introduction to an actual person                     */
/* -------------------------------------------------------------------------- */

export interface IntroductionCandidate {
  /** The mutual contact who would make the introduction. */
  readonly introducerId: EntityId;
  readonly introducerName: string;
  /** The actual person the player has never met. */
  readonly thirdId: EntityId;
  readonly thirdName: string;
  /** Why them, in concrete terms. */
  readonly reason: string;
}

/**
 * People a mutual contact could introduce the player to: someone the contact
 * actually knows, whom the player has no shared history with, where a real
 * shared context gives the meeting a reason — the same program, the same
 * workplace, the same group. An introduction is not hiring and not authority;
 * it is two strangers meeting because somebody they both trust suggested it.
 */
export function introductionCandidates(
  world: World,
  playerId: EntityId,
): readonly IntroductionCandidate[] {
  if (!world.people[playerId]) return [];
  const found: IntroductionCandidate[] = [];
  const knownToPlayer = new Set<EntityId>([playerId]);
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(playerId)) continue;
    for (const id of interaction.personIds) knownToPlayer.add(id);
  }
  for (const basis of contactBases(world, playerId)) {
    const introducerId = basis.personId;
    if (!alive(world, introducerId)) continue;
    for (const thirdBasis of contactBases(world, introducerId)) {
      const thirdId = thirdBasis.personId;
      if (knownToPlayer.has(thirdId) || !alive(world, thirdId)) continue;
      if (
        followThroughAsked(
          world,
          "consented-introduction",
          `${introducerId}:${thirdId}`,
        )
      ) {
        continue;
      }
      const reason = introductionReason(world, playerId, thirdId);
      if (!reason) continue;
      const third = world.people[thirdId]!;
      found.push({
        introducerId,
        introducerName: basis.name,
        thirdId,
        thirdName: personName(third),
        reason,
      });
    }
  }
  return found
    .sort(
      (left, right) =>
        left.introducerId.localeCompare(right.introducerId) ||
        left.thirdId.localeCompare(right.thirdId),
    )
    .slice(0, 12);
}

function introductionReason(
  world: World,
  playerId: EntityId,
  thirdId: EntityId,
): string | null {
  const playerPrograms = new Set(
    studyPeers(world, playerId).map((peer) => peer.programName),
  );
  const thirdPeer = studyPeers(world, thirdId).find((peer) =>
    playerPrograms.has(peer.programName),
  );
  if (thirdPeer) {
    return `they are in the same ${thirdPeer.programName} program`;
  }
  const cutoff = currentLifeCutoff(world);
  const myEmployers = new Map(
    activeWorkRelationshipsAt(world, playerId, cutoff).map((entry) => [
      entry.relationship.organizationId,
      entry,
    ]),
  );
  for (const entry of activeWorkRelationshipsAt(world, thirdId, cutoff)) {
    if (myEmployers.has(entry.relationship.organizationId)) {
      return "they work where you work";
    }
  }
  const myGroups = new Set(
    activeOrganizationParticipationsAt(world, playerId, cutoff).map(
      (entry) => entry.participation.organizationId,
    ),
  );
  for (const entry of activeOrganizationParticipationsAt(
    world,
    thirdId,
    cutoff,
  )) {
    if (myGroups.has(entry.participation.organizationId)) {
      return "they are in the same group as you";
    }
  }
  return null;
}

export interface RecordIntroductionOfferInput {
  readonly playerId: EntityId;
  readonly introducerId: EntityId;
  readonly thirdId: EntityId;
  readonly reason: string;
  /** The exact words the introducer opened with, as the scene showed them. */
  readonly statement: string;
}

/**
 * The introducer offers to bring two strangers together. The offer names a
 * real third person and a real reason; the introduction itself happens only
 * with two consents — the player's, and then the third person's.
 */
export function recordIntroductionOffer(
  world: World,
  input: RecordIntroductionOfferInput,
): { world: World; offerId: EntityId } {
  const player = world.people[input.playerId];
  const introducer = world.people[input.introducerId];
  const third = world.people[input.thirdId];
  if (!player || !introducer || !third) {
    throw new Error("An introduction needs three real people.");
  }
  const sourceKey = `${input.introducerId}:${input.thirdId}`;
  if (followThroughAsked(world, "consented-introduction", sourceKey)) {
    throw new Error("These two have already been introduced.");
  }
  if (!input.reason.trim() || !input.statement.trim()) {
    throw new Error("An introduction names its reason and says something.");
  }
  let next = recordWorldEvent(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:introduction:${sourceKey}:${world.currentDate}`,
    type: "life.introduction-offered",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: introducer.homeJurisdictionId,
    involvedEntityIds: [input.playerId, input.introducerId, input.thirdId],
    participants: [
      {
        personId: input.introducerId,
        role: "agency:actor",
        detail: input.statement,
      },
      {
        personId: input.playerId,
        role: "focus:respondent",
        detail: "Heard the offer",
      },
      {
        personId: input.thirdId,
        role: "other:named",
        detail: `Named as the person to meet, because ${input.reason}`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:consented-introduction",
      `followthrough.source:${sourceKey}`,
    ],
    summary: `${personName(introducer)} offered to introduce ${personName(third)}, because ${input.reason}.`,
    context: {
      location: null,
      socialContext: "Somebody offering to bring two strangers together.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: input.statement,
    },
  });
  const offer = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:introduction:${sourceKey}:told`,
    personId: input.playerId,
    eventId: offer.id,
    learnedAt: next.currentDate,
    believedSummary: offer.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.introducerId,
      claimId: null,
    },
  });
  return { world: next, offerId: offer.id };
}

export interface AnswerIntroductionOfferInput {
  readonly playerId: EntityId;
  readonly offerId: EntityId;
  readonly consent: boolean;
  /** The exact words said in answer, as the scene showed them. */
  readonly statement: string;
}

/**
 * Answer the offer. Consenting asks the third person — whose answer is
 * theirs to give, decided through their own circumstances — and only their
 * agreement makes the introduction. A recommendation is not authority, and a
 * declined introduction is persisted so it is never asked twice.
 */
export function answerIntroductionOffer(
  world: World,
  input: AnswerIntroductionOfferInput,
): { world: World; introduced: boolean } {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerId
  ) {
    throw new Error("This introduction was not offered to you.");
  }
  const offer = world.history.events.find(
    (event) => event.id === input.offerId,
  );
  if (
    !offer ||
    offer.type !== "life.introduction-offered" ||
    !offer.involvedEntityIds.includes(input.playerId)
  ) {
    throw new Error("That introduction offer is not on record.");
  }
  const already = world.history.events.some(
    (event) =>
      (event.type === "life.introduction-made" ||
        event.type === "life.introduction-declined" ||
        event.type === "life.introduction-offer-declined") &&
      event.tags.includes(`followthrough.answer:${input.offerId}`),
  );
  if (already) return { world, introduced: false };
  if (!input.statement.trim()) throw new Error("An answer says something.");
  const introducerId = offer.participants.find(
    (entry) => entry.role === "agency:actor",
  )!.personId;
  const thirdId = offer.participants.find(
    (entry) => entry.role === "other:named",
  )!.personId;
  const introducer = world.people[introducerId]!;
  const third = world.people[thirdId];
  if (!third || !alive(world, thirdId)) {
    throw new Error("The person to meet is no longer here to meet.");
  }
  let next = world;
  if (!input.consent) {
    next = recordWorldEvent(next, {
      stableKey: `${FOLLOWTHROUGH_TAG}:introduction:${input.offerId}:offer-declined`,
      type: "life.introduction-offer-declined",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: next.people[input.playerId]!.homeJurisdictionId,
      involvedEntityIds: [input.playerId, introducerId, thirdId],
      participants: [
        {
          personId: input.playerId,
          role: "agency:actor",
          detail: input.statement,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FOLLOWTHROUGH_TAG,
        "followthrough.family:consented-introduction",
        `followthrough.answer:${input.offerId}`,
      ],
      summary: `The introduction to ${personName(third)} was declined before it was made.`,
      context: {
        location: null,
        socialContext: "An introduction that never happened.",
        pressure: null,
        choice: "Decline the introduction",
        motivation: null,
        immediateReaction: input.statement,
      },
    });
    return { world: next, introduced: false };
  }
  // The player consented. Now the third person decides, from their own load
  // and calendar — not from the player's enthusiasm.
  const { outcome, world: decided } = decideNpcFollowUp(next, {
    npcId: thirdId,
    playerId: input.playerId,
    commitmentEventId: input.offerId,
    neededOn: null,
  });
  next = decided;
  if (outcome !== "reach-out") {
    next = recordWorldEvent(next, {
      stableKey: `${FOLLOWTHROUGH_TAG}:introduction:${input.offerId}:declined`,
      type: "life.introduction-declined",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: third.homeJurisdictionId,
      involvedEntityIds: [input.playerId, introducerId, thirdId],
      participants: [
        {
          personId: thirdId,
          role: "agency:actor",
          detail: "Would rather not meet someone new right now",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FOLLOWTHROUGH_TAG,
        "followthrough.family:consented-introduction",
        `followthrough.answer:${input.offerId}`,
      ],
      summary: `${personName(third)} would rather not meet someone new right now; the introduction stops here.`,
      context: {
        location: null,
        socialContext: "A stranger declining to become an acquaintance.",
        pressure: null,
        choice: input.statement,
        motivation: null,
        immediateReaction: null,
      },
    });
    return { world: next, introduced: false };
  }
  next = recordWorldEvent(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:introduction:${input.offerId}:made`,
    type: "life.introduction-made",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: introducer.homeJurisdictionId,
    involvedEntityIds: [input.playerId, introducerId, thirdId],
    participants: [
      {
        personId: introducerId,
        role: "agency:actor",
        detail: `Brought ${personName(third)} and the player together`,
      },
      {
        personId: thirdId,
        role: "focus:respondent",
        detail: "Agreed to meet",
      },
      {
        personId: input.playerId,
        role: "focus:respondent",
        detail: input.statement,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:consented-introduction",
      `followthrough.answer:${input.offerId}`,
    ],
    summary: `${personName(introducer)} introduced ${personName(third)}. They agreed to meet.`,
    context: {
      location: null,
      socialContext: "Two strangers meeting through somebody they both trust.",
      pressure: null,
      choice: input.statement,
      motivation: null,
      immediateReaction: null,
    },
  });
  const made = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:introduction:${input.offerId}:third-told`,
    personId: thirdId,
    eventId: made.id,
    learnedAt: next.currentDate,
    believedSummary: made.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: introducerId,
      claimId: null,
    },
  });
  next = scheduleFollowThrough(next, {
    family: "consented-introduction",
    personId: input.playerId,
    counterpartId: thirdId,
    sourceEventId: made.id,
    dueInDays: 7,
  });
  return { world: next, introduced: true };
}

/** Authored openings for an introduction offer. */
const INTRODUCTION_OPENINGS = [
  "There's somebody I think you should meet.",
  "I know someone you'd get on with. Can I introduce you?",
] as const;

/**
 * One introduction, at most, may be offered — at a clock boundary. Most
 * acquaintances stay unintroduced; offering is a decision.
 */
export function produceConsentedIntroductions(
  world: World,
  playerId: EntityId,
): World {
  const candidates = introductionCandidates(world, playerId);
  if (candidates.length === 0) return world;
  const candidate = candidates[0]!;
  const { outcome, world: decided } = decideNpcFollowUp(world, {
    npcId: candidate.introducerId,
    playerId,
    commitmentEventId: null,
    neededOn: null,
    decisionScope: reviewWeekScope(world, "consented-introduction"),
  });
  if (outcome !== "reach-out") return decided;
  return recordIntroductionOffer(decided, {
    playerId,
    introducerId: candidate.introducerId,
    thirdId: candidate.thirdId,
    reason: candidate.reason,
    statement: `${INTRODUCTION_OPENINGS[decided.history.nextSequence % INTRODUCTION_OPENINGS.length]} ${candidate.thirdName} — ${candidate.reason}.`,
  }).world;
}
/* -------------------------------------------------------------------------- */
/* Family 6 — continuing collaboration: a weekly study rhythm                  */
/* -------------------------------------------------------------------------- */

/**
 * Recruitment into a local party chapter after a meeting is already delivered
 * by the chapter module's own join-ask (party-invite scenes), so this family
 * does not duplicate it; what it adds is the recurring collaboration.
 */
export type CollaborationKind = "study-recurring";

export interface CollaborationCandidate {
  readonly kind: CollaborationKind;
  readonly counterpartId: EntityId;
  readonly counterpartName: string;
  /** What is proposed, concretely. */
  readonly proposal: string;
  readonly programName: string | null;
}

/**
 * Settled study partnerships that could become a regular rhythm. Sessions go
 * through the ordinary activity route, so a recurring collaboration is never
 * a second scheduler.
 */
export function collaborationCandidates(
  world: World,
  playerId: EntityId,
): readonly CollaborationCandidate[] {
  if (!world.people[playerId]) return [];
  const found: CollaborationCandidate[] = [];
  for (const peer of studyPeers(world, playerId)) {
    if (!alive(world, peer.personId)) continue;
    if (!studyCollaborators(world, playerId).includes(peer.personId)) continue;
    if (!studyPlanSettled(world, playerId, peer.personId)) continue;
    const settled = world.history.events.find(
      (event) =>
        event.type === PLAN_SETTLED_EVENT &&
        event.involvedEntityIds.includes(playerId) &&
        event.involvedEntityIds.includes(peer.personId),
    );
    if (!settled) continue;
    if (
      daysBetween(settled.occurredAt, world.currentDate) < RECURRING_AFTER_DAYS
    ) {
      continue;
    }
    const sourceKey = `study:${peer.personId}`;
    if (followThroughAsked(world, "continuing-collaboration", sourceKey)) {
      continue;
    }
    found.push({
      kind: "study-recurring",
      counterpartId: peer.personId,
      counterpartName: peer.name,
      proposal: `meet every week to go over the ${peer.programName} work`,
      programName: peer.programName,
    });
  }
  return found.sort(
    (left, right) =>
      left.counterpartId.localeCompare(right.counterpartId) ||
      left.kind.localeCompare(right.kind),
  );
}

export interface RecordCollaborationOfferInput {
  readonly playerId: EntityId;
  readonly counterpartId: EntityId;
  readonly kind: CollaborationKind;
  readonly proposal: string;
  readonly programName: string | null;
  /** The exact words they opened with, as the scene showed them. */
  readonly statement: string;
}

/**
 * Offer a continuing collaboration: a weekly rhythm for settled study
 * partners. The offer proposes; sessions happen only once it is accepted.
 */
export function recordCollaborationOffer(
  world: World,
  input: RecordCollaborationOfferInput,
): { world: World; offerId: EntityId } {
  const player = world.people[input.playerId];
  const counterpart = world.people[input.counterpartId];
  if (!player || !counterpart) {
    throw new Error("A collaboration needs both people.");
  }
  const sourceKey = `study:${input.counterpartId}`;
  if (followThroughAsked(world, "continuing-collaboration", sourceKey)) {
    throw new Error("This collaboration was already proposed.");
  }
  if (!input.proposal.trim() || !input.statement.trim()) {
    throw new Error("A collaboration proposal says what it is.");
  }
  let next = recordWorldEvent(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:collaboration:${sourceKey}:${world.currentDate}`,
    type: "life.collaboration-offered",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: counterpart.homeJurisdictionId,
    involvedEntityIds: [input.playerId, input.counterpartId],
    participants: [
      {
        personId: input.counterpartId,
        role: "agency:actor",
        detail: input.statement,
      },
      {
        personId: input.playerId,
        role: "focus:respondent",
        detail: "Heard the proposal",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:continuing-collaboration",
      `followthrough.source:${sourceKey}`,
      `followthrough.collaboration:${input.kind}`,
    ],
    summary: `${personName(counterpart)} proposed to ${input.proposal}.`,
    context: {
      location: null,
      socialContext: "Somebody proposing to keep working together.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: input.statement,
    },
  });
  const offer = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:collaboration:${sourceKey}:told`,
    personId: input.playerId,
    eventId: offer.id,
    learnedAt: next.currentDate,
    believedSummary: offer.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.counterpartId,
      claimId: null,
    },
  });
  return { world: next, offerId: offer.id };
}

export interface AnswerCollaborationOfferInput {
  readonly playerId: EntityId;
  readonly offerId: EntityId;
  readonly accept: boolean;
  /** The exact words said in answer, as the scene showed them. */
  readonly statement: string;
}

/**
 * Answer the proposal. Accepting a rhythm schedules its sessions; declining
 * persists, and the proposal is never made twice.
 */
export function answerCollaborationOffer(
  world: World,
  input: AnswerCollaborationOfferInput,
): { world: World; accepted: boolean } {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.playerId
  ) {
    throw new Error("This collaboration was not proposed to you.");
  }
  const offer = world.history.events.find(
    (event) => event.id === input.offerId,
  );
  if (
    !offer ||
    offer.type !== "life.collaboration-offered" ||
    !offer.involvedEntityIds.includes(input.playerId)
  ) {
    throw new Error("That collaboration proposal is not on record.");
  }
  const counterpartId = offer.involvedEntityIds.find(
    (id) => id !== input.playerId,
  )!;
  const kind = offer.tags
    .find((tag) => tag.startsWith("followthrough.collaboration:"))
    ?.slice("followthrough.collaboration:".length);
  const already = world.history.events.some(
    (event) =>
      (event.type === "life.collaboration-agreed" ||
        event.type === "life.collaboration-declined") &&
      event.tags.includes(`followthrough.answer:${input.offerId}`),
  );
  if (already) return { world, accepted: false };
  if (!input.statement.trim()) throw new Error("An answer says something.");
  let next = world;
  if (!input.accept) {
    next = recordWorldEvent(next, {
      stableKey: `${FOLLOWTHROUGH_TAG}:collaboration:${input.offerId}:declined`,
      type: "life.collaboration-declined",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: next.people[input.playerId]!.homeJurisdictionId,
      involvedEntityIds: [input.playerId, counterpartId],
      participants: [
        {
          personId: input.playerId,
          role: "agency:actor",
          detail: input.statement,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FOLLOWTHROUGH_TAG,
        "followthrough.family:continuing-collaboration",
        `followthrough.answer:${input.offerId}`,
      ],
      summary: `The proposal to keep working together was declined.`,
      context: {
        location: null,
        socialContext: "A rhythm that never started.",
        pressure: null,
        choice: "Decline the proposal",
        motivation: null,
        immediateReaction: input.statement,
      },
    });
    return { world: next, accepted: false };
  }
  next = recordWorldEvent(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:collaboration:${input.offerId}:agreed`,
    type: "life.collaboration-agreed",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: next.people[input.playerId]!.homeJurisdictionId,
    involvedEntityIds: [input.playerId, counterpartId],
    participants: [
      {
        personId: input.playerId,
        role: "agency:actor",
        detail: input.statement,
      },
      {
        personId: counterpartId,
        role: "presence:participant",
        detail: "Heard it accepted",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:continuing-collaboration",
      `followthrough.answer:${input.offerId}`,
      `followthrough.collaboration:${kind}`,
    ],
    summary: `Agreed to meet every week for the coursework.`,
    context: {
      location: null,
      socialContext: "Two people agreeing to keep at something together.",
      pressure: null,
      choice: input.statement,
      motivation: null,
      immediateReaction: null,
    },
  });
  const agreed = next.history.events.at(-1)!;
  next = scheduleFollowThrough(next, {
    family: "continuing-collaboration",
    personId: input.playerId,
    counterpartId,
    sourceEventId: agreed.id,
    dueInDays: RECURRING_SESSION_DAYS,
  });
  return { world: next, accepted: true };
}

/** Authored openings for a collaboration proposal. */
const COLLABORATION_OPENINGS: Readonly<Record<CollaborationKind, string>> = {
  "study-recurring":
    "The way we've been working suits me. Would you meet every week to keep at it?",
};

/**
 * One collaboration, at most, may be proposed — at a clock boundary. Most
 * settled partnerships rest; proposing a rhythm is a decision.
 */
export function produceContinuingCollaborations(
  world: World,
  playerId: EntityId,
): World {
  const candidates = collaborationCandidates(world, playerId);
  if (candidates.length === 0) return world;
  const candidate = candidates[0]!;
  const { outcome, world: decided } = decideNpcFollowUp(world, {
    npcId: candidate.counterpartId,
    playerId,
    commitmentEventId: null,
    neededOn: null,
    decisionScope: reviewWeekScope(world, "continuing-collaboration"),
  });
  if (outcome !== "reach-out") return decided;
  return recordCollaborationOffer(decided, {
    playerId,
    counterpartId: candidate.counterpartId,
    kind: candidate.kind,
    proposal: candidate.proposal,
    programName: candidate.programName,
    statement: COLLABORATION_OPENINGS[candidate.kind],
  }).world;
}

/* -------------------------------------------------------------------------- */
/* The boundary runner and the later callbacks                                 */
/* -------------------------------------------------------------------------- */

/**
 * Run all six families' boundary production, at most one new thing each, at a
 * legitimate clock boundary — never when a panel opens, never on a read.
 */
export function produceSocialFollowThrough(
  world: World,
  playerId: EntityId,
): World {
  let next = world;
  if (next.control.kind !== "person" || next.control.personId !== playerId) {
    return next;
  }
  next = produceSharedWorkRequests(next, playerId);
  next = produceRememberedReconnects(next, playerId);
  next = produceDisagreementRepairs(next, playerId);
  next = produceConsentedIntroductions(next, playerId);
  next = produceContinuingCollaborations(next, playerId);
  return next;
}

function blockedDue(
  world: World,
  reason: string,
): FutureTransitionHandlerResult {
  return {
    world,
    status: "blocked",
    reasonKey: "life:nobody-to-carry-it",
    context: `Diagnostic: ${reason}`,
    outcomeEventId: null,
  };
}

function quietDue(world: World): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context: "A follow-through came due with nothing left to do.",
    outcomeEventId: null,
  };
}

/**
 * What happens when a follow-through comes due. Every branch revalidates
 * before it acts: the dead, the departed and the finished all end quietly,
 * and a changed world never gets the old scene.
 */
export function socialFollowThroughTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== FOLLOWTHROUGH_TRANSITION_KEY) {
    throw new Error("The follow-through handler received another transition.");
  }
  const family = familyOfDueItem(dueItem);
  const parties = partiesOfDueItem(dueItem);
  if (!family || !parties) return quietDue(world);
  const firstId = parties.personId;
  const secondId = parties.counterpartId;
  const person = world.people[firstId];
  const counterpart = world.people[secondId];
  if (!person || !counterpart) {
    return blockedDue(
      world,
      "a follow-through party is absent from the record.",
    );
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
      context: "Diagnostic: a follow-through party is no longer living.",
      outcomeEventId: null,
    };
  }
  switch (family) {
    case "shared-work-request":
      return handleSharedWorkDue(world, dueItem, firstId, secondId);
    case "competing-commitment":
      return handlePromiseDue(world, dueItem, firstId, secondId);
    case "remembered-reconnect":
      return handleReconnectDue(world, dueItem, firstId, secondId);
    case "disagreement-repair":
      return handleRepairDue(world, dueItem, firstId, secondId);
    case "consented-introduction":
      return handleIntroductionDue(world, dueItem, firstId, secondId);
    case "continuing-collaboration":
      return handleCollaborationDue(world, dueItem, firstId, secondId);
  }
}

function sourceOf(dueItem: FutureDueItem): EntityId | null {
  if (dueItem.provenance.kind !== "simulated") return null;
  return dueItem.provenance.sourceEntityIds[0] ?? null;
}

function handleSharedWorkDue(
  world: World,
  dueItem: FutureDueItem,
  playerId: EntityId,
  peerId: EntityId,
): FutureTransitionHandlerResult {
  const requestId = sourceOf(dueItem);
  if (!requestId) return quietDue(world);
  const entry = favorEntries(world, playerId).find(
    (candidate) => candidate.request.id === requestId,
  );
  // Performed, withdrawn or declined: the history is complete either way.
  if (!entry || entry.outcome || entry.status !== "agreed") {
    return quietDue(world);
  }
  if (!followThroughConnected(world, playerId, peerId)) {
    return {
      world,
      status: "cancelled",
      reasonKey: "life:attention-moved",
      context: "Diagnostic: the two no longer share a recorded link.",
      outcomeEventId: null,
    };
  }
  // Whether they raise it is the peer's own decision: an intention they
  // formed while it sat undone, or — where they had not decided yet — what
  // they decide now, from their own traits, load and history with the player.
  const intention = activeFollowUpIntention(world, peerId, requestId);
  let deciding = world;
  if (!intention) {
    const { outcome, world: decided } = decideNpcFollowUp(world, {
      npcId: peerId,
      playerId,
      commitmentEventId: requestId,
      neededOn: null,
      decisionScope: "coming-due",
    });
    if (outcome !== "reach-out" && outcome !== "renegotiate") {
      return {
        world: decided,
        status: "resolved",
        reasonKey: null,
        context: "The peer let the undone work lie; nothing was raised.",
        outcomeEventId: null,
      };
    }
    deciding = decided;
  }
  const raised = recordWorldEvent(deciding, {
    stableKey: `${FOLLOWTHROUGH_TAG}:shared-work:${requestId}:raised`,
    type: "life.followthrough-raised",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[peerId]!.homeJurisdictionId,
    involvedEntityIds: [playerId, peerId],
    participants: [
      {
        personId: peerId,
        role: "agency:actor",
        detail: `Raised the unperformed work: ${entry.details.task}`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:shared-work-request",
      `followthrough.source:${requestId}`,
      "followthrough.raised:agreed-unperformed",
    ],
    summary: `${personName(world.people[peerId]!)} raised the work that was agreed and not done.`,
    context: {
      location: null,
      socialContext: "Somebody following up on what was promised.",
      pressure: entry.details.task,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const raisedEventId = raised.history.events.at(-1)!.id;
  const settled = intention
    ? settleNpcIntention(
        raised,
        peerId,
        intention.goalId,
        "completed",
        "Brought up the agreed work that had not been done.",
      )
    : raised;
  return {
    world: settled,
    status: "resolved",
    reasonKey: null,
    context: "An agreed, unperformed ask was raised again.",
    outcomeEventId: raisedEventId,
  };
}

function handlePromiseDue(
  world: World,
  dueItem: FutureDueItem,
  playerId: EntityId,
  counterpartId: EntityId,
): FutureTransitionHandlerResult {
  const requestId = sourceOf(dueItem);
  if (!requestId) return quietDue(world);
  const entry = favorEntries(world, playerId).find(
    (candidate) => candidate.request.id === requestId,
  );
  // Done, withdrawn, or never agreed: a changed world gets no old scene.
  if (!entry || entry.outcome || entry.status !== "agreed") {
    return quietDue(world);
  }
  const revision = agreedRevision(world, requestId);
  if (!revision) return quietDue(world);
  const cameDue = recordWorldEvent(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:promise-due:${requestId}:${world.currentDate}`,
    type: "life.promise-comes-due",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[playerId]!.homeJurisdictionId,
    involvedEntityIds: [playerId, counterpartId],
    participants: [
      {
        personId: counterpartId,
        role: "agency:actor",
        detail: `The revised arrangement: ${revision.meaning}`,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:competing-commitment",
      `followthrough.source:${requestId}`,
    ],
    summary: `The revised arrangement on ${entry.details.task} came due.`,
    context: {
      location: null,
      socialContext: "A changed arrangement coming round.",
      pressure: entry.details.task,
      choice: null,
      motivation: revision.meaning,
      immediateReaction: null,
    },
  });
  return {
    world: cameDue,
    status: "resolved",
    reasonKey: null,
    context: "A revised arrangement came due.",
    outcomeEventId: cameDue.history.events.at(-1)!.id,
  };
}

function handleReconnectDue(
  world: World,
  dueItem: FutureDueItem,
  playerId: EntityId,
  counterpartId: EntityId,
): FutureTransitionHandlerResult {
  const proposalId = sourceOf(dueItem);
  const marked = proposalId
    ? world.history.events.find(
        (event) =>
          event.type === "life.reconnect-raised" &&
          event.tags.includes(`followthrough.proposal:${proposalId}`),
      )
    : undefined;
  if (!proposalId || !marked) return quietDue(world);
  const meeting = world.history.scheduledActivities.find((activity) =>
    activity.sourceEntityIds.includes(proposalId),
  );
  // Declined, unanswered or lapsed: an ordinary outcome, and nothing more.
  if (!meeting) return quietDue(world);
  let state: ReturnType<typeof scheduledActivityState>;
  try {
    state = scheduledActivityState(world, meeting.id);
  } catch {
    return quietDue(world);
  }
  if (state.status === "scheduled" && state.end.date >= world.currentDate) {
    // Moved to another day: look again the day after it, once it has passed.
    return {
      world: scheduleFollowThrough(world, {
        family: "remembered-reconnect",
        personId: playerId,
        counterpartId,
        sourceEventId: proposalId,
        dueInDays: daysBetween(world.currentDate, state.end.date) + 1,
      }),
      status: "resolved",
      reasonKey: null,
      context: "The reconnection meeting has not happened yet.",
      outcomeEventId: null,
    };
  }
  // Only a meeting that actually happened strengthens anything. A declined
  // invitation is ordinary, and nothing is recorded for it.
  if (state.status !== "completed") return quietDue(world);
  const summary = `${personName(world.people[playerId]!)} and ${personName(world.people[counterpartId]!)} met again after a long while.`;
  let next = recordWorldEvent(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:reconnect:${proposalId}:met`,
    type: "life.reconnect-completed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[playerId]!.homeJurisdictionId,
    involvedEntityIds: [playerId, counterpartId, meeting.id],
    participants: [
      {
        personId: playerId,
        role: "agency:actor",
        detail: "Came to the meeting",
      },
      {
        personId: counterpartId,
        role: "agency:actor",
        detail: "Came to the meeting",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:remembered-reconnect",
      `followthrough.source:${proposalId}`,
    ],
    summary,
    context: {
      location: null,
      socialContext: "Two people meeting again after drifting apart.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:reconnect:${proposalId}:knowledge`,
    personId: playerId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  next = recordMemory(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:reconnect:${proposalId}:memory`,
    personId: playerId,
    eventId: event.id,
    formedAt: next.currentDate,
    rememberedSummary: summary,
    interpretation: summary,
    strength: "moderate",
    relevanceTags: ["life.reconnect-completed"],
    supersedesMemoryId: null,
  });
  next = recordRelationshipInteraction(next, {
    stableKey: `${FOLLOWTHROUGH_TAG}:reconnect:${proposalId}:interaction`,
    personIds: [playerId, counterpartId],
    eventId: event.id,
    occurredAt: next.currentDate,
    kind: "contact:reconnected",
    change: "strengthened",
    significance: "meaningful",
    summary,
    tags: [FOLLOWTHROUGH_TAG, "followthrough.family:remembered-reconnect"],
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "A reconnection that actually happened was recorded.",
    outcomeEventId: event.id,
  };
}

function handleRepairDue(
  world: World,
  dueItem: FutureDueItem,
  playerId: EntityId,
  counterpartId: EntityId,
): FutureTransitionHandlerResult {
  const offerId = sourceOf(dueItem);
  if (!offerId) return quietDue(world);
  const accepted = world.history.events.some(
    (event) =>
      event.type === "life.repair-accepted" &&
      event.tags.includes(`followthrough.answer:${offerId}`),
  );
  // Declined or unanswered: the refusal stands, and nothing is added to it.
  if (!accepted) return quietDue(world);
  const offer = world.history.events.find((event) => event.id === offerId);
  const summary = `${personName(world.people[counterpartId]!)} made amends, and it held.`;
  const next = recordRelationshipInteraction(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:repair:${offerId}:amends`,
    personIds: [playerId, counterpartId],
    eventId: offer?.id ?? null,
    occurredAt: world.currentDate,
    kind: "support:made-amends",
    change: "strengthened",
    significance: "meaningful",
    summary,
    tags: [FOLLOWTHROUGH_TAG, "followthrough.family:disagreement-repair"],
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "A repair that held was recorded.",
    outcomeEventId: null,
  };
}

function handleIntroductionDue(
  world: World,
  dueItem: FutureDueItem,
  playerId: EntityId,
  thirdId: EntityId,
): FutureTransitionHandlerResult {
  const madeId = sourceOf(dueItem);
  if (!madeId) return quietDue(world);
  const made = world.history.events.find((event) => event.id === madeId);
  if (!made || made.type !== "life.introduction-made") return quietDue(world);
  if (openProposal(world, playerId, thirdId)) return quietDue(world);
  const metSince = world.history.relationshipInteractions.some(
    (interaction) =>
      interaction.personIds.includes(playerId) &&
      interaction.personIds.includes(thirdId) &&
      interaction.occurredAt > made.occurredAt,
  );
  if (metSince) return quietDue(world);
  const introducerId = made.participants.find(
    (entry) => entry.role === "agency:actor",
  )?.personId;
  const introducer = introducerId ? world.people[introducerId] : undefined;
  const proposed = proposeContact(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:introduction:${madeId}:meet`,
    fromPersonId: thirdId,
    toPersonId: playerId,
    on: addDays(world.currentDate, 9),
    purpose: `Meet, as ${introducer ? personName(introducer) : "your mutual contact"} suggested`,
    answerInPerson: true,
  });
  return {
    world: proposed.world,
    status: "resolved",
    reasonKey: null,
    context: "The introduced person asked to meet.",
    outcomeEventId: proposed.proposal.eventId,
  };
}

function handleCollaborationDue(
  world: World,
  dueItem: FutureDueItem,
  playerId: EntityId,
  counterpartId: EntityId,
): FutureTransitionHandlerResult {
  const agreedId = sourceOf(dueItem);
  if (!agreedId) return quietDue(world);
  const agreed = world.history.events.find((event) => event.id === agreedId);
  if (!agreed || agreed.type !== "life.collaboration-agreed") {
    return quietDue(world);
  }
  const kind = agreed.tags
    .find((tag) => tag.startsWith("followthrough.collaboration:"))
    ?.slice("followthrough.collaboration:".length);
  if (kind !== "study-recurring") return quietDue(world);
  // A study rhythm: a left program ends it, otherwise the next session comes
  // due — until enough sessions have run that the rhythm stands on its own.
  const stillPeers = studyPeers(world, playerId).some(
    (peer) => peer.personId === counterpartId,
  );
  if (!stillPeers) {
    const ended = recordWorldEvent(world, {
      stableKey: `${FOLLOWTHROUGH_TAG}:collaboration:${agreedId}:ended`,
      type: "life.collaboration-ended",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[playerId]!.homeJurisdictionId,
      involvedEntityIds: [playerId, counterpartId],
      participants: [
        {
          personId: playerId,
          role: "presence:participant",
          detail: "No longer in the program together",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FOLLOWTHROUGH_TAG,
        "followthrough.family:continuing-collaboration",
        `followthrough.source:${agreedId}`,
      ],
      summary: `The weekly sessions ended when the shared program did.`,
      context: {
        location: null,
        socialContext: "A rhythm interrupted by a changed circumstance.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return {
      world: ended,
      status: "cancelled",
      reasonKey: "life:issue-overtaken",
      context: "Diagnostic: the shared program ended.",
      outcomeEventId: ended.history.events.at(-1)!.id,
    };
  }
  const sessionsHeld = world.history.events.filter(
    (event) =>
      event.type === "life.collaboration-session-kept" &&
      event.tags.includes(`followthrough.source:${agreedId}`),
  ).length;
  if (sessionsHeld + 1 >= RECURRING_SESSION_COUNT) {
    const established = recordWorldEvent(world, {
      stableKey: `${FOLLOWTHROUGH_TAG}:collaboration:${agreedId}:established`,
      type: "life.collaboration-established",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[playerId]!.homeJurisdictionId,
      involvedEntityIds: [playerId, counterpartId],
      participants: [
        {
          personId: playerId,
          role: "agency:actor",
          detail: "Keeps meeting weekly",
        },
        {
          personId: counterpartId,
          role: "agency:actor",
          detail: "Keeps meeting weekly",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FOLLOWTHROUGH_TAG,
        "followthrough.family:continuing-collaboration",
        `followthrough.source:${agreedId}`,
      ],
      summary: `The weekly sessions became a standing arrangement.`,
      context: {
        location: null,
        socialContext: "A rhythm that no longer needs proposing.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return {
      world: established,
      status: "resolved",
      reasonKey: null,
      context: "A recurring collaboration stood on its own.",
      outcomeEventId: established.history.events.at(-1)!.id,
    };
  }
  const next = scheduleFollowThrough(world, {
    family: "continuing-collaboration",
    personId: playerId,
    counterpartId,
    sourceEventId: agreedId,
    dueInDays: RECURRING_SESSION_DAYS,
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "The next weekly session came due.",
    outcomeEventId: null,
  };
}

/** Mark one weekly session as kept. The rhythm counts itself. */
export function keepCollaborationSession(
  world: World,
  playerId: EntityId,
  agreedId: EntityId,
): World {
  const agreed = world.history.events.find((event) => event.id === agreedId);
  if (!agreed || agreed.type !== "life.collaboration-agreed") {
    throw new Error("That rhythm is not on record.");
  }
  const counterpartId = agreed.involvedEntityIds.find((id) => id !== playerId)!;
  return recordWorldEvent(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:collaboration:${agreedId}:session-${world.history.nextSequence}`,
    type: "life.collaboration-session-kept",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[playerId]!.homeJurisdictionId,
    involvedEntityIds: [playerId, counterpartId],
    participants: [
      {
        personId: playerId,
        role: "agency:actor",
        detail: "Met for the weekly session",
      },
      {
        personId: counterpartId,
        role: "agency:actor",
        detail: "Met for the weekly session",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:continuing-collaboration",
      `followthrough.source:${agreedId}`,
    ],
    summary: `They met for the weekly session.`,
    context: {
      location: null,
      socialContext: "A standing study rhythm, kept.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * End a weekly rhythm by choice, in the player's own words. Ending is neither
 * failing nor breaking: the sessions that were kept stay kept, and the record
 * says who ended it and what they said.
 */
export function stopCollaboration(
  world: World,
  playerId: EntityId,
  agreedId: EntityId,
  statement: string,
): World {
  const agreed = world.history.events.find((event) => event.id === agreedId);
  if (!agreed || agreed.type !== "life.collaboration-agreed") {
    throw new Error("That rhythm is not on record.");
  }
  const counterpartId = agreed.involvedEntityIds.find((id) => id !== playerId)!;
  if (!statement.trim()) throw new Error("Ending it says something.");
  return recordWorldEvent(world, {
    stableKey: `${FOLLOWTHROUGH_TAG}:collaboration:${agreedId}:stopped:${world.history.nextSequence}`,
    type: "life.collaboration-ended",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[playerId]!.homeJurisdictionId,
    involvedEntityIds: [playerId, counterpartId],
    participants: [
      { personId: playerId, role: "agency:actor", detail: statement },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      FOLLOWTHROUGH_TAG,
      "followthrough.family:continuing-collaboration",
      `followthrough.source:${agreedId}`,
    ],
    summary: `The weekly sessions ended by choice.`,
    context: {
      location: null,
      socialContext: "A rhythm ended, not broken.",
      pressure: null,
      choice: statement,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export const PEOPLE_SOCIAL_FOLLOWTHROUGH_HANDLERS: FutureTransitionHandlerRegistry =
  createFutureTransitionHandlerRegistry([
    [FOLLOWTHROUGH_TRANSITION_KEY, socialFollowThroughTransitionHandler],
  ]);
