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
import schoolData from "./data/school/outcomes.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { budgetsOf, governments } from "./modules/budgets";
import {
  OUTCOME_WEB_MODULE_ID,
  placeOutcome,
  type WebMonth,
} from "./modules/outcome-web";
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
    // The web writes its month on the 3rd, and writes it again whenever a
    // law takes effect, which drops a shift laid earlier; from the 3rd on,
    // the twin raises the effect again in any of the month's rows without
    // it, so the school engine reads it afterwards.
    if (shift && Number(core.date.slice(8)) >= 3) {
      const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
      for (const row of months.rows() as unknown as WebMonth[])
        if (
          row.month === core.date.slice(0, 7) &&
          LINKS.some((key) => row.effects[key] !== SHIFT)
        )
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
    if (fifths.length > 1) {
      // The researched gradient rests on lunch-program eligibility by fifth;
      // two fifths with the same eligible share clear at the same share.
      const eligible = schoolData.gradient.eligibleShareByIncomeFifth;
      const low = fifths[0]!;
      const high = fifths[fifths.length - 1]!;
      if (eligible[low] !== eligible[high])
        expect(share(low)).toBeLessThan(share(high));
      else expect(share(low)).toBeCloseTo(share(high), 9);
    } else {
      // Every student's household falls in one national income fifth (the
      // territories' household incomes sit below the national fifth limits),
      // so the gradient scaled to the place's mean is one: the group's share
      // is the place's own base times the web factor.
      const only = math[0]!;
      const record = placeOutcome(coreAPI(base), only.placeId, only.measure);
      console.log(
        `school: ${place.name} seed ${seed}: every student is in national income fifth ${fifths[0]}, so the share equals the place's base times its factor`,
      );
      expect(fifths.length, "income fifths with students").toBe(1);
      expect(record?.base, "web base").toBeDefined();
      expect(share(fifths[0]!)).toBeCloseTo(
        Math.min(1, (record!.base! / 100) * only.factor),
        9,
      );
    }
    // Full students keep their own result record, with its web record id.
    const results = rows<SchoolResultRow>(base, "results");
    console.log(
      `school: ${place.name} seed ${seed}: full results ${results.length}; math shares by fifth ${fifths.map((f) => `${f}:${share(f).toFixed(3)}`).join(" ")}`,
    );
    // Spending per student stands on the budgets in force, in a believable
    // range. It reads the schools line of the town's city and county budgets;
    // a place whose budget bases carry no function breakdown (the territories
    // report one all-funds total) has no such line, so no spending record is
    // made and the test says so by the budgets' own rows.
    const spending = rows<SchoolMeasureRow>(base, "measures").find(
      (m) => m.measure === "school.spending-per-student",
    );
    const budgetApi = coreAPI(base);
    const schoolsLines = governments(budgetApi)
      .filter((g) => g.level === "city" || g.level === "county")
      .flatMap((g) => budgetsOf(budgetApi, g.id))
      .filter((b) => b.spendingMinor["schools"]);
    if (schoolsLines.length === 0) {
      console.log(
        `school: ${place.name} seed ${seed}: no city or county budget carries a schools line (governments ${governments(
          budgetApi,
        )
          .map((g) => g.level)
          .join(", ")}), so no spending record is made`,
      );
      expect(
        spending,
        "spending record without a schools line",
      ).toBeUndefined();
    } else {
      expect(spending, `spending record in ${place.name}`).toBeDefined();
      expect(spending!.budgetIds!.length).toBeGreaterThan(0);
      expect(spending!.value).toBeGreaterThan(3000);
      expect(spending!.value).toBeLessThan(60000);
    }
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
