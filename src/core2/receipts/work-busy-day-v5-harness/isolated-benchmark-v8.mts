import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PerformanceObserver, performance } from "node:perf_hooks";
import { Session } from "node:inspector";

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
const transportSchema = "p8-source-interned-core-input-v4-prepared-work";
const measurementProtocol = "p8-isolated-steady-year-v4-prepared-work";

function parseArgs(args: readonly string[]): {
  worker: boolean;
  repo: string;
  packed: string;
  metadata: string;
  output: string;
  runs: number;
  runId?: string;
  profileDate?: string;
  profileOutput?: string;
  profileSummary?: string;
  profileSamplingIntervalMicros?: number;
  profileTopFrames?: number;
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
  const profileSamplingIntervalMicros = values["profile-sampling-interval-micros"] === undefined
    ? undefined : Number(values["profile-sampling-interval-micros"]);
  const profileTopFrames = values["profile-top-frames"] === undefined
    ? undefined : Number(values["profile-top-frames"]);
  if (profileSamplingIntervalMicros !== undefined &&
      (!Number.isSafeInteger(profileSamplingIntervalMicros) || profileSamplingIntervalMicros <= 0))
    throw new Error("--profile-sampling-interval-micros must be a positive whole number.");
  if (profileTopFrames !== undefined &&
      (!Number.isSafeInteger(profileTopFrames) || profileTopFrames <= 0))
    throw new Error("--profile-top-frames must be a positive whole number.");
  return {
    worker,
    repo: resolve(values.repo ?? "/workspace/p8-core-prototype"),
    packed: resolve(values.packed ?? "/tmp/p8-prepared-work-input-v7.packed.json"),
    metadata: resolve(values.metadata ?? "/tmp/p8-prepared-work-input-v7.meta.json"),
    output: resolve(values.output ?? "/tmp/p8-steady-year-v7-prepared-work-receipt.json"),
    runs,
    runId: values["run-id"],
    profileDate: values["profile-date"],
    profileOutput: values["profile-output"] ? resolve(values["profile-output"]) : undefined,
    profileSummary: values["profile-summary"] ? resolve(values["profile-summary"]) : undefined,
    profileSamplingIntervalMicros,
    profileTopFrames,
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


function summarizeWorkActReconciliation(core: any) {
  const data = core.data.work;
  if (!data) return { configured: false, matches: true, reason: "scheduled work is not configured" };
  const attendanceActionId = data.attendanceAction.id as string;
  const absenceActionId = data.absenceAction.id as string;
  let recordedAttendance = 0;
  let recordedAbsence = 0;
  for (const [key, count] of core.actsByMonthKind as Map<string, number>) {
    const separator = key.indexOf(":");
    if (separator < 0) throw new Error(`Malformed all-time action key: ${key}`);
    const actionId = key.slice(separator + 1);
    if (actionId === attendanceActionId) recordedAttendance += count;
    if (actionId === absenceActionId) recordedAbsence += count;
  }
  let expectedAttendance = 0;
  let expectedAbsence = 0;
  let perPersonMatches = true;
  let resultedJobCount = 0;
  for (const [jobId, totals] of core.work.totalsByJob as Map<string, any>) {
    resultedJobCount += 1;
    const job = core.jobs.get(jobId);
    const person = job && core.people.get(job.personId);
    if (!job || !person) throw new Error(`Work totals have no canonical job/person: ${jobId}`);
    expectedAttendance += totals.workedDays;
    expectedAbsence += totals.missedDays;
    perPersonMatches &&=
      (person.actsByKind.get(attendanceActionId) ?? 0) === totals.workedDays &&
      (person.actsByKind.get(absenceActionId) ?? 0) === totals.missedDays;
  }
  const attendanceMatches = recordedAttendance === expectedAttendance;
  const absenceMatches = recordedAbsence === expectedAbsence;
  return {
    configured: true,
    commitmentCount: core.work.commitments.size,
    resultedJobCount,
    recordedDecisionCount: recordedAttendance + recordedAbsence,
    attendanceActionId,
    absenceActionId,
    recordedAttendance,
    expectedAttendance,
    recordedAbsence,
    expectedAbsence,
    perPersonMatches,
    attendanceMatches,
    absenceMatches,
    matches: core.work.commitments.size > 0 && resultedJobCount > 0 &&
      recordedAttendance + recordedAbsence > 0 && perPersonMatches && attendanceMatches && absenceMatches,
    source: "canonical all-time action counts and per-person act-kind indexes compared with dated work totals; work decisions call the same recordAct writer without using advanceCore controller callbacks",
  };
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
    coreVersions.apiVersion !== "core2-api-v5" ||
    coreVersions.schemaVersion !== "core2-schema-v5"
  )
    throw new Error("The prepared-work candidate requires core2 API/schema v5.");
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
  if (metadata.schema !== "p8-steady-benchmark-input-receipt-v4-prepared-work" ||
      metadata.inputWasAlreadyPrepared !== true || metadata.selectionWasReapplied !== false)
    throw new Error("Unexpected packed-input metadata schema.");
  if (typeof metadata.captureReceiptPath !== "string" ||
      typeof metadata.captureReceiptSha256 !== "string" ||
      metadata.captureReceiptPath !== sourceGuard.sourceManifestPath)
    throw new Error("Prepared-input metadata has no pinned root capture receipt.");
  const captureBytes = readFileSync(metadata.captureReceiptPath);
  if (sha256(captureBytes) !== metadata.captureReceiptSha256)
    throw new Error("Root capture receipt changed after prepared-input packing.");
  const capture = JSON.parse(captureBytes.toString("utf8")) as any;
  if (capture.preparedInputSha256 !== metadata.preparedInputSha256 ||
      capture.preparedInputExport?.sha256 !== metadata.preparedInputSha256 ||
      capture.parameters?.openingEmployment !== metadata.featureFlags?.openingEmployment ||
      capture.parameters?.scheduledWork !== metadata.featureFlags?.scheduledWork ||
      capture.coreVersions?.apiVersion !== metadata.coreVersions?.apiVersion ||
      capture.coreVersions?.schemaVersion !== metadata.coreVersions?.schemaVersion ||
      capture.trace?.playerId !== metadata.traceSelection?.playerId ||
      JSON.stringify(capture.trace?.focusPersonIds) !== JSON.stringify(metadata.traceSelection?.focusPersonIds) ||
      JSON.stringify(capture.trace?.focusPlaceIds) !== JSON.stringify(metadata.traceSelection?.focusPlaceIds) ||
      JSON.stringify(capture.trace?.visiblePlaceIds) !== JSON.stringify(metadata.traceSelection?.visiblePlaceIds) ||
      capture.trace?.tierScope !== metadata.traceSelection?.tierScope ||
      capture.trace?.focusPersonCount !== metadata.traceSelection?.initialFocusPersonCount ||
      JSON.stringify(capture.trace?.focusPersonIds) !== JSON.stringify(metadata.traceSelection?.initialFocusPersonIds))
    throw new Error("Packed flags, core version, or focus metadata differs from the root capture receipt.");
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
  const capturedLastRun = Array.isArray(capture.runs) ? capture.runs[capture.runs.length - 1] : undefined;
  const capturedFinalCounts = capturedLastRun?.world?.counts;
  if (metadata.traceSelection?.populationPersonCount !== input.people.length ||
      capturedFinalCounts?.people !== metadata.traceSelection?.populationPersonCount ||
      metadata.traceSelection?.capturedFinalDailyCirclePeople !== capturedFinalCounts?.dailyCirclePeople ||
      metadata.traceSelection?.initialFocusPersonCount !== input.focusPersonIds.length ||
      JSON.stringify(metadata.traceSelection?.initialFocusPersonIds) !== JSON.stringify(input.focusPersonIds))
    throw new Error("Prepared focus/tier summary differs from the pinned input and final root capture.");
  return { input, metadata };
}

function focusPersonIds(core: any): string[] {
  return [...core.focusPersonIds]
    .filter((id) => core.people.has(id))
    .sort();
}

function assertInitialFocus(core: any, input: any): string[] {
  const expected = [...new Set(input.focusPersonIds as string[])]
    .filter((id) => core.people.has(id))
    .sort();
  const admitted = focusPersonIds(core);
  if (JSON.stringify(admitted) !== JSON.stringify(expected))
    throw new Error("Core initialization changed the exact captured initial focus set.");
  return expected;
}

function summarizeFocus(core: any, initialIds: readonly string[]) {
  const finalIds = focusPersonIds(core);
  const finalSet = new Set(finalIds);
  if (initialIds.some((id) => !finalSet.has(id)))
    throw new Error("Final focus no longer contains every initially admitted person.");
  return {
    initialFocusPersonCount: initialIds.length,
    initialFocusPersonIdsSha256: sha256(JSON.stringify(initialIds)),
    finalDailyCirclePeople: finalIds.length,
    focusGrowthPeopleCount: finalIds.length - initialIds.length,
    finalFocusPersonIdsSha256: sha256(JSON.stringify(finalIds)),
    finalFocusPersonIds: finalIds,
  };
}

async function runWholeYearWarmup(
  input: any,
  throughDate: string,
  p8: Awaited<ReturnType<typeof loadP8>>,
  scheduledWork: boolean,
) {
  const core = p8.life.createLifeCore(input, { observer: false, scheduledWork });
  assertCoreVersions(core, p8);
  const initialFocusIds = assertInitialFocus(core, input);
  let simulatedDays = p8.parameter("zero");
  let decisions = p8.parameter("zero");
  let acts = p8.parameter("zero");
  const monthSnapshots: MonthSnapshot[] = [];
  for (const boundary of monthBoundaries(input.startedAt, throughDate, p8)) {
    const advance = p8.life.advanceCore(core, boundary.date);
    simulatedDays += advance.simulatedDays;
    decisions += advance.decisions;
    acts += advance.acts;
    if (core.date !== boundary.date)
      throw new Error(`Monthly warmup stopped at ${core.date}, expected ${boundary.date}.`);
    monthSnapshots.push(snapshotMonth(core, boundary.month, emptyDriveBirths()));
  }
  const aggregateAdvance = { simulatedDays, decisions, acts };
  const workActs = summarizeWorkActReconciliation(core);
  if (!workActs.matches)
    throw new Error(`Monthly warmup missed committed work acts: ${JSON.stringify(workActs)}`);
  p8.state.assertCoreIntegrity(core);
  const focus = summarizeFocus(core, initialFocusIds);
  return {
    advance: aggregateAdvance,
    outcomeSha256: digestValue(core, true),
    retainedCounterSha256: retainedCounterDigest(core),
    allTimeMonthActionRows: allTimeMonthActionRows(core),
    workActReconciliation: workActs,
    monthContributionSummaries: monthSnapshots.map((row) => ({
      month: row.month,
      counterRows: row.counterRows,
      canonicalCounterSha256: row.canonicalCounterSha256,
      totals: row.totals,
      byPerson: row.byPerson,
      byActionId: row.byActionId,
      personActionRows: row.personActionRows,
    })),
    finalDate: core.date,
    finalPeople: core.people.size,
    finalLogRecords: core.durableLog.size,
    focus,
  };
}

function monthBoundaries(
  startDate: string,
  throughDate: string,
  p8: Awaited<ReturnType<typeof loadP8>>,
): { month: string; date: string }[] {
  const boundaries: { month: string; date: string }[] = [];
  const one = p8.parameter("one");
  let cursor = startDate;
  while (cursor < throughDate) {
    const nextDate = p8.dates.addDays(p8.dates.makeIsoDate(cursor), one);
    if (isMonthBoundary(nextDate, throughDate, (date, days) =>
      p8.dates.addDays(p8.dates.makeIsoDate(date), days),
    )) boundaries.push({ month: nextDate.slice(0, 7), date: nextDate });
    cursor = nextDate;
  }
  return boundaries;
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

async function runMeasuredDaily(
  input: any,
  throughDate: string,
  p8: Awaited<ReturnType<typeof loadP8>>,
  scheduledWork: boolean,
) {
  const initializationStart = performance.now();
  const beforeInitialization = memorySample();
  const core = p8.life.createLifeCore(input, { observer: false, scheduledWork });
  assertCoreVersions(core, p8);
  const initialFocusIds = assertInitialFocus(core, input);
  const initializedAt = performance.now();
  const afterInitialization = memorySample();
  const seenDrives = initializeSeenDrives(core);
  const driveScanInitializationMilliseconds = performance.now() - initializedAt;
  const dailyRows: JsonObject[] = [];
  const dayIntervals: { date: string; start: number; end: number }[] = [];
  const collectedGcEntries: JsonObject[] = [];
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
    collectedGcEntries.push(...gcEntriesForBoundary(observer, pendingGc));
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
      gc: [],
      monthBoundary: isBoundary,
      decisions: receipt.decisions,
      acts: receipt.acts,
    });
    dayIntervals.push({ date: nextDate, start: dayStarted, end: captureEndedAt });
    cursor = nextDate;
  }
  const completedAt = performance.now();
  const postAdvanceSample = memorySample();
  // PerformanceObserver callbacks are delivered on an event-loop turn. Flush
  // after freezing the timed window so late delivery cannot disappear on
  // disconnect or extend the reported measured-year wall time.
  await new Promise<void>((resolveImmediate) => setImmediate(resolveImmediate));
  collectedGcEntries.push(...gcEntriesForBoundary(observer, pendingGc));
  observer.disconnect();
  const uniqueGcEntries = new Map<string, JsonObject>();
  for (const entry of collectedGcEntries) {
    const key = JSON.stringify([
      entry.name,
      entry.kind,
      entry.flags,
      entry.durationMilliseconds,
      entry.startTimeMilliseconds,
    ]);
    uniqueGcEntries.set(key, entry);
  }
  const gcByDate = new Map<string, JsonObject[]>();
  const unattributedGcEntries: JsonObject[] = [];
  let measuredWindowUnattributedGcCount = 0;
  let outsideWindowGcCount = 0;
  for (const entry of uniqueGcEntries.values()) {
    const startedAt = entry.startTimeMilliseconds as number;
    const interval = dayIntervals.find(
      (row) => startedAt >= row.start && startedAt < row.end,
    );
    if (interval) {
      const entries = gcByDate.get(interval.date) ?? [];
      entries.push(entry);
      gcByDate.set(interval.date, entries);
      continue;
    }
    const inMeasuredWindow = startedAt >= advanceStarted && startedAt <= completedAt;
    if (inMeasuredWindow) measuredWindowUnattributedGcCount += 1;
    else outsideWindowGcCount += 1;
    unattributedGcEntries.push({
      ...entry,
      observationScope: inMeasuredWindow
        ? "in-measured-window-no-day-interval"
        : "outside-measured-window",
    });
  }
  for (const row of dailyRows)
    row.gc = gcByDate.get(row.date as string) ?? [];
  const gcCapture = {
    status: "flushed-and-start-time-attributed",
    eventLoopFlushAfterTimedWindow: true,
    observerDisconnectedAfterFlush: true,
    sampleDayIntervalCount: dayIntervals.length,
    observedEventCount: uniqueGcEntries.size,
    attributedEventCount: [...gcByDate.values()].reduce(
      (sum, rows) => sum + rows.length,
      0,
    ),
    measuredWindowUnattributedEventCount: measuredWindowUnattributedGcCount,
    outsideWindowEventCount: outsideWindowGcCount,
    measuredWindowStartMilliseconds: advanceStarted,
    measuredWindowEndMilliseconds: completedAt,
    dayIntervals: dayIntervals.map((row) => ({
      date: row.date,
      startTimeMilliseconds: row.start,
      endTimeMilliseconds: row.end,
    })),
    zeroObservationMeaning:
      "No GC entries were delivered by the active PerformanceObserver after its final flush; this is scoped to the recorded measured window, not a claim about GC outside observer coverage.",
  };
  if (simulatedDays !== p8.dates.daysBetween(p8.dates.makeIsoDate(input.startedAt), p8.dates.makeIsoDate(throughDate)))
    throw new Error(`Daily path advanced ${simulatedDays} days, expected full year.`);
  p8.state.assertCoreIntegrity(core);
  const focus = summarizeFocus(core, initialFocusIds);

  const outcomeSha256 = digestValue(core, true);
  const retainedCounterSha256 = retainedCounterDigest(core);
  const workActReconciliation = summarizeWorkActReconciliation(core);
  if (!workActReconciliation.matches)
    throw new Error(`Measured run missed committed work acts: ${JSON.stringify(workActReconciliation)}`);
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
    workActReconciliation,
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
    gcCapture,
    finalDate: core.date,
    finalPeople: core.people.size,
    finalLogRecords: core.durableLog.size,
    focus,
  };
  return result;
}

