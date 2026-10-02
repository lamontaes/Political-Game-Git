import { describe, expect, it } from "vitest";

import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { ageOnDate } from "../dates";
import {
  activeWorkRelationshipsAt,
  organizationProfileAt,
} from "../life-queries";
import { startTownJobPay } from "../living-world/town-pay";
import type { EntityId, World } from "../types";
import { advanceWithWorldIntegrityAtEnd, assertWorldIntegrity } from "../world";
import {
  UNRESEARCHED_JOB_SEARCH,
  migrationTown,
  moverDepartureRate,
  recordedMoves,
  reviewTown,
} from ".";

/**
 * A135 follow-up (CTO ruling 7): a job offer elsewhere is a recorded reason
 * to move. Each place is drawn by seed from all 56 (`observerPlace`).
 */
const SEEDS = [
  "a135-offers-1",
  "a135-offers-2",
  "a135-offers-3",
  "a135-offers-4",
  "a135-offers-5",
  "a135-offers-6",
] as const;

/**
 * The check on totals (CTO ruling 23, October 1, 2026): adults who move for a
 * job offer elsewhere in a year, as a share of all adults. A new job or a job
 * transfer is 13.2 percent of movers' reasons in 2023 (Census Bureau, CPS
 * ASEC 2023, "Why People Move"), and about a fifth of moves with the other
 * work reasons; at a mover rate near 8 to 10 percent a year that is about 1.5
 * to 2 percent of adults. It checks the drawn places together; it decides
 * nobody.
 */
const OFFER_MOVERS_SHARE = { low: 0.015, high: 0.02 } as const;

/**
 * The world as its first quarterly review finds it: the review comes 91 days
 * after the opening, after the first paydays have put everyone's town pay on
 * record (`startTownJobPay`, which the payday writes).
 */
function openAtFirstReview(seed: string) {
  const place = observerPlace(seed);
  const opened = openObserverWorld(observerSetup(seed, place.key)).world;
  const world = startTownJobPay(opened, null, opened.currentDate);
  return { place, world, town: migrationTown(world)! };
}

function aYearOfReviews(world: World): World {
  let year = world;
  for (let quarter = 0; quarter < 4; quarter += 1)
    year = advanceWithWorldIntegrityAtEnd(() =>
      reviewTown(year, quarter, { arrivals: false }),
    );
  return year;
}

function offersElsewhere(world: World) {
  const openings = new Map(
    (world.history.jobOpenings ?? []).map((row) => [row.id, row]),
  );
  return (world.history.jobApplications ?? []).flatMap((application) => {
    const opening = openings.get(application.openingId)!;
    if (!opening.stableKey.startsWith("job-opening:elsewhere:")) return [];
    const steps = (world.history.jobApplicationSteps ?? []).filter(
      (step) => step.applicationId === application.id,
    );
    return [{ application, opening, steps }];
  });
}

