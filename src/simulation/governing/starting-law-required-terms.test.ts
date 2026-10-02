import { readFileSync } from "node:fs";
import { stdout } from "node:process";
import incomeTables from "../../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import { stableHash } from "../ids";
import { placeReferencePopulation } from "../nationwide-world/place-population";
import {
  observerSetup,
  openObserverWorld,
  advanceObservedWorld,
} from "../../presentation/observer-world";
import { lawInForce } from "./law-in-force";
import { readFinalEnactedLawTerm } from "./final-law-term-query";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  stateIncomeTaxUnderLaw,
} from "../state-income-tax-law";
import { assessPaychecksTaxes } from "../statutory-tax";
import { serializeWorld, deserializeWorld } from "../serialization";

import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  assertLawCategories,
  assertLawSchedules,
  type LawScheduleTerm,
} from "../law-structured-terms";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createWorld } from "../world";
import { makeIsoDate } from "../dates";
import { LAW_AMOUNT_UNITS } from "../law-consequence-types";
import {
  RENT_STABILIZATION_QUESTION,
  RENT_COVERAGE_VALUES,
} from "../law-consequences/rent-stabilization-row";
import {
  searchLifePlaces,
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";

interface Parameter {
  readonly key: string;
  readonly unit: string;
  readonly allowedValues?: readonly string[];
}
interface Term {
  readonly questionKey: string;
  readonly key: string;
  readonly unit: string;
  readonly value: number;
}
interface Row {
  readonly answer: string;
  readonly lawTerms?: readonly Term[];
  readonly lawSchedules?: readonly LawScheduleTerm[];
  readonly lawCategories?: readonly {
    readonly questionKey: string;
    readonly key: string;
    readonly values: readonly string[];
  }[];
  readonly operativeAt?: string;
  readonly before?: Row;
  readonly phases?: readonly Row[];
}

/** Canonical units used by the existing scalar readers; no conversion of values. */
const SCALAR_UNITS: Readonly<Record<string, string>> = {
  "annual-taxable-income-usd": "minor",
  "annual-tuition-usd": "dollars/year",
  "annual-usd-per-enrollee": "dollars/year",
  "annual-usd-per-full-time-teacher": "dollars/year",
  "annual-usd-per-library-service-population": "dollars/year",
  "annual-usd-per-pupil": "dollars/year",
  "annual-usd-per-student": "dollars/year",
  "usd-per-budget-year": "dollars/year",
  "usd-per-federal-fiscal-year": "dollars/year",
  "usd-per-recipient-per-year": "dollars/year",
  "annual-covered-wage-cap-dollars-per-year": "dollars/year",
  "dollars/year": "dollars/year",
  "required-spending-reduction-usd": "minor",
  "usd-federal-debt-limit": "minor",
  "usd-forgiven-per-borrower": "minor",
  "usd-per-award": "minor",
  "usd-per-work-hour": "minor/hour",
  "hourly-rate": "minor/hour",
  "basis-points": "basis-points",
  "usd-per-container": "minor/container",
  "usd-per-tonne-co2-equivalent": "minor/tonne-co2-equivalent",
  "employee-premium-basis-points-of-covered-wages": "basis-points",
  "annual-percentage": "ratio",
  "annual-percentage-increase": "ratio",
  "annual-percentage-rate": "ratio",
  "additional-vehicle-service-hours": "hours",
  "qualifying-hours-per-month": "hours",
  "months-of-custody": "months",
  "years-of-age": "years",
  "upper-age-of-juvenile-jurisdiction": "years",
  "years-after-leaving": "years",
  "consecutive-terms": "count",
  "dwellings-per-parcel": "count",
  "admissions-per-fiscal-year": "count",
};

// These need a compound/dimensional contract, not a fabricated scalar. Keep
// them in the guard so their yes rows cannot disappear from the failure list.
const NON_SCALAR_NUMERIC = new Set([
  "income-thresholds-and-marginal-rates",
  "share-by-year",
  "weeks-of-paid-leave",
  "weeks-of-pregnancy",
  "usd-per-ride",
  "usd-per-vehicle-mile",
  "water-volume-per-permit-period",
  "co2-mass-per-electricity-output-unit",
]);

const SCHEMA_WORLD = createWorld({
  seed: "starting-law-required-term-validation",
  currentDate: makeIsoDate("2026-01-01"),
  people: [],
  jurisdictions: [
    stateJurisdictionForKey(lifePlaceStateIdentities()[0]!.jurisdictionKey)!,
  ],
  policyCatalog: createProductionPolicyCatalog(),
});

function numericUnit(unit: string): string | null | undefined {
  if (LAW_AMOUNT_UNITS.some((candidate) => candidate === unit)) return unit;
  if (
    unit.startsWith("share-of-") ||
    unit === "state-share-of-eligible-disaster-cost"
  )
    return "ratio";
  if (unit in SCALAR_UNITS) return SCALAR_UNITS[unit];
  if (NON_SCALAR_NUMERIC.has(unit)) return null;
  return undefined; // Categorical and yes/no parameters are not numeric terms.
}

function requirements(): ReadonlyMap<string, readonly Parameter[]> {
  const result = new Map<string, Map<string, Parameter>>();
  const put = (questionKey: string, parameter: Parameter) => {
    const row = result.get(questionKey) ?? new Map<string, Parameter>();
    row.set(parameter.key, parameter);
    result.set(questionKey, row);
  };
  // The registered catalog includes categories added by existing kind rows.
  // Raw packs alone omit those active closed coverage contracts.
  for (const id of SCHEMA_WORLD.policyCatalog.propositionOrder) {
    const question = SCHEMA_WORLD.policyCatalog.propositions[id]!;
    for (const parameter of question.parameters)
      put(question.stableKey, {
        key: parameter.key,
        unit: parameter.value,
        ...(parameter.allowedValues
          ? { allowedValues: parameter.allowedValues }
          : {}),
      });
  }
  for (let batch = 1; batch <= 5; batch += 1) {
    const content = JSON.parse(
      readFileSync(
        new URL(
          `../../../data/research/laws/catalog-terms-batch-0${batch}.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      laws: readonly {
        questionKey: string;
        parameters: readonly Parameter[];
      }[];
    };
    for (const question of content.laws)
      for (const parameter of question.parameters) {
        const active = result.get(question.questionKey)?.get(parameter.key);
        // Preserve numeric research requirements that still await catalog
        // admission, without erasing an active category's declared choices.
        put(question.questionKey, active?.allowedValues ? active : parameter);
      }
  }
  return new Map(
    [...result].map(([key, value]) => [
      key,
      [...value.values()].filter(
        (parameter) =>
          parameter.allowedValues?.length ||
          numericUnit(parameter.unit) !== undefined,
      ),
    ]),
  );
}

function missingTerms(
  questionKey: string,
  row: Row,
  parameters: readonly Parameter[],
): string[] {
  if (row.answer !== "yes") return [];
  return parameters.flatMap((parameter) => {
    const unit = numericUnit(parameter.unit);
    const categories = (row.lawCategories ?? []).filter(
      (term) => term.questionKey === questionKey && term.key === parameter.key,
    );
    const matches = (row.lawTerms ?? []).filter(
      (term) => term.questionKey === questionKey && term.key === parameter.key,
    );
    const schedules = (row.lawSchedules ?? []).filter(
      (term) => term.questionKey === questionKey && term.key === parameter.key,
    );
    if (parameter.allowedValues?.length) {
      if (categories.length !== 1 || matches.length || schedules.length)
        return [
          `${parameter.key}: expected one unambiguous closed category, found ${categories.length}`,
        ];
      try {
        assertLawCategories(SCHEMA_WORLD, categories);
      } catch (error) {
        return [
          `${parameter.key}: invalid active catalog category (${String(error)})`,
        ];
      }
      return [];
    }
    if (categories.length)
      return [
        `${parameter.key}: category cannot replace numeric ${parameter.unit}`,
      ];
    if (schedules.length) {
      if (schedules.length !== 1 || matches.length)
        return [
          `${parameter.key}: expected one unambiguous scalar or schedule`,
        ];
      const schedule = schedules[0]!;
      const taxTable =
        schedule.kind === "income-tax" &&
        (parameter.unit === "income-thresholds-and-marginal-rates" ||
          parameter.unit === "share-of-taxable-income");
      const dimensionalTiers =
        schedule.kind === "tiers" &&
        (unit === "minor/container" || unit === "minor/tonne-co2-equivalent") &&
        schedule.tiers.every((tier) => tier.amount.unit === unit);
      if (!taxTable && !dimensionalTiers)
        return [
          `${parameter.key}: schedule does not preserve ${parameter.unit}`,
        ];
      try {
        assertLawSchedules(SCHEMA_WORLD, [schedule]);
      } catch (error) {
        return [
          `${parameter.key}: invalid canonical schedule (${String(error)})`,
        ];
      }
      return [];
    }
    if (unit === null)
      return [
        `${parameter.key}: unsupported compound/dimensional contract (${parameter.unit})`,
      ];
    if (matches.length !== 1)
      return [
        `${parameter.key}: expected one numeric term, found ${matches.length}`,
      ];
    const term = matches[0]!;
    if (term.unit !== unit || !Number.isFinite(term.value))
      return [
        `${parameter.key}: expected finite ${unit}, got ${term.value} ${term.unit}`,
      ];
    if (unit?.startsWith("minor") && !Number.isSafeInteger(term.value))
      return [`${parameter.key}: minor units require a safe integer`];
    return [];
  });
}

describe("starting laws carry their active catalog-required terms", () => {
  it("rejects missing, duplicate, wrong-question and wrong-unit terms without requiring yes/no categories", () => {
    const parameters = [{ key: "rate", unit: "share-of-taxable-income" }];
    const term = {
      questionKey: "test:tax",
      key: "rate",
      unit: "ratio",
      value: 0.04,
    };
    expect(
      missingTerms("test:tax", { answer: "yes" }, parameters),
    ).toHaveLength(1);
    expect(missingTerms("test:tax", { answer: "no" }, parameters)).toEqual([]);
    expect(missingTerms("test:tax", { answer: "yes" }, [])).toEqual([]);
    expect(
      missingTerms("test:tax", { answer: "yes", lawTerms: [term] }, parameters),
    ).toEqual([]);
    for (const lawTerms of [
      [term, term],
      [{ ...term, questionKey: "other:tax" }],
      [{ ...term, unit: "minor" }],
      [{ ...term, value: Number.NaN }],
    ])
      expect(
        missingTerms("test:tax", { answer: "yes", lawTerms }, parameters),
      ).toHaveLength(1);
  });

  it("discovers active closed categories and canonical units without static-pack shortcuts", () => {
    const coverage = requirements()
      .get(RENT_STABILIZATION_QUESTION)
      ?.find((parameter) => parameter.key === "coverage");
    expect(coverage?.allowedValues).toEqual(RENT_COVERAGE_VALUES);
    for (const unit of LAW_AMOUNT_UNITS) expect(numericUnit(unit)).toBe(unit);
  });

  it("requires each active closed category without numeric or duplicate stand-ins", () => {
    const parameters = requirements()
      .get(RENT_STABILIZATION_QUESTION)!
      .filter((parameter) => parameter.key === "coverage");
    const category = {
      questionKey: RENT_STABILIZATION_QUESTION,
      key: "coverage",
      values: [RENT_COVERAGE_VALUES[0]!],
    };
    expect(
      missingTerms(RENT_STABILIZATION_QUESTION, { answer: "yes" }, parameters),
    ).toHaveLength(1);
    expect(
      missingTerms(RENT_STABILIZATION_QUESTION, { answer: "no" }, parameters),
    ).toEqual([]);
    expect(
      missingTerms(
        RENT_STABILIZATION_QUESTION,
        { answer: "yes", lawCategories: [category] },
        parameters,
      ),
    ).toEqual([]);
    for (const lawCategories of [
      [category, category],
      [{ ...category, values: ["undeclared-coverage"] }],
      [{ ...category, values: [category.values[0]!, category.values[0]!] }],
      [{ ...category, questionKey: "other:question" }],
    ])
      expect(
        missingTerms(
          RENT_STABILIZATION_QUESTION,
          { answer: "yes", lawCategories },
          parameters,
        ),
      ).toHaveLength(1);
    expect(
      missingTerms(
        RENT_STABILIZATION_QUESTION,
        {
          answer: "yes",
          lawCategories: [category],
          lawTerms: [
            {
              questionKey: category.questionKey,
              key: category.key,
              unit: "count",
              value: 1,
            },
          ],
        },
        parameters,
      ),
    ).toHaveLength(1);
  });

  it("refuses a scalar stand-in for a bracket list", () => {
    expect(
      missingTerms(
        "test:tax",
        {
          answer: "yes",
          lawTerms: [
            {
              questionKey: "test:tax",
              key: "brackets",
              value: 0.04,
              unit: "ratio",
            },
          ],
        },
        [{ key: "brackets", unit: "income-thresholds-and-marginal-rates" }],
      ),
    ).toEqual([
      "brackets: unsupported compound/dimensional contract (income-thresholds-and-marginal-rates)",
    ]);
  });

  it("admits canonical tax schedules and rejects duplicates or invalid brackets", () => {
    const questionKey = "us-policy-positions:fiscal.graduated-income-tax";
    const table: LawScheduleTerm = {
      questionKey,
      key: "brackets",
      kind: "income-tax",
      schedule: {
        standardDeductionMinor: 0,
        sourceUrl: "https://example.test/guard-fixture",
        brackets: [
          { overMinor: 0, rateBasisPoints: 100 },
          { overMinor: 100, rateBasisPoints: 200 },
        ],
      },
    };
    const parameters = [
      { key: "brackets", unit: "income-thresholds-and-marginal-rates" },
    ];
    expect(
      missingTerms(
        questionKey,
        { answer: "yes", lawSchedules: [table] },
        parameters,
      ),
    ).toEqual([]);
    expect(
      missingTerms(
        questionKey,
        { answer: "yes", lawSchedules: [table, table] },
        parameters,
      ),
    ).toHaveLength(1);
    expect(
      missingTerms(
        questionKey,
        {
          answer: "yes",
          lawSchedules: [
            {
              ...table,
              schedule: {
                ...table.schedule,
                brackets: [{ overMinor: 100, rateBasisPoints: 100 }],
              },
            },
          ],
        },
        parameters,
      ),
    ).toHaveLength(1);
  });

  it("preserves a deposit denominator in both scalar and tiered terms", () => {
    const questionKey = "us-policy-positions:environment-energy.bottle-deposit";
    const parameters = [{ key: "deposit", unit: "usd-per-container" }];
    expect(
      missingTerms(
        questionKey,
        {
          answer: "yes",
          lawTerms: [
            { questionKey, key: "deposit", value: 5, unit: "minor/container" },
          ],
        },
        parameters,
      ),
    ).toEqual([]);
    expect(
      missingTerms(
        questionKey,
        {
          answer: "yes",
          lawTerms: [{ questionKey, key: "deposit", value: 5, unit: "minor" }],
        },
        parameters,
      ),
    ).toHaveLength(1);
    const tiered: LawScheduleTerm = {
      questionKey,
      key: "deposit",
      kind: "tiers",
      tiers: [
        {
          threshold: 0,
          unit: "fluid-ounces",
          amount: { value: 5, unit: "minor/container" },
        },
        {
          threshold: 24,
          unit: "fluid-ounces",
          amount: { value: 10, unit: "minor/container" },
        },
      ],
    };
    expect(
      missingTerms(
        questionKey,
        { answer: "yes", lawSchedules: [tiered] },
        parameters,
      ),
    ).toEqual([]);
    expect(
      missingTerms(
        questionKey,
        {
          answer: "yes",
          lawSchedules: [
            {
              ...tiered,
              tiers: tiered.tiers.map((tier) => ({
                ...tier,
                amount: { ...tier.amount, unit: "minor" },
              })),
            },
          ],
        },
        parameters,
      ),
    ).toHaveLength(1);
  });

  it("covers every yes row and its separate before/phase rules", () => {
    const required = requirements();
    const questions = startingLaw.questions as unknown as Readonly<
      Record<string, { answers: Readonly<Record<string, Row>> }>
    >;
    const failures: string[] = [];
    const gaps: {
      questionKey: string;
      place: string;
      phase: string;
      reason: string;
    }[] = [];
    let affirmativeDatedRows = 0;
    for (const [questionKey, question] of Object.entries(questions)) {
      const parameters = required.get(questionKey) ?? [];
      for (const [place, row] of Object.entries(question.answers)) {
        const dated = [
          { row, phase: row.operativeAt ?? startingLaw.defaultOperativeAt },
          ...(row.before ? [{ row: row.before, phase: "before" }] : []),
          ...(row.phases ?? []).map((phase) => ({
            row: phase,
            phase: phase.operativeAt ?? "MISSING DATE",
          })),
        ];
        for (const entry of dated) {
          if (entry.row.answer === "yes" && parameters.length)
            affirmativeDatedRows += 1;
          for (const failure of missingTerms(
            questionKey,
            entry.row,
            parameters,
          )) {
            failures.push(
              `${questionKey} | ${place} | ${entry.phase} | ${failure}`,
            );
            gaps.push({
              questionKey,
              place,
              phase: entry.phase,
              reason: failure,
            });
          }
        }
      }
    }
    console.info(
      "TEAM6_REQUIRED_TERM_INVENTORY=" +
        JSON.stringify({
          questions: [...required].filter(([, parameters]) => parameters.length)
            .length,
          requiredParameters: [...required.values()].reduce(
            (sum, parameters) => sum + parameters.length,
            0,
          ),
          affirmativeDatedRows,
          missingOrUnsupported: gaps.length,
          inventory: [...required]
            .filter(([, parameters]) => parameters.length)
            .map(([questionKey, parameters]) => ({ questionKey, parameters })),
          gaps,
        }),
    );
    expect(
      failures,
      `${failures.length} missing/unsupported starting terms:\n${failures.join("\n")}`,
    ).toEqual([]);
  });
});

it("carries a required starting flat wage term into native payday and canonical reload", () => {
  // Same reproducible native route as fiscal-starting-terms.test.ts; no work,
  // wages, taxpayers or outcomes selected or authored by this test.
  const seed = "fiscal-starting-terms-new-game:natural-pay";
  const states = lifePlaceStateIdentities().filter(
    (place) =>
      incomeTables.places[
        place.jurisdictionKey as keyof typeof incomeTables.places
      ]?.wageIncomeTax === "flat",
  );
  expect(states.length).toBeGreaterThan(0);
  const state =
    states[Number.parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const places = searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  }).filter((place) => {
    const population = place.sourceGeoid
      ? placeReferencePopulation(place.sourceGeoid)?.value
      : null;
    return (
      place.context.jurisdiction.kind === "census-place" &&
      population != null &&
      population > 0 &&
      population <= 1000
    );
  });
  expect(places.length).toBeGreaterThan(0);
  const place =
    places[
      Number.parseInt(stableHash(`${seed}:town`).slice(0, 8), 16) %
        places.length
    ]!;
  const opened = openObserverWorld(observerSetup(seed, place.key));
  const world = advanceObservedWorld(opened.world, 14);
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === ADOPT_STATE_INCOME_TAX_QUESTION,
  )!;
  const law = lawInForce(
    world,
    stateJurisdictionForKey(state.jurisdictionKey)!.id,
    proposition.id,
    world.currentDate,
  )!;
  expect(law.origin).toBe("in-force-at-start");
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
    termKey: "rate",
    unit: "ratio",
    onDate: world.currentDate,
  });
  expect(term).not.toBeNull();
  expect(term!.measureId).toBe(law.measureId);
  expect(term!.value).toBeGreaterThan(0);
  const read = stateIncomeTaxUnderLaw(
    world,
    state.jurisdictionKey,
    "single",
    world.currentDate,
  );
  if (read.kind !== "enacted")
    throw new Error(
      "Starting numeric terms did not reach native payroll reader",
    );
  expect(read.shape).toBe("flat");
  expect(read.lawMeasureIds).toContain(law.measureId);
  const nativeFlows = new Set(
    world.history.resourceFlows
      .filter((row) => row.stableKey.startsWith("town-pay-v2:job-pay:"))
      .map((row) => row.id),
  );
  const paychecks = world.history.resourceTransferOutcomes.filter(
    (row) =>
      nativeFlows.has(row.resourceFlowId) &&
      row.status === "completed" &&
      row.transferredAmount.minorUnits > 0,
  );
  const paycheckIds = new Set(paychecks.map((row) => row.id));
  const liabilities = (world.history.statutoryTaxLiabilities ?? []).filter(
    (row) =>
      paycheckIds.has(row.sourceOutcomeId) &&
      row.authorityKey === state.jurisdictionKey &&
      row.taxKey.endsWith(":wage-income-tax") &&
      (row.liability?.minorUnits ?? 0) > 0,
  );
  const liabilityIds = new Set(liabilities.map((row) => row.id));
  const payments = (world.history.statutoryTaxPayments ?? []).filter(
    (row) => liabilityIds.has(row.liabilityId) && row.amount.minorUnits > 0,
  );
  expect(paychecks.length).toBeGreaterThan(0);
  expect(liabilities.length).toBeGreaterThan(0);
  expect(payments.length).toBeGreaterThan(0);
  for (const liability of liabilities)
    expect(liability.lawMeasureIds).toContain(law.measureId);
  for (const payment of payments) {
    const outcome = world.history.resourceTransferOutcomes.find(
      (row) => row.id === payment.resourceOutcomeId,
    )!;
    expect(outcome.status).toBe("completed");
    expect(outcome.transferredAmount.minorUnits).toBeGreaterThanOrEqual(
      payment.amount.minorUnits,
    );
  }
  const totalMinor = payments.reduce(
    (sum, row) => sum + row.amount.minorUnits,
    0,
  );
  expect(totalMinor).toBeGreaterThan(0);
  expect(assessPaychecksTaxes(world, [...paycheckIds])).toBe(world);
  const restored = deserializeWorld(serializeWorld(world));
  expect(restored.history.statutoryTaxLiabilities).toEqual(
    world.history.statutoryTaxLiabilities,
  );
  expect(restored.history.statutoryTaxPayments).toEqual(
    world.history.statutoryTaxPayments,
  );
  expect(restored.history.resourceTransferOutcomes).toEqual(
    world.history.resourceTransferOutcomes,
  );
  expect(assessPaychecksTaxes(restored, [...paycheckIds])).toBe(restored);
  expect(
    readFinalEnactedLawTerm(restored, law, {
      questionKey: ADOPT_STATE_INCOME_TAX_QUESTION,
      termKey: "rate",
      unit: "ratio",
      onDate: restored.currentDate,
    }),
  ).toEqual(term);
  stdout.write(
    JSON.stringify({
      proof: "native Begin and ordinary 14-day payroll, not authored wages",
      seed,
      place: place.key,
      state: state.jurisdictionKey,
      openedAt: opened.world.currentDate,
      through: world.currentDate,
      law: law.measureId,
      startingTerm: term,
      consumerSchedule: read.schedule,
      liabilityCount: liabilities.length,
      paymentCount: payments.length,
      paymentTotalMinorUnits: totalMinor,
      paycheckIds: [...paycheckIds],
      liabilities: liabilities.map((row) => ({
        id: row.id,
        sourceOutcomeId: row.sourceOutcomeId,
        lawMeasureIds: row.lawMeasureIds,
        amount: row.liability,
      })),
      payments: payments.map((row) => ({
        id: row.id,
        liabilityId: row.liabilityId,
        transferId: row.resourceOutcomeId,
        amount: row.amount,
      })),
    }) + "\n",
  );
});
