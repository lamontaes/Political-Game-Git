import { describe, expect, it } from "vitest";
import { renderPlaceCountyModule } from "../../../scripts/source/export-place-county-relations";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { makeIsoDate } from "../dates";
import {
  lifePlaceByJurisdictionId,
  lifePlaceByKey,
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  areaResidents,
  localResidents,
  localWeights,
  PLACE_OUTCOME_BASES,
  placeOutcomeAt,
  placeOutcomeRecords,
  placeOutcomeValue,
  placeOutcomesForMonth,
} from "./place-outcomes";
import {
  countyGeoidsForPlace,
  countyPopulationSharesForPlace,
  PLACE_COUNTY_RELATIONS_META,
} from "../government-units";
import { PLACE_COUNTY_RELATIONS_ROWS } from "../place-county-relations.generated";
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

describe("A167 city population across two counties", () => {
  const seed = "team2-a167-county-population";
  const places = Array.from({ length: 5 }, (_, index) =>
    drawRandomPlace(`${seed}:${index}`, (place) => {
      if (!place.sourceGeoid || localResidents(place.sourceGeoid) === null)
        return false;
      const parts = countyPopulationSharesForPlace(place.sourceGeoid);
      return (
        parts.length === 2 &&
        parts.every(
          ([county, share]) =>
            share !== null && share > 0 && areaResidents(county) !== null,
        )
      );
    }),
  );

  it.each(places)(
    "splits $displayName residents between both county areas",
    (place) => {
      const key = place.sourceGeoid!;
      const population = localResidents(key)!;
      const state = areaResidents(place.stateJurisdictionKey!)!;
      const parts = countyPopulationSharesForPlace(key);
      const countyKeys = parts.map(([county]) => `county:${county}`);
      const weights = localWeights(place.stateJurisdictionKey!, [
        key,
        ...countyKeys,
      ]);
      expect(parts.reduce((sum, [, share]) => sum + share!, 0)).toBeCloseTo(
        1,
        12,
      );
      expect(weights.get(key)! * state).toBeCloseTo(population, 8);
      for (const [county, share] of parts) {
        expect(weights.get(`county:${county}`)! * state).toBeCloseTo(
          areaResidents(county)! - population * share!,
          8,
        );
      }
      const represented = [...weights.values()].reduce<number>(
        (sum, weight) => sum + weight! * state,
        0,
      );
      expect(represented).toBeCloseTo(
        parts.reduce((sum, [county]) => sum + areaResidents(county)!, 0),
        8,
      );

      // The ordinary monthly writer records exactly those allocation weights.
      const jurisdictions = [
        place.context.jurisdiction.id,
        ...countyKeys.map(
          (countyKey) => lifePlaceByKey(countyKey)?.context.jurisdiction.id,
        ),
      ];
      expect(jurisdictions.every((id) => id !== undefined)).toBe(true);
      const laws = jurisdictions.map((jurisdictionId, index) => {
        const law = texasExpansion("2026-01-01");
        const measureId = `measure_a167_${index}` as EntityId;
        return {
          measure: {
            ...law.measure,
            id: measureId,
            jurisdictionId: jurisdictionId!,
            stableKey: `a167:${index}`,
          },
          enactment: {
            ...law.enactment,
            id: `enactment_a167_${index}` as EntityId,
            measureId,
            resolvedAt: makeIsoDate("2026-01-01"),
          },
        };
      });
      const world = worldAt("2026-02-01", laws);
      const records = placeOutcomesForMonth(world, world.currentDate);
      const stateRecord = records.find(
        (record) =>
          record.measure === UNINSURED &&
          record.placeKey === place.stateJurisdictionKey,
      )!;
      expect(stateRecord.places).toBeDefined();
      for (const share of stateRecord.places!)
        expect(share.weight).toBeCloseTo(weights.get(share.placeKey)!, 12);
      const continued = JSON.parse(
        JSON.stringify({
          ...world,
          placeOutcomes: { months: [{ month: world.currentDate, records }] },
        }),
      ) as World;
      expect(
        placeOutcomeAt(
          continued,
          UNINSURED,
          place.context.jurisdiction.id,
          world.currentDate,
        )?.weight,
      ).toBeCloseTo(weights.get(key)!, 12);
      expect(placeOutcomesForMonth(continued, world.currentDate)).toEqual(
        records,
      );
      expect(
        lifePlaceByJurisdictionId(place.context.jurisdiction.id)?.sourceGeoid,
      ).toBe(key);
    },
  );

  it("preserves measured zero parts and existing single-county geography", () => {
    const austin = countyPopulationSharesForPlace("4805000");
    expect(austin.find(([county]) => county === "48021")?.[1]).toBe(0);
    expect(austin.find(([county]) => county === "48209")?.[1]).toBeCloseTo(
      933 / 961855,
      12,
    );
    expect(countyPopulationSharesForPlace("1714000")).toEqual([
      ["17031", 1],
      ["17043", 0],
    ]);
    expect(countyPopulationSharesForPlace("0100460")).toEqual([["01073", 1]]);
    expect(countyPopulationSharesForPlace("not-a-census-place")).toEqual([]);
    expect(countyPopulationSharesForPlace("7200000")).toEqual([]);
    expect(PLACE_COUNTY_RELATIONS_META.populationAsOf).toBe("2020-04-01");
    expect([...countyGeoidsForPlace("4805000")].sort()).toEqual(
      austin.map(([county]) => county).sort(),
    );
  });

  it("replays the projection from all 51 hash-verified locked Census slices", () => {
    const rendered = renderPlaceCountyModule();
    const literal = rendered
      .split("export const PLACE_COUNTY_RELATIONS_ROWS: string = ")[1]!
      .trim()
      .slice(0, -1);
    expect(JSON.parse(literal)).toEqual(PLACE_COUNTY_RELATIONS_ROWS);
    expect(PLACE_COUNTY_RELATIONS_META.inputs).toHaveLength(51);
  });

  it("leaves county deductions unknown when the city has no current resident count", () => {
    // Bucks CDP has measured 2020 parts in Mobile and Washington counties,
    // but the incorporated-place estimates do not supply its current total.
    const place = "0111488";
    expect(localResidents(place)).toBeNull();
    const parts = countyPopulationSharesForPlace(place);
    expect(parts).toEqual([
      ["01097", 102 / 255],
      ["01129", 153 / 255],
    ]);
    const weights = localWeights("US-AL", [
      place,
      ...parts.map(([county]) => `county:${county}`),
    ]);
    expect(weights.get(place)).toBeNull();
    for (const [county] of parts)
      expect(weights.get(`county:${county}`)).toBeNull();
  });
});

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

