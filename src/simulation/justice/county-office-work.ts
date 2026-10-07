import type { GovernmentUnitIdentity } from "../government-units";
import {
  eventsOfType,
  heldBeforeTrialOn,
  jailTermOn,
  PRETRIAL_HELD_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  sentencedPersonOf,
} from "./jail-terms";
import {
  ARRESTING_OFFICER_ROLE,
  countyUnitForJurisdiction,
} from "./county-offices";
import {
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_DECLINED_EVENT,
  PROSECUTION_REFERRED_EVENT,
} from "./prosecution";
import { sittingCountyRowOfficers } from "../living-world/local-government-seats";
import { CRIME_EVENT_TYPES } from "../crime/producer";
import { addDays } from "../dates";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";

/**
 * What a county's sheriff and prosecutor did over a window, read from the
 * world's own events (CO-4). Nothing here advances time, writes a record or
 * invents a fact: it groups what the crime and justice producers already
 * recorded under the county that holds each town, and names the person
 * sitting in the office when the producer put one on the record.
 */

export interface CountySheriffWork {
  readonly sheriffPersonId: EntityId | null;
  /** Arrests the sheriff made, from the arrest records that name them. */
  readonly arrestEventIds: readonly EntityId[];
  /** Arrests in the county's towns with no sheriff named on the record. */
  readonly arrestsWithoutSheriff: number;
  /** People taken into custody in the window: held before trial or sentenced to jail. */
  readonly bookingEventIds: readonly EntityId[];
  /** People in the county's jail the day before the window opens, and on its last day. */
  readonly jailPopulationAtStart: number;
  readonly jailPopulationAtEnd: number;
}

export interface CountyProsecutorWork {
  readonly prosecutorPersonId: EntityId | null;
  readonly referralEventIds: readonly EntityId[];
  /** Charging decisions this person made, and what each decided. */
  readonly chargedEventIds: readonly EntityId[];
  readonly declinedEventIds: readonly EntityId[];
}

export interface CountyOfficeWork {
  readonly countyUnitId: string;
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly sheriff: CountySheriffWork;
  readonly prosecutor: CountyProsecutorWork;
}

const inWindow = (event: HistoricalEvent, from: IsoDate, to: IsoDate) =>
  event.occurredAt >= from && event.occurredAt <= to;

function inCounty(event: HistoricalEvent, unit: GovernmentUnitIdentity) {
  return countyUnitForJurisdiction(event.jurisdictionId)?.id === unit.id;
}

/** The people held in this county's jail on `date`, before trial or serving a term. */
function jailPopulationOn(
  world: World,
  unit: GovernmentUnitIdentity,
  date: IsoDate,
): number {
  const held = new Set<EntityId>();
  for (const type of [PRETRIAL_HELD_EVENT, PROSECUTION_SENTENCED_EVENT])
    for (const event of eventsOfType(world, type)) {
      if (event.occurredAt > date || !inCounty(event, unit)) continue;
      const personId = sentencedPersonOf(event);
      if (!personId || held.has(personId)) continue;
      if (
        heldBeforeTrialOn(world, personId, date) ||
        jailTermOn(world, personId, date) !== null
      )
        held.add(personId);
    }
  return held.size;
}

export function countyOfficeWork(
  world: World,
  unit: GovernmentUnitIdentity,
  from: IsoDate,
  to: IsoDate,
): CountyOfficeWork {
  const holders = sittingCountyRowOfficers(world, unit);
  const sheriff =
    holders.filter((row) => row.office === "sheriff").at(0)?.personId ?? null;
  const prosecutor =
    holders.filter((row) => row.office === "prosecutor").at(0)?.personId ??
    null;

  const arrests = eventsOfType(world, CRIME_EVENT_TYPES.arrest).filter(
    (event) => inWindow(event, from, to) && inCounty(event, unit),
  );
  const bookings = [PRETRIAL_HELD_EVENT, PROSECUTION_SENTENCED_EVENT].flatMap(
    (type) =>
      eventsOfType(world, type).filter(
        (event) =>
          inWindow(event, from, to) &&
          inCounty(event, unit) &&
          (type === PRETRIAL_HELD_EVENT ||
            event.tags.includes("justice.sentence:jail")),
      ),
  );
  const decisions = (type: string) =>
    eventsOfType(world, type).filter(
      (event) =>
        inWindow(event, from, to) &&
        inCounty(event, unit) &&
        prosecutor !== null &&
        event.participants.some(
          (row) => row.role === "agency:decided" && row.personId === prosecutor,
        ),
    );
  return {
    countyUnitId: unit.id,
    from,
    to,
    sheriff: {
      sheriffPersonId: sheriff,
      arrestEventIds: arrests
        .filter((event) =>
          event.participants.some(
            (row) =>
              row.role === ARRESTING_OFFICER_ROLE && row.personId === sheriff,
          ),
        )
        .map((event) => event.id),
      arrestsWithoutSheriff: arrests.filter(
        (event) =>
          !event.participants.some(
            (row) => row.role === ARRESTING_OFFICER_ROLE,
          ),
      ).length,
      bookingEventIds: bookings.map((event) => event.id),
      jailPopulationAtStart: jailPopulationOn(world, unit, addDays(from, -1)),
      jailPopulationAtEnd: jailPopulationOn(world, unit, to),
    },
    prosecutor: {
      prosecutorPersonId: prosecutor,
      referralEventIds: eventsOfType(world, PROSECUTION_REFERRED_EVENT)
        .filter((event) => inWindow(event, from, to) && inCounty(event, unit))
        .map((event) => event.id),
      chargedEventIds: decisions(PROSECUTION_CHARGED_EVENT).map(
        (event) => event.id,
      ),
      declinedEventIds: decisions(PROSECUTION_DECLINED_EVENT).map(
        (event) => event.id,
      ),
    },
  };
}
