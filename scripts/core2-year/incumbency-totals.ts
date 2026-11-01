/**
 * Local re-election totals in played worlds (campaign-incumbency-calibrated):
 * for every contest the town's local levels decide during the run, read from
 * the election records (the contest, its filings, its primary's record, its
 * result and the seat's holder the day before the vote) whether the seat had
 * a holder, the holder ran, the race was contested for the holder (two or
 * more names on the general ballot, or a rival in the holder's primary), the
 * holder won, and whether a newcomer who won beat a running holder; in
 * contested races, the holder's share of the general vote.
 * Measurement tooling: the world is the bench's two-level town with every
 * module (`buildBenchWorld`), advanced day by day with bookkeeping off, as
 * play runs it.
 *
 *   node --import tsx scripts/core2-year/incumbency-totals.ts --seed <s> \
 *     [--places 1] [--years 2] [--ablation both|no-trait|no-standing|neither]
 *     [--contests]
 *
 * Places are drawn from all 56 by the salts `<seed>:0` to `<seed>:<N-1>`.
 * `--ablation` keeps both incumbency terms (`both`, as play has them), zeroes
 * the voter-trait term (`no-trait`), the bare incumbency in standing
 * (`no-standing`) or both (`neither`), through the measurement-only knobs in
 * src/core2/incumbency-ablation.ts. `neither` is not "no incumbency": the
 * holder's record term and the recognition every adult in an office's public
 * gets from its serving official stay in every version.
 *
 * Prints one JSON line per place and a final totals line against the
 * research bands (docs/research/local-incumbency-2026-10-30.md), pooled and
 * per level group (counties; cities and townships), since the research gives
 * counties their own bands: T1 run rate, T2 running holders who win, T3 the
 * same in contested races, T4 running holders unopposed, T6 newly seated
 * members who beat a running holder, and the median holder share in
 * contested two-way general races, each with its count. T2 = u + (1 - u) x T3
 * holds by construction, with u = T4. `--contests` also prints one JSON line
 * per contest as it is read, keyed by contest id, so two ablation versions
 * can be compared race by race.
 *
 * A place whose local offices are seated at the state level (D.C.'s council,
 * offices-local.ts) has no local contests and measures nothing; its line says
 * so.
 */
import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { setIncumbencyAblationForMeasurement } from "../../src/core2/incumbency-ablation";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../../src/core2/modules/elections";
import type { TermRow } from "../../src/core2/modules/offices";
import {
  officialCandidateId,
  seatHolder,
  VOTING_MODULE_ID,
  winningPersonId,
  type ResultRow,
} from "../../src/core2/modules/voting";
import { coreAPI } from "../../src/core2/state";
import type { CoreAPI, CoreState } from "../../src/core2/types";
import { drawPlace } from "./place";

const USAGE =
  "usage: node --import tsx scripts/core2-year/incumbency-totals.ts --seed <s> [--places 1] [--years 2] [--ablation both|no-trait|no-standing|neither] [--contests]";
const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
if (args.includes("--help")) {
  console.log(USAGE);
  process.exit(0);
}
const seed = option("seed", randomBytes(8).toString("hex"));
const placeCount = Number(option("places", "1"));
const years = Number(option("years", "2"));
const ablation = option("ablation", "both");
const printContests = args.includes("--contests");
const KNOBS: Record<string, { trait: boolean; standing: boolean }> = {
  both: { trait: false, standing: false },
  "no-trait": { trait: true, standing: false },
  "no-standing": { trait: false, standing: true },
  neither: { trait: true, standing: true },
};
if (
  !KNOBS[ablation] ||
  !(placeCount >= 1) ||
  !(years > 0) ||
  !Number.isInteger(placeCount)
) {
  console.error(USAGE);
  process.exit(2);
}
// Zeroes the chosen terms for the whole process, before any world is built.
setIncumbencyAblationForMeasurement(KNOBS[ablation]!);
setBookkeeping(false);

