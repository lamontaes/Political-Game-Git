/**
 * Recalls (M3-10): voters removing a local official before the term ends,
 * only where the state's law gives its places a recall (the lifted municipal
 * recall rules: doctrine, signature threshold and circulation window).
 *
 * A cause starts one, never a chance: when a town or county ordinance takes
 * effect, each resident weighs how the members voted against their own view
 * of it. The most aggrieved resident starts a petition against a member when
 * their grievance, sense of duty and readiness for a fight outweigh the effort. Neighbors sign
 * for their own reasons (they oppose how that member voted); the town's
 * counted residents sign by the same rule, each record counting as many
 * voters as its household stands for. With enough signatures by the window's
 * end a recall vote is held; each voter, named or counted, decides by the same
 * grievance, and a majority to remove ends the member's term, the seat then
 * filling by its vacancy rule.
 */
import { townLean } from "./campaigns";
import { coreAPI, registerModule } from "../state";
import { closenessBetween } from "../closeness";
import { decisionLean, decisionTraitWeight } from "../trait-decisions";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonState,
} from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  campaignParameter,
  personLean,
  publicSupport,
} from "../campaign-views";
import { lawChain, LAWS_MODULE_ID } from "./laws";
import type { LawRowInput } from "../laws-starting";
import { LEGISLATURE_MODULE_ID, votesOn, type BillRow } from "./legislature";
import { OFFICES_MODULE_ID, vacateSeat, type TermRow } from "./offices";
import { VOTING_MODULE_ID, turnoutOn, type ResultRow } from "./voting";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./elections";
import { countedResidents } from "../electorate";
import { NEWS_MODULE_ID, storiesHeard, type Story } from "./news";
import { citizenShareOf } from "../electorate-places";
import { electorateChange } from "../electorate-inputs";
import recallBarData from "../data/campaigns/recall-bars.json" with { type: "json" };
import recallAnswers from "../data/campaigns/recall-answers.json" with { type: "json" };
import { resolveMunicipalRecallRule } from "../gov-rules/municipal-ballot-rules";
import type { PetitionSignatureBase } from "../gov-rules/municipal-election-rules";
import { resolveRequiredSignatures } from "../gov-rules/municipal-election-rules";
import { daysBetweenText as daysBetween } from "../kernel/dates";

export const RECALLS_MODULE_ID = "core2-recalls-v1";

/** Misconduct on the record that can ground a recall: a criminal charge and a press exposure. */
const MISCONDUCT_EVENTS = ["justice.charged", "press.exposed"];

export interface RecallRow {
  readonly id: string;
  readonly termId: string;
  readonly seatId: string;
  readonly memberId: string;
  readonly organizerId: string;
  /** The ordinance a vote on it caused this, or the misconduct record's event id. */
  readonly lawId: string;
  /** The ordinance's question, or `misconduct` for a petition over a charge or an exposure. */
  readonly question: string;
  /** What started it: a member's vote on an ordinance (the default), or misconduct on the record. */
  readonly cause?: "ordinance" | "misconduct";
  /** For misconduct: how a story about it is known (the charge's case id or the exposure's topic). */
  readonly causeMatch?: string;
  readonly started: string;
  readonly due: string;
  readonly required: number;
  /** The base the required signatures are a percentage of, and where it was read or sized from. */
  readonly base: SignatureBase;
  readonly signatures: number;
  readonly namedSigners: readonly string[];
  readonly status: "circulating" | "failed" | "on-ballot" | "kept" | "removed";
  readonly vote: { readonly remove: number; readonly keep: number } | null;
  /** What the member said to the organizer about the petition, in the order said (`keepAnswer`). */
  readonly answers?: readonly RecallAnswer[];
  /** The count on the due day, where the member answered: the signatures and their reasons (`recount`). */
  readonly count?: RecallCount;
}

/** One reply the member gave the petition's organizer, and the public record of it voters hear. */
export interface RecallAnswer {
  /** The scene's reply record. */
  readonly id: string;
  /** The public record of the answer, which the press and the news carry. */
  readonly recordId: string;
  readonly move: string;
  /** 1: the member answered them (weighs against signing); -1: dismissed them (toward it). */
  readonly sign: 1 | -1;
  readonly date: string;
}

/** The due day's count where the member answered: before and after their answer, whom it reached and the signatures it changed. */
export interface RecallCount {
  readonly date: string;
  readonly before: number;
  readonly signatures: number;
  /** The answers the count read: the last one said weighs. */
  readonly answerIds: readonly string[];
  /** The named adults who heard of the answer: the organizer, the people they know and those who read or heard a story about it. */
  readonly heard: number;
  /** Signatures the answer added (positive) or took away. */
  readonly changed: number;
}

