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
const transportSchema = "p8-source-interned-core-input-v4-prepared-work";

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
  // Evaluate the traversal before snapshotting its mutable counter. Object
  // literal values are evaluated left to right, so returning `sourceReferences`
  // next to `packedInput: visit(input)` captures the initial zero.
  const packedInput = visit(input);
  if (sourceReferences < sourceTable.length)
    throw new Error("Source-reference count is smaller than the intern table.");
  return { sourceTable, sourceReferences, packedInput };
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

function sameStringList(actual: unknown, expected: unknown, label: string): string[] {
  if (!Array.isArray(actual) || !Array.isArray(expected) ||
      actual.some((value) => typeof value !== "string") ||
      expected.some((value) => typeof value !== "string"))
    throw new Error(label + " must be a string array in both the prepared input and capture receipt.");
  const actualRows = actual as string[];
  const expectedRows = expected as string[];
  if (new Set(actualRows).size !== actualRows.length ||
      new Set(expectedRows).size !== expectedRows.length ||
      JSON.stringify(actualRows) !== JSON.stringify(expectedRows))
    throw new Error(label + " differs from the captured root measurement.");
  return actualRows;
}

function sortedRecord(value: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function validatePreparedWorkInput(input: JsonObject, capture: JsonObject, requestedPlayerId: string, registeredTierIds: readonly string[]) {
  const parameters = capture.parameters as JsonObject | undefined;
  const trace = capture.trace as JsonObject | undefined;
  if (!parameters || !trace) throw new Error("Capture receipt lacks root measurement parameters or trace metadata.");
  if (capture.mode !== "year" || !Number.isSafeInteger(parameters.yearSpanDays) ||
      capture.expectedSimulatedDays !== parameters.yearSpanDays)
    throw new Error("Prepared input must come from a complete captured normal-year measurement.");
  if (parameters.requestedPlayerId !== requestedPlayerId || trace.playerId !== requestedPlayerId ||
      input.playerId !== requestedPlayerId)
    throw new Error("Prepared input and measurement receipt do not identify the requested root player.");
  if (trace.tierScope !== "normal-circle-daily-town-weekly")
    throw new Error("Prepared input is not the normal daily-circle/town-weekly tier scope.");
  const focusPersonIds = sameStringList(input.focusPersonIds, trace.focusPersonIds, "focusPersonIds");
  const focusPlaceIds = sameStringList(input.focusPlaceIds, trace.focusPlaceIds, "focusPlaceIds");
  const visiblePlaceIds = sameStringList(input.visiblePlaceIds, trace.visiblePlaceIds, "visiblePlaceIds");
  if (!Number.isSafeInteger(trace.focusPersonCount) ||
      focusPersonIds.length !== trace.focusPersonCount || !focusPersonIds.includes(requestedPlayerId))
    throw new Error("Prepared focus IDs do not match the captured initialized focus count/player.");
  const people = input.people as JsonObject[] | undefined;
  const jobs = input.jobs as JsonObject[] | undefined;
  const organizations = input.organizations as JsonObject[] | undefined;
  const households = input.households as JsonObject[] | undefined;
  const commitments = input.workCommitments as JsonObject[] | undefined;
  if (!Array.isArray(people) || !Array.isArray(jobs) || !Array.isArray(organizations) ||
      !Array.isArray(households) ||
      !Array.isArray(commitments) || commitments.length === 0)
    throw new Error("Prepared normal work input must include people, jobs, organizations, and work commitments.");
  if (input.seed !== capture.seed || input.startedAt !== capture.startedAt)
    throw new Error("Prepared input seed/date differs from the root measurement receipt.");

  const byPerson = new Map<string, JsonObject>();
  for (const person of people) {
    if (typeof person.id !== "string" || byPerson.has(person.id))
      throw new Error("Prepared input contains a missing or duplicate person ID.");
    byPerson.set(person.id, person);
  }
  const byJob = new Map<string, JsonObject>();
  for (const job of jobs) {
    if (typeof job.id !== "string" || byJob.has(job.id))
      throw new Error("Prepared input contains a missing or duplicate job ID.");
    byJob.set(job.id, job);
  }
  const organizationIds = new Set<string>();
  for (const organization of organizations) {
    if (typeof organization.id !== "string" || organizationIds.has(organization.id))
      throw new Error("Prepared input contains a missing or duplicate organization ID.");
    organizationIds.add(organization.id);
  }
  const householdIds = new Set<string>();
  for (const household of households) {
    if (typeof household.id !== "string" || householdIds.has(household.id))
      throw new Error("Prepared input contains a missing or duplicate household ID.");
    householdIds.add(household.id);
  }
  for (const person of people) {
    if (typeof person.householdId !== "string" || !householdIds.has(person.householdId))
      throw new Error("Prepared input person lacks its initialized household reference.");
  }
  if (byPerson.size !== people.length || byJob.size !== jobs.length ||
      organizationIds.size !== organizations.length)
    throw new Error("Prepared input contains duplicate canonical person/job/organization IDs.");
  const registeredTiers = new Set(registeredTierIds);
  if (registeredTiers.size !== registeredTierIds.length || registeredTierIds.some((id) => typeof id !== "string" || id.length === 0))
    throw new Error("Current source contains invalid or duplicate registered tiers.");
  const rawInputTierCounts: Record<string, number> = {};
  for (const person of people) {
    if (typeof person.tier !== "string" || person.tier.length === 0 || !registeredTiers.has(person.tier))
      throw new Error("Prepared input person lacks its initialized tier.");
    rawInputTierCounts[person.tier] = (rawInputTierCounts[person.tier] ?? 0) + 1;
  }
  const capturedLastRun = Array.isArray(capture.runs) ? capture.runs[capture.runs.length - 1] as JsonObject : undefined;
  const capturedWorld = capturedLastRun?.world as JsonObject | undefined;
  const capturedCounts = capturedWorld?.counts as JsonObject | undefined;
  const capturedTierCounts = capturedCounts?.peopleByTier as Record<string, number> | undefined;
  // createCore initializes every registered tier, including empty index buckets.
  const expectedInitializedCoreTierCounts = sortedRecord(Object.fromEntries(
    registeredTierIds.map((id) => [id, rawInputTierCounts[id] ?? 0]),
  ));
  const capturedFinalCoreTierCounts = capturedTierCounts ? sortedRecord(capturedTierCounts) : undefined;
  if (!capturedTierCounts ||
      JSON.stringify(expectedInitializedCoreTierCounts) !== JSON.stringify(capturedFinalCoreTierCounts) ||
      capturedCounts?.people !== people.length || capturedCounts?.households !== households.length ||
      capturedCounts?.jobs !== jobs.length || capturedCounts?.organizations !== organizations.length)
    throw new Error("Raw PersonInput tiers do not match the stored core tier index and captured world counts.");
  for (const id of focusPersonIds) if (!byPerson.has(id))
    throw new Error("Prepared focus references an absent person: " + id);
  const player = byPerson.get(requestedPlayerId);
  if (!player || typeof player.placeId !== "string" || typeof player.countyId !== "string")
    throw new Error("Prepared root player lacks the captured place/county identity.");
  const expectedInitialFocus = new Set<string>([requestedPlayerId]);
  for (const field of [player.familyIds, player.knownIds]) {
    if (!Array.isArray(field) || field.some((id) => typeof id !== "string"))
      throw new Error("Prepared root player lacks valid family/known-person focus links.");
    for (const id of field as string[]) expectedInitialFocus.add(id);
  }
  const playerHousehold = households.find((row) => row.id === player.householdId);
  if (!playerHousehold || !Array.isArray(playerHousehold.memberIds) ||
      playerHousehold.memberIds.some((id) => typeof id !== "string"))
    throw new Error("Prepared root player lacks its initialized household focus links.");
  for (const id of playerHousehold.memberIds as string[]) expectedInitialFocus.add(id);
  const playerJob = typeof player.jobId === "string" ? byJob.get(player.jobId) : undefined;
  if (playerJob && playerJob.personId === player.id)
    for (const job of jobs)
      if (job.organizationId === playerJob.organizationId && typeof job.personId === "string")
        expectedInitialFocus.add(job.personId);
  const expectedInitialFocusPersonIds = [...expectedInitialFocus]
    .filter((id) => byPerson.has(id))
    .sort();
  if (JSON.stringify(expectedInitialFocusPersonIds) !== JSON.stringify(focusPersonIds))
    throw new Error("Captured initial focus IDs do not match the player, family, known people, household, and recorded coworkers.");
  const countyId = trace.countyId;
  if (typeof countyId !== "string" || countyId !== player.countyId ||
      !visiblePlaceIds.includes(player.placeId) || !visiblePlaceIds.includes(countyId))
    throw new Error("Prepared root visibility differs from its captured place/county.");
  const expectedVisiblePlaceIds = [...new Set([player.placeId, countyId])].sort();
  if (JSON.stringify(expectedVisiblePlaceIds) !== JSON.stringify(visiblePlaceIds))
    throw new Error("Prepared visible-place IDs differ from the root place and county.");
  if (focusPlaceIds.length !== 0)
    throw new Error("Normal-circle work benchmark must preserve the captured empty focusPlaceIds scope.");
  const capturedFinalDailyCirclePeople = capturedCounts?.dailyCirclePeople;
  if (!Number.isSafeInteger(capturedFinalDailyCirclePeople) ||
      (capturedFinalDailyCirclePeople as number) < expectedInitialFocusPersonIds.length ||
      (capturedFinalDailyCirclePeople as number) > people.length)
    throw new Error("Captured final daily-circle count does not retain the initial focus and fit the initialized population.");

  const commitmentIds = new Set<string>();
  const commitmentPeople = new Set<string>();
  for (const commitment of commitments) {
    if (typeof commitment.id !== "string" || commitmentIds.has(commitment.id))
      throw new Error("Prepared work commitments contain a missing or duplicate ID.");
    commitmentIds.add(commitment.id);
    const job = byJob.get(commitment.jobId as string);
    const person = byPerson.get(commitment.personId as string);
    if (!job || !person || job.personId !== person.id || job.organizationId !== commitment.organizationId ||
        !organizationIds.has(commitment.organizationId as string) || person.jobId !== job.id ||
        commitmentPeople.has(person.id))
      throw new Error("Prepared work commitment does not match its initialized job/person/employer references.");
    commitmentPeople.add(person.id);
    if (!Array.isArray(commitment.slots) || commitment.slots.length === 0 ||
        !Number.isSafeInteger(commitment.periodDays) || (commitment.periodDays as number) <= 0 ||
        !Number.isFinite(commitment.expectedWeeklyMinutes) || (commitment.expectedWeeklyMinutes as number) <= 0 ||
        !Number.isSafeInteger(commitment.hourlyMinor) || (commitment.hourlyMinor as number) < 0)
      throw new Error("Prepared work commitment has invalid schedule fields.");
    for (const slot of commitment.slots as JsonObject[]) {
      if (!Number.isSafeInteger(slot.offsetDays) || (slot.offsetDays as number) < 0 ||
          (slot.offsetDays as number) >= (commitment.periodDays as number) ||
          !Number.isFinite(slot.startMinute) || (slot.startMinute as number) < 0 ||
          !Number.isFinite(slot.minutes) || (slot.minutes as number) <= 0)
        throw new Error("Prepared work commitment has an invalid periodic slot.");
    }
  }
  if (!commitments.some((commitment) => commitment.jobId === player.jobId))
    throw new Error("Prepared root player job is not represented in the captured work commitments.");
  const capturedWork = capturedWorld?.work as JsonObject | undefined;
  const capturedCalendar = capturedWork?.calendar as JsonObject | undefined;
  if (capturedWork?.enabled !== true || !capturedCalendar ||
      !Number.isSafeInteger(capturedCalendar.plannedDatedSegments) ||
      (capturedCalendar.plannedDatedSegments as number) < 1)
    throw new Error("Capture receipt does not prove initialized scheduled-work decisions.");
  const features = {
    openingEmployment: parameters.openingEmployment,
    scheduledWork: parameters.scheduledWork,
  };
  if (features.openingEmployment !== true || features.scheduledWork !== true)
    throw new Error("This scheduled-work benchmark requires captured openingEmployment=true and scheduledWork=true feature flags.");
  return {
    trace,
    parameters,
    features,
    focusPersonIds,
    focusPlaceIds,
    visiblePlaceIds,
    rawInputTierCounts: sortedRecord(rawInputTierCounts),
    expectedInitializedCoreTierCounts,
    capturedFinalCoreTierCounts,
    expectedInitialFocusPersonIds,
    capturedFinalDailyCirclePeople: capturedFinalDailyCirclePeople as number,
    peopleCount: people.length,
    commitments,
  };
}

async function main(): Promise<void> {
  const preparationStarted = performance.now();
  const args = parseArgs(process.argv.slice(2));
  const repo = resolve(args.repo ?? "/workspace/p8-core-prototype");
  const inputPath = resolve(args.input ?? "/tmp/p8-prepared-work-input.json");
  const packedPath = resolve(args.packed ?? "/tmp/p8-prepared-work-input-v7.packed.json");
  const metadataPath = resolve(args.metadata ?? "/tmp/p8-prepared-work-input-v7.meta.json");
  if (args["input-is-prepared"] !== "true")
    throw new Error("--input-is-prepared true is required; this packer never selects peers or rewrites CoreInput.");
  const requestedPlayerId = args["player-id"];
  if (requestedPlayerId !== "person_5ddb09a9f5487640")
    throw new Error("This captured baseline requires --player-id person_5ddb09a9f5487640.");
  if (!args["source-manifest"])
    throw new Error("--source-manifest must point to the root measure receipt that captured the prepared CoreInput.");
  const sourceManifestPath = resolve(args["source-manifest"]);
  const memory = { processStart: memorySample() } as Record<string, ReturnType<typeof memorySample>>;
  const sourceGuard = verifyCoreManifest(repo, sourceManifestPath);
  const receiptBytes = readFileSync(sourceManifestPath);
  const captureReceiptSha256 = sha256(receiptBytes);
  const capture = JSON.parse(receiptBytes.toString("utf8")) as JsonObject;
  const captureVersions = capture.coreVersions as JsonObject | undefined;
  if (!captureVersions || typeof captureVersions.apiVersion !== "string" ||
      typeof captureVersions.schemaVersion !== "string")
    throw new Error("Root capture receipt must include captured coreVersions API/schema metadata.");
  const preparedExport = capture.preparedInputExport as JsonObject | undefined;
  if (!preparedExport || typeof preparedExport.path !== "string" ||
      typeof preparedExport.sha256 !== "string" ||
      preparedExport.serialization !== "Exact JSON.stringify CoreInput bytes without a trailing newline; written once with exclusive-create outside every annual timed window.")
    throw new Error("Root capture receipt lacks the exact prepared-input export proof.");
  if (typeof sourceGuard.expectedPreparedInputSha256 !== "string" ||
      sourceGuard.expectedPreparedInputSha256 !== capture.preparedInputSha256 ||
      preparedExport.sha256 !== capture.preparedInputSha256)
    throw new Error("Root source proof, prepared export, and input digest do not identify the same CoreInput.");

  const inputBytes = readFileSync(inputPath);
  const inputBytesSha256 = sha256(inputBytes);
  memory.afterExactByteHash = memorySample();
  if (inputBytesSha256 !== preparedExport.sha256)
    throw new Error("Prepared-input export bytes differ from the root capture receipt.");
  const inputText = inputBytes.toString("utf8");
  const input = JSON.parse(inputText) as JsonObject;
  const preparedInputSha256 = sha256(JSON.stringify(input));
  if (inputText !== JSON.stringify(input) || preparedInputSha256 !== capture.preparedInputSha256)
    throw new Error("Prepared CoreInput is not the exact captured JSON.stringify value/order.");
  memory.afterParse = memorySample();

  const sourceData = await import(pathToFileURL(resolve(repo, "src/core2/data.ts")).href);
  const coreVersions = {
    apiVersion: sourceData.CORE_API_VERSION as string,
    schemaVersion: sourceData.CORE_SCHEMA_VERSION as string,
  };
  if (coreVersions.apiVersion !== captureVersions.apiVersion ||
      coreVersions.schemaVersion !== captureVersions.schemaVersion)
    throw new Error("Current core API/schema differs from the prepared-input capture.");
  const validated = validatePreparedWorkInput(input, capture, requestedPlayerId,
    sourceData.DEFAULT_DATA.tiers.map((row: { id: string }) => row.id));
  const traceSelection = {
    playerId: validated.trace.playerId,
    requestedPlayerId,
    selectionMethod: "captured-prepared-input-no-reselection",
    countyId: validated.trace.countyId,
    focusPersonIds: validated.focusPersonIds,
    focusPlaceIds: validated.focusPlaceIds,
    visiblePlaceIds: validated.visiblePlaceIds,
    tierScope: validated.trace.tierScope,
    populationPersonCount: validated.peopleCount,
    initialFocusPersonCount: validated.expectedInitialFocusPersonIds.length,
    initialFocusPersonIds: validated.expectedInitialFocusPersonIds,
    capturedFinalDailyCirclePeople: validated.capturedFinalDailyCirclePeople,
    finalFocusIdsUnavailableInRootReceipt: true,
    workCommitmentCount: validated.commitments.length,
    workCommitmentsSha256: sha256(JSON.stringify(input.workCommitments)),
  };
  report("prepared-input-validated", {
    inputBytes: inputBytes.length,
    inputBytesSha256,
    preparedInputSha256,
    playerId: requestedPlayerId,
    focusPeople: traceSelection.focusPersonIds.length,
    rawInputTierCounts: validated.rawInputTierCounts,
    expectedInitializedCoreTierCounts: validated.expectedInitializedCoreTierCounts,
    capturedFinalCoreTierCounts: validated.capturedFinalCoreTierCounts,
    capturedFinalDailyCirclePeople: validated.capturedFinalDailyCirclePeople,
    workCommitmentCount: traceSelection.workCommitmentCount,
    featureFlags: validated.features,
    coreVersions,
  });

  const packed = packSources(input);
  const envelope = { schema: transportSchema, sourceTable: packed.sourceTable, input: packed.packedInput };
  const packedText = JSON.stringify(envelope);
  const roundTrip = restoreSources(packed.sourceTable, packed.packedInput);
  deepFreeze(roundTrip);
  const roundTripSha256 = sha256(JSON.stringify(roundTrip));
  memory.afterSourceInternRoundTripHash = memorySample();
  if (roundTripSha256 !== preparedInputSha256)
    throw new Error("Source-interned round trip changed the exact captured CoreInput value/order.");
  writeFileSync(packedPath, packedText);
  memory.afterPackedWrite = memorySample();
  const metadata = {
    schema: "p8-steady-benchmark-input-receipt-v4-prepared-work",
    inputWasAlreadyPrepared: true,
    selectionWasReapplied: false,
    rawInputPath: inputPath,
    rawInputBytes: inputBytes.length,
    rawInputSha256: inputBytesSha256,
    preparedInputSha256,
    expectedPreparedInputSha256: capture.preparedInputSha256,
    roundTripInputSha256: roundTripSha256,
    captureReceiptPath: sourceManifestPath,
    captureReceiptSha256,
    preparedInputExport: {
      capturePath: preparedExport.path,
      consumedPath: inputPath,
      sha256: preparedExport.sha256,
      serialization: preparedExport.serialization,
    },
    featureFlags: validated.features,
    traceSelection,
    tierSemantics: {
      rawInputTierCounts: validated.rawInputTierCounts,
      expectedInitializedCoreTierCounts: validated.expectedInitializedCoreTierCounts,
      capturedFinalCoreTierCounts: validated.capturedFinalCoreTierCounts,
      note: "createCore indexes each PersonInput.tier unchanged. Daily focus is a separate calendar scheduling override and does not rewrite stored tiers.",
    },
    focusInitialization: {
      method: "player plus recorded family/known people, household members, and recorded coworkers; non-person IDs excluded",
      initialPersonIds: validated.expectedInitialFocusPersonIds,
      initialPersonCount: validated.expectedInitialFocusPersonIds.length,
      capturedFinalDailyCirclePeople: validated.capturedFinalDailyCirclePeople,
      finalFocusIdsAvailableInRootCapture: false,
      limitation: "The root year receipt records only the final dailyCirclePeople count, not its final focus ID set. The isolated worker will validate final IDs against the count and compare exact final IDs across warmup and daily-step replay.",
    },
    rawInputTierCounts: validated.rawInputTierCounts,
    expectedInitializedCoreTierCounts: validated.expectedInitializedCoreTierCounts,
    capturedFinalCoreTierCounts: validated.capturedFinalCoreTierCounts,
    transport: {
      schema: transportSchema,
      path: packedPath,
      bytes: Buffer.byteLength(packedText),
      sha256: sha256(packedText),
      sourceDescriptorCount: packed.sourceTable.length,
      sourceReferenceCount: packed.sourceReferences,
      valueOrderCheck: "JSON.stringify(CoreInput) hash equals root capture before and after source interning.",
    },
    sourceGuard,
    coreVersions,
    harness: {
      packerPath: fileURLToPath(import.meta.url),
      packerSha256: sha256(readFileSync(fileURLToPath(import.meta.url))),
    },
    memoryScope: {
      preparationProcess: "separate, exits before benchmark workers start",
      includesPreparedInputParseAndRoundTripSerialization: true,
      representsProductionSteadyStateMemory: false,
      note: "The already-prepared JSON export is read, parsed, source-interned and written only in this preparation process. Report this peak separately from isolated steady worker memory.",
      sampledMemory: memory,
      processLifetimeMaxRssBytes: process.resourceUsage().maxRSS * (process.platform === "win32" ? 1 : 1024),
    },
    preparedAt: new Date().toISOString(),
    packElapsedMilliseconds: performance.now() - preparationStarted,
  };
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + "\n");
  report("packed-prepared-input-ready", {
    inputBytes: inputBytes.length,
    packedBytes: metadata.transport.bytes,
    sourceDescriptorCount: packed.sourceTable.length,
    sourceReferenceCount: packed.sourceReferences,
    playerId: requestedPlayerId,
    featureFlags: metadata.featureFlags,
    workCommitmentCount: traceSelection.workCommitmentCount,
    preparedInputSha256,
    packedPath,
    metadataPath,
  });
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
