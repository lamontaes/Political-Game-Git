import { describe, expect, it } from "vitest";

import {
  addDays,
  daysBetween,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { outcomeFactor } from "../../src/simulation/outcome-web";
import { recordsWithFieldValue } from "../../src/simulation/history-index";
import { payWorkplaceAt } from "../../src/simulation/pay-coverage-predicates";
import {
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
  townMinimumHourlyAt,
} from "../../src/simulation/living-world/town-pay";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { EntityId, IsoDate, World } from "../../src/simulation";

import {
  omahaWithRaiseBills,
  type RaiseBill,
} from "./omaha-minimum-wage-bills";

const LB_900: RaiseBill = {
  key: "lb-900",
  designation: "LB 900, 2026",
  answer: "yes",
  effectiveInDays: 45,
};

// Explicit authored bill amount through the existing saved rule provision.
// This is a test control, not a researched or default wage.
const ADOPTED_FLOOR_MINOR = 1700;
const NUMERIC_LB_900: RaiseBill = { ...LB_900, cents: ADOPTED_FLOOR_MINOR };

const NEBRASKA = () => stateJurisdictionForKey("US-NE")!.id;

/** Query the recorded legal rate at the actual snapshot date. */
function rateOn(world: World, jurisdictionId: EntityId, onDate: IsoDate) {
  return townMinimumHourlyAt(
    {
      ...world,
      currentDate: onDate,
      currentMoment: simulationMomentOnLocalDate(world.currentMoment, onDate),
    },
    jurisdictionId,
    onDate,
  );
}

function runPaydays(start: World, since: IsoDate, days: number): World {
  let world = start;
  let paidThrough = since;
  const until = addDays(since, days);
  withWorldIntegrityDeferred(() => {
    for (
      let payday = nextPaydayDate(world.currentDate);
      payday <= until;
      payday = nextPaydayDate(payday)
    ) {
      world = {
        ...world,
        currentDate: payday,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, payday),
      };
      const due = world.history.futureDueItems.find(
        (item) =>
          item.transitionKey === PAYDAY_TRANSITION_KEY &&
          item.stableKey === `town-pay-v2:payday:${paidThrough}`,
      );
      if (!due) throw new Error("The fixture needs its actual saved payday.");
      world = paydayHandler(world, due).world;
      paidThrough = payday;
    }
  });
  return world;
}

