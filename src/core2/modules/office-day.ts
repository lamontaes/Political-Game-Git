/**
 * The officeholder's day (office play, OFFICE-LOCAL; one engine for every
 * level, `docs/packages/office-play.md`).
 *
 * - **The body's calendar.** Every local body covering the town (a council,
 *   a township board, a county board) meets on its own rule
 *   (`office-day-calendar.ts`): a date, an hour and a length.
 * - **The meeting.** Its agenda is the bills put before the body
 *   (`placeOnAgenda`). Public comment and each member's vote run through the
 *   legislature and meetings engines when an item is taken up.
 * - **Stops are chosen.** The player picks what stops them (`setStops`):
 *   by default a vote on their own bill, a bill on their desk, an emergency
 *   and election day. A meeting the player stops for holds the clock at its
 *   hour until they adjourn it (`takeUpItem`, `adjourn`); one they don't is
 *   held in the background.
 * - **Simulate or do.** Whatever the player does not decide, the character
 *   decides by the same rule every other member or executive uses: a member
 *   votes their own position, an executive signs or vetoes from theirs. The
 *   player never abstains because they looked away. Each such act is kept
 *   (`acts`) as the character's own, with its reasons.
 */
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import { lawChain } from "./laws";
import { townSeats, type TermRow } from "./offices";
import {
  billOf,
  castMemberVote,
  executiveDecision,
  holdVote,
  LEGISLATURE_MODULE_ID,
  memberKey,
  memberPosition,
  members,
  registerLegislatureHooks,
  settledness,
  tasteForChange,
  type BillRow,
  type DeskAction,
} from "./legislature";
import {
  nextMeeting as nextOnRule,
  officeDayParameter,
  type MeetingRule,
} from "../office-day-calendar";
import type { ModuleStopTokenV1 } from "../player-stops-v1";
import { snapshotExplicitControlV1 } from "../player-control-state-v1";
import { makeIsoDate } from "../../simulation/dates";

export const OFFICE_DAY_MODULE_ID = "core2-office-day-v1";

/** What can stop the player. */
export const STOP_KINDS = [
  "own-bill-vote",
  "every-meeting",
  "desk",
  "emergency",
  "election-day",
] as const;
export type StopKind = (typeof STOP_KINDS)[number];
/** The important few stop by default (owner, Oct 14, 2026: play how you want). */
const DEFAULT_STOPS: Readonly<Record<StopKind, boolean>> = {
  "own-bill-vote": true,
  "every-meeting": false,
  desk: true,
  emergency: true,
  "election-day": true,
};

export interface StopSettingsRow {
  readonly id: string;
  readonly stops: Readonly<Record<StopKind, boolean>>;
  readonly since: string;
}

export interface MeetingRow {
  readonly id: string;
  readonly officeId: string;
  readonly date: string;
  readonly startMinute: number;
  readonly minutes: number;
  /** Bills before the body, in the order they were placed. */
  readonly agenda: readonly string[];
  /** Items already taken up, in order. */
  readonly takenUp: readonly string[];
  readonly status: "scheduled" | "in-session" | "adjourned";
  /** The player's stop held the clock at the meeting's hour. */
  readonly playerPresent: boolean;
  readonly citation: string;
}

/** One act of office, done by the player or by the character on its own. */
export interface OfficeActRow {
  readonly id: string;
  readonly personId: string;
  readonly kind: "vote" | "sign" | "veto";
  readonly how: "did" | "own-choice";
  readonly date: string;
  readonly recordId: string;
  /** For the character's own choice: the position it acted on (the engine's own reasons). */
  readonly position: number | null;
  readonly detail: string;
}

