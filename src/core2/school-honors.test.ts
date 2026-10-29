/**
 * School honors. The data rows carry a tag and a source for every number and
 * the rate follows from them; the calendar days are the real ones; the
 * decision spends a place's owed share down its ranked students (a counted
 * student standing for their household's weight) and carries the fraction
 * left, so a small town gets an honor every few years and never on a
 * threshold. A played world decides the signing day from its own seniors,
 * keeps the row and the public `school.honor` event, and the press wire holds
 * an item for the event.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import honorsData from "./data/school/honors.json" with { type: "json" };
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { PRESS_MODULE_ID } from "./modules/press";
import {
  clearHonor,
  HONORS,
  honorRate,
  honorScore,
  honorsOn,
  isHonorDay,
  SCHOOL_HONOR_EVENT,
  type SchoolHonorRow,
} from "./school-honors";
import { SCHOOL_MODULE_ID } from "./school-measures";
import {
  schoolStartYear,
  studentsByPlace,
  type Student,
} from "./school-outcomes";
import { STOPGAPS } from "./stopgaps";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.SCHOOL_HONORS_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "school-honors");

const student = (id: string, standing: number, weight = 1): Student => ({
  id,
  weight,
  fifth: 2,
  standing,
  full: weight === 1,
});

describe("the honors data rows", () => {
  it("tags every rate, day and grade list and names its source", () => {
    expect(HONORS.map((honor) => honor.key)).toEqual([
      "spelling-bee-regional",
      "division-one-signing",
    ]);
    for (const honor of honorsData.honors) {
      expect(["SOURCED", "ESTIMATED"]).toContain(honor.rate.tag);
      expect(honor.rate.source).toMatch(/https:\/\//);
      expect(honor.rate.derivation.length).toBeGreaterThan(40);
      expect(["SOURCED", "ESTIMATED"]).toContain(honor.gradesTag);
      expect(honor.gradesSource.length).toBeGreaterThan(40);
      expect(["SOURCED", "ESTIMATED"]).toContain(honor.day.tag);
      expect(honor.day.source).toMatch(/\(fetched Oct 29, 2026\)/);
    }
  });

  it("keeps each rate inside its stated spread, and every stopgap it names registered", () => {
    const known = new Set(STOPGAPS.map((row) => row.id));
    for (const honor of honorsData.honors) {
      const rate = honor.rate.winnersPerYear / honor.rate.studentsNationally;
      expect(rate).toBeGreaterThanOrEqual(honor.rate.spread.low);
      expect(rate).toBeLessThanOrEqual(honor.rate.spread.high);
      for (const id of honor.stopgaps) expect(known.has(id)).toBe(true);
      // An honor ranked by traits says where the traits come from.
      if (honor.traits.length) expect(honor.stopgaps.length).toBeGreaterThan(0);
    }
    expect(known.has(honorsData.stopgaps.noHistory)).toBe(true);
    // The Division I rate rests on the NCAA table's own arithmetic.
    expect(Math.round(154_946 / 4)).toBe(
      honorsData.honors[1]!.rate.winnersPerYear,
    );
  });
});

describe("the honors calendar", () => {
  it("decides the spelling bee on March 1 and the signing on the first Wednesday of December", () => {
    const spelling = HONORS.find((h) => h.key === "spelling-bee-regional")!;
    const signing = HONORS.find((h) => h.key === "division-one-signing")!;
    expect(isHonorDay("2026-03-01", spelling.day)).toBe(true);
    expect(isHonorDay("2026-03-02", spelling.day)).toBe(false);
    // The signing days ESPN reported: December 3, 2025 and December 4, 2024.
    for (const day of ["2025-12-03", "2024-12-04", "2026-12-02"])
      expect(isHonorDay(day, signing.day)).toBe(true);
    // Not another Wednesday of the month, another month, or another weekday.
    for (const day of [
      "2025-12-10",
      "2025-12-31",
      "2025-12-04",
      "2025-02-05",
      "2025-11-05",
    ])
      expect(isHonorDay(day, signing.day)).toBe(false);
  });

  it("finds the honors due on a day, and none on an ordinary one", () => {
    expect(honorsOn("2025-12-03").map((h) => h.key)).toEqual([
      "division-one-signing",
    ]);
    expect(honorsOn("2025-03-01").map((h) => h.key)).toEqual([
      "spelling-bee-regional",
    ]);
    expect(honorsOn("2025-06-17")).toEqual([]);
    // Every day of a year but the honors' own days answers none.
    let due = 0;
    for (let day = makeIsoDate("2025-01-01"); day < "2026-01-01";) {
      due += honorsOn(day).length;
      day = addDays(day, 1);
    }
    expect(due).toBe(HONORS.length);
  });
});

describe("clearing an honor down the ranked students", () => {
  const rate = honorRate(HONORS.find((h) => h.key === "division-one-signing")!);

  it("honors the top-ranked student first and carries the fraction left", () => {
    const seniors = [student("c", 0.2), student("a", 0.9), student("b", 0.5)];
    const score = (s: Student) => s.standing;
    // Owed just under one student: nobody, and the whole share carries.
    const none = clearHonor(seniors, score, rate, 0.99 - 3 * rate);
    expect(none.cleared).toEqual([]);
    expect(none.owedAfter).toBeCloseTo(0.99, 12);
    // A hair more and the top-ranked student clears, never the others first.
    const one = clearHonor(seniors, score, rate, 1.01 - 3 * rate);
    expect(one.cleared.map((s) => s.id)).toEqual(["a"]);
    expect(one.owedAfter).toBeCloseTo(0.01, 12);
    const two = clearHonor(seniors, score, rate, 2.5 - 3 * rate);
    expect(two.cleared.map((s) => s.id)).toEqual(["a", "b"]);
    expect(two.ranked.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks a tie by id, so the same world always honors the same student", () => {
    const tied = [student("z", 0.4), student("m", 0.4), student("b", 0.4)];
    const result = clearHonor(tied, (s) => s.standing, rate, 1);
    expect(result.cleared.map((s) => s.id)).toEqual(["b"]);
  });

  it("counts a counted student for their whole household weight, and never clears past a higher rank", () => {
    // Three players stand behind the top-ranked counted student.
    const students = [student("top", 0.9, 3), student("next", 0.8)];
    const short = clearHonor(students, (s) => s.standing, rate, 2.5);
    expect(short.cleared).toEqual([]);
    expect(short.owedAfter).toBeCloseTo(2.5 + 4 * rate, 12);
    const enough = clearHonor(students, (s) => s.standing, rate, 3);
    expect(enough.cleared.map((s) => s.id)).toEqual(["top"]);
    expect(enough.cleared.reduce((n, s) => n + s.weight, 0)).toBe(3);
  });

  it("is monotone: owing more never un-honors a student", () => {
    const seniors = Array.from({ length: 9 }, (_, i) =>
      student(`s${i}`, i / 10),
    );
    let before = new Set<string>();
    for (let owed = 0; owed < 9; owed += 0.25) {
      const now = new Set(
        clearHonor(seniors, (s) => s.standing, rate, owed).cleared.map(
          (s) => s.id,
        ),
      );
      for (const id of before) expect(now.has(id)).toBe(true);
      before = now;
    }
  });

  it("gives a small town an honor every few years, and every year's total follows its expected count", () => {
    // A town of thirteen seniors: expected a hundredth of a year's class each.
    const seniors = Array.from({ length: 13 }, (_, i) =>
      student(`s${i}`, i / 13),
    );
    let owed = 0;
    let honored = 0;
    const years: number[] = [];
    for (let year = 1; year <= 40; year += 1) {
      const result = clearHonor(seniors, (s) => s.standing, rate, owed);
      owed = result.owedAfter;
      if (result.cleared.length) years.push(year);
      honored += result.cleared.length;
      // What was expected is either honored or still owed: nothing is lost.
      expect(honored + owed).toBeCloseTo(year * 13 * rate, 9);
    }
    // The first honor comes when a student's worth has built up, not on a roll.
    expect(years[0]).toBe(Math.ceil(1 / (13 * rate)));
    expect(years.length).toBeGreaterThanOrEqual(3);
  });

  it("ranks a signing by the athletic traits as well as the standing, and a spelling bee by standing alone", () => {
    const signing = HONORS.find((h) => h.key === "division-one-signing")!;
    const spelling = HONORS.find((h) => h.key === "spelling-bee-regional")!;
    const driven = Object.fromEntries(signing.traits.map((t) => [t, 2]));
    const idle = Object.fromEntries(signing.traits.map((t) => [t, -2]));
    // Equal standing: the competitive, persistent student ranks above the idle one.
    expect(honorScore(0.5, driven, signing, 0.5)).toBeGreaterThan(
      honorScore(0.5, idle, signing, 0.5),
    );
    // The spelling bee names no traits: the same two students tie on standing.
    expect(honorScore(0.5, driven, spelling, 0.5)).toBe(
      honorScore(0.5, idle, spelling, 0.5),
    );
    // A student with no recorded traits is not penalized as an idle one.
    expect(honorScore(0.5, undefined, signing, 0.5)).toBe(0.5);
  });
});

describe(`a played world's honors in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("decides the signing day from the town's own seniors, keeps the row and the public event, and puts it on the press wire", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as CoreState;
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const carry = api.moduleState(SCHOOL_MODULE_ID).table("carry");
    const honors = api.moduleState(SCHOOL_MODULE_ID).table("honors");
    const rows = () => honors.rows() as unknown as SchoolHonorRow[];

    // The regional bee, March 1: the town's expected count is its students
    // of grades 5 to 8 times the sourced rate, carried (the sliding scale).
    advanceCore(core, makeIsoDate("2025-03-02"));
    const spelling = HONORS.find((h) => h.key === "spelling-bee-regional")!;
    const middle = spelling.grades.reduce(
      (n, grade) =>
        n +
        (
          studentsByPlace(
            api,
            grade,
            schoolStartYear("2025-03-01", "09-01"),
            () => undefined,
          ).get(town) ?? []
        ).reduce((m, s) => m + s.weight, 0),
      0,
    );
    const spellingCarry = carry.get(`honor:${spelling.key}:${town}`) as
      { owed: number; students: number; expected: number } | undefined;
    if (middle) {
      expect(spellingCarry).toBeDefined();
      // The decision's own count is the town's middle school give or take the
      // day's arrivals and departures; what it expected is that times the
      // rate, and a first year owes exactly what was expected.
      expect(spellingCarry!.students).toBeGreaterThan(middle * 0.9);
      expect(spellingCarry!.students).toBeLessThan(middle * 1.1);
      expect(spellingCarry!.expected).toBeCloseTo(
        spellingCarry!.students * honorRate(spelling),
        12,
      );
      const honoredAlready = rows()
        .filter((r) => r.honor === spelling.key && r.placeId === town)
        .reduce((n, r) => n + r.count, 0);
      expect(spellingCarry!.owed + honoredAlready).toBeCloseTo(
        spellingCarry!.expected,
        12,
      );
    }

    // The signing day, December 3: seed the town owed a student's worth
    // from the years before (the world opens owing none: SG-SCHOOL-honors-no-history).
    advanceCore(core, makeIsoDate("2025-12-02"));
    const signing = HONORS.find((h) => h.key === "division-one-signing")!;
    const seniors =
      studentsByPlace(
        api,
        12,
        schoolStartYear("2025-12-03", "09-01"),
        () => undefined,
      ).get(town) ?? [];
    expect(rows().filter((r) => r.honor === signing.key)).toEqual([]);
    const owed = Math.max(0, ...seniors.map((s) => s.weight)) + 1;
    carry.put({ id: `honor:${signing.key}:${town}`, owed } as never);
    advanceCore(core, makeIsoDate("2025-12-03"));

    const row = rows().find(
      (r) => r.honor === signing.key && r.placeId === town,
    );
    if (!seniors.length) {
      // A town with no seniors this year honors no one.
      expect(row).toBeUndefined();
      return;
    }
    expect(row, "the town's seniors were owed a student's worth").toBeDefined();
    expect(row!.date).toBe("2025-12-03");
    expect(row!.id).toBe(`${signing.key}:${town}:2025-12-03`);
    expect(row!.count).toBeGreaterThan(0);
    expect(row!.owedBefore).toBeCloseTo(owed + row!.expected, 12);
    expect(row!.owedAfter).toBeCloseTo(row!.owedBefore - row!.count, 12);
    expect(row!.students).toBeCloseTo(
      seniors.reduce((n, s) => n + s.weight, 0),
      9,
    );
    // The carry now holds what is still owed.
    expect(
      (carry.get(`honor:${signing.key}:${town}`) as unknown as { owed: number })
        .owed,
    ).toBeCloseTo(row!.owedAfter, 12);
    // Only full people are named; the honored seniors are among the town's.
    const fullSeniors = new Set(seniors.filter((s) => s.full).map((s) => s.id));
    for (const id of row!.personIds) {
      expect(core.people.has(id as never)).toBe(true);
      expect(fullSeniors.has(id)).toBe(true);
    }
    // The public record the press reads.
    const event = core.durableLog.get(row!.eventId as never);
    expect(event, "a public record at a place the player sees").toBeDefined();
    expect(event!.kind).toBe(SCHOOL_HONOR_EVENT);
    expect(event!.publicRecord).toBe(true);
    expect(event!.personIds).toEqual(row!.personIds);
    expect(event!.facts).toMatchObject({
      honor: signing.key,
      tier: "division-one",
      count: `${row!.count}`,
      record: row!.id,
    });
    // The wire holds an item for it.
    const wire = api
      .moduleState(PRESS_MODULE_ID)
      .table("wire")
      .get(row!.eventId) as unknown as
      { kind: string; level: string; subjectIds: string[] } | undefined;
    expect(wire, "wireItem accepts the event").toBeDefined();
    expect(wire!.kind).toBe(SCHOOL_HONOR_EVENT);
    expect(wire!.level).toBe("town");
    expect(wire!.subjectIds).toEqual(row!.personIds);

    // Decided once: the next day adds nothing.
    const kept = rows().length;
    advanceCore(core, makeIsoDate("2025-12-04"));
    expect(rows()).toHaveLength(kept);
    expect(rows().find((r) => r.id === row!.id)).toEqual(row);
  }, 900_000);
});
