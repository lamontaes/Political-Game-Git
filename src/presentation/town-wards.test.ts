import { appendFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { governmentUnitsForState } from "../simulation/government-units";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import {
  councilWardPlan,
  drawWardCuts,
  isWardSeat,
  redrawTownWards,
  seatWard,
  townWardMap,
  wardOfPerson,
} from "../simulation/living-world/town-wards";
import { municipalGovernmentByKey } from "../simulation/municipal-government";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import { placeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  type LifePlace,
} from "../simulation/life-places";
import { SeededRng } from "../simulation/rng";
import { municipalGovernmentForUnit } from "../simulation/rule-capability-resolver";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

/**
 * Build 25, CTO ruling of September 29, 10:02 a.m.: the independent ward
 * commission waits on the town's wards. A council elected by ward now has a
 * map: each ward seat is held, run for and voted on by one ward's residents,
 * and who draws the map decides where its lines fall.
 *
 * A watched world opens in a town whose council elects by ward, drawn at
 * random from every state that has one, and runs through its first town
 * election:
 *
 * 1. the council's map is drawn when it is seated, and every ward member
 *    lives in the ward their seat represents;
 * 2. every candidate for a ward seat lives in that ward;
 * 3. an independent commission redraws the map at equal population, whatever
 *    the members' homes.
 */

const SEEDS = ["build-25:wards:1", "build-25:wards:2"];

describe("who draws a ward map decides where its lines fall", () => {
  it("a council keeps two members apart; a commission does not", () => {
    // 1,000 households in 4 wards; two members live at 240 and 245, both
    // below the even line at 250.
    const council = drawWardCuts(1000, 4, "council", [240, 245]);
    const commission = drawWardCuts(1000, 4, "commission", [240, 245]);
    expect(commission).toEqual([250, 500, 750]);
    expect(council[0]).toBe(245);
    // Within the total deviation the courts allow: 10% of an even ward.
    const sizes = [council[0]!, ...council.slice(1), 1000].map(
      (cut, i, all) => cut - (i === 0 ? 0 : all[i - 1]!),
    );
    expect((Math.max(...sizes) - Math.min(...sizes)) / 250).toBeLessThan(0.1);
  });

  it("reads a charter's wards and estimates the rest from the national shares", () => {
    const lewiston = municipalGovernmentByKey("us-me-lewiston")!;
    const unit = governmentUnitsForState("ME").find(
      (row) => municipalGovernmentForUnit(row)?.key === lewiston.key,
    )!;
    expect(councilWardPlan(unit)).toMatchObject({
      wardSeats: 7,
      atLargeSeats: 0,
      basis: "charter",
    });
    // The smallest towns in a state elect at large.
    const smallest = governmentUnitsForState("OH")
      .filter(
        (row) =>
          row.unitType === "municipality" &&
          row.functionalActive &&
          !municipalGovernmentForUnit(row) &&
          councilWardPlan(row) !== null,
      )
      .sort(
        (l, r) =>
          (placeReferencePopulation(l.placeGeoid ?? "")?.value ?? 0) -
          (placeReferencePopulation(r.placeGeoid ?? "")?.value ?? 0),
      )[0]!;
    expect(councilWardPlan(smallest)).toMatchObject({
      wardSeats: 0,
      basis: "estimated",
    });
    expect(councilWardPlan(smallest)!.citation).toMatch(
      /^ESTIMATED FROM AVERAGE/,
    );
  });
});

/** A random town under 60,000 people whose council elects by ward. */
function wardTown(seed: string): LifePlace {
  const rng = new SeededRng(`ward-town:${seed}`);
  const states = [...lifePlaceStateIdentities()];
  while (states.length > 0) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    const places = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }).filter((place) => {
      const unit = placeLocalGovernmentUnits(place).municipal[0];
      const people = placeReferencePopulation(place.sourceGeoid ?? "")?.value;
      return (
        unit !== undefined &&
        people !== undefined &&
        people < 60_000 &&
        (councilWardPlan(unit)?.wardSeats ?? 0) >= 2
      );
    });
    if (places.length > 0) return rng.pick(places);
  }
  throw new Error("No town whose council elects by ward was found.");
}

