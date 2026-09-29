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
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
} from "../../src/simulation/living-world/town-pay";
import {
  LAW_EFFECT_EVENT_TYPE,
  LAW_EFFECT_MEASURE_TAG,
  reportLawEffects,
} from "../../src/simulation/press/law-effect-news";
import { recordLawExposure } from "../../src/simulation/law-exposure";
import { money } from "../../src/simulation/resources";
import {
  PRESS_DESK_SWEEP_TRANSITION_KEY,
  pressDeskSweepHandler,
  storyLeads,
} from "../../src/simulation/press/desk";
import { mediaOutlets } from "../../src/simulation/press/outlets";
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

/*
 * The minimum-wage fixture is the one tests/nationwide/town-minimum-wage-law
 * uses: a law passed through Nebraska's Legislature and signed, raising town
 * paychecks from its effective date. The press reads what that law did, in
 * the same records any law's lane writes, so the rule here is the same in
 * every place; the watched worlds in random places are in the hand-back.
 */
const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this fixture.",
  sourceEntityIds: [] as readonly EntityId[],
};

interface MinimumWageBill {
  readonly key: string;
  readonly designation: string;
  readonly cents: number;
  readonly effectiveInDays: number;
}

/**
 * An Omaha game in which Nebraska's Legislature passes each bill, raising the
 * state minimum wage to its `cents` an hour from its effective date, and the
 * Governor signs it. The Legislature's seats are the Nebraska scenario's,
 * voting by seat without a person in this world behind each one.
 */
