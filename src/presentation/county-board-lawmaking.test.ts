import { appendFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { lawInForce } from "../simulation/governing/law-in-force";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  type LifePlace,
} from "../simulation/life-places";
import {
  homeLocalGovernmentUnits,
  placeLocalGovernmentUnits,
} from "../simulation/nationwide-world/local-governments";
import { playerTown } from "../simulation/living-world/town-residents";
import { SeededRng } from "../simulation/rng";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

/**
 * Build 25, CTO ruling of September 29, 7:55 a.m.: local councils pass local
 * law in small towns too. A place with no town government of its own (a
 * census-designated place, or a Puerto Rico place under its municipio) is
 * governed by its county's board. A watched world opened in such a place,
 * drawn at random from every state and territory that has one, runs 75 days:
 *
 * 1. the county's board meets and its members file and vote for their own
 *    reasons, recorded under the county's jurisdiction;
 * 2. an ordinance in force governs the place: the place's law in force on
 *    that question is the county's ordinance.
 */

const SEEDS = ["build-25:county-law:1", "build-25:county-law:2"];

/** A random place with no town government and a county government over it. */
function unincorporatedPlace(seed: string): LifePlace {
  const rng = new SeededRng(`county-law-place:${seed}`);
  const states = [...lifePlaceStateIdentities()];
  while (states.length > 0) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    const places = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }).filter((place) => {
      const units = placeLocalGovernmentUnits(place);
      return units.municipal.length === 0 && units.counties.length > 0;
    });
    if (places.length > 0) return rng.pick(places);
  }
  throw new Error("No place without a town government was found.");
}

describe("a county board makes law for a place with no town government", () => {
  for (const seed of SEEDS)
    it(
      `meets, files, votes and governs (${seed})`,
      { timeout: 600_000 },
      () => {
        const place = unincorporatedPlace(seed);
        const opened = openObserverWorld(observerSetup(seed, place.key));
        let world = opened.world;
        const town = playerTown(world, opened.anchorPersonId)!;
        const board = homeLocalGovernmentUnits(world, opened.anchorPersonId)
          .counties[0]!;
        world = advanceObservedWorld(world, 75);

        const meetings = world.history.events.filter(
          (event) =>
            (event.type === "local.council-meeting-held" ||
              event.type === "local.council-meeting-canceled") &&
            event.jurisdictionId === town &&
            event.tags.includes(`unit:${board.id}`),
        );
        const measures = (world.history.legislativeMeasures ?? []).filter(
          (measure) =>
            measure.originChamberKey === "council" &&
            measure.rulePackId.endsWith(`:${board.id}`),
        );
        const ids = new Set(measures.map((measure) => measure.id));
        const votes = (world.history.legislativeVotes ?? []).filter((vote) =>
          ids.has(vote.measureId),
        );
        const enactments = (world.history.legislativeEnactments ?? []).filter(
          (row) => ids.has(row.measureId),
        );
        const watched = process.env.WATCHED_RUN_OUT;
        if (watched)
          appendFileSync(
            watched,
            JSON.stringify({
              seed,
              place: `${place.displayName} (${place.key})`,
              board: board.name,
              meetings: meetings.length,
              filed: measures.length,
              votes: votes.map(
                (vote) => `${vote.outcome} ${vote.tally.yea}-${vote.tally.nay}`,
              ),
              enacted: enactments.length,
              inForce: enactments.filter(
                (row) =>
                  row.effectiveAt && row.effectiveAt <= world.currentDate,
              ).length,
            }) + "\n",
          );

        expect(meetings.length).toBeGreaterThanOrEqual(4);
        expect(measures.length).toBeGreaterThan(0);
        // Recorded under the county, never the place itself.
        for (const measure of measures)
          expect(measure.jurisdictionId).not.toBe(town);
        for (const vote of votes) {
          expect(vote.provenance.method).toBe("member-decisions");
          for (const row of vote.dispositions)
            expect(row.reason ?? "").not.toBe("member:no-reason");
        }
        // An ordinance in force governs the place.
        for (const enactment of enactments) {
          if (
            !enactment.effectiveAt ||
            enactment.effectiveAt > world.currentDate
          )
            continue;
          const measure = measures.find(
            (row) => row.id === enactment.measureId,
          )!;
          const answer = measure.propositionAnswers?.[0];
          if (!answer) continue;
          const law = lawInForce(world, town, answer.propositionId);
          expect(law?.measureId).toBe(measure.id);
          expect(law?.answer).toBe(answer.answer);
        }
      },
    );
});
