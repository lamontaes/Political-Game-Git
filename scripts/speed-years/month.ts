import type * as Serialization from "../../src/simulation/serialization";
import type * as Canonical from "../../src/simulation/canonical-json";
import type * as Observer from "../../src/presentation/observer-world";
import type * as Aging from "../dev-lab/world-aging";
/** One real watched month, with an explicit people/decision/event comparison. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

export interface MonthDecision {
  readonly key: string;
  readonly choice: string | null;
  readonly hash: string;
  readonly sequence: number;
  readonly cutoffSequence: number;
}
export interface MonthEvent {
  readonly key: string;
  readonly hash: string;
  readonly sequence: number;
}
export interface MonthReceipt {
  readonly seed: string;
  readonly place: string;
  readonly days: number;
  readonly head: string;
  readonly seconds: number;
  /** One normal, untimed-by-profiler sample for each measured day 2–31. */
  readonly dailySeconds: readonly number[];
  readonly date: string;
  readonly fingerprint: string;
  readonly people: readonly { readonly id: string; readonly hash: string }[];
  readonly decisions: readonly MonthDecision[];
  readonly events: readonly MonthEvent[];
}

/** Only history positions may differ under the owner's batch exception. */
export function withoutHistoryPositions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutHistoryPositions);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) => key !== "sequence" && key !== "historySequenceExclusive",
        )
        .map(([key, entry]) => [key, withoutHistoryPositions(entry)]),
    );
  }
  return value;
}