export const RECALLS_MODULE: CoreModule = {
  id: RECALLS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      recalls: { indexes: { byTerm: { fields: ["termId"] } } },
    },
  },
  eventKinds: ["law-took-effect", "scene.reply", ...MISCONDUCT_EVENTS],
  onEvent: (api, event) =>
    event.kind === "scene.reply"
      ? keepAnswer(api, event)
      : MISCONDUCT_EVENTS.includes(event.kind)
        ? noteMisconduct(api, event)
        : weighOrdinance(api, event),
  onCalendarWork: (api, work) => recallWork(api, work),
};

export function openRecalls(core: CoreState): void {
  if (!core.modules.has(RECALLS_MODULE_ID))
    registerModule(core, RECALLS_MODULE);
}

const table = (api: CoreAPI) =>
  api.moduleState(RECALLS_MODULE_ID).table("recalls");

const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

function adults(api: CoreAPI): readonly Readonly<PersonState>[] {
  const town = lawChain(api).townPlaceId;
  const adultAge = api.parameter("votingAge");
  return [...api.state.people.values()]
    .filter(
      (p) =>
        p.alive && p.placeId === town && ageOn(p, api.state.date) >= adultAge,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** A voter of the town the recall weighs: a named adult, or a counted resident standing for their household's weight. */
interface TownVoter {
  readonly id: string;
  readonly traits: PersonState["traits"];
  readonly placeId: string;
  readonly weight: number;
  readonly counted: boolean;
}

/** Every adult of the town on the one rule: the named, and the counted groups' members. */
function townVoters(api: CoreAPI): readonly TownVoter[] {
  const town = lawChain(api).townPlaceId,
    adultAge = api.parameter("votingAge"),
    date = api.state.date;
  return [
    ...adults(api).map((p) => ({
      id: p.id,
      traits: p.traits,
      placeId: p.placeId,
      weight: 1,
      counted: false,
    })),
    ...countedResidents(api.state as CoreState)
      .filter((c) => c.placeId === town && ageOn(c, date) >= adultAge)
      .map((c) => ({
        id: c.id,
        traits: c.traits,
        placeId: c.placeId,
        weight: c.weight,
        counted: true,
      })),
  ];
}

/** How aggrieved a resident is by a member's vote: their view of the law against the member's side of it. */
function grievance(
  api: CoreAPI,
  person: Readonly<Pick<PersonState, "id" | "traits">>,
  question: string,
  enacted: number,
  memberVote: number,
): number {
  const stance = publicSupport(
    personLean(api.state.people, person, townLean(api)),
    question,
    api.state.seed,
  );
  return -stance * enacted * memberVote;
}

function termOf(api: CoreAPI, memberId: string): TermRow | undefined {
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  if (memberId.startsWith("official:"))
    return terms.get(memberId.slice("official:".length)) as unknown as
      TermRow | undefined;
  return (terms.rows() as unknown as TermRow[]).find(
    (t) => t.personId === memberId && t.status === "serving",
  );
}

function stateUsps(api: CoreAPI): string {
  return lawChain(api).stateKey.slice(3);
}

interface RecallBarRow {
  readonly openingDays: number;
  readonly longTermOpeningDays?: number;
  readonly longTermAboveYears?: number;
  readonly closingDays?: number;
  readonly longTermClosingDays?: number;
}

/**
 * The state's bars on when a petition may be filed against a member whose
 * term is `termYears` long: days into the term before one may be, and days
 * before its end after which none may be. Null where the state's statute is
 * not read (SG-GOV-recall-bars-national): the national estimate stands.
 */
export function recallBarsFor(
  stateUsps: string,
  termYears: number | undefined,
): { openingDays: number; closingDays: number } | null {
  const row = (recallBarData.states as Record<string, RecallBarRow>)[stateUsps];
  if (!row) return null;
  // stopgapId: SG-GOV-recall-bars-calendar-months (a bar the statute counts in calendar months is stored as a fixed number of days, though six calendar months run 181 to 184 days and two run 59 to 62)
  // stopgapId: SG-GOV-recall-bars-term-fraction (every term over longTermAboveYears takes one long-term value, though a bar that is a fraction of the term scales with the term: one-fourth of a three-year term is 91 days less than the value taken)
  const long =
    termYears !== undefined &&
    row.longTermAboveYears !== undefined &&
    termYears > row.longTermAboveYears;
  return {
    openingDays: long
      ? (row.longTermOpeningDays ?? row.openingDays)
      : row.openingDays,
    closingDays: long
      ? (row.longTermClosingDays ?? row.closingDays ?? 0)
      : (row.closingDays ?? 0),
  };
}

/** The signature base a petition's percentage applies to, as a whole count of voters, and where it came from. */
export interface SignatureBase {
  readonly kind: PetitionSignatureBase;
  readonly count: number;
  /** "recorded" where a record in the world holds it; "estimated" where it is sized from the real averages. */
  readonly basis: "recorded" | "estimated";
  /** The result record a recorded count was read from. */
  readonly recordId?: string;
}

/**
 * The eligible voters of the town as a whole count: the named and counted
 * adults, each counted record for as many voters as its household stands for,
 * less non-citizens and those barred. Fitted household weights are fractions,
 * so the sum is rounded to a whole number of voters before any rule sees it.
 */
function eligibleVoters(api: CoreAPI, voters: readonly TownVoter[]): number {
  const placeKey = api.state.placeMetadata.placeKey as string | undefined;
  const eligibleShare =
    citizenShareOf(placeKey, stateUsps(api), api.state.seed) *
    (1 - electorateChange(api).barred);
  return Math.round(voters.reduce((n, p) => n + p.weight, 0) * eligibleShare);
}

/** Votes cast at the world's recorded elections: each result's totals, with the contest it was for. */
function recordedCounts(
  api: CoreAPI,
): { result: ResultRow; contest: ContestRow; votes: number }[] {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return [];
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  return (
    api
      .moduleState(VOTING_MODULE_ID)
      .table("results")
      .rows() as unknown as ResultRow[]
  ).flatMap((result) => {
    const contest = contests.get(result.contestId) as unknown as
      ContestRow | undefined;
    const votes = Object.values(result.totals).reduce((n, v) => n + v, 0);
    return contest && votes > 0 ? [{ result, contest, votes }] : [];
  });
}

/**
 * What a state's rule says a petition's percentage is a percentage of, read
 * from the world's own records: votes cast for the office at its last
 * election, or at the town's last election of that level. Where the world
 * holds no such record (it keeps no voter rolls, and a statewide race's
 * votes are not kept by town), the base is sized from the real averages.
 */
export function signatureBase(
  api: CoreAPI,
  kind: PetitionSignatureBase,
  term: Readonly<Pick<TermRow, "officeId">>,
  voters: readonly TownVoter[],
): SignatureBase {
  const records = recordedCounts(api).sort(
    (a, b) =>
      b.result.date.localeCompare(a.result.date) ||
      a.result.id.localeCompare(b.result.id),
  );
  if (kind === "votes-cast-for-office") {
    const last = records.find((r) => r.contest.officeId === term.officeId);
    if (last)
      return {
        kind,
        count: Math.round(last.votes),
        basis: "recorded",
        recordId: last.result.id,
      };
  }
  if (kind === "votes-cast-last-election") {
    const office = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .get(term.officeId) as unknown as { level?: string } | undefined;
    const sameLevel = records.filter((r) => r.contest.level === office?.level);
    const date = sameLevel[0]?.result.date;
    // The election's votes: the most cast in any one of its contests that day.
    const top = sameLevel
      .filter((r) => r.result.date === date)
      .sort((a, b) => b.votes - a.votes)[0];
    if (top)
      return {
        kind,
        count: Math.round(top.votes),
        basis: "recorded",
        recordId: top.result.id,
      };
  }
  // stopgapId: SG-GOV-recall-signature-groups (registered voters, and votes with no record yet, are sized from the real averages)
  api.stopgap("SG-GOV-recall-signature-groups");
  const population = Number(api.state.placeMetadata.referencePopulation);
  const count =
    kind === "registered-voters"
      ? Math.round(
          eligibleVoters(api, voters) *
            campaignParameter("registeredShareOfEligible"),
        )
      : population > 0
        ? Math.round(
            population *
              campaignParameter("localElectorateShareOfPopulation") *
              (kind === "last-gubernatorial-vote"
                ? campaignParameter("midtermShareOfPresidential")
                : 1),
          )
        : eligibleVoters(api, voters);
  return { kind, count, basis: "estimated" };
}
/**
 * The town's recall rule, where its state gives places one: the read
 * threshold, or the read rules' median where recall exists but its
 * threshold isn't read (an estimate).
 */
export function recallRule(api: CoreAPI) {
  const rule = resolveMunicipalRecallRule(stateUsps(api));
  if (!rule.circulationDays) return null;
  return {
    ...rule,
    circulationDays: rule.circulationDays,
    threshold: rule.threshold ?? {
      percent: campaignParameter("recallThresholdEstimate"),
      base: "votes-cast-for-office" as const,
    },
  };
}

/**
 * Whether a serving member is open to a recall petition now: past the
 * state's opening bar and before its closing bar for their term, with no
 * petition against them circulating or on the ballot and none that failed or
 * kept them this term.
 */
export function openToRecall(api: CoreAPI, term: TermRow): boolean {
  // stopgapId: SG-GOV-recall-bars-national (states with no row in recall-bars.json take one national bar)
  if (!recallBarsFor(stateUsps(api), undefined))
    api.stopgap("SG-GOV-recall-bars-national");
  // The term began one term's length before it ends (a term held at the
  // opening records the opening as its start).
  const years = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .get(term.officeId) as unknown as { termYears?: number } | undefined
  )?.termYears;
  const since =
    term.endDate && years
      ? `${Number(term.endDate.slice(0, 4)) - years}${term.endDate.slice(4)}`
      : term.startDate;
  const bars = recallBarsFor(stateUsps(api), years) ?? {
    openingDays: campaignParameter("recallTermOpeningDays"),
    closingDays: 0,
  };
  if (daysBetween(since, api.state.date) < bars.openingDays) return false;
  // Some statutes also bar a petition in the last months of the term.
  if (
    bars.closingDays &&
    term.endDate &&
    daysBetween(api.state.date, term.endDate) <= bars.closingDays
  )
    return false;
  const prior = table(api).query("byTerm", [term.id]) as unknown as RecallRow[];
  if (
    prior.some(
      (r) =>
        r.status === "circulating" ||
        r.status === "on-ballot" ||
        r.status === "failed" ||
        r.status === "kept",
    )
  )
    return false;
  return true;
}

function weighOrdinance(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  if (facts.level !== "city" && facts.level !== "county") return;
  const row = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(facts.lawId ?? "") as unknown as LawRowInput | undefined;
  const billId = row?.terms?.enactedByBill;
  if (!row || typeof billId !== "string") return;
  const rule = recallRule(api);
  if (!rule) return;
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  if (!bill) return;
  const enacted = row.value === 1 ? 1 : -1;
  // Where the state's law lets a place recall only for cause (misconduct, a
  // crime in office), a vote on an ordinance is no ground for one.
  if (rule.groundsRequired === true) return;
  const people = adults(api);
  // The members open to a recall: serving, past the term's opening months,
  // with no petition against them now and none that failed this term.
  const seen = new Set<string>();
  const targets = votesOn(api, bill.id).flatMap((vote) => {
    const side = vote.vote === "yes" ? 1 : vote.vote === "no" ? -1 : 0;
    const term = side ? termOf(api, vote.memberId) : undefined;
    // A member's committee and floor votes are one member to hold to account.
    if (!term || term.status !== "serving" || seen.has(term.id)) return [];
    seen.add(term.id);
    if (!openToRecall(api, term)) return [];
    return [{ vote, side, term }];
  });
  // Each resident moved enough to organize brings one petition, against the
  // member they hold most to account: the bill's sponsor, else the one they
  // are least close to. Another member needs another organizer.
  const organizers = people
    .map((p) => {
      const duty =
        decisionTraitWeight(api.state, "recalls.organize") *
        decisionLean(api.state, p, "recalls.organize", "organize", "leave-it");
      return { p, duty };
    })
    .sort((a, b) => a.p.id.localeCompare(b.p.id));
  const used = new Set<string>();
  const open = [...targets];
  while (open.length) {
    let best: {
      p: Readonly<PersonState>;
      drive: number;
      target: (typeof open)[number];
    } | null = null;
    for (const o of organizers) {
      if (used.has(o.p.id)) continue;
      for (const t of open) {
        if (o.p.id === t.term.personId) continue;
        const drive = grievance(api, o.p, row.series, enacted, t.side) + o.duty;
        if (drive <= campaignParameter("recallOrganizerEffort")) continue;
        const account =
          (t.vote.memberId === bill.sponsorId ? 1 : 0) -
          closenessBetween(api.state as CoreState, o.p.id, t.vote.memberId);
        const bestAccount = best
          ? (best.target.vote.memberId === bill.sponsorId ? 1 : 0) -
            closenessBetween(
              api.state as CoreState,
              best.p.id,
              best.target.vote.memberId,
            )
          : -Infinity;
        if (
          !best ||
          drive > best.drive ||
          (drive === best.drive && account > bestAccount)
        )
          best = { p: o.p, drive, target: t };
      }
    }
    if (!best) break;
    used.add(best.p.id);
    open.splice(open.indexOf(best.target), 1);
    const side = best.target.side;
    startRecall(api, {
      organizer: best.p,
      term: best.target.term,
      memberId: best.target.vote.memberId,
      rule,
      grievanceOf: (p) => grievance(api, p, row.series, enacted, side),
      lawId: row.id,
      question: row.series,
    });
  }
}

/**
 * Misconduct on the record against a serving local official (a criminal
 * charge, a press exposure): once the news has had time to reach the town
 * (`recallMisconductNewsDays`), the residents who heard of it weigh a
 * petition (`weighMisconduct`). Misconduct is a ground in every state, so this
 * holds where the state's recall rule requires grounds as well.
 */
function noteMisconduct(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const officialId = event.personIds?.[0];
  if (!officialId || !recallRule(api)) return;
  const term = termOf(api, officialId);
  if (!term || term.status !== "serving" || !localOffice(api, term)) return;
  const match =
    event.kind === "justice.charged" ? event.facts?.caseId : event.topic;
  if (!match) return;
  api.moduleCalendar(RECALLS_MODULE_ID).schedule({
    key: `misconduct:${event.id}`,
    date: addDays(
      api.state.date,
      campaignParameter("recallMisconductNewsDays"),
    ),
    kind: "misconduct-check",
    source: {
      tag: "ESTIMATED",
      citation:
        "News of an official's misconduct reaches the town before anyone organizes",
      asOf: api.state.date,
      estimatedFrom: "recallMisconductNewsDays",
    },
    sourceRecordIds: [event.id, event.kind, officialId, match],
  });
}

/** Whether a term's office is a city's, a county's or a township's, which the municipal recall rule covers. */
function localOffice(api: CoreAPI, term: TermRow): boolean {
  const level = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .get(term.officeId) as unknown as { level?: string } | undefined
  )?.level;
  return level === "city" || level === "county" || level === "township";
}

