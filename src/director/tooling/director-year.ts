/**
 * P13 proof runner: one generated town, one year on the new core, with the
 * story director watching chosen lives. Developer tooling only; run in a
 * cloud environment, never on the owner's Mac.
 *
 * Input: a prepared core input written by the core's measurement tool
 * (`npx tsx src/core2/tooling/measure.ts --mode opening
 * --prepared-input-output <file>`), so the town, seed and player are the
 * core's own. Finance is bound the same way the core's finance year binds it.
 *
 *   npx tsx src/director/tooling/director-year.ts --input <prepared.json>
 *     --output <receipt.json> [--through 2022-01-01] [--watch <id> ...]
 *     [--cohort-employer-of <id>] [--timing-only base|director]
 *     [--with-drives true]
 *
 * --with-drives installs the drives and health modules from the drives
 * package (P10, pull request 3922) when they are present in the checkout;
 * they are loaded at run time so this tool does not depend on that package.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { advanceCore, createLifeCore } from "../../core2/life";
import { createOpeningFinance } from "../../core2/opening-finance";
import { DEFAULT_DATA } from "../../core2/data";
import type {
  CoreData,
  CoreInput,
  CoreModule,
  CoreState,
  PersonId,
} from "../../core2/types";
import { createDirector, type Director } from "../ledger";
import { openDirectorStopgapCount } from "../stopgaps";

interface Options {
  input: string;
  output?: string;
  through: string;
  watch: string[];
  cohortEmployerOf?: string;
  timingOnly?: string;
  withDrives: boolean;
  watchAll: boolean;
}

function parse(argv: readonly string[]): Options {
  const options: Options = {
    input: "",
    through: "2022-01-01",
    watch: [],
    withDrives: false,
    watchAll: false,
  };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (!value) throw new Error(`${flag} needs a value.`);
    if (flag === "--input") options.input = value;
    else if (flag === "--output") options.output = value;
    else if (flag === "--through") options.through = value;
    else if (flag === "--watch") options.watch.push(value);
    else if (flag === "--cohort-employer-of") options.cohortEmployerOf = value;
    else if (flag === "--timing-only") options.timingOnly = value;
    else if (flag === "--with-drives") options.withDrives = value === "true";
    else if (flag === "--watch-all") options.watchAll = value === "true";
    else throw new Error(`Unknown option: ${flag}`);
  }
  if (!options.input) throw new Error("--input is required.");
  return options;
}

function mib(): { heapMiB: number; rssMiB: number } {
  const usage = process.memoryUsage();
  return { heapMiB: usage.heapUsed / 2 ** 20, rssMiB: usage.rss / 2 ** 20 };
}

/** Everyone who worked for the same employer at the opening, and their households. */
function employerCohort(input: CoreInput, personId: string): string[] {
  const person = input.people.find((row) => row.id === personId);
  const job = input.jobs.find((row) => row.id === person?.jobId);
  if (!job) return [];
  const workers = new Set(
    input.jobs
      .filter((row) => row.organizationId === job.organizationId && !row.endsAt)
      .map((row) => row.personId),
  );
  return [...workers].sort();
}

interface ExtraModules {
  data: CoreData;
  modules: CoreModule[];
}

/** The drives package's modules, when present; loaded by path at run time. */
async function drivesModules(): Promise<ExtraModules> {
  const drivesPath = "../../core2/modules/drives";
  const healthPath = "../../core2/modules/health";
  const drives = (await import(drivesPath)) as {
    withDrives: (data: CoreData) => CoreData;
    createDrivesModule: () => CoreModule;
  };
  const health = (await import(healthPath)) as {
    createHealthModule: () => CoreModule;
  };
  return {
    data: drives.withDrives(DEFAULT_DATA),
    modules: [health.createHealthModule(), drives.createDrivesModule()],
  };
}

function run(
  input: CoreInput,
  through: string,
  watch: readonly PersonId[],
  withDirector: boolean,
  extra?: ExtraModules,
) {
  const director = createDirector({ watch });
  const before = mib();
  const started = performance.now();
  const core = createLifeCore(input, {
    observer: false,
    ...(extra ? { data: extra.data } : {}),
    modules: [
      ...(extra?.modules ?? []),
      ...(withDirector ? [director.module] : []),
    ],
  });
  if (withDirector) director.start(core);
  advanceCore(core, through);
  const seconds = (performance.now() - started) / 1000;
  return { core, director, seconds, before, after: mib() };
}

function name(core: CoreState, id: string): string {
  const person = core.people.get(id);
  return person ? `${person.givenName} ${person.familyName}` : id;
}

