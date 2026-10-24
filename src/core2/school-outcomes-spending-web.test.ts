/**
 * The school engine reads the web's school-spending-to-attainment factor
 * (web-reach-schools). The cause is the schools line of the town's city and
 * county budgets above its Census base; the effect lands on each senior's
 * graduation by income fifth (decideSchoolOutcome in school-outcomes.ts).
 * Played in the bench world, in a place drawn from all 56 on a seed nobody
 * chose, in three worlds that are identical but for one thing each:
 *  - base: nothing changed;
 *  - amended: the schools line of the town's budget raised, the real cause;
 *  - shifted: the link's effect on the web's month rows set to many times
 *    the researched one, so a small town's seniors can show it.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  amendBudget,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { subjectWeight } from "./outcome-web-reach";
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";
import { SCHOOL_MODULE_ID, type SchoolMeasureRow } from "./school-measures";
import {
  SCHOOL_MEASURE,
  type SchoolGroupRow,
  type SchoolResultRow,
} from "./school-outcomes";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.SCHOOL_SPENDING_SEED || randomBytes(8).toString("hex");
const LINK = "school-spending-to-attainment";
const CAUSE = "budget.schools-added-pct";
const MEASURE = SCHOOL_MEASURE.graduation;
const SHIFT = 0.3;
const RAISE = 0.1;
/** From late January through the last day of school. */
const DAYS = 165;
const ATTEMPTS = 5;

interface World {
  core: CoreState;
  placeId: string;
  amended?: {
    governmentId: string;
    budgetId: string;
    deltaMinor: number;
    /** What the raise should read as, in percent of the town's schools lines at base. */
    pct: number;
  };
}

type Drawn = ReturnType<typeof drawPlace>;

const rows = <T>(core: CoreState, name: string) =>
  coreAPI(core)
    .moduleState(SCHOOL_MODULE_ID)
    .table(name)
    .rows() as unknown as T[];

const webRows = (core: CoreState, placeId: string) =>
  [
    ...(coreAPI(core)
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [placeId]) as unknown as WebMonth[]),
  ].sort((a, b) => a.month.localeCompare(b.month));

