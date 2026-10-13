/**
 * Other governments legislate (M3-10, first slice): the town's state
 * legislature and Congress pass laws on their own, on the same engine the
 * player uses.
 *
 * At a state session's end (NCSL 2026 session calendar; a legislature that
 * sits all year at the end of a tunable month) and at Congress's year-end
 * votes (a tunable day), the majority leader (the most senior member of the
 * lower chamber's majority side) brings the policies furthest from what they
 * want: one they want that isn't law there, or one in force they want gone.
 * The top few (a tunable number per session) are drafted and go through
 * committee, both chambers and the governor or president; what passes takes
 * effect by that government's own rule and reaches named residents through
 * the law-effects module. Nothing is rolled: the agenda is the leader's
 * choice from their reasons, and every vote is each member's.
 */
import sessions from "../../../data/research/laws/state-session-calendars-2026.json" with { type: "json" };
import { leaderOf, presidingOfficer } from "./leadership";
import { officialStance } from "./officials";
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
    scheduleMeeting(api, office, "localAgendaMeetingsPerYear");
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
  return (
    api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
      id: string;
      kind: string;
    }[]
  )
    .filter((o) => o.kind === "council" || o.kind === "county-board")
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
): number | null {
  const rows = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeries", [stateKey, question]) as unknown as LawRowInput[]
  )
    .filter((r) => r.effectiveDate <= api.state.date)
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
 * How far a policy in force sits from what the leader wants: wanting it where
 * it isn't law, or wanting it gone where it is. Nothing to undo where no law
 * stands.
 */
function gap(want: number, now: number | null): number {
  if (want > 0) return now === 1 ? 0 : want;
  return now === 1 ? -want : 0;
}

/** Whether a policy is law for the town at any level (the state's recorded starting answer counting until a state act replaces it). */
function inForceForTown(api: CoreAPI, question: string): boolean {
  const chain = lawChain(api);
  return chain.levels.some(({ level, jurisdiction }) =>
    level === "state"
      ? answerIn(api, jurisdiction, question) === 1
      : ownRow(api, jurisdiction, question) === 1,
  );
}

function ownRow(
  api: CoreAPI,
  jurisdiction: string,
  question: string,
): number | null {
  const row = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeries", [jurisdiction, question]) as unknown as LawRowInput[]
  )
    .filter((r) => r.effectiveDate <= api.state.date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
  return row ? (row.value === 1 ? 1 : -1) : null;
}

interface Body {
  readonly id: string;
  readonly members: readonly TermRow[];
}

/**
 * The presiding leader brings the body's agenda: the few policies furthest
 * from what they want that the body may pass, each drafted and voted on.
 */
function bringAgenda(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly jurisdiction: string;
    readonly body: Body | null;
    readonly leader: TermRow | undefined;
    readonly lean: number;
    readonly gapFor: (question: string, want: number) => number;
    readonly allowed: (question: string, value: number) => boolean;
    readonly bills: number;
  },
): void {
  const leaderKey = input.leader
    ? (input.leader.personId ?? `official:${input.leader.id}`)
    : null;
  // A person leader's traits tilt how much of the unmet gap is worth the
  // floor time; a named official not filled in yet adds nothing.
  const leaderPerson = input.leader?.personId
    ? api.state.people.get(input.leader.personId)
    : undefined;
  const traitTilt = leaderPerson
    ? parameter("traitDecisionWeight") *
      decisionLean(
        api.state,
        leaderPerson,
        "world-legislating.bring-agenda",
        "bring",
        "hold",
      )
    : 0;
  const agenda = PLATFORM_QUESTIONS.map((question) => {
    // An official leader wants what they themselves hold, their own causes
    // included (OPUS-OFFICIALS); anyone else by their lean.
    const want =
      (leaderKey ? officialStance(api, leaderKey, question) : null) ??
      personStance(input.lean, question);
    return { question, want, gap: input.gapFor(question, want) };
  })
    .filter(
      (item) =>
        item.gap > 0 &&
        item.gap + traitTilt > 0 &&
        input.allowed(item.question, Math.sign(item.want)),
    )
    .sort((a, b) => b.gap - a.gap || a.question.localeCompare(b.question))
    .slice(0, input.bills);
  const bills: BillRow[] = [];
  for (const item of input.body && leaderKey ? agenda : []) {
    const bill = draftBill(api, {
      bodyOfficeId: input.body!.id,
      sponsorId: leaderKey!,
      provisions: [
        {
          kind: "policy-question",
          question: item.question,
          value: Math.sign(item.want),
        },
      ],
    });
    bills.push(holdVote(api, bill.id));
  }
  api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("sessions")
    .put({
      id: input.key,
      stateKey: input.jurisdiction,
      bodyOfficeId: input.body?.id ?? null,
      date: api.state.date,
      leader: leaderKey,
      bills: bills.map((b) => ({
        number: b.number,
        question: b.provisions[0]!.question,
        change: b.provisions[0]!.value > 0 ? "enact" : "repeal",
        status: b.status,
      })),
    } as unknown as ModuleRow);
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
  bringAgenda(api, {
    key: work.key,
    jurisdiction,
    body: lower,
    leader,
    // The leader brings what they themselves want (their own position).
    lean: leader ? leanOf(api, leader.personId ?? `official:${leader.id}`) : 0,
    gapFor: (question, want) =>
      gap(want, answerIn(api, jurisdiction, question)),
    allowed: () => true,
    bills: campaignParameter("sessionAgendaBills"),
  });
}

/**
 * A town council or county board meeting with legislation on its agenda: the
 * presiding member (the most senior) brings the local policy they want most
 * that isn't law for the town at any level, or a local one they want gone,
 * within what the state lets its places do.
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
  const own =
    office?.kind === "county-board"
      ? chain.levels.find((l) => l.level === "county")?.jurisdiction
      : chain.levels[chain.levels.length - 1]!.jurisdiction;
  bringAgenda(api, {
    key: work.key,
    jurisdiction: own ?? chain.townPlaceId,
    body,
    leader,
    lean: leader ? leanOf(api, leader.personId ?? `official:${leader.id}`) : 0,
    gapFor: (question, want) =>
      want > 0
        ? inForceForTown(api, question)
          ? 0
          : want
        : own && ownRow(api, own, question) === 1
          ? -want
          : 0,
    allowed: (question, value) =>
      authorityFor(api, { kind: "policy-question", question, value }).allowed,
    bills: campaignParameter("localAgendaBills"),
  });
}

/** The body's next legislative meeting, a tunable interval after today. */
function scheduleMeeting(api: CoreAPI, officeId: string, from: string): void {
  const days = Math.round(
    365 / campaignParameter("localAgendaMeetingsPerYear"),
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
      citation: "local legislative meetings at the tunable yearly count",
      asOf: api.state.date,
      estimatedFrom: from,
    },
    sourceRecordIds: [officeId],
  });
}

export function sessionsOf(api: CoreAPI): readonly {
  id: string;
  stateKey: string;
  date: string;
  leader: string | null;
  bills: {
    number: string;
    question: string;
    change: "enact" | "repeal";
    status: string;
  }[];
}[] {
  return api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("sessions")
    .rows() as unknown as {
    id: string;
    stateKey: string;
    date: string;
    leader: string | null;
    bills: {
      number: string;
      question: string;
      change: "enact" | "repeal";
      status: string;
    }[];
  }[];
}
