/**
 * Elections, part two: election day, the count and taking office (golden path
 * steps 5 and 11).
 *
 * On a contest's election day, every named adult who lives where the seat is
 * elected decides whether to vote, from their own circumstances, and whom to
 * vote for, from what they know and think: their warmth toward each candidate
 * they've heard of (recorded causes), how far each known platform sits from
 * their own views, the candidates' parties and each incumbent's record. The
 * wider electorate the world doesn't name votes as groups by lean around the
 * district's real 2024 vote, sized to its real 2024 turnout, each group
 * recognizing candidates as the named people of its lean do (stand-in until
 * CORE's voter groups are populated: SG-GOV-voter-groups-stand-in). Nothing is
 * rolled. The winner takes the seat on the term's start date. Exit polls ask
 * named voters leaving the polls and report what they said.
 */
import federalExecutive from "../../../data/research/offices/federal-executive-2026.json" with { type: "json" };
import {
  NATIONAL_ENGAGEMENT,
  countedResidents,
  engagementOf,
  type CountedVoter,
} from "../electorate";
import {
  electionLawTurnoutCost,
  felonyDisenfranchisedShare,
} from "../law-reach/group-a-voting";
import ties from "../../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  campaignParameter,
  personLean,
  platformAgreement,
  type Stance,
} from "../campaign-views";
import { townDistrict } from "../offices-state";
import {
  openNextContest,
  specialContestFor,
  ELECTIONS_MODULE_ID,
  ballot,
  checkEligibility,
  fileCandidacy,
  filingOfficeFor,
  type ContestRow,
  type FilingRow,
} from "./elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  circulatePetition,
  impressionOf,
  parsePlatform,
} from "./campaigns";
import {
  OFFICES_MODULE_ID,
  registerSpecialElections,
  vacancyFilled,
  type TermRow,
} from "./offices";
import type { SeatInput } from "../offices-state";
import type { OfficeInput } from "../offices-local";
import { termEndAfter, termStartAfter } from "../elections-calendar";
import { drawOfficialIdentity } from "../officials-identity";
export { candidateIdentity } from "../candidate-identity";
import { partiesHere, partyTie } from "./parties";
import { recordAppeal, type RecordReason } from "./record";
import { CANDIDACY_MODULE_ID, decideToRun } from "./candidacy";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-");

export const VOTING_MODULE_ID = "core2-voting-v1";

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
  };
  readonly choice: string | null;
  /** Each candidate's appeal to this voter, and its parts. */
  readonly appeal: Readonly<
    Record<
      string,
      {
        readonly total: number;
        readonly warmth: number;
        readonly agreement: number | null;
        readonly party: number;
        readonly record: number;
      }
    >
  >;
  /** What they told the exit pollster. */
  readonly toldPollster: string | null;
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
  readonly groupVotes: Readonly<Record<string, number>>;
  readonly totals: Readonly<Record<string, number>>;
  readonly namedTurnout: number;
  readonly namedEligible: number;
  readonly electorate: number;
  readonly winnerId: string | null;
  readonly takesOffice: string | null;
  readonly exitPoll: Readonly<Record<string, number>>;
}

export const VOTING_MODULE: CoreModule = {
  id: VOTING_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      chosen: {},
      ballots: {
        indexes: {
          byContest: { fields: ["contestId"] },
          byVoter: { fields: ["voterId"] },
        },
      },
      results: { indexes: { byContest: { fields: ["contestId"] } } },
    },
  },
  onCalendarWork: votingCalendarWork,
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(VOTING_MODULE_ID).table(name);
}
const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

/** Put every contest's election day and the winner's first day on the calendar. */
export function openVoting(core: CoreState): void {
  if (!core.modules.has(VOTING_MODULE_ID)) registerModule(core, VOTING_MODULE);
  const api = coreAPI(core);
  // A vacancy's special election runs as a real race.
  registerSpecialElections((a, race) => {
    if (!a.state.modules.has(VOTING_MODULE_ID)) return false;
    const contest = specialContestFor(a, race);
    if (contest) scheduleContest(a, contest);
    return contest !== null;
  });
  for (const contest of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[])
    scheduleContest(api, contest);
}

