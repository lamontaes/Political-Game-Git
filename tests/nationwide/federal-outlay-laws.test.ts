import { describe, expect, it } from "vitest";
import outlayTerms from "../../data/research/federal/federal-outlay-terms-fy2025.json" with { type: "json" };
import { FEDERAL_OUTLAYS } from "../../src/simulation/public-budgets/federal-budget-categories";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  DEBT_LIMIT_CUTS_QUESTION,
  federalDeficitChangePctOfGdp,
  federalLawAmountAt,
  federalOutlayChangeAt,
  federalAidFactor,
  INCREASE_FOREIGN_AID_QUESTION,
} from "../../src/simulation/federal-outlay-laws";
import { stableHash } from "../../src/simulation/ids";
import { createHistoryStore } from "../../src/simulation/history";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import {
  OUTCOME_LINKS,
  outcomeLinkStatus,
} from "../../src/simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomesForMonth,
} from "../../src/simulation/outcome-web/place-outcomes";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/** Authored adopted amounts use saved spending; the GDP denominator stays sourced. */

const SEED = "federal-outlay-laws";
const POLICY = createProductionPolicyCatalog();
const ALL_PLACES = lifePlaceStateIdentities();
const PLACE =
  ALL_PLACES[
    Number.parseInt(stableHash(SEED).slice(0, 8), 16) % ALL_PLACES.length
  ]!;
const STATE = stateJurisdictionForKey(PLACE.jurisdictionKey)!.id;
const BORROWING = "gov.borrowing-cost";

const questionId = (stableKey: string) =>
  POLICY.propositionOrder.find(
    (id) => POLICY.propositions[id]!.stableKey === stableKey,
  )!;

