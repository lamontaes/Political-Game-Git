/**
 * One place of the all-places run (scripts/core2-year/all-places.mjs): the
 * played world (`buildBenchWorld`, every module) through the dev clock, one
 * year at a time, with four checks at each year's end. A crash is reported
 * with its full stack and the game date it happened on.
 */
import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import v8 from "node:v8";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState } from "../../src/core2/types";

export interface PlaceJob {
  /** The world seed `buildBenchWorld` takes. */
  seed: string;
  /** A locality key, or null to let the seed draw the place. */
  placeKey: string | null;
  years: number;
}

interface Row {
  [key: string]: unknown;
}

/** How long a seat may stand empty with no filling rule acting on it. */
const VACANCY_GRACE_DAYS = 120;
const OFFICES = "core2-offices-v1";
const ELECTIONS = "core2-elections-v1";
const OFFICIALS = "core2-officials-v1";

const rows = (core: CoreState, module: string, name: string): Row[] =>
  core.modules.has(module)
    ? (coreAPI(core).moduleState(module).table(name).rows() as Row[])
    : [];

const cash = (core: CoreState) => {
  let total = 0;
  for (const row of core.people.values()) total += row.liquidMinor;
  for (const row of core.organizations.values()) total += row.liquidMinor;
  return total;
};

const outsideNet = (core: CoreState) => {
  let net = 0;
  for (const row of core.cashJournal.externalFlowsByOwner.values())
    net += row.netMinor;
  return net;
};

const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5,
  );

/** Seats emptied during the run and empty past the grace with nothing filling them: the offices engine's vacancies and the officials roster. */
function unfilledSeats(core: CoreState, since: string): string[] {
  const out: string[] = [];
  for (const row of rows(core, OFFICES, "vacancies")) {
    if (row.status === "filled") continue;
    if (
      row.status === "awaiting-election" &&
      typeof row.electionDate === "string" &&
      row.electionDate >= core.date
    )
      continue;
    const days = daysBetween(row.since as string, core.date);
    if (days > VACANCY_GRACE_DAYS)
      out.push(
        `${row.seatId} ${row.status} since ${row.since} (${row.rule && (row.rule as Row).method})`,
      );
  }
  const bySeat = new Map<string, Row[]>();
  for (const row of rows(core, OFFICIALS, "officials")) {
    const list = bySeat.get(row.seatId as string) ?? [];
    list.push(row);
    bySeat.set(row.seatId as string, list);
  }
  for (const [seatId, list] of bySeat) {
    if (list.some((row) => row.ended === null || row.ended === undefined))
      continue;
    // A nominee the confirming bodies passed over was never seated: no seat emptied.
    if (list.every((row) => row.seated === false)) continue;
    const last = list
      .map((row) => row.ended as string)
      .sort()
      .at(-1)!;
    // A seat emptied before the world opened is history (a past cabinet).
    if (last <= since) continue;
    if (daysBetween(last, core.date) > VACANCY_GRACE_DAYS)
      out.push(`${seatId} roster empty since ${last}`);
  }
  return out;
}

/**
 * The town's elected state and federal seats whose term ends after an even year's
 * Election Day (by the next March) with no contest for that seat dated that
 * year; where a term's end isn't read, the office's own cycle says the year.
 */