/** Put a contest's filing close, primary and election day on the calendar. */
function scheduleContest(api: CoreAPI, contest: ContestRow): void {
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
  else fileStandingCandidates(api, contest.id);
  // In the town's own races, residents decide whether to run ahead of the
  // deadline (PEOPLE's candidacy chooser), with time to gather signatures.
  const lead = new Date(
    Date.parse(`${contest.filingDeadline}T00:00:00Z`) -
      campaignParameter("candidacyDecisionLeadDays") * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  if (LOCAL_LEVELS.has(contest.level) && contest.filingDeadline > date) {
    if (lead > date)
      calendar.schedule({
        key: `candidacy-window:${contest.id}`,
        date: lead,
        kind: "candidacy-window",
        source,
        sourceRecordIds: [contest.id],
      });
    else residentsDecide(api, contest.id);
  }
  if (contest.primaryDate && contest.primaryDate > date)
    calendar.schedule({
      key: `primary:${contest.id}`,
      date: contest.primaryDate,
      kind: "primary",
      source,
      sourceRecordIds: [contest.id],
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

function votingCalendarWork(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind === "candidacy-window")
    residentsDecide(api, work.sourceRecordIds[0]!);
  if (work.kind === "filing-closes")
    fileStandingCandidates(api, work.sourceRecordIds[0]!);
  if (work.kind === "primary") holdPrimary(api, work.sourceRecordIds[0]!);
  if (work.kind === "election-day") holdElection(api, work.sourceRecordIds[0]!);
  if (work.kind === "take-office") takeOffice(api, work.sourceRecordIds[0]!);
}

function town(api: CoreAPI) {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
  };
}
function townLean(api: CoreAPI): number {
  return (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { lean: number }
  ).lean;
}

/** A party's side of the left-right scale: -1 for the Democratic family, +1 Republican, 0 otherwise. */
function partySide(party: string | null): number {
  if (!party) return 0;
  if (/democrat|popular democr/i.test(party)) return -1;
  if (/republican|nuevo progresista/i.test(party)) return 1;
  return 0;
}

/**
 * What a candidate stands for, as the voter can know it: the stated platform
 * of a filing; an incumbent's record is the party side they sat with.
 */
function candidateFacts(api: CoreAPI, filing: FilingRow, contest: ContestRow) {
  const campaign = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("campaigns")
    .get(filing.id);
  const platform: readonly Stance[] = campaign
    ? (campaign as unknown as { platform: Stance[] }).platform
    : parsePlatform(filing.platform);
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const isIncumbent = incumbent?.personId === filing.personId;
  return { platform, party: filing.party ?? null, isIncumbent };
}

/**
 * One named voter's appeal for each candidate: warmth from what reached them,
 * agreement with the platform they know, party (in a partisan race, the side
 * of their own lean), and an incumbent's record (stand-in until the record
 * engine: a known incumbent's familiarity).
 */
function appealFor(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  contest: ContestRow,
  filings: readonly FilingRow[],
) {
  const lean = personLean(api.state.people, voter, townLean(api));
  const recordReasons: Record<string, readonly RecordReason[]> = {};
  const appeal: Record<
    string,
    {
      total: number;
      warmth: number;
      agreement: number | null;
      party: number;
      record: number;
    }
  > = {};
  for (const filing of filings) {
    const facts = candidateFacts(api, filing, contest);
    const impression = impressionOf(api, voter.id, filing.personId);
    const warmth = impression?.warmth ?? 0;
    const agreement = impression?.knowsPlatform
      ? platformAgreement(lean, facts.platform)
      : null;
    const tie = partyTie(api, voter.id);
    const loyal =
      tie?.partyId && facts.party && tie.partyId.endsWith(slug(facts.party))
        ? campaignParameter("partyLoyaltyWeight")
        : 0;
    const party = (facts.party ? lean * partySide(facts.party) : 0) + loyal;
    // The incumbent's record (votes, promises kept or broken), weighed by a
    // voter who knows the officeholder (golden path step 11).
    const knows =
      voter.knownIds.has(filing.personId) || (impression?.heardOf ?? false);
    const weighed = facts.isIncumbent
      ? recordAppeal(api, voter, filing.personId, lean, knows)
      : { total: 0, reasons: [] };
    const record = weighed.total;
    recordReasons[filing.personId] = weighed.reasons;
    appeal[filing.personId] = {
      total: warmth + (agreement ?? 0) + party + record,
      warmth,
      agreement,
      party,
      record,
    };
  }
  return { appeal, lean, recordReasons };
}

/** Whether a named adult votes: their sense of duty and interest in this race against what it costs them that day. */
export function turnout(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  appeal: Record<string, { total: number }>,
  /** A counted resident's scheduled weekly work, from their record. */
  recordedWeeklyMinutes?: number,
  /** What this election adds to the cost of voting (a primary's lower salience). */
  extraCost = 0,
) {
  // How closely they follow politics, where PEOPLE's views engine runs
  // (younger people follow less: CES 2024).
  const engagement = engagementOf(api.state as CoreState, voter);
  const duty =
    (voter.traits["personality-v1:facet-duty-bound"] ?? 0) +
    (voter.traits["people-mind-v1:reliability"] ?? 0) / 2 +
    (engagement === null
      ? 0
      : campaignParameter("turnoutEngagementWeight") *
        (engagement - NATIONAL_ENGAGEMENT));
  const totals = Object.values(appeal).map((a) => a.total);
  // How much they care: the strength of their strongest feeling in the race.
  const interest = totals.length ? Math.max(...totals.map(Math.abs)) : 0;
  const state = api.state as CoreState;
  const weeklyWork =
    recordedWeeklyMinutes ??
    [...(state.work.commitmentsByPerson.get(voter.id) ?? [])].reduce(
      (sum, id) =>
        sum + (state.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0),
      0,
    );
  // The election laws in force (voter ID, registration, mail voting).
  const cost =
    weeklyWork / campaignParameter("turnoutWorkWeekMinutes") -
    (voter.traits["people-mind-v1:deliberation"] ?? 0) / 2 +
    electionLawTurnoutCost(api, voter, weeklyWork);
  return {
    duty,
    interest,
    cost,
    votes:
      duty + interest + campaignParameter("turnoutBase") > cost + extraCost,
  };
}

const LOCAL_LEVELS = new Set(["city", "county", "township"]);

/**
 * Who runs in a town race: each full adult resident who meets the filing
 * rules (not the player, who files for themselves, nor the incumbent, who
 * stands again) decides through PEOPLE's candidacy chooser from their own
 * record. One who decides to run files, paying the fee where they can, and
 * circulates their own petition where the race takes signatures. Local
 * races are mostly nonpartisan, so they file without a party.
 */
function residentsDecide(api: CoreAPI, contestId: string): void {
  if (!api.state.modules.has(CANDIDACY_MODULE_ID)) return;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow | undefined;
  if (!contest) return;
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const rules = filingOfficeFor(api, contestId, "independent");
  const home = town(api).townPlaceId;
  const residents = [...api.state.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === home &&
        p.id !== api.state.playerId &&
        p.id !== incumbent?.personId,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const person of residents) {
    if (ballot(api, contestId).some((f) => f.personId === person.id)) continue;
    if (checkEligibility(api, person.id, contestId, null).some((c) => !c.met))
      continue;
    const decision = decideToRun(api, person.id, {
      contestId,
      officeName: contest.title,
      filingDeadline: contest.filingDeadline,
      feeMinor: rules.feeMinor ?? 0,
      ...(incumbent?.personId ? { incumbentId: incumbent.personId } : {}),
      sourceIds: [contestId],
    });
    if (!decision?.run) continue;
    const filed = fileCandidacy(api, {
      personId: person.id,
      contestId,
      platform: [],
      payFee: true,
      party: null,
    });
    if (filed.status === "gathering-signatures" && "filing" in filed)
      circulatePetition(api, {
        filingId: filed.filing.id,
        circulatorId: person.id,
        hours: campaignParameter("candidacyPetitionHours"),
      });
  }
}

/**
 * When filing closes: the incumbent stands again if they're alive and holding
 * the seat, and a state or federal race the town only sees from afar gets a
 * challenger from the other major party, a named official drawn from the
 * world seed. Stand-in until OPUS-PEOPLE's "who runs" decides each from their
 * own drives (M2-04): SG-GOV-who-runs-stand-in.
 */
export function fileStandingCandidates(api: CoreAPI, contestId: string): void {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  const onBallot = ballot(api, contestId);
  // stopgapId: SG-GOV-who-runs-stand-in
  api.stopgap("SG-GOV-who-runs-stand-in");
  // Whoever holds the seat when filing closes stands as its incumbent: an
  // appointee to a vacancy, never a holder who died or moved away.
  const incumbent =
    (api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [contest.seatId, "serving"])[0] as unknown as
      TermRow | undefined) ??
    (contest.incumbentTermId
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .get(contest.incumbentTermId) as unknown as TermRow | undefined)
      : undefined);
  const put = (personId: string, party: string | null, how: string) => {
    if (onBallot.some((f) => f.personId === personId)) return;
    filings.put({
      id: `filing:${contestId}:${personId}`,
      contestId,
      personId,
      filedOn: api.state.date,
      filedWith: how,
      platform: [],
      party,
      feePaidMinor: 0,
      signatureCount: 0,
      status: "on-ballot",
    } as unknown as ModuleRow);
  };
  const alive =
    incumbent &&
    incumbent.status === "serving" &&
    (!incumbent.personId || api.state.people.get(incumbent.personId)?.alive);
  if (incumbent && alive && !termLimited(api, contest, incumbent))
    put(
      incumbent.personId ?? officialCandidateId(incumbent.id),
      incumbent.party,
      "incumbent stands again",
    );
  if (
    (contest.level === "federal" || contest.level === "state") &&
    incumbent &&
    partySide(incumbent.party) !== 0
  ) {
    const other = partySide(incumbent.party) > 0 ? "Democratic" : "Republican";
    // Only where no one from the other major party filed (the player, a
    // resident): a filed candidate is that party's challenger.
    if (
      !onBallot.some(
        (f) =>
          f.status === "on-ballot" &&
          partySide(f.party ?? null) === -partySide(incumbent.party),
      )
    )
      put(officialCandidateId(`challenger:${contest.id}`), other, "challenger");
    // An open seat: the incumbent's party nominates someone new.
    if (termLimited(api, contest, incumbent))
      put(
        officialCandidateId(`nominee:${contest.id}`),
        incumbent.party,
        "nominee for an open seat",
      );
  }
  // A partisan state or federal seat with no one holding it (a special
  // election's vacancy): each major party with no filed candidate nominates.
  const seatParty = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("seats")
      .get(contest.seatId) as unknown as { party?: string | null } | undefined
  )?.party;
  if (
    (contest.level === "federal" || contest.level === "state") &&
    !(incumbent && alive) &&
    seatParty
  )
    for (const party of ["Democratic", "Republican"])
      if (
        !ballot(api, contestId).some(
          (f) =>
            f.status === "on-ballot" &&
            partySide(f.party ?? null) === partySide(party),
        )
      )
        put(
          officialCandidateId(`nominee:${party}:${contest.id}`),
          party,
          "nominee for an open seat",
        );
}