describe("a job offer elsewhere is a recorded reason to move (A135)", () => {
  it("the weights are marked as unresearched placeholders", () => {
    expect(UNRESEARCHED_JOB_SEARCH.provenance).toBe(
      "unresearched-blanket-rule",
    );
    expect(UNRESEARCHED_JOB_SEARCH.researchQuestionId).toBe(
      "why-americans-move-causes-and-strengths",
    );
  });

  let leftAll = 0;
  let adultsAll = 0;
  let offerMoversAll = 0;
  let offeredAll = 0;
  for (const seed of SEEDS) {
    const place = observerPlace(seed);
    it(
      `in ${place.displayName} (${place.key}, seed ${seed}) offers come from recorded employers elsewhere, and whoever leaves goes to the offer and starts there`,
      { timeout: 60_000 },
      () => {
        const { world, town } = openAtFirstReview(seed);
        expect(town).not.toBeNull();
        const year = aYearOfReviews(world);
        assertWorldIntegrity(year);

        const offers = offersElsewhere(year);
        for (const { opening, steps } of offers) {
          // The employer is recorded in the world, at the place it names,
          // outside town; nothing was invented for the offer.
          expect(
            year.history.organizations.some(
              (row) => row.id === opening.organizationId,
            ),
          ).toBe(true);
          expect(
            organizationProfileAt(year, opening.organizationId)
              ?.locationJurisdictionId,
          ).toBe(opening.jurisdictionId);
          expect(opening.jurisdictionId).not.toBe(town);
          expect(["offered", "declined"]).toContain(steps[0]!.kind);
        }

        const moves = recordedMoves(year).filter(
          (move) => move.reason === "work:job-offer",
        );
        for (const move of moves) {
          // The move names the offer it was made for, and goes to its place.
          const offer = offers.find(({ steps }) =>
            steps.some((step) => step.eventId === move.causeId),
          )!;
          expect(offer, `move ${move.eventId}`).toBeDefined();
          expect(move.toJurisdictionId).toBe(offer.opening.jurisdictionId);
          console.info(
            `A135 recorded: ${year.history.events.find((event) => event.id === move.causeId)!.summary} Moved: ${move.personIds.length}.`,
          );
          expect(offer.steps.map((step) => step.kind)).toEqual([
            "offered",
            "accepted",
            "started",
          ]);
          // And they work there now.
          expect(
            activeWorkRelationshipsAt(year, offer.application.personId).some(
              (row) =>
                row.relationship.organizationId ===
                offer.opening.organizationId,
            ),
          ).toBe(true);
        }
        // Whoever stayed turned the offer down.
        for (const { application, steps } of offers)
          if (year.people[application.personId]!.homeJurisdictionId === town)
            expect(steps.at(-1)!.kind).not.toBe("accepted");

        // The check against the survey, not a target.
        const adults = world.personOrder.filter((id) => {
          const person = world.people[id]!;
          return (
            person.homeJurisdictionId === town &&
            ageOnDate(person.birthDate, world.currentDate) >= 18
          );
        });
        const left = adults.filter(
          (id) => year.people[id]!.homeJurisdictionId !== town,
        ).length;
        const survey =
          adults.reduce(
            (sum, id) =>
              sum +
              moverDepartureRate(
                place.stateJurisdictionKey,
                ageOnDate(world.people[id]!.birthDate, world.currentDate),
              ),
            0,
          ) / adults.length;
        const adultSet = new Set(adults);
        const offerMovers = new Set(
          moves.flatMap((move) =>
            move.personIds.filter((id) => adultSet.has(id)),
          ),
        ).size;
        leftAll += left;
        adultsAll += adults.length;
        offerMoversAll += offerMovers;
        const kinds = offers.map(({ steps }) => steps.at(-1)!.kind);
        offeredAll += kinds.filter((k) => k !== "declined").length;
        console.info(
          `A135 offers, ${place.displayName} (${place.key}, seed ${seed}): ${offers.length} searched elsewhere, ${kinds.filter((k) => k !== "declined").length} offered, ${kinds.filter((k) => k === "started").length} took the offer; ${moves.length} moves for an offer, ${offerMovers} adults moved for one; ${left} of ${adults.length} adults left (${((100 * left) / adults.length).toFixed(1)} percent) against the survey's ${(100 * survey).toFixed(1)} percent for their ages`,
        );
        expect(left).toBeLessThanOrEqual(adults.length);
      },
    );
  }

  it("across the drawn places some adults leave for an offer, where none left before", () => {
    // Before this producer a year of reviews on the opening day moved nobody
    // in these places (#1594's check).
    expect(adultsAll).toBeGreaterThan(0);
    expect(leftAll).toBeGreaterThan(0);
  });

  it(`across the ${SEEDS.length} drawn places about 1.5 to 2 percent of adults move for a job offer in a year`, () => {
    const share = offerMoversAll / adultsAll;
    console.info(
      `A135 calibration: ${offerMoversAll} of ${adultsAll} adults moved for a job offer (${(100 * share).toFixed(2)} percent; ${offeredAll} offers, ${((100 * offeredAll) / adultsAll).toFixed(2)} percent of adults) against ${100 * OFFER_MOVERS_SHARE.low} to ${100 * OFFER_MOVERS_SHARE.high} percent`,
    );
    expect(share).toBeGreaterThanOrEqual(OFFER_MOVERS_SHARE.low);
    expect(share).toBeLessThanOrEqual(OFFER_MOVERS_SHARE.high);
  });

  it(
    `the same reviews of the same world decide the same searches, offers and moves (seed ${SEEDS[1]})`,
    { timeout: 60_000 },
    () => {
      const { world } = openAtFirstReview(SEEDS[1]);
      const first = aYearOfReviews(world);
      const second = aYearOfReviews(world);
      expect(recordedMoves(second)).toEqual(recordedMoves(first));
      const kinds = (w: World) =>
        offersElsewhere(w).map(({ application, steps }) => [
          application.personId,
          steps.map((step) => step.kind),
        ]);
      expect(kinds(second)).toEqual(kinds(first));
      // Somebody with nothing in their record pushing them looks nowhere.
      const searched = new Set<EntityId>(
        offersElsewhere(first).map(({ application }) => application.personId),
      );
      expect(searched.size).toBeGreaterThan(0);
    },
  );
});
