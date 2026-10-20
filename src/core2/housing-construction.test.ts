/** New homes: builders start what pays at the state's permit rate, zoning moves it, and a finished building adds rental units. */
import { describe, expect, it } from "vitest";
import {
  houseUnassignedHouseholds,
  occupyCompletedRentals,
} from "./housing-occupancy";
import { collapseToTwoLevels } from "./residents";
import { residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";
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

function month(upzoned: boolean, fixture = input()) {
  const core = createLifeCore(fixture, {
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
  });
});

describe("completed rental occupancy", () => {
  it("changes a chosen household's actual lease without consuming the old home's vacancy", () => {
    const base = input();
    const fixture = {
      ...base,
      people: base.people.map((person) =>
        ["p0", "p1"].includes(person.id)
          ? { ...person, jobId: `job:${person.id}` }
          : person,
      ),
      jobs: ["p0", "p1"].map((personId) => ({
        id: `job:${personId}`,
        personId,
        organizationId: landlord,
        title: "Clerk",
        wageDailyMinor: 15000,
        hoursDaily: 8,
        source: src,
      })),
    };
    const t = month(false, fixture);
    const state = t.api.moduleState("housing");
    const project = "project:occupancy-fixture";
    t.tables.projects.put({
      id: project,
      placeId: place,
      kind: "multi",
      units: 1,
      affordableUnits: 0,
      askingRentMinor: 100000,
      medianPayMinor: 450000,
      payerId: landlord,
      builderId: "organization:outside",
      monthlyCostMinor: 0,
      paidMinor: 0,
      startedAt: start,
      completesAt: start,
      open: false,
      isProject: true,
    });
    for (const [person, rent] of [
      ["p0", 150000],
      ["p1", 90000],
    ] as const) {
      t.api.addFinanceContract({
        id: `lease:household:${person}`,
        householdId: `household:${person}`,
        payerIds: [person],
        payeeId: landlord,
        kind: "household-purchase",
        amountMinor: rent,
        dueAt: "2021-02-01",
        periodMonths: 1,
        accruesArrears: true,
        source: src,
      });
    }
    const vacancy = t.tables.stock.get(`stock:${place}`)!.vacantRental;
    occupyCompletedRentals(t.api);
    expect(
      t.core.finance.contracts.get("lease:household:p0")!.amountMinor,
    ).toBe(100000);
    expect(
      t.core.finance.contracts.get("lease:household:p1")!.amountMinor,
    ).toBe(90000);
    expect(state.table("occupancy").get("household:p0")?.projectId).toBe(
      project,
    );
    expect(state.table("moves").rows()).toHaveLength(1);
    expect(t.tables.stock.get(`stock:${place}`)!.vacantRental).toBe(vacancy);
    occupyCompletedRentals(t.api);
    expect(state.table("moves").rows()).toHaveLength(1);
    expect(state.table("occupancy").rows()).toHaveLength(1);
  });
});

describe("new households taking completed homes", () => {
  it("uses income and cash in both tiers, bills the real rent, and preserves the lease on fill-in", () => {
    const base = input();
    const fixture = {
      ...base,
      finance: { contracts: [], facilities: [], businesses: [], gaps: [] },
      people: base.people
        .filter((person) => ["p0", "p1", "p2"].includes(person.id))
        .map((person) => ({
          ...person,
          jobId: `job:${person.id}`,
          liquidMinor: person.id === "p2" ? 0 : 1000000,
        })),
      households: base.households.filter((house) =>
        ["household:p0", "household:p1", "household:p2"].includes(house.id),
      ),
      jobs: ["p0", "p1", "p2"].map((personId) => ({
        id: `job:${personId}`,
        personId,
        organizationId: landlord,
        title: "Clerk",
        wageDailyMinor: 15000,
        hoursDaily: 8,
        source: src,
      })),
    };
    const t = month(
      false,
      collapseToTwoLevels(fixture, { keep: new Set(["p0", "p2"]) }),
    );
    const state = t.api.moduleState("housing");
    t.tables.projects.put({
      id: "project:newcomers",
      placeId: place,
      kind: "multi",
      units: 3,
      affordableUnits: 0,
      askingRentMinor: 100000,
      medianPayMinor: 450000,
      payerId: landlord,
      builderId: "organization:outside",
      monthlyCostMinor: 0,
      paidMinor: 0,
      startedAt: start,
      completesAt: start,
      open: false,
      isProject: true,
    });
    const before = Number(t.tables.stock.get(`stock:${place}`)!.vacantRental);
    houseUnassignedHouseholds(t.api);
    const occupied = state.table("occupancy").rows();
    expect(occupied).toHaveLength(2);
    expect(new Set(occupied.map((row) => row.unit)).size).toBe(2);
    expect(state.table("occupancy").get("household:p2")).toBeUndefined();
    expect(t.tables.stock.get(`stock:${place}`)!.vacantRental).toBe(before - 2);
    const rt = residentsRuntime(t.core)!;
    expect(rt.flows.get("rent:household:p1")?.amountMinor).toBe(100000);
    houseUnassignedHouseholds(t.api);
    expect(state.table("occupancy").rows()).toHaveLength(2);
    const landlordBefore = t.core.organizations.get(landlord)!.liquidMinor;
    advanceCore(t.core, "2021-02-02");
    expect(
      t.core.organizations.get(landlord)!.liquidMinor,
    ).toBeGreaterThanOrEqual(landlordBefore + 200000);
    expect(rt.flows.get("rent:household:p1")?.nextAt).toBe("2021-03-01");
    fillInPerson(t.core, "p1");
    expect(
      [...t.core.finance.contracts.values()].some(
        (row) =>
          row.householdId === "household:p1" &&
          !row.endedAt &&
          row.amountMinor === 100000,
      ),
    ).toBe(true);
    expect(rt.flows.get("rent:household:p1")?.endedAt).toBeDefined();
  });
});
