import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { isSchoolDay, SCHOOL_MODULE_ID } from "./modules/school";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import { daysAfterStart } from "./tooling/test-days";
import { gameStartDate } from "./game-start";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-school");

describe(`school days in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("keeps weekdays of the school year and skips weekends and breaks", () => {
    expect(isSchoolDay("2021-01-04")).toBe(true); // a Monday
    expect(isSchoolDay("2021-01-09")).toBe(false); // a Saturday
    expect(isSchoolDay("2021-07-14")).toBe(false); // summer
    expect(isSchoolDay("2020-12-28")).toBe(false); // winter break
    // Holidays by their federal rules, which move year to year.
    expect(isSchoolDay("2021-11-25")).toBe(false); // Thanksgiving 2021
    expect(isSchoolDay("2021-11-26")).toBe(false); // the day after
    expect(isSchoolDay("2022-11-24")).toBe(false); // Thanksgiving 2022
    expect(isSchoolDay("2022-11-25")).toBe(false);
    expect(isSchoolDay("2022-11-23")).toBe(true);
    expect(isSchoolDay("2021-09-06")).toBe(false); // Labor Day
    expect(isSchoolDay("2021-01-18")).toBe(false); // Martin Luther King Jr. Day
    expect(isSchoolDay("2021-02-15")).toBe(false); // Presidents' Day
    expect(isSchoolDay("2021-05-31")).toBe(false); // Memorial Day
    expect(isSchoolDay("2021-05-24")).toBe(true);
  });

  it("sends the town's school-age full people to its school on school days", () => {
    // A town with a public school and school-age children: draw until one.
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const drawn = attempt
        ? drawPlace(`${seed}:${attempt}`, "core2-school")
        : place;
      const core = createLifeCore(
        generatedOpening(drawn, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      );
      advanceCore(core, daysAfterStart(21));
      // The 21 days run after the opening day.
      const schoolDays = Array.from({ length: 21 }, (_, i) =>
        daysAfterStart(i + 1),
      ).filter((date) => isSchoolDay(date)).length;
      const town = core.people.get(core.playerId!)!.placeId;
      const school = [...core.organizations.values()].find(
        (row) =>
          row.placeId === town && row.classification === "service:school",
      );
      const kids = [...core.people.values()].filter((row) => {
        const age =
          Number(gameStartDate().slice(0, 4)) -
          Number(row.birthDate.slice(0, 4));
        return (
          row.placeId === town &&
          row.id !== core.playerId &&
          age >= 6 &&
          age <= 16
        );
      });
      if (!school || !kids.length) {
        tried.push(`${drawn.name} (${drawn.key})`);
        continue;
      }
      const rows = coreAPI(core)
        .moduleState(SCHOOL_MODULE_ID)
        .table("attended")
        .rows();
      for (const kid of kids) {
        const days = kid.actsByKind.get("attend-school") ?? 0;
        // Attending is each child's choice; nobody goes on a day off.
        expect(days).toBeLessThanOrEqual(schoolDays);
        expect(days).toBeGreaterThan(0);
      }
      expect(rows.every((row) => row.schoolId === school.id)).toBe(true);
      return;
    }
    throw new Error(
      `no drawn town had a school and school-age children (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
