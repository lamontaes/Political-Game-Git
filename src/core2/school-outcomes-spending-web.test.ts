/**
 * The school engine reads the web's school-spending-to-attainment factor
 * (web-reach-schools). The cause is the schools line of the town's city and
 * county budgets above its Census base; the effect lands on each senior's
 * graduation by income fifth (decideSchoolOutcome in school-outcomes.ts).
 * Played in the bench world, in a place drawn from all 56 on a seed nobody
 * chose, in three worlds that are identical but for one thing each:
 *  - base: nothing changed;
 *  - amended: the schools line of the town's budget raised, the real cause;
 *  - raised far: the same line raised many times over, so the link's effect
 *    the web computes by June is large enough for a small town's seniors to
 *    show it. (Setting the effect on the web's rows by hand did not hold: a
 *    law that takes effect on graduation day rewrites the month's row before
 *    the school engine reads it.)
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
import {
  linkCoverage,
  WEB_LINKS,
  WEB_SETTINGS,
  WIRED_INTO,
} from "./outcome-web-model";
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

const seed = process.env.SCHOOL_SPENDING_SEED || randomBytes(8).toString("hex");
const LINK = "school-spending-to-attainment";
const CAUSE = "budget.schools-added-pct";
const MEASURE = SCHOOL_MEASURE.graduation;
const RAISE = 0.1;
/** Eight times the line: by June the web's twelve-year mean of the cause gives an effect of about 0.1 to 0.3. */
const FAR_RAISE = 8;
/** A full played year, including the graduation records from its school year. */
const DAYS = 365;
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

