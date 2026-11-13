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
import { registerWorldMapPart } from "../snapshot";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { lawChain } from "./laws";
import { signUpToSpeak } from "./meetings";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./offices";
import { governments } from "./budgets";
import { payOfficialPaycheck } from "./official-pay";
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
  bodyReach,
  castMemberVote,
  castOwnPositionVote,
  chambersOf,
  executiveDecision,
  floorDateOf,
  executiveItemVeto,
  executiveLean,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  registerLegislatureHooks,
  registerMeetingAgendaReader,
  type BillRow,
  type DeskAction,
} from "./legislature";
import {
  filesAhead,
  filingsOwed,
  registerMeetingHold,
  voteAtMeeting,
} from "./world-legislating";
import {
  nextMeeting as nextOnRule,
  bodyPopulation,
  officeDayParameter,
  type MeetingRule,
} from "../office-day-calendar";
// The meeting rule, for readers outside the family.
export { meetingRule } from "../office-day-calendar";
// The federal holidays, for the calendar screen.
export {
  federalHolidayName,
  federalHolidays,
} from "../office-day-federal-calendar";
import {
  playerClockFrontierV1,
  type ModuleStopTokenV1,
} from "../player-stops-v1";
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
  // Any vote where the player's seat could decide it (owner, Oct 29: "your
  // own bills, any vote where yours could decide it"): a meeting of a body
  // small enough that one seat turns a vote, with a bill on its agenda.
  { kind: "deciding-vote", byDefault: true },
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
  /**
   * A player who does not sit on the body and marked this meeting to attend:
   * held at its hour like a member, to speak at public comment and not to vote.
   */
  readonly audience?: string;
  /** The members' filings for this meeting are on its agenda (an empty agenda is posted too). */
  readonly posted?: boolean;
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
    if (payday || seenTerms.get(api.state as CoreState) !== terms) {
      seenTerms.set(api.state as CoreState, terms);
      scheduleOfficeReview(api);
    }
    if (payday) payStipends(api);
    for (const kit of officeActKits()) kit.onDay?.(api);
    return undefined;
  },
};
/**
 * The size of the offices roster the last day read. Saved with the world, so
 * a restored world doesn't read its roster as changed and book a review the
 * original never booked.
 */
const seenTerms = new WeakMap<CoreState, number>();
registerWorldMapPart("core2-office-day-seen-terms", seenTerms);

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
  registerLegislatureHooks({
    beforeVote: { name: "own-vote", run: ownVote },
    onDesk: deskArrived,
  });
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
  // A meeting already on the books takes the bill now, and may now hold the player.
  const row = meetingOf(api, meetingId(bill.bodyOfficeId, next.date));
  if (row && row.status === "scheduled") {
    // In the order placed: the body takes its items in the order they came.
    const placed: MeetingRow = {
      ...row,
      agenda: [...new Set([...row.agenda, billId])],
    };
    table(api, "meetings").put(placed as unknown as ModuleRow);
    holdPlayerIfDue(api, placed);
  }
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
  const row: MeetingRow = {
    id: meetingId(officeId, date),
    officeId,
    date,
    startMinute: rule.rule.startMinute,
    minutes: rule.rule.minutes,
    agenda,
    takenUp: [],
    status: "scheduled",
    playerPresent: false,
    citation: rule.rule.source.citation,
  };
  table(api, "meetings").put(row as unknown as ModuleRow);
  holdPlayerIfDue(api, row);
}

/** Whether the player's clock has reached a meeting's hour (or its day is behind them). */
function hourReached(api: CoreAPI, row: MeetingRow, player: string): boolean {
  if (row.date < api.state.date) return true;
  const frontier = playerClockFrontierV1(api.state as CoreState, player);
  return (
    !!frontier &&
    (frontier.date > row.date ||
      (frontier.date === row.date && frontier.minuteOfDay >= row.startMinute))
  );
}

/**
 * A posted meeting the player may come to as a resident: one still ahead of
 * their clock, of a body they do not sit on (a member is held by their own
 * stops). Public comment is open to anyone (`signUpToSpeak`), so nothing else
 * is asked. Says whether they have marked it.
 */
