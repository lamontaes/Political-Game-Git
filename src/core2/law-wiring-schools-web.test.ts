/**
 * The schools family of the outcome web reaches students through the school
 * engine (decideSchoolOutcome), or says which engine would read a link and
 * why it cannot yet.
 *
 * school-move-to-scores is the one link whose cause the core already records
 * for a named student: a household that moves into the town is a counted-moves
 * record with its date, and the grade 8 math test reads it for every student
 * of that household. The proof is a pair of worlds from one seed and a place
 * drawn from all 56 on a seed nobody chose, played to the day before the
 * first testing day, February 15 after the game starts. In one the arrivals
 * are the simulation's own; in the other the arrival records of the school
 * year are removed before the test.
 * The first world's group for a newcomer's income fifth then expects fewer
 * proficient students than the control's, by the link's size times the
 * newcomers' weight, and no more pass.
 *
 * The links beside it are held where they are: a link whose cause no engine
 * records stays unread and its stopgap row names the engine that would read
 * it.
 */
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import v8 from "node:v8";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  COUNTED_MOVES_MODULE_ID,
  type MoveRecord,
} from "./modules/counted-moves";
import { carriedLink, placeOutcome } from "./modules/outcome-web";
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";
import { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "./school-measures";
import {
  movedInSince,
  SCHOOL_MEASURE,
  schoolStartYear,
  studentsByPlace,
  type SchoolGroupRow,
  type SchoolResultRow,
} from "./school-outcomes";
import stopgaps from "./data/stopgaps.json" with { type: "json" };
import { coreAPI } from "./state";

const seed = process.env.SCHOOLS_WEB_SEED ?? randomBytes(20).toString("hex");
const LINK = "school-move-to-scores";
const TRIES = 30;

// A played world is garbage the moment `play` returns, but V8 does not see the
// container's memory limit and lets several lie about; collect between worlds.
v8.setFlagsFromString("--expose_gc");
const collect = vm.runInNewContext("gc") as () => void;

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;

/** Every non-test source file of the new core, by path. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "data" ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

interface Newcomer {
  readonly id: string;
  readonly weight: number;
  readonly fifth: number;
  readonly placeId: string;
  readonly movedIn: string;
  /** The student's name, where they are a full person. */
  readonly name?: string;
}

/** What one played world kept, as plain rows: one world is alive at a time. */
interface Played {
  readonly arrivals: readonly MoveRecord[];
  readonly newcomers: readonly Newcomer[];
  readonly groups: readonly SchoolGroupRow[];
  readonly measures: ReadonlyMap<string, SchoolMeasureRow>;
  readonly results: readonly SchoolResultRow[];
}

const rowsOf = <T>(
  core: ReturnType<typeof buildBenchWorld>["core"],
  t: string,
) =>
  coreAPI(core).moduleState(SCHOOL_MODULE_ID).table(t).rows() as unknown as T[];

/**
 * Play a drawn place to the day after the first testing day. The newcomers
 * are the grade 8 students of households that moved in after school began, in
 * a place the web follows, read the day before the test. With `without`, the
 * school year's arrival records come out of the counted-moves table before the
 * test reads them. A world with no such newcomer stops there.
 */
function play(
  drawn: ReturnType<typeof drawPlace>,
  year: number,
  without: boolean,
): Played {
  const startYear = schoolStartYear(`${year}-02-15`, "09-01");
  const core = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core;
  advanceCore(core, makeIsoDate(`${year}-02-14`));
  const api = coreAPI(core);
  const arrivals = [...movedInSince(api, startYear).values()].sort((a, b) =>
    a.id < b.id ? -1 : 1,
  );
  const newcomers = [...studentsByPlace(api, 8, startYear, () => undefined)]
    .flatMap(([placeId, list]) =>
      placeOutcome(api, placeId, SCHOOL_MEASURE.math)
        ? list.flatMap((s) =>
            s.movedIn
              ? [
                  {
                    id: s.id,
                    weight: s.weight,
                    fifth: s.fifth,
                    placeId,
                    movedIn: s.movedIn,
                    ...(s.full
                      ? {
                          name: `${core.people.get(s.id as never)!.givenName} ${core.people.get(s.id as never)!.familyName}`,
                        }
                      : {}),
                  },
                ]
              : [],
          )
        : [],
    )
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const empty = {
    arrivals,
    newcomers,
    groups: [],
    measures: new Map(),
    results: [],
  };
  if (!without && !newcomers.length) return empty;
  if (without) {
    const table = api.moduleState(COUNTED_MOVES_MODULE_ID).table("moves");
    for (const r of arrivals) table.remove(r.id);
    expect(movedInSince(api, startYear).size).toBe(0);
  }
  advanceCore(core, makeIsoDate(`${year}-02-16`));
  const math = (r: { measure: string }) => r.measure === SCHOOL_MEASURE.math;
  return {
    ...empty,
    groups: rowsOf<SchoolGroupRow>(core, "groups").filter(math),
    measures: new Map(
      rowsOf<SchoolMeasureRow>(core, "measures")
        .filter(math)
        .map((r) => [r.id, r]),
    ),
    results: rowsOf<SchoolResultRow>(core, "results").filter(
      (r) => math(r) && r.movedIn,
    ),
  };
}

