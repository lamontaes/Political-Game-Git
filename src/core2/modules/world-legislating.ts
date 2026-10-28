/**
 * Other governments legislate (M3-10): the town's state legislature,
 * Congress, the town council and the county board pass laws on their own, on
 * the same engine the player uses.
 *
 * A state legislature sits through its session (the state session calendar
 * table) and Congress through its own (Congress's session table). When a
 * session opens, every member files the changes their own reasons favor
 * where the law in force differs; members wanting the same change join one
 * bill, and the bills come in over the session's filing period. The floor
 * leader orders them by how many members back each. Every week of sitting,
 * the floor takes up as many as the legislature's floor days a week (or
 * Congress's floor days a year) and the floor's pace allow, once committee
 * has had each: the leader's filings first, then the chamber's other bills
 * oldest first (the player's, a member's carried ask, any drafted after the
 * session opened). What the floor never reaches dies at adjournment. A
 * member's filing is read against the law again on the floor day: a bill whose
 * law an earlier act of the session already made, or cut across, ends without
 * a vote and names that law's row. At each regular council or board meeting
 * the members file the same way and the agenda's time sets how many are taken
 * up. Each bill reached goes through
 * committee, every chamber and the executive; what passes takes effect by
 * that government's own rule and reaches named residents through the
 * law-effects module. No count of bills is set anywhere: the volume follows
 * the members' reasons, the law in force and the time. Nothing is rolled:
 * every filing is the member's choice from their reasons, and every vote is
 * each member's. The session's filings, hearings and votes are counted
 * together on its floor day.
 */
import { townLean } from "./campaigns";
import questionScopes from "../../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import geography from "../../../data/research/geography/state-reference.json" with { type: "json" };
import federalAnswers from "../data/legislature/federal-answers.json" with { type: "json" };
import congressSessions from "../data/legislature/congress-sessions.json" with { type: "json" };
import { townConcernShare } from "./meetings";
import { sessionYear } from "../state-session-calendar";
import { leaderOf, presidingOfficer } from "./leadership";
import { officialStance } from "./officials";
import { coreAPI, registerModule } from "../state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonState,
  Source,
} from "../types";
import { nextMeeting } from "../office-day-calendar";
import {
  addDays,
  makeIsoDate,
  daysBetweenText as daysBetween,
} from "../kernel/dates";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  campaignParameter,
  personStance,
  PLATFORM_QUESTIONS,
} from "../campaign-views";
import {
  lastEnactment,
  lawChain,
  LAWS_MODULE_ID,
  questionSettled,
  type SettledQuestion,
} from "./laws";
import type { LawRowInput } from "../laws-starting";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import type { OfficeLevel } from "../offices-local";
import { partySide } from "../appointments";
import { decisionLean, termOfLean } from "../trait-decisions";
import {
  authorityFor,
  beyondPower,
  billJurisdiction,
  bodyOf,
  draftBill,
  executiveOf,
  FEDERAL_HOUSE,
  holdVote,
  leanOf,
  memberKey,
  members,
  POLICY_QUESTIONS,
  proposeAsExecutive,
  FEDERAL_SENATE,
  LEGISLATURE_MODULE_ID,
  registerSittingReader,
  registerWeeklyFloorReader,
  settledness,
  tasteForChange,
  type BillRow,
  type Provision,
  type Sitting,
} from "./legislature";

/**
 * A local body's member filings can be held for the player's meeting: the
 * office-day engine says whether to (the player sits on the body and holds
 * the clock) and takes the filed bills onto the meeting's agenda, voting them
 * when the meeting closes. Without it, filings are voted as they are filed.
 */
type MeetingHold = (api: CoreAPI, officeId: string) => boolean;
type FiledAgenda = (
  api: CoreAPI,
  officeId: string,
  meetingDate: string,
  billIds: readonly string[],
) => void;
type BillIntroduced = (api: CoreAPI, billId: string) => void;
let billIntroduced: BillIntroduced | null = null;
/** Called as each member's filed change becomes a bill in their chamber. */
export function registerBillIntroduced(hook: BillIntroduced): void {
  billIntroduced = hook;
}
let meetingHold: MeetingHold | null = null;
let filedAgenda: FiledAgenda | null = null;
export function registerMeetingHold(
  hold: MeetingHold,
  filed: FiledAgenda,
): void {
  meetingHold = hold;
  filedAgenda = filed;
}

const QUESTION_SCOPES = questionScopes.questions as Readonly<
  Record<string, { levels: readonly string[] }>
>;
const JURISDICTIONS = geography.places as Readonly<
  Record<string, { jurisdictionKind: string }>
>;

/** Scope is the question's own government, not every government that touches its subject. */
function questionForLevel(
  api: CoreAPI,
  question: string,
  level: "federal" | "state" | "county" | "city",
): boolean {
  const state = lawChain(api).stateKey;
  const kind =
    JURISDICTIONS[state.slice(state.lastIndexOf("-") + 1)]?.jurisdictionKind;
  const levels = QUESTION_SCOPES[question]?.levels ?? [];
  return kind === "federal-district" && level !== "federal"
    ? levels.some((own) => ["state", "county", "city"].includes(own))
    : levels.includes(level);
}

/**
 * Whether the government an office belongs to may decide a policy question
 * here: the question is that level's own (`question-powers.json`), the level
 * has the power for it, and a town, township or county acts only within what
 * its state lets its places do. The one check a body files by when it sits,
 * and the one a contest's positions are read through (`contest-positions.ts`).
 * A township legislates as a town does.
 */
export function levelMayDecide(
  api: CoreAPI,
  level: OfficeLevel,
  question: string,
  value = 1,
): boolean {
  const own = level === "township" ? "city" : level;
  if (!questionForLevel(api, question, own)) return false;
  const provision: Provision = { kind: "policy-question", question, value };
  return own === "federal" || own === "state"
    ? !beyondPower(provision, own)
    : !beyondPower(provision, "local") && authorityFor(api, provision).allowed;
}

export const WORLD_LEGISLATING_MODULE_ID = "core2-world-legislating-v1";

export const WORLD_LEGISLATING_MODULE: CoreModule = {
  id: WORLD_LEGISLATING_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { sessions: {}, legislativeSessions: {}, nextMeetings: {} },
  },
  onCalendarWork: (api, work) => onWork(api, work),
};

