import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  buildAdultLifeContext,
  deserializeWorld,
  serializeWorld,
  simulationMinutesBetween,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { householdErrandsFor } from "../simulation/life-opportunities";
import { chooseAdultOption, letAdultTimePass } from "./adult-life";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * Ordinary adult life, from the long playthrough (Fatima Erickson in
 * Eastport, Maine; Seth Woodward in Ely, Nevada): the errands that never got
 * done. Played in Minneapolis so the proof does not lean on the Kentucky
 * fixture.
 */
function newLife(seed = "ordinary-adult-life"): {
  world: World;
  personId: EntityId;
} {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 32,
    placeKey: "2743000",
    questionnaire: "skipped",
    priors: [],
    seed,
  } as NewGameSetup);
  return {
    world: openOrdinaryLife(created.world, created.playerPersonId),
    personId: created.playerPersonId,
  };
}

describe("getting things done does the errands", () => {
  it("spends the errand's time and closes the list", () => {
    const { world, personId } = newLife();
    const item = householdErrandsFor(world, personId);
    expect(item).not.toBeNull();
    const done = chooseAdultOption(world, {
      personId,
      situationKey: "adult.ordinary-good-day",
      optionKey: "get-things-done",
    });
    assertWorldIntegrity(done);
    expect(householdErrandsFor(done, personId)).toBeNull();
    expect(buildAdultLifeContext(done, personId).hasHouseholdWorkItem).toBe(
      false,
    );
    expect(
      simulationMinutesBetween(world.currentMoment, done.currentMoment),
    ).toBe(item!.effort!.kind === "authored-duration" ? 150 : 0);
    expect(
      done.history.events.some(
        (event) => event.type === "life.household-errands-done",
      ),
    ).toBe(true);
    // A save holds the finished week.
    const reloaded = deserializeWorld(serializeWorld(done));
    expect(householdErrandsFor(reloaded, personId)).toBeNull();
  });

  it("leaves the list open when the player only decides to leave it", () => {
    const { world, personId } = newLife();
    const rested = chooseAdultOption(world, {
      personId,
      situationKey: "adult.ordinary-good-day",
      optionKey: "do-nothing",
    });
    expect(householdErrandsFor(rested, personId)).not.toBeNull();
    expect(rested.currentMoment).toEqual(world.currentMoment);
  });

  it("brings a new week's list only after a week has gone by", () => {
    const { world, personId } = newLife();
    const done = chooseAdultOption(world, {
      personId,
      situationKey: "adult.ordinary-good-day",
      optionKey: "get-things-done",
    });
    const later = letAdultTimePass(done, 8);
    const next = householdErrandsFor(later, personId);
    expect(next).not.toBeNull();
    expect(next!.stableKey).not.toBe(
      householdErrandsFor(world, personId)!.stableKey,
    );
  });
});
