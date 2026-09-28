import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  SCHOOL_DISTRICT_COUNT_TRANSITION_KEY,
  countSchoolDistrictYear,
  nextSchoolCountDay,
  schoolDistrictCountHandler,
  schoolDistrictYears,
  schoolYearOf,
  townSchoolDistrictId,
} from "../../src/simulation/living-world/town-schools";
import { organizationProfileAt } from "../../src/simulation/life-queries";
import {
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { recordEducationEnrollmentState } from "../../src/simulation/life";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { IsoDate, World } from "../../src/simulation";

const BELZONI = "2805140";
const COLUMBUS = "3918000";

function openAt(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const world = game.world;
  const personId = game.playerPersonId;
  return { world, town: world.people[personId]!.homeJurisdictionId! };
}

describe("school years and count days", () => {
  it("names a school year by its fall and spring", () => {
    expect(schoolYearOf("2026-09-28" as IsoDate)).toBe("2026-27");
    expect(schoolYearOf("2027-06-30" as IsoDate)).toBe("2026-27");
    expect(schoolYearOf("2027-07-01" as IsoDate)).toBe("2027-28");
    expect(schoolYearOf("2099-08-01" as IsoDate)).toBe("2099-00");
  });

  it("counts on the next October 1", () => {
    expect(nextSchoolCountDay("2026-09-28" as IsoDate)).toBe("2026-10-01");
    expect(nextSchoolCountDay("2026-10-01" as IsoDate)).toBe("2027-10-01");
    expect(nextSchoolCountDay("2026-12-31" as IsoDate)).toBe("2027-10-01");
  });
});

describe("a town's school district counts its own pupils and teachers", () => {
  for (const [label, placeKey] of [
    ["Columbus, Ohio", COLUMBUS],
    ["Belzoni, Mississippi", BELZONI],
  ] as const) {
    it(`opens ${label} with a district and a first count read from its people`, () => {
      const { world, town } = openAt(placeKey, "schools-test");
      const districtId = townSchoolDistrictId(world, town);
      expect(districtId).not.toBeNull();
      const profile = organizationProfileAt(world, districtId!);
      expect(profile?.classification).toBe("service:school-district");
      expect(profile?.name).toBe(
        `${world.jurisdictions[town]!.name} School District`,
      );

      const years = schoolDistrictYears(world, districtId!);
      expect(years).toHaveLength(1);
      const [first] = years;
      expect(first!.countedAt).toBe(world.currentDate);
      expect(first!.enrollment).toBeGreaterThan(0);
      expect(first!.teachers).toBeGreaterThan(0);
      expect(first!.studentsPerTeacher).toBeCloseTo(
        first!.enrollment / first!.teachers,
        1,
      );
      expect(first!.causes).toEqual([]);

      const due = world.history.futureDueItems.filter(
        (item) => item.transitionKey === SCHOOL_DISTRICT_COUNT_TRANSITION_KEY,
      );
      expect(due.map((item) => item.dueAt)).toEqual([
        nextSchoolCountDay(world.currentDate),
      ]);
    });
  }

  it("counts once per school year and names what changed", () => {
    const { world, town } = openAt(COLUMBUS, "schools-test");
    const districtId = townSchoolDistrictId(world, town)!;
    expect(countSchoolDistrictYear(world, town)).toBe(world);

    const due = world.history.futureDueItems.find(
      (item) => item.transitionKey === SCHOOL_DISTRICT_COUNT_TRANSITION_KEY,
    )!;
    // One pupil's enrollment ends before the fall count.
    const first = schoolDistrictYears(world, districtId)[0]!;
    const schools = new Set(first.schoolIds);
    const latestOf = (id: string) =>
      world.history.educationEnrollmentStates
        .filter((row) => row.enrollmentId === id)
        .at(-1);
    const leaving = world.history.educationEnrollments.find(
      (row) =>
        schools.has(row.organizationId) &&
        latestOf(row.id)?.status === "active" &&
        ageOnDate(world.people[row.personId]!.birthDate, due.dueAt) <= 16 &&
        world.history.educationEnrollments.filter(
          (other) => other.personId === row.personId,
        ).length === 1,
    )!;
    const latest = latestOf(leaving.id)!;
    let result!: ReturnType<typeof schoolDistrictCountHandler>;
    // Only the calendar moves; the world's other due items are not run here.
    withWorldIntegrityDeferred(() => {
      const dated: World = {
        ...world,
        currentDate: due.dueAt,
        currentMoment: simulationMomentOnLocalDate(
          world.currentMoment,
          due.dueAt,
        ),
      };
      const moved = recordEducationEnrollmentState(dated, {
        stableKey: `${latest.stableKey}:withdrawn`,
        enrollmentId: leaving.id,
        effectiveAt: due.dueAt,
        status: "withdrawn",
        contextKind: latest.contextKind,
        reason: "moved-away",
        provenance: latest.provenance,
        supersedesStateId: latest.id,
      });
      result = schoolDistrictCountHandler(moved, due);
    });
    expect(result.status).toBe("resolved");
    const years = schoolDistrictYears(result.world, districtId);
    expect(years.map((row) => row.schoolYear)).toEqual([
      schoolYearOf(world.currentDate),
      schoolYearOf(due.dueAt),
    ]);
    const second = years[1]!;
    expect(second.enrollment).toBe(first.enrollment - 1);
    expect(second.causes).toContainEqual({ kind: "enrollment", change: -1 });
    expect(
      result.world.history.futureDueItems.some(
        (item) =>
          item.transitionKey === SCHOOL_DISTRICT_COUNT_TRANSITION_KEY &&
          item.dueAt === nextSchoolCountDay(due.dueAt),
      ),
    ).toBe(true);
  });
});
