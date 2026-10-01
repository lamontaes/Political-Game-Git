import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { sampleMonthlyCrime } from "./producer";
import { householdMembershipsAt } from "../life-queries";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { ensurePeopleTraits } from "../people-traits";
import { SeededRng } from "../rng";
import { TERRITORY_PLACE_ROWS } from "../territory-places";
import type { EntityId, World } from "../types";
import type { CrimeOffense } from "./contract";
import {
  CRIME_REPORTING_VERSION,
  decideReport,
  reportConsiderations,
  reportLean,
  UNRESEARCHED_REPORTING,
  victimReports,
} from "./reporting";

const LONG = 60_000;

/**
 * Percent of victimizations reported to police, 2022 (BJS, Criminal
 * Victimization, 2022, NCJ 307089, table 4). They check the town's totals;
 * they never decide one victim.
 */
const NCVS_2022_REPORTED: Partial<Record<CrimeOffense, number>> = {
  robbery: 0.64,
  assault: 0.406,
  burglary: 0.449,
};

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function allPlaces(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

const PLACE_SEED = "a131-crime-reporting";
const PLACES = allPlaces();
const PLACE = PLACES[new SeededRng(PLACE_SEED).integer(0, PLACES.length)]!;

function open(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: PLACE,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  return {
    world,
    town: world.people[game.playerPersonId]!.homeJurisdictionId,
  };
}

/** Every adult who lives in town, in a fixed order. */
function adults(world: World, town: EntityId): EntityId[] {
  return (Object.keys(world.people).sort() as EntityId[]).filter(
    (id) =>
      world.people[id]!.homeJurisdictionId === town &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  );
}

/** A relative of `personId` in the world's kinship records, if any. */
function relativeOf(world: World, personId: EntityId): EntityId | null {
  for (const row of world.history.kinshipRelationships)
    if (row.personIds.includes(personId))
      return row.personIds.find((id) => id !== personId) ?? null;
  return null;
}

describe(`victims decide whether to report a crime (place ${PLACE}, place seed ${PLACE_SEED})`, () => {
  const first = open("a131-first");

  it("the weights are marked as unresearched placeholders", () => {
    expect(UNRESEARCHED_REPORTING.provenance).toBe("unresearched-blanket-rule");
    expect(UNRESEARCHED_REPORTING.researchQuestions).toContain(
      "why-victims-report-to-police",
    );
  });

  it(
    "the same offense is reported identically across two seeds",
    () => {
      // The victims' temperament on record, so a different seed is the same
      // people; only a drawn decision could then come out differently.
      const victims = adults(first.world, first.town).slice(0, 60);
      const world = ensurePeopleTraits(first.world, victims);
      const town = first.town;
      const other: World = { ...world, seed: "a131-second" };
      let compared = 0;
      for (const victim of victims)
        for (const offense of ["robbery", "assault"] as const) {
          const input = {
            offense,
            jurisdictionId: town,
            occurredAt: world.currentDate,
            targetId: victim,
            victimPersonIds: [victim],
          };
          expect(decideReport(other, input)).toEqual(
            decideReport(world, input),
          );
          compared += 1;
        }
      expect(compared).toBeGreaterThan(0);
    },
    LONG,
  );

  it(
    "a victim close to the offender reports less than a stranger's victim",
    () => {
      const { world, town } = first;
      let withTie = 0;
      let fromStranger = 0;
      let pairs = 0;
      for (const victim of adults(world, town)) {
        const relative = relativeOf(world, victim);
        if (!relative) continue;
        for (const offense of ["robbery", "assault"] as const) {
          const prefix = `${CRIME_REPORTING_VERSION}:test:${victim}:${offense}`;
          const close = reportLean(
            reportConsiderations(
              world,
              victim,
              offense,
              relative,
              world.currentDate,
              prefix,
            ),
          );
          const stranger = reportLean(
            reportConsiderations(
              world,
              victim,
              offense,
              null,
              world.currentDate,
              prefix,
            ),
          );
          // The tie slides the same victim's weighing toward keeping quiet.
          expect(close).toBeLessThan(stranger);
          const input = {
            victimId: victim,
            offense,
            occurredAt: world.currentDate,
            targetId: victim,
          };
          if (victimReports(world, { ...input, offenderPersonId: relative }))
            withTie += 1;
          if (victimReports(world, { ...input, offenderPersonId: null }))
            fromStranger += 1;
          pairs += 1;
        }
      }
      expect(pairs).toBeGreaterThan(0);
      expect(withTie).toBeLessThan(fromStranger);
    },
    LONG,
  );

  it(
    "the town's share reported sits near the real share, by offense",
    () => {
      const { world, town } = first;
      const people = adults(world, town);
      const shares: Record<string, number> = {};
      for (const offense of ["robbery", "assault"] as const) {
        let reported = 0;
        for (const victim of people)
          if (
            decideReport(world, {
              offense,
              jurisdictionId: town,
              occurredAt: world.currentDate,
              targetId: victim,
              victimPersonIds: [victim],
            }).reported
          )
            reported += 1;
        shares[offense] = reported / people.length;
      }
      const homes = new Map<EntityId, EntityId[]>();
      for (const victim of people)
        for (const membership of householdMembershipsAt(world, victim)) {
          const list = homes.get(membership.household.id) ?? [];
          list.push(victim);
          homes.set(membership.household.id, list);
        }
      let reportedHomes = 0;
      for (const [home, victims] of homes)
        if (
          decideReport(world, {
            offense: "burglary",
            jurisdictionId: town,
            occurredAt: world.currentDate,
            targetId: home,
            victimPersonIds: victims,
          }).reported
        )
          reportedHomes += 1;
      shares.burglary = reportedHomes / Math.max(1, homes.size);
      console.info(
        `A131 ${PLACE}: ${people.length} adults, ${homes.size} homes, shares reported`,
        shares,
      );
      for (const [offense, real] of Object.entries(NCVS_2022_REPORTED))
        expect(
          Math.abs(shares[offense]! - real!),
          `${offense} ${shares[offense]} against ${real}`,
        ).toBeLessThan(0.15);
    },
    LONG,
  );

  it(
    "the town's monthly crime carries each victim's own decision",
    () => {
      const { world } = first;
      let month = makeIsoDate(`${world.currentDate.slice(0, 7)}-01`);
      const crimes = [];
      for (let index = 0; index < 12; index += 1) {
        crimes.push(...sampleMonthlyCrime(world, month));
        month = makeIsoDate(`${addDays(month, 32).slice(0, 7)}-01`);
      }
      for (const crime of crimes)
        expect(crime.reported, `${crime.offense} ${crime.targetId}`).toBe(
          decideReport(world, crime).reported,
        );
      const reported = crimes.filter((crime) => crime.reported).length;
      console.info(
        `A131 ${PLACE}: ${crimes.length} offenses in twelve months, ${reported} reported`,
      );
      expect(crimes.length).toBeGreaterThan(0);
    },
    LONG,
  );
});
