import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 300_000 });

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { scheduledFutureDueItemsThrough } from "../simulation/future-transitions";
import { searchLifePlaces } from "../simulation/life-places";
import {
  educationEnrollmentStateAt,
  organizationProfileAt,
} from "../simulation/life-queries";
import {
  SCHOOL_STAGE_TRANSITION_KEY,
  schoolGradeOn,
  stillInGradeSchool,
} from "../simulation/school-stages";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import {
  educationOptionReason,
  GRADE_SCHOOL_REASON,
} from "../education/study-provider";
import type { EducationInstitution } from "../education/types";
import {
  projectWorkRole,
  schoolingSentence,
} from "../presentation/day-overview";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { proseDate } from "../presentation/prose-dates";
import { EducationOptionsPanel } from "./EducationOptionsPanel";

/*
 * Shannon, eleven, in Peoria, Illinois, opened School and read "You are a
 * student." — no school, no grade — and over the summer not even that. Her
 * Study tab offered her the state's colleges, under a line crediting the
 * directory they came from.
 */

function lifeIn(
  name: string,
  state: string,
  startAge: number,
  seed: string,
): { readonly world: World; readonly personId: EntityId } {
  const place = searchLifePlaces(name, 20, {
    stateJurisdictionKey: `US-${state}`,
  }).find((candidate) => candidate.displayName.startsWith(name))!;
  expect(place, `${name}, ${state}`).toBeDefined();
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  });
  return { world: game.world, personId: game.playerPersonId };
}

function schoolNow(world: World, personId: EntityId): string {
  const row = world.history.educationEnrollments.find(
    (enrollment) =>
      enrollment.personId === personId &&
      enrollment.programKind.startsWith("schooling:") &&
      educationEnrollmentStateAt(world, enrollment.id)?.status === "active",
  )!;
  return organizationProfileAt(world, row.organizationId)!.name;
}

/** The calendar spelled out independently of the code under test. */
function kindergartenFall(birthDate: string): number {
  const year = Number(birthDate.slice(0, 4));
  return birthDate.slice(5) <= "09-01" ? year + 5 : year + 6;
}

const GRADES = [
  "kindergarten",
  "first grade",
  "second grade",
  "third grade",
  "fourth grade",
  "fifth grade",
  "sixth grade",
  "seventh grade",
  "eighth grade",
  "ninth grade",
  "tenth grade",
  "eleventh grade",
  "twelfth grade",
];

function advancePast(world: World, stableKeyEnd: string): World {
  const due = scheduledFutureDueItemsThrough(
    world,
    world.currentDate,
    "2100-01-01" as IsoDate,
  ).find(
    (item) =>
      item.transitionKey === SCHOOL_STAGE_TRANSITION_KEY &&
      item.stableKey.endsWith(stableKeyEnd),
  )!;
  expect(due, stableKeyEnd).toBeDefined();
  return advanceWorld(
    world,
    Math.ceil(
      (Date.parse(due.dueAt) - Date.parse(world.currentDate)) / 86_400_000,
    ) + 1,
    createCampaignElectionTransitionRegistry(),
  );
}

// Semantic fixture: a college that takes applications through the game.
const college: EducationInstitution = {
  id: "ipeds-unit:999998",
  officialId: "999998",
  kind: "postsecondary",
  name: "Explicit synthetic college",
  city: "Fixture",
  state: "IL",
  stateFips: "17",
  countyGeoid: "17143",
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
      code: "NONCRDT1",
      label: "Workforce Education",
      kind: "noncredit",
      state: "offered",
      raw: "1",
    },
  ],
  evidence: [
    { artifactId: "fixture", sha256: "a".repeat(64), member: "f.csv", row: 2 },
  ],
} as EducationInstitution;

