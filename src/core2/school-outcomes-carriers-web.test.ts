/**
 * Three school links are carried by links that already run into the school
 * engine (web-reach-schools): prek-to-graduation by
 * universal-prek-to-graduation, child-coverage-to-graduation by
 * uninsured-to-graduation, and family-income-to-scores (for math) by
 * poverty-to-math-proficiency. Each carrier is played in the bench world, in
 * a place drawn from all 56 on a seed nobody chose: a base world, and per
 * carrier a twin with that carrier's effect set on the web's month rows. The
 * school engine's records for the carrier's measure follow: each income
 * fifth's factor carries the carrier's part, and each full student's result
 * reads the shifted month row.
 *
 * The web writes a month's rows on its day and again whenever a law takes
 * effect, within that day's step, so a shift laid between days can be gone
 * before a reader reads. The twin lays it at the moment of each read instead,
 * through the module tables' debug trace, so whatever the school engine reads
 * carries it.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { setTableTrace } from "./module-state";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { subjectWeight } from "./outcome-web-reach";
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";
import { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "./school-measures";
import {
  SCHOOL_MEASURE,
  schoolStartYear,
  studentsByPlace,
  type SchoolGroupRow,
  type SchoolResultRow,
} from "./school-outcomes";
import schoolData from "./data/school/outcomes.json" with { type: "json" };
import schoolDays from "./data/school-days.json" with { type: "json" };
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.SCHOOL_CARRIERS_SEED || randomBytes(8).toString("hex");
const CARRIERS = [
  {
    carried: "prek-to-graduation",
    link: "universal-prek-to-graduation",
    measure: SCHOOL_MEASURE.graduation,
  },
  {
    carried: "child-coverage-to-graduation",
    link: "uninsured-to-graduation",
    measure: SCHOOL_MEASURE.graduation,
  },
  {
    carried: "family-income-to-scores",
    link: "poverty-to-math-proficiency",
    measure: SCHOOL_MEASURE.math,
  },
] as const;
/** Many times the researched sizes, so a small town's students can show the read. */
const SHIFT = 0.3;
/** A full played year, including the graduation records from its school year. */
const DAYS = 365;
const ATTEMPTS = 5;

type Drawn = ReturnType<typeof drawPlace>;

const rows = <T>(core: CoreState, name: string) =>
  coreAPI(core)
    .moduleState(SCHOOL_MODULE_ID)
    .table(name)
    .rows() as unknown as T[];

