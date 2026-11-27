/**
 * What the parts of voting.ts share: the declarations more than one of
 * them read, moved here so no part imports the entry (scripts/elections/split-module.ts).
 */
import { addDays, ageInYears, makeIsoDate } from "../kernel/dates";
import {
  type CountedAppeal,
  type CountedFieldEntry,
  type CountedVoter,
} from "../electorate";
import { VOTING_MODULE_ID } from "../voting-module-id";
import {
  applyElectionLaws,
  barredFromVoting,
  prisonPartOfBarredShare,
  prisonersBarredHere,
  recordRedistricting,
  electionLawTurnoutCost,
  automaticRegistrationInForce,
  sameDayRegistrationInForce,
} from "../law-reach/group-a-voting";
import { workFromHome } from "../coarse-place";
import type { CoreAPI, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import type { LifeStake } from "../life-stake-rule";
import { holdoverRule } from "../office-holdover";
import electionParameters from "../data/elections/parameters.json" with { type: "json" };
import {
  openNextContest,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./elections";
import { caseWarmthsOf } from "./constituent-cases";
import { type TermRow, servingTermsOnSeat } from "./offices";
import { drawOfficialIdentity } from "../officials-identity";
import { caucusSide, nationalParty, partySide } from "../appointments";
import {
  promisesOf,
  recordAppeal,
  votesCast,
  type RecordReason,
} from "./record";
import { CANDIDACY_MODULE_ID } from "./candidacy";
import { type CandidateReasons } from "../electorate-inputs";
import { scandalsOf } from "./corruption";
import { fileStandingCandidates } from "./voting-primary";
import type { TurnoutDecision, TurnoutRecordRow } from "./voting-turnout";
export {
  applyElectionLaws,
  automaticRegistrationInForce,
  barredFromVoting,
  electionLawTurnoutCost,
  prisonPartOfBarredShare,
  prisonersBarredHere,
  recordRedistricting,
  sameDayRegistrationInForce,
};
export { workFromHome };
export { holdoverRule };
export { caseWarmthsOf };
export { drawOfficialIdentity };
export { caucusSide, nationalParty, partySide };
export { promisesOf, recordAppeal, votesCast };
export type { RecordReason };
export { scandalsOf };

export function electionsParameter(key: string): number {
  const row = (
    electionParameters as unknown as {
      parameters: Record<string, { value: number }>;
    }
  ).parameters[key];
  if (!row) throw new Error(`Unknown elections parameter: ${key}`);
  return row.value;
}

export const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z]+/g, "-");

/** One named person's vote, with its reasons. */
export interface BallotRow {
  readonly id: string;
  readonly contestId: string;
  readonly voterId: string;
  readonly date: string;
  readonly voted: boolean;
  /** Why they did or didn't turn out, as their own numbers. */
  readonly turnoutReasons: {
    readonly duty: number;
    readonly interest: number;
    readonly cost: number;
    /** Their door "yes" as a word to vote, where they gave one. */
    readonly pledge?: number;
  };
  readonly choice: string | null;
  /** In an at-large race with several seats, every candidate the voter picked (the first is `choice`); absent in a one-seat race. */
  readonly choices?: readonly string[];
  /** Each candidate's appeal to this voter, and its parts. */
  readonly appeal: Readonly<
    Record<
      string,
      {
        readonly total: number;
        readonly warmth: number;
        readonly agreement: number | null;
        /** The candidate's party side against the voter's own views. */
        readonly party: number;
        /** The pull of the voter's own party tie. */
        readonly partyTie?: number;
        readonly record: number;
        /** How they stand with the candidate personally, where they know them. */
        readonly relationship?: number;
        /** Their own "yes" at the candidate's door, as far as it still holds. */
        readonly pledge?: number;
        /** How far that "yes" held on the ballot day, 0 to 1 (one less the doubt `pledgeDoubt` read then), kept so a later read of the ties and news cannot differ from it. */
        readonly pledgeHeld?: number;
      }
    >
  >;
  /**
   * What the choice rested on: the platforms the voter heard, or only what
   * the ballot and the town tell them (party, name, incumbency).
   */
  readonly basis?: "platform" | "party-name-incumbency";
  /** The voter's own left-right position the ballot weighed, -1 to 1. */
  readonly lean?: number;
  /** What they told the exit pollster. */
  readonly toldPollster: string | null;
  /** Why they told or declined: how closely they follow politics and how much the day's races mattered to them. */
  readonly pollsterReasons?: {
    readonly engagement: number;
    readonly interest: number;
    /** Their trait lean toward telling, before the decision's weight. */
    readonly lean: number;
  };
  /** Each incumbent's record as this voter weighed it, by candidate. */
  readonly recordReasons?: Readonly<Record<string, readonly RecordReason[]>>;
}

