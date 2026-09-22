import { addDays } from "./dates";
import { evaluateDecision } from "./decisions";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "./future-transitions";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "./life-queries";
import { personName } from "./people";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import { traitRegistryFor } from "./trait-registry";
import { registeredTraitConsiderations } from "./trait-readings";
import { CONTACT_ANSWER_DECISION } from "./people-contact-decisions";
import { recordEventKnowledge } from "./records";
import { assessRelationshipContinuity } from "./relationship-integration";
import { simulationMomentAtLocalTime } from "./dates";
import {
  cancelScheduledActivity,
  createScheduledActivity,
  scheduledActivityState,
} from "./time-work";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";
import type {
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerRegistry,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
  HistoricalEvent,
} from "./types";

/**
 * Asking somebody to meet, and what they say back (CRUNCH47 B1, P3).
 *
 * A channel is not access. Knowing somebody, or knowing where they work, means
 * a request can be made — not that it will be agreed to. The other person
 * answers from their own side: who they are, what the two of them have between
 * them, and what else is already on that day. A refusal and a different day
 * offered back are both ordinary answers, and neither ends anything.
 *
 * Nothing here decays. A friendship that has not been in view for a year is
 * still a friendship; the gap is a fact the other person may weigh, not a
 * number counting down. And no NPC is required to say yes because the player
 * asked nicely.
 *
 * One request, one answer, one commitment. Agreeing writes a confirmed entry
 * on both calendars; it does not perform the meeting, which happens in its own
 * hour like any other activity.
 */

export const CONTACT_PROPOSED_EVENT = "life.meeting-proposed";
export const CONTACT_ACCEPTED_EVENT = "life.meeting-accepted";
export const CONTACT_COUNTERED_EVENT = "life.meeting-counter-offered";
export const CONTACT_DECLINED_EVENT = "life.meeting-declined";
export const CONTACT_ANSWER_TRANSITION_KEY = "people:contact-answer";
export const CONTACT_TAG = "contact.v1";
export const CONTACT_LOCATION_KEY = "people-contact:meeting";

/** How long an unanswered proposal waits before the other person answers. */
const ANSWER_DELAY_DAYS = 1;
/** The earliest a proposal may be for: nobody is asked for the same hour. */
/** For a sentence the player actually reads, in both shapes it needs. */
function daysNotice(count: number): string {
  return count === 1 ? "1 day's" : `${count} days'`;
}
function daysAhead(count: number): string {
  return count === 1 ? "1 day" : `${count} days`;
}

export const CONTACT_MINIMUM_NOTICE_DAYS = 2;
/** How far ahead a person will make a plan of this kind. */
export const CONTACT_MAXIMUM_NOTICE_DAYS = 45;
const MEETING_START_MINUTE = 18 * 60;
const MEETING_MINUTES = 90;

export type ContactChannelKind =
  "in-person" | "call" | "through-work" | "through-group";

/**
 * How this person could be reached — a description, not a control.
 *
 * A channel is not access and it is not a command: there is no "call them"
 * writer behind it, and there was never meant to be. It used to carry an
 * imperative label and an `available` flag, which read exactly like a button
 * and invited one to be wired to nothing. What can actually be done is on the
 * contact's `actions`, where the reason it cannot be done also lives.
 */
export interface ContactChannel {
  readonly kind: ContactChannelKind;
  /** A noun phrase: "By phone", "At home". Never an instruction. */
  readonly label: string;
  /** A plain fact about reaching them this way now, when there is one. */
  readonly note: string | null;
}

export interface ContactBasis {
  readonly personId: EntityId;
  readonly name: string;
  /** Household, kin, work, group — how the two of them actually overlap. */
  readonly basis: readonly string[];
  readonly channels: readonly ContactChannel[];
  readonly lastContactOn: IsoDate | null;
  readonly gap:
    "recent-contact" | "long-gap" | "reconnected" | "tension-context";
}

function alive(world: World, personId: EntityId): boolean {
  return (
    !!world.people[personId] &&
    isPersonAliveAt(world, personId, currentLifeCutoff(world))
  );
}

