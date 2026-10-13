/**
 * PW-7 step 4: homes have values and rents in the place the player plays,
 * whichever place has the most households (relatives living elsewhere have
 * no home here), and the bills begin once the town's full and counted
 * households are known. A random recorded locality from all 56 places.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { lifePlaceByKey } from "../simulation/life-places";
import { advanceCore, createLifeCore } from "./life";
import { CREDIT_MODULE } from "./modules/credit";
import { HOUSING_MODULE, withHousing } from "./modules/housing";
import { MACRO_MODULE, withCentralBank } from "./modules/macro";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import type { CoreInput, Source } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const drawn = drawPlace(seed, "pw7-housing-places");
const start = "2026-10-12";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Housing places fixture only.",
};
const placeId = lifePlaceByKey(drawn.key)!.context.jurisdiction.id;
const elsewhere = "jurisdiction:relatives-elsewhere";

/** Twelve households in the played place (four with no job) and twenty of relatives elsewhere, so the elsewhere place has the most. */
function fixture(): CoreInput {
  const homes = [
    ...Array.from({ length: 12 }, (_, i) => ({ id: `home:${i}`, at: placeId })),
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `kin:${i}`,
      at: elsewhere,
    })),
  ];
  const people = homes.map((home, i) => ({
    id: `person:${home.id}`,
    givenName: "Fixture",
    familyName: `F${i}`,
    birthDate: `${1950 + i}-03-01`,
    placeId: home.at,
    householdId: home.id,
    tier: "monthly" as const,
    traits: {},
    liquidMinor: 5_000_000,
    livingCostDailyMinor: 0,
    source: src,
    familyIds: [],
    knownIds: [],
    ...(home.at === placeId && i % 3 !== 0 ? { jobId: `job:${i}` } : {}),
  }));
  return withCentralBank({
    seed: "housing-places",
    startedAt: start,
    people,
    households: homes.map((home) => ({
      id: home.id,
      placeId: home.at,
      memberIds: [`person:${home.id}`],
      source: src,
    })),
    jobs: people
      .filter((row) => row.jobId)
      .map((row, i) => ({
        id: row.jobId!,
        personId: row.id,
        organizationId: "organization:shop",
        title: "Clerk",
        hourlyMinor: 1_500 + 250 * i,
        hoursDaily: 8,
        wageDailyMinor: (1_500 + 250 * i) * 8,
        source: src,
      })),
    organizations: [
      {
        id: "organization:shop",
        placeId,
        name: "Shop",
        kind: "employer",
        liquidMinor: 100_000_000,
        source: src,
      },
      {
        id: "organization:bank:fixture",
        placeId,
        name: "Bank",
        kind: "bank",
        liquidMinor: 500_000_000,
        source: src,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    placeMetadata: { placeKey: drawn.key },
  });
}

type Dwelling = [string, "own" | "rent", number, string];

describe(`homes in ${drawn.name} (seed ${seed})`, () => {
  it("every household in the played place has a home with a value or a rent, none at $0; relatives elsewhere have none", () => {
    const out = withHousing(fixture());
    const dwellings = JSON.parse(
      out.placeMetadata!.housingDwellings!,
    ) as Dwelling[];
    const ids = new Set(dwellings.map((row) => row[0]));
    for (let i = 0; i < 12; i++) expect(ids.has(`home:${i}`)).toBe(true);
    expect([...ids].some((id) => id.startsWith("kin:"))).toBe(false);
    expect(dwellings.every((row) => row[2] > 0)).toBe(true);
    // The household with no job still has a home, priced below the place's median.
    const jobless = dwellings.find((row) => row[0] === "home:0")!;
    const sameTenure = dwellings
      .filter((row) => row[1] === jobless[1])
      .map((row) => row[2])
      .sort((a, b) => a - b);
    expect(jobless[2]).toBeLessThanOrEqual(
      sameTenure[Math.floor(sameTenure.length / 2)]!,
    );
    // No bills yet: they begin with the module, once full and counted households are known.
    expect(out.finance?.contracts).toEqual([]);
  });

  it("on its first day the module bills each renter its rent and each owner who owes its mortgage, and every dollar balances", () => {
    const core = createLifeCore(withHousing(fixture()), {
      data: worldCoreData(),
      modules: [MACRO_MODULE, CREDIT_MODULE, HOUSING_MODULE],
      scheduledWork: false,
    });
    const api = coreAPI(core);
    const cash = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      );
    const outsideNet = () =>
      [...core.cashJournal.externalFlowsByOwner.values()].reduce(
        (n, row) => n + row.netMinor,
        0,
      );
    const opening = cash();
    advanceCore(core, "2026-12-05");
    const dwellings = api
      .moduleState("housing")
      .table("dwellings")
      .rows() as unknown as {
      householdId: string;
      tenure: string;
      valueMinor?: number;
      rentMinor?: number;
    }[];
    expect(dwellings.length).toBe(12);
    for (const row of dwellings)
      if (row.tenure === "rent") {
        expect(row.rentMinor).toBeGreaterThan(0);
        const lease = core.finance.contracts.get(`lease:${row.householdId}`);
        const person = core.people.get(`person:${row.householdId}`)!;
        // A household with no recorded income has its rent but no landlord's bill, so no arrears (stopgap).
        if (!person.jobId) {
          expect(lease).toBeUndefined();
          continue;
        }
        expect(lease?.amountMinor).toBe(row.rentMinor);
        // November's and December's rent have left the household, to the cent.
        expect(person.liquidMinor).toBe(5_000_000 - 2 * row.rentMinor!);
      } else expect(row.valueMinor).toBeGreaterThan(0);
    for (const row of api
      .moduleState("housing")
      .table("mortgages")
      .rows() as unknown as { householdId: string; paymentMinor: number }[])
      expect(
        core.finance.contracts.get(`mortgage:${row.householdId}`)?.amountMinor,
      ).toBe(row.paymentMinor);
    expect(cash()).toBe(opening - outsideNet());
  });
});
