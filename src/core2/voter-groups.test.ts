/**
 * Voter groups' contract (owner, Oct 14, 2026: "Voter groups and electorate
 * blocks are gone as decision paths and stores"). The unnamed electorate is
 * now the town's counted residents, read in `electorate.ts` by
 * `countedResidents` and ordered by `electorateSample` (modules/voting.ts),
 * and the places outside the town counted coarsely on the same sample by
 * `countPlaces`. This reads them from the bench world in a drawn place and
 * checks what the code promises: each counted voter is one live household
 * member, weights are their household's, the sample covers the town's
 * counted adults in lean order, a place's count stays inside its eligible
 * voters, and reading changes no record.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { residentsRuntime } from "./modules/residents";
import { electorateSample } from "./modules/voting";
import {
  countPlaces,
  countedResidents,
  type CountedFieldEntry,
} from "./electorate";
import { statePlaces } from "./electorate-places";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "voter-groups");

/** Two typical party candidates, no one holding the seat. */
const typical: readonly CountedFieldEntry[] = [-1, 1].map((side) => ({
  id: side > 0 ? "R" : "D",
  side,
  isIncumbent: false,
  standing: 0,
  localStanding: 0,
  recognition: 0,
  platform: [],
}));

const ageOn = (v: { birthDate: string }, date: string) =>
  Number(date.slice(0, 4)) -
  Number(v.birthDate.slice(0, 4)) -
  (date.slice(5) < v.birthDate.slice(5) ? 1 : 0);

/** Everything the electorate reads from the counted store, as one string. */
function digest(core: CoreState): string {
  const store = residentsRuntime(core)!.store;
  return JSON.stringify([
    core.date,
    core.people.size,
    store.membersVersion,
    [...store.state],
    store.households.map((h) => [h.id, h.placeId, h.weight, h.members, h.gone]),
  ]);
}

