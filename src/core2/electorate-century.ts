/**
 * The century before day one (owner, Nov 17, 2026, CTO line 6935086070 on #9747): "History is pure
 * simulation from 1925, a year at a step, during the loading screen ... Day one is whatever that
 * history produced: who holds every office, party control, and the laws in force. Real data only
 * sets how strongly things move one another." And the owner's rule behind it (CTO line 6933444847):
 * "I want the world to decide the state ... load into one world where there has been 100 years of
 * Democratic presidents or something."
 *
 * The century runs forward from 1925, a year at a step, and the last step's records are day one's.
 * Its elections are counted on the one count (`countPlaces`, electorate.ts) with the one race rule
 * (`candidateReasons`, electorate-inputs.ts), the rule every race in play uses. What happened is
 * decided by the count: where each state stands, who runs (a sitting president runs again until
 * elected twice), the party's time in the White House and the president's standing. Who exists is
 * generated: each state's and the country's place on the lean order in 1925 is one starting shift
 * from the world's seed (`centuryShift`, any size equally likely), sized by the real map's spread. After
 * that no roll decides anything.
 *
 * It is a pure function of the world's seed, worked out once per seed and kept, so every reader
 * (the offices engine seating the President, the President's record, the past election behind the
 * term, the next race's time-for-change reason) reads the same century without a module of its own
 * at load. "Just like today" (`historyMode`) is the same build with today's real record in place of
 * the century's last step (CTO line 6935086070, point 5).
 *
 * It runs the presidency (pull request 1 of the History lane's plan, #9747), Congress (pull
 * request 2: every House seat and the Senate by class) and every governor and partisan statewide
 * officer (pull request 3a). The legislatures, the economy and the laws follow, each on the same
 * steps.
 */
import {
  candidateReasons,
  nationalParty,
  partySide,
  type CandidateReasons,
  typicalSpendPerVote,
  type CandidateInputs,
} from "./electorate-inputs";
import { countParties, type RacePlace, type SampleVoter } from "./electorate";
import {
  lawSession,
  sessionQuestions,
  type CenturyLaw,
  type PartyPositions,
  type SessionChamber,
} from "./electorate-century-laws";
import {
  congressSeatKeys,
  congressStateKeys,
  rosterLabel,
  publishedStatePlaces,
  townEligibleVoters,
} from "./electorate-places";
import { seededUnit } from "./seeded";
import { pastParameter } from "./past-parameter";
import senateClasses from "../../data/research/offices/senate-classes-2026.json" with { type: "json" };
import { readinessOf } from "./turnout";
import { gameStartDate } from "./game-start";
import {
  localOfficesForPlace,
  seatTermEnd,
  stateOffices,
} from "./modules/offices";
import tenure from "./data/offices/tenure.json" with { type: "json" };
import stateOfficeResearch from "../../data/research/offices/state-offices.json" with { type: "json" };
import statewideParties from "../../data/research/offices/statewide-executive-parties-2026.json" with { type: "json" };
import electorsData from "./data/elections/electoral-votes.json" with { type: "json" };
import data from "./data/history/century.json" with { type: "json" };
import campaignData from "./data/campaigns/parameters.json" with { type: "json" };
import legislatureParties from "../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };

const PARAMS = (
  data as unknown as { parameters: Record<string, { value: number }> }
).parameters;

/** How far toward its party a voter's lean must reach to take it: the one `partyIdentityReach` (campaigns/parameters.json) party ties use. */
function campaignParameter(key: "partyIdentityReach"): number {
  return (
    campaignData as unknown as { parameters: Record<string, { value: number }> }
  ).parameters[key]!.value;
}

/** A century parameter (`src/core2/data/history/century.json`). */
export function centuryParameter(key: string): number {
  const row = PARAMS[key];
  if (!row) throw new Error(`Unknown century parameter: ${key}`);
  return row.value;
}

const ELECTORS = electorsData as unknown as {
  toWin: number;
  states: Record<string, number>;
};

/** Where a world's day one comes from: the century it ran, or today's real record. */
export type HistoryMode = "century" | "today";

const modes = new Map<string, HistoryMode>();
const openings = new Map<string, string>();

/**
 * Sets how a world's day one is made, by its seed: the build records the player's choice (a new
 * game's or dev mode's "Start from today's real record") and the day the world opens on before
 * anything reads the offices.
 */
const townStates = new Map<string, string>();
/** The played state's last regular sitting before day one, named by the build (`tooling/past-sessions.ts`). */
const townSittings = new Map<
  string,
  { year: number; conveneAt: string; adjournAt: string }
>();

/** The played town's place key: its own and its county's offices are counted seat by seat. */
const townPlaces = new Map<string, { key: string; geoid: string }>();

export function setHistoryMode(
  seed: string,
  mode: HistoryMode,
  startDate?: string,
  /** The played town's state (`US-XX`): its legislature is counted seat by seat. */
  townState?: string,
  /** The played state's last regular sitting before day one, which the real bill engine runs. */
  sitting?: { year: number; conveneAt: string; adjournAt: string },
  /** The played town's place key and geoid: its mayor, council and county offices are run from 1925. */
  townPlace?: { key: string; geoid: string },
): void {
  if (mode === "century") modes.delete(seed);
  else modes.set(seed, mode);
  if (startDate) openings.set(seed, startDate);
  if (townState) townStates.set(seed, townState);
  if (townPlace) townPlaces.set(seed, townPlace);
  if (sitting) townSittings.set(seed, sitting);
  else townSittings.delete(seed);
}

/** The day a world's century runs up to: the one its build recorded, else the game's start. */
function openingOf(seed: string): string {
  return openings.get(seed) ?? gameStartDate();
}

/** How a world's day one is made: the century unless the world chose today's real record. */
export function historyMode(seed: string): HistoryMode {
  return modes.get(seed) ?? "century";
}

/** One state's popular vote for President in a century election. */
export interface CenturyStateVote {
  readonly stateKey: string;
  readonly electors: number;
  /** Where the state stood on the lean order going in (its Republican two-party share). */
  readonly lean: number;
  /** The Republican two-party share of its votes. */
  readonly republicanShare: number;
  /** +1 Republican, -1 Democratic: the side its electors went to. */
  readonly winnerSide: number;
}

/** One presidential election of the century and the term it began. */
export interface CenturyPresidency {
  readonly id: string;
  readonly year: number;
  /** The day the term began (March 4 before 1937, January 20 since; amend. XX). */
  readonly termStart: string;
  readonly termEnd: string;
  readonly winnerSide: number;
  readonly winnerParty: string;
  /** The named-only President: the same id for every term one person won. */
  readonly presidentId: string;
  /** Whether the sitting President was on the ballot. */
  readonly incumbentRan: boolean;
  /** How many terms this person has won, this one included. */
  readonly personTerms: number;
  /** How many straight terms the winner's party holds the office with this one. */
  readonly partyTerms: number;
  /** The national Republican two-party share of the popular vote. */
  readonly republicanShare: number;
  /** The winner's two-party share of the popular vote. */
  readonly winnerShare: number;
  readonly electoral: {
    readonly republican: number;
    readonly democratic: number;
  };
  /**
   * The time-for-change reason in this race: the side it weighed against (the party seeking a
   * third straight term or more) and the share of the two-party vote it cost that side's ticket
   * (0 and no side where no party had held the office two terms).
   */
  readonly timeForChange: { readonly side: number; readonly share: number };
  /** No ticket won a majority of the electors: the sitting party's side held the office. */
  readonly noMajority: boolean;
  /** The race's two-party votes cast. */
  readonly votes: number;
  /** The founded party that stood in this race (History 9b) and its share of every vote cast; absent where none stood. */
  readonly foundedParty?: { readonly id: string; readonly share: number };
  readonly states: readonly CenturyStateVote[];
}

/** The country when the century opens (January 1925). */
export interface CenturyOpening {
  readonly year: number;
  /** The side holding the White House in 1925: the side the country's starting shift leans to. */
  readonly presidentSide: number;
  /** Each state's Republican two-party share on the lean order in 1925. */
  readonly leans: Readonly<Record<string, number>>;
}

/** One century race for a seat in Congress (a seat keeps its last few; older ones fold into the Congress counts). */
export interface CenturySeatRace {
  /** `century:<seat key>:<year>`. */
  readonly id: string;
  readonly year: number;
  readonly winnerSide: number;
  /** The winner's two-party share. */
  readonly winnerShare: number;
  /** The race's two-party votes cast. */
  readonly votes: number;
  /** Whether the seat's holder was on the ballot. */
  readonly incumbentRan: boolean;
}

/** A seat in Congress through the century: who holds it now and their career. */
export interface CenturySeat {
  /** `<state key>:senate:<index>` or `<state key>:house:<district>`. */
  readonly key: string;
  readonly stateKey: string;
  readonly chamber: "senate" | "house" | "executive" | "legislature" | "local";
  /** The seat in the roster: the Senate seat's index, or the House district as the roster keys it. */
  readonly rosterKey: string;
  /** A Senate seat's class (1 to 3); 0 for the House and an executive. */
  readonly senateClass: number;
  /** An executive office's cycle: its term in years and a year it is elected in (0 for Congress). */
  readonly termYears?: number;
  readonly cycleYear?: number;
  /** The most terms one holder may win (a term limit), where the office has one. */
  readonly termLimit?: number;
  /** A legislative seat's chamber in the roster ("upper", "lower" or "legislature") and its office. */
  readonly rosterChamber?: string;
  readonly officeId?: string;
  /**
   * A legislative seat of a state other than the played town's: counted with its chamber as
   * results, its races not kept; a race is counted for it only when someone opens it.
   */
  readonly hidden?: boolean;
  /** A local seat's own electorate: the town's or county's eligible voters. */
  readonly eligible?: number;
  /** The holder's side now (+1 Republican, -1 Democratic). */
  side: number;
  /** The named-only holder: the same id for every term one person won. */
  holderId: string;
  /** The year the holder first won the seat. */
  firstWon: number;
  /** Elections the holder has won for the seat. */
  termsWon: number;
  /** How many terms the holder serves before leaving the seat open (who exists: drawn once when they first win). */
  careerTerms: number;
  /** The seat's last races, newest last. */
  races: CenturySeatRace[];
}

/** Each chamber's seats by party after a November's count. */
export interface CenturyCongress {
  readonly id: string;
  readonly year: number;
  readonly house: { readonly republican: number; readonly democratic: number };
  readonly senate: { readonly republican: number; readonly democratic: number };
}

