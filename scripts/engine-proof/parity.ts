import {
  addDays,
  addSimulationMinutes,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { createHash } from "node:crypto";
import { writeCanonicalJson } from "../../src/simulation/canonical-json";
import { createWorld, type CreateWorldInput } from "../../src/simulation/world";
import type { World } from "../../src/simulation/types";

export interface Producer {
  readonly ref: string;
  readonly route: string;
  readonly artifactSha256: string;
}
export interface Step {
  readonly unit: "days" | "minutes";
  readonly amount: number;
}
export interface ProofInput {
  readonly seed: string;
  readonly placeKey: string;
  readonly steps: readonly Step[];
}
export interface RouteAdapter {
  readonly producer: Producer;
  open(input: ProofInput): World | Promise<World>;
  advance(world: World, step: Step): World | Promise<World>;
  describe?(
    world: World,
    input: ProofInput,
  ): Readonly<Record<string, string | null>>;
}
export interface Capture {
  readonly producer: Producer;
  readonly input: ProofInput;
  readonly initialHash: string;
  readonly world: World;
  readonly completedSteps: number;
  readonly watched?: Readonly<Record<string, string | null>>;
}
export function canonicalHash(value: unknown): string {
  const hash = createHash("sha256");
  writeCanonicalJson(value, (chunk) => hash.update(chunk));
  return hash.digest("hex");
}
/** Reuses the canonical world constructor for small saved-input route fixtures. */
export function openCanonicalFixture(input: CreateWorldInput): World {
  return createWorld(input);
}
export function schedule(
  unit: Step["unit"],
  amount: number,
  count: number,
): Step[] {
  if (![amount, count].every((n) => Number.isSafeInteger(n) && n > 0))
    throw new Error("Positive whole amounts and counts required");
  return Array.from({ length: count }, () => ({ unit, amount }));
}
function assertIndependent(a: Producer, b: Producer): void {
  for (const p of [a, b])
    if (!p.ref || !p.route || !/^[a-f0-9]{64}$/.test(p.artifactSha256))
      throw new Error("Exact ref, route and SHA-256 required");
  if (a.ref === b.ref && a.artifactSha256 === b.artifactSha256)
    throw new Error(
      "Independent producer artifacts required; self-comparison refused",
    );
}
/** Every append-record collection gets its own namespace. Records with a
 * canonical type use that type; other records use the collection name. Empty
 * arrays remain visible. Nonarray metadata is covered by the full history hash. */
export function historyByType(world: World) {
  const groups = new Map<string, unknown[]>();
  for (const [collection, records] of Object.entries(world.history)) {
    if (!Array.isArray(records)) continue;
    if (!records.length) groups.set(`${collection}:${collection}`, []);
    for (const record of records) {
      const type =
        record !== null &&
        typeof record === "object" &&
        "type" in record &&
        typeof record.type === "string"
          ? record.type
          : collection;
      const key = `${collection}:${type}`;
      const rows = groups.get(key) ?? [];
      rows.push(record);
      groups.set(key, rows);
    }
  }
  return Object.fromEntries(
    [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, rows]) => [
        key,
        { count: rows.length, hash: canonicalHash(rows) },
      ]),
  );
}

export function compareCaptures(baseline: Capture, candidate: Capture) {
  assertIndependent(baseline.producer, candidate.producer);
  if (baseline === candidate || baseline.world === candidate.world)
    throw new Error("Independent captures required");
  if (
    canonicalHash(baseline.input) !== canonicalHash(candidate.input) ||
    baseline.initialHash !== candidate.initialHash
  )
    throw new Error("Inputs or starting worlds differ");
  if (
    baseline.completedSteps !== baseline.input.steps.length ||
    candidate.completedSteps !== candidate.input.steps.length ||
    !baseline.completedSteps
  )
    throw new Error("Incomplete captures refused");
  const oldHistory = historyByType(baseline.world),
    newHistory = historyByType(candidate.world);
  const history = [
    ...new Set([...Object.keys(oldHistory), ...Object.keys(newHistory)]),
  ]
    .sort()
    .map((type) => ({
      type,
      baseline: oldHistory[type] ?? null,
      candidate: newHistory[type] ?? null,
      equal:
        canonicalHash(oldHistory[type] ?? null) ===
        canonicalHash(newHistory[type] ?? null),
    }));
  const baselineHash = canonicalHash(baseline.world),
    candidateHash = canonicalHash(candidate.world);
  return {
    equal: baselineHash === candidateHash,
    baselineHash,
    candidateHash,
    baselineHistoryHash: canonicalHash(baseline.world.history),
    candidateHistoryHash: canonicalHash(candidate.world.history),
    history,
    input: baseline.input,
    baselineProducer: baseline.producer,
    candidateProducer: candidate.producer,
  };
}
export async function runParity(
  input: ProofInput,
  baseline: RouteAdapter,
  candidate: RouteAdapter,
) {
  assertIndependent(baseline.producer, candidate.producer);
  if (baseline === candidate || baseline.advance === candidate.advance)
    throw new Error("Distinct route functions required");
  // Serial execution avoids competing for a speed-measurement host window.
  const oldCapture = await captureRoute(input, baseline),
    newCapture = await captureRoute(input, candidate);
  return {
    baseline: oldCapture,
    candidate: newCapture,
    comparison: compareCaptures(oldCapture, newCapture),
  };
}

/** Independently callable before a route edit; does not itself establish parity. */
export async function captureRoute(
  input: ProofInput,
  adapter: RouteAdapter,
): Promise<Capture> {
  if (!input.steps.length) throw new Error("At least one step required");
  let world = structuredClone(await adapter.open(input));
  const initialHash = canonicalHash(world);
  const watched = adapter.describe?.(world, input);
  for (const step of input.steps) {
    if (
      !Number.isSafeInteger(step.amount) ||
      step.amount <= 0 ||
      !["days", "minutes"].includes(step.unit)
    )
      throw new Error("Invalid step");
    const expected =
      step.unit === "days"
        ? simulationMomentOnLocalDate(
            world.currentMoment,
            addDays(world.currentDate, step.amount),
          )
        : addSimulationMinutes(world.currentMoment, step.amount);
    world = await adapter.advance(world, step);
    if (
      canonicalHash(world.currentMoment) !== canonicalHash(expected) ||
      world.currentDate !== expected.date
    )
      throw new Error("Route did not complete requested time step");
  }
  return {
    producer: adapter.producer,
    input,
    initialHash,
    world,
    completedSteps: input.steps.length,
    ...(watched ? { watched } : {}),
  };
}