/**
 * The town's named adults who heard a story about the misconduct, from the
 * news engine's record of who heard what: the record itself where the news
 * engine runs alone, or a printed story that reports it (its source record),
 * and for an exposure a story on the exposed topic.
 */
function heardOfMisconduct(
  api: CoreAPI,
  eventId: string,
  cause: string,
): Set<string> {
  const [kind, match] = cause.split("|");
  const out = new Set<string>();
  if (!api.state.modules.has(NEWS_MODULE_ID)) return out;
  const about = (story: Story) =>
    story.id === eventId ||
    story.facts.sourceRecordId === eventId ||
    (kind === "press.exposed" && story.topic === match);
  for (const p of adults(api))
    if (storiesHeard(api, p.id).some(about)) out.add(p.id);
  return out;
}

/**
 * How aggrieved a voter is by a member's misconduct: its weight if they heard
 * of it, less their closeness to the member and the bar a petition or a
 * removal asks of anyone. A counted voter keeps no record of what they heard,
 * so the share of the town's named adults who heard stands for their
 * exposure (SG-GOV-recall-counted-exposure).
 */
function misconductGrievance(
  api: CoreAPI,
  voter: TownVoter,
  memberId: string,
  heard: ReadonlySet<string>,
  exposure: number,
): number {
  const weight = campaignParameter("recallMisconductWeight");
  const bar = campaignParameter("recallMisconductBar");
  if (voter.counted) {
    // stopgapId: SG-GOV-recall-counted-exposure
    api.stopgap("SG-GOV-recall-counted-exposure");
    return weight * exposure - bar;
  }
  return (
    (heard.has(voter.id) ? weight : 0) -
    closenessBetween(api.state as CoreState, voter.id, memberId) -
    bar
  );
}

