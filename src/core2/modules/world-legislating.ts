/**
 * Other governments legislate (M3-10): the town's state legislature,
 * Congress, the town council and the county board pass laws on their own, on
 * the same engine the player uses.
 *
 * At a state session's end (the state session calendar table; a legislature that
 * sits all year at the end of a tunable month), at Congress's year-end votes
 * (a tunable day) and at each regular council or board meeting, every member
 * files the changes their own reasons favor where the law in force differs;
 * members wanting the same change join one bill. The floor leader schedules
 * them by how many members back each, and the floor takes up as many as its
 * time allows: the session's recorded length at the legislature's floor days
 * a week and the floor's pace, Congress's floor days a year, or a meeting's
 * agenda time. Each bill reached goes through committee, every chamber and
 * the executive; what passes takes effect by that government's own rule and
 * reaches named residents through the law-effects module. No count of bills
 * is set anywhere: the volume follows the members' reasons, the law in force
 * and the time. Nothing is rolled: every filing is the member's choice from
 * their reasons, and every vote is each member's. The session's filings,
 * hearings and votes are counted together on its floor day.
 */
import questionScopes from "../../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import geography from "../../../data/research/geography/state-reference.json" with { type: "json" };
import federalAnswers from "../data/legislature/federal-answers.json" with { type: "json" };
import congressSessions from "../data/legislature/congress-sessions.json" with { type: "json" };
import { townConcernShare } from "./meetings";
import { sessionYear } from "../state-session-calendar";
import { leaderOf, presidingOfficer } from "./leadership";
import { officialStance } from "./officials";
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import { nextMeeting } from "../office-day-calendar";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  campaignParameter,
  personStance,
  PLATFORM_QUESTIONS,
} from "../campaign-views";
import { lastEnactment, lawChain, LAWS_MODULE_ID } from "./laws";
import type { LawRowInput } from "../laws-starting";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { partySide } from "../appointments";
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import {
  authorityFor,
  beyondPower,
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
  settledness,
  tasteForChange,
  type BillRow,
  type Sitting,
} from "./legislature";

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
  /** "voted" when it reached the floor; "not-reached" when time ran out first. */
  readonly fate: "voted" | "not-reached";
}

/**
 * What moves a member to carry a change: their views and, at the constituent
 * weight, how their constituents lean (a town member's town, a state or
 * federal member's own seat until district views are modeled), the same
 * parts their vote weighs (`legislature.ts`), plus how their traits lean
 * between filing and holding back. Read once per sitting.
 */
interface Filer {
  readonly term: TermRow;
  readonly key: string;
  readonly lean: number;
  readonly home: number;
  readonly trait: number;
  /** Their own position on a question: an official's own ideal and causes (OPUS-OFFICIALS), anyone else's by their lean. */
  readonly stance: (question: string) => number;
}