/** The levels above the town's own: everything else a contest carries is local. */
const NOT_LOCAL = new Set(["state", "federal"]);
/** How many days ahead the seat's holder is read, so the last read is the day before the vote. */
const LOOKAHEAD_DAYS = 3;
/** Days after election day a contest may wait for its result before it is counted as none. */
const RESULT_WAIT_DAYS = 30;

interface LevelCounts {
  contests: number;
  withHolder: number;
  holderRan: number;
  holderWithdrew: number;
  holderLostPrimary: number;
  holderPrimaryRival: number;
  holderWon: number;
  contested: number;
  holderRanContested: number;
  holderWonContested: number;
  holderUnopposed: number;
  newlySeated: number;
  newBeatHolder: number;
  noCandidates: number;
  noResult: number;
  holderShares: number[];
}

const emptyCounts = (): LevelCounts => ({
  contests: 0,
  withHolder: 0,
  holderRan: 0,
  holderWithdrew: 0,
  holderLostPrimary: 0,
  holderPrimaryRival: 0,
  holderWon: 0,
  contested: 0,
  holderRanContested: 0,
  holderWonContested: 0,
  holderUnopposed: 0,
  newlySeated: 0,
  newBeatHolder: 0,
  noCandidates: 0,
  noResult: 0,
  holderShares: [],
});

const NUMERIC_KEYS = Object.keys(emptyCounts()).filter(
  (k) => k !== "holderShares",
) as Exclude<keyof LevelCounts, "holderShares">[];

function addInto(into: LevelCounts, from: LevelCounts): void {
  for (const key of NUMERIC_KEYS) into[key] += from[key];
  into.holderShares.push(...from.holderShares);
}

/** The seat's holder as the contest knew it the day before the vote. */
interface Watched {
  readonly contest: ContestRow;
  holder: { termId: string; personId: string | null } | null;
}

/** Whether a candidate id is the holder: the person, or the named official not yet filled in. */
function isHolder(
  holder: NonNullable<Watched["holder"]>,
  candidateId: string | null | undefined,
): boolean {
  return (
    !!candidateId &&
    (candidateId === holder.personId ||
      candidateId === officialCandidateId(holder.termId))
  );
}

/**
 * A contest's primary from its public record: its method and who it put out
 * (no method and no one out where it held none).
 */
function primaryRecord(
  core: CoreState,
  contestId: string,
): { method: string | null; outIds: ReadonlySet<string> } {
  const row = core.durableLog.get(`primary-result:${contestId}`) as
    { facts?: Record<string, string> } | undefined;
  const out = row?.facts?.outIds;
  return {
    method: row?.facts?.method ?? null,
    outIds: new Set(out ? (JSON.parse(out) as string[]) : []),
  };
}