export interface Century {
  readonly seed: string;
  readonly opening: CenturyOpening;
  /** Every presidential election, oldest first. */
  readonly presidencies: readonly CenturyPresidency[];
  /** Each state's place on the lean order after the century's last election. */
  readonly leans: Readonly<Record<string, number>>;
  /** Every seat in Congress and every statewide executive as the century left them, by key (the legislatures: `centuryLegislatures`). */
  readonly seats: ReadonlyMap<string, CenturySeat>;
  /** Each chamber's party count after every November election, oldest first. */
  readonly congresses: readonly CenturyCongress[];
  /** Where each district (House and legislative, by seat key) stands after the century's last count. */
  readonly districtLeans: Readonly<Record<string, number>>;
  /** The nation's law in force on each federal policy question: its last change, by `US|<question>`. */
  readonly laws: ReadonlyMap<string, CenturyLaw>;
  /** The parties the century's races are fought between, each with where it has stood. */
  readonly parties: readonly CenturyParty[];
  /** The parties founded in the century's own history, oldest first (family 9b). */
  readonly foundings: readonly CenturyFounding[];
  /** Each state's governor's side after each change of party, oldest first, by state key. */
  readonly governorSides: ReadonlyMap<
    string,
    readonly { year: number; side: number }[]
  >;
}

/**
 * A party of the century: who exists in 1925 (the two national parties, founded before it), and
 * where it has stood since. Its position on the members' left-right scale (DW-NOMINATE's first
 * dimension, -1 to 1) is where the members it holds stand: the mean of its members' seats in
 * Congress, put on that scale by `centuryPartyLeanScale`. A party that wins moderate seats
 * moderates; one left with only its safest seats moves out. Never a target position.
 */
export interface CenturyParty {
  /** `party:<side>` for the two national parties. */
  readonly id: string;
  readonly name: string;
  /** The side it competes on: -1 left, 1 right. */
  readonly side: number;
  /** The year it was founded; null for a party that existed before 1925. */
  readonly founded: number | null;
  /** Its position after each even November, oldest first. */
  readonly positions: readonly {
    readonly year: number;
    readonly position: number;
  }[];
}

/**
 * A party founded in the century's own history (History family 9b, plan 6952133362 on #9747): the
 * voters neither national party reached had built up pressure for a new one that outweighed the
 * cost of standing it. It stands at the centroid of those voters on the members' scale, so its
 * `side` is the side of that position (0 when the unreached voters sit evenly either side).
 * Its record keeps the cause: the pressure then and the share of voters it was founded from. It
 * has no name yet: how a founded party is named is Story's (asked on #9750).
 */
export interface CenturyFounding {
  /** `party:founded:<year>`. */
  readonly id: string;
  /** The presidential year it was founded in. */
  readonly year: number;
  /** Where it stands on the members' scale (-1 to 1): the mean position of the voters it was founded from. */
  readonly position: number;
  /** The side of that position: -1, 0 or 1. */
  readonly side: number;
  /** The founding pressure when it was founded. */
  readonly pressure: number;
  /** The cost of standing a party that the pressure outweighed (`centuryFoundingCost`). */
  readonly cost: number;
  /** The share of the century's voters neither national party reached that year. */
  readonly unreachedShare: number;
  /**
   * The presidential year its share had fallen in each of `centuryFoundedPartyFallCycles` straight
   * races and it merged into the national party nearest it (`mergedInto`, a party id); both
   * absent while it stands (History 9b part 3).
   */
  readonly endedYear?: number;
  readonly mergedInto?: string;
}

/**
 * One presidential cycle's founding step. The voters a party reaches are those whose lean goes
 * `partyIdentityReach` of the way to where their side's party stands (the same reach party ties
 * use, parties.ts centuryTies), each unreached by the part of that reach they fall short of (a
 * sliding scale, so the pressure moves continuously with where the parties stand, never in steps
 * of one voter); that unreached share adds to a pressure that
 * fades each cycle (`centuryFoundingFade`). Where the parties stand far from the voters the
 * pressure builds, and where one moves back it shrinks. A party is founded when the pressure
 * outweighs `centuryFoundingCost` (stopgap SG-HIST-century-founding-cost), at the centroid of
 * the unreached voters; while it stands, its voters are reached and the pressure is spent.
 */
// stopgapId: SG-HIST-century-founding-cost
export function foundingStep(
  voters: readonly SampleVoter[],
  parties: readonly CenturyParty[],
  year: number,
  pressure: number,
  standing: boolean,
): { pressure: number; founding?: CenturyFounding } {
  if (standing) return { pressure: 0 };
  const at = partyPositionsAt(parties, year);
  const reach = campaignParameter("partyIdentityReach");
  let weight = 0;
  let unreached = 0;
  let lean = 0;
  for (const voter of voters) {
    const v = 2 * voter.rank - 1;
    weight += voter.weight;
    // A sliding scale, no threshold: a voter at their party's reach is wholly reached, one at
    // the center not at all, and between them the unreached part falls in a straight line.
    const position = at[Math.sign(v)];
    const reachesTo = position === undefined ? 0 : reach * Math.abs(position);
    const part =
      position === undefined
        ? 1
        : reachesTo > 0
          ? Math.max(0, 1 - Math.abs(v) / reachesTo)
          : 0;
    if (part <= 0) continue;
    unreached += voter.weight * part;
    lean += voter.weight * part * v;
  }
  const share = weight ? unreached / weight : 0;
  const next = pressure * centuryParameter("centuryFoundingFade") + share;
  if (next <= centuryParameter("centuryFoundingCost"))
    return { pressure: next };
  const position = unreached ? lean / unreached : 0;
  return {
    pressure: 0,
    founding: {
      id: `party:founded:${year}`,
      year,
      position,
      side: Math.sign(position),
      pressure: next,
      cost: centuryParameter("centuryFoundingCost"),
      unreachedShare: share,
    },
  };
}

/** Where each side's party stands: the mean of its members' seats in Congress, on the members' scale. */
function partyPositionsNow(
  seats: ReadonlyMap<string, CenturySeat>,
  leans: Readonly<Record<string, number>>,
  districtLeans: Readonly<Record<string, number>>,
): Record<number, number> {
  const sums: Record<number, { total: number; n: number }> = {
    [-1]: { total: 0, n: 0 },
    [1]: { total: 0, n: 0 },
  };
  for (const chamber of congressChambers(seats, leans, districtLeans))
    for (const member of chamber.members) {
      const row = sums[member.side];
      if (!row) continue;
      row.total += member.lean;
      row.n += 1;
    }
  const scale = centuryParameter("centuryPartyLeanScale");
  const out: Record<number, number> = {};
  for (const side of [-1, 1]) {
    const row = sums[side]!;
    out[side] = row.n
      ? Math.max(-1, Math.min(1, (row.total / row.n) * scale))
      : side * 0;
  }
  return out;
}

/** Where each side's party stood after the last even November up to `year`. */
function partyPositionsAt(
  parties: readonly CenturyParty[],
  year: number,
): PartyPositions {
  const out: Record<number, number> = {};
  for (const party of parties) {
    let at: number | undefined;
    for (const row of party.positions) if (row.year <= year) at = row.position;
    if (at !== undefined) out[party.side] = at;
  }
  return out;
}

/**
 * A state's last presidential count in the century: the right's share there and the race's
 * record. Undefined under "today" and for a place with no presidential vote.
 */
export function centuryStateVote(
  seed: string,
  stateKey: string,
):
  | {
      readonly republicanShare: number;
      readonly id: string;
      readonly year: number;
    }
  | undefined {
  if (historyMode(seed) !== "century") return undefined;
  const last = centuryOf(seed, openingOf(seed)).presidencies.at(-1);
  const row = last?.states.find((state) => state.stateKey === stateKey);
  return last && row
    ? { republicanShare: row.republicanShare, id: last.id, year: last.year }
    : undefined;
}

/**
 * Where the century's last count left a state (`US-<USPS>`), its House district or its legislative
 * seat (an offices seat id), on the signed lean scale (right positive): 2 x the right's share - 1.
 * Undefined under "today" and where the century has no count for it.
 */
export function centurySignedLean(
  seed: string,
  stateKey: string,
  district?:
    | { readonly usps: string; readonly houseCode: string }
    | { readonly seatId: string },
): number | undefined {
  if (historyMode(seed) !== "century") return undefined;
  const share = district
    ? centuryDistrictLean(seed, district)
    : centuryOf(seed, openingOf(seed)).leans[stateKey];
  return share === undefined ? undefined : 2 * share - 1;
}

/**
 * The right's two-party share where the century's last count left a state or territory (by
 * USPS): a state's last presidential count, a territory's last delegate race. Undefined under
 * "today" and where the century has no count for it.
 */
export function centuryStateShare(
  seed: string,
  usps: string,
): number | undefined {
  if (historyMode(seed) !== "century") return undefined;
  return (
    centuryOf(seed, openingOf(seed)).leans[`US-${usps}`] ??
    centuryDistrictLean(seed, { usps, houseCode: "0" })
  );
}

/** The century's parties, under "century"; undefined under "today". */
export function centuryParties(
  seed: string,
): readonly CenturyParty[] | undefined {
  if (historyMode(seed) !== "century") return undefined;
  return centuryOf(seed, openingOf(seed)).parties;
}

/**
 * Whether a founded party's vote share has fallen in each of the last
 * `centuryFoundedPartyFallCycles` straight presidential races (its shares, oldest first), the
 * cause of its merging (History 9b part 3).
 */
export function foundedPartyHasFallen(shares: readonly number[]): boolean {
  const falls = centuryParameter("centuryFoundedPartyFallCycles");
  const recent = shares.slice(-(falls + 1));
  return (
    recent.length === falls + 1 &&
    recent.every((share, i) => i === 0 || share < recent[i - 1]!)
  );
}

/** The national party whose position stood nearest `position` going into a presidential year (the last November's). */
export function nearestParty(
  parties: readonly CenturyParty[],
  year: number,
  position: number,
): CenturyParty {
  const at = partyPositionsAt(parties, year);
  return parties.reduce((best, party) =>
    Math.abs((at[party.side] ?? 0) - position) <
    Math.abs((at[best.side] ?? 0) - position)
      ? party
      : best,
  );
}

/** The parties founded in the century's own history, oldest first; undefined under "today". */
export function centuryFoundings(
  seed: string,
): readonly CenturyFounding[] | undefined {
  if (historyMode(seed) !== "century") return undefined;
  return centuryOf(seed, openingOf(seed)).foundings;
}

const centuries = new Map<string, Century>();

/** Each state's electors (the 2020 apportionment, for every year: stopgap SG-HIST-century-apportionment). */
// stopgapId: SG-HIST-century-apportionment
function stateKeys(): readonly string[] {
  return Object.keys(ELECTORS.states).sort();
}

/**
 * One starting shift on the lean order in 1925, between -1 and 1 of its spread, any size equally
 * likely (who exists, not what happens). Not the world draw's offset (`worldOffsetUnit`), whose
 * floor keeps a figure off its published value: 1925 has no published value to stay off, and a
 * floor would leave no state near the nation, so that a century whose states carry their own
 * results would never have a state near even in an even year.
 */
function centuryShift(seed: string, key: string): number {
  return 2 * seededUnit(seed, `century:shift:${key}`) - 1;
}

