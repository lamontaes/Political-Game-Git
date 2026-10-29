/**
 * The higher education budget line reaches a named graduate through the
 * school engine's college step, in a played world: a place drawn from all 56
 * on a seed nobody chose, the bench world with every module installed, built
 * twice from the same seed. In one, the state raises its higher education
 * line by half; the other is the control. Both play to the end of the first
 * school year, when the school engine decides which seniors graduate and, for
 * each, whether they enroll in college and whether they complete a
 * bachelor's: the NCES shares, spread over the graduate's income fifth,
 * moved by the world's own factor, and multiplied by the web's factor for
 * school.college-completion-pct, read at the moment the engine decides. The
 * outcome web moves that factor from the line
 * (higher-education-spending-to-college-completion), so a named graduate's
 * completion rate in the raised world is the control's, times the ratio of the
 * two worlds' factors. The jobs engine then reads the record when it prices a
 * hire: the diploma until normal time ends, a bachelor's or some college
 * after.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { budgetLineAddedPct } from "./gov-measures";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  amendBudget,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import { schoolingOn } from "./modules/jobs";
import { lawChain } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { scaleOf, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";
import { subjectWeight } from "./outcome-web-reach";
import { SCHOOL_MODULE_ID } from "./school-measures";
import { SCHOOL_MEASURE, type CollegeRow } from "./school-outcomes";
import { coreAPI } from "./state";
import { worldRateFactor } from "./world-base-rates";
import type { CoreState } from "./types";

const seed = process.env.COLLEGE_STEP_SEED ?? randomBytes(20).toString("hex");
const LINE = "higherEducation";
const LINK = "higher-education-spending-to-college-completion";
const MEASURE = SCHOOL_MEASURE.college;
/** The state raises its higher education line by half. */
const RAISE = 0.5;
/** The first school year ends by June 30 whatever the state; the day after, its graduation is decided. */
const UNTIL = "2025-07-01";
const TRIES = 6;

const collegeRows = (core: CoreState) =>
  coreAPI(core)
    .moduleState(SCHOOL_MODULE_ID)
    .table("college")
    .rows() as unknown as readonly CollegeRow[];

const monthRow = (core: CoreState, id: string) =>
  coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .get(id) as unknown as WebMonth;

/**
 * The web's factor for a graduate of one income fifth, worked out from the
 * month row the school engine says it read: for a share outcome, the product
 * of each running link's effect, scaled by how hard it lands on the fifth, as
 * one plus that effect.
 */
function factorOn(core: CoreState, recordId: string, fifth: number) {
  const row = monthRow(core, recordId);
  let factor = 1;
  for (const link of WIRED_INTO.get(MEASURE)!) {
    const effect = row.effects[link.key];
    if (effect)
      factor *= 1 + effect * subjectWeight(link.key, { incomeFifth: fifth });
  }
  return { factor: Math.max(0, factor), row };
}

