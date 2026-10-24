/**
 * The labor engine reads the outcome web's factors: pay follows the web's
 * wage and earnings factors, the pull to be at work follows the participation
 * outcomes of mothers, married women and people near retirement. The
 * low-wage factor reaches no employer yet (SG-LABOR-low-wage-unreviewed), so
 * nothing here claims it moves staff. Played in the bench world in
 * a place drawn from all 56 on a seed nobody chose; the twin world is the same
 * world with the web's month row shifted where the engine reads it.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { worldWith } from "./tooling/world-with";
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

/** The town the player lives in, which the web keeps a row for. */
const homeOf = (core: CoreState) => core.people.get(core.playerId!)!.placeId;

/** Each group the web's participation links name has people in the town. */
const hasGroups = (core: CoreState, least = 1) => {
  const shares = laborGroupShares(coreAPI(core), homeOf(core));
  return [MOTHERS, MARRIED_WOMEN, OLDER_WORK].every((key) => {
    const row = shares[key as keyof typeof shares];
    return row.of >= least && row.at / row.of < 0.97;
  });
};

/** A town with jobs enough that some are posted again within the play. */
const JOBS_FOR_POSTINGS = 50;
const WAGE_DRAWS = 4;
const activeJobs = (core: CoreState) =>
  [...core.jobs.values()].filter((job) => job.endsAt === undefined).length;

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

/**
 * The place the web keeps a row for: the one the counted population lives
 * in, else the player's town (a small town can be all full people, with its
 * counted households only in the places around it).
 */
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
  const home = core.people.get(core.playerId!)?.placeId;
  if (home && kept.has(home)) return home;
  throw new Error("no web place holds the counted population or the player");
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
    // A small town can lack a group outright; draw one that has each.
    const core = worldWith(seed, "web-labor-groups", (w) => hasGroups(w.core))
      .world.core;
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
      // Someone in none of the groups is untouched; a shift belongs to a group.
      if (key === "") expect(shift).toBe(0);
      if (shift !== 0) shifts.set(key, shift);
    }
    expect(shifts.size).toBeGreaterThan(0);
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
  }, 900_000); // one played world, 41 days, plus its build

  it("a higher participation factor moves who is at work", async () => {
    const days = 80;
    const { world, place: found } = worldWith(
      seed,
      "web-labor-lowwage",
      // Each group needs enough people in the town, with some not yet at work, to move.
      (w) => hasGroups(w.core, 30),
      // Small towns rarely have 30 in every group; look further before failing.
      16,
    );
    const base = world.core;
    const lifted = buildBenchWorld(found.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: found.key,
    }).core;
    await trial(base, lifted, days);
    // Two played worlds of 40 + 80 days each.
  }, 1_800_000); // two played worlds, 40 + 80 days each, queued behind other sessions

  it("a higher wage factor moves the pay of new postings", async () => {
    // Postings follow vacancies, which a small town may not have in the
    // window; try a bounded number of towns with jobs enough, and fail by
    // name when none posted in both worlds.
    const tried: string[] = [];
    for (let draw = 0; draw < WAGE_DRAWS; draw += 1) {
      const { place: found } = worldWith(
        draw ? `${seed}:wage${draw}` : seed,
        "web-labor-wages",
        (w) => activeJobs(w.core) >= JOBS_FOR_POSTINGS,
      );
      const twin = () =>
        buildBenchWorld(found.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: found.key,
        }).core;
      const result = wageTrial(twin(), twin(), 80);
      if (result) {
        expect(result.after.mean).toBeGreaterThan(result.before.mean * 1.03);
        return;
      }
      tried.push(found.name);
    }
    throw new Error(
      `no drawn town posted jobs after the shift in both worlds (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000); // two played worlds, 40 + 80 days each, queued behind other sessions
});

async function trial(base: CoreState, lifted: CoreState, days: number) {
  {
    play(base, 40);
    play(lifted, 40);
    // The retirement-age link has its own year-long twin, fitted to its
    // researched size (jobs-older-work-web.test.ts); only the other two shift here.
    const effects = {
      "universal-childcare-to-mothers-work": 0.6,
      "broadband-to-married-women-work": 0.3,
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
    console.log(
      `web labor twins: ${place.name} seed ${seed}: at work mothers ${rate(a[MOTHERS]).toFixed(4)}->${rate(b[MOTHERS]).toFixed(4)}, married ${rate(a[MARRIED_WOMEN]).toFixed(4)}->${rate(b[MARRIED_WOMEN]).toFixed(4)}, older ${rate(a[OLDER_WORK]).toFixed(4)}->${rate(b[OLDER_WORK]).toFixed(4)}; low-wage jobs ${a["labor.low-wage-jobs"].at.toFixed(0)}->${b["labor.low-wage-jobs"].at.toFixed(0)}`,
    );
    expect(rate(b[MOTHERS]) + rate(b[MARRIED_WOMEN])).toBeGreaterThan(
      rate(a[MOTHERS]) + rate(a[MARRIED_WOMEN]),
    );
  }
}

/**
 * New pay carries the wage factor. The low-wage factor changes how many
 * people an employer hires, so the all-factors twin may post nothing after
 * the shift. This twin shifts only the wage factor, and each posting made
 * after the shift is read against the pay of the job it copies, which is the
 * same job in both worlds, so who happens to be hired cannot move the result.
 */
function wageTrial(base: CoreState, paid: CoreState, days: number) {
  play(base, 40);
  play(paid, 40);
  const wageBase = (
    coreAPI(paid)
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .rows() as unknown as WebMonth[]
  )[0]!.bases["labor.wages"]!;
  const raise = { "corporate-tax-incidence": 0.1 * wageBase };
  const shiftDay = makeIsoDate(paid.date);
  expect(setEffects(paid, raise).length).toBeGreaterThan(0);
  play(paid, 1, raise);
  play(base, 1);
  expect(
    webReach(coreAPI(paid), townOf(paid), "labor.wages").factor,
  ).toBeGreaterThan(1.05);
  play(base, days);
  play(paid, days, raise);
  const newPay = (core: CoreState) => {
    const ratios = (
      coreAPI(core)
        .moduleState(JOBS_MODULE_ID)
        .table("positions")
        .rows() as unknown as {
        hourlyMinor: number;
        openedAt: string;
        templateJobId: string;
      }[]
    )
      .filter((row) => row.openedAt > shiftDay)
      .flatMap((row) => {
        const template = core.jobs.get(row.templateJobId)?.hourlyMinor;
        return template ? [row.hourlyMinor / template] : [];
      });
    return {
      n: ratios.length,
      mean: ratios.reduce((n, r) => n + r, 0) / ratios.length,
    };
  };
  const before = newPay(base),
    after = newPay(paid);
  console.log(
    `web labor wage twin: ${place.name} seed ${seed}: new postings ${before.n}->${after.n}, pay against the copied job ${before.mean.toFixed(4)}->${after.mean.toFixed(4)}`,
  );
  // A twin with no postings after the shift in either world has nothing to compare.
  return before.n > 0 && after.n > 0 ? { before, after } : null;
}
