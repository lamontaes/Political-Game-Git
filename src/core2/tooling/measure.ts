import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import {
  addDays,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../../simulation/dates";
import { stableHash } from "../../simulation/ids";
import { buildDeepPast } from "../deep-past";
import { enrichCivicInputs } from "../civic-inputs";
import { developerBanners } from "../stopgaps";
import { buildPopulation } from "../population";
import { parameter } from "../parameters";
import type { CoreInput, CoreState } from "../types";
import { advanceCore, createLifeCore } from "../life";
import measurementData from "../data/measurement.json" with { type: "json" };

type MeasureMode = "opening" | "year" | "pre-run";

interface MeasurementData {
  version: string;
  seed: string;
  startedAt: string;
  preRunThrough: string;
  source: {
    tag: "SOURCED";
    asOf: string;
    citation: string;
  };
}

interface MemorySample {
  heapUsedMiB: number;
  rssMiB: number;
  processLifetimeMaxRssMiB: number;
}

interface ActTotals {
  acts: number;
  needContribution: number;
  goalContribution: number;
  driveContribution: number;
}

interface MonthlyActionCounter {
  month: string;
  actorId: string;
  actionId: string;
  acts: number;
  needContribution: number;
  goalContribution: number;
  driveContribution: number;
}

interface RunWindowReasonSummary {
  scope: "simulated-month-buckets-captured-before-retention-pruning";
  startDate: string;
  throughDate: string;
  monthsCovered: string[];
  canonicalHash: string;
  totals: ActTotals;
  byMonth: Record<string, ActTotals>;
  byActionId: Record<string, ActTotals>;
  byPerson?: Record<string, ActTotals>;
  personMonthActionRows?: MonthlyActionCounter[];
}

interface RunResult {
  elapsedMilliseconds: number;
  initializeMilliseconds: number;
  advanceMilliseconds: number;
  daysPerMinute: number;
  simulatedDays: number;
  decisions: number;
  acts: number;
  actStatsHash: string;
  memory: {
    before: MemorySample;
    after: MemorySample;
    heapDeltaMiB: number;
    rssDeltaMiB: number;
  };
  world: WorldSummary;
}

interface WorldSummary {
  counts: {
    people: number;
    households: number;
    jobs: number;
    organizations: number;
    husks: number;
    durableRecords: number;
  };
  allTimeActCount: number;
  allTimeActsByActionId: Record<string, number>;
  allTimeActsByMonth: Record<string, number>;
  allTimeActsByMonthActionId: Record<string, Record<string, number>>;
  actStatsHash: string;
  reasonContributionsRetained: {
    scope: "retained-month-window-only";
    retentionMonths: number;
    throughDate: string;
    retainedMonths: string[];
    totals: ActTotals;
    byMonth: Record<string, ActTotals>;
    byActionId: Record<string, ActTotals>;
    byPerson: Record<string, ActTotals>;
  };
  reasonContributionsRunWindow: RunWindowReasonSummary;
  recordVisibility: Record<string, number>;
  gaps: string[];
  stopgaps: string[];
  allTimeActCountsByPerson?: Record<
    string,
    { acts: number; byActionId: Record<string, number> }
  >;
}

const P = (key: string): number => parameter(key);
const measurement = measurementData as MeasurementData;
const measurementDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = resolve(measurementDirectory, "../..");
const bytesPerMiB = P("bytesPerMiB");
const zero = P("zero");
const one = P("one");

function memorySample(): MemorySample {
  const usage = process.memoryUsage();
  return {
    heapUsedMiB: usage.heapUsed / bytesPerMiB,
    rssMiB: usage.rss / bytesPerMiB,
    // Node reports resourceUsage.maxRSS in KiB.
    processLifetimeMaxRssMiB:
      (process.resourceUsage().maxRSS * P("bytesPerKiB")) / bytesPerMiB,
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return Object.freeze(value);
}

function traceSelection(input: CoreInput): {
  input: CoreInput;
  playerId: string;
  countyId: string;
  focusPersonIds: string[];
  focusPlaceIds: string[];
} {
  const jobByPerson = new Map(input.jobs.map((job) => [job.personId, job]));
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const workersByOrganization = new Map<string, Set<string>>();
  for (const job of input.jobs) {
    let workers = workersByOrganization.get(job.organizationId);
    if (!workers) {
      workers = new Set();
      workersByOrganization.set(job.organizationId, workers);
    }
    workers.add(job.personId);
  }
  const candidates = input.people.flatMap((person) => {
    if (
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(input.startedAt)) <
        P("benchmarkAdultMinimumAge") ||
      !person.countyId
    )
      return [];
    const job = person.jobId ? jobByPerson.get(person.id) : undefined;
    if (!job || job.id !== person.jobId) return [];
    const coworkers = workersByOrganization.get(job.organizationId);
    if (!coworkers) return [];
    const knownCoworkers = person.knownIds.filter(
      (id) => id !== person.id && coworkers.has(id),
    );
    if (knownCoworkers.length === zero) return [];
    return [{ person, knownCoworkers }];
  });
  if (candidates.length === zero)
    throw new Error(
      "No sourced adult with a county, owned job, and known coworker exists in the generated population.",
    );
  candidates.sort((left, right) => {
    const leftKey = stableHash(
      `${measurement.seed}:benchmark-player:${left.person.id}`,
    );
    const rightKey = stableHash(
      `${measurement.seed}:benchmark-player:${right.person.id}`,
    );
    return (
      leftKey.localeCompare(rightKey) ||
      left.person.id.localeCompare(right.person.id)
    );
  });
  const selected = candidates[zero]!;
  const player = selected.person;
  const household = input.households.find(
    (row) => row.id === player.householdId,
  );
  if (!household)
    throw new Error(`Benchmark player has no household: ${player.id}`);
  const focusPeople = new Set<string>([
    player.id,
    ...player.familyIds,
    ...household.memberIds,
    ...selected.knownCoworkers,
  ]);
  for (const id of focusPeople) if (!peopleById.has(id)) focusPeople.delete(id);
  const focusPersonIds = [...focusPeople].sort();
  const countyId = player.countyId;
  if (!countyId)
    throw new Error(`Benchmark player has no county focus: ${player.id}`);
  const focusPlaceIds = [countyId];
  const traced: CoreInput = {
    ...input,
    playerId: player.id,
    focusPersonIds,
    focusPlaceIds,
  };
  return {
    input: deepFreeze(traced),
    playerId: player.id,
    countyId,
    focusPersonIds,
    focusPlaceIds,
  };
}

function aggregateAllTimeActStats(core: CoreState) {
  const byActionId = new Map<string, number>();
  const byMonth = new Map<string, number>();
  const byMonthActionId = new Map<string, Record<string, number>>();
  let total = zero;
  for (const [key, count] of core.actsByMonthKind) {
    const separator = key.indexOf(":");
    if (separator < zero)
      throw new Error(`Malformed all-time monthly act key: ${key}`);
    const month = key.slice(zero, separator);
    const actionId = key.slice(separator + one);
    byActionId.set(actionId, (byActionId.get(actionId) ?? zero) + count);
    byMonth.set(month, (byMonth.get(month) ?? zero) + count);
    const actions = byMonthActionId.get(month) ?? {};
    actions[actionId] = (actions[actionId] ?? zero) + count;
    byMonthActionId.set(month, actions);
    total += count;
  }
  const byPerson = Object.fromEntries(
    [...core.people.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((person) => [
        person.id,
        {
          acts: person.actCount,
          byActionId: Object.fromEntries(
            [...person.actsByKind].sort(([left], [right]) =>
              left.localeCompare(right),
            ),
          ),
        },
      ]),
  );
  return {
    total,
    byActionId: Object.fromEntries(
      [...byActionId].sort(([a], [b]) => a.localeCompare(b)),
    ),
    byMonth: Object.fromEntries(
      [...byMonth].sort(([a], [b]) => a.localeCompare(b)),
    ),
    byMonthActionId: Object.fromEntries(
      [...byMonthActionId]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, kinds]) => [
          month,
          Object.fromEntries(
            Object.entries(kinds).sort(([a], [b]) => a.localeCompare(b)),
          ),
        ]),
    ),
    byPerson,
  };
}

