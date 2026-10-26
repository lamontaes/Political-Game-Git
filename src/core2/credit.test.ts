/** M1-06 checks on a recorded fixture: household loans balance; defaults follow circumstances. */
import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { drawPlace } from "../../scripts/core2-year/place";
import { extendData } from "./data";
import { enactLaw, lawChain, openLaws } from "./modules/laws";
import { lawChainForPlace } from "./laws-starting";
import { advanceCore, createLifeCore } from "./life";
import { chooseAct } from "./choice";
import creditData from "./data/credit/credit.json" with { type: "json" };
import { collapseToTwoLevels } from "./residents";
import { residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";
import { CREDIT_MODULE, personalBorrowingDecision } from "./modules/credit";
import { MACRO_MODULE, withCentralBank } from "./modules/macro";
import { worldCoreData } from "./modules/world";
import { coreAPI } from "./state";
import { transferCash } from "./world-transfer";
import type { CoreInput, CoreState, Source } from "./types";

const start = "2026-10-01",
  place = "place:credit-fixture",
  bank = "organization:bank:fixture";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Credit fixture only.",
};
function input(at = place): CoreInput {
  const people = [
    ["earner", 5_000, true],
    ["jobless", 5_000, false],
  ] as const;
  return withCentralBank({
    seed: "credit-fixture",
    startedAt: start,
    people: people.map(([id, cash, working]) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1985-01-01",
      placeId: at,
      householdId: `household:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: cash,
      livingCostDailyMinor: 3_000,
      source: src,
      familyIds: [],
      knownIds: [],
      ...(working ? { jobId: `job:${id}` } : {}),
    })),
    households: people.map(([id]) => ({
      id: `household:${id}`,
      placeId: at,
      memberIds: [id],
      source: src,
    })),
    jobs: [
      {
        id: "job:earner",
        personId: "earner",
        organizationId: "organization:shop",
        title: "Clerk",
        hourlyMinor: 2_500,
        hoursDaily: 8,
        wageDailyMinor: 20_000,
        source: src,
      },
    ],
    organizations: [
      {
        id: bank,
        placeId: at,
        name: "Bank",
        kind: "bank",
        liquidMinor: 100_000_000,
        source: src,
      },
      {
        id: "organization:shop",
        placeId: at,
        name: "Shop",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
      {
        id: "organization:store",
        placeId: at,
        name: "Store",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  });
}
const money = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (s, r) => s + r.liquidMinor,
    0,
  );

describe("household loans", () => {
  it("lends to the household whose income carries the payment, refuses the one without income, and charges off after 120 days unpaid", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [MACRO_MODULE, CREDIT_MODULE],
        scheduledWork: false,
      }),
      api = coreAPI(core),
      total = money(core);
    advanceCore(core, "2026-10-02");
    // The borrower spends the loan and their savings at a store (not their employer, whose cash pays wages).
    transferCash(
      api,
      "fixture:spending",
      "earner",
      "organization:store",
      core.people.get("earner")!.liquidMinor,
      src,
    );
    advanceCore(core, "2027-06-02");
    const t = api.moduleState("credit").snapshot().tables;
    const applications = t.applications as unknown as {
      householdId: string;
      approved: boolean;
    }[];
    expect(
      applications.find((r) => r.householdId === "household:jobless")
        ?.approved ?? false,
    ).toBe(false);
    const loans = t.loans as unknown as {
      householdId: string;
      standing: string;
      chargeOffCause?: string;
    }[];
    const loan = loans.find((r) => r.householdId === "household:earner")!;
    expect(loan).toBeTruthy();
    // With no wages paid in this fixture, the earner's cash runs out: late, then charged off at 120 days.
    expect(loan.standing).toBe("charged-off");
    expect(loan.chargeOffCause).toBe("payments-beyond-cash");
    expect((t.payments as unknown[]).length).toBeGreaterThan(3);
    expect(money(core)).toBe(total);
  });
});

it("prices consumer credit under the law in force and leaves market pricing when it is off", () => {
  const drawn = drawPlace(randomBytes(16).toString("hex"), "credit-cap");
  function run(value: number, inJurisdiction = true) {
    const core = createLifeCore(
      {
        ...input(
          inJurisdiction ? lawChainForPlace(drawn.key).townPlaceId : place,
        ),
        placeMetadata: { placeKey: drawn.key },
      },
      {
        data: extendData(worldCoreData(), {
          parameters: {
            creditPersonalSpreadPct: {
              value: 50,
              tag: "TUNABLE",
              citation: "Stress fixture above the statutory ceiling.",
            },
            creditBorrowBaseline: {
              value: 10,
              tag: "TUNABLE",
              citation: "Stress fixture: borrower applies under both offers.",
            },
          },
        }),
        modules: [MACRO_MODULE, CREDIT_MODULE],
        scheduledWork: false,
      },
    );
    openLaws(core);
    const api = coreAPI(core);
    const law = enactLaw(api, {
      jurisdiction: lawChain(api).stateKey,
      level: "state",
      series: "us-policy-positions:business-commerce.cap-consumer-loan-rates",
      value,
      effectiveDate: start,
      measureId: "credit-cap-test",
      citation: "Technical test enactment.",
    });
    const before = money(core);
    advanceCore(core, "2026-10-02");
    const application = api
      .moduleState("credit")
      .table("applications")
      .rows()
      .find((r) => r.householdId === "household:earner")!;
    expect(application).toBeTruthy();
    expect(money(core)).toBe(before);
    return { application, law };
  }
  const capped = run(1),
    uncapped = run(0),
    elsewhere = run(1, false);
  expect(capped.application.annualRate).toBe(0.36);
  expect(capped.application.lawId).toBe(capped.law.id);
  expect(uncapped.application.annualRate).toBeGreaterThan(0.36);
  expect(uncapped.application.lawId).toBeNull();
  expect(elsewhere.application.annualRate).toBe(
    uncapped.application.annualRate,
  );
  expect(elsewhere.application.lawId).toBeNull();
  expect(capped.application.limitMinor).toBeGreaterThan(
    uncapped.application.limitMinor as number,
  );
});

it("a firm with no recorded owner is run by its best-paid worker, who decides whether it borrows", () => {
  const core = createLifeCore(input(), {
    data: worldCoreData(),
    modules: [MACRO_MODULE, CREDIT_MODULE],
    scheduledWork: false,
  });
  const api = coreAPI(core);
  const payroll = 4 * 12_000 * 260;
  core.finance.businesses.set("organization:shop", {
    organizationId: "organization:shop",
    kindId: "retail",
    annualPayrollMinor: payroll,
    annualDemandMinor: payroll * 4,
    capacityMinor: payroll * 4,
    annualOtherCostsMinor: 0,
    openingTownIncomeMinor: 0,
    price: 1,
    costContractIds: [],
    source: src,
    lastReviewedAt: start,
    reachedIncomeRatio: 1,
    anchorAnnualDemandMinor: payroll * 4,
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
  } as never);
  advanceCore(core, "2026-11-02");
  const applications = api
    .moduleState("credit")
    .table("applications")
    .rows()
    .filter((row) => row.organizationId === "organization:shop");
  // No owner is recorded for the shop; its only worker decides, and the
  // application names them. A firm with nobody to decide would not apply.
  expect(applications.length).toBeGreaterThan(0);
  for (const row of applications) expect(row.decidedBy).toBe("earner");
});

it("keeps the full chooser's borrowing answer when common utility terms cancel", () => {
  const core = createLifeCore(input(), {
    data: worldCoreData(),
    modules: [MACRO_MODULE, CREDIT_MODULE],
    scheduledWork: false,
  });
  const api = coreAPI(core);
  for (const actor of core.people.values())
    for (const need of [0, 0.4, 0.9, 1])
      for (const burden of [0, 0.3, 1, Infinity]) {
        const reasons = {
          baseline: api.parameter("creditBorrowBaseline"),
          need: api.parameter("creditBorrowNeedWeight") * need,
          cost:
            -api.parameter("creditBorrowCostWeight") *
            Math.min(burden, api.parameter("two")),
        };
        const offers = (["wait", "borrow"] as const).map((kind) => ({
          definition: {
            id: creditData.actions[kind].id,
            actKinds: creditData.actions[kind].actKinds,
            goalKinds: [],
            need: "money",
            effortParameter: "zero",
            effectParameter: "zero",
            targetKind: "credit-option",
            effect: "credit-choice",
          },
          targetId: actor.householdId,
          availableHours: 1,
          effortHours: 0,
          reasonBindings: Object.entries(kind === "borrow" ? reasons : {}).map(
            ([id, value]) => ({
              id,
              provider: "credit:pull",
              weightParameter: "one",
              arguments: { value: String(value) },
            }),
          ),
        }));
        const existing = chooseAct(core, actor.id, offers);
        expect(personalBorrowingDecision(api, actor, need, burden).borrow).toBe(
          existing.selected!.definition.id === creditData.actions.borrow.id,
        );
      }
});

it("lends to a counted borrower and keeps the same loan through fill-in and repayment", () => {
  const full = input();
  const commitment = {
    id: "commitment:earner",
    payrollCalendarId: "calendar:earner",
    jobId: "job:earner",
    personId: "earner",
    organizationId: "organization:shop",
    startsAt: start,
    anchorDate: start,
    periodDays: 1,
    expectedWeeklyMinutes: 3360,
    hourlyMinor: 2500,
    slots: [{ offsetDays: 0, startMinute: 480, minutes: 480 }],
    scheduleSource: src,
    paySource: src,
  };
  const two = collapseToTwoLevels(
    {
      ...full,
      workCommitments: [commitment],
      workPayrollCalendars: [
        {
          id: "calendar:earner",
          organizationId: "organization:shop",
          workCommitmentIds: [commitment.id],
          basisRecordIds: ["organization:shop", "job:earner", commitment.id],
          rule: "fixed-days-after-inclusive-period-end",
          firstPeriodStartsAt: start,
          periodDays: 14,
          firstPaydayAt: "2026-10-15",
          effectiveFrom: start,
          nonbusinessDayRule: "no-adjustment",
          arrearsRule: "carry-to-next-recorded-payday",
          source: src,
        },
      ],
    },
    {
      keep: new Set(
        full.people
          .filter((person) => person.id !== "earner")
          .map((person) => person.id),
      ),
    },
  );
  const core = createLifeCore(two, {
    data: worldCoreData(),
    modules: [MACRO_MODULE, CREDIT_MODULE],
    scheduledWork: true,
  });
  const api = coreAPI(core);
  advanceCore(core, "2026-10-02");
  expect(core.people.has("earner")).toBe(false);
  const loan = api
    .moduleState("credit")
    .table("loans")
    .rows()
    .find((row) => row.borrowerId === "earner");
  expect(loan).toBeTruthy();
  expect(Number(loan!.principalMinor)).toBeGreaterThan(0);
  advanceCore(core, "2026-11-02");
  const payments = api
    .moduleState("credit")
    .table("payments")
    .query("byLoan", [loan!.id]);
  expect(payments.length).toBeGreaterThan(0);
  expect(
    payments.every(
      (row) => Number(row.paidMinor) <= Number(row.cashBeforeMinor),
    ),
  ).toBe(true);
  const flows = [...residentsRuntime(core)!.wageFlowByJob.values()];
  expect(flows.some((flow) => flow.lastRequestedMinor !== undefined)).toBe(
    true,
  );
  expect(
    flows.every(
      (flow) => (flow.lastPaidMinor ?? 0) <= (flow.lastRequestedMinor ?? 0),
    ),
  ).toBe(true);
  fillInPerson(core, "earner");
  expect(core.people.has("earner")).toBe(true);
  advanceCore(core, "2026-12-02");
  expect(
    api.moduleState("credit").table("loans").get(loan!.id)?.borrowerId,
  ).toBe("earner");
  expect(
    api.moduleState("credit").table("payments").query("byLoan", [loan!.id])
      .length,
  ).toBeGreaterThan(payments.length);
  expect(core.cashJournal.totals.grossDebitMinor).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
});
