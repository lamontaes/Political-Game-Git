import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonObject = Record<string, unknown>;

const externalClosurePaths = [
  "src/simulation/dates.ts",
  "src/simulation/ids.ts",
  "data/content/act-kinds.json",
  "data/content/trait-act-pulls.json",
];
const transportSchema = "p8-source-interned-core-input-v1";

function parseArgs(args: readonly string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key?.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error(`${key} needs a value.`);
    result[key.slice(2)] = value;
    index += 1;
  }
  return result;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function memorySample() {
  const usage = process.memoryUsage();
  return {
    heapUsedBytes: usage.heapUsed,
    heapTotalBytes: usage.heapTotal,
    rssBytes: usage.rss,
    externalBytes: usage.external,
    processLifetimeMaxRssBytes:
      process.resourceUsage().maxRSS * (process.platform === "win32" ? 1 : 1024),
  };
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
    !manifest.scope.includes("proof receipts excluded") ||
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

  const extras = Object.fromEntries(
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
    externalClosure: extras,
    externalClosureScope:
      "Direct executable imports outside src/core2 used by this harness and DEFAULT_DATA are pinned here. Runtime, Node/tsx, operating system, and transitive platform libraries are outside this source manifest.",
  };
}

function isSourceDescriptor(value: unknown): value is JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as JsonObject;
  const keys = Object.keys(row);
  return (
    (row.tag === "SOURCED" || row.tag === "ESTIMATED") &&
    typeof row.citation === "string" &&
    typeof row.asOf === "string" &&
    keys.every((key) =>
      key === "tag" ||
      key === "citation" ||
      key === "asOf" ||
      key === "estimatedFrom",
    )
  );
}

interface PackedSources {
  sourceTable: JsonObject[];
  sourceReferences: number;
  packedInput: unknown;
}

function packSources(input: unknown): PackedSources {
  const bySerializedDescriptor = new Map<string, number>();
  const sourceTable: JsonObject[] = [];
  let sourceReferences = 0;
  const visit = (value: unknown): unknown => {
    if (isSourceDescriptor(value)) {
      const serialized = JSON.stringify(value);
      let index = bySerializedDescriptor.get(serialized);
      if (index === undefined) {
        index = sourceTable.length;
        bySerializedDescriptor.set(serialized, index);
        sourceTable.push(value);
      }
      sourceReferences += 1;
      return { $p8SourceRef: index };
    }
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1)
        value[index] = visit(value[index]);
      return value;
    }
    if (value && typeof value === "object") {
      const row = value as JsonObject;
      if (Object.keys(row).length === 1 && "$p8SourceRef" in row)
        throw new Error("Input collides with the reserved source-reference marker.");
      for (const key of Object.keys(row)) row[key] = visit(row[key]);
      return row;
    }
    return value;
  };
  return { sourceTable, sourceReferences, packedInput: visit(input) };
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
        Number.isInteger(row.$p8SourceRef) &&
        typeof row.$p8SourceRef === "number"
      ) {
        const source = sourceTable[row.$p8SourceRef];
        if (!source) throw new Error(`Bad source-table index ${row.$p8SourceRef}.`);
        return source;
      }
      for (const key of keys) row[key] = visit(row[key]);
      return row;
    }
    return value;
  };
  return visit(packed);
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as JsonObject)) deepFreeze(child);
  return Object.freeze(value);
}

function report(phase: string, fields: Record<string, unknown> = {}): void {
  process.stderr.write(
    `${new Date().toISOString()} ${phase} ${JSON.stringify(fields)}\n`,
  );
}

