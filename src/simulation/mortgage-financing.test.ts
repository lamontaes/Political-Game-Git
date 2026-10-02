import { beforeAll, describe, expect, it } from "vitest";
import { explicitNewGameSetup } from "../presentation/new-game-geography";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { SeededRng } from "./rng";
import { personName } from "./people";

import {
  mortgageFinancingQuote,
  openingMortgageFinancingQuote,
  openMortgageFinancing,
} from "./mortgage-financing";
import { homePurchaseTerms } from "./home-purchase";
import { homeDownPaymentShare } from "./home-down-payment";
import {
  householdLoansOf,
  householdLoanMonthHandler,
  HOUSEHOLD_LOAN_MONTH_KEY,
} from "./household-loans";
import {
  amortizedMonthlyPaymentMinor,
  monthlyInterestMinor,
} from "./public-benefit-formulas";
import { macroScopeForJurisdiction } from "./macro-economy/readers";
import type { MacroMonthRecord } from "./macro-economy/types";
import { addDays, daysBetween } from "./dates";
import { createWorld, advanceWorld, worldLineage } from "./world";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import { money, createResourcePosition } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";

const seed = "a53-recorded-mortgage";
let opening: World;
let borrowerId: EntityId;
let home: EntityId;
let recorded: MacroMonthRecord;
beforeAll(() => {
  const rng = new SeededRng(seed);
  const state = rng.pick(lifePlaceStateIdentities());
  const places = searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  expect(places.length).toBeGreaterThan(0);
  const place = rng.pick(places);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...explicitNewGameSetup({ placeKey: place.key, seed }),
      startAge: 40,
      startingLife: "ordinary-life",
      questionnaire: "skipped",
    }),
  ).game!;
  opening = game.world;
  borrowerId = game.playerPersonId;
  home = opening.people[borrowerId]!.homeJurisdictionId;
  const initialQuote = quote(opening);
  expect(
    initialQuote,
    "The approved opening game rate must produce a quote",
  ).not.toBeNull();
  expect(initialQuote!.rateBasis).toBe("opening-game-reference");
  const initial = opening.macroEconomy!.start.initial;
  // Explicit unit-only monthly inputs, not observed market rates or a claim
  // that the opening already contains a closed month.
  recorded = {
    key: "a53:unit-macro-month",
    scope: "national",
    ordinal: 0,
    periodStart: opening.currentDate,
    periodEnd: opening.currentDate,
    recordedAt: opening.currentDate,
    growthPct: initial.realGrowthAnnualPct,
    unemploymentPct: initial.unemploymentPct,
    inflationPct: initial.inflation12mPct,
    realOutputIndex: 100,
    priceIndex: 100,
    realIncomeIndex: null,
    housing: {
      supplyDemandRatio: initial.housingSupplyDemandRatio,
      supplyUnits: null,
      demandHouseholds: null,
      classification: "adequate",
    },
    exposure: null,
    creditTightness: initial.creditTightness,
    policyRate: {
      lowerPct: initialQuote!.policyAnnualRateBasisPoints / 100,
      upperPct: initialQuote!.policyAnnualRateBasisPoints / 100,
      basis: "retained-reference",
      decisionEventId: null,
    },
    innovations: { growth: 0, unemployment: 0, inflation: 0 },
    impulses: { growthPp: 0, laborPp: 0, pricePp: 0 },
    shockKeys: [],
  };
  process.stdout.write(
    JSON.stringify({
      audit: "A53",
      seed,
      place: place.displayName,
      placeKey: place.key,
      selectedState: state.name,
      eligibleLocalities: places.length,
      currentDate: opening.currentDate,
      person: personName(opening.people[borrowerId]!),
      personId: borrowerId,
      rateReferenceKey: initialQuote!.rateReferenceKey,
      openingRateBasis: initialQuote!.rateBasis,
      annualRateBasisPoints: initialQuote!.annualRateBasisPoints,
      policyAnnualRateBasisPoints: initialQuote!.policyAnnualRateBasisPoints,
      mortgageSpreadBasisPoints: initialQuote!.mortgageSpreadBasisPoints,
    }) + "\n",
  );
});

