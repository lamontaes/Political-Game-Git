/**
 * Firearm homicide reads the outcome web (web-reach-crime-justice). The
 * stand-your-ground and concealed-carry-permit links move crime.firearm-homicide;
 * the death engine's firearm-homicide cause reads that factor at every age, for
 * full and counted people alike (src/core2/death-cause.ts, health-web.ts).
 * Played in the bench world, in a place drawn from all 56 on a seed nobody
 * chose, against a twin whose web month rows were not shifted. The shifted
 * world's two effects are set many times the researched 0.08 so a small
 * town's records can show them.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import {
  assignDeathCause,
  baseCauseShares,
  causeMix,
  DEATH_CAUSE_IDS,
} from "./death-cause";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { healthDeathWebOf, healthReport } from "./modules/health";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed =
  process.env.FIREARM_HOMICIDE_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "firearm-homicide-web");

const SYG = "stand-your-ground-to-homicide";
const CCP = "concealed-carry-permit-to-firearm-homicide";
const CAUSE = "firearm-homicide";
const SHIFT = { [SYG]: 0.4, [CCP]: -0.2 };
/** Ages inside the youth firearm window (1 to 19) and outside it. */
const AGES = [5, 15, 20, 30, 40, 70] as const;
/** The shift is laid on again each day: the web rewrites its month row as the month goes on. A year (365) shows a big town's deaths. */
const PLAYED_DAYS = Number(process.env.FIREARM_HOMICIDE_DAYS || 90);
const DEATHS_AT_TWENTY = 400;

interface Counts {
  month: string;
  deaths: string[];
  causeOf: Record<string, string>;
  expected: { deaths: number };
}

interface Mix {
  factor: number;
  cause: number;
  share: number;
  recordId: string | null;
}