/** The country in 1925: one starting shift for the nation and one for each state (who exists, not what happens). */
export function centuryOpening(seed: string): CenturyOpening {
  const national =
    centuryShift(seed, "century:lean:nation") *
    centuryParameter("centuryNationalLeanSpread");
  const leans: Record<string, number> = {};
  for (const key of stateKeys())
    leans[key] = Math.max(
      0,
      Math.min(
        1,
        0.5 +
          national +
          centuryShift(seed, `century:lean:${key}`) *
            centuryParameter("centuryStateLeanSpread"),
      ),
    );
  return {
    year: centuryParameter("centuryFirstYear"),
    // stopgapId: SG-HIST-century-first-president
    presidentSide: national >= 0 ? 1 : -1,
    leans,
  };
}

/** The day a term won in `year` began (amend. XX moved it from March 4 to January 20). */
export function termStartAfter(year: number): string {
  const next = year + 1;
  return next >= centuryParameter("inaugurationMovedYear")
    ? `${next}-01-20`
    : `${next}-03-04`;
}

/**
 * The century's voters: evenly spaced along the lean order at the typical readiness of a
 * presidential year, standing for every state's people (stopgap SG-HIST-century-voters: the
 * town's own people of the century are not in the world, so the town's sample cannot stand for
 * them as it does for the places a race counts from afar in play).
 */
// stopgapId: SG-HIST-century-voters
function centuryVoters(
  count = centuryParameter("centuryVoters"),
): readonly SampleVoter[] {
  const size = Math.max(1, Math.round(count));
  const readiness = readinessOf({ duty: 0, reach: 0, habit: 0, cost: 0 });
  return Array.from({ length: size }, (_, i) => ({
    id: `century:voter:${i}`,
    rank: (i + 0.5) / size,
    readiness,
    incumbentLean: 0,
    weight: 1,
  }));
}

const eligibles = new Map<string, number>();
/** Each state's eligible voters: the people who live there now (stopgap SG-HIST-century-apportionment). */
function eligibleOf(seed: string, stateKey: string): number {
  const key = `${seed}|${stateKey}`;
  const known = eligibles.get(key);
  if (known !== undefined) return known;
  const sum = (places: readonly { eligible: number }[]) =>
    places.reduce((total, place) => total + place.eligible, 0);
  // A territory has no county places: its people are sized by its delegate's race, as play's
  // races size them (voting.ts worldRacePlaces).
  const eligible =
    sum(publishedStatePlaces(stateKey.slice(3), seed)) ||
    sum(publishedStatePlaces(stateKey.slice(3), seed, 1));
  eligibles.set(key, eligible);
  return eligible;
}

/** A race's count in one place: the two parties' votes and the right's share of them. */
interface SeatCount {
  readonly republican: number;
  readonly democratic: number;
  readonly republicanShare: number;
  /** Votes for the founded party, where one stood (History 9b); not in the two-party share. */
  readonly founded?: number;
}

/**
 * One race in one place on the one path (electorate.ts `countParties`): the count, and the
 * place's result cleared of what was personal to the two candidates (their incumbency and
 * experience) and of the year's national tide (the President's approval, the midterm swing, the
 * party's time in the White House, the economy), which is what carries into where the place
 * stands: how it moved against the nation, never the tide itself (CTO line 6936486748, Nov 17,
 * 2026: "The national tide belongs to that year's race and no other").
 */
function countSeat(
  voters: readonly SampleVoter[],
  place: RacePlace,
  field: readonly CandidateInputs[],
  conditions: Parameters<typeof countParties>[3],
): { share: SeatCount; cleared: number } {
  const { reasons, counted } = countParties(voters, [place], field, conditions);
  const republican = counted.votes["party:R"] ?? 0;
  const democratic = counted.votes["party:D"] ?? 0;
  const republicanShare = exactShare(counted.exact[0]!, place.rightShare);
  const standing = field.find((c) => c.position !== undefined);
  return {
    share: {
      republican,
      democratic,
      republicanShare,
      ...(standing ? { founded: counted.votes[standing.id] ?? 0 } : {}),
    },
    cleared: republicanShare - notCarriedGap(reasons),
  };
}

/** The right's share of a place's counted people, before the printed counts are rounded. */
function exactShare(
  exact: Readonly<Record<string, number>>,
  otherwise: number,
): number {
  const republican = exact["party:R"] ?? 0;
  const democratic = exact["party:D"] ?? 0;
  return republican + democratic
    ? republican / (republican + democratic)
    : otherwise;
}

/**
 * What acted on a race alone, the right's less the left's: the candidates' own standing
 * (incumbency, experience, spending) and the year's national tide (approval, the midterm, time for
 * a change, the economy). A place's lean carries its result less this (CTO line 6936486748).
 */
function notCarriedGap(reasons: readonly CandidateReasons[]): number {
  const part = (side: number) => {
    const r = reasons.find((x) => x.side === side);
    return r
      ? r.incumbency +
          r.experience +
          r.spending +
          r.economy +
          r.midterm +
          r.timeForChange
      : 0;
  };
  return part(1) - part(-1);
}

/** A year's cleared results by place, carried once each at the year's end (several races, their mean). */
class YearResults {
  private readonly byPlace = new Map<string, number[]>();
  add(placeId: string, cleared: number): void {
    const list = this.byPlace.get(placeId);
    if (list) list.push(cleared);
    else this.byPlace.set(placeId, [cleared]);
  }
  /**
   * Each place's lean moves to its own cleared results' mean by the carry share (interim rule,
   * to be replaced by World B's one writer, `carryLean`, when it lands: #9747, World B 02:24Z;
   * the clearing as the CTO ruled at 02:49Z).
   */
  carry(...leanTables: Record<string, number>[]): void {
    const carry = centuryParameter("centuryLeanCarryShare");
    for (const [placeId, list] of this.byPlace) {
      const leans = leanTables.find((table) => placeId in table);
      if (!leans) continue;
      const lean = leans[placeId]!;
      const mean = list.reduce((a, b) => a + b, 0) / list.length;
      leans[placeId] = Math.max(
        0,
        Math.min(1, lean * (1 - carry) + mean * carry),
      );
    }
    this.byPlace.clear();
  }
}

/**
 * The sitting President's standing with the country going into a race, in points from even.
 * The approval engine (national-opinion.ts) opens a term at the winner's share and moves it only
 * by the economy's changes and other engines' pushes; the century has no economy yet, so nothing
 * would move it for the whole term, and a President elected with a minority of the vote would
 * weigh on their party for four years for no cause the world holds. Until the economy runs in the
 * century, approval stands at the neutral point (stopgap SG-HIST-century-steady-economy).
 */
// stopgapId: SG-HIST-century-steady-economy
function approvalGap(): number {
  return 0;
}

/**
 * One century presidential election: both parties' nominees counted in every state on the one
 * count, with the one race rule. The sitting President runs again unless they have been elected
 * twice (amend. XXII from 1952; the two-term custom before it, stopgap SG-HIST-century-two-terms).
 */
function presidentialElection(
  seed: string,
  year: number,
  sittingSide: number,
  sitting: CenturyPresidency | undefined,
  leans: Readonly<Record<string, number>>,
  voters: readonly SampleVoter[],
  results: YearResults,
  foundings: readonly CenturyFounding[] = [],
): CenturyPresidency {
  // stopgapId: SG-HIST-century-two-terms
  const incumbentRuns = Boolean(sitting && sitting.personTerms < 2);
  const partyTerms = sitting ? sitting.partyTerms : 1;
  const gap = approvalGap();
  const field: CandidateInputs[] = [-1, 1].map((side) => ({
    id: `party:${side > 0 ? "R" : "D"}`,
    party: nationalParty(side),
    side,
    incumbent: incumbentRuns && side === sittingSide,
    // In an open race each major party's nominee has held office (stopgap
    // SG-HIST-century-nominees); a sitting President faces a typical challenger, as every race
    // the world counts from afar does in play (voting.ts decide). Experience counts only for a
    // non-incumbent, so a challenger with it would outweigh a President's incumbency every time.
    // stopgapId: SG-HIST-century-nominees
    experienced: !incumbentRuns,
    spentMinor: null,
    record: 0,
    presidentsParty: side === sittingSide,
    seatPartyHolder: side === sittingSide,
    partyTermsHeld: side === sittingSide ? partyTerms : 0,
  }));
  // Each ticket's campaign means (who exists), the same multiple of the typical in every state.
  const means = [-1, 1].map((side) =>
    campaignMeansOf(
      seed,
      incumbentRuns && side === sittingSide
        ? sitting!.presidentId
        : `presidential:${year}:${side}`,
    ),
  );
  // A party founded in an earlier year stands a ticket too (History 9b part 2, plan 6952133362):
  // no sitting holder, no office held, standing at the position it was founded at on the voters'
  // own lean scale. Its votes come out of the two sides' by the one count; it carries no state
  // yet (stopgap SG-HIST-century-founded-ticket).
  // stopgapId: SG-HIST-century-founded-ticket
  for (const founding of foundings)
    if (founding.year < year && founding.endedYear === undefined) {
      field.push({
        id: founding.id,
        party: null,
        side: 0,
        position: founding.position,
        pull: centuryParameter("centuryFoundedPartyPull"),
        incumbent: false,
        experienced: false,
        spentMinor: null,
        record: 0,
        presidentsParty: false,
        seatPartyHolder: false,
      });
      means.push(campaignMeansOf(seed, `presidential:${year}:${founding.id}`));
    }
  const states: CenturyStateVote[] = [];
  let republicanVotes = 0,
    democraticVotes = 0,
    foundedVotes = 0;
  for (const stateKey of stateKeys()) {
    const eligible = eligibleOf(seed, stateKey);
    const lean = leans[stateKey]!;
    const place: RacePlace = {
      id: `century:${stateKey}`,
      name: stateKey,
      eligible,
      rightShare: lean,
      votes2024: eligible,
      source: "The century's count (src/core2/electorate-century.ts)",
    };
    const ticket = field.map((candidate, i) => ({
      ...candidate,
      spentMinor: typicalSpendPerVote("president") * eligible * means[i]!,
    }));
    const conditions = {
      cycle: "presidential" as const,
      federal: true,
      typicalSpendPerVote: typicalSpendPerVote("president"),
      raceVotes: eligible,
      approvalGapPoints: gap,
      town: null,
    };
    const { share, cleared: clearedWithThird } = countSeat(
      voters,
      place,
      ticket,
      conditions,
    );
    // Where a state stands carries from the two national sides' own count: a third party's
    // voters leaving the two sides' count would otherwise push every state's two-party share
    // away from even, and the carry would ratchet the map apart each cycle. The third party
    // still moves the recorded vote and the electors.
    const cleared =
      ticket.length > 2
        ? countSeat(voters, place, ticket.slice(0, 2), conditions).cleared
        : clearedWithThird;
    republicanVotes += share.republican;
    democraticVotes += share.democratic;
    foundedVotes += share.founded ?? 0;
    states.push({
      stateKey,
      electors: ELECTORS.states[stateKey]!,
      lean,
      republicanShare: share.republicanShare,
      winnerSide:
        share.republicanShare > 0.5
          ? 1
          : share.republicanShare < 0.5
            ? -1
            : sittingSide,
    });
    results.add(stateKey, cleared);
  }
  const republican = states
    .filter((s) => s.winnerSide > 0)
    .reduce((n, s) => n + s.electors, 0);
  const democratic = states
    .filter((s) => s.winnerSide < 0)
    .reduce((n, s) => n + s.electors, 0);
  const majority =
    republican >= ELECTORS.toWin ? 1 : democratic >= ELECTORS.toWin ? -1 : 0;
  // No majority: the House chooses (amend. XII); the sitting side holds it until the century
  // counts the House (stopgap SG-HIST-century-contingent).
  // stopgapId: SG-HIST-century-contingent
  const winnerSide = majority || sittingSide;
  const total = republicanVotes + democraticVotes;
  const republicanShare = total ? republicanVotes / total : 0.5;
  const kept = incumbentRuns && winnerSide === sittingSide;
  const presidentId = kept
    ? sitting!.presidentId
    : `century:president:${year}:${winnerSide > 0 ? "R" : "D"}`;
  const start = termStartAfter(year);
  return {
    id: `century:presidential:${year}`,
    year,
    termStart: start,
    termEnd: termStartAfter(year + centuryParameter("presidentialTermYears")),
    winnerSide,
    winnerParty: nationalParty(winnerSide),
    presidentId,
    incumbentRan: incumbentRuns,
    personTerms: kept ? sitting!.personTerms + 1 : 1,
    partyTerms: winnerSide === sittingSide && sitting ? partyTerms + 1 : 1,
    republicanShare,
    winnerShare: winnerSide > 0 ? republicanShare : 1 - republicanShare,
    electoral: { republican, democratic },
    timeForChange: timeForChangeOf(field, gap),
    noMajority: majority === 0,
    votes: Math.round(total),
    ...(field.length > 2
      ? {
          foundedParty: {
            id: field[2]!.id,
            share: foundedVotes / (total + foundedVotes || 1),
          },
        }
      : {}),
    states,
  };
}

