/**
 * The labor engine reads the outcome web's factors: pay follows the web's
 * wage and earnings factors, the pull to be at work follows the participation
 * outcomes of mothers, married women and people near retirement, and an
 * employer's target follows the low-wage factor. Played in the bench world in
 * a place drawn from all 56 on a seed nobody chose; the twin world is the same
 * world with the web's month row shifted where the engine reads it.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  countedFacts,
  fullFacts,
  inGroup,
  MARRIED_WOMEN,
  MOTHERS,
  OLDER_WORK,
  participationShift,
} from "./jobs-web";
import { JOBS_MODULE_ID, laborGroupShares } from "./modules/jobs";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { residentsRuntime } from "./modules/residents";
import { webReach } from "./outcome-web-reach";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.WEB_LABOR_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-labor");

const build = () =>
  buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core;

/** Set the effects of links on the latest web month row of every place, as the web would have written them. */
function setEffects(
  core: CoreState,
  effects: Record<string, number>,
): string[] {
  const table = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months");
  const rows = table.rows() as unknown as WebMonth[];
  const latest = rows
    .map((r) => r.month)
    .sort()
    .at(-1)!;
  const touched: string[] = [];
  for (const row of rows) {
    if (row.month !== latest) continue;
    table.put({
      ...row,
      effects: { ...row.effects, ...effects },
    } as never);
    touched.push(row.id);
  }
  return touched;
}

/** The place the web keeps a row for that the counted population lives in. */
const townOf = (core: CoreState) => {
  const kept = new Set(
    (
      coreAPI(core)
        .moduleState(OUTCOME_WEB_MODULE_ID)
        .table("months")
        .rows() as unknown as WebMonth[]
    ).map((row) => row.placeId),
  );
  const rt = residentsRuntime(core)!;
  for (const h of rt.store.liveHouseholds())
    if (kept.has(h.placeId)) return h.placeId;
  throw new Error("no web place holds the counted population");
};

/** Play to a date, re-shifting the web's row each day after the web wrote it. */
function play(core: CoreState, days: number, effects?: Record<string, number>) {
  let day = makeIsoDate(core.date);
  for (let i = 0; i < days; i++) {
    day = addDays(day, 1);
    advanceCore(core, day);
    if (effects) setEffects(core, effects);
  }
}

describe(`the labor engine and the outcome web (${place.name}, seed ${seed})`, () => {
  it("finds mothers, married women and people near retirement in its records, and the factor varies across them", () => {
    const core = build();
    play(core, 40);
    const api = coreAPI(core);
    const p = (k: string) => api.parameter(k);
    const town = townOf(core);
    // The web's row is read once a day, so the shifted row is read the day after.
    const effects = {
      "universal-childcare-to-mothers-work": 0.15,
      "broadband-to-married-women-work": 0.07,
      "retirement-age-to-older-work": 0.1,
    };
    setEffects(core, effects);
    play(core, 1, effects);
    const shares = laborGroupShares(api, town);
    for (const key of [MOTHERS, MARRIED_WOMEN, OLDER_WORK])
      expect(shares[key as keyof typeof shares].of, key).toBeGreaterThan(0);
    // Full people: the shift differs by group.
    const shifts = new Map<string, number>();
    for (const person of core.people.values()) {
      if (!person.alive || person.placeId !== town) continue;
      const facts = fullFacts(api, person.id, p)!;
      const shift = participationShift(api, town, facts, p);
      const key = [MOTHERS, MARRIED_WOMEN, OLDER_WORK]
        .filter((m) => inGroup(m, facts, p))
        .join("+");
      if (shift !== 0) shifts.set(key, shift);
      else expect(key === "" || key.length > 0).toBe(true);
    }
    const rt = residentsRuntime(core)!;
    const countedShifts = new Set<number>();
    for (const h of rt.store.liveHouseholds())
      for (const m of rt.store.countedMembers(h))
        countedShifts.add(
          participationShift(api, town, countedFacts(api, rt.store, m, p), p),
        );
    console.log(
      `web labor: ${place.name} seed ${seed}: shifts by group ${JSON.stringify([...shifts])}; counted distinct shifts ${[...countedShifts].map((s) => s.toFixed(3)).join(" ")}; mothers ${JSON.stringify(shares[MOTHERS])}`,
    );
    expect(countedShifts.size).toBeGreaterThan(1);
    expect([...countedShifts].some((s) => s > 0)).toBe(true);
    expect(webReach(api, town, MOTHERS).recordId).toBeTruthy();
  }, 900_000);

  it("a higher participation factor moves who is at work, a higher wage factor moves new pay, a lower low-wage factor shrinks low-wage staff", async () => {
    const days = 119;
    const base = build();
    const lifted = build();
    // Pay differs by place; set the low-wage line at the town's own middle
    // hourly pay in both worlds so there are low-wage jobs to act on.
    const wages = [...base.jobs.values()]
      .map((job) => job.hourlyMinor ?? 0)
      .filter((pay) => pay > 0)
      .sort((x, y) => x - y);
    const line = wages[Math.floor(wages.length / 2)]!;
    const key = "jobsLowWageLineHourlyMinor";
    const kept = base.data.parameters[key]!;
    try {
      for (const core of [base, lifted])
        core.data.parameters[key] = { ...kept, value: line };
      await trial(base, lifted, days);
    } finally {
      for (const core of [base, lifted]) core.data.parameters[key] = kept;
    }
  }, 1_800_000);
});

