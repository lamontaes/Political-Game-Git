import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PerformanceObserver, performance } from "node:perf_hooks";

type JsonObject = Record<string, unknown>;
type MemorySample = {
  heapUsedBytes: number;
  heapTotalBytes: number;
  rssBytes: number;
  externalBytes: number;
  arrayBuffersBytes: number;
  processLifetimeMaxRssBytes: number;
};
type MonthlyTotals = {
  acts: number;
  needContribution: number;
  goalContribution: number;
  driveContribution: number;
};
type PersonActionRow = {
  month: string;
  actorId: string;
  actionId: string;
  acts: number;
  needContribution: number;
  goalContribution: number;
  driveContribution: number;
};
type MonthSnapshot = {
  month: string;
  counterRows: number;
  canonicalCounterSha256: string;
  actors: number;
  actionIds: number;
  totals: MonthlyTotals;
  byPerson: Record<string, MonthlyTotals>;
  byActionId: Record<string, MonthlyTotals>;
  personActionRows: PersonActionRow[];
  newlyObservedDrives: {
    newActiveIdsObserved: number;
    withSourceRecord: number;
    withoutSourceRecord: number;
    sourceEventInSameMonth: number;
    sourceEventInEarlierMonth: number;
    byKind: Record<string, number>;
  };
};

const externalClosurePaths = [
  "src/simulation/dates.ts",
  "src/simulation/ids.ts",
  "data/content/act-kinds.json",
  "data/content/trait-act-pulls.json",
];
const transportSchema = "p8-source-interned-core-input-v1";
const measurementProtocol = "p8-isolated-steady-year-v1";

function parseArgs(args: readonly string[]): {
  worker: boolean;
  repo: string;
  packed: string;
  metadata: string;
  output: string;
  runs: number;
  runId?: string;
} {
  let worker = false;
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (key === "--worker") {
      worker = true;
      continue;
    }
    if (!key?.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`${key} needs a value.`);
    values[key.slice(2)] = value;
    index += 1;
  }
  const runs = Number(values.runs ?? "3");
  if (!Number.isInteger(runs) || runs < 1)
    throw new Error("--runs must be a positive integer.");
  return {
    worker,
    repo: resolve(values.repo ?? "/workspace/p8-core-prototype"),
    packed: resolve(values.packed ?? "/tmp/p8-steady-traced-input.packed.json"),
    metadata: resolve(values.metadata ?? "/tmp/p8-steady-traced-input.meta.json"),
    output: resolve(values.output ?? "/tmp/p8-steady-year-receipt.json"),
    runs,
    runId: values["run-id"],
  };
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function report(phase: string, fields: Record<string, unknown> = {}): void {
  process.stderr.write(
    `${new Date().toISOString()} ${phase} ${JSON.stringify(fields)}\n`,
  );
}

function verifyCoreManifest(repo: string, manifestPath: string) {
  const manifestBytes = readFileSync(manifestPath);
  const raw = JSON.parse(manifestBytes.toString("utf8")) as JsonObject;
  const sourceHash = raw.sourceHash as JsonObject | undefined;
  if (sourceHash && sourceHash.stableDuringRun !== true)
    throw new Error("The supplied run receipt does not prove stable source bytes.");
  const before = sourceHash?.beforeBuild as JsonObject | undefined;
  const after = sourceHash?.afterRuns as JsonObject | undefined;
  if (before && after && JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("Source hashes differ before and after the supplied run.");
  const candidate = (after ?? before ?? raw) as JsonObject;
  const manifest = (Array.isArray(candidate.files) ? candidate : sourceHash ?? candidate) as JsonObject & {
    sha256?: string;
    fileCount: number;
    files: { path: string; bytes: number; sha256: string }[];
  };
  if (
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0 ||
    manifest.files.length !== manifest.fileCount ||
    typeof manifest.scope !== "string" ||
    !manifest.scope.includes("src/core2") ||
    typeof manifest.sha256 !== "string"
  )
    throw new Error("Supplied source proof lacks an exact per-file manifest.");
  const capturedDependencies = candidate.directRuntimeDependencies as
    | { path: string; bytes: number; sha256: string }[]
    | undefined;
  if (
    !Array.isArray(capturedDependencies) ||
    capturedDependencies.length !== externalClosurePaths.length ||
    new Set(capturedDependencies.map((row) => row.path)).size !==
      externalClosurePaths.length ||
    externalClosurePaths.some(
      (path, index) => capturedDependencies[index]?.path !== path,
    )
  )
    throw new Error("Captured source proof lacks the exact direct runtime dependency list.");
  const fullDigest = createHash("sha256");
  const runtimeDigest = createHash("sha256");
  const toolingDigest = createHash("sha256");
  const capturedToolingRowsDigest = createHash("sha256");
  const seenPaths = new Set<string>();
  const toolingDriftPaths: {
    path: string;
    capturedBytes: number;
    currentBytes: number;
    capturedSha256: string;
    currentSha256: string;
  }[] = [];
  for (const row of manifest.files) {
    if (
      !row.path.startsWith("src/core2/") ||
      row.path.startsWith("src/core2/receipts/") ||
      row.path.endsWith(".test.ts") ||
      seenPaths.has(row.path)
    )
      throw new Error(`Unexpected or duplicate P8 source path: ${row.path}`);
    seenPaths.add(row.path);
    const path = resolve(repo, row.path);
    if (!path.startsWith(`${resolve(repo)}${sep}`))
      throw new Error(`Manifest path escapes the repository: ${row.path}`);
    const bytes = readFileSync(path);
    const normalizedPath = row.path.split(sep).join("/");
    const currentFileSha256 = sha256(bytes);
    const isMeasurementTooling = normalizedPath.startsWith("src/core2/tooling/");
    if (isMeasurementTooling) {
      capturedToolingRowsDigest.update(normalizedPath);
      capturedToolingRowsDigest.update("\0");
      capturedToolingRowsDigest.update(row.sha256);
      capturedToolingRowsDigest.update("\0");
      if (bytes.byteLength !== row.bytes || currentFileSha256 !== row.sha256)
        toolingDriftPaths.push({
          path: normalizedPath,
          capturedBytes: row.bytes,
          currentBytes: bytes.byteLength,
          capturedSha256: row.sha256,
          currentSha256: currentFileSha256,
        });
      toolingDigest.update(normalizedPath);
      toolingDigest.update("\0");
      toolingDigest.update(bytes);
      toolingDigest.update("\0");
    } else if (bytes.byteLength !== row.bytes || currentFileSha256 !== row.sha256) {
      throw new Error(`Pinned P8 runtime source changed: ${row.path}`);
    } else {
      runtimeDigest.update(normalizedPath);
      runtimeDigest.update("\0");
      runtimeDigest.update(bytes);
      runtimeDigest.update("\0");
    }
    fullDigest.update(normalizedPath);
    fullDigest.update("\0");
    fullDigest.update(bytes);
    fullDigest.update("\0");
  }
  if (!seenPaths.has("src/core2/tooling/measure.ts"))
    throw new Error("Captured source proof does not include the annual measurement tool.");
  const capturedMeasurementTool = manifest.files.find(
    (row) => row.path === "src/core2/tooling/measure.ts",
  );
  const currentMeasurementToolSha256 = sha256(
    readFileSync(resolve(repo, "src/core2/tooling/measure.ts")),
  );
  if (capturedMeasurementTool?.sha256 !== currentMeasurementToolSha256)
    throw new Error(
      "Captured annual trace-selection source differs from the current measurement tool.",
    );
  const currentFullSourceSha256 = fullDigest.digest("hex");
  const sourceManifestMatchesCaptured = currentFullSourceSha256 === manifest.sha256;
  if (!sourceManifestMatchesCaptured && toolingDriftPaths.length === 0)
    throw new Error("Captured source manifest digest disagrees with current files.");
  const externalClosure = Object.fromEntries(
    externalClosurePaths.map((relativePath, index) => {
      const bytes = readFileSync(resolve(repo, relativePath));
      const current = { bytes: bytes.byteLength, sha256: sha256(bytes) };
      const captured = capturedDependencies[index]!;
      if (
        current.bytes !== captured.bytes ||
        current.sha256 !== captured.sha256
      )
        throw new Error(`Pinned direct runtime dependency changed: ${relativePath}`);
      return [relativePath, current];
    }),
  );
  return {
    sourceManifestPath: manifestPath,
    manifestSha256: sha256(JSON.stringify(sourceHash ?? raw)),
    runtimeSourceSha256: runtimeDigest.digest("hex"),
    currentMeasurementToolingSha256: toolingDigest.digest("hex"),
    capturedMeasurementToolingRowsSha256: capturedToolingRowsDigest.digest("hex"),
    capturedFullSourceSha256: manifest.sha256,
    currentFullSourceSha256,
    sourceManifestMatchesCaptured,
    toolingDriftPaths,
    runtimeSourceScope:
      "All captured src/core2 files outside src/core2/tooling; tooling is tracked separately because it does not define the core runtime.",
    measurementToolingScope: "src/core2/tooling files in the captured manifest.",
    expectedPreparedInputSha256:
      typeof raw.preparedInputSha256 === "string"
        ? raw.preparedInputSha256
        : undefined,
    scope: typeof manifest.scope === "string" ? manifest.scope : undefined,
    fileCount: manifest.fileCount,
    externalClosure,
  };
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as JsonObject)) deepFreeze(child);
  return Object.freeze(value);
}

