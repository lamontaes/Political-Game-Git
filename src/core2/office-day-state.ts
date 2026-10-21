/**
 * The state officeholder's day (OFFICE-STATE, `docs/packages/office-play.md`):
 * a state legislator's and a governor's calendar and acts of office, built
 * through GOV's engines (legislature, leadership, executive, budgets,
 * constituent cases, speech) and read by them.
 *
 * - **The calendar** comes from data: each place's regular session windows
 *   (`state-session-calendar.ts`), a session week's floor and district days,
 *   the interim's monthly committee day, the State of the State and the
 *   budget proposal after convening (`data/office-day/state-parameters.json`).
 *   Nothing names a place; a place whose legislature doesn't meet this year is
 *   in the interim all year.
 * - **Acts of office** are done by the player or simulated: the character
 *   chooses by the same reads a doing player's choice goes through (their
 *   traits' lean for showing up, their own stances for a speech, the engines'
 *   own rule for the budget and the desk), and either way the act goes
 *   through the same engine and leaves the same records.
 * - **Stops** are the player's: the few important kinds stop by default (their
 *   own hearing, the State of the State, a bill on their desk, a crisis,
 *   election day); every other entry runs in the background and still counts.
 * - **Per diem**: every member of the state's legislature is paid their
 *   state's per diem for the session days its basis counts
 *   (`data/office-day/state-legislator-per-diem.json`, cited), from the state's
 *   treasury, on the 1st for the month before.
 *
 * State entries use the shared engine’s holds, settings and act ledger.
 */
import parameterRows from "./data/office-day/state-parameters.json" with { type: "json" };
import perDiemRows from "./data/office-day/state-legislator-per-diem.json" with { type: "json" };
import { sessionYear, type SessionWindow } from "./state-session-calendar";
import { registerModule } from "./state";
import { decisionLean } from "./trait-decisions";
import { closenessBetween } from "./closeness";
import { personLean, personStance, PLATFORM_QUESTIONS } from "./campaign-views";
import { lineForPost, registerLinePayments } from "./budgets-treasury";
import { outsideGovernment } from "./outside-governments";
import { stableHash } from "./kernel/ids";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  appointStatePost,
  appointmentsIn,
  issueOrder,
  pendingGovernorOrders,
} from "./modules/executive";
import { lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  billOf,
  committeeHearingsOn,
  leanOf,
  memberKey,
  members,
  scheduleVote,
  LEGISLATURE_MODULE_ID,
} from "./modules/legislature";
import {
  COMMITTEES,
  committeeAssignment,
  committeeRoster,
  leaderOf,
  LEADERSHIP_MODULE_ID,
  presidingOfficer,
} from "./modules/leadership";
import {
  BUDGETS_MODULE_ID,
  governments,
  setBudgetPriorities,
} from "./modules/budgets";
import {
  CASES_MODULE_ID,
  casesFor,
  handleCase,
  ownCaseDecision,
} from "./modules/constituent-cases";
import { deliverSpeech, SPEECH_MODULE_ID } from "./modules/speech";
import { followersOf, outletsHere } from "./modules/press";
import type { ModuleRow } from "./module-data";
import type {
  ActionDefinition,
  CoreAPI,
  CoreModule,
  CoreState,
  PersonState,
} from "./types";

export const OFFICE_DAY_STATE_MODULE_ID = "core2-office-day-state-v1";
import {
  holdPlayerAt,
  releaseHold,
  stopsOf,
  officeHost,
} from "./modules/office-day";
import { registerOfficeActs, registerStopKinds } from "./office-day-registry";
import { snapshotExplicitControlV1 } from "./player-control-state-v1";

const controlled = (api: CoreAPI) =>
  snapshotExplicitControlV1(api.state).personId ??
  (api.state as CoreState).playerId;
registerStopKinds([
  { kind: "own-hearing", byDefault: true },
  { kind: "state-of-the-state", byDefault: true },
]);

// ---------------------------------------------------------------- data

interface ParameterRow {
  readonly value: unknown;
  readonly tag: string;
  readonly source: string;
}
const PARAMETERS = (
  parameterRows as unknown as { parameters: Record<string, ParameterRow> }
).parameters;

/** A number from the state office day's parameter table. */
export function stateDayParameter(key: string): number {
  const row = PARAMETERS[key];
  if (!row || typeof row.value !== "number")
    throw new Error(`Unknown state office day parameter: ${key}`);
  return row.value;
}

/** What each weekday in session is for a member, Monday to Friday. */
const SESSION_WEEK = PARAMETERS["sessionWeek"]!.value as readonly (
  "floor" | "district"
)[];

export interface PerDiemRow {
  readonly dailyMinor: number;
  readonly basis:
    "session-day" | "calendar-day-in-session" | "none" | "vouchered";
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly spreadMinor: number;
  readonly note: string;
  readonly source: string;
  readonly estimatedFrom?: string;
}
const PER_DIEM = perDiemRows as unknown as {
  asOf: string;
  sources: Record<string, { url: string; title: string }>;
  places: Record<string, PerDiemRow>;
};

/** A place's legislators' per diem, with where the figure comes from. */
export function perDiemOf(
  stateKey: string,
  worldSeed = "",
): (PerDiemRow & { readonly citation: string }) | null {
  const row = PER_DIEM.places[stateKey];
  if (!row) return null;
  const source = PER_DIEM.sources[row.source];
  // Seeded generation of an estimated place fact, never a decision or payout roll.
  const position =
    parseInt(stableHash(`${worldSeed}|${stateKey}|per-diem`).slice(0, 8), 16) /
    0x1_0000_0000;
  const dailyMinor =
    row.tag === "ESTIMATED"
      ? Math.max(
          0,
          Math.round(row.dailyMinor + (2 * position - 1) * row.spreadMinor),
        )
      : row.dailyMinor;
  return {
    ...row,
    dailyMinor,
    citation: `${stateKey} legislator per diem: ${source?.title ?? row.source} (${source?.url ?? "no url"})`,
  };
}

