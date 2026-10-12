/** M1-05 checks on a recorded fixture: eviction only from unpaid rent, through the place's steps. */
import { describe, expect, it } from "vitest";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import { HOUSING_MODULE } from "./modules/housing";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import { WORLD_TRANSFER_MODULE, transferCash } from "./world-transfer";
import type { CoreInput, Source } from "./types";

const start = "2021-01-01",
  place = "place:housing-fixture",
  landlord = "organization:landlord";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Housing fixture only.",
};
function input(usps: string): CoreInput {
  const people = [
    ["payer", 10_000_000],
    ["broke", 0],
  ] as const;
  return {
    seed: "housing-fixture",
    startedAt: start,
    people: people.map(([id, cash]) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId: place,
      householdId: `household:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: cash,
      livingCostDailyMinor: 0,
      source: src,
      familyIds: [],
      knownIds: [],
    })),
    households: people.map(([id]) => ({
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
        liquidMinor: 0,
        source: src,
      },
    ],
    finance: {
      contracts: people.map(([id]) => ({
        id: `lease:household:${id}`,
        householdId: `household:${id}`,
        payerIds: [id],
        payeeId: landlord,
        kind: "household-purchase",
        amountMinor: 100_000,
        dueAt: "2021-02-01",
        periodMonths: 1,
        accruesArrears: true,
        source: src,
      })),
      facilities: [],
      businesses: [],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    placeMetadata: { housingState: usps },
  };
}

describe("eviction follows the place's steps", () => {
  it("serves notice after the grace period, files after the cure deadline, and removes only after judgment", () => {
    const usps = "TX",
      law = housingData.eviction[usps];
    const core = createLifeCore(input(usps), {
        data: worldCoreData(),
        modules: [WORLD_TRANSFER_MODULE, HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-04-30");
    const cases = api.moduleState("housing").snapshot().tables
      .cases as unknown as Record<string, string | number | boolean>[];
    expect(cases.every((row) => row.leaseId === "lease:household:broke")).toBe(
      true,
    );
    const first = cases[0]!;
    expect(first).toMatchObject({ stage: "removed", noticeAt: "2021-02-06" });
    const days = (a: unknown, b: unknown) =>
      (Date.parse(String(b)) - Date.parse(String(a))) / 86_400_000;
    expect(days(first.noticeAt, first.filedAt)).toBe(law.noticeDays);
    expect(days(first.filedAt, first.judgmentAt)).toBe(law.hearingDays);
    expect(days(first.judgmentAt, first.removedAt)).toBe(law.stayDays);
    expect(core.eventIds.has(`event:housing.eviction:${first.id}`)).toBe(true);
    expect(core.finance.contracts.get("lease:household:broke")!.endedAt).toBe(
      first.removedAt,
    );
    expect(
      core.finance.contracts.get("lease:household:payer")!.endedAt,
    ).toBeUndefined();
    expect(core.organizations.get(landlord)!.liquidMinor).toBe(300_000);
  });
});

describe("paying within the notice period", () => {
  it("in South Carolina, whose statute lets a tenant cure, cures the case when the household pays what it owes before the deadline", () => {
    const core = createLifeCore(input("SC"), {
        data: worldCoreData(),
        modules: [WORLD_TRANSFER_MODULE, HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-02-07");
    // The broke household is paid after the notice (a payday), from the landlord-unrelated payer.
    transferCash(api, "fixture:payday", "payer", "broke", 500_000, src);
    advanceCore(core, "2021-02-28");
    const cases = api.moduleState("housing").snapshot().tables
      .cases as unknown as { stage: string; leaseId: string }[];
    expect(
      cases.find((row) => row.leaseId === "lease:household:broke"),
    ).toMatchObject({ stage: "cured" });
    expect(
      core.finance.contracts.get("lease:household:broke")!.arrearsMinor,
    ).toBe(0);
  });
});
