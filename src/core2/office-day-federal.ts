/**
 * The federal officeholder's day (office play, FEDERAL): a U.S.
 * representative's or senator's week in Washington or at home, and the
 * president's day, for the person the player controls.
 *
 * The office is the job the offices and officials engines already keep
 * (official pay pays it); this file reads Congress's calendar
 * (`office-day-federal-calendar.ts`) and lists what the day holds: the floor
 * when the chamber sits, interviews waiting, bills on the president's desk,
 * the joint address. The player picks what stops them (the important few by
 * default) and where they spend each week. Every act runs through the
 * engine that owns it: a vote is the legislature's (`castMemberVote`), a
 * signature the executive's (`decideOnDesk`), an interview the press's
 * (`requestInterview`, `answerInterview`), a town hall the meetings engine's
 * (`holdTownHall`). Simulate or do: what the player leaves alone, the
 * character does by the same engine's own rule for anyone in that seat (a
 * member's position, the executive's sign-or-veto lean, an interviewee's own
 * answers), so simulating costs nothing a doing player would not risk.
 * Nothing is rolled; nothing names a place. Every act leaves the record its
 * engine writes, which the press and the director read.
 *
 * Stopgap SG-OFFICE-FED-engine-stand-in: OFFICE-LOCAL's engine
 * (`modules/office-day.ts`) is not built yet; this module keeps the
 * federal day's own small tables (settings, days, acts) until it lands.
 */
import { coreAPI, registerModule } from "./state";
import type { CoreAPI, CoreModule, CoreState } from "./types";
import type { ModuleRow } from "./module-data";
import { decisionLean } from "./trait-decisions";
import { makeIsoDate } from "../simulation/dates";
import { lawChain } from "./modules/laws";
import { personLean } from "./campaign-views";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  LEGISLATURE_MODULE_ID,
  billOf,
  castMemberVote,
  memberPosition,
  registerLegislatureHooks,
} from "./modules/legislature";
import { decideOnDesk, deskOf } from "./modules/executive";
import {
  answerInterview,
  candidateAnswers,
  interviewsFor,
  officeholderSpeaker,
  outletsHere,
  requestInterview,
  type InterviewAnswer,
  type InterviewRow,
} from "./modules/press";
import { MEETINGS_MODULE_ID, holdTownHall } from "./modules/meetings";
import officialsData from "./data/officials/officials.json" with { type: "json" };
import federalOffices from "./data/office-day/federal-offices.json" with { type: "json" };
import {
  chamberSits,
  federalHoliday,
  jointAddress,
  addDays,
  washingtonWeek,
  weekOf,
  type FederalChamber,
} from "./office-day-federal-calendar";

const MINIMUM_AGE = (
  federalOffices as unknown as {
    minimumAge: Record<string, { value: number; citation: string }>;
  }
).minimumAge;

const ageOn = (birthDate: string, date: string) =>
  Number(date.slice(0, 4)) -
  Number(birthDate.slice(0, 4)) -
  (date.slice(5) < birthDate.slice(5) ? 1 : 0);

/** The youngest a person may be to hold a federal seat of this kind (the Constitution, from data). */
export const minimumAge = (kind: string): number | null =>
  MINIMUM_AGE[kind]?.value ?? null;

export const OFFICE_DAY_FEDERAL_MODULE_ID = "core2-office-day-federal-v1";
const ENGINE_STOPGAP = "SG-OFFICE-FED-engine-stand-in";
const START_STOPGAP = "SG-OFFICE-FED-custom-start";

export type FederalSeatKind =
  | "us-house"
  | "us-house-delegate"
  | "us-senate"
  | "president"
  | "vice-president";

/** What can stop the player. The important few are on by default (owner, Oct 14). */
export type FederalStopKind =
  | "own-bill-vote"
  | "floor-vote"
  | "desk-bill"
  | "interview-invite"
  | "joint-address"
  | "election-day";