export { lineItemVetoOf } from "./state-item-veto";

// ---------------------------------------------------------------- the office

export type StateRole = "legislator" | "governor";

export interface StateOffice {
  readonly personId: string;
  readonly role: StateRole;
  readonly stateKey: string;
  readonly officeId: string;
  readonly seatId: string;
  readonly termId: string;
  readonly party: string | null;
}

interface OfficeRow {
  readonly id: string;
  readonly kind: string;
  readonly level: string;
  readonly jurisdiction: string;
}

const LEGISLATURE_KINDS = new Set([
  "legislature-lower",
  "legislature-upper",
  "legislature-unicameral",
]);

/** The state office a person holds today, if any (a legislative seat or the governorship). */
export function stateOfficeOf(
  api: CoreAPI,
  personId: string,
): StateOffice | null {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const terms = (
    offices.table("terms").query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((t) => t.status === "serving");
  for (const term of terms) {
    const office = offices.table("offices").get(term.officeId) as unknown as
      OfficeRow | undefined;
    if (!office || office.level !== "state") continue;
    const role: StateRole | null = LEGISLATURE_KINDS.has(office.kind)
      ? "legislator"
      : office.kind === "governor"
        ? "governor"
        : null;
    if (!role) continue;
    return {
      personId,
      role,
      stateKey: office.jurisdiction,
      officeId: office.id,
      seatId: term.seatId,
      termId: term.id,
      party: term.party,
    };
  }
  return null;
}

// ---------------------------------------------------------------- the calendar

export type StateEntryKind =
  | "floor-session"
  | "committee"
  | "caucus"
  | "district-office"
  | "interim-committee"
  | "state-of-the-state"
  | "executive-order"
  | "budget-proposal"
  | "legislative-leaders";

/** One thing on a state officeholder's day. */
export interface StateDayEntry {
  readonly id: string;
  readonly holderId: string;
  readonly date: string;
  readonly kind: StateEntryKind;
  /** The record the entry is about: a committee, a bill, the session window. */
  readonly subject: string;
  /** Where the day's facts come from. */
  readonly source: {
    readonly tag: "SOURCED" | "ESTIMATED";
    readonly citation: string;
  };
}

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 Sunday .. 6 Saturday

function windowsOf(stateKey: string, year: number) {
  const row = sessionYear(stateKey, year);
  return {
    windows: row?.meets ? row.windows : ([] as readonly SessionWindow[]),
    tag: row?.tag ?? ("ESTIMATED" as const),
    url: row?.sourceUrl ?? "state legislative session calendar table",
  };
}

const endOf = (w: SessionWindow, year: number) =>
  w.adjournAt === "full-year" ? `${year}-12-31` : w.adjournAt;

/** The session window a date falls in, if the legislature is sitting. */
export function sessionOn(
  stateKey: string,
  date: string,
): {
  readonly window: SessionWindow;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly url: string;
} | null {
  const year = Number(date.slice(0, 4));
  const { windows, tag, url } = windowsOf(stateKey, year);
  const window = windows.find(
    (w) => w.conveneAt <= date && date <= endOf(w, year),
  );
  return window ? { window, tag, url } : null;
}

/** The first regular session window of a date's year, if the legislature meets that year. */
function firstWindow(stateKey: string, year: number) {
  const { windows, tag, url } = windowsOf(stateKey, year);
  const first = [...windows].sort((a, b) =>
    a.conveneAt.localeCompare(b.conveneAt),
  )[0];
  return first ? { window: first, tag, url } : null;
}

/** The chamber's committees a member sits on, and whether they chair it. */
export function committeesOf(
  api: CoreAPI,
  chamber: string,
  memberId: string,
): readonly { committee: string; chair: boolean }[] {
  if (!api.state.modules.has(LEADERSHIP_MODULE_ID)) return [];
  return COMMITTEES.flatMap((committee) => {
    const roster = committeeRoster(api, chamber, committee);
    return roster?.memberIds.includes(memberId)
      ? [{ committee, chair: roster.chairId === memberId }]
      : [];
  });
}

/**
 * A state officeholder's entries for one date, from the place's calendar and
 * the engines' records: a legislator's floor, committee, caucus and district
 * days in session, and the interim's district days and monthly committee; a
 * governor's State of the State, budget proposal, bills on the desk, and
 * a weekly meeting with the legislature's leaders in session.
 */
export function stateDay(
  api: CoreAPI,
  office: StateOffice,
  date: string,
): readonly StateDayEntry[] {
  const day = weekday(date);
  const workday = day >= 1 && day <= 5;
  const out: StateDayEntry[] = [];
  const add = (
    kind: StateEntryKind,
    subject: string,
    source: StateDayEntry["source"],
  ) =>
    out.push({
      id: `${office.personId}:${date}:${kind}:${subject}`,
      holderId: office.personId,
      date,
      kind,
      subject,
      source,
    });
  const sitting = sessionOn(office.stateKey, date);
  const year = Number(date.slice(0, 4));
  const session = (tag: "SOURCED" | "ESTIMATED", url: string) => ({
    tag,
    citation: `Regular session, ${office.stateKey} (${url})`,
  });
  // A tunable value is an estimate in the record's terms.
  const estimated = (key: string) => ({
    tag: "ESTIMATED" as const,
    citation: `${key} (${PARAMETERS[key]?.tag}): ${PARAMETERS[key]?.source ?? ""}`,
  });
  if (office.role === "legislator") {
    if (sitting && workday) {
      const role = SESSION_WEEK[day - 1]!;
      const windowId = `session:${office.stateKey}:${sitting.window.conveneAt}`;
      if (role === "floor") {
        if (day === stateDayParameter("caucusWeekday"))
          add("caucus", windowId, estimated("caucusWeekday"));
        add("floor-session", windowId, session(sitting.tag, sitting.url));
        if (stateDayParameter("committeeMeetsBeforeFloor") > 0)
          for (const seat of committeesOf(
            api,
            office.officeId,
            office.personId,
          ))
            add(
              "committee",
              `${office.officeId}:${seat.committee}`,
              estimated("committeeMeetsBeforeFloor"),
            );
      } else add("district-office", office.seatId, estimated("sessionWeek"));
    } else if (!sitting && workday) {
      add("district-office", office.seatId, estimated("sessionWeek"));
      if (
        Number(date.slice(8, 10)) ===
        stateDayParameter("interimCommitteeDayOfMonth")
      )
        for (const seat of committeesOf(api, office.officeId, office.personId))
          add(
            "interim-committee",
            `${office.officeId}:${seat.committee}`,
            estimated("interimCommitteeDayOfMonth"),
          );
    }
    return out;
  }
  // The governor.
  if (workday)
    for (const order of pendingGovernorOrders(api, office.personId))
      add("executive-order", order.order, {
        tag: "SOURCED",
        citation: `Governor powers and current law: ${order.order}`,
      });
  const first = firstWindow(office.stateKey, year);
  if (first) {
    const windowId = `session:${office.stateKey}:${first.window.conveneAt}`;
    const address = addDays(
      makeIsoDate(first.window.conveneAt),
      stateDayParameter("stateOfTheStateDaysAfterConvening"),
    );
    if (address === date)
      add("state-of-the-state", windowId, {
        tag: "ESTIMATED",
        citation: `${estimated("stateOfTheStateDaysAfterConvening").citation}; session ${first.url}`,
      });
    const budget = addDays(
      makeIsoDate(first.window.conveneAt),
      stateDayParameter("budgetProposalDaysAfterConvening"),
    );
    if (budget === date)
      add("budget-proposal", office.stateKey, {
        tag: "ESTIMATED",
        citation: `${estimated("budgetProposalDaysAfterConvening").citation}; session ${first.url}`,
      });
  }
  if (sitting && day === stateDayParameter("leadersWeekday"))
    add(
      "legislative-leaders",
      `session:${office.stateKey}:${sitting.window.conveneAt}`,
      estimated("leadersWeekday"),
    );
  return out;
}

// ---------------------------------------------------------------- stops

/** Whether an entry stops its holder, by the stop kind it falls under. */
export function stopKindOf(api: CoreAPI, entry: StateDayEntry): string | null {
  if (entry.kind === "committee" || entry.kind === "interim-committee") {
    const [chamber, committee] = splitCommittee(entry.subject);
    const roster = committeeRoster(api, chamber, committee);
    return roster?.chairId === entry.holderId ? "own-hearing" : null;
  }
  if (entry.kind === "state-of-the-state") return "state-of-the-state";
  return null;
}

const splitCommittee = (subject: string): [string, string] => {
  const at = subject.lastIndexOf(":");
  return [subject.slice(0, at), subject.slice(at + 1)];
};

// ---------------------------------------------------------------- acts

/** What the player chose for an entry; left out, the character chooses. */
export type StateChoice =
  | { readonly kind: "order"; readonly revoke: boolean }
  | { readonly kind: "attend"; readonly attend: boolean }
  | {
      readonly kind: "office-hours";
      readonly hold: boolean;
      readonly cases?: Readonly<Record<string, "help" | "decline">>;
    }
  | {
      readonly kind: "address";
      readonly stances: readonly {
        readonly question: string;
        readonly position: number;
      }[];
    }
  | {
      readonly kind: "budget";
      readonly changes: Readonly<Record<string, number>>;
    };

/** What an entry came to: who chose, what, and the records it wrote. */
export interface StateEntryResult {
  readonly id: string;
  readonly holderId: string;
  readonly date: string;
  readonly kind: StateEntryKind;
  readonly subject: string;
  readonly stop: string | null;
  readonly by: "player" | "character";
  readonly choice: StateChoice;
  /** The records the act wrote in other engines, by id. */
  readonly recordIds: readonly string[];
  /** Why the character chose as it did, where it chose. */
  readonly reasons: Readonly<Record<string, number | string>>;
}

const DUTY_DECISION = "office-day-state.attend";

/** The character's own lean toward showing up: duty beside their traits. */
function ownAttendance(
  api: CoreAPI,
  person: Readonly<PersonState>,
  duty: number,
): { attend: boolean; lean: number; duty: number } {
  const lean = decisionLean(api.state, person, DUTY_DECISION, "attend", "skip");
  return { attend: duty + lean > 0, lean, duty };
}

/** The colleagues in a room: the chamber's members who are people, or a committee's. */
function room(api: CoreAPI, entry: StateDayEntry, office: StateOffice) {
  if (entry.kind === "committee" || entry.kind === "interim-committee") {
    const [chamber, committee] = splitCommittee(entry.subject);
    return committeeRoster(api, chamber, committee)?.memberIds ?? [];
  }
  if (entry.kind === "caucus") {
    const side = office.party;
    return members(api, office.officeId)
      .filter((t) => t.party === side)
      .map(memberKey);
  }
  return [];
}

/** Time together with each colleague in the room: their tie grows (or begins). */
function spendTime(
  api: CoreAPI,
  holderId: string,
  others: readonly string[],
  sourceId: string,
): string[] {
  const hours = stateDayParameter("meetingHours");
  const placeId = lawChain(api).townPlaceId;
  const touched: string[] = [];
  for (const other of others) {
    if (other === holderId || !api.state.people.get(other)?.alive) continue;
    const id = [holderId, other].sort().join(":");
    if ((api.state as CoreState).relationships.has(id))
      api.relationship(holderId, other, "contact", hours, undefined, {
        cause: "office-day-state.meeting",
        sourceId,
      });
    else
      api.meet(holderId, other, {
        placeId,
        sourceId,
        cause: "office-day-state.meeting",
        hours,
      });
    touched.push(id);
  }
  return touched;
}

/**
 * What a member at a committee sits through: the record that seated the
 * committee (who assigned it, and when) and each hearing it held that day,
 * with the bill, the chair, the witnesses and the vote. Written into the
 * entry's reasons; the ids it returns are the records read.
 */
function committeeSitting(
  api: CoreAPI,
  entry: StateDayEntry,
  reasons: Record<string, number | string>,
): string[] {
  const [chamber, committee] = splitCommittee(entry.subject);
  const ids: string[] = [];
  const seated = committeeAssignment(api, chamber, committee);
  if (seated) {
    ids.push(seated.id);
    reasons["assignedBy"] = seated.assignedBy;
    reasons["seatedSince"] = seated.since;
  }
  for (const hearing of committeeHearingsOn(
    api,
    chamber,
    committee,
    entry.date,
  )) {
    ids.push(hearing.id);
    reasons[`hearing:${hearing.id}`] = hearing.heard ? "heard" : "held";
    reasons[`chair:${hearing.id}`] = hearing.chairId;
    reasons[`bill:${hearing.id}`] = hearing.billId;
    reasons[`witnesses:${hearing.id}`] = hearing.witnesses
      .map((w) => w.personId)
      .join(",");
    reasons[`vote:${hearing.id}`] = `${hearing.yes}-${hearing.no}`;
  }
  return ids;
}

/** The state's treasury, or the outside payer standing for another state's. */
function stateTreasury(api: CoreAPI, stateKey: string): string {
  if (api.state.modules.has(BUDGETS_MODULE_ID)) {
    const own = governments(api).find(
      (g) => g.level === "state" && g.id === stateKey,
    );
    if (own) return own.organizationId;
  }
  return outsideGovernment(api, stateKey);
}

/** Do (the player's choice) or simulate (the character's) one entry. */
export function actOn(
  api: CoreAPI,
  entry: StateDayEntry,
  choice?: StateChoice,
): StateEntryResult {
  const office = stateOfficeOf(api, entry.holderId);
  const person = api.state.people.get(entry.holderId);
  if (!office || !person)
    throw new Error(`${entry.holderId} holds no state office.`);
  const existing = table(api, "results").get(entry.id) as unknown as
    StateEntryResult | undefined;
  if (existing) return existing;
  const by = choice ? "player" : "character";
  const recordIds: string[] = [];
  const reasons: Record<string, number | string> = {};
  let chosen: StateChoice;
  switch (entry.kind) {
    case "floor-session":
    case "committee":
    case "interim-committee":
    case "caucus": {
      const own = ownAttendance(
        api,
        person,
        stateDayParameter("attendanceDuty"),
      );
      chosen = choice ?? { kind: "attend", attend: own.attend };
      if (!choice) Object.assign(reasons, { duty: own.duty, traits: own.lean });
      if (chosen.kind !== "attend") throw new Error("Choose to attend or not.");
      const sourceId = `office-day:${entry.id}`;
      if (chosen.attend) {
        recordIds.push(
          ...spendTime(api, entry.holderId, room(api, entry, office), sourceId),
        );
      }
      // A member at their committee learns where they sit, and what it heard
      // that day, from the records that seated and convened it.
      if (
        chosen.attend &&
        (entry.kind === "committee" || entry.kind === "interim-committee")
      )
        recordIds.push(...committeeSitting(api, entry, reasons));
      if (entry.kind === "floor-session")
        table(api, "attendance").put({
          id: `${entry.holderId}:${entry.date}`,
          personId: entry.holderId,
          stateKey: office.stateKey,
          date: entry.date,
          attended: chosen.attend,
        } as unknown as ModuleRow);
      if (entry.kind === "caucus") {
        const leader = caucusLeader(api, office);
        if (leader) reasons["leader"] = leader;
      }
      break;
    }
    case "district-office": {
      const own = ownAttendance(
        api,
        person,
        stateDayParameter("officeHoursDuty"),
      );
      chosen = choice ?? { kind: "office-hours", hold: own.attend };
      if (!choice) Object.assign(reasons, { duty: own.duty, traits: own.lean });
      if (chosen.kind !== "office-hours")
        throw new Error("Choose whether to hold office hours.");
      if (chosen.hold && api.state.modules.has(CASES_MODULE_ID))
        for (const row of casesFor(api, entry.holderId)) {
          if (row.status !== "open") continue;
          const decision =
            chosen.cases?.[row.id] ??
            ownCaseDecision(api, entry.holderId).decision;
          const done = handleCase(api, row.id, decision);
          if (done) recordIds.push(done.id);
        }
      break;
    }
    case "executive-order": {
      const own = pendingGovernorOrders(api, entry.holderId).find(
        (row) => row.order === entry.subject,
      );
      chosen = choice ?? { kind: "order", revoke: own?.revoke ?? false };
      if (chosen.kind !== "order")
        throw new Error("Choose whether to revoke the order.");
      if (choice || own)
        recordIds.push(
          issueOrder(api, {
            executiveId: entry.holderId,
            order: entry.subject,
            revoke: chosen.revoke,
          }).lawId,
        );
      reasons["authority"] = entry.subject;
      reasons["rule"] = "governor-views-and-law-in-force";
      break;
    }
    case "state-of-the-state": {
      chosen = choice ?? {
        kind: "address",
        stances: ownPriorities(api, person),
      };
      if (chosen.kind !== "address") throw new Error("Choose what to say.");
      recordIds.push(...stateOfTheState(api, office, entry, chosen.stances));
      break;
    }
    case "budget-proposal": {
      const gov = api.state.modules.has(BUDGETS_MODULE_ID)
        ? governments(api).find(
            (g) => g.level === "state" && g.id === office.stateKey,
          )
        : undefined;
      // The character proposes by the budgets engine's own rule for an
      // executive (their lean on each line's direction), which the
      // legislature reads when no priorities are set; the player writes
      // their own.
      chosen = choice ?? { kind: "budget", changes: {} };
      if (chosen.kind !== "budget") throw new Error("Choose budget changes.");
      if (gov && choice) {
        setBudgetPriorities(api, {
          governmentId: gov.id,
          setBy: entry.holderId,
          changes: chosen.changes,
        });
        recordIds.push(`priorities:${gov.id}`);
      } else if (gov) {
        reasons["rule"] = "executive-priorities";
        reasons["lean"] = leanOf(api, entry.holderId);
        recordIds.push(`priorities:${gov.id}:executive-rule`);
      }
      break;
    }
    case "legislative-leaders": {
      const own = ownAttendance(
        api,
        person,
        stateDayParameter("attendanceDuty"),
      );
      chosen = choice ?? { kind: "attend", attend: own.attend };
      if (!choice) Object.assign(reasons, { duty: own.duty, traits: own.lean });
      if (chosen.kind !== "attend") throw new Error("Choose to meet or not.");
      if (chosen.attend)
        recordIds.push(
          ...spendTime(
            api,
            entry.holderId,
            legislativeLeaders(api, office.stateKey),
            `office-day:${entry.id}`,
          ),
        );
      break;
    }
  }
  const result: StateEntryResult = {
    id: entry.id,
    holderId: entry.holderId,
    date: entry.date,
    kind: entry.kind,
    subject: entry.subject,
    stop: stopKindOf(api, entry),
    by,
    choice: chosen,
    recordIds,
    reasons,
  };
  table(api, "results").put(result as unknown as ModuleRow);
  officeHost.keep(api, {
    personId: entry.holderId,
    kind: entry.kind,
    how: choice ? "did" : "own-choice",
    recordId: entry.id,
    position: null,
    detail: JSON.stringify({ choice: chosen, recordIds, reasons }),
  });
  releaseHold(api, entry.id);
  table(api, "entries").remove(entry.id);
  api.emit({
    id: `office-act:${entry.id}`,
    date: api.state.date,
    kind: "office-act",
    personIds: [entry.holderId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: entry.source.tag,
      citation: entry.source.citation,
      asOf: api.state.date,
      ...(entry.source.tag === "ESTIMATED"
        ? { estimatedFrom: "data/office-day/state-parameters.json" }
        : {}),
    },
    publicRecord: entry.kind !== "district-office",
    news: entry.kind === "state-of-the-state",
    facts: {
      entry: entry.kind,
      subject: entry.subject,
      by,
      choice: JSON.stringify(chosen),
    },
  });
  return result;
}

/** The leader of the member's own party in their chamber (the majority or minority leader). */
export function caucusLeader(api: CoreAPI, office: StateOffice): string | null {
  if (!api.state.modules.has(LEADERSHIP_MODULE_ID)) return null;
  const majority = leaderOf(api, office.officeId, "majority-leader");
  const minority = leaderOf(api, office.officeId, "minority-leader");
  const partyOf = (id: string | null) =>
    id
      ? members(api, office.officeId).find((t) => memberKey(t) === id)?.party
      : undefined;
  if (majority && partyOf(majority) === office.party) return majority;
  if (minority && partyOf(minority) === office.party) return minority;
  return majority ?? minority;
}

/** The legislature's leaders the governor deals with: each chamber's presiding officer and floor leaders. */
export function legislativeLeaders(
  api: CoreAPI,
  stateKey: string,
): readonly string[] {
  if (!api.state.modules.has(LEADERSHIP_MODULE_ID)) return [];
  const chambers = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .query("byJurisdiction", [stateKey]) as unknown as OfficeRow[]
  ).filter((o) => LEGISLATURE_KINDS.has(o.kind));
  const out = new Set<string>();
  for (const chamber of chambers.sort((a, b) => a.id.localeCompare(b.id)))
    for (const id of [
      presidingOfficer(api, chamber.id),
      leaderOf(api, chamber.id, "majority-leader"),
      leaderOf(api, chamber.id, "minority-leader"),
    ])
      if (id) out.add(id);
  return [...out];
}

