import { addDays } from "../dates";
import {
  currentLifeCutoff,
  householdLocationHistory,
  householdMembershipStateHistory,
  householdMembershipsAt,
} from "../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { factsForPerson } from "../people";
import type { EntityId, IsoDate, World } from "../types";

type Cutoff = ReturnType<typeof currentLifeCutoff>;

/** Whether a jurisdiction is the state itself or a place inside it. */
function inState(
  jurisdictionId: EntityId,
  stateJurisdictionKey: string,
): boolean {
  if (stateJurisdictionForKey(stateJurisdictionKey)?.id === jurisdictionId)
    return true;
  return (
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ===
    stateJurisdictionKey
  );
}

/**
 * Whether a jurisdiction is this exact recorded place.
 *
 * A district lies inside one locality, so the question a district-residence
 * rule asks is about the place itself, not the state around it.
 */
function isSamePlace(jurisdictionId: EntityId, homeJurisdictionId: EntityId) {
  return jurisdictionId === homeJurisdictionId;
}

/** A recorded primary home matching `covers` on this date. */
function homeCoveredOn(
  world: World,
  personId: EntityId,
  covers: (jurisdictionId: EntityId) => boolean,
  date: IsoDate,
  base: Cutoff,
): boolean {
  return householdMembershipsAt(world, personId, {
    ...base,
    asOfDate: date as Cutoff["asOfDate"],
  }).some(
    (membership) =>
      membership.state.residenceRole === "primary" &&
      membership.location !== null &&
      covers(membership.location.jurisdictionId),
  );
}

/** Every date on which this person's recorded home could have changed. */
function homeChangeDates(
  world: World,
  personId: EntityId,
  base: Cutoff,
): readonly IsoDate[] {
  const dates = new Set<IsoDate>();
  for (const membership of world.history.householdMemberships) {
    if (
      membership.personId !== personId ||
      membership.sequence >= base.historySequenceExclusive
    )
      continue;
    dates.add(membership.startedAt);
    for (const state of householdMembershipStateHistory(
      world,
      membership.id,
      base,
    ))
      dates.add(state.effectiveAt);
    for (const location of householdLocationHistory(
      world,
      membership.householdId,
      base,
    ))
      dates.add(location.effectiveAt);
  }
  return [...dates].sort();
}

/**
 * Since when a person has lived without a break somewhere `covers` matches,
 * read only from the World's own records: dated, located household
 * memberships (a childhood home from birth, the home moved into later) and any
 * active residence fact. Nothing is backdated; a person whose records begin
 * today has lived there since today.
 *
 * Recorded homes change only on recorded dates, so the answer walks those
 * dates backward. A stretch with a matching primary home extends the run; a
 * stretch without one breaks it, except a single recorded day between leaving
 * one matching home and starting the next, which is a move, not a day of
 * living nowhere. A home somewhere `covers` does not match always breaks the
 * run.
 */
function continuousResidenceSince(
  world: World,
  personId: EntityId,
  covers: (jurisdictionId: EntityId) => boolean,
  onDate: IsoDate,
): IsoDate | null {
  const person = world.people[personId];
  if (!person) return null;
  const base = currentLifeCutoff(world);

  const factStart =
    factsForPerson(person)
      .filter(
        (fact) =>
          fact.kind === "residence" &&
          fact.endedAt === null &&
          fact.occurredAt <= onDate &&
          covers(fact.jurisdictionId),
      )
      .map((fact) => fact.occurredAt)
      .sort()[0] ?? null;

  let householdStart: IsoDate | null = null;
  if (homeCoveredOn(world, personId, covers, onDate, base)) {
    const changes = homeChangeDates(world, personId, base).filter(
      (date) => date < onDate,
    );
    householdStart = onDate;
    for (let index = changes.length - 1; index >= 0; index -= 1) {
      const change = changes[index]!;
      if (homeCoveredOn(world, personId, covers, change, base)) {
        householdStart = change;
        continue;
      }
      // No matching home from `change` until `householdStart`. Only a one-day
      // move between two recorded matching homes keeps the run going.
      const oneDayMove =
        addDays(change, 1) >= householdStart &&
        homeCoveredOn(world, personId, covers, addDays(change, -1), base);
      if (!oneDayMove) break;
    }
  }

  if (factStart === null) return householdStart;
  if (householdStart === null) return factStart;
  return householdStart < factStart ? householdStart : factStart;
}

/**
 * Since when a person has lived in a state without a break. See
 * `continuousResidenceSince` for what counts as a record and what breaks a run.
 */
export function stateResidenceSince(
  world: World,
  personId: EntityId,
  stateJurisdictionKey: string,
  onDate: IsoDate = world.currentDate,
): IsoDate | null {
  return continuousResidenceSince(
    world,
    personId,
    (jurisdictionId) => inState(jurisdictionId, stateJurisdictionKey),
    onDate,
  );
}

/**
 * Since when a person has lived in one exact recorded place without a break.
 *
 * This is the clock a district-residence rule needs. A district lies inside a
 * locality, so a life that has been recorded in the same town since childhood
 * has been in that town's district for just as long, and the world already
 * knows it — from the very same household records the state clock reads.
 * Dating the district interval from anything later says a life has lived
 * nowhere, which the world's own records contradict.
 */
export function homeJurisdictionResidenceSince(
  world: World,
  personId: EntityId,
  homeJurisdictionId: EntityId,
  onDate: IsoDate = world.currentDate,
): IsoDate | null {
  return continuousResidenceSince(
    world,
    personId,
    (jurisdictionId) => isSamePlace(jurisdictionId, homeJurisdictionId),
    onDate,
  );
}
