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
export interface MonthReceipt {
  readonly seed: string;
  readonly place: string;
  readonly days: number;
  readonly head: string;
  readonly seconds: number;
  readonly date: string;
  readonly fingerprint: string;
  readonly people: readonly { readonly id: string; readonly hash: string }[];
  readonly decisions: readonly MonthDecision[];
  readonly events: readonly { readonly key: string; readonly hash: string }[];
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
  if (JSON.stringify(before.people) !== JSON.stringify(after.people))
    errors.push("People, their facts, appearances or person order differ");
  if (JSON.stringify(before.events) !== JSON.stringify(after.events))
    errors.push("Recorded events or results differ beyond history positions");
  const old = new Map(before.decisions.map((row) => [row.key, row]));
  const positions: {
    key: string;
    sequenceBefore: number;
    sequenceAfter: number;
    cutoffBefore: number;
    cutoffAfter: number;
    choice: string | null;
  }[] = [];
  if (old.size !== after.decisions.length)
    errors.push("Decision count differs");
  for (const row of after.decisions) {
    const prior = old.get(row.key);
    if (!prior || prior.choice !== row.choice || prior.hash !== row.hash)
      errors.push(`Decision ${row.key}: choice or decision facts differ`);
    if (
      prior &&
      (prior.sequence !== row.sequence ||
        prior.cutoffSequence !== row.cutoffSequence)
    )
      positions.push({
        key: row.key,
        sequenceBefore: prior.sequence,
        sequenceAfter: row.sequence,
        cutoffBefore: prior.cutoffSequence,
        cutoffAfter: row.cutoffSequence,
        choice: row.choice,
      });
  }
  return {
    errors,
    positions,
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
  const world = openWatchedWorld(seed, place).world;
  console.log(
    `head=${head} seed=${seed} place=${place} from=${world.currentDate}`,
  );
  const began = performance.now();
  const next = advanceObservedWorld(world, 30);
  const seconds = (performance.now() - began) / 1000;
  if (
    (Date.parse(next.currentDate) - Date.parse(world.currentDate)) /
      86400000 !==
    30
  )
    throw new Error("The observer did not complete all 30 days");
  console.log(`30 days: ${seconds.toFixed(3)}s through ${next.currentDate}`);
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
    date: next.currentDate,
    fingerprint: fingerprint.digest("hex"),
    people: next.personOrder.map((id) => ({ id, hash: hash(next.people[id]) })),
    decisions: next.history.decisionTraces
      .map((row) => ({
        key: row.stableKey,
        choice: row.selectedOptionKey,
        hash: hash(withoutHistoryPositions(row)),
        sequence: row.sequence,
        cutoffSequence: row.context.cutoff.historySequenceExclusive,
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
    events: next.history.events
      .map((row) => ({
        key: row.stableKey,
        hash: hash(withoutHistoryPositions(row)),
      }))
      .sort((a, b) => a.key.localeCompare(b.key)),
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
        positionChanges: comparison.positions.length,
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
