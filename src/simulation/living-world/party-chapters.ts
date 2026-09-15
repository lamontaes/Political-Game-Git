import { createCharacterHistoryContextPeople } from "../character-history";
import { characterHistoryContextPersonId } from "../character-history";
import {
  addDays,
  ageOnDate,
  compareSimulationMoments,
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../dates";
import { evaluateDecision } from "../decisions";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  createOrganization,
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../life";
import { organizationParticipationStateAt } from "../life-queries";
import {
  homeLocalGovernmentUnits,
  localGovernmentDisplayName,
} from "../nationwide-world/local-governments";
import { drawCanonicalName, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { recordEventKnowledge } from "../records";
import { SeededRng } from "../rng";
import {
  cancelScheduledActivity,
  createScheduledActivity,
  scheduledActivityState,
} from "../time-work";
import type {
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  ScheduledActivityRecord,
  SimulationMoment,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { LIVING_WORLD_SCENARIO_PROFILE as PROFILE } from "./contract";
import type { MajorPartyKey } from "./contract";
import {
  LIVING_WORLD_KEYS,
  LIVING_WORLD_WRITER_VERSION,
  PARTY_AFFILIATION_KIND,
  livingWorldOrganizationId,
} from "./opening";

/** A registered transition: a chapter organizer considers reaching out. */
export const CHAPTER_OUTREACH_TRANSITION_KEY =
  "party-chapter:organizer-outreach";
export const CHAPTER_MEMBERSHIP_KIND = "membership:party-chapter" as const;
export const CHAPTER_ORGANIZER_KIND = "leadership:party-chapter" as const;
export const CHAPTER_INVITATION_EVENT = "party.chapter-meeting-invited";
export const CHAPTER_ACCEPTED_EVENT = "party.chapter-invitation-accepted";
export const CHAPTER_MEETING_ATTENDED_EVENT = "party.chapter-meeting-attended";
export const CHAPTER_JOINED_EVENT = "party.chapter-joined";
export const CHAPTER_LEFT_EVENT = "party.chapter-left";

/** The shared community room every ordinary life can already reach. */
export const CHAPTER_MEETING_LOCATION_KEY = "ordinary-life:meeting-room";
export const CHAPTER_MEETING_JOURNEY_KEY = "ordinary-life:to-meeting-room";
const CHAPTER_MEETING_LABEL = "Community room";

/** Authored cadence for this fictional setting, not a claim about any party. */
const OUTREACH = {
  firstDelayDays: [3, 11],
  afterInvitationDays: [14, 29],
  deferDays: 7,
  notNowDays: 14,
  meetingWeekday: 2,
  meetingStartMinute: 18 * 60 + 30,
  meetingEndMinute: 20 * 60,
  journeyMinutes: 20,
  minimumAge: 18,
  memoryDays: 28,
} as const;

const PARTY_PLURALS: Readonly<Record<MajorPartyKey, string>> = {
  democratic: "Democrats",
  republican: "Republicans",
};

export function chapterStableKey(party: MajorPartyKey): string {
  return `${LIVING_WORLD_WRITER_VERSION}:chapter:home:${party}`;
}

export function chapterOrganizerKey(party: MajorPartyKey): string {
  return `${chapterStableKey(party)}:organizer`;
}

export interface HomePartyChapter {
  readonly organizationId: EntityId;
  readonly partyKey: MajorPartyKey;
  readonly partyOrganizationId: EntityId;
  readonly name: string;
  readonly jurisdictionId: EntityId;
  readonly organizerPersonId: EntityId | null;
}

/**
 * The home-area chapter of each national party, with one persistent local
 * organizer, written once when a new life opens. A chapter meets in the
 * shared community room; no party building is implied. Nobody is enrolled,
 * registered or affiliated by this.
 */
export function ensureHomePartyChapters(
  world: World,
  playerPersonId: EntityId,
): World {
  const player = world.people[playerPersonId];
  if (!player) throw new Error("Home party chapters need an existing player.");
  if (
    world.history.organizations.some(
      (organization) =>
        organization.stableKey ===
        chapterStableKey(PROFILE.majorParties[0].key),
    )
  )
    return world;
  const nationalPartyIds = PROFILE.majorParties.map((party) =>
    livingWorldOrganizationId(
      world,
      LIVING_WORLD_KEYS.nationalParty(party.key),
    ),
  );
  if (
    !nationalPartyIds.every((id) =>
      world.history.organizations.some(
        (organization) => organization.id === id,
      ),
    )
  )
    return world;

  const county = homeLocalGovernmentUnits(world, playerPersonId).counties[0];
  const area = county
    ? localGovernmentDisplayName(county)
    : (world.jurisdictions[player.homeJurisdictionId]?.name ?? null);
  if (!area) return world;
  const date = world.currentDate;
  const rng = new SeededRng(world.seed).fork(
    `${LIVING_WORLD_WRITER_VERSION}:chapters`,
  );
  const provenance = {
    kind: "generated" as const,
    generatorKey: LIVING_WORLD_WRITER_VERSION,
  };

  let next = createCharacterHistoryContextPeople(
    world,
    PROFILE.majorParties.map((party) => {
      const personRng = rng.fork(chapterOrganizerKey(party.key));
      return {
        stableKey: chapterOrganizerKey(party.key),
        ...drawCanonicalName(personRng.fork("name")),
        identity: generatePersonIdentity(personRng.fork("identity")),
        birthDate: makeIsoDate(
          `${Number(date.slice(0, 4)) - personRng.integer(28, 72)}-${String(personRng.integer(1, 13)).padStart(2, "0")}-${String(personRng.integer(1, 29)).padStart(2, "0")}`,
        ),
        homeJurisdictionId: player.homeJurisdictionId,
      };
    }),
  );

  for (const [index, party] of PROFILE.majorParties.entries()) {
    const stableKey = chapterStableKey(party.key);
    next = createOrganization(next, {
      stableKey,
      formedAt: date,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: `${area} ${PARTY_PLURALS[party.key]}`,
        classification: "membership:party-chapter",
        locationJurisdictionId: player.homeJurisdictionId,
      },
    });
    const chapterId = livingWorldOrganizationId(next, stableKey);
    const organizerId = characterHistoryContextPersonId(
      next,
      chapterOrganizerKey(party.key),
    );
    next = createOrganizationParticipation(next, {
      stableKey: `${chapterOrganizerKey(party.key)}:role`,
      personId: organizerId,
      organizationId: chapterId,
      startedAt: date,
      kind: CHAPTER_ORGANIZER_KIND,
      roleKind: "leader:organizer",
      context: "Organizes the local chapter's meetings.",
      provenance,
    });
    next = createOrganizationParticipation(next, {
      stableKey: `${chapterOrganizerKey(party.key)}:affiliation`,
      personId: organizerId,
      organizationId: nationalPartyIds[index]!,
      startedAt: date,
      kind: PARTY_AFFILIATION_KIND,
      roleKind: "member:public-affiliation",
      context: "Public party affiliation",
      provenance,
    });
    next = scheduleFutureDueItem(next, {
      stableKey: `${stableKey}:outreach:1`,
      dueAt: addDays(
        date,
        rng
          .fork(`${stableKey}:first`)
          .integer(OUTREACH.firstDelayDays[0], OUTREACH.firstDelayDays[1] + 1),
      ),
      transitionKey: CHAPTER_OUTREACH_TRANSITION_KEY,
      entityIds: [organizerId, playerPersonId].sort(),
      jurisdictionId: player.homeJurisdictionId,
      provenance: { kind: "initialization", reference: stableKey },
    });
  }
  return next;
}

/** The player's home chapters, in profile order. Pure. */
export function homePartyChapters(world: World): readonly HomePartyChapter[] {
  return PROFILE.majorParties.flatMap((party) => {
    const organization = world.history.organizations.find(
      (candidate) => candidate.stableKey === chapterStableKey(party.key),
    );
    if (!organization) return [];
    const profile = world.history.organizationProfiles
      .filter((record) => record.organizationId === organization.id)
      .at(-1)!;
    const organizer = world.history.organizationParticipations.find(
      (participation) =>
        participation.organizationId === organization.id &&
        participation.kind === CHAPTER_ORGANIZER_KIND &&
        organizationParticipationStateAt(world, participation.id)?.status ===
          "active",
    );
    return [
      {
        organizationId: organization.id,
        partyKey: party.key,
        partyOrganizationId: livingWorldOrganizationId(
          world,
          LIVING_WORLD_KEYS.nationalParty(party.key),
        ),
        name: profile.name,
        jurisdictionId: profile.locationJurisdictionId!,
        organizerPersonId: organizer?.personId ?? null,
      },
    ];
  });
}

function chapterForOrganizer(
  world: World,
  organizerPersonId: EntityId,
): HomePartyChapter | undefined {
  return homePartyChapters(world).find(
    (chapter) => chapter.organizerPersonId === organizerPersonId,
  );
}

function activeChapterMembership(
  world: World,
  personId: EntityId,
  chapterId?: EntityId,
) {
  return world.history.organizationParticipations
    .filter(
      (participation) =>
        participation.personId === personId &&
        participation.kind === CHAPTER_MEMBERSHIP_KIND &&
        (chapterId === undefined ||
          participation.organizationId === chapterId) &&
        organizationParticipationStateAt(world, participation.id)?.status ===
          "active",
    )
    .at(-1);
}

function invitationsFrom(
  world: World,
  chapterId: EntityId,
  personId: EntityId,
): readonly HistoricalEvent[] {
  return world.history.events.filter(
    (event) =>
      event.type === CHAPTER_INVITATION_EVENT &&
      event.involvedEntityIds.includes(chapterId) &&
      event.participants.some(
        (participant) =>
          participant.personId === personId &&
          participant.role === "focus:asked-of",
      ),
  );
}

function meetingForInvitation(
  world: World,
  invitationId: EntityId,
): ScheduledActivityRecord | undefined {
  // An accepted invitation replaces its tentative hold with a confirmed one.
  return world.history.scheduledActivities
    .filter(
      (activity) =>
        activity.kind !== "travel" &&
        activity.sourceEntityIds.includes(invitationId),
    )
    .at(-1);
}

function openInvitationExists(world: World, personId: EntityId): boolean {
  return homePartyChapters(world).some((chapter) =>
    invitationsFrom(world, chapter.organizationId, personId).some((event) => {
      const meeting = meetingForInvitation(world, event.id);
      if (!meeting) return false;
      const state = scheduledActivityState(world, meeting.id);
      return (
        state.status === "scheduled" &&
        compareSimulationMoments(state.end, world.currentMoment) > 0
      );
    }),
  );
}

function momentAt(
  world: World,
  date: IsoDate,
  minuteOfDay: number,
): SimulationMoment {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function nextMeetingDate(from: IsoDate, weeksLater: number): IsoDate {
  const weekday = new Date(`${from}T12:00:00Z`).getUTCDay();
  let days = (OUTREACH.meetingWeekday - weekday + 7) % 7;
  if (days < 2) days += 7;
  return addDays(from, days + weeksLater * 7);
}

/**
 * The organizer's own consideration of whether to invite the player to the
 * next open meeting. Only what the organizer was part of counts, and not
 * inviting is always available. Nothing here depends on the player's party.
 */
export function chapterOutreachTransitionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== CHAPTER_OUTREACH_TRANSITION_KEY)
    throw new Error(
      "The chapter outreach handler received another transition.",
    );
  const [organizerId, personId] = orderedIds(world, dueItem);
  const blocked = (
    reason: string,
    context: string,
  ): FutureTransitionHandlerResult => ({
    world,
    status: "blocked",
    reasonKey: `party-chapter:${reason}`,
    context,
    outcomeEventId: null,
  });
  if (!organizerId || !personId)
    return blocked(
      "organizer-absent",
      "Diagnostic: no active organizer or subject for this outreach.",
    );
  const chapter = chapterForOrganizer(world, organizerId)!;
  const deceased = (id: EntityId) =>
    world.history.personDeaths.some((death) => death.personId === id);
  if (deceased(organizerId) || deceased(personId) || !world.people[personId])
    return blocked(
      "actor-lost-standing",
      "Diagnostic: the organizer or the subject is no longer living.",
    );

  const reschedule = (next: World, days: number, n: number): World =>
    scheduleFutureDueItem(next, {
      stableKey: `${chapterStableKey(chapter.partyKey)}:outreach:${n}`,
      dueAt: addDays(world.currentDate, days),
      transitionKey: CHAPTER_OUTREACH_TRANSITION_KEY,
      entityIds: [organizerId, personId].sort(),
      jurisdictionId: chapter.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [organizerId] },
    });
  const sequenceNumber = Number(dueItem.stableKey.split(":").at(-1)) + 1;
  const deferred = (
    reason: string,
    days: number,
  ): FutureTransitionHandlerResult => ({
    world: reschedule(world, days, sequenceNumber),
    status: "resolved",
    reasonKey: `party-chapter:${reason}`,
    context: null,
    outcomeEventId: null,
  });

  const person = world.people[personId]!;
  if (ageOnDate(person.birthDate, world.currentDate) < OUTREACH.minimumAge)
    return deferred("subject-not-adult", OUTREACH.notNowDays);
  if (openInvitationExists(world, personId))
    return deferred("invitation-already-open", OUTREACH.deferDays);
  const otherMembership = activeChapterMembership(world, personId);
  if (
    otherMembership &&
    otherMembership.organizationId !== chapter.organizationId
  )
    return deferred("member-of-another-chapter", OUTREACH.notNowDays);

  const considerations: DecisionConsideration[] = [];
  // Only the organizer's recent experience weighs: one missed meeting is not
  // held against somebody forever.
  const recentFrom = addDays(world.currentDate, -OUTREACH.memoryDays);
  for (const invitation of invitationsFrom(
    world,
    chapter.organizationId,
    personId,
  ).filter((event) => event.occurredAt >= recentFrom)) {
    const attended = world.history.events.find(
      (event) =>
        event.type === CHAPTER_MEETING_ATTENDED_EVENT &&
        event.tags.includes(`invitation:${invitation.id}`),
    );
    considerations.push(
      attended
        ? {
            stableKey: `${dueItem.stableKey}:attended:${attended.id}`,
            optionKey: "invite",
            sourceType: "social:relationship",
            direction: "supports",
            importance: "moderate",
            confidence: "high",
            explanation: "They came to a meeting after the last invitation.",
            sourceRefs: [{ kind: "historical-event", eventId: attended.id }],
          }
        : {
            stableKey: `${dueItem.stableKey}:unanswered:${invitation.id}`,
            optionKey: "not-now",
            sourceType: "social:relationship",
            direction: "supports",
            importance: "slight",
            confidence: "medium",
            explanation: "They did not come after an earlier invitation.",
            sourceRefs: [{ kind: "historical-event", eventId: invitation.id }],
          },
    );
  }
  const evaluation = evaluateDecision(world, {
    stableKey: `${dueItem.stableKey}:decision`,
    decisionType: "party-chapter.invite-to-meeting",
    actorPersonId: organizerId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "context:life",
      key: "party-chapter-meeting",
      entityId: null,
    },
    options: [
      {
        key: "invite",
        label: "Invite them",
        description: "Mention the next open meeting.",
      },
      {
        key: "not-now",
        label: "Not now",
        description: "Leave it for another time.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  if (evaluation.selectedOptionKey !== "invite")
    return deferred("organizer-chose-not-now", OUTREACH.notNowDays);

  for (const weeksLater of [0, 1]) {
    const written = tryWriteInvitation(
      world,
      chapter,
      organizerId,
      personId,
      weeksLater,
      dueItem,
    );
    if (!written) continue;
    const meetingDate = written.meetingDate;
    const days =
      daysBetween(world.currentDate, meetingDate) +
      new SeededRng(world.seed)
        .fork(`${dueItem.stableKey}:next`)
        .integer(
          OUTREACH.afterInvitationDays[0],
          OUTREACH.afterInvitationDays[1] + 1,
        );
    return {
      world: reschedule(written.world, days, sequenceNumber),
      status: "resolved",
      reasonKey: "party-chapter:invited",
      context: null,
      outcomeEventId: written.invitationId,
    };
  }
  return deferred("no-free-evening", OUTREACH.deferDays);
}

/** The due item's active organizer and the person they would approach. */
function orderedIds(
  world: World,
  dueItem: FutureDueItem,
): [EntityId | null, EntityId | null] {
  const organizer =
    dueItem.entityIds.find((id) =>
      homePartyChapters(world).some(
        (chapter) => chapter.organizerPersonId === id,
      ),
    ) ?? null;
  const subject =
    dueItem.entityIds.find((id) => id !== organizer && world.people[id]) ??
    null;
  return [organizer, subject];
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

function tryWriteInvitation(
  world: World,
  chapter: HomePartyChapter,
  organizerId: EntityId,
  personId: EntityId,
  weeksLater: number,
  dueItem: FutureDueItem,
): { world: World; invitationId: EntityId; meetingDate: IsoDate } | null {
  const meetingDate = nextMeetingDate(world.currentDate, weeksLater);
  const organizer = world.people[organizerId]!;
  const stableKey = `${dueItem.stableKey}:invitation`;
  try {
    let next = recordWorldEvent(world, {
      stableKey,
      type: CHAPTER_INVITATION_EVENT,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: chapter.jurisdictionId,
      involvedEntityIds: [personId, organizerId, chapter.organizationId],
      participants: [
        {
          personId: organizerId,
          role: "agency:asked",
          detail: `Invited them to the next ${chapter.name} meeting`,
        },
        { personId, role: "focus:asked-of", detail: "Was invited" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        LIVING_WORLD_WRITER_VERSION,
        `chapter:${chapter.organizationId}`,
        `meeting-date:${meetingDate}`,
      ],
      summary: `${personName(organizer)} invited them to the ${chapter.name} open meeting.`,
      context: {
        location: {
          jurisdictionId: chapter.jurisdictionId,
          label: CHAPTER_MEETING_LABEL,
          setting: "community room",
        },
        socialContext: "An open chapter meeting; anyone may come.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const invitation = next.history.events.at(-1)!;
    next = writeMeeting(
      next,
      invitation,
      chapter,
      personId,
      meetingDate,
      "tentative",
      stableKey,
    );
    next = recordEventKnowledge(next, {
      stableKey: `${stableKey}:knowledge`,
      personId,
      eventId: invitation.id,
      learnedAt: world.currentDate,
      believedSummary: `${personName(organizer)} invited them to the ${chapter.name} open meeting on ${meetingDate}. Coming is optional.`,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "told-by", sourcePersonId: organizerId, claimId: null },
    });
    return { world: next, invitationId: invitation.id, meetingDate };
  } catch {
    return null;
  }
}

function writeMeeting(
  world: World,
  invitation: HistoricalEvent,
  chapter: HomePartyChapter,
  personId: EntityId,
  meetingDate: IsoDate,
  kind: "tentative" | "confirmed",
  stableKey: string,
): World {
  const access = { kind: "private" as const, personIds: [personId] };
  let next = createScheduledActivity(world, {
    stableKey: `${stableKey}:meeting:${kind}`,
    title: `${chapter.name} open meeting`,
    summary:
      kind === "tentative"
        ? "An open chapter meeting in the community room. Coming is optional."
        : "An open chapter meeting in the community room that you said you would attend.",
    kind,
    start: momentAt(world, meetingDate, OUTREACH.meetingStartMinute),
    end: momentAt(world, meetingDate, OUTREACH.meetingEndMinute),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: CHAPTER_MEETING_LOCATION_KEY,
      label: CHAPTER_MEETING_LABEL,
      jurisdictionId: chapter.jurisdictionId,
    },
    sourceEntityIds: [invitation.id],
    flexibility: { kind: "fixed" },
    access,
  });
  const meeting = next.history.scheduledActivities.at(-1)!;
  // The same bounded game-authored local journey the posted meeting uses.
  next = createScheduledActivity(next, {
    stableKey: `${stableKey}:journey:${kind}`,
    title: "Journey to the community room",
    summary:
      "A game-authored 20-minute local journey included in Attend. Travel cost is not represented; no fare is charged.",
    kind: "travel",
    start: momentAt(
      world,
      meetingDate,
      OUTREACH.meetingStartMinute - OUTREACH.journeyMinutes,
    ),
    end: momentAt(world, meetingDate, OUTREACH.meetingStartMinute),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: CHAPTER_MEETING_JOURNEY_KEY,
      label: "On the way to the community room",
      jurisdictionId: chapter.jurisdictionId,
    },
    sourceEntityIds: [meeting.id],
    flexibility: { kind: "fixed" },
    access,
  });
  return next;
}

function controlled(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

/**
 * Says yes ahead of time. The optional hold becomes a commitment, so the
 * calendar will stop at it like any other promise. Nothing else changes.
 */
export function acceptChapterInvitation(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  if (!controlled(world, personId)) return world;
  const tentative = world.history.scheduledActivities.find(
    (activity) => activity.id === activityId && activity.kind === "tentative",
  );
  const invitation = tentative
    ? world.history.events.find(
        (event) =>
          event.type === CHAPTER_INVITATION_EVENT &&
          tentative.sourceEntityIds.includes(event.id),
      )
    : undefined;
  if (!tentative || !invitation) return world;
  const state = scheduledActivityState(world, tentative.id);
  if (
    state.status !== "scheduled" ||
    compareSimulationMoments(state.start, world.currentMoment) <= 0
  )
    return world;
  const chapter = homePartyChapters(world).find((candidate) =>
    invitation.involvedEntityIds.includes(candidate.organizationId),
  );
  if (!chapter) return world;
  let next = recordWorldEvent(world, {
    stableKey: `${invitation.stableKey}:accepted`,
    type: CHAPTER_ACCEPTED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: chapter.jurisdictionId,
    involvedEntityIds: [personId, tentative.id],
    participants: [
      { personId, role: "agency:actor", detail: "Said they would come" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      LIVING_WORLD_WRITER_VERSION,
      `invitation:${invitation.id}`,
      "time-neutral",
    ],
    summary: `You said you would come to the ${chapter.name} open meeting.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "Accept the invitation",
      motivation: null,
      immediateReaction: null,
    },
  });
  for (const activity of next.history.scheduledActivities.filter(
    (candidate) =>
      candidate.id === tentative.id ||
      (candidate.kind === "travel" &&
        candidate.sourceEntityIds.includes(tentative.id)),
  ))
    if (scheduledActivityState(next, activity.id).status === "scheduled")
      next = cancelScheduledActivity(next, activity.id);
  return writeMeeting(
    next,
    invitation,
    chapter,
    personId,
    makeIsoDate(state.start.date),
    "confirmed",
    invitation.stableKey,
  );
}

/**
 * Explicitly joins a chapter as a volunteer member. It is not a registration,
 * a public affiliation, an endorsement or a nomination. A person may be an
 * active member of one party's chapter at a time.
 */
export function joinPartyChapter(
  world: World,
  personId: EntityId,
  chapterId: EntityId,
): World {
  if (!canJoinPartyChapter(world, personId, chapterId)) return world;
  const chapter = homePartyChapters(world).find(
    (c) => c.organizationId === chapterId,
  )!;
  const count = world.history.organizationParticipations.filter(
    (p) => p.personId === personId && p.organizationId === chapterId,
  ).length;
  const stableKey = `${chapterStableKey(chapter.partyKey)}:member:${personId}:${count + 1}`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: CHAPTER_JOINED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: chapter.jurisdictionId,
    involvedEntityIds: [personId, chapterId],
    participants: [
      { personId, role: "agency:actor", detail: `Joined ${chapter.name}` },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      LIVING_WORLD_WRITER_VERSION,
      "provenance:player-choice",
      "time-neutral",
    ],
    summary: `You joined ${chapter.name} as a volunteer member.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: `Join ${chapter.name}`,
      motivation: null,
      immediateReaction: null,
    },
  });
  next = createOrganizationParticipation(next, {
    stableKey: `${stableKey}:participation`,
    personId,
    organizationId: chapterId,
    startedAt: world.currentDate,
    kind: CHAPTER_MEMBERSHIP_KIND,
    roleKind: "participant:volunteer",
    context:
      "Joined by explicit choice; no registration or endorsement is implied.",
    provenance: {
      kind: "simulated-event",
      eventId: next.history.events.at(-1)!.id,
    },
  });
  return next;
}

export function canJoinPartyChapter(
  world: World,
  personId: EntityId,
  chapterId: EntityId,
): boolean {
  const person = world.people[personId];
  if (!person || !controlled(world, personId)) return false;
  if (ageOnDate(person.birthDate, world.currentDate) < OUTREACH.minimumAge)
    return false;
  if (
    !homePartyChapters(world).some(
      (chapter) => chapter.organizationId === chapterId,
    )
  )
    return false;
  return activeChapterMembership(world, personId) === undefined;
}

/** Leaves an active chapter membership; the membership record is kept. */
export function leavePartyChapter(
  world: World,
  personId: EntityId,
  chapterId: EntityId,
): World {
  if (!controlled(world, personId)) return world;
  const membership = activeChapterMembership(world, personId, chapterId);
  if (!membership) return world;
  const chapter = homePartyChapters(world).find(
    (c) => c.organizationId === chapterId,
  )!;
  const state = organizationParticipationStateAt(world, membership.id)!;
  let next = recordWorldEvent(world, {
    stableKey: `${membership.stableKey}:left`,
    type: CHAPTER_LEFT_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: chapter.jurisdictionId,
    involvedEntityIds: [personId, chapterId],
    participants: [
      { personId, role: "agency:actor", detail: `Left ${chapter.name}` },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      LIVING_WORLD_WRITER_VERSION,
      "provenance:player-choice",
      "time-neutral",
    ],
    summary: `You left ${chapter.name}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: `Leave ${chapter.name}`,
      motivation: null,
      immediateReaction: null,
    },
  });
  next = recordOrganizationParticipationState(next, {
    stableKey: `${membership.stableKey}:ended`,
    participationId: membership.id,
    effectiveAt: world.currentDate,
    status: "ended",
    roleKind: state.roleKind,
    context: "Left by explicit choice.",
    provenance: {
      kind: "simulated-event",
      eventId: next.history.events.at(-1)!.id,
    },
    supersedesStateId: state.id,
  });
  return next;
}

export type ChapterInvitationState =
  "offered" | "accepted" | "declined" | "expired" | "attended";

export interface PartyEncounterView {
  readonly chapterOrganizationId: EntityId;
  readonly partyOrganizationId: EntityId;
  readonly name: string;
  readonly venue: {
    readonly locationKey: string;
    readonly label: string;
    readonly jurisdictionId: EntityId;
  };
  readonly organizerPersonId: EntityId | null;
  readonly activities: readonly {
    readonly invitationEventId: EntityId;
    readonly activityId: EntityId;
    readonly title: string;
    readonly start: SimulationMoment;
    readonly end: SimulationMoment;
    readonly state: ChapterInvitationState;
    /** Pass back to decline/accept writers to refuse a stale choice. */
    readonly revision: EntityId;
  }[];
  readonly playerParticipation: {
    readonly participationId: EntityId;
    readonly status: "active";
  } | null;
}

/** Home chapters and this person's invitations from them. Pure. */
export function projectPartyEncounters(
  world: World,
  personId: EntityId,
): readonly PartyEncounterView[] {
  return homePartyChapters(world).map((chapter) => {
    const membership = activeChapterMembership(
      world,
      personId,
      chapter.organizationId,
    );
    return {
      chapterOrganizationId: chapter.organizationId,
      partyOrganizationId: chapter.partyOrganizationId,
      name: chapter.name,
      venue: {
        locationKey: CHAPTER_MEETING_LOCATION_KEY,
        label: CHAPTER_MEETING_LABEL,
        jurisdictionId: chapter.jurisdictionId,
      },
      organizerPersonId: chapter.organizerPersonId,
      activities: invitationsFrom(
        world,
        chapter.organizationId,
        personId,
      ).flatMap((invitation) => {
        const meeting = meetingForInvitation(world, invitation.id);
        if (!meeting) return [];
        const state = scheduledActivityState(world, meeting.id);
        const attended = world.history.events.some(
          (event) =>
            event.type === CHAPTER_MEETING_ATTENDED_EVENT &&
            event.tags.includes(`invitation:${invitation.id}`),
        );
        const declined = world.history.events.some(
          (event) =>
            (event.type === "life.scheduled-activity-declined" ||
              event.type === "life.social-invitation-declined") &&
            event.involvedEntityIds.includes(meeting.id),
        );
        const inviteState: ChapterInvitationState = attended
          ? "attended"
          : declined
            ? "declined"
            : state.status === "scheduled" &&
                compareSimulationMoments(state.end, world.currentMoment) > 0
              ? meeting.kind === "confirmed"
                ? "accepted"
                : "offered"
              : "expired";
        return [
          {
            invitationEventId: invitation.id,
            activityId: meeting.id,
            title: meeting.title,
            start: state.start,
            end: state.end,
            state: inviteState,
            revision: state.id,
          },
        ];
      }),
      playerParticipation: membership
        ? { participationId: membership.id, status: "active" as const }
        : null,
    };
  });
}
