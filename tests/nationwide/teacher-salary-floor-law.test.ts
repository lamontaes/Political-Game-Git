import { mkdirSync, writeFileSync } from "node:fs";
import startingLaw from "../../data/research/laws/starting-law-2026/index";
import { createStableId } from "../../src/simulation/ids";
import {
  isLawEffectStamp,
  type LawEffectStampedRecord,
} from "../../src/simulation/law-effect-stamp";
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
  LegislativeProvisionRecord,
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
// A hypothetical enacted test law adopts an amount from the sourced records;
// this does not assert that every jurisdiction has this starting law.
const sourcedFloorTerm = startingLaw.questions[
  TEACHER_SALARY_FLOOR_QUESTION
].answers["US-AR"].lawTerms.find((term) => term.key === "floor")!;
if (sourcedFloorTerm.unit !== "minor")
  throw new Error("The sourced teacher floor must be annual USD minor units.");
const SOURCED_FLOOR_TERM: NonNullable<
  LegislativeProvisionRecord["lawTerms"]
>[number] = {
  ...sourcedFloorTerm,
  unit: sourcedFloorTerm.unit,
};
const FLOOR_DOLLARS = SOURCED_FLOOR_TERM.value / 100;

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
  const provision: LegislativeProvisionRecord = {
    id: `provision_teacher_floor_${n}` as EntityId,
    stableKey: `test:teacher-floor:${n}:provision`,
    sequence: enactment.sequence - 1,
    measureId: measure.id,
    provisionKey: "teacher-salary-floor",
    sectionNumber: 1,
    heading: "Teacher salary floor",
    text: `The minimum annual teacher salary is $${FLOOR_DOLLARS}.`,
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Public school teachers",
    },
    applicationScope: { jurisdictionId: stateId, segmentKey: null },
    fiscalExposureLabel: null,
    fiscalExposureMinorUnits: null,
    recordedAt: world.currentDate,
    supersedesProvisionId: null,
    originAmendmentId: null,
    eventId: enactment.outcomeEventId,
    answers: { propositionId: FLOOR_QUESTION, answer },
    lawTerms: answer === "yes" ? [SOURCED_FLOOR_TERM] : [],
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
      legislativeProvisions: [
        ...(recorded.history.legislativeProvisions ?? []),
        provision,
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
      const key = `town-pay-v2:payday:${paidThrough}`;
      const due: FutureDueItem = {
        id: createStableId("future-due-item", key),
        stableKey: key,
        sequence: world.history.nextSequence,
        scheduledAt: paidThrough,
        dueAt: payday,
        transitionKey: PAYDAY_TRANSITION_KEY,
        entityIds: [],
        jurisdictionId: null,
        provenance: { kind: "authored", note: "Controlled payday fixture." },
      };
      world = paydayHandler(world, due).world;
      paidThrough = payday;
    }
  });
  return world;
}