const median = (xs: readonly number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const share = (num: number, den: number) =>
  den ? Number((num / den).toFixed(3)) : null;
const mib = (bytes: number) => Math.round(bytes / 1048576);
const secondsSince = (t: number) =>
  Number(((performance.now() - t) / 1000).toFixed(1));

/** One decided contest as its records read: the `--contests` line. */
interface ContestLine {
  readonly contest: true;
  readonly placeKey: string;
  readonly id: string;
  readonly level: string;
  readonly electionDate: string;
  readonly holderTermId: string | null;
  readonly holderPersonId: string | null;
  readonly ran: boolean;
  readonly withdrew: boolean;
  readonly lostPrimary: boolean;
  readonly primaryRival: boolean;
  readonly onBallot: number;
  readonly contested: boolean;
  readonly contestedForHolder: boolean;
  readonly holderWon: boolean;
  readonly winnerId: string | null;
  readonly newcomerBeatHolder: boolean;
  /** The holder's share of the general vote where it was contested; null elsewhere. */
  readonly holderShare: number | null;
  readonly twoWay: boolean;
}

/** Reads one decided contest from its records into the level's counts. */
function readContest(
  api: CoreAPI,
  core: CoreState,
  placeKey: string,
  watched: Watched,
  result: ResultRow,
  counts: LevelCounts,
): ContestLine {
  const { contest, holder } = watched;
  counts.contests += 1;
  const filings = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byContest", [contest.id]) as unknown as FilingRow[];
  const onBallot = filings.filter((f) => f.status === "on-ballot");
  const winner = result.winnerId ?? null;
  if (!onBallot.length) counts.noCandidates += 1;
  if (holder) counts.withHolder += 1;
  const holderFiling = holder
    ? filings.find((f) => isHolder(holder, f.personId))
    : undefined;
  const holderOnBallot = holderFiling?.status === "on-ballot";
  const primary = primaryRecord(core, contest.id);
  const wentOut = (f: FilingRow) =>
    primary.outIds.has(f.personId) ||
    primary.outIds.has(winningPersonId(api, f.personId));
  const lostPrimary =
    !!holderFiling &&
    holderFiling.status === "withdrawn" &&
    wentOut(holderFiling);
  // A rival the primary put out from the holder's own field: the holder's
  // party in a party primary, everyone in a top-two or top-four primary.
  const openField = /^top-/.test(primary.method ?? "");
  const primaryRival =
    !!holderFiling &&
    filings.some(
      (f) =>
        f !== holderFiling &&
        wentOut(f) &&
        (openField || (!!f.party && f.party === holderFiling.party)),
    );
  const withdrew = holderFiling?.status === "withdrawn" && !lostPrimary;
  if (withdrew) counts.holderWithdrew += 1;
  const holderRan = holderOnBallot || lostPrimary;
  const contested = onBallot.length >= 2;
  if (contested) counts.contested += 1;
  // Contested for the holder: a rival on the general ballot, or one in the
  // holder's primary whether the holder beat them or lost to them.
  const contestedForHolder = contested || lostPrimary || primaryRival;
  const holderWon =
    !!holder &&
    holderRan &&
    (isHolder(holder, winner) || isHolder(holder, result.winnerCandidateId));
  if (holderRan) {
    counts.holderRan += 1;
    if (lostPrimary) counts.holderLostPrimary += 1;
    if (primaryRival) counts.holderPrimaryRival += 1;
    if (contestedForHolder) counts.holderRanContested += 1;
    else counts.holderUnopposed += 1;
    if (holderWon) {
      counts.holderWon += 1;
      if (contestedForHolder) counts.holderWonContested += 1;
    }
  }
  const newcomer =
    !!winner && !holderWon && !(holder && isHolder(holder, winner));
  if (newcomer) {
    counts.newlySeated += 1;
    if (holderRan) counts.newBeatHolder += 1;
  }
  // The holder's share is the general election's alone; the median the
  // totals report counts two-way races only.
  let holderShare: number | null = null;
  if (holderOnBallot && contested) {
    const all = onBallot.reduce(
      (n, f) => n + (result.totals[f.personId] ?? 0),
      0,
    );
    if (all > 0) {
      holderShare = (result.totals[holderFiling!.personId] ?? 0) / all;
      if (onBallot.length === 2) counts.holderShares.push(holderShare);
    }
  }
  return {
    contest: true,
    placeKey,
    id: contest.id,
    level: contest.level,
    electionDate: contest.electionDate,
    holderTermId: holder?.termId ?? null,
    holderPersonId: holder?.personId ?? null,
    ran: holderRan,
    withdrew,
    lostPrimary,
    primaryRival,
    onBallot: onBallot.length,
    contested,
    contestedForHolder,
    holderWon,
    winnerId: winner ?? result.winnerCandidateId ?? null,
    newcomerBeatHolder: newcomer && holderRan,
    holderShare: holderShare === null ? null : Number(holderShare.toFixed(3)),
    twoWay: onBallot.length === 2,
  };
}

function runPlace(index: number) {
  const salt = `${seed}:${index}`;
  const drawn = drawPlace(salt, "incumbency-totals");
  const builtAt = performance.now();
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const buildSeconds = secondsSince(builtAt);
  const core = world.core;
  const api = coreAPI(core);
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  const results = api.moduleState(VOTING_MODULE_ID).table("results");
  const watched = new Map<string, Watched>();
  const byLevel = new Map<string, LevelCounts>();
  const levelOf = (level: string) => {
    let row = byLevel.get(level);
    if (!row) byLevel.set(level, (row = emptyCounts()));
    return row;
  };
  // The holder each upcoming local contest faces, read again each day until
  // the day before the vote (a holder can leave or be appointed meanwhile).
  const lookAhead = () => {
    for (let d = 1; d <= LOOKAHEAD_DAYS; d += 1) {
      const date = addDays(makeIsoDate(core.date), d);
      for (const row of contests.query("byDate", [
        date,
      ]) as unknown as ContestRow[]) {
        if (NOT_LOCAL.has(row.level)) continue;
        const term: TermRow | undefined = seatHolder(api, row);
        const entry = watched.get(row.id) ?? { contest: row, holder: null };
        entry.holder = term
          ? { termId: term.id, personId: term.personId }
          : null;
        watched.set(row.id, entry);
      }
    }
  };
  // A contest is read once its result exists, never before.
  const readDecided = (final: boolean) => {
    for (const [id, entry] of watched) {
      if (entry.contest.electionDate > core.date) continue;
      const rows = results.query("byContest", [id]) as unknown as ResultRow[];
      const result = rows
        .filter((r) => r.date >= entry.contest.electionDate)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (result) {
        const line = readContest(
          api,
          core,
          drawn.key,
          entry,
          result,
          levelOf(entry.contest.level),
        );
        if (printContests) console.log(JSON.stringify(line));
        watched.delete(id);
      } else if (
        final ||
        addDays(makeIsoDate(entry.contest.electionDate), RESULT_WAIT_DAYS) <
          core.date
      ) {
        if (!final) levelOf(entry.contest.level).noResult += 1;
        watched.delete(id);
      }
    }
  };
  const ranAt = performance.now();
  let peakHeap = process.memoryUsage().heapUsed;
  const end = addDays(makeIsoDate(core.date), Math.round(365 * years));
  lookAhead();
  while (core.date < end) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    readDecided(false);
    lookAhead();
    peakHeap = Math.max(peakHeap, process.memoryUsage().heapUsed);
  }
  readDecided(true);
  const runSeconds = secondsSince(ranAt);
  const levels = Object.fromEntries(
    [...byLevel].map(([level, c]) => {
      const { holderShares, ...rest } = c;
      return [
        level,
        {
          ...rest,
          holderShareMedian:
            holderShares.length > 0
              ? Number(median(holderShares)!.toFixed(3))
              : null,
          twoWay: holderShares.length,
        },
      ];
    }),
  );
  console.log(
    JSON.stringify({
      place: drawn.name,
      key: drawn.key,
      state: drawn.state,
      salt,
      placeSeed: drawn.seed,
      years,
      ablation,
      through: core.date,
      buildSeconds,
      runSeconds,
      peakHeapMiB: mib(peakHeap),
      levels,
      ...(byLevel.size
        ? {}
        : {
            note: "no local contests read in the run (a place whose local offices are seated at the state level measures nothing)",
          }),
    }),
  );
  return { byLevel, runSeconds, buildSeconds, peakHeap };
}