/** Plays a full year from the game start, the twin with one link's effect on every month row. */
function play(drawn: Drawn, link?: string) {
  const t0 = Date.now();
  const opening = gameStartDate();
  const built = buildBenchWorld(drawn.seed, opening, {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = built.core as CoreState;
  const months = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months");
  let day = makeIsoDate(opening);
  const end = addDays(day, DAYS);
  // The twin's effect goes on every row without it at the first read after
  // the web writes a row, so a row the web rewrote earlier in the day is
  // shifted again before it is read; the laying's own reads and writes pass
  // through.
  let laying = false;
  let written = true;
  const lay = (shifted: string) => {
    laying = true;
    try {
      for (const row of months.rows() as unknown as WebMonth[])
        if (row.effects[shifted] !== SHIFT)
          months.put({
            ...row,
            effects: { ...row.effects, [shifted]: SHIFT },
          } as never);
    } finally {
      laying = false;
    }
  };
  if (link)
    setTableTrace((moduleId, table, op) => {
      if (laying || moduleId !== OUTCOME_WEB_MODULE_ID || table !== "months")
        return;
      if (op === "put" || op === "remove") written = true;
      else if (written) {
        written = false;
        lay(link);
      }
    });
  try {
    while (day < end) {
      day = addDays(day, 1);
      advanceCore(core, day);
    }
  } finally {
    setTableTrace(null);
  }
  // A row the web rewrote after its last read is shifted back to what was read.
  if (link) lay(link);
  console.error(`TIMING play ${link ?? "base"} ${(Date.now() - t0) / 1000}s`);
  expect(core.date, `${drawn.name}: full-year boundary`).toBe(end);
  return { core, placeId: built.placeId };
}

/**
 * Whether a drawn place can show every carrier, from what its opening holds:
 * seniors to graduate this school year, and full students in the tested math
 * grade, since only a full student keeps a math result. What the played year
 * then makes of them is under test, so a place that passes here is never
 * drawn again.
 */
function ineligible(drawn: Drawn): string | null {
  const opening = gameStartDate();
  const built = buildBenchWorld(drawn.seed, opening, {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const api = coreAPI(built.core as CoreState);
  const startYear = schoolStartYear(opening, schoolDays.schoolYear.firstDay);
  const of = (grade: number) =>
    studentsByPlace(api, grade, startYear, () => undefined).get(
      built.placeId,
    ) ?? [];
  const missing = [
    ...(of(schoolData.tested.graduation).length ? [] : ["no seniors"]),
    ...(of(schoolData.tested.math).some((student) => student.full)
      ? []
      : [`no full student in grade ${schoolData.tested.math}`]),
  ];
  return missing.length ? `${missing.join(" and ")} this school year` : null;
}

const groupsOf = (core: CoreState, placeId: string, measure: string) =>
  rows<SchoolGroupRow>(core, "groups").filter(
    (g) => g.measure === measure && g.placeId === placeId,
  );
const measureOf = (core: CoreState, placeId: string, measure: string) =>
  rows<SchoolMeasureRow>(core, "measures").find(
    (m) => m.measure === measure && m.placeId === placeId,
  );
const resultsOf = (core: CoreState, placeId: string, measure: string) =>
  rows<SchoolResultRow>(core, "results").filter(
    (r) => r.measure === measure && r.placeId === placeId,
  );
const webRow = (core: CoreState, id: string) =>
  coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .get(id) as unknown as WebMonth | undefined;

describe(`the carried school links reach students through their carriers (seed ${seed})`, () => {
  // Four played years: bookkeeping's checks (tracing, re-validation, copying)
  // are a debug switch, off in play (AGENTS.md), and only ever throw on a
  // broken invariant, so the worlds play as the game plays them.
  let bookkeepingBefore = true;
  beforeAll(() => {
    bookkeepingBefore = setBookkeeping(false);
  });
  afterAll(() => {
    setBookkeeping(bookkeepingBefore);
  });

  it("names each carrier, and each carrier moves its measure's school records", () => {
    for (const c of CARRIERS) {
      const carried = WEB_LINKS.find((row) => row.key === c.carried)!;
      expect(carried.carriedBy, c.carried).toContain(c.link);
      const carrier = WEB_LINKS.find((row) => row.key === c.link)!;
      expect(linkCoverage(carrier).wired, c.link).toBe(true);
      expect(
        (WIRED_INTO.get(c.measure) ?? []).map((row) => row.key),
        c.link,
      ).toContain(c.link);
    }

    // The place is chosen from what its opening holds, before anything is
    // played: seniors, and full students in the tested math grade.
    const tried: string[] = [];
    let drawn: Drawn | null = null;
    for (let attempt = 0; attempt < ATTEMPTS && !drawn; attempt += 1) {
      const candidate = drawPlace(`${seed}:${attempt}`, "school-carriers-web");
      const why = ineligible(candidate);
      if (why) tried.push(`${candidate.name}, ${candidate.state}: ${why}`);
      else drawn = candidate;
    }
    if (!drawn)
      throw new Error(
        `no drawn place in ${ATTEMPTS} draws had students in both measures: ${tried.join("; ")}`,
      );
    const where = `${drawn.name}, ${drawn.state}, seed ${drawn.seed}`;
    const base = play(drawn);
    for (const measure of [SCHOOL_MEASURE.graduation, SCHOOL_MEASURE.math]) {
      expect(
        groupsOf(base.core, base.placeId, measure).length,
        `${where}: ${measure} groups`,
      ).toBeGreaterThan(0);
      expect(
        resultsOf(base.core, base.placeId, measure).length,
        `${where}: ${measure} results`,
      ).toBeGreaterThan(0);
    }
    const lines: string[] = [];

    for (const c of CARRIERS) {
      const twin = play(drawn, c.link);
      expect(twin.placeId).toBe(base.placeId);
      const placeId = base.placeId;
      const baseMeasure = measureOf(base.core, placeId, c.measure)!;
      const twinMeasure = measureOf(twin.core, placeId, c.measure)!;
      const baseWeb = webRow(base.core, baseMeasure.webRecordId)!;
      const twinWeb = webRow(twin.core, twinMeasure.webRecordId)!;
      expect(twinWeb.effects[c.link], `${where}: ${twinWeb.id}`).toBe(SHIFT);
      const baseEffect = baseWeb.effects[c.link] ?? 0;

      // Each income fifth's factor carries the carrier's part.
      const baseGroups = groupsOf(base.core, placeId, c.measure);
      const twinGroups = groupsOf(twin.core, placeId, c.measure);
      expect(twinGroups.length, `${where}: ${c.measure}`).toBeGreaterThan(0);
      let moved = 0;
      for (const group of twinGroups) {
        const before = baseGroups.find((g) => g.id === group.id)!;
        const w = subjectWeight(c.link, { incomeFifth: group.incomeFifth });
        expect(
          group.factor / before.factor,
          `${where}: ${group.id}`,
        ).toBeCloseTo((1 + SHIFT * w) / (1 + baseEffect * w), 9);
        if (group.factor > before.factor) moved += 1;
      }
      expect(moved, `${where}: ${c.link} moved no group`).toBeGreaterThan(0);

      // Each full student's result reads the shifted row, and none is made worse.
      const baseResults = new Map(
        resultsOf(base.core, placeId, c.measure).map((r) => [r.id, r]),
      );
      const raised: string[] = [];
      for (const result of resultsOf(twin.core, placeId, c.measure)) {
        const before = baseResults.get(result.id);
        if (!before) continue;
        expect(result.webRecordId, result.id).toBe(twinMeasure.webRecordId);
        expect(result.passed || !before.passed, result.id).toBe(true);
        expect(result.factor, result.id).toBeGreaterThanOrEqual(before.factor);
        if (result.factor > before.factor) raised.push(result.id);
      }
      expect(
        raised.length,
        `${where}: ${c.link} raised no student`,
      ).toBeGreaterThan(0);
      lines.push(
        `${c.carried} through ${c.link}: ${twinMeasure.id} read ${twinWeb.id}; ${moved} of ${twinGroups.length} fifths' factors rose (e.g. ${twinGroups.find((g) => g.factor > baseGroups.find((b) => b.id === g.id)!.factor)!.id}); ${raised.length} full students' results rose, e.g. ${raised.slice(0, 2).join(", ")}`,
      );
    }
    console.log(
      `school carriers: ${where}, test seed ${seed}${tried.length ? `; drawn again after ${tried.join("; ")}` : ""}.\n${lines.join("\n")}`,
    );
  }, 3_600_000); // four played years in one town, one after the other
});