describe("the state's minimum teacher salary", { timeout: 900_000 }, () => {
  const opened = openObserverWorld(observerSetup(SEED));
  const watchedWorlds = new Map<string, World>([[SEED, opened.world]]);

  it("reads the final adopted annual amount from the next school year, independent of median wages, in all 56 places", () => {
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
      const recorded = enactStateLaw(
        opened.world,
        stateId,
        "yes",
        1,
        makeIsoDate("2026-03-01"),
      );
      const world = {
        ...recorded,
        currentDate: makeIsoDate("2026-07-01"),
        currentMoment: simulationMomentOnLocalDate(
          recorded.currentMoment,
          makeIsoDate("2026-07-01"),
        ),
      };
      // The prior law continues until the enacted law's first school year.
      const prior = teacherSalaryFloorAt(
        { ...opened.world, currentDate: world.currentDate },
        jurisdiction,
        makeIsoDate("2026-06-30"),
        median,
      );
      expect(
        teacherSalaryFloorAt(
          world,
          jurisdiction,
          makeIsoDate("2026-06-30"),
          median,
        ),
      ).toEqual(prior);
      const floor = teacherSalaryFloorAt(
        world,
        jurisdiction,
        makeIsoDate("2026-07-01"),
        median,
      );
      // A saved numeric law also governs where BLS has no wage survey.
      expect(floor?.annual, state.jurisdictionKey).toBe(FLOOR_DOLLARS);
      expect(floor?.measureId).toBe("measure_teacher_floor_1");
      // A yes answer without its adopted amount cannot manufacture a floor.
      for (const lawTerms of [[], [{ ...SOURCED_FLOOR_TERM, value: 0 }]]) {
        const withoutAmount = {
          ...world,
          history: {
            ...world.history,
            legislativeProvisions: (
              world.history.legislativeProvisions ?? []
            ).map((provision) =>
              provision.measureId === floor!.measureId
                ? { ...provision, lawTerms }
                : provision,
            ),
          },
        };
        expect(
          teacherSalaryFloorAt(
            withoutAmount,
            jurisdiction,
            world.currentDate,
            median,
          ),
          state.jurisdictionKey,
        ).toBeNull();
      }
      floors += 1;
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
          { ...repealed, currentDate: makeIsoDate("2027-03-01") },
          jurisdiction,
          makeIsoDate("2027-03-01"),
          median,
        ),
      ).toBeNull();
      counted += 1;
    }
    expect(counted).toBe(56);
    expect(floors).toBe(counted);
  });

  function watchTeacherFloor(seed: string, requireRaises: boolean): void {
    const place = observerPlace(seed);
    const town = place.context.jurisdiction.id;
    const stateKey = lifePlaceByJurisdictionId(town)!.stateJurisdictionKey!;
    const stateId = stateJurisdictionForKey(stateKey)!.id;
    const start = watchedWorlds.get(seed)!;
    const effectiveAt = addDays(start.currentDate, 45);
    const schoolYear = schoolYearStartOnOrAfter(effectiveAt);
    const enacted = enactStateLaw(start, stateId, "yes", 1, effectiveAt);
    const world = runPaydays(enacted, addDays(schoolYear, 45));
    const median = stateMedianAnnualWage("profession:teacher", town)!;
    const floor = teacherSalaryFloorAt(
      world,
      town,
      world.currentDate,
      median,
    )!.annual;
    expect(floor).toBe(FLOOR_DOLLARS);

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
    if (requireRaises) expect(raises.length).toBeGreaterThan(0);
    for (const flow of privateTeachers)
      expect(raisedFlows.has(flow.id)).toBe(false);

    const lines: string[] = [];
    for (const raise of raises) {
      const stamp = (raise as typeof raise & LawEffectStampedRecord)
        .lawEffectStamps?.[0];
      expect(isLawEffectStamp(stamp)).toBe(true);
      expect(stamp?.governingLawKey).toBe("measure_teacher_floor_1");
      expect(stamp?.effectKind).toBe("teacher-pay");
      expect(stamp?.appliedAt).toBe(raise.effectiveAt);
      expect(stamp?.sourceRecordIds).toContain(raise.resourceFlowId);

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
    // Each raised teacher knows the law raised their pay.
    const exposures = (world.history.lawExposures ?? []).filter(
      (row) =>
        row.measureId === "measure_teacher_floor_1" &&
        row.channel === "paycheck" &&
        row.direction === "gain" &&
        raises.some((terms) => terms.id === row.sourceRecordId),
    );
    const heard = new Set(exposures.map((row) => row.personId));
    for (const flow of flows)
      if (raisedFlows.has(flow.id) && flow.recipient.kind === "person")
        expect(heard.has(flow.recipient.personId)).toBe(true);
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
      const periods: Readonly<Record<string, number>> = {
        "schedule:town-weekly": 52,
        "schedule:town-biweekly-0": 26,
        "schedule:town-biweekly-1": 26,
        "schedule:town-semimonthly": 24,
        "schedule:town-monthly": 12,
      };
      const perYear =
        (latest.amount.minorUnits / 100) * (periods[latest.cadenceKind] ?? 0);
      expect(perYear / (weekly / 40)).toBeGreaterThanOrEqual(floor - 60);
    }
    console.info(
      `${place.key} (${stateKey}), seed ${seed}: a recorded annual teacher salary floor of $${floor.toLocaleString("en-US")}, in force ${effectiveAt}, first school year ${schoolYear}. ${raisedFlows.size} of ${publicTeachers.length} public school teachers raised; ${privateTeachers.length} private school teachers untouched.\n${lines.join("\n")}`,
    );
    const receipt = {
      seed,
      placeKey: place.key,
      stateKey,
      effectiveAt,
      schoolYear,
      floorDollars: floor,
      adoptedFloorTerm: SOURCED_FLOOR_TERM,
      publicTeachers: publicTeachers.length,
      privateTeachers: privateTeachers.length,
      raisedPeople: raises.map((terms) => {
        const flow = flows.find((row) => row.id === terms.resourceFlowId)!;
        const id =
          flow.recipient.kind === "person" ? flow.recipient.personId : null;
        const person = id ? world.people[id] : null;
        const before = world.history.resourceFlowTerms.find(
          (row) => row.id === terms.supersedesTermsId,
        )!;
        return {
          personId: id,
          name: person ? `${person.givenName} ${person.familyName}` : null,
          employerId:
            flow.source.kind === "organization"
              ? flow.source.organizationId
              : null,
          beforeMinor: before.amount.minorUnits,
          afterMinor: terms.amount.minorUnits,
          effectiveAt: terms.effectiveAt,
          lawEffectStamps: (terms as typeof terms & LawEffectStampedRecord)
            .lawEffectStamps,
          paidTransfers: world.history.resourceTransferOutcomes
            .filter(
              (row) =>
                row.resourceFlowId === flow.id &&
                row.periodStartsAt >= terms.effectiveAt,
            )
            .map((row) => ({
              id: row.id,
              periodStartsAt: row.periodStartsAt,
              periodEndsAt: row.periodEndsAt,
              amountMinor: row.transferredAmount.minorUnits,
            })),
        };
      }),
      status: raises.length
        ? "STAMPED_COMPENSATION_AND_PAID_TRANSFERS"
        : "NO_OBSERVED_TEACHER_BELOW_FLOOR",
    };
    mkdirSync("test-results/team-5-teacher-stamp", { recursive: true });
    writeFileSync(
      `test-results/team-5-teacher-stamp/${seed}.json`,
      JSON.stringify(receipt, null, 2),
    );
  }

  it("raises every public school teacher paid below the floor from the first pay period of the school year, and no private school teacher", () =>
    watchTeacherFloor(SEED, true));

  const states = new Set([observerPlace(SEED).stateJurisdictionKey]);
  const moreSeeds: string[] = [];
  for (let index = 0; moreSeeds.length < 4 && index < 200; index += 1) {
    const seed = `team5-five-state-teacher-${index}`;
    const place = observerPlace(seed);
    const state = place.stateJurisdictionKey;
    if (
      !state ||
      states.has(state) ||
      stateMedianAnnualWage(
        "profession:teacher",
        place.context.jurisdiction.id,
      ) === null
    )
      continue;
    const opening = openObserverWorld(observerSetup(seed, place.key)).world;
    // Pay flows are established by the existing first payday, not the opening.
    const candidate = runPaydays(opening, nextPaydayDate(opening.currentDate));
    const roles = new Map(
      candidate.history.workRoles.map((role) => [
        role.workRelationshipId,
        role,
      ]),
    );
    const hasPublicTeacher = candidate.history.resourceFlows.some(
      (flow) =>
        flow.stableKey.startsWith("town-pay-v2:job-pay:") &&
        flow.basisReference.kind === "work" &&
        roles.get(flow.basisReference.workRelationshipId)
          ?.occupationClassification === "profession:teacher" &&
        flow.source.kind === "organization" &&
        organizationProfileAt(candidate, flow.source.organizationId)
          ?.classification === "service:school",
    );
    // A payroll witness needs an actual recorded teacher, not just a place.
    if (!hasPublicTeacher) {
      console.info(
        `${seed}, ${place.key}: no recorded public teacher; not a payroll witness.`,
      );
      continue;
    }
    watchedWorlds.set(seed, candidate);
    states.add(state);
    moreSeeds.push(seed);
  }
  it("selects five distinct researched states across the original and additional watched worlds", () =>
    expect(states.size).toBe(5));
  it.each(moreSeeds)(
    "saves teacher law stamps and verifies actual paid compensation in watched world %s",
    (seed) => watchTeacherFloor(seed, false),
  );
});
