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
import { createOrganization, createWorkRelationship } from "../simulation/life";
import { OFFICE_SALARY_PLACEHOLDER } from "../simulation/office-salary";
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

describe("living costs are charged on the first of each month", () => {
  const positionOf = (world: World, personId: EntityId) =>
    resourcePositionAt(
      world,
      { kind: "person", personId },
      money(0, "USD").currency,
    );
  const chargesOf = (world: World, personId: EntityId) => {
    const flow = livingCostsFlowFor(world, personId)!;
    return world.history.resourceTransferOutcomes.filter(
      (outcome) => outcome.resourceFlowId === flow.id,
    );
  };

  it("charges a tracked person on each first of the month, and only once", () => {
    const { world, personId } = newLife();
    const funded = ensureLifePathPersonalPosition(
      world,
      personId,
      money(0, "USD").currency,
    );
    expect(positionOf(funded, personId)).toBeDefined();
    const started = letAdultTimePass(funded, 1);
    expect(livingCostsFlowFor(started, personId)).not.toBeNull();
    const later = letAdultTimePass(started, 70);
    assertWorldIntegrity(later);
    const charges = chargesOf(later, personId);
    // Seventy days always cross two or three firsts of the month.
    expect(charges.length).toBeGreaterThanOrEqual(2);
    for (const charge of charges)
      expect(charge.occurredAt.endsWith("-01")).toBe(true);
    // Nothing was ever earned here, so every month is short, and the first
    // short month is something the life now carries.
    expect(charges.every((charge) => charge.status === "missed")).toBe(true);
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

  it("offers the first short month as a moment, with its amounts, once", () => {
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
      40,
    );
    const offered = availableAdultSituations(
      buildAdultLifeContext(broke, personId),
    ).find((situation) => situation.key === "adult.household-money-shortfall");
    expect(offered?.prose).toMatch(
      /^[A-Z][a-z]+'s rent, food and bills came to \$1,500\.00/,
    );
    const answered = chooseAdultOption(broke, {
      personId,
      situationKey: "adult.household-money-shortfall",
      optionKey: "say-so",
    });
    const later = letAdultTimePass(answered, 70);
    expect(
      availableAdultSituations(buildAdultLifeContext(later, personId)).map(
        (situation) => situation.key,
      ),
    ).not.toContain("adult.household-money-shortfall");
  });

  it("takes the month's costs out of recorded money", () => {
    const { world, personId } = newLife();
    const funded = createResourcePosition(world, {
      stableKey: "test:opening-savings",
      owner: { kind: "person", personId },
      openedAt: world.currentDate,
      openingBalance: money(1_000_000, "USD"),
      provenance: { kind: "authored", note: "Test savings." },
    });
    const later = letAdultTimePass(letAdultTimePass(funded, 1), 70);
    const charges = chargesOf(later, personId);
    expect(charges.every((charge) => charge.status === "completed")).toBe(true);
    expect(positionOf(later, personId)!.liquidBalance.minorUnits).toBe(
      1_000_000 -
        charges.length * LIVING_COSTS_PLACEHOLDER.monthlyPerAdultMinor,
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

describe("new requests while one is open", () => {
  it("writes the same world when a life with something open is refreshed twice", () => {
    const { world, personId } = newLife();
    const later = letAdultTimePass(world, 3);
    const once = refreshLifeOpportunities(later, personId);
    expect(serializeWorld(refreshLifeOpportunities(once, personId))).toBe(
      serializeWorld(once),
    );
    const reloaded = deserializeWorld(serializeWorld(once));
    expect(serializeWorld(refreshLifeOpportunities(reloaded, personId))).toBe(
      serializeWorld(once),
    );
  });
});

describe("holding office pays a salary", () => {
  it("pays a governor weekly, once per week", () => {
    const { world, personId } = newLife();
    let w = createOrganization(world, {
      stableKey: "test:state-executive",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Test office." },
      initialProfile: {
        name: "Office of the Governor",
        classification: "sector:government",
        locationJurisdictionId: null,
      },
    });
    w = createWorkRelationship(w, {
      stableKey: "test:governor",
      personId,
      organizationId: w.history.organizations.at(-1)!.id,
      startedAt: w.currentDate,
      kind: "employment:executive-office",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "Test office." },
      initialRole: {
        title: "Governor",
        occupationClassification: "service:elected-executive",
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 60 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    const later = letAdultTimePass(letAdultTimePass(w, 1), 21);
    assertWorldIntegrity(later);
    const salary = later.history.resourceFlows.find((flow) =>
      flow.stableKey.startsWith("office-salary:"),
    )!;
    const paid = later.history.resourceTransferOutcomes.filter(
      (outcome) => outcome.resourceFlowId === salary.id,
    );
    expect(paid).toHaveLength(3);
    expect(paid[0]!.transferredAmount.minorUnits).toBe(
      Math.round(OFFICE_SALARY_PLACEHOLDER.annualMinor / 52),
    );
    expect(serializeWorld(refreshLifeOpportunities(later, personId))).toBe(
      serializeWorld(later),
    );
  });
});
