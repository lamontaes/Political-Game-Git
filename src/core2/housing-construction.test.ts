/** New homes: builders start what pays at the state's permit rate, zoning moves it, and a finished building adds rental units. */
import { describe, expect, it } from "vitest";
import construction from "./data/housing/construction.json" with { type: "json" };
import { buildMonth, openStock, setZoning } from "./housing-construction";
import { advanceCore, createLifeCore } from "./life";
import { HOUSING_MODULE } from "./modules/housing";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import type { CoreInput, Source } from "./types";

const start = "2021-01-01",
  place = "place:build-fixture",
  landlord = "organization:landlord:fixture";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Construction fixture only.",
};
function input(): CoreInput {
  const people = Array.from({ length: 1000 }, (_, i) => `p${i}`);
  return {
    seed: "build-fixture",
    startedAt: start,
    people: people.map((id) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId: place,
      householdId: `household:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: 0,
      livingCostDailyMinor: 0,
      source: src,
      familyIds: [],
      knownIds: [],
    })),
    households: people.map((id) => ({
      id: `household:${id}`,
      placeId: place,
      memberIds: [id],
      source: src,
    })),
    jobs: [],
    organizations: [
      {
        id: landlord,
        placeId: place,
        name: "Rentals",
        kind: "employer",
        liquidMinor: 100_000_000_000,
        source: src,
      },
      {
        id: "organization:outside",
        placeId: place,
        name: "Outside",
        kind: "outside",
        liquidMinor: 0,
        outsideFlow: src,
        source: src,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  } as CoreInput;
}

function month(upzoned: boolean) {
  const core = createLifeCore(input(), {
      data: worldCoreData(),
      modules: [HOUSING_MODULE],
    }),
    api = coreAPI(core);
  advanceCore(core, "2021-01-02");
  const tables = {
    stock: api.moduleState("housing").table("stock"),
    projects: api.moduleState("housing").table("projects"),
  };
  openStock(tables.stock, place, 400, 30_000_000, 150_000, 1);
  if (upzoned) setZoning(tables.stock, place, { multifamilyLandShare: 1 });
  const finished: string[] = [];
  const run = () =>
    buildMonth(
      api,
      tables,
      {
        placeId: place,
        usps: "TX",
        landlordId: landlord,
        homeValueMinor: 30_000_000,
        rentMinor: 150_000,
        priceLevel: 1,
        medianMonthlyPayMinor: 400_000,
        source: src,
      },
      (project) => finished.push(project.id),
    );
  return { core, api, tables, run, finished };
}

describe("new homes", () => {
  it("allowing apartments on all residential land raises apartment starts by the upzoning response", () => {
    const base = month(false),
      upzoned = month(true);
    base.run();
    upzoned.run();
    const carry = (t: typeof base) =>
      Number(t.tables.stock.get(`stock:${place}`)!.carryMulti);
    const ratio = carry(upzoned) / carry(base);
    const expected =
      (1 / (1 - construction.zoning.singleFamilyOnlyShare)) **
      base.api.parameter("housingLandStartsElasticity");
    expect(ratio).toBeCloseTo(expected, 6);
    // Texas permits: about 1,000 residents start a fraction of a building a month.
    expect(carry(base)).toBeCloseTo(
      (construction.byState.TX.multiPerThousand * 1) / 12,
      6,
    );
  });
  it("the landlord pays for an apartment building month by month and its finish adds rental units", () => {
    const t = month(true);
    const stock = t.tables.stock.get(`stock:${place}`)!;
    t.tables.stock.put({ ...stock, carryMulti: 30 });
    t.run();
    const projects = t.tables.projects.rows();
    expect(projects).toHaveLength(1);
    const units = Number(t.tables.stock.get(`stock:${place}`)!.rentalUnits);
    advanceCore(t.core, "2022-12-31");
    t.run();
    expect(t.finished).toHaveLength(1);
    expect(Number(t.tables.stock.get(`stock:${place}`)!.rentalUnits)).toBe(
      units + Number(projects[0]!.units),
    );
    // With no construction business in town, the landlord's builder is outside the town.
    expect(t.core.organizations.get(landlord)!.liquidMinor).toBe(
      100_000_000_000 - 2 * Number(projects[0]!.monthlyCostMinor),
    );
  }, 180_000);
});