/** A person's strongest stances: what they'd make the State of the State about. */
function ownPriorities(
  api: CoreAPI,
  person: Readonly<PersonState>,
): readonly { question: string; position: number }[] {
  const lean = personLean(api.state.people, person, 0);
  return PLATFORM_QUESTIONS.map((question) => ({
    question,
    stance: personStance(lean, question),
  }))
    .filter((q) => q.stance !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.stance) - Math.abs(a.stance) ||
        a.question.localeCompare(b.question),
    )
    .slice(0, stateDayParameter("stateOfTheStateTopics"))
    .map((q) => ({ question: q.question, position: Math.sign(q.stance) }));
}

/**
 * The State of the State: the governor speaks to the legislature in joint
 * session, one call to act on each priority, and the town's residents who
 * follow a news outlet hear it through the press. The speech engine moves
 * each listener by the governor's standing with them.
 */
function stateOfTheState(
  api: CoreAPI,
  office: StateOffice,
  entry: StateDayEntry,
  stances: readonly { question: string; position: number }[],
): string[] {
  if (!api.state.modules.has(SPEECH_MODULE_ID)) return [];
  const chambers = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .query("byJurisdiction", [office.stateKey]) as unknown as OfficeRow[]
  ).filter((o) => LEGISLATURE_KINDS.has(o.kind));
  const legislators = chambers.flatMap((c) =>
    members(api, c.id).map(memberKey),
  );
  const followers = outletsHere(api).flatMap((o) => followersOf(api, o.id));
  const audienceIds = [...new Set([...legislators, ...followers])]
    .filter((id) => id !== office.personId && api.state.people.get(id)?.alive)
    .sort();
  const ids: string[] = [];
  for (const stance of stances) {
    const id = `speech:state-of-the-state:${entry.id}:${stance.question}`;
    deliverSpeech(api, {
      id,
      speakerId: office.personId,
      placeId: lawChain(api).townPlaceId,
      topic: stance.question,
      desiredChange: stance.position > 0 ? "enact" : "repeal",
      audienceIds,
    });
    ids.push(id);
  }
  return ids;
}