async function main(): Promise<void> {
  const preparationStarted = performance.now();
  const args = parseArgs(process.argv.slice(2));
  const repo = resolve(args.repo ?? "/workspace/p8-core-prototype");
  const inputPath = resolve(args.input ?? "/tmp/p8-untraced-opening-input-20261009.json");
  const packedPath = resolve(args.packed ?? "/tmp/p8-steady-traced-input.packed.json");
  const metadataPath = resolve(args.metadata ?? "/tmp/p8-steady-traced-input.meta.json");
  if (!args["source-manifest"])
    throw new Error("--source-manifest must point to the new captured run source proof.");
  const sourceManifestPath = resolve(args["source-manifest"]);
  const memory = { processStart: memorySample() } as Record<string, ReturnType<typeof memorySample>>;
  const sourceGuard = verifyCoreManifest(repo, sourceManifestPath);

  let rawInputBytes: Buffer | undefined = readFileSync(inputPath);
  const inputBytes = rawInputBytes.byteLength;
  const rawInputSha256 = sha256(rawInputBytes);
  memory.afterExactByteHash = memorySample();
  report("raw-input-hashed", { inputBytes, rawInputSha256 });

  let inputText: string | undefined = rawInputBytes.toString("utf8");
  rawInputBytes = undefined;
  const input = JSON.parse(inputText) as JsonObject;
  inputText = undefined;
  memory.afterParse = memorySample();
  if (!Array.isArray(input.people) || !Array.isArray(input.jobs))
    throw new Error("Input does not have the CoreInput people/jobs arrays.");
  report("raw-input-parsed", {
    people: input.people.length,
    jobs: input.jobs.length,
    inputBytes,
  });

  const loadSource = (relativePath: string) =>
    import(pathToFileURL(resolve(repo, relativePath)).href);
  const [dates, ids, focus, parameters, peerNetwork, coreData] = await Promise.all([
    loadSource("src/simulation/dates.ts"),
    loadSource("src/simulation/ids.ts"),
    loadSource("src/core2/focus.ts"),
    loadSource("src/core2/parameters.ts"),
    loadSource("src/core2/opening-peer-network.ts"),
    loadSource("src/core2/data.ts"),
  ]);
  const coreVersions = {
    apiVersion: coreData.CORE_API_VERSION as string,
    schemaVersion: coreData.CORE_SCHEMA_VERSION as string,
  };
  if (
    coreVersions.apiVersion !== "core2-api-v4" ||
    coreVersions.schemaVersion !== "core2-schema-v4"
  )
    throw new Error("The isolated candidate requires core2 API/schema v4.");
  const measurement = JSON.parse(
    readFileSync(resolve(repo, "src/core2/data/measurement.json"), "utf8"),
  ) as { seed: string; startedAt: string };
  if (input.seed !== measurement.seed || input.startedAt !== measurement.startedAt)
    throw new Error("Untraced input seed/date differs from current measurement configuration.");
  const minimumAge = parameters.parameter("benchmarkAdultMinimumAge");

  const jobByPerson = new Map(
    (input.jobs as { id: string; personId: string; organizationId: string }[]).map(
      (job) => [job.personId, job],
    ),
  );
  const peopleById = new Map(
    (input.people as { id: string }[]).map((person) => [person.id, person]),
  );
  const workersByOrganization = new Map<string, Set<string>>();
  for (const job of input.jobs as { personId: string; organizationId: string }[]) {
    let workers = workersByOrganization.get(job.organizationId);
    if (!workers) workersByOrganization.set(job.organizationId, (workers = new Set()));
    workers.add(job.personId);
  }
  const candidates = (input.people as {
    id: string;
    birthDate: string;
    countyId?: string;
    jobId?: string;
    knownIds: string[];
  }[]).flatMap((person) => {
    if (
      dates.ageOnDate(
        dates.makeIsoDate(person.birthDate),
        dates.makeIsoDate(input.startedAt as string),
      ) < minimumAge ||
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
    return [{ person, knownCoworkers }];
  });
  if (candidates.length === 0)
    throw new Error("No sourced adult with county and owned job exists.");
  candidates.sort((left, right) => {
    const leftKey = ids.stableHash(`${measurement.seed}:benchmark-player:${left.person.id}`);
    const rightKey = ids.stableHash(`${measurement.seed}:benchmark-player:${right.person.id}`);
    return leftKey.localeCompare(rightKey) || left.person.id.localeCompare(right.person.id);
  });
  const zero = parameters.parameter("zero");
  const selected = candidates[zero]!;
  const player = selected.person as {
    id: string;
    placeId: string;
    countyId?: string;
    householdId: string;
  };
  const peers = peerNetwork.buildOpeningPeerContacts(input, {
    personIds: [player.id],
  });
  const tracedBaseInput = peers.input as JsonObject;
  if (!(tracedBaseInput.households as { id: string }[]).some((row) => row.id === player.householdId))
    throw new Error(`Benchmark player has no household: ${player.id}`);
  const focusInput = { ...tracedBaseInput, playerId: player.id };
  const focusPeople = focus.initialFocusPeople(focusInput);
  for (const id of focusPeople) if (!peopleById.has(id)) focusPeople.delete(id);
  if (!player.countyId) throw new Error(`Benchmark player has no county: ${player.id}`);
  const focusPersonIds = [...focusPeople].sort();
  const visiblePlaceIds = [...new Set([player.placeId, player.countyId])].sort();
  const addedGap = selected.knownCoworkers.length === 0
    ? "The opening generator records no known coworkers for the selected player; actual coworkers are in the daily circle, but acquaintance knowledge is not invented."
    : undefined;
  const tracedInput = {
    ...tracedBaseInput,
    gaps: [
      ...(tracedBaseInput.gaps as string[]),
      ...(addedGap ? [addedGap] : []),
    ],
    playerId: player.id,
    focusPersonIds,
    focusPlaceIds: [],
    visiblePlaceIds,
  };

  const traceSelection = {
    playerId: player.id,
    countyId: player.countyId,
    focusPersonIds,
    focusPlaceIds: [] as string[],
    visiblePlaceIds,
    tierScope: "normal-circle-daily-town-weekly",
    addedGap,
    coreVersions,
    peerPrior: {
      contactCount: peers.contacts.length,
      contacts: peers.contacts,
      reports: peers.reports,
    },
  };
  let preparedText: string | undefined = JSON.stringify(tracedInput);
  const preparedInputSha256 = sha256(preparedText);
  preparedText = undefined;
  const expectedPreparedInputSha256 =
    sourceGuard.expectedPreparedInputSha256 ?? args["prepared-input-sha256"];
  if (!expectedPreparedInputSha256)
    throw new Error(
      "The captured run receipt must contain preparedInputSha256, or pass --prepared-input-sha256.",
    );
  if (preparedInputSha256 !== expectedPreparedInputSha256)
    throw new Error(
      `Prepared CoreInput hash ${preparedInputSha256} does not match captured run hash ${expectedPreparedInputSha256}.`,
    );
  const packed = packSources(tracedInput);
  const envelope = {
    schema: transportSchema,
    sourceTable: packed.sourceTable,
    input: packed.packedInput,
  };
  const packedText = JSON.stringify(envelope);
  const roundTrip = restoreSources(packed.sourceTable, packed.packedInput);
  deepFreeze(roundTrip);
  const roundTripSha256 = sha256(JSON.stringify(roundTrip));
  memory.afterSourceInternRoundTripHash = memorySample();
  if (roundTripSha256 !== preparedInputSha256)
    throw new Error("Source-interned round trip changed CoreInput JSON values or order.");

  memory.afterPackedSerialization = memorySample();
  writeFileSync(packedPath, packedText);
  memory.afterPackedWrite = memorySample();
  const metadata = {
    schema: "p8-steady-benchmark-input-receipt-v1",
    rawInputPath: inputPath,
    rawInputBytes: inputBytes,
    rawInputSha256,
    preparedInputSha256,
    expectedPreparedInputSha256,
    roundTripInputSha256: roundTripSha256,
    traceSelection,
    transport: {
      schema: transportSchema,
      path: packedPath,
      bytes: Buffer.byteLength(packedText),
      sha256: sha256(packedText),
      sourceDescriptorCount: packed.sourceTable.length,
      sourceReferenceCount: packed.sourceReferences,
      valueOrderCheck: "JSON.stringify(CoreInput) SHA-256 matched before and after pack/unpack.",
    },
    sourceGuard,
    coreVersions,
    harness: {
      packerPath: fileURLToPath(import.meta.url),
      packerSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
    },
    memoryScope: {
      preparationProcess: "separate, exits before benchmark workers start",
      includesInputParseAndRoundTripSerialization: true,
      representsProductionSteadyStateMemory: false,
      note: `The ${inputBytes}-byte untraced transport is read and parsed only by this isolated preparation process. Its transient peak must be reported separately; do not combine it with steady benchmark worker RSS.`,
      sampledMemory: memory,
      processLifetimeMaxRssBytes:
        process.resourceUsage().maxRSS * (process.platform === "win32" ? 1 : 1024),
    },
    preparedAt: new Date().toISOString(),
    packElapsedMilliseconds: performance.now() - preparationStarted,
  };
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  report("packed-input-ready", {
    rawInputBytes: inputBytes,
    packedBytes: metadata.transport.bytes,
    sourceDescriptorCount: packed.sourceTable.length,
    sourceReferenceCount: packed.sourceReferences,
    playerId: player.id,
    focusPeople: focusPersonIds.length,
    preparedInputSha256,
    packedPath,
    metadataPath,
  });
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
