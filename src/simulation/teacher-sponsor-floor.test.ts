import { beforeAll, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  openObserverWorld,
  observerSetup,
  advanceObservedWorld,
} from "../presentation/observer-world";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import {
  recordedTeacherSalaryMedian,
  requestedTeacherSalaryFloor,
  teacherSalaryFloorAt,
  TEACHER_SALARY_FLOOR_QUESTION,
  schoolYearStartOnOrAfter,
} from "./teacher-salary-floor";
import {
  stateJurisdictionForKey,
  lifePlaceByJurisdictionId,
} from "./life-places";
import { createFormationContext, recordPrinciples } from "./politics";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { seatedChamberForPack } from "./governing/chamber-votes";
import { fileMemberAgendaBills } from "./governing/member-agenda";
import { governorOfficeForJurisdiction } from "./governing/state-governing";
import { legislativeBlueprintForMeasure } from "./governing/legislative-clock";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  paydayHandler,
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
} from "./living-world/town-pay";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import { createStableId } from "./ids";
import { withWorldIntegrityDeferred } from "./world";
import type { World, EntityId, FutureDueItem, IsoDate } from "./types";
import type { LegislativeProcedureContext } from "./legislation-scenarios";

let world: World;
let stateId: EntityId;
let questionId: EntityId;
let sponsorId: EntityId;
let placeKey: string;
let adopted:
  | {
      world: World;
      measureId: EntityId;
      designation: string;
      floorMinor: number;
    }
  | undefined;
const seed = "build20-teacher-floor-0835";

beforeAll(() => {
  const opening = openObserverWorld(observerSetup(seed));
  world = opening.world;
  const place = lifePlaceByJurisdictionId(
    world.history.householdLocations.find(
      (row) =>
        row.householdId ===
        world.history.householdMemberships.find(
          (row) => row.personId === opening.anchorPersonId,
        )!.householdId,
    )!.jurisdictionId,
  )!;
  placeKey = place.key;
  stateId = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;
  questionId = world.policyCatalog.propositionOrder.find(
    (id) =>
      world.policyCatalog.propositions[id]!.stableKey ===
      TEACHER_SALARY_FLOOR_QUESTION,
  )!;
  const question = world.policyCatalog.propositions[questionId]!;
  const pack = legislativePackForJurisdiction(stateId)!;
  const members = pack.chambers.flatMap((chamber) =>
    seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    )!.body.members.flatMap((member) =>
      member.personId ? [member.personId] : [],
    ),
  );
  sponsorId = members[0]!;
  // Only political views are controlled. No salary, floor or reference bill is authored.
  world = recordPrinciples(
    world,
    members.flatMap((personId) =>
      world.policyCatalog.principleOrder.map((principleId) => {
        const bearing = question.principles!.find(
          (row) => row.principleId === principleId,
        );
        return {
          stableKey: `teacher-pay-proof:${personId}:${principleId}`,
          personId,
          principleId,
          formedAt: world.currentDate,
          stance:
            bearing?.bearing === "consistent-with"
              ? ("endorses" as const)
              : ("rejects" as const),
          strength: bearing ? 1 : 0,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("experience:life", {
            note: "Controlled saved support for raising recorded teacher pay.",
          }),
          supersedesPrincipleRecordId: null,
        };
      }),
    ),
  );
  // Ordinary canonical time creates actual job pay and reaches the state's session.
  world = advanceObservedWorld(world, 14);
}, 120_000);

function runPaydays(start: World, until: IsoDate) {
  let next = start;
  let paidThrough = start.currentDate;
  withWorldIntegrityDeferred(() => {
    for (
      let day = nextPaydayDate(start.currentDate);
      day <= until;
      day = nextPaydayDate(day)
    ) {
      next = {
        ...next,
        currentDate: day,
        currentMoment: simulationMomentOnLocalDate(next.currentMoment, day),
      };
      const key = `town-pay-v2:payday:${paidThrough}`;
      const due: FutureDueItem = {
        id: createStableId("future-due-item", key),
        stableKey: key,
        sequence: next.history.nextSequence,
        scheduledAt: paidThrough,
        dueAt: day,
        transitionKey: PAYDAY_TRANSITION_KEY,
        entityIds: [],
        jurisdictionId: null,
        provenance: {
          kind: "authored",
          note: "Controlled existing payday handler through the law's first school year.",
        },
      };
      next = paydayHandler(next, due).world;
      paidThrough = day;
    }
  });
  return next;
}

it("does not manufacture a floor when the state has no recorded public-teacher compensation", () => {
  const noPay = { ...world, history: { ...world.history, resourceFlows: [] } };
  expect(recordedTeacherSalaryMedian(noPay, stateId)).toBeNull();
  expect(requestedTeacherSalaryFloor(noPay, stateId, sponsorId)).toBeNull();
  expect(
    recordedTeacherSalaryMedian(world, stateJurisdictionForKey("US-AR")!.id),
  ).toBeNull();
});