// ---------------------------------------------------------------- per diem

/** One month's per diem paid to a member: the ledger transfer and why. */
export interface PerDiemPaid {
  readonly id: string;
  readonly personId: string;
  readonly month: string;
  readonly days: number;
  readonly paidMinor: number;
  readonly shortMinor: number;
  readonly payerId: string;
  readonly citation: string;
}

export function perDiemPaidTo(
  api: CoreAPI,
  personId: string,
): readonly PerDiemPaid[] {
  return table(api, "perDiem").query("byPerson", [
    personId,
  ]) as unknown as PerDiemPaid[];
}

/**
 * Pays each member of the state's legislature their per diem for last month's
 * session days, by the place's basis: every calendar day in session, or each
 * session day they attended (the player's floor sessions as recorded; any
 * other member's by their own lean toward showing up).
 */
function payPerDiem(api: CoreAPI): Record<string, number> {
  const paidByLine: Record<string, number> = {};
  const stateKey = lawChain(api).stateKey;
  const rate = perDiemOf(stateKey, api.state.seed);
  if (!rate || rate.basis === "none" || rate.dailyMinor <= 0) return paidByLine;
  const today = api.state.date;
  const firstOfLast = `${addDays(makeIsoDate(today), -1).slice(0, 7)}-01`;
  const days: string[] = [];
  for (let d = firstOfLast; d < today; d = addDays(makeIsoDate(d), 1))
    if (sessionOn(stateKey, d)) days.push(d);
  if (!days.length) return paidByLine;
  const floorDays = days.filter((d) => {
    const w = weekday(d);
    return w >= 1 && w <= 5 && SESSION_WEEK[w - 1] === "floor";
  });
  const chambers = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .query("byJurisdiction", [stateKey]) as unknown as OfficeRow[]
  ).filter((o) => LEGISLATURE_KINDS.has(o.kind));
  const payer = stateTreasury(api, stateKey);
  const accounts = api.accounts();
  for (const chamber of chambers)
    for (const term of members(api, chamber.id)) {
      const id = memberKey(term);
      const person = api.state.people.get(id);
      if (!person?.alive) continue;
      // Only the days they held the seat (a member seated mid-month).
      const served = (d: string) => d >= term.startDate;
      let count: number;
      if (rate.basis === "calendar-day-in-session")
        count = days.filter(served).length;
      else {
        const own = ownAttendance(
          api,
          person,
          stateDayParameter("attendanceDuty"),
        ).attend;
        count = floorDays.filter((d) => {
          const recorded = table(api, "attendance").get(
            `${id}:${d}`,
          ) as unknown as { attended: boolean } | undefined;
          return served(d) && (recorded?.attended ?? own);
        }).length;
      }
      if (count <= 0) continue;
      const transferId = `per-diem:${id}:${firstOfLast.slice(0, 7)}`;
      if (table(api, "perDiem").get(transferId)) continue;
      const citation = `${count} session days at ${rate.dailyMinor} a day (${rate.basis}). ${rate.citation}`;
      const receipt = accounts.transfer({
        id: transferId,
        from: accounts.main(payer),
        to: accounts.main(id),
        amountMinor: count * rate.dailyMinor,
        reasonKey: "official.per-diem",
        partial: true,
        source: {
          tag: rate.tag,
          asOf: today,
          citation,
          ...(rate.estimatedFrom ? { estimatedFrom: rate.estimatedFrom } : {}),
        },
      });
      const line = lineForPost("state", `office:${term.seatId}`);
      paidByLine[line] = (paidByLine[line] ?? 0) + receipt.paidMinor;
      table(api, "perDiem").put({
        id: transferId,
        personId: id,
        month: firstOfLast.slice(0, 7),
        days: count,
        paidMinor: receipt.paidMinor,
        shortMinor: receipt.shortMinor,
        payerId: payer,
        citation,
      } satisfies PerDiemPaid as unknown as ModuleRow);
    }
  return paidByLine;
}