export const DEFAULT_STOPS: Readonly<Record<FederalStopKind, boolean>> = {
  "own-bill-vote": true,
  "floor-vote": false,
  "desk-bill": true,
  "interview-invite": false,
  "joint-address": true,
  "election-day": true,
};

export type Where = "washington" | "district";

export interface FederalHolderRow {
  /** The person the player controls. */
  readonly id: string;
  readonly seatId: string;
  readonly termId: string;
  readonly kind: FederalSeatKind;
  readonly stateKey: string;
  readonly stops: Readonly<Record<FederalStopKind, boolean>>;
  /** Where the player chose to spend a week, by the week's Monday. */
  readonly weeks: Readonly<Record<string, Where>>;
}

/** One thing the day holds, with whether it stops the player. Ids and numbers only. */
export interface FederalDayItem {
  readonly id: string;
  readonly kind: FederalStopKind;
  readonly stops: boolean;
  readonly sourceRecordIds: readonly string[];
}

export interface FederalDay {
  readonly personId: string;
  readonly date: string;
  readonly where: Where;
  /** Whether the holder's chamber sits today (null for the president). */
  readonly sitting: boolean | null;
  readonly holiday: string | null;
  readonly items: readonly FederalDayItem[];
}

/** One act of office, done by the player or simulated by the character. */
export interface FederalActRow {
  readonly id: string;
  readonly personId: string;
  readonly date: string;
  readonly kind: string;
  readonly mode: "did" | "simulated" | "missed";
  readonly where: Where;
  /** The records the act wrote or read (a vote, an interview, a desk row). */
  readonly sourceRecordIds: readonly string[];
  readonly facts: Readonly<Record<string, string | number | boolean | null>>;
}

export const OFFICE_DAY_FEDERAL_MODULE: CoreModule = {
  id: OFFICE_DAY_FEDERAL_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      holders: {},
      days: {},
      acts: { indexes: { byPerson: { fields: ["personId"] } } },
    },
  },
  onAfterDay: (api) => finishDay(api),
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(OFFICE_DAY_FEDERAL_MODULE_ID).table(name);

const holders = (api: CoreAPI): readonly FederalHolderRow[] =>
  api.state.modules.has(OFFICE_DAY_FEDERAL_MODULE_ID)
    ? (table(api, "holders").rows() as unknown as FederalHolderRow[])
    : [];

export function holderRow(
  api: CoreAPI,
  personId: string,
): FederalHolderRow | undefined {
  if (!api.state.modules.has(OFFICE_DAY_FEDERAL_MODULE_ID)) return undefined;
  return table(api, "holders").get(personId) as unknown as
    FederalHolderRow | undefined;
}

/** Install the federal day and the legislature hook through which the character votes when the player does not stop. */
export function openFederalDay(core: CoreState): void {
  if (!core.modules.has(OFFICE_DAY_FEDERAL_MODULE_ID))
    registerModule(core, OFFICE_DAY_FEDERAL_MODULE);
  registerLegislatureHooks({ beforeVote: memberVotesOnOwn });
}

const seatKind = (officeKind: string): FederalSeatKind | null =>
  (
    [
      "us-house",
      "us-house-delegate",
      "us-senate",
      "president",
      "vice-president",
    ] as const
  ).find((k) => k === officeKind) ?? null;

export const chamberOf = (kind: FederalSeatKind): FederalChamber | null =>
  kind === "us-senate"
    ? "senate"
    : kind.startsWith("us-house")
      ? "house"
      : null;

const bodyOfficeOf = (chamber: FederalChamber) =>
  chamber === "house" ? FEDERAL_HOUSE : FEDERAL_SENATE;