// Explicit monthly-record unit controls; no claim of observed market rates.
// The ordinary opening and its actual person remain separately tested.
function withMonths(months: readonly MacroMonthRecord[]): World {
  return { ...opening, macroEconomy: { ...opening.macroEconomy!, months } };
}
function month(
  key: string,
  scope: MacroMonthRecord["scope"],
  lowerPct: number,
  upperPct: number,
): MacroMonthRecord {
  return {
    ...recorded,
    key,
    scope,
    recordedAt: opening.currentDate,
    policyRate: { ...recorded.policyRate, lowerPct, upperPct },
  };
}
const principal = money(120_000, "USD");
function quote(world: World) {
  return mortgageFinancingQuote(world, {
    principal,
    jurisdictionId: home,
    rateCap: null,
  });
}
function loanInput() {
  return {
    stableKey: "a53:actual-borrower:mortgage",
    borrower: { kind: "person" as const, personId: borrowerId },
    lenderOrganizationId: null,
    lenderKind: "bank" as const,
    principal,
    rateCap: null,
    lateFee: null,
    missedPaymentsToDefault: 3,
    missedPaymentsToCollections: 6,
    jurisdictionId: home,
    housingTenureId: null,
    provenance: {
      kind: "authored" as const,
      note: "Explicit fictional mortgage terms for the actual opening borrower.",
    },
  };
}

