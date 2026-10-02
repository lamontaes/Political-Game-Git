import { describe, expect, it } from "vitest";
import { authoredWageTerm } from "../fixtures/authored-wage-term";
const ADOPTED_FEDERAL_FLOOR_MINOR = 1500;

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  lifePlaceByKey,
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../src/simulation/life-places";
import {
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
  payPeriodEndingOn,
  raiseTownPayToMinimum,
  type TownPayPeriod,
} from "../../src/simulation/living-world/town-pay";
import { TOWN_MINIMUM_WAGES } from "../../src/simulation/living-world/town-pay.generated";
import {
  FEDERAL_MINIMUM_HOURLY_MINOR,
  federalMinimumSchedule,
  minimumHourlyAt,
} from "../../src/simulation/minimum-wage";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { recordWorkStatus } from "../../src/simulation/life";
import { workStatusAt } from "../../src/simulation/life-queries";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type {
  EntityId,
  FutureDueItem,
  IsoDate,
  World,
} from "../../src/simulation";

const NASHVILLE = "4752006";
/**
 * A Nashville game in which Congress has answered "should the federal minimum
 * wage go up?" yes, in force `effectiveInDays` after the game opens. The Act
 * has an explicit authored $15 hourly term. This reader control does not
 * prove passage through the ordinary legislative desk.
 */
function nashvilleWithFederalRaise(effectiveInDays: number) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "town-federal-minimum-wage-nashville",
      placeKey: NASHVILLE,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const opened = game.world.currentDate;
  const effectiveAt = addDays(opened, effectiveInDays);
  const enacted = authoredWageTerm(game.world, {
    key: "test:federal-wage",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    questionKey:
      "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
    answer: "yes",
    effectiveAt,
    designation: "H.R. 1",
    termKey: "floor",
    amountMinor: ADOPTED_FEDERAL_FLOOR_MINOR,
  });
  const world = { ...enacted, currentDate: effectiveAt };
  return { world, opened, effectiveAt };
}

