/**
 * The federal officeholder's day (office play, FEDERAL) on OFFICE-LOCAL's
 * one engine (`modules/office-day.ts`): a U.S. representative's or
 * senator's week in Washington or at home, for the person the player
 * controls (the bench's `BenchPlayer.select` on a sitting member).
 *
 * The engine already keeps the day: what stops the player (`stopsOf`), the
 * acts on the record, the player's own floor vote (`ownVote`), the desk,
 * office hours, town halls and interviews (offered to any officeholder the
 * player controls). This file adds what is federal: Congress's calendar
 * (`office-day-federal-calendar.ts`) and the week the member chooses to
 * spend in Washington or at home; the floor the evening before a vote (a
 * stop for the member's own bill or any vote, the whip's ask, the vote a
 * member at home misses); committee seats; the member's own re-election
 * filing as an act of the day. The president's part is in
 * `office-day-federal-president.ts`.
 *
 * Simulate or do: what the player leaves alone, the character does by the
 * owning engine's rule for anyone in the seat (the legislature's reasons on
 * a vote, the voting engine's rule for an incumbent who does not file).
 * Nothing is rolled; nothing names a place.
 */
import { registerModule } from "./state";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreData,
  CoreModule,
  CoreState,
  PersonState,
} from "./types";
import type { ModuleRow } from "./module-data";
import { snapshotExplicitControlV1 } from "./player-control-state-v1";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import {
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  LEGISLATURE_MODULE_ID,
  castMemberVote,
  floorAgendaOn,
  memberPosition,
} from "./modules/legislature";
import {
  clearPrepared,
  holdPlayerAt,
  officeHost,
  preparedFor,
  releaseHold,
  stopsOf,
} from "./modules/office-day";
import {
  registerOfficeActs,
  registerStopKinds,
  type OfficeEffectHandler,
} from "./office-day-registry";
import { COMMITTEES, committeeRoster, leaderOf } from "./modules/leadership";
import { candidateStance } from "./campaign-stances";
import { filingWindowOpens } from "./modules/candidacy";
import { partySide } from "./appointments";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  fileCandidacy,
  type ContestRow,
} from "./modules/elections";
import federalCommittees from "./data/office-day/federal-committees.json" with { type: "json" };
import federalParameters from "./data/office-day/federal-parameters.json" with { type: "json" };
import {
  addDays,
  washingtonWeek,
  weekOf,
  type FederalChamber,
} from "./office-day-federal-calendar";

const PARAMETERS = (
  federalParameters as unknown as {
    parameters: Record<string, { value: number }>;
  }
).parameters;
export const federalParameter = (key: string): number => {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`No federal-day parameter ${key}`);
  return row.value;
};

export const OFFICE_DAY_FEDERAL_MODULE_ID = "core2-office-day-federal-v1";

export type FederalSeatKind =
  | "us-house"
  | "us-house-delegate"
  | "us-senate"
  | "president"
  | "vice-president";

export type Where = "washington" | "district";

/** What the federal day adds to what may stop the player (the engine's own `own-bill-vote` and `desk` are used as they are). */
registerStopKinds([
  { kind: "floor-vote", byDefault: false },
  { kind: "whip-ask", byDefault: false },
  { kind: "joint-address", byDefault: true },
  { kind: "budget-request", byDefault: true },
  { kind: "nomination", byDefault: true },
]);

/**
 * The federal day's own records: the weeks a member chose, the cabinet and
 * the holds. What the player prepares for a federal act is the engine's
 * `prepareAct`.
 */
export const OFFICE_DAY_FEDERAL_MODULE: CoreModule = {
  id: OFFICE_DAY_FEDERAL_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { weeks: {}, cabinet: {}, holds: {} },
  },
  onDay: (api) => {
    federalDay(api);
    return undefined;
  },
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(OFFICE_DAY_FEDERAL_MODULE_ID).table(name);

/**
 * Hold the player the morning of the day ahead at a federal moment (the
 * engine's `holdPlayerAt`): that day's floor vote and the whip's ask before
 * it, a vacant cabinet post, the budget request or the address due that day.
 * The day ahead is the one the player lives next; its votes and duties are
 * taken when it closes. A hold is released when the player acts on it or
 * leaves it to the character (`releaseFederal`), and once its day closes.
 */