/** Register the module and put the state's session ends on the calendar. */
export function openWorldLegislating(core: CoreState): void {
  registerSittingReader(nextSitting);
  registerWeeklyFloorReader(weeklyFloorOn);
  if (!core.modules.has(WORLD_LEGISLATING_MODULE_ID))
    registerModule(core, WORLD_LEGISLATING_MODULE);
  const api = coreAPI(core);
  // The town's council and its county board meet on their own.
  for (const office of townBodies(api)) scheduleMeeting(api, office);
  // Congress and the state's legislature open their next session (or the one
  // already sitting, today).
  for (const jurisdiction of ["US", lawChain(api).stateKey])
    scheduleOpening(api, jurisdiction, core.date, true);
}

function townBodies(api: CoreAPI): readonly string[] {
  const offices = (
    api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
      id: string;
      kind: string;
    }[]
  ).filter(
    (o) =>
      o.kind === "council" ||
      o.kind === "county-board" ||
      o.kind === "township-board",
  );
  return offices.map((o) => o.id).sort();
}

/** A government's own answer in force on a policy question: its latest enacted row, else its recorded starting answer. */
const FEDERAL_ANSWERS = (
  federalAnswers as unknown as {
    questions: Record<string, { answer: string }>;
  }
).questions;

export function answerIn(
  api: CoreAPI,
  stateKey: string,
  question: string,
  /** Count acts already enacted that haven't taken effect yet. */
  enacted = false,
): number | null {
  const rows = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeries", [stateKey, question]) as unknown as LawRowInput[]
  )
    .filter((r) => enacted || r.effectiveDate <= api.state.date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  if (rows[0]) return rows[0].value === 1 ? 1 : -1;
  const answer =
    stateKey === "US"
      ? FEDERAL_ANSWERS[question]?.answer
      : POLICY_QUESTIONS[question]?.answers[stateKey]?.answer;
  return answer === "yes" ? 1 : answer === "no" ? -1 : null;
}

function chamber(
  api: CoreAPI,
  stateKey: string,
  kind: string,
): { id: string; members: readonly TermRow[] } | null {
  const office = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .query("byJurisdiction", [stateKey]) as unknown as {
      id: string;
      kind: string;
    }[]
  ).find((o) => o.kind === kind);
  return office ? { id: office.id, members: members(api, office.id) } : null;
}

/** The House: one national chamber, the same in every world (bills are introduced there). */
function houseOffice(api: CoreAPI): {
  id: string;
  members: readonly TermRow[];
} {
  return { id: FEDERAL_HOUSE, members: members(api, FEDERAL_HOUSE) };
}

/**
 * Whether the law in force needs changing for a bill pointing this way: a
 * policy wanted where it isn't law, or wanted gone where it is. Nothing to
 * undo where no law stands.
 */
function needsChange(direction: number, now: number | null): boolean {
  return direction > 0 ? now !== 1 : now === 1;
}

/**
 * Whether a policy is law for the town at any level as enacted, an act
 * waiting on its effective date included (the state's recorded starting
 * answer counting until a state act replaces it).
 */
function inForceForTown(api: CoreAPI, question: string): boolean {
  const chain = lawChain(api);
  return chain.levels.some(({ level, jurisdiction }) =>
    level === "state"
      ? answerIn(api, jurisdiction, question, true) === 1
      : ownRow(api, jurisdiction, question) === 1,
  );
}