/** Runs the payday transition on every payday from the game's opening. */
function runPaydays(start: World, since: IsoDate, days: number): World {
  let world = start;
  let paidThrough = since;
  const until = addDays(since, days);
  const paydays: IsoDate[] = [];
  for (
    let payday = nextPaydayDate(world.currentDate);
    payday <= until;
    payday = nextPaydayDate(payday)
  )
    paydays.push(payday);
  withWorldIntegrityDeferred(() => {
    for (const payday of paydays) {
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

/** The first day of a pay period on or after `date`. */
function firstPeriodStart(cadenceKind: string, date: IsoDate): IsoDate {
  const note = /town-(\w+?)(?:-(\d))?$/.exec(cadenceKind)!;
  let day = date;
  while (
    !payPeriodEndingOn(
      note[1] as TownPayPeriod,
      addDays(day, -1),
      Number(note[2] ?? 0),
    )
  )
    day = addDays(day, 1);
  return day;
}

describe("the federal minimum wage is the floor everywhere", () => {
  it("is $7.25 until an Act raises it, then the raise, and never below a state's own rate", () => {
    const { world, opened, effectiveAt } = nashvilleWithFederalRaise(45);
    expect(federalMinimumSchedule(world).map((step) => step.from)).toEqual([
      effectiveAt,
    ]);
    const nashville = lifePlaceByKey(NASHVILLE)!.context.jurisdiction.id;
    expect(minimumHourlyAt(world, nashville, opened)).toBe(7.25);
    expect(minimumHourlyAt(world, nashville, addDays(effectiveAt, -1))).toBe(
      7.25,
    );
    expect(minimumHourlyAt(world, nashville, effectiveAt)).toBe(
      ADOPTED_FEDERAL_FLOOR_MINOR / 100,
    );
    // All 56 places: the higher of the raise and the state's own rate; a
    // state whose rate is unknown stays unknown (never zero, never the raise).
    let places = 0;
    for (const state of lifePlaceStateIdentities()) {
      const town = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
      }).find((place) => place.scope !== "state")!;
      const jurisdiction = town.context.jurisdiction.id;
      const own = TOWN_MINIMUM_WAGES[state.jurisdictionKey];
      const floor = minimumHourlyAt(world, jurisdiction, effectiveAt);
      if (own === null) expect(floor, state.jurisdictionKey).toBeNull();
      else
        expect(floor, state.jurisdictionKey).toBe(
          Math.max(15, own ?? FEDERAL_MINIMUM_HOURLY_MINOR / 100),
        );
      places += 1;
    }
    expect(places).toBe(56);
  });

  it("a law that repeals the raise ends the floor and cuts nobody's pay", () => {
    const { world, effectiveAt } = nashvilleWithFederalRaise(45);
    const repeal = addDays(effectiveAt, 200);
    const enacted = authoredWageTerm(world, {
      key: "test:repeal",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      questionKey:
        "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
      answer: "no",
      effectiveAt: repeal,
      designation: "H.R. 2",
      termKey: "floor",
      amountMinor: FEDERAL_MINIMUM_HOURLY_MINOR,
    });
    const later = { ...enacted, currentDate: repeal };
    const nashville = lifePlaceByKey(NASHVILLE)!.context.jurisdiction.id;
    expect(minimumHourlyAt(later, nashville, addDays(repeal, -1))).toBe(15);
    expect(minimumHourlyAt(later, nashville, repeal)).toBe(7.25);
  });
});

describe(
  "the federal raise changes named paychecks in Nashville",
  { timeout: 600_000 },
  () => {
    it("raises every Tennessee town job paid below $15.00 an hour from its first pay period after the law, and records each as a pay-term change", () => {
      const {
        world: enacted,
        opened,
        effectiveAt,
      } = nashvilleWithFederalRaise(45);
      const world = runPaydays(enacted, opened, 100);
      const payFlows = world.history.resourceFlows.filter((flow) =>
        flow.stableKey.startsWith("town-pay-v2:job-pay:"),
      );
      const raises = world.history.resourceFlowTerms.filter((terms) =>
        terms.stableKey.includes(":minimum-wage:"),
      );
      expect(payFlows.length).toBeGreaterThan(20);
      expect(raises.length).toBeGreaterThan(0);

      const lines: string[] = [];
      let raisedPaychecks = 0;
      for (const raise of raises) {
        const flow = payFlows.find((row) => row.id === raise.resourceFlowId)!;
        const before = world.history.resourceFlowTerms.find(
          (terms) => terms.id === raise.supersedesTermsId,
        )!;
        expect(raise.effectiveAt).toBe(
          firstPeriodStart(raise.cadenceKind, effectiveAt),
        );
        expect(raise.amount.minorUnits).toBeGreaterThan(
          before.amount.minorUnits,
        );
        expect(raise.reason).toBe(
          "H.R. 1 raised the federal minimum wage to $15.00 an hour.",
        );
        expect(raise.provenance.kind).toBe("simulated-event");
        expect(raise.status).toBe("active");
        for (const paycheck of world.history.resourceTransferOutcomes) {
          if (paycheck.resourceFlowId !== flow.id) continue;
          const raised = paycheck.periodStartsAt >= raise.effectiveAt;
          expect(paycheck.transferredAmount.minorUnits).toBe(
            raised ? raise.amount.minorUnits : before.amount.minorUnits,
          );
          if (raised) raisedPaychecks += 1;
        }
        if (
          flow.recipient.kind === "person" &&
          lines.length < 5 &&
          world.people[flow.recipient.personId]
        ) {
          const person = world.people[flow.recipient.personId]!;
          const after = world.history.resourceTransferOutcomes.find(
            (paycheck) =>
              paycheck.resourceFlowId === flow.id &&
              paycheck.periodStartsAt >= raise.effectiveAt,
          );
          lines.push(
            `${person.givenName} ${person.familyName}: $${(before.amount.minorUnits / 100).toFixed(2)} -> $${(raise.amount.minorUnits / 100).toFixed(2)} a ${/town-(\w+?)(?:-\d)?$/.exec(raise.cadenceKind)![1]} paycheck${after ? `, paid $${(after.transferredAmount.minorUnits / 100).toFixed(2)} for the period starting ${after.periodStartsAt}` : ""}`,
          );
        }
      }
      expect(raisedPaychecks).toBeGreaterThan(0);
      console.info(
        `Federal raise to $15.00, in force ${effectiveAt}: ${raises.length} of ${payFlows.length} Nashville town jobs raised; ${raisedPaychecks} paychecks paid at the new rate by ${addDays(opened, 100)}.\n${lines.join("\n")}`,
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
          (1_500 * ((minimumHours + maximumHours) / 2) * 52) /
            periodsPerYear[period]!,
        );
        expect(terms.amount.minorUnits, flow.stableKey).toBeGreaterThanOrEqual(
          floor,
        );
      }

      // Raising again changes nothing.
      const player =
        world.control.kind === "person" ? world.control.personId : null;
      expect(raiseTownPayToMinimum(world, player)).toBe(world);
    });

    it("does not raise the pay of a job that has ended", () => {
      const { world: enacted, opened } = nashvilleWithFederalRaise(45);
      const raised = runPaydays(enacted, opened, 100);
      const flowOf = (world: World, termsId: EntityId) =>
        world.history.resourceFlows.find((flow) => flow.id === termsId)!;
      const raises = raised.history.resourceFlowTerms.filter((terms) =>
        terms.stableKey.includes(":minimum-wage:"),
      );
      expect(raises.length).toBeGreaterThan(1);
      const endedFlow = flowOf(raised, raises[0]!.resourceFlowId);
      expect(endedFlow.basisReference.kind).toBe("work");
      const workId =
        endedFlow.basisReference.kind === "work"
          ? endedFlow.basisReference.workRelationshipId
          : null!;
      // The same game, but that job ends ten days in, after pay has begun.
      const early = runPaydays(enacted, opened, 10);
      const status = workStatusAt(early, workId)!;
      let withEnded = early;
      withWorldIntegrityDeferred(() => {
        withEnded = recordWorkStatus(early, {
          stableKey: "test:federal-wage:job-ended",
          workRelationshipId: workId,
          effectiveAt: early.currentDate,
          status: "ended",
          reason: "The job ended.",
          supersedesStatusId: status.id,
          provenance: { kind: "authored", note: "A test job ended." },
        });
      });
      const world = runPaydays(withEnded, early.currentDate, 90);
      const afterRaises = world.history.resourceFlowTerms.filter((terms) =>
        terms.stableKey.includes(":minimum-wage:"),
      );
      expect(
        afterRaises.some((terms) => terms.resourceFlowId === endedFlow.id),
      ).toBe(false);
      expect(afterRaises.length).toBeGreaterThan(0);
    });

    it("pays nothing more before the law takes effect", () => {
      const {
        world: enacted,
        opened,
        effectiveAt,
      } = nashvilleWithFederalRaise(120);
      const world = runPaydays(enacted, opened, 100);
      expect(addDays(opened, 100) < effectiveAt).toBe(true);
      expect(
        world.history.resourceFlowTerms.filter((terms) =>
          terms.stableKey.includes(":minimum-wage:"),
        ),
      ).toHaveLength(0);
    });
  },
);
