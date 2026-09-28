import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeAt,
  placeOutcomeRecords,
  placeOutcomesForMonth,
} from "./place-outcomes";
import { outcomeFactor } from ".";

/*
 * Place outcomes start at each state's real 2024 level and move only through
 * the outcome web. The world here is partial: the producer reads the date,
 * the policy catalog and the legislative history, and no recorded economy
 * (so unemployment moves nothing).
 */

const EXPANSION = "proposition_expand_medicaid" as EntityId;
const WORK = "proposition_medicaid_work" as EntityId;
const texas = stateJurisdictionForKey("US-TX")!.id;

function texasExpansion(effectiveAt: string): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  return {
    measure: {
      id: "measure_tx" as EntityId,
      stableKey: "test:tx",
      sequence: 1,
      jurisdictionId: texas,
      rulePackId: "test",
      designation: "HB 1",
      shortTitle: "Expand Medicaid eligibility",
      summary: "A test act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [EXPANSION],
      propositionAnswers: [{ propositionId: EXPANSION, answer: "yes" }],
    },
    enactment: {
      id: "enactment_tx" as EntityId,
      stableKey: "test:tx:enactment",
      sequence: 1001,
      measureId: "measure_tx" as EntityId,
      resolvedAt: makeIsoDate("2026-06-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: "event_tx" as EntityId,
    },
  };
}

function worldAt(
  currentDate: string,
  laws: readonly ReturnType<typeof texasExpansion>[] = [],
): World {
  return {
    currentDate: makeIsoDate(currentDate),
    policyCatalog: {
      propositions: {
        [EXPANSION]: {
          id: EXPANSION,
          stableKey:
            "us-policy-positions:health-human-services.expand-medicaid-eligibility",
        },
        [WORK]: {
          id: WORK,
          stableKey:
            "us-policy-positions:health-human-services.medicaid-work-requirement",
        },
      },
    },
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
  } as unknown as World;
}

function valueFor(
  records: ReturnType<typeof placeOutcomesForMonth>,
  measure: string,
  placeKey: string,
) {
  return records.find(
    (record) => record.measure === measure && record.placeKey === placeKey,
  )!;
}

const UNINSURED = "health.uninsured-pct";
const base = (placeKey: string) =>
  PLACE_OUTCOME_BASES[UNINSURED]!.places[placeKey]!;