/** The schools line of the first city or county budget in the town that has one, and the town's schools lines in all. */
function townSchoolsLine(core: CoreState, placeId: string) {
  const api = coreAPI(core);
  const town = governments(api).filter(
    (gov) =>
      (gov.level === "city" || gov.level === "county") &&
      core.organizations.get(gov.organizationId)?.placeId === placeId,
  );
  let totalBase = 0;
  let pick: { id: string; line: number; fiscalYearStart: string } | null = null;
  for (const gov of town) {
    const budget = [...budgetsOf(api, gov.id)]
      .filter((row) => row.startsOn <= core.date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
    const base = budget
      ? (baseBudget(api, gov, budget.fiscalYear).spendingMinor["schools"] ?? 0)
      : 0;
    totalBase += base;
    if (!pick && base > 0)
      pick = { id: gov.id, line: base, fiscalYearStart: gov.fiscalYearStart };
  }
  return pick ? { ...pick, totalBase } : null;
}

/**
 * Whether a drawn place can show the link, from what its opening holds: a
 * city or county schools line whose fiscal year does not turn over before the
 * web's next month row reads the raise, and seniors in the town this school
 * year. What the played year then makes of them is under test, so a place that
 * passes here is never drawn again.
 */
function ineligible(drawn: Drawn): string | null {
  const opening = gameStartDate();
  const built = buildBenchWorld(drawn.seed, opening, {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = built.core as CoreState;
  const line = townSchoolsLine(core, built.placeId);
  if (!line) return "no city or county schools line";
  const [year, month] = opening.split("-").map(Number) as [number, number];
  const nextRow = `${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, "0")}-${String(WEB_SETTINGS.schedule.dayOfMonth).padStart(2, "0")}`;
  const turnover = [year, year + 1]
    .map((y) => `${y}-${line.fiscalYearStart}`)
    .find((date) => date > opening)!;
  if (turnover <= nextRow)
    return `its fiscal year turns over on ${turnover}, before the web's month row of ${nextRow}`;
  const startYear = schoolStartYear(opening, schoolDays.schoolYear.firstDay);
  const seniors =
    studentsByPlace(
      coreAPI(core),
      schoolData.tested.graduation,
      startYear,
      () => undefined,
    ).get(built.placeId) ?? [];
  if (!seniors.length) return "no seniors this school year";
  return null;
}

/** The raise on the town's schools line. */
function raiseSchoolsLine(core: CoreState, placeId: string, raise: number) {
  const api = coreAPI(core);
  const pick = townSchoolsLine(core, placeId);
  if (!pick) return null;
  const deltaMinor = Math.round(pick.line * raise);
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
    pct: (deltaMinor / pick.totalBase) * 100,
  };
}

/** Plays the world for a full year from the game start. */
function play(drawn: Drawn, how: { amend?: number }): World {
  const opening = gameStartDate();
  const built = buildBenchWorld(drawn.seed, opening, {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = built.core as CoreState;
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
      const raised = raiseSchoolsLine(core, built.placeId, how.amend);
      expect(raised, `${drawn.name}: the schools line is raised`).toBeTruthy();
      amended = raised!;
    }
    if (how.amend && step === 45)
      // The place was chosen for a fiscal year that keeps the raise in force
      // past the web's next month row, which must read it.
      expect(
        webRows(core, built.placeId).some(
          (row) => (row.values[CAUSE] ?? 0) > 0,
        ),
        `${drawn.name}: the web reads the raise by day 45`,
      ).toBe(true);
  }
  expect(core.date, `${drawn.name}: full-year boundary`).toBe(end);
  return { core, placeId: built.placeId, amended };
}

/** The town's graduation groups: the schools line is the town's, so other places the web follows have no cause to read. */
const groupsOf = (core: CoreState, placeId: string) =>
  rows<SchoolGroupRow>(core, "groups").filter(
    (g) => g.measure === MEASURE && g.placeId === placeId,
  );
const measureOf = (core: CoreState, placeId: string) =>
  rows<SchoolMeasureRow>(core, "measures").find(
    (m) => m.measure === MEASURE && m.placeId === placeId,
  );

describe(`the schools budget line moves graduation (seed ${seed})`, () => {
  it("runs as a link, and the school engine's graduation records follow it", () => {
    // The link runs on the engine's own measure.
    const link = WEB_LINKS.find((row) => row.key === LINK)!;
    expect(linkCoverage(link).wired).toBe(true);

    // The place is chosen from what its opening holds, before anything is
    // played: a schools line that stays in force, and seniors to graduate.
    const tried: string[] = [];
    let drawn: Drawn | null = null;
    for (let attempt = 0; attempt < ATTEMPTS && !drawn; attempt += 1) {
      const candidate = drawPlace(`${seed}:${attempt}`, "school-spending-web");
      const why = ineligible(candidate);
      if (why)
        tried.push(
          `${candidate.name}, ${candidate.state} (seed ${candidate.seed}): ${why}`,
        );
      else drawn = candidate;
    }
    if (!drawn)
      throw new Error(
        `no drawn place in ${ATTEMPTS} draws fit: ${tried.join("; ")}`,
      );
    const where = `${drawn.name}, ${drawn.state}, seed ${drawn.seed}`;

    const amended = play(drawn, { amend: RAISE });
    expect(
      groupsOf(amended.core, amended.placeId).length,
      `${where}: the seniors at the opening have graduation groups`,
    ).toBeGreaterThan(0);
    const base = play(drawn, {});
    const shifted = play(drawn, { amend: FAR_RAISE });
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
    const raisedGroups = groupsOf(amended.core, placeId);
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
    const baseGroups = groupsOf(base.core, placeId);
    const baseMeasure = measureOf(base.core, placeId)!;
    const baseWebRow = baseWeb.find(
      (row) => row.id === baseMeasure.webRecordId,
    )!;

    // 4. The far-raised twin shows the same read at a size a small town can
    // show: each fifth's factor is the read month's, with a larger part from
    // this link, so every fifth's factor and expected share rise, and
    // graduates are added, by person record where a full senior is.
    const shiftedGroups = groupsOf(shifted.core, placeId);
    const shiftedMeasure = measureOf(shifted.core, placeId)!;
    const shiftedWeb = webRows(shifted.core, placeId).find(
      (row) => row.id === shiftedMeasure.webRecordId,
    )!;
    expect(shiftedWeb.effects[LINK]).toBeGreaterThan(
      graduationWeb.effects[LINK]!,
    );
    expect(baseWebRow.effects[LINK]).toBeCloseTo(0, 9);
    // A fifth with students in only one of the two worlds has nothing to
    // compare; every fifth in both is compared.
    const compared = shiftedGroups.filter((group) =>
      baseGroups.some((g) => g.id === group.id),
    );
    expect(compared.length, `${where}: fifths in both worlds`).toBeGreaterThan(
      0,
    );
    for (const group of compared) {
      const before = baseGroups.find((g) => g.id === group.id)!;
      expect(group.factor, group.id).toBeCloseTo(
        factorOf(shiftedWeb, group.incomeFifth),
        9,
      );
      expect(before.factor, before.id).toBeCloseTo(
        factorOf(baseWebRow, group.incomeFifth),
        9,
      );
      expect(group.factor, group.id).toBeGreaterThan(
        factorOf(shiftedWeb, group.incomeFifth, LINK),
      );
      // The far raise moves household incomes too, so a fifth can hold
      // different students in the two worlds: compare the expected share of
      // each fifth's students, which can rise no further once all graduate.
      if (group.students > 0 && before.students > 0) {
        const share = group.expected / group.students;
        const baseShare = before.expected / before.students;
        expect(share, group.id).toBeGreaterThanOrEqual(baseShare);
        if (share < 1) expect(share, group.id).toBeGreaterThan(baseShare);
      }
    }
    const passed = (groups: SchoolGroupRow[]) =>
      groups.reduce((n, g) => n + g.passed, 0);
    expect(passed(shiftedGroups)).toBeGreaterThanOrEqual(passed(baseGroups));
    expect(shiftedMeasure.value).toBeGreaterThanOrEqual(baseMeasure.value);
    const baseResults = new Map(
      rows<SchoolResultRow>(base.core, "results")
        .filter((r) => r.measure === MEASURE && r.placeId === placeId)
        .map((r) => [r.id, r]),
    );
    const shiftedResults = rows<SchoolResultRow>(
      shifted.core,
      "results",
    ).filter((r) => r.measure === MEASURE && r.placeId === placeId);
    // Each senior's record names the raised web month and a higher factor.
    // Who graduates is not monotone one senior at a time across worlds: the
    // far raise moves household incomes, so seniors change fifths and a
    // fifth's students in order of standing change with them. Within a fifth
    // the rule is monotone (below, and in school-outcomes-order.test.ts).
    // Across the town, at least as many newly graduate as newly fail.
    const flipped: string[] = [];
    const failed: string[] = [];
    for (const result of shiftedResults) {
      const before = baseResults.get(result.id);
      if (!before) continue;
      expect(result.webRecordId, result.id).toBe(shiftedMeasure.webRecordId);
      expect(result.factor, result.id).toBeGreaterThan(before.factor);
      if (result.passed && !before.passed) flipped.push(result.id);
      if (!result.passed && before.passed) failed.push(result.id);
    }
    expect(shiftedResults.length).toBeGreaterThan(0);
    // One senior at a time, where nothing else moved: in a fifth whose
    // seniors are the same people in both worlds, the raise fails no one who
    // graduated before (the pass rule is monotone in the fifth's share).
    const idsByFifth = (list: readonly SchoolResultRow[]) => {
      const out = new Map<number, string[]>();
      for (const r of list) {
        const ids = out.get(r.incomeFifth) ?? [];
        ids.push(r.id);
        out.set(r.incomeFifth, ids);
      }
      for (const ids of out.values()) ids.sort();
      return out;
    };
    const baseFifths = idsByFifth([...baseResults.values()]);
    const shiftedFifths = idsByFifth(shiftedResults);
    let steady = 0;
    for (const result of shiftedResults) {
      const before = baseResults.get(result.id);
      if (!before || before.incomeFifth !== result.incomeFifth) continue;
      const same =
        JSON.stringify(baseFifths.get(result.incomeFifth)) ===
        JSON.stringify(shiftedFifths.get(result.incomeFifth));
      if (!same) continue;
      steady += 1;
      if (before.passed)
        expect(
          result.passed,
          `${where}: ${result.id} graduated before the raise and fails after it`,
        ).toBe(true);
    }
    // Where the far raise moved every fifth's seniors (Washington, D.C. seed
    // d6453558: household incomes moved, so no fifth kept its seniors) there is
    // no senior to compare one by one; the rule itself is checked for every
    // owed share and weights in school-outcomes-order.test.ts.
    process.stdout.write(`seniors compared one by one: ${steady}\n`);
    expect(
      flipped.length,
      `newly graduated against newly failed [${failed.join(", ")}]`,
    ).toBeGreaterThanOrEqual(failed.length);

    console.log(
      `school spending to graduation: ${where}, test seed ${seed}${tried.length ? `; drawn again after ${tried.join("; ")}` : ""}. Raised ${raise.governmentId} schools line by ${raise.deltaMinor} (${raise.pct.toFixed(3)}% of the town's schools lines): web ${first.id} reads ${CAUSE} ${first.values[CAUSE]!.toFixed(3)} from ${first.engineSources[CAUSE]}, link effect ${first.effects[LINK]!.toExponential(3)} then ${lastRaised.effects[LINK]!.toExponential(3)} at ${lastRaised.id}. Graduation ${raisedMeasure.id} (read ${graduationWeb.id}): factor by income fifth with the link / without it ${raisedGroups.map((g) => `${g.incomeFifth}:${g.factor.toFixed(4)}/${factorOf(graduationWeb, g.incomeFifth, LINK).toFixed(4)}`).join(" ")}. Raised ${FAR_RAISE} times over, link effect ${shiftedWeb.effects[LINK]!.toFixed(4)} (read ${shiftedMeasure.webRecordId}): graduates ${passed(baseGroups)} -> ${passed(shiftedGroups)} of ${shiftedGroups.reduce((n, g) => n + g.students, 0)}, value ${baseMeasure.value.toFixed(2)} -> ${shiftedMeasure.value.toFixed(2)}; ${flipped.length} of ${shiftedResults.length} seniors newly graduate [${flipped.slice(0, 4).join(", ")}] and ${failed.length} newly fail [${failed.slice(0, 4).join(", ")}].`,
    );
  }, 3_600_000);
});
