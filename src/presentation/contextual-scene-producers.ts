import { wasRefused } from "../simulation/scheduled-activity-answer";
import {
  ensurePeopleTraits,
  traitConsiderations,
} from "../simulation/people-traits";
import {
  addDays,
  ageOnDate,
  campaignForCandidate,
  campaignState,
  compareSimulationMoments,
  personName,
  scheduledActivityState,
} from "../simulation";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  LegislativeCommitmentRecord,
  World,
} from "../simulation";
import { commitmentPromisee } from "../simulation/claim-contradictions";
import { evaluateDecision } from "../simulation/decisions";
import { lifeRequestDetails } from "../simulation/life-request-details";
import { LIFE_CALLBACK_EVENT } from "../simulation/life-callbacks";
import { offerBereavementScene } from "../simulation/people-bereavement";
import {
  contactBases,
  contactProposals,
  produceReachingOut,
} from "../simulation/people-contact";
import { requestBehindCallback } from "../simulation/people-recall";
import {
  studyAnswered,
  studyCollaborators,
  studyPeers,
} from "../simulation/people-study";
import {
  lastStudyPlanOpenEventId,
  studyApproach,
  studyCollaborationEventId,
  studyPlanProposals,
  studyPlanResting,
  studyPlanSettled,
} from "../simulation/people-study-plan";
import {
  LIFE_OPPORTUNITY_TAG_PREFIX,
  lifeOpportunitiesFor,
} from "../simulation/life-opportunities";
import {
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  organizationProfileAt,
  workStatusHistory,
} from "../simulation/life-queries";
import {
  CHAPTER_ACCEPTED_EVENT,
  CHAPTER_INVITATION_EVENT,
  CHAPTER_MEETING_ATTENDED_EVENT,
  canJoinPartyChapter,
  homePartyChapters,
  projectPartyEncounters,
} from "../simulation/living-world/party-chapters";
import { describePersonContext } from "../simulation/person-context";
import { currentJournalists } from "../simulation/press-reach";
import { recordClaim, recordEventKnowledge } from "../simulation/records";
import {
  SCENE_BINDING_REF_TAG_PREFIX,
  recordSceneBinding,
  sceneAlreadyBound,
  sceneBindingsFor,
  type SceneBinding,
} from "../simulation/scene-bindings";
import { recordWorldEvent } from "../simulation/world";
import { adultSituationOpen } from "./adult-life";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { listOfficeStaff } from "./office-onboarding";
import { householdConversationRoom } from "./ordinary-life";
import { formatMinute } from "./player-calendar";

/**
 * Where contextual scenes come from (PROSE B).
 *
 * Each producer looks for one real situation — an evening already spoken for,
 * an open request, an organizer's invitation, a decided election, a pending
 * bill with a staff member on it, a promise a reporter heard about — and
 * writes one binding for it, once. It invents no person, request, event or
 * relationship. Where the world has none, it writes nothing, which is the
 * common case: these are situations, not a daily quota.
 *
 * Called when ordinary days actually pass, never from a read and never when a
 * life is opened (that would move every later record's identity). The binding
 * is saved before any of its text can be shown.
 */

const HOME_EVENING_LOOKAHEAD_DAYS = 3;
const HOME_EVENING_EARLIEST_MINUTE = 17 * 60;
/** Pacing, not a quota: an evening question at most this often. */
const HOME_EVENING_SPACING_DAYS = 10;
const CAMPAIGN_REACTION_WINDOW_DAYS = 7;
const REPORTER_PROMISE_WINDOW_DAYS = 30;
const STAFF_MEASURE_WINDOW_DAYS = 60;

type Producer = (world: World, personId: EntityId) => World;

export function refreshContextualScenes(
  world: World,
  personId: EntityId,
): World {
  if (world.control.kind !== "person" || world.control.personId !== personId) {
    return world;
  }
  const person = world.people[personId];
  if (!person || ageOnDate(person.birthDate, world.currentDate) < 18) {
    return world;
  }
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  ) {
    return world;
  }
  const producers: readonly Producer[] = [
    offerBereavementScene,
    produceHomeEvening,
    produceRecalledRequest,
    produceStudyPeer,
    produceStudyPlan,
    produceFavor,
    // Last of the request scenes: while somebody is waiting on an answer about
    // meeting, that is the conversation this family is holding.
    produceMeetUp,
    producePartyInvite,
    produceCampaignReaction,
    produceStaffFollowup,
    produceReporterQuestion,
  ];
  let next = world;
  for (const produce of producers) {
    try {
      next = produce(next, personId);
    } catch {
      // A producer that cannot bind its situation writes nothing; the scene
      // is simply not offered. It never blocks time or another family.
    }
  }
  return next;
}

function relationshipLabel(
  world: World,
  playerId: EntityId,
  otherId: EntityId,
): string | null {
  return describePersonContext(world, playerId, otherId)?.relationship ?? null;
}

function adultHousemates(
  world: World,
  personId: EntityId,
): {
  readonly jurisdictionId: EntityId;
  readonly ids: readonly EntityId[];
} | null {
  const room = householdConversationRoom(world, personId);
  if (!room) return null;
  const ids = room.eligibleAddresseePersonIds.filter((id) => {
    const other = world.people[id];
    return other && ageOnDate(other.birthDate, world.currentDate) >= 18;
  });
  return ids.length > 0 ? { jurisdictionId: room.jurisdictionId, ids } : null;
}

function partnerAmong(
  world: World,
  personId: EntityId,
  ids: readonly EntityId[],
): EntityId | null {
  for (const partnership of activePartnershipsAt(world, personId)) {
    const other = partnership.personIds.find((id) => id !== personId);
    if (other && ids.includes(other)) return other;
  }
  return null;
}

/* 1. An evening already spoken for ----------------------------------------- */

