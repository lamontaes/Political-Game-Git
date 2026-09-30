/** 30-day watched-world steps; SHA-256 of the real saved payload each year. */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  closeSync,
  openSync,
  readSync,
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { StringDecoder } from "node:string_decoder";
import { hostname } from "node:os";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { advanceObservedWorld } from "../../src/presentation/observer-world";
import {
  deserializeWorld,
  serializeWorldPayload,
} from "../../src/simulation/serialization";
import type { WorldPayload } from "../../src/simulation/serialization";
import { anniversary, openWatchedWorld } from "../dev-lab/world-aging";
import { compareYears, type SpeedReceipt, type YearTiming } from "./compare";

const args = process.argv.slice(2);
function option(name: string, fallback?: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  if (at < 0) return fallback;
  const value = args[at + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`--${name} needs a value`);
  return value;
}
function positive(name: string, fallback: string): number {
  const value = Number(option(name, fallback));
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`--${name} must be a positive integer`);
  return value;
}
function save(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
}

/** Read a large save without first making one oversized JavaScript string. */
function readPayload(path: string): WorldPayload {
  const file = openSync(path, "r");
  const buffer = Buffer.alloc(16 * 1024 * 1024);
  const decoder = new StringDecoder("utf8");
  const chunks: string[] = [];
  try {
    for (;;) {
      const length = readSync(file, buffer, 0, buffer.length, null);
      if (length === 0) break;
      chunks.push(decoder.write(buffer.subarray(0, length)));
    }
    const end = decoder.end();
    if (end) chunks.push(end);
    return chunks.length === 1 ? chunks[0]! : chunks;
  } finally {
    closeSync(file);
  }
}

export async function main(): Promise<void> {
  const seed = option("seed", "b18-f375512c")!;
  const place = option("place", "4272168")!;
  const years = positive("years", "3");
  const stepDays = 30;
  const from = option("from");
  const checkpoint = from
    ? (JSON.parse(readFileSync(`${from}.meta.json`, "utf8")) as {
        seed: string;
        place: string;
        start: string;
        year: number;
      })
    : null;
  if (checkpoint && (checkpoint.seed !== seed || checkpoint.place !== place))
    throw new Error("Checkpoint seed/place differs from this run");
  let world =
    checkpoint && from
      ? deserializeWorld(readPayload(from))
      : openWatchedWorld(seed, place).world;
  const start = checkpoint?.start ?? world.currentDate;
  if (
    checkpoint &&
    world.currentDate !==
      anniversary(start as typeof world.currentDate, checkpoint.year)
  )
    throw new Error("Checkpoint date does not match its completed year");
  const first = (checkpoint?.year ?? 0) + 1;
  if (first > years)
    throw new Error("Checkpoint is already past the requested years");
  const rows: YearTiming[] = [];
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const mainHead = execFileSync("git", ["rev-parse", "origin/main"], {
    encoding: "utf8",
  }).trim();
  const changedSource = spawnSync("git", [
    "diff",
    "--quiet",
    "origin/main",
    "--",
    "src",
    "data",
  ]);
  if (changedSource.status !== 0 && changedSource.status !== 1)
    throw new Error("Could not verify benchmark source against main");
  const untrackedSource = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "--", "src", "data"],
    { encoding: "utf8" },
  ).trim();
  const sourceMain =
    changedSource.status === 0 && !untrackedSource ? mainHead : null;
  const exclusive = args.includes("--exclusive");
  const coordinated = args.includes("--coordinated");
  console.log(
    `head=${head} seed=${seed} place=${place} stepDays=${stepDays} exclusive=${exclusive} coordinated=${coordinated}`,
  );
  for (let year = first; year <= years; year += 1) {
    const through = anniversary(start as typeof world.currentDate, year);
    const began = performance.now();
    while (world.currentDate < through) {
      const daysLeft = Math.round(
        (Date.parse(through) - Date.parse(world.currentDate)) / 86400000,
      );
      const next = advanceObservedWorld(world, Math.min(stepDays, daysLeft));
      if (next.currentDate <= world.currentDate)
        throw new Error("The observer clock stopped");
      world = next;
    }
    const seconds = (performance.now() - began) / 1000;
    const payload = serializeWorldPayload(world);
    const hash = createHash("sha256");
    for (const chunk of typeof payload === "string" ? [payload] : payload)
      hash.update(chunk);
    const row: YearTiming = {
      year,
      seconds,
      date: world.currentDate,
      fingerprint: hash.digest("hex"),
    };
    rows.push(row);
    console.log(
      `${year}\t${seconds.toFixed(3)}s\t${row.date}\t${row.fingerprint}`,
    );
    const receipt: SpeedReceipt = {
      seed,
      place,
      stepDays,
      head,
      sourceMain,
      host: hostname(),
      exclusive,
      coordinated,
      rows,
    };
    const out = option("out");
    if (out) save(out, receipt);
    const keep = option("checkpoint");
    if (keep && year === Number(option("checkpoint-year", String(years)))) {
      mkdirSync(dirname(keep), { recursive: true });
      const chunks = typeof payload === "string" ? [payload] : payload;
      writeFileSync(keep, chunks[0]!);
      for (let at = 1; at < chunks.length; at += 1)
        appendFileSync(keep, chunks[at]!);
      save(`${keep}.meta.json`, { seed, place, start, year });
    }
  }
  const baseline = option("baseline");
  if (baseline) {
    const before = JSON.parse(readFileSync(baseline, "utf8")) as SpeedReceipt;
    const problems = compareYears(
      before,
      {
        seed,
        place,
        stepDays,
        head,
        sourceMain,
        host: hostname(),
        exclusive,
        coordinated,
        rows,
      },
      args.includes("--identical"),
    );
    if (problems.length) throw new Error(problems.join("\n"));
  }
  if (args.includes("--target")) {
    const firstYear = rows.find((row) => row.year === 1);
    const second = rows.find((row) => row.year === 2);
    if (!firstYear || !second || !(exclusive || coordinated))
      throw new Error("Target requires two coordinated years from the opening");
    if (firstYear.seconds >= 60)
      throw new Error("Year 1 must take less than 60 seconds");
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