/** The federal seat a person serves in today, from the offices engine's terms. */
export function federalSeatOf(
  api: CoreAPI,
  personId: string,
): { term: TermRow; kind: FederalSeatKind; stateKey: string } | null {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  for (const term of offices
    .table("terms")
    .query("byPerson", [personId]) as unknown as TermRow[]) {
    if (term.status !== "serving") continue;
    const office = offices.table("offices").get(term.officeId) as unknown as
      { kind: string; jurisdiction: string } | undefined;
    const kind = office ? seatKind(office.kind) : null;
    if (kind) return { term, kind, stateKey: office!.jurisdiction };
  }
  return null;
}

/**
 * Dev mode's custom start (owner, Oct 14: "custom start as a sitting
 * officeholder"): the player takes a federal seat today. The holder's term
 * ends and the player's begins, as a race's winner's does (the offices
 * engine's term, the `took-office` event); the player's official record is
 * their own lean and party, so pay, votes and the press read them as the
 * officeholder. Stopgap SG-OFFICE-FED-custom-start: dev mode has no seating
 * of its own yet, so this writes the offices and officials engines' rows
 * directly; the loyalty and ambition on the player's record copy the
 * predecessor's until the officials engine builds a record from a person's
 * traits.
 */
export function startAsFederalOfficeholder(
  core: CoreState,
  personId: string,
  seatId: string,
): FederalHolderRow {
  openFederalDay(core);
  const api = coreAPI(core);
  // stopgapId: SG-OFFICE-FED-custom-start
  api.stopgap(START_STOPGAP);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const date = api.state.date;
  const previous = (
    offices
      .table("terms")
      .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[]
  )[0];
  if (!previous) throw new Error(`No one serves in ${seatId}`);
  const person = api.state.people.get(personId);
  if (!person?.alive) throw new Error(`No living person ${personId}`);
  const office = offices.table("offices").get(previous.officeId) as unknown as
    { kind: string } | undefined;
  const floor = office ? MINIMUM_AGE[office.kind] : undefined;
  if (!floor) throw new Error(`${seatId} is not a federal seat`);
  if (ageOn(person.birthDate, date) < floor.value)
    throw new Error(`${personId} is under ${floor.value} (${floor.citation})`);
  // The player continues as this person (owner: "continue as anyone").
  core.playerId = personId;
  core.focusPersonIds.add(personId);
  offices.table("terms").put({
    ...previous,
    status: "ended",
    endDate: date,
    endEstimated: false,
    endedBy: "custom start",
  } as unknown as ModuleRow);
  const termId = `term:${seatId}:${date}:custom-start`;
  const term: TermRow = {
    ...previous,
    id: termId,
    personId,
    identity: {
      givenName: person.givenName,
      familyName: person.familyName,
      gender: previous.identity.gender,
      birthDate: person.birthDate,
      homeState: previous.identity.homeState,
    },
    startDate: date,
    serviceStart: date,
    reached: "custom start",
    status: "serving",
  };
  offices.table("terms").put(term as unknown as ModuleRow);
  const officials = api.moduleState(OFFICIALS_MODULE_ID).table("officials");
  const before = previous.personId
    ? (officials.get(previous.personId) as unknown as OfficialRow | undefined)
    : undefined;
  if (before) {
    officials.put({ ...before, ended: date } as unknown as ModuleRow);
    const leanScale = (
      officialsData as unknown as {
        ideology: { leanScale: { value: number } };
      }
    ).ideology.leanScale.value;
    const lean = personLean(api.state.people, person, 0);
    officials.put({
      ...before,
      id: personId,
      termId,
      ideal: lean / leanScale,
      signature: [],
      independent: null,
      leadership: null,
      serviceStart: date,
      ended: null,
    } satisfies OfficialRow as unknown as ModuleRow);
  }
  const day = makeIsoDate(date);
  api.emit({
    id: `took-office:${seatId}:${date}`,
    date: day,
    kind: "took-office",
    personIds: [personId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "ESTIMATED",
      citation: "dev mode custom start",
      asOf: day,
      estimatedFrom: "custom start",
    },
    publicRecord: true,
    news: true,
    facts: { seatId, winnerId: personId },
  });
  const seat = federalSeatOf(api, personId);
  if (!seat) throw new Error(`${seatId} is not a federal seat`);
  const row: FederalHolderRow = {
    id: personId,
    seatId,
    termId,
    kind: seat.kind,
    stateKey: seat.stateKey,
    stops: DEFAULT_STOPS,
    weeks: {},
  };
  table(api, "holders").put(row as unknown as ModuleRow);
  return row;
}

