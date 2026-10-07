import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { beforeAll, expect, it } from "vitest";
import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import {
  advanceObservedWorld,
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../presentation/observer-world";
import { makeIsoDate } from "./dates";
import { lawInForce, startingLawTerms } from "./governing/law-in-force";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { organizationProfileAt, workRoleAt } from "./life-queries";
import { resourceFlowTermsAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  TEACHER_SALARY_FLOOR_QUESTION,
  teacherSalaryFloorAt,
} from "./teacher-salary-floor";
import type { EntityId, World } from "./types";

// Geography is selected among existing places; no teacher, pay, tenure, or law is authored.
// This opening targets the one legal row whose cited amount changes in this PR.
let seed = `teacher-starting-law:${randomUUID()}`;
let place = observerPlace(seed);
while (place.stateJurisdictionKey !== "US-ME") {
  seed = `teacher-starting-law:${randomUUID()}`;
  place = observerPlace(seed);
}
const stateId = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;
const row =
  startingLaw.questions[TEACHER_SALARY_FLOOR_QUESTION].answers["US-ME"];
const term = row.lawTerms.find((value) => value.key === "floor")!;
const onDate = makeIsoDate("2026-01-01");
let world: World;
let propositionId: EntityId;

beforeAll(() => {
  world = advanceObservedWorld(openObserverWorld(observerSetup(seed)).world, 7);
  propositionId = world.policyCatalog.propositionOrder.find(
    (id) =>
      world.policyCatalog.propositions[id]!.stableKey ===
      TEACHER_SALARY_FLOOR_QUESTION,
  )!;
}, 180_000);

it("reads the cited Maine annual floor on January 1, 2026 through existing law readers", () => {
  // 20-A M.R.S. §13407(3): $40,000 after June 30, 2022 and every subsequent school year.
  expect(term.value).toBe(4_000_000);
  expect(term.unit).toBe("minor");
  expect(row.cite).toBe("20-A M.R.S. § 13407(3)");
  const law = lawInForce(world, stateId, propositionId, onDate)!;
  expect(law.origin).toBe("in-force-at-start");
  expect(law.answer).toBe("yes");
  expect(law.operativeAt).toBe(row.operativeAt);
  expect(
    startingLawTerms(law, TEACHER_SALARY_FLOOR_QUESTION, onDate),
  ).toContainEqual(term);
  const floor = teacherSalaryFloorAt(world, stateId, onDate, null)!;
  expect(floor.annual).toBe(term.value / 100);
  expect(
    teacherSalaryFloorAt(world, place.context.jurisdiction.id, onDate, null),
  ).toEqual(floor);
  // The legal amount does not depend on any recorded teacher pay or a supplied median.
  expect(
    teacherSalaryFloorAt(
      { ...world, history: { ...world.history, resourceFlows: [] } },
      stateId,
      onDate,
      null,
    ),
  ).toEqual(floor);
});

it("preserves the earlier yes answer without applying the 2022 amount retroactively", () => {
  const before = makeIsoDate("2022-06-30");
  const law = lawInForce(world, stateId, propositionId, before)!;
  expect(law.answer).toBe("yes");
  expect(startingLawTerms(law, TEACHER_SALARY_FLOOR_QUESTION, before)).toEqual(
    [],
  );
  expect(teacherSalaryFloorAt(world, stateId, before, null)).toBeNull();
  expect(
    teacherSalaryFloorAt(world, stateId, makeIsoDate("2022-07-01"), null)!
      .annual,
  ).toBe(term.value / 100);
});

it("leaves every other place's numeric floor governed by its own saved starting law", () => {
  for (const placeState of lifePlaceStateIdentities()) {
    const jurisdictionId = stateJurisdictionForKey(
      placeState.jurisdictionKey,
    )!.id;
    const law = lawInForce(world, jurisdictionId, propositionId, onDate);
    const saved =
      law && law.answer === "yes"
        ? startingLawTerms(law, TEACHER_SALARY_FLOOR_QUESTION, onDate).find(
            (value) => value.key === "floor" && value.unit === "minor",
          )
        : undefined;
    const floor = teacherSalaryFloorAt(world, jurisdictionId, onDate, null);
    if (saved && saved.value > 0) expect(floor!.annual).toBe(saved.value / 100);
    else expect(floor).toBeNull();
  }
});

it("keeps the ordinary random opening's legal floor and actual teacher pay through reload", () => {
  const floor = teacherSalaryFloorAt(world, stateId, world.currentDate, null)!;
  const teachers = world.history.resourceFlows.flatMap((flow) => {
    if (
      flow.basisReference.kind !== "work" ||
      flow.source.kind !== "organization"
    )
      return [];
    const role = workRoleAt(world, flow.basisReference.workRelationshipId);
    const profile = organizationProfileAt(world, flow.source.organizationId);
    const terms = resourceFlowTermsAt(world, flow.id);
    return role?.occupationClassification === "profession:teacher" &&
      profile?.classification === "service:school" &&
      terms?.status === "active"
      ? [
          {
            flowId: flow.id,
            roleId: role.id,
            termsId: terms.id,
            amount: terms.amount,
            cadence: terms.cadenceKind,
            hours: role.timeDemand.expectedWeekly,
          },
        ]
      : [];
  });
  expect(teachers.length).toBeGreaterThan(0);
  const reloaded = deserializeWorld(serializeWorld(world));
  expect(
    teacherSalaryFloorAt(reloaded, stateId, reloaded.currentDate, null),
  ).toEqual(floor);
  for (const teacher of teachers)
    expect(resourceFlowTermsAt(reloaded, teacher.flowId)!.amount).toEqual(
      teacher.amount,
    );
  const receipt = {
    seed,
    place: place.displayName,
    placeKey: place.key,
    date: world.currentDate,
    cite: row.cite,
    source: row.source,
    floorAnnual: floor.annual,
    floorMinor: term.value,
    operativeAt: floor.from,
    measureId: floor.measureId,
    reloadedFloorAnnual: teacherSalaryFloorAt(
      reloaded,
      stateId,
      reloaded.currentDate,
      null,
    )!.annual,
    teachers,
  };
  writeFileSync(
    "/tmp/teacher-starting-law-opening.json",
    JSON.stringify(receipt, null, 2),
  );
  console.info("TEACHER_STARTING_LAW_OPENING", JSON.stringify(receipt));
});
