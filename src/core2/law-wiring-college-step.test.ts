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
import v8 from "node:v8";
import vm from "node:vm";
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

// A played world is garbage the moment `play` returns, but V8 does not see the
// container's memory limit and lets several lie about; collect between worlds.
v8.setFlagsFromString("--expose_gc");
const collect = vm.runInNewContext("gc") as () => void;

/** What one played world kept, as plain rows: one world is alive at a time. */
interface Played {
  readonly rows: readonly CollegeRow[];
  /** Every web month row the town kept, by id. */
  readonly months: ReadonlyMap<string, WebMonth>;
  /** Each named graduate's name and what the jobs engine reads for them on the first day after graduation and on the day normal time ends. */
  readonly named: ReadonlyMap<
    string,
    { name: string; afterGraduation: string; atEnd: string }
  >;
  readonly placeId: string;
  /** The raise, in the world that makes one. */
  readonly raise?: {
    readonly act: string;
    readonly governmentId: string;
    readonly budgetId: string;
    readonly townShare: number;
  };
  readonly worldFactors: { enrollment: number; completion: number };
}

/**
 * Play a drawn place to the end of its first school year. With `raiseBy`, the
 * state raises its higher education line by that share of itself before play.
 * Null where the place has no state line to raise or the town carries no
 * share of it.
 */
function play(
  drawn: ReturnType<typeof drawPlace>,
  attempt: number,
  raiseBy: number | null,
): Played | string {
  const core = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  }).core;
  const api = coreAPI(core);
  let raise: Played["raise"];
  if (raiseBy !== null) {
    const state = governments(api).find((gov) => gov.level === "state");
    const budget = state ? budgetsOf(api, state.id).at(-1) : undefined;
    const base =
      state && budget
        ? (baseBudget(api, state, budget.fiscalYear).spendingMinor[LINE] ?? 0)
        : 0;
    if (!state || !budget || base <= 0) return "no state higher education line";
    const act = `college-step-test-${attempt}`;
    amendBudget(api, {
      governmentId: state.id,
      line: LINE,
      deltaMinor: Math.round(base * raiseBy),
      measureId: act,
      carry: true,
    });
    const cause = budgetLineAddedPct(api, LINE);
    if (!cause || cause.value <= 0)
      return "the town carries no share of the line";
    raise = {
      act,
      governmentId: state.id,
      budgetId: budget.id,
      townShare: cause.value,
    };
  }
  advanceCore(core, makeIsoDate(UNTIL));
  const rows = collegeRows(core);
  const named = new Map<
    string,
    { name: string; afterGraduation: string; atEnd: string }
  >();
  for (const row of rows) {
    const person = core.people.get(row.personId as never);
    if (!person || !row.enrolled || !row.endsOn) continue;
    named.set(row.personId, {
      name: `${person.givenName} ${person.familyName}`,
      afterGraduation: schoolingOn(api, row.personId, UNTIL) ?? "none",
      atEnd: schoolingOn(api, row.personId, row.endsOn) ?? "none",
    });
  }
  const placeId = lawChain(api).townPlaceId;
  const months = new Map(
    (
      api
        .moduleState(OUTCOME_WEB_MODULE_ID)
        .table("months")
        .rows() as unknown as readonly WebMonth[]
    ).map((row) => [row.id, row]),
  );
  return {
    rows,
    months,
    named,
    placeId,
    ...(raise ? { raise } : {}),
    worldFactors: {
      enrollment: worldRateFactor(core.seed, "collegeEnrollment"),
      completion: worldRateFactor(core.seed, "collegeCompletion"),
    },
  };
}

const collegeRows = (core: CoreState) =>
  (
    coreAPI(core)
      .moduleState(SCHOOL_MODULE_ID)
      .table("college")
      .rows() as unknown as readonly CollegeRow[]
  ).map((row) => ({ ...row }));

