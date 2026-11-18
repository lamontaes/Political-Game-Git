/**
 * Who in the town watched the President's address as it aired (A47, "The
 * first word on the address": a neighbor, a coworker the next morning, a
 * regular where people gather holds it on record, having watched it).
 *
 * The press's own audience rule decides, as it decides who follows an outlet
 * (`audienceOfKind`, src/core2/modules/press.ts): people are taken in the
 * order of their news habit (`habitOf`, the press's kept `habitScore`: how closely they follow politics,
 * their view's engagement against its survey cell, plus every trait's lean
 * toward keeping up), up to the share of residents the real audience gives
 * (Nielsen's inaugural audiences, `addressWatchedLiveShare`). Watching is a
 * household's evening: a house whose most habitual adult is home at the
 * airing hour (no shift of theirs covers it, by the work engine's schedule)
 * has it on, and everyone home with them sees it, as the player's household
 * does. No one is rolled for: the same town on the same evening has the same
 * people watching.
 *
 * Read once, on the address's own day, over the town's full residents; the
 * counted population holds no knowledge (two-level rule, Oct 11), so its
 * share is the same parameter times its count and nothing is written for it.
 * Someone filled in from the counts in the weeks after (a coworker met the
 * next morning, a regular at the diner) is read by the same rule at that
 * moment (`watchedAtFillIn`): their household had it on if its lead adult's
 * habit reaches the habit the town's last household taken had, and they
 * were home at the hour, so the person met matches what the town's share
 * already counted.
 */
import airing from "../core2/data/opening/address-airing.json" with { type: "json" };
import { isDemoted } from "../core2/counted-groups";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { atWork } from "../core2/modules/campaigns";
import { heardOnAir } from "../core2/modules/news";
import { habitOf } from "../core2/modules/press";
import { P } from "../core2/parameters";
import { registerWorldMapPart } from "../core2/snapshot";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import { addressAiring } from "./address-airing";
import directorJson from "./data/director.json" with { type: "json" };

const WATCHED = airing.watchedShare;

/** The share of a place's residents who watch the address live (SOURCED, Nielsen; see address-airing.json). */
export const addressWatchedShare = (): number => WATCHED.value;

export interface AddressAudience {
  /** Everyone in the town who watched it, the player's household first, then each household that had it on, in the order they were taken. */
  readonly watcherIds: readonly PersonId[];
  /** How many watchers the town's share asked for: the share times the town's full residents, rounded. */
  readonly target: number;
  /** The town's full residents the share was read against. */
  readonly residents: number;
  /** The news habit of the last household's lead adult taken: the habit a household needed to have it on. */
  readonly cut: number | null;
  /** The local date and clock minute the address aired at, whose shifts kept people out. */
  readonly airedOn: string;
  readonly airedAtMinute: number;
}

/** Whether a person is at a shift at this minute of this day, by their open work commitments. */
function atShift(
  core: Readonly<CoreState>,
  personId: PersonId,
  date: string,
  minute: number,
): boolean {
  for (const id of core.work.commitmentsByPerson.get(personId) ?? []) {
    const row = core.work.commitments.get(id);
    if (!row) continue;
    // Someone filled in later held the job before their commitment's first
    // day in play: their shifts on the evening it aired are the same shifts.
    const since =
      row.heldSince && row.heldSince < row.startsAt
        ? { ...row, startsAt: row.heldSince }
        : row;
    if (atWork(since, date, minute)) return true;
  }
  return false;
}

/**
 * The town's watchers of an address airing today at `placeId`: the
 * household given (the player's) watches it as the opening tells it, and
 * counts toward the share; then households by their lead adult's news habit,
 * highest first (ties by id), each bringing everyone home at the hour, until
 * the share of the town's full residents is reached.
 */
