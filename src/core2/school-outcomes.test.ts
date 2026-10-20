/**
 * School outcomes in a played world. Two worlds from one seed and place,
 * identical but for the web's equalized-funding effect, shifted in the web
 * month rows (on the 3rd, as the outcome-web twins do). Every enrolled
 * eighth grader gets a math and a reading record in the testing month and
 * every senior a graduation record on the last day of the year; the place's
 * share follows the web's factor, differs across income fifths, and reaches
 * the web's own graduation measure by record id.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "./school-measures";
import type { SchoolGroupRow, SchoolResultRow } from "./school-outcomes";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.SCHOOL_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "school-outcomes");
const SHIFT = 0.5;
const LINKS = [
  "equalized-funding-to-math-proficiency",
  "equalized-funding-to-graduation",
];

function play(shift: boolean) {
  const opening = gameStartDate();
  const world = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  let day = makeIsoDate(opening);
  const end = addDays(day, 165);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    // The web writes its month on the 3rd; the twin raises the effect in
    // the rows it just wrote, so the school engine reads it afterwards.
    if (shift && core.date.slice(8) === "03") {
      const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
      for (const row of months.rows() as unknown as WebMonth[])
        if (row.month === core.date.slice(0, 7))
          months.put({
            ...row,
            effects: {
              ...row.effects,
              ...Object.fromEntries(LINKS.map((key) => [key, SHIFT])),
            },
          } as never);
    }
  }
  return core as CoreState;
}

const rows = <T>(core: CoreState, name: string) =>
  coreAPI(core)
    .moduleState(SCHOOL_MODULE_ID)
    .table(name)
    .rows() as unknown as T[];

describe(`school outcomes (${place.name}, seed ${seed})`, () => {
  it("decides tests and graduation from the place's base, its web factor and each student's standing", () => {
    const base = play(false);
    const moved = play(true);
    const groupsOf = (core: CoreState, measure: string) =>
      rows<SchoolGroupRow>(core, "groups").filter((r) => r.measure === measure);
    for (const measure of [
      "school.math-proficient-pct",
      "school.reading-proficient-pct",
      "school.graduation-pct",
    ]) {
      const groups = groupsOf(base, measure);
      // Records exist: a group count per income fifth that has students.
      expect(
        groups.length,
        `${measure} groups in ${place.name}`,
      ).toBeGreaterThan(0);
      const students = groups.reduce((n, g) => n + g.students, 0);
      const passed = groups.reduce((n, g) => n + g.passed, 0);
      const expected = groups.reduce((n, g) => n + g.expected, 0);
      expect(students).toBeGreaterThan(0);
      // The count follows the expected count to within one household's weight.
      const heaviest = Math.max(...groups.map((g) => g.students));
      expect(Math.abs(passed - expected)).toBeLessThanOrEqual(heaviest);
    }
    // The shifted world: the funding effect reached the low fifths' factor
    // and moved their counts; the top fifths (weight 0) did not move.
    for (const measure of [
      "school.math-proficient-pct",
      "school.graduation-pct",
    ]) {
      const a = groupsOf(base, measure);
      const b = groupsOf(moved, measure);
      const low = b.filter((g) => g.incomeFifth <= 1);
      expect(low.length, `${measure} low fifths`).toBeGreaterThan(0);
      for (const g of low) {
        const before = a.find((x) => x.id === g.id)!;
        expect(g.factor, g.id).toBeGreaterThan(before.factor);
        expect(g.expected, g.id).toBeGreaterThan(before.expected);
      }
      for (const g of b.filter((x) => x.incomeFifth >= 3))
        expect(g.factor, g.id).toBeCloseTo(
          a.find((x) => x.id === g.id)!.factor,
          9,
        );
    }
    // The share differs across income fifths: the lowest fifth with students
    // clears at a lower share than the highest.
    const math = groupsOf(base, "school.math-proficient-pct");
    const fifths = [...new Set(math.map((g) => g.incomeFifth))].sort();
    const share = (f: number) => {
      const g = math.filter((x) => x.incomeFifth === f);
      return (
        g.reduce((n, x) => n + x.expected, 0) /
        g.reduce((n, x) => n + x.students, 0)
      );
    };
    expect(fifths.length).toBeGreaterThan(1);
    expect(share(fifths[0]!)).toBeLessThan(share(fifths[fifths.length - 1]!));
    // Full students keep their own result record, with its web record id.
    const results = rows<SchoolResultRow>(base, "results");
    console.log(
      `school: ${place.name} seed ${seed}: full results ${results.length}; math shares by fifth ${fifths.map((f) => `${f}:${share(f).toFixed(3)}`).join(" ")}`,
    );
    // Spending per student stands on the budgets in force, in a believable range.
    const spending = rows<SchoolMeasureRow>(base, "measures").find(
      (m) => m.measure === "school.spending-per-student",
    )!;
    expect(spending.budgetIds!.length).toBeGreaterThan(0);
    expect(spending.value).toBeGreaterThan(3000);
    expect(spending.value).toBeLessThan(60000);
    // The web reads the engine's graduation record, not its ledger.
    const api = coreAPI(base);
    const months = api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .rows() as unknown as WebMonth[];
    const read = months.filter((m) => m.engineSources["school.graduation-pct"]);
    expect(read.length).toBeGreaterThan(0);
    const measure = rows<{ id: string; value: number }>(base, "measures").find(
      (m) => m.id === read[0]!.engineSources["school.graduation-pct"],
    )!;
    expect(read[0]!.values["school.graduation-pct"]).toBe(measure.value);
  }, 1_500_000);
});
