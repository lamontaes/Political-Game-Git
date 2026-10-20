/**
 * The outcome web's death factors reach both tiers. A full person's hazard
 * and a counted person's chance of a serious illness both take
 * deathWebFactor for their age and income fifth: infants read the infant
 * mortality links, ages 55 to 64 the Medicaid mortality link (which lands on
 * the lowest income fifth), and every age the traffic link through the
 * share of deaths a crash stands for. Played in the bench world, in a place
 * drawn from all 56 on a seed nobody chose, against a twin whose web month
 * row was not shifted.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { deathWebFactor, trafficShareOfDeaths } from "./health-web";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { healthDeathWebOf } from "./modules/health";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.HEALTH_WEB_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "health-web");

// The counted flows run on the first of the next month, 28 days after the 4th.
const COUNTED_FLOW_WITHIN_DAYS = 28;

const SHIFT = {
  "particles-to-infant-deaths": 0.03,
  "abortion-ban-to-infant-deaths": 0.06,
  "speed-limit-to-traffic-deaths": 0.2,
  "medicaid-expansion-to-mortality": -0.0188,
};

interface Counts {
  month: string;
  webDeathRecordId: string | null;
  expected: { deaths: number };
}

function run(shift: boolean) {
  const opening = gameStartDate();
  const world = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = () => coreAPI(world.core);
  // To the 3rd of the second month: the web has written its month.
  const start = makeIsoDate(opening);
  advanceCore(world.core, addDays(start, 70));
  while (world.core.date.slice(8, 10) !== "03")
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const months = api().moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const all = months.rows().map((r) => r as unknown as WebMonth);
  const month = all
    .map((r) => r.month)
    .sort()
    .at(-1)!;
  const latest = all.filter((r) => r.month === month);
  // The web rewrites its month row as the month goes on, so the shift is laid
  // on again each day until the counted flows have read it.
  const lay = () => {
    if (!shift) return;
    for (const old of latest) {
      const row = months.get(old.id) as unknown as WebMonth;
      months.put({
        ...row,
        effects: { ...row.effects, ...SHIFT },
      } as never);
    }
  };
  lay();
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  // The 4th: the full people's monthly look has read the shifted month.
  const web = latest[0]!;
  const factors = {
    infant: deathWebFactor(api(), web.placeId, 0),
    poor: deathWebFactor(api(), web.placeId, 60, 0).factor,
    rich: deathWebFactor(api(), web.placeId, 60, 4).factor,
    full: [...world.core.people.values()]
      .filter((person) => person.alive)
      .map((person) => healthDeathWebOf(world.core, person.id)),
  };
  // Then to the next month's counted flows, which read the shifted record.
  for (let day = 0; day < COUNTED_FLOW_WITHIN_DAYS; day += 1) {
    lay();
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  }
  return { world, web, month, factors };
}

describe(`web death factors reach both tiers (${place.name}, seed ${seed})`, () => {
  it("moves full people's hazards and counted deaths by age and income", () => {
    const base = run(false);
    const moved = run(true);
    const { web, factors } = moved;
    const { infant, poor, rich } = factors;
    expect(infant.recordId).toBe(web.id);
    expect(infant.factor).toBeCloseTo(
      1.03 * 1.06 * (1 + trafficShareOfDeaths(0) * 0.2),
      9,
    );
    expect(poor).toBeLessThan(rich);
    expect(poor).toBeCloseTo(
      (1 - 0.0188 * 5) * (1 + trafficShareOfDeaths(60) * 0.2),
      9,
    );
    // Full people in the shifted world carry the factor in their strain; the twin's carry none.
    const shifted = factors.full;
    expect(shifted.length).toBeGreaterThan(0);
    expect(shifted.some((factor) => factor !== 1)).toBe(true);
    expect(Math.max(...shifted)).toBeGreaterThan(Math.min(...shifted));
    expect(base.factors.full.every((factor) => factor === 1)).toBe(true);
    // Counted people: the month's expected deaths read the shifted record and rise.
    const counts = (core: typeof moved.world.core) =>
      coreAPI(core)
        .moduleState(RENEWAL_MODULE_ID)
        .table("counts")
        .rows() as unknown as Counts[];
    const after = (rows: Counts[]) =>
      rows.filter((row) => row.month > moved.month);
    const movedRows = after(counts(moved.world.core));
    const baseRows = after(counts(base.world.core));
    expect(movedRows.length).toBeGreaterThan(0);
    expect(movedRows.some((r) => r.webDeathRecordId === web.id)).toBe(true);
    const sum = (rows: Counts[]) =>
      rows.reduce((n, row) => n + row.expected.deaths, 0);
    console.log(
      `health web: ${place.name}, seed ${seed}: expected deaths ${sum(baseRows).toFixed(4)} -> ${sum(movedRows).toFixed(4)}; infant ${infant.factor.toFixed(4)}, 60 poor ${poor.toFixed(4)} rich ${rich.toFixed(4)}; record ${web.id}`,
    );
    // The poorest 55- to 64-year-olds' cut and the crash share's rise pull
    // opposite ways and can cancel in the town's sum, so each cohort's owed
    // deaths (sex and birth year, the life table's columns) must move.
    const owed = (core: typeof moved.world.core) =>
      (
        coreAPI(core)
          .moduleState(RENEWAL_MODULE_ID)
          .table("countedCarry")
          .get(web.placeId) as unknown as { deaths: Record<string, number> }
      ).deaths;
    const movedOwed = owed(moved.world.core);
    const baseOwed = owed(base.world.core);
    const cohorts = new Set([
      ...Object.keys(movedOwed),
      ...Object.keys(baseOwed),
    ]);
    const shiftByCohort = [...cohorts].reduce(
      (n, key) => n + Math.abs((movedOwed[key] ?? 0) - (baseOwed[key] ?? 0)),
      0,
    );
    expect(shiftByCohort / sum(baseRows)).toBeGreaterThan(1e-5);
  }, 1_200_000);
});
