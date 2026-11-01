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
 *     [--trait-weight <w>] [--recognition <x>] [--pledge-weight <x>]
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
 * Three value knobs set a term's size instead of zeroing it (same file):
 * `--trait-weight <w>` in place of `traitWeightVotingBackIncumbent`,
 * `--recognition <x>` in place of `incumbentRecognition` (a local race's bare
 * incumbency; `no-standing` still zeroes it) and `--pledge-weight <x>` in
 * place of `doorPledgeWeight` (the appeal's pledge term and how far a door
 * yes holds in turnout). Each left out reads the parameter, as play does;
 * every place line and the totals line print the values set (null for none).
 *
 * Prints one JSON line per place and a final totals line against the
 * research bands (docs/research/local-incumbency-2026-10-30.md), pooled and
 * per level group (counties; cities and townships), since the research gives
 * counties their own bands: T1 run rate, T2 running holders who win, T3 the
 * same in contested races, T4 running holders unopposed, T6 newly seated
 * members who beat a running holder, and the median holder share in
 * contested two-way general races, each with its count. T2 = u + (1 - u) x T3
 * holds by construction, with u = T4. The totals and each group also print
 * the quartiles of the two-way holder share and how many fall in 0.40-0.70
 * (P1), and the totals print T3 and the holder share median by office kind
 * (P6: mayor, council with township boards, county board, other). Each place
 * line prints the weighted mean and spread of the counted adults' incumbent
 * lean, before and after the trait weight, and the town center the appeal
 * nets out (P3). `--contests` also prints one JSON line per contest as it is
 * read, keyed by contest id, so two ablation versions can be compared race by
 * race; each adds the named and counted shares of its votes and the holder's
 * share among each (P10).
 *
 * A place that crashes in another engine is skipped by name: its salt, name
 * and key go to stderr before it runs (`PLACE <salt> <name> <key>`), its error
 * goes to stdout as one JSON line, and the totals line lists it under
 * "crashed" and leaves it out (its contest lines are held back until it
 * finishes, so a crashed place prints none). Never drop one silently: send
 * it to red main with the error and the salt.
 *
 * A place whose local offices are seated at the state level (D.C.'s council,
 * offices-local.ts) has no local contests and measures nothing; its line says
 * so.
 */
import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { campaignParameter } from "../../src/core2/campaign-views";
import { gameStartDate } from "../../src/core2/game-start";
import { setIncumbencyAblationForMeasurement } from "../../src/core2/incumbency-ablation";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../../src/core2/modules/elections";
import {
  OFFICES_MODULE_ID,
  type TermRow,
} from "../../src/core2/modules/offices";
import {
  electorateRoll,
  incumbentLeanOf,
  officialCandidateId,
  seatHolder,
  townIncumbentLean,
  VOTING_MODULE_ID,
  winningPersonId,
  type ResultRow,
} from "../../src/core2/modules/voting";
import { coreAPI } from "../../src/core2/state";
import {
  decisionLean,
  decisionTraitWeight,
} from "../../src/core2/trait-decisions";
import type { CoreAPI, CoreState } from "../../src/core2/types";
import { drawPlace, type DrawnPlace } from "./place";

const USAGE =
  "usage: node --import tsx scripts/core2-year/incumbency-totals.ts --seed <s> [--places 1] [--years 2] [--ablation both|no-trait|no-standing|neither] [--trait-weight <w>] [--recognition <x>] [--pledge-weight <x>] [--contests]";
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
/** A value knob: undefined when left out (play's parameter stands); a bad value ends the run. */
const valueKnob = (name: string): number | undefined => {
  const at = args.indexOf(`--${name}`);
  if (at < 0) return undefined;
  const raw = args[at + 1];
  const value = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    console.error(`--${name} needs a number of zero or more\n${USAGE}`);
    process.exit(2);
  }
  return value;
};
const traitWeight = valueKnob("trait-weight");
const recognition = valueKnob("recognition");
const pledgeWeight = valueKnob("pledge-weight");
/** The value knobs as set, for every line: null where play's parameter stands. */
const knobValues = {
  traitWeight: traitWeight ?? null,
  recognition: recognition ?? null,
  pledgeWeight: pledgeWeight ?? null,
};
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
// Zeroes the chosen terms and sets the chosen values for the whole process,
// before any world is built.
setIncumbencyAblationForMeasurement({
  ...KNOBS[ablation]!,
  traitWeight,
  recognition,
  pledgeWeight,
});
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