export const OFFICE_DAY_MODULE: CoreModule = {
  id: OFFICE_DAY_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      meetings: { indexes: { byOffice: { fields: ["officeId"] } } },
      agendaItems: {},
      stops: {},
      acts: { indexes: { byPerson: { fields: ["personId"] } } },
    },
  },
  onCalendarWork: officeDayCalendar,
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(OFFICE_DAY_MODULE_ID).table(name);
/** The person the player controls now (a custom start may control a sitting official), else the world's player. */
const playerOf = (api: CoreAPI) =>
  snapshotExplicitControlV1(api.state).personId ??
  (api.state as CoreState).playerId;

export function openOfficeDay(core: CoreState): void {
  registerLegislatureHooks({ beforeVote: ownVote, onDesk: deskArrived });
  if (core.modules.has(OFFICE_DAY_MODULE_ID)) return;
  registerModule(core, OFFICE_DAY_MODULE);
  const api = coreAPI(core);
  const bodies = new Set(townSeats(api).map((s) => s.office.id));
  for (const officeId of [...bodies].sort())
    scheduleMeeting(api, officeId, api.state.date);
}

// ---- Stops -------------------------------------------------------------

export function stopsOf(
  api: CoreAPI,
  personId: string,
): Readonly<Record<StopKind, boolean>> {
  const row = table(api, "stops").get(personId) as unknown as
    StopSettingsRow | undefined;
  return row?.stops ?? DEFAULT_STOPS;
}

/** The player changes what stops them; any day, any kind. */
export function setStops(
  api: CoreAPI,
  personId: string,
  change: Partial<Record<StopKind, boolean>>,
): Readonly<Record<StopKind, boolean>> {
  for (const key of Object.keys(change))
    if (!(STOP_KINDS as readonly string[]).includes(key))
      throw new Error(`Unknown stop: ${key}`);
  const stops = { ...stopsOf(api, personId), ...change };
  table(api, "stops").put({
    id: personId,
    stops,
    since: api.state.date,
  } satisfies StopSettingsRow as unknown as ModuleRow);
  return stops;
}

// ---- The body's calendar -----------------------------------------------

/** The body's next meeting on its rule; a county board's size band reads the town's county. */
const nextMeeting = (api: CoreAPI, officeId: string, after: string) =>
  nextOnRule(api, officeId, after, lawChain(api).countyGeoids[0]);

const dayOffset = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

/**
 * Put the body's next meeting after `after` on the calendar: the agenda is
 * posted the notice period before (the world's day closes after the
 * player's, so a meeting the player attends is known before its hour), and
 * the meeting itself closes on its day.
 */
function scheduleMeeting(api: CoreAPI, officeId: string, after: string): void {
  const next = nextMeeting(api, officeId, after);
  if (!next) return;
  const notice = dayOffset(next.date, -officeDayParameter("agendaNoticeDays"));
  const calendar = api.moduleCalendar(OFFICE_DAY_MODULE_ID);
  const id = meetingId(officeId, next.date);
  calendar.schedule({
    key: `agenda:${id}`,
    date: notice > api.state.date ? notice : api.state.date,
    kind: "agenda",
    source: next.rule.source,
    sourceRecordIds: [officeId, next.date],
  });
  calendar.schedule({
    key: id,
    date: next.date,
    kind: "meeting",
    source: next.rule.source,
    sourceRecordIds: [officeId, next.date],
  });
}

const meetingId = (officeId: string, date: string) =>
  `meeting:${officeId}:${date}`;

/** The body's next meeting on its own rule, from today. */
export function upcomingMeeting(
  api: CoreAPI,
  officeId: string,
): { date: string; rule: MeetingRule } | null {
  return nextMeeting(api, officeId, dayOffset(api.state.date, -1));
}

/**
 * Put a bill before its body at the first regular meeting whose agenda is
 * not yet posted; returns that meeting's date. A bill already placed keeps
 * its place.
 */