/** A jurisdiction's own latest enacted row on a question, whether or not it has taken effect yet. */
function ownRow(
  api: CoreAPI,
  jurisdiction: string,
  question: string,
): number | null {
  const row = [
    ...(api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeries", [jurisdiction, question]) as unknown as LawRowInput[]),
  ].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
  return row ? (row.value === 1 ? 1 : -1) : null;
}

interface Body {
  readonly id: string;
  readonly members: readonly TermRow[];
}

/** One bill a session takes up, with who filed it and how far it got. */
export interface SessionBill {
  readonly number: string;
  readonly question: string;
  readonly change: "enact" | "repeal";
  readonly sponsor: string;
  /** Members whose own reasons favor the change (the sponsor among them). */
  readonly cosponsors: number;
  readonly status: string;
  /**
   * "voted" when it reached the floor; "not-reached" when time ran out first;
   * "moot" when the floor took it up and found its law already made.
   */
  readonly fate: "voted" | "not-reached" | "moot";
  /** For a moot bill: the law it repeated or cut across, by row id. */
  readonly moot?: SettledQuestion & { readonly question: string };
}

/**
 * What moves a member to carry a change: their views and, at the constituent
 * weight, how their constituents lean (a town member's town, a state or
 * federal member's own seat until district views are modeled), the same
 * parts their vote weighs (`legislature.ts`), plus how their traits lean
 * between filing and holding back. Read once per sitting.
 */
export interface Filer {
  readonly term: TermRow;
  readonly key: string;
  readonly lean: number;
  readonly home: number;
  /** The member as a person, for the trait term; absent for a named official not filled in. */
  readonly person: PersonState | undefined;
  /** Their traits' lean toward filing over holding back, unweighted. */
  readonly trait: number;
  /** Their own position on a question: an official's own ideal and causes (OPUS-OFFICIALS), anyone else's by their lean. */
  readonly stance: (question: string) => number;
}

export function filerOf(api: CoreAPI, term: TermRow): Filer {
  const key = memberKey(term);
  const lean = leanOf(api, key);
  const person = api.state.people.get(key);
  return {
    term,
    key,
    lean,
    home: person ? townLean(api) : lean,
    person,
    trait: person
      ? decisionLean(
          api.state,
          person,
          "world-legislating.bring-agenda",
          "bring",
          "hold",
        )
      : 0,
    stance: (question) =>
      officialStance(api, key, question) ?? personStance(lean, question),
  };
}

/**
 * How the law on a question stands, for anyone weighing a change to it: how
 * settled it is (-1 passed today, 1 long standing) and, for a change that
 * would reverse the latest law, the body's reluctance to undo it, larger the
 * fresher it is and the wider it passed (owner, Oct 14: no body's rules are
 * in data, so a sliding reluctance from recency and margin; no fixed cooldown).
 */
function lawStanding(
  api: CoreAPI,
  question: string,
  direction: number,
): { settled: number; reluctance: number } {
  const settled = settledness(api, question);
  const last = lastEnactment(api, question);
  const reverses = last !== null && (last.value > 0 ? 1 : -1) !== direction;
  return {
    settled,
    reluctance: reverses
      ? campaignParameter("reversalReluctance") *
        Math.max(0, last.margin) *
        ((1 - settled) / 2)
      : 0,
  };
}

/** A member's own reasons to carry a change on a question, pointing one way. */
export function filingReason(
  api: CoreAPI,
  f: Filer,
  question: string,
  direction: number,
  law: { settled: number; reluctance: number },
): number {
  const bare =
    (f.stance(question) +
      campaignParameter("constituentWeight") * personStance(f.home, question)) *
      direction -
    law.reluctance;
  // A taste for change backs changing a settled law, not undoing a fresh one.
  return f.person
    ? bare +
        termOfLean(
          api.state,
          f.person,
          "world-legislating.bring-agenda",
          tasteForChange(f.trait, law.settled),
          bare,
        )
    : bare;
}

/** A change a member files, with who backs it and where the floor leader puts it. */
interface Filed {
  readonly question: string;
  readonly direction: number;
  readonly sponsor: Filer;
  readonly cosponsors: number;
  readonly leaderReason: number;
  /** The bill a member filed at the executive's request. */
  readonly drafted?: BillRow;
}

/**
 * The changes the body's members file where the law in force differs from
 * what their own reasons favor (members wanting the same change join one
 * bill, the most moved member sponsoring it; the executive brings what no
 * member files, through a member), in the floor leader's order: the most
 * backed first, then their own reasons.
 */
function fileChanges(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly jurisdiction: string;
    readonly body: Body | null;
    /** Everyone who may file: every member of every chamber. */
    readonly filers: readonly TermRow[];
    readonly leader: TermRow | undefined;
    /** The floor days the sitting has. */
    readonly floorDays: number;
    /** How many bills a floor day takes up. */
    readonly billsPerFloorDay: number;
    readonly needsChange: (question: string, direction: number) => boolean;
    readonly allowed: (question: string, value: number) => boolean;
    /** A change the body turned down recently enough that its rules bar it again. */
    readonly barred: (question: string, direction: number) => boolean;
  },
): Filed[] {
  const filers = input.filers.map((t) => filerOf(api, t));
  const leader = input.leader ? filerOf(api, input.leader) : null;
  const filed: Filed[] = [];
  // The executive over the body brings what no member files, through the
  // member they ask (the player decides their own requests).
  const head = input.body ? executiveOf(api, input.body.id).term : undefined;
  const executive =
    head && memberKey(head) !== (api.state as CoreState).playerId
      ? filerOf(api, head)
      : null;
  for (const question of input.body ? PLATFORM_QUESTIONS : []) {
    for (const direction of [1, -1]) {
      if (!input.needsChange(question, direction)) continue;
      if (!input.allowed(question, direction)) continue;
      if (input.barred(question, direction)) continue;
      const law = lawStanding(api, question, direction);
      let sponsor: Filer | null = null;
      let best = 0;
      let cosponsors = 0;
      for (const member of filers) {
        const reason = filingReason(api, member, question, direction, law);
        if (reason <= 0) continue;
        cosponsors += 1;
        if (
          reason > best ||
          (reason === best && sponsor && member.key < sponsor.key)
        ) {
          best = reason;
          sponsor = member;
        }
      }
      if (!sponsor) {
        if (
          !executive ||
          filingReason(api, executive, question, direction, law) <= 0
        )
          continue;
        const request = proposeAsExecutive(api, {
          bodyOfficeId: input.body!.id,
          provisions: [{ kind: "policy-question", question, value: direction }],
        });
        const drafted = request?.billId
          ? (api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("bills")
              .get(request.billId) as unknown as BillRow)
          : undefined;
        if (!request || !drafted) continue;
        filed.push({
          question,
          direction,
          sponsor:
            filers.find((f) => f.key === request.memberId) ??
            filerOf(
              api,
              input.filers.find((t) => memberKey(t) === request.memberId)!,
            ),
          cosponsors,
          leaderReason: leader
            ? filingReason(api, leader, question, direction, law)
            : 0,
          drafted,
        });
        continue;
      }
      filed.push({
        question,
        direction,
        sponsor,
        cosponsors,
        leaderReason: leader
          ? filingReason(api, leader, question, direction, law)
          : 0,
      });
    }
  }
  // The floor leader's calendar: the most backed first, a change weighing
  // more as more of the town's residents live with what it touches; then the
  // leader's own reasons.
  const weight = campaignParameter("floorConcernWeight");
  const backing = new Map(
    filed.map((f) => [
      f,
      f.cosponsors * (1 + weight * townConcernShare(api, f.question)),
    ]),
  );
  filed.sort(
    (a, b) =>
      backing.get(b)! - backing.get(a)! ||
      b.leaderReason - a.leaderReason ||
      a.question.localeCompare(b.question),
  );
  return filed;
}

/**
 * A sitting of the body: every member files the changes their own reasons
 * favor where the law in force differs (members wanting the same change join
 * one bill, the most moved member sponsoring it); the floor leader schedules
 * them by how many members back each, then by their own reasons; and the
 * floor takes up as many as its time allows (the sitting's floor days at the
 * floor's pace). Each bill reached goes through committee, every chamber
 * and the executive; a bill time runs out on dies at adjournment. Nothing
 * else limits how many bills there are: the count follows the members'
 * reasons, the law in force and the time.
 */