function restoreSources(sourceTable: readonly JsonObject[], packed: unknown): unknown {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1)
        value[index] = visit(value[index]);
      return value;
    }
    if (value && typeof value === "object") {
      const row = value as JsonObject;
      const keys = Object.keys(row);
      if (
        keys.length === 1 &&
        typeof row.$p8SourceRef === "number" &&
        Number.isInteger(row.$p8SourceRef)
      ) {
        const source = sourceTable[row.$p8SourceRef];
        if (!source) throw new Error(`Invalid source-table index ${row.$p8SourceRef}.`);
        return source;
      }
      for (const key of keys) row[key] = visit(row[key]);
      return row;
    }
    return value;
  };
  return visit(packed);
}

function memorySample(): MemorySample {
  const usage = process.memoryUsage();
  return {
    heapUsedBytes: usage.heapUsed,
    heapTotalBytes: usage.heapTotal,
    rssBytes: usage.rss,
    externalBytes: usage.external,
    arrayBuffersBytes: usage.arrayBuffers,
    processLifetimeMaxRssBytes:
      process.resourceUsage().maxRSS * (process.platform === "win32" ? 1 : 1024),
  };
}

function sortKey(value: unknown): string {
  if (typeof value === "string") return `s:${value}`;
  if (typeof value === "number" || typeof value === "boolean")
    return `${typeof value}:${String(value)}`;
  return `${typeof value}:${JSON.stringify(value)}`;
}

/** Hashes state incrementally, without building a second World-sized snapshot. */
function digestValue(value: unknown, omitRootFields = false): string {
  const hash = createHash("sha256");
  const active = new WeakSet<object>();
  const write = (item: unknown, root = false): void => {
    if (item === null) {
      hash.update("null;");
      return;
    }
    if (typeof item === "string") {
      hash.update(`string:${JSON.stringify(item)};`);
      return;
    }
    if (typeof item === "number") {
      hash.update(`number:${JSON.stringify(item)};`);
      return;
    }
    if (typeof item === "boolean") {
      hash.update(`boolean:${item ? "true" : "false"};`);
      return;
    }
    if (typeof item === "undefined" || typeof item === "function") {
      hash.update("undefined;");
      return;
    }
    if (typeof item !== "object") {
      hash.update(`${typeof item}:${String(item)};`);
      return;
    }
    if (active.has(item)) throw new Error("Cycle found in CoreState digest input.");
    active.add(item);
    if (Array.isArray(item)) {
      hash.update("array[");
      for (const child of item) write(child);
      hash.update("]array;");
    } else if (item instanceof Map) {
      hash.update("map{");
      const rows = [...item.entries()].sort(([left], [right]) =>
        sortKey(left).localeCompare(sortKey(right)),
      );
      for (const [key, child] of rows) {
        write(key);
        write(child);
      }
      hash.update("}map;");
    } else if (item instanceof Set) {
      hash.update("set{");
      const rows = [...item].sort((left, right) =>
        sortKey(left).localeCompare(sortKey(right)),
      );
      for (const child of rows) write(child);
      hash.update("}set;");
    } else {
      hash.update("object{");
      const row = item as JsonObject;
      const keys = Object.keys(row)
        .filter((key) =>
          !(root && omitRootFields && (key === "data" || key === "modules")),
        )
        .filter((key) => row[key] !== undefined && typeof row[key] !== "function")
        .sort((left, right) => left.localeCompare(right));
      for (const key of keys) {
        write(key);
        write(row[key]);
      }
      hash.update("}object;");
    }
    active.delete(item);
  };
  write(value, true);
  return hash.digest("hex");
}

function retainedCounterDigest(core: any): string {
  return digestValue({
    actCounters: core.actCounters,
    actCountersByMonth: core.actCountersByMonth,
  });
}

function allTimeMonthActionRows(core: any) {
  const rows: { month: string; actionId: string; acts: number }[] = [];
  for (const [key, acts] of core.actsByMonthKind as Map<string, number>) {
    const separator = key.indexOf(":");
    if (separator < 0) throw new Error(`Malformed all-time monthly action key: ${key}`);
    rows.push({ month: key.slice(0, separator), actionId: key.slice(separator + 1), acts });
  }
  return rows.sort(
    (left, right) =>
      left.month.localeCompare(right.month) || left.actionId.localeCompare(right.actionId),
  );
}

