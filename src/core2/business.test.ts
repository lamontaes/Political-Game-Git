/** M1-08 first cut: owners and owner draws from profit, on a recorded fixture. */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore, chooseAct } from "./life";
import { BUSINESS_MODULE, estateHeir, ownerOf } from "./modules/business";
import { DEFAULT_DATA } from "./data";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import { transferCash } from "./world-transfer";
import { collapseToTwoLevels } from "./residents";
import { depositsHeld } from "./accounts";
import { countedFundOf, residentsRuntime } from "./modules/residents";
import type { BusinessBooksState } from "./finance-types";
import type { CoreInput, CoreState, Source } from "./types";

const start = "2021-01-01",
  shop = "organization:shop",
  place = "place:business-fixture";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Business fixture only.",
};
function input(): CoreInput {
  const people = [
    ["owner", 2_000, 3_000],
    ["clerk", 2_000, 1_500],
  ] as const;
  return {
    seed: "business-fixture",
    startedAt: start,
    people: people.map(([id, cash]) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1975-01-01",
      placeId: place,
      householdId: `household:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: cash,
      livingCostDailyMinor: 1_000,
      source: src,
      familyIds: [],
      knownIds: [],
      jobId: `job:${id}`,
    })),
    households: people.map(([id]) => ({
      id: `household:${id}`,
      placeId: place,
      memberIds: [id],
      source: src,
    })),
    jobs: people.map(([id, , hourly]) => ({
      id: `job:${id}`,
      personId: id,
      organizationId: shop,
      title: "Shop work",
      hourlyMinor: hourly,
      hoursDaily: 8,
      wageDailyMinor: hourly * 8,
      source: src,
    })),
    organizations: [
      {
        id: shop,
        placeId: place,
        name: "Shop",
        kind: "employer",
        liquidMinor: 5_000_000,
        source: src,
      },
      {
        id: "organization:customer",
        placeId: place,
        name: "Customer",
        kind: "employer",
        liquidMinor: 10_000_000,
        source: src,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function books(core: CoreState): BusinessBooksState {
  const book = {
    organizationId: shop,
    kindId: "retail",
    annualPayrollMinor: 12_000_000,
    annualDemandMinor: 40_000_000,
    capacityMinor: 40_000_000,
    annualOtherCostsMinor: 0,
    openingTownIncomeMinor: 0,
    price: 1,
    costContractIds: [],
    source: src,
    lastReviewedAt: start,
    reachedIncomeRatio: 1,
    anchorAnnualDemandMinor: 40_000_000,
    anchorAnnualOtherCostsMinor: 0,
    anchorPrice: 1,
    lastGeneralPriceFactor: 1,
    lastWagePriceFactor: 1,
    nextReviewedAt: "2099-01-01",
    receivedMinor: 0,
    salesReceivedMinor: 0,
    operatingPaidMinor: 0,
    wagesRequestedMinor: 0,
    wagesPaidMinor: 0,
    wagesUnpaidMinor: 0,
    closedAt: undefined,
  } as unknown as BusinessBooksState;
  core.finance.businesses.set(shop, book);
  return book;
}
const money = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (s, r) => s + r.liquidMinor,
    0,
  );

describe("owners draw from profit", () => {
  it("makes the highest-paid worker the owner and moves part of a month's profit to them through the ledger", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [BUSINESS_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core),
      book = books(core),
      total = money(core);
    advanceCore(core, "2021-01-15");
    expect(api.moduleState("business").table("owners").get(shop)).toMatchObject(
      { ownerId: "owner" },
    );
    // A month's net gain: 2,000,000 of sales more than costs.
    book.salesReceivedMinor = 2_000_000;
    transferCash(
      api,
      "fixture:sale",
      "organization:customer",
      shop,
      2_000_000,
      {
        ...src,
        asOf: "2021-01-15",
      },
    );
    advanceCore(core, "2021-02-02");
    const draw = api
      .moduleState("business")
      .table("draws")
      .get(`draw:${shop}:2021-02-01`)!;
    expect(draw).toMatchObject({ profitMinor: 2_000_000 });
    expect(draw.drawnMinor as number).toBeGreaterThan(0);
    expect(draw.drawnMinor as number).toBeLessThanOrEqual(2_000_000);
    expect(core.people.get("owner")!.liquidMinor).toBe(
      2_000 + (draw.drawnMinor as number),
    );
    expect(money(core)).toBe(total);
  });
});

async function foundingCore(
  owner: boolean,
  cook = false,
  big = false,
  unfunded = false,
) {
  const { CREDIT_MODULE } = await import("./modules/credit");
  const { MACRO_MODULE, withCentralBank } = await import("./modules/macro");
  const place2 = "place:founding-fixture",
    residentsId = "residents:founding-fixture";
  const s2: Source = { ...src, asOf: "2026-10-01" };
  const person = (
    id: string,
    traits: Record<string, number>,
    job?: string,
  ) => ({
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1985-01-01",
    placeId: place2,
    householdId: `household:${id}`,
    tier: "monthly" as const,
    traits,
    liquidMinor: 0,
    livingCostDailyMinor: 0,
    source: s2,
    familyIds: [],
    knownIds: [],
    ...(job ? { jobId: job } : {}),
  });
  const bold = {
    "personality-v1:facet-enterprising": 3,
    "people-mind-v1:risk": 3,
  };
  const people = [
    ...(unfunded
      ? [
          {
            ...person("a-unfunded", bold),
            liquidMinor: 2_000_000,
            livingCostDailyMinor: 100_000,
          },
        ]
      : []),
    // $20,000 of savings: not enough to open without a loan.
    { ...person("founder", bold), liquidMinor: 2_000_000 },
    ...(owner ? [person("owner", bold, "job:owner")] : []),
    ...(cook ? [person("cook", {}, "job:cook")] : []),
  ];
  const base = withCentralBank({
    seed: "founding-fixture",
    startedAt: "2026-10-01",
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId: place2,
      memberIds: [row.id],
      source: s2,
    })),
    jobs: owner
      ? [
          {
            id: "job:owner",
            personId: "owner",
            organizationId: "diner:a",
            title: "Owner",
            hourlyMinor: 2,
            hoursDaily: 1,
            wageDailyMinor: 1,
            source: s2,
          },
          ...(cook
            ? [
                {
                  id: "job:cook",
                  personId: "cook",
                  organizationId: "diner:a",
                  title: "Cook",
                  hourlyMinor: 1,
                  hoursDaily: 1,
                  wageDailyMinor: 1,
                  source: s2,
                },
              ]
            : []),
        ]
      : [],
    organizations: [
      ...["diner:a", "diner:b"].map((id) => ({
        id,
        placeId: place2,
        name: id,
        kind: "employer",
        liquidMinor: id === "diner:a" && owner ? 50_000_000 : 1_000_000,
        source: s2,
      })),
      {
        id: "organization:bank:fixture",
        placeId: place2,
        name: "Bank",
        kind: "bank",
        liquidMinor: 500_000_000,
        source: s2,
      },
      {
        id: residentsId,
        placeId: place2,
        name: "Residents",
        kind: "residents",
        liquidMinor: 100_000_000,
        source: s2,
      },
      {
        id: "outside:founding-fixture",
        placeId: place2,
        name: "Outside suppliers",
        kind: "employer",
        liquidMinor: 0,
        source: s2,
      },
    ],
    residents: {
      version: "core2-residents-v1",
      accounts: [{ placeId: place2, accountId: residentsId }],
      households: [],
      flows: [
        // What each diner doesn't buy locally it buys from outside suppliers.
        ...["diner:a", "diner:b"].map((id) => ({
          id: `outside-costs:${id}`,
          kind: "outside-costs" as const,
          financeKind: "outside.supplier.restaurant",
          payerId: id,
          payeeId: "outside:founding-fixture",
          residentsId: "outside:founding-fixture",
          placeId: place2,
          amountMinor: 0,
          firstAt: "2026-10-05",
          cadence: { kind: "days" as const, every: 7 },
          salesReceipt: false,
          marketAdjusted: false,
          source: s2,
        })),
        ...["diner:a", "diner:b"].map((id) => ({
          id: `purchase:${id}`,
          kind: "purchase" as const,
          financeKind: "household.food",
          payerId: residentsId,
          payeeId: id,
          residentsId,
          placeId: place2,
          amountMinor: 300_000,
          // The counted households' own parts, as a generated world records them.
          amountByContract: { [`household:counted-${id}`]: 300_000 },
          firstAt: "2026-10-12",
          cadence: { kind: "months" as const, every: 1, day: 12 },
          salesReceipt: true,
          marketAdjusted: false,
          source: s2,
        })),
      ],
      source: s2,
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  });
  const core = createLifeCore(base, {
    data: worldCoreData(),
    modules: [MACRO_MODULE, CREDIT_MODULE, BUSINESS_MODULE],
    scheduledWork: false,
  });
  for (const id of ["diner:a", "diner:b"]) {
    const book = {
      ...books(core),
      organizationId: id,
      kindId: "restaurant",
      annualDemandMinor: big ? 10_000_000_000 : 100_000_000,
      capacityMinor: big ? 4_000_000_000 : 40_000_000,
    };
    core.finance.businesses.set(id, book as BusinessBooksState);
  }
  core.finance.businesses.delete(shop);
  return core;
}

type Founding = {
  founderId: string;
  kindId: string;
  customersMonthlyMinor: number;
  loanMinor: number;
  equityMinor?: number;
  staff: number;
  scale: number;
  parentId?: string;
  parentFundsMinor: number;
};

describe("founding a business where a market has room", () => {
  it("an enterprising adult founds a restaurant; it wins an equal share of the households' purchases and a startup loan; money balances", async () => {
    const core = await foundingCore(false);
    const total = money(core);
    advanceCore(core, "2026-12-15");
    const foundings = api(core).moduleState("business").snapshot().tables
      .foundings as unknown as Founding[];
    expect(foundings[0]).toMatchObject({
      founderId: "founder",
      kindId: "restaurant",
    });
    expect(foundings[0]!.parentId).toBeUndefined();
    expect(foundings[0]!.customersMonthlyMinor).toBeGreaterThan(0);
    // The founder puts in their savings; the bank lends the rest, no more than the SBA's equity rule allows.
    const equity = foundings[0]!.equityMinor!;
    expect(equity).toBeGreaterThan(0);
    expect(foundings[0]!.loanMinor).toBeGreaterThan(0);
    expect(foundings[0]!.loanMinor).toBeLessThanOrEqual(equity * 9);
    // What the founder has left is their savings less their equity, plus what the business has paid them.
    const drawn = api(core)
      .moduleState("business")
      .table("draws")
      .rows()
      .filter((row) => row.ownerId === "founder")
      .reduce((n, row) => n + Number(row.drawnMinor), 0);
    const savings = depositsHeld(core, core.people.get("founder")!.householdId);
    expect(savings).toBeGreaterThan(0);
    expect(core.people.get("founder")!.liquidMinor + savings).toBe(
      2_000_000 - equity + drawn,
    );
    expect(
      api(core)
        .moduleState("credit")
        .table("applications")
        .rows()
        .find((row) => row.kind === "startup"),
    ).toMatchObject({ borrowerId: "founder", approved: true });
    expect(money(core)).toBe(total);
  });

  it("an unfunded applicant does not prevent a later founder from opening", async () => {
    const core = await foundingCore(false, false, false, true);
    const total = money(core);
    advanceCore(core, "2026-12-15");
    const foundings = api(core).moduleState("business").snapshot().tables
      .foundings as unknown as Founding[];
    expect(foundings.some((row) => row.founderId === "founder")).toBe(true);
    expect(foundings.some((row) => row.founderId === "a-unfunded")).toBe(false);
    expect(money(core)).toBe(total);
  });

  it("an unserved market elsewhere does not block a viable local founder", async () => {
    const core = await foundingCore(false);
    const remote = "diner:remote";
    core.organizations.set(remote, {
      ...core.organizations.get("diner:a")!,
      id: remote,
      placeId: "place:unpopulated",
    });
    core.finance.businesses.set(remote, {
      ...core.finance.businesses.get("diner:a")!,
      organizationId: remote,
      annualDemandMinor: 1_000_000_000,
      capacityMinor: 1_000,
    });
    const runtime = residentsRuntime(core)!;
    runtime.flows.set("purchase:remote", {
      ...runtime.flows.get("purchase:diner:a")!,
      id: "purchase:remote",
      payeeId: remote,
    });
    advanceCore(core, "2026-11-15");
    const foundings = api(core).moduleState("business").snapshot().tables
      .foundings as unknown as Founding[];
    expect(foundings.some((row) => row.founderId === "founder")).toBe(true);
  });

  it("a founder of modest means in a big market opens small, borrows what the bank underwrites, buys its supplies and pays its owner", async () => {
    const core = await foundingCore(false, false, true);
    const total = money(core);
    advanceCore(core, "2027-01-15");
    const t = api(core).moduleState("business").snapshot().tables;
    const founding = (
      t.foundings as unknown as (Founding & {
        organizationId: string;
      })[]
    )[0]!;
    expect(founding).toMatchObject({ founderId: "founder" });
    // An equal share of this market would cost far more to open than $20,000 and what it supports.
    expect(founding.scale).toBeLessThan(0.2);
    const equity = founding.equityMinor!;
    expect(founding.loanMinor).toBeLessThanOrEqual(equity * 9);
    const book = core.finance.businesses.get(founding.organizationId)!;
    expect(book.annualDemandMinor).toBeLessThan((2 * 10_000_000_000 * 0.2) / 3);
    // It pays the outside suppliers for what it sells.
    const supplies = residentsRuntime(core)!.flows.get(
      `outside-costs:${founding.organizationId}`,
    )!;
    expect(supplies.outsidePaidMinor ?? 0).toBeGreaterThan(0);
    // And its owner takes a share of the profit it keeps.
    const draws = (
      t.draws as unknown as {
        organizationId: string;
        drawnMinor: number;
      }[]
    ).filter((row) => row.organizationId === founding.organizationId);
    expect(draws.some((row) => row.drawnMinor > 0)).toBe(true);
    expect(money(core)).toBe(total);
  });

  it("the owner of a cash-rich restaurant opens a second location first, funded from its cash; money balances", async () => {
    const core = await foundingCore(true);
    const total = money(core);
    advanceCore(core, "2026-12-15");
    const t = api(core).moduleState("business").snapshot().tables;
    const foundings = t.foundings as unknown as Founding[];
    expect(foundings[0]).toMatchObject({
      founderId: "owner",
      kindId: "restaurant",
      parentId: "diner:a",
    });
    expect(foundings[0]!.parentFundsMinor).toBeGreaterThan(0);
    const owners = t.owners as unknown as {
      ownerId: string;
      parentId?: string;
    }[];
    expect(
      owners.filter((row) => row.ownerId === "owner").length,
    ).toBeGreaterThanOrEqual(2);
    expect(money(core)).toBe(total);
  });
});
describe("owners hand their business on", () => {
  it("when the owner dies, the business's other worker takes it on and the change is a public event", async () => {
    const core = await foundingCore(true, true);
    advanceCore(core, "2026-10-02");
    core.people.get("owner")!.alive = false;
    advanceCore(core, "2026-11-02");
    const t = api(core).moduleState("business").snapshot().tables;
    expect(t.successions).toEqual([
      expect.objectContaining({
        organizationId: "diner:a",
        fromId: "owner",
        toId: "cook",
        basis: "successor",
        cause: "died",
      }),
    ]);
    expect(ownerOf(api(core), "diner:a")).toBe("cook");
  });
});
describe("a closure names its owner", () => {
  it("records the closure with the owner who answers for it and emits business.closed naming them", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [BUSINESS_MODULE],
        scheduledWork: false,
      }),
      a = coreAPI(core);
    books(core);
    advanceCore(core, "2021-01-15");
    a.emit({
      id: `employer-closed:2021-01-15:${shop}`,
      date: "2021-01-15",
      kind: "organization.closed",
      placeId: place,
      personIds: ["clerk"],
      publicRecord: true,
      source: { ...src, asOf: "2021-01-15" },
    });
    expect(
      a.moduleState("business").table("closures").get(`closure:${shop}`),
    ).toMatchObject({
      ownerId: "owner",
      workersAffected: 1,
    });
    expect(core.eventIds.has(`event:business.closed:${shop}`)).toBe(true);
  });
});
const api = (core: CoreState) => coreAPI(core);

describe("closing by choice", () => {
  it("weighs the owner's exact age: born late in the year, a year younger before the birthday", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [BUSINESS_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core);
    books(core);
    advanceCore(core, "2021-01-15");
    // 62 on 2021-02-01 by the calendar (turns 63 on 2021-12-31), though 2021 minus 1958 is 63.
    core.people.get("owner")!.birthDate = "1958-12-31";
    const owners = api.moduleState("business").table("owners");
    const row = owners.get(shop)!;
    owners.put({ ...row, lossMonths: 8 });
    advanceCore(core, "2021-02-02");
    const choice = api
      .moduleState("business")
      .table("choices")
      .get(`choice:${shop}:2021-02-01`) as unknown as {
      values: Record<string, number>;
    };
    expect(choice.values.age).toBe(0);
  });

  it("an owner whose business has kept 15 months of losses closes it and takes what's left; money balances", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [BUSINESS_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core),
      total = money(core);
    const closed: { facts?: Readonly<Record<string, string>> }[] = [];
    api.subscribeEvents("test", ["business.closed"], (_api, event) => {
      closed.push(event);
    });
    books(core);
    advanceCore(core, "2021-01-15");
    const owners = api.moduleState("business").table("owners");
    const row = owners.get(shop)!;
    // Losses kept: 15 months of the shop's payroll.
    owners.put({ ...row, lossMonths: 8 });
    const before = core.people.get("owner")!.liquidMinor;
    advanceCore(core, "2021-02-02");
    const choice = api
      .moduleState("business")
      .table("choices")
      .get(`choice:${shop}:2021-02-01`);
    expect(choice).toMatchObject({
      reasonKey: "losses-kept",
      decidedAs: "full",
    });
    expect(core.finance.businesses.get(shop)!.closedAt).toBe("2021-02-01");
    expect(core.people.get("owner")!.liquidMinor).toBeGreaterThan(before);
    expect(
      api.moduleState("business").table("closures").get(`closure:${shop}`),
    ).toMatchObject({ cause: "losses-kept" });
    // The news record carries that same recorded reason as data.
    expect(closed).toHaveLength(1);
    expect(closed[0]!.facts).toEqual({
      [`organization:${shop}:closing-reason`]: "losses-kept",
    });
    expect(money(core)).toBe(total);
  });
});

describe("a dead owner's closing proceeds", () => {
  const stub = (alive: Record<string, boolean>, links: [string, string][]) => {
    const people = new Map(
      Object.entries(alive).map(([id, a]) => [
        id,
        { id, alive: a, householdId: `hh:${id}`, familyIds: [] as string[] },
      ]),
    );
    const households = new Map(
      [...people.keys()].map((id) => [`hh:${id}`, { memberIds: [id] }]),
    );
    const familyLinks = new Map(
      links.map(([a, b], i) => [
        `l${i}`,
        { id: `l${i}`, kind: "parent-child", personIds: [a, b] },
      ]),
    );
    const organizations = new Map([
      ["biz", { id: "biz", placeId: "p" }],
      ["out", { id: "out", placeId: "p", outsideFlow: {} }],
    ]);
    return {
      state: { people, households, familyLinks, organizations },
    } as never;
  };
  it("go to a living relative, not the dead owner; else to the outside account", () => {
    expect(
      estateHeir(
        stub({ owner: false, kid: true, parent: false }, [
          ["owner", "kid"],
          ["parent", "owner"],
        ]),
        "biz",
        "owner",
      ),
    ).toBe("kid");
    expect(
      estateHeir(
        stub({ owner: false, parent: false }, [["parent", "owner"]]),
        "biz",
        "owner",
      ),
    ).toBe("out");
  });
});

describe("counted owners use the same model", () => {
  it("pays a counted owner through their household group without filling it in, conserving cash", () => {
    const countedInput = collapseToTwoLevels(input(), { keep: new Set() });
    const core = createLifeCore(countedInput, {
      data: worldCoreData(),
      modules: [BUSINESS_MODULE],
      scheduledWork: false,
    });
    const api = coreAPI(core);
    const book = books(core);
    expect(core.people.has("owner")).toBe(false);
    advanceCore(core, "2021-01-15");
    // This fixture exercises a locally owned firm; the opening's national
    // outside-firm share otherwise assigns its only shop to the outside account.
    const owners = api.moduleState("business").table("owners");
    owners.put({
      ...owners.get(shop)!,
      ownerId: "owner",
      basis: "founder",
    });
    expect(ownerOf(api, shop)).toBe("owner");
    const conservedCash = () =>
      money(core) +
      [...core.cashJournal.externalFlowsByOwner.values()].reduce(
        (sum, row) => sum + row.netMinor,
        0,
      );
    const total = conservedCash();
    book.salesReceivedMinor = 2_000_000;
    transferCash(
      api,
      "fixture:counted-owner-sale",
      "organization:customer",
      shop,
      2_000_000,
      src,
    );
    advanceCore(core, "2021-02-02");
    expect(core.people.has("owner")).toBe(false);
    expect(residentsRuntime(core)!.store.countedMember("owner")).toBeDefined();
    const draw = api
      .moduleState("business")
      .table("draws")
      .get(`draw:${shop}:2021-02-01`) as unknown as {
      ownerId: string;
      drawnMinor: number;
    };
    expect(draw.ownerId).toBe("owner");
    expect(draw.drawnMinor).toBeGreaterThan(0);
    expect(
      core.cashJournal.totalsByAccount.get(
        countedFundOf(core, "household:owner")!,
      )!.grossCreditMinor,
    ).toBeGreaterThanOrEqual(draw.drawnMinor);
    expect(conservedCash()).toBe(total);
  });
});

describe("businesses without a successor", () => {
  it("winds down a solvent business when its last owner dies instead of retaining an ownerless firm", () => {
    const original = input();
    const soleOwner = {
      ...original,
      people: original.people.filter((row) => row.id === "owner"),
      households: original.households.filter(
        (row) => row.id === "household:owner",
      ),
      jobs: original.jobs.filter((row) => row.personId === "owner"),
    };
    const core = createLifeCore(soleOwner, {
      data: worldCoreData(),
      modules: [BUSINESS_MODULE],
      scheduledWork: false,
    });
    books(core);
    advanceCore(core, "2021-01-15");
    const total = money(core);
    core.people.get("owner")!.alive = false;
    advanceCore(core, "2021-02-02");
    const api = coreAPI(core);
    expect(
      api
        .moduleState("business")
        .table("successions")
        .get(`succession:${shop}:2021-02-01`),
    ).toMatchObject({ fromId: "owner", basis: "no-successor", cause: "died" });
    expect(core.finance.businesses.get(shop)!.closedAt).toBe("2021-02-01");
    expect(ownerOf(api, shop)).toBeUndefined();
    expect(money(core)).toBe(total);
  });
});

describe("shared chooser for counted owners", () => {
  it("scores the same recorded traits in both tiers without admitting a person or moving money", () => {
    const original = input();
    const traits = Object.fromEntries(
      Object.keys(DEFAULT_DATA.traitPulls).map((id) => [id, 3]),
    );
    const prepared = {
      ...original,
      people: original.people.map((person) => ({ ...person, traits })),
    };
    const full = createLifeCore(prepared, {
      data: worldCoreData(),
      modules: [BUSINESS_MODULE],
      scheduledWork: false,
    });
    const counted = createLifeCore(
      collapseToTwoLevels(prepared, { keep: new Set() }),
      {
        data: worldCoreData(),
        modules: [BUSINESS_MODULE],
        scheduledWork: false,
      },
    );
    const action = DEFAULT_DATA.actions.find(
      (row) => row.effect === "recover",
    )!;
    const offers = ["take-risk", "play-safe"].map((kind) => ({
      definition: {
        ...action,
        id: kind,
        actKinds: [kind],
        goalKinds: [],
        emotion: {
          moodMultiplierParameter: "zero",
          stressMultiplierParameter: "zero",
        },
      },
      targetId: shop,
      availableHours: 1,
      effortHours: 0,
    }));
    const before = {
      people: counted.people.size,
      version: residentsRuntime(counted)!.store.version,
      journal: counted.cashJournal.nextSequence,
    };
    const expected = chooseAct(full, "owner", offers, undefined, true);
    const actual = chooseAct(counted, "owner", offers, undefined, true);
    expect(actual.selected).toBe(expected.selected);
    expect(actual.scores).toEqual(expected.scores);
    expect(actual.scores!.some((row) => row.reasons.trait !== 0)).toBe(true);
    expect({
      people: counted.people.size,
      version: residentsRuntime(counted)!.store.version,
      journal: counted.cashJournal.nextSequence,
    }).toEqual(before);
    expect(() => chooseAct(counted, "missing-owner", offers)).toThrow(
      "Decision actor is absent",
    );
  });
});
