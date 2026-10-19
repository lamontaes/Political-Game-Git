import type { ItemVetoSelection } from "../state-item-veto";
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
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { lawChain } from "./laws";
import { signUpToSpeak } from "./meetings";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";
import { BUDGETS_MODULE_ID, governments, withholdPay } from "./budgets";
import { notePublicPay } from "../budgets-treasury";
import { startPublicJob } from "../public-payroll";
import { seatPay } from "../office-day-pay";
import {
  localOfficeKit,
  type OfficeActHost,
  type Prepared,
} from "../office-day-acts";
import {
  officeActKits,
  officeStopKinds,
  registerOfficeActs,
  registerStopKinds,
} from "../office-day-registry";
import {
  billOf,
  castMemberVote,
  chambersOf,
  executiveDecision,
  executiveItemVeto,
  executiveLean,
  holdVote,
  LEGISLATURE_MODULE_ID,
  memberKey,
  memberPosition,
  members,
  registerLegislatureHooks,
  type BillRow,
  type DeskAction,
} from "./legislature";
import {
  nextMeeting as nextOnRule,
  bodyPopulation,
  officeDayParameter,
  type MeetingRule,
} from "../office-day-calendar";
import type { ModuleStopTokenV1 } from "../player-stops-v1";
import { snapshotExplicitControlV1 } from "../player-control-state-v1";
import { addDays, makeIsoDate } from "../kernel/dates";

export const OFFICE_DAY_MODULE_ID = "core2-office-day-v1";

/**
 * What can stop the player: the local kinds here, and whatever kinds the
 * other levels register (`office-day-registry.ts`). Election day always
 * stops them at the polls (the polling-place scene): whether the character
 * may not cast the player's ballot (owner, Oct 13).
 * An emergency stop waits on the disasters engine's declarations.
 */
registerStopKinds([
  // The important few stop by default (owner, Oct 14, 2026: play how you want).
  { kind: "own-bill-vote", byDefault: true },
  { kind: "every-meeting", byDefault: false },
  { kind: "desk", byDefault: true },
]);
export type StopKind = string;
/** Every kind that may stop the player, in the order registered. */
export function stopKinds(): readonly string[] {
  return officeStopKinds().map((row) => row.kind);
}
const defaultStops = (): Record<string, boolean> =>
  Object.fromEntries(officeStopKinds().map((row) => [row.kind, row.byDefault]));

export interface StopSettingsRow {
  readonly id: string;
  readonly stops: Readonly<Record<string, boolean>>;
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
  /** vote, sign, veto, case, town-hall, interview, meet-department-head, name-department-head. */
  readonly kind: string;
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
      officeJobs: { indexes: { byPerson: { fields: ["personId"] } } },
      world: {},
      prepared: {},
    },
  },
  onCalendarWork: officeDayCalendar,
  onAfterDay(api) {
    for (const kit of officeActKits()) kit.onAfterDay?.(api);
  },
  // Filled from every registered level's kit when the engine opens.
  offerProviders: {},
  effectHandlers: {},
  onDay(api) {
    // A job starts or ends before a day's work, so the roster is read here
    // and the office jobs change in the next day's calendar work: when the
    // roster grows, and on the 1st for terms that ended.
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms").size;
    const payday = api.state.date.endsWith("-01");
    if (payday || seenTerms.get(api.state) !== terms) {
      seenTerms.set(api.state, terms);
      scheduleOfficeReview(api);
    }
    if (payday) payStipends(api);
    for (const kit of officeActKits()) kit.onDay?.(api);
    return undefined;
  },
};
const seenTerms = new WeakMap<object, number>();

const table = (api: CoreAPI, name: string) =>
  api.moduleState(OFFICE_DAY_MODULE_ID).table(name);
/** The person the player controls now (a custom start may control a sitting official), else the world's player. */
const playerOf = (api: CoreAPI) =>
  snapshotExplicitControlV1(api.state).personId ??
  (api.state as CoreState).playerId;

/**
 * What a level's kit may use from the engine: the offices a person holds,
 * keeping an act on the record, what the player prepared, and whether an
 * act was already taken this year.
 */
export const officeHost: OfficeActHost = {
  officesOf: (api, personId) =>
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("byPerson", [personId]) as unknown as TermRow[]
    )
      .filter((term) => term.status === "serving")
      .map((term) => term.officeId),
  keep: (api, row) => keepAct(api, row),
  prepared: (api, personId, actId) => preparedFor(api, personId, actId),
  clearPrepared: (api, personId, actId) =>
    table(api, "prepared").remove(`${personId}|${actId}`),
  given: (api, personId, kind, year) => gaveInYear(api, personId, kind, year),
  lastGiven: (api, personId, kind) =>
    officeActsOf(api, personId)
      .filter((row) => row.kind === kind)
      .map((row) => row.date)
      .sort()
      .at(-1),
};
registerOfficeActs(localOfficeKit(officeHost));