/** The raise: the schools line of the first city or county budget in the town that has one. */
function raiseSchoolsLine(core: CoreState, placeId: string) {
  const api = coreAPI(core);
  const town = governments(api).filter(
    (gov) =>
      (gov.level === "city" || gov.level === "county") &&
      core.organizations.get(gov.organizationId)?.placeId === placeId,
  );
  let totalBase = 0;
  let pick: { id: string; line: number } | null = null;
  for (const gov of town) {
    const budget = [...budgetsOf(api, gov.id)]
      .filter((row) => row.startsOn <= core.date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
    const base = budget
      ? (baseBudget(api, gov, budget.fiscalYear).spendingMinor["schools"] ?? 0)
      : 0;
    totalBase += base;
    if (!pick && base > 0) pick = { id: gov.id, line: base };
  }
  if (!pick) return null;
  const deltaMinor = Math.round(pick.line * RAISE);
  const amended = amendBudget(api, {
    governmentId: pick.id,
    line: "schools",
    deltaMinor,
    measureId: "test:schools-line",
  });
  if (!amended) return null;
  return {
    governmentId: pick.id,
    budgetId: amended.id,
    deltaMinor,
    pct: (deltaMinor / totalBase) * 100,
  };
}

/** Plays the world from the game start to the end of the school year; null where the amended world gives no signal. */
function play(
  drawn: Drawn,
  how: { amend?: boolean; shift?: boolean },
): World | { skipped: string } {
  const opening = gameStartDate();
  const built = buildBenchWorld(drawn.seed, opening, {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = built.core as CoreState;
  const api = coreAPI(core);
  let amended: World["amended"];
  let day = makeIsoDate(opening);
  const end = addDays(day, DAYS);
  let step = 0;
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    step += 1;
    // The raise comes the day after the web's opening month row is written,
    // so that row reads the budget at its Census base.
    if (how.amend && step === 1) {
      const raised = raiseSchoolsLine(core, built.placeId);
      if (!raised) return { skipped: "no city or county schools line" };
      amended = raised;
    }
    // The web writes its month on the 3rd, and writes it again whenever a law
    // takes effect, which drops a shift laid earlier; from the 3rd on, the
    // twin raises the effect again in any of the month's rows without it.
    if (how.shift && Number(core.date.slice(8)) >= 3) {
      const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
      for (const row of months.rows() as unknown as WebMonth[])
        if (row.month === core.date.slice(0, 7) && row.effects[LINK] !== SHIFT)
          months.put({
            ...row,
            effects: { ...row.effects, [LINK]: SHIFT },
          } as never);
    }
    if (how.amend && step === 45) {
      // A fiscal year that turned over has dropped the raise from the budget in force.
      const signal = webRows(core, built.placeId).some(
        (row) => (row.values[CAUSE] ?? 0) > 0,
      );
      if (!signal) return { skipped: "the raise left the budget in force" };
    }
  }
  return { core, placeId: built.placeId, amended };
}

const groupsOf = (core: CoreState) =>
  rows<SchoolGroupRow>(core, "groups").filter((g) => g.measure === MEASURE);
const measureOf = (core: CoreState, placeId: string) =>
  rows<SchoolMeasureRow>(core, "measures").find(
    (m) => m.measure === MEASURE && m.placeId === placeId,
  );

describe(`the schools budget line moves graduation (seed ${seed})`, () => {
  it("runs as a link, and the school engine's graduation records follow it", () => {
    // The link runs on the engine's own measure.
    const link = WEB_LINKS.find((row) => row.key === LINK)!;
    expect(linkCoverage(link).wired).toBe(true);

    // The amended world picks the place: one whose town budgets carry a schools
    // line that stays in force, and has seniors to graduate.
    const tried: string[] = [];
    let drawn: Drawn | null = null;
    let amended: World | null = null;
    for (let attempt = 0; attempt < ATTEMPTS && !amended; attempt += 1) {
      const candidate = drawPlace(`${seed}:${attempt}`, "school-spending-web");
      const world = play(candidate, { amend: true });
      const where = `${candidate.name}, ${candidate.state} (seed ${candidate.seed})`;
      if ("skipped" in world) tried.push(`${where}: ${world.skipped}`);
      else if (!groupsOf(world.core).length)
        tried.push(`${where}: no seniors graduated`);
      else {
        drawn = candidate;
        amended = world;
      }
    }
    if (!drawn || !amended)
      throw new Error(
        `no drawn place in ${ATTEMPTS} draws fit: ${tried.join("; ")}`,
      );
    const where = `${drawn.name}, ${drawn.state}, seed ${drawn.seed}`;

    const base = play(drawn, {}) as World;
    const shifted = play(drawn, { shift: true }) as World;
    expect(base.placeId).toBe(amended.placeId);
    expect(shifted.placeId).toBe(amended.placeId);
    const placeId = amended.placeId;
    const raise = amended.amended!;

    // 1. The cause: the raised line reads in the web's month rows, naming the budget.
    const baseWeb = webRows(base.core, placeId);
    const amendedWeb = webRows(amended.core, placeId);
    expect(baseWeb.length).toBe(amendedWeb.length);
    const first = amendedWeb.find((row) => (row.values[CAUSE] ?? 0) > 0)!;
    const sameMonth = baseWeb.find((row) => row.month === first.month)!;
    expect(
      first.values[CAUSE]! - (sameMonth.values[CAUSE] ?? 0),
      `${where}: ${first.id}`,
    ).toBeCloseTo(raise.pct, 6);
    expect(first.engineSources[CAUSE], first.id).toBe(raise.budgetId);

    // 2. The link's effect builds with the months of exposure: the mean of the
    // cause over the previous 144 months, the months before the web opened
    // read as the opening, times the researched size.
    const series = amendedWeb.map((row) => row.values[CAUSE] ?? 0);
    amendedWeb.forEach((row, at) => {
      let sum = 0;
      for (let k = 0; k < link.phaseInMonths!; k += 1)
        sum += series[Math.max(0, at - k)]!;
      const baseRow = baseWeb[at]!;
      const baseSeries = baseWeb.map((r) => r.values[CAUSE] ?? 0);
      let baseSum = 0;
      for (let k = 0; k < link.phaseInMonths!; k += 1)
        baseSum += baseSeries[Math.max(0, at - k)]!;
      expect(row.effects[LINK], row.id).toBeCloseTo(
        (link.size! * sum) / link.phaseInMonths!,
        9,
      );
      expect(baseRow.effects[LINK], baseRow.id).toBeCloseTo(
        (link.size! * baseSum) / link.phaseInMonths!,
        9,
      );
    });
    const lastRaised = amendedWeb
      .filter((row) => row.effects[LINK]! > 0)
      .at(-1)!;
    expect(lastRaised.effects[LINK]).toBeGreaterThan(
      baseWeb.find((row) => row.month === lastRaised.month)!.effects[LINK]!,
    );

    // 3. The school engine's graduation records follow: the raised world's
    // groups carry the factor of the web month row they read, which includes
    // this link's part, so each fifth's factor and expected graduates stand
    // above what the same row gives without the link.
    const raisedGroups = groupsOf(amended.core);
    const raisedMeasure = measureOf(amended.core, placeId)!;
    expect(raisedGroups.length).toBeGreaterThan(0);
    const graduationWeb = amendedWeb.find(
      (row) => row.id === raisedMeasure.webRecordId,
    )!;
    expect(graduationWeb, `${where}: ${raisedMeasure.id}`).toBeDefined();
    expect(graduationWeb.effects[LINK]).toBeGreaterThan(0);
    const into = WIRED_INTO.get(MEASURE) ?? [];
    expect(into.map((row) => row.key)).toContain(LINK);
    const factorOf = (row: WebMonth, fifth: number, without?: string) =>
      Math.max(
        0,
        into.reduce((product, part) => {
          const effect = row.effects[part.key];
          return effect === undefined || part.key === without
            ? product
            : product *
                (1 + effect * subjectWeight(part.key, { incomeFifth: fifth }));
        }, 1),
      );
    for (const group of raisedGroups) {
      expect(group.factor, group.id).toBeCloseTo(
        factorOf(graduationWeb, group.incomeFifth),
        9,
      );
      expect(group.factor, group.id).toBeGreaterThan(
        factorOf(graduationWeb, group.incomeFifth, LINK),
      );
    }
    const baseGroups = groupsOf(base.core);
    const baseMeasure = measureOf(base.core, placeId)!;
    const baseWebRow = baseWeb.find(
      (row) => row.id === baseMeasure.webRecordId,
    )!;

    // 4. The shifted twin shows the same read at a size a small town can show:
    // every fifth's factor and expected count rise, and graduates are added,
    // by person record where a full senior is.
    const shiftedGroups = groupsOf(shifted.core);
    const shiftedMeasure = measureOf(shifted.core, placeId)!;
    const shiftedWeb = webRows(shifted.core, placeId).find(
      (row) => row.id === shiftedMeasure.webRecordId,
    )!;
    expect(shiftedWeb.effects[LINK]).toBe(SHIFT);
    expect(baseWebRow.effects[LINK]).toBeCloseTo(0, 9);
    for (const group of shiftedGroups) {
      const before = baseGroups.find((g) => g.id === group.id)!;
      const w = subjectWeight(LINK, { incomeFifth: group.incomeFifth });
      expect(group.factor / before.factor, group.id).toBeCloseTo(
        (1 + SHIFT * w) / (1 + baseWebRow.effects[LINK]! * w),
        9,
      );
      expect(group.expected, group.id).toBeGreaterThan(before.expected);
    }
    const passed = (groups: SchoolGroupRow[]) =>
      groups.reduce((n, g) => n + g.passed, 0);
    expect(passed(shiftedGroups)).toBeGreaterThanOrEqual(passed(baseGroups));
    expect(shiftedMeasure.value).toBeGreaterThanOrEqual(baseMeasure.value);
    const baseResults = new Map(
      rows<SchoolResultRow>(base.core, "results")
        .filter((r) => r.measure === MEASURE)
        .map((r) => [r.id, r]),
    );
    const shiftedResults = rows<SchoolResultRow>(
      shifted.core,
      "results",
    ).filter((r) => r.measure === MEASURE);
    const flipped: string[] = [];
    for (const result of shiftedResults) {
      const before = baseResults.get(result.id);
      if (!before) continue;
      // A senior is never made to fail by the raise; the record names the web month it read.
      expect(result.passed || !before.passed, result.id).toBe(true);
      expect(result.webRecordId, result.id).toBe(shiftedMeasure.webRecordId);
      expect(result.factor, result.id).toBeGreaterThan(before.factor);
      if (result.passed && !before.passed) flipped.push(result.id);
    }
    expect(shiftedResults.length).toBeGreaterThan(0);

    console.log(
      `school spending to graduation: ${where}, test seed ${seed}${tried.length ? `; drawn again after ${tried.join("; ")}` : ""}. Raised ${raise.governmentId} schools line by ${raise.deltaMinor} (${raise.pct.toFixed(3)}% of the town's schools lines): web ${first.id} reads ${CAUSE} ${first.values[CAUSE]!.toFixed(3)} from ${first.engineSources[CAUSE]}, link effect ${first.effects[LINK]!.toExponential(3)} then ${lastRaised.effects[LINK]!.toExponential(3)} at ${lastRaised.id}. Graduation ${raisedMeasure.id} (read ${graduationWeb.id}): factor by income fifth with the link / without it ${raisedGroups.map((g) => `${g.incomeFifth}:${g.factor.toFixed(4)}/${factorOf(graduationWeb, g.incomeFifth, LINK).toFixed(4)}`).join(" ")}. Shifted to ${SHIFT} (read ${shiftedMeasure.webRecordId}): graduates ${passed(baseGroups)} -> ${passed(shiftedGroups)} of ${shiftedGroups.reduce((n, g) => n + g.students, 0)}, value ${baseMeasure.value.toFixed(2)} -> ${shiftedMeasure.value.toFixed(2)}; ${flipped.length} of ${shiftedResults.length} full seniors newly graduate [${flipped.slice(0, 4).join(", ")}].`,
    );
  }, 3_600_000);
});