const SENATE_CLASSES = (
  senateClasses as unknown as {
    states: Record<string, { class: number; nextElection: number }[]>;
  }
).states;
const TENURE = (
  tenure as unknown as { parameters: Record<string, { value: number }> }
).parameters;

const STATE_OFFICES = (
  stateOfficeResearch as unknown as {
    places: Record<
      string,
      {
        executives?: {
          key: string;
          termYears?: number;
          nextRegularElectionYear?: number;
          termLimit?: { kind?: string; terms?: number };
        }[];
        legislature?: {
          chambers?: {
            chamber: string;
            termLimit?: { kind?: string; terms?: number; years?: number };
          }[];
        };
      }
    >;
  }
).places;
const STATEWIDE_PARTISAN = (
  statewideParties as unknown as {
    places: Record<string, Record<string, { partisanElection: boolean }>>;
  }
).places;

const LEGISLATURE_PARTIES = (
  legislatureParties as unknown as {
    places: Record<
      string,
      Record<string, { parties?: Record<string, number> } | undefined>
    >;
  }
).places;

/**
 * How many terms in a row a chamber's member may win, from the chamber's term limit in
 * data/research/offices/state-offices.json (in terms, or its years over the chamber's term);
 * undefined where the chamber has none. Today's limit binds from 1925 (stopgap
 * SG-HIST-century-term-limits-always), as the governors' do.
 */
// stopgapId: SG-HIST-century-term-limits-always
function chamberTermLimit(
  stateKey: string,
  rosterChamber: string,
  termYears: number,
): number | undefined {
  const chambers = STATE_OFFICES[stateKey]?.legislature?.chambers ?? [];
  const row =
    chambers.find((c) => c.chamber === rosterChamber) ??
    (chambers.length === 1 ? chambers[0] : undefined);
  const limit = row?.termLimit;
  if (!limit || !limit.kind || limit.kind === "none") return undefined;
  const terms =
    limit.terms ??
    (limit.years ? Math.floor(limit.years / termYears) : undefined);
  return terms && terms > 0 ? terms : undefined;
}

/**
 * Whether a chamber is elected on the two national sides: most of its published members belong
 * to a party with a side (data/research/offices/legislature-party-counts-2026.json, read for
 * which parties stand there, never who holds a seat). A chamber elected without party labels
 * (Nebraska's) or with a place's own parties, or with no party record, keeps what play reads
 * (stopgap SG-HIST-century-parties).
 */
function nationalChamber(stateKey: string, rosterChamber: string): boolean {
  const parties = LEGISLATURE_PARTIES[stateKey]?.[rosterChamber]?.parties;
  if (!parties) return false;
  let sided = 0,
    all = 0;
  for (const [party, members] of Object.entries(parties)) {
    all += members;
    if (partySide(party) !== 0) sided += members;
  }
  return all > 0 && sided * 2 > all;
}

/**
 * The party a side's winner in a chamber carries: the chamber's own largest published party of
 * that side (Minnesota's Democratic-Farmer-Labor, Puerto Rico's Partido Nuevo Progresista), else
 * the roster's national label for the side.
 */
/** A chamber's party label for a side, as the roster names it (the offices engine's party for a seat). */
export function chamberLabel(
  stateKey: string,
  rosterChamber: string | undefined,
  side: number,
): string {
  const parties = rosterChamber
    ? LEGISLATURE_PARTIES[stateKey]?.[rosterChamber]?.parties
    : undefined;
  let best: string | undefined,
    most = 0;
  for (const [party, members] of Object.entries(parties ?? {}))
    if (partySide(party) === side && members > most) {
      best = party;
      most = members;
    }
  return best ?? rosterLabel(side);
}

/**
 * Every statewide office elected on a party ballot, at every place that has one: the governor
 * and the other partisan executives, each with its term, a year of its cycle and its term limit
 * (data/research/offices/state-offices.json; which run with party labels from
 * statewide-executive-parties-2026.json's `partisanElection`, never its parties).
 */
// stopgapId: SG-HIST-century-tickets
function statewideExecutives(): readonly {
  stateKey: string;
  kind: string;
  termYears: number;
  cycleYear: number;
  termLimit?: number;
}[] {
  const out: {
    stateKey: string;
    kind: string;
    termYears: number;
    cycleYear: number;
    termLimit?: number;
  }[] = [];
  for (const stateKey of Object.keys(STATE_OFFICES).sort())
    for (const office of STATE_OFFICES[stateKey]!.executives ?? []) {
      if (!office.nextRegularElectionYear) continue;
      const partisan =
        office.key === "governor" ||
        STATEWIDE_PARTISAN[stateKey]?.[office.key]?.partisanElection === true;
      if (!partisan) continue;
      const limit =
        office.termLimit && office.termLimit.kind !== "none"
          ? office.termLimit.terms
          : undefined;
      out.push({
        stateKey,
        kind: office.key,
        termYears: office.termYears ?? 4,
        cycleYear: office.nextRegularElectionYear,
        ...(limit ? { termLimit: limit } : {}),
      });
    }
  return out;
}

/** How many races a seat keeps (the last races its holder's career and the past-election records read). */
const SEAT_RACES_KEPT = 3;

/** Whether a Senate class's regular election falls in `year` (class 1 in 2024, 2 in 2026, 3 in 2028, every six years). */
export function senateClassUp(senateClass: number, year: number): boolean {
  const base = centuryParameter("senateClassOneYear") + 2 * (senateClass - 1);
  return (((year - base) % 6) + 6) % 6 === 0;
}

/** A Senate class's next regular election on or after a date (that year's, until its November has passed). */
export function senateClassNext(senateClass: number, date: string): number {
  let year = Number(date.slice(0, 4));
  if (date.slice(0, 10) > electionDay(year)) year += 1;
  while (!senateClassUp(senateClass, year)) year += 1;
  return year;
}

/**
 * A holder's career, drawn once when they first win the seat (who exists): how many terms they
 * serve before they leave it open. Geometric, its mean the completed career that the mean service
 * of sitting members implies (a sitting member's service is a length-biased draw, about twice the
 * completed career less one term: tenure.json, CRS profile of the 118th Congress).
 */
function careerOf(
  seed: string,
  seatKey: string,
  year: number,
  chamber: "senate" | "house" | "executive" | "legislature" | "local",
  executiveTermYears = 4,
): number {
  const termYears =
    chamber === "senate" ? 6 : chamber === "house" ? 2 : executiveTermYears;
  const sitting =
    TENURE[
      chamber === "senate"
        ? "usSenateTenureYears"
        : chamber === "house"
          ? "usHouseTenureYears"
          : chamber === "legislature"
            ? "stateLegislatorTenureYears"
            : chamber === "local"
              ? "localOfficialTenureYears"
              : "statewideExecutiveTenureYears"
    ]!.value / termYears;
  const mean = Math.max(1, (sitting + 1) / 2);
  const p = 1 / mean;
  if (p >= 1) return 1;
  const u = seededUnit(seed, `century:career:${seatKey}:${year}`);
  return 1 + Math.floor(Math.log(1 - u) / Math.log(1 - p));
}

/**
 * A century candidate's campaign means against the typical race's, drawn once per person (who
 * exists: their donors, their own money, their party's backing), as a multiple of the typical
 * spending; the one race rule reads it through its spending reason (electorate-inputs.ts
 * candidateReasons), so two races of the same year and place no longer meet the same two
 * candidates (CTO line 6936407513: "let ... the candidates' own pull enter the count").
 */
function campaignMeansOf(seed: string, personKey: string): number {
  const spread = centuryParameter("centuryCampaignMeansLogSpread");
  const u = seededUnit(seed, `century:means:${personKey}`);
  return Math.exp(spread * (2 * u - 1));
}

/**
 * Where a place stood in 1925: a state's place on the lean order; a place with no presidential
 * vote (a territory, Puerto Rico) where its delegate's district opened (`openingSeats`), so its
 * legislative districts stand around its own seat in Congress.
 */
function placeOpeningLean(
  seed: string,
  leans: Readonly<Record<string, number>>,
  stateKey: string,
): number {
  const own = leans[stateKey];
  if (own !== undefined) return own;
  // stopgapId: SG-HIST-century-territory-opening-lean
  const delegate = `${stateKey}:house:${districtsOf(stateKey)[0] ?? "0"}`;
  return Math.max(
    0,
    Math.min(
      1,
      0.5 +
        centuryShift(seed, `century:lean:${delegate}`) *
          centuryParameter("centuryDistrictLeanSpread"),
    ),
  );
}

/**
 * Every state legislative seat in 1925, as the offices engine lists them (which seats exist,
 * their terms and their cycles, never who holds them): who holds it is the side its own district
 * leans to. The played town's state is counted seat by seat, every other state's chambers as
 * results (CTO line 6937011121).
 */
