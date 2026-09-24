import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 300_000 });

import {
  ADMISSION_DECISION_DAYS,
  applyForEducation,
  awaitingEducationDecisions,
  educationOptionReason,
  GRADE_SCHOOL_REASON,
  pendingEducationOffers,
  respondToEducationOffer,
} from "../education/study-provider";
import type { EducationInstitution } from "../education/types";
import { activeEducationEnrollmentsAt } from "../simulation";
import { EDUCATION_STUDY_PERIOD_DUE_KEY } from "../simulation/education-study-progression";
import { scheduledFutureDueItemsThrough } from "../simulation/future-transitions";
import { searchLifePlaces } from "../simulation/life-places";
import { educationEnrollmentStateAt } from "../simulation/life-queries";
import { schoolGradeOn, stillInGradeSchool } from "../simulation/school-stages";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { assertWorldIntegrity } from "../simulation/world";
import { projectWorkRole } from "../presentation/day-overview";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import { EducationOptionsPanel } from "./EducationOptionsPanel";

/*
 * Emerson, eighteen and a senior in Bend, Oregon, applied to Oregon State in
 * March. The place was offered and taken the same afternoon, college started
 * that day, and the screen said they were enrolled in two programs.
 */

// Semantic fixture: a college that takes degree applications through the game.
const college: EducationInstitution = {
  id: "ipeds-unit:999997",
  officialId: "999997",
  kind: "postsecondary",
  name: "Oregon State University",
  city: "Corvallis",
  state: "OR",
  stateFips: "41",
  countyGeoid: "41003",
  parentDistrictId: null,
  sourceYear: "2024-25",
  release: "fixture",
  statusCode: "A",
  statusLabel: "Active",
  statusEffectiveDate: null,
  foundingDate: null,
  openAdmissionPolicy: "unknown",
  capabilities: [
    {
      code: "LEVEL5",
      label: "Bachelor's degree",
      kind: "award",
      state: "offered",
      raw: "1",
    },
  ],
  evidence: [
    {
      artifactId: "fixture",
      sha256: "b".repeat(64),
      member: "fixture.csv",
      row: 2,
    },
  ],
};
const bachelors = college.capabilities[0]!;

function lifeInBend(startAge: number, seed: string) {
  const place = searchLifePlaces("Bend", 20, {
    stateJurisdictionKey: "US-OR",
  }).find((candidate) => candidate.displayName.startsWith("Bend"))!;
  expect(place).toBeDefined();
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  });
  return { world: game.world, personId: game.playerPersonId };
}

const daysUntil = (world: World, date: string) =>
  Math.round((Date.parse(date) - Date.parse(world.currentDate)) / 86_400_000);

/** Days pass the way the player passes them. */
function passUntil(world: World, date: string): World {
  const days = daysUntil(world, date);
  expect(days).toBeGreaterThanOrEqual(0);
  return days === 0 ? world : passOrdinaryDays(world, days);
}

function collegePlace(world: World, personId: EntityId) {
  return world.history.educationEnrollments.find(
    (enrollment) =>
      enrollment.personId === personId &&
      enrollment.programKind === "postsecondary:edu-path7-level5",
  );
}

function studyPeriodDues(world: World, enrollmentId: EntityId) {
  return scheduledFutureDueItemsThrough(
    world,
    world.currentDate,
    "2100-01-01" as IsoDate,
  ).filter(
    (item) =>
      item.transitionKey === EDUCATION_STUDY_PERIOD_DUE_KEY &&
      item.entityIds.includes(enrollmentId),
  );
}

