import { describe, expect, it } from "vitest";

import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { outcomeFactor } from "../../src/simulation/outcome-web";
import { recordsWithFieldValue } from "../../src/simulation/history-index";
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
      for (const raise of raises) {
        expect(
          raise.lawEffectStamps?.find(
            (stamp) =>
              stamp.effectKind === "pay" &&
              stamp.governingLawKey === measure.id,
          ),
        ).toMatchObject({
          governingLawKey: measure.id,
          questionKey: "us-policy-positions:labor-workforce.raise-minimum-wage",
          jurisdictionId: NEBRASKA(),
          source: "enacted",
        });
        expect(measure.designation).toBe("LB 900");
      }
      console.info(
        `Nebraska LB 900 answered yes: ${raises.length} raises to the pay of town jobs in 800 days.`,
      );
    });

    it("moves the poverty rate after the law's lag, and a repeal undoes it", () => {
      const repeal: RaiseBill = {
        key: "lb-901",
        designation: "LB 901, 2026",
        answer: "no",
        effectiveInDays: 1_200,
      };
      const { world, opened } = omahaWithRaiseBills([LB_900, repeal]);
      const state = NEBRASKA();
      const effectiveAt = addDays(opened, LB_900.effectiveInDays);
      const repealAt = addDays(opened, repeal.effectiveInDays);
      const poverty = (on: IsoDate) =>
        outcomeFactor(world, state, "household.poverty-pct", on).multiplier;
      // Nothing moves before the law, or before its 36-month lag has run.
      expect(poverty(addDays(effectiveAt, -1))).toBe(1);
      expect(poverty(addDays(effectiveAt, 400))).toBe(1);
      // After the lag, the raise is felt, and the poverty rate is lower.
      const felt = poverty(addDays(repealAt, -1));
      expect(felt).toBeLessThan(1);
      // The repeal takes the state's rate back to where it began, and the
      // effect ends the day it takes effect.
      const omaha = lifePlaceByKey("3137000")!.context.jurisdiction.id;
      expect(rateOn(world, omaha, repealAt)).toBe(
        rateOn(omahaWithRaiseBills([]).world, omaha, repealAt),
      );
      // The state's poverty rate follows its rate back with the same lag.
      expect(poverty(addDays(repealAt, 1_100))).toBe(1);
      console.info(
        `Nebraska LB 900 answered yes: poverty factor ${felt.toFixed(4)} the day before the repeal, 1.0000 1,100 days after it took effect.`,
      );
    });
  },
);