function openingLegislatures(
  seed: string,
  leans: Readonly<Record<string, number>>,
  districtLeans: Record<string, number>,
  startDate: string,
): Map<string, CenturySeat> {
  const first = centuryParameter("centuryFirstYear");
  const seats = new Map<string, CenturySeat>();
  const townState = townStates.get(seed);
  for (const stateKey of Object.keys(STATE_OFFICES).sort())
    for (const entry of stateOffices(stateKey, "", startDate)) {
      if (!entry.office.kind.startsWith("legislature-")) continue;
      const rosterChamber =
        entry.office.kind === "legislature-unicameral"
          ? "legislature"
          : entry.office.kind.slice("legislature-".length);
      if (!nationalChamber(stateKey, rosterChamber)) continue;
      const termYears = entry.office.termYears ?? 2;
      const termLimit = chamberTermLimit(stateKey, rosterChamber, termYears);
      for (const seat of entry.seats) {
        const key = seat.id;
        districtLeans[key] = Math.max(
          0,
          Math.min(
            1,
            placeOpeningLean(seed, leans, stateKey) +
              centuryShift(seed, `century:lean:${key}`) *
                centuryParameter("centuryDistrictLeanSpread"),
          ),
        );
        seats.set(key, {
          key,
          stateKey,
          chamber: "legislature",
          rosterKey: seat.district ?? "at-large",
          senateClass: 0,
          termYears,
          cycleYear:
            seat.electionYear ?? entry.office.nextElectionYear ?? first + 1,
          rosterChamber,
          officeId: entry.office.id,
          ...(termLimit ? { termLimit } : {}),
          ...(stateKey === townState ? {} : { hidden: true }),
          side: districtLeans[key]! >= 0.5 ? 1 : -1,
          holderId: `century:member:${key}:${first}`,
          firstWon: first,
          termsWon: 1,
          careerTerms: careerOf(seed, key, first, "legislature", termYears),
          races: [],
        });
      }
    }
  return seats;
}

/**
 * The year of the election behind a term that starts on `termStart`: the November before a term
 * that starts in the first quarter, else the lead the offices engine gives a local election
 * before the term (`localElectionLeadDays`), as `electionBehind` dates it. `fallback` where the
 * seat's term has no end.
 */
function localElectionYear(termStart: string | null, fallback: number): number {
  if (!termStart) return fallback;
  const year = Number(termStart.slice(0, 4));
  if (termStart.slice(5, 7) <= "03") return year - 1;
  const lead = TENURE.localElectionLeadDays?.value ?? 0;
  return Number(
    new Date(Date.parse(`${termStart}T00:00:00Z`) - lead * 86_400_000)
      .toISOString()
      .slice(0, 4),
  );
}

/**
 * The played town's own offices in 1925, as the offices engine lists them (`localOfficesForPlace`:
 * which seats exist, their terms and their cycles, never who holds them): a mayor, a council or
 * township board, the county's board and officers. Each seat stands where its state does, moved
 * by its own seeded shift, and carries its own electorate (the town's eligible voters, or the
 * county's; a ward seat its share of them). Local seats are counted seat by seat like the played
 * state's legislature, but only the played town's: every other place's local bodies are not run.
 */
// stopgapId: SG-HIST-century-local-leans
function openingLocal(
  seed: string,
  leans: Readonly<Record<string, number>>,
  districtLeans: Record<string, number>,
  townPlace: { key: string; geoid: string },
  stateKey: string,
  startDate: string,
): Map<string, CenturySeat> {
  const first = centuryParameter("centuryFirstYear");
  const placeKey = townPlace.key;
  const seats = new Map<string, CenturySeat>();
  const usps = stateKey.slice(3);
  const town = townEligibleVoters(placeKey, usps, seed);
  const counties = publishedStatePlaces(usps, seed);
  for (const office of localOfficesForPlace(placeKey)) {
    if (!office.elected) continue;
    const officeKey = office.id.slice("office:".length);
    const whole =
      office.level === "county"
        ? (counties.find(
            (place) => place.id === `county:${usps}|${office.governmentName}`,
          )?.eligible ?? town)
        : town;
    if (!whole || whole <= 0) continue;
    const termYears = office.termYears ?? 4;
    for (let index = 0; index < office.seats; index += 1) {
      const key = `seat:${officeKey}:${index}`;
      const ward =
        office.districted && index < (office.wardSeats ?? office.seats);
      districtLeans[key] = Math.max(
        0,
        Math.min(
          1,
          placeOpeningLean(seed, leans, stateKey) +
            centuryShift(seed, `century:lean:${key}`) *
              centuryParameter("centuryDistrictLeanSpread"),
        ),
      );
      seats.set(key, {
        key,
        stateKey,
        chamber: "local",
        rosterKey: ward ? String(index + 1) : "at-large",
        senateClass: 0,
        termYears,
        cycleYear: localElectionYear(
          seatTermEnd({
            office,
            seat: { index },
            stateKey,
            placeGeoid: townPlace.geoid,
            date: startDate,
          }),
          first + 1,
        ),
        officeId: office.id,
        eligible: ward
          ? whole / Math.max(1, office.wardSeats ?? office.seats)
          : whole,
        side: districtLeans[key]! >= 0.5 ? 1 : -1,
        holderId: `century:member:${key}:${first}`,
        firstWon: first,
        termsWon: 1,
        careerTerms: careerOf(seed, key, first, "local", termYears),
        races: [],
      });
    }
  }
  return seats;
}

/** Every seat in Congress in 1925: who holds it is the side its own place leans to. */
// stopgapId: SG-HIST-century-district-leans
function openingSeats(
  seed: string,
  leans: Readonly<Record<string, number>>,
  districtLeans: Record<string, number>,
): Map<string, CenturySeat> {
  const first = centuryParameter("centuryFirstYear");
  const seats = new Map<string, CenturySeat>();
  const add = (
    seat: Omit<
      CenturySeat,
      "side" | "holderId" | "firstWon" | "termsWon" | "careerTerms" | "races"
    >,
    lean: number,
  ) => {
    const side = lean >= 0.5 ? 1 : -1;
    seats.set(seat.key, {
      ...seat,
      side,
      holderId: `century:member:${seat.key}:${first}`,
      firstWon: first,
      termsWon: 1,
      careerTerms: careerOf(seed, seat.key, first, seat.chamber),
      races: [],
    });
  };
  for (const stateKey of Object.keys(SENATE_CLASSES).sort()) {
    const classes = [...SENATE_CLASSES[stateKey]!]
      .sort((a, b) => a.nextElection - b.nextElection)
      .slice(0, 2);
    classes.forEach((row, index) =>
      add(
        {
          key: `${stateKey}:senate:${index}`,
          stateKey,
          chamber: "senate",
          rosterKey: String(index),
          senateClass: row.class,
        },
        leans[stateKey] ?? 0.5,
      ),
    );
  }
  for (const office of statewideExecutives()) {
    const key = `${office.stateKey}:executive:${office.kind}`;
    seats.set(key, {
      key,
      stateKey: office.stateKey,
      chamber: "executive",
      rosterKey: office.kind,
      senateClass: 0,
      termYears: office.termYears,
      cycleYear: office.cycleYear,
      ...(office.termLimit ? { termLimit: office.termLimit } : {}),
      side: (leans[office.stateKey] ?? 0.5) >= 0.5 ? 1 : -1,
      holderId: `century:member:${key}:${first}`,
      firstWon: first,
      termsWon: 1,
      careerTerms: careerOf(seed, key, first, "executive", office.termYears),
      races: [],
    });
  }
  for (const stateKey of stateKeysWithHouse()) {
    for (const district of districtsOf(stateKey)) {
      const key = `${stateKey}:house:${district}`;
      // A district stands where its state does, moved by its own starting shift at the real
      // spread of districts within their states.
      districtLeans[key] = Math.max(
        0,
        Math.min(
          1,
          (leans[stateKey] ?? 0.5) +
            centuryShift(seed, `century:lean:${key}`) *
              centuryParameter("centuryDistrictLeanSpread"),
        ),
      );
      add(
        {
          key,
          stateKey,
          chamber: "house",
          rosterKey: district,
          senateClass: 0,
        },
        districtLeans[key]!,
      );
    }
  }
  return seats;
}

const districtLists = new Map<string, readonly string[]>();
/** A place's House districts as the roster keys them, read once. */
function districtsOf(stateKey: string): readonly string[] {
  let list = districtLists.get(stateKey);
  if (!list) {
    list = congressSeatKeys(stateKey);
    districtLists.set(stateKey, list);
  }
  return list;
}

/** Every place that sends a member to the House: the states, the District and the territories. */
function stateKeysWithHouse(): readonly string[] {
  return congressStateKeys();
}

/** Whether a seat is elected in `year`: the House every second year, the Senate by class, an executive by its cycle. */
function seatUp(seat: CenturySeat, year: number): boolean {
  if (seat.chamber === "house") return year % 2 === 0;
  if (seat.chamber === "senate")
    return year % 2 === 0 && senateClassUp(seat.senateClass, year);
  const term = seat.termYears ?? 4;
  return (((year - (seat.cycleYear ?? year)) % term) + term) % term === 0;
}

/**
 * One November's races for Congress and the statewide executives: every House seat, and the Senate seats whose class is up,
 * each counted in its own place on the one path. A holder runs again until their career ends.
 */
function congressElections(
  seed: string,
  year: number,
  seats: Map<string, CenturySeat>,
  leans: Readonly<Record<string, number>>,
  districtLeans: Readonly<Record<string, number>>,
  presidentSide: number,
  gap: number,
  voters: readonly SampleVoter[],
  results: YearResults,
  /** The count for other states' chambers, counted as results (`centuryHiddenVoters`). */
  hiddenVoters: readonly SampleVoter[] = voters,
): void {
  const cycle =
    year % 4 === 0 ? "presidential" : year % 2 === 0 ? "midterm" : "off-cycle";
  // stopgapId: SG-HIST-century-delegate-terms
  // stopgapId: SG-HIST-century-parties
  // Every other state's chambers: each district counted as its own place, with its chamber's
  // seats of one situation (the holder's side, whether they run) in one count (results; detail
  // on open).
  const hidden = new Map<string, CenturySeat[]>();
  for (const seat of seats.values()) {
    if (!seatUp(seat, year)) continue;
    if (seat.hidden) {
      const runs =
        seat.termsWon < Math.min(seat.careerTerms, seat.termLimit ?? Infinity);
      const group = `${seat.officeId}|${seat.side}|${runs}`;
      const list = hidden.get(group);
      if (list) list.push(seat);
      else hidden.set(group, [seat]);
      continue;
    }
    const house =
      seat.chamber === "house" ||
      seat.chamber === "legislature" ||
      seat.chamber === "local";
    const placeId = house ? seat.key : seat.stateKey;
    const lean =
      (house ? districtLeans[seat.key] : leans[seat.stateKey]) ?? 0.5;
    const stateEligible = eligibleOf(seed, seat.stateKey);
    // A place with no counted vote on record is not elected, as in play (voting.ts countedPlace):
    // its holder keeps the seat (stopgap SG-HIST-century-uncounted-seats).
    // stopgapId: SG-HIST-century-uncounted-seats
    if (stateEligible <= 0) continue;
    const eligible =
      seat.chamber === "local"
        ? (seat.eligible ?? 0)
        : house
          ? districtEligible(seed, seats, seat, stateEligible)
          : stateEligible;
    // A holder runs again until their career ends or the office's term limit stops them.
    const runs =
      seat.termsWon < Math.min(seat.careerTerms, seat.termLimit ?? Infinity);
    const family =
      seat.chamber === "house"
        ? "usHouse"
        : seat.chamber === "legislature"
          ? "stateLegislative"
          : seat.chamber === "local"
            ? "local"
            : "statewideExecutive";
    const typicalSpend = typicalSpendPerVote(family) * eligible;
    const field: CandidateInputs[] = [-1, 1].map((side) => ({
      id: `party:${side > 0 ? "R" : "D"}`,
      party: nationalParty(side),
      side,
      incumbent: runs && side === seat.side,
      // As a race the world counts from afar in play (voting.ts decide): a typical challenger.
      experienced: runs && side === seat.side,
      // Each candidate's own campaign means (who exists); a holder keeps theirs.
      spentMinor:
        typicalSpend *
        campaignMeansOf(
          seed,
          runs && side === seat.side
            ? seat.holderId
            : `${seat.key}:${year}:${side}`,
        ),
      record: 0,
      presidentsParty: side === presidentSide,
      seatPartyHolder: side === seat.side,
    }));
    const { share, cleared } = countSeat(
      voters,
      {
        id: `century:${placeId}`,
        name: placeId,
        eligible,
        rightShare: lean,
        votes2024: eligible,
        source: "The century's count (src/core2/electorate-century.ts)",
      },
      field,
      {
        cycle,
        federal: seat.chamber === "house" || seat.chamber === "senate",
        typicalSpendPerVote: typicalSpendPerVote(family),
        raceVotes: eligible,
        approvalGapPoints: gap,
        town: null,
      },
    );
    results.add(placeId, cleared);
    settle(seed, seat, year, share, runs, true);
  }
  for (const group of hidden.values())
    countChamberGroup(
      seed,
      year,
      group,
      seats,
      districtLeans,
      presidentSide,
      gap,
      cycle,
      hiddenVoters,
      results,
    );
}

