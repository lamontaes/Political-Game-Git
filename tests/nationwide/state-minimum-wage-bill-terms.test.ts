import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  daysBetween,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { createFutureTransitionHandlerRegistry } from "../../src/simulation/future-transitions";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  takeFloorVote,
} from "../../src/simulation/legislation";
import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
} from "../../src/simulation/legislation-scenarios";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { STATE_RAISE_TERM } from "../../src/simulation/minimum-wage";
import { outcomeFactor } from "../../src/simulation/outcome-web";
import {
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
  townMinimumHourly,
  townMinimumHourlyAt,
} from "../../src/simulation/living-world/town-pay";
import {
  advanceWorld,
  withWorldIntegrityDeferred,
} from "../../src/simulation/world";
import type {
  EntityId,
  FutureDueItem,
  IsoDate,
  World,
} from "../../src/simulation";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this fixture.",
  sourceEntityIds: [] as readonly EntityId[],
};

const QUESTION_KEY = "us-policy-positions:labor-workforce.raise-minimum-wage";

interface RaiseBill {
  readonly key: string;
  readonly designation: string;
  readonly answer: "yes" | "no";
  readonly effectiveInDays: number;
}

/**
 * An Omaha game in which Nebraska's Legislature passes each bill on "should
 * the state minimum wage be raised?" (answering yes or no, naming no dollar
 * figure) and the Governor signs it.
 */
function omahaWithRaiseBills(bills: readonly RaiseBill[]) {
  const scenario = createLegislativeScenario("nebraska");
  const template = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "state-minimum-wage-bill-terms",
      placeKey: "3137000",
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const player = game.playerPersonId;
  const opened = game.world.currentDate;
  const chamber = chamberByKey(scenario.pack, "legislature");
  const committee = chamber.committees[0]!;
  const seated = bodyForChamber(scenario, "legislature");
  const body = {
    ...seated,
    members: seated.members.map((member) => ({ ...member, personId: null })),
  };
  let world: World = game.world;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (definition) => definition.stableKey === QUESTION_KEY,
  )!;
  const measures: EntityId[] = [];
  for (const bill of bills) {
    const key = `raise:${bill.key}`;
    world = introduceMeasure(world, {
      stableKey: `${key}:measure`,
      jurisdictionId: template.jurisdictionId,
      rulePackId: template.rulePackId,
      designation: bill.designation.split(",")[0]!,
      shortTitle: "Minimum wage",
      summary: "Answers whether the state minimum wage should be raised.",
      origin: "member-introduction",
      subjectClass: template.subjectClass,
      sponsorPersonId: player,
      propositionIds: [proposition.id],
      propositionAnswers: [
        { propositionId: proposition.id, answer: bill.answer },
      ],
    });
    const measureId = world.history.legislativeMeasures!.find(
      (measure) => measure.stableKey === `${key}:measure`,
    )!.id;
    measures.push(measureId);
    world = referMeasure(world, {
      stableKey: `${key}:referral`,
      measureId,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: `${key}:committee`,
      measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers, nay: 0 },
      ),
      rationale: "The committee backed the bill.",
      provenance: AUTHORED,
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: `${key}:calendar`,
      measureId,
    });
  }
  for (const stage of chamber.floorStages) {
    for (const [index, measureId] of measures.entries()) {
      const until = measurePosition(world, measureId).earliestNextFloorDate;
      if (until && world.currentDate < until)
        world = advanceWorld(
          world,
          daysBetween(world.currentDate, until),
          createFutureTransitionHandlerRegistry([]),
        );
      world = takeFloorVote(world, {
        stableKey: `raise:${bills[index]!.key}:${stage.stageKey}`,
        measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
          nay: 0,
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance: AUTHORED,
      });
    }
  }
  for (const [index, measureId] of measures.entries()) {
    const bill = bills[index]!;
    const key = `raise:${bill.key}`;
    world = enrollMeasure(world, { stableKey: `${key}:enroll`, measureId });
    world = presentMeasureToExecutive(world, {
      stableKey: `${key}:present`,
      measureId,
    });
    world = recordExecutiveAction(world, {
      stableKey: `${key}:governor`,
      measureId,
      action: "signed",
      rationale: "The Governor signed it.",
    });
    world = recordEnactment(world, {
      stableKey: `${key}:enactment`,
      measureId,
      actDesignation: bill.designation,
      effectiveAt: addDays(opened, bill.effectiveInDays),
    });
  }
  return { world, player, opened };
}

const LB_900: RaiseBill = {
  key: "lb-900",
  designation: "LB 900, 2026",
  answer: "yes",
  effectiveInDays: 45,
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
    it("adds the average raise in yearly steps from its effective date, then holds", () => {
      const { world, opened } = omahaWithRaiseBills([LB_900]);
      const effectiveAt = addDays(opened, LB_900.effectiveInDays);
      const before = STATE_RAISE_TERM.yearlyStepMinor;
      const rateBefore = townMinimumHourly(
        lifePlaceByKey("3137000")!.context.jurisdiction.id,
      )!;
      const omaha = lifePlaceByKey("3137000")!.context.jurisdiction.id;
      expect(townMinimumHourlyAt(world, omaha, addDays(effectiveAt, -1))).toBe(
        rateBefore,
      );
      expect(townMinimumHourlyAt(world, omaha, effectiveAt)).toBeCloseTo(
        rateBefore + before / 100,
        5,
      );
      expect(
        townMinimumHourlyAt(world, omaha, addDays(effectiveAt, 366)),
      ).toBeCloseTo(rateBefore + (2 * before) / 100, 5);
      // The third step is cut to the total: $2.00 above the rate before.
      for (const days of [731, 3650]) {
        expect(
          townMinimumHourlyAt(world, omaha, addDays(effectiveAt, days)),
        ).toBeCloseTo(rateBefore + STATE_RAISE_TERM.totalMinor / 100, 5);
      }
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