describe("School names the school a child attends, and their grade", () => {
  const peoria = lifeIn("Peoria", "IL", 11, "child-school-screen:peoria");

  it("an eleven-year-old in Peoria reads their school and grade", () => {
    const { world, personId } = peoria;
    const person = world.people[personId]!;
    // A January start is inside the school year that began last fall.
    expect(world.currentDate.slice(5, 7)).toBe("01");
    const expected =
      Number(world.currentDate.slice(0, 4)) -
      1 -
      kindergartenFall(person.birthDate);
    const sentence = projectWorkRole(world, personId).sentence;
    expect(sentence).toBe(
      `You do not hold a job or an office right now. You're in ${GRADES[expected]} at ${schoolNow(world, personId)}.`,
    );
  });

  it("follows the school calendar, counting the summer as the grade just finished", () => {
    const { world, personId } = peoria;
    const k = kindergartenFall(world.people[personId]!.birthDate);
    const on = (date: string) =>
      schoolGradeOn(world, personId, date as IsoDate);
    expect(on(`${k}-07-01`)).toBeNull();
    expect(on(`${k}-10-01`)).toBe(0);
    expect(on(`${k + 5}-12-01`)).toBe(5);
    expect(on(`${k + 6}-07-01`)).toBe(5);
    expect(on(`${k + 6}-09-20`)).toBe(6);
    expect(on(`${k + 12}-12-01`)).toBe(12);
    expect(on(`${k + 13}-12-01`)).toBeNull();
  });

  it("over the summer, names the school and grade that start in the fall", () => {
    const { world: start, personId } = lifeIn(
      "Tacoma",
      "WA",
      10,
      "child-school-screen:tacoma",
    );
    const world = advancePast(start, ":ends:elementary");
    const waiting = world.history.educationEnrollments.find(
      (enrollment) =>
        enrollment.personId === personId &&
        enrollment.programKind === "schooling:middle",
    )!;
    expect(waiting.startedAt > world.currentDate).toBe(true);
    const grade = GRADES[schoolGradeOn(world, personId, waiting.startedAt)!]!;
    expect(grade).toBe("sixth grade");
    expect(schoolingSentence(world, personId)).toBe(
      `You start sixth grade at ${organizationProfileAt(world, waiting.organizationId)!.name} this fall, on ${proseDate(waiting.startedAt)}.`,
    );
  });

  it("invents no school or grade for a grown life with none", () => {
    const { world, personId } = lifeIn(
      "Santa Fe",
      "NM",
      34,
      "child-school-screen:santa-fe",
    );
    expect(schoolingSentence(world, personId)).toBeNull();
    expect(projectWorkRole(world, personId).sentence).not.toMatch(
      /grade|kindergarten/,
    );
  });
});

describe("the Study tab for a child still in school", () => {
  const thirteen = lifeIn("Peoria", "IL", 13, "child-school-screen:peoria-13");

  it("shows the child their school rather than a college directory", () => {
    const { world, personId } = thirteen;
    expect(stillInGradeSchool(world, personId)).toBe(true);
    const markup = renderToStaticMarkup(
      <EducationOptionsPanel world={world} onWorldChange={() => {}} />,
    );
    expect(markup).toContain('data-testid="study-grade-school"');
    expect(markup).toContain(schoolNow(world, personId));
    expect(markup).not.toContain("Search institutions");
    expect(markup).not.toContain("Browse the full directory");
  });

  it("refuses a child's college application", () => {
    const { world } = thirteen;
    expect(
      educationOptionReason(world, college, college.capabilities[0]!),
    ).toBe(GRADE_SCHOOL_REASON);
  });

  it("lists colleges for an adult, with no directory credit on the screen", () => {
    const { world, personId } = lifeIn(
      "Santa Fe",
      "NM",
      34,
      "child-school-screen:santa-fe",
    );
    expect(stillInGradeSchool(world, personId)).toBe(false);
    const markup = renderToStaticMarkup(
      <EducationOptionsPanel world={world} onWorldChange={() => {}} />,
    );
    expect(markup).toContain("Search institutions");
    expect(markup).not.toContain('data-testid="study-grade-school"');
    expect(markup).not.toMatch(/NCES|directories and reported offerings/);
    expect(
      educationOptionReason(world, college, college.capabilities[0]!),
    ).not.toBe(GRADE_SCHOOL_REASON);
  });

  it("lets a senior who has graduated apply", () => {
    const { world: senior, personId } = lifeIn(
      "Spokane",
      "WA",
      17,
      "child-school-screen:spokane",
    );
    expect(
      educationOptionReason(senior, college, college.capabilities[0]!),
    ).toBe(GRADE_SCHOOL_REASON);
    const graduated = advancePast(senior, ":ends:high");
    expect(stillInGradeSchool(graduated, personId)).toBe(false);
    expect(
      educationOptionReason(graduated, college, college.capabilities[0]!),
    ).not.toBe(GRADE_SCHOOL_REASON);
  });
});