/**
 * The web's factor for a graduate of one income fifth, worked out from the
 * month row the school engine says it read: for a share outcome, the product
 * of each running link's effect, scaled by how hard it lands on the fifth, as
 * one plus that effect.
 */
function factorOn(
  months: ReadonlyMap<string, WebMonth>,
  recordId: string,
  fifth: number,
) {
  const row = months.get(recordId)!;
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
          const raised = play(drawn, attempt, RAISE);
          collect();
          if (typeof raised === "string") {
            passed.push(`${where}: ${raised}`);
            continue;
          }
          const control = play(drawn, attempt, null);
          collect();
          if (typeof control === "string") {
            passed.push(`${where}: ${control}`);
            continue;
          }
          const controlBy = new Map(
            control.rows.map((row) => [row.personId, row]),
          );
          // Graduates the school engine took to the college step in both
          // worlds, enrolled in both, ranked in the same fifth against the
          // same unraised rate.
          const pairs = raised.rows.flatMap((row) => {
            const twin = controlBy.get(row.personId);
            return row.enrolled &&
              row.webRecordId &&
              twin?.enrolled &&
              twin.webRecordId &&
              row.placeId === raised.placeId &&
              row.incomeFifth === twin.incomeFifth &&
              Math.abs(row.completionBaseRate! - twin.completionBaseRate!) <
                1e-12
              ? [{ row, twin }]
              : [];
          });
          const named = pairs.filter(({ row }) =>
            raised.named.has(row.personId),
          );
          const counted = pairs.filter(({ row }) => !!row.weight);
          if (!named.length) {
            passed.push(
              `${where}: ${raised.rows.length} graduates, ${pairs.length} enrolled in both worlds, none a named person`,
            );
            continue;
          }
          // Every pair reads the web the way the engine says it did, and the
          // raised world's factor is the larger.
          for (const { row, twin } of pairs) {
            const was = factorOn(
              control.months,
              twin.webRecordId!,
              twin.incomeFifth,
            );
            const is = factorOn(
              raised.months,
              row.webRecordId!,
              row.incomeFifth,
            );
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
          const who = raised.named.get(row.personId)!;
          // The jobs engine reads the record when it prices a hire: the
          // diploma until normal time ends, then the bachelor's or some
          // college.
          const after = row.completes ? "college" : "some-college";
          expect(who.afterGraduation, row.id).toBe("no-college");
          expect(who.atEnd, row.id).toBe(after);
          // The world's own factors move the NCES shares and are the same in
          // both worlds of one seed.
          expect(raised.worldFactors).toEqual(control.worldFactors);
          expect(raised.worldFactors.enrollment).not.toBe(1);
          expect(raised.worldFactors.completion).not.toBe(1);
          process.stdout.write(
            `COLLEGE-STEP (COLLEGE_STEP_SEED=${seed}) ${where}, world seed ${drawn.seed}: act ${raised.raise!.act} raised ${raised.raise!.governmentId}'s ${LINE} line ${RAISE * 100}% (${raised.raise!.budgetId}), the town's share ${raised.raise!.townShare.toFixed(2)}% above its base; ${pairs.length} graduates enrolled in both worlds (${named.length} named, ${counted.length} counted); named graduate ${row.personId} (${who.name}), fifth ${row.incomeFifth}, record ${row.id} against ${twin.id}: completion rate ${row.completionRate!.toFixed(8)} (web factor ${row.factor!.toFixed(8)} on ${row.webRecordId}) against ${twin.completionRate!.toFixed(8)} (${twin.factor!.toFixed(8)} on ${twin.webRecordId}), base ${row.completionBaseRate!.toFixed(6)}, enrollment rate ${row.enrollmentRate.toFixed(6)}, completes ${row.completes}, schooling ${who.afterGraduation} then ${who.atEnd} on ${row.endsOn}; world factors enrollment ${raised.worldFactors.enrollment.toFixed(4)}, completion ${raised.worldFactors.completion.toFixed(4)}. Passed over: ${passed.join("; ") || "none"}\n`,
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