it("a watched new-game sponsor files recorded teacher pay through normal intake and the actual desk adopts it", () => {
  const cohort = recordedTeacherSalaryMedian(world, stateId)!;
  expect(cohort).not.toBeNull();
  expect(cohort.teacherCount).toBeGreaterThan(1);
  // The normal clock may already have filed it; use the same actual intake otherwise.
  const next = fileMemberAgendaBills(world, {
    jurisdictionId: stateId,
    intakeKey: "teacher-pay-proof:ordinary-intake",
  });
  const bills = next.history.legislativeMeasures!.filter(
    (row) =>
      row.jurisdictionId === stateId &&
      row.propositionAnswers?.some(
        (answer) =>
          answer.propositionId === questionId && answer.answer === "yes",
      ),
  );
  const bill = bills.find((row) =>
    next.history.legislativeProvisions?.some(
      (provision) =>
        provision.measureId === row.id &&
        provision.stableKey.endsWith(":requested-teacher-floor"),
    ),
  )!;
  expect(bill).toBeDefined();
  const provision = next.history.legislativeProvisions!.find(
    (row) =>
      row.measureId === bill.id &&
      row.stableKey.endsWith(":requested-teacher-floor"),
  )!;
  const term = provision.lawTerms!.find((row) => row.key === "floor")!;
  expect(term.unit).toBe("minor");
  expect(term.value).toBe(cohort.minor);
  const reason = next.history.events.find(
    (row) => row.stableKey === `${provision.stableKey}:requested-term-reason`,
  )!;
  for (const id of cohort.sourceRecordIds)
    expect(reason.tags).toContain(`source-record:${id}`);
  expect(reason.tags.some((tag) => tag.startsWith("principle-score:"))).toBe(
    true,
  );
  const reopened = deserializeWorld(serializeWorld(next));
  expect(
    fileMemberAgendaBills(reopened, {
      jurisdictionId: stateId,
      intakeKey: "teacher-pay-proof:ordinary-intake",
    }).history.legislativeProvisions,
  ).toEqual(reopened.history.legislativeProvisions);
  const blueprint = legislativeBlueprintForMeasure(next, bill);
  const pack = blueprint.pack;
  const context: LegislativeProcedureContext = {
    pack,
    measureId: bill.id,
    bodies: pack.chambers.map(
      (chamber) =>
        seatedChamberForPack(
          next,
          pack.packId,
          chamber.chamberKey,
          chamber.name,
        )!.body,
    ),
    committeeMemberCount: null,
    votePlan: {},
    governorAction: null,
    governorRationale: "",
    memberDecisions: { playerPersonId: null },
  };
  const office = governorOfficeForJurisdiction(next, pack.jurisdictionKey)!;
  const enacted = enactThroughDesk(
    { ...next, control: { kind: "person", personId: office.holderPersonId } },
    bill.id,
    { context },
  );
  adopted = {
    world: enacted,
    measureId: bill.id,
    designation: bill.designation,
    floorMinor: term.value,
  };
  writeFileSync(
    "/tmp/a43-recorded-pay-adoption.json",
    JSON.stringify(
      { seed, placeKey, bill, provision, cohort, date: enacted.currentDate },
      null,
      2,
    ),
  );
  console.info(
    JSON.stringify({
      seed,
      placeKey,
      stateId,
      measureId: bill.id,
      sponsor: bill.sponsorPersonId,
      recordedTeachers: cohort.teacherCount,
      floorMinor: term.value,
      sourceRecordIds: cohort.sourceRecordIds,
    }),
  );
}, 120_000);

it("the adopted recorded-pay floor raises teachers and the raised compensation is actually paid", () => {
  expect(adopted).toBeDefined();
  const { world: enacted, measureId, designation, floorMinor } = adopted!;
  const schoolYear = schoolYearStartOnOrAfter(enacted.currentDate);
  const paid = runPaydays(enacted, addDays(schoolYear, 45));
  expect(
    teacherSalaryFloorAt(paid, stateId, paid.currentDate, null)?.annual,
  ).toBe(floorMinor / 100);
  const raises = paid.history.resourceFlowTerms.filter((row) =>
    row.reason?.startsWith(
      `${designation} set the state's minimum teacher salary`,
    ),
  );
  const sourceFlows = world.history.resourceFlows.filter((row) =>
    recordedTeacherSalaryMedian(world, stateId)!.sourceRecordIds.includes(
      row.id,
    ),
  );
  writeFileSync(
    "/tmp/a43-recorded-pay-outcome.json",
    JSON.stringify(
      {
        measureId,
        floorMinor,
        schoolYear,
        date: paid.currentDate,
        floor: teacherSalaryFloorAt(paid, stateId, paid.currentDate, null),
        raises,
        pay: sourceFlows.map((flow) => ({
          flow,
          terms: paid.history.resourceFlowTerms.filter(
            (row) => row.resourceFlowId === flow.id,
          ),
        })),
      },
      null,
      2,
    ),
  );
  expect(raises.length).toBeGreaterThan(0);
  let paidRaises = 0;
  for (const raise of raises) {
    expect(raise.effectiveAt >= schoolYear).toBe(true);
    const prior = paid.history.resourceFlowTerms.find(
      (row) => row.id === raise.supersedesTermsId,
    )!;
    expect(raise.amount.minorUnits).toBeGreaterThan(prior.amount.minorUnits);
    const transfers = paid.history.resourceTransferOutcomes.filter(
      (row) =>
        row.resourceFlowId === raise.resourceFlowId &&
        row.periodStartsAt >= raise.effectiveAt,
    );
    expect(transfers.length).toBeGreaterThan(0);
    for (const transfer of transfers)
      expect(transfer.transferredAmount.minorUnits).toBe(
        raise.amount.minorUnits,
      );
    paidRaises += transfers.length;
  }
  console.info(
    JSON.stringify({
      seed,
      placeKey,
      stateId,
      measureId,
      floorMinor,
      raisedTeachers: raises.length,
      paidRaisedTransfers: paidRaises,
    }),
  );
}, 120_000);