describe("place outcomes", () => {
  it("every state, D.C. and Puerto Rico where measured starts at its real 2024 level", () => {
    const records = placeOutcomesForMonth(
      worldAt("2026-01-01"),
      makeIsoDate("2026-01-01"),
    );
    expect(
      records.filter((record) => record.measure === UNINSURED).length,
    ).toBe(51);
    expect(
      records.filter((record) => record.measure === "household.poverty-pct")
        .length,
    ).toBe(52);
    expect(
      records.filter((record) => record.measure === "school.graduation-pct")
        .length,
    ).toBe(52);
    expect(
      records.filter(
        (record) => record.measure === "school.math-proficient-pct",
      ).length,
    ).toBe(51);
    expect(
      records.filter((record) => record.measure === "voting.turnout-pct")
        .length,
    ).toBe(51);
    for (const record of records) {
      expect(record.multiplier, record.placeKey).toBe(1);
      expect(record.value, record.placeKey).toBe(record.base);
      expect(record.causes, record.placeKey).toEqual([]);
    }
    expect(valueFor(records, UNINSURED, "US-TX").value).toBe(16.7);
  });

  it("the federal Medicaid work requirement raises the uninsured about 32% in expansion states from mid-2027, and leaves states without the expansion alone", () => {
    const before = placeOutcomesForMonth(
      worldAt("2027-06-01"),
      makeIsoDate("2027-06-01"),
    );
    expect(valueFor(before, UNINSURED, "US-OH").multiplier).toBe(1);
    const after = placeOutcomesForMonth(
      worldAt("2027-08-01"),
      makeIsoDate("2027-08-01"),
    );
    const ohio = valueFor(after, UNINSURED, "US-OH");
    expect(ohio.multiplier).toBeCloseTo(1.32, 10);
    expect(ohio.causes.map((cause) => cause.key)).toEqual([
      "work-requirement-to-coverage",
    ]);
    expect(valueFor(after, UNINSURED, "US-TX").multiplier).toBe(1);
    expect(valueFor(after, UNINSURED, "US-FL").multiplier).toBe(1);
  });

  it("a Texas law expanding Medicaid cuts its uninsured about 15%, and then the federal work requirement reaches Texas too", () => {
    const law = texasExpansion("2027-01-01");
    const early = valueFor(
      placeOutcomesForMonth(
        worldAt("2027-02-01", [law]),
        makeIsoDate("2027-02-01"),
      ),
      UNINSURED,
      "US-TX",
    );
    expect(early.multiplier).toBeCloseTo(0.85, 10);
    expect(early.value).toBeCloseTo(base("US-TX") * 0.85, 2);
    const later = valueFor(
      placeOutcomesForMonth(
        worldAt("2027-08-01", [law]),
        makeIsoDate("2027-08-01"),
      ),
      UNINSURED,
      "US-TX",
    );
    expect(later.multiplier).toBeCloseTo(0.85 * 1.32, 10);
    expect(later.causes.map((cause) => cause.key).sort()).toEqual([
      "medicaid-expansion-to-coverage",
      "work-requirement-to-coverage",
    ]);
  });

  it("a Texas law equalizing school funding raises its math proficiency about 6% three years on", () => {
    const EQUALIZE = "proposition_equalize" as EntityId;
    const law = texasExpansion("2027-01-01");
    const world = (date: string) =>
      ({
        ...worldAt(date),
        policyCatalog: {
          propositions: {
            [EQUALIZE]: {
              id: EQUALIZE,
              stableKey:
                "us-policy-positions:education.equalize-school-funding",
            },
          },
        },
        history: {
          legislativeMeasures: [
            {
              ...law.measure,
              propositionIds: [EQUALIZE],
              propositionAnswers: [{ propositionId: EQUALIZE, answer: "yes" }],
            },
          ],
          legislativeEnactments: [law.enactment],
        },
      }) as unknown as World;
    const MATH = "school.math-proficient-pct";
    expect(
      valueFor(
        placeOutcomesForMonth(world("2029-12-01"), makeIsoDate("2029-12-01")),
        MATH,
        "US-TX",
      ).multiplier,
    ).toBe(1);
    const after = valueFor(
      placeOutcomesForMonth(world("2030-01-01"), makeIsoDate("2030-01-01")),
      MATH,
      "US-TX",
    );
    expect(after.multiplier).toBeCloseTo(1.06, 10);
    expect(after.causes.map((cause) => cause.key)).toEqual([
      "equalized-funding-to-math-proficiency",
    ]);
  });

  it("a town reads its state's latest recorded value", () => {
    const month = makeIsoDate("2026-01-01");
    const world = {
      ...worldAt("2026-02-15"),
      placeOutcomes: {
        months: [
          {
            month,
            records: placeOutcomesForMonth(worldAt("2026-01-01"), month),
          },
        ],
      },
    } as World;
    expect(
      placeOutcomeAt(world, UNINSURED, texas, makeIsoDate("2026-02-15"))?.value,
    ).toBe(16.7);
    expect(
      placeOutcomeAt(world, UNINSURED, texas, makeIsoDate("2025-12-31")),
    ).toBeNull();
  });

  it("a federal minimum wage raise lowers poverty about 3.5% where the state sits at $7.25, and not where it is already above $15", () => {
    const RAISE = "proposition_federal_minimum" as EntityId;
    const federal = NATIONAL_ELECTION_JURISDICTION.id;
    const world = {
      ...worldAt("2029-01-01"),
      policyCatalog: {
        propositions: {
          [RAISE]: {
            id: RAISE,
            stableKey:
              "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
          },
        },
      },
      history: {
        legislativeMeasures: [
          {
            ...texasExpansion("2026-07-01").measure,
            id: "measure_us" as EntityId,
            jurisdictionId: federal,
            propositionIds: [RAISE],
            propositionAnswers: [{ propositionId: RAISE, answer: "yes" }],
          },
        ],
        legislativeEnactments: [
          {
            ...texasExpansion("2026-07-01").enactment,
            measureId: "measure_us" as EntityId,
          },
        ],
      },
    } as unknown as World;
    const records = placeOutcomesForMonth(world, makeIsoDate("2029-01-01"));
    const POVERTY = "household.poverty-pct";
    expect(valueFor(records, POVERTY, "US-KY").multiplier).toBeCloseTo(
      0.965,
      10,
    );
    expect(valueFor(records, POVERTY, "US-WA").multiplier).toBe(1);
    expect(valueFor(records, POVERTY, "US-CA").multiplier).toBe(1);
  });
});

