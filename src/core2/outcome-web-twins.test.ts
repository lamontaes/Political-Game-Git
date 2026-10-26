/**
 * The effect web's twin-world checker: for each cause the web's links read,
 * two worlds built the way the game builds them (buildBenchWorld, two-level
 * population, economy on) from the same seed and place, identical but for
 * that one cause, shifted in the record the web reads it from. After the
 * links' lags, every engine record kind is compared between the twins: which
 * record kinds moved, and how much the movement varies across places and
 * people, with up to three ids of the records that differ in each. A twin pair built with no shift must match exactly, or the checker
 * proves nothing.
 *
 * It writes its findings to the effect matrix
 * (docs/reports/effect-web-matrix-2026-10-20.json, under `twins`) when
 * EFFECT_TWINS_WRITE is set. EFFECT_TWINS_CAUSES picks causes (comma list);
 * EFFECT_TWINS_OUT names a file to write this run's findings to instead.
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
import { GOV_MEASURES } from "./gov-measure-keys";
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
/**
 * Causes read through a named reader (a law value) have no record row to
 * shift, nor do the government's measures, which its engine computes from the
 * budgets, races and wage floor on the day the web asks; a budget or law test
 * moves those records themselves.
 */
const CAUSES = (CHOSEN ?? RUNNING_FROM)
  .filter(
    (measure) =>
      !(engineMeasure(measure) as { reader?: string } | undefined)?.reader &&
      !(GOV_MEASURES as readonly string[]).includes(measure),
  )
  .map(shiftOf);
const MONTHS = Number(process.env.EFFECT_TWINS_MONTHS || 4);

/**
 * Add up every leaf of a row, nested objects and lists included: numbers into
 * `sum`, and the text of every string (a cause of death, a reason) into
 * `text` as a checksum, so a changed label moves the record kind too.
 */
function leaves(value: unknown, into: { sum: number; text: number }): void {
  if (typeof value === "number") {
    if (Number.isFinite(value)) into.sum += value;
  } else if (typeof value === "string") {
    into.text = (into.text + hashText(value)) % 2 ** 32;
  } else if (Array.isArray(value)) {
    for (const item of value) leaves(item, into);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) leaves(item, into);
  }
}

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
      const seen = { sum: 0, text: 0 };
      for (const row of rows) leaves(row, seen);
      out.set(`${id}/${table}:sum`, seen.sum);
      out.set(`${id}/${table}:text`, seen.text);
    }
  }
  return out;
}

/**
 * Shift a cause in the record the web reads it from: an engine measure in
 * the economy's month rows (written on the 2nd, read on the 3rd), a kept
 * outcome or a government measure in the web's own month row (read by the
 * links the month after).
 */
function shift(core: CoreState, cause: Shift): string[] {
  const api = coreAPI(core);
  const month = core.date.slice(0, 7);
  const touched: string[] = [];
  const engine = engineMeasure(cause.measure) as
    | (ReturnType<typeof engineMeasure> & { module?: string; table?: string })
    | undefined;
  if (engine) {
    // An engine that keeps its own month rows (the crime records) is shifted
    // in its latest row; the economy's rows in this month's.
    const own = engine.module !== undefined;
    const table = api
      .moduleState(engine.module ?? WORLD_METRICS_MODULE_ID)
      .table(engine.table ?? "months");
    const rows = table.rows() as unknown as Record<string, unknown>[];
    const latest = rows.reduce(
      (max, row) => (String(row.date) > max ? String(row.date) : max),
      "",
    );
    for (const row of rows) {
      if (own ? row.date !== latest : !String(row.date).startsWith(month))
        continue;
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
  // A kept outcome, or a government measure the web writes into its month
  // row from the engines' records (a budget line): both are read from the row.
  if (
    keptOutcome(cause.measure) ||
    (GOV_MEASURES as readonly string[]).includes(cause.measure)
  ) {
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

/**
 * How many of the town's records hold a value for a cause: the engine's rows
 * with the field, or the web's month rows with the kept outcome. A town with
 * none (no parks line in a place no city governs) has no cause there to shift.
 */
function heldBy(core: CoreState, cause: Shift): string[] {
  const api = coreAPI(core);
  const engine = engineMeasure(cause.measure) as
    | (ReturnType<typeof engineMeasure> & { module?: string; table?: string })
    | undefined;
  if (engine)
    return (
      api
        .moduleState(engine.module ?? WORLD_METRICS_MODULE_ID)
        .table(engine.table ?? "months")
        .rows() as unknown as Record<string, unknown>[]
    )
      .filter((row) => typeof row[engine.field] === "number")
      .map((row) => String(row.id));
  return (
    api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .rows() as unknown as WebMonth[]
  )
    .filter((row) => row.values[cause.measure] !== undefined)
    .map((row) => row.id);
}

/** The date stamped on this month's web rows (they all carry the day the web last ran). */
function webRowDate(core: CoreState): string {
  const month = core.date.slice(0, 7);
  let latest = "";
  for (const row of coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as WebMonth[])
    if (row.month === month && row.date > latest) latest = row.date;
  return latest;
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
  // The web rewrites its month row whenever a law takes effect, which drops a
  // shift made earlier; the web's own rows are shifted again after each
  // rewrite (a rewrite carries a new `date`), from the 3rd on.
  const shiftedRows = new Set<string>();
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    if (!cause) continue;
    const dom = Number(day.slice(8, 10));
    if (engineMeasure(cause.measure)) {
      // Engine rows are written on the 2nd.
      if (dom === 2) touched.push(...shift(core, cause));
      continue;
    }
    if (dom < 3) continue;
    const stamp = `${day.slice(0, 7)}|${webRowDate(core)}`;
    if (shiftedRows.has(stamp)) continue;
    const moved = shift(core, cause);
    if (moved.length) shiftedRows.add(stamp);
    touched.push(...moved);
  }
  return { core, touched };
}

/** A hash of a record's text, so a world's records can be compared without keeping the world. */
function hashText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1)
    h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * One kind of record in a played world, by id: a module table's rows with a
 * hash of each row's content, or a core map's keys.
 */
function recordsOf(core: CoreState, kind: string): Map<string, number> | null {
  if (kind.startsWith("core:")) {
    const map = (core as unknown as Record<string, Map<string, unknown>>)[
      kind.slice("core:".length)
    ];
    return new Map([...(map?.keys() ?? [])].map((key) => [String(key), 0]));
  }
  if (!kind.includes("/")) return null;
  const [module, table] = kind.split("/") as [string, string];
  return new Map(
    (
      coreAPI(core).moduleState(module).table(table).rows() as unknown as {
        id?: unknown;
      }[]
    ).map((row) => [String(row.id), hashText(JSON.stringify(row))]),
  );
}

/** Every kind of record the twin check compares, by id, from the control world. */
function digest(core: CoreState): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const [name, value] of Object.entries(core))
    if (value instanceof Map)
      out.set(`core:${name}`, recordsOf(core, `core:${name}`)!);
  for (const id of core.modules.keys()) {
    if (id === OUTCOME_WEB_MODULE_ID) continue;
    for (const table of Object.keys(core.modules.get(id)!.state?.tables ?? {}))
      out.set(`${id}/${table}`, recordsOf(core, `${id}/${table}`)!);
  }
  return out;
}