it(`voter groups are the counted electorate in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const api = coreAPI(core);
  const store = residentsRuntime(core)!.store;
  const before = digest(core);

  // Groups exist, one row per counted voter, each in exactly one live household.
  const voters = countedResidents(core);
  expect(voters.length, where).toBeGreaterThan(0);
  expect(new Set(voters.map((v) => v.id)).size, where).toBe(voters.length);
  const households = new Map([...store.liveHouseholds()].map((h) => [h.id, h]));
  const perHousehold = new Map<string, number>();
  for (const v of voters) {
    const h = households.get(v.householdId);
    expect(h, `${where}: ${v.id} has a live household`).toBeDefined();
    // The row carries its household's weight (real voters it stands for).
    expect(v.weight, where).toBe(store.weightOf(h!));
    expect(v.weight, where).toBeGreaterThanOrEqual(1);
    expect(store.memberIdsOf(h!), where).toContain(v.id);
    perHousehold.set(v.householdId, (perHousehold.get(v.householdId) ?? 0) + 1);
  }
  // Rows come in id order, and no household yields more rows than it has counted members.
  expect(
    voters.map((v) => v.id),
    where,
  ).toEqual(voters.map((v) => v.id).sort((a, b) => a.localeCompare(b)));
  for (const [id, n] of perHousehold)
    expect(n, `${where}: ${id}`).toBeLessThanOrEqual(
      store.countedCount(households.get(id)!),
    );
  // The records' own total: weights sum to what the residents store counts.
  const weighted = voters.reduce((n, v) => n + v.weight, 0);
  const recorded = [...households.values()].reduce(
    (n, h) => n + store.weightedCount(h),
    0,
  );
  // The two sums add the same weights in a different order, so they may part in
  // the last bits: allow the rounding a sum of this many terms can carry, no more.
  const rounding =
    recorded * Number.EPSILON * (voters.length + households.size);
  expect(weighted, where).toBeLessThanOrEqual(recorded + rounding);
  expect(weighted, where).toBeGreaterThan(0);

  // The sample is the town's counted adults, in lean order by real voters.
  // The eligible set is read here from the counted rows checked above (the
  // town is the player's place), not from the sample: every counted adult of
  // the town is in it once, with their household's weight, and nobody else.
  // Only a town with no counted adult falls back to its named adults.
  const sample = electorateSample(api, core.date, 0);
  expect(sample.length, where).toBeGreaterThan(0);
  const townId = core.people.get(playerId!)!.placeId;
  const adults = new Map(
    voters
      .filter((v) => v.placeId === townId && ageOn(v, core.date) >= 18)
      .map((v) => [v.id, v.weight]),
  );
  const sampled = new Map(sample.map((s) => [s.id, s.weight]));
  expect(sampled.size, `${where}: one row per voter`).toBe(sample.length);
  if (adults.size) {
    expect([...sampled.keys()].sort(), where).toEqual(
      [...adults.keys()].sort(),
    );
    for (const [id, weight] of adults)
      expect(sampled.get(id), `${where}: ${id}`).toBe(weight);
  } else
    for (const s of sample) {
      const p = core.people.get(s.id);
      expect(p?.placeId, `${where}: ${s.id} is a named adult`).toBe(townId);
      expect(s.weight, where).toBe(1);
    }
  let last = 0;
  for (const s of sample) {
    expect(s.rank, where).toBeGreaterThan(0);
    expect(s.rank, where).toBeLessThan(1);
    expect(s.rank, where).toBeGreaterThanOrEqual(last);
    last = s.rank;
  }

  // Places counted from the sample stay inside their eligible voters: the
  // town itself (every place has one) and the state's counted places, where
  // the record has any (some territories have none).
  const town = {
    id: "town",
    name: "town",
    eligible: sample.reduce((n, s) => n + s.weight, 0),
    rightShare: 0.5,
    votes2024: 0,
    source: "the town's counted adults",
  };
  const places = [
    town,
    ...statePlaces(place.state.slice(3), core.seed, weighted),
  ];
  const counted = countPlaces(sample, places, typical);
  expect(counted.places.length, where).toBe(places.length);
  // The town casts its people's turnout, rounded to whole voters. Read at a
  // million times the town's size, the same sample turns out a positive
  // number of voters, and the town's own cast is that number rounded: a town
  // whose few counted adults turn out at less than half a voter in all casts
  // none (Ceex Haci, Wisconsin: one counted adult, 0.483 expected to turn out).
  const SCALE = 1_000_000;
  const expected =
    countPlaces(sample, [{ ...town, scale: SCALE }], typical).places[0]!.cast /
    SCALE;
  expect(expected, where).toBeGreaterThan(0);
  expect(
    Math.abs(counted.places[0]!.cast - expected),
    `${where}: the town's ${counted.places[0]!.cast} cast against ${expected} voters expected to turn out`,
  ).toBeLessThanOrEqual(0.5 + 1 / SCALE);
  for (const p of counted.places) {
    expect(p.cast, `${where}: ${p.id}`).toBeGreaterThanOrEqual(0);
    expect(p.cast, `${where}: ${p.id}`).toBeLessThanOrEqual(p.eligible);
    // Votes are rounded per candidate, so they sum to the cast within one each.
    expect(
      Object.values(p.votes).reduce((n, x) => n + x, 0),
      `${where}: ${p.id}`,
    ).toBeLessThanOrEqual(p.cast + Object.keys(p.votes).length);
  }
  // No dice: the same sample and field give the same votes.
  expect(countPlaces(sample, places, typical), where).toEqual(counted);

  // Reading it all changed no record.
  expect(digest(core), where).toBe(before);
  console.log(
    `voter-groups: ${where}, ${voters.length} counted voters, ${adults.size} counted town adults all in the sample of ${sample.length}; the town casts ${counted.places[0]!.cast} of ${town.eligible} with ${expected.toFixed(3)} expected to turn out`,
  );
}, 600_000);