/**
 * The office kinds the totals split by (P6), grouped from the office's own
 * kind (offices-local.ts): the mayor; the council, with a township's board,
 * which is a town's governing body in the same level group; a county's board
 * or commission; and every other elected office (a county executive, a
 * sheriff, a clerk).
 */
function kindGroupOf(officeKind: string): string {
  if (officeKind === "mayor") return "mayor";
  if (officeKind === "council" || officeKind === "township-board")
    return "council";
  if (officeKind === "county-board") return "county-board";
  return "other";
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
/** The q-th quantile (0 to 1) by linear interpolation between the ordered values; null for none. */
const quantile = (xs: readonly number[], q: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const at = (s.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo]! + (s[hi]! - s[lo]!) * (at - lo);
};
const round3 = (x: number | null) => (x === null ? null : Number(x.toFixed(3)));
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
  /** The office's own kind and the group the totals split it into (P6). */
  readonly officeKind: string;
  readonly kind: string;
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
  /**
   * P10: the share of the on-ballot candidates' votes cast by named people,
   * by counted residents and by the wider electorate (null with no votes),
   * and the holder's share among the named and among the counted where the
   * holder's general was contested (null elsewhere).
   */
  readonly namedVotesShare: number | null;
  readonly countedVotesShare: number | null;
  readonly placeVotesShare: number | null;
  readonly holderShareNamed: number | null;
  readonly holderShareCounted: number | null;
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
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as { kind?: string } | undefined;
  const officeKind = office?.kind ?? "unknown";
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
  const votesFor = (votes: Readonly<Record<string, number>> | undefined) =>
    onBallot.reduce((n, f) => n + (votes?.[f.personId] ?? 0), 0);
  const namedAll = votesFor(result.namedVotes);
  const countedAll = votesFor(result.countedVotes);
  const placeAll = votesFor(result.placeVotes);
  const allVotes = namedAll + countedAll + placeAll;
  const among = (votes: Readonly<Record<string, number>>, of: number) =>
    holderOnBallot && contested && of > 0
      ? round3((votes[holderFiling!.personId] ?? 0) / of)
      : null;
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
    officeKind,
    kind: kindGroupOf(officeKind),
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
    holderShare: round3(holderShare),
    twoWay: onBallot.length === 2,
    namedVotesShare: allVotes > 0 ? round3(namedAll / allVotes) : null,
    countedVotesShare: allVotes > 0 ? round3(countedAll / allVotes) : null,
    placeVotesShare: allVotes > 0 ? round3(placeAll / allVotes) : null,
    holderShareNamed: among(result.namedVotes, namedAll),
    holderShareCounted: among(result.countedVotes, countedAll),
  };
}

/** One level's or office kind's counts as a place line prints them. */
function countsLine(c: LevelCounts) {
  const { holderShares, ...rest } = c;
  return {
    ...rest,
    holderShareMedian:
      holderShares.length > 0 ? round3(median(holderShares)) : null,
    twoWay: holderShares.length,
  };
}

/** What a place's measurement hands the totals. */
interface PlaceRun {
  readonly byLevel: Map<string, LevelCounts>;
  readonly byKind: Map<string, LevelCounts>;
  readonly runSeconds: number;
  readonly peakHeap: number;
  /** The three terms' values as play reads them (parameters), for the totals line. */
  readonly playValues: {
    readonly traitWeight: number;
    readonly recognition: number;
    readonly pledgeWeight: number;
  };
}

/**
 * P3: the counted adults' incumbent lean (what the trait term reads before the
 * appeal nets out the town's center), weighted by the people each record
 * stands for. `applied` is `incumbentLeanOf` (trait weight included, as the
 * appeal reads it); `raw` is the same lean before the trait weight.
 * `townCenter` is the town's mean the appeal subtracts (`townIncumbentLean`).
 */
