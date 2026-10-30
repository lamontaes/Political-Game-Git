/**
 * Politics → Government, one level at a time (owner, Oct 29: drawn as the
 * Oct 14 mock, docs/ui/mocks/screens-2026-10-14/shots/gov.png). For a level
 * (local, state, federal) and a state, each lawmaking body the screen draws
 * and each executive office, read from the records: the body's room, its
 * members with their party and seat, how the parties split it, its recent
 * roll calls (the record engine's votes, so last term's show from day one),
 * and what is coming up (its next meeting, its bills waiting for the floor,
 * the filing deadline and election day for its seats). Record data only: the
 * screen words every label, and nothing here writes a record.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import {
  OFFICES_MODULE_ID,
  officesOfState,
  seatsOfOffices,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import {
  floorDateOf,
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../core2/modules/legislature";
import {
  keyPeopleOf,
  RECORD_MODULE_ID,
  type VoteRecordRow,
} from "../core2/modules/people";
import type { ContestRow } from "../core2/modules/elections";
import { meetingRule, upcomingMeeting } from "../core2/modules/office-day";
import { billTitleOf } from "../english/bill-names";
import { backdropFile, faceOf } from "./scene";
import { capitolPlaceFor } from "./backdrop-places";
import { calendarItems } from "./calendar";
import { facePlace, holderFace, homeStateOf } from "./government";
import { properName } from "../director/words";
import { policyNames } from "./words";

const LOCAL_LEVELS = new Set(["city", "township", "county"]);
/** A town's own government before the county's. */
const LOCAL_ORDER = ["city", "township", "county"];
const ELECTIONS = "core2-elections-v1";
/** The office that heads a level's executive branch, where the level has one. */
const CHIEF_KINDS = ["mayor", "county-executive", "governor", "president"];
/** The nation's own executive offices, which no state holds. */
const NATIONAL_KINDS = new Set(["president", "vice-president"]);
/** A state's seats in Congress, as the offices engine kinds them. */
const CONGRESS_KINDS = new Set(["us-senate", "us-house", "us-house-delegate"]);
/** Two chambers of one size list the lower house first, as their law names them. */
const CHAMBER_ORDER = [
  "legislature-lower",
  "us-house",
  "us-house-delegate",
  "legislature-upper",
  "us-senate",
];
/** How many of a body's recorded roll calls the screen shows, newest first. */
const RECENT_VOTES = 3;
/** How many coming dates the screen shows, soonest first. */
const COMING_UP = 4;
/** Noon: rooms are shown in daylight on a reference screen. */
const NOON = 12 * 60;

type Level = "local" | "state" | "federal";
type Api = ReturnType<typeof coreAPI>;
type Office = {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly level: string;
  readonly governmentName: string;
  readonly bodyName?: string;
  readonly seats: number;
};
type SeatRow = {
  readonly office: Office;
  readonly seat: { readonly id: string; readonly district: string | null };
  readonly holder: TermRow | null;
};

/** The room a body or an office works in, painted in daylight. */
function roomFor(office: Office, usps: string | null): string | null {
  const place = office.kind.startsWith("legislature-")
    ? capitolPlaceFor(usps)
    : office.level === "federal"
      ? CONGRESS_KINDS.has(office.kind)
        ? "state-capitol-dome"
        : "oval-office-standard"
      : office.kind === "governor"
        ? "governor-office"
        : office.kind === "mayor" || office.kind === "county-executive"
          ? "mayor-office"
          : office.seats > 1
            ? office.seats > 7
              ? "council-chamber-large"
              : "council-chamber-small"
            : office.level === "state"
              ? capitolPlaceFor(usps)
              : "city-hall-exterior";
  try {
    return backdropFile(place, NOON, []).url;
  } catch {
    return null;
  }
}

/** A seat's holder as a member card reads them: face, name, party and seat (never how they feel about the viewer: owner, Oct 29). */
function memberOf(
  core: CoreState,
  row: SeatRow,
  place: string,
  ownSeats: ReadonlySet<string>,
) {
  const holder = row.holder;
  if (!holder) return null;
  return {
    seatId: row.seat.id,
    district: row.seat.district,
    name: `${holder.identity.givenName} ${holder.identity.familyName}`,
    party: holder.party ?? null,
    serviceStart: holder.serviceStart ?? holder.startDate,
    own: ownSeats.has(row.seat.id),
    ...holderFace(core, holder, place),
  };
}

/** How the parties split a body's held seats, largest first. */
function partiesOf(members: readonly { party: string | null }[]) {
  const counts = new Map<string, number>();
  for (const m of members)
    if (m.party) counts.set(m.party, (counts.get(m.party) ?? 0) + 1);
  return [...counts]
    .map(([party, seats]) => ({ party, seats }))
    .sort((a, b) => b.seats - a.seats || a.party.localeCompare(b.party));
}

