import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  availableAdultSituations,
  buildAdultLifeContext,
  deserializeWorld,
  serializeWorld,
  refreshLifeOpportunities,
} from "../simulation";
import { livingCostsFlowFor } from "../simulation/cost-of-living";
import { ensureLifePathPersonalPosition } from "../simulation/life-paths2-resources";
import { resourcePositionAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import { OFFICE_SALARY_PLACEHOLDER } from "../simulation/office-salary";
import type { EntityId, World } from "../simulation";
import { chooseAdultOption, letAdultTimePass } from "./adult-life";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

/**
 * Ordinary adult life in Minneapolis, away from the Kentucky fixture.
 */
function newLife(
  seed = "ordinary-adult-life",
  options: { readonly betweenJobs?: boolean } = {},
): {
  world: World;
  personId: EntityId;
} {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    // An adult who earns nothing: the start as it was before a grown-up
    // start arrived holding a job in town.
    ...(options.betweenJobs ? { adultStartWorkVersion: undefined } : {}),
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

describe("ordinary time without a recurring chore", () => {
  it("opens and advances without creating a grocery task or generic errand scene", () => {
    const { world, personId } = newLife();
    expect(
      world.history.workItems.some((item) =>
        item.stableKey.startsWith("ordinary-life:household-errands"),
      ),
    ).toBe(false);
    expect(
      availableAdultSituations(buildAdultLifeContext(world, personId)).map(
        (situation) => situation.key,
      ),
    ).not.toContain("adult.ordinary-good-day");
    const later = letAdultTimePass(world, 8);
    assertWorldIntegrity(later);
    expect(
      later.history.workItems.some((item) =>
        item.stableKey.startsWith("ordinary-life:household-errands"),
      ),
    ).toBe(false);
    const reloaded = deserializeWorld(serializeWorld(later));
    expect(
      reloaded.history.workItems.some((item) =>
        item.stableKey.startsWith("ordinary-life:household-errands"),
      ),
    ).toBe(false);
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
    const { world, personId } = newLife(undefined, { betweenJobs: true });
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
    const { world, personId } = newLife(undefined, { betweenJobs: true });
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
      /^[A-Z][a-z]+'s food and bills came to \$791\.25/,
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
    const { world, personId } = newLife(undefined, { betweenJobs: true });
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
      1_000_000 - charges.length * 79_125,
    );
    expect(
      buildAdultLifeContext(later, personId).openOpportunityKinds.has(
        "household-shortfall",
      ),
    ).toBe(false);
  });

  it("charges nobody whose money the game is not tracking", () => {
    const { world, personId } = newLife(undefined, { betweenJobs: true });
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

  it("pays a New York governor the state's published salary, weekly", () => {
    const { world, personId } = newLife();
    let w = createOrganization(world, {
      stableKey: "test:ny-executive",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Test office." },
      initialProfile: {
        name: "Office of the Governor of New York",
        classification: "sector:government",
        locationJurisdictionId: null,
      },
    });
    w = createWorkRelationship(w, {
      stableKey: "test:ny-governor",
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
        occupationClassification: "service:us-ny-governor",
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
      Math.round(25_000_000 / 52),
    );
  });
});