export function placeOnAgenda(api: CoreAPI, billId: string): string {
  const bill = billOf(api, billId);
  if (!bill) throw new Error(`No bill ${billId}.`);
  if (bill.status !== "drafted")
    throw new Error(`${bill.number} is not waiting for a vote.`);
  const placed = table(api, "agendaItems").get(billId) as unknown as
    { date: string } | undefined;
  if (placed) return placed.date;
  const next = nextMeeting(
    api,
    bill.bodyOfficeId,
    dayOffset(api.state.date, officeDayParameter("agendaNoticeDays") - 1),
  );
  if (!next) throw new Error(`${bill.bodyOfficeId} has no regular meeting.`);
  table(api, "agendaItems").put({
    id: billId,
    officeId: bill.bodyOfficeId,
    date: next.date,
  } as unknown as ModuleRow);
  return next.date;
}

function agendaFor(api: CoreAPI, officeId: string, date: string): string[] {
  return (
    table(api, "agendaItems").rows() as unknown as {
      id: string;
      officeId: string;
      date: string;
    }[]
  )
    .filter(
      (row) =>
        row.officeId === officeId &&
        row.date <= date &&
        billOf(api, row.id)?.status === "drafted",
    )
    .map((row) => row.id)
    .sort();
}

function officeDayCalendar(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind === "agenda") return postAgenda(api, work);
  if (work.kind === "meeting") return closeMeeting(api, work);
  if (work.kind === "desk-own-choice")
    return deskOwnChoice(api, work.sourceRecordIds[0]!);
}

/**
 * The agenda is posted: the bills placed for this meeting. A member the
 * player plays who stops for this meeting is held at its hour.
 */
function postAgenda(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const [officeId, date] = work.sourceRecordIds as [string, string];
  const rule = nextMeeting(api, officeId, dayOffset(date, -1));
  if (!rule || rule.date !== date) return;
  const agenda = agendaFor(api, officeId, date);
  const player = playerOf(api);
  const seated =
    player !== undefined && members(api, officeId).some(sits(player));
  const stops = player ? stopsOf(api, player) : DEFAULT_STOPS;
  const ownBill = agenda.some((id) => billOf(api, id).sponsorId === player);
  const present =
    seated &&
    snapshotExplicitControlV1(api.state).personId === player &&
    (stops["every-meeting"] || (ownBill && stops["own-bill-vote"]));
  const row: MeetingRow = {
    id: meetingId(officeId, date),
    officeId,
    date,
    startMinute: rule.rule.startMinute,
    minutes: rule.rule.minutes,
    agenda,
    takenUp: [],
    status: "scheduled",
    playerPresent: present,
    citation: rule.rule.source.citation,
  };
  table(api, "meetings").put(row as unknown as ModuleRow);
  if (!present) return;
  const token = api.moduleCalendar(OFFICE_DAY_MODULE_ID).registerStop({
    recordId: row.id,
    controlledPersonId: player!,
    at: { date: makeIsoDate(date), minuteOfDay: row.startMinute },
    kind: "interrupt",
    reasonKey: "office-day.meeting",
    source: rule.rule.source,
    hold: true,
  });
  const held = tokens.get(api.state) ?? new Map<string, ModuleStopTokenV1>();
  held.set(row.id, token);
  tokens.set(api.state, held);
}

/**
 * The meeting's day closes: whatever the player did not take up sits now,
 * each member (the character too) voting their own position, and the next
 * meeting goes on the calendar.
 */
function closeMeeting(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const [officeId, date] = work.sourceRecordIds as [string, string];
  scheduleMeeting(api, officeId, date);
  const row = meetingOf(api, meetingId(officeId, date));
  if (!row || row.status === "adjourned") return;
  const left = row.agenda.filter((id) => !row.takenUp.includes(id));
  for (const billId of left) holdVote(api, billId);
  finish(api, { ...row, takenUp: [...row.takenUp, ...left] });
}