describe("A53 mortgage rates are saved macro inputs", () => {
  it("amortizes the opening home's cited principal without restarting its term", () => {
    const terms = homePurchaseTerms(opening, home, borrowerId);
    const down = homeDownPaymentShare(opening, "first-time");
    expect(down.basis).toBe("sourced-opening-median");
    const input = {
      homePrice: money(terms.priceMinor, "USD"),
      downPaymentShare: down.share,
      paidMonths: 0,
      jurisdictionId: home,
      rateCap: null,
    };
    const newlyPaid = openingMortgageFinancingQuote(opening, input)!;
    expect(newlyPaid.originalPrincipalMinor).toBe(
      Math.round(terms.priceMinor * (1 - down.share)),
    );
    expect(newlyPaid.remainingPrincipalMinor).toBe(
      newlyPaid.originalPrincipalMinor,
    );
    const aged = openingMortgageFinancingQuote(opening, {
      ...input,
      paidMonths: 120,
    })!;
    expect(aged.remainingTermMonths).toBe(240);
    expect(aged.remainingPrincipalMinor).toBeGreaterThan(0);
    expect(aged.remainingPrincipalMinor).toBeLessThan(
      newlyPaid.originalPrincipalMinor,
    );
    expect(aged.monthlyPaymentMinor).toBe(
      amortizedMonthlyPaymentMinor(
        aged.remainingPrincipalMinor,
        aged.annualRateBasisPoints,
        aged.remainingTermMonths,
      ),
    );
    const paidOff = openingMortgageFinancingQuote(opening, {
      ...input,
      paidMonths: 360,
    })!;
    expect(paidOff.remainingPrincipalMinor).toBe(0);
    expect(paidOff.remainingTermMonths).toBe(0);
    expect(paidOff.monthlyPaymentMinor).toBe(0);
    expect(
      openingMortgageFinancingQuote(opening, {
        ...input,
        paidMonths: 480,
      }),
    ).toEqual(paidOff);
  });

  it("refuses invalid opening age, price and share rather than inventing debt", () => {
    const input = {
      homePrice: principal,
      downPaymentShare: 0.1,
      paidMonths: 0,
      jurisdictionId: home,
      rateCap: null,
    };
    for (const changed of [
      { paidMonths: -1 },
      { paidMonths: 1.5 },
      { downPaymentShare: Number.NaN },
      { downPaymentShare: 1.01 },
      { homePrice: money(0, "USD") },
    ])
      expect(
        openingMortgageFinancingQuote(opening, { ...input, ...changed }),
      ).toBeNull();
  });

  it("adds the cited spread to the local policy midpoint before caps and shared payment", () => {
    const local = macroScopeForJurisdiction(home);
    const world = withMonths([
      month("a53:national", "national", 8, 10),
      month("a53:local-old", local, 2, 4),
      month("a53:local-latest", local, 4, 6),
    ]);
    const before = JSON.stringify(world);
    expect(quote(world)).toEqual({
      policyAnnualRateBasisPoints: 500,
      mortgageSpreadBasisPoints: 252.5,
      mortgageSpreadReferenceKey: "fred-mortgage-policy-spread:2025-12-31",
      marketAnnualRateBasisPoints: 752.5,
      annualRateBasisPoints: 752.5,
      termMonths: 360,
      monthlyPaymentMinor: amortizedMonthlyPaymentMinor(
        principal.minorUnits,
        752.5,
        360,
      ),
      macroMonthKey: "a53:local-latest",
      rateReferenceKey: "a53:local-latest",
      rateBasis: "recorded-macro-month",
      scope: local,
      recordedAt: opening.currentDate,
    });
    expect(JSON.stringify(world)).toBe(before);
    const capped = mortgageFinancingQuote(world, {
      principal,
      jurisdictionId: home,
      // Explicit cap identity for this pure arithmetic control only.
      rateCap: {
        capBasisPoints: 600,
        measureId: "measure:a53-unit-cap" as EntityId,
      },
    });
    expect(capped?.marketAnnualRateBasisPoints).toBe(752.5);
    expect(capped?.annualRateBasisPoints).toBe(600);
    expect(capped?.monthlyPaymentMinor).toBe(
      amortizedMonthlyPaymentMinor(principal.minorUnits, 600, 360),
    );
  });
  it("falls back to saved national rate and excludes future local records", () => {
    const future = {
      ...month("a53:future", macroScopeForJurisdiction(home), 20, 30),
      recordedAt: addDays(opening.currentDate, 1),
    };
    const world = withMonths([month("a53:national", "national", 3, 4), future]);
    expect(quote(world)?.policyAnnualRateBasisPoints).toBe(350);
    expect(quote(world)?.marketAnnualRateBasisPoints).toBe(602.5);
    expect(quote(world)?.scope).toBe("national");
    expect(
      mortgageFinancingQuote(world, {
        principal,
        jurisdictionId: null,
        rateCap: null,
      }),
    ).toEqual(quote(world));
  });
  it("refuses absent macro history, future starts and invalid rates without writing debt", () => {
    const future = {
      ...month("a53:future-only", "national", 3, 4),
      recordedAt: addDays(opening.currentDate, 1),
    };
    const controls = [
      { ...opening, macroEconomy: undefined },
      {
        ...withMonths([future]),
        macroEconomy: {
          ...opening.macroEconomy!,
          start: {
            ...opening.macroEconomy!.start,
            effectiveDate: addDays(opening.currentDate, 1),
          },
          months: [future],
        },
      },
      withMonths([month("a53:negative", "national", -1, 1)]),
      withMonths([month("a53:reversed", "national", 6, 4)]),
      withMonths([month("a53:not-finite", "national", Number.NaN, 4)]),
    ];
    for (const world of controls) {
      const before = world.history;
      expect(quote(world)).toBeNull();
      expect(openMortgageFinancing(world, loanInput())).toBeNull();
      expect(world.history).toBe(before);
    }
  });
  it("writes actual flow, obligation and loan terms, then one saved monthly receipt", () => {
    // Isolated writer fixture: actual opening person/jurisdictions and saved
    // macro start, with explicitly authored cash and contract inputs. It has
    // no unrelated pending ordinary-life events to step over.
    const base = createWorld({
      seed: opening.seed,
      lineage: worldLineage(opening),
      currentMoment: opening.currentMoment,
      currentDate: opening.currentDate,
      control: { kind: "person", personId: borrowerId },
      jurisdictions: opening.jurisdictionOrder.map(
        (id) => opening.jurisdictions[id]!,
      ),
      people: opening.personOrder.map((id) => opening.people[id]!),
      policyCatalog: opening.policyCatalog,
    });
    const world = createResourcePosition(
      { ...base, macroEconomy: opening.macroEconomy },
      {
        stableKey: "a53:authored-loan-cash",
        owner: { kind: "person", personId: borrowerId },
        openedAt: base.currentDate,
        openingBalance: money(500_000, "USD"),
        provenance: {
          kind: "authored",
          note: "Explicit unit-fixture cash, not an observed earned income.",
        },
      },
    );
    const quoted = quote(world)!;
    expect(quoted).not.toBeNull();
    const opened = openMortgageFinancing(world, loanInput());
    expect(opened).not.toBeNull();
    const reading = householdLoansOf(opened!, {
      kind: "person",
      personId: borrowerId,
    }).find(
      (loan) => loan.obligation.stableKey === `${loanInput().stableKey}:debt`,
    )!;
    expect(reading).toBeDefined();
    expect(reading.terms.kind).toBe("mortgage");
    expect(reading.terms.annualRateBasisPoints).toBe(
      quoted.annualRateBasisPoints,
    );
    expect(reading.terms.repayment).toEqual({
      kind: "installment",
      termMonths: 360,
    });
    expect(reading.balance?.minorUnits).toBe(principal.minorUnits);
    expect(reading.monthlyPayment?.minorUnits).toBe(quoted.monthlyPaymentMinor);
    const flow = opened!.history.resourceFlows.find(
      (item) => item.id === reading.obligation.resourceFlowId,
    )!;
    expect(flow.source).toEqual({ kind: "person", personId: borrowerId });
    const due = opened!.history.futureDueItems.find(
      (item) => item.transitionKey === HOUSEHOLD_LOAN_MONTH_KEY,
    )!;
    expect(due).toBeDefined();
    const registry = createFutureTransitionHandlerRegistry([
      [HOUSEHOLD_LOAN_MONTH_KEY, householdLoanMonthHandler],
    ]);
    const elapsed = daysBetween(opened!.currentDate, due.dueAt);
    const serviced = advanceWorld(opened!, elapsed, registry);
    const receipt = serviced.history.resourceTransferOutcomes.find(
      (item) =>
        item.resourceFlowId === flow.id && item.occurredAt === due.dueAt,
    )!;
    expect(receipt).toBeDefined();
    expect(receipt.status).toBe("completed");
    expect(receipt.transferredAmount.minorUnits).toBe(
      quoted.monthlyPaymentMinor,
    );
    expect(receipt.attemptedAmount.minorUnits).toBe(
      reading.monthlyPayment!.minorUnits,
    );
    const charge = serviced.history.debtCharges!.find(
      (item) =>
        item.resourceObligationId === reading.obligation.id &&
        item.chargedAt === due.dueAt &&
        item.kind === "interest",
    )!;
    expect(charge.amount.minorUnits).toBe(
      monthlyInterestMinor(principal.minorUnits, quoted.annualRateBasisPoints),
    );
    expect(charge.loanTermsId).toBe(reading.terms.id);
    const aged = openingMortgageFinancingQuote(world, {
      homePrice: principal,
      downPaymentShare: 0,
      paidMonths: 1,
      jurisdictionId: home,
      rateCap: null,
    })!;
    const afterPayment = householdLoansOf(serviced, {
      kind: "person",
      personId: borrowerId,
    }).find((loan) => loan.obligation.id === reading.obligation.id)!;
    expect(aged.remainingPrincipalMinor).toBe(afterPayment.balance!.minorUnits);
    expect(aged.remainingTermMonths).toBe(359);
    const saved = serializeWorld(serviced);
    expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
    const reopenedInput = deserializeWorld(serializeWorld(opened!));
    expect(serializeWorld(advanceWorld(reopenedInput, elapsed, registry))).toBe(
      saved,
    );
  });
});