function produceHomeEvening(world: World, personId: EntityId): World {
  const home = adultHousemates(world, personId);
  if (!home) return world;
  const promised = producePromisedEvening(world, personId, home);
  if (promised !== world) return promised;
  // A death in the family is what the room is about this week. Nobody asks
  // about the calendar over the top of it.
  const grieving = sceneBindingsFor(world, personId, "home-evening").some(
    (entry) =>
      entry.binding.variant === "bereaved" &&
      entry.binding.expiresAt > world.currentDate,
  );
  if (grieving) return world;
  // Only an evening question that was actually talked through spaces the
  // next one; one that lapsed unanswered leaves nothing to space from.
  const recent = sceneBindingsFor(world, personId, "home-evening").some(
    (entry) =>
      entry.binding.variant !== "claim-came-back" &&
      addDays(entry.boundAt, HOME_EVENING_SPACING_DAYS) > world.currentDate &&
      world.history.events.some((event) =>
        event.tags.includes(`${SCENE_BINDING_REF_TAG_PREFIX}${entry.eventId}`),
      ),
  );
  if (recent) return world;
  const partner = partnerAmong(world, personId, home.ids);
  const speakerId = partner ?? home.ids[0]!;
  const horizon = addDays(world.currentDate, HOME_EVENING_LOOKAHEAD_DAYS);
  const candidates = world.history.scheduledActivities
    .filter(
      (activity) =>
        (activity.kind === "confirmed" || activity.kind === "tentative") &&
        activity.participantPersonIds.includes(personId) &&
        !activity.participantPersonIds.includes(speakerId) &&
        !isRequestOccasion(world, activity.sourceEntityIds),
    )
    .map((activity) => ({
      activity,
      state: scheduledActivityState(world, activity.id),
    }))
    .filter(
      ({ state }) =>
        state.status === "scheduled" &&
        state.start.date >= world.currentDate &&
        state.start.date <= horizon &&
        state.start.minuteOfDay >= HOME_EVENING_EARLIEST_MINUTE &&
        compareSimulationMoments(state.start, world.currentMoment) > 0,
    )
    .sort((left, right) =>
      compareSimulationMoments(left.state.start, right.state.start),
    );
  const chosen = candidates.find(
    ({ activity }) =>
      !sceneAlreadyBound(
        world,
        personId,
        "home-evening",
        activity.kind === "confirmed" ? "committed-evening" : "open-evening",
        activity.id,
      ),
  );
  if (!chosen) return world;
  const { activity, state } = chosen;
  const invitation = sourceInvitation(world, activity.sourceEntityIds);
  const organizerId = invitation?.participants.find(
    (entry) => entry.role === "agency:asked",
  )?.personId;
  const facts: Record<string, string> = {
    activityTitle: activity.title,
    startTime: formatMinute(state.start.minuteOfDay),
  };
  if (partner) facts.partner = "yes";
  if (invitation) facts.openToGuests = "yes";
  if (organizerId && world.people[organizerId]) {
    facts.organizer = personName(world.people[organizerId]!);
  }
  const binding: SceneBinding = {
    version: 1,
    family: "home-evening",
    variant:
      activity.kind === "confirmed" ? "committed-evening" : "open-evening",
    playerPersonId: personId,
    speakerPersonId: speakerId,
    relationship: relationshipLabel(world, personId, speakerId),
    place: "Home",
    jurisdictionId: home.jurisdictionId,
    request: `Whether the player will be home the evening of ${state.start.date}.`,
    sourceEntityIds: [activity.id, ...(invitation ? [invitation.id] : [])],
    facts,
    knownRecordIds: [],
    target: activity.title,
    date: state.start.date,
    expiresAt: state.start.date,
  };
  return recordSceneBinding(
    world,
    binding,
    `${personName(world.people[speakerId]!)} is wondering about ${state.start.date}.`,
  );
}

/**
 * An occasion somebody asked the player to — an evening in, a Saturday
 * invitation — is the request's own calendar entry, not a plan to ask about.
 */
function isRequestOccasion(
  world: World,
  sourceIds: readonly EntityId[],
): boolean {
  return world.history.events.some(
    (event) =>
      sourceIds.includes(event.id) &&
      event.tags.some((tag) => tag.startsWith(LIFE_OPPORTUNITY_TAG_PREFIX)),
  );
}

const QUIET_EVENING_KEY = "adult.household-quiet-evening";
/** How close another plan may end to the promised evening and still clash. */
const EVENING_CLASH_MINUTES = 60;

/**
 * "You said you'd be home tonight." Bound only when the record holds both
 * halves: the player agreed today to spend the evening with a housemate, and
 * another plan of the player's the same evening runs into it.
 */
function producePromisedEvening(
  world: World,
  personId: EntityId,
  home: {
    readonly jurisdictionId: EntityId;
    readonly ids: readonly EntityId[];
  },
): World {
  const promise = world.history.events
    .filter(
      (event) =>
        event.occurredAt === world.currentDate &&
        event.tags.includes(QUIET_EVENING_KEY) &&
        event.tags.includes("choice.spend-it-together") &&
        event.participants.some(
          (entry) =>
            entry.personId === personId && entry.role === "agency:actor",
        ),
    )
    .at(-1);
  if (!promise) return world;
  const speakerId = promise.participants.find(
    (entry) => entry.role === "presence:participant",
  )?.personId;
  if (!speakerId || !home.ids.includes(speakerId)) return world;
  const occasion = world.history.scheduledActivities
    .filter(
      (activity) =>
        activity.participantPersonIds.includes(personId) &&
        isRequestOccasion(world, activity.sourceEntityIds),
    )
    .map((activity) => ({
      activity,
      state: scheduledActivityState(world, activity.id),
    }))
    .find(
      ({ state }) =>
        state.status === "scheduled" && state.start.date === world.currentDate,
    );
  if (!occasion) return world;
  const clash = world.history.scheduledActivities
    .filter(
      (activity) =>
        (activity.kind === "confirmed" || activity.kind === "tentative") &&
        activity.id !== occasion.activity.id &&
        activity.participantPersonIds.includes(personId) &&
        !activity.participantPersonIds.includes(speakerId) &&
        !isRequestOccasion(world, activity.sourceEntityIds),
    )
    .map((activity) => ({
      activity,
      state: scheduledActivityState(world, activity.id),
    }))
    .find(
      ({ state }) =>
        state.status === "scheduled" &&
        state.start.date === world.currentDate &&
        compareSimulationMoments(state.start, world.currentMoment) >= 0 &&
        state.start.minuteOfDay < occasion.state.end.minuteOfDay &&
        state.end.minuteOfDay + EVENING_CLASH_MINUTES >
          occasion.state.start.minuteOfDay,
    );
  if (!clash) return world;
  if (
    sceneAlreadyBound(
      world,
      personId,
      "home-evening",
      "promised-evening",
      clash.activity.id,
    )
  ) {
    return world;
  }
  const { activity, state } = clash;
  const invitation = sourceInvitation(world, activity.sourceEntityIds);
  const organizerId = invitation?.participants.find(
    (entry) => entry.role === "agency:asked",
  )?.personId;
  const created = world.history.scheduledActivityStates.find(
    (record) => record.activityId === activity.id,
  );
  const facts: Record<string, string> = {
    activityTitle: activity.title,
    activityKind: activity.kind,
    startTime: formatMinute(state.start.minuteOfDay),
    endTime: formatMinute(state.end.minuteOfDay),
    promisedTime: formatMinute(occasion.state.start.minuteOfDay),
  };
  if (created && created.sequence < promise.sequence) {
    facts.committedFirst = "yes";
  }
  if (invitation) facts.openToGuests = "yes";
  if (organizerId && world.people[organizerId]) {
    facts.organizer = personName(world.people[organizerId]!);
  }
  if (partnerAmong(world, personId, [speakerId])) facts.partner = "yes";
  return recordSceneBinding(
    world,
    {
      version: 1,
      family: "home-evening",
      variant: "promised-evening",
      playerPersonId: personId,
      speakerPersonId: speakerId,
      relationship: relationshipLabel(world, personId, speakerId),
      place: "Home",
      jurisdictionId: home.jurisdictionId,
      request: `Whether the player is still going to the ${activity.title} after agreeing to spend the evening at home.`,
      sourceEntityIds: [
        activity.id,
        promise.id,
        ...(invitation ? [invitation.id] : []),
      ],
      facts,
      knownRecordIds: [promise.id],
      target: activity.title,
      date: state.start.date,
      expiresAt: state.start.date,
    },
    `${personName(world.people[speakerId]!)} is asking about tonight.`,
  );
}

