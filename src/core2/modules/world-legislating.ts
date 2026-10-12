/**
 * Other governments legislate (M3-10, first slice): the town's state
 * legislature meets on its real session calendar and passes laws on its own,
 * on the same engine the player uses.
 *
 * At the session's end (NCSL 2026 session calendar), the majority leader (the
 * most senior member of the lower chamber's majority side) brings the
 * policies where the state's law in force differs most from what they want:
 * for each recorded policy question, how strongly their own lean pulls the
 * other way from the state's current answer. The top few (a tunable number
 * per session) are drafted and go through committee, both chambers and the
 * governor; what passes takes effect by the state's own rule and reaches
 * named residents through the law-effects module. Nothing is rolled: the
 * agenda is the leader's choice from their reasons, and every vote is each
 * member's.
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
  holdVote,
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

/** The state's answer in force on a policy question: an enacted row, else its recorded starting answer. */
export function stateAnswer(
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
): { id: string; members: TermRow[] } | null {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const office = (
    offices.table("offices").query("byJurisdiction", [stateKey]) as unknown as {
      id: string;
      kind: string;
    }[]
  ).find((o) => o.kind === kind);
  if (!office) return null;
  const members = (
    offices.table("seats").query("byOffice", [office.id]) as unknown as {
      id: string;
    }[]
  ).flatMap(
    (seat) =>
      offices
        .table("terms")
        .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[],
  );
  return { id: office.id, members };
}

function endOfSession(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "session-end") return;
  const stateKey = work.sourceRecordIds[0]!;
  // Next year's session ends on the same day until a later calendar is recorded.
  const next = `${Number(api.state.date.slice(0, 4)) + 1}${api.state.date.slice(4)}`;
  scheduleSession(api, stateKey, next, {
    tag: "ESTIMATED",
    citation: "this year's session end, carried forward a year",
    asOf: api.state.date,
    estimatedFrom: work.key,
  });
  const lower =
    chamber(api, stateKey, "legislature-lower") ??
    chamber(api, stateKey, "legislature-unicameral");
  if (!lower?.members.length) return;
  const sides = lower.members.map((m) => partySide(m.party));
  const majority = Math.sign(sides.reduce((a, b) => a + b, 0));
  const leader = [...lower.members]
    .filter((m) => partySide(m.party) === majority)
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
    )[0];
  if (!leader) return;
  const leaderKey = leader.personId ?? `official:${leader.id}`;
  const lean = partySide(leader.party) * campaignParameter("identityLeanScale");
  // The leader's agenda: how far each policy in force sits from what they want.
  const agenda = PLATFORM_QUESTIONS.filter(
    (q) => !q.startsWith("us-federal-positions"),
  )
    .map((question) => {
      const want = personStance(lean, question);
      const now = stateAnswer(api, stateKey, question);
      return {
        question,
        want,
        gap:
          now === null ? Math.abs(want) : Math.max(0, -Math.sign(now) * want),
      };
    })
    .filter((item) => item.gap > 0 && item.want !== 0)
    .sort((a, b) => b.gap - a.gap || a.question.localeCompare(b.question))
    .slice(0, campaignParameter("sessionAgendaBills"));
  const bills: BillRow[] = [];
  for (const item of agenda) {
    const bill = draftBill(api, {
      bodyOfficeId: lower.id,
      sponsorId: leaderKey,
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
      stateKey,
      date: api.state.date,
      leader: leaderKey,
      bills: bills.map((b) => ({
        number: b.number,
        question: b.provisions[0]!.question,
        status: b.status,
      })),
    } as unknown as ModuleRow);
}

export function sessionsOf(api: CoreAPI): readonly {
  id: string;
  stateKey: string;
  date: string;
  leader: string;
  bills: { number: string; question: string; status: string }[];
}[] {
  return api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("sessions")
    .rows() as unknown as {
    id: string;
    stateKey: string;
    date: string;
    leader: string;
    bills: { number: string; question: string; status: string }[];
  }[];
}
