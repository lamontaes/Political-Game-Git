import filingOfficeData from "../../data/research/elections/filing-office.json" with { type: "json" };
import {
  addDays,
  addSimulationMinutes,
  compareSimulationMoments,
  simulationMomentAtLocalTime,
} from "./dates";
import { filingOfficeForSeat, type FilingOffice } from "./filing-office";
import {
  ensureLocalClerkForUnit,
  playerHousemates,
} from "./living-world/local-government-seats";
import { playerTown } from "./living-world/town-residents";
import { recordEventKnowledge } from "./records";
import {
  createScheduledActivity,
  scheduledActivityState,
  scheduledConflictExists,
} from "./time-work";
import type {
  EntityId,
  IsoDate,
  ScheduledActivityRecord,
  SimulationMoment,
  World,
} from "./types";
import { advanceWithWorldIntegrityAtEnd, recordWorldEvent } from "./world";

/**
 * A visit to the office where a candidate for a local seat files.
 *
 * The visit is an ordinary calendar commitment, with the same local journey
 * the community room uses, held during the office's hours with the clerk who
 * takes filings there (`filing-office.ts`). Where nobody holds the clerk's
 * office yet, a grown resident of the town is seated in it first, the same
 * way the town's board is seated. Asking about the seat and filing happen in
 * the scene once the player arrives (`clerk-filing-scene.ts`).
 */
export const FILING_VISIT_VERSION = "filing-visit/v1";
/** The calendar location of a filing office; arrival records it as a place. */
export const FILING_OFFICE_LOCATION_KEY = "civic:filing-office";
export const FILING_VISIT_REQUESTED = "civic.filing-visit-requested";
/** How many days ahead a visit is looked for. */
const SEARCH_DAYS = 14;
/** Visits start on the half hour. */
const SLOT_MINUTES = 30;

const HOURS = filingOfficeData.officeHours;
const VISIT_MINUTES = filingOfficeData.visitMinutes.value;
export const FILING_OFFICE_JOURNEY_KEY = filingOfficeData.journey.journeyKey;
const JOURNEY_MINUTES = filingOfficeData.journey.minutes;

export interface FilingVisitPlan {
  readonly office: FilingOffice;
  readonly clerkPersonId: EntityId;
  readonly leave: SimulationMoment;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
}

function momentOn(world: World, date: IsoDate, minute: number) {
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay: minute,
    timeZone: world.currentMoment.timeZone,
    preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
  });
}

