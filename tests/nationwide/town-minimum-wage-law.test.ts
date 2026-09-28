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
import {
  fileRuleChangeProvision,
  laborLawOfficeKey,
} from "../../src/simulation/enacted-rule-changes";
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
import { lifePlaceByKey } from "../../src/simulation/life-places";
import {
  nextPaydayDate,
  payPeriodEndingOn,
  payTownPaydays,
  raiseTownPayToMinimum,
  startTownJobPay,
  townMinimumHourly,
  townMinimumHourlyAt,
} from "../../src/simulation/living-world/town-pay";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import {
  advanceWorld,
  withWorldIntegrityDeferred,
} from "../../src/simulation/world";
import type { EntityId, IsoDate, World } from "../../src/simulation";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this fixture.",
  sourceEntityIds: [] as readonly EntityId[],
};

/**
 * An Omaha game in which Nebraska's Legislature passes a bill raising the
 * state minimum wage to `cents` an hour from `effectiveAt`, and the Governor
 * signs it. The Legislature's seats are the Nebraska scenario's, voting by
 * seat without a person in this world behind each one.
 */
function omahaWithMinimumWageLaw(cents: number, effectiveInDays: number) {
  const scenario = createLegislativeScenario("nebraska");
  const template = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "town-minimum-wage-omaha",
      placeKey: "3137000",
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const player = game.playerPersonId;
  const opened = game.world.currentDate;
  let world: World = introduceMeasure(game.world, {
    stableKey: "minimum-wage:measure",
    jurisdictionId: template.jurisdictionId,
    rulePackId: template.rulePackId,
    designation: "LB 900",
    shortTitle: "Minimum wage",
    summary: "Raises the state minimum wage.",
    origin: "member-introduction",
    subjectClass: template.subjectClass,
    sponsorPersonId: player,
  });
  const measureId = world.history.legislativeMeasures!.find(
    (measure) => measure.stableKey === "minimum-wage:measure",
  )!.id;
  world = fileRuleChangeProvision(world, {
    stableKey: "minimum-wage:floor",
    measureId,
    officeKey: laborLawOfficeKey("NE"),
    field: "labor.minimumWage.hourlyCents",
    value: cents,
  });
  const chamber = chamberByKey(scenario.pack, "legislature");
  const committee = chamber.committees[0]!;
  const seated = bodyForChamber(scenario, "legislature");
  const body = {
    ...seated,
    members: seated.members.map((member) => ({ ...member, personId: null })),
  };
  world = referMeasure(world, {
    stableKey: "minimum-wage:referral",
    measureId,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: "minimum-wage:committee",
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
    stableKey: "minimum-wage:calendar",
    measureId,
  });
  for (const stage of chamber.floorStages) {
    const until = measurePosition(world, measureId).earliestNextFloorDate;
    if (until && world.currentDate < until)
      world = advanceWorld(
        world,
        daysBetween(world.currentDate, until),
        createFutureTransitionHandlerRegistry([]),
      );
    world = takeFloorVote(world, {
      stableKey: `minimum-wage:${stage.stageKey}`,
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
  world = enrollMeasure(world, { stableKey: "minimum-wage:enroll", measureId });
  world = presentMeasureToExecutive(world, {
    stableKey: "minimum-wage:present",
    measureId,
  });
  world = recordExecutiveAction(world, {
    stableKey: "minimum-wage:governor",
    measureId,
    action: "signed",
    rationale: "The Governor signed it.",
  });
  const effectiveAt = addDays(opened, effectiveInDays);
  world = recordEnactment(world, {
    stableKey: "minimum-wage:enactment",
    measureId,
    actDesignation: "LB 900, 2026",
    effectiveAt,
  });
  return { world, player, opened, effectiveAt };
}

/** Runs every payday from `since` through `days` later, as the payday transition does. */
function runPaydays(
  start: World,
  player: EntityId,
  since: IsoDate,
  days: number,
): World {
  let world = startTownJobPay(start, player, since);
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
      world = raiseTownPayToMinimum(world, player);
      world = startTownJobPay(world, player, paidThrough);
      world = payTownPaydays(world, paidThrough, player);
      paidThrough = payday;
    }
  });
  return world;
}