/**
 * Whether the incumbent may not stand again. The presidency: no one is
 * elected more than twice (U.S. Const. amend. XXII), counting the opening
 * holder's terms from the record.
 */
function termLimited(
  api: CoreAPI,
  contest: ContestRow,
  incumbent: TermRow,
): boolean {
  if (contest.officeId !== "office:US:president") return false;
  const opening = (
    federalExecutive as unknown as { president: { termNumber?: number } }
  ).president.termNumber;
  const served =
    incumbent.reached === "in office at the opening"
      ? (opening ?? 1)
      : (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("terms")
            .query("bySeatStatus", [
              contest.seatId,
              "ended",
            ]) as unknown as TermRow[]
        ).filter(
          (t) =>
            t.identity.givenName === incumbent.identity.givenName &&
            t.identity.familyName === incumbent.identity.familyName,
        ).length + 1;
  return served >= 2;
}

/** A named official on the ballot who isn't a full person in the world yet. */
export function officialCandidateId(key: string): string {
  return `official:${key}`;
}

/**
 * The primary, by the state's method. A party primary picks one nominee per
 * party from that party's voters (and independents where the state lets
 * them in); a top-two or top-four primary puts every candidate before every
 * voter and sends the top finishers on. Candidates who don't advance leave
 * the November ballot. Counted from the named voters, the sample of the
 * party's electorate the world names.
 */
