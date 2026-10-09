import { eventById } from "../event-index";
import { recordByStableKey } from "../history-index";
import { recordEventKnowledge } from "../records";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import {
  LIVED_OUTCOME_REFLECTION_PREFIX,
  NON_MONEY_FELT_SIZE,
  scheduleLivedOutcomeReflection,
} from "../law-exposure";
import type { LivedOutcome } from "../living-world/lived-outcomes";
import type { EntityId, FutureDueItem, HistoricalEvent, World } from "../types";
import { countyOfficeWork } from "./county-office-work";
import {
  ARRESTING_OFFICER_ROLE,
  countyUnitForJurisdiction,
} from "./county-offices";
import { PRETRIAL_HELD_EVENT, PROSECUTION_SENTENCED_EVENT } from "./jail-terms";

/** Read the actor from the saved act, or the sheriff in office on the custody date. */
function answeringOfficer(
  world: World,
  event: HistoricalEvent,
): EntityId | null {
  const unit = countyUnitForJurisdiction(event.jurisdictionId);
  if (!unit) return null;
  const work = countyOfficeWork(
    { ...world, currentDate: event.occurredAt },
    unit,
    event.occurredAt,
    event.occurredAt,
  );
  if (event.type === "crime.arrest-made")
    return (
      event.participants.find((row) => row.role === ARRESTING_OFFICER_ROLE)
        ?.personId ?? null
    );
  if (event.type === "justice.charged")
    return work.prosecutor.chargedEventIds.includes(event.id)
      ? (event.participants.find((row) => row.role === "agency:decided")
          ?.personId ?? null)
      : null;
  return work.sheriff.bookingEventIds.includes(event.id)
    ? work.sheriff.sheriffPersonId
    : null;
}

function subjectOf(event: HistoricalEvent): EntityId | null {
  if (event.type === "crime.arrest-made")
    return (
      (event.tags
        .find((tag) => tag.startsWith("crime:offender:"))
        ?.slice("crime:offender:".length) as EntityId) ?? null
    );
  if (
    event.type !== "justice.charged" &&
    event.type !== PRETRIAL_HELD_EVENT &&
    !(
      event.type === PROSECUTION_SENTENCED_EVENT &&
      event.tags.includes("justice.sentence:jail")
    )
  )
    return null;
  return (
    event.participants.find((row) => row.role === "focus:defendant")
      ?.personId ?? null
  );
}

/** Only the subject and the household recorded when the act happened share it. */
export function countyOfficeAffectedPeople(
  world: World,
  event: HistoricalEvent,
): readonly EntityId[] {
  const subjectId = subjectOf(event);
  if (!subjectId || !world.people[subjectId]) return [];
  const cutoff = { ...currentLifeCutoff(world), asOfDate: event.occurredAt };
  return [
    ...new Set([
      subjectId,
      ...householdMembershipsAt(world, subjectId, cutoff).flatMap(
        ({ household }) => peopleInHouseholdAt(world, household.id, cutoff),
      ),
    ]),
  ];
}

/** Producers call this once after saving an arrest, charge, or jail booking. */
export function scheduleCountyOfficeReflections(
  world: World,
  eventId: EntityId,
): World {
  const event = eventById(world, eventId);
  if (!event || event.occurredAt > world.currentDate || !subjectOf(event))
    return world;
  const officialId = answeringOfficer(world, event);
  if (!officialId) return world;
  return countyOfficeAffectedPeople(world, event).reduce((next, personId) => {
    if (personId === officialId) return next;
    const stableKey = `county-office-work:knowledge:${event.id}:${personId}`;
    const informed = recordByStableKey(next.history.knowledge, stableKey)
      ? next
      : recordEventKnowledge(next, {
          stableKey,
          personId,
          eventId: event.id,
          learnedAt: world.currentDate,
          believedSummary: event.summary,
          accuracy: "accurate",
          confidence: "high",
          source:
            personId === subjectOf(event)
              ? { kind: "direct" }
              : {
                  kind: "told-by",
                  sourcePersonId: subjectOf(event)!,
                  claimId: null,
                },
        });
    return scheduleLivedOutcomeReflection(informed, personId, event.id);
  }, world);
}

/** Direct source lookup avoids scanning case histories on every reflection. */
export function countyOfficeOutcomeForReflection(
  world: World,
  dueItem: FutureDueItem,
): LivedOutcome | null {
  const personId = dueItem.entityIds[0];
  if (
    !personId ||
    !dueItem.stableKey.startsWith(LIVED_OUTCOME_REFLECTION_PREFIX)
  )
    return null;
  const eventId = dueItem.stableKey.slice(
    LIVED_OUTCOME_REFLECTION_PREFIX.length,
    -(personId.length + 1),
  );
  const event = eventById(world, eventId);
  if (
    !event ||
    event.occurredAt > world.currentDate ||
    !countyOfficeAffectedPeople(world, event).includes(personId)
  )
    return null;
  const answeringPersonId = answeringOfficer(world, event);
  if (!answeringPersonId) return null;
  return {
    kind: "county-justice",
    at: event.occurredAt,
    sourceRecordId: event.id,
    direction: "cost",
    felt: { share: NON_MONEY_FELT_SIZE.monthsOfPay, estimated: true },
    answeringPersonId,
    summary: event.summary,
    explanationKey: `county-office-work|${event.type}|${event.id}`,
    sourceKnowledgeId: recordByStableKey(
      world.history.knowledge,
      `county-office-work:knowledge:${event.id}:${personId}`,
    )?.id,
    informedPersonIds: countyOfficeAffectedPeople(world, event),
  };
}