function missingContests(
  core: CoreState,
  year: number,
  due: { count: number },
): string[] {
  const offices = new Map(
    rows(core, OFFICES, "offices").map((row) => [row.id as string, row]),
  );
  const contests = new Set(
    rows(core, ELECTIONS, "contests").map(
      (row) => `${row.seatId}@${(row.electionDate as string).slice(0, 4)}`,
    ),
  );
  // Every term, serving or since ended: an election that has already been
  // held leaves the term it closed behind as an ended row.
  const ends = new Map<string, string[]>();
  for (const row of rows(core, OFFICES, "terms"))
    if (typeof row.endDate === "string")
      ends.set(row.seatId as string, [
        ...(ends.get(row.seatId as string) ?? []),
        row.endDate,
      ]);
  const out: string[] = [];
  for (const seat of rows(core, OFFICES, "seats")) {
    const office = offices.get(seat.officeId as string);
    if (
      !office?.elected ||
      !seat.coversTown ||
      !["state", "federal"].includes(office.level as string)
    )
      continue;
    const seatEnds = ends.get(seat.id as string);
    const isDue = seatEnds?.length
      ? seatEnds.some(
          (end) => end > `${year}-11-01` && end <= `${year + 1}-03-01`,
        )
      : typeof office.nextElectionYear === "number" &&
        typeof office.termYears === "number" &&
        Math.abs(year - office.nextElectionYear) % office.termYears === 0;
    if (isDue) due.count += 1;
    if (isDue && !contests.has(`${seat.id}@${year}`))
      out.push(
        `${seat.id} (${seatEnds?.length ? "term ends after the election" : "by the office's cycle"})`,
      );
  }
  return out;
}

/** True when nothing failed; otherwise the first failures. */
const passOr = (failures: readonly string[]) =>
  failures.length === 0 ? true : failures.slice(0, 10);

function run(job: PlaceJob) {
  setBookkeeping(false);
  const built = performance.now();
  const world = buildBenchWorld(job.seed, gameStartDate(), {
    twoLevel: true,
    ...(job.placeKey ? { placeKey: job.placeKey } : {}),
  });
  const core = world.core;
  const result: Row = {
    place: world.place.displayName,
    placeKey: world.placeId,
    localityKey: job.placeKey,
    seed: job.seed,
    people: core.people.size,
    buildSeconds: +((performance.now() - built) / 1000).toFixed(1),
    years: [] as Row[],
  };
  // A raise reaching a job that has ended is counted before it throws.
  const api = coreAPI(core);
  const rerated: string[] = [];
  const rerate = api.rerateJob?.bind(api);
  if (rerate)
    api.rerateJob = ((jobId: string, ...rest: unknown[]) => {
      const row = core.jobs.get(jobId);
      if (row?.endsAt !== undefined && row.endsAt <= core.date)
        rerated.push(`${jobId} ended ${row.endsAt}, re-rated ${core.date}`);
      return (rerate as (...args: unknown[]) => unknown)(jobId, ...rest);
    }) as typeof api.rerateJob;
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  const opened = core.date;
  const openingCash = cash(core);
  const openingOutside = outsideNet(core);
  try {
    for (let y = 1; y <= job.years; y++) {
      const started = performance.now();
      const startYear = Number(core.date.slice(0, 4));
      dev.advance(addDays(makeIsoDate(core.date), 365));
      const balanceGapMinor =
        openingCash - (outsideNet(core) - openingOutside) - cash(core);
      const evenYears = [startYear, startYear + 1].filter(
        (year) => year % 2 === 0 && `${year}-12-31` <= core.date,
      );
      const due = { count: 0 };
      const missing = evenYears.flatMap((year) =>
        missingContests(core, year, due),
      );
      (result.years as Row[]).push({
        year: y,
        through: core.date,
        seconds: +((performance.now() - started) / 1000).toFixed(1),
        heapGB: +(v8.getHeapStatistics().used_heap_size / 1e9).toFixed(2),
        people: core.people.size,
        ballotSeatsChecked: due.count,
        checks: {
          moneyBalances:
            balanceGapMinor === 0 ? true : `off by ${balanceGapMinor} cents`,
          noEndedJobRerated: passOr(rerated),
          seatsFilled: passOr(unfilledSeats(core, opened)),
          contestsOnBallot: passOr(missing),
        },
      });
      parentPort?.postMessage({
        progress: `${result.place}: year ${y} ${(result.years as Row[]).at(-1)!.seconds} s`,
      });
    }
  } catch (error) {
    const e = error as Error;
    result.crash = { date: core.date, message: e.message, stack: e.stack };
    if (rerated.length) result.rerated = rerated.slice(0, 5);
  }
  return result;
}

parentPort?.postMessage({ result: run(workerData as PlaceJob) });
