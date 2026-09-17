import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import {
  CLAIM_CONTRADICTION_EVENT,
  CLAIM_EVIDENCE_TAG_PREFIX,
  CLAIM_STANCE_EVENT_TAG_PREFIX,
  claimStanceOf,
  contradictionFound,
  type ClaimStance,
} from "./claim-stances";
import { CONTRADICTION_ROUTES } from "./claim-contradiction-routes";
import { addDays } from "./dates";
import { evaluateDecision } from "./decisions";
import { scheduleFutureDueItem } from "./future-transitions";
import { currentLifeCutoff, householdMembershipsAt } from "./life-queries";
import { personName } from "./people";
import {
  recordClaim,
  recordEventKnowledge,
  recordMemory,
  recordRelationshipInteraction,
} from "./records";
import { recordSceneBinding, type SceneFamily } from "./scene-bindings";
import { scheduledActivityState } from "./time-work";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * When a claim meets evidence (ALIVE44 D1–D6, PROSE B).
 *
 * A stance that could later be contradicted schedules exactly one check, at
 * the point where the world could first hold evidence against it. The check
 * asks the world, never the claim: did the thing the player denied actually
 * happen, and did somebody who heard the denial come to know it through a
 * route the world records? Only then is a discovery written, by and for that
 * person. Otherwise the claim stays believed, and nothing is written (D6).
 *
 * The evidence routes here are all ordinary:
 *
 * - `attends:` — a housemate who was told "I'll be home that evening" sees
 *   the player go out to the event, because they live in the same house on
 *   that date. Nobody outside the household is given that sight.
 * - `promised:` / `accepted:` — a reporter who was told "there was no such
 *   promise" asks somebody who heard or received it. That person decides for
 *   themselves whether to confirm it; one who declines leaves the reporter
 *   with nothing new.
 *
 * What follows a discovery reuses the relationship and memory records every
 * other exchange writes, and differs by intent: a deliberate lie strains the
 * relationship; an answer the player gave from uncertain memory is a
 * correction, not a betrayal. No universal reputation penalty, no legal
 * finding.
 */

export const CLAIM_CONTRADICTION_TRANSITION_KEY = "claim:contradiction-check";
export const SEEN_GOING_OUT_EVENT = "life.seen-going-out";
export const SOURCE_CONFIRMED_EVENT = "press.source-confirmed";

/** Days a reporter takes to check an answer with somebody else. Authored. */
const REPORTER_CHECK_DAYS = 6;

export interface ScheduleContradictionCheckInput {
  readonly stanceEventId: EntityId;
  readonly speakerPersonId: EntityId;
  readonly stance: ClaimStance;
  readonly jurisdictionId: EntityId | null;
}

/** The date the world could first hold evidence against this stance. */
function checkDate(world: World, stance: ClaimStance): IsoDate | null {
  const [kind, id] = splitKey(stance.propositionKey);
  if (kind === "attends" && id) {
    const activity = world.history.scheduledActivities.find(
      (candidate) => candidate.id === id,
    );
    if (!activity) return null;
    const end = scheduledActivityState(world, id).end.date;
    const after = addDays(end, 1);
    return after > world.currentDate ? after : addDays(world.currentDate, 1);
  }
  if ((kind === "promised" || kind === "accepted") && id) {
    return addDays(world.currentDate, REPORTER_CHECK_DAYS);
  }
  const route = CONTRADICTION_ROUTES.find((entry) => entry.prefix === kind);
  if (route && id) {
    const date = route.checkDate(world, stance, id);
    return date && date > world.currentDate ? date : null;
  }
  return null;
}

function splitKey(key: string): [string, EntityId | null] {
  const index = key.indexOf(":");
  return index < 0
    ? [key, null]
    : [key.slice(0, index), key.slice(index + 1) as EntityId];
}

/**
 * Schedules the one check a stance can have. Truthful answers and evasions
 * schedule nothing: there is nothing for evidence to contradict.
 */
export function scheduleContradictionCheck(
  world: World,
  input: ScheduleContradictionCheckInput,
): World {
  const { stance } = input;
  if (stance.intent !== "deceive" && stance.intent !== "from-memory") {
    return world;
  }
  const dueAt = checkDate(world, stance);
  if (!dueAt) return world;
  return scheduleFutureDueItem(world, {
    stableKey: `claim-check:${input.stanceEventId}`,
    dueAt,
    transitionKey: CLAIM_CONTRADICTION_TRANSITION_KEY,
    entityIds: [input.stanceEventId, input.speakerPersonId].sort(),
    jurisdictionId: input.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [input.stanceEventId] },
  });
}

