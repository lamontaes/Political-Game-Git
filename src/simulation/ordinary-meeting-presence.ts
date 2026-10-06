import { eventById } from "./event-index";
import {
  ageOnDate,
  compareSimulationMoments,
  simulationMinutesBetween,
} from "./dates";
import {
  PUBLIC_MEETING_AGENDA,
  PUBLIC_MEETING_KEY,
} from "./life-opportunities";
import { personName } from "./people";
import { recordEventKnowledge } from "./records";
import { canPersonAccess, scheduledActivityState } from "./time-work";
import type {
  EntityId,
  HistoricalEvent,
  ScheduledActivityRecord,
  World,
} from "./types";
import { recordWorldEvent } from "./world";
import {
  localCouncilChair,
  postedMeetingVote,
  postedMeetingVoteSentence,
} from "./living-world/local-council-meetings";
import { homeLocalGovernmentUnits } from "./nationwide-world/local-governments";
import { sittingLocalOfficers } from "./living-world/local-government-seats";

export const ORDINARY_MEETING_PRESENCE = "ordinary-meeting-presence-v1";

export type OrdinaryMeetingSpeechChoice = "support" | "oppose" | "ask";

// Authored public-comment choices shown before the writer records one. Their
// words state only the posted proposal and the speaker's selected position.
export const ORDINARY_MEETING_SPEECH_CHOICES: readonly {
  readonly key: OrdinaryMeetingSpeechChoice;
  readonly words: string;
}[] = [
  {
    key: "support",
    words: "I support opening this room one extra evening each week.",
  },
  {
    key: "oppose",
    words:
      "I do not support another evening until the hours and funding are clear.",
  },
  {
    key: "ask",
    words:
      "What hours are proposed, and how would the extra evening be funded?",
  },
];

/** An actual public comment is recorded once at the active meeting. Reading
 * the options or agenda writes nothing and spends no time. */