function holdSession(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly jurisdiction: string;
    readonly body: Body | null;
    /** Everyone who may file: every member of every chamber. */
    readonly filers: readonly TermRow[];
    readonly leader: TermRow | undefined;
    /** The floor days the sitting has. */
    readonly floorDays: number;
    /** How many bills a floor day takes up. */
    readonly billsPerFloorDay: number;
    readonly needsChange: (question: string, direction: number) => boolean;
    readonly allowed: (question: string, value: number) => boolean;
    /** A change the body turned down recently enough that its rules bar it again. */
    readonly barred: (question: string, direction: number) => boolean;
    /** The meeting these filings wait for: filed now, voted when it closes. */
    readonly holdFor?: string;
  },
): void {
  const leaderKey = input.leader ? memberKey(input.leader) : null;
  const filed = fileChanges(api, input);
  const floorTime = Math.round(input.floorDays * input.billsPerFloorDay);
  const bills: SessionBill[] = [];
  const heldIds: string[] = [];
  filed.forEach((item, index) => {
    const drafted =
      item.drafted ??
      draftBill(api, {
        bodyOfficeId: input.body!.id,
        sponsorId: item.sponsor.key,
        provisions: [
          {
            kind: "policy-question",
            question: item.question,
            value: item.direction,
          },
        ],
      });
    const reached = index < floorTime;
    // An earlier bill this sitting may have made this one's law already.
    const moot = reached && !input.holdFor ? mootAtFloor(api, drafted) : null;
    const bill = moot
      ? dieMoot(api, drafted, moot)
      : reached
        ? input.holdFor
          ? drafted
          : holdVote(api, drafted.id)
        : dieOnCalendar(api, drafted);
    if (reached && input.holdFor) heldIds.push(drafted.id);
    bills.push({
      number: bill.number,
      question: item.question,
      change: item.direction > 0 ? "enact" : "repeal",
      sponsor: item.sponsor.key,
      cosponsors: item.cosponsors,
      status: bill.status,
      fate: moot ? "moot" : reached ? "voted" : "not-reached",
      ...(moot ? { moot } : {}),
    });
  });
  if (input.holdFor && input.body)
    filedAgenda?.(api, input.body.id, input.holdFor, heldIds);
  api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("sessions")
    .put({
      id: input.key,
      stateKey: input.jurisdiction,
      bodyOfficeId: input.body?.id ?? null,
      date: api.state.date,
      leader: leaderKey,
      floorDays: input.floorDays,
      floorTime,
      bills,
    } as unknown as ModuleRow);
}

/** A bill the floor never reached: it dies when the sitting adjourns. */
function dieOnCalendar(api: CoreAPI, bill: BillRow): BillRow {
  if (bill.status !== "drafted") return bill;
  const died: BillRow = { ...bill, status: "failed" };
  api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .put(died as unknown as ModuleRow);
  return died;
}

/**
 * A filing's premise is that the law in force differs from what its sponsors
 * want. The floor reads that again on the day it takes the bill up, because
 * an act passed since (a bill of its own, or a section another bill carried)
 * may already have made it law or may cut across it. A bill whose every
 * section is settled that way is moot; one with a section still to change
 * goes to its vote.
 */
function mootAtFloor(
  api: CoreAPI,
  bill: BillRow,
): (SettledQuestion & { readonly question: string }) | null {
  if (
    !bill.provisions.length ||
    bill.provisions.some((p) => p.kind !== "policy-question" || !p.question)
  )
    return null;
  const jurisdiction = billJurisdiction(api, bill);
  const settled = bill.provisions.map((p) =>
    questionSettled(api, jurisdiction, p.question!, p.value),
  );
  return settled.every((s) => s !== null)
    ? { question: bill.provisions[0]!.question!, ...settled[0]! }
    : null;
}

/** A moot bill dies unvoted, with the law row it repeats or cuts across on its record. */
function dieMoot(
  api: CoreAPI,
  bill: BillRow,
  moot: NonNullable<BillRow["moot"]>,
): BillRow {
  const died: BillRow = { ...bill, status: "failed", moot };
  api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .put(died as unknown as ModuleRow);
  return died;
}

const senior = (members: readonly TermRow[]) =>
  [...members].sort(
    (a, b) =>
      (a.serviceStart ?? a.startDate).localeCompare(
        b.serviceStart ?? b.startDate,
      ) || a.id.localeCompare(b.id),
  )[0];

function onWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind === "session-open") openSession(api, work);
  if (work.kind === "bill-filing") introduceBill(api, work);
  if (work.kind === "floor-week") floorWeek(api, work);
  if (work.kind === "session-close") closeSession(api, work);
  if (work.kind === "local-meeting") localMeeting(api, work);
}

// ---------------------------------------------------------------------------
// State legislatures and Congress sit through their sessions.

/**
 * When a body sits next, for a bill the player puts on its calendar: a town
 * body's next regular meeting; a legislature's or Congress's next floor week
 * in the session now sitting, or the first of its next session.
 */
function nextSitting(api: CoreAPI, bodyOfficeId: string): Sitting | null {
  const today = api.state.date;
  const meeting = api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("nextMeetings")
    .get(bodyOfficeId) as unknown as
    { date: string; source: Source } | undefined;
  if (meeting) return { date: meeting.date, source: meeting.source };
  const office = bodyOf(api, bodyOfficeId);
  if (!office) return null;
  const jurisdiction =
    office.kind.startsWith("us-house") || office.kind === "us-senate"
      ? "US"
      : office.jurisdiction;
  const committee = campaignParameter("sessionCommitteeDays");
  const sitting = legislativeSessionsOf(api).find(
    (r) =>
      r.jurisdiction === jurisdiction &&
      r.conveneAt <= today &&
      r.adjournAt > today,
  );
  if (sitting) {
    const date = nextFloorWeek(sitting, today);
    if (date < sitting.adjournAt)
      return {
        date,
        source: {
          tag: "ESTIMATED",
          citation: "the session's next floor week",
          asOf: today,
          estimatedFrom: sitting.id,
        },
      };
  }
  const w = nextWindow(jurisdiction, today, false);
  return w
    ? {
        date: plusDays(w.conveneAt, committee),
        source: {
          tag: w.tag,
          citation: w.source,
          asOf: today,
          ...(w.tag === "ESTIMATED" ? { estimatedFrom: w.source } : {}),
        },
      }
    : null;
}

/** One window a body sits, with where its dates come from. */
interface Window {
  readonly conveneAt: string;
  readonly adjournAt: string;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly source: string;
}

const CONGRESS = (
  congressSessions as unknown as {
    years: Record<
      string,
      {
        conveneAt: string;
        adjournAt: string;
        tag: "SOURCED" | "ESTIMATED";
        source: string;
      }
    >;
  }
).years;
const CONGRESS_YEARS = Object.keys(CONGRESS).map(Number).sort();