/** The chapter invitation behind a meeting, when that is what it is. */
function sourceInvitation(
  world: World,
  sourceIds: readonly EntityId[],
): HistoricalEvent | null {
  return (
    world.history.events.find(
      (event) =>
        event.type === CHAPTER_INVITATION_EVENT && sourceIds.includes(event.id),
    ) ?? null
  );
}

/* 2. A request somebody actually made -------------------------------------- */

const FAVOR_KINDS = {
  "favour-request": { situation: "adult.friend-favour", place: "By phone" },
  "extra-hours-request": {
    situation: "adult.work-extra-hours",
    place: "At work",
  },
  "household-evening": { situation: QUIET_EVENING_KEY, place: "Home" },
} as const;

/** Days after the asker raises it again that the scene stays answerable. */
const RECALL_WINDOW_DAYS = 3;

/**
 * "You said you'd look at that." The request comes back because the person who
 * made it chose to raise it, which the callback handler has already decided and
 * written. Nothing here reopens an issue on its own.
 */
function produceRecalledRequest(world: World, personId: EntityId): World {
  const from = addDays(world.currentDate, -RECALL_WINDOW_DAYS);
  for (const callback of world.history.events) {
    if (
      callback.type !== LIFE_CALLBACK_EVENT ||
      callback.occurredAt < from ||
      !callback.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    if (sceneAlreadyBound(world, personId, "favor", "recalled", callback.id)) {
      continue;
    }
    const entry = requestBehindCallback(world, personId, callback);
    if (!entry || entry.status === "cancelled") continue;
    const speaker = world.people[entry.counterpartPersonId];
    if (!speaker) continue;
    const facts: Record<string, string> = {
      task: entry.task,
      speakerGiven: speaker.givenName,
      askedOn: entry.askedOn,
      status: entry.status,
      requestEventId: entry.requestEventId,
    };
    if (entry.answeredOn) facts.answeredOn = entry.answeredOn;
    if (entry.conditions) facts.condition = entry.conditions;
    return recordSceneBinding(
      world,
      {
        version: 1,
        family: "favor",
        variant: "recalled",
        playerPersonId: personId,
        speakerPersonId: speaker.id,
        relationship: relationshipLabel(world, personId, speaker.id),
        place: "By phone",
        jurisdictionId:
          callback.jurisdictionId ?? world.people[personId]!.homeJurisdictionId,
        request: `What became of ${entry.task}.`,
        sourceEntityIds: [callback.id, entry.requestEventId],
        facts,
        knownRecordIds: [entry.requestEventId],
        target: entry.task,
        date: entry.askedOn,
        expiresAt: addDays(callback.occurredAt, 14),
      },
      `${personName(speaker)} raised the earlier request again.`,
    );
  }
  return world;
}

/**
 * An old friend who got back in touch, and the answer the player owes them.
 *
 * The reaching out is the world's: it happens while time passes, whether or
 * not the player ever opened that person's page. What is bound here is only
 * the conversation it deserves.
 */
function produceMeetUp(world: World, personId: EntityId): World {
  const reached = produceReachingOut(world, personId);
  const open = contactProposals(reached, personId).find(
    (proposal) => !proposal.answered && proposal.toPersonId === personId,
  );
  if (!open) return reached;
  if (sceneAlreadyBound(reached, personId, "favor", "meet-up", open.eventId)) {
    return reached;
  }
  const speaker = reached.people[open.fromPersonId];
  if (!speaker) return reached;
  const basis = contactBases(reached, personId).find(
    (entry) => entry.personId === open.fromPersonId,
  );
  const facts: Record<string, string> = {
    speakerGiven: speaker.givenName,
    purpose: open.purpose,
  };
  if (basis?.lastContactOn) facts.lastContactOn = basis.lastContactOn;
  return recordSceneBinding(
    reached,
    {
      version: 1,
      family: "favor",
      variant: "meet-up",
      playerPersonId: personId,
      speakerPersonId: speaker.id,
      relationship: relationshipLabel(reached, personId, speaker.id),
      place: "By phone",
      jurisdictionId: reached.people[personId]!.homeJurisdictionId,
      request: `Whether to meet ${personName(speaker)} on ${open.on}.`,
      sourceEntityIds: [open.eventId],
      facts,
      knownRecordIds: [open.eventId],
      target: null,
      date: open.on,
      expiresAt: open.on,
    },
    `${personName(speaker)} asked to meet.`,
  );
}

/**
 * Somebody on the same programme asks about working together (F47.1).
 *
 * Bound only from records: the player's own active enrollment and another
 * person actually enrolled on it. No class, no group and no classmate is
 * invented, so a life with no studies simply never sees this.
 */
function produceStudyPeer(world: World, personId: EntityId): World {
  for (const peer of studyPeers(world, personId)) {
    if (studyAnswered(world, personId, peer.personId)) continue;
    if (
      sceneAlreadyBound(
        world,
        personId,
        "study-peer",
        "coursework",
        peer.personId,
      )
    ) {
      continue;
    }
    return recordSceneBinding(
      world,
      {
        version: 1,
        family: "study-peer",
        variant: "coursework",
        playerPersonId: personId,
        speakerPersonId: peer.personId,
        relationship: relationshipLabel(world, personId, peer.personId),
        place: "After a class",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: `Whether to work with ${peer.name} on the coursework.`,
        sourceEntityIds: [peer.personId, peer.organizationId],
        facts: {
          peerGiven: peer.givenName,
          programName: peer.programName,
        },
        knownRecordIds: [],
        target: null,
        date: null,
        expiresAt: addDays(world.currentDate, 30),
      },
      `${peer.name} asked about working together.`,
    );
  }
  return world;
}

/**
 * Having agreed to work together, deciding how (F47.1, edu-disagreement).
 *
 * Two bindings from the same records. First, neither of them has said how they
 * want to work. Then, if they want different things, the disagreement itself —
 * bound from the two proposals that are actually on the record, never from a
 * difference invented for the occasion.
 *
 * A question they left open comes back on its own once it has rested, and each
 * time it comes back it is bound against the record of it being left open, so
 * the same argument is never offered twice in the same week.
 */
function produceStudyPlan(world: World, personId: EntityId): World {
  for (const peerId of studyCollaborators(world, personId)) {
    if (studyPlanSettled(world, personId, peerId)) continue;
    const collaborationId = studyCollaborationEventId(world, personId, peerId);
    if (!collaborationId) continue;
    const peer = world.people[peerId];
    if (!peer) continue;
    const proposals = studyPlanProposals(world, personId, peerId);
    if (!proposals) {
      if (
        sceneAlreadyBound(
          world,
          personId,
          "study-plan",
          "proposal",
          collaborationId,
        )
      ) {
        continue;
      }
      return recordSceneBinding(
        world,
        {
          version: 1,
          family: "study-plan",
          variant: "proposal",
          playerPersonId: personId,
          speakerPersonId: peerId,
          relationship: relationshipLabel(world, personId, peerId),
          place: "Before the work starts",
          jurisdictionId: world.people[personId]!.homeJurisdictionId,
          request: `How to do the shared work with ${personName(peer)}.`,
          sourceEntityIds: [collaborationId],
          facts: { peerGiven: peer.givenName },
          knownRecordIds: [collaborationId],
          target: null,
          date: null,
          expiresAt: addDays(world.currentDate, 30),
        },
        `${personName(peer)} asked how you want to do the work.`,
      );
    }
    // The same approach twice is not a disagreement, and is not offered as one.
    if (proposals.mine === proposals.theirs) continue;
    if (studyPlanResting(world, personId, peerId)) continue;
    const mine = studyApproach(proposals.mine);
    const theirs = studyApproach(proposals.theirs);
    if (!mine || !theirs) continue;
    // Each return to the question is bound against the record of leaving it
    // open, so it is a later follow-up rather than the same scene again.
    const openedId = lastStudyPlanOpenEventId(world, personId, peerId);
    const against = openedId ?? collaborationId;
    if (
      sceneAlreadyBound(world, personId, "study-plan", "disagreement", against)
    ) {
      continue;
    }
    return recordSceneBinding(
      world,
      {
        version: 1,
        family: "study-plan",
        variant: "disagreement",
        playerPersonId: personId,
        speakerPersonId: peerId,
        relationship: relationshipLabel(world, personId, peerId),
        place: "Before the work starts",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
        request: `Whether to ${mine.label} or ${theirs.label}.`,
        sourceEntityIds: [against, collaborationId],
        facts: {
          peerGiven: peer.givenName,
          myApproach: mine.label,
          theirApproach: theirs.label,
        },
        knownRecordIds: [collaborationId],
        target: null,
        date: null,
        expiresAt: addDays(world.currentDate, 30),
      },
      `${personName(peer)} wants to ${theirs.label}.`,
    );
  }
  return world;
}

function produceFavor(world: World, personId: EntityId): World {
  for (const opportunity of lifeOpportunitiesFor(world, personId)) {
    const kind = opportunity.kind as keyof typeof FAVOR_KINDS;
    const shape = FAVOR_KINDS[kind];
    if (!shape || !opportunity.counterpartPersonId) continue;
    if (
      sceneAlreadyBound(world, personId, "favor", kind, opportunity.eventId)
    ) {
      continue;
    }
    if (!adultSituationOpen(world, personId, shape.situation)) continue;
    const event = world.history.events.find(
      (entry) => entry.id === opportunity.eventId,
    );
    const details = event ? lifeRequestDetails(event) : null;
    const speaker = world.people[opportunity.counterpartPersonId];
    if (!event || !details || !speaker) continue;
    const facts: Record<string, string> = {
      task: details.task,
      opening: details.opening,
      speakerGiven: speaker.givenName,
    };
    if (details.condition) facts.condition = details.condition;
    if (details.minutes) facts.minutes = String(details.minutes);
    if (kind === "household-evening") {
      const occasion = world.history.scheduledActivities.find((activity) =>
        activity.sourceEntityIds.includes(event.id),
      );
      if (!occasion) continue;
      facts.startTime = formatMinute(
        scheduledActivityState(world, occasion.id).start.minuteOfDay,
      );
    }
    return recordSceneBinding(
      world,
      {
        version: 1,
        family: "favor",
        variant: kind,
        playerPersonId: personId,
        speakerPersonId: speaker.id,
        relationship: relationshipLabel(world, personId, speaker.id),
        place: shape.place,
        jurisdictionId:
          event.jurisdictionId ?? world.people[personId]!.homeJurisdictionId,
        request: details.task,
        sourceEntityIds: [event.id],
        facts,
        knownRecordIds: [event.id],
        target: details.task,
        date: null,
        expiresAt: addDays(world.currentDate, 21),
      },
      `${personName(speaker)} has a request.`,
    );
  }
  return world;
}

/* 3. An organizer's invitation --------------------------------------------- */

function producePartyInvite(world: World, personId: EntityId): World {
  for (const produce of [
    produceChapterInvitation,
    produceChapterJoinAsk,
    produceChapterAfterDecline,
  ]) {
    const next = produce(world, personId);
    if (next !== world) return next;
  }
  return world;
}

const PARTY_FOLLOW_UP_WINDOW_DAYS = 3;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** The home chapter an invitation event came from. */
function chapterOfInvitation(world: World, invitation: HistoricalEvent) {
  return (
    homePartyChapters(world).find((chapter) =>
      invitation.involvedEntityIds.includes(chapter.organizationId),
    ) ?? null
  );
}

/** "Thanks for coming. Want to join?" — after a meeting the player attended. */
function produceChapterJoinAsk(world: World, personId: EntityId): World {
  const from = addDays(world.currentDate, -PARTY_FOLLOW_UP_WINDOW_DAYS);
  for (const attended of world.history.events) {
    if (
      attended.type !== CHAPTER_MEETING_ATTENDED_EVENT ||
      attended.occurredAt < from ||
      !attended.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    const invitationId = attended.tags
      .find((tag) => tag.startsWith("invitation:"))
      ?.slice("invitation:".length);
    const invitation = world.history.events.find(
      (event) => event.id === invitationId,
    );
    const chapter = invitation ? chapterOfInvitation(world, invitation) : null;
    if (!chapter?.organizerPersonId) continue;
    const organizer = world.people[chapter.organizerPersonId];
    if (!organizer) continue;
    if (!canJoinPartyChapter(world, personId, chapter.organizationId)) continue;
    if (
      sceneAlreadyBound(
        world,
        personId,
        "party-invite",
        "join-ask",
        attended.id,
      )
    ) {
      continue;
    }
    return recordSceneBinding(
      world,
      {
        version: 1,
        family: "party-invite",
        variant: "join-ask",
        playerPersonId: personId,
        speakerPersonId: organizer.id,
        relationship: relationshipLabel(world, personId, organizer.id),
        place: "By phone",
        jurisdictionId: chapter.jurisdictionId,
        request: `Whether the player wants to join the ${chapter.name}.`,
        sourceEntityIds: [attended.id, chapter.organizationId],
        facts: { chapterName: chapter.name },
        knownRecordIds: [attended.id],
        target: chapter.name,
        date: null,
        expiresAt: addDays(attended.occurredAt, 14),
      },
      `${personName(organizer)} is following up after the meeting.`,
    );
  }
  return world;
}

/** "No problem about the meeting." — after an invitation declined or let go. */
function produceChapterAfterDecline(world: World, personId: EntityId): World {
  const from = addDays(world.currentDate, -PARTY_FOLLOW_UP_WINDOW_DAYS);
  for (const declined of world.history.events) {
    if (
      (declined.type !== "life.scheduled-activity-declined" &&
        declined.type !== "life.social-invitation-declined") ||
      declined.occurredAt < from ||
      !declined.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    const meeting = world.history.scheduledActivities.find((activity) =>
      declined.involvedEntityIds.includes(activity.id),
    );
    // The organizer says "no problem about the meeting", which only makes
    // sense once the player has actually said no. A hold the clock ran past
    // writes no record of this kind at all now, and a record old enough that
    // the two cannot be told apart is not evidence of a refusal, so no scene
    // is produced from it. Better silence than an organizer thanking somebody
    // for an answer they never gave.
    if (meeting && !wasRefused(world, [meeting.id])) continue;
    const invitation = meeting
      ? sourceInvitation(world, meeting.sourceEntityIds)
      : null;
    const chapter = invitation ? chapterOfInvitation(world, invitation) : null;
    if (!meeting || !chapter?.organizerPersonId) continue;
    const organizer = world.people[chapter.organizerPersonId];
    if (!organizer) continue;
    if (
      sceneAlreadyBound(
        world,
        personId,
        "party-invite",
        "after-decline",
        declined.id,
      )
    ) {
      continue;
    }
    const start = scheduledActivityState(world, meeting.id).start;
    const weekday =
      WEEKDAY_NAMES[new Date(`${start.date}T00:00:00Z`).getUTCDay()]!;
    return recordSceneBinding(
      world,
      {
        version: 1,
        family: "party-invite",
        variant: "after-decline",
        playerPersonId: personId,
        speakerPersonId: organizer.id,
        relationship: relationshipLabel(world, personId, organizer.id),
        place: "By phone",
        jurisdictionId: chapter.jurisdictionId,
        request: `How the player feels about ${chapter.name} meetings after not coming.`,
        sourceEntityIds: [declined.id, chapter.organizationId],
        facts: {
          chapterName: chapter.name,
          weekday,
          startTime: formatMinute(start.minuteOfDay),
        },
        knownRecordIds: [declined.id],
        target: chapter.name,
        date: null,
        expiresAt: addDays(declined.occurredAt, 7),
      },
      `${personName(organizer)} is checking in after the meeting.`,
    );
  }
  return world;
}

function produceChapterInvitation(world: World, personId: EntityId): World {
  for (const chapter of projectPartyEncounters(world, personId)) {
    if (!chapter.organizerPersonId) continue;
    const organizer = world.people[chapter.organizerPersonId];
    if (!organizer) continue;
    for (const entry of chapter.activities) {
      if (entry.state !== "offered") continue;
      if (
        sceneAlreadyBound(
          world,
          personId,
          "party-invite",
          "invitation",
          entry.invitationEventId,
        )
      ) {
        continue;
      }
      return recordSceneBinding(
        world,
        {
          version: 1,
          family: "party-invite",
          variant: "invitation",
          playerPersonId: personId,
          speakerPersonId: organizer.id,
          relationship: relationshipLabel(world, personId, organizer.id),
          place: "By phone",
          jurisdictionId: chapter.venue.jurisdictionId,
          request: `Come to the ${chapter.name} open meeting on ${entry.start.date}.`,
          sourceEntityIds: [entry.invitationEventId, entry.activityId],
          facts: {
            chapterName: chapter.name,
            startTime: formatMinute(entry.start.minuteOfDay),
            endTime: formatMinute(entry.end.minuteOfDay),
          },
          knownRecordIds: [entry.invitationEventId],
          target: entry.title,
          date: entry.start.date,
          expiresAt: entry.start.date,
        },
        `${personName(organizer)} is reaching out about an open meeting.`,
      );
    }
  }
  return world;
}

/* 4. After an election ----------------------------------------------------- */

function produceCampaignReaction(world: World, personId: EntityId): World {
  const home = adultHousemates(world, personId);
  if (!home) return world;
  for (const produce of [
    produceTookOffice,
    produceElectionResult,
    produceFiled,
  ]) {
    const next = produce(world, personId, home);
    if (next !== world) return next;
  }
  return world;
}

type Home = {
  readonly jurisdictionId: EntityId;
  readonly ids: readonly EntityId[];
};

/** "So you're really running?" — within a week of the player's filing. */
function produceFiled(world: World, personId: EntityId, home: Home): World {
  const campaign = campaignForCandidate(world, personId);
  if (!campaign || campaignState(world, campaign.id).status !== "active") {
    return world;
  }
  if (
    campaign.filedAt <
    addDays(world.currentDate, -CAMPAIGN_REACTION_WINDOW_DAYS)
  ) {
    return world;
  }
  if (
    sceneAlreadyBound(
      world,
      personId,
      "campaign-reaction",
      "filed",
      campaign.filingEventId,
    )
  ) {
    return world;
  }
  const contest = (world.history.electionContests ?? []).find(
    (record) => record.id === campaign.contestId,
  );
  if (!contest) return world;
  const partner = partnerAmong(world, personId, home.ids);
  const speakerId = partner ?? home.ids[0]!;
  const facts: Record<string, string> = {
    officeTitle: contest.office.title,
    filedAt: campaign.filedAt,
    electionDate: contest.electionDate,
  };
  if (partner) facts.partner = "yes";
  return recordSceneBinding(
    world,
    {
      version: 1,
      family: "campaign-reaction",
      variant: "filed",
      playerPersonId: personId,
      speakerPersonId: speakerId,
      relationship: relationshipLabel(world, personId, speakerId),
      place: "Home",
      jurisdictionId: home.jurisdictionId,
      request: `Whether the player is really running for ${contest.office.title}.`,
      sourceEntityIds: [campaign.filingEventId, campaign.id],
      facts,
      knownRecordIds: [campaign.filingEventId],
      target: contest.office.title,
      date: contest.electionDate,
      expiresAt: addDays(campaign.filedAt, CAMPAIGN_REACTION_WINDOW_DAYS),
    },
    `${personName(world.people[speakerId]!)} heard about the filing.`,
  );
}

/** "Big day." — within a week of an elected seat actually starting. */
function produceTookOffice(
  world: World,
  personId: EntityId,
  home: Home,
): World {
  const from = addDays(world.currentDate, -CAMPAIGN_REACTION_WINDOW_DAYS);
  for (const seat of world.history.workRelationships) {
    if (
      seat.personId !== personId ||
      seat.provenance.kind !== "simulated-event" ||
      seat.startedAt > world.currentDate ||
      seat.startedAt < from
    ) {
      continue;
    }
    const outcome = world.history.events.find(
      (event) =>
        seat.provenance.kind === "simulated-event" &&
        event.id === seat.provenance.eventId &&
        event.type === "election.contest-resolved",
    );
    if (!outcome) continue;
    const statuses = workStatusHistory(world, seat.id);
    if (statuses.at(-1)?.status !== "active") continue;
    // An office that merely existed from the day of the result is not a new
    // term beginning; only a dated entry after the result counts.
    if (seat.startedAt <= outcome.occurredAt) continue;
    if (
      sceneAlreadyBound(
        world,
        personId,
        "campaign-reaction",
        "took-office",
        seat.id,
      )
    ) {
      continue;
    }
    const contest = (world.history.electionContests ?? []).find((record) =>
      outcome.involvedEntityIds.includes(record.id),
    );
    if (!contest) continue;
    const partner = partnerAmong(world, personId, home.ids);
    const speakerId = partner ?? home.ids[0]!;
    const facts: Record<string, string> = {
      officeTitle: contest.office.title,
      termStart: seat.startedAt,
    };
    if (partner) facts.partner = "yes";
    return recordSceneBinding(
      world,
      {
        version: 1,
        family: "campaign-reaction",
        variant: "took-office",
        playerPersonId: personId,
        speakerPersonId: speakerId,
        relationship: relationshipLabel(world, personId, speakerId),
        place: "Home",
        jurisdictionId: home.jurisdictionId,
        request: "How the first day in office feels.",
        sourceEntityIds: [seat.id, outcome.id],
        facts,
        knownRecordIds: [outcome.id],
        target: contest.office.title,
        date: seat.startedAt,
        expiresAt: addDays(seat.startedAt, CAMPAIGN_REACTION_WINDOW_DAYS),
      },
      `${personName(world.people[speakerId]!)} is marking the first day in office.`,
    );
  }
  return world;
}

function produceElectionResult(
  world: World,
  personId: EntityId,
  home: Home,
): World {
  const from = addDays(world.currentDate, -CAMPAIGN_REACTION_WINDOW_DAYS);
  const results = world.history.events.filter(
    (event) =>
      event.type === "election.contest-resolved" &&
      event.occurredAt >= from &&
      event.participants.some((entry) => entry.personId === personId),
  );
  const result = results.at(-1);
  if (!result) return world;
  const won = result.participants.some(
    (entry) => entry.personId === personId && entry.role === "focus:winner",
  );
  const variant = won ? "won" : "lost";
  if (
    sceneAlreadyBound(world, personId, "campaign-reaction", variant, result.id)
  ) {
    return world;
  }
  const contest = (world.history.electionContests ?? []).find((record) =>
    result.involvedEntityIds.includes(record.id),
  );
  if (!contest) return world;
  const partner = partnerAmong(world, personId, home.ids);
  const speakerId = partner ?? home.ids[0]!;
  const seat = won
    ? world.history.workRelationships.find(
        (relationship) =>
          relationship.personId === personId &&
          relationship.provenance.kind === "simulated-event" &&
          relationship.provenance.eventId === result.id,
      )
    : undefined;
  const termStart =
    seat && seat.startedAt > result.occurredAt ? seat.startedAt : null;
  const facts: Record<string, string> = {
    officeTitle: contest.office.title,
  };
  if (partner) facts.partner = "yes";
  if (termStart) facts.termStart = termStart;
  return recordSceneBinding(
    world,
    {
      version: 1,
      family: "campaign-reaction",
      variant,
      playerPersonId: personId,
      speakerPersonId: speakerId,
      relationship: relationshipLabel(world, personId, speakerId),
      place: "Home",
      jurisdictionId: home.jurisdictionId,
      request: won
        ? `When the ${contest.office.title} term begins.`
        : "How the player is taking the result.",
      sourceEntityIds: [result.id, ...(seat ? [seat.id] : [])],
      facts,
      knownRecordIds: [result.id],
      target: null,
      date: termStart,
      expiresAt: addDays(result.occurredAt, CAMPAIGN_REACTION_WINDOW_DAYS),
    },
    `${personName(world.people[speakerId]!)} heard the election result.`,
  );
}

/* 5. Staff and a pending bill ---------------------------------------------- */

function produceStaffFollowup(world: World, personId: EntityId): World {
  const membership = resolveActiveMemberSeat(world, personId);
  if (membership.kind !== "seated") return world;
  const staff = listOfficeStaff(world, membership.seat, personId);
  const staffer = staff[0];
  if (!staffer) return world;
  const from = addDays(world.currentDate, -STAFF_MEASURE_WINDOW_DAYS);
  const decided = new Set([
    ...(world.history.legislativeEnactments ?? []).map((record) =>
      String((record as { measureId?: EntityId }).measureId),
    ),
    ...(world.history.executiveDispositions ?? []).map((record) =>
      String((record as { measureId?: EntityId }).measureId),
    ),
  ]);
  // A bill the member sponsors first; otherwise the latest one pending in
  // the member's own chamber, which is the work the office is watching.
  const pending = (world.history.legislativeMeasures ?? []).filter(
    (record) =>
      record.jurisdictionId === membership.seat.governingJurisdictionId &&
      record.introducedAt >= from &&
      !decided.has(record.id),
  );
  const measure =
    pending.filter((record) => record.sponsorPersonId === personId).at(-1) ??
    pending
      .filter(
        (record) => record.originChamberKey === membership.seat.chamberKey,
      )
      .at(-1);
  if (!measure) return world;
  if (
    sceneAlreadyBound(
      world,
      personId,
      "staff-followup",
      "pending-bill",
      measure.id,
    )
  ) {
    return world;
  }
  const summary = measure.summary.split(/(?<=\.)\s/)[0] ?? measure.summary;
  return recordSceneBinding(
    world,
    {
      version: 1,
      family: "staff-followup",
      variant: "pending-bill",
      playerPersonId: personId,
      speakerPersonId: staffer.personId,
      relationship: staffer.title,
      place: "Your office",
      jurisdictionId: membership.seat.governingJurisdictionId,
      request: `Who follows ${measure.designation}.`,
      sourceEntityIds: [measure.id],
      facts: {
        designation: measure.designation,
        shortTitle: measure.shortTitle,
        staffTitle: staffer.title,
        summary,
      },
      knownRecordIds: [measure.id],
      target: measure.designation,
      date: null,
      expiresAt: addDays(world.currentDate, 14),
    },
    `${staffer.name} has a question about ${measure.designation}.`,
  );
}

/* 6. A reporter who heard about a promise ---------------------------------- */

const STANCE_PHRASES: Partial<
  Record<LegislativeCommitmentRecord["stance"], string>
> = {
  support: "support",
  oppose: "oppose",
  "support-if": "support, with conditions,",
  "oppose-unless": "oppose, unless it changed,",
  "cosponsor-if-amended": "cosponsor, if amended,",
  "offer-amendment": "offer an amendment to",
  "withdraw-objection": "drop your objection to",
  "seek-delay": "seek a delay on",
};

/** A promise the player made that a reporter could plausibly ask about. */
interface ReportablePromise {
  readonly variant: "promise-question" | "meeting-question";
  /** The record the promise lives in; the stance's evidence. */
  readonly basisId: EntityId;
  readonly promiseeId: EntityId;
  /** The event the reporter learns about. */
  readonly eventId: EntityId;
  readonly jurisdictionId: EntityId | null;
  readonly label: string;
  readonly words: string;
  readonly facts: Readonly<Record<string, string>>;
  readonly request: string;
  readonly date: IsoDate | null;
}

function reportablePromises(
  world: World,
  personId: EntityId,
): readonly ReportablePromise[] {
  const from = addDays(world.currentDate, -REPORTER_PROMISE_WINDOW_DAYS);
  const found: ReportablePromise[] = [];
  for (const record of world.history.legislativeCommitments ?? []) {
    const phrase = STANCE_PHRASES[record.stance];
    if (
      record.holderPersonId !== personId ||
      record.audience === "public" ||
      record.statedAt < from ||
      !phrase
    ) {
      continue;
    }
    const promiseeId = commitmentPromisee(world, record);
    if (!promiseeId || !world.people[promiseeId]) continue;
    const promisee = personName(world.people[promiseeId]!);
    found.push({
      variant: "promise-question",
      basisId: record.id,
      promiseeId,
      eventId: record.eventId,
      jurisdictionId:
        world.history.events.find((event) => event.id === record.eventId)
          ?.jurisdictionId ?? null,
      label: `the commitment on ${record.subject.questionLabel}`,
      words: record.statement,
      facts: {
        promisee,
        stancePhrase: phrase,
        questionLabel: record.subject.questionLabel,
        commitmentStatement: record.statement,
        statedAt: record.statedAt,
      },
      request: `Whether the player promised ${promisee} to ${phrase} ${record.subject.questionLabel}.`,
      date: null,
    });
  }
  // Saying yes to a party meeting is news only about somebody in public life.
  if (!inPublicLife(world, personId)) return found;
  for (const accepted of world.history.events) {
    if (
      accepted.type !== CHAPTER_ACCEPTED_EVENT ||
      accepted.occurredAt < from ||
      !accepted.participants.some(
        (entry) => entry.personId === personId && entry.role === "agency:actor",
      )
    ) {
      continue;
    }
    const invitationId = accepted.tags
      .find((tag) => tag.startsWith("invitation:"))
      ?.slice("invitation:".length);
    const invitation = world.history.events.find(
      (event) => event.id === invitationId,
    );
    const organizerId = invitation?.participants.find(
      (entry) => entry.role === "agency:asked",
    )?.personId;
    const meeting = invitation
      ? world.history.scheduledActivities.find(
          (activity) =>
            activity.kind === "confirmed" &&
            activity.sourceEntityIds.includes(invitation.id),
        )
      : undefined;
    if (!invitation || !organizerId || !meeting) continue;
    const state = scheduledActivityState(world, meeting.id);
    if (state.status !== "scheduled" || state.start.date < world.currentDate) {
      continue;
    }
    const organizer = personName(world.people[organizerId]!);
    found.push({
      variant: "meeting-question",
      basisId: accepted.id,
      promiseeId: organizerId,
      eventId: accepted.id,
      jurisdictionId: accepted.jurisdictionId,
      label: `saying yes to the ${meeting.title}`,
      words: "I’ll be there.",
      facts: { organizer, meetingTitle: meeting.title },
      request: `Whether the player is going to the ${meeting.title}.`,
      date: state.start.date,
    });
  }
  return found;
}

function inPublicLife(world: World, personId: EntityId): boolean {
  const campaign = campaignForCandidate(world, personId);
  if (campaign && campaignState(world, campaign.id).status === "active") {
    return true;
  }
  return resolveActiveMemberSeat(world, personId).kind === "seated";
}

function produceReporterQuestion(world: World, personId: EntityId): World {
  const promise = reportablePromises(world, personId)
    .filter(
      (entry) =>
        !sceneAlreadyBound(
          world,
          personId,
          "reporter-question",
          entry.variant,
          entry.basisId,
        ),
    )
    .at(-1);
  if (!promise) return produceFilingQuestion(world, personId);
  const promisee = world.people[promise.promiseeId]!;
  const journalist = currentJournalists(world, personId).find(
    (entry) => entry.personId !== promise.promiseeId,
  );
  if (!journalist) return world;
  const reporter = world.people[journalist.personId]!;

  // The reporter must actually have heard. The person promised decides for
  // themselves whether to mention it, once; the answer is keyed to the
  // promise, so waiting a day does not reroll it.
  const tipKey = `scene-tip:${promise.basisId}:${reporter.id}`;
  if (world.history.events.some((event) => event.stableKey === tipKey)) {
    return world;
  }
  // The promisee's temperament weighs on whether they talk (PEOPLE P2). The
  // records are written only when a reporter could actually be told.
  world = ensurePeopleTraits(world, [promisee.id]);
  const evaluation = evaluateDecision(world, {
    stableKey: `${tipKey}:decision`,
    decisionType: "press.mention-a-promise",
    actorPersonId: promisee.id,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "mention-a-promise", entityId: null },
    considerations: traitConsiderations(world, promisee.id, tipKey, [
      {
        optionKey: "mention",
        trait: "sociability",
        pole: "high",
        explanation: "They talk to a lot of people.",
      },
      {
        optionKey: "keep-quiet",
        trait: "sociability",
        pole: "low",
        explanation: "They keep things to themselves.",
      },
      {
        optionKey: "keep-quiet",
        trait: "reliability",
        pole: "low",
        explanation: "They keep a confidence.",
      },
    ]),
    options: [
      {
        key: "mention",
        label: "Mention it",
        description: "Tell a reporter what was promised.",
      },
      {
        key: "keep-quiet",
        label: "Keep it quiet",
        description: "Leave it between the two of them.",
      },
    ],
    constraints: [],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  if (evaluation.selectedOptionKey !== "mention") return world;

  const holder = personName(world.people[personId]!);
  const promiseeName = personName(promisee);
  const reporterName = personName(reporter);
  let next = recordWorldEvent(world, {
    stableKey: tipKey,
    type: "press.tip-shared",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: promise.jurisdictionId,
    involvedEntityIds: [promisee.id, reporter.id, personId],
    participants: [
      {
        personId: promisee.id,
        role: "agency:source",
        detail: "Mentioned a promise",
      },
      { personId: reporter.id, role: "focus:told", detail: "Heard about it" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [`promise:${promise.basisId}`],
    summary: `${promiseeName} told ${reporterName} about ${holder} ${promise.label}.`,
    context: {
      location: { jurisdictionId: null, label: "By phone", setting: null },
      socialContext: "A source mentioning something to a reporter.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const tip = next.history.events.at(-1)!;
  next = recordClaim(next, {
    stableKey: `${tipKey}:claim`,
    speakerPersonId: promisee.id,
    // The claim is about the promise, and so is what the reporter now knows.
    eventId: promise.eventId,
    madeAt: next.currentDate,
    audience: "private",
    statement: `${holder} told me: “${promise.words}”`,
    relationshipToTruth: "consistent",
    provenance: { kind: "direct-record" },
  });
  next = recordEventKnowledge(next, {
    stableKey: `${tipKey}:knowledge`,
    personId: reporter.id,
    eventId: promise.eventId,
    learnedAt: next.currentDate,
    believedSummary: `${promiseeName} says ${holder} was ${promise.label}.`,
    accuracy: "unknown",
    confidence: "medium",
    source: {
      kind: "told-by",
      sourcePersonId: promisee.id,
      claimId: next.history.claims.at(-1)!.id,
    },
  });
  const work = activeWorkRelationshipsAt(
    next,
    reporter.id,
    currentLifeCutoff(next),
  ).find((entry) => entry.role.id === journalist.workRoleId);
  const organizationId = work?.relationship.organizationId ?? null;
  const outlet = organizationId
    ? organizationProfileAt(next, organizationId)?.name
    : undefined;
  return recordSceneBinding(
    next,
    {
      version: 1,
      family: "reporter-question",
      variant: promise.variant,
      playerPersonId: personId,
      speakerPersonId: reporter.id,
      relationship: relationshipLabel(next, personId, reporter.id),
      place: "By phone",
      jurisdictionId:
        promise.jurisdictionId ?? next.people[personId]!.homeJurisdictionId,
      request: promise.request,
      sourceEntityIds: [promise.basisId, tip.id],
      facts: {
        ...promise.facts,
        // An outlet is named the way a reporter says it on the phone.
        ...(outlet
          ? { outlet: outlet.replace(/\s*\(fictional\)\s*$/i, "") }
          : {}),
      },
      knownRecordIds: [tip.id],
      target: promise.label,
      date: promise.date,
      expiresAt: promise.date ?? addDays(next.currentDate, 7),
    },
    `${reporterName} has a question.`,
  );
}

const FILING_QUESTION_WINDOW_DAYS = 14;

/**
 * "Why are you running?" A filing is public, so a reporter needs no source to
 * ask about it.
 */
function produceFilingQuestion(world: World, personId: EntityId): World {
  const campaign = campaignForCandidate(world, personId);
  if (!campaign || campaignState(world, campaign.id).status !== "active") {
    return world;
  }
  if (
    campaign.filedAt < addDays(world.currentDate, -FILING_QUESTION_WINDOW_DAYS)
  ) {
    return world;
  }
  const filing = world.history.events.find(
    (event) => event.id === campaign.filingEventId,
  );
  if (!filing || filing.visibility !== "public") return world;
  if (
    sceneAlreadyBound(
      world,
      personId,
      "reporter-question",
      "filing-question",
      filing.id,
    )
  ) {
    return world;
  }
  const contest = (world.history.electionContests ?? []).find(
    (record) => record.id === campaign.contestId,
  );
  const journalist = currentJournalists(world, personId)[0];
  if (!contest || !journalist) return world;
  const reporter = world.people[journalist.personId]!;
  const outlet = outletOf(world, journalist);
  return recordSceneBinding(
    world,
    {
      version: 1,
      family: "reporter-question",
      variant: "filing-question",
      playerPersonId: personId,
      speakerPersonId: reporter.id,
      relationship: relationshipLabel(world, personId, reporter.id),
      place: "By phone",
      jurisdictionId:
        filing.jurisdictionId ?? world.people[personId]!.homeJurisdictionId,
      request: `Why the player is running for ${contest.office.title}.`,
      sourceEntityIds: [filing.id],
      facts: {
        officeTitle: contest.office.title,
        ...(outlet ? { outlet } : {}),
      },
      knownRecordIds: [filing.id],
      target: contest.office.title,
      date: null,
      expiresAt: addDays(world.currentDate, 7),
    },
    `${personName(reporter)} has a question about the campaign.`,
  );
}

/** A reporter's outlet, named the way it is said on the phone. */
function outletOf(
  world: World,
  journalist: { readonly personId: EntityId; readonly workRoleId: EntityId },
): string | undefined {
  const work = activeWorkRelationshipsAt(
    world,
    journalist.personId,
    currentLifeCutoff(world),
  ).find((entry) => entry.role.id === journalist.workRoleId);
  const organizationId = work?.relationship.organizationId ?? null;
  const name = organizationId
    ? organizationProfileAt(world, organizationId)?.name
    : undefined;
  return name?.replace(/\s*\(fictional\)\s*$/i, "");
}