function snapshotMonth(core: any, month: string, births: MonthSnapshot["newlyObservedDrives"]): MonthSnapshot {
  const ids = core.actCountersByMonth.get(month) as Set<string> | undefined;
  const rows = [...(ids ?? [])]
    .map((id) => core.actCounters.get(id))
    .filter(Boolean)
    .sort(
      (left, right) =>
        left.actorId.localeCompare(right.actorId) ||
        left.actionId.localeCompare(right.actionId),
    );
  const totals: MonthlyTotals = {
    acts: 0,
    needContribution: 0,
    goalContribution: 0,
    driveContribution: 0,
  };
  const byActionId: Record<string, MonthlyTotals> = {};
  const byPerson: Record<string, MonthlyTotals> = {};
  const actors = new Set<string>();
  const canonicalRows: {
    month: string;
    actorId: string;
    actionId: string;
    acts: number;
    needContribution: number;
    goalContribution: number;
    driveContribution: number;
  }[] = [];
  for (const row of rows) {
    canonicalRows.push({
      month: row.month,
      actorId: row.actorId,
      actionId: row.actionId,
      acts: row.count,
      needContribution: row.needContribution,
      goalContribution: row.goalContribution,
      driveContribution: row.driveContribution,
    });
    actors.add(row.actorId);
    const action = (byActionId[row.actionId] ??= {
      acts: 0,
      needContribution: 0,
      goalContribution: 0,
      driveContribution: 0,
    });
    const person = (byPerson[row.actorId] ??= {
      acts: 0,
      needContribution: 0,
      goalContribution: 0,
      driveContribution: 0,
    });
    for (const key of [
      "acts",
      "needContribution",
      "goalContribution",
      "driveContribution",
    ] as const) {
      const value = row[key === "acts" ? "count" : key];
      totals[key] += value;
      action[key] += value;
      person[key] += value;
    }
  }
  return {
    month,
    counterRows: rows.length,
    canonicalCounterSha256: sha256(JSON.stringify(canonicalRows)),
    actors: actors.size,
    actionIds: Object.keys(byActionId).length,
    totals,
    byPerson: Object.fromEntries(
      Object.entries(byPerson).sort(([left], [right]) => left.localeCompare(right)),
    ),
    byActionId: Object.fromEntries(
      Object.entries(byActionId).sort(([left], [right]) => left.localeCompare(right)),
    ),
    personActionRows: canonicalRows,
    newlyObservedDrives: births,
  };
}

function makeCounterObserver(one: number) {
  const rows = new Map<
    string,
    {
      month: string;
      actorId: string;
      actionId: string;
      acts: number;
      needContribution: number;
      goalContribution: number;
      driveContribution: number;
    }
  >();
  const observe = (decision: any, zero: number): undefined => {
    const selected = decision.selected;
    if (!selected) return undefined;
    const month = decision.date.slice(0, 7);
    const actorId = decision.actorId;
    const actionId = selected.definition.id;
    const key = JSON.stringify([month, actorId, actionId]);
    let row = rows.get(key);
    if (!row) {
      row = {
        month,
        actorId,
        actionId,
        acts: zero,
        needContribution: zero,
        goalContribution: zero,
        driveContribution: zero,
      };
      rows.set(key, row);
    }
    row.acts += one;
    row.needContribution += decision.selectedReasons?.need ?? zero;
    row.goalContribution += decision.selectedReasons?.goal ?? zero;
    row.driveContribution += decision.selectedReasons?.drive ?? zero;
    return undefined;
  };
  return { rows, observe };
}

function summarizeObservedCounters(
  rows: Map<string, {
    month: string;
    actorId: string;
    actionId: string;
    acts: number;
    needContribution: number;
    goalContribution: number;
    driveContribution: number;
  }>,
  months: readonly string[],
) {
  const sorted = [...rows.values()].sort(
    (left, right) =>
      left.month.localeCompare(right.month) ||
      left.actorId.localeCompare(right.actorId) ||
      left.actionId.localeCompare(right.actionId),
  );
  return months.map((month) => {
    const current = sorted.filter((row) => row.month === month);
    const totals: MonthlyTotals = {
      acts: 0,
      needContribution: 0,
      goalContribution: 0,
      driveContribution: 0,
    };
    const byPerson: Record<string, MonthlyTotals> = {};
    const byActionId: Record<string, MonthlyTotals> = {};
    for (const row of current) {
      const person = (byPerson[row.actorId] ??= {
        acts: 0,
        needContribution: 0,
        goalContribution: 0,
        driveContribution: 0,
      });
      const action = (byActionId[row.actionId] ??= {
        acts: 0,
        needContribution: 0,
        goalContribution: 0,
        driveContribution: 0,
      });
      for (const key of [
        "acts",
        "needContribution",
        "goalContribution",
        "driveContribution",
      ] as const) {
        totals[key] += row[key];
        person[key] += row[key];
        action[key] += row[key];
      }
    }
    return {
      month,
      counterRows: current.length,
      canonicalCounterSha256: sha256(JSON.stringify(current)),
      totals,
      byPerson: Object.fromEntries(
        Object.entries(byPerson).sort(([left], [right]) => left.localeCompare(right)),
      ),
      byActionId: Object.fromEntries(
        Object.entries(byActionId).sort(([left], [right]) => left.localeCompare(right)),
      ),
      personActionRows: current,
    };
  });
}

function emptyDriveBirths(): MonthSnapshot["newlyObservedDrives"] {
  return {
    newActiveIdsObserved: 0,
    withSourceRecord: 0,
    withoutSourceRecord: 0,
    sourceEventInSameMonth: 0,
    sourceEventInEarlierMonth: 0,
    byKind: {},
  };
}

function isMonthBoundary(date: string, target: string, addDays: (date: string, days: number) => string): boolean {
  return date === target || addDays(date, 1).slice(0, 7) !== date.slice(0, 7);
}

async function loadP8(repo: string, sourceManifestPath: string) {
  const sourceGuard = verifyCoreManifest(repo, sourceManifestPath);
  const importSource = (relativePath: string) =>
    import(pathToFileURL(resolve(repo, relativePath)).href);
  const [life, state, dates, parameters, data] = await Promise.all([
    importSource("src/core2/life.ts"),
    importSource("src/core2/state.ts"),
    importSource("src/simulation/dates.ts"),
    importSource("src/core2/parameters.ts"),
    importSource("src/core2/data.ts"),
  ]);
  const coreVersions = {
    apiVersion: data.CORE_API_VERSION as string,
    schemaVersion: data.CORE_SCHEMA_VERSION as string,
  };
  if (
    coreVersions.apiVersion !== "core2-api-v4" ||
    coreVersions.schemaVersion !== "core2-schema-v4"
  )
    throw new Error("The isolated candidate requires core2 API/schema v4.");
  const parameter = parameters.parameter;
  const measurement = JSON.parse(
    readFileSync(resolve(repo, "src/core2/data/measurement.json"), "utf8"),
  ) as {
    seed: string;
    startedAt: string;
  };
  return { sourceGuard, life, state, dates, parameter, measurement, coreVersions };
}