export function holdPrimary(
  api: CoreAPI,
  contestId: string,
): Readonly<Record<string, number>> {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  const filings = ballot(api, contestId);
  const parties = partiesHere(api);
  const method = parties[0]?.nominationMethod ?? "party-primary";
  const access = parties[0]?.voterAccess ?? "";
  const date = api.state.date;
  const { townPlaceId } = town(api);
  const lean0 = townLean(api);
  const named = [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === townPlaceId && ageOn(p, date) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id));
  const counted = countedResidents(api.state as CoreState).filter(
    (v) => v.placeId === townPlaceId && ageOn(v, date) >= 18,
  );
  // Who identifies with a party: the firmest leans in town, at the real
  // identifier share (the same rule the parties engine ties named people by).
  const leanOf = new Map<string, number>(
    [...named, ...counted].map((v) => [
      v.id,
      personLean(api.state.people, v, lean0),
    ]),
  );
  const firm = [...leanOf.values()].map(Math.abs).sort((a, b) => b - a);
  const cut =
    firm[
      Math.max(
        0,
        Math.round(firm.length * campaignParameter("partyIdentifierShare")) - 1,
      )
    ] ?? 0;
  const extraCost = campaignParameter("primaryTurnoutCost");
  const votes: Record<string, number> = {};
  let townVoted = 0;
  // Named voters: what reached them, as on election day.
  const countNamed = (
    field: readonly FilingRow[],
    who: readonly PersonState[],
  ) => {
    for (const voter of who) {
      const { appeal } = appealFor(api, voter, contest, field);
      const t = turnout(api, voter, appeal, undefined, extraCost);
      if (!t.votes) continue;
      townVoted += 1;
      const ranked = Object.entries(appeal).sort(
        (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
      );
      if (ranked.length > 1 && ranked[0]![1].total === ranked[1]![1].total)
        continue;
      if (ranked[0]) votes[ranked[0][0]] = (votes[ranked[0][0]] ?? 0) + 1;
    }
  };
  // Counted voters: no campaign reached them; the ballot names the
  // incumbent, and with no incumbent in the field they leave it blank.
  const countCounted = (
    field: readonly FilingRow[],
    who: readonly CountedVoter[],
  ) => {
    const incumbent = field.find(
      (f) => candidateFacts(api, f, contest).isIncumbent,
    );
    for (const voter of who) {
      const appeal: Record<string, { total: number }> = {};
      for (const f of field)
        appeal[f.personId] = {
          total:
            f === incumbent ? campaignParameter("incumbentRecognition") : 0,
        };
      const t = turnout(api, voter, appeal, voter.weeklyMinutes, extraCost);
      if (!t.votes) continue;
      townVoted += 1;
      if (incumbent)
        votes[incumbent.personId] = (votes[incumbent.personId] ?? 0) + 1;
    }
  };
  const lose = (filing: FilingRow) =>
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put({ ...filing, status: "withdrawn" } as unknown as ModuleRow);
  const advancing = method === "top-two" ? 2 : method === "top-four" ? 4 : 0;
  if (advancing) {
    countNamed(filings, named);
    countCounted(filings, counted);
    addPrimaryGroups(api, contest, filings, null, votes, townVoted);
    filings
      .slice()
      .sort(
        (a, b) =>
          (votes[b.personId] ?? 0) - (votes[a.personId] ?? 0) ||
          a.personId.localeCompare(b.personId),
      )
      .slice(advancing)
      .forEach(lose);
  } else {
    const byParty = new Map<string, FilingRow[]>();
    for (const f of filings)
      if (f.party) byParty.set(f.party, [...(byParty.get(f.party) ?? []), f]);
    for (const [party, field] of byParty) {
      if (field.length < 2) continue;
      const open = /open|unaffiliated|independ/i.test(access);
      const side = partySide(party);
      const before = townVoted;
      countNamed(
        field,
        named.filter((v) => {
          const tie = partyTie(api, v.id);
          return (
            (tie?.partyId?.endsWith(slug(party)) ?? false) ||
            (open && tie?.tie !== "party")
          );
        }),
      );
      countCounted(
        field,
        counted.filter((v) => {
          const lean = leanOf.get(v.id) ?? 0;
          const identifies = Math.abs(lean) >= cut && lean !== 0;
          return (
            (identifies && side !== 0 && Math.sign(lean) === side) ||
            (open && !identifies)
          );
        }),
      );
      addPrimaryGroups(api, contest, field, side, votes, townVoted - before);
      const ranked = field
        .slice()
        .sort(
          (a, b) =>
            (votes[b.personId] ?? 0) - (votes[a.personId] ?? 0) ||
            a.personId.localeCompare(b.personId),
        );
      // An exact tie at the top eliminates no one (the law's tie rule is
      // applied by the officials, not modeled yet).
      if (
        (votes[ranked[0]!.personId] ?? 0) === (votes[ranked[1]!.personId] ?? 0)
      )
        continue;
      const winner = ranked[0]!;
      field.filter((f) => f !== winner).forEach(lose);
    }
  }
  api.emit({
    id: `primary-result:${contestId}`,
    date,
    kind: "primary-result",
    personIds: filings
      .map((f) => f.personId)
      .filter((id) => api.state.people.has(id)),
    placeId: townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Primary count of ${contestId}`,
      asOf: date,
    },
    publicRecord: true,
    news: true,
    facts: { contestId, method, votes: JSON.stringify(votes) },
  });
  return votes;
}

/**
 * The primary's wider electorate beyond the town's own voters: the party's
 * share of the race's electorate (its 2024 lean) at primary turnout, voting
 * in the proportions the town's primary voters chose. With no town choices
 * to follow, they add nothing.
 */
function addPrimaryGroups(
  api: CoreAPI,
  contest: ContestRow,
  field: readonly FilingRow[],
  side: number | null,
  votes: Record<string, number>,
  townVoted: number,
): void {
  const chose = field.reduce((n, f) => n + (votes[f.personId] ?? 0), 0);
  if (!chose) return;
  const right = electorateRightShare(api, contest) ?? (1 + townLean(api)) / 2;
  const partyShare =
    side === null ? 1 : side > 0 ? right : side < 0 ? 1 - right : 0;
  const electorate = Math.round(
    electorateSize(api, contest, townVoted) *
      partyShare *
      campaignParameter("primaryShareOfGeneral"),
  );
  const unnamed = Math.max(0, electorate - townVoted);
  const counts = field.map((f) => votes[f.personId] ?? 0);
  for (const [index, f] of field.entries())
    votes[f.personId] =
      counts[index]! + Math.round((unnamed * counts[index]!) / chose);
}

const polls = new WeakMap<object, Map<string, ReturnType<typeof turnout>>>();

/**
 * Whether a voter goes to the polls on an election day: once for the whole
 * ballot, drawn by the race they feel most strongly about (a voter who turns
 * out for governor also sees the county races; with no preference in one,
 * they leave it blank).
 */
function atThePolls(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">> & {
    readonly birthDate: string;
  },
  date: string,
  cycleCost: number,
  recordedWeeklyMinutes?: number,
): ReturnType<typeof turnout> {
  const map = polls.get(api.state) ?? new Map();
  polls.set(api.state, map);
  const key = `${date}|${voter.id}`;
  const hit = map.get(key);
  if (hit) return hit;
  const named = api.state.people.get(voter.id);
  const lean = personLean(api.state.people, voter, townLean(api));
  let strongest = 0;
  for (const contest of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[]) {
    if (contest.electionDate !== date) continue;
    const field = ballot(api, contest.id);
    if (!field.length) continue;
    const totals = named
      ? Object.values(appealFor(api, named, contest, field).appeal).map(
          (a) => a.total,
        )
      : field.map((f) => {
          const party = candidateFacts(api, f, contest).party;
          return party ? lean * partySide(party) : 0;
        });
    for (const total of totals)
      strongest = Math.max(strongest, Math.abs(total));
  }
  const t = turnout(
    api,
    voter,
    { strongest: { total: strongest } },
    recordedWeeklyMinutes,
    cycleCost,
  );
  map.set(key, t);
  return t;
}

const tieRules = (
  ties as unknown as {
    states: Record<string, Record<string, { method: string; detail?: string }>>;
  }
).states;

/**
 * An exact tie, settled the way the state's law says
 * (`data/research/elections/tie-rules-2026.json`): by lot, by a second
 * election between the tied candidates, or by the legislature (statewide
 * offices) or local governing body choosing, each member for their own
 * reasons. Returns the winner, or null when a second election will decide.
 */
export function breakElectionTie(
  api: CoreAPI,
  contest: ContestRow,
  tied: readonly string[],
): string | null {
  const field =
    contest.family === "statewideExecutive"
      ? "statewideExecutiveTie"
      : contest.family === "stateLegislative"
        ? "legislativeTie"
        : contest.family === "countyOffice" ||
            contest.family === "municipalOffice"
          ? "localTie"
          : "generalElectionTie";
  const rule = tieRules[town(api).stateKey]?.[field]?.method ?? "lot";
  const sorted = [...tied].sort();
  if (rule === "new-election" || rule === "runoff") {
    secondElection(api, contest, sorted);
    return null;
  }
  if (rule === "legislature-decides" || rule === "board-decides") {
    const body = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
      }[]
    ).find((o) =>
      rule === "legislature-decides"
        ? o.kind.startsWith("legislature-")
        : o.kind === "council" || o.kind === "county-board",
    );
    const terms = body
      ? (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("seats")
            .query("byOffice", [body.id]) as unknown as { id: string }[]
        ).flatMap(
          (seat) =>
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("terms")
              .query("bySeatStatus", [
                seat.id,
                "serving",
              ]) as unknown as TermRow[],
        )
      : [];
    // Each member backs the tied candidate whose party sits on their side.
    const filings = ballot(api, contest.id);
    const tally = new Map<string, number>();
    for (const term of terms) {
      const side = partySide(term.party);
      const pick = sorted.find(
        (id) =>
          partySide(filings.find((f) => f.personId === id)?.party ?? null) ===
            side && side !== 0,
      );
      if (pick) tally.set(pick, (tally.get(pick) ?? 0) + 1);
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    if (best.length && (best.length === 1 || best[0]![1] > best[1]![1]))
      return best[0]![0];
  }
  // By lot, where the law says so: the game holds a second election between
  // the tied candidates instead, since no draw decides an outcome (owner's
  // no-dice rule; the question is in gov.md): SG-GOV-tie-by-lot.
  // stopgapId: SG-GOV-tie-by-lot
  api.stopgap("SG-GOV-tie-by-lot");
  secondElection(api, contest, sorted);
  return null;
}

/** A second election between the tied candidates, a tunable number of weeks on. */
function secondElection(
  api: CoreAPI,
  contest: ContestRow,
  tied: readonly string[],
): void {
  const date = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) +
      campaignParameter("tieElectionDays") * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const next: ContestRow = {
    ...contest,
    id: `${contest.id}:second`,
    electionDate: date,
    primaryDate: null,
    filingDeadline: api.state.date,
  };
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .put(next as unknown as ModuleRow);
  for (const f of ballot(api, contest.id).filter((f) =>
    tied.includes(f.personId),
  ))
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put({
        ...f,
        id: `${f.id}:second`,
        contestId: next.id,
      } as unknown as ModuleRow);
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `election:${next.id}`,
    date,
    kind: "election-day",
    source: {
      tag: "ESTIMATED",
      citation: "second election after a tie",
      asOf: api.state.date,
      estimatedFrom: "tieElectionDays",
    },
    sourceRecordIds: [next.id],
  });
}

/**
 * A named voter's own ballot in a race, cast before election day (the
 * player's): a candidate, or null to leave the race blank.
 */
export function castBallot(
  api: CoreAPI,
  voterId: string,
  contestId: string,
  candidateId: string | null,
): void {
  if (
    candidateId !== null &&
    !ballot(api, contestId).some((f) => f.personId === candidateId)
  )
    throw new Error(`${candidateId} isn't on the ballot for ${contestId}`);
  table(api, "chosen").put({
    id: `${contestId}|${voterId}`,
    candidateId,
  } as unknown as ModuleRow);
}

/** Count a contest: named ballots, then the wider electorate's groups. */
export function holdElection(api: CoreAPI, contestId: string): ResultRow {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  // A midterm or off-cycle election draws fewer voters (audit 2, item 5).
  const cycleCost = cycleTurnout(contest.electionDate).cost;
  const filings = ballot(api, contestId);
  const date = api.state.date;
  const { townPlaceId } = town(api);
  const named = [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === townPlaceId && ageOn(p, date) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id));
  const namedVotes: Record<string, number> = {};
  const exitPoll: Record<string, number> = {};
  const byLean: { lean: number; heard: Set<string>; choice: string | null }[] =
    [];
  let voted = 0;
  for (const voter of named) {
    const { appeal, lean, recordReasons } = appealFor(
      api,
      voter,
      contest,
      filings,
    );
    // A voter who chose their ballot (the player, by hand) votes as they
    // chose; with none chosen (a player skipping past election day), they
    // vote or stay home on their own reasons like everyone else.
    const chosen = table(api, "chosen").get(
      `${contestId}|${voter.id}`,
    ) as unknown as { candidateId: string | null } | undefined;
    const decided = atThePolls(api, voter, contest.electionDate, cycleCost);
    const t = chosen ? { ...decided, votes: true } : decided;
    const ranked = Object.entries(appeal).sort(
      (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
    );
    // A voter with nothing that separates the leading candidates leaves this
    // race blank rather than picking by ballot order.
    const separates =
      ranked.length === 1 ||
      (ranked.length > 1 && ranked[0]![1].total > ranked[1]![1].total);
    const choice = chosen
      ? chosen.candidateId
      : t.votes && separates
        ? ranked[0]![0]
        : null;
    const told = !t.votes
      ? null
      : choice === null
        ? "left-blank"
        : (voter.traits["people-mind-v1:conflict"] ?? 0) < 0
          ? "declined"
          : choice;
    if (t.votes) {
      voted += 1;
      exitPoll[told!] = (exitPoll[told!] ?? 0) + 1;
    }
    if (choice) namedVotes[choice] = (namedVotes[choice] ?? 0) + 1;
    byLean.push({
      lean,
      heard: new Set(
        filings
          .filter((f) => impressionOf(api, voter.id, f.personId)?.heardOf)
          .map((f) => f.personId),
      ),
      choice,
    });
    table(api, "ballots").put({
      id: `ballot:${contestId}:${voter.id}`,
      contestId,
      voterId: voter.id,
      date,
      voted: t.votes,
      turnoutReasons: { duty: t.duty, interest: t.interest, cost: t.cost },
      choice,
      appeal,
      toldPollster: told,
      recordReasons,
    } as unknown as ModuleRow);
  }
  // The counted residents vote from their own records: they see each
  // candidate's name and party on the ballot, but no campaign reached them,
  // so no platform or record moves them. With nothing to separate the
  // candidates (a nonpartisan race), they leave it blank.
  const countedVotes: Record<string, number> = {};
  let countedVoted = 0;
  let countedEligible = 0;
  for (const voter of countedResidents(api.state as CoreState)) {
    if (voter.placeId !== townPlaceId || ageOn(voter, date) < 18) continue;
    countedEligible += 1;
    const lean = personLean(api.state.people, voter, townLean(api));
    const appeal: Record<string, { total: number }> = {};
    for (const f of filings) {
      const party = candidateFacts(api, f, contest).party;
      appeal[f.personId] = { total: party ? lean * partySide(party) : 0 };
    }
    const t = atThePolls(
      api,
      voter,
      contest.electionDate,
      cycleCost,
      voter.weeklyMinutes,
    );
    if (!t.votes) continue;
    countedVoted += 1;
    const ranked = Object.entries(appeal).sort(
      (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
    );
    const separates =
      ranked.length === 1
        ? ranked[0]![1].total > 0
        : ranked.length > 1 && ranked[0]![1].total > ranked[1]![1].total;
    const choice = separates ? ranked[0]![0] : null;
    if (choice) countedVotes[choice] = (countedVotes[choice] ?? 0) + 1;
    byLean.push({ lean, heard: new Set(), choice });
  }
  // Counted adults barred for a felony conviction can't vote (the share a
  // restoration law in force returns is counted back).
  const barred = felonyDisenfranchisedShare(api);
  for (const id of Object.keys(countedVotes))
    countedVotes[id] = Math.round(countedVotes[id]! * (1 - barred));
  countedVoted = Math.round(countedVoted * (1 - barred));
  countedEligible = Math.round(countedEligible * (1 - barred));
  const { groupVotes, electorate } = groupVote(
    api,
    contest,
    filings,
    named.length + countedEligible,
    voted + countedVoted,
    byLean,
  );
  const totals: Record<string, number> = {};
  for (const f of filings)
    totals[f.personId] =
      (namedVotes[f.personId] ?? 0) +
      (countedVotes[f.personId] ?? 0) +
      (groupVotes[f.personId] ?? 0);
  const ranked = Object.entries(totals).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  // No one wins on no votes: the seat stays with its holder (or vacant)
  // until the next contest.
  const tied =
    ranked.length > 1 && ranked[0]![1] > 0 && ranked[0]![1] === ranked[1]![1];
  const winnerId = tied
    ? breakElectionTie(
        api,
        contest,
        ranked.filter((r) => r[1] === ranked[0]![1]).map((r) => r[0]),
      )
    : ranked.length && ranked[0]![1] > 0
      ? ranked[0]![0]
      : null;
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  // A special election's winner takes the vacant seat at once; otherwise
  // the new term starts on the office's own start day after the regular
  // election (a second election after a tie keeps the regular one's term).
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as OfficeInput | undefined;
  const takesOffice = contest.special
    ? date
    : office
      ? termStartAfter(office, regularElectionDate(contest))
      : (incumbent?.endDate ??
        `${Number(contest.electionDate.slice(0, 4)) + 1}-01-01`);
  const result: ResultRow = {
    id: `result:${contestId}`,
    contestId,
    date,
    namedVotes,
    countedVotes,
    countedTurnout: countedVoted,
    countedEligible,
    groupVotes,
    totals,
    namedTurnout: voted,
    namedEligible: named.length,
    electorate,
    winnerId,
    takesOffice: winnerId ? takesOffice : null,
    exitPoll,
  };
  table(api, "results").put(result as unknown as ModuleRow);
  api.emit({
    id: `election-result:${contestId}`,
    date,
    kind: "election-result",
    personIds: filings
      .map((f) => f.personId)
      .filter((id) => api.state.people.has(id)),
    placeId: townPlaceId,
    source: { tag: "SOURCED", citation: `Count of ${contestId}`, asOf: date },
    publicRecord: true,
    news: true,
    facts: {
      contestId,
      office: contest.title,
      winnerId: winnerId ?? "",
      totals: JSON.stringify(totals),
    },
  });
  // The presidency is won in the electoral college (world-races.ts); this
  // count is the town's state's popular vote.
  if (contest.officeId === "office:US:president") return result;
  if (winnerId && takesOffice > date)
    api.moduleCalendar(VOTING_MODULE_ID).schedule({
      key: `take-office:${contestId}`,
      date: takesOffice,
      kind: "take-office",
      source: {
        tag: "SOURCED",
        citation: `Result of ${contestId}`,
        asOf: date,
      },
      sourceRecordIds: [result.id],
    });
  else if (winnerId) takeOffice(api, result.id);
  else openNextCycle(api, contest.seatId);
  return result;
}

const districtVotes = new Map(
  (
    calibration as unknown as {
      house: { districtGeoid: string; totalVotes: number }[];
    }
  ).house.map((h) => [h.districtGeoid, h.totalVotes]),
);
const stateVotes = new Map(
  (
    calibration as unknown as {
      presidentialByState: { stateUsps: string; totalVotes: number }[];
    }
  ).presidentialByState.map((s) => [s.stateUsps, s.totalVotes]),
);

/** How many votes the race's whole electorate cast in 2024, where read. */
/**
 * Which kind of election a date is: a presidential November, a midterm
 * November, or an off-cycle date (an odd year, or a spring or summer local
 * election), whose turnout runs far lower.
 */
export function electionCycle(
  date: string,
): "presidential" | "midterm" | "off-cycle" {
  const year = Number(date.slice(0, 4));
  const november = date.slice(5, 7) === "11";
  if (!november || year % 2) return "off-cycle";
  return year % 4 === 0 ? "presidential" : "midterm";
}

/** The cycle's turnout against a presidential year's, and what it adds to the cost of voting. */
function cycleTurnout(date: string): { share: number; cost: number } {
  const cycle = electionCycle(date);
  if (cycle === "presidential") return { share: 1, cost: 0 };
  if (cycle === "midterm")
    return {
      share: campaignParameter("midtermShareOfPresidential"),
      cost: campaignParameter("midtermTurnoutCost"),
    };
  return {
    share: campaignParameter("offCycleShareOfPresidential"),
    cost: campaignParameter("offCycleTurnoutCost"),
  };
}

function electorateSize(
  api: CoreAPI,
  contest: ContestRow,
  namedCount: number,
): number {
  // The 2024 presidential electorate, scaled to this cycle's turnout.
  return Math.round(
    presidentialElectorate(api, contest, namedCount) *
      cycleTurnout(contest.electionDate).share,
  );
}

function presidentialElectorate(
  api: CoreAPI,
  contest: ContestRow,
  namedCount: number,
): number {
  const { stateKey, geoid } = town(api);
  const usps = stateKey.slice(3);
  const seats = api
    .moduleState(OFFICES_MODULE_ID)
    .table("seats")
    .query("byOffice", [contest.officeId]) as unknown as SeatInput[];
  const state = stateVotes.get(usps) ?? null;
  if (contest.family === "usHouse") {
    const district = townDistrict(geoid, usps, "congressional", api.state.date);
    return (
      (district && districtVotes.get(district.geoid)) ??
      (state ? state / Math.max(1, seats.length) : namedCount)
    );
  }
  if (contest.family === "statewideExecutive") return state ?? namedCount;
  if (contest.family === "stateLegislative") {
    const districts = new Set(seats.map((s) => s.district)).size;
    return state ? Math.round(state / Math.max(1, districts)) : namedCount;
  }
  // stopgapId: SG-GOV-voter-groups-stand-in
  api.stopgap("SG-GOV-voter-groups-stand-in");
  const population = Number(api.state.placeMetadata.referencePopulation);
  return Number.isFinite(population) && population > 0
    ? Math.round(
        population * campaignParameter("localElectorateShareOfPopulation"),
      )
    : namedCount;
}

/** The Republican two-party share of the race's whole electorate in 2024, where read. */
function electorateRightShare(
  api: CoreAPI,
  contest: ContestRow,
): number | null {
  const { stateKey, geoid } = town(api);
  const usps = stateKey.slice(3);
  if (contest.family === "statewideExecutive") {
    const d = stateShares.get(usps);
    return d == null ? null : 1 - d;
  }
  if (contest.family === "usHouse") {
    const district = townDistrict(geoid, usps, "congressional", api.state.date);
    // An at-large seat (no district row) is the whole state.
    const d =
      (district ? districtShares.get(district.geoid) : undefined) ??
      stateShares.get(usps);
    return d == null ? null : 1 - d;
  }
  return null;
}

const stateShares = new Map(
  (
    calibration as unknown as {
      presidentialByState: {
        stateUsps: string;
        democraticTwoPartyShare: number | null;
      }[];
    }
  ).presidentialByState.map((s) => [s.stateUsps, s.democraticTwoPartyShare]),
);
const districtShares = new Map(
  (
    calibration as unknown as {
      house: {
        districtGeoid: string;
        democraticTwoPartyShare: number | null;
      }[];
    }
  ).house.map((h) => [h.districtGeoid, h.democraticTwoPartyShare]),
);

/**
 * The electorate the world doesn't name votes as groups: lean bands around the
 * town's lean, each sized from the electorate, turning out at the named
 * people's rate. In the town's own races a band splits the way its named
 * people chose; in a state or district race the bands past the town vote by
 * the party nearest their lean (BOARD item 6: a statewide vote followed about
 * 32 named townspeople). A band with no named voters goes by party.
 */
function groupVote(
  api: CoreAPI,
  contest: ContestRow,
  filings: readonly FilingRow[],
  namedEligible: number,
  namedVoted: number,
  byLean: readonly {
    lean: number;
    heard: Set<string>;
    choice: string | null;
  }[],
) {
  const electorate = Math.max(
    namedVoted,
    electorateSize(api, contest, namedVoted),
  );
  const unnamed = Math.max(0, electorate - namedVoted);
  const groupVotes: Record<string, number> = {};
  if (!filings.length || unnamed === 0) return { groupVotes, electorate };
  const bands = campaignParameter("voterGroupBands");
  for (let b = 0; b < bands; b += 1) {
    const lo = -1 + (2 * b) / bands;
    const hi = -1 + (2 * (b + 1)) / bands;
    const mid = (lo + hi) / 2;
    const inBand = byLean.filter(
      (v) => v.lean >= lo && (v.lean < hi || b === bands - 1),
    );
    // The band's share of the electorate: of the race's whole electorate,
    // spread evenly around its real 2024 lean where read (a state, a House
    // district), else the named people's share.
    const right = electorateRightShare(api, contest);
    const share =
      right !== null
        ? // The edge bands hold everyone past either end of the scale.
          Math.max(
            0,
            Math.min(b === bands - 1 ? Infinity : hi, 2 * right) -
              Math.max(b === 0 ? -Infinity : lo, 2 * right - 2),
          ) / 2
        : byLean.length
          ? inBand.length / byLean.length
          : 1 / bands;
    const votes = Math.round(unnamed * share);
    if (!votes) continue;
    // Who the band votes for: past the town (a state or district race read
    // from its real lean) a band never heard the town's campaign and votes
    // by the party nearest its lean; inside it, or where the parties tie at
    // the center, the band splits the way its named people chose.
    const closest = filings
      .map((f) => {
        const facts = candidateFacts(api, f, contest);
        return {
          id: f.personId,
          score: mid * partySide(facts.party),
        };
      })
      .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
    const byParty =
      closest.length === 1 || closest[0]!.score !== closest[1]!.score
        ? closest[0]!.id
        : null;
    if (right !== null && byParty) {
      groupVotes[byParty] = (groupVotes[byParty] ?? 0) + votes;
      continue;
    }
    const counts = new Map<string, number>();
    for (const v of inBand)
      if (v.choice) counts.set(v.choice, (counts.get(v.choice) ?? 0) + 1);
    const chose = [...counts.values()].reduce((sum, n) => sum + n, 0);
    if (chose) {
      for (const [id, n] of counts)
        groupVotes[id] =
          (groupVotes[id] ?? 0) + Math.round((votes * n) / chose);
      continue;
    }
    // A band none of the town's voters fall in never heard a platform: it
    // goes by the party on the ballot, and leaves a nonpartisan race blank.
    if (byParty) groupVotes[byParty] = (groupVotes[byParty] ?? 0) + votes;
  }
  void namedEligible;
  return { groupVotes, electorate };
}

/** The winner takes the seat on the term's first day; the incumbent's term ends. */
function takeOffice(api: CoreAPI, resultId: string): void {
  const result = table(api, "results").get(resultId) as unknown as ResultRow;
  if (!result?.winnerId) return;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(result.contestId) as unknown as ContestRow;
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as OfficeInput;
  for (const term of terms.query("bySeatStatus", [
    contest.seatId,
    "serving",
  ]) as unknown as TermRow[])
    terms.put({
      ...term,
      status: "ended",
      endDate: api.state.date,
      endEstimated: false,
      endedBy: "term ended",
    } as unknown as ModuleRow);
  const winner = api.state.people.get(result.winnerId);
  const filing = ballot(api, contest.id).find(
    (f) => f.personId === result.winnerId,
  );
  // The incumbent who stood again: the seat's holder when filing closed.
  const previous = result.winnerId.startsWith(officialCandidateId(""))
    ? (terms.get(
        result.winnerId.slice(officialCandidateId("").length),
      ) as unknown as TermRow | undefined)
    : undefined;
  // A named official who isn't a full person yet keeps (or gets) an identity.
  const identity = winner
    ? {
        givenName: winner.givenName,
        familyName: winner.familyName,
        gender: "recorded",
        birthDate: winner.birthDate,
        homeState: town(api).stateKey,
      }
    : previous
      ? previous.identity
      : officialIdentity(api, contest, result.winnerId);
  const termId = `term:${contest.seatId}:${api.state.date}:elected`;
  terms.put({
    id: termId,
    seatId: contest.seatId,
    officeId: contest.officeId,
    personId: winner ? winner.id : null,
    identity,
    party: filing?.party ?? null,
    startDate: api.state.date,
    // A special election's winner serves out the unexpired term; otherwise
    // the term runs to the start of the one elected a full term on.
    endDate: contest.special
      ? contest.special.termEnd
      : termEndAfter(office, regularElectionDate(contest)),
    endEstimated: false,
    reached: contest.special
      ? `elected in a special election ${contest.electionDate}`
      : `elected ${contest.electionDate}`,
    status: "serving",
  } as unknown as ModuleRow);
  if (contest.special) vacancyFilled(api, contest.special.vacancyId, termId);
  api.emit({
    id: `took-office:${contest.seatId}:${api.state.date}`,
    date: api.state.date,
    kind: "took-office",
    personIds: winner ? [winner.id] : [],
    placeId: town(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Result of ${contest.id}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      office: contest.title,
      seatId: contest.seatId,
      winnerId: result.winnerId,
    },
  });
  openNextCycle(api, contest.seatId);
}

/** The regular election a contest decides: a tie's second election keeps its date. */
function regularElectionDate(contest: ContestRow): string {
  return (
    /:(\d{4}-\d{2}-\d{2})(?::second)+$/.exec(contest.id)?.[1] ??
    contest.electionDate
  );
}

function officialIdentity(
  api: CoreAPI,
  contest: ContestRow,
  candidateId: string,
) {
  const loaded = api
    .moduleState(OFFICES_MODULE_ID)
    .table("loaded")
    .get("town") as unknown as { worldSeed: string };
  const drawn = drawOfficialIdentity({
    worldSeed: loaded.worldSeed,
    seatKey: candidateId,
    stateUsps: town(api).stateKey.slice(3),
    role: "state-executive-challenger",
    referenceDate: api.state.date,
  });
  return {
    givenName: drawn.givenName,
    familyName: drawn.familyName,
    gender: drawn.gender,
    birthDate: drawn.birthDate,
    homeState: town(api).stateKey,
  };
}

/** Why one named voter voted as they did. */
export function ballotOf(
  api: CoreAPI,
  contestId: string,
  voterId: string,
): BallotRow | null {
  return (
    (table(api, "ballots").get(`ballot:${contestId}:${voterId}`) as unknown as
      BallotRow | undefined) ?? null
  );
}

export function resultOf(api: CoreAPI, contestId: string): ResultRow | null {
  return (
    (table(api, "results").get(`result:${contestId}`) as unknown as
      ResultRow | undefined) ?? null
  );
}

export { campaignFor };
