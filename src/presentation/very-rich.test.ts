import { beforeAll, describe, expect, it } from "vitest";

import {
  deserializeWorld,
  makeCurrencyCode,
  searchLifePlaces,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import { mogulInterests, mogulOffers } from "../simulation/moguls";
import { stateOfJurisdiction } from "../simulation/press/outlets";
import { resourcePositionAt } from "../simulation/resource-queries";
import {
  BUSINESS_OWNER_WORK_KIND,
  seatVeryRichPeople,
  UNRESEARCHED_VERY_RICH,
  veryRichPeopleIn,
} from "../simulation/very-rich";
import { projectMogulOffers } from "./mogul-offers-view";
import { fileForStateExecutiveOffice } from "./nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

const USD = makeCurrencyCode("USD");
const LONG = 900_000;

/** A new game in Colorado, opened the way the player opens one. */
function coloradoLife(seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-CO",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 45,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const world = openOrdinaryLife(game.world, personId);
  const state = stateOfJurisdiction(
    world,
    world.people[personId]!.homeJurisdictionId,
  )!;
  return { world, personId, state };
}

describe("the very rich in a new game", () => {
  let life: ReturnType<typeof coloradoLife>;
  let week: World;
  let rich: readonly EntityId[];
  beforeAll(() => {
    life = coloradoLife("very-rich-colorado");
    week = passOrdinaryDays(life.world, 7);
    rich = veryRichPeopleIn(week, life.state);
  }, LONG);

  it(
    "seats them in the player's state within the first week",
    () => {
      expect(veryRichPeopleIn(life.world, life.state)).toEqual([]);
      expect(rich).toHaveLength(UNRESEARCHED_VERY_RICH.perState);
      for (const personId of rich) {
        expect(
          stateOfJurisdiction(week, week.people[personId]!.homeJurisdictionId),
        ).toBe(life.state);
      }
    },
    LONG,
  );

  it(
    "gives each money of their own, a company and what it wants",
    () => {
      for (const personId of rich) {
        const balance = resourcePositionAt(
          week,
          { kind: "person", personId },
          USD,
        )!.liquidBalance.minorUnits;
        expect(balance).toBeGreaterThanOrEqual(
          UNRESEARCHED_VERY_RICH.minimumFortuneDollars * 100,
        );
        const owned = activeWorkRelationshipsAt(week, personId).filter(
          (entry) => entry.relationship.kind === BUSINESS_OWNER_WORK_KIND,
        );
        expect(owned).toHaveLength(1);
        expect(owned[0]!.relationship.organizationId).not.toBeNull();
        expect(mogulInterests(week, personId).length).toBeGreaterThan(0);
      }
    },
    LONG,
  );

  it(
    "seats a state once, and the seating survives a save",
    () => {
      const state = life.state;
      expect(seatVeryRichPeople(week, state)).toBe(week);
      const reloaded = deserializeWorld(serializeWorld(week));
      expect(veryRichPeopleIn(reloaded, state)).toEqual(rich);
      expect(passOrdinaryDays(reloaded, 7).personOrder.length).toBe(
        passOrdinaryDays(week, 7).personOrder.length,
      );
    },
    LONG,
  );

  it(
    "brings the player an offer once they run for governor",
    () => {
      let world = fileForStateExecutiveOffice(week, life.personId);
      for (let weeks = 0; weeks < 26; weeks += 1) {
        if (mogulOffers(world, { toPersonId: life.personId }).length > 0) break;
        world = passOrdinaryDays(world, 7);
      }
      const offers = mogulOffers(world, { toPersonId: life.personId });
      expect(offers.length).toBeGreaterThan(0);
      expect(rich).toContain(offers[0]!.mogulPersonId);
      const view = projectMogulOffers(world, life.personId);
      expect(view[0]!.offer).toMatch(/offers your campaign \$[\d,]+\.$/);
    },
    LONG,
  );
});