function aggregateRetainedReasonContributions(core: CoreState) {
  const totals: ActTotals = {
    acts: zero,
    needContribution: zero,
    goalContribution: zero,
    driveContribution: zero,
  };
  const monthRows = new Map<string, ActTotals>();
  const actionRows = new Map<string, ActTotals>();
  const personRows = new Map<string, ActTotals>();
  const retainedMonths = [...core.actCountersByMonth.keys()].sort();
  for (const monthKey of retainedMonths) {
    const counterIds = core.actCountersByMonth.get(monthKey);
    if (!counterIds)
      throw new Error(`Missing retained act month index: ${monthKey}`);
    for (const id of counterIds) {
      const row = core.actCounters.get(id);
      if (!row || row.month !== monthKey)
        throw new Error(`Invalid retained act counter index: ${id}`);
      const person = personRows.get(row.actorId) ?? {
        acts: zero,
        needContribution: zero,
        goalContribution: zero,
        driveContribution: zero,
      };
      const month = monthRows.get(row.month) ?? {
        acts: zero,
        needContribution: zero,
        goalContribution: zero,
        driveContribution: zero,
      };
      const action = actionRows.get(row.actionId) ?? {
        acts: zero,
        needContribution: zero,
        goalContribution: zero,
        driveContribution: zero,
      };
      for (const target of [totals, person, month, action]) {
        target.acts += row.count;
        target.needContribution += row.needContribution;
        target.goalContribution += row.goalContribution;
        target.driveContribution += row.driveContribution;
      }
      personRows.set(row.actorId, person);
      monthRows.set(row.month, month);
      actionRows.set(row.actionId, action);
    }
  }
  return {
    scope: "retained-month-window-only" as const,
    totals,
    byMonth: Object.fromEntries(
      [...monthRows].sort(([a], [b]) => a.localeCompare(b)),
    ),
    byActionId: Object.fromEntries(
      [...actionRows].sort(([a], [b]) => a.localeCompare(b)),
    ),
    byPerson: Object.fromEntries(
      [...personRows].sort(([a], [b]) => a.localeCompare(b)),
    ),
    retainedMonths,
    retentionMonths: P("metricRetentionMonths"),
    throughDate: core.date,
  };
}