describe(
  "a state wage law uses its actual saved amount, not an average raise",
  { timeout: 600_000 },
  () => {
    it("reads the bill's explicit $17 floor from its effective date, then holds", () => {
      const { world, opened } = omahaWithRaiseBills([NUMERIC_LB_900]);
      const effectiveAt = addDays(opened, LB_900.effectiveInDays);
      const omaha = lifePlaceByKey("3137000")!.context.jurisdiction.id;
      const baseline = omahaWithRaiseBills([]).world;
      const rateBefore = rateOn(baseline, omaha, addDays(effectiveAt, -1));
      expect(rateOn(world, omaha, addDays(effectiveAt, -1))).toBe(rateBefore);
      expect(rateOn(world, omaha, effectiveAt)).toBeCloseTo(
        ADOPTED_FLOOR_MINOR / 100,
        5,
      );
      expect(rateOn(world, omaha, addDays(effectiveAt, 366))).toBeCloseTo(
        ADOPTED_FLOOR_MINOR / 100,
        5,
      );
      // The adopted amount does not acquire an average annual step.
      for (const days of [731, 3650]) {
        expect(rateOn(world, omaha, addDays(effectiveAt, days))).toBeCloseTo(
          ADOPTED_FLOOR_MINOR / 100,
          5,
        );
      }
    });

    it("reaches Nebraska alone", () => {
      const { world, opened } = omahaWithRaiseBills([NUMERIC_LB_900]);
      const effectiveAt = addDays(opened, LB_900.effectiveInDays + 400);
      const baseline = omahaWithRaiseBills([]).world;
      for (const key of ["3651000", "0644000", "4819000", "5363000"]) {
        const jurisdiction = lifePlaceByKey(key)!.context.jurisdiction.id;
        expect(rateOn(world, jurisdiction, effectiveAt), key).toBe(
          rateOn(baseline, jurisdiction, effectiveAt),
        );
      }
    });

    it("raises the pay of every job below the new rate, and names the law", () => {
      const { world: enacted, opened } = omahaWithRaiseBills([NUMERIC_LB_900]);
      const measure = enacted.history.legislativeMeasures!.find(
        (row) => row.stableKey === `raise:${LB_900.key}:measure`,
      )!;
      const world = runPaydays(enacted, opened, 800);
      const raises = world.history.resourceFlowTerms.filter((terms) =>
        terms.lawEffectStamps?.some(
          (stamp) =>
            stamp.effectKind === "pay" && stamp.governingLawKey === measure.id,
        ),
      );
      const omaha = lifePlaceByKey("3137000")!.context.jurisdiction.id;
      {
        const rows = world.history.resourceFlows.filter(
          (f) =>
            f.stableKey.startsWith("town-pay-v2:job-pay:") &&
            f.basisReference.kind === "work",
        );
        const per: Record<string, number> = {
          weekly: 52,
          biweekly: 26,
          semimonthly: 24,
          monthly: 12,
        };
        const hourly: number[] = [];
        for (const flow of rows) {
          if (flow.basisReference.kind !== "work")
            throw new Error("The fixture needs its actual work pay flow.");
          const role = recordsWithFieldValue(
            world.history.workRoles,
            "workRelationshipId",
            flow.basisReference.workRelationshipId,
          ).at(-1)!;
          const t = recordsWithFieldValue(
            world.history.resourceFlowTerms,
            "resourceFlowId",
            flow.id,
          ).at(-1)!;
          const { minimumHours: a, maximumHours: b } =
            role.timeDemand.expectedWeekly;
          const p = /town-(\w+?)(?:-\d)?$/.exec(t.cadenceKind)![1]!;
          hourly.push(
            (t.amount.minorUnits * per[p]!) / (((a + b) / 2) * 52) / 100,
          );
        }
        hourly.sort((x, y) => x - y);
        // The floor at the end is $17.00; no job is left under it.
        expect(hourly[0]).toBeGreaterThanOrEqual(
          rateOn(world, omaha, world.currentDate)! - 0.01,
        );
      }
      expect(raises.length).toBeGreaterThan(0);
      // The law originates in the state; its consequence applies at the
      // actual saved workplace (LawEffectStamp.jurisdictionId's contract).
      expect(measure.jurisdictionId).toBe(NEBRASKA());
      for (const raise of raises) {
        const flow = world.history.resourceFlows.find(
          (row) => row.id === raise.resourceFlowId,
        );
        if (!flow || flow.basisReference.kind !== "work")
          throw new Error("The wage change needs its actual work pay flow.");
        const workplace = payWorkplaceAt(
          world,
          flow.basisReference.workRelationshipId,
          {
            asOfDate: raise.effectiveAt,
            historySequenceExclusive: raise.sequence,
          },
        );
        const stamp = raise.lawEffectStamps?.find(
          (row) =>
            row.effectKind === "pay" && row.governingLawKey === measure.id,
        );
        expect(stamp).toMatchObject({
          governingLawKey: measure.id,
          questionKey: "us-policy-positions:labor-workforce.raise-minimum-wage",
          jurisdictionId: workplace.jurisdictionId,
          source: "enacted",
        });
        expect(stamp?.sourceRecordIds).toEqual(
          expect.arrayContaining(workplace.factRecordIds),
        );
        expect(measure.designation).toBe("LB 900");
      }
      console.info(
        `Nebraska LB 900 answered yes: ${raises.length} raises to the pay of town jobs in 800 days.`,
      );
    });

    it("moves the poverty rate after the law's lag, and a repeal undoes it", () => {
      const baseline = omahaWithRaiseBills([]);
      const omaha = lifePlaceByKey("3137000")!.context.jurisdiction.id;
      const initialRate = townMinimumHourlyAt(
        baseline.world,
        omaha,
        baseline.world.currentDate,
      );
      if (initialRate === null)
        throw new Error(
          "The fixture needs its actual recorded starting floor.",
        );
      const repeal: RaiseBill = {
        key: "lb-901",
        designation: "LB 901, 2026",
        answer: "no",
        effectiveInDays: 1_200,
        // Authored repeal text restores the fixture's recorded starting floor.
        cents: Math.round(initialRate * 100),
      };
      const { world: enacted, opened } = omahaWithRaiseBills([
        NUMERIC_LB_900,
        repeal,
      ]);
      const measure = enacted.history.legislativeMeasures!.find(
        (row) => row.stableKey === `raise:${LB_900.key}:measure`,
      )!;
      const state = NEBRASKA();
      const effectiveAt = addDays(opened, LB_900.effectiveInDays);
      const repealAt = addDays(opened, repeal.effectiveInDays);
      const poverty = (snapshot: World) =>
        outcomeFactor(
          snapshot,
          state,
          "household.poverty-pct",
          snapshot.currentDate,
        ).multiplier;
      const through = (snapshot: World, until: IsoDate) =>
        runPaydays(
          snapshot,
          snapshot.currentDate,
          daysBetween(snapshot.currentDate, until),
        );
      // Every observation uses an actual saved canonical payday snapshot.
      // Nothing moves before the law, or before its 36-month lag has run.
      const before = runPaydays(enacted, opened, LB_900.effectiveInDays - 1);
      expect(poverty(before)).toBe(1);
      const early = through(before, addDays(effectiveAt, 400));
      expect(poverty(early)).toBe(1);
      const feltWorld = through(early, addDays(repealAt, -1));
      const paid = feltWorld.history.resourceTransferOutcomes.filter(
        (row) =>
          row.status === "completed" &&
          row.transferredAmount.minorUnits > 0 &&
          row.lawEffectStamps?.some(
            (stamp) =>
              stamp.effectKind === "pay" &&
              stamp.governingLawKey === measure.id,
          ),
      );
      expect(paid.length).toBeGreaterThan(0);
      expect(townMinimumHourlyAt(feltWorld, omaha, feltWorld.currentDate)).toBe(
        ADOPTED_FLOOR_MINOR / 100,
      );
      // The saved pay evidence is necessary; the shared before-law measure
      // and researched link must still establish the poverty effect.
      const felt = poverty(feltWorld);
      expect(felt).toBeLessThan(1);
      const repealed = through(
        feltWorld,
        nextPaydayDate(addDays(repealAt, -1)),
      );
      expect(townMinimumHourlyAt(repealed, omaha, repealAt)).toBe(initialRate);
      const later = through(repealed, addDays(repealAt, 1_100));
      expect(poverty(later)).toBe(1);
      console.info(
        `Nebraska LB 900: ${paid.length} completed law-stamped paychecks; poverty factor ${felt.toFixed(4)} at saved payday ${feltWorld.currentDate}, 1.0000 after the repeal's lag.`,
      );
    });
  },
);