/** A body's session windows in a year: Congress from its table, a state from the session calendar. */
export function windowsIn(
  jurisdiction: string,
  year: number,
): readonly Window[] {
  if (jurisdiction === "US") {
    const row = CONGRESS[String(year)];
    if (row) return [row];
    // Past the table: the latest year's month and day, an estimate.
    const last = CONGRESS[String(CONGRESS_YEARS[CONGRESS_YEARS.length - 1])]!;
    return [
      {
        conveneAt: `${year}${last.conveneAt.slice(4)}`,
        adjournAt: `${year}${last.adjournAt.slice(4)}`,
        tag: "ESTIMATED",
        source: last.source,
      },
    ];
  }
  const row = sessionYear(jurisdiction, year);
  if (!row?.meets) return [];
  return row.windows.map((w) => ({
    conveneAt: w.conveneAt,
    // A legislature that sits the whole year adjourns at its end.
    adjournAt: /^\d{4}-\d{2}-\d{2}$/.test(w.adjournAt)
      ? w.adjournAt
      : `${year}-12-31`,
    tag: row.tag,
    source: row.sourceUrl ?? "state legislative session calendar table",
  }));
}

/** The body's first session window still to sit after a day (or, at the opening, one already sitting). */
function nextWindow(
  jurisdiction: string,
  after: string,
  includeSitting: boolean,
): Window | null {
  const year = Number(after.slice(0, 4));
  for (let y = year - 1; y <= year + 3; y += 1)
    for (const w of [...windowsIn(jurisdiction, y)].sort((a, b) =>
      a.conveneAt.localeCompare(b.conveneAt),
    ))
      if (
        w.adjournAt > after &&
        (w.conveneAt > after || (includeSitting && w.conveneAt <= after))
      )
        return w;
  return null;
}

function scheduleOpening(
  api: CoreAPI,
  jurisdiction: string,
  after: string,
  includeSitting: boolean,
): void {
  const w = nextWindow(jurisdiction, after, includeSitting);
  if (!w) return;
  // A session already sitting when the world opens takes up its work the next day.
  const date =
    w.conveneAt > api.state.date ? w.conveneAt : plusDays(api.state.date, 1);
  api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
    key: `session-open:${jurisdiction}:${w.conveneAt}`,
    date,
    kind: "session-open",
    source: {
      tag: w.tag,
      citation: w.source,
      asOf: api.state.date,
      ...(w.tag === "ESTIMATED" ? { estimatedFrom: w.source } : {}),
    },
    sourceRecordIds: [jurisdiction, w.conveneAt, w.adjournAt],
  });
}

const DAY = 86_400_000;
const plusDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + Math.round(days) * DAY)
    .toISOString()
    .slice(0, 10);
/** A change filed for the session, the day it is introduced, and its bill once it is. */
interface Filing {
  readonly question: string;
  readonly direction: number;
  readonly sponsor: string;
  readonly cosponsors: number;
  readonly introduceOn: string;
  readonly billId: string | null;
}

/** A legislature's session: its dates, its floor leader's calendar and every bill it took up. */
export interface LegislativeSession {
  readonly id: string;
  readonly jurisdiction: string;
  readonly bodyOfficeId: string | null;
  readonly conveneAt: string;
  readonly adjournAt: string;
  readonly leader: string | null;
  /** Bills the floor takes up in a week of sitting. */
  readonly perWeek: number;
  /** The floor's first week; it sits every seven days from it until adjournment. */
  readonly firstFloor: string;
  readonly filings: readonly Filing[];
  readonly bills: readonly (SessionBill & { readonly decidedOn: string })[];
}

const sessionTable = (api: CoreAPI) =>
  api.moduleState(WORLD_LEGISLATING_MODULE_ID).table("legislativeSessions");

export function legislativeSessionsOf(
  api: CoreAPI,
): readonly LegislativeSession[] {
  return sessionTable(api).rows() as unknown as LegislativeSession[];
}

/**
 * The session convenes: every member files the changes their own reasons
 * favor where the law in force differs (the executive brings what no member
 * files), and the floor leader orders them. Each bill is introduced in its
 * sponsor's own chamber over the session's filing period, the leader's first
 * choices first; the floor sits each week from the end of committee time to
 * adjournment.
 */
function openSession(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const [jurisdiction, conveneAt, adjournAt] = work.sourceRecordIds as [
    string,
    string,
    string,
  ];
  const federal = jurisdiction === "US";
  const lower = federal
    ? houseOffice(api)
    : (chamber(api, jurisdiction, "legislature-lower") ??
      chamber(api, jurisdiction, "legislature-unicameral"));
  const sides = (lower?.members ?? []).map((m) => partySide(m.party));
  const majority = Math.sign(sides.reduce((a, b) => a + b, 0));
  // The floor leader: the majority leader the chamber elected (leadership
  // engine), else the most senior member of the majority (of the whole body
  // where no party holds one).
  const elected = lower ? leaderOf(api, lower.id, "majority-leader") : null;
  const leader =
    (elected
      ? lower?.members.find((m) => memberKey(m) === elected)
      : undefined) ??
    senior(
      (lower?.members ?? []).filter(
        (m) => majority === 0 || partySide(m.party) === majority,
      ),
    );
  const filers = federal
    ? [...members(api, FEDERAL_HOUSE), ...members(api, FEDERAL_SENATE)]
    : ["legislature-lower", "legislature-upper", "legislature-unicameral"]
        .map((kind) => chamber(api, jurisdiction, kind))
        .flatMap((c) => c?.members ?? []);
  // stopgapId: SG-GOV-federal-proposal-coverage
  // Federal-only questions still need stances, opening answers and effect readers.
  if (federal) api.stopgap("SG-GOV-federal-proposal-coverage");
  const filed = lower
    ? fileChanges(api, {
        key: work.key,
        jurisdiction,
        body: lower,
        filers,
        leader,
        floorDays: 0,
        billsPerFloorDay: 0,
        needsChange: (question, direction) =>
          needsChange(direction, answerIn(api, jurisdiction, question, true)),
        // A legislature answers only the questions its level may (data).
        allowed: (question, value) =>
          levelMayDecide(api, federal ? "federal" : "state", question, value),
        // A new session takes every bill up afresh.
        barred: () => false,
      })
    : [];
  const today = api.state.date;
  const length = Math.max(1, daysBetween(today, adjournAt));
  const period = campaignParameter("sessionFilingShare") * length;
  const filings: Filing[] = filed.map((item, i) => ({
    question: item.question,
    direction: item.direction,
    sponsor: item.sponsor.key,
    cosponsors: item.cosponsors,
    introduceOn: item.drafted
      ? today
      : plusDays(today, (i * period) / Math.max(1, filed.length)),
    billId: item.drafted?.id ?? null,
  }));
  const weeks = Math.max(1, length / 7);
  const perWeek = Math.max(
    1,
    Math.round(
      (federal
        ? campaignParameter("congressFloorDaysPerYear") / weeks
        : campaignParameter("legislativeDaysPerWeek")) *
        campaignParameter("floorBillsPerLegislativeDay"),
    ),
  );
  const id = `session:${jurisdiction}:${conveneAt}`;
  const firstFloor = plusDays(today, campaignParameter("sessionCommitteeDays"));
  const row: LegislativeSession = {
    id,
    jurisdiction,
    bodyOfficeId: lower?.id ?? null,
    conveneAt,
    adjournAt,
    leader: leader ? memberKey(leader) : null,
    perWeek,
    firstFloor,
    filings,
    bills: [],
  };
  sessionTable(api).put(row as unknown as ModuleRow);
  const calendar = api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID);
  const source = {
    tag: "ESTIMATED" as const,
    citation: "the session's own calendar",
    asOf: today,
    estimatedFrom: work.key,
  };
  filings.forEach((f, i) => {
    if (f.billId) return;
    if (f.introduceOn <= today) introduce(api, id, i);
    else
      calendar.schedule({
        key: `bill-filing:${id}:${i}`,
        date: f.introduceOn,
        kind: "bill-filing",
        source,
        sourceRecordIds: [id, String(i)],
      });
  });
  if (firstFloor < adjournAt)
    calendar.schedule({
      key: `floor-week:${id}:${firstFloor}`,
      date: firstFloor,
      kind: "floor-week",
      source,
      sourceRecordIds: [id],
    });
  calendar.schedule({
    key: `session-close:${id}`,
    date: adjournAt,
    kind: "session-close",
    source: { ...work.source, asOf: today },
    sourceRecordIds: [id],
  });
}

