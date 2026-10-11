import { describe, it, expect } from "vitest";
import { STATES } from "../../simulation/state-reference";
import * as legacyBenefits from "../../simulation/public-benefit-formulas";
import {
  paidLeaveCoveredDays as oldCovered,
  paidLeaveBenefitMinor as oldBenefit,
} from "../../simulation/paid-leave-benefits";
import { premiumOn as oldPremium } from "../../simulation/state-paid-leave-law";
import {
  lawExposureFeltSize as oldFelt,
  monthlyPay as oldMonthly,
} from "../../simulation/law-exposure";
import {
  resolveCoverage as oldCoverage,
  COVERAGE_RULES,
} from "../../simulation/enacted-coverage";
import { evaluateLawAmount as oldAmount } from "../../simulation/law-consequence-amount";
import {
  addDays as oldAddDays,
  daysBetween as oldDays,
} from "../../simulation/dates";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { money } from "../../simulation/resources";
import * as benefits from "./benefits";
import * as leave from "./paid-leave";
import * as clauses from "./clause-rules";
import * as calendar from "./calendar";
import { lawExposureFeltSize, monthlyPayFromFacts } from "./exposure";
import { resolveCoverage } from "./coverage";
import { evaluateLawAmount } from "./amount";
import { payTermUnits, priceCostTermUnits } from "./term-units";
import type { LawAmountExpression } from "./amount-types";
import { legacyDeclarations, resultOf } from "./legacy-source.test-support";

const oldPayTerms = legacyDeclarations<{ termUnits: typeof payTermUnits }>(
  "law-consequences/pay.ts",
  ["termUnits"],
).termUnits;
const oldPriceTerms = legacyDeclarations<{
  requiredTermUnits: typeof priceCostTermUnits;
}>("law-consequences/price-cost.ts", ["requiredTermUnits"]).requiredTermUnits;
const oldClauses = legacyDeclarations<typeof clauses>(
  "enacted-appropriations.ts",
  [
    "APPROPRIATES",
    "YEAR_WORDS",
    "isFamilyAppropriation",
    "statedTermYears",
    "isAuthorizationCeiling",
  ],
);
const oldDates = legacyDeclarations<typeof clauses>("enacted-duties.ts", [
  "MONTHS",
  "spokenDate",
  "datesStated",
  "statedComplianceDate",
]);
const inputs = {
  term: { wage: { value: 20, unit: "minor/hour" as const } },
  record: { hours: { value: 8, unit: "hours" as const } },
  capacity: { limit: { value: 180, unit: "minor" as const } },
  exposure: { share: { value: 0.5, unit: "ratio" as const } },
};
const term: LawAmountExpression = {
  op: "term",
  key: "wage",
  unit: "minor/hour",
};
const amount: LawAmountExpression = {
  op: "product",
  left: term,
  right: { op: "record", key: "hours", unit: "hours" },
};
const expressions: LawAmountExpression[] = [
  term,
  amount,
  { op: "constant", value: 100, unit: "minor", sourceIds: ["law"] },
  { op: "sum", operands: [amount, amount] },
  {
    op: "minimum",
    operands: [amount, { op: "capacity", key: "limit", unit: "minor" }],
  },
  { op: "maximum", operands: [amount, amount] },
  { op: "difference", left: amount, right: amount },
  {
    op: "ratio",
    left: amount,
    right: { op: "exposure", key: "share", unit: "ratio" },
  },
  { op: "ratio", left: amount, right: amount },
  {
    op: "ratio",
    left: amount,
    right: { op: "record", key: "hours", unit: "hours" },
  },
  {
    op: "product",
    left: { op: "exposure", key: "share", unit: "ratio" },
    right: amount,
  },
  { op: "term", key: "missing", unit: "minor" },
  { op: "term", key: "wage", unit: "minor" },
  { op: "constant", value: 1, unit: "minor", sourceIds: [] },
  { op: "constant", value: Infinity, unit: "minor", sourceIds: ["law"] },
  { op: "sum", operands: [] },
  { op: "difference", left: term, right: amount },
  {
    op: "ratio",
    left: amount,
    right: { op: "constant", value: 0, unit: "ratio", sourceIds: ["law"] },
  },
  { op: "product", left: amount, right: amount },
  { op: "sum", operands: [term, { op: "term", key: "wage", unit: "minor" }] },
];