export function addressAudience(
  core: CoreState,
  placeId: string,
  watchingHousehold: readonly PersonId[],
): AddressAudience {
  const api = coreAPI(core);
  const { minuteOfDay, shiftsDay } = addressAiring(core, placeId);
  // Where the airing falls on the next local date (Guam, the Northern
  // Marianas), the shifts read are that date's.
  const date = shiftsDay
    ? addDays(makeIsoDate(core.date), P.one)
    : makeIsoDate(core.date);
  const adultAge = P.votingAge;
  const homes = new Map<string, PersonState[]>();
  let residents = P.zero;
  for (const id of core.peopleByPlace.get(placeId) ?? []) {
    const person = core.people.get(id);
    if (!person?.alive || isDemoted(person)) continue;
    residents += P.one;
    if (atShift(core, person.id, date, minuteOfDay)) continue;
    const list = homes.get(person.householdId) ?? [];
    list.push(person);
    homes.set(person.householdId, list);
  }
  const target = Math.round(WATCHED.value * residents);
  const taken = new Set<PersonId>(watchingHousehold);
  const watcherIds: PersonId[] = [...watchingHousehold];
  const watching = new Set(
    watchingHousehold.map((id) => core.people.get(id)?.householdId),
  );
  const leads: { householdId: string; habit: number }[] = [];
  for (const [householdId, people] of homes) {
    if (watching.has(householdId)) continue;
    let habit: number | null = null;
    for (const person of people) {
      if (ageOnDate(person.birthDate, core.date) < adultAge) continue;
      const score = habitOf(api, person);
      if (habit === null || score > habit) habit = score;
    }
    if (habit !== null) leads.push({ householdId, habit });
  }
  leads.sort(
    (a, b) => b.habit - a.habit || a.householdId.localeCompare(b.householdId),
  );
  let cut: number | null = null;
  for (const lead of leads) {
    // At least one house beyond the one given has it on: a town where the
    // player's household alone makes the share still has others watching.
    if (cut !== null && watcherIds.length >= target) break;
    // The last house taken is the one that brings the count nearest the
    // share: a large household that would overshoot it by more than the
    // count falls short is not taken, and the count stops there.
    const size = homes
      .get(lead.householdId)!
      .filter((person) => !taken.has(person.id)).length;
    if (
      cut !== null &&
      watcherIds.length + size - target > target - watcherIds.length
    )
      break;
    for (const person of homes.get(lead.householdId)!)
      if (!taken.has(person.id)) {
        taken.add(person.id);
        watcherIds.push(person.id);
      }
    cut = lead.habit;
  }
  return {
    watcherIds,
    target,
    residents,
    cut,
    airedOn: date,
    airedAtMinute: minuteOfDay,
  };
}

/** An address's audience as kept for the people filled in after it. */
interface KeptAudience {
  readonly eventId: string;
  readonly date: string;
  readonly placeId: string;
  readonly cut: number;
  readonly airedOn: string;
  readonly airedAtMinute: number;
}

/** The recent addresses' audiences, kept across days (a save keeps them). */
const kept = new WeakMap<CoreState, KeptAudience[]>();
registerWorldMapPart("director-address-audience", kept);

/** The days after an address a person filled in is still read for having watched it: the days it is the talk of the town (`directorTalkAddressDays`). */
const keptDays = (): number =>
  directorJson.parameters.directorTalkAddressDays.value;

/** Keep an address's audience rule, so people filled in during its weeks are read by it. */
export function keepAddressAudience(
  core: CoreState,
  eventId: string,
  placeId: string,
  audience: AddressAudience,
): void {
  if (audience.cut === null) return;
  const since = addDays(makeIsoDate(core.date), -keptDays());
  kept.set(core, [
    ...(kept.get(core) ?? []).filter((row) => row.date > since),
    {
      eventId,
      date: core.date,
      placeId,
      cut: audience.cut,
      airedOn: audience.airedOn,
      airedAtMinute: audience.airedAtMinute,
    },
  ]);
}

/**
 * A household just filled in from the counts, read against each address its
 * town watched in the last weeks: if its lead adult home at the hour has the
 * habit the town's last household taken had, everyone of it home then holds
 * the address from its own record, as watched on the evening it aired.
 */
export function watchedAtFillIn(
  core: CoreState,
  memberIds: readonly string[],
): void {
  const rows = kept.get(core);
  if (!rows?.length) return;
  const since = addDays(makeIsoDate(core.date), -keptDays());
  const api = coreAPI(core);
  for (const row of rows) {
    if (row.date <= since) continue;
    const record = core.durableLog.get(row.eventId);
    if (!record) continue;
    const home = memberIds
      .map((id) => core.people.get(id as PersonId))
      .filter(
        (person): person is PersonState =>
          !!person?.alive &&
          person.placeId === row.placeId &&
          person.birthDate <= row.date &&
          !atShift(core, person.id, row.airedOn, row.airedAtMinute),
      );
    const lead = home
      .filter((person) => ageOnDate(person.birthDate, row.date) >= P.votingAge)
      .reduce<number | null>((best, person) => {
        const score = habitOf(api, person);
        return best === null || score > best ? score : best;
      }, null);
    if (lead === null || lead < row.cut) continue;
    const watched = home.filter(
      (person) =>
        !core.knowledgeByPerson
          .get(person.id)
          ?.has(`event:${row.eventId}:experienced`),
    );
    // They saw it themselves: the address's own record is how they know it,
    // even where someone met while they were filled in has told them since.
    for (const person of watched)
      for (const [key, value] of [
        [`event:${row.eventId}:experienced`, row.eventId],
        ...Object.entries(record.facts ?? {}),
      ] as const)
        api.observe(person.id, {
          key,
          value: String(value),
          learnedAt: row.date as never,
          sourceId: row.eventId,
          access: "perceived",
        });
    // And the story they can pass on at their contacts.
    heardOnAir(
      api,
      record,
      watched.map((person) => person.id),
      row.date,
    );
  }
}