export function meetingToAttend(
  api: CoreAPI,
  officeId: string,
  date: string,
): { id: string; marked: boolean; startMinute: number } | null {
  const player = playerOf(api);
  const row = meetingOf(api, meetingId(officeId, date));
  if (
    player === undefined ||
    !row ||
    row.status !== "scheduled" ||
    snapshotExplicitControlV1(api.state).personId !== player ||
    members(api, officeId).some(sits(player)) ||
    hourReached(api, row, player) ||
    // A meeting whose agenda is filed only on its own day has nothing to show
    // a resident at its hour: it is not offered.
    !(row.posted || filesAhead(api, officeId, date))
  )
    return null;
  return {
    id: row.id,
    marked: row.audience === player,
    startMinute: row.startMinute,
  };
}

/** The meeting with nobody of the player's in its audience, and its hold on them gone. */
function withoutAudience(row: MeetingRow): MeetingRow {
  const next: { -readonly [K in keyof MeetingRow]: MeetingRow[K] } = {
    ...row,
    playerPresent: false,
  };
  delete next.audience;
  return next;
}

/**
 * The player marks a posted meeting to attend, or takes the mark back: marked,
 * the meeting holds their clock at its hour, and the members' filings wait on
 * its agenda as they do for a member the player plays (`holdsMemberFilings`).
 */
export function attendMeeting(
  api: CoreAPI,
  officeId: string,
  date: string,
  attend: boolean,
): MeetingRow {
  const open = meetingToAttend(api, officeId, date);
  if (!open) throw new Error("That meeting is not in session.");
  const row = meetingOf(api, open.id)!;
  const next: MeetingRow = attend
    ? { ...row, audience: playerOf(api)! }
    : withoutAudience(row);
  table(api, "meetings").put(next as unknown as ModuleRow);
  if (attend) holdPlayerIfDue(api, next);
  else releaseHeld(api, next.id);
  return meetingOf(api, next.id)!;
}

/**
 * A resident leaves the meeting they came to: the clock goes on and nothing
 * is voted for their leaving. What they said stays on the record and is heard
 * when the body takes the item up, at the meeting's close.
 */
export function leaveMeeting(api: CoreAPI, meetingIdValue: string): void {
  const row = meetingOf(api, meetingIdValue);
  if (!row || row.audience === undefined || !row.playerPresent)
    throw new Error("That meeting is not in session.");
  table(api, "meetings").put(withoutAudience(row) as unknown as ModuleRow);
  // That they came is on the record with what they said there.
  keepAct(api, {
    personId: row.audience,
    kind: "attend",
    how: "did",
    recordId: row.id,
    position: null,
    // How many items were before the body when they came.
    detail: String(row.agenda.length),
  });
  releaseHeld(api, row.id);
}

/**
 * Whether the player is held at a meeting, decided again each time its
 * agenda changes (posted, a member's filing placed, the player's own bill
 * placed): a member the player plays and holds the clock with is held at
 * its hour when they stop for every meeting, for a vote on their own bill,
 * or for a vote their seat could decide. The stop is registered the first
 * time the test holds and never twice for one meeting.
 */