export function openOfficeDay(core: CoreState, worldSeed: string): void {
  registerLegislatureHooks({ beforeVote: ownVote, onDesk: deskArrived });
  const providers = OFFICE_DAY_MODULE.offerProviders as Record<string, unknown>;
  const handlers = OFFICE_DAY_MODULE.effectHandlers as Record<string, unknown>;
  for (const kit of officeActKits()) {
    Object.assign(providers, kit.providers ?? {});
    Object.assign(handlers, kit.handlers ?? {});
  }
  if (core.modules.has(OFFICE_DAY_MODULE_ID)) return;
  registerModule(core, OFFICE_DAY_MODULE);
  const api = coreAPI(core);
  table(api, "world").put({
    id: "seed",
    seed: worldSeed,
  } as unknown as ModuleRow);
  reviewOfficeJobs(api);
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
  return { ...defaultStops(), ...(row?.stops ?? {}) };
}

/** The player changes what stops them; any day, any kind. */
export function setStops(
  api: CoreAPI,
  personId: string,
  change: Readonly<Record<StopKind, boolean>>,
): Readonly<Record<StopKind, boolean>> {
  for (const key of Object.keys(change))
    if (!stopKinds().includes(key)) throw new Error(`Unknown stop: ${key}`);
  const stops: Record<string, boolean> = {
    ...stopsOf(api, personId),
    ...change,
  };
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
  const work = {
    source: next.rule.source,
    sourceRecordIds: [officeId, next.date],
  };
  // The agenda's notice day has passed (the world opened inside it): it is
  // posted now.
  if (notice <= api.state.date) postAgenda(api, work);
  else
    calendar.schedule({
      ...work,
      key: `agenda:${id}`,
      date: notice,
      kind: "agenda",
    });
  calendar.schedule({ ...work, key: id, date: next.date, kind: "meeting" });
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
  if (work.kind === "office-review") return reviewOfficeJobs(api);
}

/** Tomorrow's calendar work seats new holders in their office jobs and ends those whose term ended. */
function scheduleOfficeReview(api: CoreAPI): void {
  const date = dayOffset(api.state.date, 1);
  const calendar = api.moduleCalendar(OFFICE_DAY_MODULE_ID);
  const key = `office-review:${date}`;
  if (calendar.get(key)) return;
  calendar.schedule({
    key,
    date,
    kind: "office-review",
    source: {
      tag: "SOURCED",
      citation: "The offices engine's roster of terms changed",
      asOf: api.state.date,
    },
    sourceRecordIds: [OFFICES_MODULE_ID],
  });
}

/**
 * The agenda is posted: the bills placed for this meeting. A member the
 * player plays who stops for this meeting is held at its hour.
 */
function postAgenda(
  api: CoreAPI,
  work: Readonly<Pick<ModuleCalendarWork, "sourceRecordIds">>,
): void {
  const [officeId, date] = work.sourceRecordIds as [string, string];
  const rule = nextMeeting(api, officeId, dayOffset(date, -1));
  if (!rule || rule.date !== date) return;
  const agenda = agendaFor(api, officeId, date);
  const player = playerOf(api);
  const seated =
    player !== undefined && members(api, officeId).some(sits(player));
  const stops = player ? stopsOf(api, player) : defaultStops();
  const ownBill = agenda.some((id) => billOf(api, id).sponsorId === player);
  const present =
    seated &&
    snapshotExplicitControlV1(api.state).personId === player &&
    (stops["every-meeting"] === true ||
      (ownBill && stops["own-bill-vote"] === true));
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
  )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
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

/**
 * The player speaks on an item before it is taken up, for or against; every
 * member hears it at the vote, as they hear public comment (the meetings
 * engine).
 */
export function speakOnItem(
  api: CoreAPI,
  meetingIdValue: string,
  billId: string,
  position: 1 | -1,
): void {
  const row = meetingOf(api, meetingIdValue);
  if (
    !row ||
    row.status === "adjourned" ||
    !row.playerPresent ||
    row.date !== api.state.date ||
    !row.agenda.includes(billId) ||
    row.takenUp.includes(billId)
  )
    throw new Error("That item is not waiting on this agenda.");
  const player = playerOf(api)!;
  const remark = signUpToSpeak(api, { billId, personId: player, position });
  keepAct(api, {
    personId: player,
    kind: "speak",
    how: "did",
    recordId: remark.id,
    position,
    detail: position > 0 ? "for" : "against",
  });
}