describe("law consequence golden arithmetic in all 56 places", () => {
  it.each(Object.keys(STATES))("matches unchanged rules in US-%s", (usps) => {
    const income = (usps.charCodeAt(0) + usps.charCodeAt(1)) * 1234;
    const calls: readonly (readonly [
      keyof typeof benefits,
      readonly unknown[],
    ])[] = [
      [
        "primaryInsuranceAmountMinor",
        [
          income,
          {
            bendPointsMinor: [128600, 774900],
            factorsBasisPoints: [9000, 3200, 1500],
          },
        ],
      ],
      ...[1937, 1938, 1942, 1943, 1954, 1955, 1959, 1960].map(
        (year) => ["fullRetirementAgeMonths", [year]] as const,
      ),
      ...[743, 744, 780, 792, 804, 840, 900].map(
        (age) => ["retiredWorkerBenefitMinor", [income, age, 804]] as const,
      ),
      ["applyCostOfLivingRaiseMinor", [income, 280]],
      [
        "foodAidBenefitMinor",
        [
          income,
          2,
          {
            maximumAllotmentMinor: 54600,
            minimumBenefitMinor: 2400,
            minimumBenefitMaxHouseholdSize: 2,
            expectedContributionBasisPoints: 3000,
          },
        ],
      ],
      ["withinPovertyShare", [income, 1500000, 13800]],
      ["povertyLineMinor", [4, 1500000, 550000]],
      ["povertyLineMinor", [0, 1, 1]],
      ...[0, 600, 3600].map(
        (rate) => ["amortizedMonthlyPaymentMinor", [income, rate, 24]] as const,
      ),
      ["amortizedMonthlyPaymentMinor", [income, 100, 0]],
      ["monthlyInterestMinor", [income, 2400]],
      ["revolvingMinimumPaymentMinor", [income, 2400, 100, 2500]],
      ["cappedAnnualRateBasisPoints", [3600, 2400]],
      ["cappedAnnualRateBasisPoints", [3600, null]],
    ];
    for (const [name, args] of calls) {
      const actual = benefits[name] as (...args: unknown[]) => unknown;
      const legacy = legacyBenefits[name] as (...args: unknown[]) => unknown;
      expect(
        resultOf(() => actual(...args)),
        name,
      ).toEqual(resultOf(() => legacy(...args)));
    }
    for (const expression of expressions) {
      expect(resultOf(() => evaluateLawAmount(expression, inputs))).toEqual(
        resultOf(() => oldAmount(expression, inputs)),
      );
      expect(resultOf(() => payTermUnits(expression))).toEqual(
        resultOf(() => oldPayTerms(expression)),
      );
      expect(resultOf(() => priceCostTermUnits(expression))).toEqual(
        resultOf(() => oldPriceTerms(expression)),
      );
    }
    for (const key of [...Object.keys(COVERAGE_RULES), "missing"])
      for (const choice of ["state-and-local", "state-only"])
        expect(
          resolveCoverage(
            key,
            { "covered-bodies": { kind: "enumerated", value: choice } },
            "enacted coverage",
          ),
        ).toEqual(
          oldCoverage(
            key,
            { "covered-bodies": { kind: "enumerated", value: choice } },
            "enacted coverage",
          ),
        );
    for (const unpaid of [0, 1, 5, 10]) {
      const absence = {
        seriousOwnDaysSinceOnset: [0, 6, 7, 8, 20],
        seriousCaringDays: 2,
      };
      expect(leave.paidLeaveCoveredDays(absence, unpaid)).toBe(
        oldCovered(absence, unpaid),
      );
      for (const maxWeeklyMinor of [null, 10000])
        for (const workdays of [0, 1, 10]) {
          const rate = { percent: 80, maxWeeklyMinor };
          expect(
            leave.paidLeaveBenefitMinor(rate, income, workdays, unpaid),
          ).toBe(oldBenefit(rate, income, workdays, unpaid));
        }
    }
    for (const cap of [null, 0, income - 1, income + 1]) {
      const premium = {
        kind: "premium" as const,
        annualWageCapMinor: cap,
        employeeRatePerMillion: 4400,
        sourceUrl: null,
      };
      expect(leave.premiumOn(income, 100, premium)).toEqual(
        oldPremium(income, 100, premium),
      );
    }
    for (const direction of ["none", "gain", "cost"] as const)
      for (const amount of [null, money(1200, "USD")])
        for (const pay of [0, 1, income])
          expect(lawExposureFeltSize({ direction, amount }, pay)).toEqual(
            oldFelt({ direction, amount }, pay),
          );
    for (const text of [
      "There is appropriated money for the two-year pilot",
      "There is appropriated money for the 12-year pilot",
      "There is authorized money",
      "There is appropriated money for the zero-year pilot",
    ]) {
      const provision = {
        text,
        fiscalPeriod: "one-time",
        fiscalExposureMinorUnits: 100,
        provisionKey: "fund",
      };
      expect(clauses.isFamilyAppropriation(provision)).toBe(
        oldClauses.isFamilyAppropriation(provision),
      );
      expect(clauses.isAuthorizationCeiling(provision)).toBe(
        oldClauses.isAuthorizationCeiling(provision),
      );
      expect(clauses.statedTermYears(text)).toBe(
        oldClauses.statedTermYears(text),
      );
    }
    const own = {
      text: "shall comply not later than February 28, 2028; not later than January 1, 2029",
      provisionKey: "duty",
      fiscalExposureMinorUnits: null,
    };
    expect(clauses.statedComplianceDate(own, [own])).toEqual(
      oldDates.statedComplianceDate(own, [own]),
    );
    expect(clauses.datesStated(own)).toEqual(oldDates.datesStated(own));
    expect(clauses.spokenDate("2028-02-29")).toBe(
      oldDates.spokenDate("2028-02-29"),
    );
    for (const date of ["2028-02-29", "2026-01-01", "0099-12-31"])
      for (const offset of [-365, -1, 0, 1, 366]) {
        expect(calendar.addDays(date, offset)).toBe(
          oldAddDays(date as Parameters<typeof oldAddDays>[0], offset),
        );
        expect(calendar.daysBetween(date, calendar.addDays(date, offset))).toBe(
          oldDays(
            date as Parameters<typeof oldDays>[0],
            oldAddDays(date as Parameters<typeof oldAddDays>[0], offset),
          ),
        );
      }
  });
  it.each(Object.keys(STATES))(
    "matches monthly pay and untracked people in US-%s",
    () => {
      // Read only the original monthlyPay declaration; fake record rows exercise filters, not world production.
      const monthly = legacyDeclarations<{
        monthlyPay: (world: unknown, id: string, at: string) => unknown;
      }>(
        "law-exposure.ts",
        ["PAY_WINDOW_DAYS", "DAYS_PER_MONTH", "monthlyPay"],
        {
          addDays: oldAddDays,
        },
      ).monthlyPay;
      for (const currency of ["USD", "EUR"]) {
        const transfers = [
          {
            resourceFlowId: "work",
            occurredAt: "2026-01-01",
            transferredAmount: { minorUnits: 100, currency },
          },
          {
            resourceFlowId: "work",
            occurredAt: "2026-01-02",
            transferredAmount: { minorUnits: 200, currency },
          },
          {
            resourceFlowId: "other",
            occurredAt: "2026-01-28",
            transferredAmount: { minorUnits: 999, currency },
          },
          {
            resourceFlowId: "work",
            occurredAt: "2026-01-29",
            transferredAmount: { minorUnits: 300, currency },
          },
          {
            resourceFlowId: "work",
            occurredAt: "2026-01-30",
            transferredAmount: { minorUnits: 999, currency },
          },
        ];
        for (const tracked of [false, true]) {
          const world = {
            history: {
              resourcePositions: tracked
                ? [
                    {
                      owner: { kind: "person", personId: "p" },
                      openingBalance: { currency },
                    },
                  ]
                : [],
              resourceFlows: [
                {
                  id: "work",
                  basisReference: { kind: "work" },
                  recipient: { kind: "person", personId: "p" },
                },
              ],
              resourceTransferOutcomes: transfers,
            },
          };
          expect(
            monthlyPayFromFacts(
              {
                tracked,
                openingCurrency: currency,
                workFlowIds: new Set(["work"]),
                transfers,
              },
              "2026-01-29",
            ),
          ).toEqual(monthly(world, "p", "2026-01-29"));
        }
      }
    },
  );
  it("draws and names one place for the existing generated fixture baseline", () => {
    const seed = "RULES4-outcome-web-20261010";
    const keys = Object.keys(STATES);
    const place =
      keys[
        [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0) %
          keys.length
      ]!;
    const { world } = smallWorld({ seed, place, people: 4 });
    expect(world.people[world.personOrder[0]!]).toBeDefined();
    const person = world.personOrder[0]!;
    const at = world.currentDate;
    const position = world.history.resourcePositions.find(
      (row) => row.owner.kind === "person" && row.owner.personId === person,
    );
    const workFlowIds = new Set(
      world.history.resourceFlows
        .filter(
          (row) =>
            row.basisReference.kind === "work" &&
            row.recipient.kind === "person" &&
            row.recipient.personId === person,
        )
        .map((row) => row.id),
    );
    expect(
      monthlyPayFromFacts(
        {
          tracked: position !== undefined,
          openingCurrency: position?.openingBalance.currency ?? "USD",
          workFlowIds,
          transfers: world.history.resourceTransferOutcomes,
        },
        at,
      ),
    ).toEqual(oldMonthly(world, person, at));
    console.info(
      `RULES-4 baseline seed=${seed}; generated fixture place=US-${place}; generated head baseline=e7e3cf8f9a; person=${person}. This baseline does not prove core2 wiring.`,
    );
  });
});
