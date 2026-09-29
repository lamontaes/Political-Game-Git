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
import { boardGoverningBodyRules } from "../simulation/nationwide-world/township-governing-body-rules";
import { SeededRng } from "../simulation/rng";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

/**
 * Build 25, CTO ruling of September 29, 7:55 a.m.: local councils pass local
 * law in small towns too. A census-designated place inside a New England or
 * New York town, or inside a township, has no government of its own; its
 * local government is that town or township. A watched world opened in such
 * a place, drawn at random from every state that has one, runs 75 days:
 *
 * 1. the town's or township's board, not the county's, meets and its members
 *    file and vote for their own reasons, recorded under the town's own
 *    jurisdiction, at the size the state's law sets;
 * 2. an ordinance in force governs the place: the place's law in force on
 *    that question is the town's ordinance.
 */

const SEEDS = ["build-25:township-law:1", "build-25:township-law:2"];

/** A random place with no government of its own inside a town government. */
function townshipPlace(seed: string): LifePlace {
  const rng = new SeededRng(`township-law-place:${seed}`);
  const states = [...lifePlaceStateIdentities()];
  while (states.length > 0) {
    const state = states.splice(rng.integer(0, states.length), 1)[0]!;
    const places = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }).filter((place) => {
      const units = placeLocalGovernmentUnits(place);
      return units.municipal.length === 0 && units.townships.length > 0;
    });
    if (places.length > 0) return rng.pick(places);
  }
  throw new Error("No place inside a town or township government was found.");
}

describe("a town or township board makes law for a place inside it", () => {
  for (const seed of SEEDS)
    it(
      `meets, files, votes and governs (${seed})`,
      { timeout: 600_000 },
      () => {
        const place = townshipPlace(seed);
        const opened = openObserverWorld(observerSetup(seed, place.key));
        let world = opened.world;
        const town = playerTown(world, opened.anchorPersonId)!;
        const board = homeLocalGovernmentUnits(world, opened.anchorPersonId)
          .townships[0]!;
        const seated = world.history.events.find(
          (event) =>
            event.type === "local.government-seated" &&
            event.tags.includes(`unit:${board.id}`),
        );
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
              seated: seated?.summary ?? null,
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

        expect(seated?.tags).toContain(
          `seats:${boardGoverningBodyRules(board)!.seats}`,
        );
        expect(meetings.length).toBeGreaterThanOrEqual(4);
        expect(measures.length).toBeGreaterThan(0);
        // Recorded under the town, never the place itself.
        for (const measure of measures)
          expect(measure.jurisdictionId).not.toBe(town);
        for (const vote of votes) {
          expect(vote.provenance.method).toBe("member-decisions");
          for (const row of vote.dispositions)
            expect(row.reason ?? "").not.toBe("member:no-reason");
        }
        // An ordinance in force governs the place, unless a state or federal
        // law on the same question outranks it.
        let governing = 0;
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
          if (law?.measureId !== measure.id) {
            expect(law?.level).not.toBe("local-ordinance");
            continue;
          }
          expect(law.answer).toBe(answer.answer);
          governing += 1;
        }
        expect(governing).toBeGreaterThan(0);
      },
    );
});