// ---------------------------------------------------------------- shared engine lifecycle

const table = (api: CoreAPI, name: string) =>
  api.moduleState(OFFICE_DAY_STATE_MODULE_ID).table(name);

/** Today's scheduled entries for a holder, waiting on the player or the character. */
export function waitingEntries(
  api: CoreAPI,
  holderId: string,
): readonly (StateDayEntry & { readonly stop: string | null })[] {
  const termId = stateOfficeOf(api, holderId)?.termId;
  return (
    table(api, "entries").query("byHolder", [
      holderId,
    ]) as unknown as (StateDayEntry & { stop: string | null })[]
  )
    .filter(
      (e) =>
        !table(api, "results").get(e.id) &&
        (e as { termId?: string }).termId === termId,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The player does one waiting entry with their own choice. */
export function doEntry(
  api: CoreAPI,
  entryId: string,
  choice: StateChoice,
): StateEntryResult {
  const entry = table(api, "entries").get(entryId) as unknown as
    StateDayEntry | undefined;
  if (!entry || table(api, "results").get(entryId))
    throw new Error(`No entry ${entryId} is waiting.`);
  return actOn(api, entry, choice);
}

export function resultsOf(
  api: CoreAPI,
  holderId: string,
): readonly StateEntryResult[] {
  return (
    table(api, "results").query("byHolder", [
      holderId,
    ]) as unknown as StateEntryResult[]
  )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** The evening before: tomorrow's entries for the player, if they hold a state office. */
function scheduleTomorrow(api: CoreAPI): void {
  const playerId = controlled(api);
  if (!playerId) return;
  const office = stateOfficeOf(api, playerId);
  if (!office) return;
  const tomorrow = addDays(makeIsoDate(api.state.date), 1);
  const stops = stopsOf(api, playerId);
  for (const entry of stateDay(api, office, tomorrow)) {
    if (
      table(api, "entries").get(entry.id) ||
      table(api, "results").get(entry.id)
    )
      continue;
    const kind = stopKindOf(api, entry);
    if (kind && stops[kind])
      holdPlayerAt(api, {
        recordId: entry.id,
        date: entry.date,
        minuteOfDay: stateDayParameter("holdMinute"),
        reasonKey: `office-day.${kind}`,
        source: {
          ...entry.source,
          asOf: api.state.date,
          ...(entry.source.tag === "ESTIMATED"
            ? { estimatedFrom: "state-parameters.json" }
            : {}),
        },
      });
    table(api, "entries").put({
      ...entry,
      termId: office.termId,
      stop: kind && stops[kind] ? kind : null,
    } as unknown as ModuleRow);
  }
}

/** The morning: what the player hasn't done of today's entries, the character does. */
function liveToday(api: CoreAPI): void {
  const playerId = controlled(api);
  if (!playerId) return;
  const termId = stateOfficeOf(api, playerId)?.termId;
  const scheduled = (
    table(api, "entries").rows() as unknown as (StateDayEntry & {
      stop: string | null;
    })[]
  )
    .filter((e) => !table(api, "results").get(e.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const entry of scheduled) {
    // An entry of an office the player has since left goes with the office.
    if ((entry as { termId?: string }).termId !== termId) {
      releaseHold(api, entry.id);
      table(api, "entries").remove(entry.id);
      continue;
    }
    if (entry.date <= api.state.date) actOn(api, entry);
  }
}

/** Seat the day's entries for a player just seated in a state office (the dev start, or taking office). */
export function startStateDay(api: CoreAPI): void {
  scheduleTomorrow(api);
}

export const OFFICE_DAY_STATE_MODULE: CoreModule = {
  id: OFFICE_DAY_STATE_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      entries: { indexes: { byHolder: { fields: ["holderId"] } } },
      results: { indexes: { byHolder: { fields: ["holderId"] } } },
      attendance: {},
      leaderRequests: { indexes: { byBill: { fields: ["billId"] } } },
      perDiem: { indexes: { byPerson: { fields: ["personId"] } } },
    },
  },
  // Records only: the shared office-day engine drives the lifecycle below.
};

// The treasury pays these obligations after revenue arrives and before residual spending.
registerLinePayments((api, gov) =>
  api.state.modules.has(OFFICE_DAY_STATE_MODULE_ID) &&
  gov.level === "state" &&
  gov.id === lawChain(api).stateKey
    ? payPerDiem(api)
    : {},
);

registerOfficeActs({
  id: "state-calendar",
  acts: ["state-office-entry", "governor-appointment"].map(
    (id) =>
      ({
        id,
        actKinds: ["commit", "follow-rules", "engage"],
        goalKinds: ["change-condition"],
        need: "safety",
        effortParameter: "stateOfficeEntryHours",
        effectParameter: "one",
        targetKind: "state-office-entry",
        effect: id,
        emotion: {
          moodMultiplierParameter: "one",
          stressMultiplierParameter: "one",
        },
      }) satisfies ActionDefinition,
  ),
  parameters: {
    stateOfficeEntryHours: {
      value: stateDayParameter("meetingHours"),
      tag: "ESTIMATED",
      citation: PARAMETERS["meetingHours"]!.source,
      estimatedFrom: "state-parameters.json:meetingHours",
      spread: {
        low: 1,
        high: 4,
        unit: "hours",
        citation: PARAMETERS["meetingHours"]!.source,
      },
    },
  },
  providers: {
    "state-office-entry": (api, actor, action) => {
      if (actor.id !== controlled(api)) return [];
      if (action.id === "governor-appointment") {
        const office = stateOfficeOf(api, actor.id);
        if (office?.role !== "governor") return [];
        return appointmentsIn(api, office.stateKey)
          .filter(
            (row) =>
              row.appointedBy !== actor.id ||
              !api.state.people.get(row.holderId)?.alive,
          )
          .map((row) => ({
            definition: action,
            targetId: row.post,
            availableHours: api.parameter(action.effortParameter),
          }));
      }
      return waitingEntries(api, actor.id)
        .filter((entry) => entry.date === api.state.date)
        .map((entry) => ({
          definition: action,
          targetId: entry.id,
          availableHours: api.parameter(action.effortParameter),
        }));
    },
  },
  handlers: {
    "governor-appointment": (api, _actorId, offer) => {
      appointGovernor(api, offer.targetId);
    },
    "state-office-entry": (api, actorId, offer) => {
      const entry = waitingEntries(api, actorId).find(
        (row) => row.id === offer.targetId,
      );
      if (entry) actOn(api, entry);
    },
  },
  onDay(api) {
    liveToday(api);
  },
  onAfterDay: scheduleTomorrow,
});

export function openOfficeDayState(core: CoreState): void {
  if (!core.modules.has(OFFICE_DAY_STATE_MODULE_ID))
    registerModule(core, OFFICE_DAY_STATE_MODULE);
}

/**
 * The seat a state officeholder holding the town would sit in: the
 * governorship, or the town's own seat in the lower (or only) chamber, else
 * the upper. Null where the offices data seats no such chamber for the town
 * (a territory whose legislature's districts aren't in the data).
 */
export function seatCoveringTown(
  api: CoreAPI,
  role: StateRole,
  chamberKind?: string,
): { office: OfficeRow; seat: { id: string } } | null {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const kinds =
    role === "governor"
      ? ["governor"]
      : chamberKind
        ? [chamberKind]
        : ["legislature-lower", "legislature-unicameral", "legislature-upper"];
  const chambers = (
    offices
      .table("offices")
      .query("byJurisdiction", [
        lawChain(api).stateKey,
      ]) as unknown as OfficeRow[]
  )
    .filter((o) => kinds.includes(o.kind))
    .sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind));
  for (const office of chambers) {
    const seat = (
      offices.table("seats").query("byOffice", [office.id]) as unknown as {
        id: string;
        coversTown?: boolean;
      }[]
    )
      .filter((s) => s.coversTown)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (seat) return { office, seat };
  }
  return null;
}

