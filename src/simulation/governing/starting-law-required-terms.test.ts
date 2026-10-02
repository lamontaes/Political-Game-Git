import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { US_POLICY_POSITIONS_PACK } from "../policy-pack-us-policy-positions";
import { US_FEDERAL_POSITIONS_PACK } from "../policy-pack-us-federal-positions";
import {
  assertLawSchedules,
  type LawScheduleTerm,
} from "../law-structured-terms";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createWorld } from "../world";
import { makeIsoDate } from "../dates";

interface Parameter {
  readonly key: string;
  readonly unit: string;
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
  jurisdictions: [],
  policyCatalog: createProductionPolicyCatalog(),
});

function numericUnit(unit: string): string | null | undefined {
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
  // Production parameters include reserve floors and juvenile ages omitted
  // from the research batches. Batch declarations refine the same key.
  for (const pack of [US_POLICY_POSITIONS_PACK, US_FEDERAL_POSITIONS_PACK])
    for (const question of pack.propositions ?? [])
      for (const parameter of question.parameters ?? [])
        put(`${pack.pack}:${question.key}`, {
          key: parameter.key,
          unit: parameter.value,
        });
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
      for (const parameter of question.parameters)
        put(question.questionKey, parameter);
  }
  return new Map(
    [...result].map(([key, value]) => [
      key,
      [...value.values()].filter(
        (parameter) => numericUnit(parameter.unit) !== undefined,
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
    const matches = (row.lawTerms ?? []).filter(
      (term) => term.questionKey === questionKey && term.key === parameter.key,
    );
    const schedules = (row.lawSchedules ?? []).filter(
      (term) => term.questionKey === questionKey && term.key === parameter.key,
    );
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
    if (
      (unit === "minor" || unit === "minor/hour") &&
      !Number.isSafeInteger(term.value)
    )
      return [`${parameter.key}: minor units require a safe integer`];
    return [];
  });
}

describe("starting laws carry their catalog-required numeric terms", () => {
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
  });

  it("covers every yes row and its separate before/phase rules", () => {
    const required = requirements();
    const questions = startingLaw.questions as unknown as Readonly<
      Record<string, { answers: Readonly<Record<string, Row>> }>
    >;
    const failures: string[] = [];
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
        for (const entry of dated)
          for (const failure of missingTerms(
            questionKey,
            entry.row,
            parameters,
          ))
            failures.push(
              `${questionKey} | ${place} | ${entry.phase} | ${failure}`,
            );
      }
    }
    expect(
      failures,
      `${failures.length} missing/unsupported starting terms:\n${failures.join("\n")}`,
    ).toEqual([]);
  });
});