describe(
  "a state minimum-wage law raises town paychecks on its effective date",
  { timeout: 600_000 },
  () => {
    it("Nebraska raises the floor to $18.00 and every job paid below it is raised from its first pay period after", () => {
      const {
        world: enacted,
        player,
        opened,
        effectiveAt,
      } = omahaWithMinimumWageLaw(1_800, 45);
      const omaha = lifePlaceByKey("3137000")!.context.jurisdiction.id;
      // Nebraska's own rate before the law, the law's rate from its effective date.
      expect(townMinimumHourlyAt(enacted, omaha, opened)).toBe(
        townMinimumHourly(omaha),
      );
      expect(townMinimumHourly(omaha)).toBeLessThan(18);
      expect(
        townMinimumHourlyAt(enacted, omaha, addDays(effectiveAt, -1)),
      ).toBe(townMinimumHourly(omaha));
      expect(townMinimumHourlyAt(enacted, omaha, effectiveAt)).toBe(18);

      const world = runPaydays(enacted, player, opened, 100);
      const payFlows = world.history.resourceFlows.filter((flow) =>
        flow.stableKey.startsWith("town-pay-v2:job-pay:"),
      );
      const raises = world.history.resourceFlowTerms.filter((terms) =>
        terms.stableKey.includes(":minimum-wage:"),
      );
      expect(payFlows.length).toBeGreaterThan(20);
      expect(raises.length).toBeGreaterThan(0);

      let raisedPaychecks = 0;
      for (const raise of raises) {
        const flow = payFlows.find((row) => row.id === raise.resourceFlowId)!;
        const before = world.history.resourceFlowTerms.find(
          (terms) => terms.id === raise.supersedesTermsId,
        )!;
        // On or after the law's effective date, on the first day of a period.
        expect(raise.effectiveAt >= effectiveAt).toBe(true);
        expect(raise.amount.minorUnits).toBeGreaterThan(
          before.amount.minorUnits,
        );
        expect(raise.reason).toBe(
          "LB 900, 2026 raised the state minimum wage to $18.00 an hour.",
        );
        expect(raise.provenance.kind).toBe("simulated-event");
        const note = /town-(\w+?)(?:-(\d))?$/.exec(raise.cadenceKind)!;
        expect(
          payPeriodEndingOn(
            note[1] as "weekly",
            addDays(raise.effectiveAt, -1),
            Number(note[2] ?? 0),
          ),
        ).not.toBeNull();
        for (const paycheck of world.history.resourceTransferOutcomes) {
          if (paycheck.resourceFlowId !== flow.id) continue;
          const raised = paycheck.periodStartsAt >= raise.effectiveAt;
          expect(paycheck.transferredAmount.minorUnits).toBe(
            raised ? raise.amount.minorUnits : before.amount.minorUnits,
          );
          if (raised) raisedPaychecks += 1;
        }
      }
      // A counted number of paychecks is raised, none before the law.
      expect(raisedPaychecks).toBeGreaterThan(0);
      console.info(
        `Nebraska LB 900: ${raises.length} of ${payFlows.length} town jobs raised to $18.00; ${raisedPaychecks} paychecks paid at the new rate by ${addDays(opened, 100)}.`,
      );
      // No job is left below the new floor.
      const periodsPerYear: Record<string, number> = {
        weekly: 52,
        biweekly: 26,
        semimonthly: 24,
        monthly: 12,
      };
      for (const flow of payFlows) {
        if (flow.basisReference.kind !== "work") continue;
        const workId = flow.basisReference.workRelationshipId;
        const role = world.history.workRoles.findLast(
          (row) => row.workRelationshipId === workId,
        )!;
        const terms = world.history.resourceFlowTerms.findLast(
          (row) => row.resourceFlowId === flow.id,
        )!;
        const { minimumHours, maximumHours } = role.timeDemand.expectedWeekly;
        const period = /town-(\w+?)(?:-\d)?$/.exec(terms.cadenceKind)![1]!;
        const floor = Math.round(
          (1_800 * ((minimumHours + maximumHours) / 2) * 52) /
            periodsPerYear[period]!,
        );
        expect(terms.amount.minorUnits, flow.stableKey).toBeGreaterThanOrEqual(
          floor,
        );
      }
      // Raising again changes nothing.
      expect(raiseTownPayToMinimum(world, player)).toBe(world);
    });

    it("reaches Nebraska alone: every other state, D.C. and territory keeps its own rate", () => {
      const { world, effectiveAt } = omahaWithMinimumWageLaw(1_800, 45);
      const largest = new Map<string, string>();
      const people = new Map<string, number>();
      for (const pair of PLACE_POPULATION_ROWS.split(";")) {
        const [geoid, count] = pair.split(":") as [string, string];
        const state = geoid.slice(0, 2);
        if ((people.get(state) ?? -1) < Number(count)) {
          people.set(state, Number(count));
          largest.set(state, geoid);
        }
      }
      // Hawaii has no incorporated places; Honolulu is its census place.
      largest.set("15", "1571550");
      largest.set("72", "7276770");
      for (const [key, , usps] of TERRITORY_PLACE_ROWS)
        if (!largest.has(usps)) largest.set(usps, key);
      expect(largest.size).toBe(56);
      for (const key of largest.values()) {
        const place = lifePlaceByKey(key)!;
        const jurisdiction = place.context.jurisdiction.id;
        expect(townMinimumHourlyAt(world, jurisdiction, effectiveAt), key).toBe(
          place.stateJurisdictionKey === "US-NE"
            ? 18
            : townMinimumHourly(jurisdiction),
        );
      }
    });
  },
);