/**
 * On the day set by `noteMisconduct`: each named adult who heard of the
 * misconduct weighs organizing a petition (their grievance and their lean
 * toward organizing at the decision's weight, against the effort), and the
 * most moved starts one; neighbors then sign by `startRecall`'s rule.
 */
function weighMisconduct(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  const [eventId, kind, memberId, match] = work.sourceRecordIds;
  const rule = recallRule(api);
  const term = memberId ? termOf(api, memberId) : undefined;
  if (!rule || !term || term.status !== "serving" || !openToRecall(api, term))
    return;
  const cause = `${kind}|${match}`;
  const heard = heardOfMisconduct(api, eventId!, cause);
  if (!heard.size) return;
  const exposure = heard.size / Math.max(1, adults(api).length);
  let best: { p: Readonly<PersonState>; drive: number } | null = null;
  for (const p of adults(api)) {
    if (!heard.has(p.id) || p.id === memberId) continue;
    const drive =
      misconductGrievance(
        api,
        {
          id: p.id,
          traits: p.traits,
          placeId: p.placeId,
          weight: 1,
          counted: false,
        },
        memberId!,
        heard,
        exposure,
      ) +
      decisionTraitWeight(api.state, "recalls.organize") *
        decisionLean(api.state, p, "recalls.organize", "organize", "leave-it");
    if (drive <= campaignParameter("recallOrganizerEffort")) continue;
    if (!best || drive > best.drive) best = { p, drive };
  }
  if (!best) return;
  startRecall(api, {
    organizer: best.p,
    term,
    memberId: memberId!,
    rule,
    grievanceOf: (voter) =>
      misconductGrievance(api, voter, memberId!, heard, exposure),
    lawId: eventId!,
    question: "misconduct",
    cause: "misconduct",
    causeMatch: cause,
  });
}

