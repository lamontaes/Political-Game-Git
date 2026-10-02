import { currentPresidentOf } from "./crisis/offices";
import { ageOnDate } from "./dates";
import { currentFederalTenure } from "./federal-tenures";
import { nationalOfficeHolder } from "./national-election-consumer";
import { viewOfOfficial } from "./official-view-reads";
import { majorPartyOf } from "./statewide-electorate";
import type { IsoDate, World } from "./types";

// Each immutable World counts its people once, rather than once per seat.
const shifts = new WeakMap<World, number>();

/**
 * The president's party gains or loses the change in recorded favorable
 * standing since entry into office. Both snapshots use the same recorded
 * adult cohort and each person counts once. No support updates means no
 * change: that is a missing producer, not a historical mean penalty.
 */
export function nationalMoodDemocraticShift(
  world: World,
  electionDate: IsoDate,
): number {
  const year = Number(electionDate.slice(0, 4));
  if (year % 2 !== 0 || year % 4 === 0) return 0;
  const cached = shifts.get(world);
  if (cached !== undefined) return cached;
  const president = currentPresidentOf(world);
  if (!president) return 0;
  const elected = nationalOfficeHolder(world, "president");
  const tenure = elected ? null : currentFederalTenure(world, "us-president");
  const inauguration =
    elected?.succession?.effectiveAt.date ??
    elected?.state.effectiveAt.date ??
    tenure?.startedAt;
  const entrySequence =
    elected?.succession?.sequence ??
    elected?.state.sequence ??
    tenure?.event.sequence;
  if (!inauguration || entrySequence === undefined) return 0;
  const baselineCutoff = {
    asOfDate: inauguration,
    historySequenceExclusive: entrySequence + 1,
  };
  let adults = 0;
  let baseline = 0;
  let current = 0;
  for (const personId of new Set(world.personOrder)) {
    const person = world.people[personId];
    if (!person || ageOnDate(person.birthDate, world.currentDate) < 18)
      continue;
    adults += 1;
    if (
      viewOfOfficial(world, personId, president.personId, baselineCutoff).belief
        ?.position === "support"
    )
      baseline += 1;
    if (
      viewOfOfficial(world, personId, president.personId).belief?.position ===
      "support"
    )
      current += 1;
  }
  const change = adults === 0 ? 0 : (current - baseline) / adults;
  if (change === 0) {
    shifts.set(world, 0);
    return 0;
  }
  const party = majorPartyOf(world, president.personId, world.currentDate);
  const shift =
    party === "democratic" ? change : party === "republican" ? -change : 0;
  shifts.set(world, shift);
  return shift;
}