/** The played town's local races over the century, by seed: elections held, holders who ran again, holders who won. */
const localTallies = new Map<
  string,
  { held: number; ran: number; kept: number }
>();

/** How the played town's local incumbents fared across the century's elections (a read for checks against real rates). */
export function centuryLocalTally(
  seed: string,
): Readonly<{ held: number; ran: number; kept: number }> | undefined {
  return localTallies.get(seed);
}

/**
 * A local race's ballots against the count's (the presidential year's turnout): the same year's
 * for a presidential November, a midterm's in an even year, and a local election off the federal
 * calendar's in an odd one (the past's sourced ratios, data/past/parameters.json).
 */
function localTurnoutRatio(year: number): number {
  if (year % 4 === 0) return 1;
  return pastParameter(
    null,
    year % 2 === 0 ? "pastMidtermTurnoutRatio" : "pastLocalTurnoutRatio",
  );
}

/** A seat after its race: the holder kept or replaced, and (for a seat a player can open) the race kept. */
function settle(
  seed: string,
  seat: CenturySeat,
  year: number,
  share: SeatCount,
  runs: boolean,
  keepRace: boolean,
): void {
  const winnerSide =
    share.republicanShare > 0.5
      ? 1
      : share.republicanShare < 0.5
        ? -1
        : seat.side;
  const kept = runs && winnerSide === seat.side;
  if (seat.chamber === "local") {
    const tally = localTallies.get(seed) ?? { held: 0, ran: 0, kept: 0 };
    tally.held += 1;
    if (runs) tally.ran += 1;
    if (kept) tally.kept += 1;
    localTallies.set(seed, tally);
  }
  if (kept) seat.termsWon += 1;
  else {
    seat.side = winnerSide;
    seat.holderId = `century:member:${seat.key}:${year}`;
    seat.firstWon = year;
    seat.termsWon = 1;
    seat.careerTerms = careerOf(
      seed,
      seat.key,
      year,
      seat.chamber,
      seat.termYears,
    );
  }
  seat.races.push({
    id: `century:${seat.key}:${year}`,
    year,
    winnerSide,
    winnerShare:
      winnerSide > 0 ? share.republicanShare : 1 - share.republicanShare,
    votes: Math.round(
      (share.republican + share.democratic) *
        (seat.chamber === "local" ? localTurnoutRatio(year) : 1),
    ),
    incumbentRan: runs,
  });
  // A seat of another state keeps only its last race, shown when someone opens its member.
  while (seat.races.length > (keepRace ? SEAT_RACES_KEPT : 1))
    seat.races.shift();
}

/**
 * One chamber's seats of one situation in a state other than the played town's (the holder's
 * side, whether they run), every district counted as its own place in one count on the one path:
 * the chamber's results, each seat keeping only its last race, read only when someone opens its
 * member (results, detail on open).
 */
function countChamberGroup(
  seed: string,
  year: number,
  group: readonly CenturySeat[],
  seats: ReadonlyMap<string, CenturySeat>,
  districtLeans: Readonly<Record<string, number>>,
  presidentSide: number,
  gap: number,
  cycle: "presidential" | "midterm" | "off-cycle",
  voters: readonly SampleVoter[],
  results: YearResults,
): void {
  const first = group[0]!;
  const stateEligible = eligibleOf(seed, first.stateKey);
  if (stateEligible <= 0) return;
  const typical = stateEligible / Math.max(1, districtCount(seats, first));
  const runs =
    first.termsWon < Math.min(first.careerTerms, first.termLimit ?? Infinity);
  const field: CandidateInputs[] = [-1, 1].map((side) => ({
    id: `party:${side > 0 ? "R" : "D"}`,
    party: nationalParty(side),
    side,
    incumbent: runs && side === first.side,
    experienced: runs && side === first.side,
    spentMinor: null,
    record: 0,
    presidentsParty: side === presidentSide,
    seatPartyHolder: side === first.side,
  }));
  const { reasons, counted } = countParties(
    voters,
    group.map((seat) => {
      const eligible = districtEligible(seed, seats, seat, stateEligible);
      return {
        id: seat.key,
        name: seat.key,
        eligible,
        rightShare: districtLeans[seat.key] ?? 0.5,
        votes2024: eligible,
        source: "The century's count (src/core2/electorate-century.ts)",
      };
    }),
    field,
    {
      cycle,
      federal: false,
      typicalSpendPerVote: typicalSpendPerVote("stateLegislative"),
      raceVotes: typical,
      approvalGapPoints: gap,
      town: null,
    },
  );
  const notCarried = notCarriedGap(reasons);
  group.forEach((seat, i) => {
    const votes = counted.places[i]!.votes;
    const republican = votes["party:R"] ?? 0;
    const democratic = votes["party:D"] ?? 0;
    const republicanShare = exactShare(
      counted.exact[i]!,
      districtLeans[seat.key] ?? 0.5,
    );
    results.add(seat.key, republicanShare - notCarried);
    settle(
      seed,
      seat,
      year,
      { republican, democratic, republicanShare },
      runs,
      false,
    );
  });
}

/**
 * A district's eligible voters: its share of the state's, its chamber's typical moved by the
 * district's own seeded size (who lives there, generation of who exists). Districts hold near
 * equal people by law, but not equal eligible voters (age and citizenship differ by district);
 * the spread is `centuryDistrictSizeSpread` (stopgap SG-HIST-century-district-sizes).
 */
// stopgapId: SG-HIST-century-district-sizes
function districtEligible(
  seed: string,
  seats: ReadonlyMap<string, CenturySeat>,
  seat: CenturySeat,
  stateEligible: number,
): number {
  const spread = centuryParameter("centuryDistrictSizeSpread");
  const u = seededUnit(seed, `century:size:${seat.key}`);
  return (
    (stateEligible / Math.max(1, districtCount(seats, seat))) *
    (1 + spread * (2 * u - 1))
  );
}

const districtCounts = new Map<string, number>();
/** How many seats share a seat's chamber (or its state's House delegation), read once. */
function districtCount(
  seats: ReadonlyMap<string, CenturySeat>,
  seat: CenturySeat,
): number {
  if (seat.chamber === "house") return districtsOf(seat.stateKey).length;
  const key = seat.officeId ?? seat.stateKey;
  let count = districtCounts.get(key);
  if (count === undefined) {
    count = 0;
    for (const other of seats.values())
      if (other.officeId === seat.officeId) count += 1;
    districtCounts.set(key, count);
  }
  return count;
}

/** Each chamber's seats by party now. */
function congressCount(
  year: number,
  seats: ReadonlyMap<string, CenturySeat>,
): CenturyCongress {
  const count = (chamber: "senate" | "house") => {
    let republican = 0,
      democratic = 0;
    for (const seat of seats.values())
      if (seat.chamber === chamber)
        if (seat.side > 0) republican += 1;
        else democratic += 1;
    return { republican, democratic };
  };
  return {
    id: `century:congress:${year}`,
    year,
    house: count("house"),
    senate: count("senate"),
  };
}

/** What the time-for-change reason cost each ticket in a race, read from the one race rule. */
function timeForChangeOf(
  field: readonly CandidateInputs[],
  gap: number,
): { side: number; share: number } {
  for (const candidate of field) {
    const reason = candidateReasons(candidate, {
      cycle: "presidential",
      federal: true,
      typicalSpendPerVote: 0,
      raceVotes: 1,
      approvalGapPoints: gap,
      town: null,
    }).timeForChange;
    if (reason !== 0) return { side: candidate.side, share: -reason };
  }
  return { side: 0, share: 0 };
}

/** The first Tuesday after the first Monday of November. */
function electionDay(year: number): string {
  for (let day = 2; day <= 8; day += 1) {
    const d = new Date(Date.UTC(year, 10, day));
    if (d.getUTCDay() === 2) return d.toISOString().slice(0, 10);
  }
  throw new Error(`No election day in ${year}`);
}

/**
 * The years the century steps through: from 1925 to the last year whose November election came
 * before the world was built (a world built for the warm-up in late November of the year before
 * day one holds that year's election; one built on day one, the January after it, holds it too).
 */
export function centuryYears(startDate: string): readonly number[] {
  const first = centuryParameter("centuryFirstYear");
  const year = Number(startDate.slice(0, 4));
  const last = electionDay(year) < startDate.slice(0, 10) ? year : year - 1;
  const years: number[] = [];
  for (let at = first; at <= last; at += 1) years.push(at);
  return years;
}

/**
 * The century a year at a step, giving each year back as it finishes (for the loading screen):
 * the elections due that year, then what they carried forward. The same century as one block.
 */
