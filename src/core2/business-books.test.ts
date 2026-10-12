import { describe, expect, it } from "vitest";
import { IRS_TOWN_BUSINESS_BOOKS } from "../simulation/living-world/town-business-books.generated";
import { PARAMETERS, parameter, type Parameter } from "./parameters";
import {
  classifyBusiness,
  DEFAULT_BUSINESS_BOOKS_DATA as data,
  estimateCreditLimit,
  planBusinessFunding,
  projectBusinessPrice,
  projectMarket,
  projectOpeningBusiness,
  projectOtherCosts,
  splitMarketDemand,
  type BusinessBooksData,
  type FundingPlanInput,
  type MarketProjectionInput,
} from "./business-books";
import type { Source } from "./types";

const p = (key: string) => parameter(key);
const source: Source = {
  tag: "ESTIMATED",
  asOf: "2021-01-01",
  citation:
    "Authored pure-calculator boundary fixture; no observed employer, bank, receipt or actor outcome.",
  estimatedFrom:
    "Controlled input amounts derived from registered unit constants; model coefficients remain tagged and uncalibrated.",
};
const cash = () => p("minorPerDollar");
const plannedPay = () => cash() * p("monthsPerYear");
const digits = () => p("emotionComparisonDigits");

function market(
  overrides: Partial<MarketProjectionInput> = {},
): MarketProjectionInput {
  return {
    from: "2021-01-01",
    to: "2021-01-08",
    priorReachedIncomeMinor: cash(),
    currentTownIncomeMinor: cash() * p("two"),
    anchorTownIncomeMinor: cash(),
    anchorAnnualDemandMinor: plannedPay(),
    relativePriceToAnchor: p("one"),
    macroDemandFactor: p("one"),
    kindId: "retail",
    source,
    ...overrides,
  };
}

function funding(overrides: Partial<FundingPlanInput> = {}): FundingPlanInput {
  return {
    at: "2021-01-01",
    existingCashMinor: cash(),
    recordedDueMinor: cash() * p("two") * p("two"),
    existingDebtMinor: p("zero"),
    source,
    facility: {
      lenderId: "lender:fixture",
      lenderCashMinor: cash(),
      limitMinor: cash() * p("daysPerWeek"),
      honored: true,
      source,
    },
    ...overrides,
  };
}