function emptyActTotals(): ActTotals {
  return {
    acts: zero,
    needContribution: zero,
    goalContribution: zero,
    driveContribution: zero,
  };
}

function addMonthlyCounter(target: ActTotals, row: MonthlyActionCounter): void {
  target.acts += row.acts;
  target.needContribution += row.needContribution;
  target.goalContribution += row.goalContribution;
  target.driveContribution += row.driveContribution;
}

function snapshotMonthCounters(
  core: CoreState,
  month: string,
): MonthlyActionCounter[] {
  const ids = core.actCountersByMonth.get(month);
  if (!ids) return [];
  const rows = [...ids].map((id): MonthlyActionCounter => {
    const row = core.actCounters.get(id);
    if (!row || row.month !== month)
      throw new Error(`Invalid monthly act counter index: ${id}`);
    return {
      month: row.month,
      actorId: row.actorId,
      actionId: row.actionId,
      acts: row.count,
      needContribution: row.needContribution,
      goalContribution: row.goalContribution,
      driveContribution: row.driveContribution,
    };
  });
  rows.sort(
    (left, right) =>
      left.actorId.localeCompare(right.actorId) ||
      left.actionId.localeCompare(right.actionId),
  );
  return rows;
}

function lastDayOfMonth(date: string): string {
  const lastDay = new Date(makeIsoDate(date));
  lastDay.setUTCDate(P("one"));
  lastDay.setUTCMonth(lastDay.getUTCMonth() + P("one"));
  lastDay.setUTCDate(P("zero"));
  return makeIsoDate(
    lastDay
      .toISOString()
      .slice(P("zero"), P("isoMonthCharacters") + P("two") + P("one")),
  );
}