export function* runCentury(
  seed: string,
  startDate: string,
): Generator<{ year: number; done: number; total: number }, Century> {
  const years = centuryYears(startDate);
  const key = `${seed}|${years.at(-1) ?? ""}`;
  const known = centuries.get(key);
  if (known) {
    yield { year: years.at(-1) ?? 0, done: years.length, total: years.length };
    return known;
  }
  const opening = centuryOpening(seed);
  const leans: Record<string, number> = { ...opening.leans };
  const districtLeans: Record<string, number> = {};
  const seats = openingSeats(seed, leans, districtLeans);
  const voters = centuryVoters();
  const presidencies: CenturyPresidency[] = [];
  const congresses: CenturyCongress[] = [];
  const laws = new Map<string, CenturyLaw>();
  const governorSides = new Map<string, { year: number; side: number }[]>();
  const parties = [-1, 1].map((side) => ({
    id: `party:${side > 0 ? "R" : "D"}`,
    name: nationalParty(side),
    side,
    founded: null,
    positions: [] as { year: number; position: number }[],
  }));
  const foundings: CenturyFounding[] = [];
  const foundedShares = new Map<string, number[]>();
  let foundingPressure = 0;
  let sittingSide = opening.presidentSide;
  for (const [at, year] of years.entries()) {
    const results = new YearResults();
    // The Congress and the presidency of a November are counted under the sitting President.
    const sitting = presidencies.at(-1);
    congressElections(
      seed,
      year,
      seats,
      leans,
      districtLeans,
      sittingSide,
      approvalGap(),
      voters,
      results,
    );
    if (year % centuryParameter("presidentialTermYears") === 0) {
      const row = presidentialElection(
        seed,
        year,
        sittingSide,
        sitting,
        leans,
        voters,
        results,
        foundings,
      );
      presidencies.push(row);
      sittingSide = row.winnerSide;
      // A founded party whose share has fallen in each of several straight races merges into
      // the national party nearest it, and its ticket ends (History 9b part 3).
      const stood = row.foundedParty;
      if (stood) {
        const shares = foundedShares.get(stood.id) ?? [];
        shares.push(stood.share);
        foundedShares.set(stood.id, shares);
        if (foundedPartyHasFallen(shares)) {
          const at = foundings.findIndex((f) => f.id === stood.id);
          const founding = foundings[at]!;
          // Where the parties stood going into this election (the last November's).
          const nearest = nearestParty(parties, year, founding.position);
          foundings[at] = {
            ...founding,
            endedYear: year,
            mergedInto: nearest.id,
          };
        }
      }
    }
    if (year % 2 === 0) congresses.push(congressCount(year, seats));
    // Each governor's side as it changes (the legislatures' sessions read who signs).
    for (const seat of seats.values())
      if (seat.chamber === "executive" && seat.rosterKey === "governor") {
        const list = governorSides.get(seat.stateKey) ?? [];
        if (list.at(-1)?.side !== seat.side)
          list.push({ year, side: seat.side });
        governorSides.set(seat.stateKey, list);
      }
    // Each party stands where the members it now holds stand; Congress and the President then
    // sit, after each November of a Congress.
    if (year % 2 === 0) {
      const now = partyPositionsNow(seats, leans, districtLeans);
      for (const party of parties)
        party.positions.push({ year, position: now[party.side]! });
      if (year % centuryParameter("presidentialTermYears") === 0) {
        const step = foundingStep(
          voters,
          parties,
          year,
          foundingPressure,
          foundings.some((f) => f.endedYear === undefined),
        );
        foundingPressure = step.pressure;
        if (step.founding) foundings.push(step.founding);
      }
      lawSession(
        "US",
        year,
        congressChambers(seats, leans, districtLeans),
        sittingSide,
        sessionQuestions(true),
        laws,
        now,
      );
    }
    // Each place carries its year's results once (a state its presidential and Senate results).
    results.carry(leans, districtLeans);
    yield { year, done: at + 1, total: years.length };
  }
  const century: Century = {
    seed,
    opening,
    presidencies,
    leans,
    seats,
    congresses,
    districtLeans,
    laws,
    governorSides,
    parties,
    foundings,
  };
  centuries.set(key, century);
  return century;
}

const legislatureRuns = new Map<string, Map<string, CenturySeat>>();
const localRuns = new Map<string, ReadonlyMap<string, CenturySeat>>();

/**
 * The played state's last regular sitting before day one, the one the real bill engine runs in a
 * small world before the day-one world opens (owner, Nov 26, 2026, row 14: "last few sessions"),
 * and who sat for it: each legislative seat's side after the last even November before it, by the
 * offices engine's seat id. The century's own law session for that sitting (and every later one)
 * is not held for this state; the engine's sitting replaces it, and day one's own sitting runs on
 * the real engine as it always did.
 */
export interface PastSessionPlan {
  readonly stateKey: string;
  readonly sittingYear: number;
  readonly conveneAt: string;
  readonly adjournAt: string;
  readonly rosterYear: number;
  readonly roster: ReadonlyMap<
    string,
    { readonly side: number; readonly rosterChamber: string }
  >;
}

const pastPlans = new Map<string, PastSessionPlan>();

/**
 * The century's state legislatures, a pass of their own after the century's other offices: no
 * President, member of Congress or statewide officer reads a legislature's count, so it is run on
 * the loading screen after them (yielding a year at a time) and on first read everywhere else.
 * Each November counts under the President sitting then, on the one path; each district carries
 * its own results into the century's district leans. Empty under "today" readers' checks.
 */
export function* runLegislatures(
  seed: string,
  startDate: string,
): Generator<
  { year: number; done: number; total: number },
  ReadonlyMap<string, CenturySeat>
> {
  const years = centuryYears(startDate);
  const key = `${seed}|${years.at(-1) ?? ""}`;
  const known = legislatureRuns.get(key);
  if (known) {
    yield { year: years.at(-1) ?? 0, done: years.length, total: years.length };
    return known;
  }
  const century = centuryOf(seed, startDate);
  // The century's district leans are the one record of where every district stands.
  const districtLeans = century.districtLeans as Record<string, number>;
  const seats = openingLegislatures(
    seed,
    century.opening.leans,
    districtLeans,
    startDate,
  );
  const townPlace = townPlaces.get(seed);
  const townState = townStates.get(seed);
  // The played town's own offices run beside the legislatures, on the same yearly count.
  if (townPlace && townState)
    for (const [key, seat] of openingLocal(
      seed,
      century.opening.leans,
      districtLeans,
      townPlace,
      townState,
      startDate,
    ))
      seats.set(key, seat);
  const voters = centuryVoters();
  const stateLaws = new Map<string, CenturyLaw>();
  const pastSitting = townState ? townSittings.get(seed) : undefined;
  let pastRoster:
    | {
        year: number;
        roster: ReadonlyMap<
          string,
          { readonly side: number; readonly rosterChamber: string }
        >;
      }
    | undefined;
  const hiddenVoters = centuryVoters(centuryParameter("centuryHiddenVoters"));
  for (const [at, year] of years.entries()) {
    const results = new YearResults();
    // The President sitting that November: the last one elected before it.
    let sitting = century.opening.presidentSide;
    for (const row of century.presidencies)
      if (row.year < year) sitting = row.winnerSide;
    congressElections(
      seed,
      year,
      seats,
      century.leans,
      districtLeans,
      sitting,
      approvalGap(),
      voters,
      results,
      hiddenVoters,
    );
    results.carry(districtLeans);
    // Each state's legislature and governor sit after each even November.
    if (year % 2 === 0)
      for (const [stateKey, chambers] of stateChambers(seats, districtLeans)) {
        if (pastSitting && stateKey === townState) {
          // Who sat for the sitting: the seats after the last even November before it.
          if (year < pastSitting.year) {
            const roster = new Map<
              string,
              { side: number; rosterChamber: string }
            >();
            for (const seat of seats.values())
              if (seat.stateKey === stateKey && seat.chamber === "legislature")
                roster.set(seat.key, {
                  side: seat.side,
                  rosterChamber: seat.rosterChamber ?? "",
                });
            pastRoster = { year, roster };
          }
          // The engine's sitting replaces the century's session for it and every later one.
          if (year + 1 >= pastSitting.year) continue;
        }
        let governor = (century.leans[stateKey] ?? 0.5) >= 0.5 ? 1 : -1;
        for (const change of century.governorSides.get(stateKey) ?? [])
          if (change.year <= year) governor = change.side;
        lawSession(
          stateKey,
          year,
          chambers,
          governor,
          sessionQuestions(false),
          stateLaws,
          partyPositionsAt(century.parties, year),
        );
      }
    yield { year, done: at + 1, total: years.length };
  }
  // The played town's own offices ran beside the legislatures; they are read apart from them.
  const local = new Map<string, CenturySeat>();
  for (const [seatKey, seat] of [...seats])
    if (seat.chamber === "local") {
      local.set(seatKey, seat);
      seats.delete(seatKey);
    }
  localRuns.set(key, local);
  legislatureRuns.set(key, seats);
  legislatureLaws.set(key, stateLaws);
  if (townState && pastSitting && pastRoster)
    pastPlans.set(key, {
      stateKey: townState,
      sittingYear: pastSitting.year,
      conveneAt: pastSitting.conveneAt,
      adjournAt: pastSitting.adjournAt,
      rosterYear: pastRoster.year,
      roster: pastRoster.roster,
    });
  return seats;
}

const legislatureLaws = new Map<string, ReadonlyMap<string, CenturyLaw>>();

/** Congress at a session: the senators and the voting House members (of places with senators). */
function congressChambers(
  seats: ReadonlyMap<string, CenturySeat>,
  leans: Readonly<Record<string, number>>,
  districtLeans: Readonly<Record<string, number>>,
): SessionChamber[] {
  const senate: { side: number; lean: number }[] = [];
  const house: { side: number; lean: number }[] = [];
  const states = new Set<string>();
  for (const seat of seats.values())
    if (seat.chamber === "senate") {
      states.add(seat.stateKey);
      senate.push({
        side: seat.side,
        lean: 2 * (leans[seat.stateKey] ?? 0.5) - 1,
      });
    }
  for (const seat of seats.values())
    if (seat.chamber === "house" && states.has(seat.stateKey))
      house.push({
        side: seat.side,
        lean: 2 * (districtLeans[seat.key] ?? 0.5) - 1,
      });
  return [
    { chamber: "senate", body: "us-senate", members: senate },
    { chamber: "house", body: "us-house", members: house },
  ];
}

/** Each state's legislative chambers at a session, by state key. */
function stateChambers(
  seats: ReadonlyMap<string, CenturySeat>,
  districtLeans: Readonly<Record<string, number>>,
): Map<string, SessionChamber[]> {
  const byOffice = new Map<
    string,
    { stateKey: string; members: { side: number; lean: number }[] }
  >();
  for (const seat of seats.values()) {
    if (seat.chamber !== "legislature") continue;
    const office = seat.officeId ?? `${seat.stateKey}:${seat.rosterChamber}`;
    const row = byOffice.get(office) ?? {
      stateKey: seat.stateKey,
      members: [],
    };
    row.members.push({
      side: seat.side,
      lean: 2 * (districtLeans[seat.key] ?? 0.5) - 1,
    });
    byOffice.set(office, row);
  }
  const out = new Map<string, SessionChamber[]>();
  for (const [office, row] of [...byOffice].sort((a, b) =>
    a[0].localeCompare(b[0]),
  ))
    out.set(row.stateKey, [
      ...(out.get(row.stateKey) ?? []),
      { chamber: office, body: "legislature", members: row.members },
    ]);
  return out;
}

/**
 * The law in force on a policy question at a place on day one, as the century's bodies left it:
 * its last enactment or repeal, or none (no session ever passed it, so it is not law). Undefined
 * under "today" and at a place whose legislature the century does not elect.
 */