function incumbentLeanReading(api: CoreAPI, core: CoreState) {
  const adults = electorateRoll(api).filter((r) => r.target === "group");
  let people = 0;
  const sums = { applied: 0, appliedSq: 0, raw: 0, rawSq: 0 };
  for (const voter of adults) {
    const applied = incumbentLeanOf(api, voter);
    const raw = decisionLean(
      core,
      voter,
      "voting.back-incumbent",
      "incumbent",
      "challenger",
    );
    people += voter.count;
    sums.applied += applied * voter.count;
    sums.appliedSq += applied * applied * voter.count;
    sums.raw += raw * voter.count;
    sums.rawSq += raw * raw * voter.count;
  }
  const meanSd = (sum: number, sumSq: number) => {
    const mean = people > 0 ? sum / people : 0;
    const variance = people > 0 ? Math.max(0, sumSq / people - mean * mean) : 0;
    return { mean: round3(mean), sd: round3(Math.sqrt(variance)) };
  };
  return {
    countedAdults: adults.length,
    people: Math.round(people),
    applied: meanSd(sums.applied, sums.appliedSq),
    raw: meanSd(sums.raw, sums.rawSq),
    townCenter: round3(townIncumbentLean(api)),
  };
}

function measurePlace(salt: string, drawn: DrawnPlace): PlaceRun {
  const builtAt = performance.now();
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const buildSeconds = secondsSince(builtAt);
  const core = world.core;
  const api = coreAPI(core);
  const playValues = {
    traitWeight: decisionTraitWeight(core, "voting.back-incumbent"),
    recognition: campaignParameter("incumbentRecognition"),
    pledgeWeight: campaignParameter("doorPledgeWeight"),
  };
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  const results = api.moduleState(VOTING_MODULE_ID).table("results");
  const watched = new Map<string, Watched>();
  const byLevel = new Map<string, LevelCounts>();
  const byKind = new Map<string, LevelCounts>();
  const into = (by: Map<string, LevelCounts>, key: string) => {
    let row = by.get(key);
    if (!row) by.set(key, (row = emptyCounts()));
    return row;
  };
  // Held until the place finishes, so a place that crashes prints none.
  const contestLines: string[] = [];
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
        const one = emptyCounts();
        const line = readContest(api, core, drawn.key, entry, result, one);
        addInto(into(byLevel, entry.contest.level), one);
        addInto(into(byKind, line.kind), one);
        if (printContests) contestLines.push(JSON.stringify(line));
        watched.delete(id);
      } else if (
        final ||
        addDays(makeIsoDate(entry.contest.electionDate), RESULT_WAIT_DAYS) <
          core.date
      ) {
        if (!final) into(byLevel, entry.contest.level).noResult += 1;
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
  // A failed diagnostic read shows in the line; it never costs the run.
  let incumbentLean:
    ReturnType<typeof incumbentLeanReading> | { error: string };
  try {
    incumbentLean = incumbentLeanReading(api, core);
  } catch (error) {
    incumbentLean = { error: (error as Error).message };
  }
  for (const line of contestLines) console.log(line);
  console.log(
    JSON.stringify({
      place: drawn.name,
      key: drawn.key,
      state: drawn.state,
      salt,
      placeSeed: drawn.seed,
      years,
      ablation,
      knobs: knobValues,
      through: core.date,
      buildSeconds,
      runSeconds,
      peakHeapMiB: mib(peakHeap),
      incumbentLean,
      levels: Object.fromEntries(
        [...byLevel].map(([level, c]) => [level, countsLine(c)]),
      ),
      kinds: Object.fromEntries(
        [...byKind].map(([kind, c]) => [kind, countsLine(c)]),
      ),
      ...(byLevel.size
        ? {}
        : {
            note: "no local contests read in the run (a place whose local offices are seated at the state level measures nothing)",
          }),
    }),
  );
  return { byLevel, byKind, runSeconds, peakHeap, playValues };
}

/**
 * One place, named on stderr before it runs; a crash in any engine is caught
 * here, printed as one JSON line and skipped by name (null), never dropped.
 */
