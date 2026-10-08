import { describe, expect, it } from "vitest";
import { smallWorld } from "../fixtures/small-world";
import { advanceObservedWorld } from "../../src/presentation/observer-world";
import { advanceWorld } from "../../src/simulation";
import { addDays } from "../../src/simulation/dates";
import {
  applicationSteps,
  jobOpening,
  openJobListings,
} from "../../src/simulation/job-market";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { seatLocalBusinesses } from "../../src/simulation/local-economy";
import { hiringDecisionMaker } from "../../src/simulation/living-world/town-hiring";
import { observeFromOpening } from "../../src/simulation/people-continuation";
import { pickDistinct, SeededRng } from "../../src/simulation/rng";
import type { World } from "../../src/simulation/types";

/**
 * AU2-DUP-07: one hiring engine on the clock. In every one of the 56 places a
 * world nobody plays lists the town's open work, its residents apply, the
 * employer decides, and somebody starts within 30 days; the played world
 * reads the same listings. The place and seed are named in each case.
 */
const SEED = "au2-dup-07-hiring-on-the-clock";
const PLACES = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);

function opened(place: string) {
  const game = smallWorld({
    place,
    people: 8,
    seed: `${SEED}:${place}`,
  });
  return {
    game,
    world: seatLocalBusinesses(game.world, game.jurisdictionId),
  };
}

/** Hires, across the places, that went through a recorded employer decision. */
let decidedByAnEmployer = 0;

function started(world: World) {
  return (world.history.jobApplications ?? []).filter((application) =>
    applicationSteps(world, application.id).some(
      (step) => step.kind === "started",
    ),
  );
}

describe("hiring runs on the clock in every place", () => {
  it("covers all 56 places", () => {
    expect(PLACES).toHaveLength(56);
  });

  it.each(PLACES.map((place) => [place.jurisdictionKey]))(
    "%s: an observer world fills a listed role with a resident within 30 days, and the player world reads the same listings",
    (place) => {
      const { game, world } = opened(place);
      const anchor = game.personId;
      const opening = world.currentDate;

      // The world nobody plays.
      const watched = observeFromOpening(world, anchor);
      const week = advanceObservedWorld(watched, 7);
      const listed = openJobListings(week, anchor);
      expect(listed.length, `${place} lists work`).toBeGreaterThan(0);
      const month = advanceObservedWorld(week, 23);
      expect(month.currentDate).toBe(addDays(opening, 30));
      const hired = started(month);
      expect(hired.length, `${place} fills a role`).toBeGreaterThan(0);
      for (const application of hired) {
        // A role the town listed, taken by a resident of the town, whose
        // employer decided: its decision-maker's choice is on record whenever
        // somebody is on record to make it.
        const posted = jobOpening(month, application.openingId)!;
        expect(posted.opensAt <= application.submittedAt).toBe(true);
        expect(month.people[application.personId]!.homeJurisdictionId).toBe(
          game.jurisdictionId,
        );
        // Who could decide when the world opened, before this hire joined the staff.
        const decider = hiringDecisionMaker(world, posted.organizationId);
        const trace = month.history.decisionTraces.find(
          (row) =>
            row.context.decisionType === "labor.employer-choose-hire" &&
            row.context.stableKey.includes(application.stableKey),
        );
        if (decider) {
          expect(trace, `${place} records the employer's choice`).toBeDefined();
          expect(trace!.context.actorPersonId).toBe(decider);
          expect(trace!.selectedOptionKey).toBe(
            `person:${application.personId}`,
          );
          decidedByAnEmployer += 1;
        }
      }

      // The world somebody plays reads the same listings from the same clock.
      const played = advanceWorld(world, 7);
      expect(played.control).toEqual({ kind: "person", personId: anchor });
      expect(
        openJobListings(played, anchor).map((row) => row.stableKey),
      ).toEqual(listed.map((row) => row.stableKey));
    },
    120_000,
  );

  it("had employers with somebody on record to decide, in at least some places", () => {
    expect(decidedByAnEmployer).toBeGreaterThan(0);
  });
});