function filerOf(api: CoreAPI, term: TermRow): Filer {
  const key = memberKey(term);
  const lean = leanOf(api, key);
  const person = api.state.people.get(key);
  return {
    term,
    key,
    lean,
    home: person ? townLean(api) : lean,
    trait: person
      ? parameter("traitDecisionWeight") *
        decisionLean(
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
function filingReason(
  f: Filer,
  question: string,
  direction: number,
  law: { settled: number; reluctance: number },
): number {
  return (
    (f.stance(question) +
      campaignParameter("constituentWeight") * personStance(f.home, question)) *
      direction +
    // A taste for change backs changing a settled law, not undoing a fresh one.
    tasteForChange(f.trait, law.settled) -
    law.reluctance
  );
}

function townLean(api: CoreAPI): number {
  return (
    (
      api
        .moduleState("core2-campaigns-v1")
        .table("town")
        .get("town") as unknown as { lean: number } | undefined
    )?.lean ?? 0
  );
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
        const reason = filingReason(member, question, direction, law);
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
          filingReason(executive, question, direction, law) <= 0
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
            ? filingReason(leader, question, direction, law)
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
          ? filingReason(leader, question, direction, law)
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
  },
): void {
  const leaderKey = input.leader ? memberKey(input.leader) : null;
  const filed = fileChanges(api, input);
  const floorTime = Math.round(input.floorDays * input.billsPerFloorDay);
  const bills: SessionBill[] = [];
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
    const bill = reached
      ? holdVote(api, drafted.id)
      : dieOnCalendar(api, drafted);
    bills.push({
      number: bill.number,
      question: item.question,
      change: item.direction > 0 ? "enact" : "repeal",
      sponsor: item.sponsor.key,
      cosponsors: item.cosponsors,
      status: bill.status,
      fate: reached ? "voted" : "not-reached",
    });
  });
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
    // The weekly floor days, from the end of committee time after it opened.
    const first = plusDays(sitting.conveneAt, committee);
    const weeks = Math.max(0, Math.ceil((daysBetween(first, today) + 1) / 7));
    const date = plusDays(first, weeks * 7);
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
const daysBetween = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY;

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
          questionForLevel(api, question, federal ? "federal" : "state") &&
          !beyondPower(
            { kind: "policy-question", question, value },
            federal ? "federal" : "state",
          ),
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
  const row: LegislativeSession = {
    id,
    jurisdiction,
    bodyOfficeId: lower?.id ?? null,
    conveneAt,
    adjournAt,
    leader: leader ? memberKey(leader) : null,
    perWeek,
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
  const firstFloor = plusDays(today, campaignParameter("sessionCommitteeDays"));
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
  const ready = plusDays(today, -campaignParameter("sessionCommitteeDays"));
  const decided = new Set(row.bills.map((b) => b.number));
  const bills = [...row.bills];
  let taken = 0;
  for (const f of row.filings) {
    if (taken >= row.perWeek) break;
    if (!f.billId) continue;
    const drafted = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .get(f.billId) as unknown as BillRow | undefined;
    if (!drafted || decided.has(drafted.number)) continue;
    if (drafted.status !== "drafted" || drafted.introduced > ready) continue;
    const bill = holdVote(api, drafted.id);
    bills.push({
      number: bill.number,
      question: f.question,
      change: f.direction > 0 ? "enact" : "repeal",
      sponsor: f.sponsor,
      cosponsors: f.cosponsors,
      status: bill.status,
      fate: "voted",
      decidedOn: today,
    });
    taken += 1;
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
  scheduleMeeting(api, officeId);
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
    .get(officeId) as unknown as { kind: string } | undefined;
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
      questionForLevel(
        api,
        question,
        office?.kind === "county-board" ? "county" : "city",
      ) &&
      !beyondPower({ kind: "policy-question", question, value }, "local") &&
      authorityFor(api, { kind: "policy-question", question, value }).allowed,
    barred: (question, direction) =>
      recentlyDefeated(api, officeId, question, direction),
  });
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
      (s.bills ?? []).some(
        (b) =>
          b.question === question &&
          b.change === (direction > 0 ? "enact" : "repeal") &&
          b.fate === "voted" &&
          b.status !== "enacted" &&
          b.status !== "overridden" &&
          b.status !== "awaiting-signature",
      ),
  );
}

/**
 * The body's next regular meeting, on its own rule (office-day-calendar.ts):
 * the place's size band sets how often it meets, and the same rule puts the
 * meeting on the player's calendar. A body that does not meet as a body (one
 * seat) has no meeting.
 */
function scheduleMeeting(api: CoreAPI, officeId: string): void {
  const next = nextMeeting(
    api,
    officeId,
    api.state.date,
    lawChain(api).countyGeoids[0],
  );
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
  api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
    key: `local-meeting:${officeId}:${next.date}`,
    date: next.date,
    kind: "local-meeting",
    source: next.rule.source,
    sourceRecordIds: [officeId],
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
