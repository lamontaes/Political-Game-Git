/** Unexecuted small API-v7 ledger fixtures; no ordinary-world solvency or empirical claim. */
import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { chooseAct } from "./choice";
import { preflightOpeningSalesBudgets } from "./finance-state";
import { FINANCE_MODULE } from "./modules/finance";
import { runScheduledWork } from "./modules/work";
import { LIFE_MODULE } from "./modules/life";
import { parameter as p } from "./parameters";
import { coreAPI, createCore } from "./state";
import type { BusinessBooksInput, FinanceContractInput } from "./finance-types";
import type { CoreInput, CoreState, PersonInput, Source } from "./types";

const opening = "2021-01-31",
  february = "2021-02-28",
  march = "2021-03-31";
const placeId = "fixture:place",
  buyer = "fixture:buyer",
  middle = "fixture:middle";
const supplier = "fixture:supplier",
  otherSupplier = "fixture:other-supplier";
const customer = "fixture:customer",
  worker = "fixture:worker";
const routeA = "fixture:route-a",
  routeB = "fixture:route-b",
  saleId = "fixture:household-sale";
const source: Source = {
  tag: "ESTIMATED",
  asOf: opening,
  citation:
    "Explicit technical contract and cash fixture; no observed firm or calibrated purchase behavior is asserted.",
  estimatedFrom:
    "Controlled dated balances, reference ratios and recorded terms test ledger invariants only.",
};