/**
 * A body's latest recorded roll calls: the record engine's votes on its
 * measures (last term's from the town's history, this term's from the
 * floor), each counted yes and no from its voters' stances, newest first.
 */
function recentVotesOf(api: Api, officeId: string) {
  if (!api.state.modules.has(RECORD_MODULE_ID)) return [];
  const rows = api
    .moduleState(RECORD_MODULE_ID)
    .table("votes")
    .rows() as unknown as VoteRecordRow[];
  const measures = new Map<string, VoteRecordRow[]>();
  for (const row of rows)
    if (row.body === officeId)
      measures.set(row.measureId, [
        ...(measures.get(row.measureId) ?? []),
        row,
      ]);
  const bills = api.state.modules.has(LEGISLATURE_MODULE_ID)
    ? api.moduleState(LEGISLATURE_MODULE_ID).table("bills")
    : null;
  const names = policyNames();
  return [...measures]
    .map(([measureId, votes]) => {
      const date = votes.reduce((d, v) => (v.date > d ? v.date : d), "");
      // Voters split by the sign of their stance on the measure's question;
      // the side that carried a passed measure is its yes.
      const plus = votes.filter((v) => v.stance.position > 0).length;
      const minus = votes.length - plus;
      const passed = votes.some((v) => v.passed === true);
      const larger = Math.max(plus, minus);
      const smaller = Math.min(plus, minus);
      const bill = bills?.get(measureId) as unknown as BillRow | undefined;
      const question = votes[0]!.stance.question;
      return {
        measureId,
        date,
        number: bill?.number ?? null,
        title: bill
          ? (billTitleOf(bill)?.title ?? null)
          : (names[question] ?? null),
        passed,
        yes: passed ? larger : smaller,
        no: passed ? smaller : larger,
      };
    })
    .filter((m) => m.title)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_VOTES);
}

/**
 * What is coming up for a body: its next regular meeting, its bills waiting
 * for the floor, and the filing deadline and election day for its seats,
 * soonest first.
 */