function advanceInMonthChunks(
  core: CoreState,
  throughDate: string,
  includeDetailedActStats: boolean,
): {
  receipt: { simulatedDays: number; decisions: number; acts: number };
  reasonSummary: RunWindowReasonSummary;
} {
  const target = makeIsoDate(throughDate);
  const started = makeIsoDate(core.date);
  let simulatedDays = zero;
  let decisions = zero;
  let acts = zero;
  const monthsCovered: string[] = [];
  const reasonHash = createHash("sha256");
  const totals = emptyActTotals();
  const byMonth = new Map<string, ActTotals>();
  const byActionId = new Map<string, ActTotals>();
  const byPerson = includeDetailedActStats
    ? new Map<string, ActTotals>()
    : undefined;
  const personMonthActionRows = includeDetailedActStats
    ? ([] as MonthlyActionCounter[])
    : undefined;

  while (core.date < target) {
    let chunkEnd = lastDayOfMonth(core.date);
    if (chunkEnd <= core.date)
      chunkEnd = lastDayOfMonth(addDays(makeIsoDate(core.date), P("one")));
    if (chunkEnd > target) chunkEnd = target;

    const chunk = advanceCore(core, chunkEnd);
    simulatedDays += chunk.simulatedDays;
    decisions += chunk.decisions;
    acts += chunk.acts;

    const month = chunkEnd.slice(P("zero"), P("isoMonthCharacters"));
    monthsCovered.push(month);
    const monthRows = snapshotMonthCounters(core, month);
    reasonHash.update(JSON.stringify({ month, rows: monthRows }));
    reasonHash.update("\0");
    const monthTotals = emptyActTotals();
    byMonth.set(month, monthTotals);
    for (const row of monthRows) {
      addMonthlyCounter(totals, row);
      addMonthlyCounter(monthTotals, row);
      const actionTotals = byActionId.get(row.actionId) ?? emptyActTotals();
      addMonthlyCounter(actionTotals, row);
      byActionId.set(row.actionId, actionTotals);
      if (byPerson) {
        const personTotals = byPerson.get(row.actorId) ?? emptyActTotals();
        addMonthlyCounter(personTotals, row);
        byPerson.set(row.actorId, personTotals);
      }
      personMonthActionRows?.push(row);
    }
  }

  const expectedDays = daysBetween(started, target);
  if (simulatedDays !== expectedDays)
    throw new Error(
      `Monthly chunks advanced ${simulatedDays} days; expected ${expectedDays} from ${started} through ${target}.`,
    );
  const asRecord = (rows: Map<string, ActTotals>) =>
    Object.fromEntries(
      [...rows].sort(([left], [right]) => left.localeCompare(right)),
    );
  return {
    receipt: { simulatedDays, decisions, acts },
    reasonSummary: {
      scope: "simulated-month-buckets-captured-before-retention-pruning",
      startDate: started,
      throughDate: target,
      monthsCovered,
      canonicalHash: reasonHash.digest("hex"),
      totals,
      byMonth: asRecord(byMonth),
      byActionId: asRecord(byActionId),
      ...(byPerson ? { byPerson: asRecord(byPerson) } : {}),
      ...(personMonthActionRows ? { personMonthActionRows } : {}),
    },
  };
}

function assertMonthlyRowsMatchCore(
  core: CoreState,
  rows: readonly MonthlyActionCounter[],
): void {
  const byPersonAction = new Map<string, Map<string, number>>();
  const byMonthAction = new Map<string, number>();
  let total = zero;
  for (const row of rows) {
    total += row.acts;
    const personActions =
      byPersonAction.get(row.actorId) ?? new Map<string, number>();
    personActions.set(
      row.actionId,
      (personActions.get(row.actionId) ?? zero) + row.acts,
    );
    byPersonAction.set(row.actorId, personActions);
    const key = `${row.month}:${row.actionId}`;
    byMonthAction.set(key, (byMonthAction.get(key) ?? zero) + row.acts);
  }
  const allPersonActs = [...core.people.values()].reduce(
    (sum, person) => sum + person.actCount,
    zero,
  );
  if (total !== allPersonActs)
    throw new Error(
      `Monthly person/action rows contain ${total} acts; person totals contain ${allPersonActs}.`,
    );
  if (byMonthAction.size !== core.actsByMonthKind.size)
    throw new Error(
      "Monthly person/action rows do not cover all-time action buckets.",
    );
  for (const [key, count] of core.actsByMonthKind)
    if (byMonthAction.get(key) !== count)
      throw new Error(
        `Monthly person/action rows disagree with all-time bucket: ${key}`,
      );
  for (const [personId, person] of core.people) {
    const captured = byPersonAction.get(personId) ?? new Map<string, number>();
    let personActs = zero;
    for (const [actionId, count] of person.actsByKind) {
      if (captured.get(actionId) !== count)
        throw new Error(
          `Monthly person/action rows disagree with actor total: ${personId}:${actionId}`,
        );
      captured.delete(actionId);
      personActs += count;
    }
    if (captured.size !== zero || personActs !== person.actCount)
      throw new Error(
        `Monthly person/action rows are incomplete for actor: ${personId}`,
      );
    byPersonAction.delete(personId);
  }
  if (byPersonAction.size !== zero)
    throw new Error("Monthly person/action rows name an absent actor.");
}