/** The player's stops: on or off by kind, changed any day. */
export function setFederalStops(
  api: CoreAPI,
  personId: string,
  stops: Partial<Record<FederalStopKind, boolean>>,
): FederalHolderRow {
  const row = holderRow(api, personId);
  if (!row) throw new Error(`${personId} holds no federal day`);
  const next = { ...row, stops: { ...row.stops, ...stops } };
  table(api, "holders").put(next as unknown as ModuleRow);
  return next;
}

/** Where the player spends the week holding `date`: in Washington or at home in the district. */
export function chooseWeek(
  api: CoreAPI,
  personId: string,
  date: string,
  where: Where,
): FederalHolderRow {
  const row = holderRow(api, personId);
  if (!row) throw new Error(`${personId} holds no federal day`);
  const next = { ...row, weeks: { ...row.weeks, [weekOf(date)]: where } };
  table(api, "holders").put(next as unknown as ModuleRow);
  return next;
}

/** Where a holder is on a date: the week they chose, else Washington when their chamber sits that week (the president works from Washington). */
export function whereOn(row: FederalHolderRow, date: string): Where {
  const chosen = row.weeks[weekOf(date)];
  if (chosen) return chosen;
  const chamber = chamberOf(row.kind);
  if (!chamber) return "washington";
  return washingtonWeek(chamber, date) ? "washington" : "district";
}

/** The day ahead of a federal holder: where they will be, whether their chamber sits, and what stops them. */
export function federalDay(api: CoreAPI, personId: string): FederalDay {
  const row = holderRow(api, personId);
  if (!row) throw new Error(`${personId} holds no federal day`);
  // stopgapId: SG-OFFICE-FED-engine-stand-in
  api.stopgap(ENGINE_STOPGAP);
  // The core's date is the day already lived; the day ahead is the one the
  // player acts on before it runs (a vote scheduled for it is still open).
  const date = dayAhead(api);
  const chamber = chamberOf(row.kind);
  const where = whereOn(row, date);
  const items: FederalDayItem[] = [];
  const add = (kind: FederalStopKind, id: string, ids: readonly string[]) =>
    items.push({ id, kind, stops: row.stops[kind], sourceRecordIds: ids });
  // A delegate or resident commissioner does not vote on final passage
  // (House Rule III; federal-representation.json).
  if (chamber && row.kind !== "us-house-delegate")
    for (const billId of floorToday(api, chamber, date))
      add(
        billOf(api, billId).sponsorId === personId
          ? "own-bill-vote"
          : "floor-vote",
        `floor:${billId}`,
        [billId],
      );
  for (const desk of deskOf(api, personId))
    if (desk.status === "awaiting") add("desk-bill", desk.id, [desk.billId]);
  for (const interview of interviewsFor(api, personId))
    if (interview.status === "invited")
      add("interview-invite", interview.id, [interview.id]);
  const address = jointAddress(Number(date.slice(0, 4)));
  if (address.date === date && (row.kind === "president" || chamber))
    add("joint-address", `joint-address:${date}`, [address.sourceUrl]);
  return {
    personId,
    date,
    where,
    sitting: chamber ? chamberSits(chamber, date).sits : null,
    holiday: federalHoliday(date),
    items,
  };
}