function startRecall(
  api: CoreAPI,
  input: {
    readonly organizer: Readonly<PersonState>;
    readonly term: TermRow;
    readonly memberId: string;
    readonly rule: NonNullable<ReturnType<typeof recallRule>>;
    /** Each voter's grievance with the member over what started the petition. */
    readonly grievanceOf: (voter: TownVoter) => number;
    readonly lawId: string;
    readonly question: string;
    readonly cause?: "misconduct";
    readonly causeMatch?: string;
  },
): void {
  const { organizer, term, rule } = input;
  // Neighbors sign for their own reasons: their grievance with the member.
  // The counted residents sign by the same rule, each record for as many
  // voters as its household stands for.
  const voters = townVoters(api);
  const signers = voters.filter(
    (p) =>
      p.id !== term.personId &&
      input.grievanceOf(p) +
        decisionTraitWeight(api.state, "recalls.sign") *
          decisionLean(api.state, p, "recalls.sign", "sign", "pass") >
        0,
  );
  // The petition's base is the one the state's rule names, a whole count of
  // voters (household weights are fitted fractions; see `eligibleVoters`).
  const base = signatureBase(api, rule.threshold.base, term, voters);
  const signatures = Math.round(signers.reduce((n, p) => n + p.weight, 0));
  const recall: RecallRow = {
    id: `recall:${term.id}:${api.state.date}`,
    termId: term.id,
    seatId: term.seatId,
    memberId: input.memberId,
    organizerId: organizer.id,
    lawId: input.lawId,
    question: input.question,
    ...(input.cause
      ? { cause: input.cause, causeMatch: input.causeMatch ?? "" }
      : {}),
    started: api.state.date,
    due: addDays(api.state.date, rule.circulationDays),
    required: resolveRequiredSignatures(rule.threshold, base.count),
    base,
    signatures,
    namedSigners: signers.filter((p) => !p.counted).map((p) => p.id),
    status: "circulating",
    vote: null,
  };
  table(api).put(recall as unknown as ModuleRow);
  // The bill that enacted the ordinance, which the petitioners name to the
  // member; a petition over misconduct names none.
  const law = input.cause
    ? undefined
    : (api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .get(input.lawId) as unknown as LawRowInput | undefined);
  const bill = billIdFor(law)
    ? (api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .get(billIdFor(law)) as unknown as BillRow | undefined)
    : undefined;
  api.emit({
    id: `recall-petition:${recall.id}`,
    date: api.state.date,
    kind: "recall-petition",
    // The organizer, and the member the petition is against when they are a
    // person: both are reached by it.
    personIds: [
      organizer.id,
      ...(api.state.people.has(input.memberId) ? [input.memberId] : []),
    ],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Recall petition against ${input.memberId}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      recallId: recall.id,
      termId: term.id,
      lawId: input.lawId,
      memberId: input.memberId,
      ...(bill ? { billId: bill.id, number: bill.number } : {}),
    },
  });
  api.moduleCalendar(RECALLS_MODULE_ID).schedule({
    key: `petition-due:${recall.id}`,
    date: recall.due,
    kind: "petition-due",
    source: {
      tag: "SOURCED",
      citation: `${stateUsps(api)} municipal recall rule (${rule.doctrineBasis})`,
      asOf: api.state.date,
    },
    sourceRecordIds: [recall.id],
  });
}