function summarizeWorld(
  core: CoreState,
  includeDetailedActStats: boolean,
  reasonSummary: RunWindowReasonSummary,
): WorldSummary {
  const allTime = aggregateAllTimeActStats(core);
  const retainedReasons = aggregateRetainedReasonContributions(core);
  if (reasonSummary.personMonthActionRows)
    assertMonthlyRowsMatchCore(core, reasonSummary.personMonthActionRows);
  const allPersonActs = [...core.people.values()].reduce(
    (sum, person) => sum + person.actCount,
    zero,
  );
  if (allTime.total !== allPersonActs)
    throw new Error(
      `Global act totals ${allTime.total} do not match all-time person counts ${allPersonActs}.`,
    );
  const visibility: Record<string, number> = {};
  for (const record of core.durableLog.values()) {
    const key = record.visibility ?? "unclassified";
    visibility[key] = (visibility[key] ?? zero) + one;
  }
  return {
    counts: {
      people: core.people.size,
      households: core.households.size,
      jobs: core.jobs.size,
      organizations: core.organizations.size,
      husks: core.husks.size,
      durableRecords: core.durableLog.size,
    },
    allTimeActCount: allTime.total,
    allTimeActsByActionId: allTime.byActionId,
    allTimeActsByMonth: allTime.byMonth,
    allTimeActsByMonthActionId: allTime.byMonthActionId,
    actStatsHash: createHash("sha256")
      .update(
        JSON.stringify({
          allTime: {
            byActionId: allTime.byActionId,
            byMonth: allTime.byMonth,
            byMonthActionId: allTime.byMonthActionId,
            byPerson: allTime.byPerson,
          },
          retainedReasons,
          runWindowReasonHash: reasonSummary.canonicalHash,
        }),
      )
      .digest("hex"),
    reasonContributionsRetained: retainedReasons,
    reasonContributionsRunWindow: reasonSummary,
    ...(includeDetailedActStats
      ? { allTimeActCountsByPerson: allTime.byPerson }
      : {}),
    recordVisibility: Object.fromEntries(
      Object.entries(visibility).sort(([a], [b]) => a.localeCompare(b)),
    ),
    gaps: [...core.gaps].sort(),
    stopgaps: developerBanners(core).map((row) => row.id),
  };
}

function median(values: readonly number[]): number {
  if (values.length === zero) throw new Error("Cannot take an empty median.");
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / P("two"));
  return sorted.length % P("two") === zero
    ? ((sorted[middle - one] ?? zero) + (sorted[middle] ?? zero)) / P("two")
    : sorted[middle]!;
}

function sourceHash(): {
  scope: string;
  dependencyNote: string;
  sha256: string;
  fileCount: number;
} {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (
        entry.isFile() &&
        (/\.json$/.test(entry.name) ||
          (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)))
      )
        files.push(path);
    }
  };
  visit(measurementDirectory);
  files.sort();
  const hash = createHash("sha256");
  for (const path of files) {
    hash.update(relative(repositoryRoot, path).split(sep).join("/"));
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return {
    scope: "src/core2 TypeScript and JSON; test TypeScript excluded",
    dependencyNote:
      "Transitive code and data outside src/core2 are not hashed here and must remain frozen by the owner; the prepared traced CoreInput has a separate SHA-256.",
    sha256: hash.digest("hex"),
    fileCount: files.length,
  };
}