export interface ResultRow {
  readonly id: string;
  readonly contestId: string;
  readonly date: string;
  readonly namedVotes: Readonly<Record<string, number>>;
  /** The counted residents' votes, from their own records (two-level population). */
  readonly countedVotes: Readonly<Record<string, number>>;
  readonly countedTurnout: number;
  readonly countedEligible: number;
  /** Votes the rest of the race's electorate cast, counted coarsely place by place. */
  readonly placeVotes: Readonly<Record<string, number>>;
  readonly totals: Readonly<Record<string, number>>;
  readonly namedTurnout: number;
  readonly namedEligible: number;
  readonly electorate: number;
  readonly winnerId: string | null;
  /** Ballot identity retained for vote totals and filing provenance. */
  readonly winnerCandidateId?: string | null;
  readonly takesOffice: string | null;
  readonly exitPoll: Readonly<Record<string, number>>;
  /** Each candidate's public standing, where the race weighs it (a partisan state or federal race). */
  readonly electorateReasons?: readonly CandidateReasons[];
  /** Ballots the rest of the race's electorate cast. */
  readonly placesCast?: number;
  /** The recount the count's margin opened, by the place's rule. */
  readonly recountId?: string;
  /** The day the result was certified, where a recount held it until then. */
  readonly certifiedOn?: string;
}

/**
 * Every counted resident's ballot in one contest, kept by column (a town
 * holds thousands): each voter's own lean, the incumbent side of their
 * traits, their turnout reasons and choice, and the field they saw. A
 * ballot's appeal and its parts are the engine's own reading of these
 * (`countedBallotOf`), the same numbers it decided by.
 */
export interface CountedBallotsRow {
  readonly id: string;
  readonly contestId: string;
  readonly date: string;
  readonly field: readonly CountedFieldEntry[];
  readonly voterIds: readonly string[];
  /** The share of people like them who voted (their turnout propensity). */
  readonly voted: readonly number[];
  readonly lean: readonly number[];
  readonly incumbentLean: readonly number[];
  /** Each voter's trust in the press against the average reader (absent on rows kept before it was). */
  readonly trust?: readonly number[];
  readonly duty: readonly number[];
  readonly interest: readonly number[];
  readonly cost: readonly number[];
  /** Real voters each kept ballot stands for (absent on rows kept before the Census weight; one). */
  readonly weight?: readonly number[];
  /** Each voter's faith and degree against their age band's average (null where none is recorded; absent on rows kept before the loadings). */
  readonly faith?: readonly (number | null)[];
  readonly college?: readonly (number | null)[];
  /** How far what each voter's group has heard or lived has moved them on the field's platform questions, by question (null where nothing has; absent on rows kept before it was read). */
  readonly heard?: readonly (Readonly<Record<string, number>> | null)[];
  /** The world whose country's view of each question the voters' stances carried (`popularity`; absent on rows kept before it was). */
  readonly seed?: string;
  /** Each voter's circumstances and how much they weigh them, as the count read them (`stakeShift`; null where none; absent on rows kept before it was). */
  readonly life?: readonly (LifeStake | null)[];
  /** Each voter's door "yes" as it held on the day (null where they gave none; absent on rows kept before pledges). */
  readonly pledges?: readonly (Readonly<Record<string, number>> | null)[];
  /** What each voter's decided cases left them feeling toward each official on the ballot (null where they brought none; absent on rows kept before cases counted). */
  readonly warmths?: readonly (Readonly<Record<string, number>> | null)[];
  /** What the groups whose cause each voter shares brought them, by candidate (null where none; absent on rows kept before groups reached the counted). */
  readonly endorsed?: readonly (Readonly<Record<string, number>> | null)[];
  /** Where one household of a record's several gave a door "yes", the field index it voted for on its word (-1 otherwise). */
  readonly pledgedChoice?: readonly number[];
  /**
   * Each record's voters for each candidate before turnout, in field order:
   * its unpledged weight divided by the race's rule (`countedShareRule`: each
   * candidate's share of their appeal without party labels, whole to the
   * first with them), plus a pledged household's whole vote
   * (`countedDivision`; CTO, Nov 1). The count is each row times the
   * record's turnout (`voted`), all of it times the share of the town's
   * people who may vote (`countedScale`: citizens, less those barred for a
   * felony conviction).
   */
  readonly split: readonly (readonly number[])[];
}

/** One voter's turnout on a ballot: its parts and the propensity they came to. */
export interface TurnoutReasonsRecord {
  readonly duty: number;
  readonly interest: number;
  readonly cost: number;
  readonly stakes?: number;
  readonly reach?: number;
  readonly habit?: number;
  readonly propensity?: number;
  /** Their door "yes" as a word to vote, where they gave one. */
  readonly pledge?: number;
  /** The outcome web's month record that moved the propensity, and the links in it. */
  readonly web?: {
    readonly recordId: string;
    readonly links: readonly string[];
  };
}

