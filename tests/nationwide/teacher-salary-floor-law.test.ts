import { describe, expect, it } from "vitest";

import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import {
  addDays,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  lifePlaceByJurisdictionId,
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { organizationProfileAt } from "../../src/simulation/life-queries";
import {
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
  stateMedianAnnualWage,
} from "../../src/simulation/living-world/town-pay";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import {
  schoolYearStartOnOrAfter,
  TEACHER_FLOOR_OF_STATE_MEDIAN,
  TEACHER_SALARY_FLOOR_QUESTION,
  teacherSalaryFloorAt,
} from "../../src/simulation/teacher-salary-floor";
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

/**
 * The watched place is drawn from all 56 jurisdictions by the observer's own
 * draw (`observerPlace`), then a town inside the state; seed
 * build20-teacher-floor-0835 opens Appomattox, Virginia (5102072).
 */
const SEED = "build20-teacher-floor-0835";
const POLICY = createProductionPolicyCatalog();
const FLOOR_QUESTION = POLICY.propositionOrder.find(
  (id) => POLICY.propositions[id]!.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
)!;

/**
 * Records a state law on the teacher salary floor question, answered
 * `answer`, in force `effectiveAt`, the way the legislative route records one.
 */
function enactStateLaw(
  world: World,
  stateId: EntityId,
  answer: "yes" | "no",
  n: number,
  effectiveAt: IsoDate,
): World {
  const designation = `S.B. ${n}`;
  const recorded = recordWorldEvent(world, {
    stableKey: `event:test:teacher-floor:${n}`,
    type: "legislation.measure-enacted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: stateId,
    involvedEntityIds: [world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.enacted"],
    summary: `${designation} became law.`,
    context: {
      location: {
        jurisdictionId: stateId,
        label: "State capitol",
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
    id: `measure_teacher_floor_${n}` as EntityId,
    stableKey: `test:teacher-floor:${n}`,
    sequence: n,
    jurisdictionId: stateId,
    rulePackId: "us-state-legislature-v1",
    designation,
    shortTitle: "Teacher salary floor",
    summary: "A test Act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "senate",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [FLOOR_QUESTION],
    propositionAnswers: [{ propositionId: FLOOR_QUESTION, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_teacher_floor_${n}` as EntityId,
    stableKey: `test:teacher-floor:${n}:enactment`,
    sequence: 2_000_000 + n,
    measureId: measure.id,
    resolvedAt: world.currentDate,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt,
    outcomeEventId: recorded.history.events.find(
      (event) => event.stableKey === `event:test:teacher-floor:${n}`,
    )!.id,
  };
  return {
    ...recorded,
    policyCatalog: world.policyCatalog ?? POLICY,
    history: {
      ...recorded.history,
      legislativeMeasures: [
        ...(recorded.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(recorded.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  } as World;
}

function runPaydays(start: World, until: IsoDate): World {
  let world = start;
  let paidThrough = world.currentDate;
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

describe("the state's minimum teacher salary", { timeout: 900_000 }, () => {
  const opened = openObserverWorld(observerSetup(SEED));

  it("is set by a law enacted in play, from the next school year, as 81% of the state's median teacher wage, in all 56 places", () => {
    expect(schoolYearStartOnOrAfter(makeIsoDate("2026-02-15"))).toBe(
      "2026-07-01",
    );
    expect(schoolYearStartOnOrAfter(makeIsoDate("2026-07-01"))).toBe(
      "2026-07-01",
    );
    expect(schoolYearStartOnOrAfter(makeIsoDate("2026-07-02"))).toBe(
      "2027-07-01",
    );
    let counted = 0;
    let floors = 0;
    for (const state of lifePlaceStateIdentities()) {
      const places = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
      });
      const town =
        places.find((place) => place.scope === "locality") ??
        places.find((place) => place.scope !== "state")!;
      const jurisdiction = town.context.jurisdiction.id;
      const median = stateMedianAnnualWage("profession:teacher", jurisdiction);
      const stateId = stateJurisdictionForKey(state.jurisdictionKey)!.id;
      const world = enactStateLaw(
        opened.world,
        stateId,
        "yes",
        1,
        makeIsoDate("2026-03-01"),
      );
      // Nothing before the school year the law first reaches.
      expect(
        teacherSalaryFloorAt(
          world,
          jurisdiction,
          makeIsoDate("2026-06-30"),
          median,
        ),
      ).toBeNull();
      const floor = teacherSalaryFloorAt(
        world,
        jurisdiction,
        makeIsoDate("2026-07-01"),
        median,
      );
      // BLS publishes no wages for American Samoa or the Northern Mariana
      // Islands, so no floor is claimed there.
      if (median === null) expect(floor, state.jurisdictionKey).toBeNull();
      else {
        expect(floor?.annual, state.jurisdictionKey).toBe(
          Math.round(median * TEACHER_FLOOR_OF_STATE_MEDIAN.central),
        );
        floors += 1;
      }
      // A later law answering no ends it, from its own effective day.
      const repealed = enactStateLaw(
        world,
        stateId,
        "no",
        2,
        makeIsoDate("2027-03-01"),
      );
      expect(
        teacherSalaryFloorAt(
          repealed,
          jurisdiction,
          makeIsoDate("2027-03-01"),
          median,
        ),
      ).toBeNull();
      counted += 1;
    }
    expect(counted).toBe(56);
    expect(floors).toBe(54);
  });

  it("raises every public school teacher paid below the floor from the first pay period of the school year, and no private school teacher", () => {
    const place = observerPlace(SEED);
    const town = place.context.jurisdiction.id;
    const stateKey = lifePlaceByJurisdictionId(town)!.stateJurisdictionKey!;
    const stateId = stateJurisdictionForKey(stateKey)!.id;
    const start = opened.world;
    const effectiveAt = addDays(start.currentDate, 45);
    const schoolYear = schoolYearStartOnOrAfter(effectiveAt);
    const enacted = enactStateLaw(start, stateId, "yes", 1, effectiveAt);
    const world = runPaydays(enacted, addDays(schoolYear, 45));
    const median = stateMedianAnnualWage("profession:teacher", town)!;
    const floor = Math.round(median * TEACHER_FLOOR_OF_STATE_MEDIAN.central);

    const roles = new Map(
      world.history.workRoles.map((role) => [role.workRelationshipId, role]),
    );
    const flows = world.history.resourceFlows.filter(
      (flow) =>
        flow.stableKey.startsWith("town-pay-v2:job-pay:") &&
        flow.basisReference.kind === "work" &&
        roles.get(flow.basisReference.workRelationshipId)
          ?.occupationClassification === "profession:teacher",
    );
    const employerOf = (flow: (typeof flows)[number]) =>
      flow.source.kind === "organization"
        ? organizationProfileAt(world, flow.source.organizationId)
            ?.classification
        : undefined;
    const publicTeachers = flows.filter(
      (flow) => employerOf(flow) === "service:school",
    );
    const privateTeachers = flows.filter(
      (flow) => employerOf(flow) !== "service:school",
    );
    expect(publicTeachers.length).toBeGreaterThan(0);

    const raises = world.history.resourceFlowTerms.filter((terms) =>
      terms.stableKey.includes(":teacher-floor:"),
    );
    const raisedFlows = new Set(raises.map((terms) => terms.resourceFlowId));
    // Measured: some teachers here were paid below the floor.
    expect(raises.length).toBeGreaterThan(0);
    for (const flow of privateTeachers)
      expect(raisedFlows.has(flow.id)).toBe(false);

    const lines: string[] = [];
    for (const raise of raises) {
      const before = world.history.resourceFlowTerms.find(
        (terms) => terms.id === raise.supersedesTermsId,
      )!;
      expect(raise.effectiveAt >= schoolYear).toBe(true);
      expect(raise.amount.minorUnits).toBeGreaterThan(before.amount.minorUnits);
      expect(raise.reason).toBe(
        `S.B. 1 set the state's minimum teacher salary at $${floor.toLocaleString("en-US")} a year.`,
      );
      expect(raise.provenance.kind).toBe("simulated-event");
      const flow = flows.find((row) => row.id === raise.resourceFlowId)!;
      // Paid at the new rate from the raise on, the old one before.
      for (const paycheck of world.history.resourceTransferOutcomes) {
        if (paycheck.resourceFlowId !== flow.id) continue;
        expect(paycheck.transferredAmount.minorUnits).toBe(
          paycheck.periodStartsAt >= raise.effectiveAt
            ? raise.amount.minorUnits
            : before.amount.minorUnits,
        );
      }
      if (flow.recipient.kind === "person") {
        const person = world.people[flow.recipient.personId];
        if (person && lines.length < 5)
          lines.push(
            `${person.givenName} ${person.familyName}: $${(before.amount.minorUnits / 100).toFixed(2)} -> $${(raise.amount.minorUnits / 100).toFixed(2)} a paycheck from ${raise.effectiveAt}`,
          );
      }
    }
    // Every public school teacher is now paid at least the floor.
    for (const flow of publicTeachers) {
      const terms = world.history.resourceFlowTerms.filter(
        (row) => row.resourceFlowId === flow.id,
      );
      const latest = terms.at(-1)!;
      const role = roles.get(
        flow.basisReference.kind === "work"
          ? flow.basisReference.workRelationshipId
          : ("" as EntityId),
      )!;
      const weekly =
        (role.timeDemand.expectedWeekly.minimumHours +
          role.timeDemand.expectedWeekly.maximumHours) /
        2;
      const perYear =
        (latest.amount.minorUnits / 100) *
        ({
          "schedule:town-weekly": 52,
          "schedule:town-biweekly-0": 26,
          "schedule:town-biweekly-1": 26,
          "schedule:town-semimonthly": 24,
          "schedule:town-monthly": 12,
        }[latest.cadenceKind] ?? 0);
      expect(perYear / (weekly / 40)).toBeGreaterThanOrEqual(floor - 60);
    }
    console.info(
      `${place.key} (${stateKey}), seed ${SEED}: a state minimum teacher salary of $${floor.toLocaleString("en-US")} (81% of the state median $${median.toLocaleString("en-US")}), in force ${effectiveAt}, first school year ${schoolYear}. ${raisedFlows.size} of ${publicTeachers.length} public school teachers raised; ${privateTeachers.length} private school teachers untouched.\n${lines.join("\n")}`,
    );
  });
});