function runPlace(index: number): { name: string; run: PlaceRun | null } {
  const salt = `${seed}:${index}`;
  let drawn: DrawnPlace | undefined;
  try {
    drawn = drawPlace(salt, "incumbency-totals");
    console.error(`PLACE ${salt} ${drawn.name} ${drawn.key}`);
    return { name: drawn.name, run: measurePlace(salt, drawn) };
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    const name = drawn?.name ?? `(undrawn ${salt})`;
    console.log(
      JSON.stringify({
        place: name,
        salt,
        key: drawn?.key ?? null,
        error: failure.message,
        stack: (failure.stack ?? "")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("at "))
          .slice(0, 3),
      }),
    );
    return { name, run: null };
  }
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
    // P1: how the two-way holder shares spread, and how many sit in the
    // competitive range 0.40 to 0.70 (inclusive).
    holderShareTwoWayQuartiles: {
      q1: round3(quantile(c.holderShares, 0.25)),
      q2: round3(quantile(c.holderShares, 0.5)),
      q3: round3(quantile(c.holderShares, 0.75)),
      min: round3(quantile(c.holderShares, 0)),
      max: round3(quantile(c.holderShares, 1)),
      n: c.holderShares.length,
      in040to070: c.holderShares.filter((x) => x >= 0.4 && x <= 0.7).length,
      shareIn040to070: share(
        c.holderShares.filter((x) => x >= 0.4 && x <= 0.7).length,
        c.holderShares.length,
      ),
    },
    holderLostPrimary: c.holderLostPrimary,
    holderPrimaryRival: c.holderPrimaryRival,
    holderWithdrew: c.holderWithdrew,
    noCandidates: c.noCandidates,
    noResult: c.noResult,
  };
}

/** P6: T3 and the two-way holder share median for one office kind, each with its count. */
function kindMetrics(c: LevelCounts) {
  return {
    contests: c.contests,
    holderRan: c.holderRan,
    T3_contestedWinRate: {
      value: share(c.holderWonContested, c.holderRanContested),
      n: c.holderRanContested,
    },
    holderShareTwoWayMedian: {
      value: c.holderShares.length > 0 ? round3(median(c.holderShares)) : null,
      n: c.holderShares.length,
    },
  };
}

const started = performance.now();
const all = emptyCounts();
const allLevels = new Map<string, LevelCounts>();
const groups = new Map<string, LevelCounts>();
const allKinds = new Map<string, LevelCounts>();
const crashed: string[] = [];
let playValues: PlaceRun["playValues"] | null = null;
let peakHeap = 0;
let runSeconds = 0;
for (let i = 0; i < placeCount; i += 1) {
  const { name, run: place } = runPlace(i);
  (globalThis as { gc?: () => void }).gc?.();
  if (!place) {
    crashed.push(name);
    continue;
  }
  playValues ??= place.playValues;
  for (const [level, counts] of place.byLevel) {
    addInto(all, counts);
    const into = allLevels.get(level) ?? emptyCounts();
    addInto(into, counts);
    allLevels.set(level, into);
    const group = groups.get(groupOf(level)) ?? emptyCounts();
    addInto(group, counts);
    groups.set(groupOf(level), group);
  }
  for (const [kind, counts] of place.byKind) {
    const into = allKinds.get(kind) ?? emptyCounts();
    addInto(into, counts);
    allKinds.set(kind, into);
  }
  peakHeap = Math.max(peakHeap, place.peakHeap);
  runSeconds += place.runSeconds;
}
console.log(
  JSON.stringify({
    totals: true,
    seed,
    places: placeCount,
    placesMeasured: placeCount - crashed.length,
    crashed,
    years,
    ablation,
    knobs: knobValues,
    playValues,
    ...metrics(all, BANDS.all!),
    groups: Object.fromEntries(
      [...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, c]) => [group, metrics(c, BANDS[group] ?? BANDS.all!)]),
    ),
    levels: Object.fromEntries(
      [...allLevels].map(([level, c]) => [level, c.contests]),
    ),
    kinds: Object.fromEntries(
      [...allKinds]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([kind, c]) => [kind, kindMetrics(c)]),
    ),
    kindNote:
      "mayor; council (a township board too); county-board (a county's board or commission); other (a county executive, sheriff, clerk and the like)",
    ablationNote:
      "every version keeps the holder's record term and the recognition serving in office gives; neither zeroes only the trait term and bare standing",
    runSeconds: Number(runSeconds.toFixed(1)),
    seconds: secondsSince(started),
    peakHeapMiB: mib(peakHeap),
  }),
);