function introduceBill(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  introduce(api, work.sourceRecordIds[0]!, Number(work.sourceRecordIds[1]));
}

/** A filed change becomes a bill in its sponsor's own chamber. */
function introduce(api: CoreAPI, sessionId: string, index: number): void {
  const row = sessionTable(api).get(sessionId) as unknown as
    LegislativeSession | undefined;
  const filing = row?.filings[index];
  if (!row || !filing || filing.billId) return;
  const bodyOfficeId = originChamber(api, row, filing.sponsor);
  if (!bodyOfficeId) return;
  const bill = draftBill(api, {
    bodyOfficeId,
    sponsorId: filing.sponsor,
    provisions: [
      {
        kind: "policy-question",
        question: filing.question,
        value: filing.direction,
      },
    ],
  });
  sessionTable(api).put({
    ...row,
    filings: row.filings.map((f, i) =>
      i === index ? { ...f, billId: bill.id } : f,
    ),
  } as unknown as ModuleRow);
  billIntroduced?.(api, bill.id);
}

/** The chamber a member sits in: a state member's own office, a member of Congress's House or Senate. */
function originChamber(
  api: CoreAPI,
  row: LegislativeSession,
  sponsor: string,
): string | null {
  if (row.jurisdiction === "US") {
    const senator = members(api, FEDERAL_SENATE).some(
      (t) => memberKey(t) === sponsor,
    );
    return senator ? FEDERAL_SENATE : FEDERAL_HOUSE;
  }
  for (const kind of [
    "legislature-lower",
    "legislature-upper",
    "legislature-unicameral",
  ]) {
    const c = chamber(api, row.jurisdiction, kind);
    if (c?.members.some((t) => memberKey(t) === sponsor)) return c.id;
  }
  return row.bodyOfficeId;
}

/** The chambers a session sits for: Congress's two, or the state's. */
function sessionChambers(
  api: CoreAPI,
  row: Pick<LegislativeSession, "jurisdiction">,
): ReadonlySet<string> {
  return new Set(
    row.jurisdiction === "US"
      ? [FEDERAL_HOUSE, FEDERAL_SENATE]
      : ["legislature-lower", "legislature-upper", "legislature-unicameral"]
          .map((kind) => chamber(api, row.jurisdiction, kind)?.id)
          .filter((id): id is string => id !== undefined),
  );
}

/**
 * The bills in one of a session's chambers that its filings do not carry:
 * the player's own, and any drafted during the sitting or before it by
 * another path. A bill whose vote is already set (`scheduleVote`, as a floor
 * leader grants it) keeps that date and is not among them.
 */
