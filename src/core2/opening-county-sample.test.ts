/**
 * The county's counted sample at the opening (CTO, Nov 8, on #7365): records
 * at the county's own place, weighted to its eligible voters, with years in
 * place on every household (the town's too), employers for working adults
 * and neighbor ties when a county person is filled in. A place drawn from all
 * 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countedResidents } from "./electorate";
import {
  countyPlaceIdOf,
  statePlaces,
  citizenShareOf,
} from "./electorate-places";
import { gameStartDate } from "./game-start";
import { ageInYears } from "./kernel/dates";
import { countyPlaceOfWorld } from "./opening-county-sample";
import { neighborsKnown } from "./opening-ties";
import { yearsInPlaceOf } from "./opening-tenure";
import { parameter as p } from "./parameters";
import { fillInPerson } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("yearsInPlaceOf runs from none to the head's adult life and never past it", () => {
  const rates = { "18-24": 0.2, "25-44": 0.1, "45+": 0.03 };
  const years = [0.01, 0.25, 0.5, 0.75, 0.99].map((u) =>
    yearsInPlaceOf(rates, 50, u),
  );
  for (let i = 1; i < years.length; i += 1)
    expect(years[i]!).toBeLessThanOrEqual(years[i - 1]!);
  expect(years[0]!).toBeLessThanOrEqual(50 - p("votingAge"));
  expect(years.at(-1)!).toBeGreaterThanOrEqual(0);
});

it(`the county's sample is weighted to its eligible voters and its people have ties (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "county-sample");
  const where = `${place.name} (${place.key}), run seed ${seed}, world seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const countyId = countyPlaceOfWorld(core);
  if (!countyId) {
    console.log(`${where}: no county on record, passed over`);
    return;
  }
  const usps = String(core.placeMetadata.placeKey).split("-")[1]!;
  void usps;
  const stateKey = place.state;
  const electorate = statePlaces(stateKey.slice(3), core.seed).find(
    (row) =>
      row.id ===
      countyPlaceIdOf(
        core.placeMetadata.countyNames as string | undefined,
        stateKey.slice(3),
      ),
  )!;
  const voters = countedResidents(core).filter((v) => v.placeId === countyId);
  expect(voters.length, where).toBeGreaterThan(0);
  // Weighted adult citizens come to the county's eligible count.
  const share = citizenShareOf(
    String(core.placeMetadata.placeKey),
    stateKey.slice(3),
    core.seed,
  );
  const weighted = voters
    .filter((v) => ageInYears(v.birthDate, core.date) >= p("votingAge"))
    .reduce((n, v) => n + v.weight * share, 0);
  expect(Math.abs(weighted / electorate.eligible - 1), where).toBeLessThan(
    0.02,
  );
  // Years in place are on the county's records and the town's.
  const adults = voters.filter(
    (v) => ageInYears(v.birthDate, core.date) >= p("votingAge"),
  );
  expect(
    adults.filter((v) => v.yearsInPlace === undefined).length,
    `${where}: adults without years in place`,
  ).toBe(0);
  const town = countedResidents(core).filter((v) => v.placeId !== countyId);
  expect(
    town.some((v) => v.yearsInPlace !== undefined),
    where,
  ).toBe(true);
  // Working adults of the sample have an employer.
  expect(
    voters.some((v) => v.employerId !== undefined),
    where,
  ).toBe(true);
  // Filled in, a settled county person knows as many neighbors as the curve gives.
  const chosen = voters.find(
    (v) =>
      v.yearsInPlace !== undefined &&
      v.yearsInPlace >= p("neighborsKnownYears") &&
      v.employerId === undefined,
  );
  if (chosen) {
    const expected = Math.round(
      neighborsKnown(chosen.yearsInPlace!, {
        cap: p("neighborsKnownCap"),
        years: p("neighborsKnownYears"),
        one: 1,
      }),
    );
    const person = fillInPerson(core, chosen.id);
    expect(person.knownIds.size, where).toBeGreaterThanOrEqual(expected);
  }
}, 120_000);

// A county record stands for at least one real household (world-county-sample-weight-below-one):
// where the county's eligible voters are fewer than the sample's own, the sample is cut to the
// households that fit at a weight of one, or dropped when none do.
it.each([
  [
    "Larned, Kansas",
    "2038700",
    "0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96",
  ],
  ["a drawn place", undefined, undefined],
])(
  "no county record stands for less than one household (%s)",
  (_name, fixedKey, fixedSeed) => {
    setBookkeeping(false);
    const place = fixedKey
      ? { key: fixedKey, seed: fixedSeed!, name: "Larned" }
      : drawPlace(seed, "county-sample-weight");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const countyId = countyPlaceOfWorld(core);
    if (!countyId) return;
    const county = countedResidents(core).filter(
      (row) => row.placeId === countyId,
    );
    for (const row of county)
      expect(row.weight, `${where}: ${row.id}`).toBeGreaterThanOrEqual(1);
  },
  300_000,
);