export function centuryLaw(
  seed: string,
  place: string,
  question: string,
): CenturyLaw | null | undefined {
  if (historyMode(seed) !== "century") return undefined;
  // Only the questions the century's bodies vote on: the nation's federal ones, a state's the rest.
  if (!sessionQuestions(place === "US").includes(question)) return undefined;
  const start = openingOf(seed);
  if (place === "US")
    return centuryOf(seed, start).laws.get(`US|${question}`) ?? null;
  const seats = centuryLegislatures(seed, start);
  if (![...seats.values()].some((seat) => seat.stateKey === place))
    return undefined;
  const key = `${seed}|${centuryYears(start).at(-1) ?? ""}`;
  return legislatureLaws.get(key)?.get(`${place}|${question}`) ?? null;
}

/**
 * The played state's last sitting before day one and who sat for it, for the small world that runs
 * it through the real bill engine; undefined under "today", where the century did not hold the
 * state's sessions, and for a state with no sitting in the years before day one.
 */
export function pastSessionPlan(seed: string): PastSessionPlan | undefined {
  if (historyMode(seed) !== "century") return undefined;
  const start = openingOf(seed);
  centuryLegislatures(seed, start);
  return pastPlans.get(`${seed}|${centuryYears(start).at(-1) ?? ""}`);
}

/** The century's state legislative seats by the offices engine's seat id, run on first read. */
export function centuryLegislatures(
  seed: string,
  startDate: string,
): ReadonlyMap<string, CenturySeat> {
  const run = runLegislatures(seed, startDate);
  for (;;) {
    const step = run.next();
    if (step.done) return step.value;
  }
}

/**
 * The played town's own offices by the offices engine's seat id (`seat:<office>:<index>`), run
 * with the legislatures on first read: empty where the build named no town.
 */
export function centuryLocalSeats(
  seed: string,
  startDate: string,
): ReadonlyMap<string, CenturySeat> {
  centuryLegislatures(seed, startDate);
  const years = centuryYears(startDate);
  return localRuns.get(`${seed}|${years.at(-1) ?? ""}`) ?? new Map();
}

/** A world's century, run once per seed and start year. */
export function centuryOf(seed: string, startDate: string): Century {
  const run = runCentury(seed, startDate);
  for (;;) {
    const step = run.next();
    if (step.done) return step.value;
  }
}

/** The presidency the century left for day one: the last election's term, or none under "today". */
export function centuryPresidency(
  seed: string,
  startDate: string,
): CenturyPresidency | undefined {
  if (historyMode(seed) !== "century") return undefined;
  return centuryOf(seed, startDate).presidencies.at(-1);
}

/** The century's presidential election of `year`, where the century ran it (none under "today"). */
export function centuryRace(
  seed: string,
  startDate: string,
  year: number,
): CenturyPresidency | undefined {
  if (historyMode(seed) !== "century") return undefined;
  return centuryOf(seed, startDate).presidencies.find(
    (row) => row.year === year,
  );
}

/**
 * The party holding a seat on day one by the century, where the century runs that seat (this
 * unit: the President and the Vice President, elected on one ticket); undefined where it does not,
 * or under "today".
 */
export function centurySeatParty(
  seed: string,
  startDate: string,
  office: { readonly kind: string; readonly jurisdiction: string },
  seat: { readonly id: string; readonly district?: string | null },
): string | undefined {
  if (office.kind === "president" || office.kind === "vice-president")
    return centuryPresidency(seed, startDate)?.winnerParty;
  const member = centuryCongressSeat(seed, startDate, office, seat);
  if (!member) return undefined;
  return member.chamber === "legislature"
    ? chamberLabel(member.stateKey, member.rosterChamber, member.side)
    : rosterLabel(member.side);
}

/**
 * Where the century left a district a race in play counts: a House district (by its state and
 * district code) or a state legislative seat (by the offices engine's seat id), on the lean order
 * a race's place stands on (`RacePlace.rightShare`), its results carried and cleared of what was
 * personal to the candidates. Undefined under "today" or for a district the century did not count.
 */
export function centuryDistrictLean(
  seed: string,
  district:
    | { readonly usps: string; readonly houseCode: string }
    | { readonly seatId: string },
): number | undefined {
  if (historyMode(seed) !== "century") return undefined;
  if ("seatId" in district)
    return centuryLegislatures(seed, openingOf(seed)).has(district.seatId)
      ? centuryOf(seed, openingOf(seed)).districtLeans[district.seatId]
      : undefined;
  const leans = centuryOf(seed, openingOf(seed)).districtLeans;
  const stateKey = `US-${district.usps}`;
  const code = Number(district.houseCode);
  return (
    leans[`${stateKey}:house:${Number.isFinite(code) ? code : 0}`] ??
    leans[`${stateKey}:house:0`]
  );
}

/**
 * The century's Congress as the roster keys it (electorate-places.ts `worldRoster`): each place's
 * Senate seats by index and each House seat by its district key, labeled with the roster's own
 * name for the holder's party. Undefined under "today".
 */
export function centuryCongressRoster(
  seed: string,
): Record<string, Record<string, string[]>> | undefined {
  if (historyMode(seed) !== "century") return undefined;
  const congress: Record<string, Record<string, string[]>> = {};
  const seats = [...centuryOf(seed, openingOf(seed)).seats.values()].sort(
    (a, b) => a.key.localeCompare(b.key),
  );
  for (const seat of seats) {
    // Congress only: the century's executives and state legislators are other offices.
    if (seat.chamber !== "senate" && seat.chamber !== "house") continue;
    const place = (congress[seat.stateKey] ??= {});
    if (seat.chamber === "senate")
      (place.senate ??= [])[Number(seat.rosterKey)] = rosterLabel(seat.side);
    else place[seat.rosterKey] = [rosterLabel(seat.side)];
  }
  return congress;
}

/**
 * The century's state legislatures as the roster keys them (electorate-places.ts `worldRoster`
 * places): each chamber's members and its seats by party, under the roster's labels. Undefined
 * under "today".
 */
export function centuryLegislatureRoster(
  seed: string,
):
  | Record<
      string,
      Record<string, { members: number; parties: Record<string, number> }>
    >
  | undefined {
  if (historyMode(seed) !== "century") return undefined;
  const places: Record<
    string,
    Record<string, { members: number; parties: Record<string, number> }>
  > = {};
  for (const seat of centuryLegislatures(seed, openingOf(seed)).values()) {
    if (!seat.rosterChamber) continue;
    const chambers = (places[seat.stateKey] ??= {});
    const chamber = (chambers[seat.rosterChamber] ??= {
      members: 0,
      parties: {},
    });
    const label = chamberLabel(seat.stateKey, seat.rosterChamber, seat.side);
    chamber.members += 1;
    chamber.parties[label] = (chamber.parties[label] ?? 0) + 1;
  }
  return places;
}

/**
 * The century's seat behind an offices seat: a seat in Congress (`seat:<state>:us-senate:<i>`,
 * `seat:<state>:us-house:<district>`) or a statewide executive (`seat:<state>:<office kind>`).
 */
/** Whether an office's jurisdiction is a town's, a township's or a county's: the nation's and the states' begin "US". */
function isLocalJurisdiction(jurisdiction: string): boolean {
  return !jurisdiction.startsWith("US");
}

/**
 * The keys the century may hold an office's seat under, in the order to try
 * them: a Senate seat by its index, a state legislative seat by the offices
 * engine's own seat id, a statewide executive by its kind, a House seat by its
 * district (an at-large state's one seat as district 0).
 */
export function centurySeatKeys(
  office: { readonly kind: string; readonly jurisdiction: string },
  seat: { readonly id: string; readonly district?: string | null },
): readonly string[] {
  const stateKey = office.jurisdiction;
  // A local office (the town's, a township's or the county's): the offices engine's own seat id.
  if (isLocalJurisdiction(stateKey)) return [seat.id];
  if (office.kind === "us-senate")
    return [`${stateKey}:senate:${seat.id.split(":").at(-1)}`];
  if (office.kind.startsWith("legislature-")) return [seat.id];
  const executive = `${stateKey}:executive:${office.kind}`;
  if (office.kind === "us-house" || office.kind === "us-house-delegate")
    return [
      executive,
      `${stateKey}:house:${String(Number(seat.district ?? 0))}`,
      `${stateKey}:house:0`,
    ];
  return [executive];
}

export function centuryCongressSeat(
  seed: string,
  date: string,
  office: { readonly kind: string; readonly jurisdiction: string },
  seat: {
    readonly id: string;
    readonly district?: string | null;
    readonly index?: number;
  },
): CenturySeat | undefined {
  if (historyMode(seed) !== "century") return undefined;
  // A state legislative seat is the legislatures' run's; every other the century's.
  const seats = office.kind.startsWith("legislature-")
    ? centuryLegislatures(seed, date)
    : !isLocalJurisdiction(office.jurisdiction)
      ? centuryOf(seed, date).seats
      : centuryLocalSeats(seed, date);
  for (const key of centurySeatKeys(office, seat)) {
    const held = seats.get(key);
    if (held) return held;
  }
  return undefined;
}

/** The century's race for a seat in Congress in a year, where the century ran it (none under "today"). */
export function centurySeatRace(
  seed: string,
  office: { readonly kind: string; readonly jurisdiction: string },
  seat: { readonly id: string; readonly district?: string | null },
  year: number,
): CenturySeatRace | undefined {
  return centuryCongressSeat(seed, openingOf(seed), office, seat)?.races.find(
    (race) => race.year === year,
  );
}

/** A century record's two-party votes cast, by its id (`century:presidential:<year>` or a seat's race). */
export function centuryRecordVotes(
  seed: string,
  recordId: string,
): number | undefined {
  const century = centuryOf(seed, openingOf(seed));
  const president = century.presidencies.find((row) => row.id === recordId);
  if (president) return president.votes;
  const seat =
    century.seats.get(recordId.slice("century:".length).replace(/:\d+$/, "")) ??
    centuryLegislatures(seed, openingOf(seed)).get(
      recordId.slice("century:".length).replace(/:\d+$/, ""),
    );
  return seat?.races.find((race) => race.id === recordId)?.votes;
}

/**
 * How many straight terms a side has held the White House going into the election of `year`:
 * the century's record, then the presidency's own races in play (`played`, oldest first).
 * 0 when the side does not hold it.
 */
export function presidencyPartyTerms(
  seed: string,
  startDate: string,
  side: number,
  played: readonly { readonly year: number; readonly winnerSide: number }[],
): number {
  const century =
    historyMode(seed) === "century"
      ? centuryOf(seed, startDate).presidencies
      : [];
  const last = century.at(-1)?.year ?? -Infinity;
  const sides = [
    ...century.map((row) => row.winnerSide),
    ...played.filter((row) => row.year > last).map((row) => row.winnerSide),
  ];
  let terms = 0;
  for (let i = sides.length - 1; i >= 0 && sides[i] === side; i -= 1)
    terms += 1;
  return terms;
}