/** Everybody the played person has a real, recorded way of reaching. */
export function contactBases(
  world: World,
  personId: EntityId,
): readonly ContactBasis[] {
  const cutoff = currentLifeCutoff(world);
  const bases = new Map<EntityId, Set<string>>();
  const add = (otherId: EntityId, basis: string) => {
    if (otherId === personId || !alive(world, otherId)) return;
    const found = bases.get(otherId) ?? new Set<string>();
    found.add(basis);
    bases.set(otherId, found);
  };
  const myHouseholds = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.household.id,
    ),
  );
  for (const record of world.history.householdMemberships) {
    if (myHouseholds.has(record.householdId)) {
      add(record.personId, "shares your home");
    }
  }
  for (const kin of kinshipRelationshipsAt(world, personId, cutoff)) {
    const other = kin.personIds.find((id) => id !== personId);
    if (other) add(other, "family");
  }
  const myEmployers = new Set(
    activeWorkRelationshipsAt(world, personId, cutoff).map(
      (entry) => entry.relationship.organizationId,
    ),
  );
  for (const record of world.history.workRelationships) {
    if (myEmployers.has(record.organizationId)) {
      add(record.personId, "works where you work");
    }
  }
  const myGroups = new Set(
    activeOrganizationParticipationsAt(world, personId, cutoff).map(
      (entry) => entry.participation.organizationId,
    ),
  );
  for (const record of world.history.organizationParticipations) {
    if (myGroups.has(record.organizationId)) {
      add(record.personId, "in the same group as you");
    }
  }
  for (const interaction of world.history.relationshipInteractions) {
    if (
      interaction.significance === "minor" ||
      !interaction.personIds.includes(personId)
    ) {
      continue;
    }
    const other = interaction.personIds.find((id) => id !== personId);
    if (other) add(other, "somebody you know");
  }
  return [...bases.entries()]
    .map(([otherId, basis]) => {
      const continuity = assessRelationshipContinuity(
        world,
        [personId, otherId],
        cutoff,
      );
      return {
        personId: otherId,
        name: personName(world.people[otherId]!),
        basis: [...basis].sort(),
        channels: contactChannels(world, personId, otherId, [...basis]),
        lastContactOn: continuity.lastMeaningfulContactAt,
        gap: continuity.continuity,
      };
    })
    .sort((left, right) => left.personId.localeCompare(right.personId));
}

function contactChannels(
  world: World,
  personId: EntityId,
  otherId: EntityId,
  basis: readonly string[],
): readonly ContactChannel[] {
  const open = openProposal(world, personId, otherId);
  const waiting = open
    ? "You have already asked, and they have not answered yet."
    : null;
  const channels: ContactChannel[] = [
    { kind: "call", label: "By phone", note: waiting },
  ];
  if (basis.includes("shares your home")) {
    channels.push({ kind: "in-person", label: "At home", note: null });
  }
  if (basis.includes("works where you work")) {
    channels.push({ kind: "through-work", label: "At work", note: waiting });
  }
  if (basis.includes("in the same group as you")) {
    channels.push({
      kind: "through-group",
      label: "Through the group",
      note: waiting,
    });
  }
  return channels;
}

export interface ContactProposal {
  readonly eventId: EntityId;
  /** The confirmed meeting, once there is one. */
  readonly activityId: EntityId | null;
  readonly fromPersonId: EntityId;
  readonly toPersonId: EntityId;
  readonly on: IsoDate;
  readonly purpose: string;
  readonly answered: boolean;
}

/** A proposal between these two that nobody has answered yet. */
export function openProposal(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): ContactProposal | null {
  return (
    contactProposals(world, personId).find(
      (proposal) =>
        !proposal.answered &&
        (proposal.toPersonId === otherId || proposal.fromPersonId === otherId),
    ) ?? null
  );
}

