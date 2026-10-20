/**
 * The effect web's twin-world checker: for each cause the web's links read,
 * two worlds built the way the game builds them (buildBenchWorld, two-level
 * population, economy on) from the same seed and place, identical but for
 * that one cause, shifted in the record the web reads it from. After the
 * links' lags, every engine record kind is compared between the twins: which
 * record kinds moved, and how much the movement varies across places and
 * people. A twin pair built with no shift must match exactly, or the checker
 * proves nothing.
 *
 * It writes its findings to the effect matrix
 * (docs/reports/effect-web-matrix-2026-10-20.json, under `twins`) when
 * EFFECT_TWINS_WRITE is set. EFFECT_TWINS_CAUSES picks causes (comma list).
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { WORLD_METRICS_MODULE_ID } from "./modules/world-metrics";
import {
  derivedOf,
  engineMeasure,
  keptOutcome,
  WEB_LINKS,
  WIRED_INTO,
} from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.EFFECT_TWINS_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "effect-web-twins");
const MATRIX = "docs/reports/effect-web-matrix-2026-10-20.json";

/** A cause and how far the twin shifts it: points in the web's unit, or a share of its level. */
interface Shift {
  readonly measure: string;
  readonly by?: number;
  readonly relative?: number;
}
/**
 * The non-law causes of the links the web runs. Laws are LAW-WIRING's; each
 * law's own reach test shifts the law itself.
 */
const RUNNING_FROM = [
  ...new Set(
    [...WIRED_INTO.values()]
      .flat()
      .map((link) => derivedOf(link.from)?.measure ?? link.from)
      .filter((measure) => !measure.startsWith("law:")),
  ),
].sort();
/** A shift a few times a typical year's move: a 3-point jump in unemployment, a tenth of a kept outcome. */
const shiftOf = (measure: string): Shift =>
  measure === "labor.unemployment-pct"
    ? { measure, by: 3 }
    : { measure, relative: 0.1 };
const moveBy = (cause: Shift, value: number) =>
  cause.by ?? value * (cause.relative ?? 0);
const CHOSEN = process.env.EFFECT_TWINS_CAUSES?.split(",").filter(Boolean);
const CAUSES = (CHOSEN ?? RUNNING_FROM).map(shiftOf);
const MONTHS = Number(process.env.EFFECT_TWINS_MONTHS || 4);

/** Every record a played world keeps, as counts and sums by kind. */
function fingerprint(core: CoreState): Map<string, number> {
  const out = new Map<string, number>();
  for (const [kind, ids] of core.logByKind) out.set(`log:${kind}`, ids.size);
  for (const [name, value] of Object.entries(core))
    if (value instanceof Map) out.set(`core:${name}`, value.size);
  const api = coreAPI(core);
  for (const id of core.modules.keys()) {
    if (id === OUTCOME_WEB_MODULE_ID) continue;
    const tables = core.modules.get(id)!.state?.tables ?? {};
    for (const table of Object.keys(tables)) {
      const rows = api.moduleState(id).table(table).rows();
      out.set(`${id}/${table}:rows`, rows.length);
      let sum = 0;
      for (const row of rows)
        for (const value of Object.values(row))
          if (typeof value === "number" && Number.isFinite(value)) sum += value;
      out.set(`${id}/${table}:sum`, sum);
    }
  }
  return out;
}

/**
 * Shift a cause in the record the web reads it from: an engine measure in
 * the economy's month rows (written on the 2nd, read on the 3rd), a kept
 * outcome in the web's own month row (read by the links the month after).
 */
function shift(core: CoreState, cause: Shift): string[] {
  const api = coreAPI(core);
  const month = core.date.slice(0, 7);
  const touched: string[] = [];
  const engine = engineMeasure(cause.measure);
  if (engine) {
    const table = api.moduleState(WORLD_METRICS_MODULE_ID).table("months");
    for (const row of table.rows() as unknown as Record<string, unknown>[]) {
      if (!String(row.date).startsWith(month)) continue;
      const value = row[engine.field];
      if (typeof value !== "number") continue;
      table.put({
        ...row,
        [engine.field]:
          value + moveBy(cause, value * engine.unitScale) / engine.unitScale,
      } as never);
      touched.push(String(row.id));
    }
    return touched;
  }
  if (keptOutcome(cause.measure)) {
    const table = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    for (const row of table.rows() as unknown as WebMonth[]) {
      if (row.month !== month || row.values[cause.measure] === undefined)
        continue;
      table.put({
        ...row,
        values: {
          ...row.values,
          [cause.measure]:
            row.values[cause.measure]! +
            moveBy(cause, row.values[cause.measure]!),
        },
      } as never);
      touched.push(row.id);
    }
  }
  return touched;
}

/** Play a world the given months, shifting the cause each month at the moment the web reads it. */
function play(cause: Shift | null) {
  const opening = gameStartDate();
  const world = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const touched: string[] = [];
  let day = makeIsoDate(opening);
  const end = addDays(day, MONTHS * 31);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    if (!cause) continue;
    const dom = Number(day.slice(8, 10));
    // Engine rows are written on the 2nd; the web's own rows on the 3rd.
    if (engineMeasure(cause.measure) ? dom === 2 : dom === 3)
      touched.push(...shift(core, cause));
  }
  return { core, touched };
}

function diff(a: Map<string, number>, b: Map<string, number>) {
  const moved: { record: string; control: number; shifted: number }[] = [];
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(key) ?? 0,
      y = b.get(key) ?? 0;
    if (Math.abs(x - y) > 1e-9 * Math.max(1, Math.abs(x)))
      moved.push({ record: key, control: x, shifted: y });
  }
  return moved.sort((p, q) => p.record.localeCompare(q.record));
}

describe(`the effect web's twin worlds (${place.name}, ${place.state}, seed ${seed})`, () => {
  it("shifts each running cause and reports which engine records moved", () => {
    const started = Date.now();
    const control = fingerprint(play(null).core);
    const again = fingerprint(play(null).core);
    // The checker needs twins that match exactly when nothing is shifted.
    const noise = diff(control, again);
    expect(noise, "unshifted twins differ").toEqual([]);
    const results = [];
    for (const cause of CAUSES) {
      const shifted = play(cause);
      expect(shifted.touched.length, cause.measure).toBeGreaterThan(0);
      const moved = diff(control, fingerprint(shifted.core));
      const links = WEB_LINKS.filter(
        (link) => (derivedOf(link.from)?.measure ?? link.from) === cause.measure,
      ).map((link) => link.key);
      results.push({
        cause: cause.measure,
        shiftedBy: cause.by ?? `${(cause.relative ?? 0) * 100}% of its level`,
        shiftedRecords: shifted.touched.slice(0, 3),
        links,
        movedRecordKinds: moved,
      });
    }
    const twins = {
      seed,
      place: `${place.name}, ${place.state} (${place.key})`,
      months: MONTHS,
      seconds: Math.round((Date.now() - started) / 1000),
      results,
    };
    if (process.env.EFFECT_TWINS_WRITE) {
      const matrix = JSON.parse(readFileSync(MATRIX, "utf8"));
      writeFileSync(MATRIX, `${JSON.stringify({ ...matrix, twins }, null, 2)}\n`);
    }
    console.log(JSON.stringify(twins, null, 2));
    expect(results.length).toBeGreaterThan(0);
  }, 3_600_000);
});
