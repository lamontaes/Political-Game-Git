/** Explicit finance/economy variants from one immutable prepared roster. Cloud-only receipt runner. */
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import { CORE_API_VERSION, CORE_SCHEMA_VERSION } from "../data";
import { createLifeCore } from "../life";
import { createOpeningFinance } from "../opening-finance";
import type { OpeningEconomyBuild } from "../opening-economy";
import type { FinanceInput } from "../finance-types";
import { parameter as p } from "../parameters";
import type { Parameter } from "../parameters";
import openingInputBudgets from "./opening-input-budgets.json" with { type: "json" };
import type { CoreInput } from "../types";
import { hashMeasuredJson, writeMeasuredJson } from "./measured-json";
import { censusOpeningInput, openingInputBudget } from "./opening-input-budget";
import openingInputBudgetBaseline from "./opening-input-budget-baseline.json" with { type: "json" };
import {
  economyObservables,
  type EconomyObservableSnapshot,
} from "./economy-observables";
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
      ![
        "--mode",
        "--variant",
        "--input",
        "--output",
        "--through-date",
      ].includes(key)
    )
      throw new Error(
        "Expected [--mode finance|economy] --variant before|after --input file --output file [--through-date YYYY-MM-DD]. Economy before binds existing opening finance; economy after adds income, funding and customers once.",
      );
    values.set(key, value);
  }
  const variant = values.get("--variant");
  if (variant !== "before" && variant !== "after")
    throw new Error("Finance variant must be before or after.");
  const mode = values.get("--mode") ?? "finance";
  if (mode !== "finance" && mode !== "economy")
    throw new Error("Measurement mode must be finance or economy.");
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
    mode,
    variant,
    inputPath: resolve(input),
    outputPath,
    throughDate: values.has("--through-date")
      ? makeIsoDate(values.get("--through-date")!)
      : undefined,
  };
}

function fileIdentity(path: string) {
  const fd = openSync(path, "r"),
    hash = createHash("sha256"),
    buffer = Buffer.alloc(p("bytesPerMiB"));
  let bytes = p("zero");
  try {
    for (;;) {
      const length = readSync(fd, buffer, p("zero"), buffer.length, null);
      if (length === p("zero")) break;
      hash.update(buffer.subarray(p("zero"), length));
      bytes += length;
    }
  } finally {
    closeSync(fd);
  }
  return { path, sha256: hash.digest("hex"), bytes };
}

