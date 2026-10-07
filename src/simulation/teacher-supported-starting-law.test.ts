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
import { addDays, makeIsoDate } from "./dates";
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

// These expectations come from the cited statutes, not a pay estimate.
const supported = [
  { state: "US-MO", annual: 40_000, effectiveAt: "2025-07-01" },
  { state: "US-OH", annual: 30_275, effectiveAt: "2023-10-03" },
  { state: "US-NJ", annual: 18_500, effectiveAt: "1986-03-28" },
] as const;
const rows = startingLaw.questions[TEACHER_SALARY_FLOOR_QUESTION].answers;
const onDate = makeIsoDate("2026-01-01");
let seed = `teacher-supported-laws:${randomUUID()}`;
let place = observerPlace(seed);
// Random real geography within the new Missouri statutory row; all actors remain ordinary.
while (place.stateJurisdictionKey !== "US-MO") {
  seed = `teacher-supported-laws:${randomUUID()}`;
  place = observerPlace(seed);
}
let world: World;
let propositionId: EntityId;
const stateId = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;

beforeAll(() => {
  world = advanceObservedWorld(openObserverWorld(observerSetup(seed)).world, 7);
  propositionId = world.policyCatalog.propositionOrder.find(
    (id) =>
      world.policyCatalog.propositions[id]!.stableKey ===
      TEACHER_SALARY_FLOOR_QUESTION,
  )!;
}, 180_000);

it.each(supported)(
  "reads the sourced $state minimum on January 1, 2026",
  ({ state, annual, effectiveAt }) => {
    const row = rows[state];
    const id = stateJurisdictionForKey(state)!.id;
    const law = lawInForce(world, id, propositionId, onDate)!;
    expect(row.operativeAt).toBe(effectiveAt);
    expect(row.source).toMatch(/^https:\/\//);
    expect(law.answer).toBe("yes");
    expect(law.origin).toBe("in-force-at-start");
    expect(
      startingLawTerms(law, TEACHER_SALARY_FLOOR_QUESTION, onDate),
    ).toContainEqual({
      questionKey: TEACHER_SALARY_FLOOR_QUESTION,
      key: "floor",
      value: annual * 100,
      unit: "minor",
    });
    expect(teacherSalaryFloorAt(world, id, onDate, null)!.annual).toBe(annual);
    expect(
      teacherSalaryFloorAt(
        world,
        id,
        addDays(makeIsoDate(effectiveAt), -1),
        null,
      ),
    ).toBeNull();
    expect(
      teacherSalaryFloorAt(world, id, makeIsoDate(effectiveAt), null)!.annual,
    ).toBe(annual);
  },
);

it("keeps the lowest Ohio schedule cell distinct from the bachelor-qualified minimum", () => {
  expect(rows["US-OH"].lawTerms[0]!.value).toBe(3_027_500);
  expect(rows["US-OH"].lawTerms[0]!.value).not.toBe(3_500_000);
  expect(rows["US-OH"].note).toContain("bachelor's");
});

it("keeps every other place's floor attached to its own legal row", () => {
  for (const state of lifePlaceStateIdentities()) {
    const id = stateJurisdictionForKey(state.jurisdictionKey)!.id;
    const law = lawInForce(world, id, propositionId, onDate);
    const term =
      law?.answer === "yes"
        ? startingLawTerms(law, TEACHER_SALARY_FLOOR_QUESTION, onDate).find(
            (value) => value.key === "floor" && value.unit === "minor",
          )
        : undefined;
    const floor = teacherSalaryFloorAt(world, id, onDate, null);
    if (term && term.value > 0) expect(floor!.annual).toBe(term.value / 100);
    else expect(floor).toBeNull();
  }
});

it("records the ordinary random Missouri opening's legal amount and unchanged saved pay after reload", () => {
  const floor = teacherSalaryFloorAt(world, stateId, world.currentDate, null)!;
  expect(floor.annual).toBe(supported[0].annual);
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
  expect(
    teacherSalaryFloorAt(
      reloaded,
      place.context.jurisdiction.id,
      reloaded.currentDate,
      null,
    ),
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
    floorAnnual: floor.annual,
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
    "/tmp/teacher-supported-laws-opening.json",
    JSON.stringify(receipt, null, 2),
  );
  console.info("TEACHER_SUPPORTED_LAWS_OPENING", JSON.stringify(receipt));
});