export function holdFederal(
  api: CoreAPI,
  key: string,
  reasonKey: string,
  sourceRecordId: string,
): void {
  const date = addDays(api.state.date, 1);
  const id = `${key}:${date}`;
  if (table(api, "holds").get(id)) return;
  const held = holdPlayerAt(api, {
    recordId: id,
    date,
    minuteOfDay: federalParameter("holdMinute"),
    reasonKey,
    source: {
      tag: "SOURCED",
      citation: sourceRecordId,
      asOf: api.state.date,
    },
  });
  if (held)
    table(api, "holds").put({
      id,
      key,
      date,
      released: false,
    } as unknown as ModuleRow);
}

interface HoldRow {
  readonly id: string;
  readonly key: string;
  readonly date: string;
  readonly released: boolean;
}
const holds = (api: CoreAPI) =>
  table(api, "holds").rows() as unknown as HoldRow[];

/** Release the player's hold on a federal moment: they acted on it, or leave it to the character and the floor. */
export function releaseFederal(api: CoreAPI, key: string): void {
  for (const row of holds(api))
    if (row.key === key && !row.released) {
      releaseHold(api, row.id);
      table(api, "holds").put({
        ...row,
        released: true,
      } as unknown as ModuleRow);
    }
}

/** The federal moments holding the player now, by key. */
export function heldFederal(api: CoreAPI): readonly string[] {
  return holds(api)
    .filter((row) => !row.released)
    .map((row) => row.key);
}

function releaseClosedHolds(api: CoreAPI): void {
  for (const row of holds(api))
    if (row.date <= api.state.date) {
      if (!row.released) releaseHold(api, row.id);
      table(api, "holds").remove(row.id);
    }
}

/** Open the federal day's records (the office-day levels open it with the engine). */
export function openFederalDay(core: CoreState): void {
  if (!core.modules.has(OFFICE_DAY_FEDERAL_MODULE_ID))
    registerModule(core, OFFICE_DAY_FEDERAL_MODULE);
}

/** The person the player controls now, if anyone. */
export const controlledPerson = (api: CoreAPI): string | undefined =>
  snapshotExplicitControlV1(api.state).personId;

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
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return null;
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

/** A member who votes on final passage (a delegate or resident commissioner does not, House Rule III). */
const votesOnPassage = (kind: FederalSeatKind) =>
  kind === "us-house" || kind === "us-senate";

// ---- The week --------------------------------------------------------------

/** Where the player spends the week holding `date`: in Washington or at home in the district. */
export function chooseWeek(
  api: CoreAPI,
  personId: string,
  date: string,
  where: Where,
): void {
  const row = (table(api, "weeks").get(personId) as unknown as
    { weeks: Record<string, Where> } | undefined) ?? { weeks: {} };
  table(api, "weeks").put({
    id: personId,
    weeks: { ...row.weeks, [weekOf(date)]: where },
  } as unknown as ModuleRow);
}

/** Where a member is on a date: the week they chose, else Washington when their chamber sits that week (the president works from Washington). */
export function whereOn(api: CoreAPI, personId: string, date: string): Where {
  const chosen = (
    table(api, "weeks").get(personId) as unknown as
      { weeks: Record<string, Where> } | undefined
  )?.weeks[weekOf(date)];
  if (chosen) return chosen;
  const seat = federalSeatOf(api, personId);
  const chamber = seat ? chamberOf(seat.kind) : null;
  if (!chamber) return "washington";
  return washingtonWeek(chamber, date) ? "washington" : "district";
}

// ---- The floor ---------------------------------------------------------------

/**
 * The bills a chamber's floor takes up on a date: federal bills on the
 * legislature's floor agenda for the day.
 */