function omahaWithMinimumWageLaws(bills: readonly MinimumWageBill[]) {
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
  const chamber = chamberByKey(scenario.pack, "legislature");
  const committee = chamber.committees[0]!;
  const seated = bodyForChamber(scenario, "legislature");
  const body = {
    ...seated,
    members: seated.members.map((member) => ({ ...member, personId: null })),
  };
  let world: World = game.world;
  // The bills move together, so the chamber's waits between readings pass once.
  const measures: EntityId[] = [];
  for (const bill of bills) {
    const key = `minimum-wage:${bill.key}`;
    world = introduceMeasure(world, {
      stableKey: `${key}:measure`,
      jurisdictionId: template.jurisdictionId,
      rulePackId: template.rulePackId,
      designation: bill.designation.split(",")[0]!,
      shortTitle: "Minimum wage",
      summary: "Raises the state minimum wage.",
      origin: "member-introduction",
      subjectClass: template.subjectClass,
      sponsorPersonId: player,
    });
    const measureId = world.history.legislativeMeasures!.find(
      (measure) => measure.stableKey === `${key}:measure`,
    )!.id;
    measures.push(measureId);
    world = fileRuleChangeProvision(world, {
      stableKey: `${key}:floor`,
      measureId,
      officeKey: laborLawOfficeKey("NE"),
      field: "labor.minimumWage.hourlyCents",
      value: bill.cents,
    });
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
        stableKey: `minimum-wage:${bills[index]!.key}:${stage.stageKey}`,
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
    const key = `minimum-wage:${bill.key}`;
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

const LB_900: MinimumWageBill = {
  key: "lb-900",
  designation: "LB 900, 2026",
  cents: 1_800,
  effectiveInDays: 45,
};

/**
 * Runs the payday transition on every payday from the game's opening through
 * `days` later, or, with `every` false, once on the last payday, as a game
 * that skipped ahead would.
 */
function runPaydays(
  start: World,
  since: IsoDate,
  days: number,
  every = true,
): World {
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
    for (const payday of every ? paydays : paydays.slice(-1)) {
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

/** Every law-effect record, in order. */
function lawEffects(world: World) {
  return world.history.events.filter(
    (event) => event.type === LAW_EFFECT_EVENT_TYPE,
  );
}

describe(
  "a law that changes something for a town's people is news there",
  { timeout: 600_000 },
  () => {
    it("the raises a minimum-wage law gave become one record in each town, which the papers take up", () => {
      const { world: enacted, opened } = omahaWithMinimumWageLaws([LB_900]);
      const frontier = enacted.history.nextSequence;
      const paid = runPaydays(enacted, opened, 100);
      const raises = paid.history.resourceFlowTerms.filter(
        (terms) =>
          terms.sequence >= frontier &&
          terms.stableKey.includes(":minimum-wage:"),
      );
      expect(raises.length).toBeGreaterThan(0);

      const reported = reportLawEffects(paid, frontier - 1);
      const records = lawEffects(reported);
      expect(records.length).toBeGreaterThan(0);
      const flows = new Map(
        paid.history.resourceFlows.map((flow) => [flow.id, flow]),
      );
      // Every raised worker is counted once, in the town they live in.
      const workersByTown = new Map<EntityId, Set<EntityId>>();
      for (const raise of raises) {
        const recipient = flows.get(raise.resourceFlowId)!.recipient;
        if (recipient.kind !== "person") continue;
        const town = paid.people[recipient.personId]!.homeJurisdictionId;
        const set = workersByTown.get(town) ?? new Set<EntityId>();
        set.add(recipient.personId);
        workersByTown.set(town, set);
      }
      expect(new Set(records.map((event) => event.jurisdictionId))).toEqual(
        new Set(workersByTown.keys()),
      );
      for (const event of records) {
        const workers = workersByTown.get(event.jurisdictionId!)!.size;
        expect(event.visibility).toBe("public");
        expect(event.participants).toEqual([]);
        expect(event.summary).toMatch(
          new RegExp(`^LB 900, 2026 raised pay for ${workers} workers?\\.$`),
        );
        expect(event.tags).toContain(`law-effect:people:${workers}`);
        expect(event.context.socialContext).toContain(
          "LB 900, 2026 raised the state minimum wage to $18.00 an hour.",
        );
        expect(event.context.socialContext).toContain("more a paycheck");
      }
      console.info(
        records
          .map((event) => `${event.summary} ${event.context.socialContext}`)
          .join("\n"),
      );

      // Read again, nothing is news twice.
      expect(reportLawEffects(reported, frontier - 1)).toBe(reported);

      // A worker told of the raise (an exposure citing the raised pay row)
      // is the same change, not a second story.
      let told = paid;
      // As in the sweep below, the fixture's other due items are left behind.
      withWorldIntegrityDeferred(() => {
        for (const raise of raises) {
          const recipient = flows.get(raise.resourceFlowId)!.recipient;
          if (recipient.kind !== "person") continue;
          told = recordLawExposure(told, {
            stableKey: `test:told:${raise.id}`,
            personId: recipient.personId,
            measureId: records[0]!.tags
              .find((tag) => tag.startsWith(LAW_EFFECT_MEASURE_TAG))!
              .slice(LAW_EFFECT_MEASURE_TAG.length) as EntityId,
            channel: "paycheck",
            direction: "gain",
            amount: money(1_000, "USD"),
            cadence: "monthly",
            sourceRecordId: raise.id,
          });
        }
      });
      expect(told.history.lawExposures!.length).toBeGreaterThan(0);
      expect(
        lawEffects(reportLawEffects(told, frontier - 1)).map(
          (event) => event.stableKey,
        ),
      ).toEqual(records.map((event) => event.stableKey));

      // The desk's weekly sweep writes the same records and takes them up.
      const due = {
        stableKey: "press46:desk-sweep:900",
        transitionKey: PRESS_DESK_SWEEP_TRANSITION_KEY,
        sequence: frontier - 1,
      } as FutureDueItem;
      // The fixture pays town jobs without running the rest of the calendar,
      // as the town-pay test does, so other due items are left behind.
      let swept = paid;
      withWorldIntegrityDeferred(() => {
        swept = pressDeskSweepHandler(paid, due).world;
      });
      const effectIds = new Set(lawEffects(swept).map((event) => event.id));
      expect(effectIds.size).toBe(records.length);
      const omaha = lifePlaceByKey("3137000")!.context.jurisdiction.id;
      const localPaper = mediaOutlets(swept).find(
        (outlet) =>
          outlet.scope === "local" &&
          outlet.primaryJurisdictionIds.includes(omaha),
      );
      const leads = storyLeads(swept).filter((lead) =>
        lead.basisEventIds.some((id) => effectIds.has(id)),
      );
      expect(leads.length).toBeGreaterThan(0);
      // Omaha's own paper and the state's take it up.
      expect(workersByTown.has(omaha)).toBe(true);
      expect(leads.map((lead) => lead.outletId)).toContain(localPaper!.id);
      expect(
        leads.some(
          (lead) =>
            mediaOutlets(swept).find((outlet) => outlet.id === lead.outletId)
              ?.scope === "state",
        ),
      ).toBe(true);
    });

    it("a law that changes nobody's pay is not news", () => {
      const { world: enacted, opened } = omahaWithMinimumWageLaws([
        {
          key: "lb-902",
          designation: "LB 902, 2026",
          cents: 500,
          effectiveInDays: 45,
        },
      ]);
      const frontier = enacted.history.nextSequence;
      const paid = runPaydays(enacted, opened, 100);
      expect(lawEffects(reportLawEffects(paid, frontier - 1))).toEqual([]);
    });
  },
);