describe("pure employer books candidate (no money writer)", () => {
  it("preserves every compiled IRS ratio and the suppressed-cost estimated flag", () => {
    const original = IRS_TOWN_BUSINESS_BOOKS.split(";");
    expect(data.kinds.length).toBe(original.length);
    for (const cell of original) {
      const [id, encoded] = cell.split("=");
      const [margin, payroll, cost, estimated] = encoded!
        .split(",")
        .map(Number);
      const row = data.kinds.find((kind) => kind.id === id)!;
      expect(p(row.marginParameter)).toBe(margin);
      expect(p(row.payrollShareParameter)).toBe(payroll);
      expect(p(row.salesCostShareParameter)).toBe(cost);
      expect(row.salesCostEstimated).toBe(estimated === p("one"));
      expect(PARAMETERS[row.salesCostShareParameter]!.tag).toBe(
        row.salesCostEstimated ? "ESTIMATED" : "SOURCED",
      );
      expect(PARAMETERS[row.marginParameter]!.spread).toBeUndefined();
    }
  });

  it("opens only mapped businesses, preserves existing cash, and never establishes a receipt", () => {
    for (const mapping of data.classifications) {
      const input = {
        organizationId: `employer:${mapping.classification}`,
        classification: mapping.classification,
        at: "2021-01-01",
        annualPlannedPayMinor: plannedPay(),
        existingCashMinor: cash(),
        source,
      };
      const before = structuredClone(input),
        result = projectOpeningBusiness(input);
      expect(input).toEqual(before);
      if (mapping.kindId === null) {
        expect(result.books).toBeUndefined();
        expect(result.gap).toBe(data.reasons.outsideBusinessScope);
      } else {
        expect(result.books!.kindId).toBe(mapping.kindId);
        expect(result.books!.existingCashMinor).toBe(input.existingCashMinor);
        expect(result.books!.annualDemandMinor).toBeGreaterThan(
          input.annualPlannedPayMinor,
        );
        expect(result.books!.source.tag).toBe("ESTIMATED");
        expect(result.books!.source.generationPriorVintage).toBe(
          data.source.vintage,
        );
        expect(result.books!.source.estimatedFrom).toContain(
          "not cash receipts",
        );
        expect(result).not.toHaveProperty("paidMinor");
      }
    }
  });

  it("supports new classification data without a place or situation branch", () => {
    const classification = "enterprise:fixture-new-kind";
    expect(classifyBusiness(classification).gap).toBe(
      data.reasons.unknownClassification,
    );
    const modData: BusinessBooksData = {
      ...data,
      classifications: [
        ...data.classifications,
        {
          classification,
          kindId: "retail",
          fundingRoute: "business",
          citation: "Explicit authored mod mapping fixture.",
          stopgapId: "SG-P8-business-books-classification",
        },
      ],
    };
    expect(classifyBusiness(classification, { data: modData }).kind?.id).toBe(
      "retail",
    );
    expect(classifyBusiness(classification).kind).toBeUndefined();
  });

  it("keeps reached-income/demand results equivalent under constant-target observation partitions", () => {
    const whole = projectMarket(market());
    const first = projectMarket(market({ to: "2021-01-04" }));
    const second = projectMarket(
      market({
        from: "2021-01-04",
        priorReachedIncomeMinor: first.reachedIncomeMinor,
      }),
    );
    expect(second.reachedIncomeMinor).toBeCloseTo(
      whole.reachedIncomeMinor,
      digits(),
    );
    expect(second.annualDemandMinor!).toBeCloseTo(
      whole.annualDemandMinor!,
      digits(),
    );
    const noIncome = projectMarket(
      market({ currentTownIncomeMinor: p("zero") }),
    );
    expect(noIncome.reachedIncomeMinor).toBeLessThan(cash());
    expect(Number.isFinite(noIncome.annualDemandMinor)).toBe(true);
    const missing = projectMarket(market({ anchorTownIncomeMinor: p("zero") }));
    expect(missing.annualDemandMinor).toBeUndefined();
    expect(missing.gap).toBe(data.reasons.missingIncomeAnchor);
  });

  it("retains market member order and responds to price/capacity while leaving unsupported demand unallocated", () => {
    const members = [
      {
        organizationId: "firm:b",
        capacityMinor: cash(),
        relativePrice: p("one"),
      },
      {
        organizationId: "firm:a",
        capacityMinor: cash(),
        relativePrice: p("two"),
      },
    ];
    const split = splitMarketDemand(plannedPay(), members);
    expect(split.allocations.map((row) => row.organizationId)).toEqual(
      members.map((row) => row.organizationId),
    );
    expect(split.allocations[p("zero")]!.annualDemandMinor).toBeGreaterThan(
      split.allocations[p("one")]!.annualDemandMinor,
    );
    expect(
      split.allocations.reduce(
        (sum, row) => sum + row.annualDemandMinor,
        p("zero"),
      ),
    ).toBeCloseTo(plannedPay(), digits());
    const empty = splitMarketDemand(plannedPay(), []);
    expect(empty.unallocatedAnnualDemandMinor).toBe(plannedPay());
    expect(empty.gap).toBe(data.reasons.missingCapacity);
    expect(() =>
      splitMarketDemand(plannedPay(), [...members, members[p("zero")]!]),
    ).toThrow(/unique organization/);
  });

  it("reads live parameter overrides without an identity cache or changing input objects", () => {
    const registry: Record<string, Parameter> = {
      ...PARAMETERS,
      businessRivalPriceElasticity: {
        ...PARAMETERS.businessRivalPriceElasticity!,
      },
    };
    const members = [
      {
        organizationId: "firm:a",
        capacityMinor: cash(),
        relativePrice: p("one"),
      },
      {
        organizationId: "firm:b",
        capacityMinor: cash(),
        relativePrice: p("two"),
      },
    ];
    const before = structuredClone(members);
    const first = splitMarketDemand(plannedPay(), members, {
      parameters: registry,
    });
    registry.businessRivalPriceElasticity!.value = p("zero");
    const second = splitMarketDemand(plannedPay(), members, {
      parameters: registry,
    });
    expect(second.allocations[p("zero")]!.annualDemandMinor).toBe(
      second.allocations[p("one")]!.annualDemandMinor,
    );
    expect(first.allocations).not.toEqual(second.allocations);
    expect(members).toEqual(before);
  });

  it("keeps fixed costs at zero sales and moves variable costs and prices without changing cash", () => {
    const input = {
      kindId: "retail",
      openingAnnualOtherCostsMinor: plannedPay(),
      annualDemandMinor: p("zero"),
      capacityMinor: plannedPay(),
      generalPriceFactor: p("one"),
    };
    const idle = projectOtherCosts(input),
      active = projectOtherCosts({ ...input, annualDemandMinor: plannedPay() });
    expect(idle.annualOtherCostsMinor).toBeGreaterThan(p("zero"));
    expect(idle.annualOtherCostsMinor).toBeLessThan(
      active.annualOtherCostsMinor,
    );
    expect(active.annualOtherCostsMinor).toBeCloseTo(plannedPay(), digits());
    expect(
      projectOtherCosts({ ...input, kindId: "insurance" }).salesCostEstimated,
    ).toBe(true);
    const priceInput = {
      priorPrice: p("one"),
      annualPlannedPayMinor: plannedPay(),
      annualOtherCostsMinor: plannedPay(),
      wagePriceFactor: p("one"),
      generalPriceFactor: p("one"),
      annualDemandMinor: plannedPay(),
      capacityMinor: plannedPay(),
    };
    expect(projectBusinessPrice(priceInput)).toBe(p("one"));
    expect(
      projectBusinessPrice({ ...priceInput, generalPriceFactor: p("two") }),
    ).toBeGreaterThan(p("one"));
    expect(() =>
      projectOtherCosts({
        ...input,
        annualDemandMinor: plannedPay(),
        capacityMinor: p("zero"),
      }),
    ).toThrow(/positive capacity/);
    expect(() =>
      projectBusinessPrice({ ...priceInput, capacityMinor: p("zero") }),
    ).toThrow(/positive capacity/);
    expect(
      projectBusinessPrice({
        ...priceInput,
        annualDemandMinor: p("zero"),
        capacityMinor: p("zero"),
      }),
    ).toBe(p("one"));
  });

  it("limits borrowing by actual lender cash, preserves debt, and reports the actual binding shortage", () => {
    const input = funding(),
      before = structuredClone(input),
      plan = planBusinessFunding(input);
    expect(plan.borrowMinor).toBe(input.facility!.lenderCashMinor);
    expect(plan.unfundedDueMinor).toBeGreaterThan(p("zero"));
    expect(plan.lenderCashAfterPlanMinor).toBe(p("zero"));
    expect(plan.debtAfterPlanMinor).toBe(
      input.existingDebtMinor + plan.borrowMinor,
    );
    expect(plan.closingEvidence?.reason).toBe(data.reasons.lenderCashExhausted);
    expect(
      plan.cashAfterPlanMinor +
        plan.lenderCashAfterPlanMinor! +
        plan.plannedPaidMinor,
    ).toBe(input.existingCashMinor + input.facility!.lenderCashMinor);
    expect(input).toEqual(before);
    const line = funding({
      facility: {
        ...input.facility!,
        lenderCashMinor: plannedPay(),
        limitMinor: cash(),
      },
    });
    expect(planBusinessFunding(line).closingEvidence?.reason).toBe(
      data.reasons.lineExhausted,
    );
    const refused = planBusinessFunding(
      funding({ facility: { ...input.facility!, honored: false } }),
    );
    expect(refused.borrowMinor).toBe(p("zero"));
    expect(refused.closingEvidence?.reason).toBe(
      data.reasons.facilityNotHonored,
    );
    const missing = planBusinessFunding(
      funding({ facility: undefined, existingDebtMinor: cash() }),
    );
    expect(missing.borrowMinor).toBe(p("zero"));
    expect(missing.debtAfterPlanMinor).toBe(cash());
    expect(missing.gap).toBe(data.reasons.missingFacility);
  });

  it("repays only an existing creditor from remaining cash and never treats a line-size prior as funded approval", () => {
    const input = funding({
      existingCashMinor: plannedPay(),
      recordedDueMinor: p("zero"),
      existingDebtMinor: cash(),
    });
    const plan = planBusinessFunding(input);
    expect(plan.borrowMinor).toBe(p("zero"));
    expect(plan.repayMinor).toBe(input.existingDebtMinor);
    expect(plan.debtAfterPlanMinor).toBe(p("zero"));
    expect(plan.cashAfterPlanMinor + plan.lenderCashAfterPlanMinor!).toBe(
      input.existingCashMinor + input.facility!.lenderCashMinor,
    );
    expect(plan.closingEvidence).toBeUndefined();
    expect(estimateCreditLimit(plannedPay(), "retail")).toBeGreaterThan(
      p("zero"),
    );
    expect(estimateCreditLimit(plannedPay(), "farm")).toBeUndefined();
    expect(
      planBusinessFunding(funding({ facility: undefined })).borrowMinor,
    ).toBe(p("zero"));
  });

  it("rejects malformed cash and future sources before any caller can use a funding plan", () => {
    expect(() =>
      planBusinessFunding(funding({ existingCashMinor: p("negativeOne") })),
    ).toThrow(/nonnegative/);
    expect(() =>
      planBusinessFunding(funding({ existingCashMinor: p("one") / p("two") })),
    ).toThrow(/safe integer/);
    expect(() =>
      planBusinessFunding(
        funding({
          facility: {
            ...funding().facility!,
            lenderCashMinor: p("one") / p("zero"),
          },
        }),
      ),
    ).toThrow(/nonnegative/);
    expect(() =>
      planBusinessFunding(
        funding({ source: { ...source, asOf: "2021-01-02" } }),
      ),
    ).toThrow(/future/);
    expect(() => projectMarket(market({ from: "2021-01-09" }))).toThrow(
      /elapsed market/,
    );
  });
});