/**
 * Dev mode's custom start as a sitting state officeholder (the package's
 * "custom start as a sitting officeholder"): the serving holder's term ends
 * and the player serves out the rest of it, as a winner takes office; the
 * officials and pay engines read the took-office event. A legislator takes
 * the town's own seat in the chamber.
 * stopgapId: SG-STATE-dev-seat-player
 */
export function seatPlayerInStateOffice(
  api: CoreAPI,
  input: {
    readonly personId: string;
    readonly role: StateRole;
    /** For a legislator: the chamber kind; the lower or only chamber by default. */
    readonly chamberKind?: string;
  },
): StateOffice {
  api.stopgap("SG-STATE-dev-seat-player");
  const person = api.state.people.get(input.personId);
  if (!person?.alive) throw new Error(`No living person ${input.personId}.`);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const stateKey = lawChain(api).stateKey;
  const found = seatCoveringTown(api, input.role, input.chamberKind);
  if (!found)
    throw new Error(`No ${input.role} seat in ${stateKey} covers the town.`);
  const { office, seat } = found;
  const terms = offices.table("terms");
  const serving = terms.query("bySeatStatus", [
    seat.id,
    "serving",
  ]) as unknown as TermRow[];
  const date = api.state.date;
  for (const term of serving)
    terms.put({
      ...term,
      status: "ended",
      endDate: date,
      endEstimated: false,
      endedBy: "dev start: the player took the seat",
    } as unknown as ModuleRow);
  const previous = serving[0];
  const termId = `term:${seat.id}:${date}:dev-start`;
  terms.put({
    id: termId,
    seatId: seat.id,
    officeId: office.id,
    personId: person.id,
    identity: {
      givenName: person.givenName,
      familyName: person.familyName,
      gender: "recorded",
      birthDate: person.birthDate,
      homeState: stateKey,
    },
    // The seat's party stands until the dev start reads the player's own.
    party: previous?.party ?? null,
    startDate: date,
    endDate: previous?.endDate ?? null,
    endEstimated: previous?.endEstimated ?? true,
    reached: "dev start as a sitting officeholder",
    status: "serving",
  } as unknown as ModuleRow);
  api.emit({
    id: `took-office:${seat.id}:${date}`,
    date,
    kind: "took-office",
    personIds: [person.id],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "ESTIMATED",
      citation: "Dev mode custom start as a sitting officeholder",
      asOf: date,
      estimatedFrom: "SG-STATE-dev-seat-player",
    },
    publicRecord: true,
    news: false,
    facts: { office: office.id, seatId: seat.id, winnerId: person.id },
  });
  const held = stateOfficeOf(api, person.id);
  if (!held) throw new Error("The seat did not take.");
  if (api.state.modules.has(OFFICE_DAY_STATE_MODULE_ID)) scheduleTomorrow(api);
  return held;
}