describe("place outcomes move only from recorded causes: nothing is drawn", () => {
  /**
   * Runs `months` of monthly passes from January 2026. A world with a seed
   * has a drawn size for each link (the outcome web's own draw); one without
   * does not, and every link acts at its researched size.
   */
  function run(seed: string | null, months: number): World {
    let world = (
      seed ? { ...worldAt("2026-01-01"), seed } : worldAt("2026-01-01")
    ) as World;
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
  const causesOf = (record: { causes: readonly unknown[] }) =>
    JSON.stringify(record.causes);

  it("with no law change and no crisis, every place of all 56 holds its starting value month after month, in any world", () => {
    const worlds = [run(null, 36), run("quiet-a", 36), run("quiet-b", 36)];
    // One rule for every state, D.C. and the five territories: a measure
    // keeps a record for exactly the places it has a base for, and never a
    // zero for one it has none for.
    const everyPlace = lifePlaceStateIdentities().map(
      (state) => state.jurisdictionKey,
    );
    expect(everyPlace).toHaveLength(56);
    const covered = new Set<string>();
    let moved = 0;
    let held = 0;
    for (const [measure, definition] of Object.entries(PLACE_OUTCOME_BASES)) {
      const withBase = Object.keys(definition.places).sort();
      for (const world of worlds) {
        const records = placeOutcomeRecords(world).filter(
          (record) => record.measure === measure,
        );
        expect(
          [...new Set(records.map((record) => record.placeKey))].sort(),
          measure,
        ).toEqual(withBase);
        for (const placeKey of withBase) {
          const series = records.filter(
            (record) => record.placeKey === placeKey,
          );
          expect(series, `${measure} ${placeKey}`).toHaveLength(36);
          series.forEach((record, index) => {
            const where = `${measure} ${placeKey} ${record.month}`;
            // The underlying level never moves: nothing is drawn.
            expect(record.structural, where).toBe(record.base);
            // The value is the level times the causes at work, and nothing else.
            expect(record.value, where).toBeCloseTo(
              placeOutcomeValue(
                definition,
                record.structural!,
                record.multiplier,
                record.causes.map((cause) => cause.factor),
              ),
              1,
            );
            if (index === 0) return;
            const before = series[index - 1]!;
            if (causesOf(before) === causesOf(record)) {
              // The same causes at the same strength: the same value.
              expect(record.value, where).toBe(before.value);
              held += 1;
            } else {
              // A cause arrived, changed or ended: the record names it.
              expect(causesOf(record), where).not.toBe(causesOf(before));
              moved += 1;
            }
          });
        }
      }
      for (const placeKey of withBase) covered.add(placeKey);
    }
    // Between them the measures reach every one of the 56, and none else.
    expect([...covered].sort()).toEqual([...everyPlace].sort());
    // The month-to-month record is mostly causes holding still, and at least
    // some causes did arrive in these three years.
    expect(held).toBeGreaterThan(moved);
    expect(moved).toBeGreaterThan(0);
    // The seed is not a cause of any movement: the underlying levels of
    // every world are the same record for record.
    const levels = (world: World) =>
      placeOutcomeRecords(world).map((record) => [
        record.measure,
        record.placeKey,
        record.month,
        record.structural,
      ]);
    expect(levels(worlds[1]!)).toEqual(levels(worlds[0]!));
    expect(levels(worlds[2]!)).toEqual(levels(worlds[0]!));
  }, 240_000);

  it("a measure still moves when a built link's cause changes: Ohio's uninsured share steps up when the work requirement takes effect, and stays there", () => {
    const world = run(null, 28);
    const ohio = (month: string) =>
      placeOutcomeRecords(world).find(
        (r) =>
          r.measure === UNINSURED &&
          r.placeKey === "US-OH" &&
          r.month === month,
      )!;
    // Until the cause arrives the share is its start, month after month.
    for (const month of ["2026-01-01", "2026-12-01", "2027-06-01"]) {
      expect(ohio(month).value, month).toBe(base("US-OH"));
      expect(ohio(month).causes, month).toEqual([]);
    }
    // The month it takes effect, the share moves by the link's effect and
    // the record names the cause.
    const after = ohio("2027-08-01");
    expect(after.multiplier).toBeCloseTo(1.32, 10);
    expect(after.value).toBeCloseTo(base("US-OH") * 1.32, 1);
    expect(after.causes.map((cause) => cause.key)).toEqual([
      "work-requirement-to-coverage",
    ]);
    // The underlying level never moved; the cause did, and it holds.
    for (const record of placeOutcomeRecords(world).filter(
      (r) => r.measure === UNINSURED && r.placeKey === "US-OH",
    ))
      expect(record.structural).toBe(base("US-OH"));
    expect(ohio("2028-04-01").multiplier).toBeCloseTo(1.32, 10);
    // A state the link does not name has nothing to move it.
    expect(last(world, "US-TX").value).toBe(base("US-TX"));
    expect(last(world, "US-FL").value).toBe(base("US-FL"));
  }, 120_000);

  it("the same cause moves a seeded world too, by the size that world drew for the link", () => {
    const world = run("moves-with-its-cause", 20);
    const ohio = last(world, "US-OH");
    expect(ohio.month).toBe("2027-08-01");
    expect(ohio.multiplier).toBeGreaterThan(1.19);
    expect(ohio.structural).toBe(base("US-OH"));
    expect(ohio.value).toBeCloseTo(base("US-OH") * ohio.multiplier, 1);
  }, 120_000);
});