export function claimContradictionTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== CLAIM_CONTRADICTION_TRANSITION_KEY) {
    throw new Error("The contradiction check received another transition.");
  }
  const done = (
    reason: string,
    next: World = world,
    outcomeEventId: EntityId | null = null,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: `claim-check:${reason}`,
    context: null,
    outcomeEventId,
  });
  const stanceEvent = world.history.events.find(
    (event) =>
      dueItem.entityIds.includes(event.id) && claimStanceOf(event) !== null,
  );
  const stance = stanceEvent ? claimStanceOf(stanceEvent) : null;
  const speakerId = dueItem.entityIds.find((id) => world.people[id]);
  if (!stanceEvent || !stance || !speakerId) return done("record-missing");
  if (dying(world, speakerId)) return done("speaker-gone");

  const [kind, id] = splitKey(stance.propositionKey);
  if (kind === "attends" && id) {
    return attendanceCheck(world, stanceEvent, stance, speakerId, id, done);
  }
  if ((kind === "promised" || kind === "accepted") && id) {
    const basis = promiseBasis(world, kind, id, speakerId);
    if (!basis) return done("promise-missing");
    return promiseCheck(world, stanceEvent, stance, speakerId, basis, done);
  }
  const route = CONTRADICTION_ROUTES.find((entry) => entry.prefix === kind);
  if (route && id) {
    let next = world;
    let lastEventId: EntityId | null = null;
    for (const recipientId of stance.recipientPersonIds) {
      if (
        recipientId === speakerId ||
        !next.people[recipientId] ||
        dying(next, recipientId) ||
        contradictionFound(next, stanceEvent.id, recipientId)
      ) {
        continue;
      }
      const evidence = route.evidenceFor(
        next,
        stanceEvent,
        stance,
        id,
        recipientId,
      );
      if (!evidence) continue;
      const found = writeDiscovery(next, {
        stanceEvent,
        stance,
        speakerId,
        discovererId: recipientId,
        evidenceEventId: evidence.evidenceEventId,
        family: route.discovery?.family ?? "reporter-question",
        place: route.discovery?.place ?? "By phone",
        jurisdictionId:
          stanceEvent.jurisdictionId ?? fallbackJurisdiction(next),
        evidenceLabel: evidence.label,
        facts: {
          sourceName: evidence.label,
          questionLabel: stance.proposition,
        },
      });
      next = found.world;
      lastEventId = found.eventId;
    }
    return lastEventId
      ? done("contradicted", next, lastEventId)
      : done("no-evidence-yet", next);
  }
  return done("unsupported-proposition");
}

type Done = (
  reason: string,
  next?: World,
  outcomeEventId?: EntityId | null,
) => FutureTransitionHandlerResult;

function dying(world: World, personId: EntityId): boolean {
  return world.history.personDeaths.some(
    (death) => death.personId === personId && death.diedAt <= world.currentDate,
  );
}

function sharesHousehold(
  world: World,
  left: EntityId,
  right: EntityId,
): boolean {
  const cutoff = currentLifeCutoff(world);
  const mine = new Set(
    householdMembershipsAt(world, left, cutoff).map(
      (entry) => entry.membership.householdId,
    ),
  );
  return householdMembershipsAt(world, right, cutoff).some((entry) =>
    mine.has(entry.membership.householdId),
  );
}