function chamberBills(
  api: CoreAPI,
  row: LegislativeSession,
): readonly BillRow[] {
  const chambers = sessionChambers(api, row);
  const filed = new Set(
    row.filings.flatMap((f) => (f.billId ? [f.billId] : [])),
  );
  const calendar = api.moduleCalendar(LEGISLATURE_MODULE_ID);
  return (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter(
      (b) =>
        chambers.has(b.bodyOfficeId) &&
        !filed.has(b.id) &&
        !calendar.get(`meeting:${b.id}`),
    )
    .sort(
      (a, b) =>
        a.introduced.localeCompare(b.introduced) || a.id.localeCompare(b.id),
    );
}

/** What a session's record says of a bill it took up outside its filings. */
function sessionBillOf(
  drafted: BillRow,
): Pick<SessionBill, "question" | "change" | "sponsor" | "cosponsors"> {
  const p = drafted.provisions[0];
  return {
    question: p?.question ?? p?.series ?? p?.line ?? p?.kind ?? "bill",
    change:
      p && p.value <= 0 && p.kind === "policy-question" ? "repeal" : "enact",
    sponsor: drafted.sponsorId,
    cosponsors: 1,
  };
}

/** A bill waiting on a session's floor, with the filing that brought it if any. */
interface Queued {
  /** Empty for a filing not yet introduced. */
  readonly id: string;
  readonly introduced: string;
  readonly filing: Filing | null;
}

/**
 * The bills waiting on a session's floor, in the leader's order: the
 * filings (one not yet introduced comes in on its filing day), then the
 * chamber's other bills, oldest first.
 */
function floorQueue(api: CoreAPI, row: LegislativeSession): readonly Queued[] {
  const table = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
  const decided = new Set(row.bills.map((b) => b.number));
  const waiting = (b: BillRow | undefined): b is BillRow =>
    !!b && b.status === "drafted" && !decided.has(b.number);
  const today = api.state.date;
  return [
    ...row.filings.flatMap((filing): Queued[] => {
      if (!filing.billId)
        return filing.introduceOn > today
          ? [{ id: "", introduced: filing.introduceOn, filing }]
          : [];
      const b = table.get(filing.billId) as unknown as BillRow | undefined;
      return waiting(b) ? [{ id: b.id, introduced: b.introduced, filing }] : [];
    }),
    ...chamberBills(api, row)
      .filter(waiting)
      .map((b) => ({ id: b.id, introduced: b.introduced, filing: null })),
  ];
}

/**
 * The floor's weeks from `first` to adjournment, each with the bills it
 * takes up: as many as the week allows, each once committee has had it, in
 * the leader's order. The floor week votes the first of them; the floor
 * date and the agenda the members read ahead come from the same weeks.
 */
function* floorWeeks(
  api: CoreAPI,
  row: LegislativeSession,
  first: string,
): Generator<{ readonly date: string; readonly taken: readonly Queued[] }> {
  const committee = campaignParameter("sessionCommitteeDays");
  const queue = floorQueue(api, row);
  const done = new Set<number>();
  for (let date = first; date < row.adjournAt; date = plusDays(date, 7)) {
    const ready = plusDays(date, -committee);
    const taken: Queued[] = [];
    for (const [i, q] of queue.entries()) {
      if (taken.length >= row.perWeek) break;
      if (done.has(i) || q.introduced > ready) continue;
      done.add(i);
      taken.push(q);
    }
    yield { date, taken };
  }
}

/**
 * A week the floor sits: it takes up, in the leader's order, the bills
 * introduced long enough ago for committee to have had them, as many as its
 * days allow; each goes through committee, every chamber and the executive.
 */
function floorWeek(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const id = work.sourceRecordIds[0]!;
  const row = sessionTable(api).get(id) as unknown as
    LegislativeSession | undefined;
  if (!row) return;
  const today = api.state.date;
  const table = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
  const bills = [...row.bills];
  const week = floorWeeks(api, row, today).next();
  for (const q of week.done ? [] : week.value.taken) {
    const drafted = table.get(q.id) as unknown as BillRow | undefined;
    if (!drafted) continue;
    // A member's filing is read against the law as it stands on the floor day.
    const moot = q.filing ? mootAtFloor(api, drafted) : null;
    const bill = moot ? dieMoot(api, drafted, moot) : holdVote(api, drafted.id);
    bills.push({
      number: bill.number,
      ...(q.filing
        ? {
            question: q.filing.question,
            change: q.filing.direction > 0 ? "enact" : "repeal",
            sponsor: q.filing.sponsor,
            cosponsors: q.filing.cosponsors,
          }
        : sessionBillOf(drafted)),
      status: bill.status,
      fate: moot ? "moot" : "voted",
      ...(moot ? { moot } : {}),
      decidedOn: today,
    });
  }
  sessionTable(api).put({ ...row, bills } as unknown as ModuleRow);
  const next = plusDays(today, 7);
  if (next < row.adjournAt)
    api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
      key: `floor-week:${id}:${next}`,
      date: next,
      kind: "floor-week",
      source: { ...work.source, asOf: today },
      sourceRecordIds: [id],
    });
}

/** The session's first floor week after a day: weekly from the end of committee time after it opened. */
function nextFloorWeek(
  row: Pick<LegislativeSession, "firstFloor">,
  after: string,
): string {
  const weeks = Math.max(
    0,
    Math.ceil((daysBetween(row.firstFloor, after) + 1) / 7),
  );
  return plusDays(row.firstFloor, weeks * 7);
}

/** The legislature now sitting for a bill's chamber, if one is. */
function sittingFor(
  api: CoreAPI,
  bodyOfficeId: string,
): LegislativeSession | undefined {
  const today = api.state.date;
  return legislativeSessionsOf(api).find(
    (r) =>
      r.conveneAt <= today &&
      r.adjournAt > today &&
      sessionChambers(api, r).has(bodyOfficeId),
  );
}

/**
 * The floor week a drafted bill is on the floor leader's calendar for, in
 * the legislature now sitting: a vote already set keeps its date, and
 * otherwise it is the week `floorWeeks` takes it up. Null when the bill is
 * not before a sitting legislature, or the session ends before the floor
 * reaches it.
 */
export function floorDateOf(api: CoreAPI, billId: string): string | null {
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  if (!bill || bill.status !== "drafted") return null;
  const set = api
    .moduleCalendar(LEGISLATURE_MODULE_ID)
    .get(`meeting:${billId}`);
  if (set) return set.date;
  const row = sittingFor(api, bill.bodyOfficeId);
  if (!row) return null;
  for (const week of floorWeeks(api, row, nextFloorWeek(row, api.state.date)))
    if (week.taken.some((q) => q.id === billId)) return week.date;
  return null;
}

/**
 * The bills the sitting legislatures' floors take up on a day ahead, which
 * the members read before the vote (the floor's agenda, the whip's ask, the
 * player's stop on the eve of a vote).
 */
function weeklyFloorOn(api: CoreAPI, date: string): readonly string[] {
  const today = api.state.date;
  if (date <= today) return [];
  return legislativeSessionsOf(api)
    .filter(
      (r) =>
        r.conveneAt <= today &&
        r.adjournAt > date &&
        date >= r.firstFloor &&
        daysBetween(r.firstFloor, date) % 7 === 0,
    )
    .flatMap((row) => {
      for (const week of floorWeeks(api, row, nextFloorWeek(row, today))) {
        if (week.date > date) break;
        if (week.date === date)
          return week.taken.flatMap((q) => (q.id ? [q.id] : []));
      }
      return [];
    });
}