/**
 * The member's reply to the petition's organizer in the recall scene (the
 * scene's own record, `scene.reply`, caused by the petition): kept on the
 * recall while it circulates, and made a public record so the press and the
 * news carry it to voters. A reply that is neither an answer nor a dismissal
 * (`recall-answers.json`) leaves nothing.
 */
function keepAnswer(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const causeId = String(event.facts?.causeId ?? "");
  if (!causeId.startsWith("recall-petition:")) return;
  const recall = table(api).get(
    causeId.slice("recall-petition:".length),
  ) as unknown as RecallRow | undefined;
  // Said by the member, to the organizer, while the petition circulates.
  if (
    recall?.status !== "circulating" ||
    event.personIds[0] !== recall.memberId ||
    !event.personIds.includes(recall.organizerId)
  )
    return;
  const move = String(event.facts?.move ?? "");
  const sign = recallAnswers.answered.includes(move)
    ? 1
    : recallAnswers.dismissed.includes(move)
      ? -1
      : 0;
  if (!sign) return;
  const answer: RecallAnswer = {
    id: event.id,
    recordId: `recall-answer:${event.id}`,
    move,
    sign,
    date: event.date,
  };
  table(api).put({
    ...recall,
    answers: [
      ...(recall.answers ?? []).filter((a) => a.id !== answer.id),
      answer,
    ],
  } as unknown as ModuleRow);
  api.emit({
    id: answer.recordId,
    date: api.state.date,
    kind: "recall-answer",
    personIds: [recall.memberId, recall.organizerId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Answer to the recall petition against ${recall.memberId}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      recallId: recall.id,
      memberId: recall.memberId,
      replyId: event.id,
      move,
      answer: sign > 0 ? "answered" : "dismissed",
    },
  });
}