function compareRows<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function postInspector(session: any, method: string, params: Record<string, unknown> = {}): Promise<any> {
  return new Promise((resolvePost, rejectPost) => {
    session.post(method, params, (error: Error | null, result: any) => {
      if (error) rejectPost(error);
      else resolvePost(result);
    });
  });
}

function profileFrameSummary(profile: any, intervalMicros: number, topFrames: number) {
  const nodes = new Map<number, any>((profile.nodes ?? []).map((node: any) => [node.id, node]));
  const parent = new Map<number, number>();
  for (const node of nodes.values())
    for (const child of node.children ?? []) parent.set(child, node.id);
  const byFrame = new Map<string, {
    functionName: string; url: string; lineNumber: number; columnNumber: number;
    selfSampleMilliseconds: number; inclusiveSampleMilliseconds: number;
    selfSamples: number; inclusiveSamples: number;
  }>();
  const samples: number[] = profile.samples ?? [];
  const deltas: number[] = profile.timeDeltas ?? [];
  if (samples.length === 0) throw new Error("CPU profile contains no samples.");
  let sampledMicroseconds = 0;
  for (const [index, nodeId] of samples.entries()) {
    const delta = deltas[index] ?? intervalMicros;
    sampledMicroseconds += delta;
    const sampledNode = nodes.get(nodeId);
    if (!sampledNode) throw new Error(`CPU profile references absent node ${nodeId}.`);
    const seen = new Set<number>();
    let current: number | undefined = nodeId;
    while (current !== undefined) {
      if (seen.has(current)) throw new Error("CPU profile parent graph contains a cycle.");
      seen.add(current);
      const node = nodes.get(current);
      if (!node) throw new Error(`CPU profile parent node ${current} is absent.`);
      const frame = node.callFrame ?? {};
      const rowKey = JSON.stringify([frame.functionName ?? "(anonymous)", frame.url ?? "", frame.lineNumber ?? 0, frame.columnNumber ?? 0]);
      let row = byFrame.get(rowKey);
      if (!row) {
        row = {
          functionName: frame.functionName ?? "(anonymous)", url: frame.url ?? "",
          lineNumber: frame.lineNumber ?? 0, columnNumber: frame.columnNumber ?? 0,
          selfSampleMilliseconds: 0, inclusiveSampleMilliseconds: 0, selfSamples: 0, inclusiveSamples: 0,
        };
        byFrame.set(rowKey, row);
      }
      row.inclusiveSampleMilliseconds += delta / 1000;
      row.inclusiveSamples += 1;
      if (current === nodeId) {
        row.selfSampleMilliseconds += delta / 1000;
        row.selfSamples += 1;
      }
      current = parent.get(current);
    }
  }
  const rows = [...byFrame.values()];
  return {
    sampledMicroseconds,
    sampleCount: samples.length,
    reportedProfileDurationMilliseconds: (profile.endTime - profile.startTime) / 1000,
    topBySelfSamples: [...rows].sort((a, b) => b.selfSampleMilliseconds - a.selfSampleMilliseconds || a.functionName.localeCompare(b.functionName)).slice(0, topFrames),
    topByInclusiveSamples: [...rows].sort((a, b) => b.inclusiveSampleMilliseconds - a.inclusiveSampleMilliseconds || a.functionName.localeCompare(b.functionName)).slice(0, topFrames),
    aggregation: "Each CPU sample time delta is charged to its leaf frame for self time and to every recorded parent for inclusive time. Frames are grouped by functionName/url/line/column; this is sampled CPU attribution, not exact wall-time instrumentation.",
  };
}