function finish(api: CoreAPI, row: MeetingRow): void {
  const done: MeetingRow = { ...row, status: "adjourned" };
  table(api, "meetings").put(done as unknown as ModuleRow);
  api.emit({
    id: `meeting-held:${row.id}`,
    date: api.state.date,
    kind: "public-meeting",
    personIds: members(api, row.officeId).flatMap((m) =>
      m.personId ? [m.personId] : [],
    ),
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Regular meeting of ${row.officeId}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    facts: {
      meetingId: row.id,
      officeId: row.officeId,
      items: String(row.takenUp.length),
      playerPresent: String(row.playerPresent),
    },
  });
}

export function meetingOf(api: CoreAPI, id: string): MeetingRow | undefined {
  return table(api, "meetings").get(id) as unknown as MeetingRow | undefined;
}

/** The meetings a body has held or will hold today, newest first. */
export function meetingsOf(api: CoreAPI, officeId: string): MeetingRow[] {
  return (
    table(api, "meetings").query("byOffice", [
      officeId,
    ]) as unknown as MeetingRow[]
  ).sort((a, b) => b.date.localeCompare(a.date));
}

/** The meeting holding the player's clock, if any. */
export function meetingInProgress(api: CoreAPI): MeetingRow | undefined {
  return (table(api, "meetings").rows() as unknown as MeetingRow[]).find(
    (row) =>
      row.playerPresent &&
      row.status !== "adjourned" &&
      row.date === api.state.date,
  );
}

/**
 * The player takes up the next item: they vote it, or leave it to the
 * character ("own"). Public comment comes first, then every member's vote.
 */
export function takeUpItem(
  api: CoreAPI,
  meetingIdValue: string,
  billId: string,
  vote: "yes" | "no" | "abstain" | "own",
): BillRow {
  const row = meetingOf(api, meetingIdValue);
  if (
    !row ||
    row.status === "adjourned" ||
    !row.playerPresent ||
    row.date !== api.state.date
  )
    throw new Error("That meeting is not in session.");
  if (!row.agenda.includes(billId) || row.takenUp.includes(billId))
    throw new Error("That item is not waiting on this agenda.");
  const player = playerOf(api)!;
  if (vote !== "own") {
    castMemberVote(api, billId, player, vote);
    keepAct(api, {
      personId: player,
      kind: "vote",
      how: "did",
      recordId: billId,
      position: null,
      detail: vote,
    });
  }
  const bill = holdVote(api, billId);
  table(api, "meetings").put({
    ...row,
    status: "in-session",
    takenUp: [...row.takenUp, billId],
  } as unknown as ModuleRow);
  return bill;
}

/** The chair adjourns: any item left is voted with the character's own votes, and the clock moves on. */
export function adjourn(api: CoreAPI, meetingIdValue: string): MeetingRow {
  const row = meetingOf(api, meetingIdValue);
  if (!row || row.status === "adjourned")
    throw new Error("That meeting is not in session.");
  const left = row.agenda.filter((id) => !row.takenUp.includes(id));
  for (const billId of left) holdVote(api, billId);
  finish(api, { ...row, takenUp: [...row.takenUp, ...left] });
  const token = tokens.get(api.state)?.get(row.id);
  if (token) {
    api.moduleCalendar(OFFICE_DAY_MODULE_ID).releaseStop(token);
    tokens.get(api.state)!.delete(row.id);
  }
  return meetingOf(api, row.id)!;
}

// ---- The character's own choices ---------------------------------------

function keepAct(api: CoreAPI, act: Omit<OfficeActRow, "id" | "date">): void {
  const row: OfficeActRow = {
    ...act,
    id: `office-act:${act.kind}:${act.recordId}:${act.personId}`,
    date: api.state.date,
  };
  table(api, "acts").put(row as unknown as ModuleRow);
}

/**
 * Before any vote: a player who sits on the body and has not chosen votes
 * as the character would, from its own position (the rule every member's
 * vote follows). The ordinances members file at their own meetings are
 * voted at the start of the day, before any stop, so the character votes
 * those itself. stopgapId: SG-OFFICE-member-filings-at-midnight
 */
