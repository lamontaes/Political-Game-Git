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
import {
  draftBill,
  FEDERAL_HOUSE,
  holdVote,
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
  onCalendarWork: (api, work) => endOfSession(api, work),
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
  for (const session of sessionRows[stateKey] ?? []) {
    const date = agendaDate(session.adjournAt, session.conveneAt);
    if (date <= core.date) continue;
    scheduleSession(api, stateKey, date, {
      tag: "SOURCED",
      citation:
        session.sourceUrl ?? "NCSL 2026 State Legislative Session Calendar",
      asOf: core.date,
    });
  }
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

function endOfSession(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "session-end") return;
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
  // The floor leader: the most senior member of the majority (of the whole
  // body where no party holds one).
  const leader = [...(lower?.members ?? [])]
    .filter((m) => majority === 0 || partySide(m.party) === majority)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
    )[0];
  const leaderKey = leader
    ? (leader.personId ?? `official:${leader.id}`)
    : null;
  const lean = leader
    ? partySide(leader.party) * campaignParameter("identityLeanScale")
    : 0;
  // The leader's agenda: the policies in force furthest from what they want.
  const agenda = PLATFORM_QUESTIONS.map((question) => {
    const want = personStance(lean, question);
    return {
      question,
      want,
      gap: gap(want, answerIn(api, jurisdiction, question)),
    };
  })
    .filter((item) => item.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.question.localeCompare(b.question))
    .slice(0, campaignParameter("sessionAgendaBills"));
  const bills: BillRow[] = [];
  for (const item of lower && leaderKey ? agenda : []) {
    const bill = draftBill(api, {
      bodyOfficeId: lower!.id,
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
      id: work.key,
      stateKey: jurisdiction,
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
