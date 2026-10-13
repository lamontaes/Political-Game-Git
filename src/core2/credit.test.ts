/** M1-06 checks on a recorded fixture: household loans balance; defaults follow circumstances. */
import { drawPlace } from "../../scripts/core2-year/place";
import { randomBytes } from "node:crypto";
import { openLaws, enactLaw, lawChain } from "./modules/laws";
import { lawChainForPlace } from "./laws-starting";
import { extendData } from "./data";
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { CREDIT_MODULE } from "./modules/credit";
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
function input(placeId = place): CoreInput {
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
      placeId,
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
      placeId,
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
        placeId,
        name: "Bank",
        kind: "bank",
        liquidMinor: 100_000_000,
        source: src,
      },
      {
        id: "organization:shop",
        placeId,
        name: "Shop",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
      {
        id: "organization:store",
        placeId,
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
