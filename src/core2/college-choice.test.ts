import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import {
  collegeModule,
  COLLEGE_MODULE_ID,
  type Enrollment,
} from "./modules/college";
import { departuresOf, movesModule } from "./modules/moves";
import { collegesNear } from "./opening-college";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

// SG-P15-college-enrollment, college at 18: at the fall term each resident
// who has turned 18 chooses, from their own records, to enroll at a college
// in their county or, with none there, to leave town for one, or not to
// enroll; the national rate (62% of high school completers, NCES 2022)
// checks the total, loosely, since two towns hold few 18-year-olds.
const towns = ["k1", "k2"].map((spec) => {
  const place = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? "college-choice",
    spec,
  );
  const input = buildDeepPast(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 800,
    }),
  );
  const core = createLifeCore(input, {
    modules: [movesModule, collegeModule],
  });
  const api = coreAPI(core);
  advanceCore(core, "2021-08-24");
  const turning = [...core.people.values()].filter(
    (person) =>
      person.alive &&
      person.tier !== "husk" &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate("2021-08-25")) ===
        18,
  );
  advanceCore(core, "2021-09-01");
  return { place, core, api, turning };
});

describe(`college at 18 in ${towns.map(({ place }) => `${place.name} (seed ${place.seed.slice(0, 12)})`).join(", ")}`, () => {
  it("enrolls near home or leaves town for college, by whether the county has one", () => {
    let chose = 0;
    let cohort = 0;
    for (const { api, turning } of towns) {
      const rows = api
        .moduleState(COLLEGE_MODULE_ID)
        .table("enrollments")
        .rows() as unknown as Enrollment[];
      const left = departuresOf(api).filter(
        (row) => row.date === "2021-08-25" && "college" in row.reasons,
      );
      for (const person of turning) {
        cohort += 1;
        const row = rows.find((r) => r.personId === person.id);
        const away = left.find((r) => r.personId === person.id);
        if (row) {
          expect(row.startedAt).toBe("2021-08-25");
          expect(collegesNear(person).map(([id]) => id)).toContain(
            row.collegeId,
          );
          chose += 1;
        }
        if (away) {
          expect(collegesNear(person)).toEqual([]);
          chose += 1;
        }
        expect(row && away).toBeFalsy();
      }
    }
    expect(cohort).toBeGreaterThan(0);
    expect(chose / cohort).toBeGreaterThan(0.25);
    expect(chose / cohort).toBeLessThan(0.95);
  });

  it("lets the opening's students graduate after their college's usual years", () => {
    for (const { api, core } of towns) {
      const rows = api
        .moduleState(COLLEGE_MODULE_ID)
        .table("enrollments")
        .rows() as unknown as Enrollment[];
      for (const row of rows) {
        if (row.status === "graduated")
          expect(row.endsAt <= core.date).toBe(true);
        else expect(row.endsAt > "2021-08-25").toBe(true);
      }
    }
  });
});
