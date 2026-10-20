/**
 * A death carries a cause, assigned without dice, and the outcome web's
 * links into overdose, youth firearm and traffic deaths reach it. Played in
 * the bench world, in a place drawn from all 56 on a seed nobody chose,
 * against a twin whose web month row was not shifted.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import {
  assignDeathCause,
  baseCauseShares,
  causeMix,
  DEATH_CAUSE_IDS,
  OVERDOSE_CAUSE,
} from "./death-cause";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.DEATH_CAUSE_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "death-cause");

const SHIFT = {
  "harm-reduction-to-overdose-deaths": 0.3,
  "child-access-law-to-youth-gun-deaths": 0.4,
  "min-age-to-youth-gun-suicide": 0.5,
  "speed-limit-to-traffic-deaths": 0.2,
};
const COUNTED_FLOW_WITHIN_DAYS = 28;

interface Counts {
  month: string;
  deaths: string[];
  deathCauses: Record<string, number>;
  causeOf: Record<string, string>;
}

function run(shift: boolean) {
  const opening = gameStartDate();
  const world = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = () => coreAPI(world.core);
  advanceCore(world.core, addDays(makeIsoDate(opening), 70));
  while (world.core.date.slice(8, 10) !== "03")
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const months = api().moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const all = months.rows().map((r) => r as unknown as WebMonth);
  const month = all
    .map((r) => r.month)
    .sort()
    .at(-1)!;
  const latest = all.filter((r) => r.month === month);
  const lay = () => {
    if (!shift) return;
    for (const old of latest) {
      const row = months.get(old.id) as unknown as WebMonth;
      months.put({ ...row, effects: { ...row.effects, ...SHIFT } } as never);
    }
  };
  lay();
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const web = latest[0]!;
  const at = (age: number) => causeMix(api(), web.placeId, age, 2);
  const mixes = { 5: at(5), 15: at(15), 30: at(30), 40: at(40), 70: at(70) };
  // The assignment itself: 400 deaths at age 30 in this month's mix take the overdose the band is owed.
  const overdoses = Array.from(
    { length: 400 },
    () => assignDeathCause(api(), { placeId: web.placeId, age: 30 }).cause,
  ).filter((cause) => cause === OVERDOSE_CAUSE).length;
  for (let day = 0; day < COUNTED_FLOW_WITHIN_DAYS; day += 1) {
    lay();
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  }
  return { world, web, month, mixes, api, overdoses };
}

describe(`deaths carry a cause the web moves (${place.name}, seed ${seed})`, () => {
  it("assigns causes by record, and the shifted links raise the right causes at the right ages", () => {
    const base = run(false);
    const moved = run(true);
    const { mixes, web } = moved;
    // The twin's web month was left alone: each shifted link must move its cause above the twin's, and only at its ages.
    const cf = (w: typeof moved, age: 5 | 15 | 30 | 40 | 70, cause: string) =>
      w.mixes[age].causeFactors[cause]!;
    expect(cf(moved, 30, OVERDOSE_CAUSE)).toBeGreaterThan(
      cf(base, 30, OVERDOSE_CAUSE),
    );
    expect(mixes[30].recordId).toBe(web.id);
    expect(cf(moved, 15, "firearm-homicide")).toBeGreaterThan(
      cf(base, 15, "firearm-homicide"),
    );
    expect(cf(moved, 15, "firearm-suicide")).toBeGreaterThan(
      cf(base, 15, "firearm-suicide"),
    );
    expect(cf(moved, 5, "firearm-homicide")).toBeGreaterThan(
      cf(base, 5, "firearm-homicide"),
    );
    expect(cf(moved, 5, "firearm-suicide")).toBe(
      cf(base, 5, "firearm-suicide"),
    );
    expect(cf(moved, 40, "firearm-homicide")).toBe(
      cf(base, 40, "firearm-homicide"),
    );
    expect(cf(moved, 40, "firearm-suicide")).toBe(
      cf(base, 40, "firearm-suicide"),
    );
    for (const age of [5, 15, 30, 40, 70] as const)
      expect(moved.mixes[age].factor).toBeGreaterThan(base.mixes[age].factor);
    // The spread differs by age: overdose is a third of deaths at 30 and a sliver at 70.
    const rise = (age: 5 | 15 | 30 | 40 | 70) => mixes[age].factor - 1;
    expect(rise(30)).toBeGreaterThan(rise(70));
    expect(rise(15)).not.toBeCloseTo(rise(30), 3);
    expect(rise(30)).toBeCloseTo(
      baseCauseShares(30)[OVERDOSE_CAUSE]! *
        (mixes[30].causeFactors[OVERDOSE_CAUSE]! - 1) +
        baseCauseShares(30)["motor-vehicle"]! *
          (mixes[30].causeFactors["motor-vehicle"]! - 1),
      9,
    );
    // Counted deaths: every one in the window carries a cause, and the counts row adds up by cause.
    const rows = (world: typeof moved.world) =>
      (
        coreAPI(world.core)
          .moduleState(RENEWAL_MODULE_ID)
          .table("counts")
          .rows() as unknown as Counts[]
      ).filter((row) => row.month > moved.month);
    // A small town may have no death in these weeks: play on, a month at a time, up to a year, until it has one.
    for (
      let extra = 0;
      extra < 12 && !rows(moved.world).some((row) => row.deaths.length);
      extra += 1
    )
      advanceCore(
        moved.world.core,
        addDays(makeIsoDate(moved.world.core.date), 30),
      );
    const movedRows = rows(moved.world);
    const deaths = movedRows.flatMap((row) => row.deaths);
    expect(deaths.length).toBeGreaterThan(0);
    for (const row of movedRows) {
      for (const id of row.deaths)
        expect(DEATH_CAUSE_IDS).toContain(row.causeOf[id]);
      expect(
        Object.values(row.deathCauses).reduce((n, count) => n + count, 0),
      ).toBeGreaterThanOrEqual(row.deaths.length);
    }
    const baseOverdoses = base.overdoses;
    const movedOverdoses = moved.overdoses;
    console.log(
      `death cause: ${place.name}, seed ${seed}: ${deaths.length} counted deaths with causes; factor at 30 ${mixes[30].factor.toFixed(4)}, 15 ${mixes[15].factor.toFixed(4)}, 70 ${mixes[70].factor.toFixed(4)}; overdose of 400 at 30: ${baseOverdoses} -> ${movedOverdoses}; record ${web.id}`,
    );
    expect(movedOverdoses).toBeGreaterThan(baseOverdoses);
    // A person with the substance-use-disorder condition ranks first for an overdose.
    // At 50 the band has not been drawn on yet: the first plain death there takes the largest share, the condition's takes an overdose.
    const plain = assignDeathCause(moved.api(), {
      placeId: web.placeId,
      age: 50,
    });
    const owed = assignDeathCause(moved.api(), {
      placeId: web.placeId,
      age: 50,
      substanceUse: true,
    });
    expect(plain.cause).not.toBe(OVERDOSE_CAUSE);
    expect(owed.cause).toBe(OVERDOSE_CAUSE);
  }, 1_200_000);
});