function ownVote(api: CoreAPI, billId: string): void {
  const player = playerOf(api);
  if (!player || !api.state.modules.has(OFFICE_DAY_MODULE_ID)) return;
  const bill = billOf(api, billId);
  if (!bill || !members(api, bill.bodyOfficeId).some(sits(player))) return;
  const chosen = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("choices")
    .get(`${billId}|${player}`);
  if (chosen) return;
  const position = memberPosition(api, billId, player).total;
  const vote = position > 0 ? "yes" : position < 0 ? "no" : "abstain";
  castMemberVote(api, billId, player, vote);
  keepAct(api, {
    personId: player,
    kind: "vote",
    how: "own-choice",
    recordId: billId,
    position,
    detail: vote,
  });
}

const sits = (personId: string) => (term: TermRow) =>
  term.personId === personId || memberKey(term) === personId;

/** A bill reaches the player's desk: unless the desk stops them, the character decides the next day. */
function deskArrived(api: CoreAPI, action: DeskAction): void {
  if (!api.state.modules.has(OFFICE_DAY_MODULE_ID)) return;
  const player = playerOf(api);
  if (action.status !== "awaiting" || action.executiveId !== player) return;
  if (stopsOf(api, player).desk) return;
  const date = new Date(Date.parse(`${api.state.date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);
  api.moduleCalendar(OFFICE_DAY_MODULE_ID).schedule({
    key: `desk-own-choice:${action.bill.id}`,
    date,
    kind: "desk-own-choice",
    source: {
      tag: "SOURCED",
      citation: `${action.bill.number} on the desk; the player left the desk to the character`,
      asOf: api.state.date,
    },
    sourceRecordIds: [action.bill.id],
  });
}

/**
 * The character signs or vetoes from its own position and temperament.
 * stopgapId: SG-OFFICE-desk-rule-copy
 */
function deskOwnChoice(api: CoreAPI, billId: string): void {
  const bill = billOf(api, billId);
  const player = playerOf(api);
  if (!player || bill?.status !== "awaiting-signature") return;
  api.stopgap("SG-OFFICE-desk-rule-copy");
  const position = memberPosition(api, billId, player).total;
  const person = api.state.people.get(player);
  const temperament = person
    ? parameter("traitDecisionWeight") *
      decisionLean(
        api.state,
        person,
        "legislature.sign-or-veto",
        "sign",
        "veto",
      )
    : 0;
  const settled = bill.provisions.reduce(
    (least, p) =>
      Math.min(
        least,
        settledness(
          api,
          p.kind === "policy-question"
            ? p.question
            : p.kind === "law-amount"
              ? p.series
              : undefined,
        ),
      ),
    1,
  );
  const lean = position + tasteForChange(temperament, settled);
  const sign = lean >= 0;
  keepAct(api, {
    personId: player,
    kind: sign ? "sign" : "veto",
    how: "own-choice",
    recordId: billId,
    position: lean,
    detail: sign ? "sign" : "veto",
  });
  executiveDecision(api, billId, sign);
}

/** The player signs or vetoes a bill on their desk themselves. */
export function decideDesk(
  api: CoreAPI,
  billId: string,
  sign: boolean,
): BillRow {
  const player = playerOf(api);
  const bill = billOf(api, billId);
  if (!player || bill?.status !== "awaiting-signature")
    throw new Error("No bill is waiting on your desk.");
  keepAct(api, {
    personId: player,
    kind: sign ? "sign" : "veto",
    how: "did",
    recordId: billId,
    position: null,
    detail: sign ? "sign" : "veto",
  });
  return executiveDecision(api, billId, sign);
}

/** The acts of office a person took, by the player or on their own. */
export function officeActsOf(api: CoreAPI, personId: string): OfficeActRow[] {
  return table(api, "acts").query("byPerson", [
    personId,
  ]) as unknown as OfficeActRow[];
}

// The stop's token is kept per core so a meeting can release its own hold.
const tokens = new WeakMap<object, Map<string, ModuleStopTokenV1>>();