function holdPlayerIfDue(api: CoreAPI, row: MeetingRow): void {
  if (row.status !== "scheduled" || row.date < api.state.date) return;
  const held = tokens.get(api.state) ?? new Map<string, ModuleStopTokenV1>();
  if (held.has(row.id)) return;
  const player = playerOf(api);
  if (player === undefined) return;
  const body = members(api, row.officeId);
  const seated = body.some(sits(player));
  // A resident is held only at a meeting they marked to attend.
  if (!seated && row.audience !== player) return;
  if (snapshotExplicitControlV1(api.state).personId !== player) return;
  const stops = stopsOf(api, player);
  const ownBill = row.agenda.some((id) => billOf(api, id).sponsorId === player);
  // A seat could decide a vote of a body this small (the seat count is the
  // body's own record); how the others lean is not read here, since the
  // player would learn the count from it.
  // stopgapId: SG-OFFICE-deciding-seats
  const deciding =
    row.agenda.length > 0 && body.length <= officeDayParameter("decidingSeats");
  const present =
    !seated ||
    stops["every-meeting"] === true ||
    (ownBill && stops["own-bill-vote"] === true) ||
    (deciding && stops["deciding-vote"] === true);
  if (!present) return;
  // A meeting whose hour the player's clock has passed can no longer hold
  // them (a filing on its own day comes after the clock left that day).
  const frontier = playerClockFrontierV1(api.state as CoreState, player);
  if (
    frontier &&
    (frontier.date > row.date ||
      (frontier.date === row.date && frontier.minuteOfDay > row.startMinute))
  )
    return;
  const rule = nextMeeting(api, row.officeId, dayOffset(row.date, -1));
  const source = rule?.rule.source ?? {
    tag: "SOURCED" as const,
    citation: row.citation,
    asOf: api.state.date,
  };
  table(api, "meetings").put({
    ...row,
    playerPresent: true,
  } as unknown as ModuleRow);
  const token = api.moduleCalendar(OFFICE_DAY_MODULE_ID).registerStop({
    recordId: row.id,
    controlledPersonId: player,
    at: { date: makeIsoDate(row.date), minuteOfDay: row.startMinute },
    kind: "interrupt",
    reasonKey: "office-day.meeting",
    source,
    hold: true,
  });
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
  earlierMeetingsVote(api, row);
  voteLeft(api, row);
}

/** Every item the meeting has not taken up is voted, each member their own position, and it adjourns. */
function voteLeft(api: CoreAPI, row: MeetingRow): void {
  const left = row.agenda.filter((id) => !row.takenUp.includes(id));
  for (const billId of left) voteAtMeeting(api, billId);
  finish(api, { ...row, takenUp: [...row.takenUp, ...left] });
}

/** Of two meetings the same day, the one whose hour comes first (then by id). */
const meetsFirst = (a: MeetingRow, b: MeetingRow) =>
  a.startMinute - b.startMinute || a.id.localeCompare(b.id);

/**
 * Before a body votes at its meeting, every other body's meeting of the same
 * day whose hour comes first has voted. A law one body passes that day stands
 * when the next weighs its own, in the same order whether the player's clock
 * is held at one of the meetings or at none. A meeting the player is still at
 * waits for them, and one whose members have yet to file waits for its filing.
 */
function earlierMeetingsVote(api: CoreAPI, row: MeetingRow): void {
  const earlier = (table(api, "meetings").rows() as unknown as MeetingRow[])
    .filter(
      (other) =>
        other.date === row.date &&
        other.status !== "adjourned" &&
        !other.playerPresent &&
        meetsFirst(other, row) < 0 &&
        !filingsOwed(api, other.officeId, other.date),
    )
    .sort(meetsFirst);
  for (const other of earlier) voteLeft(api, meetingOf(api, other.id)!);
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
      // A sitting that runs past the hour a town body meets in the evening
      // keeps its members from home that evening.
      evening: String(
        row.startMinute + row.minutes >
          officeDayParameter("eveningMeetingMinute"),
      ),
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

/** The meeting holding the player's clock, if any: of two the same day, the one whose hour comes first. */
export function meetingInProgress(api: CoreAPI): MeetingRow | undefined {
  return (table(api, "meetings").rows() as unknown as MeetingRow[])
    .filter(
      (row) =>
        row.playerPresent &&
        row.status !== "adjourned" &&
        row.date === api.state.date,
    )
    .sort(
      (a, b) => a.startMinute - b.startMinute || a.id.localeCompare(b.id),
    )[0];
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
    // Someone who came to watch and speak takes nothing up.
    row.audience !== undefined ||
    row.date !== api.state.date
  )
    throw new Error("That meeting is not in session.");
  if (!row.agenda.includes(billId) || row.takenUp.includes(billId))
    throw new Error("That item is not waiting on this agenda.");
  const player = playerOf(api)!;
  earlierMeetingsVote(api, row);
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
  // Left to the character: the member's own position casts the vote, by the
  // rule every member's vote follows (`ownVote`).
  const bill =
    vote === "own"
      ? leavingToCharacter(api, [billId], () => voteAtMeeting(api, billId))
      : voteAtMeeting(api, billId);
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
  // The player in the audience cannot adjourn the body; they leave (`leaveMeeting`).
  if (
    !row ||
    row.status === "adjourned" ||
    (row.playerPresent && row.audience !== undefined)
  )
    throw new Error("That meeting is not in session.");
  const left = row.agenda.filter((id) => !row.takenUp.includes(id));
  earlierMeetingsVote(api, row);
  leavingToCharacter(api, left, () => {
    for (const billId of left) voteAtMeeting(api, billId);
  });
  finish(api, { ...row, takenUp: [...row.takenUp, ...left] });
  releaseHeld(api, row.id);
  return meetingOf(api, row.id)!;
}

