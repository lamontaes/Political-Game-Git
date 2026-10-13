import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { isSchoolDay, SCHOOL_MODULE_ID } from "./modules/school";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-school");

describe(`school days in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("keeps weekdays of the school year and skips weekends and breaks", () => {
    expect(isSchoolDay("2021-01-04")).toBe(true); // a Monday
    expect(isSchoolDay("2021-01-09")).toBe(false); // a Saturday
    expect(isSchoolDay("2021-07-14")).toBe(false); // summer
    expect(isSchoolDay("2020-12-28")).toBe(false); // winter break
  });

  it("sends the town's school-age full people to its school on school days", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    advanceCore(core, "2021-01-22");
    const schoolDays = [
      ...Array.from(
        { length: 22 },
        (_, i) => `2021-01-${String(i + 1).padStart(2, "0")}`,
      ),
    ].filter((date) => date > "2021-01-01" && isSchoolDay(date)).length;
    const town = core.people.get(core.playerId!)!.placeId;
    const school = [...core.organizations.values()].find(
      (row) => row.placeId === town && row.classification === "service:school",
    );
    const kids = [...core.people.values()].filter((row) => {
      const age = 2021 - Number(row.birthDate.slice(0, 4));
      return (
        row.placeId === town &&
        row.id !== core.playerId &&
        age >= 6 &&
        age <= 16
      );
    });
    if (!school || !kids.length) return;
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
  }, 300_000);
});
