// @vitest-environment node
/**
 * Every registered figure is traceable from dev mode (owner, Nov 16, 2026: "every figure should be
 * traceable from dev mode"; CTO, crew line #9747, Nov 17): in a drawn played world, each figure in
 * the registry (src/core2/data/output-numbers.json) opens in the one Trace box. A figure a screen
 * shows has its value, the record it was read from and a dated history; a figure only the outcome
 * web reads names the engine record it is read from. A figure added to the registry with no trace
 * fails here.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { lawChain } from "../core2/modules/laws";
import { OUTPUT_NUMBERS } from "../core2/output-numbers";
import { coreAPI } from "../core2/state";
import { traceNode } from "./dev-trace";
import { figureList, figureTraceId } from "./dev-views/figure-trace";
import { buildBenchWorld } from "./world";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "figure-trace");

it(`every registered figure opens a trace in dev mode: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    // Two monthly closes, so a monthly figure has months behind it.
    advanceCore(world.core, addDays(makeIsoDate(api.state.date), 62));
    const town = lawChain(api).townPlaceId;
    const missing: string[] = [];
    const shown: string[] = [];
    for (const number of OUTPUT_NUMBERS) {
      // Every figure is kept, read from its owner's record, or read by the web from a named record.
      if (!number.kept && !number.reader && !number.web) {
        missing.push(`${number.id}: no kept field, reader or web record`);
        continue;
      }
      const node = traceNode(
        world.core,
        undefined,
        figureTraceId(number.id, town),
      );
      if (node.kind !== "figure" || node.answer === "not-a-record") {
        missing.push(`${number.id}: the trace did not open`);
        continue;
      }
      const record = node.record as { now: number | null };
      if (number.metrics && !number.metrics.waitsOn && record.now !== null) {
        shown.push(number.id);
        if (!node.children.some((c) => c.kind === "record"))
          missing.push(`${number.id}: no record it was read from`);
        const history = node.children.find((c) => c.id.endsWith("#history"));
        if (!history || !(history.value as unknown[]).length)
          missing.push(`${number.id}: no history`);
      }
      if (record.now === null && !node.gap && node.answer !== "caused")
        missing.push(`${number.id}: empty, and the trace does not say why`);
    }
    expect(missing).toEqual([]);
    // The Metrics screen's figures that hold a value were all traced to a record and a history.
    expect(shown.length).toBeGreaterThan(5);
    // The state's unemployment rate shows what it is out of, month by month.
    const state = traceNode(
      world.core,
      undefined,
      figureTraceId("state.unemployment-pct", town),
    );
    const names = state.children.map((c) => c.via);
    expect(names).toContain("input workers");
    expect(names).toContain("input seekers");
    const months = state.children.find((c) => c.id.endsWith("#history"))!
      .value as { inputs?: { workers: number; seekers: number } }[];
    expect(months.length).toBeGreaterThan(0);
    for (const month of months) {
      expect(month.inputs!.workers).toBeGreaterThan(0);
      expect(month.inputs!.seekers).toBeGreaterThanOrEqual(0);
    }
    // Dev mode's list names every registered figure, each with its trace id.
    expect(
      figureList(world.core)
        .map((row) => row.id)
        .sort(),
    ).toEqual(OUTPUT_NUMBERS.map((n) => n.id).sort());
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        through: world.core.date,
        figures: OUTPUT_NUMBERS.length,
        shownWithValue: shown.length,
        stateUnemployment: (state.record as { now: number | null }).now,
        stateMonths: months.length,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 300_000);
