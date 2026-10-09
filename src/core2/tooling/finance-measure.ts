/** Same prepared roster, with and without recorded-counterparty finance. Cloud-only receipt runner. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import { CORE_API_VERSION, CORE_SCHEMA_VERSION } from "../data";
import { createLifeCore } from "../life";
import { createOpeningFinance } from "../opening-finance";
import { parameter as p } from "../parameters";
import type { CoreInput } from "../types";
import {
  financeObservables,
  type FinanceObservableSnapshot,
} from "./finance-observables";
import {
  advanceInMonthChunks,
  deepFreeze,
  median,
  memorySample,
  sourceHash,
  summarizeWorld,
} from "./measure";

function progress(phase: string, detail: Record<string, unknown>): void {
  process.stderr.write(
    `[${new Date().toISOString()}] ${phase} ${JSON.stringify(detail)}\n`,
  );
}

function argumentsForRun(args: readonly string[]) {
  const values = new Map<string, string>();
  for (let index = p("zero"); index < args.length; index += p("two")) {
    const key = args[index],
      value = args[index + p("one")];
    if (
      !key ||
      !value ||
      values.has(key) ||
      !["--variant", "--input", "--output", "--through-date"].includes(key)
    )
      throw new Error(
        "Expected --variant before|after --input file --output file [--through-date YYYY-MM-DD].",
      );
    values.set(key, value);
  }
  const variant = values.get("--variant");
  if (variant !== "before" && variant !== "after")
    throw new Error("Finance variant must be before or after.");
  const input = values.get("--input"),
    output = values.get("--output");
  if (!input || !output)
    throw new Error(
      "An immutable prepared input and new output path are required.",
    );
  const outputPath = resolve(output),
    repositoryRoot = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );
  const withinRepository = relative(repositoryRoot, outputPath);
  if (
    !withinRepository ||
    (!withinRepository.startsWith(`..${sep}`) && withinRepository !== "..")
  )
    throw new Error("Measurement receipts must be outside the repository.");
  return {
    variant,
    inputPath: resolve(input),
    outputPath,
    throughDate: values.has("--through-date")
      ? makeIsoDate(values.get("--through-date")!)
      : undefined,
  };
}

function loadPreparedInput(path: string): {
  input: CoreInput;
  sha256: string;
  bytes: number;
} {
  const raw = readFileSync(path);
  const sha256 = createHash("sha256").update(raw).digest("hex");
  const input = JSON.parse(raw.toString("utf8")) as CoreInput;
  if (input.finance)
    throw new Error(
      "The paired baseline input already has finance; use the original prepared roster.",
    );
  return { input, sha256, bytes: raw.length };
}

function runOne(input: CoreInput, throughDate: string, retainDetails: boolean) {
  const snapshots: FinanceObservableSnapshot[] = [];
  const before = memorySample();
  const started = performance.now();
  const core = createLifeCore(input, { observer: false, scheduledWork: true });
  const initialized = performance.now();
  const captured = advanceInMonthChunks(core, throughDate, true, (world) => {
    const snapshot = financeObservables(world);
    if (
      snapshots.length > p("zero") &&
      snapshot.cash.totalLiquidMinor !==
        snapshots[p("zero")]!.cash.totalLiquidMinor
    )
      throw new Error("Monthly snapshots do not conserve actual liquid cash.");
    snapshots.push(snapshot);
  });
  const completed = performance.now();
  const after = memorySample();
  const expectedDays = daysBetween(
    makeIsoDate(input.startedAt),
    makeIsoDate(throughDate),
  );
  if (captured.receipt.simulatedDays !== expectedDays)
    throw new Error("The run did not complete its specified calendar window.");
  const finance = snapshots.at(-p("one"))!;
  if (!finance) throw new Error("Finance snapshots were not captured.");
  const reasonSummary = { ...captured.reasonSummary };
  if (!retainDetails) {
    delete reasonSummary.byPerson;
    delete reasonSummary.personMonthActionRows;
  }
  const world = summarizeWorld(core, retainDetails, reasonSummary, input);
  if (
    !world.work.money.closedMoneyConserved ||
    world.work.money.latestCashReceiptFailures !== p("zero")
  )
    throw new Error(
      "The completed run does not conserve actual liquid cash or wage receipts.",
    );
  if (
    world.allTimeActCount !== captured.receipt.acts ||
    reasonSummary.totals.acts !== captured.receipt.acts
  )
    throw new Error(
      "Captured monthly action counts do not equal the actual clock receipt.",
    );
  const elapsedMilliseconds = completed - started;
  return {
    elapsedMilliseconds,
    initializeMilliseconds: initialized - started,
    advanceMilliseconds: completed - initialized,
    daysPerMinute:
      (expectedDays * p("secondsPerMinute") * p("millisecondsPerSecond")) /
      elapsedMilliseconds,
    simulatedDays: expectedDays,
    decisions: captured.receipt.decisions,
    acts: captured.receipt.acts,
    actStatsHash: world.actStatsHash,
    workStatsHash: createHash("sha256")
      .update(JSON.stringify(world.work))
      .digest("hex"),
    financeStatsHash: createHash("sha256")
      .update(JSON.stringify(snapshots))
      .digest("hex"),
    memory: {
      before,
      after,
      heapDeltaMiB: after.heapUsedMiB - before.heapUsedMiB,
      rssDeltaMiB: after.rssMiB - before.rssMiB,
    },
    financeTotals: {
      totalLiquidMinor: finance.cash.totalLiquidMinor,
      requestedWagesMinor: finance.wages.requestedMinor,
      paidWagesMinor: finance.wages.paidMinor,
      unpaidWagesMinor: finance.wages.unpaidMinor,
      liveJobs: finance.employment.liveJobs,
      liveOwnedJobs: finance.employment.liveOwnedJobs,
      liveJobHolders: finance.employment.liveJobHolders,
      endedJobs: finance.employment.endedJobs,
      actualFirmReceiptsMinor: finance.firmTotals.receivedMinor,
      closures: finance.closures.length,
    },
    ...(retainDetails ? { finance, financeSnapshots: snapshots, world } : {}),
  };
}

export async function main(): Promise<void> {
  const args = argumentsForRun(process.argv.slice(p("two")));
  const sourceBefore = sourceHash();
  const preparationStarted = performance.now();
  const prepared = loadPreparedInput(args.inputPath);
  const loadedAt = performance.now();
  const financeInput =
    args.variant === "after" ? createOpeningFinance(prepared.input) : undefined;
  const boundAt = performance.now();
  const input = deepFreeze(
    financeInput
      ? { ...prepared.input, finance: financeInput }
      : prepared.input,
  );
  const frozenAt = performance.now();
  const throughDate =
    args.throughDate ??
    addDays(makeIsoDate(input.startedAt), p("yearSpanDays"));
  const expectedDays = daysBetween(makeIsoDate(input.startedAt), throughDate);
  if (expectedDays <= p("zero"))
    throw new Error("The receipt must advance a positive calendar window.");
  const financeBytes = financeInput ? JSON.stringify(financeInput) : undefined;
  const financeInputHash = financeBytes
    ? createHash("sha256").update(financeBytes).digest("hex")
    : null;
  mkdirSync(dirname(args.outputPath), { recursive: true });
  if (financeBytes)
    writeFileSync(`${args.outputPath}.finance-input.json`, financeBytes, {
      flag: "wx",
    });
  progress("prepared-input-loaded", {
    variant: args.variant,
    inputSha256: prepared.sha256,
    inputBytes: prepared.bytes,
    people: input.people.length,
    circle: input.focusPersonIds.length,
    financeContracts: financeInput?.contracts.length ?? p("zero"),
    financeBusinesses: financeInput?.businesses.length ?? p("zero"),
    financeFacilities: financeInput?.facilities.length ?? p("zero"),
  });
  const warmups: ReturnType<typeof runOne>[] = [],
    runs: ReturnType<typeof runOne>[] = [];
  for (let index = p("zero"); index < p("warmupRuns"); index += p("one")) {
    progress("warmup-start", {
      run: index + p("one"),
      variant: args.variant,
      throughDate,
    });
    const run = runOne(input, throughDate, false);
    warmups.push(run);
    progress("warmup-complete", {
      run: index + p("one"),
      elapsedMilliseconds: run.elapsedMilliseconds,
      daysPerMinute: run.daysPerMinute,
    });
  }
  for (let index = p("zero"); index < p("warmRuns"); index += p("one")) {
    progress("measured-run-start", {
      run: index + p("one"),
      variant: args.variant,
      throughDate,
    });
    const run = runOne(input, throughDate, index === p("warmRuns") - p("one"));
    runs.push(run);
    progress("measured-run-complete", {
      run: index + p("one"),
      elapsedMilliseconds: run.elapsedMilliseconds,
      daysPerMinute: run.daysPerMinute,
      actStatsHash: run.actStatsHash,
      financeStatsHash: run.financeStatsHash,
    });
  }
  const allRuns = [...warmups, ...runs],
    first = allRuns[p("zero")]!;
  if (
    allRuns.some(
      (run) =>
        run.actStatsHash !== first.actStatsHash ||
        run.workStatsHash !== first.workStatsHash ||
        run.financeStatsHash !== first.financeStatsHash,
    )
  )
    throw new Error(
      "Identical warmed runs produced different captured act, work, or finance results.",
    );
  const sourceAfter = sourceHash();
  if (JSON.stringify(sourceBefore) !== JSON.stringify(sourceAfter))
    throw new Error("Source changed during the measurement.");
  if (
    statSync(args.inputPath).size !== prepared.bytes ||
    createHash("sha256").update(readFileSync(args.inputPath)).digest("hex") !==
      prepared.sha256
  )
    throw new Error("The prepared input changed during the measurement.");
  const medianMilliseconds = median(runs.map((run) => run.elapsedMilliseconds));
  const receipt = {
    schema: "p8-recorded-finance-paired-window-v1",
    coreVersions: {
      apiVersion: CORE_API_VERSION,
      schemaVersion: CORE_SCHEMA_VERSION,
    },
    variant: args.variant,
    observer: false,
    scheduledWork: true,
    seed: input.seed,
    playerId: input.playerId,
    startedAt: input.startedAt,
    throughDate,
    expectedSimulatedDays: expectedDays,
    input: {
      path: args.inputPath,
      sha256: prepared.sha256,
      bytes: prepared.bytes,
      financeInputSha256: financeInputHash,
      financeInputExport: financeBytes
        ? `${args.outputPath}.finance-input.json`
        : null,
    },
    sourceHash: {
      beforeBuild: sourceBefore,
      afterRuns: sourceAfter,
      stableDuringRun: true,
    },
    preparation: {
      loadingMilliseconds: loadedAt - preparationStarted,
      financeBindingMilliseconds: boundAt - loadedAt,
      freezeMilliseconds: frozenAt - boundAt,
    },
    timerScope:
      "Core initialization and clock advance, including identical month-counter hashing, affect capture, finance snapshots and progress in both variants. World validation and final serialization are outside the timer. Input loading, opening finance binding and deep-freeze are outside every annual window.",
    memoryScope:
      "Before/after Node heap and RSS samples; process lifetime max RSS includes loading, warmup and earlier runs. This is not an isolated steady-state memory or garbage-collection receipt.",
    retainedRunDetails:
      "Warmup and earlier measured runs retain timing, hashes and scalar totals only. Full world and monthly finance snapshots are retained only for the final measured run.",
    comparisonScope:
      "Same base roster and same source; after attaches estimated standing counterparties without changing original cash, jobs, families or people. Outcomes intentionally may differ across variants. Hashes check repeated runs within each variant, not whole-world equivalence.",
    warmupCount: p("warmupRuns"),
    measuredCount: p("warmRuns"),
    warmups,
    runs,
    aggregate: {
      medianMilliseconds,
      medianDaysPerMinute:
        (expectedDays * p("secondsPerMinute") * p("millisecondsPerSecond")) /
        medianMilliseconds,
      minimumMilliseconds: Math.min(
        ...runs.map((run) => run.elapsedMilliseconds),
      ),
      maximumMilliseconds: Math.max(
        ...runs.map((run) => run.elapsedMilliseconds),
      ),
      withinYearBudget:
        expectedDays === p("yearSpanDays") &&
        medianMilliseconds <
          p("yearSecondsBudget") * p("millisecondsPerSecond"),
    },
  };
  writeFileSync(
    args.outputPath,
    `${JSON.stringify(receipt, null, p("two"))}\n`,
    { flag: "wx" },
  );
  progress("receipt-written", { path: args.outputPath, ...receipt.aggregate });
}

if (
  process.argv[p("one")] &&
  import.meta.url === pathToFileURL(resolve(process.argv[p("one")]!)).href
)
  void main().catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = p("one");
  });