export function contactProposals(
  world: World,
  personId: EntityId,
): readonly ContactProposal[] {
  return world.history.events
    .filter(
      (event) =>
        event.type === CONTACT_PROPOSED_EVENT &&
        event.involvedEntityIds.includes(personId),
    )
    .flatMap((event) => {
      const from = event.participants.find(
        (entry) => entry.role === "agency:asked",
      )?.personId;
      const to = event.participants.find(
        (entry) => entry.role === "focus:asked-of",
      )?.personId;
      const activityId = meetingFor(world, event.id);
      const on = event.tags
        .find((tag) => tag.startsWith("contact.on:"))
        ?.slice("contact.on:".length) as IsoDate | undefined;
      if (!from || !to || !on) return [];
      const answered = world.history.events.some(
        (candidate) =>
          [
            CONTACT_ACCEPTED_EVENT,
            CONTACT_COUNTERED_EVENT,
            CONTACT_DECLINED_EVENT,
          ].includes(candidate.type) &&
          candidate.tags.includes(`contact.proposal:${event.id}`),
      );
      return [
        {
          eventId: event.id,
          activityId: activityId as EntityId,
          fromPersonId: from,
          toPersonId: to,
          on,
          purpose: event.summary,
          answered,
        },
      ];
    });
}

export interface ProposeContactInput {
  readonly stableKey: string;
  readonly fromPersonId: EntityId;
  readonly toPersonId: EntityId;
  readonly on: IsoDate;
  /** What the meeting is for, in the asker's own words. */
  readonly purpose: string;
  /** Skip the scheduled answer: the other person answers in the scene itself. */
  readonly answerInPerson?: boolean;
}

/**
 * One person asks another to meet on a day. The hold goes on the asked
 * person's calendar as tentative; nothing is confirmed until they answer.
 */
