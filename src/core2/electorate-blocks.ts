/**
 * The simulated electorate (owner, Oct 13): everyone the world doesn't name
 * votes in counted blocks, and each block turns out and chooses from inputs
 * that change in play.
 *
 * A block is a county's 2024 presidential voters (Alaska by state house
 * district, D.C. by ward), a U.S. House district's 2024 House voters, or a
 * state legislative district's share of its state. Each block holds the seven
 * ANES party-identification groups, from strong Democrats to strong
 * Republicans, in the mix that reproduces the block's real 2024 vote: a
 * Republican county holds more strong Republicans, not Democrats who vote
 * Republican. Every group keeps its own measured party loyalty, so
 * partisanship is strong but not total: the weak partisans, leaners and pure
 * independents are the voters a candidate can win or lose.
 *
 * What moves them is each candidate's record of inputs, every one sized in
 * research terms (two-party vote share in an evenly split electorate) and
 * converted once to the groups' scale: incumbency, experience in office, a
 * public scandal, the campaign's recorded spending against the typical race,
 * the officeholder's recorded votes, the national economy since the opening
 * (unemployment and inflation, against the president's party), the midterm
 * penalty, and in the town's own county the town's jobs and crime against
 * the seat's incumbent party. Turnout follows the cycle (presidential,
 * midterm, off-cycle) and the election laws in force, with the groups that
 * vote least moving most when the cost of voting changes. A county already more partisan moves less, since
 * it holds fewer persuadable voters.
 *
 * Nothing is rolled: the same inputs always give the same votes, and every
 * block keeps its votes by group and every candidate its reasons, so the game
 * can show why a race went the way it did. With the opening's inputs a
 * presidential-year race reproduces its 2024 result block by block.
 */
import data from "./data/electorate/parameters.json" with { type: "json" };
import COUNTY_PRESIDENTIAL from "./data/county-presidential-2024.json" with { type: "json" };
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import delegates from "../../data/research/elections/house-delegates-2024.json" with { type: "json" };
import { campaignParameter } from "./campaign-views";
import type { CoreAPI } from "./types";

interface GroupRow {
  readonly id: string;
  readonly side: number;
  readonly shareOfVoters: number;
  readonly loyalty: number;
  readonly turnout: number;
}

const PARAMS = (
  data as unknown as { parameters: Record<string, { value: number }> }
).parameters;

/** One number from the electorate's parameter table. */
export function electorateParameter(key: string): number {
  const row = PARAMS[key];
  if (!row) throw new Error(`Unknown electorate parameter: ${key}`);
  return row.value;
}

export const ELECTORATE_SOURCE = (data as unknown as { about: string }).about;

const GROUP_ROWS = (data as unknown as { groups: { rows: GroupRow[] } }).groups
  .rows;
const TYPICAL_SPEND = (
  data as unknown as {
    typicalSpendPerVoteMinor: { byFamily: Record<string, number> };
  }
).typicalSpendPerVoteMinor.byFamily;

// The standard normal distribution: the spread of party identification
// within a block, and of each group's members around its own center.
function erf(x: number): number {
  // Abramowitz and Stegun 7.1.26 (error under 1.5e-7).
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}
export function normalCdf(x: number): number {
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  return 0.5 * (1 + erf(x / Math.SQRT2));
}
function normalDensity(x: number): number {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}
function normalQuantile(p: number): number {
  let lo = -10,
    hi = 10;
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Each group's center on the voting scale (its members' Republican lean),
 * set so that with nothing else in play the group votes its measured
 * loyalty; and the cut points that divide a block's spread of party
 * identification into the groups at the nation's mix.
 */
const GROUPS = (() => {
  const centers = GROUP_ROWS.map((g) =>
    g.side === 0
      ? normalQuantile(g.loyalty)
      : g.side * normalQuantile(g.loyalty),
  );
  const cuts: number[] = [];
  let cumulative = 0;
  for (const g of GROUP_ROWS.slice(0, -1)) {
    cumulative += g.shareOfVoters;
    cuts.push(normalQuantile(cumulative));
  }
  return GROUP_ROWS.map((g, i) => ({
    ...g,
    center: centers[i]!,
    lower: i === 0 ? -Infinity : cuts[i - 1]!,
    upper: i === GROUP_ROWS.length - 1 ? Infinity : cuts[i]!,
  }));
})();