describe("the higher education line reaches a named graduate's completion", () => {
  it("is a share outcome the school engine reads, from the line, at a researched size", () => {
    const row = WEB_LINKS.find((link) => link.key === LINK)!;
    expect(row.from).toBe("budget.higherEducation-added-pct");
    expect(row.to).toBe(MEASURE);
    expect(row.size).toBeGreaterThan(0);
    expect(scaleOf(MEASURE)).toBe("share");
    expect(WIRED_INTO.get(MEASURE)!.map((l) => l.key)).toContain(LINK);
  });

  it(
    `a state's larger higher education line raises a named graduate's completion rate (seed ${seed})`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(seed, `law-wiring-college-step:${attempt}`);
          const where = `${drawn.name}, ${drawn.state} (${drawn.key})`;
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          const raised = build();
          const control = build();
          const api = coreAPI(raised);
          const state = governments(api).find((gov) => gov.level === "state");
          const budget = state ? budgetsOf(api, state.id).at(-1) : undefined;
          const base =
            state && budget
              ? (baseBudget(api, state, budget.fiscalYear).spendingMinor[
                  LINE
                ] ?? 0)
              : 0;
          if (!state || base <= 0) {
            passed.push(`${where}: no state higher education line`);
            continue;
          }
          const act = `college-step-test-${attempt}`;
          amendBudget(api, {
            governmentId: state.id,
            line: LINE,
            deltaMinor: Math.round(base * RAISE),
            measureId: act,
            carry: true,
          });
          const cause = budgetLineAddedPct(api, LINE);
          if (!cause || cause.value <= 0) {
            passed.push(`${where}: the town carries no share of the line`);
            continue;
          }
          advanceCore(raised, makeIsoDate(UNTIL));
          advanceCore(control, makeIsoDate(UNTIL));
          const placeId = lawChain(api).townPlaceId;
          const controlBy = new Map(
            collegeRows(control).map((row) => [row.personId, row]),
          );
          // Graduates the school engine took to the college step in both
          // worlds, enrolled in both, ranked in the same fifth against the
          // same unraised rate.
          const pairs = collegeRows(raised).flatMap((row) => {
            const twin = controlBy.get(row.personId);
            return row.enrolled &&
              row.webRecordId &&
              twin?.enrolled &&
              twin.webRecordId &&
              row.placeId === placeId &&
              row.incomeFifth === twin.incomeFifth &&
              Math.abs(row.completionBaseRate! - twin.completionBaseRate!) <
                1e-12
              ? [{ row, twin }]
              : [];
          });
          const named = pairs.filter(({ row }) => !row.weight);
          const counted = pairs.filter(({ row }) => !!row.weight);
          if (!named.length) {
            passed.push(
              `${where}: ${collegeRows(raised).length} graduates, ${pairs.length} enrolled in both worlds, none a named person`,
            );
            continue;
          }
          // Every pair reads the web the way the engine says it did, and the
          // raised world's factor is the larger.
          for (const { row, twin } of pairs) {
            const was = factorOn(control, twin.webRecordId!, twin.incomeFifth);
            const is = factorOn(raised, row.webRecordId!, row.incomeFifth);
            expect(row.factor, row.id).toBeCloseTo(is.factor, 12);
            expect(twin.factor, twin.id).toBeCloseTo(was.factor, 12);
            expect(is.factor, row.id).toBeGreaterThan(was.factor);
            expect(is.row.effects[LINK] ?? 0, is.row.id).toBeGreaterThan(
              was.row.effects[LINK] ?? 0,
            );
            // The rate is the researched share times the web's factor.
            expect(row.completionRate, row.id).toBeCloseTo(
              Math.min(1, row.completionBaseRate! * is.factor),
              12,
            );
            expect(twin.completionRate, twin.id).toBeCloseTo(
              Math.min(1, twin.completionBaseRate! * was.factor),
              12,
            );
            if (row.completionRate! < 1)
              expect(row.completionRate, row.id).toBeGreaterThan(
                twin.completionRate!,
              );
          }
          const { row, twin } =
            named.find((pair) => pair.row.completionRate! < 1) ?? named[0]!;
          const person = raised.people.get(row.personId as never)!;
          // The jobs engine reads the record when it prices a hire: the
          // diploma until normal time ends, then the bachelor's or some
          // college.
          const japi = coreAPI(raised);
          const after = row.completes ? "college" : "some-college";
          expect(schoolingOn(japi, row.personId, UNTIL), row.id).toBe(
            "no-college",
          );
          expect(schoolingOn(japi, row.personId, row.endsOn!), row.id).toBe(
            after,
          );
          const worlds = {
            enrollment: worldRateFactor(raised.seed, "collegeEnrollment"),
            completion: worldRateFactor(raised.seed, "collegeCompletion"),
          };
          expect(worlds.enrollment).toBe(
            worldRateFactor(control.seed, "collegeEnrollment"),
          );
          process.stdout.write(
            `COLLEGE-STEP (COLLEGE_STEP_SEED=${seed}) ${where}, world seed ${drawn.seed}: act ${act} raised ${state.id}'s ${LINE} line ${RAISE * 100}% (${budget!.id}), the town's share ${cause.value.toFixed(2)}% above its base; ${pairs.length} graduates enrolled in both worlds (${named.length} named, ${counted.length} counted); named graduate ${row.personId} (${person.givenName} ${person.familyName}), fifth ${row.incomeFifth}, record ${row.id} against ${twin.id}: completion rate ${row.completionRate!.toFixed(8)} (web factor ${row.factor!.toFixed(8)} on ${row.webRecordId}) against ${twin.completionRate!.toFixed(8)} (${twin.factor!.toFixed(8)} on ${twin.webRecordId}), base ${row.completionBaseRate!.toFixed(6)}, enrollment rate ${row.enrollmentRate.toFixed(6)}, completes ${row.completes}, schooling on ${row.endsOn}: ${after}; world factors enrollment ${worlds.enrollment.toFixed(4)}, completion ${worlds.completion.toFixed(4)}. Passed over: ${passed.join("; ") || "none"}\n`,
          );
          return;
        }
        throw new Error(
          `No drawn place had a named graduate enrolled in college in both worlds: ${passed.join("; ")}`,
        );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
});
