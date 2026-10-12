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
    timingOnly: value("--timing-only"),
  };
}

function memoryMiB() {
  return process.memoryUsage().rss / P.bytesPerMiB;
}

type Mode = "base" | "drives" | "health" | "drives-only";

function run(input: CoreInput, through: string, withModules: boolean | Mode) {
  const started = performance.now();
  const mode: Mode =
    withModules === true
      ? "drives"
      : withModules === false
        ? "base"
        : withModules;
  // Isolation modes for cost diagnosis: the health producer alone, or the drives module alone.
  const core = createLifeCore(input, {
    observer: false,
    ...(mode === "drives"
      ? {
          data: withDrives(DEFAULT_DATA),
          modules: [createHealthModule(), createDrivesModule()],
        }
      : mode === "health"
        ? { modules: [createHealthModule()] }
        : mode === "drives-only"
          ? { data: withDrives(DEFAULT_DATA), modules: [createDrivesModule()] }
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
  // Chain: the drive whose acts reach furthest (an office, then a meeting), then the most kinds of act.
  const reach = (drive: (typeof drives.drives)[number]) =>
    drive.acts.some((act) => act.actionId === "approach-office")
      ? 2
      : drive.acts.some((act) => act.actionId === "organize-meeting")
        ? 1
        : 0;
  const kinds = (drive: (typeof drives.drives)[number]) =>
    new Set(drive.acts.map((act) => act.actionId)).size;
  const ranked = [...drives.drives].sort(
    (left, right) =>
      reach(right) - reach(left) ||
      kinds(right) - kinds(left) ||
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
  const actsByBasis: Record<string, number> = {};
  const actsByKindAndAction: Record<string, number> = {};
  for (const drive of drives.drives)
    for (const act of drive.acts) {
      actsByAction[act.actionId] = (actsByAction[act.actionId] ?? zero) + one;
      actsByBasis[act.basis] = (actsByBasis[act.basis] ?? zero) + one;
      const key = `${drive.kind}:${act.actionId}`;
      actsByKindAndAction[key] = (actsByKindAndAction[key] ?? zero) + one;
    }
  const holders = new Set(drives.drives.map((drive) => drive.personId));
  // How close each decision came: best drive-forming urgency minus carry-on urgency.
  const margins = drives.decisions
    .map((row) => {
      const carry = row.considered.find(
        (entry) => entry.responseId === "carry-on",
      );
      const best = Math.max(
        ...row.considered
          .filter((entry) => entry.responseId !== "carry-on")
          .map((entry) => entry.urgency),
      );
      return carry ? best - carry.urgency : Number.NaN;
    })
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const quantile = (q: number) =>
    margins.length ? margins[Math.floor(q * (margins.length - 1))] : null;
  const adultDecisions = drives.decisions.filter((row) => row.agency > 0.5);
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
      actsByBasis,
      actsByKindAndAction,
      groupsFounded: drives.groups.length,
      decisionsRetained: drives.decisions.length,
      decisionsFormingDrive: drives.decisions.filter((row) => row.driveId)
        .length,
      adultDecisions: adultDecisions.length,
      adultDecisionsFormingDrive: adultDecisions.filter((row) => row.driveId)
        .length,
      driveMinusCarryOnUrgency: {
        min: quantile(0),
        p25: quantile(0.25),
        median: quantile(0.5),
        p75: quantile(0.75),
        p90: quantile(0.9),
        max: quantile(1),
      },
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
  if (options.timingOnly) {
    // Separate-process timing: one world per process, nothing else retained.
    const timed = run(input, through, options.timingOnly as Mode);
    process.stdout.write(
      `${JSON.stringify({ mode: options.timingOnly, seconds: timed.seconds, peakRssMiB: Math.max(...timed.monthly.map((row) => row.rssMiB)), place: input.placeMetadata?.placeName, seed: options.seed })}\n`,
    );
    return;
  }
  // The baseline world is dropped before the drives year so it holds no memory.
  const baseline = options.baseline
    ? (() => {
        const timed = run(input, through, false);
        return { seconds: timed.seconds, monthly: timed.monthly };
      })()
    : undefined;
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