function economyRuntimeDependencies() {
  // County owner validation reads these runtime identity/geography dependencies.
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
  return [
    "src/simulation/government-units.ts",
    "src/simulation/government-units.generated.ts",
    "src/simulation/place-county-relations.generated.ts",
    "src/simulation/national-counties.generated.ts",
    "data/research/local-government/county-governing-bodies.json",
    "data/research/money/place-population-acs-2024.json",
  ].map((path) => fileIdentity(resolve(root, path)));
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

function runOne(
  input: CoreInput,
  throughDate: string,
  retainDetails: boolean,
  originalEconomyInput?: CoreInput,
) {
  const snapshots: FinanceObservableSnapshot[] = [];
  const economySnapshots: EconomyObservableSnapshot[] = [];
  const before = memorySample();
  const started = performance.now();
  const core = createLifeCore(input, { observer: false, scheduledWork: true });
  const initialized = performance.now();
  const captured = advanceInMonthChunks(core, throughDate, true, (world) => {
    const snapshot = financeObservables(world);
    const opening = snapshots[p("zero")];
    if (
      opening &&
      BigInt(snapshot.cash.totalLiquidMinor) +
        BigInt(snapshot.cash.externalFlows.netMinor) !==
        BigInt(opening.cash.totalLiquidMinor) +
          BigInt(opening.cash.externalFlows.netMinor)
    )
      throw new Error(
        "Monthly cash and actual outside flows do not reconcile.",
      );
    snapshots.push(snapshot);
    if (originalEconomyInput) {
      const economy = economyObservables(world, originalEconomyInput);
      if (economy.cash.totalLiquidMinor !== snapshot.cash.totalLiquidMinor)
        throw new Error(
          "Economy original/appended cash projections do not reconcile with the finance snapshot.",
        );
      economySnapshots.push(economy);
    }
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
    !world.work.money.cashAndExternalFlowsConserved ||
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
    workStatsHash: hashMeasuredJson(world.work),
    financeStatsHash: hashMeasuredJson(snapshots),
    ...(originalEconomyInput
      ? { economyStatsHash: hashMeasuredJson(economySnapshots) }
      : {}),
    memory: {
      before,
      after,
      heapDeltaMiB: after.heapUsedMiB - before.heapUsedMiB,
      rssDeltaMiB: after.rssMiB - before.rssMiB,
    },
    financeTotals: {
      totalLiquidMinor: finance.cash.totalLiquidMinor,
      externalFlows: finance.cash.externalFlows,
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
    ...(retainDetails && originalEconomyInput ? { economySnapshots } : {}),
  };
}

export async function main(): Promise<void> {
  const args = argumentsForRun(process.argv.slice(p("two")));
  const sourceBefore = sourceHash();
  const economyDependenciesBefore =
    args.mode === "economy" ? economyRuntimeDependencies() : undefined;
  const preparationStarted = performance.now();
  const prepared = loadPreparedInput(args.inputPath);
  const loadedAt = performance.now();
  let financeInput: FinanceInput | undefined,
    economyBuild: OpeningEconomyBuild | undefined;
  let comparableBuildStartedAt: number | undefined;
  let runInput = prepared.input;
  if (args.mode === "economy") {
    if (p("warmupRuns") !== p("one") || p("warmRuns") !== p("one") + p("two"))
      throw new Error(
        "Opening-economy measurement requires one warmup and three measured fresh runs in the central registry.",
      );
    for (const path of [
      args.outputPath,
      `${args.outputPath}.finance-input.json`,
      `${args.outputPath}.economy-input.json`,
      ...(args.variant === "after"
        ? [`${args.outputPath}.opening-economy.json`]
        : []),
    ])
      if (path === args.inputPath || existsSync(path))
        throw new Error(
          `Opening-economy measurement requires new output paths: ${path}`,
        );
    deepFreeze(prepared.input);
    if (args.variant === "after") {
      const { buildOpeningEconomy } = await import("../opening-economy");
      comparableBuildStartedAt = performance.now();
      economyBuild = buildOpeningEconomy(prepared.input);
      runInput = economyBuild.input;
      financeInput = runInput.finance;
    } else {
      financeInput = createOpeningFinance(prepared.input);
      runInput = { ...prepared.input, finance: financeInput };
    }
  } else {
    financeInput =
      args.variant === "after"
        ? createOpeningFinance(prepared.input)
        : undefined;
    runInput = financeInput
      ? { ...prepared.input, finance: financeInput }
      : prepared.input;
  }
  const boundAt = performance.now();
  const input = deepFreeze(runInput);
  const frozenAt = performance.now();
  // Outside annual timers, before any large export or world initialization.
  const inputSizeCensus = censusOpeningInput(input);
  const inputSizeBudget = openingInputBudget(
    inputSizeCensus,
    openingInputBudgets as unknown as Readonly<Record<string, Parameter>>,
  );
  const budgetCheckedAt = performance.now();
  const preparationComparison = {
    beforeSeconds: openingInputBudgetBaseline.beforePreparationSeconds,
    beforeSource: openingInputBudgetBaseline.source,
    beforeReceiptRef: openingInputBudgetBaseline.beforeReceiptRef,
    phaseDefinition: openingInputBudgetBaseline.phaseDefinition,
    currentVariant: args.variant,
    actualPreparationAndFinalFreezeSeconds:
      (frozenAt - loadedAt) / p("millisecondsPerSecond"),
    actualAfterBuildAndFinalFreezeSeconds:
      comparableBuildStartedAt === undefined
        ? null
        : (frozenAt - comparableBuildStartedAt) / p("millisecondsPerSecond"),
    broadCompositionSeconds: (boundAt - loadedAt) / p("millisecondsPerSecond"),
    freezeSeconds: (frozenAt - boundAt) / p("millisecondsPerSecond"),
    censusAndGuardSeconds:
      (budgetCheckedAt - frozenAt) / p("millisecondsPerSecond"),
  };
  progress("opening-input-size-census", {
    census: inputSizeCensus,
    budget: inputSizeBudget,
    preparationComparison,
  });
  if (!inputSizeBudget.passed)
    throw new Error(
      `Opening input size budget rejected before exports/world: ${inputSizeBudget.violations.join(" ")}`,
    );
  const throughDate =
    args.throughDate ??
    addDays(makeIsoDate(input.startedAt), p("yearSpanDays"));
  const expectedDays = daysBetween(makeIsoDate(input.startedAt), throughDate);
  if (expectedDays <= p("zero"))
    throw new Error("The receipt must advance a positive calendar window.");
  if (args.mode === "economy" && expectedDays !== p("yearSpanDays"))
    throw new Error(
      "Opening-economy runs require the registered full-year calendar window.",
    );
  mkdirSync(dirname(args.outputPath), { recursive: true });
  const financeInputExport = financeInput
    ? writeMeasuredJson(`${args.outputPath}.finance-input.json`, financeInput, {
        trailingNewline: false,
      })
    : undefined;
  const financeInputHash = financeInputExport?.sha256 ?? null;
  const economyInputExport =
    args.mode === "economy"
      ? writeMeasuredJson(`${args.outputPath}.economy-input.json`, input)
      : undefined;
  const openingEconomyReceiptExport = economyBuild
    ? writeMeasuredJson(
        `${args.outputPath}.opening-economy.json`,
        economyBuild.receipt,
      )
    : undefined;
  progress("prepared-input-loaded", {
    variant: args.variant,
    ...(args.mode === "economy"
      ? {
          mode: args.mode,
          actualInputSha256: economyInputExport!.sha256,
          addedCashMinor: economyBuild?.receipt.addedCashMinor ?? p("zero"),
          appendedFiniteAccounts:
            economyBuild?.receipt.addedOpeningAccounts.length ?? p("zero"),
        }
      : {}),
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
    const run = runOne(
      input,
      throughDate,
      false,
      args.mode === "economy" ? prepared.input : undefined,
    );
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
    const run = runOne(
      input,
      throughDate,
      index === p("warmRuns") - p("one"),
      args.mode === "economy" ? prepared.input : undefined,
    );
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
        run.financeStatsHash !== first.financeStatsHash ||
        run.economyStatsHash !== first.economyStatsHash,
    )
  )
    throw new Error(
      "Identical warmed runs produced different captured act, work, or finance results.",
    );
  const sourceAfter = sourceHash();
  if (JSON.stringify(sourceBefore) !== JSON.stringify(sourceAfter))
    throw new Error("Source changed during the measurement.");
  const economyDependenciesAfter =
    args.mode === "economy" ? economyRuntimeDependencies() : undefined;
  if (
    JSON.stringify(economyDependenciesBefore) !==
    JSON.stringify(economyDependenciesAfter)
  )
    throw new Error(
      "Opening-economy runtime dependencies changed during the measurement.",
    );
  for (const artifact of [economyInputExport, openingEconomyReceiptExport]) {
    if (
      artifact &&
      JSON.stringify(fileIdentity(artifact.path)) !== JSON.stringify(artifact)
    )
      throw new Error(
        `Opening-economy input or producer receipt changed during the measurement: ${artifact.path}`,
      );
  }
  if (
    statSync(args.inputPath).size !== prepared.bytes ||
    createHash("sha256").update(readFileSync(args.inputPath)).digest("hex") !==
      prepared.sha256
  )
    throw new Error("The prepared input changed during the measurement.");
  const medianMilliseconds = median(runs.map((run) => run.elapsedMilliseconds));
  const receipt = {
    schema:
      args.mode === "economy"
        ? "p8-opening-economy-paired-year-v1"
        : "p8-recorded-finance-paired-window-v1",
    coreVersions: {
      apiVersion: CORE_API_VERSION,
      schemaVersion: CORE_SCHEMA_VERSION,
    },
    variant: args.variant,
    nationalConditions:
      "flat national conditions, no national economy module yet",
    ...(args.mode === "economy"
      ? {
          mode: args.mode,
          openingEconomy: {
            enrichmentPerformed: Boolean(economyBuild),
            enrichmentApplications: economyBuild ? p("one") : p("zero"),
            originalCashMinor:
              economyBuild?.receipt.originalCashMinor ??
              runs.at(-p("one"))!.economySnapshots![p("zero")]!.cash
                .totalLiquidMinor,
            addedCashMinor: economyBuild?.receipt.addedCashMinor ?? p("zero"),
            enrichedCashMinor: runs.at(-p("one"))!.economySnapshots![p("zero")]!
              .cash.totalLiquidMinor,
            actualRunInput: economyInputExport,
            producerReceipt: openingEconomyReceiptExport ?? null,
            addedOpeningAccounts:
              economyBuild?.receipt.addedOpeningAccounts ?? [],
            comparison:
              "Economy before binds opening finance to the prepared roster. Economy after adds qualified retirement records, genuine outside obligations paid when due, and compatible customer budgets once. All added opening stocks are separately disclosed; outside owners hold zero cash. Results may differ.",
            originalJobAndScheduleIdentityPreserved: true,
          },
        }
      : {}),
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
      financeInputExport: financeInputExport?.path ?? null,
    },
    sourceHash: {
      beforeBuild: sourceBefore,
      afterRuns: sourceAfter,
      stableDuringRun: true,
      ...(args.mode === "economy"
        ? {
            economyDirectDependenciesBefore: economyDependenciesBefore,
            economyDirectDependenciesAfter: economyDependenciesAfter,
          }
        : {}),
    },
    openingInputSize: { census: inputSizeCensus, budget: inputSizeBudget },
    preparation: {
      comparison: preparationComparison,
      censusAndGuardMilliseconds: budgetCheckedAt - frozenAt,
      loadingMilliseconds: loadedAt - preparationStarted,
      financeBindingMilliseconds: boundAt - loadedAt,
      freezeMilliseconds: frozenAt - boundAt,
      ...(args.mode === "economy"
        ? {
            bindingScope:
              "Original input is frozen before composition; all opening record producers run outside annual timers exactly once for the after variant. Input/receipt export is also outside annual timers.",
          }
        : {}),
    },
    timerScope:
      args.mode === "economy"
        ? "Core initialization and clock advance, including identical month-counter hashing, affect capture, finance snapshots and monthly economy actor/account/work/paid-income snapshots in both economy variants. Final world validation and serialization, immutable input preparation, opening composition and input/producer-receipt exports are outside every annual window."
        : "Core initialization and clock advance, including identical month-counter hashing, affect capture, finance snapshots and progress in both variants. World validation and final serialization are outside the timer. Input loading, opening finance binding and deep-freeze are outside every annual window.",
    memoryScope:
      "Before/after Node heap and RSS samples; process lifetime max RSS includes loading, warmup and earlier runs. This is not an isolated steady-state memory or garbage-collection receipt.",
    retainedRunDetails:
      args.mode === "economy"
        ? "Warmup and earlier measured runs retain timing, hashes and scalar totals only. The final measured run retains full world, monthly finance/work/cash snapshots, original-actor choices and saved reasons, exact retained paid-income residence ledgers, original-job results and all-time/monthly actor counts."
        : "Warmup and earlier measured runs retain timing, hashes and scalar totals only. Full world and monthly finance snapshots are retained only for the final measured run.",
    comparisonScope:
      args.mode === "economy"
        ? "Same original prepared input, original account stocks, actor identities, jobs, commitments and frozen source. Before has existing opening finance; after adds qualified income and customer agreements, with genuine outside obligations paid when due. Added accounts and opening stocks are separately disclosed; outside owners hold zero cash. Repeated-run hashes check deterministic results within each variant; no cross-variant equality or realism calibration is claimed."
        : "Same base roster and same source; after attaches estimated standing counterparties without changing original cash, jobs, families or people. Outcomes intentionally may differ across variants. Hashes check repeated runs within each variant, not whole-world equivalence.",
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
  writeMeasuredJson(args.outputPath, receipt, {
    pretty: true,
    trailingNewline: true,
  });
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
