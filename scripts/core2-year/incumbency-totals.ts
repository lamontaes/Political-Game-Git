/**
 * Local re-election totals in played worlds (campaign-incumbency-calibrated):
 * for every contest the town's local levels decide during the run, read from
 * the election records (the contest, its filings, its result and the seat's
 * holder the day before the vote) whether the seat had a holder, the holder
 * ran, the race was contested, the holder won, and whether a newcomer who won
 * beat a running holder; in contested two-way races, the holder's share.
 * Measurement tooling: the world is the bench's two-level town with every
 * module (`buildBenchWorld`), advanced day by day with bookkeeping off, as
 * play runs it.
 *
 *   node --import tsx scripts/core2-year/incumbency-totals.ts --seed <s> \
 *     [--places 1] [--years 2] [--ablation both|no-trait|no-standing|neither]
 *
 * Places are drawn from all 56 by the salts `<seed>:0` to `<seed>:<N-1>`.
 * `--ablation` keeps both incumbency terms (`both`, as play has them), zeroes
 * the voter-trait term (`no-trait`), the bare incumbency in standing
 * (`no-standing`) or both (`neither`), through the measurement-only knobs in
 * src/core2/incumbency-ablation.ts. Prints one JSON line per place and a
 * final totals line against the research bands
 * (docs/research/local-incumbency-2026-10-30.md): T1 run rate, T2 running
 * holders who win, T3 the same in contested races, T4 running holders
 * unopposed, T6 newly seated members who beat a running holder, and the
 * median holder share in contested two-way races, each with its count.
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
  type ResultRow,
} from "../../src/core2/modules/voting";
import { coreAPI } from "../../src/core2/state";
import type { CoreAPI, CoreState } from "../../src/core2/types";
import { drawPlace } from "./place";

const USAGE =
  "usage: node --import tsx scripts/core2-year/incumbency-totals.ts --seed <s> [--places 1] [--years 2] [--ablation both|no-trait|no-standing|neither]";
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

/** Who a contest's primary put out, from its public record (empty where it held none). */
function primaryOut(core: CoreState, contestId: string): readonly string[] {
  const id = `primary-result:${contestId}`;
  const row = core.durableLog.get(id) as
    { facts?: Record<string, string> } | undefined;
  const out = row?.facts?.outIds;
  return out ? (JSON.parse(out) as string[]) : [];
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

/** Reads one decided contest from its records into the level's counts. */
function readContest(
  api: CoreAPI,
  core: CoreState,
  watched: Watched,
  result: ResultRow,
  counts: LevelCounts,
): void {
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
  const lostPrimary =
    !!holderFiling &&
    holderFiling.status === "withdrawn" &&
    primaryOut(core, contest.id).some((id) => isHolder(holder!, id));
  if (holderFiling?.status === "withdrawn" && !lostPrimary)
    counts.holderWithdrew += 1;
  const holderRan = holderOnBallot || lostPrimary;
  const contested = onBallot.length >= 2;
  if (contested) counts.contested += 1;
  const holderWon =
    !!holder &&
    holderRan &&
    (isHolder(holder, winner) || isHolder(holder, result.winnerCandidateId));
  if (holderRan) {
    counts.holderRan += 1;
    if (lostPrimary) counts.holderLostPrimary += 1;
    // A primary is a contested race the holder ran in.
    if (contested || lostPrimary) counts.holderRanContested += 1;
    else counts.holderUnopposed += 1;
    if (holderWon) {
      counts.holderWon += 1;
      if (contested) counts.holderWonContested += 1;
    }
  }
  if (winner && !holderWon && !(holder && isHolder(holder, winner))) {
    counts.newlySeated += 1;
    if (holderRan) counts.newBeatHolder += 1;
  }
  if (holderOnBallot && onBallot.length === 2) {
    const ids = onBallot.map((f) => f.personId);
    const both = ids.reduce((n, id) => n + (result.totals[id] ?? 0), 0);
    if (both > 0)
      counts.holderShares.push(
        (result.totals[holderFiling!.personId] ?? 0) / both,
      );
  }
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
        readContest(api, core, entry, result, levelOf(entry.contest.level));
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
    }),
  );
  return { byLevel, runSeconds, buildSeconds, peakHeap };
}

const started = performance.now();
const all = emptyCounts();
const allLevels = new Map<string, LevelCounts>();
let peakHeap = 0;
let runSeconds = 0;
for (let i = 0; i < placeCount; i += 1) {
  const place = runPlace(i);
  for (const [level, counts] of place.byLevel) {
    addInto(all, counts);
    const into = allLevels.get(level) ?? emptyCounts();
    addInto(into, counts);
    allLevels.set(level, into);
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
    contests: all.contests,
    T1_holdersWhoRan: {
      value: share(all.holderRan, all.withHolder),
      n: all.withHolder,
      band: "58-78%",
    },
    T2_runningHoldersWhoWin: {
      value: share(all.holderWon, all.holderRan),
      n: all.holderRan,
      band: "80-90% (fail above 92% outside counties)",
    },
    T3_contestedWinRate: {
      value: share(all.holderWonContested, all.holderRanContested),
      n: all.holderRanContested,
      band: "66-78% (fail above 80%)",
    },
    T4_runningHoldersUnopposed: {
      value: share(all.holderUnopposed, all.holderRan),
      n: all.holderRan,
      band: "35-67%",
    },
    T6_newcomersWhoBeatAHolder: {
      value: share(all.newBeatHolder, all.newlySeated),
      n: all.newlySeated,
      band: "18-30% (fail below 15%)",
    },
    holderShareTwoWayMedian: {
      value:
        all.holderShares.length > 0
          ? Number(median(all.holderShares)!.toFixed(3))
          : null,
      n: all.holderShares.length,
      note: "descriptive: about 0.58 median in competitive local races; A2 advantage +5 to +12 points against a comparable challenger",
    },
    holderLostPrimary: all.holderLostPrimary,
    holderWithdrew: all.holderWithdrew,
    noCandidates: all.noCandidates,
    noResult: all.noResult,
    levels: Object.fromEntries(
      [...allLevels].map(([level, c]) => [level, c.contests]),
    ),
    runSeconds: Number(runSeconds.toFixed(1)),
    seconds: secondsSince(started),
    peakHeapMiB: mib(peakHeap),
  }),
);