/** Adjournment: a bill the floor never reached dies; the body's next session goes on the calendar. */
function closeSession(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const id = work.sourceRecordIds[0]!;
  const row = sessionTable(api).get(id) as unknown as
    LegislativeSession | undefined;
  if (!row) return;
  const decided = new Set(row.bills.map((b) => b.number));
  const bills = [...row.bills];
  for (const f of row.filings) {
    if (!f.billId) continue;
    const drafted = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .get(f.billId) as unknown as BillRow | undefined;
    if (!drafted || decided.has(drafted.number)) continue;
    // Never reached, or held for want of the power to pass it: it dies.
    if (drafted.status !== "drafted" && drafted.status !== "blocked") continue;
    const dead = dieOnCalendar(api, drafted);
    bills.push({
      number: dead.number,
      question: f.question,
      change: f.direction > 0 ? "enact" : "repeal",
      sponsor: f.sponsor,
      cosponsors: f.cosponsors,
      status: dead.status,
      fate: "not-reached",
      decidedOn: api.state.date,
    });
  }
  for (const drafted of chamberBills(api, row)) {
    if (decided.has(drafted.number)) continue;
    if (drafted.status !== "drafted" && drafted.status !== "blocked") continue;
    const dead = dieOnCalendar(api, drafted);
    bills.push({
      number: dead.number,
      ...sessionBillOf(drafted),
      status: dead.status,
      fate: "not-reached",
      decidedOn: api.state.date,
    });
  }
  sessionTable(api).put({ ...row, bills } as unknown as ModuleRow);
  scheduleOpening(api, row.jurisdiction, row.adjournAt, false);
}

/**
 * A town council or county board's regular meeting: its members file the
 * local policies they want that aren't law for the town at any level, or
 * local ones they want gone, within what the state lets its places do, and
 * the presiding member's agenda takes up what the meeting's time allows.
 */
function localMeeting(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const officeId = work.sourceRecordIds[0]!;
  const meetingDate = work.sourceRecordIds[1] ?? api.state.date;
  scheduleMeeting(api, officeId, meetingDate);
  const hold = meetingDate > api.state.date && !!meetingHold?.(api, officeId);
  const body: Body = { id: officeId, members: members(api, officeId) };
  // The presiding member the body elected, else the most senior.
  const presiding = presidingOfficer(api, officeId);
  const leader =
    (presiding
      ? body.members.find((m) => memberKey(m) === presiding)
      : undefined) ?? senior(body.members);
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(officeId) as unknown as
    { kind: string; level: OfficeLevel } | undefined;
  const chain = lawChain(api);
  // Each body legislates for its own government: a county board for its
  // county, a township board for its township, a council for its place.
  const own =
    office?.kind === "county-board"
      ? chain.levels.find((l) => l.level === "county")?.jurisdiction
      : office?.kind === "township-board"
        ? chain.levels.find((l) => l.level === "township")?.jurisdiction
        : chain.levels[chain.levels.length - 1]!.jurisdiction;
  const jurisdiction = own ?? chain.townPlaceId;
  holdSession(api, {
    key: work.key,
    jurisdiction,
    body,
    filers: body.members,
    leader,
    ...(hold ? { holdFor: meetingDate } : {}),
    // One regular meeting: its agenda time at a policy ordinance's hearing
    // and debate.
    floorDays: 1,
    billsPerFloorDay: Math.floor(
      campaignParameter("localMeetingAgendaMinutes") /
        campaignParameter("policyOrdinanceMinutes"),
    ),
    needsChange: (question, direction) =>
      direction > 0
        ? !inForceForTown(api, question)
        : !!own && ownRow(api, own, question) === 1,
    allowed: (question, value) =>
      levelMayDecide(api, office?.level ?? "city", question, value),
    barred: (question, direction) =>
      recentlyDefeated(api, officeId, question, direction),
  });
}

/** The body's bills by number, as they stand now. */
function liveBills(api: CoreAPI, officeId: string): Map<string, BillRow> {
  return new Map(
    (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[]
    )
      .filter((bill) => bill.bodyOfficeId === officeId)
      .map((bill) => [bill.number, bill] as const),
  );
}

/**
 * Whether the body turned this change down within the wait its rules set
 * before a defeated measure comes back (`defeatedMeasureWaitDays`).
 */
function recentlyDefeated(
  api: CoreAPI,
  officeId: string,
  question: string,
  direction: number,
): boolean {
  const since = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) -
      campaignParameter("defeatedMeasureWaitDays") * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  return (
    api
      .moduleState(WORLD_LEGISLATING_MODULE_ID)
      .table("sessions")
      .rows() as unknown as {
      bodyOfficeId: string | null;
      date: string;
      bills?: SessionBill[];
    }[]
  ).some(
    (s) =>
      s.bodyOfficeId === officeId &&
      s.date >= since &&
      (s.bills ?? []).some((b) => {
        // A filing held for the meeting was drafted when the session was
        // written; its vote since is read from the bill itself.
        const status =
          b.status === "drafted"
            ? (liveBills(api, officeId).get(b.number)?.status ?? b.status)
            : b.status;
        return (
          b.question === question &&
          b.change === (direction > 0 ? "enact" : "repeal") &&
          b.fate === "voted" &&
          status !== "drafted" &&
          status !== "enacted" &&
          status !== "overridden" &&
          status !== "awaiting-signature"
        );
      }),
  );
}

/**
 * The body's next regular meeting, on its own rule (office-day-calendar.ts):
 * the place's size band sets how often it meets, and the same rule puts the
 * meeting on the player's calendar. A body that does not meet as a body (one
 * seat) has no meeting.
 */
function scheduleMeeting(
  api: CoreAPI,
  officeId: string,
  after: string = api.state.date,
): void {
  const next = nextMeeting(api, officeId, after, lawChain(api).countyGeoids[0]);
  const meetings = api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("nextMeetings");
  if (!next) {
    meetings.remove(officeId);
    return;
  }
  meetings.put({
    id: officeId,
    date: next.date,
    source: next.rule.source,
  } as unknown as ModuleRow);
  // Members file the day before a meeting the player will sit in, so the
  // bills are on its agenda when the player's stop comes; otherwise on the day.
  const eve = addDays(makeIsoDate(next.date), -1);
  const early = !!meetingHold?.(api, officeId) && eve > api.state.date;
  api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
    key: `local-meeting:${officeId}:${next.date}`,
    date: early ? eve : next.date,
    kind: "local-meeting",
    source: next.rule.source,
    sourceRecordIds: [officeId, next.date],
  });
}

/** One sitting's record: its floor time and every bill it took up. */
export interface SessionRecord {
  readonly id: string;
  readonly stateKey: string;
  readonly bodyOfficeId: string | null;
  readonly date: string;
  readonly leader: string | null;
  readonly floorDays: number;
  /** How many bills the floor's time could take up. */
  readonly floorTime: number;
  readonly bills: readonly SessionBill[];
}

export function sessionsOf(api: CoreAPI): readonly SessionRecord[] {
  return api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("sessions")
    .rows() as unknown as SessionRecord[];
}
