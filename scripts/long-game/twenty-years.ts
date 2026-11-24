/**
 * One long game on main: a place drawn from all 56, the played world
 * (`buildBenchWorld`, every module) advanced a year at a time, with a line a
 * year (seconds, heap after a collection, records kept, the sense checks).
 * It ends the run, with a non-zero exit, on a failed check, a thrown error or
 * the time limit before the last year, and its last line names the place,
 * the world seed, the year and the record or check. Development tooling.
 *
 *   npm run long-game -- [--seed <s>] [--years 20] [--place <key> --world-seed <seed>]
 *     [--max-minutes 330] [--out <rows.jsonl>] [--summary <table.md>]
 *
 * The place and world seed come from `drawPlace(seed, "twenty-years")`; the
 * result names both. To replay a red night, pass its place key and world seed.
 * Run node with `--expose-gc` so the heap is read after a collection.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { recordProof } from "../../src/bench/dev-proof";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { drawPlace } from "../core2-year/place";
import { recordsKept } from "../speed-years/compare";
import {
  SENSE_CHECK_IDS,
  readWorld,
  runSenseChecks,
  type SenseResult,
} from "./sense-checks";

export interface YearRow {
  readonly year: number;
  readonly date: string;
  readonly seconds: number;
  readonly heapMiB: number;
  readonly records: number;
  readonly checks: readonly SenseResult[];
}

export interface Game {
  readonly placeName: string;
  readonly placeKey: string;
  readonly worldSeed: string;
}

/** The place and world seed a run plays: a named replay, or the draw. */
export function chooseGame(options: {
  seed: string;
  place?: string;
  worldSeed?: string;
}): Game {
  const drawn = drawPlace(options.seed, "twenty-years");
  if (options.worldSeed && !options.place)
    throw new Error("--world-seed needs --place: a replay names both");
  const placeKey = options.place ?? drawn.key;
  return {
    placeName:
      placeKey === drawn.key
        ? drawn.name
        : (corePlaceByKey(placeKey)?.displayName ?? placeKey),
    placeKey,
    worldSeed: options.worldSeed ?? drawn.seed,
  };
}

const mib = (bytes: number) => Math.round(bytes / 1048576);

/** Why a run ended before its last year, naming the year and the record or check. */
export class LongGameFailure extends Error {
  constructor(
    readonly year: number,
    readonly what: string,
  ) {
    super(what);
  }
}

/**
 * Plays `years` years of a game, calling `onRow` with each year's row. Throws
 * a `LongGameFailure` on a failed check, a thrown error or the time limit.
 */
export function playYears(
  game: Game,
  years: number,
  onRow: (row: YearRow) => void,
  maxMinutes = Infinity,
): void {
  setBookkeeping(false);
  const began = performance.now();
  const world = buildBenchWorld(game.worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: game.placeKey,
  });
  for (let year = 1; year <= years; year += 1) {
    const yearBegan = performance.now();
    try {
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
    } catch (error) {
      const e = error as Error;
      throw new LongGameFailure(
        year,
        `crashed on ${world.core.date}: ${e.message} (${(e.stack ?? "").split("\n")[1]?.trim() ?? "no frame"})`,
      );
    }
    const seconds = Number(((performance.now() - yearBegan) / 1000).toFixed(1));
    // The proof's garbage goes before the heap is read, as speed:year does.
    const proof = recordProof(world.core);
    (globalThis as { gc?: () => void }).gc?.();
    const row: YearRow = {
      year,
      date: world.core.date,
      seconds,
      heapMiB: mib(process.memoryUsage().heapUsed),
      records: recordsKept(proof.tables),
      checks: runSenseChecks(readWorld(world.core)),
    };
    onRow(row);
    const failed = row.checks.find((c) => !c.ok);
    if (failed)
      throw new LongGameFailure(
        year,
        `check ${failed.id} failed on ${row.date}: ${failed.detail}`,
      );
    const minutes = (performance.now() - began) / 60000;
    if (year < years && minutes > maxMinutes)
      throw new LongGameFailure(
        year,
        `time limit of ${maxMinutes} minutes reached after year ${year}, before year ${years}`,
      );
  }
}

export const TABLE_HEADER = [
  `| Year | Date | Seconds | Heap MB | Records | ${SENSE_CHECK_IDS.join(" | ")} |`,
  `| --- | --- | --- | --- | --- | ${SENSE_CHECK_IDS.map(() => "---").join(" | ")} |`,
];

export function tableRow(row: YearRow): string {
  const cell = (id: string) => {
    const check = row.checks.find((c) => c.id === id);
    return check ? (check.ok ? "ok" : `FAIL: ${check.detail}`) : "-";
  };
  return `| ${row.year} | ${row.date} | ${row.seconds} | ${row.heapMiB} | ${row.records} | ${SENSE_CHECK_IDS.map(cell).join(" | ")} |`;
}

function main(): void {
  const args = process.argv.slice(2);
  const option = (name: string, fallback: string) => {
    const at = args.indexOf(`--${name}`);
    return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
  };
  const seed = option("seed", randomBytes(8).toString("hex"));
  const years = Number(option("years", "20"));
  const maxMinutes = Number(option("max-minutes", "330"));
  const out = option("out", "test-results/long-game/rows.jsonl");
  const summary = option("summary", process.env.GITHUB_STEP_SUMMARY ?? "");
  const game = chooseGame({
    seed,
    place: option("place", "") || undefined,
    worldSeed: option("world-seed", "") || undefined,
  });
  const who = `${game.placeName} (place ${game.placeKey}, world seed ${game.worldSeed}, run seed ${seed})`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, "");
  const write = (line: string) => {
    process.stdout.write(`${line}\n`);
    if (summary) appendFileSync(summary, `${line}\n`);
  };
  write(`### Long game: ${who}, ${years} years`);
  write("");
  for (const line of TABLE_HEADER) write(line);
  let failure: string | undefined;
  try {
    playYears(
      game,
      years,
      (row) => {
        appendFileSync(
          out,
          `${JSON.stringify({ ...game, runSeed: seed, ...row })}\n`,
        );
        write(tableRow(row));
      },
      maxMinutes,
    );
  } catch (error) {
    failure =
      error instanceof LongGameFailure
        ? `year ${error.year}: ${error.what}`
        : `before year 1: ${(error as Error).message}`;
    const year = error instanceof LongGameFailure ? error.year : 0;
    appendFileSync(
      out,
      `${JSON.stringify({ ...game, runSeed: seed, failed: true, year, what: failure })}\n`,
    );
  }
  write("");
  if (failure) {
    write(
      `FAILED place=${game.placeName} key=${game.placeKey} world-seed=${game.worldSeed} ${failure}`,
    );
    process.exitCode = 1;
  } else {
    write(
      `PASSED place=${game.placeName} key=${game.placeKey} world-seed=${game.worldSeed} years=${years}`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