function play(shift: boolean) {
  const opening = gameStartDate();
  const world = buildBenchWorld(place.seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = () => coreAPI(world.core);
  advanceCore(world.core, addDays(makeIsoDate(opening), 70));
  while (world.core.date.slice(8, 10) !== "03")
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const months = api().moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const latestRows = () => {
    const all = months.rows().map((r) => r as unknown as WebMonth);
    const month = all
      .map((r) => r.month)
      .sort()
      .at(-1)!;
    return all.filter((r) => r.month === month);
  };
  const lay = () => {
    if (!shift) return;
    for (const old of latestRows()) {
      const row = months.get(old.id) as unknown as WebMonth;
      months.put({ ...row, effects: { ...row.effects, ...SHIFT } } as never);
    }
  };
  const shiftedMonth = latestRows()[0]!.month;
  lay();
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  // The 4th: the full people's monthly look has read the month.
  const web = latestRows().find((row) => row.placeId === world.placeId)!;
  const mixes = Object.fromEntries(
    AGES.map((age) => {
      const mix = causeMix(api(), web.placeId, age, 2);
      return [
        age,
        {
          factor: mix.factor,
          cause: mix.causeFactors[CAUSE]!,
          share: mix.shares[CAUSE]!,
          recordId: mix.recordId,
        } satisfies Mix,
      ];
    }),
  ) as Record<(typeof AGES)[number], Mix>;
  // Each full person's hazard multiplier now, by id; a person already ill keeps the factor they were ill under.
  const ill = new Set(
    healthReport(world.core)
      .cases.filter((found) => found.onsetEventId)
      .map((found) => found.personId),
  );
  const hazard = new Map(
    [...world.core.people.values()]
      .filter((person) => person.alive)
      .map((person) => [
        person.id,
        {
          age: Math.floor(
            ageOnDate(
              makeIsoDate(person.birthDate),
              makeIsoDate(world.core.date),
            ),
          ),
          factor: healthDeathWebOf(world.core, person.id),
          ill: ill.has(person.id),
        },
      ]),
  );
  for (let day = 0; day < PLAYED_DAYS; day += 1) {
    lay();
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  }
  const counted = (
    coreAPI(world.core)
      .moduleState(RENEWAL_MODULE_ID)
      .table("counts")
      .rows() as unknown as Counts[]
  ).filter((row) => row.month > shiftedMonth);
  const countedFirearm = counted.flatMap((row) =>
    row.deaths
      .filter((id) => row.causeOf[id] === CAUSE)
      .map((id) => `${row.month}:${id}`),
  );
  const fullDeaths = [...healthReport(world.core).causeOfDeath];
  const fullFirearm = fullDeaths
    .filter(([, cause]) => cause === CAUSE)
    .map(([id]) => id);
  // The assignment itself: 400 deaths at 20 take the causes the band is owed, in this month's mix.
  const picked = Array.from(
    { length: DEATHS_AT_TWENTY },
    () => assignDeathCause(api(), { placeId: web.placeId, age: 20 }).cause,
  ).filter((cause) => cause === CAUSE).length;
  const effects = latestRows().find(
    (row) => row.placeId === web.placeId,
  )!.effects;
  return {
    web,
    mixes,
    hazard,
    countedRows: counted,
    countedDeaths: counted.flatMap((row) => row.deaths),
    expectedDeaths: counted.reduce((n, row) => n + row.expected.deaths, 0),
    countedFirearm,
    fullDeaths: fullDeaths.length,
    fullFirearm,
    picked,
    syg: effects[SYG]!,
    ccp: effects[CCP]!,
    deathCauseIds: counted.flatMap((row) =>
      row.deaths.map((id) => row.causeOf[id]!),
    ),
  };
}

describe(`firearm homicide reads the web's crime outcome (${place.name}, seed ${seed})`, () => {
  it("moves the cause's share and every person's death hazard, and the deaths that carry it", () => {
    const base = play(false);
    const moved = play(true);
    const record = moved.web.id;
    // The shifted world's cause factor is the product of the two links' effects at every age
    // outside the youth window, and the same multiple of its twin's inside it.
    const product = (1 + SHIFT[SYG]) * (1 + SHIFT[CCP]);
    expect(moved.mixes[30].cause).toBeCloseTo(product, 9);
    expect(moved.mixes[70].cause).toBeCloseTo(product, 9);
    expect(base.mixes[30].cause).toBeCloseTo(
      (1 + base.syg) * (1 + base.ccp),
      9,
    );
    for (const age of AGES) {
      expect(moved.mixes[age].cause, `age ${age}`).toBeGreaterThan(
        base.mixes[age].cause,
      );
      expect(
        moved.mixes[age].cause / base.mixes[age].cause,
        `age ${age}: the same multiple at every age, no moderator in the research`,
      ).toBeCloseTo(moved.mixes[30].cause / base.mixes[30].cause, 9);
      expect(moved.mixes[age].recordId, `age ${age}`).toBe(record);
    }
    // The cause's share of the deaths there rises, and the hazard by the share the web moved.
    for (const age of [15, 20, 30, 40] as const) {
      expect(moved.mixes[age].share, `age ${age}`).toBeGreaterThan(
        base.mixes[age].share,
      );
      expect(moved.mixes[age].factor, `age ${age}`).toBeGreaterThan(
        base.mixes[age].factor,
      );
      expect(
        moved.mixes[age].factor - base.mixes[age].factor,
        `age ${age}`,
      ).toBeCloseTo(
        baseCauseShares(age)[CAUSE]! *
          (moved.mixes[age].cause - base.mixes[age].cause),
        9,
      );
    }
    // Full people: no one's hazard multiplier is lower in the shifted world, and everyone
    // the monthly look reached (not mid-illness, aged past the cause's first share) is higher, by id.
    const heavier: string[] = [];
    let compared = 0;
    for (const [id, now] of moved.hazard) {
      const was = base.hazard.get(id);
      if (!was) continue;
      compared += 1;
      expect(now.factor, id).toBeGreaterThanOrEqual(was.factor);
      if (now.age >= 6 && !now.ill && !was.ill && now.factor !== 1) {
        expect(now.factor, `${id} aged ${now.age}`).toBeGreaterThan(was.factor);
        heavier.push(id);
      }
    }
    expect(compared).toBeGreaterThan(0);
    expect(heavier.length).toBeGreaterThan(0);
    // Counted people: the owed deaths of the months after the shift rise.
    expect(moved.countedRows.length).toBeGreaterThan(0);
    expect(moved.expectedDeaths).toBeGreaterThan(base.expectedDeaths);
    for (const cause of [...moved.deathCauseIds, ...base.deathCauseIds])
      expect(DEATH_CAUSE_IDS).toContain(cause);
    // The assignment takes more firearm homicides in the shifted mix.
    expect(moved.picked).toBeGreaterThan(base.picked);
    console.log(
      `firearm homicide: ${place.name}, seed ${seed}: web month ${record}; effects ${base.syg.toFixed(3)}/${base.ccp.toFixed(3)} -> ${moved.syg}/${moved.ccp}; cause factor at 30 ${base.mixes[30].cause.toFixed(4)} -> ${moved.mixes[30].cause.toFixed(4)}, at 15 ${base.mixes[15].cause.toFixed(4)} -> ${moved.mixes[15].cause.toFixed(4)}; hazard at 20 ${base.mixes[20].factor.toFixed(5)} -> ${moved.mixes[20].factor.toFixed(5)}; ${heavier.length} of ${compared} full people heavier (${heavier.slice(0, 3).join(", ")}); counted expected deaths ${base.expectedDeaths.toFixed(3)} -> ${moved.expectedDeaths.toFixed(3)}; of ${DEATHS_AT_TWENTY} deaths at 20, firearm homicides ${base.picked} -> ${moved.picked}; deaths in the year with the cause: counted ${base.countedFirearm.length} -> ${moved.countedFirearm.length} (of ${base.countedDeaths.length} -> ${moved.countedDeaths.length}) [${moved.countedFirearm.slice(0, 4).join(", ")}], full ${base.fullFirearm.length} -> ${moved.fullFirearm.length} (of ${base.fullDeaths} -> ${moved.fullDeaths}) [${moved.fullFirearm.slice(0, 4).join(", ")}]`,
    );
  }, 3_600_000);
});