export function compareMonth(before: MonthReceipt, after: MonthReceipt) {
  const errors: string[] = [];
  for (const key of ["seed", "place", "days", "date"] as const)
    if (before[key] !== after[key]) errors.push(`${key} differs`);
  if (before.dailySeconds.length !== 30 || after.dailySeconds.length !== 30)
    errors.push("Both runs must contain 30 measured days (days 2–31)");
  const beforeMean =
    before.dailySeconds.reduce((sum, seconds) => sum + seconds, 0) /
    before.dailySeconds.length;
  const afterMean =
    after.dailySeconds.reduce((sum, seconds) => sum + seconds, 0) /
    after.dailySeconds.length;
  if (!(afterMean < beforeMean))
    errors.push(
      `Days 2–31 mean ${afterMean.toFixed(6)}s/day is not below main ${beforeMean.toFixed(6)}s/day`,
    );
  if (JSON.stringify(before.people) !== JSON.stringify(after.people))
    errors.push("People, their facts, appearances or person order differ");
  if (before.decisions.length !== after.decisions.length)
    errors.push("Decision count differs");
  for (let index = 0; index < after.decisions.length; index += 1) {
    const row = after.decisions[index]!;
    const prior = before.decisions[index];
    if (
      !prior ||
      prior.key !== row.key ||
      prior.choice !== row.choice ||
      prior.hash !== row.hash ||
      prior.sequence !== row.sequence ||
      prior.cutoffSequence !== row.cutoffSequence
    )
      errors.push(`Decision ${row.key} differs in facts, order, or cutoff`);
  }
  if (before.events.length !== after.events.length)
    errors.push("Event count differs");
  for (let index = 0; index < after.events.length; index += 1) {
    const row = after.events[index]!;
    const prior = before.events[index];
    if (
      !prior ||
      prior.key !== row.key ||
      prior.hash !== row.hash ||
      prior.sequence !== row.sequence
    )
      errors.push(`Event ${row.key} differs in facts or order`);
  }
  return {
    errors,
    baselineMeanSecondsPerDay: beforeMean,
    candidateMeanSecondsPerDay: afterMean,
    meanReductionPercent:
      beforeMean > 0 ? ((beforeMean - afterMean) / beforeMean) * 100 : null,
    fingerprintsIdentical: before.fingerprint === after.fingerprint,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const option = (key: string, fallback?: string) => {
    const at = args.indexOf(`--${key}`);
    return at < 0 ? fallback : args[at + 1];
  };
  const root = option("root", process.cwd())!;
  const seed = option("seed", "b18-f375512c")!;
  const place = option("place", "4272168")!;
  const out = option("out");
  if (!out) throw new Error("Provide --out <receipt.json>");
  const { openWatchedWorld } = (await import(
    `${root}/scripts/dev-lab/world-aging.ts`
  )) as typeof Aging;
  const { advanceObservedWorld } = (await import(
    `${root}/src/presentation/observer-world.ts`
  )) as typeof Observer;
  const { canonicalJson } = (await import(
    `${root}/src/simulation/canonical-json.ts`
  )) as typeof Canonical;
  const { serializeWorldPayload } = (await import(
    `${root}/src/simulation/serialization.ts`
  )) as typeof Serialization;
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  let world = openWatchedWorld(seed, place).world;
  console.log(
    `head=${head} seed=${seed} place=${place} from=${world.currentDate}`,
  );
  // Day 1 is the same warm-up action in both runs. Time only the ordinary
  // daily steps that the assigned speed gate compares: days 2 through 31.
  const firstDay = advanceObservedWorld(world, 1);
  if (firstDay.currentDate <= world.currentDate)
    throw new Error("The observer did not complete day 1");
  world = firstDay;
  const measuredFromDate = world.currentDate;
  const dailySeconds: number[] = [];
  for (let day = 2; day <= 31; day += 1) {
    const dayBegan = performance.now();
    const next = advanceObservedWorld(world, 1);
    const daySeconds = (performance.now() - dayBegan) / 1000;
    if (next.currentDate <= world.currentDate)
      throw new Error(`The observer did not complete day ${day}`);
    dailySeconds.push(daySeconds);
    world = next;
  }
  const next = world;
  const seconds = dailySeconds.reduce((sum, day) => sum + day, 0);
  if (
    (Date.parse(next.currentDate) - Date.parse(measuredFromDate)) / 86400000 !==
    30
  )
    throw new Error("The observer did not complete all 30 days");
  console.log(
    `Days 2–31 mean: ${(seconds / dailySeconds.length).toFixed(6)}s/day; total ${seconds.toFixed(3)}s through ${next.currentDate}`,
  );
  const hash = (value: unknown) =>
    createHash("sha256").update(canonicalJson(value)).digest("hex");
  const payload = serializeWorldPayload(next);
  const fingerprint = createHash("sha256");
  for (const chunk of typeof payload === "string" ? [payload] : payload)
    fingerprint.update(chunk);
  const receipt: MonthReceipt = {
    seed,
    place,
    days: 30,
    head,
    seconds,
    dailySeconds,
    date: next.currentDate,
    fingerprint: fingerprint.digest("hex"),
    people: next.personOrder.map((id) => ({ id, hash: hash(next.people[id]) })),
    decisions: next.history.decisionTraces.map((row) => ({
      key: row.stableKey,
      choice: row.selectedOptionKey,
      hash: hash(withoutHistoryPositions(row)),
      sequence: row.sequence,
      cutoffSequence: row.context.cutoff.historySequenceExclusive,
    })),
    events: next.history.events.map((row) => ({
      key: row.stableKey,
      hash: hash(withoutHistoryPositions(row)),
      sequence: row.sequence,
    })),
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(receipt));
  const before = option("before");
  if (before) {
    const comparison = compareMonth(
      JSON.parse(readFileSync(before, "utf8")) as MonthReceipt,
      receipt,
    );
    writeFileSync(`${out}.comparison.json`, JSON.stringify(comparison));
    console.log(
      JSON.stringify({
        errors: comparison.errors,
        baselineMeanSecondsPerDay: comparison.baselineMeanSecondsPerDay,
        candidateMeanSecondsPerDay: comparison.candidateMeanSecondsPerDay,
        meanReductionPercent: comparison.meanReductionPercent,
        fingerprintsIdentical: comparison.fingerprintsIdentical,
        people: receipt.people.length,
        decisions: receipt.decisions.length,
        events: receipt.events.length,
      }),
    );
    if (comparison.errors.length) throw new Error(comparison.errors.join("\n"));
  }
  const limit = option("limit");
  if (limit && seconds >= Number(limit))
    throw new Error(`Month ${seconds.toFixed(3)}s must be below ${limit}s`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
