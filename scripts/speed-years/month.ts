import type * as Serialization from "../../src/simulation/serialization";
import type * as Canonical from "../../src/simulation/canonical-json";
import type * as Observer from "../../src/presentation/observer-world";
import type * as Aging from "../dev-lab/world-aging";
/** One real watched month, with an explicit people/decision/event comparison. */
import { createHash } from "node:crypto";
import { cpuUsage } from "node:process";
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
  readonly dailyCpuSeconds: readonly number[];
  readonly executionId: string;
  readonly initialAction: {
    readonly actionNumber: 0;
    readonly date: string;
    readonly decisions: readonly MonthDecision[];
    readonly appendedPayloadDigest: string;
  };
  readonly actionDays: readonly {
    readonly day: number;
    readonly date: string;
    readonly actionNumbers: readonly number[];
    readonly decisions: readonly MonthDecision[];
    readonly appendedPayloadDigest: string;
  }[];
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
  const beforeCpuMean =
    before.dailyCpuSeconds.reduce((sum, cpu) => sum + cpu, 0) /
    before.dailyCpuSeconds.length;
  const afterCpuMean =
    after.dailyCpuSeconds.reduce((sum, cpu) => sum + cpu, 0) /
    after.dailyCpuSeconds.length;
  if (!(afterCpuMean < beforeCpuMean))
    errors.push(
      `Days 2–31 process CPU mean ${afterCpuMean.toFixed(6)}s/day is not below main ${beforeCpuMean.toFixed(6)}s/day`,
    );
  if (JSON.stringify(before.actionDays) !== JSON.stringify(after.actionDays))
    errors.push("Per-day accepted actions or appended payload digests differ");
  if (
    JSON.stringify(before.initialAction) !== JSON.stringify(after.initialAction)
  )
    errors.push("Initial action 0 or its appended payload differs");
  for (const receipt of [before, after]) {
    if (receipt.actionDays.length !== 30)
      errors.push("The calendar action map must contain days 2–31");
    const actionNumbers = [
      receipt.initialAction.actionNumber,
      ...receipt.actionDays.flatMap((row) => row.actionNumbers),
    ];
    if (
      actionNumbers.length !== 32 ||
      actionNumbers.some((action, index) => action !== index)
    )
      errors.push("The action map must preserve actions 0–31 exactly once");
    if (
      receipt.actionDays[0]?.day !== 2 ||
      JSON.stringify(receipt.actionDays[0]?.actionNumbers) !==
        JSON.stringify([1, 2])
    )
      errors.push(
        "Calendar day 2 must retain same-date action 1 and advance action 2",
      );
  }
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
    baselineMeanCpuSecondsPerDay: beforeCpuMean,
    candidateMeanCpuSecondsPerDay: afterCpuMean,
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
  const executionId = option(
    "execution-id",
    process.env.PG_RUN_ID ?? "unspecified",
  )!;
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
  const initialDecisionCount = world.history.decisionTraces.length;
  const initialEventCount = world.history.events.length;
  const firstDay = advanceObservedWorld(world, 1);
  if (firstDay.currentDate <= world.currentDate)
    throw new Error("The observer did not complete day 1");
  world = firstDay;
  const measuredFromDate = world.currentDate;
  // Calendar day 1 is action 0. On calendar day 2, action 1 stops on the same
  // date and action 2 advances; retain both in that day bucket.
  const initialAction = {
    actionNumber: 0 as const,
    date: firstDay.currentDate,
    decisions: firstDay.history.decisionTraces
      .slice(initialDecisionCount)
      .map((row) => ({
        key: row.stableKey,
        choice: row.selectedOptionKey,
        hash: hash(withoutHistoryPositions(row)),
        sequence: row.sequence,
        cutoffSequence: row.context.cutoff.historySequenceExclusive,
      })),
    appendedPayloadDigest: hash(
      firstDay.history.events.slice(initialEventCount),
    ),
  };
  let priorDecisionCount = firstDay.history.decisionTraces.length;
  let priorEventCount = firstDay.history.events.length;
  const hash = (value: unknown) =>
    createHash("sha256").update(canonicalJson(value)).digest("hex");
  const dailySeconds: number[] = [];
  const dailyCpuSeconds: number[] = [];
  const actionDays: MonthReceipt["actionDays"][number][] = [];
  for (let day = 2; day <= 31; day += 1) {
    const dayBegan = performance.now();
    const cpuBegan = cpuUsage();
    const next = advanceObservedWorld(world, 1);
    const cpu = cpuUsage(cpuBegan);
    const daySeconds = (performance.now() - dayBegan) / 1000;
    if (next.currentDate <= world.currentDate)
      throw new Error(`The observer did not complete day ${day}`);
    dailySeconds.push(daySeconds);
    dailyCpuSeconds.push((cpu.user + cpu.system) / 1_000_000);
    const decisions = next.history.decisionTraces
      .slice(priorDecisionCount)
      .map((row) => ({
        key: row.stableKey,
        choice: row.selectedOptionKey,
        hash: hash(withoutHistoryPositions(row)),
        sequence: row.sequence,
        cutoffSequence: row.context.cutoff.historySequenceExclusive,
      }));
    actionDays.push({
      day,
      date: next.currentDate,
      actionNumbers: day === 2 ? [1, 2] : [day],
      decisions,
      appendedPayloadDigest: hash(next.history.events.slice(priorEventCount)),
    });
    priorDecisionCount = next.history.decisionTraces.length;
    priorEventCount = next.history.events.length;
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
    `Days 2–31 wall mean: ${(seconds / dailySeconds.length).toFixed(6)}s/day; CPU mean: ${(dailyCpuSeconds.reduce((sum, cpu) => sum + cpu, 0) / dailyCpuSeconds.length).toFixed(6)}s/day; total wall ${seconds.toFixed(3)}s through ${next.currentDate}`,
  );
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
    dailyCpuSeconds,
    executionId,
    initialAction,
    actionDays,
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
        baselineMeanCpuSecondsPerDay: comparison.baselineMeanCpuSecondsPerDay,
        candidateMeanCpuSecondsPerDay: comparison.candidateMeanCpuSecondsPerDay,
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