/**
 * The bills a chamber's floor takes up on a date: bills drafted in that
 * chamber whose vote is on the legislature's calendar for the day. Stopgap
 * SG-OFFICE-FED-floor-agenda: the legislature keeps no floor agenda a member
 * can read ahead, so this reads its calendar keys (`meeting:<billId>`); a
 * bill the floor brings up the same day it is filed is voted through the
 * `beforeVote` hook instead, with no stop.
 */
function floorToday(
  api: CoreAPI,
  chamber: FederalChamber,
  date: string,
): readonly string[] {
  if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return [];
  // stopgapId: SG-OFFICE-FED-floor-agenda
  api.stopgap("SG-OFFICE-FED-floor-agenda");
  const calendar = api.moduleCalendar(LEGISLATURE_MODULE_ID);
  const office = bodyOfficeOf(chamber);
  return (
    api.moduleState(LEGISLATURE_MODULE_ID).table("bills").rows() as unknown as {
      id: string;
      status: string;
      bodyOfficeId: string;
    }[]
  )
    .filter(
      (b) =>
        b.status === "drafted" &&
        chamberOfBill(api, b.bodyOfficeId) === office &&
        calendar.get(`meeting:${b.id}`)?.date === date,
    )
    .map((b) => b.id)
    .sort();
}

function chamberOfBill(api: CoreAPI, bodyOfficeId: string): string | null {
  if (bodyOfficeId === FEDERAL_HOUSE || bodyOfficeId === FEDERAL_SENATE)
    return bodyOfficeId;
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(bodyOfficeId) as unknown as { kind: string } | undefined;
  if (!office) return null;
  if (office.kind === "us-senate") return FEDERAL_SENATE;
  return office.kind.startsWith("us-house") ? FEDERAL_HOUSE : null;
}

/** The day the player acts on: the one ahead of the core's date, which is the day already lived. */
export const dayAhead = (api: CoreAPI): string => addDays(api.state.date, 1);

const actId = (personId: string, kind: string, key: string) =>
  `office-act:${personId}:${kind}:${key}`;

function record(api: CoreAPI, act: FederalActRow): FederalActRow {
  table(api, "acts").put(act as unknown as ModuleRow);
  return act;
}