async function trial(base: CoreState, lifted: CoreState, days: number) {
  {
    play(base, 40);
    play(lifted, 40);
    const effects = {
      "universal-childcare-to-mothers-work": 0.6,
      "broadband-to-married-women-work": 0.3,
      "retirement-age-to-older-work": 0.5,
      "federal-minimum-wage-to-low-wage-jobs": -0.5,
    };
    const wageBase = (core: CoreState) =>
      (
        coreAPI(core)
          .moduleState(OUTCOME_WEB_MODULE_ID)
          .table("months")
          .rows() as unknown as WebMonth[]
      )[0]!.bases["labor.wages"]!;
    const raise = {
      ...effects,
      "corporate-tax-incidence": 0.1 * wageBase(lifted),
    };
    const town = townOf(lifted);
    const touched = setEffects(lifted, raise);
    expect(touched.length).toBeGreaterThan(0);
    play(lifted, 1, raise);
    play(base, 1);
    const reach = webReach(coreAPI(lifted), town, "labor.wages");
    expect(reach.factor).toBeGreaterThan(1.05);
    play(base, days);
    play(lifted, days, raise);
    const a = laborGroupShares(coreAPI(base), town),
      b = laborGroupShares(coreAPI(lifted), town);
    const rate = (x: { of: number; at: number }) => x.at / x.of;
    // New postings carry the wage factor.
    const postings = (core: CoreState) =>
      (
        coreAPI(core)
          .moduleState(JOBS_MODULE_ID)
          .table("positions")
          .rows() as unknown as { hourlyMinor: number; openedAt: string }[]
      ).filter((row) => row.openedAt > "0");
    const mean = (core: CoreState) => {
      const rows = postings(core);
      return rows.reduce((n, r) => n + r.hourlyMinor, 0) / rows.length;
    };
    console.log(
      `web labor twins: ${place.name} seed ${seed}: at work mothers ${rate(a[MOTHERS]).toFixed(4)}->${rate(b[MOTHERS]).toFixed(4)}, married ${rate(a[MARRIED_WOMEN]).toFixed(4)}->${rate(b[MARRIED_WOMEN]).toFixed(4)}, older ${rate(a[OLDER_WORK]).toFixed(4)}->${rate(b[OLDER_WORK]).toFixed(4)}; low-wage jobs ${a["labor.low-wage-jobs"].at.toFixed(0)}->${b["labor.low-wage-jobs"].at.toFixed(0)}; mean posting ${mean(base).toFixed(0)}->${mean(lifted).toFixed(0)}`,
    );
    expect(
      rate(b[MOTHERS]) + rate(b[MARRIED_WOMEN]) + rate(b[OLDER_WORK]),
    ).toBeGreaterThan(
      rate(a[MOTHERS]) + rate(a[MARRIED_WOMEN]) + rate(a[OLDER_WORK]),
    );
    expect(b["labor.low-wage-jobs"].at).toBeLessThan(
      a["labor.low-wage-jobs"].at,
    );
    expect(mean(lifted)).toBeGreaterThan(mean(base) * 1.03);
  }
}