function assertCoreVersions(core: any, p8: Awaited<ReturnType<typeof loadP8>>): void {
  if (
    core.apiVersion !== p8.coreVersions.apiVersion ||
    core.schemaVersion !== p8.coreVersions.schemaVersion
  )
    throw new Error(
      `Core version mismatch: ${core.apiVersion}/${core.schemaVersion}; expected ${p8.coreVersions.apiVersion}/${p8.coreVersions.schemaVersion}.`,
    );
}

function readPackedInput(packedPath: string, metadataPath: string, sourceGuard: any) {
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as any;
  if (metadata.schema !== "p8-steady-benchmark-input-receipt-v1")
    throw new Error("Unexpected packed-input metadata schema.");
  const packedBytes = readFileSync(packedPath);
  if (
    packedBytes.byteLength !== metadata.transport.bytes ||
    sha256(packedBytes) !== metadata.transport.sha256
  )
    throw new Error("Packed input file does not match the pack receipt.");
  if (metadata.preparedInputSha256 !== metadata.expectedPreparedInputSha256)
    throw new Error("Prepared CoreInput hash differs from the captured run receipt.");
  if (
    sourceGuard.sourceManifestPath !== metadata.sourceGuard.sourceManifestPath ||
    sourceGuard.manifestSha256 !== metadata.sourceGuard.manifestSha256 ||
    sourceGuard.runtimeSourceSha256 !== metadata.sourceGuard.runtimeSourceSha256 ||
    sourceGuard.currentMeasurementToolingSha256 !==
      metadata.sourceGuard.currentMeasurementToolingSha256 ||
    sourceGuard.currentFullSourceSha256 !== metadata.sourceGuard.currentFullSourceSha256 ||
    sourceGuard.expectedPreparedInputSha256 !==
      metadata.sourceGuard.expectedPreparedInputSha256 ||
    JSON.stringify(sourceGuard.externalClosure) !==
      JSON.stringify(metadata.sourceGuard.externalClosure)
  )
    throw new Error("P8 sources or direct external dependencies changed since packing.");
  const envelope = JSON.parse(packedBytes.toString("utf8")) as {
    schema: string;
    sourceTable: JsonObject[];
    input: unknown;
  };
  if (envelope.schema !== transportSchema)
    throw new Error(`Unexpected packed transport schema: ${envelope.schema}`);
  const input = deepFreeze(restoreSources(envelope.sourceTable, envelope.input)) as any;
  if (input.seed === undefined || input.startedAt === undefined)
    throw new Error("Restored CoreInput lacks seed or startedAt.");
  return { input, metadata };
}

async function runWholeYearWarmup(
  input: any,
  throughDate: string,
  p8: Awaited<ReturnType<typeof loadP8>>,
) {
  const core = p8.life.createLifeCore(input, { observer: false });
  assertCoreVersions(core, p8);
  const observedCounters = makeCounterObserver(p8.parameter("one"));
  const zero = p8.parameter("zero");
  const controller = (decision: any) => observedCounters.observe(decision, zero);
  const advance = p8.life.advanceCore(core, throughDate, { controller });
  p8.state.assertCoreIntegrity(core);
  return {
    advance,
    outcomeSha256: digestValue(core, true),
    retainedCounterSha256: retainedCounterDigest(core),
    allTimeMonthActionRows: allTimeMonthActionRows(core),
    monthContributionSummaries: summarizeObservedCounters(
      observedCounters.rows,
      monthLabels(input.startedAt, throughDate, p8),
    ),
    finalDate: core.date,
    finalPeople: core.people.size,
    finalLogRecords: core.durableLog.size,
  };
}

function monthLabels(
  startDate: string,
  throughDate: string,
  p8: Awaited<ReturnType<typeof loadP8>>,
): string[] {
  const labels: string[] = [];
  const one = p8.parameter("one");
  let cursor = startDate;
  while (cursor < throughDate) {
    const nextDate = p8.dates.addDays(p8.dates.makeIsoDate(cursor), one);
    if (isMonthBoundary(nextDate, throughDate, (date, days) =>
      p8.dates.addDays(p8.dates.makeIsoDate(date), days),
    ))
      labels.push(nextDate.slice(0, 7));
    cursor = nextDate;
  }
  return labels;
}

function initializeSeenDrives(core: any): Set<string> {
  const seen = new Set<string>();
  for (const person of core.people.values())
    for (const id of person.drives.keys()) seen.add(`${person.id}\0${id}`);
  return seen;
}