async function runOneDayProfile(args: ReturnType<typeof parseArgs>): Promise<void> {
  if (!args.profileDate || !args.profileOutput || !args.profileSummary ||
      args.profileSamplingIntervalMicros === undefined || args.profileTopFrames === undefined)
    throw new Error("Profile mode requires --profile-date, --profile-output, --profile-summary, --profile-sampling-interval-micros, and --profile-top-frames.");
  if (args.profileOutput === args.profileSummary)
    throw new Error("Raw profile and profile summary require distinct new output paths.");
  const preparationStartedAtMilliseconds = performance.now();
  const profileHarnessPath = fileURLToPath(import.meta.url);
  const profileHarnessSha256Before = sha256(readFileSync(profileHarnessPath));
  const metadataSha256Before = sha256(readFileSync(args.metadata));
  const metadataHeader = JSON.parse(readFileSync(args.metadata, "utf8")) as any;
  const sourceManifestPath = metadataHeader.sourceGuard?.sourceManifestPath;
  if (typeof sourceManifestPath !== "string")
    throw new Error("Packed-input metadata does not identify its captured source manifest.");
  const p8 = await loadP8(args.repo, sourceManifestPath);
  const { input, metadata } = readPackedInput(args.packed, args.metadata, p8.sourceGuard);
  const featureFlags = metadata.featureFlags;
  if (featureFlags?.openingEmployment !== true || featureFlags?.scheduledWork !== true)
    throw new Error("Profile metadata does not preserve the captured opening-employment/work feature flags.");
  if (input.playerId !== metadata.traceSelection?.playerId ||
      metadata.traceSelection?.selectionMethod !== "captured-prepared-input-no-reselection" ||
      metadata.traceSelection?.requestedPlayerId !== input.playerId ||
      JSON.stringify([...(input.focusPersonIds ?? [])].sort()) !== JSON.stringify(metadata.traceSelection?.focusPersonIds) ||
      JSON.stringify([...(input.focusPlaceIds ?? [])].sort()) !== JSON.stringify(metadata.traceSelection?.focusPlaceIds) ||
      JSON.stringify([...(input.visiblePlaceIds ?? [])].sort()) !== JSON.stringify(metadata.traceSelection?.visiblePlaceIds) ||
      (input.workCommitments ?? []).length !== metadata.traceSelection?.workCommitmentCount ||
      sha256(JSON.stringify(input.workCommitments ?? [])) !== metadata.traceSelection?.workCommitmentsSha256)
    throw new Error("Profile input does not match the explicit player and scheduled-work selection.");
  if (metadata.coreVersions?.apiVersion !== p8.coreVersions.apiVersion ||
      metadata.coreVersions?.schemaVersion !== p8.coreVersions.schemaVersion)
    throw new Error("Profile input was prepared for a different core API/schema version.");
  if (typeof metadata.harness?.packerPath !== "string" ||
      sha256(readFileSync(metadata.harness.packerPath)) !== metadata.harness.packerSha256)
    throw new Error("The isolated input-packer script changed after preparing this profile input.");
  if (input.startedAt !== p8.measurement.startedAt || input.seed !== p8.measurement.seed)
    throw new Error("Profile input date/seed differs from registered measurement metadata.");
  const targetDate = p8.dates.makeIsoDate(args.profileDate);
  const benchmarkThrough = p8.dates.addDays(
    p8.dates.makeIsoDate(input.startedAt), p8.parameter("yearSpanDays"),
  );
  if (targetDate > benchmarkThrough)
    throw new Error("Profile date falls outside the configured measured year.");
  const warmupThrough = p8.dates.addDays(targetDate, p8.parameter("negativeOne"));
  if (warmupThrough <= input.startedAt)
    throw new Error("Profile date must follow at least one chronological warmup day.");
  // Full INPUT serialization is admitted before initialization and the real
  // chronological warmup. No full core digest or history scan follows warmup.
  const inputHashBefore = sha256(JSON.stringify(input));
  if (inputHashBefore !== metadata.preparedInputSha256)
    throw new Error("Profile CoreInput differs from the captured prepared-input hash.");
  const sourceGuardBefore = verifyCoreManifest(args.repo, sourceManifestPath);

  // A small read-only aggregate over canonical month/action counts. Never
  // materialize all people, per-actor counters, receipts or durable history.
  const canonicalCounterProof = (core: any) => {
    const data = core.data.work;
    if (!data) throw new Error("Profile core has no configured scheduled-work data.");
    const attendanceActionId = data.attendanceAction.id as string;
    const absenceActionId = data.absenceAction.id as string;
    let allTimeActs = p8.parameter("zero");
    let recordedAttendance = p8.parameter("zero");
    let recordedAbsence = p8.parameter("zero");
    for (const [key, count] of core.actsByMonthKind as Map<string, number>) {
      const separator = key.indexOf(":");
      if (separator < p8.parameter("zero") || !Number.isSafeInteger(count) ||
          count < p8.parameter("zero"))
        throw new Error("Invalid canonical all-time month/action counter.");
      const actionId = key.slice(separator + p8.parameter("one"));
      allTimeActs += count;
      if (actionId === attendanceActionId) recordedAttendance += count;
      if (actionId === absenceActionId) recordedAbsence += count;
    }
    if (!Number.isSafeInteger(allTimeActs))
      throw new Error("Canonical all-time act count exceeds safe integer range.");
    return {
      date: core.date,
      apiVersion: core.apiVersion,
      schemaVersion: core.schemaVersion,
      observer: core.observer,
      playerId: core.playerId,
      people: core.people.size,
      jobs: core.jobs.size,
      workCommitments: core.work.commitments.size,
      latestWorkResults: core.work.lastResultByJob.size,
      workTotalsRows: core.work.totalsByJob.size,
      monthlyActionCounterRows: core.actsByMonthKind.size,
      retainedActorActionCounterRows: core.actCounters.size,
      retainedActorActionCounterMonths: core.actCountersByMonth.size,
      durableLogRows: core.durableLog.size,
      allTimeActs,
      attendanceActionId,
      absenceActionId,
      recordedAttendance,
      recordedAbsence,
    };
  };
  const initializationStartedAtMilliseconds = performance.now();
  const core = p8.life.createLifeCore(input, { observer: false, scheduledWork: featureFlags.scheduledWork });
  assertCoreVersions(core, p8);
  const initialFocusIds = assertInitialFocus(core, input);
  const openingCounterProof = canonicalCounterProof(core);
  const warmupStartedAtMilliseconds = performance.now();
  const warmup = p8.life.advanceCore(core, warmupThrough);
  const warmupCompletedAtMilliseconds = performance.now();
  const expectedWarmupDays = p8.dates.daysBetween(
    p8.dates.makeIsoDate(input.startedAt), warmupThrough,
  );
  if (core.date !== warmupThrough || warmup.simulatedDays !== expectedWarmupDays ||
      warmup.simulatedDays <= p8.parameter("zero"))
    throw new Error("Profile core did not complete its exact unprofiled chronological warmup.");
  // Keep only date/canonical scalar counters and the actual focus-set proof
  // at this boundary. Full integrity, per-job reconciliation and final hash
  // run AFTER sampling; there is deliberately no before-state full hash.
  const focusBeforeProfileDay = summarizeFocus(core, initialFocusIds);
  const countersBeforeProfileDay = canonicalCounterProof(core);
  if (countersBeforeProfileDay.allTimeActs - openingCounterProof.allTimeActs !== warmup.acts)
    throw new Error("Warmup advance acts disagree with canonical all-time counters.");
  if (core.observer !== false)
    throw new Error("Profile core must retain the captured normal observer=false mode.");
  const cheapBeforeProofCompletedAtMilliseconds = performance.now();
  const session: any = new Session();
  session.connect();
  let profile: any;
  let advance: any;
  let profileWallMilliseconds = p8.parameter("zero");
  let cpu: any;
  let profilerStartRequestedAtMilliseconds = p8.parameter("zero");
  let profilerStartAcknowledgedAtMilliseconds = p8.parameter("zero");
  let advanceStartedAtMilliseconds = p8.parameter("zero");
  let advanceCompletedAtMilliseconds = p8.parameter("zero");
  let profilerStopRequestedAtMilliseconds = p8.parameter("zero");
  let profilerStopAcknowledgedAtMilliseconds = p8.parameter("zero");
  try {
    await postInspector(session, "Profiler.enable");
    await postInspector(session, "Profiler.setSamplingInterval", { interval: args.profileSamplingIntervalMicros });
    profilerStartRequestedAtMilliseconds = performance.now();
    await postInspector(session, "Profiler.start");
    profilerStartAcknowledgedAtMilliseconds = performance.now();
    const cpuBefore = process.cpuUsage();
    advanceStartedAtMilliseconds = performance.now();
    advance = p8.life.advanceCore(core, targetDate);
    advanceCompletedAtMilliseconds = performance.now();
    profileWallMilliseconds = advanceCompletedAtMilliseconds - advanceStartedAtMilliseconds;
    cpu = process.cpuUsage(cpuBefore);
    profilerStopRequestedAtMilliseconds = performance.now();
    profile = (await postInspector(session, "Profiler.stop")).profile;
    profilerStopAcknowledgedAtMilliseconds = performance.now();
  } finally {
    try { await postInspector(session, "Profiler.disable"); }
    finally { session.disconnect(); }
  }
  const postSamplerChecksStartedAtMilliseconds = performance.now();
  if (advance.simulatedDays !== p8.parameter("one") || core.date !== targetDate)
    throw new Error("CPU profile must cover exactly one seeded calendar-day advance.");
  p8.state.assertCoreIntegrity(core);
  const focusAfterProfileDay = summarizeFocus(core, initialFocusIds);
  const countersAfterProfileDay = canonicalCounterProof(core);
  if (countersAfterProfileDay.allTimeActs - countersBeforeProfileDay.allTimeActs !== advance.acts)
    throw new Error("Profile advance acts disagree with actual canonical all-time counter delta.");
  const workAfter = summarizeWorkActReconciliation(core);
  if (!workAfter.matches ||
      workAfter.recordedAttendance !== countersAfterProfileDay.recordedAttendance ||
      workAfter.recordedAbsence !== countersAfterProfileDay.recordedAbsence)
    throw new Error("Profiled core work-act reconciliation failed.");
  const sourceGuardAfter = verifyCoreManifest(args.repo, sourceManifestPath);
  if (sourceGuardAfter.manifestSha256 !== sourceGuardBefore.manifestSha256 ||
      sourceGuardAfter.runtimeSourceSha256 !== sourceGuardBefore.runtimeSourceSha256 ||
      sourceGuardAfter.currentMeasurementToolingSha256 !== sourceGuardBefore.currentMeasurementToolingSha256 ||
      sourceGuardAfter.currentFullSourceSha256 !== sourceGuardBefore.currentFullSourceSha256 ||
      sourceGuardAfter.expectedPreparedInputSha256 !== sourceGuardBefore.expectedPreparedInputSha256 ||
      JSON.stringify(sourceGuardAfter.externalClosure) !== JSON.stringify(sourceGuardBefore.externalClosure))
    throw new Error("Source bytes changed during the separate one-day profile.");
  const inputHashAfter = sha256(JSON.stringify(input));
  if (inputHashAfter !== inputHashBefore) throw new Error("Profile harness mutated the prepared CoreInput.");
  if (sha256(readFileSync(args.metadata)) !== metadataSha256Before ||
      sha256(readFileSync(args.packed)) !== metadata.transport.sha256 ||
      sha256(readFileSync(metadata.harness.packerPath)) !== metadata.harness.packerSha256 ||
      sha256(readFileSync(profileHarnessPath)) !== profileHarnessSha256Before)
    throw new Error("Packed input, metadata, packer or profile harness changed during inspection.");
  const postSamplerChecksCompletedAtMilliseconds = performance.now();
  const finalDigestStartedAtMilliseconds = performance.now();
  const outcomeSha256AfterProfileDay = digestValue(core, true);
  const finalDigestCompletedAtMilliseconds = performance.now();
  const rawProfile = JSON.stringify(profile);
  const profiled = profileFrameSummary(profile, args.profileSamplingIntervalMicros, args.profileTopFrames);
  const profileSha256 = sha256(rawProfile);
  // Never replace a frozen profile or receipt, even when root reuses an option.
  writeFileSync(args.profileOutput, rawProfile, { flag: "wx" });
  const workDecisionDelta = {
    attendance: countersAfterProfileDay.recordedAttendance - countersBeforeProfileDay.recordedAttendance,
    absence: countersAfterProfileDay.recordedAbsence - countersBeforeProfileDay.recordedAbsence,
  };
  const summary = {
    schema: "p8-isolated-one-day-cpu-profile-v2-no-prestate-digest",
    source: {
      runtimeSourceSha256: sourceGuardBefore.runtimeSourceSha256,
      manifestSha256: sourceGuardBefore.manifestSha256,
      currentFullSourceSha256: sourceGuardBefore.currentFullSourceSha256,
      currentMeasurementToolingSha256: sourceGuardBefore.currentMeasurementToolingSha256,
      externalClosure: sourceGuardBefore.externalClosure,
      stableThroughProfile: true,
    },
    input: {
      rawInputSha256: metadata.rawInputSha256,
      preparedInputSha256: metadata.preparedInputSha256,
      transportSha256: metadata.transport.sha256,
      metadataSha256: metadataSha256Before,
      captureReceiptPath: metadata.captureReceiptPath,
      captureReceiptSha256: metadata.captureReceiptSha256,
      traceSelection: metadata.traceSelection,
      stableThroughProfile: true,
    },
    harness: {
      profilePath: profileHarnessPath,
      profileSha256: profileHarnessSha256Before,
      packerPath: metadata.harness.packerPath,
      packerSha256: metadata.harness.packerSha256,
      stableThroughProfile: true,
    },
    featureFlags,
    coreVersions: p8.coreVersions,
    focus: {
      initial: { personCount: initialFocusIds.length, personIdsSha256: sha256(JSON.stringify(initialFocusIds)) },
      beforeProfileDay: focusBeforeProfileDay,
      afterProfileDay: focusAfterProfileDay,
    },
    profileDate: targetDate,
    warmupThrough,
    warmupAdvance: warmup,
    advance,
    playerId: input.playerId,
    canonicalCounters: {
      opening: openingCounterProof,
      beforeProfileDay: countersBeforeProfileDay,
      afterProfileDay: countersAfterProfileDay,
      advanceActDeltaMatches: true,
      warmupActDeltaMatches: true,
      scope: "Scalar map sizes and the small canonical all-time month/action counter index only; no pre-sample person/history/receipt materialization or per-job reconciliation.",
    },
    workDecisionDelta,
    workActTotalsMatch: workAfter.matches,
    workActReconciliationAfterSampling: workAfter,
    outcomeSha256BeforeProfileDay: null,
    beforeStateFullHashStatus: "unavailable: intentionally omitted to avoid a full core traversal, sorting and scalar-stringification allocations immediately before sampling; scalar date/counter/focus proof is not full-state parity",
    fullIntegrityBeforeProfileDay: {
      status: "not checked at this boundary",
      reason: "All-person/work/log-index traversal and diagnostic strings are deferred until after Profiler.stop; final integrity does not prove full before-state integrity.",
    },
    outcomeSha256AfterProfileDay,
    fullIntegrityAfterSampling: "pass if this receipt is written",
    cpuUsageMilliseconds: { user: cpu.user / 1000, system: cpu.system / 1000 },
    profileWallMilliseconds: profileWallMilliseconds,
    samplingIntervalMicroseconds: args.profileSamplingIntervalMicros,
    profile: profiled,
    rawProfile: { path: args.profileOutput, sha256: profileSha256, bytes: Buffer.byteLength(rawProfile) },
    timingPoints: {
      unit: "milliseconds from performance.now monotonic process clock; inspector startTime/endTime remain separate microsecond timestamps in the raw profile",
      preparationStartedAtMilliseconds,
      initializationStartedAtMilliseconds,
      warmupStartedAtMilliseconds,
      warmupCompletedAtMilliseconds,
      cheapBeforeProofCompletedAtMilliseconds,
      profilerStartRequestedAtMilliseconds,
      profilerStartAcknowledgedAtMilliseconds,
      advanceStartedAtMilliseconds,
      advanceCompletedAtMilliseconds,
      profilerStopRequestedAtMilliseconds,
      profilerStopAcknowledgedAtMilliseconds,
      postSamplerChecksStartedAtMilliseconds,
      postSamplerChecksCompletedAtMilliseconds,
      finalDigestStartedAtMilliseconds,
      finalDigestCompletedAtMilliseconds,
    },
    scope: {
      separateFreshCore: true,
      warmupAndCoreInitializationExcludedFromProfiler: true,
      exactlyOneAdvanceCoreDaySampled: true,
      noFullCoreDigestImmediatelyBeforeProfiler: true,
      noFullCoreIntegrityOrWorkReconciliationImmediatelyBeforeProfiler: true,
      beforeStateFullHashAvailable: false,
      finalDigestExcludedFromProfilerAndAdvanceTimer: true,
      fullIntegrityAndReconciliationExcludedFromProfilerAndAdvanceTimer: true,
      annualThreeWorkerTimingUnaffected: true,
      noForcedChoicesOrObserver: true,
      noForcedGarbageCollection: true,
      noMeasuredAnnualCoreShared: true,
      profileWindow: "Profiler.start acknowledgement -> one synchronous advanceCore call -> Profiler.stop. Sampling also includes bounded performance.now/cpuUsage/inspector bookkeeping around that call. profileWallMilliseconds times advanceCore only; raw sample duration is separately reported.",
      preparationResidue: "Packed-input loading, full input/source admission and real chronological warmup are excluded from sampling. Their natural heap/JIT/GC residue remains; no GC-free or exact steady-state-equivalence claim is made. Only small actual focus/canonical scalar proofs and inspector setup follow warmup.",
      interpretation: "Optional diagnostic only. No before-state full hash/parity proof is available. Inspector sampling changes timing and CPU attribution; source/input/date/actual counter/focus guards establish the sampled path, not an annual speed or memory budget. Use separately measured annual receipts for performance gates.",
    },
  };
  writeFileSync(args.profileSummary, JSON.stringify(summary, null, 2), { flag: "wx" });
}