// ---- The character's own choices ---------------------------------------

/** The items the player, at a held meeting, has left to the character while their votes are held. */
const leftToCharacter = new WeakMap<object, Set<string>>();
function leavingToCharacter<T>(
  api: CoreAPI,
  billIds: readonly string[],
  vote: () => T,
): T {
  const left = leftToCharacter.get(api.state) ?? new Set<string>();
  leftToCharacter.set(api.state, left);
  for (const id of billIds) left.add(id);
  try {
    return vote();
  } finally {
    for (const id of billIds) left.delete(id);
  }
}

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
 * vote follows). The ordinances members file are filed the day before the
 * meeting and wait on its agenda (`holdsMemberFilings`), so the player's
 * scene sees them first; only a meeting scheduled with less than a day's
 * notice still has its filings voted before the stop.
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
  // A local body's meeting the player is held at is where the player votes:
  // the character never casts it for them. Adjourned unchosen, the roll call
  // has them abstain (legislature.ts: the player is never voted for).
  const placedFor = table(api, "agendaItems").get(billId) as unknown as
    { date: string } | undefined;
  if (
    placedFor &&
    meetingOf(api, meetingId(bill.bodyOfficeId, placedFor.date))
      ?.playerPresent &&
    !leftToCharacter.get(api.state)?.has(billId)
  )
    return;
  // A member of a legislature is held the evening before the floor vote for their own vote
  // (the level's floor-vote stop): the character does not cast it for them a week early, on the
  // committee's day, when the floor is still ahead.
  const level = bodyReach(api, bill.bodyOfficeId);
  const stops = api.state.modules.has(OFFICE_DAY_MODULE_ID)
    ? stopsOf(api, player)
    : null;
  const floorDay = floorDateOf(api, billId);
  if (
    stops &&
    floorDay !== null &&
    floorDay > api.state.date &&
    ((level === "state" && stops["state-floor-vote"]) ||
      (level === "federal" && stops["floor-vote"]))
  )
    return;
  const { position, vote } = castOwnPositionVote(api, billId, player);
  keepAct(api, {
    personId: player,
    kind: "vote",
    how: "own-choice",
    recordId: billId,
    position,
    detail: vote,
  });
}

/**
 * Every town and county body files its members' ordinances the day before
 * the meeting, and they wait on its agenda for the meeting to vote them:
 * the agenda is posted ahead, so the town hears of an item before the vote
 * whether or not the player is in the room, and a meeting the player sits at
 * or watches decides as one nobody watches (one path). Only a meeting with
 * under a day's notice, the first after a world begins among them, files on
 * its own day.
 */
function holdsMemberFilings(api: CoreAPI): boolean {
  return api.state.modules.has(OFFICE_DAY_MODULE_ID);
}

