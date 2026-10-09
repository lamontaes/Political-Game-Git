/**
 * P10 acceptance (d) proof: one generated town, one normal year, with the
 * health producer and drives module installed. Prints and writes a receipt:
 * drives formed per year by kind against the population, every response
 * decision count, one complete event → drive → acts chain with reasons, and
 * pairs of people who met the same event and decided differently.
 * Developer tooling only; run in a cloud environment, never on the owner's Mac.
 */
import { writeFileSync } from "node:fs";
import { addDays, isoDateFromParts, makeIsoDate } from "../../simulation/dates";
import { enrichCivicInputs } from "../civic-inputs";
import { DEFAULT_DATA } from "../data";
import { buildDeepPast } from "../deep-past";
import { advanceCore, createLifeCore } from "../life";
import {
  createDrivesModule,
  drivesReport,
  withDrives,
} from "../modules/drives";
import { createHealthModule, healthReport } from "../modules/health";
import { P } from "../parameters";
import { buildPopulation } from "../population";
import type { CoreInput, CoreState } from "../types";

const zero = P.zero;
const one = P.one;

function args(argv: readonly string[]) {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= zero ? argv[index + one] : undefined;
  };
  return {
    seed: value("--seed") ?? "p10-drives-proof-2026-10-09",
    startedAt: value("--started-at") ?? "2021-01-01",
    days: Number(value("--days") ?? P.yearSpanDays),
    people: Number(value("--people") ?? P.targetPopulation),
    output: value("--output"),
    baseline: argv.includes("--baseline"),
  };
}

function memoryMiB() {
  return process.memoryUsage().rss / P.bytesPerMiB;
}

function run(input: CoreInput, through: string, withModules: boolean) {
  const started = performance.now();
  const core = createLifeCore(input, {
    observer: false,
    ...(withModules
      ? {
          data: withDrives(DEFAULT_DATA),
          modules: [createHealthModule(), createDrivesModule()],
        }
      : {}),
  });
  const monthly: { month: string; seconds: number; rssMiB: number }[] = [];
  let cursor = makeIsoDate(input.startedAt);
  const end = makeIsoDate(through);
  while (cursor < end) {
    const month = Number(cursor.slice(5, 7));
    const year = Number(cursor.slice(0, 4));
    const stop =
      month === 12
        ? isoDateFromParts(year + 1, 1, 1)
        : isoDateFromParts(year, month + 1, 1);
    const target = stop < end ? stop : end;
    advanceCore(core, target);
    monthly.push({
      month: cursor.slice(zero, P.isoMonthCharacters),
      seconds: (performance.now() - started) / P.millisecondsPerSecond,
      rssMiB: memoryMiB(),
    });
    process.stderr.write(`${withModules ? "drives" : "base"} ${target}\n`);
    cursor = target;
  }
  return {
    core,
    seconds: (performance.now() - started) / P.millisecondsPerSecond,
    monthly,
  };
}

function personLabel(core: CoreState, id: string) {
  const person = core.people.get(id);
  return person
    ? {
        id,
        name: `${person.givenName} ${person.familyName}`,
        birthDate: person.birthDate,
        traits: person.traits,
      }
    : { id };
}

