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
 * This unit runs the presidency (pull request 1 of the History lane's plan, #9747). Congress, the
 * states, the economy and the laws follow, each on the same steps.
 */
import {
  appealOfShare,
  candidateReasons,
  nationalParty,
  typicalSpendPerVote,
  type CandidateInputs,
} from "./electorate-inputs";
import { countPlaces, type SampleVoter } from "./electorate";
import { statePlaces } from "./electorate-places";
import { readinessOf } from "./turnout";
import { worldOffsetUnit } from "./world-draw";
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

/**
 * Sets how a world's day one is made, by its seed: the build records the player's choice (a new
 * game's or dev mode's "Start from today's real record") before anything reads the offices.
 */
export function setHistoryMode(seed: string, mode: HistoryMode): void {
  if (mode === "century") modes.delete(seed);
  else modes.set(seed, mode);
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

export interface Century {
  readonly seed: string;
  readonly opening: CenturyOpening;
  /** Every presidential election, oldest first. */
  readonly presidencies: readonly CenturyPresidency[];
  /** Each state's place on the lean order after the century's last election. */
  readonly leans: Readonly<Record<string, number>>;
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

/** Each state's eligible voters: the people who live there now (stopgap SG-HIST-century-apportionment). */
function eligibleOf(seed: string, stateKey: string): number {
  return statePlaces(stateKey.slice(3), seed).reduce(
    (sum, place) => sum + place.eligible,
    0,
  );
}

/** The sitting President's standing with the country going into a race, in points from even. */
function approvalGap(sitting: CenturyPresidency | undefined): number {
  // The base a term opens at is the winner's share (national-opinion.ts, the first row of a
  // term); with no economic cycle in the century yet (stopgap SG-HIST-century-steady-economy)
  // nothing has moved it since.
  // stopgapId: SG-HIST-century-steady-economy
  return sitting ? sitting.winnerShare * 100 - 50 : 0;
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
  leans: Record<string, number>,
  voters: readonly SampleVoter[],
): CenturyPresidency {
  // stopgapId: SG-HIST-century-two-terms
  const incumbentRuns = Boolean(sitting && sitting.personTerms < 2);
  const partyTerms = sitting ? sitting.partyTerms : 1;
  const gap = approvalGap(sitting);
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
    const reasons = field.map((c) =>
      candidateReasons(c, {
        cycle: "presidential",
        federal: true,
        typicalSpendPerVote: typicalSpendPerVote("president"),
        raceVotes: eligible,
        approvalGapPoints: gap,
        town: null,
      }),
    );
    const counted = countPlaces(
      voters,
      [
        {
          id: `century:${stateKey}`,
          name: stateKey,
          eligible,
          rightShare: lean,
          votes2024: eligible,
          source: "The century's count (src/core2/century.ts)",
        },
      ],
      reasons.map((r, i) => ({
        id: r.id,
        side: r.side,
        isIncumbent: field[i]!.incumbent,
        standing: appealOfShare(r.total),
        localStanding: 0,
        recognition: 0,
        platform: [],
      })),
    );
    const rep = counted.votes["party:R"] ?? 0;
    const dem = counted.votes["party:D"] ?? 0;
    const share = rep + dem ? rep / (rep + dem) : lean;
    republicanVotes += rep;
    democraticVotes += dem;
    states.push({
      stateKey,
      electors: ELECTORS.states[stateKey]!,
      lean,
      republicanShare: share,
      winnerSide: share > 0.5 ? 1 : share < 0.5 ? -1 : sittingSide,
    });
    // The state's lean carries its own result forward, cleared of what was personal to the two
    // candidates (their incumbency and experience); the tide of the year stays in it.
    const personal = (side: number) => {
      const r = reasons.find((x) => x.side === side)!;
      return r.incumbency + r.experience;
    };
    const cleared = share - (personal(1) - personal(-1));
    const carry = centuryParameter("centuryLeanCarryShare");
    leans[stateKey] = Math.max(
      0,
      Math.min(1, lean * (1 - carry) + cleared * carry),
    );
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
  const voters = centuryVoters();
  const presidencies: CenturyPresidency[] = [];
  let sittingSide = opening.presidentSide;
  for (const [at, year] of years.entries()) {
    if (year % centuryParameter("presidentialTermYears") === 0) {
      const row = presidentialElection(
        seed,
        year,
        sittingSide,
        presidencies.at(-1),
        leans,
        voters,
      );
      presidencies.push(row);
      sittingSide = row.winnerSide;
    }
    yield { year, done: at + 1, total: years.length };
  }
  const century: Century = { seed, opening, presidencies, leans };
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
  office: { readonly kind: string },
): string | undefined {
  if (office.kind !== "president" && office.kind !== "vice-president")
    return undefined;
  return centuryPresidency(seed, startDate)?.winnerParty;
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