function comingUpFor(
  core: CoreState,
  api: Api,
  office: Office,
  calendar: ReturnType<typeof calendarItems>,
) {
  const items: {
    date: string;
    kind: string;
    title: string | null;
    number?: string;
  }[] = [];
  const meeting = office.seats > 1 ? upcomingMeeting(api, office.id) : null;
  if (meeting) items.push({ date: meeting.date, kind: "meeting", title: null });
  if (api.state.modules.has(LEGISLATURE_MODULE_ID))
    for (const bill of api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]) {
      if (bill.bodyOfficeId !== office.id || bill.status !== "drafted")
        continue;
      const date = floorDateOf(api, bill.id) ?? meeting?.date ?? null;
      if (!date) continue;
      items.push({
        date,
        kind: "bill",
        title: billTitleOf(bill)?.title ?? null,
        number: bill.number,
      });
    }
  // The filing deadline and election day for the body's seats: the
  // calendar's own lines (the English engine's words), for its contests.
  const contests = new Set(
    api.state.modules.has(ELECTIONS)
      ? (
          api
            .moduleState(ELECTIONS)
            .table("contests")
            .rows() as unknown as ContestRow[]
        )
          .filter((c) => c.officeId === office.id)
          .map((c) => c.id)
      : [],
  );
  for (const item of calendar)
    if (
      (item.kind === "election" || item.kind === "filing-deadline") &&
      item.recordIds.some((id) => contests.has(id))
    )
      items.push({ date: item.date, kind: item.kind, title: item.line });
  const seen = new Set<string>();
  return items
    .filter((i) => i.date >= core.date)
    .filter((i) => {
      const key = `${i.date}:${i.kind}:${i.number ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, COMING_UP);
}

/**
 * The bodies and executive offices of one level that Politics → Government
 * draws for a viewer: local (the bodies and officers over their town), state
 * or federal (their own state's, or another state's when one is named).
 */
export function governmentBodies(
  core: CoreState,
  viewerId: string,
  level: Level,
  stateKey = "",
) {
  const api = coreAPI(core);
  const home = homeStateOf(api);
  const state = stateKey || home.key;
  const usps = state.startsWith("US-") ? state.slice(3) : null;
  const place = facePlace(core, viewerId);
  const town = townSeats(api) as unknown as SeatRow[];
  const ownSeats = new Set(town.map((row) => row.seat.id));
  // The viewer's own members, as the key people name them ("your state
  // representative"), where a seat's record does not say it covers the town.
  const key = core.people.has(viewerId)
    ? keyPeopleOf(core, viewerId as never)
    : [];
  const ownIds = new Set(
    key
      .filter((row) => row.reasons.some((r) => r.startsWith("own-")))
      .map((row) => row.id),
  );
  // The seats this level draws: a local level's are the town's own; a state
  // or federal level's are every seat of that state's offices at the level.
  // The nation's own offices (the President, the Vice President) are no
  // state's: a federal level reads them from the offices table beside the
  // state's members of Congress.
  const national =
    level === "federal"
      ? (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("offices")
            .rows() as unknown as Office[]
        ).filter((o) => NATIONAL_KINDS.has(o.kind))
      : [];
  const rows: SeatRow[] =
    level === "local"
      ? town.filter((row) => LOCAL_LEVELS.has(row.office.level))
      : (seatsOfOffices(api, [
          ...officesOfState(api, state).filter((o) =>
            level === "federal" ? o.level === "federal" : o.level === "state",
          ),
          ...(national as unknown as ReturnType<typeof officesOfState>),
        ]) as unknown as SeatRow[]);
  const byOffice = new Map<string, SeatRow[]>();
  for (const row of rows)
    byOffice.set(row.office.id, [...(byOffice.get(row.office.id) ?? []), row]);
  const calendar = calendarItems(core, viewerId);
  // Each chamber's leaders (a Speaker, a majority leader), by the chamber's
  // kind: the key people the opening found for this viewer.
  const leaders = key.filter((row) => row.leads);
  const view = (seats: SeatRow[]) => {
    const office = seats[0]!.office;
    const members = seats
      .map((row) => memberOf(core, row, place, ownSeats))
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => (ownIds.has(m.cardId) ? { ...m, own: true } : m))
      .sort(
        (a, b) =>
          Number(b.own) - Number(a.own) ||
          (a.district ?? "").localeCompare(b.district ?? "", undefined, {
            numeric: true,
          }) ||
          a.name.localeCompare(b.name),
      );
    const rule = office.seats > 1 ? meetingRule(api, office.id) : null;
    const leading = leaders
      .filter((row) => row.officeKind === office.kind)
      .map((row) => ({
        cardId: row.id,
        name: row.name,
        post: row.leads!.post,
        face: place
          ? faceOf(
              core,
              row.id.startsWith("official:") ? row.id.slice(9) : row.id,
              place,
            )
          : null,
      }));
    return {
      officeId: office.id,
      kind: office.kind,
      // The head of the level's executive branch (a mayor, a governor).
      chief: CHIEF_KINDS.includes(office.kind),
      title: office.title,
      // A local body by its own name ("Latimer Board of Aldermen"); a state
      // chamber or an office by its title, its government named apart.
      name: office.bodyName ?? office.title,
      government: properName(office.governmentName),
      level: office.level,
      seats: seats.length,
      vacant: seats.filter((row) => !row.holder).length,
      picture: roomFor(office, usps),
      members,
      leaders: leading,
      parties: partiesOf(members),
      meeting: rule && {
        intervalDays: rule.intervalDays,
        weekday: rule.weekday,
        weeksOfMonth: rule.weeksOfMonth,
      },
      recentVotes: recentVotesOf(api, office.id),
      comingUp: comingUpFor(core, api, office, calendar),
    };
  };
  const offices = [...byOffice.values()];
  // A body of several seats makes laws; a one-seat office is an executive
  // or an officer. A member of Congress's chamber is several seats even when
  // the state sends one (a delegate), so it is kinded by its office.
  const lawmaking = (seats: SeatRow[]) =>
    seats[0]!.office.seats > 1 || CONGRESS_KINDS.has(seats[0]!.office.kind);
  // The viewer's own bodies first, the town's before the county's.
  const order = (seats: SeatRow[]) =>
    (seats.some((row) => ownSeats.has(row.seat.id)) ? 0 : 10) +
    (LOCAL_ORDER.indexOf(seats[0]!.office.level) + 1);
  return {
    level,
    date: core.date,
    // A coming date's window, so the screen can say "this week" from records.
    through: addDays(makeIsoDate(core.date), 7),
    state: { key: state, own: state === home.key },
    legislative: offices
      .filter(lawmaking)
      .sort(
        (a, b) =>
          order(a) - order(b) ||
          b.length - a.length ||
          CHAMBER_ORDER.indexOf(a[0]!.office.kind) -
            CHAMBER_ORDER.indexOf(b[0]!.office.kind),
      )
      .map(view),
    // The chief executive first, the town's before the county's.
    executive: offices
      .filter((seats) => !lawmaking(seats))
      .sort(
        (a, b) =>
          Number(CHIEF_KINDS.includes(b[0]!.office.kind)) -
            Number(CHIEF_KINDS.includes(a[0]!.office.kind)) ||
          order(a) - order(b),
      )
      .map(view),
  };
}