describe("environment, public safety and homelessness", () => {
  const CRIME = "crime.violent";
  const HOMELESS = "housing.homelessness";
  const PERMIT = "proposition_carry_permit" as EntityId;

  it("each state, D.C. and the territories where measured start at their real levels, and the rest are unknown", () => {
    const records = placeOutcomesForMonth(
      worldAt("2026-01-01"),
      makeIsoDate("2026-01-01"),
    );
    const count = (measure: string) =>
      records.filter((record) => record.measure === measure).length;
    expect(count(CRIME)).toBe(52);
    expect(count(HOMELESS)).toBe(54);
    expect(count("env.particulates")).toBe(51);
    expect(count("env.drinking-water-violations")).toBe(51);
    expect(valueFor(records, CRIME, "US-TX").value).toBe(397.9);
    expect(valueFor(records, HOMELESS, "US-NY").value).toBe(81);
    expect(valueFor(records, "env.particulates", "US-CA").value).toBe(11.7);
    // Unknown is never zero: no record at all.
    expect(
      records.some((r) => r.measure === CRIME && r.placeKey === "US-PR"),
    ).toBe(false);
    expect(
      records.some((r) => r.measure === HOMELESS && r.placeKey === "US-AS"),
    ).toBe(false);
  });

  it("a Texas law requiring a permit to carry cuts its violent crime about 10% a year after it takes effect", () => {
    const law = texasExpansion("2027-01-01");
    const world = (date: string) =>
      ({
        ...worldAt(date),
        policyCatalog: {
          propositions: {
            [PERMIT]: {
              id: PERMIT,
              stableKey:
                "us-policy-positions:justice-public-safety.permit-to-carry-concealed",
            },
          },
        },
        history: {
          legislativeMeasures: [
            {
              ...law.measure,
              shortTitle: "Require a permit to carry concealed",
              propositionIds: [PERMIT],
              propositionAnswers: [{ propositionId: PERMIT, answer: "yes" }],
            },
          ],
          legislativeEnactments: [law.enactment],
        },
      }) as unknown as World;
    const before = valueFor(
      placeOutcomesForMonth(world("2027-12-01"), makeIsoDate("2027-12-01")),
      CRIME,
      "US-TX",
    );
    expect(before.multiplier).toBe(1);
    const after = valueFor(
      placeOutcomesForMonth(world("2028-01-01"), makeIsoDate("2028-01-01")),
      CRIME,
      "US-TX",
    );
    expect(after.multiplier).toBeCloseTo(0.9, 10);
    expect(after.causes.map((cause) => cause.key)).toEqual([
      "carry-permit-to-violent-crime",
    ]);
    // California already required a permit: nothing changes there.
    expect(
      valueFor(
        placeOutcomesForMonth(world("2028-01-01"), makeIsoDate("2028-01-01")),
        CRIME,
        "US-CA",
      ).multiplier,
    ).toBe(1);
  });

  it("vouchers for every eligible family cut homelessness about 30% in every measured place a year later", () => {
    const VOUCHERS = "proposition_vouchers" as EntityId;
    const federal = NATIONAL_ELECTION_JURISDICTION.id;
    const law = texasExpansion("2027-01-01");
    const world = {
      ...worldAt("2028-01-01"),
      policyCatalog: {
        propositions: {
          [VOUCHERS]: {
            id: VOUCHERS,
            stableKey:
              "us-federal-positions:housing.vouchers-for-every-eligible-family",
          },
        },
      },
      history: {
        legislativeMeasures: [
          {
            ...law.measure,
            id: "measure_us" as EntityId,
            jurisdictionId: federal,
            propositionIds: [VOUCHERS],
            propositionAnswers: [{ propositionId: VOUCHERS, answer: "yes" }],
          },
        ],
        legislativeEnactments: [
          { ...law.enactment, measureId: "measure_us" as EntityId },
        ],
      },
    } as unknown as World;
    const records = placeOutcomesForMonth(
      world,
      makeIsoDate("2028-01-01"),
    ).filter((record) => record.measure === HOMELESS);
    expect(records.length).toBe(54);
    for (const record of records) {
      expect(record.multiplier, record.placeKey).toBeCloseTo(0.7, 10);
      expect(record.value, record.placeKey).toBeCloseTo(record.base * 0.7, 1);
    }
  });

  it("a save from before violent crime replaced the crime index carries its level on instead of snapping back", () => {
    const month = makeIsoDate("2026-01-01");
    const old = {
      measure: "crime.rate-index",
      placeKey: "US-TX",
      jurisdictionId: texas,
      month,
      base: 100,
      structural: 160,
      multiplier: 1,
      value: 160,
      causes: [],
    };
    const world = {
      ...worldAt("2026-02-01"),
      placeOutcomes: { months: [{ month, records: [old] }] },
    } as World;
    // Until the next monthly pass, town crime reads the old index.
    const early = outcomeFactor(
      world,
      texas,
      "crime.burglary",
      makeIsoDate("2026-01-20"),
    ).causes.find((cause) => cause.key === "crime-level-to-burglary")!;
    expect(early.causeValue).toBe(160);
    const next = placeOutcomesForMonth(world, makeIsoDate("2026-02-01"));
    const texasCrime = valueFor(next, CRIME, "US-TX");
    expect(texasCrime.structural).toBeCloseTo(397.9 * 1.6, 2);
    // A state with no index record starts at its base.
    expect(valueFor(next, CRIME, "US-OH").structural).toBe(312);
  });

  it("town crime reads the state's violent crime as a ratio to where the state began", () => {
    const month = makeIsoDate("2026-01-01");
    const records = placeOutcomesForMonth(worldAt("2026-01-01"), month).map(
      (record) =>
        record.measure === CRIME && record.placeKey === "US-TX"
          ? { ...record, value: Math.round(record.base * 1.2 * 100) / 100 }
          : record,
    );
    const world = {
      ...worldAt("2026-02-01"),
      placeOutcomes: { months: [{ month, records }] },
    } as World;
    const burglary = outcomeFactor(
      world,
      texas,
      "crime.burglary",
      makeIsoDate("2026-02-01"),
    );
    const level = burglary.causes.find(
      (cause) => cause.key === "crime-level-to-burglary",
    )!;
    expect(level.causeBaseline).toBe(100);
    expect(level.causeValue).toBeCloseTo(120, 1);
    expect(level.factor).toBeCloseTo(1.2, 3);
    // Where violent crime sits at its start, town crime is at its base.
    const ohio = outcomeFactor(
      world,
      stateJurisdictionForKey("US-OH")!.id,
      "crime.burglary",
      makeIsoDate("2026-02-01"),
    );
    expect(
      ohio.causes.find((cause) => cause.key === "crime-level-to-burglary")!
        .factor,
    ).toBe(1);
  });
});