/** The research bands (docs/research/local-incumbency-2026-10-30.md, verified totals). */
interface Bands {
  readonly T1: string;
  readonly T2: string;
  readonly T3: string;
  readonly T4: string;
  readonly T6: string;
}
const T3_BAND = "66-78% (fail above 80%)";
const T4_BAND =
  "40-67% in small and mid places, 40-80% plausible in small towns (fail above about 30% in large cities)";
const T6_BAND = "18-30% (fail below 15% or above 35%)";
const BANDS: Record<string, Bands> = {
  all: {
    T1: "58-80% all offices (fail below 50% or above 88%)",
    T2: "by group: 80-90% cities and townships, 88-94% counties",
    T3: T3_BAND,
    T4: T4_BAND,
    T6: T6_BAND,
  },
  county: {
    T1: "80-86%",
    T2: "88-94%",
    T3: T3_BAND,
    T4: T4_BAND,
    T6: T6_BAND,
  },
  "city+township": {
    T1: "59-76% councils (about 77% of eligible mayors)",
    T2: "80-90% (fail below 75%, or above 92% outside counties)",
    T3: T3_BAND,
    T4: T4_BAND,
    T6: T6_BAND,
  },
};
/** The research's level groups: counties have their own bands; councils and townships share theirs. */
const groupOf = (level: string) =>
  level === "city" || level === "township" ? "city+township" : level;