let sequence = 0;
function act(
  questionKey: string,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
  amount = 2400,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
  amount: number;
} {
  sequence += 1;
  const question = questionId(questionKey);
  const measure: LegislativeMeasureRecord = {
    id: `measure_outlay_${sequence}` as EntityId,
    stableKey: `test:outlay:${sequence}`,
    sequence,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `H.R. ${sequence}`,
    shortTitle: "A test act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: addDays(effectiveAt, -90),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question],
    propositionAnswers: [{ propositionId: question, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_outlay_${sequence}` as EntityId,
    stableKey: `test:outlay:${sequence}:enactment`,
    sequence: 1000 + sequence,
    measureId: measure.id,
    resolvedAt: addDays(effectiveAt, -30),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt,
    outcomeEventId: `event_outlay_${sequence}` as EntityId,
  };
  return { measure, enactment, amount };
}

function worldWith(laws: readonly ReturnType<typeof act>[]): World {
  return {
    id: "world_test" as EntityId,
    seed: SEED,
    currentDate: makeIsoDate("2028-06-01"),
    jurisdictions: {
      [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
    },
    jurisdictionOrder: [NATIONAL_ELECTION_JURISDICTION.id],
    policyCatalog: POLICY,
    history: {
      ...createHistoryStore(),
      nextSequence: 2000,
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
      legislativeProvisions: laws.map(({ measure, enactment, amount }) => ({
        id: `provision_${measure.id}`,
        sequence: 500 + measure.sequence,
        measureId: measure.id,
        recordedAt: enactment.resolvedAt,
        supersedesProvisionId: null,
        applicationScope: {
          jurisdictionId: measure.jurisdictionId,
          segmentKey: null,
        },
        lawTerms: [
          {
            questionKey:
              POLICY.propositions[measure.propositionIds![0]!]!.stableKey,
            key:
              POLICY.propositions[measure.propositionIds![0]!]!.stableKey ===
              DEBT_LIMIT_CUTS_QUESTION
                ? "offset"
                : "appropriation",
            unit: "dollars/year",
            value: amount,
          },
        ],
      })),
    },
  } as unknown as World;
}

function recordedAidYear(world: World): World {
  return {
    ...world,
    publicBudgets: {
      federalGovernment: {
        months: Array.from({ length: 12 }, (_, i) => ({
          month: makeIsoDate(`2026-${String(i + 1).padStart(2, "0")}-01`),
          spending: FEDERAL_OUTLAYS.map(() => 100),
        })),
      },
    },
  } as unknown as World;
}

describe("federal outlay laws use final adopted annual dollar terms", () => {
  it("applies the operative debt offset against complete recorded spending and ends it on repeal", () => {
    const cut = act(
      DEBT_LIMIT_CUTS_QUESTION,
      "yes",
      makeIsoDate("2027-03-01"),
      700,
    );
    const restore = act(
      DEBT_LIMIT_CUTS_QUESTION,
      "no",
      makeIsoDate("2029-03-01"),
    );
    const world = recordedAidYear(worldWith([cut, restore]));
    expect(
      federalLawAmountAt(
        world,
        DEBT_LIMIT_CUTS_QUESTION,
        "offset",
        makeIsoDate("2027-02-01"),
      ).amount,
    ).toBe(0);
    expect(
      federalOutlayChangeAt(world, makeIsoDate("2027-06-01")),
    ).toMatchObject({ cutDollars: 700, lawMeasureIds: [cut.measure.id] });
    expect(federalAidFactor(world, makeIsoDate("2027-06-01"))).toBeCloseTo(
      1 - 700 / (12 * FEDERAL_OUTLAYS.length * 100),
      12,
    );
    expect(federalAidFactor(worldWith([cut]), makeIsoDate("2027-06-01"))).toBe(
      1,
    );
    expect(federalAidFactor(world, makeIsoDate("2029-06-01"))).toBe(1);
    expect(
      federalOutlayChangeAt(world, makeIsoDate("2029-06-01")).cutDollars,
    ).toBe(0);
  });

  it("uses the complete recorded aid year as its base, not another government's fiscal note", () => {
    const aid = act(
      INCREASE_FOREIGN_AID_QUESTION,
      "yes",
      makeIsoDate("2027-01-01"),
      2400,
    );
    const unsupported = worldWith([aid]);
    expect(
      federalLawAmountAt(
        unsupported,
        INCREASE_FOREIGN_AID_QUESTION,
        "appropriation",
        unsupported.currentDate,
      ).amount,
    ).toBe(2400);
    expect(
      federalOutlayChangeAt(unsupported, unsupported.currentDate).aidDollars,
    ).toBeNull();
    const world = recordedAidYear(unsupported);
    expect(federalOutlayChangeAt(world, world.currentDate)).toMatchObject({
      aidDollars: 1200,
      lawMeasureIds: [aid.measure.id],
    });
    expect(ALL_PLACES).toHaveLength(56);
    for (const place of ALL_PLACES) {
      expect(
        stateJurisdictionForKey(place.jurisdictionKey),
        place.jurisdictionKey,
      ).toBeDefined();
      expect(
        federalAidFactor(world, world.currentDate),
        place.jurisdictionKey,
      ).toBe(1);
    }
    expect(federalAidFactor(world, makeIsoDate("2026-12-01"))).toBe(1);
    expect(
      federalAidFactor(recordedAidYear(worldWith([])), world.currentDate),
    ).toBe(1);
    const repealed = recordedAidYear(
      worldWith([
        aid,
        act(INCREASE_FOREIGN_AID_QUESTION, "no", makeIsoDate("2029-01-01")),
      ]),
    );
    expect(federalAidFactor(repealed, makeIsoDate("2029-06-01"))).toBe(1);
  });

  it.each([
    "missing month",
    "gap",
    "duplicate month",
    "missing line",
    "negative line",
    "zero base",
  ])("leaves %s aid spending explicitly unsupported", (invalid) => {
    const aid = act(
      INCREASE_FOREIGN_AID_QUESTION,
      "yes",
      makeIsoDate("2027-01-01"),
      2400,
    );
    const original = recordedAidYear(worldWith([aid]));
    const rows = original.publicBudgets!.federalGovernment!.months.map(
      (row) => ({ ...row, spending: [...row.spending] }),
    );
    const at = FEDERAL_OUTLAYS.indexOf("internationalAffairs");
    if (invalid === "missing month") rows.pop();
    if (invalid === "gap") rows[5]!.month = makeIsoDate("2026-07-01");
    if (invalid === "duplicate month") rows[5]!.month = rows[4]!.month;
    if (invalid === "missing line") rows[5]!.spending.splice(at);
    if (invalid === "negative line") rows[5]!.spending[at] = -100;
    if (invalid === "zero base") for (const row of rows) row.spending[at] = 0;
    const invalidWorld = {
      ...original,
      publicBudgets: {
        ...original.publicBudgets!,
        federalGovernment: {
          ...original.publicBudgets!.federalGovernment!,
          months: rows,
        },
      },
    };
    expect(
      federalOutlayChangeAt(invalidWorld, invalidWorld.currentDate).aidDollars,
    ).toBeNull();
    expect(
      federalDeficitChangePctOfGdp(invalidWorld, invalidWorld.currentDate),
    ).toBeNull();
  });

  it(`reads the adopted aid deficit in ${PLACE.name} against sourced national GDP (seed ${SEED})`, () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.key === "federal-deficit-to-borrowing-cost",
    )!;
    expect(outcomeLinkStatus(link)).toBe("built");
    const world = recordedAidYear(
      worldWith([
        act(
          INCREASE_FOREIGN_AID_QUESTION,
          "yes",
          makeIsoDate("2027-01-01"),
          2400,
        ),
      ]),
    );
    expect(federalDeficitChangePctOfGdp(world, world.currentDate)).toBeCloseTo(
      (100 * 1200) / outlayTerms.nationalGdp2025,
      18,
    );
    const cut = act(
      DEBT_LIMIT_CUTS_QUESTION,
      "yes",
      makeIsoDate("2027-01-01"),
      700,
    );
    const aid = act(
      INCREASE_FOREIGN_AID_QUESTION,
      "yes",
      makeIsoDate("2027-01-01"),
      2400,
    );
    const combined = recordedAidYear(worldWith([cut, aid]));
    expect(
      federalDeficitChangePctOfGdp(combined, combined.currentDate),
    ).toBeCloseTo((100 * (1200 - 700)) / outlayTerms.nationalGdp2025, 18);
    expect(
      federalDeficitChangePctOfGdp(worldWith([aid]), combined.currentDate),
    ).toBeNull();
    expect(federalDeficitChangePctOfGdp(worldWith([]), world.currentDate)).toBe(
      0,
    );
    const records = placeOutcomesForMonth(world, world.currentDate, [
      BORROWING,
    ]);
    expect(
      records
        .find((row) => row.placeKey === PLACE.jurisdictionKey)
        ?.causes.some((cause) => cause.key === link.key),
    ).toBe(true);
    expect(
      PLACE_OUTCOME_BASES[BORROWING]!.places[PLACE.jurisdictionKey] ===
        undefined || records.some((row) => row.jurisdictionId === STATE),
    ).toBe(true);
  });
});
