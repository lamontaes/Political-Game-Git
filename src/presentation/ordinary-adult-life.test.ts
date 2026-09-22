import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  availableAdultSituations,
  buildAdultLifeContext,
  deserializeWorld,
  serializeWorld,
  simulationMinutesBetween,
  refreshLifeOpportunities,
} from "../simulation";
import {
  LIVING_COSTS_PLACEHOLDER,
  livingCostsFlowFor,
} from "../simulation/cost-of-living";
import { ensureLifePathPersonalPosition } from "../simulation/life-paths2-resources";
import { resourcePositionAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
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

describe("living costs are charged a week at a time", () => {
  const positionOf = (world: World, personId: EntityId) =>
    resourcePositionAt(
      world,
      { kind: "person", personId },
      money(0, "USD").currency,
    );

  it("charges a tracked person each whole week, and only once", () => {
    const { world, personId } = newLife();
    const funded = ensureLifePathPersonalPosition(
      world,
      personId,
      money(0, "USD").currency,
    );
    expect(positionOf(funded, personId)).toBeDefined();
    const started = letAdultTimePass(funded, 1);
    expect(livingCostsFlowFor(started, personId)).not.toBeNull();
    const later = letAdultTimePass(started, 22);
    assertWorldIntegrity(later);
    const flow = livingCostsFlowFor(later, personId)!;
    const outcomes = later.history.resourceTransferOutcomes.filter(
      (outcome) => outcome.resourceFlowId === flow.id,
    );
    expect(outcomes).toHaveLength(3);
    // Nothing was ever earned here, so every week is short, and the first
    // short week is something the life now carries.
    expect(outcomes.every((outcome) => outcome.status === "missed")).toBe(true);
    expect(
      buildAdultLifeContext(later, personId).openOpportunityKinds.has(
        "household-shortfall",
      ),
    ).toBe(true);
    // Settling again, or after a reload, writes nothing.
    const reloaded = deserializeWorld(serializeWorld(later));
    expect(serializeWorld(refreshLifeOpportunities(reloaded, personId))).toBe(
      serializeWorld(later),
    );
  });

  it("offers the first short week as a moment, with its amounts, once", () => {
    const { world, personId } = newLife();
    const broke = letAdultTimePass(
      letAdultTimePass(
        ensureLifePathPersonalPosition(
          world,
          personId,
          money(0, "USD").currency,
        ),
        1,
      ),
      8,
    );
    const offered = availableAdultSituations(
      buildAdultLifeContext(broke, personId),
    ).find((situation) => situation.key === "adult.household-money-shortfall");
    expect(offered?.prose).toMatch(/rent, food and bills came to \$350\.00/);
    const answered = chooseAdultOption(broke, {
      personId,
      situationKey: "adult.household-money-shortfall",
      optionKey: "say-so",
    });
    const later = letAdultTimePass(answered, 21);
    expect(
      availableAdultSituations(buildAdultLifeContext(later, personId)).map(
        (situation) => situation.key,
      ),
    ).not.toContain("adult.household-money-shortfall");
  });

  it("takes the week's costs out of recorded money", () => {
    const { world, personId } = newLife();
    const owner = { kind: "person" as const, personId };
    const funded = createResourcePosition(world, {
      stableKey: "test:opening-savings",
      owner,
      openedAt: world.currentDate,
      openingBalance: money(1_000_000, "USD"),
      provenance: { kind: "authored", note: "Test savings." },
    });
    const later = letAdultTimePass(letAdultTimePass(funded, 1), 14);
    const balance = positionOf(later, personId)!.liquidBalance.minorUnits;
    expect(balance).toBe(
      1_000_000 - 2 * LIVING_COSTS_PLACEHOLDER.weeklyPerAdultMinor,
    );
    expect(
      buildAdultLifeContext(later, personId).openOpportunityKinds.has(
        "household-shortfall",
      ),
    ).toBe(false);
  });

  it("charges nobody whose money the game is not tracking", () => {
    const { world, personId } = newLife();
    // A new ordinary start records no money until something is earned.
    expect(positionOf(world, personId)).toBeUndefined();
    const later = letAdultTimePass(world, 30);
    expect(livingCostsFlowFor(later, personId)).toBeNull();
  });
});