function attendanceCheck(
  world: World,
  stanceEvent: HistoricalEvent,
  stance: ClaimStance,
  speakerId: EntityId,
  activityId: EntityId,
  done: Done,
): FutureTransitionHandlerResult {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === activityId,
  );
  if (!activity) return done("activity-missing");
  const state = scheduledActivityState(world, activityId);
  // The player said they would stay in. If they did, the words came true and
  // there is nothing to find.
  if (state.status !== "completed") return done("claim-held");
  const witnesses = stance.recipientPersonIds.filter(
    (personId) =>
      personId !== speakerId &&
      world.people[personId] &&
      !dying(world, personId) &&
      sharesHousehold(world, speakerId, personId) &&
      !contradictionFound(world, stanceEvent.id, personId),
  );
  if (witnesses.length === 0) return done("no-witness");

  let next = world;
  let lastEventId: EntityId | null = null;
  const speaker = personName(world.people[speakerId]!);
  for (const witnessId of witnesses) {
    const witness = personName(next.people[witnessId]!);
    next = recordWorldEvent(next, {
      stableKey: `claim-check:${stanceEvent.id}:seen:${witnessId}`,
      type: SEEN_GOING_OUT_EVENT,
      occurredAt: state.start.date,
      recordedAt: next.currentDate,
      jurisdictionId: activity.location.jurisdictionId,
      involvedEntityIds: [speakerId, witnessId, activityId],
      participants: [
        {
          personId: witnessId,
          role: "observation:witness",
          detail: "Was at home and saw them leave",
        },
        {
          personId: speakerId,
          role: "focus:subject",
          detail: `Went out to ${activity.title}`,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [`${CLAIM_STANCE_EVENT_TAG_PREFIX}${stanceEvent.id}`],
      summary: `${witness} saw ${speaker} leave for ${activity.title}.`,
      context: {
        location: {
          jurisdictionId: activity.location.jurisdictionId,
          label: "Home",
          setting: null,
        },
        socialContext: "Two people who share a home.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const seen = next.history.events.at(-1)!;
    next = recordEventKnowledge(next, {
      stableKey: `${seen.stableKey}:knowledge`,
      personId: witnessId,
      eventId: seen.id,
      learnedAt: next.currentDate,
      believedSummary: `${speaker} went out to ${activity.title} after saying they would be home.`,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const found = writeDiscovery(next, {
      stanceEvent,
      stance,
      speakerId,
      discovererId: witnessId,
      evidenceEventId: seen.id,
      family: "home-evening",
      place: "Home",
      jurisdictionId:
        activity.location.jurisdictionId ??
        stanceEvent.jurisdictionId ??
        fallbackJurisdiction(next),
      evidenceLabel: `going out to ${activity.title}`,
      facts: { activityTitle: activity.title },
    });
    next = found.world;
    lastEventId = found.eventId;
  }
  return done("contradicted", next, lastEventId);
}

/** What a promise was, who can speak to it, and the record it lives in. */
interface PromiseBasis {
  /** People who can confirm it, in the order a reporter would ask. */
  readonly sourcePersonIds: readonly EntityId[];
  readonly label: string;
  readonly words: string;
  readonly eventId: EntityId;
}

function promiseBasis(
  world: World,
  kind: string,
  id: EntityId,
  speakerId: EntityId,
): PromiseBasis | null {
  if (kind === "promised") {
    const commitment = (world.history.legislativeCommitments ?? []).find(
      (record) => record.id === id,
    );
    if (!commitment) return null;
    // Other listeners first; the person promised last.
    const promisee = commitmentPromisee(world, commitment);
    return {
      sourcePersonIds: [
        ...commitment.heardByPersonIds,
        ...(promisee ? [promisee] : []),
      ],
      label: `the commitment on ${commitment.subject.questionLabel}`,
      words: commitment.statement,
      eventId: commitment.eventId,
    };
  }
  // `accepted:` — the player said yes to an organizer's meeting invitation.
  const accepted = world.history.events.find((event) => event.id === id);
  if (!accepted) return null;
  const invitationId = accepted.tags
    .find((tag) => tag.startsWith("invitation:"))
    ?.slice("invitation:".length);
  const invitation = world.history.events.find(
    (event) => event.id === invitationId,
  );
  const organizer = invitation?.participants.find(
    (entry) => entry.role === "agency:asked" && entry.personId !== speakerId,
  )?.personId;
  if (!invitation || !organizer) return null;
  const meeting = world.history.scheduledActivities.find((activity) =>
    activity.sourceEntityIds.includes(invitation.id),
  );
  return {
    sourcePersonIds: [organizer],
    label: `saying yes to the ${meeting?.title ?? "meeting"}`,
    words: "I’ll be there.",
    eventId: accepted.id,
  };
}

function promiseCheck(
  world: World,
  stanceEvent: HistoricalEvent,
  stance: ClaimStance,
  speakerId: EntityId,
  basis: PromiseBasis,
  done: Done,
): FutureTransitionHandlerResult {
  const reporters = stance.recipientPersonIds.filter(
    (personId) =>
      personId !== speakerId &&
      world.people[personId] &&
      !dying(world, personId) &&
      !contradictionFound(world, stanceEvent.id, personId),
  );
  // Somebody who heard the promise, or was given it, alive to be asked on
  // the record.
  const sources = basis.sourcePersonIds.filter(
    (personId, index, all) =>
      all.indexOf(personId) === index &&
      personId !== speakerId &&
      !reporters.includes(personId) &&
      world.people[personId] &&
      !dying(world, personId),
  );
  if (reporters.length === 0) return done("no-recipient");
  if (sources.length === 0) return done("no-independent-source");

  let next = world;
  let lastEventId: EntityId | null = null;
  for (const reporterId of reporters) {
    const sourceId = sources[0]!;
    next = ensurePeopleTraits(next, [sourceId]);
    const evaluation = evaluateDecision(next, {
      stableKey: `claim-check:${stanceEvent.id}:source:${sourceId}:${reporterId}`,
      decisionType: "press.confirm-account",
      actorPersonId: sourceId,
      cutoff: {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      },
      subject: {
        kind: "context:life",
        key: "reporter-checks-an-answer",
        entityId: null,
      },
      options: [
        {
          key: "confirm",
          label: "Confirm what was said",
          description: "Tell the reporter what they heard.",
        },
        {
          key: "decline",
          label: "Decline to comment",
          description: "Say nothing about it.",
        },
      ],
      constraints: [],
      considerations: traitConsiderations(
        next,
        sourceId,
        `claim-check:${stanceEvent.id}:${reporterId}`,
        [
          {
            optionKey: "confirm",
            trait: "conflict",
            pole: "high",
            explanation: "They don’t mind contradicting someone on the record.",
          },
          {
            optionKey: "decline",
            trait: "conflict",
            pole: "low",
            explanation:
              "They would rather not get between a reporter and someone they know.",
          },
          {
            optionKey: "decline",
            trait: "risk",
            pole: "low",
            explanation: "Talking to a reporter feels risky to them.",
          },
        ],
      ),
      perceptionIds: [],
      randomness: "close-choices",
      retention: "ephemeral",
    });
    if (evaluation.selectedOptionKey !== "confirm") continue;
    const source = personName(next.people[sourceId]!);
    const reporter = personName(next.people[reporterId]!);
    const holder = personName(next.people[speakerId]!);
    next = recordWorldEvent(next, {
      stableKey: `claim-check:${stanceEvent.id}:confirmed:${reporterId}`,
      type: SOURCE_CONFIRMED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: stanceEvent.jurisdictionId,
      involvedEntityIds: [sourceId, reporterId, speakerId],
      participants: [
        {
          personId: sourceId,
          role: "agency:source",
          detail: "Confirmed what they heard",
        },
        {
          personId: reporterId,
          role: "focus:asked",
          detail: "Checked an answer",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [`${CLAIM_STANCE_EVENT_TAG_PREFIX}${stanceEvent.id}`],
      summary: `${source} told ${reporter} about ${holder} ${basis.label}.`,
      context: {
        location: {
          jurisdictionId: stanceEvent.jurisdictionId,
          label: "By phone",
          setting: null,
        },
        socialContext: "A reporter checking an answer with another source.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const confirmed = next.history.events.at(-1)!;
    next = recordClaim(next, {
      stableKey: `${confirmed.stableKey}:claim`,
      speakerPersonId: sourceId,
      // The claim is about the promise, and so is what the reporter learns.
      eventId: basis.eventId,
      madeAt: next.currentDate,
      audience: "limited",
      statement: `${holder} told me: “${basis.words}”`,
      relationshipToTruth: "consistent",
      provenance: { kind: "direct-record" },
    });
    next = recordEventKnowledge(next, {
      stableKey: `${confirmed.stableKey}:knowledge`,
      personId: reporterId,
      eventId: basis.eventId,
      learnedAt: next.currentDate,
      believedSummary: `${source} confirms ${holder} ${basis.label}: “${basis.words}”`,
      accuracy: "accurate",
      confidence: "medium",
      source: {
        kind: "told-by",
        sourcePersonId: sourceId,
        claimId: next.history.claims.at(-1)!.id,
      },
    });
    const found = writeDiscovery(next, {
      stanceEvent,
      stance,
      speakerId,
      discovererId: reporterId,
      evidenceEventId: confirmed.id,
      family: "reporter-question",
      place: "By phone",
      jurisdictionId: stanceEvent.jurisdictionId ?? fallbackJurisdiction(next),
      evidenceLabel: `${source}’s account`,
      facts: {
        sourceName: source,
        questionLabel: basis.label,
      },
    });
    next = found.world;
    lastEventId = found.eventId;
  }
  return lastEventId
    ? done("contradicted", next, lastEventId)
    : done("source-declined", next);
}

/** The person a legislative commitment was made to: who answered in that turn. */
export function commitmentPromisee(
  world: World,
  commitment: { readonly eventId: EntityId; readonly holderPersonId: EntityId },
): EntityId | null {
  const event = world.history.events.find(
    (entry) => entry.id === commitment.eventId,
  );
  const respondent = event?.participants.find(
    (entry) =>
      entry.personId !== commitment.holderPersonId &&
      (entry.role === "focus:respondent" || entry.role === "focus:addressee"),
  );
  return respondent?.personId ?? null;
}

function fallbackJurisdiction(world: World): EntityId {
  return world.jurisdictionOrder[0]!;
}

interface DiscoveryInput {
  readonly stanceEvent: HistoricalEvent;
  readonly stance: ClaimStance;
  readonly speakerId: EntityId;
  readonly discovererId: EntityId;
  readonly evidenceEventId: EntityId;
  readonly family: SceneFamily;
  readonly place: string;
  readonly jurisdictionId: EntityId;
  readonly evidenceLabel: string;
  readonly facts: Readonly<Record<string, string>>;
}

/**
 * The discovery, what it did between the two of them, and the conversation it
 * makes possible. Different for a lie and for a mistake, and never more than
 * the records support.
 */
function writeDiscovery(
  world: World,
  input: DiscoveryInput,
): { world: World; eventId: EntityId } {
  const deliberate = input.stance.intent === "deceive";
  const speaker = personName(world.people[input.speakerId]!);
  const discoverer = personName(world.people[input.discovererId]!);
  let next = recordWorldEvent(world, {
    stableKey: `claim-check:${input.stanceEvent.id}:found:${input.discovererId}`,
    type: CLAIM_CONTRADICTION_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.discovererId, input.speakerId],
    participants: [
      {
        personId: input.discovererId,
        role: "agency:discoverer",
        detail: `Learned of ${input.evidenceLabel}`,
      },
      {
        personId: input.speakerId,
        role: "focus:subject",
        detail: "Had said otherwise",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `${CLAIM_STANCE_EVENT_TAG_PREFIX}${input.stanceEvent.id}`,
      `${CLAIM_EVIDENCE_TAG_PREFIX}${input.evidenceEventId}`,
      `claim.intent.${input.stance.intent}`,
    ],
    summary: `${discoverer} learned that what ${speaker} said — “${input.stance.statement}” — did not match ${input.evidenceLabel}.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label: input.place,
        setting: null,
      },
      socialContext: "An earlier answer met later evidence.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const found = next.history.events.at(-1)!;
  next = recordEventKnowledge(next, {
    stableKey: `${found.stableKey}:knowledge`,
    personId: input.discovererId,
    eventId: found.id,
    learnedAt: next.currentDate,
    believedSummary: `What ${speaker} said did not match ${input.evidenceLabel}.`,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
  next = recordMemory(next, {
    stableKey: `${found.stableKey}:memory`,
    personId: input.discovererId,
    eventId: found.id,
    formedAt: next.currentDate,
    rememberedSummary: `${speaker} said “${input.stance.statement}”, and it was not so.`,
    interpretation: deliberate
      ? `${speaker} knew otherwise when they said it.`
      : `${speaker} may have misremembered.`,
    strength: deliberate ? "strong" : "faint",
    relevanceTags: ["claim.contradicted"],
    supersedesMemoryId: null,
  });
  next = recordRelationshipInteraction(next, {
    stableKey: `${found.stableKey}:relationship`,
    personIds: [input.speakerId, input.discovererId].sort() as [
      EntityId,
      EntityId,
    ],
    eventId: found.id,
    occurredAt: next.currentDate,
    kind: deliberate ? "conflict:misled" : "contact:corrected-account",
    change: deliberate ? "strained" : "maintained",
    significance: deliberate ? "meaningful" : "minor",
    summary: deliberate
      ? `${discoverer} found out ${speaker} had not told them the truth.`
      : `${discoverer} found that ${speaker}'s answer had been mistaken.`,
    tags: ["claim.contradicted"],
  });
  next = recordSceneBinding(
    next,
    {
      version: 1,
      family: input.family,
      variant: deliberate ? "claim-came-back" : "memory-corrected",
      playerPersonId: input.speakerId,
      speakerPersonId: input.discovererId,
      relationship: null,
      place: input.place,
      jurisdictionId: input.jurisdictionId,
      request: `What was said — “${input.stance.statement}” — against ${input.evidenceLabel}.`,
      sourceEntityIds: [found.id, input.stanceEvent.id, input.evidenceEventId],
      facts: {
        ...input.facts,
        statement: input.stance.statement,
        proposition: input.stance.proposition,
        evidenceLabel: input.evidenceLabel,
      },
      knownRecordIds: [input.evidenceEventId],
      target: null,
      date: null,
      expiresAt: addDays(next.currentDate, 14),
    },
    `${discoverer} has something to raise with ${speaker}.`,
  );
  return { world: next, eventId: found.id };
}
