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
import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
import {
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  organizationProfileAt,
} from "../simulation/life-queries";
import {
  CHAPTER_ACCEPTED_EVENT,
  CHAPTER_INVITATION_EVENT,
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
    produceHomeEvening,
    produceFavor,
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
        !activity.participantPersonIds.includes(speakerId),
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
} as const;

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
  if (!promise) return world;
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
  const evaluation = evaluateDecision(world, {
    stableKey: `${tipKey}:decision`,
    decisionType: "press.mention-a-promise",
    actorPersonId: promisee.id,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "mention-a-promise", entityId: null },
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
    considerations: [],
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