function lifeSummary(core: CoreState, director: Director, id: string) {
  const book = director.ledger.people.get(id)!;
  const person = core.people.get(id)!;
  const threads = [...book.threads.values()]
    .map((thread) => ({
      otherId: thread.otherId,
      name: name(core, thread.otherId),
      kin: thread.kin,
      sharedHome: thread.sharedHome,
      tie: thread.tie,
      closeness: thread.closeness,
      lastContact: thread.lastContact,
      importanceAtStart: director.importance(
        id,
        thread.otherId,
        book.watchedSince,
      ),
      importanceAtEnd: director.importance(id, thread.otherId, core.date),
      fadingAtEnd: director.fading(id, thread.otherId, core.date),
      turns: thread.turns,
      moments: thread.momentIds.length,
    }))
    .sort((a, b) => b.importanceAtEnd - a.importanceAtEnd);
  return {
    id,
    name: name(core, id),
    birthDate: person.birthDate,
    traits: person.traits,
    observedDays: book.observedDays,
    quietDays: book.quietDays,
    moments: [...book.moments].sort((a, b) => b.impact - a.impact),
    belowFloor: Object.fromEntries(book.belowFloor),
    threads,
    keptFacts: [...book.keptFacts.values()],
    backdrop: book.backdrop,
  };
}

async function main() {
  const options = parse(process.argv.slice(2));
  const extra = options.withDrives ? await drivesModules() : undefined;
  const raw = JSON.parse(readFileSync(options.input, "utf8")) as CoreInput;
  const input: CoreInput = { ...raw, finance: createOpeningFinance(raw) };
  const watch = [
    ...new Set([
      ...(input.playerId ? [input.playerId] : []),
      ...options.watch,
      ...(options.watchAll ? input.people.map((row) => row.id) : []),
      ...(options.cohortEmployerOf
        ? employerCohort(input, options.cohortEmployerOf)
        : []),
    ]),
  ];
  if (options.timingOnly) {
    const timed = run(
      input,
      options.through,
      watch,
      options.timingOnly === "director",
      extra,
    );
    process.stdout.write(
      `${JSON.stringify({ mode: options.timingOnly, watched: watch.length, seconds: timed.seconds, heapDeltaMiB: timed.after.heapMiB - timed.before.heapMiB, rssMiB: timed.after.rssMiB })}\n`,
    );
    return;
  }
  const result = run(input, options.through, watch, true, extra);
  const detailed = [
    ...new Set([...(input.playerId ? [input.playerId] : []), ...options.watch]),
  ];
  const broad = [...result.director.ledger.broadEvents.values()].map((row) => ({
    ...row,
    reachedCount: row.reached.length,
    byReach: row.reached.reduce<Record<string, number>>((sum, entry) => {
      sum[entry.reach] = (sum[entry.reach] ?? 0) + 1;
      return sum;
    }, {}),
    personalMoments: [...result.director.ledger.people.values()]
      .flatMap((book) => book.moments)
      .filter((moment) => moment.broadEventId === row.eventId)
      .map((moment) => ({
        personId: moment.personId,
        impact: moment.impact,
        label: moment.label,
        traitWeights: moment.channels.map((part) => part.traitWeight),
      })),
  }));
  const books = [...result.director.ledger.people.values()];
  const labels: Record<string, number> = {};
  const reasons: Record<string, number> = {};
  for (const book of books)
    for (const moment of book.moments) {
      labels[moment.label] = (labels[moment.label] ?? 0) + 1;
      for (const echo of moment.echoes)
        reasons[echo.reason] = (reasons[echo.reason] ?? 0) + 1;
    }
  const cohort = {
    people: books.length,
    peopleWithMoments: books.filter((book) => book.moments.length).length,
    moments: books.reduce((sum, book) => sum + book.moments.length, 0),
    labels,
    echoReasons: reasons,
    echoes: books
      .flatMap((book) => book.moments)
      .filter((moment) => moment.echoes.length)
      .slice(0, 50),
    renewedTurns: books.reduce(
      (sum, book) =>
        sum +
        [...book.threads.values()].reduce(
          (count, thread) =>
            count +
            thread.turns.filter((turn) => turn.turn === "renewed").length,
          0,
        ),
      0,
    ),
  };
  const receipt = {
    cohort,
    schema: "p13-director-year-v1",
    seed: input.seed,
    place: input.placeMetadata?.placeName,
    startedAt: input.startedAt,
    through: options.through,
    withDrives: options.withDrives,
    watchedCount: watch.length,
    seconds: result.seconds,
    memory: { before: result.before, after: result.after },
    directorStopgapHits: [...result.director.ledger.stopgapHits].sort(),
    openDirectorStopgaps: openDirectorStopgapCount(),
    lives: detailed.map((id) => lifeSummary(result.core, result.director, id)),
    broadEvents: broad,
  };
  if (options.output)
    writeFileSync(options.output, `${JSON.stringify(receipt, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({ seconds: result.seconds, watched: watch.length, broad: broad.length, lives: receipt.lives.map((life) => ({ name: life.name, moments: life.moments.length, quiet: life.quietDays, belowFloor: life.belowFloor })) }, null, 2)}\n`,
  );
}

await main();
