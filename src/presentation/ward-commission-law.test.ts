import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../simulation/dates";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import {
  redistrictAfterCensus,
  redistrictForWardCommission,
} from "../simulation/living-world/local-elections";
import {
  councilWardPlan,
  drawWardCuts,
  townWardMap,
  WARD_COMMISSION_QUESTION,
  wardDrawerInForce,
} from "../simulation/living-world/town-wards";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  type LifePlace,
} from "../simulation/life-places";
import { placeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import { SeededRng } from "../simulation/rng";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { observerSetup, openObserverWorld } from "./observer-world";

/**
 * An independent ward commission (the policy question "Should an independent
 * commission draw city council districts?") takes the town's ward map out of
 * the council's hands. A watched world opens in a town whose council elects
 * by ward, drawn at random from every state that has one; the town adopts a
 * commission by ordinance, then repeals it.
 *
 * 1. Before the law, the council holds the pen.
 * 2. At the town's next yearly review after the law takes effect, the
 *    commission redraws at equal population, whatever the members' homes.
 * 3. After a repeal, the next census-year redraw is the council's again.
 */

const SEED = "build-5:ward-commission:1";

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

function withOrdinance(
  world: World,
  town: EntityId,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === WARD_COMMISSION_QUESTION,
  )!;
  const id = `measure_ward_commission_${answer}` as EntityId;
  const sequence = world.history.nextSequence;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence + 2,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        {
          id,
          stableKey: `test:ward-commission:${answer}`,
          sequence,
          jurisdictionId: town,
          rulePackId: "test",
          designation: "Ordinance 1",
          shortTitle: "Independent Ward Commission Ordinance",
          summary: "A test ordinance.",
          origin: "member-introduction",
          subjectClass: "general-policy",
          originChamberKey: "council",
          sponsorPersonId: null,
          introducedAt: effectiveAt,
          sourceDocumentKey: null,
          policyAlternativeIds: [],
          propositionIds: [proposition.id],
          propositionAnswers: [{ propositionId: proposition.id, answer }],
        },
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        {
          id: `enactment_ward_commission_${answer}` as EntityId,
          stableKey: `test:ward-commission:${answer}:enactment`,
          sequence: sequence + 1,
          measureId: id,
          resolvedAt: effectiveAt,
          outcome: "enacted",
          actDesignation: null,
          effectiveAt,
          outcomeEventId: `event_ward_commission_${answer}` as EntityId,
        },
      ],
    },
  } as World;
}

describe("an independent ward commission law", { timeout: 600_000 }, () => {
  it(`takes the map from the council and a repeal gives it back (${SEED})`, () => {
    const place = wardTown(SEED);
    const opened = openObserverWorld(observerSetup(SEED, place.key));
    let world = opened.world;
    const unit = placeLocalGovernmentUnits(place).municipal[0]!;
    const opening = townWardMap(world, unit)!;
    const town = world.history.events.find(
      (event) =>
        event.type === "local.wards-drawn" &&
        event.tags.includes(`unit:${unit.id}`),
    )!.jurisdictionId!;

    // 1. No law: the council draws, and nothing is redrawn early.
    expect(opening.drawnBy).toBe("council");
    expect(wardDrawerInForce(world, unit, town)).toBe("council");
    expect(redistrictForWardCommission(world, unit, town)).toBe(world);

    // 2. The ordinance takes effect; the next yearly review redraws.
    world = withOrdinance(world, town, "yes", world.currentDate);
    expect(wardDrawerInForce(world, unit, town)).toBe("commission");
    world = redistrictForWardCommission(world, unit, town);
    const commission = townWardMap(world, unit)!;
    expect(commission.drawnBy).toBe("commission");
    expect(commission.cuts).toEqual(
      drawWardCuts(opening.households, opening.wards, "commission", []),
    );
    const drawn = world.history.events.at(-1)!;
    expect(drawn.summary).toMatch(
      /drawn by an independent commission, the independent ward commission law took effect/,
    );
    // Its map holds until the next redistricting; a second review is a no-op.
    expect(redistrictForWardCommission(world, unit, town)).toBe(world);

    // 3. A repeal hands the census-year redraw back to the council.
    const repealAt = makeIsoDate(
      `${Number(world.currentDate.slice(0, 4)) + 1}-02-01`,
    );
    world = withOrdinance(world, town, "no", repealAt);
    world = { ...world, currentDate: makeIsoDate("2031-03-01") };
    expect(wardDrawerInForce(world, unit, town)).toBe("council");
    const members = sittingLocalOfficers(world, unit).length;
    expect(members).toBeGreaterThan(0);
    world = redistrictAfterCensus(world, unit, town);
    expect(townWardMap(world, unit)!.drawnBy).toBe("council");

    console.log(
      JSON.stringify({
        seed: SEED,
        place: `${place.displayName} (${place.key})`,
        opening: opening.cuts,
        commission: commission.cuts,
        paired: commission.paired.length,
        summary: drawn.summary,
      }),
    );
  });
});