/** The groups' shares of a block whose party identification centers at `mu`. */
function composition(mu: number): number[] {
  return GROUPS.map((g) => normalCdf(g.upper - mu) - normalCdf(g.lower - mu));
}

/** A block's Republican two-party share with no candidate inputs. */
function baseRightShare(mu: number, shift: number): number {
  const mix = composition(mu);
  return GROUPS.reduce(
    (sum, g, i) => sum + mix[i]! * normalCdf(g.center + shift),
    0,
  );
}

/**
 * How far one unit of appeal moves the two-party share in the nation's mix:
 * a vote-share effect from the research becomes appeal by dividing by this.
 * Two candidates' appeals differ by twice the shift a voter feels (each
 * voter weighs the gap between them on the same scale as party).
 */
const SHARE_PER_APPEAL = GROUPS.reduce(
  (sum, g) => sum + g.shareOfVoters * normalDensity(g.center),
  0,
);
export function appealOfShare(share: number): number {
  return share / SHARE_PER_APPEAL;
}

export interface Block {
  readonly id: string;
  readonly name: string;
  /** Two-party votes cast in the block in 2024. */
  readonly votes: number;
  /** The Republican two-party share the block is fit to. */
  readonly target: number;
  /** Where its party identification centers, and any shift of the whole block past the bound. */
  readonly mu: number;
  readonly shift: number;
  readonly source: string;
}

/**
 * Fit a block's center so that it votes its target share with the inputs it
 * had then: none, or the holder's incumbency (appeal `lift` toward the
 * Republican side).
 */