describe("the entire world changes: place outcomes drift, and no two worlds end alike", () => {
  /** Runs `months` of monthly passes from January 2026 on a seeded world. */
  function run(seed: string, months: number): World {
    let world = { ...worldAt("2026-01-01"), seed } as World;
    let month = makeIsoDate("2026-01-01");
    for (let index = 0; index < months; index += 1) {
      world = {
        ...world,
        currentDate: month,
        placeOutcomes: {
          months: [
            ...(world.placeOutcomes?.months ?? []),
            { month, records: placeOutcomesForMonth(world, month) },
          ],
        },
      } as World;
      const next = new Date(`${month}T00:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      month = makeIsoDate(next.toISOString().slice(0, 10));
    }
    return world;
  }
  const last = (world: World, placeKey: string, measure = UNINSURED) =>
    placeOutcomeRecords(world)
      .filter((r) => r.measure === measure && r.placeKey === placeKey)
      .at(-1)!;

  it("over a decade each state's level wanders from its base, partly with the nation, within its bounds", () => {
    const world = run("drift-a", 120);
    const ends = Object.keys(PLACE_OUTCOME_BASES[UNINSURED]!.places).map(
      (placeKey) => last(world, placeKey),
    );
    expect(ends.filter((r) => r.structural !== r.base).length).toBe(
      ends.length,
    );
    for (const record of ends) {
      expect(record.structural!).toBeGreaterThanOrEqual(1);
      expect(record.structural!).toBeLessThanOrEqual(40);
    }
    // Most states moved the same way as the nation did.
    const moves = ends.map((r) => Math.sign(r.structural! - r.base));
    const shared = Math.max(
      moves.filter((m) => m > 0).length,
      moves.filter((m) => m < 0).length,
    );
    expect(shared / moves.length).toBeGreaterThan(0.6);
  }, 60_000);

  it("twenty-five years on, the same state ends in very different places in different worlds", () => {
    const worlds = ["w1", "w2", "w3", "w4"].map((seed) => run(seed, 300));
    const spread = (measure: string) => {
      const values = worlds.map((world) => last(world, "US-TX", measure).value);
      return Math.max(...values) - Math.min(...values);
    };
    expect(spread(UNINSURED)).toBeGreaterThan(3);
    // Schools change too: graduation and math proficiency end apart.
    expect(spread("school.graduation-pct")).toBeGreaterThan(2);
    expect(spread("school.math-proficient-pct")).toBeGreaterThan(2);
    // Crime and births drift as levels: a quarter century apart in each world.
    expect(spread("crime.violent")).toBeGreaterThan(60);
    expect(spread("births.rate-index")).toBeGreaterThan(5);
  }, 120_000);

  it("laws still act on top of the drift: the work requirement multiplies Ohio's level from mid-2027", () => {
    const world = run("drift-b", 20);
    const ohio = last(world, "US-OH");
    expect(ohio.month).toBe("2027-08-01");
    expect(ohio.multiplier).toBeGreaterThan(1.19);
    expect(ohio.value).toBeCloseTo(ohio.structural! * ohio.multiplier, 1);
  });
});
