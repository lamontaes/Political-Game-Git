/** Controlled writer fixtures, not generated-world finance or calibration evidence. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { FINANCE_MODULE } from "./modules/finance";
import { coreAPI, createCore } from "./state";
import type { FinanceContractInput } from "./finance-types";
import type { CoreInput, CoreState, Source } from "./types";

const at = "2021-01-01",
  due = "2021-02-01";
const resident = "fixture:recipient",
  payer = "fixture:award-payer";
const contributor = "fixture:finite-contributor",
  seller = "fixture:shop";
const household = "fixture:home",
  place = "fixture:resident-town";
const source: Source = {
  tag: "ESTIMATED",
  asOf: at,
  citation:
    "Explicit finite cash and qualified-award test records; not an observed income award or public budget.",
  estimatedFrom: "Small controlled writer-boundary fixture.",
};

function awardContract(): FinanceContractInput {
  return {
    id: "m:income",
    payerIds: [payer],
    payeeId: resident,
    kind: "income.retirement",
    amountMinor: 100,
    dueAt: due,
    periodMonths: 1,
    accruesArrears: false,
    settlementPhaseId: "income",
    source,
    recipientIncome: {
      personId: resident,
      householdId: household,
      kindId: "retirement",
      sourceFactId: "fixture:award",
    },
  };
}
function fundingContract(): FinanceContractInput {
  return {
    id: "z:funding",
    payerIds: [contributor],
    payeeId: payer,
    kind: "fixture.funding",
    amountMinor: 100,
    dueAt: due,
    periodMonths: 1,
    endsAt: "2022-02-01",
    accruesArrears: false,
    settlementPhaseId: "funding",
    source,
  };
}
function purchaseContract(): FinanceContractInput {
  return {
    id: "a:purchase",
    payerIds: [resident],
    payeeId: seller,
    householdId: household,
    kind: "household-purchase",
    amountMinor: 100,
    dueAt: due,
    periodMonths: 1,
    accruesArrears: false,
    salesReceipt: true,
    source,
  };
}
function input(contracts: FinanceContractInput[], cash = 60): CoreInput {
  return {
    seed: "finance-income-controlled-fixture",
    startedAt: at,
    people: [
      {
        id: resident,
        givenName: "Fixture",
        familyName: "Recipient",
        birthDate: "1950-01-01",
        placeId: place,
        householdId: household,
        tier: "weekly",
        traits: {},
        liquidMinor: 0,
        livingCostDailyMinor: 0,
        source,
        familyIds: [],
        knownIds: [],
        pastFacts: [
          {
            id: "fixture:award",
            date: "2020-01-01",
            kind: "retirement:award",
            summary: "Recorded qualified monthly award",
            // This controlled award must retain evidence available on its own date.
            source: { ...source, asOf: "2020-01-01" },
            facts: {
              status: "in-payment",
              payerId: payer,
              monthlyMinor: "100",
              kindId: "retirement",
              householdId: household,
            },
          },
        ],
      },
    ],
    households: [
      { id: household, placeId: place, memberIds: [resident], source },
    ],
    jobs: [],
    organizations: [payer, contributor, seller].map((id) => ({
      id,
      name: id,
      placeId: "fixture:outside-town",
      kind: "public-institution",
      liquidMinor: id === contributor ? cash : 0,
      source,
    })),
    finance: { contracts, facilities: [], businesses: [], gaps: [] },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}
function total(core: CoreState) {
  return [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    0,
  );
}
function run(core: CoreState) {
  FINANCE_MODULE.onDay!(
    coreAPI(core),
    () => {
      throw new Error(
        "Finance cannot schedule a person decision in this fixture.",
      );
    },
    () => undefined,
  );
}

describe("qualified actual income and ordered finite cash settlement", () => {
  it("cannot reopen a paid month by giving the same award a short overlapping term", () => {
    const core = createCore(input([awardContract()]));
    const api = coreAPI(core);
    core.organizations.get(payer)!.liquidMinor = 100;
    core.date = due;
    api.settleFinanceContract("m:income");
    expect(core.finance.contracts.get("m:income")!.dueAt).toBe("2021-03-01");
    core.date = "2021-02-02";
    const before = total(core);
    expect(() =>
      api.addFinanceContract({
        ...awardContract(),
        id: "short:duplicate",
        dueAt: core.date,
        endsAt: "2021-02-15",
      }),
    ).toThrow(/overlaps/);
    expect(core.finance.contracts.size).toBe(1);
    expect(total(core)).toBe(before);
    expect(core.finance.paidIncomeByPlaceMonth.get(`2021-02:${place}`)).toBe(
      100,
    );
  });

  it("rejects a Source later than its actual award date before any settlement effects", () => {
    const core = createCore(input([awardContract()]));
    core.organizations.get(payer)!.liquidMinor = 100; // Controlled fixture stock.
    core.date = due;
    const fact = core.people
      .get(resident)!
      .pastFacts!.find((row) => row.id === "fixture:award")!;
    fact.source = { ...fact.source, asOf: "2020-01-02" };
    const snapshot = () =>
      structuredClone({
        people: core.people,
        organizations: core.organizations,
        finance: core.finance,
        journal: {
          accounts: core.cashJournal.accounts,
          accountsByOwner: core.cashJournal.accountsByOwner,
          accountCountByOwner: core.cashJournal.accountCountByOwner,
          residualAccountByOwner: core.cashJournal.residualAccountByOwner,
          externalFlowsByOwner: core.cashJournal.externalFlowsByOwner,
          nextSequence: core.cashJournal.nextSequence,
          totals: core.cashJournal.totals,
          totalsByOwner: core.cashJournal.totalsByOwner,
          totalsByAccount: core.cashJournal.totalsByAccount,
          latestByOwner: core.cashJournal.latestByOwner,
          latestByAccount: core.cashJournal.latestByAccount,
          detailedReceipts: core.cashJournal.detailedReceipts,
          detailedByOwner: core.cashJournal.detailedByOwner,
          requiredBySource: core.cashJournal.requiredBySource,
        },
      });
    const before = snapshot();
    expect(() => coreAPI(core).settleFinanceContract("m:income")).toThrow(
      /Finance cash source is undated or unavailable/,
    );
    expect(snapshot()).toEqual(before);
    expect(core.finance.contracts.get("m:income")!.dueAt).toBe(due);
    expect(core.finance.paidIncomeByPlaceMonth.size).toBe(0);
    expect(core.finance.paidIncomeByPlaceMonthKind.size).toBe(0);
  });

  it("admits a generic monthly award only with recorded cash standing-entitlement basis", () => {
    for (const facts of [
      { basis: "work", paymentMedium: "cash" },
      { basis: "standing-entitlement", paymentMedium: "restricted-benefit" },
      { basis: "standing-entitlement", paymentMedium: "cash" },
    ]) {
      const data = input([]);
      const fact = data.people[0]!.pastFacts![0]!;
      fact.kind = "income:monthly-award";
      fact.facts = { ...fact.facts, ...facts };
      const core = createCore(data),
        api = coreAPI(core);
      if (
        facts.basis === "standing-entitlement" &&
        facts.paymentMedium === "cash"
      )
        expect(() => api.addFinanceContract(awardContract())).not.toThrow();
      else {
        expect(() => api.addFinanceContract(awardContract())).toThrow(
          /qualified/,
        );
        expect(core.finance.contracts.size).toBe(0);
      }
    }
  });

  it("rejects overlapping duplicate award routes before any write and permits a disjoint finite successor", () => {
    const core = createCore(input([])),
      api = coreAPI(core);
    const first = { ...awardContract(), endsAt: "2021-03-01" };
    api.addFinanceContract(first);
    const before = total(core);
    expect(() =>
      api.addFinanceContract({ ...awardContract(), id: "duplicate:award" }),
    ).toThrow(/overlaps/);
    expect(core.finance.contracts.size).toBe(1);
    expect([...core.finance.incomeContractsByPerson.get(resident)!]).toEqual([
      first.id,
    ]);
    expect(total(core)).toBe(before);
    first.recipientIncome!.sourceFactId = "caller:mutated";
    expect(
      core.finance.contracts.get(first.id)!.recipientIncome!.sourceFactId,
    ).toBe("fixture:award");
    api.addFinanceContract({
      ...awardContract(),
      id: "successor:award",
      dueAt: "2021-03-01",
    });
    expect(core.finance.contracts.size).toBe(2);
    expect([...core.finance.incomeContractsByPerson.get(resident)!]).toEqual([
      first.id,
      "successor:award",
    ]);
    core.date = "2021-03-01";
    api.retireFinanceBudget(first.id);
    expect([...core.finance.incomeContractsByPerson.get(resident)!]).toEqual([
      "successor:award",
    ]);
  });

  it("cleans obsolete indexes when a finite term was already ended by an earlier writer", () => {
    const term = { ...fundingContract(), endsAt: "2021-03-01" };
    const core = createCore(input([term]));
    core.finance.contracts.get(term.id)!.endedAt = "2021-02-15";
    core.date = term.endsAt;
    coreAPI(core).retireFinanceBudget(term.id);
    expect(core.finance.contracts.get(term.id)!.endedAt).toBe("2021-02-15");
    expect(core.finance.contractsDueAt.size).toBe(0);
    expect(core.finance.contractsEndingAt.size).toBe(0);
  });

  it("funds the award before purchases regardless of input and lexicographic order, and counts only actual paid income at residence", () => {
    const core = createCore(
      input([purchaseContract(), awardContract(), fundingContract()]),
    );
    const before = total(core);
    core.date = due;
    run(core);
    expect(
      core.finance.latestReceiptsByContract.get("z:funding")?.paidMinor,
    ).toBe(60);
    expect(
      core.finance.latestReceiptsByContract.get("m:income")?.paidMinor,
    ).toBe(60);
    expect(
      core.finance.latestReceiptsByContract.get("a:purchase")?.paidMinor,
    ).toBe(60);
    expect(core.finance.paidIncomeByPlaceMonth.get(`2021-02:${place}`)).toBe(
      60,
    );
    expect(
      core.finance.paidIncomeByPlaceMonthKind.get(
        `2021-02:${place}:retirement`,
      ),
    ).toBe(60);
    expect(
      core.finance.paidIncomeByPlaceMonth.has("2021-02:fixture:outside-town"),
    ).toBe(false);
    expect(core.finance.contracts.get("m:income")?.arrearsMinor).toBe(0);
    expect(total(core)).toBe(before);
    expect(core.organizations.get(seller)?.liquidMinor).toBe(60);
    core.date = "2021-03-01";
    run(core);
    expect(
      core.finance.latestReceiptsByContract.get("m:income")?.paidMinor,
    ).toBe(0);
    expect(total(core)).toBe(before);
  });

  it("rejects an unqualified, future or contradictory award before any contract or cash write", () => {
    for (const change of [
      "status",
      "date",
      "monthlyMinor",
      "payerId",
    ] as const) {
      const data = input([]);
      const fact = data.people[0]!.pastFacts![0]!;
      if (change === "date") fact.date = "2021-02-01";
      else
        fact.facts = {
          ...fact.facts,
          [change]: change === "status" ? "denied" : "wrong",
        };
      const core = createCore(data),
        api = coreAPI(core),
        before = total(core);
      expect(() => api.addFinanceContract(awardContract())).toThrow(
        /qualified|contradict/,
      );
      expect(core.finance.contracts.size).toBe(0);
      expect(core.finance.contractsDueAt.size).toBe(0);
      expect(total(core)).toBe(before);
    }
  });

  it("rejects income misclassification, nonmonthly terms, credit, sales, and arrears", () => {
    for (const extra of [
      {
        recipientIncome: {
          ...awardContract().recipientIncome!,
          kindId: "unknown",
        },
      },
      { periodMonths: 3 },
      { salesReceipt: true },
      { accruesArrears: true },
      { settlementPhaseId: "standing-services" },
      { payeeId: seller },
      { creditFacilityId: "unknown" },
    ]) {
      const core = createCore(input([]));
      expect(() =>
        coreAPI(core).addFinanceContract({ ...awardContract(), ...extra }),
      ).toThrow(/qualified|phase/);
      expect(core.finance.contracts.size).toBe(0);
    }
  });

  it("counts the recorded current residence after a move without counting the payer's place", () => {
    const core = createCore(input([awardContract()]));
    const api = coreAPI(core);
    core.organizations.get(payer)!.liquidMinor = 50; // Controlled fixture stock, not a production funding route.
    core.households.get(household)!.placeId = "fixture:new-residence";
    core.date = due;
    expect(api.settleFinanceContract("m:income").paidMinor).toBe(50);
    expect(
      core.finance.paidIncomeByPlaceMonthKind.get(
        "2021-02:fixture:new-residence:retirement",
      ),
    ).toBe(50);
    expect(core.finance.paidIncomeByPlaceMonth.has(`2021-02:${place}`)).toBe(
      false,
    );
  });

  it("admits an exclusive finite end, pays before it, retires at it and removes due/pending indexes", () => {
    const term = { ...fundingContract(), endsAt: "2021-03-01" };
    const core = createCore(input([term], 300));
    core.date = due;
    run(core);
    expect(core.organizations.get(payer)?.liquidMinor).toBe(100);
    core.date = "2021-03-01";
    run(core);
    expect(core.finance.contracts.get(term.id)?.endedAt).toBe(core.date);
    expect(core.finance.contractsDueAt.size).toBe(0);
    expect(core.finance.contractsEndingAt.size).toBe(0);
    expect(core.finance.salesPendingBudgetByContract.has(term.id)).toBe(false);
    expect(core.organizations.get(contributor)?.liquidMinor).toBe(200);
    expect(() => coreAPI(core).settleFinanceContract(term.id)).toThrow(
      "Actual standing finance terms are not currently due.",
    );
    expect(() => coreAPI(core).retireFinanceBudget(term.id)).not.toThrow();
  });

  it("cannot expire debt or retire an active budget", () => {
    const core = createCore(input([])),
      api = coreAPI(core);
    expect(() =>
      api.addFinanceContract({ ...fundingContract(), accruesArrears: true }),
    ).toThrow(/expire debt/);
    expect(() =>
      api.addFinanceContract({ ...fundingContract(), endsAt: due }),
    ).toThrow(/end after/);
    api.addFinanceContract(fundingContract());
    expect(() => api.retireFinanceBudget("z:funding")).toThrow(/ended finite/);
  });

  it("rejects duplicate or wrongly ordered policy phases before any finance writes", () => {
    const phases = DEFAULT_DATA.finance!.settlementPhases;
    for (const broken of [
      [...phases, phases[0]!],
      [phases[1]!, phases[0]!, ...phases.slice(2)],
    ]) {
      expect(() =>
        createCore(input([fundingContract()]), {
          data: {
            ...DEFAULT_DATA,
            finance: { ...DEFAULT_DATA.finance!, settlementPhases: broken },
          },
        }),
      ).toThrow(/distinct|fund income/);
    }
  });
});
