import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  writeFileSync,
} from "node:fs";
import { performance } from "node:perf_hooks";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { execFileSync } from "node:child_process";
import type * as Observer from "../../src/presentation/observer-world";
import type * as LawEffects from "../../src/simulation/enacted-law-effects";
import { anniversary } from "../dev-lab/world-aging";
import type * as AgingClock from "../dev-lab/world-aging";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import {
  collectSystemProof,
  plainSystemReport,
  type ProofSystem,
  type ReadEvictionObservations,
} from "./systems";
import {
  governanceStages,
  congressStages,
  jurisdictionStages,
  congressPassageVotes,
} from "./stages";

if (process.argv.includes("--help")) {
  console.log(
    "run.ts SEED YEARS OUTPUT_JSON [--system evictions|laws|filing|life|all --report REPORT_MD --max-minutes 120 --keep-world WORLD_JSON]\nLife mode follows the opening resident's canonical records for the requested years. Legacy stage mode is preserved. OCD_GOVERNANCE_SOURCE_ROOT selects the existing runtime checkout; it creates no checkout.",
  );
  process.exit(0);
}
const seed = process.argv[2] ?? "wave1-team2-baseline-20260929";
const years = Number(process.argv[3] ?? 5);
if (!Number.isInteger(years) || years < 1)
  throw new Error("YEARS must be a positive integer.");
const output = process.argv[4] ?? "test-results/governance-proof/watched.json";
const option = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return null;
  const value = process.argv[at + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`--${name} requires a value.`);
  return value;
};
const systemOption = option("system");
if (
  systemOption &&
  !["evictions", "laws", "filing", "life", "all"].includes(systemOption)
)
  throw new Error("Unknown proof system.");
const start = performance.now();
const sourceRoot = process.env.OCD_GOVERNANCE_SOURCE_ROOT ?? resolve(".");
const observer = (await import(
  pathToFileURL(resolve(sourceRoot, "src/presentation/observer-world.ts")).href
)) as typeof Observer;
const place = observer.observerPlace(seed);
const clock = (await import(
  pathToFileURL(resolve(sourceRoot, "scripts/dev-lab/world-aging.ts")).href
)) as typeof AgingClock;
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: sourceRoot,
  encoding: "utf8",
}).trim();
const sourceDirty =
  execFileSync("git", ["status", "--porcelain"], {
    cwd: sourceRoot,
    encoding: "utf8",
  }).trim().length > 0;
const collectorHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const collectorDirty =
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
    .length > 0;
