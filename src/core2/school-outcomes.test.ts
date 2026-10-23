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
  countedHouseholdsByPlace,
  householdIncome,
  incomeBandOf,
  residentsRuntime,
} from "./modules/residents";
import {
  OUTCOME_WEB_MODULE_ID,
  placeOutcome,
  type WebMonth,
} from "./modules/outcome-web";
import { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "./school-measures";
import {
  SCHOOL_MEASURE,
  schoolStartYear,
  studentsByPlace,
  type SchoolGroupRow,
  type SchoolResultRow,
} from "./school-outcomes";
import schoolDays from "./data/school-days.json" with { type: "json" };
import { ageOn } from "./counted-groups";
import { fullHouseholdIncomes } from "./counted-income-fifth";
import { webReach } from "./outcome-web-reach";
import { setBookkeeping } from "./bookkeeping";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const seed = process.env.SCHOOL_SEED || randomBytes(8).toString("hex");
// A drawn place whose eighth graders and seniors all sit in the upper income
// fifths cannot show the funding effect, which reaches the low fifths; such a
// place is drawn again, a bounded number of times.
const REDRAWS = 5;
let drawSeed = seed;
let place = drawPlace(drawSeed, "school-outcomes");
const SHIFT = 0.5;
const LINKS = [
  "equalized-funding-to-math-proficiency",
  "equalized-funding-to-graduation",
];

function play(shift: boolean) {
  const opening = gameStartDate();
  const world = buildBenchWorld(drawSeed, opening, {
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

describe(`school outcomes (seed ${seed})`, () => {
  it("decides tests and graduation from the place's base, its web factor and each student's standing", () => {
    const groupsOf = (core: CoreState, measure: string) =>
      rows<SchoolGroupRow>(core, "groups").filter((r) => r.measure === measure);
    const hasLowFifths = (core: CoreState) =>
      ["school.math-proficient-pct", "school.graduation-pct"].every((m) =>
        groupsOf(core, m).some((g) => g.incomeFifth <= 1),
      );
    const tried: string[] = [];
    let base = play(false);
    for (let draw = 1; draw < REDRAWS && !hasLowFifths(base); draw += 1) {
      tried.push(`${place.name}, ${place.state} (${drawSeed})`);
      drawSeed = `${seed}-${draw}`;
      place = drawPlace(drawSeed, "school-outcomes");
      base = play(false);
    }
    if (!hasLowFifths(base))
      throw new Error(
        `no drawn place in ${REDRAWS} draws has eighth graders and seniors in the low income fifths (${[...tried, `${place.name}, ${place.state} (${drawSeed})`].join("; ")})`,
      );
    console.log(
      `school: ${place.name}, ${place.state}, seed ${drawSeed}${tried.length ? `; drawn again after ${tried.join("; ")}` : ""}`,
    );
    const moved = play(true);
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
      // Each income fifth settles its count against its expected count to
      // within its heaviest student's weight (one household's weight, and no
      // more than the group's students), so the place is off by at most the
      // sum of those across its fifths.
      const rt = residentsRuntime(base);
      const heaviestHousehold = Math.max(
        1,
        ...(rt?.store.households ?? []).map((h) => rt!.store.weightOf(h)),
      );
      const bound = groups.reduce(
        (n, g) => n + Math.min(g.students, heaviestHousehold),
        0,
      );
      expect(Math.abs(passed - expected)).toBeLessThanOrEqual(bound);
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

describe(`a student filled in keeps the income fifth the counts gave them (seed ${seed})`, () => {
  it("a household whose income besides job pay sets its income fifth keeps that fifth and web factor when a student in it is met", () => {
    const tried: string[] = [];
    const priorBookkeeping = setBookkeeping(false);
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const drawn = drawPlace(seed, `school-income-fill-in:${attempt}`);
        const where = `seed ${seed}, ${drawn.name} (${drawn.key}), attempt ${attempt}`;
        const core = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        }).core as CoreState;
        const api = coreAPI(core);
        // A played year, then a student is met.
        advanceCore(core, addDays(makeIsoDate(core.date), 365));
        const rt = residentsRuntime(core);
        if (!rt) {
          tried.push(`${where}: no counted tier`);
          continue;
        }
        const startYear = schoolStartYear(
          core.date,
          schoolDays.schoolYear.firstDay,
        );
        const sept = `${startYear}-09-01`;
        // A counted student whose household's income besides its recorded pay
        // (its unplaced workers' pay, retirement awards) moves it to another
        // income fifth. The reader is the same for every grade, so any
        // school-age student will do.
        let found: {
          placeId: string;
          kid: string;
          grade: number;
          nonJob: number;
        } | null = null;
        const grades = Array.from(
          { length: schoolData.tested.graduation + 1 },
          (_, grade) => grade,
        );
        for (const [placeId, records] of countedHouseholdsByPlace(core)) {
          for (const record of records) {
            const at = rt.store.householdOf.get(record.household.id);
            if (at === undefined) continue;
            const h = rt.store.households[at]!;
            const total = householdIncome(rt, h);
            const nonJob = total - h.wagesMinorYear;
            if (
              nonJob <= 0 ||
              incomeBandOf(total) === incomeBandOf(h.wagesMinorYear)
            )
              continue;
            for (const grade of grades) {
              const kid = record.people.find(
                (p) =>
                  ageOn(p.birthDate, sept) === schoolData.gradeAgeFirst + grade,
              );
              if (kid) {
                found = { placeId, kid: kid.id, grade, nonJob };
                break;
              }
            }
            if (found) break;
          }
          if (found) break;
        }
        if (!found) {
          tried.push(
            `${where}: no counted student whose household's income besides pay moves its fifth`,
          );
          continue;
        }
        const studentOf = () =>
          studentsByPlace(api, found!.grade, startYear, () => undefined)
            .get(found!.placeId)
            ?.find((s) => s.id === found!.kid);
        const before = studentOf();
        expect(
          before,
          `${where}: ${found.kid} is a counted student`,
        ).toBeDefined();
        expect(before!.full, `${where}: ${found.kid} counted before`).toBe(
          false,
        );

        fillInPerson(core, found.kid);
        const after = studentOf();
        expect(after?.full, `${where}: ${found.kid} filled in`).toBe(true);
        const home = core.people.get(found.kid)!.householdId;
        // The filled-in household's basis carries what the counts read: its
        // unplaced workers' pay is a job outside the town by then, and its
        // awards are standing contracts.
        const awards = [...core.finance.contracts.values()].filter(
          (c) => c.recipientIncome?.householdId === home && !c.endedAt,
        );
        const jobs = [...core.jobs.values()].filter(
          (j) =>
            j.endsAt === undefined &&
            core.people.get(j.personId)?.householdId === home,
        );
        const sources = [...awards.map((c) => c.id), ...jobs.map((j) => j.id)];
        expect(
          after!.fifth,
          `${where}: ${found.kid} in ${home} (income ${fullHouseholdIncomes(core).get(home) ?? 0}, from ${sources.join(", ") || "nothing"}) keeps fifth ${before!.fifth}`,
        ).toBe(before!.fifth);
        for (const measure of [SCHOOL_MEASURE.math, SCHOOL_MEASURE.graduation])
          expect(
            webReach(api, found.placeId, measure, { incomeFifth: after!.fifth })
              .factor,
            `${where}: ${measure} factor`,
          ).toBe(
            webReach(api, found.placeId, measure, {
              incomeFifth: before!.fifth,
            }).factor,
          );
        console.info(
          `school income fill-in ${where}: grade ${found.grade} student ${found.kid}, household ${home}, fifth ${before!.fifth} counted and ${after!.fifth} filled in; ${Math.round(found.nonJob)} a year besides recorded pay; income from ${sources.join(", ")}`,
        );
        return;
      }
      throw new Error(
        `No drawn place had a student to check (seed ${seed}); tried ${tried.join("; ")}`,
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 1_500_000);
});