async function runWorker(args: ReturnType<typeof parseArgs>): Promise<void> {
  const metadataHeader = JSON.parse(readFileSync(args.metadata, "utf8")) as any;
  const sourceManifestPath = metadataHeader.sourceGuard?.sourceManifestPath;
  if (typeof sourceManifestPath !== "string")
    throw new Error("Packed-input metadata does not identify its captured source manifest.");
  const p8 = await loadP8(args.repo, sourceManifestPath);
  const { input, metadata } = readPackedInput(args.packed, args.metadata, p8.sourceGuard);
  const featureFlags = metadata.featureFlags;
  if (featureFlags?.openingEmployment !== true || featureFlags?.scheduledWork !== true)
    throw new Error("Packed metadata does not preserve the captured opening-employment/work feature flags.");
  if (input.playerId !== metadata.traceSelection?.playerId ||
      metadata.traceSelection?.selectionMethod !== "captured-prepared-input-no-reselection" ||
      metadata.traceSelection?.requestedPlayerId !== metadata.traceSelection?.playerId ||
      JSON.stringify([...(input.focusPersonIds ?? [])].sort()) !==
        JSON.stringify(metadata.traceSelection?.focusPersonIds) ||
      JSON.stringify([...(input.focusPlaceIds ?? [])].sort()) !==
        JSON.stringify(metadata.traceSelection?.focusPlaceIds) ||
      JSON.stringify([...(input.visiblePlaceIds ?? [])].sort()) !==
        JSON.stringify(metadata.traceSelection?.visiblePlaceIds) ||
      (input.workCommitments ?? []).length !== metadata.traceSelection?.workCommitmentCount ||
      sha256(JSON.stringify(input.workCommitments ?? [])) !== metadata.traceSelection?.workCommitmentsSha256)
    throw new Error("Packed CoreInput does not match the captured explicit player/focus/visibility selection.");
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
  const wholeYearWarmup = await runWholeYearWarmup(
    input, throughDate, p8, featureFlags.scheduledWork,
  );
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
  const measured = await runMeasuredDaily(
    input, throughDate, p8, featureFlags.scheduledWork,
  );
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
    workActReconciliationMatch: compareRows(
      wholeYearWarmup.workActReconciliation, measured.workActReconciliation,
    ),
    focusInitialIdsMatch:
      wholeYearWarmup.focus.initialFocusPersonIdsSha256 ===
      measured.focus.initialFocusPersonIdsSha256,
    focusFinalIdsMatch:
      wholeYearWarmup.focus.finalFocusPersonIdsSha256 ===
      measured.focus.finalFocusPersonIdsSha256,
    focusGrowthMatch:
      wholeYearWarmup.focus.focusGrowthPeopleCount ===
      measured.focus.focusGrowthPeopleCount,
    focusFinalCountMatchesRootCapture:
      wholeYearWarmup.focus.finalDailyCirclePeople ===
        metadata.traceSelection.capturedFinalDailyCirclePeople &&
      measured.focus.finalDailyCirclePeople ===
        metadata.traceSelection.capturedFinalDailyCirclePeople,
    monthContributionObserver:
      "Both paths read the canonical monthly act-counter rows at each month boundary. These rows come from recordAct for routine and scheduled-work decisions, including work-module calls that bypass the LifeController callback. The callback is not used as an act source.",
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
    !finalParity.retainedMonthlyCounterMatch ||
    !finalParity.workActReconciliationMatch ||
    !finalParity.focusInitialIdsMatch ||
    !finalParity.focusFinalIdsMatch ||
    !finalParity.focusGrowthMatch ||
    !finalParity.focusFinalCountMatchesRootCapture
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
    schema: "p8-isolated-steady-year-run-v4-prepared-work",
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
      captureReceiptSha256: metadata.captureReceiptSha256,
      traceSelection: metadata.traceSelection,
      featureFlags,
    },
    featureFlags,
    scope: {
      generatedPopulation: false,
      inputWasAlreadyPrepared: true,
      selectionWasReapplied: false,
      inputPreparation: "separate packer process; excluded from this worker's simulation timer and RSS proposal",
      inputParseAndSourceTableReconstitution: "loaded before pre-initialization sample; its residual memory is visible in all worker samples",
      onlyOneCoreStateLiveAtATime: true,
      warmup: "fresh CoreState advanced in chronological monthly chunks to capture canonical monthly act counters, including scheduled work; summary retained and CoreState leaves scope before measured CoreState construction; no forced GC",
      measuredPath: "one-day advanceCore calls; month indexes captured after that day's normal compaction while the current month remains retained",
      observer: false,
      sourceInterning: "transport uses shared references for identical read-only Source descriptors; round-trip prepared-input SHA-256 was verified by the isolated packer before this worker starts",
      timingExcludes: ["final GC observer flush", "whole-state hashing", "month/action parity reconciliation", "receipt JSON serialization"],
      timingIncludes: ["core initialization", "all daily advanceCore calls", "daily CPU/RSS/heap/GC sampling", "drive birth scan", "monthly counter capture"],
      limitations: [
        "Per-day instrumentation adds work to the measured loop; the reported wall time is for this instrumented protocol, not an uninstrumented gameplay rate.",
        "New active drive IDs are first observed at month boundaries. Same-month source-event dates identify event-linked new drives; they do not provide an exact creation timestamp. The current core has no drive delete or clear operation.",
        "processLifetimeMaxRssBytes is cumulative across packed-input loading, whole-year warmup, and measured work; boundary RSS and heap samples are also reported. Node reports maxRSS in bytes on Windows and KiB on other platforms, so the harness normalizes it to bytes.",
        "The GC observer receives a final event-loop flush after the measured timer is frozen. Entries are assigned by their startTime to saved day intervals; measured-window events between intervals and events outside the timer window are separately marked unattributed.",
        "The captured per-file source manifest pins src/core2 TypeScript/JSON at its recorded file count. Direct external imports are separately hashed; Node/runtime/platform dependencies are not in this source closure.",
        "Scheduled work chooses one act for each due calendar-date segment. Quiet workers have canonical committed act-counter IDs without durable act-log rows; this harness reconciles the all-time action counters and per-person act-kind totals against work result totals, and does not synthesize traces.",
        "Requested pay is compared with the actual same-day transfer return. Shortfalls are reported but do not become a carried legal liability or future paycheck; revenue and full payroll contracts are not modeled.",
        "Overnight shift portions are independent dated decisions. Their counters are date segments, not completed shifts.",
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
      workActReconciliation: measured.workActReconciliation,
      focus: measured.focus,
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
      gcCapture: measured.gcCapture,
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
    if (result.input.preparedInputSha256 !== metadata.preparedInputSha256 ||
        result.input.captureReceiptSha256 !== metadata.captureReceiptSha256)
      throw new Error(`Worker ${index} used a different prepared input hash.`);
    if (JSON.stringify(result.input.featureFlags) !== JSON.stringify(metadata.featureFlags) ||
        JSON.stringify(result.featureFlags) !== JSON.stringify(metadata.featureFlags) ||
        JSON.stringify(result.input.traceSelection) !== JSON.stringify(metadata.traceSelection))
      throw new Error(`Worker ${index} changed captured feature flags or prepared focus/work metadata.`);
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
    schema: "p8-isolated-steady-year-checkpoint-v4-prepared-work",
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
    schema: "p8-isolated-steady-year-receipt-v4-prepared-work",
    protocol: measurementProtocol,
    source: initialSourceGuard,
    sourceStableAcrossWorkers: true,
    harness: results[0]?.harness,
    input: {
      rawInputSha256: metadata.rawInputSha256,
      preparedInputSha256: metadata.preparedInputSha256,
      packedTransportSha256: metadata.transport.sha256,
      captureReceiptSha256: metadata.captureReceiptSha256,
      traceSelection: metadata.traceSelection,
      featureFlags: metadata.featureFlags,
    },
    featureFlags: metadata.featureFlags,
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
  const hasProfileOption = args.profileOutput !== undefined ||
    args.profileSummary !== undefined ||
    args.profileSamplingIntervalMicros !== undefined ||
    args.profileTopFrames !== undefined;
  if (hasProfileOption && args.profileDate === undefined)
    throw new Error("CPU-profile output options require --profile-date; refusing to start annual workers instead.");
  if (args.profileDate !== undefined) await runOneDayProfile(args);
  else if (args.worker) await runWorker(args);
  else await runSerialWorkers(args);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