/**
 * The town's named adults who know what the member said to the petition: the
 * organizer, who was there; the people the organizer knows (a tie still
 * close today), told by word of mouth; and whoever heard a story about it,
 * from the news engine's record of who heard what (the record itself, or a
 * printed story that reports it).
 */
function heardOfAnswers(api: CoreAPI, recall: RecallRow): Set<string> {
  const town = new Set(adults(api).map((p) => p.id));
  const out = new Set<string>([recall.organizerId]);
  for (const key of api.state.relationshipsByPerson.get(
    recall.organizerId as never,
  ) ?? []) {
    const tie = api.state.relationships.get(key);
    if (!tie) continue;
    const other =
      tie.actorId === recall.organizerId ? tie.otherId : tie.actorId;
    if (
      town.has(other) &&
      closenessBetween(
        api.state as CoreState,
        recall.organizerId as never,
        other,
      ) > 0
    )
      out.add(other);
  }
  if (!api.state.modules.has(NEWS_MODULE_ID)) return out;
  const ids = new Set((recall.answers ?? []).map((a) => a.recordId));
  const about = (story: Story) =>
    ids.has(story.id) || ids.has(String(story.facts.sourceRecordId ?? ""));
  for (const id of town)
    if (storiesHeard(api, id as never).some(about)) out.add(id);
  return out;
}

/**
 * The due day's count where the member answered the petition: each voter
 * signs by `startRecall`'s rule, and a voter who heard of the answer weighs
 * it too (`recallAnswerWeight`; the last answer said counts). The count
 * moves by those it turned, either way, and keeps its reasons. A counted
 * voter keeps no record of what they heard, so the share of the town's named
 * adults who heard stands for their exposure (SG-GOV-recall-counted-exposure).
 */
function recount(api: CoreAPI, recall: RecallRow): RecallRow {
  const answers = recall.answers ?? [];
  const last = answers.at(-1);
  if (!last) return recall;
  const grievanceOf = voteGrievance(api, recall);
  const heard = heardOfAnswers(api, recall);
  const exposure = heard.size / Math.max(1, adults(api).length);
  const pull = last.sign * campaignParameter("recallAnswerWeight");
  let changed = 0;
  for (const p of townVoters(api)) {
    if (p.id === recall.memberId) continue;
    const without =
      grievanceOf(p) +
      decisionTraitWeight(api.state, "recalls.sign") *
        decisionLean(api.state, p, "recalls.sign", "sign", "pass");
    // stopgapId: SG-GOV-recall-counted-exposure
    if (p.counted) api.stopgap("SG-GOV-recall-counted-exposure");
    const reach = p.counted ? exposure : heard.has(p.id) ? 1 : 0;
    const signs = (g: number) => (g > 0 ? p.weight : 0);
    changed += signs(without - pull * reach) - signs(without);
  }
  const before = recall.signatures;
  const signatures = Math.max(0, Math.round(before + changed));
  const counted: RecallRow = {
    ...recall,
    signatures,
    count: {
      date: api.state.date,
      before,
      signatures,
      answerIds: answers.map((a) => a.id),
      heard: heard.size,
      changed: signatures - before,
    },
  };
  table(api).put(counted as unknown as ModuleRow);
  return counted;
}

function recallWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind === "misconduct-check") return weighMisconduct(api, work);
  const held = table(api).get(work.sourceRecordIds[0]!) as unknown as
    RecallRow | undefined;
  if (!held) return;
  if (work.kind === "petition-due" && held.status === "circulating") {
    // Where the member answered the petition, the count reads the answer.
    const recall = recount(api, held);
    const enough = recall.signatures >= recall.required;
    table(api).put({
      ...recall,
      status: enough ? "on-ballot" : "failed",
    } as unknown as ModuleRow);
    announce(api, recall, enough ? "on-ballot" : "failed", {
      signatures: String(recall.signatures),
      required: String(recall.required),
      ...(recall.count
        ? {
            before: String(recall.count.before),
            answerIds: recall.count.answerIds.join(" "),
          }
        : {}),
    });
    if (enough)
      api.moduleCalendar(RECALLS_MODULE_ID).schedule({
        key: `recall-vote:${recall.id}`,
        date: addDays(api.state.date, campaignParameter("recallElectionDays")),
        kind: "recall-vote",
        source: {
          tag: "ESTIMATED",
          citation: "recall election after certification",
          asOf: api.state.date,
          estimatedFrom: "recallElectionDays",
        },
        sourceRecordIds: [recall.id],
      });
    return;
  }
  const recall = held;
  if (work.kind !== "recall-vote" || recall.status !== "on-ballot") return;
  const grievanceOf = voteGrievance(api, recall);
  let remove = 0;
  let keep = 0;
  for (const p of townVoters(api)) {
    const g =
      grievanceOf(p) +
      decisionTraitWeight(api.state, "recalls.vote") *
        decisionLean(api.state, p, "recalls.vote", "remove", "keep");
    const t = turnoutOn(api, p, { remove: { total: g }, keep: { total: -g } });
    // A named voter goes or stays home; a counted one votes at their propensity.
    const votes = p.counted ? t.propensity * p.weight : t.votes ? 1 : 0;
    if (g > 0) remove += votes;
    if (g < 0) keep += votes;
  }
  const result = {
    remove: Math.round(remove),
    keep: Math.round(keep),
  };
  const removed = result.remove > result.keep;
  table(api).put({
    ...recall,
    status: removed ? "removed" : "kept",
    vote: result,
  } as unknown as ModuleRow);
  announce(api, recall, removed ? "removed" : "kept", {
    remove: String(result.remove),
    keep: String(result.keep),
  });
  if (removed) vacateSeat(api, recall.seatId, "recalled");
}

/**
 * Each voter's grievance on a recall's ballot, by what started it: the
 * member's own vote on the ordinance against the voter's view of it, or the
 * misconduct as far as the voter heard of it by the vote.
 */
function voteGrievance(
  api: CoreAPI,
  recall: RecallRow,
): (voter: TownVoter) => number {
  if (recall.cause === "misconduct") {
    const heard = heardOfMisconduct(api, recall.lawId, recall.causeMatch ?? "");
    const exposure = heard.size / Math.max(1, adults(api).length);
    return (voter) =>
      misconductGrievance(api, voter, recall.memberId, heard, exposure);
  }
  const law = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .get(recall.lawId) as unknown as LawRowInput | undefined;
  const enacted = law?.value === 1 ? 1 : -1;
  // The member's own vote on the law, from the record.
  const side =
    (
      votesOn(api, billIdFor(law)) as unknown as {
        memberId: string;
        vote: string;
      }[]
    ).find((v) => v.memberId === recall.memberId)?.vote === "no"
      ? -1
      : 1;
  return (voter) => grievance(api, voter, recall.question, enacted, side);
}

/** A recall step's outcome as a public record the press and the director read, by the recall's id. */
function announce(
  api: CoreAPI,
  recall: RecallRow,
  outcome: "failed" | "on-ballot" | "removed" | "kept",
  counts: Readonly<Record<string, string>>,
): void {
  api.emit({
    id: `recall-outcome:${recall.id}:${outcome}`,
    date: api.state.date,
    kind: "recall-outcome",
    personIds: [recall.organizerId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Recall of ${recall.memberId}: ${outcome}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      recallId: recall.id,
      termId: recall.termId,
      memberId: recall.memberId,
      outcome,
      ...counts,
    },
  });
}

function billIdFor(law: LawRowInput | undefined): string {
  const billId = law?.terms?.enactedByBill;
  return typeof billId === "string" ? billId : "";
}

export function recallsOf(api: CoreAPI): readonly RecallRow[] {
  return table(api).rows() as unknown as RecallRow[];
}

export { coreAPI };