describe("a council elected by ward, in a watched world", () => {
  for (const seed of SEEDS)
    it(
      `is seated, runs and votes by ward (${seed})`,
      { timeout: 900_000 },
      () => {
        const place = wardTown(seed);
        const opened = openObserverWorld(observerSetup(seed, place.key));
        let world = opened.world;
        const unit = placeLocalGovernmentUnits(place).municipal[0]!;
        const plan = councilWardPlan(unit)!;
        const map = townWardMap(world, unit)!;
        expect(map).not.toBeNull();
        expect(map.wards).toBe(plan.wardSeats);
        expect(map.drawnBy).toBe("council");
        const town = world.history.events.find(
          (event) =>
            event.type === "local.wards-drawn" &&
            event.tags.includes(`unit:${unit.id}`),
        )!.jurisdictionId!;

        // 1. Every ward member lives in the ward their seat represents.
        const seatOf = (label: string) =>
          Number(/seat (\d+)$/.exec(label)?.[1] ?? 0);
        const members = sittingLocalOfficers(world, unit).filter(
          (row) => !row.mayor && isWardSeat(plan, seatOf(row.seatLabel)),
        );
        expect(members.length).toBeGreaterThan(0);
        for (const row of members)
          expect(wardOfPerson(world, unit, town, row.personId)).toBe(
            seatWard(map, seatOf(row.seatLabel)),
          );

        // 2. Through the town's first general election.
        const contestsFor = () =>
          (world.history.electionContests ?? []).filter((row) =>
            row.stableKey.startsWith(`local-elections/v1:${unit.id}:`),
          );
        while (
          world.currentDate < "2028-12-31" &&
          !contestsFor().some((row) => row.stableKey.endsWith(":general"))
        )
          world = advanceObservedWorld(world, 60);
        const wardRaces = contestsFor().filter((row) =>
          isWardSeat(plan, Number(/:seat-(\d+):/.exec(row.stableKey)?.[1])),
        );
        for (const race of wardRaces) {
          const seat = Number(/:seat-(\d+):/.exec(race.stableKey)![1]);
          for (const candidate of race.candidatePersonIds)
            expect(wardOfPerson(world, unit, town, candidate)).toBe(
              seatWard(townWardMap(world, unit)!, seat),
            );
        }

        // 3. A commission redraws at equal population.
        const sitting = sittingLocalOfficers(world, unit)
          .filter((row) => !row.mayor)
          .map((row) => ({
            seat: seatOf(row.seatLabel),
            personId: row.personId,
          }));
        const redrawn = redrawTownWards(world, {
          unit,
          town,
          drawnBy: "commission",
          members: sitting,
          reason: "under an independent ward commission",
        });
        const commission = townWardMap(redrawn, unit)!;
        expect(commission.drawnBy).toBe("commission");
        expect(commission.cuts).toEqual(
          drawWardCuts(map.households, map.wards, "commission", []),
        );
        const drawn = redrawn.history.events.at(-1)!;

        const watched = process.env.WATCHED_RUN_OUT;
        if (watched)
          appendFileSync(
            watched,
            JSON.stringify({
              seed,
              place: `${place.displayName} (${place.key})`,
              plan,
              opening: world.history.events.find(
                (event) =>
                  event.type === "local.wards-drawn" &&
                  event.tags.includes(`unit:${unit.id}`),
              )?.summary,
              date: world.currentDate,
              wardRaces: wardRaces.map((row) => ({
                key: row.stableKey.split(":").slice(-2).join(":"),
                field: row.candidatePersonIds.length,
              })),
              commission: drawn.summary,
            }) + "\n",
          );
      },
    );
});