function purchase(
  id: string,
  payerId: string,
  payeeId: string,
  amountMinor: number,
): FinanceContractInput {
  return {
    id,
    payerIds: [payerId],
    payeeId,
    amountMinor,
    dueAt: opening,
    periodMonths: p("one"),
    kind: "fixture:input-budget",
    accruesArrears: false,
    salesReceiptBudget: true,
    salesReceipt: true,
    source,
  };
}
function book(organizationId: string, ids: string[]): BusinessBooksInput {
  return {
    organizationId,
    kindId: "retail",
    annualPayrollMinor: 6000,
    annualDemandMinor: 12000,
    annualOtherCostsMinor: 4800,
    openingTownIncomeMinor: 6000,
    capacityMinor: 12000,
    price: p("one"),
    costContractIds: ids,
    source,
  };
}
function input(
  options: {
    cascading?: boolean;
    customerCash?: number;
    saleMinor?: number;
    buyerCash?: number;
    fixed?: boolean;
    ownedWork?: boolean;
  } = {},
): CoreInput {
  const people: PersonInput[] = [customer, worker].map((id) => ({
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId,
    householdId: `household:${id}`,
    tier: "weekly",
    traits: {},
    liquidMinor: id === customer ? (options.customerCash ?? 10000) : p("zero"),
    livingCostDailyMinor: p("minorPerDollar"),
    familyIds: [],
    knownIds: [],
    source,
    ...(id === worker && options.ownedWork ? { jobId: "fixture:job" } : {}),
  }));
  const sale: FinanceContractInput = {
    id: saleId,
    householdId: `household:${customer}`,
    payerIds: [customer],
    payeeId: buyer,
    kind: "fixture:household-budget",
    amountMinor: options.saleMinor ?? 1000,
    dueAt: opening,
    periodMonths: p("one"),
    accruesArrears: false,
    salesReceipt: true,
    source,
  };
  const costs = options.fixed
    ? [
        {
          ...purchase(routeA, buyer, supplier, 100),
          salesReceiptBudget: false,
          accruesArrears: true,
        },
      ]
    : options.cascading
      ? [
          purchase(routeA, buyer, middle, 400),
          purchase(routeB, middle, supplier, 400),
        ]
      : [
          purchase(routeA, buyer, supplier, 200),
          purchase(routeB, buyer, otherSupplier, 200),
        ];
  return {
    seed: "fixture:finite-sales-budget",
    startedAt: opening,
    people,
    households: people.map((person) => ({
      id: person.householdId,
      placeId,
      memberIds: [person.id],
      source,
    })),
    organizations: [buyer, middle, supplier, otherSupplier].map((id) => ({
      id,
      name: id,
      placeId,
      kind: "employer",
      classification: "enterprise:retail",
      liquidMinor: id === buyer ? (options.buyerCash ?? p("zero")) : p("zero"),
      source,
    })),
    jobs: options.ownedWork
      ? [
          {
            id: "fixture:job",
            personId: worker,
            organizationId: buyer,
            title: "Recorded fixture job",
            hoursDaily: p("one") / p("daysPerWeek"),
            wageDailyMinor: p("minorPerDollar") / p("daysPerWeek"),
            hourlyMinor: p("minorPerDollar"),
            source,
          },
        ]
      : [],
    workCommitments: options.ownedWork
      ? [
          {
            id: "fixture:commitment",
            jobId: "fixture:job",
            personId: worker,
            organizationId: buyer,
            startsAt: opening,
            anchorDate: opening,
            periodDays: p("daysPerWeek"),
            hourlyMinor: p("minorPerDollar"),
            expectedWeeklyMinutes: p("minutesPerHour"),
            slots: [
              {
                offsetDays: p("zero"),
                startMinute: p("zero"),
                minutes: p("minutesPerHour"),
              },
            ],
            scheduleSource: source,
            paySource: source,
          },
        ]
      : [],
    finance: {
      contracts: [sale, ...costs],
      facilities: [],
      businesses: [
        book(
          buyer,
          options.cascading || options.fixed ? [routeA] : [routeA, routeB],
        ),
        ...(options.cascading ? [book(middle, [routeB])] : []),
      ],
      gaps: [],
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function core(options: Parameters<typeof input>[0] = {}): CoreState {
  return createCore(input(options), { modules: [LIFE_MODULE] });
}
function cash(world: CoreState): number {
  return [...world.people.values(), ...world.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    p("zero"),
  );
}
function financeDay(world: CoreState): void {
  FINANCE_MODULE.onDay!(
    coreAPI(world),
    (id, offers, context) => chooseAct(world, id, offers, context),
    () => undefined,
  );
}
function snapshot(world: CoreState): string {
  return JSON.stringify(world, (key, value: unknown) => {
    if (["data", "modules", "stopgapHits", "gaps"].includes(key))
      return undefined;
    if (value instanceof Map) return [...value];
    if (value instanceof Set) return [...value];
    return value;
  });
}

describe("receipt-linked procurement through the conserving API", () => {
  it("funds two supplier budgets from actual household receipts and keeps cash conserved", () => {
    const world = core(),
      before = cash(world);
    financeDay(world);
    const pool = world.finance.salesBudgetPoolsByPayer.get(buyer)!;
    expect(pool.receiptsMinor).toBe(1000);
    expect(pool.allocatedMinor).toBe(400);
    expect(world.organizations.get(buyer)!.liquidMinor).toBe(600);
    expect(world.organizations.get(supplier)!.liquidMinor).toBe(200);
    expect(world.organizations.get(otherSupplier)!.liquidMinor).toBe(200);
    expect(
      world.finance.latestReceiptsByContract.get(routeA)!.salesBudget!
        .receivedThroughMinor,
    ).toBe(1000);
    expect(cash(world)).toBe(before);
  });

  it("freezes all buyer pools before B2B cash and counts those receipts only in the next period", () => {
    const world = core({ cascading: true }),
      before = cash(world);
    financeDay(world);
    expect(
      world.finance.latestReceiptsByContract.get(routeB)!.requestedMinor,
    ).toBe(p("zero"));
    expect(world.organizations.get(middle)!.liquidMinor).toBe(400);
    advanceDate(world, february);
    financeDay(world);
    const receipt = world.finance.latestReceiptsByContract.get(routeB)!;
    expect(receipt.salesBudget!.receiptsMinor).toBe(400);
    expect(receipt.requestedMinor).toBe(160);
    expect(world.finance.businesses.get(middle)!.receivedMinor).toBe(800);
    expect(world.organizations.get(supplier)!.liquidMinor).toBe(160);
    expect(cash(world)).toBe(before);
  });

  it("keeps actual non-sale funding out of the sales pool without losing its cash receipt", () => {
    const openingInput = input(),
      fundingId = "fixture:recorded-funding";
    openingInput.finance = {
      ...openingInput.finance!,
      contracts: [
        ...openingInput.finance!.contracts,
        {
          id: fundingId,
          payerIds: [customer],
          payeeId: buyer,
          kind: "fixture:capital-funding",
          amountMinor: 1000,
          dueAt: opening,
          periodMonths: p("one"),
          accruesArrears: false,
          salesReceipt: false,
          source,
        },
      ],
    };
    const world = createCore(openingInput, { modules: [LIFE_MODULE] }),
      api = coreAPI(world),
      before = cash(world);
    api.settleFinanceContract(fundingId);
    api.settleFinanceContract(saleId);
    expect(world.finance.businesses.get(buyer)!.receivedMinor).toBe(2000);
    expect(world.finance.businesses.get(buyer)!.salesReceivedMinor).toBe(1000);
    api.prepareFinanceProcurement([routeA, routeB]);
    api.settleFinanceContract(routeA);
    api.settleFinanceContract(routeB);
    expect(
      world.finance.salesBudgetPoolsByPayer.get(buyer)!.allocatedMinor,
    ).toBe(400);
    expect(world.organizations.get(buyer)!.liquidMinor).toBe(1600);
    expect(cash(world)).toBe(before);
  });

  it("keeps month-end cutoffs, next due dates and duplicate settlement exact", () => {
    const world = core(),
      api = coreAPI(world),
      before = cash(world);
    financeDay(world);
    expect(world.finance.contracts.get(routeA)!.dueAt).toBe(february);
    const committed = snapshot(world);
    expect(() => api.settleFinanceContract(routeA)).toThrow(
      /not due|already settled/,
    );
    expect(snapshot(world)).toBe(committed);
    advanceDate(world, february);
    financeDay(world);
    expect(
      world.finance.latestReceiptsByContract.get(routeA)!.salesBudget!
        .previousReceivedMinor,
    ).toBe(1000);
    expect(
      world.finance.latestReceiptsByContract.get(routeA)!.salesBudget!
        .receiptsMinor,
    ).toBe(1000);
    expect(world.finance.contracts.get(routeA)!.dueAt).toBe(march);
    expect(cash(world)).toBe(before);
  });

  it("accrues a quarterly route across monthly freezes and consumes each novel sale once", () => {
    const openingInput = input();
    openingInput.finance = {
      ...openingInput.finance!,
      contracts: openingInput.finance!.contracts.map((row) =>
        row.id === routeB
          ? { ...row, amountMinor: 600, periodMonths: 3, dueAt: march }
          : row,
      ),
    };
    const world = createCore(openingInput, { modules: [LIFE_MODULE] }),
      before = cash(world);
    let allocated = p("zero");
    for (const date of [opening, february, march, "2021-04-30"]) {
      advanceDate(world, date);
      financeDay(world);
      allocated +=
        world.finance.salesBudgetPoolsByPayer.get(buyer)!.allocatedMinor;
      if (date === opening) {
        expect(world.finance.latestReceiptsByContract.has(routeB)).toBe(false);
        expect(
          world.finance.salesPendingBudgetByContract.get(routeB)!.amountMinor,
        ).toBe(200);
      }
      if (date === february)
        expect(
          world.finance.salesPendingBudgetByContract.get(routeB)!.amountMinor,
        ).toBe(400);
      if (date === march) {
        const receipt = world.finance.latestReceiptsByContract.get(routeB)!;
        expect(receipt.requestedMinor).toBe(600);
        expect(receipt.salesBudget!.pendingBeforeMinor).toBe(400);
        expect(receipt.salesBudget!.allocatedForContractMinor).toBe(200);
        expect(receipt.salesBudget!.consumedBudgetMinor).toBe(600);
        expect(receipt.salesBudget!.budgetFirstAllocatedAt).toBe(opening);
        expect(receipt.salesBudget!.budgetPreviousReceivedMinor).toBe(
          p("zero"),
        );
        expect(receipt.salesBudget!.budgetReceivedThroughMinor).toBe(3000);
        expect(world.finance.salesPendingBudgetByContract.has(routeB)).toBe(
          false,
        );
        expect(world.finance.contracts.get(routeB)!.dueAt).toBe("2021-06-30");
      }
    }
    expect(allocated).toBe(1600);
    const pending =
      world.finance.salesPendingBudgetByContract.get(routeB)!.amountMinor;
    expect(pending).toBe(200);
    expect(
      world.organizations.get(supplier)!.liquidMinor +
        world.organizations.get(otherSupplier)!.liquidMinor +
        pending,
    ).toBe(allocated);
    expect(
      world.finance.salesReceivedThroughByPayer.get(buyer)!.receivedMinor,
    ).toBe(4000);
    expect(world.finance.contracts.get(routeB)!.arrearsMinor).toBe(p("zero"));
    expect(cash(world)).toBe(before);
  });

  it("handles differently dated monthly routes without reusing a prior sales cutoff", () => {
    const openingInput = input();
    openingInput.finance = {
      ...openingInput.finance!,
      contracts: openingInput.finance!.contracts.map((row) =>
        row.id === routeB ? { ...row, dueAt: "2021-02-15" } : row,
      ),
    };
    const world = createCore(openingInput, { modules: [LIFE_MODULE] }),
      api = coreAPI(world),
      before = cash(world);
    let allocated = p("zero");
    for (const date of [opening, "2021-02-15", february, "2021-03-15", march]) {
      advanceDate(world, date);
      financeDay(world);
      const pool = world.finance.salesBudgetPoolsByPayer.get(buyer)!;
      allocated += pool.allocatedMinor;
      if (date.endsWith("-15")) {
        expect(pool.receiptsMinor).toBe(p("zero"));
        expect(
          world.finance.latestReceiptsByContract.get(routeB)!.requestedMinor,
        ).toBe(200);
        expect(
          world.finance.latestReceiptsByContract.get(routeB)!.salesBudget!
            .pendingBeforeMinor,
        ).toBe(200);
        expect(world.finance.salesPendingBudgetByContract.has(routeB)).toBe(
          false,
        );
      }
    }
    expect(allocated).toBe(1200);
    expect(world.organizations.get(supplier)!.liquidMinor).toBe(600);
    expect(world.organizations.get(otherSupplier)!.liquidMinor).toBe(400);
    expect(
      world.finance.salesPendingBudgetByContract.get(routeB)!.amountMinor,
    ).toBe(200);
    const committed = snapshot(world);
    expect(() => api.prepareFinanceProcurement([routeA])).toThrow(
      /not-due|non-due|settled/,
    );
    expect(snapshot(world)).toBe(committed);
    expect(
      world.finance.salesReceivedThroughByPayer.get(buyer)!.receivedMinor,
    ).toBe(3000);
    expect(cash(world)).toBe(before);
  });

  it("keeps accrued route amounts independent of supplier and settlement ordering", () => {
    const make = (reverse: boolean) => {
      const openingInput = input();
      const rows = openingInput.finance!.contracts.map((row) =>
        row.id === routeB
          ? { ...row, amountMinor: 600, periodMonths: 3, dueAt: march }
          : row,
      );
      openingInput.finance = {
        ...openingInput.finance!,
        contracts: reverse ? [...rows].reverse() : rows,
      };
      const world = createCore(openingInput, { modules: [LIFE_MODULE] }),
        api = coreAPI(world);
      financeDay(world);
      advanceDate(world, february);
      financeDay(world);
      advanceDate(world, march);
      api.settleFinanceContract(saleId);
      api.prepareFinanceProcurement(
        reverse ? [routeB, routeA] : [routeA, routeB],
      );
      for (const id of reverse ? [routeB, routeA] : [routeA, routeB])
        api.settleFinanceContract(id);
      return world;
    };
    const first = make(false),
      second = make(true);
    for (const id of [routeA, routeB]) {
      expect(
        first.finance.latestReceiptsByContract.get(id)!.requestedMinor,
      ).toBe(second.finance.latestReceiptsByContract.get(id)!.requestedMinor);
      expect(
        first.finance.latestReceiptsByContract.get(id)!.salesBudget,
      ).toEqual(second.finance.latestReceiptsByContract.get(id)!.salesBudget);
    }
    for (const id of [buyer, supplier, otherSupplier])
      expect(first.organizations.get(id)!.liquidMinor).toBe(
        second.organizations.get(id)!.liquidMinor,
      );
    expect(first.finance.salesPendingBudgetByContract.size).toBe(p("zero"));
    expect(second.finance.salesPendingBudgetByContract.size).toBe(p("zero"));
  });

  it("keeps unfilled actual-sales procurement a budget while a real fixed bill consumes cash", () => {
    const openingInput = input();
    const fixedId = "fixture:fixed-due-bill";
    openingInput.finance = {
      ...openingInput.finance!,
      contracts: [
        ...openingInput.finance!.contracts,
        {
          ...purchase(fixedId, buyer, otherSupplier, 950),
          salesReceiptBudget: false,
          accruesArrears: true,
        },
      ],
      businesses: [book(buyer, [routeA, routeB, fixedId])],
    };
    const world = createCore(openingInput, { modules: [LIFE_MODULE] }),
      api = coreAPI(world),
      before = cash(world);
    api.settleFinanceContract(saleId);
    api.settleFinanceContract(fixedId);
    api.prepareFinanceProcurement([routeA, routeB]);
    const first = api.settleFinanceContract(routeA),
      second = api.settleFinanceContract(routeB);
    expect(first.requestedMinor + second.requestedMinor).toBe(400);
    expect(first.paidMinor + second.paidMinor).toBe(50);
    expect(first.unfundedMinor + second.unfundedMinor).toBe(350);
    expect(world.finance.contracts.get(routeA)!.arrearsMinor).toBe(p("zero"));
    expect(world.finance.contracts.get(routeB)!.arrearsMinor).toBe(p("zero"));
    expect(world.finance.salesPendingBudgetByContract.size).toBe(p("zero"));
    advanceDate(world, february);
    api.prepareFinanceProcurement([routeA, routeB]);
    expect(api.settleFinanceContract(routeA).requestedMinor).toBe(p("zero"));
    expect(api.settleFinanceContract(routeB).requestedMinor).toBe(p("zero"));
    api.finishFinanceDay();
    expect(world.finance.closures.size).toBe(p("zero"));
    expect(cash(world)).toBe(before);
  });

  it("leaves recorded fixed amounts and legal arrears unchanged when forecasts change", () => {
    const world = core({ fixed: true, saleMinor: p("zero"), buyerCash: 150 }),
      api = coreAPI(world);
    world.finance.businesses.get(buyer)!.annualOtherCostsMinor *= 1000;
    const before = cash(world);
    api.settleFinanceContract(routeA);
    expect(
      world.finance.latestReceiptsByContract.get(routeA)!.requestedMinor,
    ).toBe(100);
    advanceDate(world, february);
    api.settleFinanceContract(routeA);
    expect(world.finance.contracts.get(routeA)!.arrearsMinor).toBe(50);
    advanceDate(world, march);
    api.settleFinanceContract(routeA);
    expect(
      world.finance.latestReceiptsByContract.get(routeA)!.requestedMinor,
    ).toBe(150);
    expect(world.finance.contracts.get(routeA)!.arrearsMinor).toBe(150);
    expect(cash(world)).toBe(before);
  });

  it("rejects malformed budget admission without partial cash, index or counter writes", () => {
    const world = core(),
      api = coreAPI(world);
    for (const bad of [
      {
        ...purchase("fixture:bad-arrears", buyer, supplier, 100),
        accruesArrears: true,
      },
      purchase("fixture:self", buyer, buyer, 100),
      purchase("fixture:missing-book", supplier, buyer, 100),
      purchase("fixture:missing-supplier", buyer, "fixture:absent", 100),
      {
        ...purchase("fixture:not-a-sale", buyer, supplier, 100),
        salesReceipt: false,
      },
    ]) {
      const before = snapshot(world);
      expect(() => api.addFinanceContract(bad)).toThrow();
      expect(snapshot(world)).toBe(before);
    }
    const badOpening = input();
    badOpening.finance = {
      ...badOpening.finance!,
      contracts: badOpening.finance!.contracts.map((row) =>
        row.salesReceiptBudget ? { ...row, amountMinor: 600 } : row,
      ),
    };
    const before = snapshot(world);
    expect(() =>
      preflightOpeningSalesBudgets(world, api, badOpening.finance),
    ).toThrow(/Aggregate/);
    expect(snapshot(world)).toBe(before);
    const deferredOverAllocation = {
      ...badOpening.finance!,
      contracts: badOpening.finance!.contracts.map((row) =>
        row.id === routeB ? { ...row, dueAt: february } : row,
      ),
    };
    expect(() =>
      preflightOpeningSalesBudgets(world, api, deferredOverAllocation),
    ).toThrow(/Aggregate/);
    expect(snapshot(world)).toBe(before);
    world.finance.salesReceivedThroughByPayer.set(buyer, {
      date: "2021-01-01",
      receivedMinor: 1,
    });
    const badCutoff = snapshot(world);
    expect(() =>
      preflightOpeningSalesBudgets(world, api, input().finance),
    ).toThrow(/cutoff/);
    expect(snapshot(world)).toBe(badCutoff);
  });

  it("rejects an omitted due route before consuming any cutoff", () => {
    const world = core(),
      api = coreAPI(world);
    api.settleFinanceContract(saleId);
    const before = snapshot(world);
    expect(() => api.prepareFinanceProcurement([routeA])).toThrow(/omitted/);
    expect(snapshot(world)).toBe(before);
    expect(world.finance.salesBudgetPoolsByPayer.size).toBe(p("zero"));
  });

  it("validates every buyer before committing the first pool when another cutoff is invalid", () => {
    const world = core({ cascading: true }),
      api = coreAPI(world);
    api.settleFinanceContract(saleId);
    world.finance.salesReceivedThroughByPayer.set(middle, {
      date: "2021-01-01",
      receivedMinor: 1,
    });
    const before = snapshot(world);
    expect(() => api.prepareFinanceProcurement([routeA, routeB])).toThrow(
      /cutoff/,
    );
    expect(snapshot(world)).toBe(before);
    expect(world.finance.salesBudgetPoolsByPayer.size).toBe(p("zero"));
  });

  it("rejects inconsistent pending provenance before advancing any buyer allocation", () => {
    const openingInput = input();
    openingInput.finance = {
      ...openingInput.finance!,
      contracts: openingInput.finance!.contracts.map((row) =>
        row.id === routeB
          ? { ...row, amountMinor: 600, periodMonths: 3, dueAt: march }
          : row,
      ),
    };
    const world = createCore(openingInput, { modules: [LIFE_MODULE] }),
      api = coreAPI(world);
    financeDay(world);
    const pending = world.finance.salesPendingBudgetByContract.get(routeB)!;
    world.finance.salesPendingBudgetByContract.set(routeB, {
      ...pending,
      receivedThroughMinor: 1001,
    });
    advanceDate(world, february);
    api.settleFinanceContract(saleId);
    const before = snapshot(world);
    expect(() => api.prepareFinanceProcurement([routeA])).toThrow(/provenance/);
    expect(snapshot(world)).toBe(before);
  });

  it("discards an ended route's positive pending allowance when actual unpaid work closes the buyer", () => {
    const openingInput = input({ ownedWork: true });
    const fixedId = "fixture:fixed-recorded-obligation";
    openingInput.finance = {
      ...openingInput.finance!,
      contracts: [
        ...openingInput.finance!.contracts.map((row) =>
          row.id === routeB
            ? { ...row, amountMinor: 600, periodMonths: 3, dueAt: march }
            : row,
        ),
        {
          ...purchase(fixedId, buyer, supplier, 800),
          salesReceiptBudget: false,
          accruesArrears: true,
        },
      ],
      businesses: [book(buyer, [routeA, routeB, fixedId])],
    };
    const world = createCore(openingInput, { modules: [LIFE_MODULE] }),
      api = coreAPI(world),
      before = cash(world);
    financeDay(world);
    expect(
      world.finance.salesPendingBudgetByContract.get(routeB)!.amountMinor,
    ).toBe(200);
    expect(world.organizations.get(buyer)!.liquidMinor).toBe(p("zero"));
    runScheduledWork(
      api,
      (id, offers, context) => chooseAct(world, id, offers, context),
      () => undefined,
    );
    const result = world.work.lastResultByJob.get("fixture:job")!;
    expect(result.shortfallMinor).toBeGreaterThan(p("zero"));
    api.finishFinanceDay();
    expect(world.finance.closures.get(buyer)!.sourceReceiptId).toBe(result.id);
    expect(world.finance.contracts.get(routeB)!.endedAt).toBe(opening);
    expect(world.finance.salesPendingBudgetByContract.has(routeB)).toBe(false);
    expect(world.finance.salesBudgetPoolsByPayer.has(buyer)).toBe(false);
    expect(world.finance.salesReceivedThroughByPayer.has(buyer)).toBe(false);
    expect(cash(world)).toBe(before);
  });

  it("leaves a genuinely unfunded owned-job receipt and its exhausted-cash closure intact", () => {
    const world = core({ customerCash: p("zero"), ownedWork: true }),
      api = coreAPI(world),
      before = cash(world);
    financeDay(world);
    expect(
      world.finance.latestReceiptsByContract.get(routeA)!.requestedMinor,
    ).toBe(p("zero"));
    runScheduledWork(
      api,
      (id, offers, context) => chooseAct(world, id, offers, context),
      () => undefined,
    );
    const result = world.work.lastResultByJob.get("fixture:job")!;
    expect(result.requestedMinor).toBeGreaterThan(p("zero"));
    expect(result.paidMinor).toBe(p("zero"));
    api.finishFinanceDay();
    const closure = world.finance.closures.get(buyer)!;
    expect(closure.sourceReceiptId).toBe(result.id);
    expect(closure.endedJobIds).toContain("fixture:job");
    expect(world.jobs.get("fixture:job")!.endsAt).toBe(opening);
    expect(world.work.lastResultByJob.get("fixture:job")!.shortfallMinor).toBe(
      result.requestedMinor,
    );
    expect(world.finance.salesPendingBudgetByContract.size).toBe(p("zero"));
    expect(world.finance.salesBudgetPoolsByPayer.has(buyer)).toBe(false);
    expect(world.finance.salesReceivedThroughByPayer.has(buyer)).toBe(false);
    expect(cash(world)).toBe(before);
  });
});