function fit(target: number, lift: number): { mu: number; shift: number } {
  const bound = electorateParameter("calibrationBound");
  const steps = electorateParameter("calibrationSteps");
  const solve = (f: (x: number) => number) => {
    let lo = -bound,
      hi = bound;
    for (let i = 0; i < steps; i += 1) {
      const mid = (lo + hi) / 2;
      if (f(mid) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const low = baseRightShare(-bound, lift),
    high = baseRightShare(bound, lift);
  if (target > high)
    return {
      mu: bound,
      shift: solve((s) => baseRightShare(bound, s + lift)),
    };
  if (target < low)
    return {
      mu: -bound,
      shift: solve((s) => baseRightShare(-bound, s + lift)),
    };
  return { mu: solve((m) => baseRightShare(m, lift)), shift: 0 };
}

/**
 * A block fit to its 2024 two-party vote. `holderSide` names the party whose
 * candidate carried an incumbent's standing in it then, so that the same
 * holder standing again with the opening's inputs lands on 2024.
 */
function makeBlock(
  id: string,
  name: string,
  dem: number,
  rep: number,
  source: string,
  holderSide = 0,
): Block | null {
  if (dem + rep <= 0) return null;
  const target = rep / (dem + rep);
  const lift = holderSide * appealOfShare(campaignParameter("incumbencyShare"));
  return { id, name, votes: dem + rep, target, ...fit(target, lift), source };
}

const COUNTY_ROWS = COUNTY_PRESIDENTIAL.byStateCounty as unknown as Record<
  string,
  [number, number]
>;
const COUNTY_CITATION = COUNTY_PRESIDENTIAL.citation;
const COUNTIES_BY_STATE = (() => {
  const byState = new Map<string, [string, [number, number]][]>();
  for (const [name, row] of Object.entries(COUNTY_ROWS)) {
    const usps = name.slice(0, name.indexOf("|"));
    byState.set(usps, [...(byState.get(usps) ?? []), [name, row]]);
  }
  return byState;
})();
const CAL = calibration as unknown as {
  presidentialByState: {
    stateUsps: string;
    totalsByParty: Record<string, number>;
  }[];
  house: {
    stateUsps: string;
    districtCode: string;
    districtGeoid: string;
    democraticTwoPartyShare: number | null;
    certifiedWinnerParty: string | null;
    candidateTotalsByParty: Record<string, number>;
    totalVotes: number | null;
  }[];
};
const CLERK =
  "Clerk of the U.S. House, Statistics of the Presidential and Congressional Election of November 5, 2024";
const DELEGATES = (
  delegates as unknown as {
    places: Record<
      string,
      { democraticPercent: number; republicanPercent: number }
    >;
  }
).places;

const stateBlockCache = new Map<string, readonly Block[]>();
/**
 * A state's blocks: its counties' 2024 presidential vote, or the state's
 * whole vote where no county is recorded; a territory with no presidential
 * vote is one block at its 2024 delegate race's lean, sized by the caller.
 */
export function stateBlocks(
  usps: string,
  territorySize?: number,
): readonly Block[] {
  const key = `${usps}|${territorySize ?? ""}`;
  const hit = stateBlockCache.get(key);
  if (hit) return hit;
  const blocks: Block[] = [];
  for (const [name, [dem, rep]] of COUNTIES_BY_STATE.get(usps) ?? []) {
    const block = makeBlock(
      `county:${name}`,
      name.slice(usps.length + 1),
      dem,
      rep,
      COUNTY_CITATION,
    );
    if (block) blocks.push(block);
  }
  if (!blocks.length) {
    const state = CAL.presidentialByState.find((s) => s.stateUsps === usps);
    const delegate = DELEGATES[usps];
    const block = state
      ? makeBlock(
          `state:${usps}`,
          usps,
          state.totalsByParty.democratic ?? 0,
          state.totalsByParty.republican ?? 0,
          CLERK,
        )
      : delegate && territorySize
        ? makeBlock(
            `state:${usps}`,
            usps,
            (territorySize * delegate.democraticPercent) /
              (delegate.democraticPercent + delegate.republicanPercent),
            (territorySize * delegate.republicanPercent) /
              (delegate.democraticPercent + delegate.republicanPercent),
            "2024 delegate race (data/research/elections/house-delegates-2024.json), sized from the place's electorate",
          )
        : null;
    if (block) blocks.push(block);
  }
  stateBlockCache.set(key, blocks);
  return blocks;
}

/** A state's two-party presidential votes in 2024. */
export function stateTwoPartyVotes(usps: string): number {
  let votes = stateVotesCache.get(usps);
  if (votes === undefined) {
    votes = stateBlocks(usps).reduce((sum, b) => sum + b.votes, 0);
    stateVotesCache.set(usps, votes);
  }
  return votes;
}
const stateVotesCache = new Map<string, number>();

/**
 * A U.S. House district's block: its 2024 House vote, fit with the
 * incumbency the 2024 winner carried (about nine in ten seats were won by the
 * sitting member's party; the rest stand as if they were), so that the same
 * holder standing again with the opening's inputs lands on 2024. A seat no one
 * contested in 2024 leans like its state, toward the winner by the typical
 * margin, sized as the state's average district.
 */
export function houseBlock(usps: string, code: string): Block | null {
  const key = `${usps}-${code}`;
  if (!houseCache.has(key)) houseCache.set(key, readHouseBlock(usps, code));
  return houseCache.get(key)!;
}
const houseCache = new Map<string, Block | null>();
function readHouseBlock(usps: string, code: string): Block | null {
  const row = CAL.house.find(
    (h) => h.stateUsps === usps && h.districtCode === code,
  );
  const winner = row?.certifiedWinnerParty;
  const side = /^republican/i.test(winner ?? "")
    ? 1
    : /^democrat/i.test(winner ?? "")
      ? -1
      : 0;
  const dem = row?.candidateTotalsByParty.democratic ?? 0;
  const rep = row?.candidateTotalsByParty.republican ?? 0;
  if (row && dem > 0 && rep > 0)
    return makeBlock(
      `district:${row.districtGeoid}`,
      `${usps}-${code}`,
      dem,
      rep,
      CLERK,
      side,
    );
  const districts = CAL.house.filter((h) => h.stateUsps === usps).length || 1;
  const votes = stateTwoPartyVotes(usps) / districts;
  if (!votes) return null;
  const share = 0.5 + side * campaignParameter("legislativeSeatMargin");
  return makeBlock(
    `district:${row?.districtGeoid ?? `${usps}${code}`}`,
    `${usps}-${code}`,
    votes * (1 - share),
    votes * share,
    `${CLERK} (uncontested in 2024: the holder's party at the typical margin)`,
    side,
  );
}

/** A U.S. House district's block by its district identity (GEOID). */
export function houseBlockByGeoid(
  usps: string,
  geoid: string | null,
): Block | null {
  const row = geoid
    ? CAL.house.find((h) => h.districtGeoid === geoid)
    : undefined;
  if (row) return houseBlock(row.stateUsps, row.districtCode);
  // An at-large seat: the state's one district.
  const only = CAL.house.filter((h) => h.stateUsps === usps);
  return only.length === 1 ? houseBlock(usps, only[0]!.districtCode) : null;
}

/** A state's whole Republican two-party share in 2024. */
export function stateRightShare(usps: string): number | null {
  const blocks = stateBlocks(usps);
  const votes = blocks.reduce((s, b) => s + b.votes, 0);
  return votes
    ? blocks.reduce((s, b) => s + b.votes * b.target, 0) / votes
    : null;
}

/**
 * A state legislative district's block: the state's two-party vote over its
 * districts, leaning like the town's own county where the town votes in it,
 * else toward its holder's party at the typical margin (no district results
 * are read: SG-GOV-world-race-lean), fit with the holder's incumbency.
 */
export function legislativeBlock(
  usps: string,
  seatKey: string,
  districts: number,
  holderSide: number,
  ownLean: number | null,
): Block | null {
  const votes = stateTwoPartyVotes(usps) / Math.max(1, districts);
  if (!votes) return null;
  const share =
    ownLean ?? 0.5 + holderSide * campaignParameter("legislativeSeatMargin");
  return makeBlock(
    `legislative:${seatKey}`,
    seatKey,
    votes * (1 - share),
    votes * share,
    ownLean === null
      ? `${CLERK} (state two-party vote over its districts; the holder's party at the typical margin)`
      : `${CLERK} (state two-party vote over its districts; the town's county's 2024 lean)`,
    holderSide,
  );
}

/** The county block a place's counties fall in, from its recorded county names. */
export function countyBlockIdOf(
  countyNames: string | undefined,
  usps: string,
): string | null {
  if (!countyNames) return null;
  const stateName = countyNames.split(", ").at(-1)!;
  for (const name of countyNames
    .slice(0, countyNames.length - stateName.length)
    .split(/;\s*|,\s*/)
    .map((part) => part.trim())
    .filter(Boolean))
    if (COUNTY_ROWS[`${usps}|${name}`]) return `county:${usps}|${name}`;
  return null;
}

/** What the voters know of one candidate, from the records. */
export interface CandidateInputs {
  readonly id: string;
  readonly party: string | null;
  /** -1 the Democratic family, +1 Republican, 0 otherwise. */
  readonly side: number;
  readonly incumbent: boolean;
  /** Has held elected office (another seat, or this one before). */
  readonly experienced: boolean;
  /** A public scandal on the record before election day. */
  readonly scandal: boolean;
  /** What the campaign's books show it spent; null where the world records no campaign (the typical race). */
  readonly spentMinor: number | null;
  /** The officeholder's recorded votes and promises, weighed at the race's lean (record.ts units). */
  readonly record: number;
  /** Of the party holding the presidency. */
  readonly presidentsParty: boolean;
  /** Of the party holding this seat. */
  readonly seatPartyHolder: boolean;
}

/** The conditions every voter in the race sees. */
export interface RaceConditions {
  readonly cycle: "presidential" | "midterm" | "off-cycle";
  /** The cycle's turnout against a presidential year's. */
  readonly cycleShare: number;
  /** Federal offices feel the national economy whole; state offices in part. */
  readonly federal: boolean;
  /** Typical spending per two-party vote for the race's office, cents. */
  readonly typicalSpendPerVote: number;
  readonly national: {
    readonly unemploymentChange: number;
    readonly inflationChange: number;
  };
  /** The town's own county block and its conditions (town unemployment change, crime change as a share). */
  readonly town: {
    readonly blockId: string | null;
    /** The town's county, whose voters feel the town's jobs and crime. */
    readonly localBlockId: string | null;
    readonly unemploymentChange: number;
    readonly crimeChange: number;
    /** The town's own voters, counted by the engine apart (named and counted residents who voted). */
    readonly votersCounted: number;
  } | null;
  /** The election laws' turnout cost in force against the opening's, for the town's state's blocks. */
  readonly lawCostChange: number;
  /** The share of adults barred from voting against the opening's. */
  readonly barredChange: number;
}

/** One candidate's reasons, as vote shares in an evenly split electorate. */
export interface CandidateReasons {
  readonly id: string;
  readonly party: string | null;
  readonly side: number;
  readonly incumbency: number;
  readonly experience: number;
  readonly scandal: number;
  readonly spending: number;
  readonly record: number;
  readonly economy: number;
  readonly midterm: number;
  /** In the town's county only. */
  readonly local: number;
  readonly total: number;
}

export interface BlockResult {
  readonly id: string;
  readonly name: string;
  readonly baseline2024: number;
  readonly cast: number;
  readonly votes: Readonly<Record<string, number>>;
  /** Each group's votes cast and choices. */
  readonly byGroup: Readonly<
    Record<
      string,
      {
        readonly cast: number;
        readonly votes: Readonly<Record<string, number>>;
      }
    >
  >;
}

export interface ElectorateResult {
  readonly votes: Readonly<Record<string, number>>;
  readonly cast: number;
  readonly candidates: readonly CandidateReasons[];
  readonly blocks: readonly BlockResult[];
  readonly conditions: RaceConditions;
}

/** Each candidate's reasons, from their inputs and the race's conditions. */
export function candidateReasons(
  candidate: CandidateInputs,
  conditions: RaceConditions,
  raceVotes: number,
): CandidateReasons {
  const p = electorateParameter;
  const typical = conditions.typicalSpendPerVote * Math.max(1, raceVotes);
  const spending =
    candidate.spentMinor === null || !typical
      ? 0
      : p("spendingSharePerLogUnit") *
        Math.log(
          Math.max(
            candidate.spentMinor,
            p("spendingFloorShareOfTypical") * typical,
          ) / typical,
        );
  const economy = candidate.presidentsParty
    ? -(conditions.federal ? 1 : p("downBallotNationalShare")) *
      (p("unemploymentShare") * conditions.national.unemploymentChange +
        p("inflationShare") * conditions.national.inflationChange)
    : 0;
  const midterm =
    candidate.presidentsParty && conditions.cycle === "midterm"
      ? -campaignParameter("midtermSwing")
      : 0;
  const local =
    candidate.seatPartyHolder && conditions.town?.localBlockId
      ? -(
          p("localUnemploymentShare") * conditions.town.unemploymentChange +
          p("localCrimeShare") *
            (conditions.town.crimeChange / p("crimeChangeUnit"))
        )
      : 0;
  const parts = {
    incumbency: candidate.incumbent ? campaignParameter("incumbencyShare") : 0,
    experience:
      !candidate.incumbent && candidate.experienced
        ? p("experiencedCandidateShare")
        : 0,
    scandal: candidate.scandal ? -p("scandalShare") : 0,
    spending,
    record: p("recordShareWeight") * candidate.record,
    economy,
    midterm,
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return {
    id: candidate.id,
    party: candidate.party,
    side: candidate.side,
    ...parts,
    local,
    total,
  };
}

/**
 * How one group's voters split: each voter at lean x backs the candidate
 * whose party side times x plus appeal is highest; the group's members are
 * spread around its center, so the split is a share, never a draw. Exact
 * ties split evenly.
 */
function groupSplit(
  center: number,
  lines: readonly { id: string; side: number; appeal: number }[],
): Map<string, number> {
  const out = new Map<string, number>();
  if (!lines.length) return out;
  const breaks: number[] = [];
  for (let i = 0; i < lines.length; i += 1)
    for (let j = i + 1; j < lines.length; j += 1) {
      const a = lines[i]!,
        b = lines[j]!;
      if (a.side !== b.side)
        breaks.push((b.appeal - a.appeal) / (a.side - b.side));
    }
  const points = [...new Set(breaks)].sort((x, y) => x - y);
  const edges = [-Infinity, ...points, Infinity];
  for (let k = 0; k + 1 < edges.length; k += 1) {
    const lo = edges[k]!,
      hi = edges[k + 1]!;
    const at =
      lo === -Infinity
        ? hi === Infinity
          ? 0
          : hi - 1
        : hi === Infinity
          ? lo + 1
          : (lo + hi) / 2;
    let best = -Infinity;
    let winners: string[] = [];
    for (const line of lines) {
      const u = line.side * at + line.appeal;
      if (u > best + 1e-12) {
        best = u;
        winners = [line.id];
      } else if (Math.abs(u - best) <= 1e-12) winners.push(line.id);
    }
    const mass = normalCdf(hi - center) - normalCdf(lo - center);
    for (const id of winners)
      out.set(id, (out.get(id) ?? 0) + mass / winners.length);
  }
  return out;
}

/**
 * Count a race across its blocks. Each block's groups turn out at the cycle's
 * rate and the laws' cost (the least reliable groups moving most), then
 * split by party and every candidate's appeal. The town's own voters, counted
 * apart, come out of its county's block.
 */
export function countBlocks(
  blocks: readonly Block[],
  candidates: readonly CandidateInputs[],
  conditions: RaceConditions,
): ElectorateResult {
  const p = electorateParameter;
  const raceVotes =
    blocks.reduce((s, b) => s + b.votes, 0) * conditions.cycleShare;
  const reasons = candidates.map((c) =>
    candidateReasons(c, conditions, raceVotes),
  );
  const results: BlockResult[] = [];
  const totals: Record<string, number> = {};
  let cast = 0;
  const townBlock = conditions.town?.blockId
    ? blocks.find((b) => b.id === conditions.town!.blockId)
    : undefined;
  // The town's voters come out of its county; with no county recorded, out
  // of every block in proportion.
  const excluded = conditions.town?.votersCounted ?? 0;
  const spread =
    excluded && !townBlock && raceVotes > 0
      ? Math.max(0, 1 - excluded / raceVotes)
      : 1;
  for (const block of blocks) {
    const mix = composition(block.mu);
    const lift = GROUPS.map((g) => 1 - g.turnout);
    const meanLift = mix.reduce((s, m, i) => s + m * lift[i]!, 0) || 1;
    const weight = lift.map((l) => l / meanLift);
    // The cycle's turnout falls evenly across the groups (its tilt against
    // the president's party is the midterm penalty); a change in the cost
    // of voting moves the groups that vote least the most.
    const factors = weight.map((w) =>
      Math.max(
        0,
        conditions.cycleShare *
          (1 - conditions.barredChange) *
          (1 - p("lawTurnoutPerCost") * conditions.lawCostChange * w),
      ),
    );
    const inTown = block === townBlock;
    const local = block.id === conditions.town?.localBlockId;
    const lines = reasons.map((r) => ({
      id: r.id,
      side: r.side,
      appeal: appealOfShare(r.total + (local ? r.local : 0)) * 2,
    }));
    let groupCast = GROUPS.map((_, i) => block.votes * mix[i]! * factors[i]!);
    const blockCast = groupCast.reduce((a, b) => a + b, 0);
    const keep = inTown
      ? blockCast > 0
        ? Math.max(0, 1 - excluded / blockCast)
        : 0
      : spread;
    groupCast = groupCast.map((c) => c * keep);
    const votes: Record<string, number> = {};
    const byGroup: Record<
      string,
      { cast: number; votes: Record<string, number> }
    > = {};
    GROUPS.forEach((g, i) => {
      const split = groupSplit(g.center + block.shift, lines);
      const gv: Record<string, number> = {};
      for (const [id, share] of split) {
        gv[id] = Math.round(groupCast[i]! * share);
        votes[id] = (votes[id] ?? 0) + groupCast[i]! * share;
      }
      byGroup[g.id] = { cast: Math.round(groupCast[i]!), votes: gv };
    });
    let blockTotal = 0;
    for (const id of Object.keys(votes)) {
      votes[id] = Math.round(votes[id]!);
      totals[id] = (totals[id] ?? 0) + votes[id]!;
      blockTotal += votes[id]!;
    }
    cast += blockTotal;
    results.push({
      id: block.id,
      name: block.name,
      baseline2024: block.target,
      cast: blockTotal,
      votes,
      byGroup,
    });
  }
  return {
    votes: totals,
    cast,
    candidates: reasons,
    blocks: results,
    conditions,
  };
}

/** Typical spending per two-party vote for an office family, cents. */
export function typicalSpendPerVote(family: string): number {
  return TYPICAL_SPEND[family] ?? TYPICAL_SPEND.stateLegislative ?? 0;
}

/** The national economy against the opening: unemployment and inflation, in points. */
export function nationalEconomyChange(api: CoreAPI): {
  unemploymentChange: number;
  inflationChange: number;
} {
  if (!api.state.modules.has("macro"))
    return { unemploymentChange: 0, inflationChange: 0 };
  const store = api.moduleState("macro");
  const state = store.table("state").get("macro:state") as unknown as
    { openingMonth: string; latestMonth: string } | undefined;
  if (!state) return { unemploymentChange: 0, inflationChange: 0 };
  const month = (m: string) =>
    store.table("months").get(`macro-month:${m}`) as unknown as
      { unemploymentPct: number; inflationPct: number } | undefined;
  const opening = month(state.openingMonth),
    latest = month(state.latestMonth);
  if (!opening || !latest) return { unemploymentChange: 0, inflationChange: 0 };
  return {
    unemploymentChange: latest.unemploymentPct - opening.unemploymentPct,
    inflationChange: latest.inflationPct - opening.inflationPct,
  };
}