export function actsOf(
  api: CoreAPI,
  personId: string,
): readonly FederalActRow[] {
  if (!api.state.modules.has(OFFICE_DAY_FEDERAL_MODULE_ID)) return [];
  return (
    table(api, "acts").query("byPerson", [
      personId,
    ]) as unknown as FederalActRow[]
  )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Whether the player already chose on a bill (their vote is on the legislature's record). */
const choseVote = (api: CoreAPI, billId: string, memberId: string) =>
  api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("choices")
    .get(`${billId}|${memberId}`) !== undefined;

/** The player votes on a bill on the floor today. */
export function voteOnFloor(
  api: CoreAPI,
  personId: string,
  billId: string,
  vote: "yes" | "no" | "abstain",
): FederalActRow {
  const row = holderRow(api, personId);
  if (!row) throw new Error(`${personId} holds no federal day`);
  if (!chamberOf(row.kind) || row.kind === "us-house-delegate")
    throw new Error(`${personId} has no vote on final passage`);
  castMemberVote(api, billId, personId, vote);
  const day = dayAhead(api);
  return record(api, {
    id: actId(personId, "floor-vote", billId),
    personId,
    date: day,
    kind: "floor-vote",
    mode: "did",
    where: whereOn(row, day),
    sourceRecordIds: [billId],
    facts: { vote },
  });
}

/**
 * Before any vote: a controlled member who has not chosen is voted by their
 * character when the bill does not stop them, from the legislature's own
 * reasons for that member (`memberPosition`), as for any member; away in the
 * district on a sitting day, they miss it and the chamber records the
 * abstention.
 */
function memberVotesOnOwn(api: CoreAPI, billId: string): void {
  if (!api.state.modules.has(OFFICE_DAY_FEDERAL_MODULE_ID)) return;
  const bill = billOf(api, billId);
  const chamber = chamberOfBill(api, bill.bodyOfficeId);
  if (!chamber) return;
  const date = api.state.date;
  for (const row of holders(api)) {
    const own = chamberOf(row.kind);
    // A delegate or resident commissioner does not vote on final passage
    // (House Rule III; federal-representation.json).
    if (!own || row.kind === "us-house-delegate") continue;
    if (choseVote(api, billId, row.id)) continue;
    const kind: FederalStopKind =
      bill.sponsorId === row.id ? "own-bill-vote" : "floor-vote";
    const where = whereOn(row, date);
    if (where === "district") {
      record(api, {
        id: actId(row.id, "floor-vote", billId),
        personId: row.id,
        date,
        kind: "floor-vote",
        mode: "missed",
        where,
        sourceRecordIds: [billId],
        facts: { stopKind: kind },
      });
      continue;
    }
    const position = memberPosition(api, billId, row.id);
    const vote =
      position.total > 0 ? "yes" : position.total < 0 ? "no" : "abstain";
    castMemberVote(api, billId, row.id, vote);
    record(api, {
      id: actId(row.id, "floor-vote", billId),
      personId: row.id,
      date,
      kind: "floor-vote",
      mode: "simulated",
      where,
      sourceRecordIds: [billId],
      facts: {
        vote,
        position: Math.round(position.total * 1000) / 1000,
        stopKind: kind,
      },
    });
  }
}

/** The president signs or vetoes a bill waiting on their desk. */
export function decideBill(
  api: CoreAPI,
  personId: string,
  billId: string,
  sign: boolean,
): FederalActRow {
  const row = holderRow(api, personId);
  if (!row) throw new Error(`${personId} holds no federal day`);
  decideOnDesk(api, billId, sign);
  return record(api, {
    id: actId(personId, "desk-bill", billId),
    personId,
    date: dayAhead(api),
    kind: "desk-bill",
    mode: "did",
    where: whereOn(row, dayAhead(api)),
    sourceRecordIds: [billId, `desk:${billId}`],
    facts: { sign },
  });
}

/** Ask an outlet for an interview (the press decides whether it has room and interest). */
export function askForInterview(
  api: CoreAPI,
  personId: string,
  outletId?: string,
): InterviewRow {
  // The town's own outlets first: a national desk rarely takes a member it
  // has not heard of (the press engine decides either way).
  const here = outletsHere(api);
  const outlet =
    outletId ?? (here.find((o) => o.tier !== "national") ?? here[0])?.id;
  if (!outlet) throw new Error("No outlet to ask");
  return requestInterview(api, { outletId: outlet, personId });
}

/**
 * Answer an interview. With `answers`, the player said it; without, the
 * character answers as anyone does who isn't the player: from their record
 * and their own view blended with their party's (the press engine's
 * `candidateAnswers`). Either way the outlet prints it and its readers read it.
 */
export function giveInterview(
  api: CoreAPI,
  personId: string,
  interviewId: string,
  answers?: readonly InterviewAnswer[],
  background = false,
): FederalActRow {
  const row = holderRow(api, personId);
  if (!row) throw new Error(`${personId} holds no federal day`);
  // The player acts on the day ahead; the character, at the end of the day lived.
  const when = background ? api.state.date : dayAhead(api);
  const interview = interviewsFor(api, personId).find(
    (i) => i.id === interviewId,
  );
  if (!interview) throw new Error(`No interview ${interviewId}`);
  const speaker = officeholderSpeaker(api, personId) ?? {
    personId,
    party: null,
    filing: null,
  };
  const given = answers ?? candidateAnswers(api, interview.questions, speaker);
  const printed = answerInterview(api, interviewId, given);
  return record(api, {
    id: actId(personId, "interview", interviewId),
    personId,
    date: when,
    kind: "interview",
    mode: answers ? "did" : "simulated",
    where: whereOn(row, when),
    sourceRecordIds: [interviewId, printed.outletId],
    facts: { status: printed.status, questions: interview.questions.length },
  });
}

/**
 * Hold a town hall at home: the town's most civic-minded adults come and ask
 * what presses on them. With `answers` the player answers; without, the
 * character answers from their own view (the meetings engine's rule).
 */
export function holdDistrictTownHall(
  api: CoreAPI,
  personId: string,
  answers?: Readonly<Record<string, number | null>>,
  background = false,
): FederalActRow {
  const row = holderRow(api, personId);
  if (!row) throw new Error(`${personId} holds no federal day`);
  // The player acts on the day ahead; the character, at the end of the day lived.
  const when = background ? api.state.date : dayAhead(api);
  if (!api.state.modules.has(MEETINGS_MODULE_ID))
    throw new Error("No meetings engine");
  const hall = holdTownHall(api, {
    hostId: personId,
    ...(answers ? { answers } : {}),
  });
  return record(api, {
    id: actId(personId, "town-hall", api.state.date),
    personId,
    date: when,
    kind: "town-hall",
    mode: answers ? "did" : "simulated",
    where: whereOn(row, when),
    sourceRecordIds: [hall.id, ...hall.attendeeIds],
    facts: {
      attendees: hall.attendeeIds.length,
      questions: hall.questions.length,
      moved: hall.moved,
    },
  });
}

/**
 * The end of each day: whatever the day held that the player left alone, the
 * character does now, by the owning engine's rule for anyone in the seat. A
 * bill on the desk is decided on its last day (sign when the executive's own
 * position and temperament together lean to signing, as the legislature
 * decides for any executive); an interview invitation is answered.
 */
function finishDay(api: CoreAPI): void {
  for (const row of holders(api)) {
    const date = api.state.date;
    const where = whereOn(row, date);
    for (const desk of deskOf(api, row.id)) {
      // The engine settles a bill by inaction on its last day, so the
      // character decides the day before (or the day it arrives, when desk
      // bills do not stop the player).
      if (desk.status !== "awaiting" || !desk.signBy) continue;
      if (row.stops["desk-bill"] && addDays(date, 1) < desk.signBy) continue;
      const sign = desk.position + desk.temperament >= 0;
      decideOnDesk(api, desk.billId, sign);
      record(api, {
        id: actId(row.id, "desk-bill", desk.billId),
        personId: row.id,
        date,
        kind: "desk-bill",
        mode: "simulated",
        where,
        sourceRecordIds: [desk.billId, desk.id],
        facts: { sign, position: desk.position, temperament: desk.temperament },
      });
    }
    for (const interview of interviewsFor(api, row.id))
      if (interview.status === "invited" && !row.stops["interview-invite"])
        giveInterview(api, row.id, interview.id, undefined, true);
    // The first weekday of a district week, a member whose traits lean to
    // public meetings holds a town hall at home if the player has not.
    const chamber = chamberOf(row.kind);
    if (
      chamber &&
      where === "district" &&
      firstWeekdayOfWeek(date) &&
      !federalHoliday(date) &&
      api.state.modules.has(MEETINGS_MODULE_ID) &&
      !actsOf(api, row.id).some(
        (a) => a.kind === "town-hall" && weekOf(a.date) === weekOf(date),
      ) &&
      townHallLean(api, row.id) > 0
    )
      holdDistrictTownHall(api, row.id, undefined, true);
    table(api, "days").put({
      id: `${row.id}:${date}`,
      personId: row.id,
      date,
      where,
    } as unknown as ModuleRow);
  }
}

/** How far the character leans toward taking part in a public meeting, from their traits (the meetings engine's decision). */
export function townHallLean(api: CoreAPI, personId: string): number {
  const person = api.state.people.get(personId);
  return person
    ? decisionLean(
        api.state,
        person,
        "meetings.take-part",
        "take-part",
        "stay-away",
      )
    : 0;
}

const firstWeekdayOfWeek = (date: string) => weekOf(date) === date;
