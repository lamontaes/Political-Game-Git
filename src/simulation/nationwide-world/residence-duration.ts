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

/** A recorded primary home located in the state on this date. */
function homeInStateOn(
  world: World,
  personId: EntityId,
  stateJurisdictionKey: string,
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
      inState(membership.location.jurisdictionId, stateJurisdictionKey),
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
 * Since when a person has lived in a state without a break, read only from
 * the World's own records: dated, located household memberships (a
 * childhood home from birth, the home moved into later) and any active
 * residence fact. Nothing is backdated; a person whose records begin today has
 * lived there since today.
 *
 * Recorded homes change only on recorded dates, so the answer walks those
 * dates backward. A stretch with an in-state primary home extends the run; a
 * stretch without one breaks it, except a single recorded day between leaving
 * one in-state home and starting the next, which is a move, not a day of
 * living nowhere. A home in another state always breaks the run.
 */
export function stateResidenceSince(
  world: World,
  personId: EntityId,
  stateJurisdictionKey: string,
  onDate: IsoDate = world.currentDate,
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
          inState(fact.jurisdictionId, stateJurisdictionKey),
      )
      .map((fact) => fact.occurredAt)
      .sort()[0] ?? null;

  let householdStart: IsoDate | null = null;
  if (homeInStateOn(world, personId, stateJurisdictionKey, onDate, base)) {
    const changes = homeChangeDates(world, personId, base).filter(
      (date) => date < onDate,
    );
    householdStart = onDate;
    for (let index = changes.length - 1; index >= 0; index -= 1) {
      const change = changes[index]!;
      if (homeInStateOn(world, personId, stateJurisdictionKey, change, base)) {
        householdStart = change;
        continue;
      }
      // No in-state home from `change` until `householdStart`. Only a one-day
      // move between two recorded in-state homes keeps the run going.
      const oneDayMove =
        addDays(change, 1) >= householdStart &&
        homeInStateOn(
          world,
          personId,
          stateJurisdictionKey,
          addDays(change, -1),
          base,
        );
      if (!oneDayMove) break;
    }
  }

  if (factStart === null) return householdStart;
  if (householdStart === null) return factStart;
  return householdStart < factStart ? householdStart : factStart;
}