/** One counted resident's ballot, with its reasons. */
export interface CountedBallotRow {
  readonly id: string;
  readonly contestId: string;
  readonly voterId: string;
  readonly date: string;
  readonly counted: true;
  /** The share of the town's people like them who voted: their propensity. */
  readonly turnout: number;
  readonly turnoutReasons: TurnoutReasonsRecord;
  /**
   * The record's voters for each candidate before turnout: its weight
   * divided among them by the race's rule (`countedShareRule`), a pledged
   * household whole. Its votes are these times `turnout` and the share who
   * may vote (`countedScale`).
   */
  readonly split: Readonly<Record<string, number>>;
  readonly appeal: Readonly<Record<string, CountedAppeal>>;
  readonly basis: "party-name-incumbency";
  readonly lean: number;
  /** Real voters this ballot stands for. */
  readonly weight: number;
}

export function table(api: CoreAPI, name: string) {
  return api.moduleState(VOTING_MODULE_ID).table(name);
}
export const ageOn = (
  p: Readonly<Pick<PersonState, "birthDate">>,
  date: string,
) => ageInYears(p.birthDate, date);

/** Put a contest's filing close, primary and election day on the calendar. */
export function scheduleContest(
  api: CoreAPI,
  contest: ContestRow,
  /** At the opening: a race closed before it waits for candidacy (`closeAtOpening`). */
  opening = false,
): void {
  const date = api.state.date;
  const calendar = api.moduleCalendar(VOTING_MODULE_ID);
  if (contest.electionDate <= date) return;
  const source = {
    tag: "SOURCED" as const,
    citation: contest.sources.join(" ; ") || "election calendar",
    asOf: date,
  };
  if (contest.filingDeadline > date)
    calendar.schedule({
      key: `filing-closes:${contest.id}`,
      date: contest.filingDeadline,
      kind: "filing-closes",
      source,
      sourceRecordIds: [contest.id],
    });
  // Closed before the record began: candidacy weighs the town's runners
  // first, then the field is finished (`closeAtOpening`). A deadline today,
  // or a race opened in play, is finished now.
  else if (
    !opening ||
    contest.filingDeadline >= date ||
    !api.state.modules.has(CANDIDACY_MODULE_ID)
  )
    fileStandingCandidates(api, contest.id);
  if (contest.primaryDate && contest.primaryDate > date)
    calendar.schedule({
      key: `primary:${contest.id}`,
      date: contest.primaryDate,
      kind: "primary",
      source,
      sourceRecordIds: [contest.id],
    });
  // The town's clerk posts one notice of election for each election day, some
  // days ahead, naming every office on that ballot (`postElectionNotice`).
  const noticeOn = addDays(
    makeIsoDate(contest.electionDate),
    -api.parameter("electionNoticeLeadDays"),
  );
  if (
    noticeOn > date &&
    !calendar.get(`election-notice:${contest.electionDate}`)
  )
    calendar.schedule({
      key: `election-notice:${contest.electionDate}`,
      date: noticeOn,
      kind: "election-notice",
      source: {
        tag: "ESTIMATED",
        citation: "electionNoticeLeadDays",
        asOf: date,
        estimatedFrom:
          "Places post the notice of election weeks ahead; the lead is a tagged parameter (electionNoticeLeadDays)",
      },
      sourceRecordIds: [contest.electionDate],
    });
  calendar.schedule({
    key: `election:${contest.id}`,
    date: contest.electionDate,
    kind: "election-day",
    source:
      contest.basis === "read"
        ? source
        : { ...source, tag: "ESTIMATED", estimatedFrom: source.citation },
    sourceRecordIds: [contest.id],
  });
}

/** Once a seat's contest is decided, its next cycle's contest opens. */
export function openNextCycle(api: CoreAPI, seatId: string): void {
  const next = openNextContest(api, seatId);
  if (next) scheduleContest(api, next);
}

export function town(api: CoreAPI) {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
  };
}

/**
 * Who holds a contest's seat today: the term serving on it, read from the
 * record (a winner, an appointee to a vacancy), never a term the contest
 * stored when it opened. Both tiers of voters read incumbency from here.
 */
export function seatHolder(
  api: CoreAPI,
  contest: Pick<ContestRow, "seatId">,
): TermRow | undefined {
  return servingTermsOnSeat(api, contest.seatId)[0] as unknown as
    TermRow | undefined;
}

/** Whether a candidate id is a term's holder. */
export function holds(term: TermRow | undefined, candidateId: string): boolean {
  return !!term && term.personId === candidateId;
}

/** A voter's turnout as their ballot keeps it. */
export function turnoutRecord(t: TurnoutDecision): TurnoutReasonsRecord {
  return {
    duty: t.duty,
    interest: t.interest,
    cost: t.cost,
    stakes: t.stakes,
    reach: t.reach,
    habit: t.habit,
    propensity: t.propensity,
    ...(t.pledge ? { pledge: t.pledge } : {}),
    ...(t.web ? { web: t.web } : {}),
  };
}

/** A voter who cast their own ballot by hand voted: their record says so. */
export function recordChosenVote(api: CoreAPI, voterId: string): void {
  const records = table(api, "turnout");
  const row = records.get(voterId) as unknown as TurnoutRecordRow | undefined;
  if (row)
    records.put({ ...row, voted: row.voted + 1 } as unknown as ModuleRow);
}
export const votersOfList = new WeakMap<
  readonly CountedVoter[],
  CountedVoter[]
>();