function collectDriveBirths(core: any, date: string, seen: Set<string>, monthly: Map<string, MonthSnapshot["newlyObservedDrives"]>) {
  const month = date.slice(0, 7);
  let tally = monthly.get(month);
  if (!tally) monthly.set(month, (tally = emptyDriveBirths()));
  for (const person of core.people.values()) {
    for (const [id, drive] of person.drives as Map<string, any>) {
      const key = `${person.id}\0${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tally.newActiveIdsObserved += 1;
      const sourceRow = core.durableLog.get(drive.sourceEventId);
      if (sourceRow && core.eventIds.has(drive.sourceEventId))
        tally.withSourceRecord += 1;
      else tally.withoutSourceRecord += 1;
      if (sourceRow && sourceRow.date.slice(0, 7) === month)
        tally.sourceEventInSameMonth += 1;
      else if (sourceRow)
        tally.sourceEventInEarlierMonth += 1;
      const kind = drive.kind ?? "unclassified";
      tally.byKind[kind] = (tally.byKind[kind] ?? 0) + 1;
    }
  }
}

function gcEntriesForBoundary(observer: PerformanceObserver, pending: unknown[]) {
  const rows = [...pending, ...observer.takeRecords()];
  pending.length = 0;
  return rows.map((entry: any) => ({
    name: entry.name,
    kind: entry.detail?.kind,
    flags: entry.detail?.flags,
    durationMilliseconds: entry.duration,
    startTimeMilliseconds: entry.startTime,
  }));
}

async function runMeasuredDaily(input: any, throughDate: string, p8: Awaited<ReturnType<typeof loadP8>>) {
  const initializationStart = performance.now();
  const beforeInitialization = memorySample();
  const core = p8.life.createLifeCore(input, { observer: false });
  assertCoreVersions(core, p8);
  const initializedAt = performance.now();
  const afterInitialization = memorySample();
  const seenDrives = initializeSeenDrives(core);
  const driveScanInitializationMilliseconds = performance.now() - initializedAt;
  const dailyRows: JsonObject[] = [];
  const monthRows: MonthSnapshot[] = [];
  const monthlyDriveBirths = new Map<string, MonthSnapshot["newlyObservedDrives"]>();
  const pendingGc: unknown[] = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) pendingGc.push(entry);
  });
  observer.observe({ entryTypes: ["gc"] });
  let decisions = 0;
  let acts = 0;
  let simulatedDays = 0;
  let advanceMilliseconds = 0;
  let captureMilliseconds = 0;
  let driveBirthScanMilliseconds = 0;
  let cursor = input.startedAt as string;
  const dayOne = p8.parameter("one");
  const advanceStarted = performance.now();
  while (cursor < throughDate) {
    const nextDate = p8.dates.addDays(p8.dates.makeIsoDate(cursor), dayOne);
    const dayStarted = performance.now();
    const cpuBefore = process.cpuUsage();
    const advanceStartedAt = performance.now();
    const receipt = p8.life.advanceCore(core, nextDate);
    const advanceEndedAt = performance.now();
    advanceMilliseconds += advanceEndedAt - advanceStartedAt;
    decisions += receipt.decisions;
    acts += receipt.acts;
    simulatedDays += receipt.simulatedDays;
    const memoryBeforeBoundaryCapture = memorySample();

    const captureStarted = performance.now();
    const isBoundary = isMonthBoundary(nextDate, throughDate, (date, days) =>
      p8.dates.addDays(p8.dates.makeIsoDate(date), days),
    );
    let driveScanMs = 0;
    if (isBoundary) {
      const driveScanStarted = performance.now();
      collectDriveBirths(core, nextDate, seenDrives, monthlyDriveBirths);
      driveScanMs = performance.now() - driveScanStarted;
      driveBirthScanMilliseconds += driveScanMs;
      const month = nextDate.slice(0, 7);
      monthRows.push(
        snapshotMonth(core, month, monthlyDriveBirths.get(month) ?? emptyDriveBirths()),
      );
    }
    const gc = gcEntriesForBoundary(observer, pendingGc);
    const memory = memorySample();
    const cpu = process.cpuUsage(cpuBefore);
    const captureEndedAt = performance.now();
    const captureMs = captureEndedAt - captureStarted;
    captureMilliseconds += captureMs;
    dailyRows.push({
      date: nextDate,
      advanceMilliseconds: advanceEndedAt - advanceStartedAt,
      driveBirthScanMilliseconds: driveScanMs,
      boundaryCaptureMilliseconds: captureMs,
      totalBoundaryWallMilliseconds: captureEndedAt - dayStarted,
      cpuUserMilliseconds: cpu.user / 1000,
      cpuSystemMilliseconds: cpu.system / 1000,
      memory,
      memoryBeforeBoundaryCapture,
      gc,
      monthBoundary: isBoundary,
      decisions: receipt.decisions,
      acts: receipt.acts,
    });
    cursor = nextDate;
  }
  const unattributedGcEntries = gcEntriesForBoundary(observer, pendingGc);
  const completedAt = performance.now();
  observer.disconnect();
  const postAdvanceSample = memorySample();
  if (simulatedDays !== p8.dates.daysBetween(p8.dates.makeIsoDate(input.startedAt), p8.dates.makeIsoDate(throughDate)))
    throw new Error(`Daily path advanced ${simulatedDays} days, expected full year.`);
  p8.state.assertCoreIntegrity(core);

  const outcomeSha256 = digestValue(core, true);
  const retainedCounterSha256 = retainedCounterDigest(core);
  const allTimeRows = allTimeMonthActionRows(core);
  const capturedMonthActionRows = monthRows.flatMap((row) =>
    Object.entries(row.byActionId).map(([actionId, totals]) => ({
      month: row.month,
      actionId,
      acts: totals.acts,
    })),
  ).sort(
    (left, right) =>
      left.month.localeCompare(right.month) || left.actionId.localeCompare(right.actionId),
  );
  const postDigestSample = memorySample();
  const result = {
    simulatedDays,
    decisions,
    acts,
    outcomeSha256,
    retainedCounterSha256,
    allTimeMonthActionRows: allTimeRows,
    capturedMonthActionRows,
    monthlyBoundarySnapshots: monthRows,
    initializationMilliseconds: initializedAt - initializationStart,
    driveTrackerInitializationMilliseconds: driveScanInitializationMilliseconds,
    coreWallMilliseconds: completedAt - initializationStart,
    advanceAndBoundaryInstrumentationMilliseconds: completedAt - advanceStarted,
    advanceCoreCallMilliseconds: advanceMilliseconds,
    boundaryCaptureMilliseconds: captureMilliseconds,
    driveBirthScanMilliseconds,
    memory: {
      beforeInitialization,
      afterInitialization,
      postAdvance: postAdvanceSample,
      postOutcomeDigest: postDigestSample,
    },
    dailySamples: dailyRows,
    unattributedGcEntries,
    finalDate: core.date,
    finalPeople: core.people.size,
    finalLogRecords: core.durableLog.size,
  };
  return result;
}

function compareRows<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function runWorker(args: ReturnType<typeof parseArgs>): Promise<void> {
  const metadataHeader = JSON.parse(readFileSync(args.metadata, "utf8")) as any;
  const sourceManifestPath = metadataHeader.sourceGuard?.sourceManifestPath;
  if (typeof sourceManifestPath !== "string")
    throw new Error("Packed-input metadata does not identify its captured source manifest.");
  const p8 = await loadP8(args.repo, sourceManifestPath);
  const { input, metadata } = readPackedInput(args.packed, args.metadata, p8.sourceGuard);
  if (
    metadata.coreVersions?.apiVersion !== p8.coreVersions.apiVersion ||
    metadata.coreVersions?.schemaVersion !== p8.coreVersions.schemaVersion
  )
    throw new Error("Packed input was prepared for a different core API/schema version.");
  if (
    typeof metadata.harness?.packerPath !== "string" ||
    sha256(readFileSync(metadata.harness.packerPath)) !== metadata.harness.packerSha256
  )
    throw new Error("The isolated input-packer script changed after preparing this input.");
  const workerScriptPath = fileURLToPath(import.meta.url);
  const workerScriptSha256 = sha256(readFileSync(workerScriptPath));
  if (input.startedAt !== p8.measurement.startedAt || input.seed !== p8.measurement.seed)
    throw new Error("Prepared input date/seed differs from registered measurement metadata.");
  const yearSpanDays = p8.parameter("yearSpanDays");
  const throughDate = p8.dates.addDays(
    p8.dates.makeIsoDate(input.startedAt),
    yearSpanDays,
  );
  const expectedDays = p8.dates.daysBetween(
    p8.dates.makeIsoDate(input.startedAt),
    p8.dates.makeIsoDate(throughDate),
  );

  report("worker-prepared", {
    runId: args.runId,
    preparedInputSha256: metadata.preparedInputSha256,
    sourceDigest: p8.sourceGuard.runtimeSourceSha256,
    sourceManifestMatchesCaptured: p8.sourceGuard.sourceManifestMatchesCaptured,
    toolingDriftPaths: p8.sourceGuard.toolingDriftPaths,
    inputPeople: input.people.length,
    tracedPlayerId: metadata.traceSelection.playerId,
    focusPeople: metadata.traceSelection.focusPersonIds.length,
    tierScope: metadata.traceSelection.tierScope,
    coreVersions: p8.coreVersions,
    throughDate,
  });
  const preWarmupSample = memorySample();
  report("warmup-start", { runId: args.runId, throughDate });
  const warmupStarted = performance.now();
  const wholeYearWarmup = await runWholeYearWarmup(input, throughDate, p8);
  const warmupMilliseconds = performance.now() - warmupStarted;
  report("warmup-complete", {
    runId: args.runId,
    milliseconds: warmupMilliseconds,
    decisions: wholeYearWarmup.advance.decisions,
    acts: wholeYearWarmup.advance.acts,
  });
  const afterWarmupSample = memorySample();
  await new Promise<void>((resolveImmediate) => setImmediate(resolveImmediate));
  const afterWarmupReleaseSample = memorySample();
  if (wholeYearWarmup.advance.simulatedDays !== expectedDays)
    throw new Error("Whole-year warmup did not cover the configured year span.");

  report("measured-year-start", { runId: args.runId, throughDate });
  const measured = await runMeasuredDaily(input, throughDate, p8);
  report("measured-year-complete", {
    runId: args.runId,
    milliseconds: measured.coreWallMilliseconds,
    decisions: measured.decisions,
    acts: measured.acts,
    outcomeSha256: measured.outcomeSha256,
  });
  const finalParity = {
    wholeYearWarmupOutcomeSha256: wholeYearWarmup.outcomeSha256,
    dailyOutcomeSha256: measured.outcomeSha256,
    outcomeMatch: wholeYearWarmup.outcomeSha256 === measured.outcomeSha256,
    decisionsMatch: wholeYearWarmup.advance.decisions === measured.decisions,
    actsMatch: wholeYearWarmup.advance.acts === measured.acts,
    finalDateMatch: wholeYearWarmup.finalDate === measured.finalDate,
    finalPeopleMatch: wholeYearWarmup.finalPeople === measured.finalPeople,
    finalLogRecordsMatch: wholeYearWarmup.finalLogRecords === measured.finalLogRecords,
    monthActionRowsMatch: compareRows(
      wholeYearWarmup.allTimeMonthActionRows,
      measured.capturedMonthActionRows,
    ),
    monthContributionRowsMatch: compareRows(
      wholeYearWarmup.monthContributionSummaries,
      measured.monthlyBoundarySnapshots.map((row: MonthSnapshot) => ({
        month: row.month,
        counterRows: row.counterRows,
        canonicalCounterSha256: row.canonicalCounterSha256,
        totals: row.totals,
        byPerson: row.byPerson,
        byActionId: row.byActionId,
        personActionRows: row.personActionRows,
      })),
    ),
    retainedMonthlyCounterMatch:
      wholeYearWarmup.retainedCounterSha256 === measured.retainedCounterSha256,
    monthContributionObserver:
      "The one-shot warmup controller only reads selected action and selected reason fields, returns undefined, and accumulates expected month/person/action counters. The measured run records the actual month index after that day’s normal compaction; the current month remains retained at its own boundary.",
  };
  if (
    !finalParity.outcomeMatch ||
    !finalParity.decisionsMatch ||
    !finalParity.actsMatch ||
    !finalParity.finalDateMatch ||
    !finalParity.finalPeopleMatch ||
    !finalParity.finalLogRecordsMatch ||
    !finalParity.monthActionRowsMatch ||
    !finalParity.monthContributionRowsMatch ||
    !finalParity.retainedMonthlyCounterMatch
  )
    throw new Error(`Daily-step parity failed: ${JSON.stringify(finalParity)}`);
  const sourceGuardAfterRun = verifyCoreManifest(args.repo, sourceManifestPath);
  if (
    sourceGuardAfterRun.manifestSha256 !== p8.sourceGuard.manifestSha256 ||
    sourceGuardAfterRun.runtimeSourceSha256 !== p8.sourceGuard.runtimeSourceSha256 ||
    sourceGuardAfterRun.currentMeasurementToolingSha256 !==
      p8.sourceGuard.currentMeasurementToolingSha256 ||
    sourceGuardAfterRun.currentFullSourceSha256 !==
      p8.sourceGuard.currentFullSourceSha256 ||
    sourceGuardAfterRun.expectedPreparedInputSha256 !==
      p8.sourceGuard.expectedPreparedInputSha256 ||
    JSON.stringify(sourceGuardAfterRun.externalClosure) !==
      JSON.stringify(p8.sourceGuard.externalClosure)
  )
    throw new Error("Source bytes changed during the isolated worker run.");

  const coreRunSamples = measured.dailySamples.map((row) => row.memory as MemorySample);
  const measuredRssPeak = Math.max(
    measured.memory.beforeInitialization.rssBytes,
    measured.memory.afterInitialization.rssBytes,
    measured.memory.postAdvance.rssBytes,
    ...coreRunSamples.map((row) => row.rssBytes),
  );
  const preCaptureRssPeak = Math.max(
    measured.memory.beforeInitialization.rssBytes,
    measured.memory.afterInitialization.rssBytes,
    measured.memory.postAdvance.rssBytes,
    ...measured.dailySamples.map(
      (row) =>
        (row.memoryBeforeBoundaryCapture as MemorySample).rssBytes,
    ),
  );
  const measuredHeapPeak = Math.max(
    measured.memory.beforeInitialization.heapUsedBytes,
    measured.memory.afterInitialization.heapUsedBytes,
    measured.memory.postAdvance.heapUsedBytes,
    ...coreRunSamples.map((row) => row.heapUsedBytes),
  );
  const receipt = {
    schema: "p8-isolated-steady-year-run-v1",
    protocol: measurementProtocol,
    runId: args.runId,
    coreVersions: p8.coreVersions,
    source: p8.sourceGuard,
    sourceStableThroughWorker: true,
    harness: {
      packerPath: metadata.harness.packerPath,
      packerSha256: metadata.harness.packerSha256,
      workerPath: workerScriptPath,
      workerSha256: workerScriptSha256,
    },
    input: {
      rawInputSha256: metadata.rawInputSha256,
      preparedInputSha256: metadata.preparedInputSha256,
      packedTransportSha256: metadata.transport.sha256,
      traceSelection: metadata.traceSelection,
    },
    scope: {
      generatedPopulation: false,
      inputPreparation: "separate packer process; excluded from this worker's simulation timer and RSS proposal",
      inputParseAndSourceTableReconstitution: "loaded before pre-initialization sample; its residual memory is visible in all worker samples",
      onlyOneCoreStateLiveAtATime: true,
      warmup: "one whole-year advanceCore call on a fresh CoreState; summary retained, CoreState leaves scope before measured CoreState construction; no forced GC",
      measuredPath: "one-day advanceCore calls; month indexes captured after that day's normal compaction while the current month remains retained",
      observer: false,
      sourceInterning: "transport uses shared references for identical read-only Source descriptors; round-trip prepared-input SHA-256 was verified by the isolated packer before this worker starts",
      timingExcludes: ["whole-state hashing", "month/action parity reconciliation", "receipt JSON serialization"],
      timingIncludes: ["core initialization", "all daily advanceCore calls", "daily CPU/RSS/heap/GC sampling", "drive birth scan", "monthly counter capture"],
      limitations: [
        "Per-day instrumentation adds work to the measured loop; the reported wall time is for this instrumented protocol, not an uninstrumented gameplay rate.",
        "New active drive IDs are first observed at month boundaries. Same-month source-event dates identify event-linked new drives; they do not provide an exact creation timestamp. The current core has no drive delete or clear operation.",
        "processLifetimeMaxRssBytes is cumulative across packed-input loading, whole-year warmup, and measured work; boundary RSS and heap samples are also reported. Node reports maxRSS in bytes on Windows and KiB on other platforms, so the harness normalizes it to bytes.",
        "GC entries can be delivered between day boundaries; undelivered records are attached to the next boundary or reported as unattributed at worker completion.",
        "The captured per-file source manifest pins src/core2 TypeScript/JSON at its recorded file count. Direct external imports are separately hashed; Node/runtime/platform dependencies are not in this source closure.",
      ],
    },
    run: {
      startDate: input.startedAt,
      throughDate,
      expectedDays,
      simulatedDays: measured.simulatedDays,
      decisions: measured.decisions,
      acts: measured.acts,
      warmupWholeYearMilliseconds: warmupMilliseconds,
      warmupAdvanceReceipt: wholeYearWarmup.advance,
      coreInitializationMilliseconds: measured.initializationMilliseconds,
      driveTrackerInitializationMilliseconds: measured.driveTrackerInitializationMilliseconds,
      measuredCoreAdvanceAndInstrumentationMilliseconds:
        measured.advanceAndBoundaryInstrumentationMilliseconds,
      fullCoreWallMilliseconds: measured.coreWallMilliseconds,
      advanceCoreCallMilliseconds: measured.advanceCoreCallMilliseconds,
      dailyBoundaryCaptureMilliseconds: measured.boundaryCaptureMilliseconds,
      driveBirthScanMilliseconds: measured.driveBirthScanMilliseconds,
      decisionsPerDay: measured.decisions / measured.simulatedDays,
      actsPerDay: measured.acts / measured.simulatedDays,
      outcomeSha256: measured.outcomeSha256,
      retainedCounterSha256: measured.retainedCounterSha256,
      outcomeParity: finalParity,
      measuredBoundaryRssPeakBytes: measuredRssPeak,
      preCaptureBoundaryRssPeakBytes: preCaptureRssPeak,
      measuredBoundaryHeapPeakBytes: measuredHeapPeak,
      warmupMemory: {
        before: preWarmupSample,
        afterAdvanceAndDigest: afterWarmupSample,
        afterScopeRelease: afterWarmupReleaseSample,
      },
      memory: measured.memory,
      dailySamples: measured.dailySamples,
      unattributedGcEntries: measured.unattributedGcEntries,
      monthlyBoundarySnapshots: measured.monthlyBoundarySnapshots,
    },
  };
  const serializationStarted = performance.now();
  const receiptText = JSON.stringify(receipt);
  const receiptSerializationMilliseconds = performance.now() - serializationStarted;
  const postReceiptSerializationSample = memorySample();
  const output = {
    ...receipt,
    run: {
      ...receipt.run,
      receiptSerializationMilliseconds,
      postReceiptSerializationSample,
      receiptBytesBeforePostSerializationFields: Buffer.byteLength(receiptText),
    },
  };
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle]!;
}

function percentiles(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const at = (fraction: number) =>
    sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)))];
  return { min: sorted[0], p25: at(0.25), median: median(sorted), p75: at(0.75), max: sorted.at(-1) };
}

function atomicWrite(path: string, value: unknown): void {
  const temporary = `${path}.partial`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}

async function spawnWorker(args: ReturnType<typeof parseArgs>, index: number): Promise<any> {
  const scriptPath = fileURLToPath(import.meta.url);
  const childArgs = [
    ...process.execArgv,
    scriptPath,
    "--worker",
    "--repo",
    args.repo,
    "--packed",
    args.packed,
    "--metadata",
    args.metadata,
    "--run-id",
    String(index),
  ];
  report("worker-start", { runId: index, serial: true });
  return await new Promise((resolveWorker, rejectWorker) => {
    const child = spawn(process.execPath, childArgs, {
      cwd: args.repo,
      stdio: ["ignore", "pipe", "inherit"],
    });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.on("error", rejectWorker);
    child.on("close", (code) => {
      if (code !== 0) {
        rejectWorker(new Error(`Worker ${index} exited with code ${code}.`));
        return;
      }
      try {
        resolveWorker(JSON.parse(stdout.trim()));
      } catch (error) {
        rejectWorker(error);
      }
    });
  });
}

async function runSerialWorkers(args: ReturnType<typeof parseArgs>): Promise<void> {
  const metadata = JSON.parse(readFileSync(args.metadata, "utf8")) as any;
  const sourceManifestPath = metadata.sourceGuard?.sourceManifestPath;
  if (typeof sourceManifestPath !== "string")
    throw new Error("Packed-input metadata does not identify its captured source manifest.");
  const initialSourceGuard = verifyCoreManifest(args.repo, sourceManifestPath);
  if (
    metadata.expectedPreparedInputSha256 !== metadata.preparedInputSha256 ||
    (initialSourceGuard.expectedPreparedInputSha256 !== undefined &&
      initialSourceGuard.expectedPreparedInputSha256 !== metadata.preparedInputSha256)
  )
    throw new Error("Packed CoreInput does not match the captured run's prepared-input hash.");
  const results: any[] = [];
  for (let index = 1; index <= args.runs; index += 1) {
    const result = await spawnWorker(args, index);
    if (result.input.preparedInputSha256 !== metadata.preparedInputSha256)
      throw new Error(`Worker ${index} used a different prepared input hash.`);
    if (result.source.runtimeSourceSha256 !== initialSourceGuard.runtimeSourceSha256)
      throw new Error(`Worker ${index} used a different source digest.`);
    if (
      result.source.currentMeasurementToolingSha256 !==
        initialSourceGuard.currentMeasurementToolingSha256 ||
      result.source.currentFullSourceSha256 !== initialSourceGuard.currentFullSourceSha256
    )
      throw new Error(`Worker ${index} used different captured tooling/source bytes.`);
    if (
      results.length > 0 &&
      (result.harness.workerSha256 !== results[0]?.harness.workerSha256 ||
        result.harness.packerSha256 !== results[0]?.harness.packerSha256)
    )
      throw new Error(`Worker ${index} used different measurement harness sources.`);
    results.push(result);
    atomicWrite(`${args.output}.partial-receipt.json`, {
      schema: "p8-isolated-steady-year-checkpoint-v1",
      completedWorkers: results.length,
      expectedWorkers: args.runs,
      runs: results,
    });
    report("worker-complete", {
      runId: index,
      milliseconds: result.run.fullCoreWallMilliseconds,
      measuredBoundaryRssPeakBytes: result.run.measuredBoundaryRssPeakBytes,
      outcomeSha256: result.run.outcomeSha256,
    });
  }
  const sourceGuardAfterWorkers = verifyCoreManifest(args.repo, sourceManifestPath);
  if (
    sourceGuardAfterWorkers.manifestSha256 !== initialSourceGuard.manifestSha256 ||
    sourceGuardAfterWorkers.runtimeSourceSha256 !== initialSourceGuard.runtimeSourceSha256 ||
    sourceGuardAfterWorkers.currentMeasurementToolingSha256 !==
      initialSourceGuard.currentMeasurementToolingSha256 ||
    sourceGuardAfterWorkers.currentFullSourceSha256 !==
      initialSourceGuard.currentFullSourceSha256 ||
    sourceGuardAfterWorkers.expectedPreparedInputSha256 !==
      initialSourceGuard.expectedPreparedInputSha256 ||
    JSON.stringify(sourceGuardAfterWorkers.externalClosure) !==
      JSON.stringify(initialSourceGuard.externalClosure)
  )
    throw new Error("Core source or direct dependency bytes changed across worker runs.");
  const runTimes = results.map((row) => row.run.fullCoreWallMilliseconds as number);
  const rssPeaks = results.map((row) => row.run.measuredBoundaryRssPeakBytes as number);
  const dailyTimes = results.flatMap((row) =>
    row.run.dailySamples.map((sample: any) => sample.totalBoundaryWallMilliseconds as number),
  );
  const receipt = {
    schema: "p8-isolated-steady-year-receipt-v1",
    protocol: measurementProtocol,
    source: initialSourceGuard,
    sourceStableAcrossWorkers: true,
    harness: results[0]?.harness,
    input: {
      rawInputSha256: metadata.rawInputSha256,
      preparedInputSha256: metadata.preparedInputSha256,
      packedTransportSha256: metadata.transport.sha256,
      traceSelection: metadata.traceSelection,
    },
    workerCount: results.length,
    workerOrder: "fresh subprocesses launched and awaited serially; one warmup CoreState and one measured CoreState per process; no two worlds overlap",
    timing: {
      scope: "core initialization + instrumented one-day advancement; excludes warmup, input parse, final state hashing, parity reconciliation, and receipt serialization",
      samplesMilliseconds: runTimes,
      minMilliseconds: Math.min(...runTimes),
      medianMilliseconds: median(runTimes),
      maxMilliseconds: Math.max(...runTimes),
      spreadMilliseconds: Math.max(...runTimes) - Math.min(...runTimes),
      perDayInstrumentedWallMilliseconds: percentiles(dailyTimes),
      varianceEvidence: "Daily wall samples, process CPU deltas, GC observations, heap/RSS boundary samples, warmup timings, and serialization phases are retained so run variation can be analyzed. This receipt does not assign a cause to variance.",
    },
    memory: {
      measuredBoundaryRssPeakBytes: Math.max(...rssPeaks),
      measuredBoundaryRssByRunBytes: rssPeaks,
      preCaptureBoundaryRssByRunBytes: results.map(
        (row) => row.run.preCaptureBoundaryRssPeakBytes,
      ),
      processLifetimeMaxRssBytesByRun: results.map(
        (row) => row.run.dailySamples.at(-1).memory.processLifetimeMaxRssBytes,
      ),
      scope: "Sampled RSS/heap during measured CoreState advancement after input reconstruction and warmup. Boundary samples include retained monthly measurement summaries; pre-capture samples omit the current boundary's new summary only. Process-lifetime high-water is separately labeled and includes earlier phases.",
    },
    ciBudgetProposal: {
      tag: "TUNABLE",
      status: "provisional observed-envelope proposal; CI-host behavior remains unmeasured",
      checkRange: {
        kind: "observed-envelope",
        yearMilliseconds: {
          low: Math.min(...runTimes),
          high: Math.max(...runTimes),
          unit: "ms",
          source: "the serial fresh-process run samples in this receipt",
        },
        measuredBoundaryRssBytes: {
          low: Math.min(...rssPeaks),
          high: Math.max(...rssPeaks),
          unit: "bytes",
        source: "day-boundary process RSS after the isolated input load and warmup; samples include current instrumentation summaries and previously retained monthly snapshots",
      },
      preCaptureBoundaryRssBytes: {
        low: Math.min(...results.map((row) => row.run.preCaptureBoundaryRssPeakBytes)),
        high: Math.max(...results.map((row) => row.run.preCaptureBoundaryRssPeakBytes)),
        unit: "bytes",
        source: "sampled immediately after each day advances and before that day's month/drive capture; still includes input, warmup residue, and prior retained monthly summaries",
        },
        empiricalCalibrationPassed: false,
      },
      proposedMaxInstrumentedYearMilliseconds: Math.max(...runTimes),
      proposedMaxMeasuredBoundaryRssBytes: Math.max(...rssPeaks),
      proposedMaxPreCaptureBoundaryRssBytes: Math.max(
        ...results.map((row) => row.run.preCaptureBoundaryRssPeakBytes),
      ),
      derivation: "Maximum of these serial fresh-process samples only; no unmeasured margin is added. Treat as a provisional checkRange proposal, not a calibrated limit or a guarantee.",
      sampleCount: results.length,
    },
    semanticParity: {
      allRunsPassed: results.every((row) => row.run.outcomeParity.outcomeMatch),
      allOutcomeHashesEqual: new Set(results.map((row) => row.run.outcomeSha256)).size === 1,
      allPerRunChecksPassed: results.every((row) =>
        Object.entries(row.run.outcomeParity)
          .filter(([key]) => key.endsWith("Match"))
          .every(([, value]) => value === true),
      ),
      limitation: "Per-month rows are compared with a separate one-shot controller stream of selected actions and reasons, and final retained counters are compared directly. Historical rows pruned from the one-shot CoreState itself are not available for a second stored-index comparison.",
    },
    runs: results,
  };
  atomicWrite(args.output, receipt);
  report("receipt-written", { output: args.output, workerCount: results.length });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.worker) await runWorker(args);
  else await runSerialWorkers(args);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