describe("a senior in Bend applies to college in March", () => {
  it("hears back after a wait, and starts in the fall after graduating", () => {
    const start = lifeInBend(17, "college-waits:bend");
    const personId = start.personId;
    let world = passUntil(start.world, "2026-03-10");
    expect(stillInGradeSchool(world, personId)).toBe(true);
    expect(schoolGradeOn(world, personId)).toBe(12);
    expect(educationOptionReason(world, college, bachelors)).toBeNull();

    // The Study tab shows a senior the colleges as well as their school.
    const seniorMarkup = renderToStaticMarkup(
      <EducationOptionsPanel world={world} onWorldChange={() => {}} />,
    );
    expect(seniorMarkup).toContain('data-testid="study-senior-year"');
    expect(seniorMarkup).toContain("Search institutions");
    expect(seniorMarkup).not.toContain('data-testid="study-grade-school"');

    const applied = applyForEducation(world, college, "LEVEL5");
    expect(applied.ok).toBe(true);
    expect(applied.message).toBe(
      "You applied to Oregon State University. You'll hear back by April 24, 2026.",
    );
    world = applied.world;
    expect(
      world.history.events.filter((e) => e.type === "education.application"),
    ).toHaveLength(1);
    // No offer the same day, and nothing to accept.
    expect(pendingEducationOffers(world)).toHaveLength(0);
    expect(awaitingEducationDecisions(world)).toHaveLength(1);
    expect(collegePlace(world, personId)).toBeUndefined();
    const waitingMarkup = renderToStaticMarkup(
      <EducationOptionsPanel world={world} onWorldChange={() => {}} />,
    );
    expect(waitingMarkup).toContain(
      "You applied to Oregon State University for a bachelor&#x27;s degree. You&#x27;ll hear back by April 24, 2026.",
    );
    expect(waitingMarkup).not.toMatch(/doesn&#x27;t list tuition|NCES/);
    // Applying again says so rather than writing a second application.
    const again = applyForEducation(world, college, "LEVEL5");
    expect(again.world).toBe(world);
    expect(again.message).toMatch(/already applied/);

    world = passOrdinaryDays(world, ADMISSION_DECISION_DAYS - 1);
    expect(pendingEducationOffers(world)).toHaveLength(0);
    world = passOrdinaryDays(world, 1);
    expect(world.currentDate).toBe("2026-04-24");
    const offer = pendingEducationOffers(world)[0]!;
    expect(offer).toBeDefined();
    expect(awaitingEducationDecisions(world)).toHaveLength(0);

    const accepted = respondToEducationOffer(world, offer.id, true);
    expect(accepted.ok).toBe(true);
    expect(accepted.message).toBe(
      "You accepted a place at Oregon State University. Classes start August 25, 2026.",
    );
    world = deserializeWorld(serializeWorld(accepted.world));
    const place = collegePlace(world, personId)!;
    expect(place.startedAt).toBe("2026-08-25");
    expect(educationEnrollmentStateAt(world, place.id)?.status).toBe(
      "expected",
    );
    // Not counted as a program they are enrolled in, and nothing runs yet.
    expect(
      activeEducationEnrollmentsAt(world, personId).map(
        (entry) => entry.enrollment.id,
      ),
    ).not.toContain(place.id);
    expect(studyPeriodDues(world, place.id)).toHaveLength(0);
    const role = projectWorkRole(world, personId);
    expect(role.sentence).not.toMatch(/enrolled in|other program/);
    expect(role.sentence).toContain(
      "Classes at Oregon State University start August 25, 2026.",
    );
    assertWorldIntegrity(world);

    // They graduate in the spring, and the place is still waiting.
    world = passUntil(world, "2026-08-24");
    expect(stillInGradeSchool(world, personId)).toBe(false);
    expect(educationEnrollmentStateAt(world, place.id)?.status).toBe(
      "expected",
    );
    expect(studyPeriodDues(world, place.id)).toHaveLength(0);

    world = passOrdinaryDays(world, 1);
    expect(world.currentDate).toBe("2026-08-25");
    expect(educationEnrollmentStateAt(world, place.id)?.status).toBe("active");
    expect(
      activeEducationEnrollmentsAt(world, personId).map(
        (entry) => entry.enrollment.id,
      ),
    ).toContain(place.id);
    const dues = studyPeriodDues(world, place.id);
    expect(dues).toHaveLength(1);
    expect(dues[0]!.dueAt > "2026-08-25").toBe(true);
    assertWorldIntegrity(world);
  });
});

describe("somebody grown and out of school applies in October", () => {
  it("starts the following August", () => {
    const start = lifeInBend(25, "college-waits:bend-grown");
    const personId = start.personId;
    let world = passUntil(start.world, "2026-10-05");
    expect(stillInGradeSchool(world, personId)).toBe(false);
    const applied = applyForEducation(world, college, "LEVEL5");
    expect(applied.ok).toBe(true);
    world = applied.world;
    expect(pendingEducationOffers(world)).toHaveLength(0);
    world = passOrdinaryDays(world, ADMISSION_DECISION_DAYS);
    const offer = pendingEducationOffers(world)[0]!;
    const accepted = respondToEducationOffer(world, offer.id, true);
    expect(accepted.ok).toBe(true);
    expect(accepted.message).toBe(
      "You accepted a place at Oregon State University. Classes start August 25, 2027.",
    );
    const place = collegePlace(accepted.world, personId)!;
    expect(place.startedAt).toBe("2027-08-25");
    expect(educationEnrollmentStateAt(accepted.world, place.id)?.status).toBe(
      "expected",
    );
  });
});

describe("a ninth grader in Bend", () => {
  it("is told college comes after high school", () => {
    const { world, personId } = lifeInBend(14, "college-waits:bend-ninth");
    expect(schoolGradeOn(world, personId)).toBe(9);
    expect(educationOptionReason(world, college, bachelors)).toBe(
      GRADE_SCHOOL_REASON,
    );
    const applied = applyForEducation(world, college, "LEVEL5");
    expect(applied.ok).toBe(false);
    expect(applied.world).toBe(world);
  });
});
