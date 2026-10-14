/** Property tax bills on owners: a twelfth of assessed value times the rate each month into a mortgage's escrow, which pays each installment when it falls due, as an owner without one does, with an assessment cap where the law sets one. */
import { afterEach, describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import {
  billPropertyTax,
  registerPropertyTax,
  stateEffectiveRate,
} from "./housing-property-tax";
import { randomUUID } from "node:crypto";
import { drawPlace } from "../../tests/golden-path/place";
import { HOUSING_MODULE } from "./modules/housing";
import { lawInForce, openLaws } from "./modules/laws";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { generatedOpening } from "./tooling/generated-world";
import { coreAPI } from "./state";
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
        id: "organization:servicer",
        placeId: place,
        name: "Mortgage servicer",
        kind: "bank",
        liquidMinor: 100_000_000,
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
  it("without a county rate in force, the owner pays the state's average effective rate outside the town, a quarter on New Jersey's February due date", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-02-02");
    const table = api.moduleState("housing").table("assessments");
    const homes = [
      {
        householdId: "household:owner",
        placeId: place,
        valueMinor: 40_000_000,
      },
    ];
    const paid = billPropertyTax(api, table, homes);
    expect(paid).toBe(Math.round((40_000_000 * stateEffectiveRate("NJ")) / 4));
  });
  it("an owner with a mortgage pays a twelfth each month into the servicer's escrow, which pays the county on New Jersey's February due date and keeps a cushion", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    api.moduleState("housing").table("mortgages").put({
      id: "mortgage:household:owner",
      householdId: "household:owner",
      holderId: "organization:servicer",
      balanceMinor: 20_000_000,
      monthsLeft: 300,
    });
    const table = api.moduleState("housing").table("assessments");
    const home = {
      householdId: "household:owner",
      placeId: place,
      valueMinor: 40_000_000,
    };
    const annual = 40_000_000 * stateEffectiveRate("NJ");
    const deposit = Math.round(annual / 12);
    // January: the deposit goes into escrow, and nothing is due.
    expect(billPropertyTax(api, table, [home])).toBe(0);
    expect(core.people.get("owner")!.liquidMinor).toBe(10_000_000 - deposit);
    // February: the escrow holds December's, January's and February's deposits and pays the quarter.
    advanceCore(core, "2021-02-02");
    const paid = billPropertyTax(api, table, [home]);
    expect(paid).toBe(Math.round(annual / 4));
    expect(core.people.get("owner")!.liquidMinor).toBe(
      10_000_000 - 2 * deposit,
    );
    // The escrow paid the quarter and keeps RESPA's cushion, a sixth of the year's tax.
    expect(
      Math.abs(
        api.accounts().balance("escrow:organization:servicer") - annual / 6,
      ),
    ).toBeLessThanOrEqual(2);
    // The servicer set aside at most December's deposit and the cushion, to within rounding.
    expect(
      100_000_000 -
        core.organizations.get("organization:servicer")!.liquidMinor,
    ).toBeLessThanOrEqual(deposit + annual / 6 + 2);
  });
  it("when the mortgage is paid off, the escrow's balance goes back to the owner, who then pays the installment directly", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    const mortgages = api.moduleState("housing").table("mortgages");
    mortgages.put({
      id: "mortgage:household:owner",
      householdId: "household:owner",
      holderId: "organization:servicer",
      balanceMinor: 20_000_000,
      monthsLeft: 300,
    });
    const table = api.moduleState("housing").table("assessments");
    const home = {
      householdId: "household:owner",
      placeId: place,
      valueMinor: 40_000_000,
    };
    const annual = 40_000_000 * stateEffectiveRate("NJ");
    billPropertyTax(api, table, [home]);
    const held = api.accounts().balance("escrow:organization:servicer");
    expect(held).toBeGreaterThan(0);
    // Paid off before February's installment.
    mortgages.put({
      id: "mortgage:household:owner",
      householdId: "household:owner",
      holderId: "organization:servicer",
      balanceMinor: 0,
      monthsLeft: 0,
    });
    advanceCore(core, "2021-02-02");
    const before = core.people.get("owner")!.liquidMinor;
    billPropertyTax(api, table, [home]);
    expect(api.accounts().balance("escrow:organization:servicer")).toBe(0);
    expect(core.people.get("owner")!.liquidMinor).toBe(
      before + held - Math.round(annual / 4),
    );
  });
  it("an owner without a mortgage owes nothing in a month with no installment due", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    const paid = billPropertyTax(
      api,
      api.moduleState("housing").table("assessments"),
      [
        {
          householdId: "household:owner",
          placeId: place,
          valueMinor: 40_000_000,
        },
      ],
    );
    expect(paid).toBe(0);
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
    advanceCore(core, "2021-02-02");
    const table = api.moduleState("housing").table("assessments");
    const home = { householdId: "household:owner", placeId: place };
    const first = billPropertyTax(api, table, [
      { ...home, valueMinor: 40_000_000 },
    ]);
    expect(first).toBe(Math.round((40_000_000 * 0.02) / 4));
    advanceCore(core, "2022-02-05");
    const second = billPropertyTax(api, table, [
      { ...home, valueMinor: 44_000_000 },
    ]);
    expect(second).toBe(Math.round((40_800_000 * 0.02) / 4));
    expect(core.organizations.get(county)!.liquidMinor).toBe(first + second);
  });
  it("with the laws open, an owner in a generated world pays the county's recorded rate", () => {
    const drawn = drawPlace(randomUUID(), "property-tax");
    console.log(
      `property tax: ${drawn.name}, ${drawn.state}, seed ${drawn.seed}`,
    );
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    openLaws(core);
    const api = coreAPI(core);
    const answer = lawInForce(api, "property-tax");
    const percent = (answer.governing ?? answer.pending[0])?.value;
    const rate =
      typeof percent === "number"
        ? percent / 100
        : stateEffectiveRate(opening.placeMetadata?.housingState ?? "");
    const table = api.moduleState("housing").table("assessments");
    const householdId = opening.households[0]!.id;
    // Paid through a mortgage's escrow, so the household pays this month's twelfth whatever the place's due dates.
    const servicer =
      opening.organizations.find((o) => o.kind === "bank") ??
      opening.organizations[0]!;
    api
      .moduleState("housing")
      .table("mortgages")
      .put({
        id: `mortgage:${householdId}`,
        householdId,
        holderId: servicer.id,
        balanceMinor: 10_000_000,
        monthsLeft: 300,
      });
    const cash = () =>
      [...core.households.get(householdId)!.memberIds].reduce(
        (n, id) => n + (core.people.get(id)?.liquidMinor ?? 0),
        0,
      );
    const before = cash();
    billPropertyTax(api, table, [
      {
        householdId,
        placeId: opening.households[0]!.placeId,
        valueMinor: 30_000_000,
      },
    ]);
    // No property tax where the territory levies none (American Samoa, the Northern Marianas).
    const levied = !["AS", "MP"].includes(
      opening.placeMetadata?.housingState ?? "",
    );
    // The deposit is the yearly escrow analysis's: a twelfth of the year's tax, with any shortage below the cushion spread over twelve months.
    const twelfth = Math.round((30_000_000 * rate) / 12);
    const deposit = (
      table.get(`assessment:${householdId}`) as
        { depositMinor?: number } | undefined
    )?.depositMinor;
    if (!levied) expect(before - cash()).toBe(0);
    else {
      expect(before - cash()).toBe(deposit);
      expect(deposit!).toBeGreaterThanOrEqual(twelfth - Math.ceil(twelfth / 6));
      expect(deposit!).toBeLessThanOrEqual(twelfth * 4);
    }
  }, 300_000);
});
