/**
 * Other governments legislate (M3-10): the town's state legislature,
 * Congress, the town council and the county board pass laws on their own, on
 * the same engine the player uses.
 *
 * At a state session's end (NCSL 2026 session calendar; a legislature that
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
import sessions from "../../../data/research/laws/state-session-calendars-2026.json" with { type: "json" };
import { leaderOf, presidingOfficer } from "./leadership";
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  campaignParameter,
  personStance,
  PLATFORM_QUESTIONS,
} from "../campaign-views";
import { lawChain, LAWS_MODULE_ID } from "./laws";
import type { LawRowInput } from "../laws-starting";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { partySide } from "../appointments";
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import {
  authorityFor,
  draftBill,
  FEDERAL_HOUSE,
  holdVote,
  leanOf,
  memberKey,
  members,
  POLICY_QUESTIONS,
  FEDERAL_SENATE,
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "./legislature";

export const WORLD_LEGISLATING_MODULE_ID = "core2-world-legislating-v1";

const sessionRows = (
  sessions as unknown as {
    regularSessions: Record<
      string,
      { conveneAt: string; adjournAt: string; sourceUrl?: string }[]
    >;
  }
).regularSessions;

export const WORLD_LEGISLATING_MODULE: CoreModule = {
  id: WORLD_LEGISLATING_MODULE_ID,
  state: { schemaVersion: 1, tables: { sessions: {} } },
  onCalendarWork: (api, work) => onWork(api, work),
};

/** Register the module and put the state's session ends on the calendar. */
export function openWorldLegislating(core: CoreState): void {
  if (!core.modules.has(WORLD_LEGISLATING_MODULE_ID))
    registerModule(core, WORLD_LEGISLATING_MODULE);
  const api = coreAPI(core);
  const stateKey = lawChain(api).stateKey;
  const year = Number(core.date.slice(0, 4));
  const congress = [year, year + 1]
    .map(congressAgendaDate)
    .find((d) => d > core.date)!;
  scheduleSession(api, "US", congress, {
    tag: "ESTIMATED",
    citation: "U.S. House calendar's final weeks (the year's last votes)",
    asOf: core.date,
    estimatedFrom: "congressAgendaDayOfYear",
  });
  // The town's council and its county board meet on their own.
  for (const office of townBodies(api))
    scheduleMeeting(api, office, "localRegularMeetingsPerYear");
  for (const session of sessionRows[stateKey] ?? []) {
    const date = agendaDate(session.adjournAt, session.conveneAt);
    if (date <= core.date) {
      // A session already over when the world opens comes back on the same
      // day the next year it can, as a held session carries itself forward.
      let next = date;
      while (next <= core.date)
        next = `${Number(next.slice(0, 4)) + 1}${next.slice(4)}`;
      scheduleSession(api, stateKey, next, {
        tag: "ESTIMATED",
        citation: "the recorded session's end, carried forward a year",
        asOf: core.date,
        estimatedFrom: session.sourceUrl ?? "NCSL 2026 session calendar",
      });
      continue;
    }
    scheduleSession(api, stateKey, date, {
      tag: "SOURCED",
      citation:
        session.sourceUrl ?? "NCSL 2026 State Legislative Session Calendar",
      asOf: core.date,
    });
  }
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
  // A township board legislates for the town where no council does: its
  // ordinances are the town's own local law (SG-GOV-township-law-level).
  const council = offices.some((o) => o.kind === "council");
  return offices
    .filter((o) => !(council && o.kind === "township-board"))
    .map((o) => o.id)
    .sort();
}

/** Congress's floor day in a year: the tunable day of the year it brings the majority's agenda. */
export function congressAgendaDate(year: number): string {
  return new Date(
    Date.UTC(year, 0, campaignParameter("congressAgendaDayOfYear")),
  )
    .toISOString()
    .slice(0, 10);
}

/** The days a state's recorded sessions bring their agenda to the floor. */
export function sessionAgendaDates(stateKey: string): readonly string[] {
  return (sessionRows[stateKey] ?? [])
    .map((s) => agendaDate(s.adjournAt, s.conveneAt))
    .sort();
}

/** A session's floor day: its adjournment, or for a legislature that sits all year, the end of the tunable agenda month. */
function agendaDate(adjournAt: string, conveneAt: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(adjournAt)) return adjournAt;
  const year = Math.max(2026, Number(conveneAt.slice(0, 4)));
  const month = campaignParameter("fullYearSessionAgendaMonth");
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function scheduleSession(
  api: CoreAPI,
  stateKey: string,
  date: string,
  source: {
    tag: "SOURCED" | "ESTIMATED";
    citation: string;
    asOf: string;
    estimatedFrom?: string;
  },
): void {
  api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
    key: `session-end:${stateKey}:${date}`,
    date,
    kind: "session-end",
    source,
    sourceRecordIds: [stateKey],
  });
}

/** A government's own answer in force on a policy question: its latest enacted row, else its recorded starting answer. */
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
  const answer = POLICY_QUESTIONS[question]?.answers[stateKey]?.answer;
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

/** The House, reached through the town's own House seat's office (bills are introduced there). */
function houseOffice(
  api: CoreAPI,
): { id: string; members: readonly TermRow[] } | null {
  const office = (
    api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
      id: string;
      kind: string;
    }[]
  ).find((o) => o.kind.startsWith("us-house"));
  return office
    ? { id: office.id, members: members(api, FEDERAL_HOUSE) }
    : null;
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
  };
}