/** The governor's choice of a named appointee, through the executive's confirmation and payroll. */
export function appointGovernor(api: CoreAPI, post: string, personId?: string) {
  const executiveId = controlled(api);
  if (!executiveId || stateOfficeOf(api, executiveId)?.role !== "governor")
    throw new Error("Control the sitting governor to appoint a post.");
  const row = appointStatePost(api, { executiveId, post, personId });
  officeHost.keep(api, {
    personId: executiveId,
    kind: "appointment",
    how: personId ? "did" : "own-choice",
    recordId:
      row?.id ??
      `nomination:${lawChain(api).stateKey}:${post}:${personId ?? "own-choice"}:${api.state.date}`,
    position: null,
    detail: row ? row.holderId : "not-appointed",
  });
  return row;
}

const LEADER_DECISION = "office-day-state.leader-request";

/** A member's request to the floor leader to schedule their bill, and the leader's answer with the reasons. */
export interface LeaderRequestRow {
  readonly id: string;
  readonly memberId: string;
  readonly billId: string;
  readonly leaderId: string;
  readonly date: string;
  readonly granted: boolean;
  /** The sitting the bill was put on when the leader agreed. */
  readonly scheduledFor: string | null;
  readonly reasons: Readonly<Record<string, number>>;
}

/**
 * A member asks their chamber's majority leader, who sets the floor's agenda,
 * to schedule a bill. The leader answers from their party, their tie to the
 * member and their own traits; a yes puts the bill on the body's next sitting
 * (the legislature's own scheduling), a no leaves it off, and either way the
 * request keeps the leader's reasons.
 */
