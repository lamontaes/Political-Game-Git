/** Property tax bills on owners: a twelfth of assessed value times the rate each month, with an assessment cap where the law sets one. */
import { afterEach, describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import {
  billPropertyTax,
  registerPropertyTax,
  stateEffectiveRate,
} from "./housing-property-tax";
import { HOUSING_MODULE } from "./modules/housing";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import { transferCash } from "./world-transfer";
import type { CoreInput, Source } from "./types";

const start = "2021-01-01",
  place = "place:tax-fixture",
  county = "organization:county-treasury";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Property tax fixture only.",
};
function input(): CoreInput {
  return {
    seed: "tax-fixture",
    startedAt: start,
    people: [
      {
        id: "owner",
        givenName: "owner",
        familyName: "Fixture",
        birthDate: "1960-01-01",
        placeId: place,
        householdId: "household:owner",
        tier: "monthly",
        traits: {},
        liquidMinor: 10_000_000,
        livingCostDailyMinor: 0,
        source: src,
        familyIds: [],
        knownIds: [],
      },
    ],
    households: [
      {
        id: "household:owner",
        placeId: place,
        memberIds: ["owner"],
        source: src,
      },
    ],
    jobs: [],
    organizations: [
      {
        id: county,
        placeId: place,
        name: "County treasury",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
      {
        id: "organization:outside",
        placeId: place,
        name: "Outside the town",
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
    placeMetadata: { housingState: "NJ" },
  } as CoreInput;
}

afterEach(() => registerPropertyTax(() => undefined));

describe("property tax bills", () => {
  it("without a county rate in force, the owner pays the state's average effective rate outside the town", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    const table = api.moduleState("housing").table("assessments");
    const homes = [
      {
        householdId: "household:owner",
        placeId: place,
        valueMinor: 40_000_000,
      },
    ];
    const paid = billPropertyTax(api, table, homes);
    expect(paid).toBe(Math.round((40_000_000 * stateEffectiveRate("NJ")) / 12));
  });
  it("a county's rate and a 2% assessment cap: a 10% rise in value raises the bill 2% the next January", () => {
    registerPropertyTax(() => ({
      rate: 0.02,
      assessmentCapShare: 0.02,
      payeeId: county,
      source: src,
    }));
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    const table = api.moduleState("housing").table("assessments");
    const home = { householdId: "household:owner", placeId: place };
    const first = billPropertyTax(api, table, [
      { ...home, valueMinor: 40_000_000 },
    ]);
    expect(first).toBe(Math.round((40_000_000 * 0.02) / 12));
    advanceCore(core, "2022-01-05");
    const second = billPropertyTax(api, table, [
      { ...home, valueMinor: 44_000_000 },
    ]);
    expect(second).toBe(Math.round((40_800_000 * 0.02) / 12));
    expect(core.organizations.get(county)!.liquidMinor).toBe(first + second);
  });
  it("tax an owner can't pay is kept as an arrears row; the next bill adds it, is paid it first, clears the row, and every dollar balances", () => {
    registerPropertyTax(() => ({
      rate: 0.02,
      payeeId: county,
      lawRowId: "law:property-tax:fixture",
      source: src,
    }));
    const base = input();
    const core = createLifeCore(
        {
          ...base,
          people: base.people.map((p) => ({ ...p, liquidMinor: 10_000 })),
        },
        { data: worldCoreData(), modules: [HOUSING_MODULE] },
      ),
      api = coreAPI(core);
    const all = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      );
    const outsideNet = () =>
      [...core.cashJournal.externalFlowsByOwner.values()].reduce(
        (n, row) => n + row.netMinor,
        0,
      );
    advanceCore(core, "2021-01-02");
    const start = all() + outsideNet();
    const assessments = api.moduleState("housing").table("assessments");
    const arrears = api.moduleState("housing").table("taxArrears");
    const homes = [
      {
        householdId: "household:owner",
        placeId: place,
        valueMinor: 40_000_000,
      },
    ];
    const bill = Math.round((40_000_000 * 0.02) / 12);
    const have = core.people.get("owner")!.liquidMinor;
    const paid = billPropertyTax(api, assessments, homes, arrears);
    expect(paid).toBe(have);
    expect(arrears.get("tax-arrears:household:owner")).toMatchObject({
      householdId: "household:owner",
      dwellingId: "dwelling:household:owner",
      amountMinor: bill - have,
      since: "2021-01-02",
      lawRowId: "law:property-tax:fixture",
    });
    expect(all() + outsideNet()).toBe(start);
    // Cash arrives; the next bill is this month's plus what's owed, and the row clears.
    advanceCore(core, "2021-02-02");
    transferCash(
      api,
      "topup:owner",
      "organization:outside",
      "owner",
      1_000_000,
      src,
    );
    const before = core.organizations.get(county)!.liquidMinor;
    const second = billPropertyTax(api, assessments, homes, arrears);
    expect(second).toBe(bill + (bill - have));
    expect(core.organizations.get(county)!.liquidMinor - before).toBe(second);
    expect(arrears.get("tax-arrears:household:owner")).toBeUndefined();
    expect(all() + outsideNet()).toBe(start + 1_000_000 - 1_000_000);
  });
});
