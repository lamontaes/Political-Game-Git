import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  defenseBuildUpShare,
  defenseBoostPct,
  GROW_DEFENSE_SPENDING_QUESTION,
} from "../../src/simulation/federal-defense-spending";
import { createHistoryStore } from "../../src/simulation/history";
import { stableHash } from "../../src/simulation/ids";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
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

/** Controlled adopted appropriations and saved spending; no state GDP or contracts are inferred. */

const SEED = "federal-defense-spending";
const POLICY = createProductionPolicyCatalog();
const EARNINGS = "labor.median-earnings";
const QUESTION = POLICY.propositionOrder.find(
  (id) => POLICY.propositions[id]!.stableKey === GROW_DEFENSE_SPENDING_QUESTION,
)!;

const ALL_PLACES = lifePlaceStateIdentities();
// The four territories with no earnings base cannot show the outcome; the
// measure itself is checked in all 56.
const PLACES = ALL_PLACES.filter(
  (place) => PLACE_OUTCOME_BASES[EARNINGS]!.places[place.jurisdictionKey],
);
const PLACE =
  PLACES[Number.parseInt(stableHash(SEED).slice(0, 8), 16) % PLACES.length]!;

function act(
  n: number,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const measure: LegislativeMeasureRecord = {
    id: `measure_defense_${n}` as EntityId,
    stableKey: `test:defense:${n}`,
    sequence: n,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `H.R. ${n}`,
    shortTitle: "A defense act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: addDays(effectiveAt, -90),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [QUESTION],
    propositionAnswers: [{ propositionId: QUESTION, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_defense_${n}` as EntityId,
    stableKey: `test:defense:${n}:enactment`,
    sequence: 1000 + n,
    measureId: measure.id,
    resolvedAt: addDays(effectiveAt, -30),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt,
    outcomeEventId: `event_defense_${n}` as EntityId,
  };
  return { measure, enactment };
}

function worldWith(laws: readonly ReturnType<typeof act>[]): World {
  return {
    seed: SEED,
    currentDate: makeIsoDate("2034-01-01"),
    jurisdictions: {
      [NATIONAL_ELECTION_JURISDICTION.id]: NATIONAL_ELECTION_JURISDICTION,
    },
    policyCatalog: POLICY,
    publicBudgets: {
      federalGovernment: {
        months: Array.from({ length: 12 }, (_, index) => ({
          month: makeIsoDate(`2026-${String(index + 1).padStart(2, "0")}-01`),
          spending: Array.from({ length: 13 }, (_, line) =>
            line === 4 ? 100 : 0,
          ),
        })),
      },
    },
    history: {
      ...createHistoryStore(),
      nextSequence: 2000,
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
      legislativeProvisions: laws
        .filter((law) => law.measure.propositionAnswers![0]!.answer === "yes")
        .map((law) => ({
          id: `${law.measure.id}:appropriation`,
          sequence: law.enactment.sequence - 1,
          measureId: law.measure.id,
          recordedAt: law.enactment.resolvedAt,
          supersedesProvisionId: null,
          applicationScope: {
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
            segmentKey: null,
          },
          lawTerms: [
            {
              questionKey: GROW_DEFENSE_SPENDING_QUESTION,
              key: "appropriation",
              unit: "dollars/year",
              value: 2400,
            },
          ],
        })),
    },
  } as unknown as World;
}

describe("a federal law that grows defense spending", () => {
  const link = OUTCOME_LINKS.find(
    (row) => row.key === "defense-contracts-to-earnings",
  )!;

  it("is a built link from the extra contracts to earnings", () => {
    expect(link.from).toBe("federal.defense-boost-pct");
    expect(outcomeLinkStatus(link)).toBe("built");
  });

  it("keeps the adopted share constant and does not manufacture a GDP boost in any of the 56 places", () => {
    expect(ALL_PLACES).toHaveLength(56);
    const world = worldWith([
      act(1, "yes", makeIsoDate("2027-01-01")),
      act(2, "no", makeIsoDate("2033-01-01")),
    ]);
    expect(defenseBuildUpShare(world, makeIsoDate("2027-01-01"))).toMatchObject(
      { share: 1, unsupportedReason: null },
    );
    expect(defenseBuildUpShare(world, makeIsoDate("2032-01-01"))).toMatchObject(
      { share: 1, unsupportedReason: null },
    );
    for (const place of ALL_PLACES) {
      expect(
        defenseBoostPct(
          world,
          place.jurisdictionKey,
          makeIsoDate("2026-12-31"),
        ),
        place.jurisdictionKey,
      ).toBe(0);
      expect(
        defenseBoostPct(
          world,
          place.jurisdictionKey,
          makeIsoDate("2027-01-01"),
        ),
        place.jurisdictionKey,
      ).toBeNull();
      expect(
        defenseBoostPct(
          world,
          place.jurisdictionKey,
          makeIsoDate("2033-01-01"),
        ),
        place.jurisdictionKey,
      ).toBe(0);
    }
  });

  it("refuses an incomplete saved defense year or missing adopted appropriation", () => {
    const world = worldWith([act(1, "yes", makeIsoDate("2027-01-01"))]);
    const incomplete = {
      ...world,
      publicBudgets: {
        ...world.publicBudgets,
        federalGovernment: {
          ...world.publicBudgets!.federalGovernment!,
          months: world.publicBudgets!.federalGovernment!.months.slice(1),
        },
      },
    } as World;
    const missing = {
      ...world,
      history: { ...world.history, legislativeProvisions: [] },
    };
    for (const unsupported of [incomplete, missing]) {
      expect(
        defenseBuildUpShare(unsupported, makeIsoDate("2027-01-01"))
          .unsupportedReason,
      ).not.toBeNull();
      expect(
        defenseBoostPct(
          unsupported,
          PLACE.jurisdictionKey,
          makeIsoDate("2027-01-01"),
        ),
      ).toBeNull();
    }
  });

  it(`does not manufacture a defense earnings outcome in ${PLACE.name} (seed ${SEED})`, () => {
    const world = worldWith([
      act(1, "yes", makeIsoDate("2027-01-01")),
      act(2, "no", makeIsoDate("2033-01-01")),
    ]);
    for (const month of ["2026-12-01", "2028-01-01", "2033-01-01"]) {
      const records = placeOutcomesForMonth(
        { ...world, currentDate: makeIsoDate(month) },
        makeIsoDate(month),
        [EARNINGS],
      );
      const record = records.find(
        (row) => row.placeKey === PLACE.jurisdictionKey,
      )!;
      expect(record).toBeDefined();
      expect(
        record.causes.find((entry) => entry.key === link.key),
      ).toBeUndefined();
    }
  });
});