export function askLeaderForHearing(
  api: CoreAPI,
  memberId: string,
  billId: string,
): LeaderRequestRow {
  const id = `leader-request:${billId}`;
  const existing = table(api, "leaderRequests").get(id) as unknown as
    LeaderRequestRow | undefined;
  if (existing) return existing;
  const office = stateOfficeOf(api, memberId);
  if (!office || office.role !== "legislator")
    throw new Error(`${memberId} holds no state legislative seat.`);
  const bill = billOf(api, billId);
  if (!bill || bill.status !== "drafted")
    throw new Error(`${billId} is not waiting for a vote.`);
  if (bill.bodyOfficeId !== office.officeId)
    throw new Error(`${billId} is before another chamber.`);
  // A partisan chamber's majority leader sets the floor's agenda; a
  // nonpartisan unicameral body has only its speaker.
  const leaderId =
    leaderOf(api, office.officeId, "majority-leader") ??
    presidingOfficer(api, office.officeId);
  const leader = leaderId ? api.state.people.get(leaderId) : undefined;
  if (!leaderId || !leader)
    throw new Error("The chamber has no one who sets its agenda.");
  const leaderParty = members(api, office.officeId).find(
    (t) => memberKey(t) === leaderId,
  )?.party;
  const reasons = {
    party:
      (leaderParty === office.party ? 1 : -1) *
      stateDayParameter("leaderRequestPartyWeight"),
    tie:
      closenessBetween(api.state as CoreState, leaderId, memberId) *
      stateDayParameter("leaderRequestTieWeight"),
    traits:
      decisionLean(api.state, leader, LEADER_DECISION, "grant", "refuse") *
      stateDayParameter("leaderRequestTraitWeight"),
  };
  const granted = Object.values(reasons).reduce((a, b) => a + b, 0) > 0;
  const already = api
    .moduleCalendar(LEGISLATURE_MODULE_ID)
    .get(`meeting:${billId}`);
  const row: LeaderRequestRow = {
    id,
    memberId,
    billId,
    leaderId,
    date: api.state.date,
    granted,
    scheduledFor: granted ? (already?.date ?? scheduleVote(api, billId)) : null,
    reasons,
  };
  table(api, "leaderRequests").put(row as unknown as ModuleRow);
  return row;
}