export function proposeContact(
  world: World,
  input: ProposeContactInput,
): { world: World; proposal: ContactProposal } {
  const asker = world.people[input.fromPersonId];
  const asked = world.people[input.toPersonId];
  if (!asker || !asked) throw new Error("A meeting needs two real people.");
  if (input.fromPersonId === input.toPersonId) {
    throw new Error("A person cannot ask themselves to meet.");
  }
  if (!alive(world, input.fromPersonId) || !alive(world, input.toPersonId)) {
    throw new Error("A meeting cannot be arranged with somebody who has died.");
  }
  const earliest = addDays(world.currentDate, CONTACT_MINIMUM_NOTICE_DAYS);
  const latest = addDays(world.currentDate, CONTACT_MAXIMUM_NOTICE_DAYS);
  if (input.on < earliest || input.on > latest) {
    // Said as the rule rather than as two dates: this sentence is shown to the
    // player verbatim, and simulation has no business speaking a date — that
    // is presentation's, which is why the view carries the spoken ones.
    throw new Error(
      `A meeting needs at least ${daysNotice(CONTACT_MINIMUM_NOTICE_DAYS)} notice, and can be arranged up to ${daysAhead(CONTACT_MAXIMUM_NOTICE_DAYS)} ahead.`,
    );
  }
  if (!input.purpose.trim()) throw new Error("A meeting needs a reason.");
  if (openProposal(world, input.fromPersonId, input.toPersonId)) {
    throw new Error("There is already an unanswered proposal between them.");
  }
  const start = simulationMomentAtLocalTime({
    date: input.on,
    minuteOfDay: MEETING_START_MINUTE,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
  const end = simulationMomentAtLocalTime({
    date: input.on,
    minuteOfDay: MEETING_START_MINUTE + MEETING_MINUTES,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
  let next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:proposed`,
    type: CONTACT_PROPOSED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: asker.homeJurisdictionId,
    involvedEntityIds: [input.fromPersonId, input.toPersonId],
    participants: [
      {
        personId: input.fromPersonId,
        role: "agency:asked",
        detail: input.purpose,
      },
      {
        personId: input.toPersonId,
        role: "focus:asked-of",
        detail: "Was asked to meet",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [CONTACT_TAG, `contact.on:${input.on}`],
    summary: `${personName(asker)} asked ${personName(asked)} to meet on ${input.on}: ${input.purpose}`,
    context: {
      location: null,
      socialContext: "One person asking another for their time.",
      pressure: null,
      choice: null,
      motivation: input.purpose,
      immediateReaction: null,
    },
  });
  const proposedEvent = next.history.events.at(-1)!;
  // A request is not a commitment, so nothing is put on anybody's evening
  // until they say yes. Asking must not quietly occupy a night.
  void start;
  void end;
  next = recordEventKnowledge(next, {
    stableKey: `${input.stableKey}:told`,
    personId: input.toPersonId,
    eventId: proposedEvent.id,
    learnedAt: next.currentDate,
    believedSummary: `${personName(asker)} asked to meet on ${input.on}.`,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "told-by",
      sourcePersonId: input.fromPersonId,
      claimId: null,
    },
  });
  if (!input.answerInPerson) {
    next = scheduleFutureDueItem(next, {
      stableKey: `${input.stableKey}:answer`,
      dueAt: addDays(next.currentDate, ANSWER_DELAY_DAYS),
      transitionKey: CONTACT_ANSWER_TRANSITION_KEY,
      entityIds: [proposedEvent.id, input.toPersonId].sort(),
      jurisdictionId: asker.homeJurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [proposedEvent.id] },
    });
  }
  return {
    world: next,
    proposal: {
      eventId: proposedEvent.id,
      activityId: null,
      fromPersonId: input.fromPersonId,
      toPersonId: input.toPersonId,
      on: input.on,
      purpose: input.purpose,
      answered: false,
    },
  };
}

/** The meeting this proposal led to, once somebody agreed to it. */
function meetingFor(world: World, proposalEventId: EntityId): EntityId | null {
  return (
    world.history.scheduledActivities.find(
      (activity) =>
        activity.kind === "confirmed" &&
        activity.sourceEntityIds.includes(proposalEventId),
    )?.id ?? null
  );
}

export type ContactAnswer = "accept" | "counter" | "decline";

export interface AnswerContactInput {
  readonly proposalEventId: EntityId;
  readonly answer: ContactAnswer;
  /** For a counter-offer: the day they can do instead. */
  readonly counterOn?: IsoDate;
  /** Their own words, when they have any. */
  readonly note?: string;
}

/**
 * The answer, whoever gives it. Accepting confirms the meeting on both
 * calendars; a counter-offer replaces the hold with one on the day they can
 * do; a refusal releases the hold and says so.
 */
export function answerContact(
  world: World,
  input: AnswerContactInput,
): { world: World; eventId: EntityId } {
  const proposal = world.history.events.find(
    (event) => event.id === input.proposalEventId,
  );
  if (!proposal || proposal.type !== CONTACT_PROPOSED_EVENT) {
    throw new Error("That is not a meeting proposal.");
  }
  const from = proposal.participants.find(
    (entry) => entry.role === "agency:asked",
  )!.personId;
  const to = proposal.participants.find(
    (entry) => entry.role === "focus:asked-of",
  )!.personId;
  const meetingId = meetingFor(world, proposal.id);
  const on = proposal.tags
    .find((tag) => tag.startsWith("contact.on:"))!
    .slice("contact.on:".length) as IsoDate;
  const already = world.history.events.some(
    (event) =>
      [
        CONTACT_ACCEPTED_EVENT,
        CONTACT_COUNTERED_EVENT,
        CONTACT_DECLINED_EVENT,
      ].includes(event.type) &&
      event.tags.includes(`contact.proposal:${proposal.id}`),
  );
  if (already) throw new Error("That proposal has already been answered.");
  const asker = world.people[from]!;
  const asked = world.people[to]!;
  const type =
    input.answer === "accept"
      ? CONTACT_ACCEPTED_EVENT
      : input.answer === "counter"
        ? CONTACT_COUNTERED_EVENT
        : CONTACT_DECLINED_EVENT;
  const counterOn = input.counterOn ?? null;
  if (input.answer === "counter" && !counterOn) {
    throw new Error("A counter-offer needs the day they can do.");
  }
  const summary =
    input.answer === "accept"
      ? `${personName(asked)} agreed to meet ${personName(asker)} on ${on}.`
      : input.answer === "counter"
        ? `${personName(asked)} could not do ${on} and offered ${counterOn} instead.`
        : `${personName(asked)} could not meet ${personName(asker)} on ${on}.`;
  let next = recordWorldEvent(world, {
    stableKey: `contact:${proposal.id}:${input.answer}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: proposal.jurisdictionId,
    involvedEntityIds: [from, to],
    participants: [
      {
        personId: to,
        role: "agency:actor",
        detail: input.note ?? summary,
      },
      { personId: from, role: "focus:asked-of", detail: "Had asked to meet" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      CONTACT_TAG,
      `contact.proposal:${proposal.id}`,
      ...(counterOn ? [`contact.on:${counterOn}`] : []),
    ],
    summary,
    context: {
      location: null,
      socialContext: "An answer to a request for somebody's time.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const answerEvent = next.history.events.at(-1)!;
  // Nothing was held for a mere request; only an agreed meeting can be here,
  // and that only when an answer is being replaced.
  if (
    meetingId &&
    scheduledActivityState(next, meetingId).status === "scheduled"
  ) {
    next = cancelScheduledActivity(next, meetingId);
  }
  if (input.answer === "accept") {
    const start = simulationMomentAtLocalTime({
      date: on,
      minuteOfDay: MEETING_START_MINUTE,
      timeZone: next.currentMoment.timeZone,
      preferredUtcOffsetMinutes: next.currentMoment.utcOffsetMinutes,
    });
    const end = simulationMomentAtLocalTime({
      date: on,
      minuteOfDay: MEETING_START_MINUTE + MEETING_MINUTES,
      timeZone: next.currentMoment.timeZone,
      preferredUtcOffsetMinutes: next.currentMoment.utcOffsetMinutes,
    });
    next = createScheduledActivity(next, {
      stableKey: `contact:${proposal.id}:meeting`,
      title: `Meeting with ${personName(asker)}`,
      summary: proposal.context.motivation ?? proposal.summary,
      kind: "confirmed",
      start,
      end,
      participantPersonIds: [from, to],
      responsiblePersonId: from,
      location: {
        locationKey: CONTACT_LOCATION_KEY,
        label: "Arranged in person",
        jurisdictionId: asked.homeJurisdictionId,
      },
      sourceEntityIds: [proposal.id, answerEvent.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [from, to] },
    });
  }
  next = recordEventKnowledge(next, {
    stableKey: `contact:${proposal.id}:${input.answer}:told`,
    personId: from,
    eventId: answerEvent.id,
    learnedAt: next.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: to, claimId: null },
  });
  return { world: next, eventId: answerEvent.id };
}

/**
 * How an NPC answers, from their own side: what is already on that day, what
 * the two of them have between them, and who they are.
 */
export function npcContactAnswer(
  world: World,
  proposalEventId: EntityId,
): { answer: ContactAnswer; counterOn: IsoDate | null; world: World } {
  const proposal = world.history.events.find(
    (event) => event.id === proposalEventId,
  )!;
  const from = proposal.participants.find(
    (entry) => entry.role === "agency:asked",
  )!.personId;
  const to = proposal.participants.find(
    (entry) => entry.role === "focus:asked-of",
  )!.personId;
  const on = proposal.tags
    .find((tag) => tag.startsWith("contact.on:"))!
    .slice("contact.on:".length) as IsoDate;
  const considerations: DecisionConsideration[] = [];
  const continuity = assessRelationshipContinuity(
    world,
    [from, to],
    currentLifeCutoff(world),
  );
  for (const interactionId of continuity.priorInteractionIds.slice(-2)) {
    const interaction = world.history.relationshipInteractions.find(
      (record) => record.id === interactionId,
    )!;
    const strained = interaction.change === "strained";
    considerations.push({
      stableKey: `contact:${proposalEventId}:prior:${interactionId}`,
      optionKey: strained ? "decline" : "accept",
      sourceType: "social:relationship",
      direction: "supports",
      importance: strained ? "moderate" : "moderate",
      confidence: "high",
      explanation: strained
        ? "The last thing between them did not go well."
        : "What is between them has been good.",
      sourceRefs: [{ kind: "relationship-interaction", interactionId }],
    });
  }
  // Somebody already has that evening: the day is the problem, not the person.
  const busy = world.history.scheduledActivities.some(
    (activity) =>
      activity.participantPersonIds.includes(to) &&
      activity.kind === "confirmed" &&
      scheduledActivityState(world, activity.id).status === "scheduled" &&
      scheduledActivityState(world, activity.id).start.date === on,
  );
  if (busy) {
    considerations.push({
      stableKey: `contact:${proposalEventId}:busy`,
      optionKey: "counter",
      sourceType: "context:calendar",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "They already have something that evening.",
      sourceRefs: [],
    });
  }
  // The answerer's own temperament is established here, because they are the
  // one deciding and a decision may rest on who they are.
  //
  // The asker's is not, and deliberately. Rows declared `about: "subject"`
  // read whatever this world has already recorded about the person asking,
  // which is an observation rather than a fact waiting to be established —
  // seeding it at the moment somebody needs it would manufacture the
  // observation exactly when it is convenient. It also broke: this scheduled
  // answer is evaluated against the world as of the moment it was scheduled,
  // so a record written now is not available to it and the decision refused
  // its own citation. An unrecorded asker contributes nothing, which is the
  // same answer the player gets before they have said who they are.
  const withTraits = ensurePeopleTraits(world, [to]);
  // Registered effects first: whatever the loaded packs say bears on
  // `contact.answer`. This decision names no trait, and a pack adding one
  // reaches it without this file changing.
  considerations.push(
    ...registeredTraitConsiderations(
      withTraits,
      traitRegistryFor(withTraits),
      to,
      `contact:${proposalEventId}`,
      CONTACT_ANSWER_DECISION.id,
      from,
    ),
  );
  const evaluation = evaluateDecision(withTraits, {
    stableKey: `contact:${proposalEventId}:answer`,
    decisionType: "people.contact-answer",
    actorPersonId: to,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "meeting-request", entityId: null },
    options: [
      { key: "accept", label: "Agree", description: "Meet them that day." },
      {
        key: "counter",
        label: "Offer another day",
        description: "Say when they could instead.",
      },
      {
        key: "decline",
        label: "Say no",
        description: "Leave it for another time.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  const answer = (evaluation.selectedOptionKey ?? "decline") as ContactAnswer;
  return {
    answer,
    counterOn: answer === "counter" ? addDays(on, 7) : null,
    world: withTraits,
  };
}

/**
 * Saying "not that day, but this one" — which is a real answer and a new
 * request in one move, so the other person still gets to say no.
 */
export function counterWithNewDay(
  world: World,
  input: {
    readonly proposalEventId: EntityId;
    readonly on: IsoDate;
    readonly note?: string;
  },
): World {
  const proposal = world.history.events.find(
    (event) => event.id === input.proposalEventId,
  );
  if (!proposal || proposal.type !== CONTACT_PROPOSED_EVENT) {
    throw new Error("That is not a meeting proposal.");
  }
  const answered = answerContact(world, {
    proposalEventId: input.proposalEventId,
    answer: "counter",
    counterOn: input.on,
    note: input.note,
  });
  const asker = proposal.participants.find(
    (entry) => entry.role === "agency:asked",
  )!.personId;
  const asked = proposal.participants.find(
    (entry) => entry.role === "focus:asked-of",
  )!.personId;
  return proposeContact(answered.world, {
    stableKey: `contact:${proposal.id}:counter-proposal`,
    fromPersonId: asked,
    toPersonId: asker,
    on: input.on,
    purpose: proposal.context.motivation ?? proposal.summary,
  }).world;
}

/**
 * A day that came and went with no answer.
 *
 * Silence is not agreement and not a refusal spoken out loud, but the evening
 * is gone either way. The record says exactly that, the hold comes off the
 * calendar, and the channel is free again.
 */
export function lapseStaleProposals(world: World): World {
  let next = world;
  for (const event of world.history.events) {
    if (event.type !== CONTACT_PROPOSED_EVENT) continue;
    const on = event.tags
      .find((tag) => tag.startsWith("contact.on:"))
      ?.slice("contact.on:".length);
    if (!on || on >= next.currentDate) continue;
    const answered = next.history.events.some(
      (candidate) =>
        [
          CONTACT_ACCEPTED_EVENT,
          CONTACT_COUNTERED_EVENT,
          CONTACT_DECLINED_EVENT,
        ].includes(candidate.type) &&
        candidate.tags.includes(`contact.proposal:${event.id}`),
    );
    if (answered) continue;
    const from = event.participants.find(
      (entry) => entry.role === "agency:asked",
    )!.personId;
    const to = event.participants.find(
      (entry) => entry.role === "focus:asked-of",
    )!.personId;
    if (!next.people[from] || !next.people[to]) continue;
    next = recordWorldEvent(next, {
      stableKey: `contact:${event.id}:lapsed`,
      type: CONTACT_DECLINED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: event.jurisdictionId,
      involvedEntityIds: [from, to],
      participants: [
        {
          personId: to,
          role: "agency:actor",
          detail: "Never answered",
        },
        { personId: from, role: "focus:asked-of", detail: "Had asked to meet" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [CONTACT_TAG, `contact.proposal:${event.id}`, "contact.lapsed"],
      summary: `The day ${personName(next.people[from]!)} suggested passed without an answer.`,
      context: {
        location: null,
        socialContext: "A plan that was never answered either way.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const meeting = meetingFor(next, event.id);
    if (
      meeting &&
      scheduledActivityState(next, meeting).status === "scheduled"
    ) {
      next = cancelScheduledActivity(next, meeting);
    }
  }
  return next;
}

/** Days between one NPC reaching out and the next one doing so. */
const REACH_OUT_SPACING_DAYS = 45;
/**
 * How long the same person leaves it before asking again.
 *
 * Somebody who called in the spring does not call again in the summer to ask
 * the same thing. The global spacing keeps the player's life from filling up
 * with invitations; this keeps one person from being the one who fills it.
 */
const REACH_OUT_PAIR_SPACING_DAYS = 240;
/**
 * After this many unanswered attempts, they stop asking.
 *
 * Not a decayed friendship — nothing here decays, and they would still answer
 * if the player called tomorrow. It is the ordinary fact that people stop
 * being the one who rings when the ringing is never returned.
 */
const REACH_OUT_UNANSWERED_LIMIT = 2;
/** How far ahead somebody suggests meeting when they call. */
const REACH_OUT_NOTICE_DAYS = 9;

/**
 * Somebody decides, on their own, to get back in touch (CRUNCH47 B1, P3).
 *
 * Their reason is in the world: the two of them have history and have not seen
 * each other for a long time. Whether they act on it is their decision, made
 * the same way any NPC decision is made, and it happens while ordinary time
 * passes — the player never has to open their page for it to occur.
 */
/** Proposals this person made to the player, oldest first. */
function proposalsFrom(
  world: World,
  playerPersonId: EntityId,
  otherPersonId: EntityId,
): readonly HistoricalEvent[] {
  return world.history.events.filter(
    (event) =>
      event.type === CONTACT_PROPOSED_EVENT &&
      event.involvedEntityIds.includes(playerPersonId) &&
      event.participants.some(
        (entry) =>
          entry.role === "agency:asked" && entry.personId === otherPersonId,
      ),
  );
}

/** Whether this same person has asked recently enough to leave it alone. */
function askedRecently(
  world: World,
  playerPersonId: EntityId,
  otherPersonId: EntityId,
): boolean {
  const last = proposalsFrom(world, playerPersonId, otherPersonId).at(-1);
  return (
    !!last &&
    last.occurredAt > addDays(world.currentDate, -REACH_OUT_PAIR_SPACING_DAYS)
  );
}

/**
 * Whether they have stopped being the one who asks.
 *
 * Counts only attempts that went unanswered and were never followed by the two
 * of them actually arranging something, so a person who is answered is never
 * silenced by their own history.
 */
function stoppedAsking(
  world: World,
  playerPersonId: EntityId,
  otherPersonId: EntityId,
): boolean {
  const proposals = proposalsFrom(world, playerPersonId, otherPersonId);
  if (proposals.length < REACH_OUT_UNANSWERED_LIMIT) return false;
  const answered = world.history.events.some(
    (event) =>
      event.type === CONTACT_ACCEPTED_EVENT &&
      event.involvedEntityIds.includes(playerPersonId) &&
      event.involvedEntityIds.includes(otherPersonId),
  );
  if (answered) return false;
  const lapsed = proposals.filter((proposal) =>
    world.history.events.some(
      (event) => event.stableKey === `contact:${proposal.id}:lapsed`,
    ),
  );
  return lapsed.length >= REACH_OUT_UNANSWERED_LIMIT;
}

export function produceReachingOut(
  inputWorld: World,
  playerPersonId: EntityId,
): World {
  let world = inputWorld;
  world = lapseStaleProposals(world);
  const recent = world.history.events.some(
    (event) =>
      event.type === CONTACT_PROPOSED_EVENT &&
      event.occurredAt > addDays(world.currentDate, -REACH_OUT_SPACING_DAYS) &&
      event.involvedEntityIds.includes(playerPersonId),
  );
  if (recent) return world;
  const on = addDays(world.currentDate, REACH_OUT_NOTICE_DAYS);
  for (const basis of contactBases(world, playerPersonId)) {
    if (basis.gap !== "long-gap" && basis.gap !== "reconnected") continue;
    if (!basis.lastContactOn) continue;
    if (openProposal(world, playerPersonId, basis.personId)) continue;
    if (askedRecently(world, playerPersonId, basis.personId)) continue;
    if (stoppedAsking(world, playerPersonId, basis.personId)) continue;
    const withTraits = ensurePeopleTraits(world, [basis.personId]);
    const considerations: DecisionConsideration[] = [
      ...traitConsiderations(
        withTraits,
        basis.personId,
        `reach-out:${playerPersonId}:${world.currentDate}`,
        [
          {
            optionKey: "get-in-touch",
            trait: "sociability",
            pole: "high",
            explanation: "They are the one who picks up the phone.",
          },
          {
            optionKey: "leave-it",
            trait: "sociability",
            pole: "low",
            explanation: "They wait to be called.",
          },
          {
            optionKey: "get-in-touch",
            trait: "reliability",
            pole: "high",
            explanation: "They keep up with people.",
          },
        ],
      ),
    ];
    if (considerations.length === 0) continue;
    const evaluation = evaluateDecision(withTraits, {
      stableKey: `reach-out:${basis.personId}:${playerPersonId}:${world.currentDate}`,
      decisionType: "people.reach-out",
      actorPersonId: basis.personId,
      cutoff: {
        asOfDate: withTraits.currentDate,
        historySequenceExclusive: withTraits.history.nextSequence,
      },
      subject: { kind: "context:life", key: "old-friend", entityId: null },
      options: [
        {
          key: "get-in-touch",
          label: "Get in touch",
          description: "Ask whether they want to meet.",
        },
        {
          key: "leave-it",
          label: "Leave it",
          description: "Another time, maybe.",
        },
      ],
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "close-choices",
      retention: "ephemeral",
    });
    if (evaluation.selectedOptionKey !== "get-in-touch") continue;
    return proposeContact(withTraits, {
      stableKey: `reach-out:${basis.personId}:${playerPersonId}:${world.currentDate}`,
      fromPersonId: basis.personId,
      toPersonId: playerPersonId,
      on,
      purpose: "Catch up, after a long while",
      answerInPerson: true,
    }).world;
  }
  return world;
}

export function contactAnswerTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== CONTACT_ANSWER_TRANSITION_KEY) {
    throw new Error("The contact answer received another transition.");
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
  const proposalId = dueItem.entityIds.find((id) =>
    world.history.events.some(
      (event) => event.id === id && event.type === CONTACT_PROPOSED_EVENT,
    ),
  );
  if (!proposalId) return done("proposal-missing");
  const proposal = world.history.events.find(
    (event) => event.id === proposalId,
  )!;
  const to = proposal.participants.find(
    (entry) => entry.role === "focus:asked-of",
  )!.personId;
  const from = proposal.participants.find(
    (entry) => entry.role === "agency:asked",
  )!.personId;
  if (!alive(world, to) || !alive(world, from)) return done("person-gone");
  if (
    contactProposals(world, from).find((entry) => entry.eventId === proposalId)
      ?.answered
  ) {
    return done("already-answered");
  }
  const decided = npcContactAnswer(world, proposalId);
  const answered = answerContact(decided.world, {
    proposalEventId: proposalId,
    answer: decided.answer,
    counterOn: decided.counterOn ?? undefined,
  });
  return done(`contact-${decided.answer}`, answered.world, answered.eventId);
}

export const PEOPLE_CONTACT_HANDLERS: FutureTransitionHandlerRegistry =
  createFutureTransitionHandlerRegistry([
    [CONTACT_ANSWER_TRANSITION_KEY, contactAnswerTransitionHandler],
  ]);