console.log(
  JSON.stringify({
    status: "opening",
    seed,
    place: place.displayName,
    placeKey: place.key,
    sourceHead,
    sourceDirty,
    collectorHead,
    collectorDirty,
    system: systemOption ?? "stages",
  }),
);
mkdirSync(dirname(output), { recursive: true });
const watched = clock.openWatchedWorld(seed, place.key);
const button = clock.createObserverDayButton(watched.world);
const openingMs = performance.now() - start;
if (systemOption) {
  const maxMinutes = Number(option("max-minutes") ?? "120");
  if (!Number.isFinite(maxMinutes) || maxMinutes <= 0)
    throw new Error("--max-minutes must be positive.");
  const reportPath = option("report") ?? `${output}.md`;
  mkdirSync(dirname(reportPath), { recursive: true });
  const until = anniversary(watched.world.currentDate, years);
  const openingSequence = watched.world.history.nextSequence;
  let days = 0;
  let problem: string | null = null;
  let lastProgress = performance.now();
  while (button.world.currentDate < until) {
    if (performance.now() - start >= maxMinutes * 60_000) {
      problem = `Time bound ${maxMinutes} minutes reached.`;
      break;
    }
    const press = button.press();
    if (press.status !== "moved") {
      problem = press.problem;
      break;
    }
    days += 1;
    if (performance.now() - lastProgress >= 15_000) {
      console.log(
        JSON.stringify({
          status: "advancing",
          days,
          currentDate: button.world.currentDate,
        }),
      );
      lastProgress = performance.now();
    }
  }
  const effects = (await import(
    pathToFileURL(resolve(sourceRoot, "src/simulation/enacted-law-effects.ts"))
      .href
  )) as typeof LawEffects;
  const caseModulePath = resolve(
    sourceRoot,
    "src/simulation/living-world/eviction-observations.ts",
  );
  const readCases: ReadEvictionObservations | undefined = existsSync(
    caseModulePath,
  )
    ? (await import(pathToFileURL(caseModulePath).href))
        .evictionCaseObservations
    : undefined;
  const proof = collectSystemProof(
    button.world,
    {
      from: watched.world.currentDate,
      through: button.world.currentDate,
      openingSequence,
    },
    systemOption as ProofSystem,
    effects.enactedLawsWithEffects,
    readCases,
    systemOption === "life" ? watched.anchorPersonId : undefined,
  );
  let save: unknown = null;
  try {
    save = await clock.saveAndReopen(button.world);
    if (!(save as { reopenedMatches: boolean }).reopenedMatches)
      problem ??= "Save/Continue mismatch.";
  } catch (error) {
    problem ??= `Save/Continue failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  const status =
    button.world.currentDate >= until && !problem
      ? years === 1
        ? "completed-year"
        : "completed-years"
      : "incomplete";
  const context = {
    seed,
    place: place.displayName,
    placeKey: place.key,
    sourceHead,
    collectorHead,
    collectorDirty,
    sourceDirty,
    status,
    days,
    requestedYears: years,
    anchorPersonId: watched.anchorPersonId,
    save,
    problem,
  };
  writeFileSync(
    output,
    JSON.stringify(
      {
        ...context,
        openingMs,
        elapsedMs: performance.now() - start,
        targetDate: until,
        proof,
      },
      null,
      2,
    ),
  );
  writeFileSync(reportPath, plainSystemReport(proof, context));
  const keep = option("keep-world");
  if (keep) {
    mkdirSync(dirname(keep), { recursive: true });
    const { serializeWorldPayload } = await import(
      pathToFileURL(resolve(sourceRoot, "src/simulation/serialization.ts")).href
    );
    const payload = serializeWorldPayload(button.world);
    const file = openSync(keep, "w");
    try {
      for (const chunk of typeof payload === "string" ? [payload] : payload)
        writeFileSync(file, chunk);
    } finally {
      closeSync(file);
    }
  }
  console.log(
    JSON.stringify({
      status,
      days,
      currentDate: button.world.currentDate,
      output,
      reportPath,
      problem,
    }),
  );
  process.exit(problem ? 1 : 0);
}
const yearly = [];
let previous = performance.now();
for (let year = 1; year <= years; year++) {
  const until = anniversary(watched.world.currentDate, year);
  let days = 0;
  let lastProgress = performance.now();
  while (button.world.currentDate < until) {
    const press = button.press();
    if (press.status !== "moved") throw new Error(press.problem);
    days++;
    if (performance.now() - lastProgress >= 15_000) {
      console.log(
        JSON.stringify({
          year,
          days,
          currentDate: button.world.currentDate,
          status: "advancing",
        }),
      );
      lastProgress = performance.now();
    }
  }
  const elapsedMs = performance.now() - previous;
  const periodStart = anniversary(watched.world.currentDate, year - 1);
  const rows = governanceStages(button.world, periodStart);
  const congress = congressStages(button.world, periodStart);
  const council = jurisdictionStages(
    button.world,
    lifePlaceByKey(place.key)?.context.jurisdiction.id ?? null,
    periodStart,
  );
  const save = await clock.saveAndReopen(button.world);
  if (!save.reopenedMatches)
    throw new Error(
      "Save/Continue did not preserve the watched world date and history counts.",
    );
  const summary = {
    year,
    days,
    elapsedMs,
    currentDate: button.world.currentDate,
    save,
    statesEnacting: rows.filter((r) => r.state && r.enactedDuringPeriod > 0)
      .length,
    statesEverEnacting: rows.filter((r) => r.state && r.enacted > 0).length,
    periodStart,
    annualEnactments: rows.map((r) => ({
      usps: r.usps,
      enacted: r.enactedDuringPeriod,
    })),
    congressEnacted: congress.enactedDuringPeriod,
    councilEnacted: council.enactedDuringPeriod,
    bills: button.world.history.legislativeMeasures?.length ?? 0,
  };
  yearly.push(summary);
  console.log(JSON.stringify(summary));
  writeFileSync(
    output,
    JSON.stringify(
      {
        seed,
        place: place.displayName,
        placeKey: place.key,
        startedOn: watched.world.currentDate,
        sourceRoot,
        sourceHead,
        sourceDirty,
        openingMs,
        congress,
        council,
        congressPassageVotes: congressPassageVotes(button.world),
        elapsedMs: performance.now() - start,
        yearly,
        stages: rows,
      },
      null,
      2,
    ),
  );
  previous = performance.now();
}