/** The chair adjourns: any item left is voted with the character's own votes, and the clock moves on. */
export function adjourn(api: CoreAPI, meetingIdValue: string): MeetingRow {
  const row = meetingOf(api, meetingIdValue);
  if (!row || row.status === "adjourned")
    throw new Error("That meeting is not in session.");
  const left = row.agenda.filter((id) => !row.takenUp.includes(id));
  for (const billId of left) holdVote(api, billId);
  finish(api, { ...row, takenUp: [...row.takenUp, ...left] });
  releaseHeld(api, row.id);
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
  // A member of either chamber votes on a bill that crosses both: a senator
  // the player controls votes a House bill when it reaches the Senate.
  if (
    !bill ||
    !chambersOf(api, bill).some((chamber) =>
      members(api, chamber).some(sits(player)),
    )
  )
    return;
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
  const date = dayOffset(api.state.date, 1);
  if (stopsOf(api, player).desk) {
    // The desk stops the player the next morning, if they hold the clock;
    // otherwise it waits until the deadline the office's law sets.
    if (snapshotExplicitControlV1(api.state).personId !== player) return;
    const token = api.moduleCalendar(OFFICE_DAY_MODULE_ID).registerStop({
      recordId: deskStopId(action.bill.id),
      controlledPersonId: player,
      at: {
        date: makeIsoDate(date),
        minuteOfDay: officeDayParameter("deskMinute"),
      },
      kind: "interrupt",
      reasonKey: "office-day.desk",
      source: {
        tag: "SOURCED",
        citation: `${action.bill.number} passed and is on the desk until ${action.signBy ?? "its deadline"}`,
        asOf: api.state.date,
      },
      hold: true,
    });
    const held = tokens.get(api.state) ?? new Map<string, ModuleStopTokenV1>();
    held.set(deskStopId(action.bill.id), token);
    tokens.set(api.state, held);
    return;
  }
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
 * The character signs or vetoes by the legislature engine's own executive
 * lean: its position and temperament, scaled by how settled the law is.
 */
function deskOwnChoice(api: CoreAPI, billId: string): void {
  const bill = billOf(api, billId);
  const player = playerOf(api);
  if (!player || bill?.status !== "awaiting-signature") return;
  const { lean } = executiveLean(api, billId, player);
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
  const decided = executiveDecision(api, billId, sign);
  releaseHeld(api, deskStopId(billId));
  return decided;
}

/** The governor strikes appropriation items under the place's law and lets the body weigh overrides. */
export function decideDeskItems(
  api: CoreAPI,
  billId: string,
  itemIndices: readonly (number | ItemVetoSelection)[],
): BillRow {
  const player = playerOf(api);
  if (!player) throw new Error("No officeholder is controlled.");
  const decided = executiveItemVeto(api, billId, player, itemIndices);
  keepAct(api, {
    personId: player,
    kind: "item-veto",
    how: "did",
    recordId: billId,
    position: null,
    detail: JSON.stringify(itemIndices),
  });
  releaseHeld(api, deskStopId(billId));
  return decided;
}

/** The player leaves a bill on the desk to the character, who decides it now. */
export function leaveDeskToCharacter(api: CoreAPI, billId: string): BillRow {
  if (billOf(api, billId)?.status !== "awaiting-signature")
    throw new Error("No bill is waiting on your desk.");
  deskOwnChoice(api, billId);
  releaseHeld(api, deskStopId(billId));
  return billOf(api, billId);
}

/** Bills on the player's desk now. */
export function deskWaiting(api: CoreAPI): BillRow[] {
  const player = playerOf(api);
  return (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as (BillRow & { signBy?: string })[]
  ).filter(
    (b) =>
      b.status === "awaiting-signature" &&
      tokens.get(api.state)?.has(deskStopId(b.id)) &&
      player !== undefined,
  );
}

const deskStopId = (billId: string) => `desk:${billId}`;

/**
 * Hold the player's clock at a moment of a level's own (a session day's
 * floor vote, a hearing): the stop holds until `releaseHold`. Only for the
 * person the player controls; returns false when no one is controlled.
 */
export function holdPlayerAt(
  api: CoreAPI,
  input: {
    readonly recordId: string;
    readonly date: string;
    readonly minuteOfDay: number;
    readonly reasonKey: string;
    readonly source: Source;
  },
): boolean {
  const player = snapshotExplicitControlV1(api.state).personId;
  if (!player) return false;
  const token = api.moduleCalendar(OFFICE_DAY_MODULE_ID).registerStop({
    recordId: input.recordId,
    controlledPersonId: player,
    at: { date: makeIsoDate(input.date), minuteOfDay: input.minuteOfDay },
    kind: "interrupt",
    reasonKey: input.reasonKey,
    source: input.source,
    hold: true,
  });
  const held = tokens.get(api.state) ?? new Map<string, ModuleStopTokenV1>();
  held.set(input.recordId, token);
  tokens.set(api.state, held);
  return true;
}

/** Release a hold set by `holdPlayerAt`. */
export function releaseHold(api: CoreAPI, recordId: string): void {
  releaseHeld(api, recordId);
}

function releaseHeld(api: CoreAPI, recordId: string): void {
  const token = tokens.get(api.state)?.get(recordId);
  if (!token) return;
  api.moduleCalendar(OFFICE_DAY_MODULE_ID).releaseStop(token);
  tokens.get(api.state)!.delete(recordId);
}

/** The acts of office a person took, by the player or on their own. */
export function officeActsOf(api: CoreAPI, personId: string): OfficeActRow[] {
  return table(api, "acts").query("byPerson", [
    personId,
  ]) as unknown as OfficeActRow[];
}

// The stop's token is kept per core so a meeting can release its own hold.
const tokens = new WeakMap<object, Map<string, ModuleStopTokenV1>>();

// ---- The office is a job -----------------------------------------------

/** A local seat held as a job: its hours, its pay and who pays it. */
export interface OfficeJobRow {
  /** The term's id: one job per holder per term. */
  readonly id: string;
  readonly personId: string;
  readonly officeId: string;
  readonly seatId: string;
  readonly title: string;
  readonly annualMinor: number;
  readonly weeklyHours: number;
  readonly fullTime: boolean;
  /** The town's or county's treasury. */
  readonly payerId: string;
  /** The payroll job, for a full-time seat; a part-time holder keeps their own job. */
  readonly jobId: string | null;
  /** Paid for every day before this one (a part-time seat's stipend). */
  readonly paidFrom: string;
  readonly endedOn: string | null;
  readonly citation: string;
  /** The last stipend paid, for the record. */
  readonly lastPaid?: { readonly on: string; readonly amountMinor: number };
}

const COUNTY_KINDS = new Set(["county-board", "county-executive"]);

/** Seat new local holders in their office job; end the job of a term that ended. */
export function reviewOfficeJobs(api: CoreAPI): void {
  const seed =
    (table(api, "world").get("seed") as unknown as { seed: string } | undefined)
      ?.seed ?? "";
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  for (const raw of table(api, "officeJobs").rows()) {
    const row = raw as unknown as OfficeJobRow;
    if (row.endedOn) continue;
    const term = terms.get(row.id) as unknown as TermRow | undefined;
    if (term?.status === "serving") continue;
    const ended = term?.endDate ?? api.state.date;
    if (row.jobId) {
      // Calendar work runs before the day's work, so the job ends cleanly.
      const state = api.state as CoreState;
      const job = state.jobs.get(row.jobId);
      // A holder who played their day before this ran (the controlled
      // character) worked today already: the job ends in tomorrow's review.
      if (state.work.lastAttendanceByJob.get(row.jobId)?.date === state.date)
        continue;
      if (job && job.endsAt === undefined)
        api.endJob(row.jobId, `office-ended:${row.seatId}:${ended}`);
    }
    table(api, "officeJobs").put({
      ...row,
      endedOn: ended < api.state.date ? ended : api.state.date,
    } as unknown as ModuleRow);
  }
  const govs = api.state.modules.has("core2-budgets-v1")
    ? governments(api)
    : [];
  const countyGeoid = lawChain(api).countyGeoids[0];
  for (const { office, seat, holder } of townSeats(api)) {
    if (!holder?.personId || holder.status !== "serving") continue;
    if (table(api, "officeJobs").get(holder.id)) continue;
    const person = api.state.people.get(holder.personId);
    if (!person?.alive) continue;
    const county = COUNTY_KINDS.has(office.kind);
    const payer = govs.find((g) => g.level === (county ? "county" : "city"));
    if (!payer) continue;
    const pay = seatPay({
      officeKind: office.kind,
      officeId: office.id,
      population: bodyPopulation(api, office.kind, countyGeoid),
      worldSeed: seed,
    });
    if (!pay) continue;
    // A full-time seat is the holder's job, paid on the payroll like any
    // public post; a part-time holder keeps their own job.
    const jobId = pay.fullTime
      ? startPublicJob(api, {
          personId: holder.personId,
          employerId: payer.organizationId,
          post: `office:${seat.id}`,
          title: office.title,
          hourlyMinor: Math.round(pay.annualMinor / (52 * pay.weeklyHours)),
          citation: pay.citation,
        })
      : null;
    table(api, "officeJobs").put({
      id: holder.id,
      personId: holder.personId,
      officeId: office.id,
      seatId: seat.id,
      title: office.title,
      annualMinor: pay.annualMinor,
      weeklyHours: pay.weeklyHours,
      fullTime: jobId !== null,
      payerId: payer.organizationId,
      jobId,
      paidFrom: api.state.date,
      endedOn: null,
      citation: pay.citation,
    } satisfies OfficeJobRow as unknown as ModuleRow);
  }
}

/**
 * On the 1st: each part-time holder's stipend for the days served, from the
 * treasury that pays the seat, on that treasury's books, with the taxes the
 * law in force takes out of any pay.
 */
function payStipends(api: CoreAPI): void {
  const accounts = api.accounts();
  const today = api.state.date;
  for (const raw of table(api, "officeJobs").rows()) {
    const row = raw as unknown as OfficeJobRow;
    if (row.jobId) continue;
    const through = row.endedOn && row.endedOn < today ? row.endedOn : today;
    const days = Math.round(
      (Date.parse(`${through}T00:00:00Z`) -
        Date.parse(`${row.paidFrom}T00:00:00Z`)) /
        86_400_000,
    );
    let lastPaid = row.lastPaid;
    if (days > 0 && api.state.people.get(row.personId)?.alive) {
      const amountMinor = Math.round((row.annualMinor * days) / 365);
      if (amountMinor > 0) {
        const receipt = accounts.transfer({
          id: `stipend:${row.id}:${today}`,
          from: accounts.main(row.payerId),
          to: accounts.main(row.personId),
          amountMinor,
          reasonKey: "office.stipend",
          partial: true,
          source: {
            tag: "ESTIMATED",
            asOf: today,
            citation: `${days} days as ${row.title}. ${row.citation}`,
            estimatedFrom: "local-office-pay-2026.json",
          },
        });
        lastPaid = { on: today, amountMinor: receipt.paidMinor };
        if (receipt.paidMinor > 0) {
          notePublicPay(api, {
            id: receipt.id,
            organizationId: row.payerId,
            jobId: `office:${row.seatId}`,
            personId: row.personId,
            paidMinor: receipt.paidMinor,
          });
        }
        if (receipt.paidMinor > 0 && api.state.modules.has(BUDGETS_MODULE_ID)) {
          // The taxes out of the stipend, on the year's pay with the holder's
          // own job (the Social Security wage base counts both).
          withholdPay(api, {
            id: receipt.id,
            personId: row.personId,
            paidMinor: receipt.paidMinor,
            fromAt: row.paidFrom,
            throughAt: addDays(makeIsoDate(through), -1),
          });
        }
      }
    }
    if (row.endedOn && row.endedOn <= today)
      table(api, "officeJobs").remove(row.id);
    else
      table(api, "officeJobs").put({
        ...row,
        paidFrom: through,
        ...(lastPaid ? { lastPaid } : {}),
      } as unknown as ModuleRow);
  }
}

/** The office jobs a person holds now. */
export function officeJobsOf(api: CoreAPI, personId: string): OfficeJobRow[] {
  return table(api, "officeJobs").query("byPerson", [
    personId,
  ]) as unknown as OfficeJobRow[];
}

// ---- What the player prepares for an act -------------------------------

/** The player sets what they will say or decide at an act; what they leave is the character's own. */
export function prepareAct(
  api: CoreAPI,
  personId: string,
  actId:
    | "office-hours"
    | "town-hall"
    | "interview"
    | "talk-to-colleague"
    | "state-of-the-city"
    | "name-department-head",
  prepared: Prepared,
): void {
  table(api, "prepared").put({
    id: `${personId}|${actId}`,
    ...prepared,
  } as unknown as ModuleRow);
}

function preparedFor(
  api: CoreAPI,
  personId: string,
  actId: string,
): Prepared | null {
  return (
    (table(api, "prepared").get(`${personId}|${actId}`) as unknown as
      Prepared | undefined) ?? null
  );
}

function gaveInYear(
  api: CoreAPI,
  personId: string,
  kind: string,
  year: string,
): boolean {
  return officeActsOf(api, personId).some(
    (row) => row.kind === kind && row.date.startsWith(year),
  );
}