export function speakAtOrdinaryMeeting(
  world: World,
  personId: EntityId,
  activityId: EntityId,
  choice: OrdinaryMeetingSpeechChoice,
): World {
  const offered = ordinaryMeetingEntry(world, personId, activityId);
  const words = ORDINARY_MEETING_SPEECH_CHOICES.find(
    (option) => option.key === choice,
  )?.words;
  const entry = world.history.events.find(
    (event) =>
      event.stableKey === `${ORDINARY_MEETING_PRESENCE}:${activityId}:entry` &&
      event.participants.some(
        (actor) =>
          actor.personId === personId && actor.role === "presence:participant",
      ),
  );
  const stableKey = `${ORDINARY_MEETING_PRESENCE}:${activityId}:comment:${personId}`;
  if (
    !offered ||
    !entry ||
    !words ||
    world.history.events.some((event) => event.stableKey === stableKey)
  )
    return world;
  const heardBy = [
    ...new Set(
      entry.participants
        .filter(
          (participant) =>
            participant.role === "presence:participant" ||
            participant.role === "coordination:chair",
        )
        .map((participant) => participant.personId),
    ),
  ];
  const next = recordWorldEvent(world, {
    stableKey,
    type: "civic.meeting-public-comment",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: offered.activity.location.jurisdictionId,
    involvedEntityIds: [...new Set([activityId, personId, ...heardBy])],
    participants: [
      { personId, role: "agency:actor", detail: words },
      ...heardBy
        .filter((id) => id !== personId)
        .map((id) => ({
          personId: id,
          role: "observation:witness" as const,
          detail: "Heard the public comment",
        })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      ORDINARY_MEETING_PRESENCE,
      `activity:${activityId}`,
      `entry:${entry.id}`,
      `position:${choice}`,
    ],
    summary: `You told the meeting: “${words}”`,
    context: {
      location: entry.context.location,
      socialContext: entry.context.socialContext,
      pressure: null,
      choice: words,
      motivation: null,
      immediateReaction: "The people present heard your comment.",
    },
  });
  const comment = next.history.events.at(-1)!;
  let heard = next;
  for (const listenerId of [...new Set([personId, ...heardBy])]) {
    heard = recordEventKnowledge(heard, {
      stableKey: `${stableKey}:knowledge:${listenerId}`,
      personId: listenerId,
      eventId: comment.id,
      learnedAt: heard.currentDate,
      believedSummary: comment.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  return heard;
}

/** Prospective attendance hook only. Requiring the pre-action World prevents
 * a completed legacy activity from acquiring a host when inspected or loaded.
 * This records a bounded fictional meeting role, never acquaintance or office.
 */
export function recordOrdinaryMeetingPresence(
  before: World,
  completed: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  if (
    before.id !== completed.id ||
    before.control.kind !== "person" ||
    before.control.personId !== personId ||
    completed.control.kind !== "person" ||
    completed.control.personId !== personId
  )
    return completed;
  const activity = before.history.scheduledActivities.find(
    (entry) => entry.id === activityId,
  );
  if (
    !activity ||
    activity.stableKey !== `${PUBLIC_MEETING_KEY}:activity` ||
    activity.location.locationKey !== "ordinary-life:meeting-room" ||
    activity.responsiblePersonId !== personId ||
    !activity.participantPersonIds.includes(personId) ||
    !canPersonAccess(activity.access, personId)
  )
    return completed;
  const prior = scheduledActivityState(before, activityId),
    state = scheduledActivityState(completed, activityId);
  if (
    prior.status !== "scheduled" ||
    state.status !== "completed" ||
    compareSimulationMoments(state.end, completed.currentMoment) !== 0 ||
    compareSimulationMoments(state.recordedAt, completed.currentMoment) !== 0
  )
    return completed;
  const jurisdictionId = activity.location.jurisdictionId;
  if (!jurisdictionId || !completed.jurisdictions[jurisdictionId])
    return completed;
  const outcome = eventById(completed, state.outcomeEventId);
  if (
    outcome?.type !== "schedule.activity-completed" ||
    !outcome.involvedEntityIds.includes(activityId) ||
    !outcome.participants.some(
      (actor) =>
        actor.personId === personId && actor.role === "presence:participant",
    )
  )
    return completed;
  if (
    completed.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= completed.currentDate,
    )
  )
    return completed;
  const arrival = completed.history.events
    .filter(
      (event) =>
        ["life.scene.opened", "life.scene.arrived"].includes(event.type) &&
        event.participants.some(
          (actor) =>
            actor.personId === personId &&
            actor.role === "presence:participant",
        ),
    )
    .at(-1);
  if (
    !arrival ||
    arrival.sequence >= outcome.sequence ||
    !arrival.involvedEntityIds.includes(activityId) ||
    arrival.context.location?.jurisdictionId !== jurisdictionId ||
    arrival.context.location.label !== activity.location.label
  )
    return completed;
  const notice = before.history.events.find(
    (event) =>
      activity.sourceEntityIds.includes(event.id) &&
      event.type === "civic.meeting-notice" &&
      event.jurisdictionId === jurisdictionId,
  );
  if (!notice) return completed;
  return writePresence(
    completed,
    personId,
    activity,
    notice,
    arrival.id,
    "immediate-aftermath",
    outcome,
  );
}

/** Explicit entry after the recorded journey. This neither finishes the
 * activity nor spends time: staying through it is a separate existing action. */
export function enterOrdinaryMeeting(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): World {
  const offered = ordinaryMeetingEntry(world, personId, activityId);
  return offered
    ? writePresence(
        world,
        personId,
        offered.activity,
        offered.notice,
        offered.arrival.id,
        "active",
        null,
      )
    : world;
}

/** One offer and writer predicate, so the UI never promises unavailable entry. */
export function ordinaryMeetingEntry(
  world: World,
  personId: EntityId,
  activityId: EntityId,
) {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== personId ||
    !world.people[personId] ||
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  )
    return null;
  const activity = world.history.scheduledActivities.find(
    (entry) => entry.id === activityId,
  );
  if (
    !activity ||
    activity.stableKey !== `${PUBLIC_MEETING_KEY}:activity` ||
    activity.location.locationKey !== "ordinary-life:meeting-room" ||
    activity.responsiblePersonId !== personId ||
    !activity.participantPersonIds.includes(personId) ||
    !canPersonAccess(activity.access, personId) ||
    !activity.location.jurisdictionId
  )
    return null;
  const state = scheduledActivityState(world, activityId);
  if (
    state.status !== "scheduled" ||
    compareSimulationMoments(world.currentMoment, state.start) < 0 ||
    compareSimulationMoments(world.currentMoment, state.end) >= 0
  )
    return null;
  const arrival = world.history.events
    .filter(
      (event) =>
        ["life.scene.opened", "life.scene.arrived"].includes(event.type) &&
        event.participants.some(
          (actor) =>
            actor.personId === personId &&
            actor.role === "presence:participant",
        ),
    )
    .at(-1);
  if (
    !arrival ||
    arrival.type !== "life.scene.arrived" ||
    !arrival.involvedEntityIds.includes(activityId) ||
    arrival.context.location?.jurisdictionId !==
      activity.location.jurisdictionId ||
    arrival.context.location.label !== activity.location.label
  )
    return null;
  if (arrival.tags.includes("route:ordinary-life:to-meeting-room")) {
    const lateArrival = arrival.tags.includes("travel:late-meeting");
    const journey = world.history.scheduledActivities.find(
      (entry) =>
        arrival.involvedEntityIds.includes(entry.id) &&
        entry.kind === "travel" &&
        entry.responsiblePersonId === personId &&
        entry.location.locationKey === "ordinary-life:to-meeting-room" &&
        entry.sourceEntityIds.includes(activityId) &&
        scheduledActivityState(world, entry.id).status ===
          (lateArrival ? "cancelled" : "completed") &&
        compareSimulationMoments(
          scheduledActivityState(world, entry.id).end,
          state.start,
        ) === 0,
    );
    if (!journey) return null;
    if (lateArrival) {
      const journeyState = scheduledActivityState(world, journey.id);
      const duration = arrival.tags.find((tag) =>
        tag.startsWith("duration-minutes:"),
      );
      if (
        !arrival.involvedEntityIds.includes(journey.id) ||
        duration !==
          `duration-minutes:${simulationMinutesBetween(journeyState.start, journeyState.end)}` ||
        compareSimulationMoments(world.currentMoment, state.start) <= 0
      )
        return null;
    } else if (
      compareSimulationMoments(world.currentMoment, state.start) !== 0
    ) {
      return null;
    }
  } else if (
    // An older save can already record actual presence in this room without
    // the journey record. The saved arrival must be for today's same meeting;
    // a venue offer alone cannot manufacture presence.
    !arrival.tags.includes("place:ordinary-life:meeting-room") ||
    arrival.occurredAt !== world.currentDate
  ) {
    return null;
  }
  const notice = world.history.events.find(
    (event) =>
      activity.sourceEntityIds.includes(event.id) &&
      event.type === "civic.meeting-notice" &&
      event.jurisdictionId === activity.location.jurisdictionId,
  );
  return notice && meetingChairFor(world, personId, activity, notice)
    ? { activity, notice, arrival }
    : null;
}

function eligibleMeetingPerson(
  world: World,
  playerId: EntityId,
  personId: EntityId,
  jurisdictionId: EntityId,
): boolean {
  return (
    personId !== playerId &&
    !!world.people[personId] &&
    (world.people[personId]!.homeJurisdictionId === jurisdictionId ||
      (() => {
        const units = homeLocalGovernmentUnits(world, playerId);
        return [...units.municipal, ...units.townships, ...units.counties].some(
          (unit) =>
            sittingLocalOfficers(world, unit).some(
              (seat) => seat.personId === personId,
            ),
        );
      })()) &&
    ageOnDate(world.people[personId]!.birthDate, world.currentDate) >= 18 &&
    !world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  );
}

function meetingChairFor(
  world: World,
  personId: EntityId,
  activity: ScheduledActivityRecord,
  notice: HistoricalEvent,
): EntityId | null {
  const jurisdictionId = activity.location.jurisdictionId;
  if (!jurisdictionId) return null;
  const earlierEntry = world.history.events.find(
    (event) =>
      event.stableKey === `${ORDINARY_MEETING_PRESENCE}:${activity.id}:entry`,
  );
  const named = [
    ...(earlierEntry?.participants ?? []),
    ...notice.participants,
  ].find(
    (actor) =>
      [
        "coordination:chair",
        "coordination:host",
        "coordination:organizer",
      ].includes(actor.role) &&
      eligibleMeetingPerson(world, personId, actor.personId, jurisdictionId),
  );
  if (named) return named.personId;
  if (earlierEntry) return null;
  const officer = localCouncilChair(world, jurisdictionId, personId);
  if (
    officer &&
    eligibleMeetingPerson(world, personId, officer, jurisdictionId)
  )
    return officer;
  // A district council can have canonical seats without the municipal vote
  // adapter used by localCouncilChair. Read those same seats for this event.
  const units = homeLocalGovernmentUnits(world, personId);
  for (const unit of [
    ...units.municipal,
    ...units.townships,
    ...units.counties,
  ]) {
    const seated = sittingLocalOfficers(world, unit).find((seat) =>
      eligibleMeetingPerson(world, personId, seat.personId, jurisdictionId),
    );
    if (seated) return seated.personId;
  }
  return null;
}

function writePresence(
  completed: World,
  personId: EntityId,
  activity: ScheduledActivityRecord,
  notice: HistoricalEvent,
  arrivalId: EntityId,
  phase: "active" | "immediate-aftermath",
  outcome: HistoricalEvent | null,
): World {
  const activityId = activity.id;
  const jurisdictionId = activity.location.jurisdictionId!;
  const baseKey = `${ORDINARY_MEETING_PRESENCE}:${activityId}`;
  const stableKey = phase === "active" ? `${baseKey}:entry` : baseKey;
  if (completed.history.events.some((event) => event.stableKey === stableKey))
    return completed;
  const available = (id: EntityId) =>
    eligibleMeetingPerson(completed, personId, id, jurisdictionId);
  const earlierEntry = completed.history.events.find(
    (event) => event.stableKey === `${baseKey}:entry`,
  );
  const arrival = completed.history.events.find(
    (event) => event.id === arrivalId,
  );
  const lateArrival =
    arrival?.tags.includes("travel:late-meeting") ??
    earlierEntry?.tags.includes("attendance:late-entry") ??
    false;
  let next = completed;
  const chairId = meetingChairFor(completed, personId, activity, notice);
  if (!chairId) return completed;
  const recordedResidents = earlierEntry?.participants.filter(
    (actor) =>
      actor.role === "presence:participant" &&
      actor.personId !== chairId &&
      available(actor.personId),
  );
  const residents = recordedResidents ?? [];
  // Finishing the same meeting keeps the office provenance recorded on entry;
  // it does not reconstruct attendance from any later change to the roster.
  const attendanceSourceTags =
    earlierEntry?.tags.filter((tag) => tag.startsWith("attendance-seat:")) ??
    [];
  if (!earlierEntry) {
    // This is the council's prospective meeting writer. Its seated officers
    // attend in their recorded official capacity; unrelated residents are not
    // promoted into attendance from their number of group memberships.
    const units = homeLocalGovernmentUnits(completed, personId);
    const unit = [
      ...units.municipal,
      ...units.townships,
      ...units.counties,
    ].find((candidate) =>
      sittingLocalOfficers(completed, candidate).some(
        (seat) => seat.personId === chairId,
      ),
    );
    const officers = unit ? sittingLocalOfficers(completed, unit) : [];
    attendanceSourceTags.push(
      ...officers
        .map((seat) => seat.participationId)
        .filter((id): id is EntityId => id !== undefined)
        .map((id) => `attendance-seat:${id}`),
    );
    const participantIds = new Set([
      ...officers.map((seat) => seat.personId),
      ...activity.participantPersonIds,
      ...notice.participants
        .filter((actor) => actor.role === "presence:participant")
        .map((actor) => actor.personId),
    ]);
    for (const id of participantIds) {
      if (id === chairId || !available(id)) continue;
      residents.push({
        personId: id,
        role: "presence:participant",
        detail: null,
      });
    }
  }
  const agenda = earlierEntry?.context.socialContext ?? PUBLIC_MEETING_AGENDA;
  const recordedVote = postedMeetingVote(next, jurisdictionId);
  const ballots =
    recordedVote?.vote.takenAt === next.currentDate
      ? recordedVote.vote.dispositions
      : [];
  const reportedBallot = (id: EntityId) => {
    const ballot = ballots.find((item) => item.personId === id);
    return ballot &&
      ["yea", "nay", "present-not-voting"].includes(ballot.disposition)
      ? `My recorded vote on ${recordedVote!.measure.designation} is ${ballot.disposition === "yea" ? "yes" : ballot.disposition === "nay" ? "no" : "present without voting"}.`
      : null;
  };
  // The council's roll call on the agenda item, when the council took one.
  const councilVote =
    phase === "active" ? null : postedMeetingVote(next, jurisdictionId);
  const voteSentence =
    phase === "active" ? null : postedMeetingVoteSentence(next, jurisdictionId);
  next = recordWorldEvent(next, {
    stableKey,
    type:
      phase === "active" ? "civic.meeting-entered" : "civic.meeting-attended",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: [
      activityId,
      personId,
      chairId,
      ...residents.map((resident) => resident.personId),
      ...(recordedVote ? [recordedVote.vote.id] : []),
    ],
    participants: [
      {
        personId,
        role: "presence:participant",
        detail:
          phase === "active"
            ? lateArrival
              ? "Entered after the meeting began"
              : "Entered the posted meeting"
            : lateArrival
              ? "Stayed from late arrival until the meeting ended"
              : "Attended the posted meeting",
      },
      {
        personId: chairId,
        role: "coordination:chair",
        detail:
          phase === "active"
            ? `The posted agenda is: ${agenda}`
            : "Chaired this meeting",
      },
      {
        personId: chairId,
        role: "presence:participant",
        detail:
          phase === "active"
            ? lateArrival
              ? "Present when the player arrived"
              : "Present as this meeting starts"
            : "Present as this meeting ended",
      },
      ...residents.map((resident) => ({
        ...resident,
        detail:
          phase === "active"
            ? (reportedBallot(resident.personId) ?? resident.detail)
            : resident.detail,
      })),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      ORDINARY_MEETING_PRESENCE,
      `phase:${phase}`,
      `minute:${completed.currentMoment.minuteOfDay}`,
      `arrival:${arrivalId}`,
      `activity:${activityId}`,
      `notice:${notice.id}`,
      ...(lateArrival ? ["attendance:late-entry"] : []),
      ...(outcome ? [`completion:${outcome.id}`] : []),
      ...attendanceSourceTags,
      ...(councilVote ? [`council-vote:${councilVote.vote.id}`] : []),
    ],
    summary:
      phase === "active"
        ? `${personName(next.people[chairId]!)} chairs the posted public meeting. The meeting is ${lateArrival ? "underway" : "starting"}.`
        : `${personName(next.people[chairId]!)} chaired the posted public meeting. ${voteSentence ?? "The discussion ended without a vote."}`,
    context: {
      location: {
        jurisdictionId,
        label: activity.location.label,
        setting: "community room",
      },
      // Where the town's council is not seated, the authored meeting has no
      // body or voting rule and records discussion only. Where it is, the
      // council's recorded roll call is the result.
      socialContext: agenda,
      pressure: null,
      choice:
        phase === "active"
          ? lateArrival
            ? "Entered after the posted meeting began"
            : "Entered the posted public meeting"
          : lateArrival
            ? "Stayed until the posted meeting ended"
            : "Attended the posted public meeting",
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  return recordEventKnowledge(next, {
    stableKey: `${stableKey}:direct-knowledge:${personId}`,
    personId,
    eventId: event.id,
    learnedAt: next.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}
