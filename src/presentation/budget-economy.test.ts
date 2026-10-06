import { describe, expect, it } from "vitest";

import {
  createDemoWorld,
  deserializeWorld,
  money,
  recordWorldMetricState,
  requireLifePlace,
  serializeWorld,
  worldMetricDefinitionByStableKey,
  type EntityId,
  type MetricReferencePeriod,
  type World,
} from "../simulation";
import { buildProductionWorld } from "./production-world";
import { projectBudgetEconomy } from "./budget-economy";
import { NATIONAL_ELECTION_JURISDICTION } from "../simulation/national-election-geography";

function productionWorld(
  placeKey: "lexington-fayette" | "kentucky",
  startingLife: "ordinary-life" | "legislative-office" = "ordinary-life",
): World {
  return buildProductionWorld({
    seed: `recovery25-budget:${placeKey}:${startingLife}`,
    place: requireLifePlace(placeKey),
    age: 38,
    givenName: "Budget",
    familyName: "Reader",
    startingLife,
    depth: "summarize-earlier-life",
    household: "lives-alone",
  }).world;
}

function interval(startsAt: string, endsAt: string): MetricReferencePeriod {
  return {
    kind: "interval",
    startsAt: startsAt as World["currentDate"],
    endsAt: endsAt as World["currentDate"],
  };
}

function fiscalState(
  world: World,
  stableKey: string,
  metricKey: "government.revenue" | "government.outlays",
  amount: number,
  period: MetricReferencePeriod,
  segmentKey: `scenario.${string}` | null = null,
  supersedesStateId: string | null = null,
): World {
  const jurisdictionId = world.jurisdictionOrder[0]!;
  return recordWorldMetricState(world, {
    stableKey,
    metricId: worldMetricDefinitionByStableKey(world, metricKey).id,
    scope: { jurisdictionId, segmentKey },
    referencePeriod: period,
    value: { kind: "money", money: money(amount, "USD") },
    recordedAt: world.currentDate,
    provenance: { kind: "authored", note: "Budget surface proof fixture." },
    supersedesStateId: supersedesStateId as never,
  });
}

describe("Budget/economy read model", () => {
  it("projects federal categories without inventing a month before settlement", () => {
    const demo = createDemoWorld("recovery25-budget:federal-categories");
    const world: World = {
      ...demo,
      jurisdictions: {
        ...demo.jurisdictions,
        [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
      },
    };
    const result = projectBudgetEconomy(
      world,
      NATIONAL_ELECTION_JURISDICTION.id,
    );

    expect(result.federalBudget).toMatchObject({
      status: "available",
      month: null,
    });
    expect(
      result.federalBudget!.receipts.every((line) => line.amount === null),
    ).toBe(true);
    expect(
      result.federalBudget!.outlays.every((line) => line.amount === null),
    ).toBe(true);
    expect(result.programLines).toBeNull();
  });

  it("resolves only the exact supported place and preserves the simulation date", () => {
    const world = productionWorld("lexington-fayette");
    const before = JSON.stringify(world);
    const result = projectBudgetEconomy(world, world.jurisdictionOrder[0]!);

    expect(result).toMatchObject({
      placeLabel: "Lexington, Kentucky",
      simulationDate: world.currentDate,
      economicBinding: {
        bindingKey: "economic-context.lexington-ky.v2",
        placeKey: "lexington-fayette",
      },
      fiscalAvailability: { status: "unavailable" },
    });
    expect(JSON.stringify(world)).toBe(before);
  });

  it("does not lend Lexington data to a state scope", () => {
    const world = productionWorld("lexington-fayette");
    const kentucky = requireLifePlace("kentucky").context.jurisdiction;
    const withKentucky: World = {
      ...world,
      jurisdictions: { ...world.jurisdictions, [kentucky.id]: kentucky },
    };
    const result = projectBudgetEconomy(withKentucky, kentucky.id);
    expect(result.economicBinding).toBeNull();
    expect(result.simulationDate).toBe(withKentucky.currentDate);
  });

  it("projects exact aggregate fiscal history and excludes proposal segments", () => {
    const period = interval("2025-01-01", "2025-12-31");
    let world = createDemoWorld("recovery25-budget:fiscal-history");
    world = fiscalState(
      world,
      "budget:revenue:initial",
      "government.revenue",
      10_000,
      period,
    );
    const initialRevenue = world.history.metricStates.at(-1)!;
    world = fiscalState(
      world,
      "budget:revenue:corrected",
      "government.revenue",
      11_000,
      period,
      null,
      initialRevenue.id,
    );
    world = fiscalState(
      world,
      "budget:outlays",
      "government.outlays",
      9_000,
      period,
    );
    world = fiscalState(
      world,
      "budget:proposal-scenario",
      "government.outlays",
      99_000,
      period,
      "scenario.incremental-proposal.test",
    );
    const result = projectBudgetEconomy(world, world.jurisdictionOrder[0]!);
    const graph = result.fiscalGraphs[0]!;
    expect(result.fiscalAvailability).toEqual({
      status: "available",
      graphCount: 1,
    });
    expect(graph).toMatchObject({
      title: "Recorded tax receipts and program outlays",
      unit: "USD minor units",
      geography: {
        providerCode: world.jurisdictionOrder[0],
        providerName: "Lexington-Fayette, Kentucky",
      },
    });
    expect(graph.series.map((series) => series.recordClass)).toEqual([
      "simulated-history",
      "simulated-history",
    ]);
    expect(
      graph.series.flatMap((series) =>
        series.points.map((point) => point.value),
      ),
    ).toEqual([11_000, 9_000]);
    expect(JSON.stringify(result)).not.toContain("99000");
  });

  it("labels an exact one-day fiscal interval as a single date", () => {
    let world = createDemoWorld("recovery25-budget:one-day-flow");
    const date = world.currentDate;
    world = fiscalState(
      world,
      "budget:one-day-receipt",
      "government.revenue",
      100,
      interval(date, date),
    );
    const graph = projectBudgetEconomy(world, world.jurisdictionOrder[0]!)
      .fiscalGraphs[0]!;
    expect(graph.title).toBe("Recorded tax receipts and program outlays");
    expect(
      graph.series.flatMap((series) =>
        series.points.map((point) => point.period),
      ),
    ).toEqual([date]);
  });

  it("reprojects the same public reading after a save round trip", () => {
    const world = productionWorld("lexington-fayette");
    const jurisdictionId = world.jurisdictionOrder[0]!;
    expect(
      projectBudgetEconomy(
        deserializeWorld(serializeWorld(world)),
        jurisdictionId,
      ),
    ).toEqual(projectBudgetEconomy(world, jurisdictionId));
  });
});
