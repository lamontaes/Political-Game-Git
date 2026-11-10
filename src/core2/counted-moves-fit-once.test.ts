// @vitest-environment node
/**
 * The moves between states fit once (country-tier design, "What is deleted":
 * the monthly re-fit of arrivals to the Census is replaced by place constants
 * fitted at the opening; flows then follow causes). A drawn place from all 56;
 * set GOLDEN_PATH_SEED to reproduce the draw.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  countedMoves,
  countedStatePeople,
  pullBetween,
  runtimeOf,
  stateUnemployment,
} from "./modules/counted-moves";
import { enactLaw, lawChain, stateLawInForce } from "./modules/laws";
import { restoreWorld, snapshotWorld } from "./snapshot";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const WAGES = 60_000;

const build = (placeSeed: string, placeKey: string) =>
  buildBenchWorld(placeSeed, gameStartDate(), { twoLevel: true, placeKey })
    .core;

/** Runs the world on to the first of the next month n times (the moves engine runs on the first). */
function monthsOn(core: CoreState, n: number): void {
  for (let i = 0; i < n; i += 1) {
    const [year, month] = core.date.split("-").map(Number) as [number, number];
    const next = month === 12 ? [year! + 1, 1] : [year!, month! + 1];
    advanceCore(
      core,
      makeIsoDate(`${next[0]}-${String(next[1]).padStart(2, "0")}-01`),
    );
  }
}

/** Whether a state's income tax in force takes something at these wages. */
const taxed = (core: CoreState, stateKey: string) => {
  const answer = stateLawInForce(coreAPI(core), stateKey, "income-tax");
  return answer.levels.some((level) => {
    if (level.level !== "state" || level.setAside || !level.row) return false;
    const brackets = (
      level.row.terms?.schedules as
        { single?: { brackets: { rate: number }[] } } | undefined
    )?.single?.brackets;
    return brackets
      ? brackets.some((b) => b.rate > 0)
      : (level.row.value ?? 0) > 0;
  });
};

/** The first drawn place whose own state taxes income (otherwise ending the tax changes nothing); its world is dropped at once. */
let drawn: ReturnType<typeof drawPlace> | undefined;
function drawTaxedPlace() {
  if (drawn) return drawn;
  for (let draw = 0; draw < 24; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "counted-moves-fit-once");
    if (
      (() => {
        const core = build(place.seed, place.key);
        return taxed(core, lawChain(coreAPI(core)).stateKey);
      })()
    )
      return (drawn = place);
  }
  throw new Error(`no drawn place taxes income (seed ${seed})`);
}

const rtTown = (core: CoreState) => runtimeOf(coreAPI(core))!.townState;

const endTax = (core: CoreState, jurisdiction: string) =>
  enactLaw(coreAPI(core), {
    jurisdiction,
    level: "state",
    series: "income-tax",
    value: 0,
    unit: "percent-flat",
    effectiveDate: addDays(makeIsoDate(core.date), 1),
    measureId: "fit-once-fixture-no-income-tax",
    citation:
      "Controlled fixture: a state that ends its income tax; not a played vote",
  });