function preparedInputHash(input: CoreInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function memoryDelta(before: MemorySample, after: MemorySample) {
  return {
    before,
    after,
    heapDeltaMiB: after.heapUsedMiB - before.heapUsedMiB,
    rssDeltaMiB: after.rssMiB - before.rssMiB,
  };
}

async function runCore(
  input: CoreInput,
  throughDate: string,
  includeDetailedActStats: boolean,
): Promise<RunResult> {
  const before = memorySample();
  const started = performance.now();
  const core = createLifeCore(input, { observer: false });
  const initialized = performance.now();
  const advanceResult = advanceInMonthChunks(
    core,
    throughDate,
    includeDetailedActStats,
  );
  const advanceReceipt = advanceResult.receipt;
  const completed = performance.now();
  const after = memorySample();
  const elapsedMilliseconds = completed - started;
  const expectedDays = daysBetween(
    makeIsoDate(input.startedAt),
    makeIsoDate(throughDate),
  );
  if (advanceReceipt.simulatedDays !== expectedDays)
    throw new Error(
      `Life loop advanced ${advanceReceipt.simulatedDays} days; expected ${expectedDays} from ${input.startedAt} through ${throughDate}.`,
    );
  const world = summarizeWorld(
    core,
    includeDetailedActStats,
    advanceResult.reasonSummary,
  );
  if (world.allTimeActCount !== advanceReceipt.acts)
    throw new Error(
      `Life loop reported ${advanceReceipt.acts} acts; all-time person counts contain ${world.allTimeActCount}.`,
    );
  if (world.reasonContributionsRunWindow.totals.acts !== advanceReceipt.acts)
    throw new Error(
      `Monthly counter snapshots contain ${world.reasonContributionsRunWindow.totals.acts} acts; life loop reported ${advanceReceipt.acts}.`,
    );
  const daysPerMinute =
    elapsedMilliseconds > zero
      ? (advanceReceipt.simulatedDays *
          P("secondsPerMinute") *
          P("millisecondsPerSecond")) /
        elapsedMilliseconds
      : zero;
  return {
    elapsedMilliseconds,
    initializeMilliseconds: initialized - started,
    advanceMilliseconds: completed - initialized,
    daysPerMinute,
    simulatedDays: advanceReceipt.simulatedDays,
    decisions: advanceReceipt.decisions,
    acts: advanceReceipt.acts,
    actStatsHash: world.actStatsHash,
    memory: memoryDelta(before, after),
    world,
  };
}

function timingSummary(runs: readonly RunResult[]) {
  return {
    medianElapsedMilliseconds: median(
      runs.map((run) => run.elapsedMilliseconds),
    ),
    medianDaysPerMinute: median(runs.map((run) => run.daysPerMinute)),
    medianDecisions: median(runs.map((run) => run.decisions)),
    medianActs: median(runs.map((run) => run.acts)),
  };
}

function parseArgs(args: readonly string[]): {
  mode: MeasureMode;
  outputPath?: string;
} {
  let mode: MeasureMode = "opening";
  let outputPath: string | undefined;
  for (let index = zero; index < args.length; index += one) {
    const argument = args[index];
    if (argument === "--mode") {
      const value = args[index + one];
      if (value !== "opening" && value !== "year" && value !== "pre-run")
        throw new Error("--mode must be opening, year, or pre-run.");
      mode = value;
      index += one;
    } else if (argument === "--output") {
      const value = args[index + one];
      if (!value) throw new Error("--output needs a path.");
      outputPath = resolve(value);
      index += one;
    } else if (argument === "--help") {
      process.stdout.write(
        "Usage: measure.ts [--mode opening|year|pre-run] [--output /tmp/receipt.json]\n",
      );
      process.exit(zero);
    } else {
      throw new Error(`Unknown measurement option: ${argument}`);
    }
  }
  return { mode, outputPath };
}

async function main(): Promise<void> {
  const { mode, outputPath } = parseArgs(process.argv.slice(2));
  const startDate = makeIsoDate(measurement.startedAt);
  const sourceHashBefore = sourceHash();
  const populationMemoryBefore = memorySample();
  const populationStarted = performance.now();
  const population = buildPopulation({
    seed: measurement.seed,
    startedAt: startDate,
    minimumPeople: P("targetPopulation"),
  });
  const populationCompleted = performance.now();
  const populationMemoryAfter = memorySample();
  const deepPastMemoryBefore = memorySample();
  const deepPastStarted = performance.now();
  const withDeepPast = buildDeepPast(population);
  const deepPastCompleted = performance.now();
  const deepPastMemoryAfter = memorySample();
  const civicMemoryBefore = memorySample();
  const civicStarted = performance.now();
  const withCivicInputs = enrichCivicInputs(withDeepPast);
  const civicCompleted = performance.now();
  const civicMemoryAfter = memorySample();
  const traced = traceSelection(withCivicInputs);
  const inputSha256 = preparedInputHash(traced.input);
  const throughDate =
    mode === "year"
      ? addDays(startDate, P("yearSpanDays"))
      : mode === "pre-run"
        ? makeIsoDate(measurement.preRunThrough)
        : startDate;
  const expectedDays = daysBetween(startDate, throughDate);
  if (mode === "year" && expectedDays !== P("yearSpanDays"))
    throw new Error("Configured year span does not match its calendar dates.");
  const warmupCount = mode === "opening" ? zero : P("warmupRuns");
  const measuredCount = mode === "opening" ? one : P("warmRuns");
  const warmups: RunResult[] = [];
  for (let index = zero; index < warmupCount; index += one)
    warmups.push(await runCore(traced.input, throughDate, false));
  const runs: RunResult[] = [];
  for (let index = zero; index < measuredCount; index += one)
    runs.push(
      await runCore(traced.input, throughDate, index === measuredCount - one),
    );
  const expectedActHash = runs[zero]?.actStatsHash;
  if ([...warmups, ...runs].some((run) => run.actStatsHash !== expectedActHash))
    throw new Error(
      "Measured runs produced different canonical act summaries.",
    );
  const sourceHashAfter = sourceHash();
  if (JSON.stringify(sourceHashBefore) !== JSON.stringify(sourceHashAfter))
    throw new Error("src/core2 sources changed during the measurement run.");
  const output: Record<string, unknown> = {
    schema: "p8-measurement-v1",
    mode,
    measurementConfig: measurement,
    seed: measurement.seed,
    startedAt: startDate,
    throughDate,
    expectedSimulatedDays: expectedDays,
    parameters: {
      targetPopulation: P("targetPopulation"),
      warmupRuns: warmupCount,
      warmRuns: measuredCount,
      ...(mode === "year" ? { yearSpanDays: P("yearSpanDays") } : {}),
      benchmarkAdultMinimumAge: P("benchmarkAdultMinimumAge"),
    },
    sourceHash: {
      beforeBuild: sourceHashBefore,
      afterRuns: sourceHashAfter,
      stableDuringRun: true,
    },
    preparedInputSha256: inputSha256,
    memoryScope:
      "heapUsedMiB and rssMiB are before/after samples; processLifetimeMaxRssMiB is cumulative from process start and includes input building, warmups, and previous measured runs.",
    build: {
      population: {
        elapsedMilliseconds: populationCompleted - populationStarted,
        memory: memoryDelta(populationMemoryBefore, populationMemoryAfter),
        counts: {
          people: population.people.length,
          households: population.households.length,
          jobs: population.jobs.length,
          organizations: population.organizations.length,
        },
      },
      deepPast: {
        elapsedMilliseconds: deepPastCompleted - deepPastStarted,
        memory: memoryDelta(deepPastMemoryBefore, deepPastMemoryAfter),
        pastFactCount: withDeepPast.people.reduce(
          (sum, person) => sum + (person.pastFacts?.length ?? zero),
          zero,
        ),
        gapCount: withDeepPast.gaps.length,
      },
      civicInputs: {
        elapsedMilliseconds: civicCompleted - civicStarted,
        memory: memoryDelta(civicMemoryBefore, civicMemoryAfter),
        publicOrganizationCount:
          withCivicInputs.publicOrganizations?.length ?? zero,
        gapCount: withCivicInputs.gaps.length,
      },
    },
    trace: {
      playerId: traced.playerId,
      countyId: traced.countyId,
      focusPersonCount: traced.focusPersonIds.length,
      focusPlaceIds: traced.focusPlaceIds,
      focusPersonIds: traced.focusPersonIds,
    },
    warmups,
    runs,
    median: timingSummary(runs),
    finalWorld: runs.at(-one)?.world,
  };
  const path = outputPath ?? resolve("/tmp/p8-measurements", `p8-${mode}.json`);
  const relativeToRepo = relative(repositoryRoot, path);
  if (
    relativeToRepo === "" ||
    (!relativeToRepo.startsWith(`..${sep}`) && relativeToRepo !== "..")
  )
    throw new Error(
      "Measurement receipts must be written outside the repository.",
    );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(output, null, P("two"))}\n`);
  process.stdout.write(`P8 ${mode} receipt: ${path}\n`);
}

if (
  process.argv[one] &&
  import.meta.url === pathToFileURL(resolve(process.argv[one])).href
) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = one;
  });
}
