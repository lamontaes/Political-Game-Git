import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import {
  ageOnDate,
  compareSimulationMoments,
  isoDateFromParts,
  yearOf,
} from "./dates";
import { PUBLIC_MEETING_KEY } from "./life-opportunities";
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

export const ORDINARY_MEETING_PRESENCE = "ordinary-meeting-presence-v1";

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
  const outcome = completed.history.events.find(
    (event) => event.id === state.outcomeEventId,
  );
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
    compareSimulationMoments(world.currentMoment, state.start) !== 0
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
    !arrival.tags.includes("route:ordinary-life:to-meeting-room") ||
    arrival.context.location?.jurisdictionId !==
      activity.location.jurisdictionId ||
    arrival.context.location.label !== activity.location.label
  )
    return null;
  const journey = world.history.scheduledActivities.find(
    (entry) =>
      arrival.involvedEntityIds.includes(entry.id) &&
      entry.kind === "travel" &&
      entry.responsiblePersonId === personId &&
      entry.location.locationKey === "ordinary-life:to-meeting-room" &&
      entry.sourceEntityIds.includes(activityId) &&
      scheduledActivityState(world, entry.id).status === "completed" &&
      compareSimulationMoments(
        scheduledActivityState(world, entry.id).end,
        state.start,
      ) === 0,
  );
  if (!journey) return null;
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
  if (!chairId) {
    const key = `${baseKey}:chair`;
    const rng = new SeededRng(completed.seed).fork(key);
    const identity = generatePersonIdentity(rng.fork("identity"));
    next = createCharacterHistoryContextPerson(completed, {
      stableKey: key,
      ...drawCanonicalNameForGender(
        rng,
        identity.gender,
        undefined,
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
  next = recordWorldEvent(next, {
    stableKey,
    type:
      phase === "active" ? "civic.meeting-entered" : "civic.meeting-attended",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: [activityId, personId, chairId],
    participants: [
      {
        personId,
        role: "presence:participant",
        detail:
          phase === "active"
            ? "Entered the posted meeting"
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
            ? "Present as this meeting starts"
            : "Present as this meeting ended",
      },
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
      ...(outcome ? [`completion:${outcome.id}`] : []),
    ],
    summary:
      phase === "active"
        ? `${personName(next.people[chairId]!)} chairs the posted public meeting. The meeting is starting.`
        : `${personName(next.people[chairId]!)} chaired the posted public meeting. The meeting has ended.`,
    context: {
      location: {
        jurisdictionId,
        label: activity.location.label,
        setting: "community room",
      },
      socialContext:
        phase === "active"
          ? "The start of the posted public meeting"
          : "The immediate aftermath of the posted public meeting",
      pressure: null,
      choice:
        phase === "active"
          ? "Entered the posted public meeting"
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
