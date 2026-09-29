/** 30-day watched-world steps; SHA-256 of the real saved payload each year. */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export async function main(): Promise<void> {
  const seed = option("seed", "b18-f375512c")!;
  const place = option("place", "4272168")!;
  const years = positive("years", "3");
  const stepDays = 30;
  const from = option("from");
  const checkpoint = from
    ? (JSON.parse(readFileSync(from, "utf8")) as {
        seed: string;
        place: string;
        start: string;
        year: number;
        payload: WorldPayload;
      })
    : null;
  if (checkpoint && (checkpoint.seed !== seed || checkpoint.place !== place))
    throw new Error("Checkpoint seed/place differs from this run");
  let world = checkpoint
    ? deserializeWorld(checkpoint.payload)
    : openWatchedWorld(seed, place).world;
  const start = checkpoint?.start ?? world.currentDate;
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
  console.log(
    `head=${head} seed=${seed} place=${place} stepDays=${stepDays} exclusive=${exclusive}`,
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
      rows,
    };
    const out = option("out");
    if (out) save(out, receipt);
    const keep = option("checkpoint");
    if (keep && year === Number(option("checkpoint-year", String(years))))
      save(keep, { seed, place, start, year, payload });
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
        rows,
      },
      args.includes("--identical"),
    );
    if (problems.length) throw new Error(problems.join("\n"));
  }
  if (args.includes("--target")) {
    const firstYear = rows.find((row) => row.year === 1);
    const tenth = rows.find((row) => row.year === 10);
    if (!firstYear || !tenth || !exclusive)
      throw new Error(
        "Target requires an exclusive 10-year run from the opening",
      );
    if (tenth.seconds > firstYear.seconds * 2)
      throw new Error("Year 10 exceeds twice year 1");
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