describe("the moves between states fit once", () => {
  setBookkeeping(false);
  const place = drawTaxedPlace();
  const where = `${place.name} (${place.key}), seed ${place.seed}`;

  it("the fit runs once: the kept attractiveness is the same after 3 months and after 14", () => {
    const first = build(place.seed, place.key);
    const api = coreAPI(first);
    monthsOn(first, 3);
    const rt = runtimeOf(api)!;
    const kept = new Map(rt.attract);
    expect(kept.size, `${where}: states fitted`).toBeGreaterThan(50);
    monthsOn(first, 11);
    expect(rt.attract.size, where).toBe(kept.size);
    for (const [usps, value] of kept)
      expect(rt.attract.get(usps), `${where}: ${usps}`).toBe(value);
  }, 900_000);

  it("a state that ends its income tax is no longer pulled back to the survey: its people differ from the twin's, and the pull toward it is stronger", () => {
    const control = build(place.seed, place.key);
    const stateKey = lawChain(coreAPI(control)).stateKey;
    const usps = stateKey.slice("US-".length);
    const treated = build(place.seed, place.key);
    endTax(treated, stateKey);
    // What the tax itself does, read two days on, before either world's own
    // politics can change the law again (in Sweetwater, Idaho the untouched
    // world's legislature repealed the tax itself eighteen months in): from
    // another state, the income part of the pull toward this one is stronger
    // with the tax gone.
    const from = [...runtimeOf(coreAPI(control))!.states.keys()]
      .sort()
      .find((other) => other !== usps)!;
    const incomePull = (core: CoreState) => {
      const api = coreAPI(core);
      const rt = runtimeOf(api)!;
      rt.netCache.clear();
      return pullBetween(api, rt, from, usps, WAGES, stateUnemployment(api))
        .income;
    };
    for (const core of [control, treated])
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const [without, withLaw] = [incomePull(control), incomePull(treated)];
    expect(withLaw, `${where}: pull toward ${usps}`).toBeGreaterThan(without);
    const people = (core: CoreState) =>
      countedStatePeople(core, usps, core.date.slice(0, 7))!;
    const gaps: number[] = [];
    const lines: string[] = [];
    for (const months of [12, 12]) {
      monthsOn(control, months);
      monthsOn(treated, months);
      const a = people(control),
        b = people(treated);
      gaps.push(b - a);
      lines.push(
        `${control.date}: ${Math.round(a)} without, ${Math.round(b)} with no income tax`,
      );
    }
    process.stdout.write(
      `fit-once tax twin: ${where}; income pull from ${from} toward ${usps} ${without.toFixed(4)} without, ${withLaw.toFixed(4)} with no income tax; ${lines.join("; ")}\n`,
    );
    // The monthly re-fit forced the difference to exactly zero at every month.
    // Which way the people go is not asserted: ending the tax also cuts the
    // state's budget and the jobs it pays for, and in a small state that can
    // outweigh the pull (seen Nov 10 in Churchs Ferry, North Dakota).
    for (const [at, gap] of gaps.entries())
      expect(
        Math.abs(gap),
        `${where}: after ${12 * (at + 1)} months; ${lines.join("; ")}`,
      ).toBeGreaterThan(0.5);
  }, 1_800_000);

  it("another state's law reaches its pull", () => {
    const control = build(place.seed, place.key);
    const treated = build(place.seed, place.key);
    const home = lawChain(coreAPI(control)).stateKey;
    const other = [...runtimeOf(coreAPI(control))!.states.keys()]
      .sort()
      .map((usps) => `US-${usps}`)
      .find((key) => key !== home && taxed(control, key))!;
    expect(other, `${where}: another state that taxes income`).toBeDefined();
    endTax(treated, other);
    for (const core of [control, treated])
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const pull = (core: CoreState) => {
      const api = coreAPI(core);
      const rt = runtimeOf(api)!;
      rt.netCache.clear();
      return pullBetween(
        api,
        rt,
        rt.townState,
        other.slice("US-".length),
        WAGES,
        stateUnemployment(api),
      ).income;
    };
    const [without, withLaw] = [pull(control), pull(treated)];
    process.stdout.write(
      `fit-once other state: ${where}; income pull from ${rtTown(control)} toward ${other}: ${without.toFixed(4)} without, ${withLaw.toFixed(4)} with no income tax there\n`,
    );
    expect(withLaw, `${where}: pull toward ${other}`).toBeGreaterThan(without);
  }, 900_000);

  it("a restored world keeps the fit and the next month is the same", () => {
    const original = build(place.seed, place.key);
    monthsOn(original, 3);
    const saved = JSON.parse(JSON.stringify(snapshotWorld(original)));
    const loaded = build(place.seed, place.key);
    restoreWorld(loaded, saved);
    const kept = runtimeOf(coreAPI(original))!.attract;
    const back = runtimeOf(coreAPI(loaded))!.attract;
    expect(back.size, where).toBe(kept.size);
    for (const [usps, value] of kept)
      expect(back.get(usps), `${where}: ${usps}`).toBe(value);
    monthsOn(original, 1);
    monthsOn(loaded, 1);
    expect(countedMoves(coreAPI(loaded)), where).toEqual(
      countedMoves(coreAPI(original)),
    );
  }, 900_000);
});