/** Ordinances members filed for a meeting go on its agenda; with no meeting row they are voted now. */
function placeFiled(
  api: CoreAPI,
  officeId: string,
  date: string,
  billIds: readonly string[],
): void {
  const row = meetingOf(api, meetingId(officeId, date));
  if (!row || row.status === "adjourned") {
    for (const billId of billIds) voteAtMeeting(api, billId);
    return;
  }
  for (const billId of billIds)
    table(api, "agendaItems").put({
      id: billId,
      officeId,
      date,
    } as unknown as ModuleRow);
  const placed: MeetingRow = {
    ...row,
    posted: true,
    // In filing order, as an unheld meeting takes them.
    agenda: [...new Set([...row.agenda, ...billIds])],
  };
  table(api, "meetings").put(placed as unknown as ModuleRow);
  holdPlayerIfDue(api, placed);
}
registerMeetingHold(holdsMemberFilings, placeFiled);
// The floor's agenda for a date includes what a town body's meeting that day
// takes up (the evening-before ask reads it).
registerMeetingAgendaReader((api, date) =>
  // A world without the office day has no town meetings to read.
  !api.state.modules.has(OFFICE_DAY_MODULE_ID)
    ? []
    : (table(api, "meetings").rows() as unknown as MeetingRow[])
        .filter((row) => row.date === date && row.status !== "adjourned")
        .flatMap((row) => agendaFor(api, row.officeId, date)),
);

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
  /** Stipend earned that the treasury could not cover yet; paid first on the next payday it can. */
  readonly owedMinor?: number;
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
    let owedMinor = 0;
    const dueMinor =
      Math.round((row.annualMinor * Math.max(days, 0)) / 365) +
      (row.owedMinor ?? 0);
    if (dueMinor > 0) {
      // The same paycheck an official's salary is: what the treasury holds is
      // paid, its line notes the spending, the law's taxes come out (on the
      // year's pay with the holder's own job), and the rest is owed.
      const paid = payOfficialPaycheck(api, {
        id: `stipend:${row.id}:${today}`,
        payerId: row.payerId,
        personId: row.personId,
        dueMinor,
        reasonKey: "office.stipend",
        source: {
          tag: "ESTIMATED",
          asOf: today,
          citation: `${days} days as ${row.title}. ${row.citation}`,
          estimatedFrom: "local-office-pay-2026.json",
        },
        jobId: `office:${row.seatId}`,
        fromAt: row.paidFrom,
        throughAt: addDays(makeIsoDate(through), -1),
      });
      lastPaid = { on: today, amountMinor: paid.paidMinor };
      owedMinor = paid.owedMinor;
    }
    if (row.endedOn && row.endedOn <= today && owedMinor === 0)
      table(api, "officeJobs").remove(row.id);
    else
      table(api, "officeJobs").put({
        ...row,
        paidFrom: through,
        owedMinor,
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

/**
 * The player sets what they will say or decide at an act, local or federal
 * (any registered kit's act id); what they leave is the character's own.
 */
export function prepareAct(
  api: CoreAPI,
  personId: string,
  actId: string,
  prepared: Prepared,
): void {
  table(api, "prepared").put({
    id: `${personId}|${actId}`,
    ...prepared,
  } as unknown as ModuleRow);
}

/** What the player prepared for an act, if anything. */
export function preparedFor(
  api: CoreAPI,
  personId: string,
  actId: string,
): Prepared | null {
  return (
    (table(api, "prepared").get(`${personId}|${actId}`) as unknown as
      Prepared | undefined) ?? null
  );
}

/** The act is taken; what was prepared for it is spent. */
export function clearPrepared(
  api: CoreAPI,
  personId: string,
  actId: string,
): void {
  table(api, "prepared").remove(`${personId}|${actId}`);
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

// Re-exported so other engine families import through this entry, not the file (families guard).
export {
  controlledPerson,
  heldFederal,
  leaveVoteToCharacter,
  voteOnFloor,
} from "../office-day-federal";
export {
  OFFICE_DAY_STATE_MODULE_ID,
  stateFloorHolds,
  voteOnStateFloor,
} from "../office-day-state";
export {
  actOn,
  appointGovernor,
  doEntry,
  stopKindOf,
  waitingEntries,
} from "../office-day-state";
export { budgetProposalDue } from "../office-day-acts";
export { jointAddress } from "../office-day-federal-calendar";
export {
  BUDGET_REQUEST,
  deliverAddress,
  JOINT_ADDRESS,
  leavePostOpen,
  nominate,
  nominationsOpen,
  requestBudget,
} from "../office-day-federal-president";
