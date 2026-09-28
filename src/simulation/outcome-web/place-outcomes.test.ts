import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeAt,
  placeOutcomesForMonth,
} from "./place-outcomes";

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

  it("a town reads its state's latest recorded value", () => {
    const month = makeIsoDate("2026-01-01");
    const world = {
      ...worldAt("2026-02-15"),
      placeOutcomes: {
        records: placeOutcomesForMonth(worldAt("2026-01-01"), month),
      },
    } as World;
    expect(
      placeOutcomeAt(world, UNINSURED, texas, makeIsoDate("2026-02-15"))?.value,
    ).toBe(16.7);
    expect(
      placeOutcomeAt(world, UNINSURED, texas, makeIsoDate("2025-12-31")),
    ).toBeNull();
  });
});