export function floorOn(api: CoreAPI, date: string): readonly string[] {
  if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return [];
  return floorAgendaOn(api, date)
    .filter((b) => chamberOfBill(api, b.bodyOfficeId) !== null)
    .map((b) => b.id);
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

const chose = (api: CoreAPI, billId: string, memberId: string) =>
  api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("choices")
    .get(`${billId}|${memberId}`) !== undefined;

const floorHold = (billId: string) => `federal-floor:${billId}`;
const whipHold = (billId: string) => `federal-whip:${billId}`;

/**
 * The evening before a floor vote, for the member the player controls: at
 * home in the district, they miss it (the House records the abstention);
 * the whip of their party asks if they stand against the party leader; and
 * the vote stops them when its kind does (their own bill by default, any
 * vote if they choose). A vote they leave is cast by the engine's own rule
 * for the member when the floor takes it up.
 */
function eveOfVotes(api: CoreAPI, personId: string): void {
  const seat = federalSeatOf(api, personId);
  if (!seat || !votesOnPassage(seat.kind)) return;
  const tomorrow = addDays(api.state.date, 1);
  const stops = stopsOf(api, personId);
  for (const billId of floorOn(api, tomorrow)) {
    if (chose(api, billId, personId)) continue;
    if (whereOn(api, personId, tomorrow) === "district") {
      castMemberVote(api, billId, personId, "abstain");
      officeHost.keep(api, {
        personId,
        kind: "vote",
        how: "own-choice",
        recordId: billId,
        position: null,
        detail: "missed: at home in the district",
      });
      continue;
    }
    const ask = whipAsk(api, personId, billId);
    if (ask) {
      if (stops["whip-ask"])
        holdFederal(
          api,
          whipHold(billId),
          "office-day-federal.whip-ask",
          ask.whipId,
        );
      else answerWhip(api, personId, billId);
    }
    const own =
      (
        api.moduleState(LEGISLATURE_MODULE_ID).table("bills").get(billId) as
          { sponsorId?: string } | undefined
      )?.sponsorId === personId;
    if (stops[own ? "own-bill-vote" : "floor-vote"])
      holdFederal(
        api,
        floorHold(billId),
        "office-day-federal.floor-vote",
        billId,
      );
  }
}

/** The player votes on a bill on tomorrow's floor. */
export function voteOnFloor(
  api: CoreAPI,
  personId: string,
  billId: string,
  vote: "yes" | "no" | "abstain",
): void {
  const seat = federalSeatOf(api, personId);
  if (!seat || !votesOnPassage(seat.kind))
    throw new Error(`${personId} has no vote on final passage`);
  castMemberVote(api, billId, personId, vote);
  officeHost.keep(api, {
    personId,
    kind: "vote",
    how: "did",
    recordId: billId,
    position: null,
    detail: vote,
  });
  releaseFederal(api, floorHold(billId));
}

/** The player leaves a held vote to the character: the floor casts it by the engine's own rule. */
export function leaveVoteToCharacter(api: CoreAPI, billId: string): void {
  releaseFederal(api, floorHold(billId));
}

// ---- The whip --------------------------------------------------------------

/**
 * The whip's ask (Evans 2018, "The Whips"): before a floor vote, the whip of
 * the member's party works the members whose own position runs against
 * their party leader's on the bill. The leader's side is the floor leader's
 * own position (the legislature's reasons for that member); the whip is the
 * party's whip post holder (the leadership engine). Null where the member
 * already stands with the leader, or the chamber has no whip of their party.
 */
export function whipAsk(
  api: CoreAPI,
  personId: string,
  billId: string,
): {
  billId: string;
  whipId: string;
  leaderId: string;
  post: string;
  side: "yes" | "no";
} | null {
  const seat = federalSeatOf(api, personId);
  const chamber = seat ? chamberOf(seat.kind) : null;
  if (!seat || !chamber || !votesOnPassage(seat.kind)) return null;
  const body = bodyOfficeOf(chamber);
  const mine = partySide(seat.term.party);
  if (mine === 0) return null;
  const sideOf = (id: string | null) =>
    id
      ? partySide(
          (
            api
              .moduleState(OFFICIALS_MODULE_ID)
              .table("officials")
              .get(id) as unknown as OfficialRow | undefined
          )?.party,
        )
      : 0;
  const posted = (posts: readonly string[]) =>
    posts
      .map((post) => ({ post, id: leaderOf(api, body, post) }))
      .find((p) => p.id && p.id !== personId && sideOf(p.id) === mine);
  const leader = posted(["majority-leader", "minority-leader"]);
  const whip = posted(["majority-whip", "minority-whip"]);
  if (!leader?.id || !whip?.id) return null;
  const leaderPosition = memberPosition(api, billId, leader.id).total;
  if (leaderPosition === 0) return null;
  const own = memberPosition(api, billId, personId).total;
  if (Math.sign(own) === Math.sign(leaderPosition)) return null;
  return {
    billId,
    whipId: whip.id,
    leaderId: leader.id,
    post: whip.post,
    side: leaderPosition > 0 ? "yes" : "no",
  };
}

/**
 * Answer the whip: commit to the party's side (the vote is cast that way) or
 * refuse. Without an answer the character answers by their own position on
 * the bill, the party's pull included (`memberPosition`), as any member does.
 * The answer moves the closeness between member and whip both ways, which
 * the legislature reads when one asks the other for something.
 */
export function answerWhip(
  api: CoreAPI,
  personId: string,
  billId: string,
  answer?: "commit" | "refuse",
): "commit" | "refuse" | null {
  const ask = whipAsk(api, personId, billId);
  if (!ask) return null;
  const own = memberPosition(api, billId, personId).total;
  const chosen =
    answer ??
    (Math.sign(own) === (ask.side === "yes" ? 1 : -1) ? "commit" : "refuse");
  if (chosen === "commit") castMemberVote(api, billId, personId, ask.side);
  const step =
    federalParameter("whipAnswerCloseness") * (chosen === "commit" ? 1 : -1);
  const reason = { cause: "whip-answer", sourceId: billId };
  if (api.state.people.has(ask.whipId)) {
    api.relationship(personId, ask.whipId, "contact", step, undefined, reason);
    api.relationship(ask.whipId, personId, "contact", step, undefined, reason);
  }
  officeHost.keep(api, {
    personId,
    kind: "whip-ask",
    how: answer ? "did" : "own-choice",
    recordId: billId,
    position: Math.round(own * 1000) / 1000,
    detail: `${chosen} (${ask.whipId}, ${ask.side})`,
  });
  releaseFederal(api, whipHold(billId));
  return chosen;
}

// ---- Committees --------------------------------------------------------------

interface CommitteeData {
  readonly id: string;
  readonly name: string;
  readonly engineCommittee: (typeof COMMITTEES)[number];
  readonly questions: readonly string[];
  readonly subcommittees: readonly {
    readonly id: string;
    readonly questions?: readonly string[];
  }[];
}
const COMMITTEE_DATA = (
  federalCommittees as unknown as {
    chambers: Record<FederalChamber, readonly CommitteeData[]>;
  }
).chambers;

export interface CommitteeSeat {
  /** The engine's subject committee the member sits on (the legislature refers bills to it). */
  readonly engineCommittee: string;
  readonly chair: boolean;
  /** The real standing committee and subcommittee (data), where one fits. */
  readonly committeeId: string | null;
  readonly subcommitteeId: string | null;
}

/**
 * A member's committee seats. The leadership engine seats them on the
 * chamber's subject committees; among the real standing committees that
 * committee stands for (data, cited), the member sits on the one whose
 * questions they hold the strongest views on, as members ask their party's
 * steering committee for the committees their interests run to, and on the
 * subcommittee chosen the same way. Ties go to the official list's order.
 */
export function committeeSeats(
  api: CoreAPI,
  personId: string,
): readonly CommitteeSeat[] {
  const seat = federalSeatOf(api, personId);
  const chamber = seat ? chamberOf(seat.kind) : null;
  if (!seat || !chamber) return [];
  const party = seat.term.party ?? null;
  const weight = (questions: readonly string[] = []) =>
    questions.reduce(
      (sum, q) => sum + Math.abs(candidateStance(api, personId, party, q) ?? 0),
      0,
    );
  const best = <T extends { questions?: readonly string[] }>(
    list: readonly T[],
  ): T | null =>
    list.reduce<T | null>(
      (top, item) =>
        top === null || weight(item.questions) > weight(top.questions)
          ? item
          : top,
      null,
    );
  return COMMITTEES.flatMap((key) => {
    const roster = committeeRoster(api, bodyOfficeOf(chamber), key);
    if (!roster?.memberIds.includes(personId)) return [];
    const committee = best(
      COMMITTEE_DATA[chamber].filter((c) => c.engineCommittee === key),
    );
    const sub = committee ? best(committee.subcommittees) : null;
    return [
      {
        engineCommittee: key,
        chair: roster.chairId === personId,
        committeeId: committee?.id ?? null,
        subcommitteeId: sub?.id ?? null,
      },
    ];
  });
}

// ---- Re-election ---------------------------------------------------------------

/** The member's own race whose filing window is open on a date (the place's record, else the candidacy engine's estimate) and that they have not filed in. */
export function openFiling(
  api: CoreAPI,
  personId: string,
  date: string,
): ContestRow | null {
  const seat = federalSeatOf(api, personId);
  if (!seat || !api.state.modules.has(ELECTIONS_MODULE_ID)) return null;
  return (
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find(
      (c) =>
        c.seatId === seat.term.seatId &&
        filingWindowOpens(api, c) <= date &&
        date <= c.filingDeadline &&
        !ballot(api, c.id).some((f) => f.personId === personId),
    ) ?? null
  );
}

/**
 * File for re-election to the member's own seat, where the place's records
 * say filings go, under the party they sit with, on the stances the player
 * prepared (none otherwise). A member who never takes the act is filed, or
 * not, by the voting engine's rule for every incumbent when filing closes:
 * their own traits weigh standing again against retiring.
 */
function fileForReelection(api: CoreAPI, personId: string): void {
  const contest = openFiling(api, personId, api.state.date);
  if (!contest) return;
  const prepared = preparedFor(api, personId, "federal-file");
  const result = fileCandidacy(api, {
    personId,
    contestId: contest.id,
    platform: (prepared?.platform ?? []).map(
      (s) => `${s.question}=${s.position}`,
    ),
    party: federalSeatOf(api, personId)?.term.party ?? null,
  });
  officeHost.keep(api, {
    personId,
    kind: "filing",
    how: prepared ? "did" : "own-choice",
    recordId: contest.id,
    position: null,
    detail: result.status,
  });
  clearPrepared(api, personId, "federal-file");
}

// ---- The kit -------------------------------------------------------------------

export const FEDERAL_DUTY = "federal-duty";

/** An act of federal office in the day's choices. */
export const federalAct = (
  id: string,
  effortParameter: string,
  actKinds: readonly string[],
  targetKind = FEDERAL_DUTY,
): ActionDefinition => ({
  id,
  actKinds,
  goalKinds: ["change-condition"],
  need: "safety",
  effortParameter,
  effectParameter: "one",
  targetKind,
  effect: id,
  emotion: {
    moodMultiplierParameter: "one",
    stressMultiplierParameter: "one",
  },
});

/** The hours each federal act takes, from the federal parameter table. */
const ACT_HOURS = Object.fromEntries(
  Object.entries(
    PARAMETERS as Record<
      string,
      {
        value: number;
        source: string;
        estimatedFrom: string;
        spread: [number, number];
      }
    >,
  )
    .filter(([key]) => key.endsWith("ActHours"))
    .map(([key, row]) => [
      key,
      {
        value: row.value,
        tag: "ESTIMATED",
        citation: row.source,
        estimatedFrom: row.estimatedFrom,
        spread: row.spread,
      },
    ]),
) as unknown as CoreData["parameters"];

type Provider = (
  api: CoreAPI,
  actor: Readonly<PersonState>,
  action: ActionDefinition,
) => ActOffer[];

/** Each federal part's acts, offered only to the officeholder the player controls. */
const parts: {
  acts: ActionDefinition[];
  providers: Record<string, Provider>;
  handlers: Record<string, OfficeEffectHandler>;
} = { acts: [], providers: {}, handlers: {} };

/** A federal part (the member's, the president's) adds its acts to the federal kit. */
export function addFederalActs(input: {
  readonly acts: readonly ActionDefinition[];
  readonly offered: (
    api: CoreAPI,
    personId: string,
    action: ActionDefinition,
  ) => readonly string[];
  readonly handlers: Readonly<Record<string, OfficeEffectHandler>>;
}): void {
  parts.acts.push(...input.acts);
  for (const act of input.acts)
    parts.providers[`${FEDERAL_DUTY}:${act.id}`] = (api, actor, action) =>
      actor.id === controlledPerson(api)
        ? input.offered(api, actor.id, action).map((targetId) => ({
            definition: action,
            targetId,
            availableHours: api.parameter(action.effortParameter),
          }))
        : [];
  Object.assign(parts.handlers, input.handlers);
  registerOfficeActs({
    id: "federal",
    acts: parts.acts.map((a) => ({
      ...a,
      targetKind: `${FEDERAL_DUTY}:${a.id}`,
    })),
    parameters: ACT_HOURS,
    providers: parts.providers,
    handlers: parts.handlers,
  });
}

addFederalActs({
  acts: [
    federalAct("federal-file", "filingActHours", [
      "commit",
      "follow-rules",
      "self-interest",
    ]),
  ],
  offered: (api, personId) => {
    const contest = openFiling(api, personId, api.state.date);
    return contest ? [contest.id] : [];
  },
  handlers: {
    "federal-file": (api, actorId) => fileForReelection(api, actorId),
  },
});

// ---- The day ---------------------------------------------------------------------

type DayPart = (api: CoreAPI, personId: string) => void;
const dayParts: DayPart[] = [];

/** A federal part adds what it does each day for the controlled holder (the president's duties). */
export function addFederalDayPart(part: DayPart): void {
  if (!dayParts.includes(part)) dayParts.push(part);
}

type WorldPart = (api: CoreAPI) => void;
const worldParts: WorldPart[] = [];

/** A federal part adds what happens each day whoever the player controls (the Senate's votes on nominations). */
export function addFederalWorldPart(part: WorldPart): void {
  if (!worldParts.includes(part)) worldParts.push(part);
}

/** Each day: what happens whoever the player is, then the day of the federal officeholder the player controls. */
function federalDay(api: CoreAPI): void {
  for (const part of worldParts) part(api);
  const personId = controlledPerson(api);
  releaseClosedHolds(api);
  if (!personId || !federalSeatOf(api, personId)) return;
  eveOfVotes(api, personId);
  for (const part of dayParts) part(api, personId);
}
