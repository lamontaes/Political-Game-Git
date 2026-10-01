import { describe, expect, it } from "vitest";

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
import {
  FEDERAL_MINIMUM_HOURLY_MINOR,
  federalMinimumSchedule,
  minimumHourlyAt,
  startingStateMinimumHourly,
} from "../../src/simulation/minimum-wage";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../src/simulation/national-election-geography";
import { recordWorkStatus } from "../../src/simulation/life";
import { workStatusAt } from "../../src/simulation/life-queries";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import {
  recordWorldEvent,
  withWorldIntegrityDeferred,
} from "../../src/simulation/world";
import type {
  EntityId,
  FutureDueItem,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

import { recordFiledProvision } from "../../src/simulation/legislative-politics";

const FICTIONAL_FEDERAL_FLOOR_MINOR = 1500;
const NASHVILLE = "4752006";
const POLICY = createProductionPolicyCatalog();
const RAISE_QUESTION = POLICY.propositionOrder.find(
  (id) =>
    POLICY.propositions[id]!.stableKey ===
    "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
)!;

/**
 * A Nashville game in which Congress has answered "should the federal minimum
 * wage go up?" yes, in force `effectiveInDays` after the game opens. The Act
 * supplies explicit isolated legislative records and carries
 * an explicit fictional $15.00 hourly term. This legacy isolated fixture is
 * not evidence of natural legal adoption; canonical procedure is tested separately.
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
  const nashville = lifePlaceByKey(NASHVILLE)!.context.jurisdiction;
  const recorded = recordWorldEvent(game.world, {
    stableKey: "event:test:federal-wage:enacted",
    type: "legislation.measure-enacted",
    occurredAt: opened,
    recordedAt: opened,
    jurisdictionId: nashville.id,
    involvedEntityIds: [game.playerPersonId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.enacted"],
    summary: "H.R. 1 became law.",
    context: {
      location: {
        jurisdictionId: nashville.id,
        label: nashville.name,
        setting: null,
      },
      socialContext: "The measure completed every required step.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const measure: LegislativeMeasureRecord = {
    id: "measure_federal_wage" as EntityId,
    stableKey: "test:federal-wage",
    sequence: 1,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "us-congress-v1",
    designation: "H.R. 1",
    shortTitle: "Raise the federal minimum wage",
    summary: "A test Act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: opened,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [RAISE_QUESTION],
    propositionAnswers: [{ propositionId: RAISE_QUESTION, answer: "yes" }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "enactment_federal_wage" as EntityId,
    stableKey: "test:federal-wage:enactment",
    sequence: 1_000_001,
    measureId: measure.id,
    resolvedAt: opened,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: addDays(opened, effectiveInDays),
    outcomeEventId: recorded.history.events.find(
      (event) => event.stableKey === "event:test:federal-wage:enacted",
    )!.id,
  };
  let world = {
    ...ensureNationalElectionJurisdiction(recorded),
    policyCatalog: POLICY,
    history: {
      ...recorded.history,
      legislativeMeasures: [
        ...(recorded.history.legislativeMeasures ?? []),
        measure,
      ],
    },
  } as World;
  world = recordFiledProvision(world, {
    stableKey: "test:federal-wage:explicit-floor",
    measureId: measure.id,
    provisionKey: "federal-hourly-floor",
    sectionNumber: 1,
    heading: "Fictional hourly floor",
    text: "This fictional Act sets the hourly floor to $15.00.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "covered work",
    },
    applicationScope: {
      jurisdictionId: measure.jurisdictionId,
      segmentKey: null,
    },
    lawTerms: [
      {
        questionKey: POLICY.propositions[RAISE_QUESTION]!.stableKey,
        key: "floor",
        value: FICTIONAL_FEDERAL_FLOOR_MINOR,
        unit: "minor/hour",
      },
    ],
  });
  world = {
    ...world,
    history: {
      ...world.history,
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
  return { world, opened, effectiveAt: enactment.effectiveAt! };
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
    expect(federalMinimumSchedule(world)).toEqual([]);
    const arrived = {
      ...world,
      currentDate: effectiveAt,
      currentMoment: simulationMomentOnLocalDate(
        world.currentMoment,
        effectiveAt,
      ),
    };
    expect(federalMinimumSchedule(arrived).map((step) => step.from)).toEqual([
      effectiveAt,
    ]);
    const nashville = lifePlaceByKey(NASHVILLE)!.context.jurisdiction.id;
    expect(minimumHourlyAt(world, nashville, opened)).toBe(7.25);
    expect(minimumHourlyAt(world, nashville, addDays(effectiveAt, -1))).toBe(
      7.25,
    );
    expect(minimumHourlyAt(arrived, nashville, effectiveAt)).toBe(
      FICTIONAL_FEDERAL_FLOOR_MINOR / 100,
    );
    // All 56 places: the higher of the raise and the state's own rate; a
    // state whose rate is unknown stays unknown (never zero, never the raise).
    let places = 0;
    for (const state of lifePlaceStateIdentities()) {
      const town = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
      }).find((place) => place.scope !== "state")!;
      const jurisdiction = town.context.jurisdiction.id;
      const own = startingStateMinimumHourly(
        state.jurisdictionKey,
        arrived,
        effectiveAt,
      );
      const floor = minimumHourlyAt(arrived, jurisdiction, effectiveAt);
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
    const measure = {
      ...world.history.legislativeMeasures!.at(-1)!,
      id: "measure_repeal" as EntityId,
      stableKey: "test:repeal",
      sequence: 2,
      designation: "H.R. 2",
      propositionAnswers: [{ propositionId: RAISE_QUESTION, answer: "no" }],
    } as LegislativeMeasureRecord;
    const later = {
      ...world,
      history: {
        ...world.history,
        legislativeMeasures: [...world.history.legislativeMeasures!, measure],
        legislativeEnactments: [
          ...world.history.legislativeEnactments!,
          {
            ...world.history.legislativeEnactments!.at(-1)!,
            id: "enactment_repeal" as EntityId,
            stableKey: "test:repeal:enactment",
            sequence: 1_000_002,
            measureId: measure.id,
            resolvedAt: effectiveAt,
            effectiveAt: repeal,
          },
        ],
      },
    } as World;
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