/** A member's own reasons to carry a change on a question, pointing one way. */
function filingReason(f: Filer, question: string, direction: number): number {
  return (
    (personStance(f.lean, question) +
      campaignParameter("constituentWeight") * personStance(f.home, question)) *
      direction +
    f.trait
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
  const filers = input.filers.map((t) => filerOf(api, t));
  const leader = input.leader ? filerOf(api, input.leader) : null;
  const filed: {
    question: string;
    direction: number;
    sponsor: Filer;
    cosponsors: number;
    leaderReason: number;
  }[] = [];
  for (const question of input.body ? PLATFORM_QUESTIONS : []) {
    for (const direction of [1, -1]) {
      if (!input.needsChange(question, direction)) continue;
      if (!input.allowed(question, direction)) continue;
      if (input.barred(question, direction)) continue;
      let sponsor: Filer | null = null;
      let best = 0;
      let cosponsors = 0;
      for (const member of filers) {
        const reason = filingReason(member, question, direction);
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
      if (!sponsor) continue;
      filed.push({
        question,
        direction,
        sponsor,
        cosponsors,
        leaderReason: leader ? filingReason(leader, question, direction) : 0,
      });
    }
  }
  // The floor leader's calendar: the most backed first, then their own.
  filed.sort(
    (a, b) =>
      b.cosponsors - a.cosponsors ||
      b.leaderReason - a.leaderReason ||
      a.question.localeCompare(b.question),
  );
  const floorTime = Math.round(input.floorDays * input.billsPerFloorDay);
  const bills: SessionBill[] = [];
  filed.forEach((item, index) => {
    const drafted = draftBill(api, {
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
  if (work.kind === "session-end") endOfSession(api, work);
  if (work.kind === "local-meeting") localMeeting(api, work);
}

function endOfSession(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const jurisdiction = work.sourceRecordIds[0]!;
  // Next year's session ends on the same day until a later calendar is recorded.
  const next = `${Number(api.state.date.slice(0, 4)) + 1}${api.state.date.slice(4)}`;
  scheduleSession(api, jurisdiction, next, {
    tag: "ESTIMATED",
    citation: "this year's session end, carried forward a year",
    asOf: api.state.date,
    estimatedFrom: work.key,
  });
  const lower =
    jurisdiction === "US"
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
  const filers =
    jurisdiction === "US"
      ? [...members(api, FEDERAL_HOUSE), ...members(api, FEDERAL_SENATE)]
      : ["legislature-lower", "legislature-upper", "legislature-unicameral"]
          .map((kind) => chamber(api, jurisdiction, kind))
          .flatMap((c) => c?.members ?? []);
  holdSession(api, {
    key: work.key,
    jurisdiction,
    body: lower,
    filers,
    leader,
    floorDays:
      jurisdiction === "US"
        ? campaignParameter("congressFloorDaysPerYear")
        : sessionFloorDays(jurisdiction, api.state.date),
    billsPerFloorDay: campaignParameter("floorBillsPerLegislativeDay"),
    needsChange: (question, direction) =>
      needsChange(direction, answerIn(api, jurisdiction, question, true)),
    allowed: () => true,
    // A new session takes every bill up afresh.
    barred: () => false,
  });
}

/**
 * The floor days of the session ending today: its recorded length (convening
 * to the floor day, the year before where the convening date falls after it)
 * at the legislature's floor days a week. A session carried forward keeps
 * its recorded dates' length.
 */
export function sessionFloorDays(stateKey: string, date: string): number {
  const monthDay = date.slice(4);
  const session = (sessionRows[stateKey] ?? []).find(
    (s) => agendaDate(s.adjournAt, s.conveneAt).slice(4) === monthDay,
  );
  const year = Number(date.slice(0, 4));
  let convene = `${year}${(session?.conveneAt ?? `${year}-01-01`).slice(4)}`;
  if (convene > date) convene = `${year - 1}${convene.slice(4)}`;
  const days = Math.max(
    1,
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${convene}T00:00:00Z`)) /
      86_400_000,
  );
  return Math.round((days / 7) * campaignParameter("legislativeDaysPerWeek"));
}

/**
 * A town council or county board's regular meeting: its members file the
 * local policies they want that aren't law for the town at any level, or
 * local ones they want gone, within what the state lets its places do, and
 * the presiding member's agenda takes up what the meeting's time allows.
 */
function localMeeting(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const officeId = work.sourceRecordIds[0]!;
  scheduleMeeting(api, officeId, work.key);
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
  // stopgapId: SG-GOV-township-law-level
  if (office?.kind === "township-board")
    api.stopgap("SG-GOV-township-law-level");
  const own =
    office?.kind === "county-board"
      ? chain.levels.find((l) => l.level === "county")?.jurisdiction
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

/** The body's next regular meeting, a tunable interval after today. */
function scheduleMeeting(api: CoreAPI, officeId: string, from: string): void {
  const days = Math.round(
    365 / campaignParameter("localRegularMeetingsPerYear"),
  );
  const date = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) + days * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
    key: `local-meeting:${officeId}:${date}`,
    date,
    kind: "local-meeting",
    source: {
      tag: "ESTIMATED",
      citation: "the body's regular meetings, at the tunable yearly count",
      asOf: api.state.date,
      estimatedFrom: from,
    },
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
