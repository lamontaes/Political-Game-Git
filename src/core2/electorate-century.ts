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
 * from the world's seed (`worldOffsetUnit`, the one draw), sized by the real map's spread. After
 * that no roll decides anything.
 *
 * It is a pure function of the world's seed, worked out once per seed and kept, so every reader
 * (the offices engine seating the President, the President's record, the past election behind the
 * term, the next race's time-for-change reason) reads the same century without a module of its own
 * at load. "Just like today" (`historyMode`) is the same build with today's real record in place of
 * the century's last step (CTO line 6935086070, point 5).
 *
 * It runs the presidency (pull request 1 of the History lane's plan, #9747) and Congress (pull
 * request 2): every House seat and the Senate by class. The states, the economy and the laws
 * follow, each on the same steps.
 */
import {
  candidateReasons,
  nationalParty,
  typicalSpendPerVote,
  type CandidateInputs,
} from "./electorate-inputs";
import { countParties, type RacePlace, type SampleVoter } from "./electorate";
import {
  congressSeatKeys,
  congressStateKeys,
  rosterLabel,
  statePlaces,
} from "./electorate-places";
import { seededUnit } from "./seeded";
import senateClasses from "../../data/research/offices/senate-classes-2026.json" with { type: "json" };
import { readinessOf } from "./turnout";
import { worldOffsetUnit } from "./world-draw";
import { gameStartDate } from "./game-start";
import tenure from "./data/offices/tenure.json" with { type: "json" };
import electorsData from "./data/elections/electoral-votes.json" with { type: "json" };
import data from "./data/history/century.json" with { type: "json" };

const PARAMS = (
  data as unknown as { parameters: Record<string, { value: number }> }
).parameters;

/** A century parameter (data/history/century.json). */
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
export function setHistoryMode(
  seed: string,
  mode: HistoryMode,
  startDate?: string,
): void {
  if (mode === "century") modes.delete(seed);
  else modes.set(seed, mode);
  if (startDate) openings.set(seed, startDate);
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
  readonly chamber: "senate" | "house";
  /** The seat in the roster: the Senate seat's index, or the House district as the roster keys it. */
  readonly rosterKey: string;
  /** A Senate seat's class (1 to 3); 0 for the House. */
  readonly senateClass: number;
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
  /** Every seat in Congress as the century left it, by key. */
  readonly seats: ReadonlyMap<string, CenturySeat>;
  /** Each chamber's party count after every November election, oldest first. */
  readonly congresses: readonly CenturyCongress[];
}

const centuries = new Map<string, Century>();

/** Each state's electors (the 2020 apportionment, for every year: stopgap SG-HIST-century-apportionment). */
// stopgapId: SG-HIST-century-apportionment
function stateKeys(): readonly string[] {
  return Object.keys(ELECTORS.states).sort();
}

/** The country in 1925: one starting shift for the nation and one for each state (who exists, not what happens). */
export function centuryOpening(seed: string): CenturyOpening {
  const national =
    worldOffsetUnit(seed, "century:lean:nation") *
    centuryParameter("centuryNationalLeanSpread");
  const leans: Record<string, number> = {};
  for (const key of stateKeys())
    leans[key] = Math.max(
      0,
      Math.min(
        1,
        0.5 +
          national +
          worldOffsetUnit(seed, `century:lean:${key}`) *
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
function centuryVoters(): readonly SampleVoter[] {
  const size = Math.max(1, Math.round(centuryParameter("centuryVoters")));
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
  const eligible = statePlaces(stateKey.slice(3), seed).reduce(
    (sum, place) => sum + place.eligible,
    0,
  );
  eligibles.set(key, eligible);
  return eligible;
}

/** A race's count in one place: the two parties' votes and the right's share of them. */
interface SeatCount {
  readonly republican: number;
  readonly democratic: number;
  readonly republicanShare: number;
}

/**
 * One race in one place on the one path (electorate.ts `countParties`): the count, and the
 * place's result cleared of what was personal to the two candidates (their incumbency and
 * experience), which is what carries into where the place stands; the year's tide stays in it.
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
  const republicanShare =
    republican + democratic
      ? republican / (republican + democratic)
      : place.rightShare;
  const personal = (side: number) => {
    const r = reasons.find((x) => x.side === side);
    return r ? r.incumbency + r.experience : 0;
  };
  return {
    share: { republican, democratic, republicanShare },
    cleared: republicanShare - (personal(1) - personal(-1)),
  };
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
   * Each place's lean moves to its own results' mean by the carry share (interim rule, to be
   * replaced by World B's one writer, `carryLean`, when it lands: #9747, World B 02:24Z).
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
    // A major party's nominee has held office (stopgap SG-HIST-century-nominees).
    // stopgapId: SG-HIST-century-nominees
    experienced: true,
    spentMinor: null,
    record: 0,
    presidentsParty: side === sittingSide,
    seatPartyHolder: side === sittingSide,
    partyTermsHeld: side === sittingSide ? partyTerms : 0,
  }));
  const states: CenturyStateVote[] = [];
  let republicanVotes = 0,
    democraticVotes = 0;
  for (const stateKey of stateKeys()) {
    const eligible = eligibleOf(seed, stateKey);
    const lean = leans[stateKey]!;
    const { share, cleared } = countSeat(
      voters,
      {
        id: `century:${stateKey}`,
        name: stateKey,
        eligible,
        rightShare: lean,
        votes2024: eligible,
        source: "The century's count (src/core2/electorate-century.ts)",
      },
      field,
      {
        cycle: "presidential",
        federal: true,
        typicalSpendPerVote: typicalSpendPerVote("president"),
        raceVotes: eligible,
        approvalGapPoints: gap,
        town: null,
      },
    );
    republicanVotes += share.republican;
    democraticVotes += share.democratic;
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
  chamber: "senate" | "house",
): number {
  const termYears = chamber === "senate" ? 6 : 2;
  const sitting =
    TENURE[chamber === "senate" ? "usSenateTenureYears" : "usHouseTenureYears"]!
      .value / termYears;
  const mean = Math.max(1, (sitting + 1) / 2);
  const p = 1 / mean;
  if (p >= 1) return 1;
  const u = seededUnit(seed, `century:career:${seatKey}:${year}`);
  return 1 + Math.floor(Math.log(1 - u) / Math.log(1 - p));
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
            worldOffsetUnit(seed, `century:lean:${key}`) *
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

/**
 * One November's races for Congress: every House seat, and the Senate seats whose class is up,
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
): void {
  const cycle = year % 4 === 0 ? "presidential" : "midterm";
  // stopgapId: SG-HIST-century-delegate-terms
  // stopgapId: SG-HIST-century-parties
  for (const seat of seats.values()) {
    if (seat.chamber === "senate" && !senateClassUp(seat.senateClass, year))
      continue;
    const house = seat.chamber === "house";
    const placeId = house ? seat.key : seat.stateKey;
    const lean =
      (house ? districtLeans[seat.key] : leans[seat.stateKey]) ?? 0.5;
    const stateEligible = eligibleOf(seed, seat.stateKey);
    const eligible = house
      ? stateEligible / Math.max(1, districtsOf(seat.stateKey).length)
      : stateEligible;
    const runs = seat.termsWon < seat.careerTerms;
    const field: CandidateInputs[] = [-1, 1].map((side) => ({
      id: `party:${side > 0 ? "R" : "D"}`,
      party: nationalParty(side),
      side,
      incumbent: runs && side === seat.side,
      // As a race the world counts from afar in play (voting.ts decide): a typical challenger.
      experienced: runs && side === seat.side,
      spentMinor: null,
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
        federal: true,
        typicalSpendPerVote: typicalSpendPerVote(
          house ? "usHouse" : "statewideExecutive",
        ),
        raceVotes: eligible,
        approvalGapPoints: gap,
        town: null,
      },
    );
    results.add(placeId, cleared);
    const winnerSide =
      share.republicanShare > 0.5
        ? 1
        : share.republicanShare < 0.5
          ? -1
          : seat.side;
    const kept = runs && winnerSide === seat.side;
    if (kept) seat.termsWon += 1;
    else {
      seat.side = winnerSide;
      seat.holderId = `century:member:${seat.key}:${year}`;
      seat.firstWon = year;
      seat.termsWon = 1;
      seat.careerTerms = careerOf(seed, seat.key, year, seat.chamber);
    }
    seat.races.push({
      id: `century:${seat.key}:${year}`,
      year,
      winnerSide,
      winnerShare:
        winnerSide > 0 ? share.republicanShare : 1 - share.republicanShare,
      votes: Math.round(share.republican + share.democratic),
      incumbentRan: runs,
    });
    if (seat.races.length > SEAT_RACES_KEPT) seat.races.shift();
  }
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
  let sittingSide = opening.presidentSide;
  for (const [at, year] of years.entries()) {
    const results = new YearResults();
    // The Congress and the presidency of a November are counted under the sitting President.
    const sitting = presidencies.at(-1);
    if (year % 2 === 0)
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
      );
      presidencies.push(row);
      sittingSide = row.winnerSide;
    }
    if (year % 2 === 0) congresses.push(congressCount(year, seats));
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
  };
  centuries.set(key, century);
  return century;
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
  return member ? rosterLabel(member.side) : undefined;
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
    const place = (congress[seat.stateKey] ??= {});
    if (seat.chamber === "senate")
      (place.senate ??= [])[Number(seat.rosterKey)] = rosterLabel(seat.side);
    else place[seat.rosterKey] = [rosterLabel(seat.side)];
  }
  return congress;
}

/** The century's seat in Congress behind an offices seat (`seat:<state>:us-senate:<i>`, `seat:<state>:us-house:<district>`). */
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
  const seats = centuryOf(seed, date).seats;
  const stateKey = office.jurisdiction;
  if (office.kind === "us-senate")
    return seats.get(`${stateKey}:senate:${seat.id.split(":").at(-1)}`);
  if (office.kind === "us-house" || office.kind === "us-house-delegate") {
    const district = String(Number(seat.district ?? 0));
    return (
      seats.get(`${stateKey}:house:${district}`) ??
      seats.get(`${stateKey}:house:0`)
    );
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
  for (const seat of century.seats.values())
    for (const race of seat.races) if (race.id === recordId) return race.votes;
  return undefined;
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
