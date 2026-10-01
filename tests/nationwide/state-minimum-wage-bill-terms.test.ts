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
import {
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
  townMinimumHourly,
  townMinimumHourlyAt,
} from "../../src/simulation/living-world/town-pay";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { FutureDueItem, IsoDate, World } from "../../src/simulation";

import {
  omahaWithRaiseBills,
  type RaiseBill,
} from "./omaha-minimum-wage-bills";

const LB_900: RaiseBill = {
  key: "lb-900",
  designation: "LB 900, 2026",
  answer: "yes",
  effectiveInDays: 45,
  cents: 1700, // Explicit fictional bill clause, not an estimated raise.
};

const NEBRASKA = () => stateJurisdictionForKey("US-NE")!.id;

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
      world = paydayHandler(world, {
        stableKey: `town-pay-v2:payday:${paidThrough}`,
        transitionKey: PAYDAY_TRANSITION_KEY,
      } as FutureDueItem).world;
      paidThrough = payday;
    }
  });
  return world;
}

describe(
  "a state law that answers yes to raising the minimum wage carries a term",
  { timeout: 600_000 },
  () => {
    it("reads the bill's explicit wage clause from its effective date, without invented yearly steps", () => {
      const { world, opened } = omahaWithRaiseBills([LB_900]);
      const effectiveAt = addDays(opened, LB_900.effectiveInDays);
      const omaha = lifePlaceByKey("3137000")!.context.jurisdiction.id;
      expect(townMinimumHourlyAt(world, omaha, addDays(effectiveAt, -1))).toBe(
        townMinimumHourly(omaha),
      );
      for (const days of [0, 366, 731, 3650])
        expect(
          townMinimumHourlyAt(world, omaha, addDays(effectiveAt, days)),
        ).toBe(LB_900.cents! / 100);
    });

    it("reaches Nebraska alone", () => {
      const { world, opened } = omahaWithRaiseBills([LB_900]);
      const effectiveAt = addDays(opened, LB_900.effectiveInDays + 400);
      for (const key of ["3651000", "0644000", "4819000", "5363000"]) {
        const jurisdiction = lifePlaceByKey(key)!.context.jurisdiction.id;
        expect(townMinimumHourlyAt(world, jurisdiction, effectiveAt), key).toBe(
          townMinimumHourly(jurisdiction),
        );
      }
    });

    it("raises the pay of every job below the new rate, and names the law", () => {
      const { world: enacted, opened } = omahaWithRaiseBills([LB_900]);
      const world = runPaydays(enacted, opened, 800);
      const raises = world.history.resourceFlowTerms.filter((terms) =>
        terms.stableKey.includes(":minimum-wage:"),
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
          const wid = (flow.basisReference as { workRelationshipId: string })
            .workRelationshipId;
          const role = world.history.workRoles.findLast(
            (r) => r.workRelationshipId === wid,
          )!;
          const t = world.history.resourceFlowTerms.findLast(
            (r) => r.resourceFlowId === flow.id,
          )!;
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
          townMinimumHourlyAt(world, omaha, world.currentDate)! - 0.01,
        );
      }
      expect(raises.length).toBeGreaterThan(0);
      for (const raise of raises) {
        const floor = townMinimumHourlyAt(world, omaha, raise.effectiveAt)!;
        expect(raise.reason).toBe(
          `LB 900 raised the state minimum wage to $${floor.toFixed(2)} an hour.`,
        );
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
      expect(townMinimumHourlyAt(world, omaha, repealAt)).toBe(
        townMinimumHourly(omaha),
      );
      // The state's poverty rate follows its rate back with the same lag.
      expect(poverty(addDays(repealAt, 1_100))).toBe(1);
      console.info(
        `Nebraska LB 900 answered yes: poverty factor ${felt.toFixed(4)} the day before the repeal, 1.0000 1,100 days after it took effect.`,
      );
    });
  },
);