function summarize(core: CoreState, input: CoreInput) {
  const drives = drivesReport(core);
  const health = healthReport(core);
  const population = input.people.length;
  const formed = drives.formedByYearKind;
  const perThousand = Object.fromEntries(
    Object.entries(formed).map(([key, count]) => [
      key,
      (count / population) * 1000,
    ]),
  );
  // Chain: the drive with the most acts, preferring one whose acts reached an office.
  const ranked = [...drives.drives].sort(
    (left, right) =>
      Number(right.acts.some((act) => act.actionId === "approach-office")) -
        Number(left.acts.some((act) => act.actionId === "approach-office")) ||
      right.acts.length - left.acts.length ||
      left.id.localeCompare(right.id),
  );
  const chain = ranked[zero];
  const sourceCase = chain
    ? health.cases.find(
        (row) =>
          row.deathEventId === chain.sourceEventId ||
          row.onsetEventId === chain.sourceEventId,
      )
    : undefined;
  const sourceEvent = chain
    ? {
        ...chain.formations[zero]!.event,
        id: chain.sourceEventId,
        kind: chain.formations[zero]!.eventKind,
        ...(sourceCase
          ? {
              healthCase: sourceCase,
              subject: personLabel(core, sourceCase.personId),
            }
          : {}),
      }
    : undefined;
  const byEvent = new Map<string, typeof drives.decisions>();
  for (const decision of drives.decisions) {
    const rows = byEvent.get(decision.eventId) ?? [];
    rows.push(decision);
    byEvent.set(decision.eventId, rows);
  }
  const pairs = [...byEvent.values()]
    .filter(
      (rows) =>
        new Set(rows.map((row) => row.chosen.responseId)).size > one &&
        rows.some((row) => row.driveId),
    )
    .slice(zero, P.daysPerWeek)
    .map((rows) => {
      const formedRow = rows.find((row) => row.driveId)!;
      const other = rows.find(
        (row) => row.chosen.responseId !== formedRow.chosen.responseId,
      )!;
      return {
        eventId: formedRow.eventId,
        eventKind: formedRow.eventKind,
        people: [formedRow, other].map((row) => ({
          ...personLabel(core, row.personId),
          decision: row,
        })),
      };
    });
  const actsByAction: Record<string, number> = {};
  for (const drive of drives.drives)
    for (const act of drive.acts)
      actsByAction[act.actionId] = (actsByAction[act.actionId] ?? zero) + one;
  const holders = new Set(drives.drives.map((drive) => drive.personId));
  return {
    population,
    health: {
      onsets: health.onsets,
      deaths: health.deaths,
      casesWithOnsetInRun: health.cases.filter((row) => row.onsetEventId)
        .length,
    },
    drives: {
      formedByYearKind: formed,
      formedPerThousandResidents: perThousand,
      peopleHoldingDrives: holders.size,
      responsesByRule: drives.responsesByRule,
      perceivedDecisions: drives.perceived,
      actsByAction,
      groupsFounded: drives.groups.length,
    },
    chain: chain
      ? {
          person: personLabel(core, chain.personId),
          sourceEvent,
          drive: {
            id: chain.id,
            kind: chain.kind,
            topic: chain.topic,
            formedAt: chain.formedAt,
            halfLifeDays: chain.halfLifeDays,
            formations: chain.formations,
            acts: chain.acts,
            told: [...chain.told],
          },
        }
      : null,
    sameEventDifferentResponse: pairs,
  };
}

function main() {
  const options = args(process.argv.slice(one + one));
  const startedAt = makeIsoDate(options.startedAt);
  const through = addDays(startedAt, options.days);
  const buildStarted = performance.now();
  const input = enrichCivicInputs(
    buildDeepPast(
      buildPopulation({
        seed: options.seed,
        startedAt,
        minimumPeople: options.people,
      }),
    ),
  );
  const buildSeconds =
    (performance.now() - buildStarted) / P.millisecondsPerSecond;
  process.stderr.write(
    `built ${input.people.length} people at ${input.placeMetadata?.placeName} in ${buildSeconds}s\n`,
  );
  const baseline = options.baseline ? run(input, through, false) : undefined;
  const result = run(input, through, true);
  const receipt = {
    schema: "p10-drives-proof-v1",
    seed: options.seed,
    place: {
      placeName: input.placeMetadata?.placeName,
      countyNames: input.placeMetadata?.countyNames,
      placeKey: input.placeMetadata?.placeKey,
    },
    startedAt,
    through,
    buildSeconds,
    timing: {
      withDrivesSeconds: result.seconds,
      baselineSeconds: baseline?.seconds,
      ratio: baseline ? result.seconds / baseline.seconds : undefined,
      monthly: result.monthly,
      peakRssMiB: Math.max(...result.monthly.map((row) => row.rssMiB)),
    },
    stopgapHits: [...result.core.stopgapHits].sort(),
    ...summarize(result.core, input),
  };
  const text = JSON.stringify(receipt, null, P.two);
  if (options.output) writeFileSync(options.output, `${text}\n`);
  process.stdout.write(
    `${JSON.stringify({ ...receipt, chain: receipt.chain ? "see output" : null, sameEventDifferentResponse: receipt.sameEventDifferentResponse.length }, null, P.two)}\n`,
  );
}

main();
