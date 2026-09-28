import { eventById } from "./event-index";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import {
  ageOnDate,
  compareSimulationMoments,
  isoDateFromParts,
  simulationMinutesBetween,
  yearOf,
} from "./dates";
import {
  PUBLIC_MEETING_AGENDA,
  PUBLIC_MEETING_KEY,
} from "./life-opportunities";
import { nameCorpusVersionForWorld } from "./place-name-corpus";
import {
  drawCanonicalNameForGender,
  personName,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
} from "./people";
import { generatePersonIdentity } from "./person-identity";
import { recordEventKnowledge } from "./records";
import { SeededRng } from "./rng";
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

export const ORDINARY_MEETING_PRESENCE = "ordinary-meeting-presence-v1";

export type OrdinaryMeetingSpeechChoice = "support" | "oppose" | "ask";

// PLACEHOLDER(overnight): COPY-PENDING exact public-comment wording awaits
// the English engine. These are choices shown before the writer records one.
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
  const next = recordWorldEvent(world, {
    stableKey,
    type: "civic.meeting-public-comment",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: offered.activity.location.jurisdictionId,
    involvedEntityIds: [activityId, personId],
    participants: [{ personId, role: "agency:actor", detail: words }],
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
      immediateReaction: "The chair heard your comment. No vote was taken.",
    },
  });
  const comment = next.history.events.at(-1)!;
  return recordEventKnowledge(next, {
    stableKey: `${stableKey}:knowledge`,
    personId,
    eventId: comment.id,
    learnedAt: next.currentDate,
    believedSummary: comment.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
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
  return notice ? { activity, notice, arrival } : null;
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
    id !== personId &&
    !!completed.people[id] &&
    completed.people[id]!.homeJurisdictionId === jurisdictionId &&
    ageOnDate(completed.people[id]!.birthDate, completed.currentDate) >= 18 &&
    !completed.history.personDeaths.some(
      (death) => death.personId === id && death.diedAt <= completed.currentDate,
    );
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
  const recordedChair = [
    ...(earlierEntry?.participants ?? []),
    ...notice.participants,
  ].find(
    (actor) =>
      [
        "coordination:chair",
        "coordination:host",
        "coordination:organizer",
      ].includes(actor.role) && available(actor.personId),
  );
  if (earlierEntry && !recordedChair) return completed;
  let next = completed;
  let chairId = recordedChair?.personId;
  // Where the town's council is seated, the posted meeting is its meeting and
  // its mayor or a member chairs it.
  const councilChair = localCouncilChair(completed, jurisdictionId, personId);
  if (!chairId && councilChair && available(councilChair))
    chairId = councilChair;
  if (!chairId) {
    const key = `${baseKey}:chair`;
    const rng = new SeededRng(completed.seed).fork(key);
    const identity = generatePersonIdentity(rng.fork("identity"));
    next = createCharacterHistoryContextPerson(completed, {
      stableKey: key,
      ...drawCanonicalNameForGender(
        rng,
        identity.gender,
        nameCorpusVersionForWorld(completed, jurisdictionId),
        DISTINCT_GIVEN_NAME_GENERATION_VERSION,
      ),
      identity,
      birthDate: isoDateFromParts(
        yearOf(completed.currentDate) - rng.integer(30, 66),
        rng.integer(1, 13),
        rng.integer(1, 29),
      ),
      homeJurisdictionId: jurisdictionId,
    });
    chairId = characterHistoryContextPersonId(next, key);
  }
  const recordedResidents = earlierEntry?.participants.filter(
    (actor) =>
      actor.role === "presence:participant" &&
      actor.personId !== chairId &&
      available(actor.personId),
  );
  const residents = recordedResidents ?? [];
  if (!earlierEntry) {
    // PLACEHOLDER(overnight): These two game-authored residents and exact words
    // await English review. They are written as event participants before a
    // scene can show them; no reader creates a person or a line.
    const lines = [
      "I support opening this room one extra evening each week.",
      "What hours are proposed, and who would pay for them?",
    ];
    for (const [index, line] of lines.entries()) {
      const key = `${baseKey}:resident:${index}`;
      const rng = new SeededRng(completed.seed).fork(key);
      const identity = generatePersonIdentity(rng.fork("identity"));
      next = createCharacterHistoryContextPerson(next, {
        stableKey: key,
        ...drawCanonicalNameForGender(
          rng,
          identity.gender,
          nameCorpusVersionForWorld(completed, jurisdictionId),
          DISTINCT_GIVEN_NAME_GENERATION_VERSION,
        ),
        identity,
        birthDate: isoDateFromParts(
          yearOf(completed.currentDate) - rng.integer(30, 66),
          rng.integer(1, 13),
          rng.integer(1, 29),
        ),
        homeJurisdictionId: jurisdictionId,
      });
      residents.push({
        personId: characterHistoryContextPersonId(next, key),
        role: "presence:participant",
        detail: line,
      });
    }
  }
  const agenda = earlierEntry?.context.socialContext ?? PUBLIC_MEETING_AGENDA;
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
          phase === "active" ? "Chairs this meeting" : "Chaired this meeting",
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
      ...residents,
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
      // PLACEHOLDER(overnight): Where the town's council is not seated, the
      // authored meeting has no body or voting rule and records discussion
      // only. Where it is, the council's recorded roll call is the result.
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