/**
 * Up to three ids of the records that differ between the twins, for each
 * module table and core map that moved: a row changed, added or gone (for a
 * core map, an entry added or gone).
 */
function changedIds(
  control: ReadonlyMap<string, ReadonlyMap<string, number>>,
  b: CoreState,
  moved: readonly { record: string }[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const kinds = new Set(
    moved.map((m) => m.record.replace(/:(rows|sum|text)$/, "")),
  );
  for (const kind of kinds) {
    const y = recordsOf(b, kind);
    if (!y) continue;
    const x = control.get(kind) ?? new Map<string, number>();
    const ids: string[] = [];
    for (const id of new Set([...x.keys(), ...y.keys()])) {
      if (x.get(id) !== y.get(id)) ids.push(id);
      if (ids.length >= 3) break;
    }
    if (ids.length) out[kind] = ids;
  }
  return out;
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
  it(
    "shifts each running cause and reports which engine records moved",
    () => {
      const started = Date.now();
      // The control world is kept as counts, sums and a hash per record, so
      // only one world is held at a time.
      const { control, controlRecords } = (() => {
        const core = play(null).core;
        return { control: fingerprint(core), controlRecords: digest(core) };
      })();
      const again = fingerprint(play(null).core);
      // The checker needs twins that match exactly when nothing is shifted.
      const noise = diff(control, again);
      expect(noise, "unshifted twins differ").toEqual([]);
      const results = [];
      const absent: string[] = [];
      for (const cause of CAUSES) {
        const shifted = play(cause);
        // A cause the twin could not shift is one the town's own records
        // never hold: read from them, never assumed.
        if (!shifted.touched.length) {
          expect(heldBy(shifted.core, cause), cause.measure).toEqual([]);
          absent.push(cause.measure);
          continue;
        }
        const moved = diff(control, fingerprint(shifted.core));
        const movedRecords = changedIds(controlRecords, shifted.core, moved);
        const links = WEB_LINKS.filter(
          (link) =>
            (derivedOf(link.from)?.measure ?? link.from) === cause.measure,
        ).map((link) => link.key);
        results.push({
          cause: cause.measure,
          shiftedBy: cause.by ?? `${(cause.relative ?? 0) * 100}% of its level`,
          shiftedRecords: shifted.touched.slice(0, 3),
          links,
          movedRecordKinds: moved,
          movedRecords,
        });
      }
      const twins = {
        seed,
        place: `${place.name}, ${place.state} (${place.key})`,
        months: MONTHS,
        seconds: Math.round((Date.now() - started) / 1000),
        // Causes the town holds no record of, so none could be shifted here.
        absent,
        results,
      };
      if (process.env.EFFECT_TWINS_WRITE) {
        const matrix = JSON.parse(readFileSync(MATRIX, "utf8"));
        writeFileSync(
          MATRIX,
          `${JSON.stringify({ ...matrix, twins }, null, 2)}\n`,
        );
      }
      if (process.env.EFFECT_TWINS_OUT)
        writeFileSync(
          process.env.EFFECT_TWINS_OUT,
          `${JSON.stringify(twins, null, 2)}\n`,
        );
      console.log(JSON.stringify(twins, null, 2));
      expect(results.length).toBeGreaterThan(0);
    },
    Math.max(3_600_000, MONTHS * 1_200_000),
  ); // about 20 minutes a played month for the twins of every cause
});
