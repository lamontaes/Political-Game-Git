import { describe, expect, it } from "vitest";
import { observerPlace } from "../../presentation/observer-world";
import { createWorld } from "../world";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { GROW_DEFENSE_SPENDING_QUESTION } from "../federal-defense-spending";
import { isLawEffectStamp } from "../law-effect-stamp";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
  World,
} from "../types";
import { settlePublicBudgets } from ".";
import { PUBLIC_BUDGETS_VERSION } from "./store";
import { FEDERAL_OUTLAYS, openFederalTreasury } from "./federal-treasury";

function enact(world: World, answer: "yes" | "no", at: IsoDate, n = 1): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === GROW_DEFENSE_SPENDING_QUESTION,
  )!;
  const measure: LegislativeMeasureRecord = {
    id: `measure_defense_${n}` as EntityId,
    stableKey: `test:defense:${n}`,
    sequence: n * 2,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `H.R. ${n}`,
    shortTitle: "Controlled defense act",
    summary: "Controlled defense act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: at,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_defense_${n}` as EntityId,
    stableKey: `test:defense:${n}:enactment`,
    sequence: n * 2 + 1,
    measureId: measure.id,
    resolvedAt: at,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: at,
    outcomeEventId: `event_defense_${n}` as EntityId,
  };
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}
const seen = new Set<string>();
const cases: { seed: string; place: ReturnType<typeof observerPlace> }[] = [];
for (let n = 0; cases.length < 5 && n < 100; n += 1) {
  const seed = `team1-defense-cost-${n}`;
  const place = observerPlace(seed);
  if (!place.stateJurisdictionKey || seen.has(place.stateJurisdictionKey))
    continue;
  seen.add(place.stateJurisdictionKey);
  cases.push({ seed, place });
}
function fixture(seed: string, stateKey: string): World {
  const world = createWorld({
    seed,
    currentDate: makeIsoDate("2026-07-01"),
    jurisdictions: [
      NATIONAL_ELECTION_JURISDICTION,
      stateJurisdictionForKey(stateKey)!,
    ],
    people: [],
    lineage: "production",
  });
  return {
    ...world,
    publicBudgets: {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
      federal: openFederalTreasury(makeIsoDate("2026-01-05")),
    },
  };
}
describe("federal defense cost saved in the correct government's budget", () => {
  it.each(cases)(
    "saves the changed national outlay, borrowing and stamp from $place.displayName ($seed)",
    ({ seed, place }) => {
      const world = fixture(seed, place.stateJurisdictionKey!);
      const month = makeIsoDate("2026-07-01");
      const baseline = settlePublicBudgets(world, month);
      const passed = enact(world, "yes", makeIsoDate("2026-01-05"));
      const saved = settlePublicBudgets(passed, month);
      const before = baseline.publicBudgets!.federal!.months.at(-1)!;
      const after = saved.publicBudgets!.federal!.months.at(-1)!;
      const cost = after.laws.find(
        (l) => l.questionKey === GROW_DEFENSE_SPENDING_QUESTION,
      )!;
      expect(cost.amount).toBeGreaterThan(0);
      expect(cost.line).toBe("nationalDefense");
      const index = FEDERAL_OUTLAYS.indexOf("nationalDefense");
      expect(
        Math.abs(after.outlays[index]! - before.outlays[index]! - cost.amount),
      ).toBeLessThanOrEqual(1);
      expect(after.deficit - before.deficit).toBe(
        after.outlays[index]! - before.outlays[index]!,
      );
      expect(after.debtHeldByPublic - before.debtHeldByPublic).toBe(
        after.deficit - before.deficit,
      );
      expect(cost.lawEffectStamps).toHaveLength(1);
      const stamp = cost.lawEffectStamps![0]!;
      expect(isLawEffectStamp(stamp)).toBe(true);
      expect(stamp).toMatchObject({
        governingLawKey: "measure_defense_1",
        effectKind: "government-outlay-change",
        questionKey: GROW_DEFENSE_SPENDING_QUESTION,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        operativeAt: "2026-01-05",
        appliedAt: month,
        sourceRecordIds: ["measure_defense_1"],
      });
      const reload = JSON.parse(JSON.stringify(saved)) as World;
      expect(reload.publicBudgets!.federal!.months).toEqual(
        saved.publicBudgets!.federal!.months,
      );
      const repealed = enact(reload, "no", makeIsoDate("2026-08-01"), 2);
      const next = settlePublicBudgets(repealed, makeIsoDate("2026-08-01"));
      expect(
        next
          .publicBudgets!.federal!.months.at(-1)!
          .laws.some((l) => l.questionKey === GROW_DEFENSE_SPENDING_QUESTION),
      ).toBe(false);
      expect(
        next.publicBudgets!.federal!.months[0]!.laws[0]!.lawEffectStamps,
      ).toEqual(cost.lawEffectStamps);
      console.log(
        JSON.stringify({
          seed,
          place: place.displayName,
          state: place.stateJurisdictionKey,
          month,
          costDollars: cost.amount,
          extraBorrowingDollars: after.deficit - before.deficit,
          government: "federal",
          line: cost.line,
          governingLawKey: stamp.governingLawKey,
          reloadAndRepeal: "PASS",
        }),
      );
    },
  );
  it("saves no defense cost or attribution before the law is operative", () => {
    const world = fixture(
      "team1-defense-future",
      cases[0]!.place.stateJurisdictionKey!,
    );
    const future = enact(world, "yes", makeIsoDate("2027-01-01"));
    const saved = settlePublicBudgets(future, makeIsoDate("2026-07-01"));
    expect(saved.publicBudgets!.federal!.months.at(-1)!.laws).toEqual([]);
  });
});
