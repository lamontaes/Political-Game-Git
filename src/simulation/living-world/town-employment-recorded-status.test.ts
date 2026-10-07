import { beforeAll, describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import {
  createEducationEnrollment,
  recordEducationEnrollmentState,
} from "../life";
import {
  activeCareResponsibilitiesAt,
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
} from "../life-queries";
import type { World } from "../types";
import { laborStatus, type Resident } from "./town-employment";

const provenance = {
  kind: "authored" as const,
  note: "Controlled labor-status regression fixture, not a population observation.",
};
let world: World;
let candidate: Resident;
beforeAll(() => {
  world = createDemoWorld("recorded-labor-status-fixture");
  const personId = world.personOrder.find(
    (id) =>
      activeWorkRelationshipsAt(world, id).length === 0 &&
      activeEducationEnrollmentsAt(world, id).length === 0 &&
      activeCareResponsibilitiesAt(world, id).length === 0,
  )!;
  expect(personId).toBeDefined();
  candidate = { personId, age: 40, enrolled: false, parentOfYoungChild: false };
});

describe("town labor eligibility reads saved circumstances", () => {
  it("does not invent retirement or job-seeking from age and seed", () => {
    const before = JSON.stringify(world);
    for (const seed of ["first", "second", "third"])
      for (const age of [18, 24, 62, 66])
        expect(laborStatus({ ...world, seed }, { ...candidate, age })).toBe(
          "employed",
        );
    expect(JSON.stringify(world)).toBe(before);
  });

  it("does not treat an old enrollment hint or household hint as an active record", () => {
    expect(
      laborStatus(world, {
        ...candidate,
        enrolled: true,
        parentOfYoungChild: true,
      }),
    ).toBe("employed");
  });

  it("reads an active enrollment at any age and follows its canonical ending", () => {
    const enrolled = createEducationEnrollment(world, {
      stableKey: "labor-fixture:enrollment",
      personId: candidate.personId,
      organizationId: world.history.organizations[0]!.id,
      startedAt: world.currentDate,
      programKind: "schooling:continuing",
      contextKind: "stage:school",
      provenance,
    });
    expect(laborStatus(enrolled, { ...candidate, age: 62 })).toBe("student");
    const enrollment = enrolled.history.educationEnrollments.at(-1)!;
    const ended = recordEducationEnrollmentState(enrolled, {
      stableKey: "labor-fixture:enrollment-ended",
      enrollmentId: enrollment.id,
      effectiveAt: enrolled.currentDate,
      status: "ended",
      contextKind: "stage:school",
      reason: "Controlled fixture completed its course.",
      provenance,
      supersedesStateId: enrolled.history.educationEnrollmentStates.at(-1)!.id,
    });
    expect(laborStatus(ended, { ...candidate, enrolled: true })).toBe(
      "employed",
    );
    expect(laborStatus(enrolled, candidate)).toBe("student");
  });

  it("keeps a recorded job ahead of enrollment and household hints", () => {
    const personId = world.personOrder.find(
      (id) => activeWorkRelationshipsAt(world, id).length > 0,
    )!;
    expect(personId).toBeDefined();
    expect(
      laborStatus(world, {
        personId,
        age: 66,
        enrolled: true,
        parentOfYoungChild: true,
      }),
    ).toBe("employed");
  });
});
