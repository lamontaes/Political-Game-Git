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
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  fileForOffice,
  projectCampaign,
  spendAnAfternoon,
} from "./campaign-projection";
import { buildProductionWorld } from "./production-world";
import { projectBudgetEconomy } from "./budget-economy";

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

function seatedFiscalReader(): {
  readonly world: World;
  readonly personId: EntityId;
} {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "recovery25-budget:seated-reader",
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "female",
    pronouns: "she-her",
    questionnaire: "skipped",
  });
  let world = openOrdinaryLife(built.world, built.playerPersonId);
  world = fileForOffice(world, built.playerPersonId);
  world = spendAnAfternoon(world, built.playerPersonId, "fundraising");
  for (let index = 0; index < 3; index += 1) {
    world = passOrdinaryDays(world);
    world = spendAnAfternoon(world, built.playerPersonId, "outreach");
  }
  for (
    let day = 0;
    day < 60 && projectCampaign(world, built.playerPersonId).phase === "active";
    day += 1
  ) {
    world = passOrdinaryDays(world);
  }
  if (projectCampaign(world, built.playerPersonId).phase !== "won") {
    throw new Error(
      "Budget proof seed did not produce the accepted seated route.",
    );
  }
  return { world, personId: built.playerPersonId };
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

  it("does not gate public reading on office and does not lend Lexington data to a state", () => {
    const seated = seatedFiscalReader();
    expect(resolveActiveMemberSeat(seated.world, seated.personId).kind).toBe(
      "seated",
    );

    const kentuckyJurisdictionId =
      requireLifePlace("kentucky").context.jurisdiction.id;
    const result = projectBudgetEconomy(seated.world, kentuckyJurisdictionId);
    expect(result.economicBinding).toBeNull();
    expect(result.simulationDate).toBe(seated.world.currentDate);
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
      title: "Government revenue and outlays",
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