function weekday(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** The first open slot within office hours when the player and clerk are both free. */
function firstOpenSlot(
  world: World,
  personId: EntityId,
  clerkPersonId: EntityId,
): Omit<FilingVisitPlan, "office" | "clerkPersonId"> | null {
  for (let offset = 0; offset < SEARCH_DAYS; offset += 1) {
    const date = addDays(world.currentDate, offset);
    if (!HOURS.weekdays.includes(weekday(date))) continue;
    for (
      let minute = HOURS.openMinute;
      minute + VISIT_MINUTES <= HOURS.closeMinute;
      minute += SLOT_MINUTES
    ) {
      const start = momentOn(world, date, minute);
      const leave = addSimulationMinutes(start, -JOURNEY_MINUTES);
      if (compareSimulationMoments(leave, world.currentMoment) <= 0) continue;
      const end = addSimulationMinutes(start, VISIT_MINUTES);
      if (scheduledConflictExists(world, [personId], leave, end)) continue;
      if (scheduledConflictExists(world, [clerkPersonId], start, end)) continue;
      return { leave, start, end };
    }
  }
  return null;
}

/** The filing visits this person has on the calendar that are still to come. */
export function scheduledFilingVisits(
  world: World,
  personId: EntityId,
): readonly ScheduledActivityRecord[] {
  return world.history.scheduledActivities.filter(
    (activity) =>
      activity.location.locationKey === FILING_OFFICE_LOCATION_KEY &&
      activity.responsiblePersonId === personId &&
      scheduledActivityState(world, activity.id).status === "scheduled",
  );
}

/**
 * When a visit about this seat could be held, without writing anything. Null
 * when the seat files nowhere the game can place, or no slot is free.
 */
export function planFilingVisit(
  world: World,
  personId: EntityId,
  officeKey: string,
): FilingVisitPlan | null {
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  const office = filingOfficeForSeat(world, officeKey);
  if (!office?.clerkPersonId) return null;
  const slot = firstOpenSlot(world, personId, office.clerkPersonId);
  return slot ? { office, clerkPersonId: office.clerkPersonId, ...slot } : null;
}

/** Seat the office's clerk where nobody holds it, so a visit has someone to see. */
export function ensureFilingClerk(
  world: World,
  personId: EntityId,
  officeKey: string,
): World {
  const office = filingOfficeForSeat(world, officeKey);
  if (!office || office.clerkPersonId) return world;
  const town = playerTown(world, personId);
  if (!town) return world;
  return ensureLocalClerkForUnit(
    world,
    office.unit,
    town,
    playerHousemates(world, personId),
  );
}

/**
 * Put a visit to the filing office for this seat on the calendar: the clerk's
 * hours, the local journey there, and the request on the record. Returns the
 * same World when nothing can be arranged.
 */
export function requestFilingVisit(
  world: World,
  personId: EntityId,
  officeKey: string,
): World {
  const person = world.people[personId];
  if (!person) return world;
  if (scheduledFilingVisits(world, personId).length > 0) return world;
  return advanceWithWorldIntegrityAtEnd(() => {
    const staffed = ensureFilingClerk(world, personId, officeKey);
    const plan = planFilingVisit(staffed, personId, officeKey);
    if (!plan) return world;
    const town = playerTown(staffed, personId) ?? person.homeJurisdictionId;
    const ordinal =
      staffed.history.events.filter(
        (event) =>
          event.type === FILING_VISIT_REQUESTED &&
          event.involvedEntityIds.includes(personId),
      ).length + 1;
    const key = `${FILING_VISIT_VERSION}:${personId}:${officeKey}:${ordinal}`;
    let next = recordWorldEvent(staffed, {
      stableKey: `${key}:requested`,
      type: FILING_VISIT_REQUESTED,
      occurredAt: staffed.currentDate,
      recordedAt: staffed.currentDate,
      jurisdictionId: town,
      involvedEntityIds: [personId, plan.clerkPersonId],
      participants: [
        { personId, role: "agency:actor", detail: officeKey },
        {
          personId: plan.clerkPersonId,
          role: "agency:asked",
          detail: plan.office.clerkTitle,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FILING_VISIT_VERSION,
        `office:${officeKey}`,
        `unit:${plan.office.unit.id}`,
        `administration:${plan.office.administration}`,
      ],
      summary: FILING_VISIT_REQUESTED,
      context: {
        location: {
          jurisdictionId: town,
          label: plan.office.governmentName,
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: officeKey,
        motivation: null,
        immediateReaction: null,
      },
    });
    const request = next.history.events.at(-1)!;
    next = recordEventKnowledge(next, {
      stableKey: `${key}:requested:knowledge`,
      personId,
      eventId: request.id,
      learnedAt: next.currentDate,
      believedSummary: request.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const access = {
      kind: "private" as const,
      personIds: [personId, plan.clerkPersonId].sort(),
    };
    next = createScheduledActivity(next, {
      stableKey: `${key}:hold`,
      title: plan.office.clerkTitle,
      summary: plan.office.governmentName,
      kind: "confirmed",
      start: plan.start,
      end: plan.end,
      participantPersonIds: [personId, plan.clerkPersonId],
      responsiblePersonId: personId,
      location: {
        locationKey: FILING_OFFICE_LOCATION_KEY,
        label: plan.office.governmentName,
        jurisdictionId: town,
      },
      sourceEntityIds: [request.id],
      flexibility: { kind: "fixed" },
      access,
    });
    const hold = next.history.scheduledActivities.at(-1)!;
    return createScheduledActivity(next, {
      stableKey: `${key}:journey`,
      title: plan.office.governmentName,
      summary: plan.office.governmentName,
      kind: "travel",
      start: plan.leave,
      end: plan.start,
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: FILING_OFFICE_JOURNEY_KEY,
        label: plan.office.governmentName,
        jurisdictionId: town,
      },
      sourceEntityIds: [hold.id],
      flexibility: { kind: "fixed" },
      access,
    });
  }, world);
}