describe("school-move-to-scores is carried by the school engine", () => {
  const row = link(LINK);

  it("is sized from the study in the engine's unit, with its spread", () => {
    expect(carriedLink(LINK)).toBe(row);
    expect(row.to).toBe(SCHOOL_MEASURE.math);
    expect(row.shape.kind).toBe("linear");
    // The web does not run it: it is carried, so no running link counts it twice.
    expect(linkCoverage(row).wired).toBe(false);
    for (const links of WIRED_INTO.values())
      expect(links.map((l) => l.key)).not.toContain(LINK);
    // Hanushek, Kain and Rivkin 2004, Table 2 panel A: 0.027 standard
    // deviations in math (column 2), through the normal density at the
    // median place's proficient share (26.2 percent): relative change
    // density(z) * 0.027 / 0.262, with density 0.3256.
    const share = 0.262;
    const density = Math.exp(-0.5 * 0.6376 ** 2) / Math.sqrt(2 * Math.PI);
    expect(row.size!).toBeCloseTo((-0.027 * density) / share, 2);
    const [low, high] = (row as unknown as { range: [number, number] }).range;
    expect(low).toBe(row.size);
    // The preferred specification's roughly 0.01 standard deviations.
    expect(high).toBeCloseTo((-0.008 * density) / share, 2);
    expect(row.carriedBy).toContain("decideSchoolOutcome");
    expect(row.carriedBy).toContain("src/core2/school-outcomes.ts");
  });

  it("is registered as a stopgap with its limits, and is off the not-running list", () => {
    const open = (stopgaps as { id: string; status: string; why: string }[])
      .filter((s) => s.status === "open")
      .map((s) => s.id);
    expect(open).toContain("SG-SCHOOL-switch-window");
    const notRunning = (stopgaps as { id: string; whatItFakes: string }[]).find(
      (s) => s.id === "SG-SCHOOL-links-not-running",
    )!;
    expect(notRunning.whatItFakes).toMatch(/^Seven researched links/);
  });

  it(
    `a newcomer's grade 8 math group expects fewer proficient students than its twin without the move (seed ${seed})`,
    { timeout: 3_600_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passedOver: string[] = [];
      try {
        const year = Number(gameStartDate().slice(0, 4));
        const startYear = schoolStartYear(`${year}-02-15`, "09-01");
        const size = carriedLink(LINK).size!;
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-schools-web:${attempt}`);
          const moved = play(drawn, year, false);
          collect();
          if (!moved.newcomers.length) {
            passedOver.push(
              `${drawn.name}, ${drawn.state} (${drawn.key}): ${moved.arrivals.length} households moved in, no eighth grader among them`,
            );
            continue;
          }
          // The control: the same world with this school year's arrival
          // records taken out before the test reads them.
          const control = play(drawn, year, true);
          collect();
          // The twins are one world until the records come out.
          expect(control.arrivals.map((r) => r.id)).toEqual(
            moved.arrivals.map((r) => r.id),
          );
          expect(control.newcomers.map((n) => n.id)).toEqual(
            moved.newcomers.map((n) => n.id),
          );
          const named = moved.newcomers[0]!;
          const move = moved.arrivals.find((r) => r.id === named.movedIn)!;
          expect(move.direction, named.movedIn).toBe("in");
          expect(move.date > `${startYear}-09-01`).toBe(true);

          const measureId = `${named.placeId}:${SCHOOL_MEASURE.math}:${startYear}`;
          const groupId = `${measureId}:${named.fifth}`;
          const withMove = moved.groups.find((g) => g.id === groupId);
          const without = control.groups.find((g) => g.id === groupId);
          expect(withMove, groupId).toBeDefined();
          expect(without, groupId).toBeDefined();
          // The cause is read: the group records the newcomers and the size.
          expect(withMove!.switched!, groupId).toBeGreaterThanOrEqual(
            named.weight,
          );
          expect(withMove!.switchSize).toBe(size);
          expect(without!.switched).toBe(0);
          // The same web month, income fifth and students.
          expect(withMove!.factor).toBe(without!.factor);
          expect(withMove!.students).toBe(without!.students);
          // The newcomers' rate is the group's share times one plus the
          // link's size: the group expects that much less.
          const share = without!.expected / without!.students;
          expect(share).toBeGreaterThan(0);
          expect(withMove!.expected).toBeCloseTo(
            share * (without!.students + size * withMove!.switched!),
            9,
          );
          expect(withMove!.expected).toBeLessThan(without!.expected);
          expect(withMove!.expected - without!.expected).toBeCloseTo(
            share * size * withMove!.switched!,
            9,
          );
          // Fewer proficient students are expected, so no more pass.
          expect(withMove!.passed).toBeLessThanOrEqual(without!.passed);
          // The place's measure row follows, by record id.
          const row = moved.measures.get(measureId)!;
          const rowWithout = control.measures.get(measureId)!;
          expect(row.expected).toBeLessThan(rowWithout.expected);
          expect(row.webRecordId).toBe(rowWithout.webRecordId);
          // A full student the same rule reaches: their result records the
          // move it stands on.
          for (const result of moved.results) {
            expect(
              moved.arrivals.find((r) => r.id === result.movedIn),
              result.id,
            ).toBeDefined();
            expect(result.switchSize).toBe(size);
          }
          const full = moved.newcomers.find((n) => n.name);
          process.stdout.write(
            `SCHOOL-MOVE ${drawn.name}, ${drawn.state} (${drawn.key}, seed ${drawn.seed}): ${named.id} (weight ${named.weight}, income fifth ${named.fifth}) moved in on ${move.date} (${move.id}); group ${groupId}: expected ${withMove!.expected.toFixed(4)} proficient of ${withMove!.students} against ${without!.expected.toFixed(4)} in the twin without the move (switched ${withMove!.switched}, size ${size}, web month ${row.webRecordId}), passed ${withMove!.passed} against ${without!.passed}${full ? `; full student ${full.name} (${full.id}) is among them` : ""}; ${moved.results.length} full-student results record a move. Passed over: ${passedOver.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place had an eighth grader who moved in after school began: ${passedOver.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});

describe("the other school links stay unread, each with the engine that would read it", () => {
  const rows = stopgaps as {
    id: string;
    status: string;
    whatItFakes: string;
    why: string;
    replacement: string;
  }[];
  const row = (id: string) => rows.find((r) => r.id === id)!;

  it("reads the college completion link in the school engine's college step, its stopgaps naming what is left", () => {
    const key = "higher-education-spending-to-college-completion";
    const higher = link(key);
    expect(higher.from).toBe("budget.higherEducation-added-pct");
    expect(higher.to).toBe("school.college-completion-pct");
    expect(linkCoverage(higher).wired).toBe(true);
    // The school engine decides a graduate's completion and multiplies the
    // graduate's rate by the web's factor, in the one file that names it.
    const naming = sources("src/core2")
      .filter((path) =>
        readFileSync(path, "utf8").includes("school.college-completion-pct"),
      )
      .map((path) => path.replaceAll("\\", "/"));
    expect(naming).toEqual(["src/core2/school-outcomes.ts"]);
    expect(readFileSync(naming[0]!, "utf8")).toContain("webReach(");
    // The waiting stopgaps are resolved; what is left is registered.
    const stop = row("SG-SCHOOL-college-completion");
    expect(stop.status).toBe("resolved");
    expect(stop.whatItFakes).toContain(key);
    expect(stop.replacement).toContain("webReach");
    expect(stop.why).toContain("schoolingOn");
    expect(row("SG-WEB-unread-school-college-completion-pct").status).toBe(
      "resolved",
    );
    for (const id of [
      "SG-SCHOOL-college-decided-at-graduation",
      "SG-SCHOOL-college-stock-ledger",
    ])
      expect(row(id).status, id).toBe("open");
  });

  it("keeps the enforcement link on the web's ledger, its stopgap naming the school engine as the reader", () => {
    const key = "enforcement-to-hispanic-enrollment";
    expect(linkCoverage(link(key)).wired).toBe(true);
    const stop = row("SG-SCHOOL-hispanic-enrollment");
    expect(stop.status).toBe("open");
    expect(stop.whatItFakes).toContain(key);
    expect(stop.why).toContain("schoolFor");
    expect(stop.replacement).toContain("webReach");
  });

  it("names, for each link whose cause is not recorded, the engine that would read it", () => {
    const stop = row("SG-SCHOOL-links-not-running");
    for (const key of [
      "class-size-to-scores",
      "police-killing-to-graduation",
      "daca-to-graduation",
      "homicide-nearby-to-scores",
      "lead-to-reading",
      "heat-to-learning",
      "carbon-monoxide-to-absence",
    ]) {
      const text = `${stop.whatItFakes} ${stop.why}`;
      expect(text, key).toContain(key);
      expect(linkCoverage(link(key)).wired, key).toBe(false);
    }
    expect(stop.why).toContain("decideSchoolOutcome");
    expect(stop.why).toContain("schoolDay");
  });

  it("leaves the two links without a researched size unrun", () => {
    for (const key of [
      "housing-vouchers-to-graduation",
      "library-materials-to-reading",
    ]) {
      expect(link(key).size, key).toBeNull();
      expect(linkCoverage(link(key)).wired, key).toBe(false);
    }
  });
});