/** T1 to T6 and the two-way holder share for one pool of counts, each with its count. */
function metrics(c: LevelCounts, bands: Bands) {
  return {
    contests: c.contests,
    T1_holdersWhoRan: {
      value: share(c.holderRan, c.withHolder),
      n: c.withHolder,
      band: bands.T1,
    },
    T2_runningHoldersWhoWin: {
      value: share(c.holderWon, c.holderRan),
      n: c.holderRan,
      band: bands.T2,
    },
    T3_contestedWinRate: {
      value: share(c.holderWonContested, c.holderRanContested),
      n: c.holderRanContested,
      band: bands.T3,
    },
    T4_runningHoldersUnopposed: {
      value: share(c.holderUnopposed, c.holderRan),
      n: c.holderRan,
      band: bands.T4,
    },
    T6_newcomersWhoBeatAHolder: {
      value: share(c.newBeatHolder, c.newlySeated),
      n: c.newlySeated,
      band: bands.T6,
    },
    holderShareTwoWayMedian: {
      value:
        c.holderShares.length > 0
          ? Number(median(c.holderShares)!.toFixed(3))
          : null,
      n: c.holderShares.length,
      note: "descriptive: about 0.58 median in competitive local races; A2 advantage +5 to +12 points against a comparable challenger (fail above 12)",
    },
    holderLostPrimary: c.holderLostPrimary,
    holderPrimaryRival: c.holderPrimaryRival,
    holderWithdrew: c.holderWithdrew,
    noCandidates: c.noCandidates,
    noResult: c.noResult,
  };
}

const started = performance.now();
const all = emptyCounts();
const allLevels = new Map<string, LevelCounts>();
const groups = new Map<string, LevelCounts>();
let peakHeap = 0;
let runSeconds = 0;
for (let i = 0; i < placeCount; i += 1) {
  const place = runPlace(i);
  for (const [level, counts] of place.byLevel) {
    addInto(all, counts);
    const into = allLevels.get(level) ?? emptyCounts();
    addInto(into, counts);
    allLevels.set(level, into);
    const group = groups.get(groupOf(level)) ?? emptyCounts();
    addInto(group, counts);
    groups.set(groupOf(level), group);
  }
  peakHeap = Math.max(peakHeap, place.peakHeap);
  runSeconds += place.runSeconds;
  (globalThis as { gc?: () => void }).gc?.();
}
console.log(
  JSON.stringify({
    totals: true,
    seed,
    places: placeCount,
    years,
    ablation,
    ...metrics(all, BANDS.all!),
    groups: Object.fromEntries(
      [...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, c]) => [group, metrics(c, BANDS[group] ?? BANDS.all!)]),
    ),
    levels: Object.fromEntries(
      [...allLevels].map(([level, c]) => [level, c.contests]),
    ),
    ablationNote:
      "every version keeps the holder's record term and the recognition serving in office gives; neither zeroes only the trait term and bare standing",
    runSeconds: Number(runSeconds.toFixed(1)),
    seconds: secondsSince(started),
    peakHeapMiB: mib(peakHeap),
  }),
);
