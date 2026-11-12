/**
 * Other governments legislate (M3-10): the town's state legislature,
 * Congress, the town council and the county board pass laws on their own, on
 * the same engine the player uses.
 *
 * A state legislature sits through its session (the state session calendar
 * table) and Congress through its own (Congress's session table). When a
 * session opens, every member files the changes their own reasons favor
 * where the law in force differs; members wanting the same change join one
 * bill, and the bills come in over the session's filing period. The floor
 * leader orders them by how many members back each. Every week of sitting,
 * the floor takes up as many as the legislature's floor days a week (or
 * Congress's floor days a year) and the floor's pace allow, once committee
 * has had each: the leader's filings first, then the chamber's other bills
 * oldest first (the player's, a member's carried ask, any drafted after the
 * session opened). What the floor never reaches dies at adjournment. A
 * member's filing is read against the law again on the floor day: a bill whose
 * law an earlier act of the session already made, or cut across, ends without
 * a vote and names that law's row. At each regular council or board meeting
 * the members file the same way and the agenda's time sets how many are taken
 * up. Each bill reached goes through
 * committee, every chamber and the executive; what passes takes effect by
 * that government's own rule and reaches named residents through the
 * law-effects module. No count of bills is set anywhere: the volume follows
 * the members' reasons, the law in force and the time. Nothing is rolled:
 * every filing is the member's choice from their reasons, and every vote is
 * each member's. The session's filings, hearings and votes are counted
 * together on its floor day.
 */
import { snapshotExplicitControlV1 } from "../player-control-state-v1";
import type { GovernmentLevel } from "../government-level";
import { townLean } from "./campaigns";
import questionScopes from "../../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import geography from "../../../data/research/geography/state-reference.json" with { type: "json" };
import federalAnswers from "../data/legislature/federal-answers.json" with { type: "json" };
import congressSessions from "../data/legislature/congress-sessions.json" with { type: "json" };
import {
  budgetsOf,
  fiscalYearOf,
  governmentOfJurisdiction,
  lineChangedInYear,
} from "./budgets";
import { townConcernShare } from "./meetings";
import { sessionPlaceKeys, sessionYear } from "../state-session-calendar";
import { stateActEffectiveDate } from "./laws";
import { leaderOf, presidingOfficer } from "./leadership";
import { officialOf, officialStance } from "./officials";
import { coreAPI, registerModule } from "../state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonState,
  Source,
} from "../types";
import { nextMeeting } from "./offices";
import {
  addDays,
  makeIsoDate,
  daysBetweenText as daysBetween,
} from "../kernel/dates";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  campaignParameter,
  personStance,
  PLATFORM_QUESTIONS,
} from "./elections";
import {
  enactLaw,
  lastEnactment,
  lawRows,
  lawChain,
  LAWS_MODULE_ID,
  questionSettled,
  type SettledQuestion,
} from "./laws";
import type { LawRowInput } from "./laws";
import { policySeriesAtLevel } from "./laws";
import stateReach from "../data/places/state-reach.json" with { type: "json" };
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import agendaData from "../data/legislature/outside-agenda.json" with { type: "json" };
import { seededUnit } from "../seeded";
import { countryStateNow, countryStates } from "./macro";
import type { OfficeLevel } from "./offices";
import { partySide } from "./offices";
import { decisionLean, termOfLean } from "./people";
import {
  authorityFor,
  beyondPower,
  billJurisdiction,
  bodyJurisdiction,
  lawKeysOf,
  bodyOf,
  draftBill,
  executiveOf,
  FEDERAL_HOUSE,
  holdVote,
  leanOf,
  memberKey,
  members,
  POLICY_QUESTIONS,
  proposeAsExecutive,
  reachesTown,
  FEDERAL_SENATE,
  LEGISLATURE_MODULE_ID,
  registerFloorDateReader,
  registerSittingReader,
  registerWeeklyFloorReader,
  settledness,
  tasteForChange,
  type BillRow,
  type Provision,
  type Sitting,
} from "./legislature";

/**
 * A local body's member filings can be held for the player's meeting: the
 * office-day engine says whether to (the player sits on the body and holds
 * the clock) and takes the filed bills onto the meeting's agenda, voting them
 * when the meeting closes. Without it, filings are voted as they are filed.
 */
type MeetingHold = (api: CoreAPI, officeId: string) => boolean;
type FiledAgenda = (
  api: CoreAPI,
  officeId: string,
  meetingDate: string,
  billIds: readonly string[],
) => void;
type BillIntroduced = (api: CoreAPI, billId: string) => void;
let billIntroduced: BillIntroduced | null = null;
/** Called as each member's filed change becomes a bill in their chamber. */
export function registerBillIntroduced(hook: BillIntroduced): void {
  billIntroduced = hook;
}
let meetingHold: MeetingHold | null = null;
let filedAgenda: FiledAgenda | null = null;
export function registerMeetingHold(
  hold: MeetingHold,
  filed: FiledAgenda,
): void {
  meetingHold = hold;
  filedAgenda = filed;
}

const QUESTION_SCOPES = questionScopes.questions as Readonly<
  Record<string, { levels: readonly string[] }>
>;
const JURISDICTIONS = geography.places as Readonly<
  Record<string, { jurisdictionKind: string }>
>;

/** Scope is the question's own government, not every government that touches its subject. */
function questionForLevel(
  api: CoreAPI,
  question: string,
  level: GovernmentLevel,
  /** The government asking; the player's own state unless an outside legislature sits. */
  stateKey: string = lawChain(api).stateKey,
): boolean {
  const state = stateKey;
  const kind =
    JURISDICTIONS[state.slice(state.lastIndexOf("-") + 1)]?.jurisdictionKind;
  const levels = QUESTION_SCOPES[question]?.levels ?? [];
  return kind === "federal-district" && level !== "federal"
    ? levels.some((own) => ["state", "county", "city"].includes(own))
    : levels.includes(level);
}

/**
 * Whether the government an office belongs to may decide a policy question
 * here: the question is that level's own (`question-powers.json`), the level
 * has the power for it, and a town, township or county acts only within what
 * its state lets its places do. The one check a body files by when it sits,
 * and the one a contest's positions are read through (`contest-positions.ts`).
 * A township legislates as a town does.
 */
export function levelMayDecide(
  api: CoreAPI,
  level: OfficeLevel,
  question: string,
  value = 1,
  stateKey?: string,
): boolean {
  // A township is read as the town's own level (SG-GOV-township-law-level: the law chain has no township level).
  if (level === "township") api.stopgap("SG-GOV-township-law-level");
  const own = level === "township" ? "city" : level;
  if (!questionForLevel(api, question, own, stateKey)) return false;
  const provision: Provision = { kind: "policy-question", question, value };
  return own === "federal" || own === "state"
    ? !beyondPower(provision, own)
    : !beyondPower(provision, "local") && authorityFor(api, provision).allowed;
}

export const WORLD_LEGISLATING_MODULE_ID = "core2-world-legislating-v1";

export const WORLD_LEGISLATING_MODULE: CoreModule = {
  id: WORLD_LEGISLATING_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      sessions: {},
      legislativeSessions: {},
      nextMeetings: {},
      /** Roll calls built on demand for another government's law, kept once seen. */
      rollCalls: {},
      /** Each other state's pull toward each question, and its figures and members at its last session. */
      agendas: {},
    },
  },
  onCalendarWork: (api, work) => onWork(api, work),
};

/** Register the module and put the state's session ends on the calendar. */
export function openWorldLegislating(core: CoreState): void {
  registerSittingReader(nextSitting);
  registerWeeklyFloorReader(weeklyFloorOn);
  registerFloorDateReader(floorDateOf);
  if (!core.modules.has(WORLD_LEGISLATING_MODULE_ID))
    registerModule(core, WORLD_LEGISLATING_MODULE);
  const api = coreAPI(core);
  // The town's council and its county board meet on their own.
  for (const office of townBodies(api)) scheduleMeeting(api, office);
  // Congress and every legislature in the session calendar open their next
  // session (or the one already sitting, today), each on its own dates.
  for (const jurisdiction of ["US", ...sessionPlaceKeys()])
    scheduleOpening(api, jurisdiction, core.date, true);
}

/**
 * Every session already sitting when the world opens takes up its work at the opening, once the
 * rest of the world is installed, so the bills filed in its first weeks are on the record on
 * day one. Called last by the world's build; a world that does not call it opens them the next day.
 */
export function openSittingSessions(core: CoreState): void {
  if (!core.modules.has(WORLD_LEGISLATING_MODULE_ID)) return;
  const api = coreAPI(core);
  for (const jurisdiction of ["US", ...sessionPlaceKeys()]) {
    const w = nextWindow(jurisdiction, core.date, true);
    if (!w || w.conveneAt > core.date) continue;
    openSession(api, {
      key: `session-open:${jurisdiction}:${w.conveneAt}`,
      date: core.date,
      kind: "session-open",
      source: {
        tag: w.tag,
        citation: w.source,
        asOf: core.date,
        ...(w.tag === "ESTIMATED" ? { estimatedFrom: w.source } : {}),
      },
      sourceRecordIds: [jurisdiction, w.conveneAt, w.adjournAt],
    } as unknown as Readonly<ModuleCalendarWork>);
  }
}

function townBodies(api: CoreAPI): readonly string[] {
  const offices = (
    api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
      id: string;
      kind: string;
    }[]
  ).filter(
    (o) =>
      o.kind === "council" ||
      o.kind === "county-board" ||
      o.kind === "township-board",
  );
  return offices.map((o) => o.id).sort();
}

/** A government's own answer in force on a policy question: its latest enacted row, else its recorded starting answer. */
const FEDERAL_ANSWERS = (
  federalAnswers as unknown as {
    questions: Record<string, { answer: string }>;
  }
).questions;

export function answerIn(
  api: CoreAPI,
  stateKey: string,
  question: string,
  /** Count acts already enacted that haven't taken effect yet. */
  enacted = false,
): number | null {
  const rows = lawRows(api, question, stateKey)
    .filter((r) => enacted || r.effectiveDate <= api.state.date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  if (rows[0]) return rows[0].value === 1 ? 1 : -1;
  const answer =
    stateKey === "US"
      ? FEDERAL_ANSWERS[policySeriesAtLevel(question, "federal")]?.answer
      : POLICY_QUESTIONS[question]?.answers[stateKey]?.answer;
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

/** The House: one national chamber, the same in every world (bills are introduced there). */
function houseOffice(api: CoreAPI): {
  id: string;
  members: readonly TermRow[];
} {
  return { id: FEDERAL_HOUSE, members: members(api, FEDERAL_HOUSE) };
}

/**
 * Whether the law in force needs changing for a bill pointing this way: a
 * policy wanted where it isn't law, or wanted gone where it is. Nothing to
 * undo where no law stands.
 */
function needsChange(direction: number, now: number | null): boolean {
  return direction > 0 ? now !== 1 : now === 1;
}

/**
 * Whether a policy is law for the town at any level as enacted, an act
 * waiting on its effective date included (the state's recorded starting
 * answer counting until a state act replaces it).
 */
function inForceForTown(api: CoreAPI, question: string): boolean {
  const chain = lawChain(api);
  return chain.levels.some(({ level, jurisdiction }) =>
    level === "state"
      ? answerIn(api, jurisdiction, question, true) === 1
      : ownRow(api, jurisdiction, question) === 1,
  );
}

/** A jurisdiction's own latest enacted row on a question, whether or not it has taken effect yet. */
function ownRow(
  api: CoreAPI,
  jurisdiction: string,
  question: string,
): number | null {
  const row = [...lawRows(api, question, jurisdiction)].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate),
  )[0];
  return row ? (row.value === 1 ? 1 : -1) : null;
}

interface Body {
  readonly id: string;
  readonly members: readonly TermRow[];
}

/** One bill a session takes up, with who filed it and how far it got. */
export interface SessionBill {
  readonly number: string;
  readonly question: string;
  readonly change: "enact" | "repeal";
  readonly sponsor: string;
  /** Members whose own reasons favor the change (the sponsor among them). */
  readonly cosponsors: number;
  readonly status: string;
  /**
   * "voted" when it reached the floor; "not-reached" when time ran out first;
   * "moot" when the floor took it up and found its law already made.
   */
  readonly fate: "voted" | "not-reached" | "moot";
  /** For a moot bill: the law it repeated or cut across, by row id. */
  readonly moot?: SettledQuestion & { readonly question: string };
}

/**
 * What moves a member to carry a change: their views and, at the constituent
 * weight, how their constituents lean (a town member's town, a state or
 * federal official's own district, from their officials row), the same
 * parts their vote weighs (`legislature.ts`), plus how their traits lean
 * between filing and holding back. Read once per sitting.
 */
/** Whether a filer is the person the player controls: they back a filing, never sponsor one they did not file. */
function isControlled(api: CoreAPI, filer: Filer): boolean {
  const controlled = snapshotExplicitControlV1(api.state).personId;
  return (
    controlled !== undefined &&
    controlled !== null &&
    (filer.term.personId === controlled || filer.key === controlled)
  );
}

export interface Filer {
  readonly term: TermRow;
  readonly key: string;
  readonly lean: number;
  readonly home: number;
  /** The member as a person, for the trait term; absent for a named official not filled in. */
  readonly person: PersonState | undefined;
  /** Their traits' lean toward filing over holding back, unweighted. */
  readonly trait: number;
  /** Their own position on a question: an official's own ideal and causes (OPUS-OFFICIALS), anyone else's by their lean. */
  readonly stance: (question: string) => number;
}

export function filerOf(api: CoreAPI, term: TermRow): Filer {
  const key = memberKey(term);
  const lean = leanOf(api, key);
  const person = api.state.people.get(key);
  return {
    term,
    key,
    lean,
    // A state or federal official's constituents are their own district's;
    // only a town member answers to the town.
    home: officialOf(api, key)?.districtLean ?? (person ? townLean(api) : lean),
    person,
    trait: person
      ? decisionLean(
          api.state,
          person,
          "world-legislating.bring-agenda",
          "bring",
          "hold",
        )
      : 0,
    stance: (question) =>
      officialStance(api, key, question) ?? personStance(lean, question),
  };
}

/**
 * How the law on a question stands, for anyone weighing a change to it: how
 * settled it is (-1 passed today, 1 long standing) and, for a change that
 * would reverse the latest law, the body's reluctance to undo it, larger the
 * fresher it is and the wider it passed (owner, Oct 14: no body's rules are
 * in data, so a sliding reluctance from recency and margin; no fixed cooldown).
 */
function lawStanding(
  api: CoreAPI,
  question: string,
  direction: number,
  jurisdiction: string,
): { settled: number; reluctance: number; neighbors: number } {
  const settled = settledness(api, question, jurisdiction);
  const last = lastEnactment(api, question, lawKeysOf(api, jurisdiction));
  const reverses = last !== null && (last.value > 0 ? 1 : -1) !== direction;
  return {
    settled,
    reluctance: reverses
      ? campaignParameter("reversalReluctance") *
        Math.max(0, last.margin) *
        ((1 - settled) / 2)
      : 0,
    neighbors: neighborPull(api, question, direction, jurisdiction),
  };
}

/** The states bordering each state (Census county adjacency; src/core2/data/places/state-reach.json). */
const BORDERS = (
  stateReach as unknown as { states: Record<string, { borders: string[] }> }
).states;

/**
 * How the states that border a state stand on a change to a question: the
 * share with the law the change would make, less the share with the law it
 * would unmake, from -1 to 1 (0 for a body that is not a state's, or a
 * question the neighbors' research does not answer). A neighbor's law is its
 * researched starting law: only the town's state legislates in a played
 * world, so no neighbor's own acts are recorded.
 */
export function neighborPull(
  api: CoreAPI,
  question: string,
  direction: number,
  jurisdiction: string,
): number {
  const neighbors = (
    BORDERS[jurisdiction.replace(/^US-/, "")]?.borders ?? []
  ).map((usps) => `US-${usps}`);
  const answers = POLICY_QUESTIONS[question]?.answers;
  if (!neighbors.length || !answers) return 0;
  let net = 0,
    counted = 0;
  for (const state of neighbors) {
    const answer = answers[state]?.answer;
    if (answer !== "yes" && answer !== "no") continue;
    // stopgapId: SG-LAWS-neighbor-law-starting
    api.stopgap("SG-LAWS-neighbor-law-starting");
    counted += 1;
    net += (answer === "yes" ? 1 : -1) * direction;
  }
  return counted ? net / counted : 0;
}

/** A member's own reasons to carry a change on a question, pointing one way. */
export function filingReason(
  api: CoreAPI,
  f: Filer,
  question: string,
  direction: number,
  law: { settled: number; reluctance: number; neighbors?: number },
): number {
  const bare =
    (f.stance(question) +
      campaignParameter("constituentWeight") * personStance(f.home, question)) *
      direction -
    law.reluctance +
    // The states next door: the more of them have the change, the likelier it
    // is carried (policy diffusion between neighboring states).
    campaignParameter("neighborLawWeight") * (law.neighbors ?? 0);
  // A taste for change backs changing a settled law, not undoing a fresh one.
  return f.person
    ? bare +
        termOfLean(
          api.state,
          f.person,
          "world-legislating.bring-agenda",
          tasteForChange(f.trait, law.settled),
          bare,
        )
    : bare;
}

/** A change a member files, with who backs it and where the floor leader puts it. */
interface Filed {
  readonly question: string;
  readonly direction: number;
  readonly sponsor: Filer;
  readonly cosponsors: number;
  readonly leaderReason: number;
  /** The bill a member filed at the executive's request. */
  readonly drafted?: BillRow;
  /** A change to one line of the government's budget, in place of a yes-or-no question. */
  readonly line?: {
    readonly name: string;
    readonly deltaMinor: number;
    readonly of: number;
  };
}

/**
 * The changes the body's members file where the law in force differs from
 * what their own reasons favor (members wanting the same change join one
 * bill, the most moved member sponsoring it; the executive brings what no
 * member files, through a member), in the floor leader's order: the most
 * backed first, then their own reasons.
 */
function fileChanges(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly jurisdiction: string;
    readonly body: Body | null;
    /** Everyone who may file: every member of every chamber. */
    readonly filers: readonly TermRow[];
    readonly leader: TermRow | undefined;
    /** The floor days the sitting has. */
    readonly floorDays: number;
    /** How many bills a floor day takes up. */
    readonly billsPerFloorDay: number;
    readonly needsChange: (question: string, direction: number) => boolean;
    readonly allowed: (question: string, value: number) => boolean;
    /** A change the body turned down recently enough that its rules bar it again. */
    readonly barred: (question: string, direction: number) => boolean;
    /** A body that votes its own government's budget also takes up amendments to its lines. */
    readonly lines?: boolean;
  },
): Filed[] {
  const filers = input.filers.map((t) => filerOf(api, t));
  const leader = input.leader ? filerOf(api, input.leader) : null;
  const filed: Filed[] = [];
  // The executive over the body brings what no member files, through the
  // member they ask (the player decides their own requests).
  const head = input.body ? executiveOf(api, input.body.id).term : undefined;
  const executive =
    head && memberKey(head) !== (api.state as CoreState).playerId
      ? filerOf(api, head)
      : null;
  for (const question of input.body ? PLATFORM_QUESTIONS : []) {
    for (const direction of [1, -1]) {
      if (!input.needsChange(question, direction)) continue;
      if (!input.allowed(question, direction)) continue;
      if (input.barred(question, direction)) continue;
      const law = lawStanding(api, question, direction, input.jurisdiction);
      let sponsor: Filer | null = null;
      let best = 0;
      let cosponsors = 0;
      for (const member of filers) {
        const reason = filingReason(api, member, question, direction, law);
        if (reason <= 0) continue;
        cosponsors += 1;
        // Nothing is filed in the player's name without them: they back it,
        // and file their own bills through the bill menu.
        if (isControlled(api, member)) continue;
        if (
          reason > best ||
          (reason === best && sponsor && member.key < sponsor.key)
        ) {
          best = reason;
          sponsor = member;
        }
      }
      if (!sponsor) {
        if (
          !executive ||
          filingReason(api, executive, question, direction, law) <= 0
        )
          continue;
        const request = proposeAsExecutive(api, {
          bodyOfficeId: input.body!.id,
          provisions: [{ kind: "policy-question", question, value: direction }],
        });
        const drafted = request?.billId
          ? (api
              .moduleState(LEGISLATURE_MODULE_ID)
              .table("bills")
              .get(request.billId) as unknown as BillRow)
          : undefined;
        if (!request || !drafted) continue;
        filed.push({
          question,
          direction,
          sponsor:
            filers.find((f) => f.key === request.memberId) ??
            filerOf(
              api,
              input.filers.find((t) => memberKey(t) === request.memberId)!,
            ),
          cosponsors,
          leaderReason: leader
            ? filingReason(api, leader, question, direction, law)
            : 0,
          drafted,
        });
        continue;
      }
      filed.push({
        question,
        direction,
        sponsor,
        cosponsors,
        leaderReason: leader
          ? filingReason(api, leader, question, direction, law)
          : 0,
      });
    }
  }
  if (input.lines)
    filed.push(...fileLines(api, input.jurisdiction, filers, input.barred));
  // The floor leader's calendar: the most backed first, a change weighing
  // more as more of the town's residents live with what it touches; then the
  // leader's own reasons.
  const weight = campaignParameter("floorConcernWeight");
  const backing = new Map(
    filed.map((f) => [
      f,
      f.cosponsors *
        (f.line ? 1 : 1 + weight * townConcernShare(api, f.question)),
    ]),
  );
  filed.sort(
    (a, b) =>
      backing.get(b)! - backing.get(a)! ||
      b.leaderReason - a.leaderReason ||
      a.question.localeCompare(b.question),
  );
  return filed;
}

/** What each member of a body wants done to one budget line, and who backs which way. */
export interface LinePosition {
  readonly name: string;
  readonly base: number;
  readonly changed: number;
  /** The members' positions on the line, in the body's order, from -1 to 1. */
  readonly stances: readonly number[];
  /** For each direction (1 raise, -1 cut): each member's gap, kept where it clears the amendment threshold. */
  readonly backing: {
    readonly up: readonly { readonly at: number; readonly gap: number }[];
    readonly down: readonly { readonly at: number; readonly gap: number }[];
  };
}

/** Every line of the government's budget in force and the members' positions on it. */
function linePositions(
  api: CoreAPI,
  governmentId: string,
  filers: readonly Filer[],
): readonly LinePosition[] {
  const gov = governmentOfJurisdiction(api, governmentId);
  if (!gov) return [];
  const fy = fiscalYearOf(api.state.date, gov.fiscalYearStart);
  const budget = budgetsOf(api, gov.id).find((b) => b.fiscalYear === fy);
  if (!budget) return [];
  const scale = campaignParameter("budgetFullStanceShare");
  const minimum = campaignParameter("budgetAmendmentMinShare");
  const rows: LinePosition[] = [];
  for (const [name, now] of Object.entries(budget.spendingMinor)) {
    const changed = lineChangedInYear(api, gov.id, fy, name);
    const base = now - changed;
    if (!(base > 0)) continue;
    const question = `budget-line:${name}`;
    // A member's stance on a line does not depend on which way it is moved.
    const stances = filers.map((member) =>
      Math.max(
        -1,
        Math.min(
          1,
          member.stance(question) +
            campaignParameter("constituentWeight") *
              personStance(member.home, question),
        ),
      ),
    );
    const up: { at: number; gap: number }[] = [];
    const down: { at: number; gap: number }[] = [];
    for (const [at] of filers.entries()) {
      const raise = base * scale * stances[at]! - changed;
      if (raise / base - minimum > 0) up.push({ at, gap: raise });
      if (-raise / base - minimum > 0) down.push({ at, gap: -raise });
    }
    rows.push({ name, base, changed, stances, backing: { up, down } });
  }
  return rows;
}

/**
 * Why a body's budget line was or was not moved: its members' positions and
 * how many back a raise or a cut against the majority a bill needs. For a
 * line that drew no bill, this is the recorded reason.
 */
export function lineBacking(
  api: CoreAPI,
  officeId: string,
): {
  readonly majority: number;
  readonly lines: readonly LinePosition[];
} {
  const filers = members(api, officeId).map((t) => filerOf(api, t));
  return {
    majority: Math.floor(filers.length / 2) + 1,
    lines: linePositions(api, bodyJurisdiction(api, officeId), filers),
  };
}

/**
 * The amendments members file to the lines of their own government's budget
 * in force: each member wants a line moved by their stance on it (at a full
 * stance, the budget-full-stance share of the line, the scale the budget vote
 * weighs) from where the year's budget started, and files for the gap between
 * that and what the laws have already changed; members wanting the same
 * direction join one bill, the most moved sponsoring it at their own size.
 * A gap under the amendment threshold is not worth the agenda time.
 * stopgapId: SG-LAWS-local-line-filing-threshold
 */
function fileLines(
  api: CoreAPI,
  governmentId: string,
  filers: readonly Filer[],
  barred: (question: string, direction: number) => boolean,
): Filed[] {
  const all: { filed: Filed; weight: number }[] = [];
  const majority = Math.floor(filers.length / 2) + 1;
  for (const row of linePositions(api, governmentId, filers)) {
    const question = `budget-line:${row.name}`;
    for (const direction of [1, -1] as const) {
      const backers = direction > 0 ? row.backing.up : row.backing.down;
      // A body brings a budget amendment to the floor only where its
      // sponsors can count a majority; a change without the votes is not
      // taken up (members do not spend a meeting's agenda, or a recorded
      // vote, on an amendment they know will fail).
      if (backers.length < majority) continue;
      // The most moved member sponsors; the bill asks for what the member who
      // makes the majority wants, not the most moved member's larger ask, so
      // the line settles where the body's median member stands and is not
      // pushed past it and back.
      let best = -Infinity;
      let sponsor: Filer | null = null;
      for (const { at, gap } of backers) {
        const member = filers[at]!;
        // The player backs it but never sponsors it without filing it.
        if (isControlled(api, member)) continue;
        const reason = gap / row.base;
        if (
          reason > best ||
          (reason === best && sponsor && member.key < sponsor.key)
        ) {
          best = reason;
          sponsor = member;
        }
      }
      const gaps = backers.map((b) => b.gap).sort((a, b) => b - a);
      const wanted = Math.round(gaps[majority - 1]! * direction);
      if (!sponsor || wanted === 0) continue;
      // A change the body just turned down is not filed again at once (read
      // only for a change that would be filed: the check scans the sessions).
      if (barred(question, direction)) continue;
      all.push({
        weight: backers.length * (Math.abs(wanted) / row.base),
        filed: {
          question,
          direction,
          sponsor,
          cosponsors: backers.length,
          leaderReason: 0,
          line: { name: row.name, deltaMinor: wanted, of: row.base },
        },
      });
    }
  }
  // A meeting's agenda takes up only so many budget amendments: the ones the
  // most members back, by the size of the change they want.
  all.sort(
    (a, b) =>
      b.weight - a.weight || a.filed.question.localeCompare(b.filed.question),
  );
  const taken = all.slice(
    0,
    Math.round(campaignParameter("localBudgetAmendmentsPerMeeting")),
  );
  if (taken.length) api.stopgap("SG-LAWS-local-line-filing-threshold");
  return taken.map((t) => t.filed);
}

/**
 * A sitting of the body: every member files the changes their own reasons
 * favor where the law in force differs (members wanting the same change join
 * one bill, the most moved member sponsoring it); the floor leader schedules
 * them by how many members back each, then by their own reasons; and the
 * floor takes up as many as its time allows (the sitting's floor days at the
 * floor's pace). Each bill reached goes through committee, every chamber
 * and the executive; a bill time runs out on dies at adjournment. Nothing
 * else limits how many bills there are: the count follows the members'
 * reasons, the law in force and the time.
 */
function holdSession(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly jurisdiction: string;
    readonly body: Body | null;
    /** Everyone who may file: every member of every chamber. */
    readonly filers: readonly TermRow[];
    readonly leader: TermRow | undefined;
    /** The floor days the sitting has. */
    readonly floorDays: number;
    /** How many bills a floor day takes up. */
    readonly billsPerFloorDay: number;
    readonly needsChange: (question: string, direction: number) => boolean;
    readonly allowed: (question: string, value: number) => boolean;
    /** A change the body turned down recently enough that its rules bar it again. */
    readonly barred: (question: string, direction: number) => boolean;
    /** The meeting these filings wait for: filed now, voted when it closes. */
    readonly holdFor?: string;
    readonly lines?: boolean;
  },
): void {
  const leaderKey = input.leader ? memberKey(input.leader) : null;
  const filed = fileChanges(api, input);
  const floorTime = Math.round(input.floorDays * input.billsPerFloorDay);
  const bills: SessionBill[] = [];
  const heldIds: string[] = [];
  filed.forEach((item, index) => {
    const drafted =
      item.drafted ??
      draftBill(api, {
        bodyOfficeId: input.body!.id,
        sponsorId: item.sponsor.key,
        provisions: item.line
          ? [
              {
                kind: "budget-line",
                line: item.line.name,
                value: item.line.deltaMinor,
                of: item.line.of,
              },
            ]
          : [
              {
                kind: "policy-question",
                question: item.question,
                value: item.direction,
              },
            ],
      });
    const reached = index < floorTime;
    // An earlier bill this sitting may have made this one's law already.
    const moot = reached && !input.holdFor ? mootAtFloor(api, drafted) : null;
    const bill = moot
      ? dieMoot(api, drafted, moot)
      : reached
        ? input.holdFor
          ? drafted
          : holdVote(api, drafted.id)
        : dieOnCalendar(api, drafted);
    if (reached && input.holdFor) heldIds.push(drafted.id);
    bills.push({
      number: bill.number,
      question: item.question,
      change: item.direction > 0 ? "enact" : "repeal",
      sponsor: item.sponsor.key,
      cosponsors: item.cosponsors,
      status: bill.status,
      fate: moot ? "moot" : reached ? "voted" : "not-reached",
      ...(moot ? { moot } : {}),
    });
  });
  if (input.holdFor && input.body)
    filedAgenda?.(api, input.body.id, input.holdFor, heldIds);
  api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("sessions")
    .put({
      id: input.key,
      stateKey: input.jurisdiction,
      bodyOfficeId: input.body?.id ?? null,
      date: api.state.date,
      leader: leaderKey,
      floorDays: input.floorDays,
      floorTime,
      bills,
    } as unknown as ModuleRow);
}

/** A bill the floor never reached: it dies when the sitting adjourns. */
function dieOnCalendar(api: CoreAPI, bill: BillRow): BillRow {
  if (bill.status !== "drafted") return bill;
  const died: BillRow = { ...bill, status: "failed" };
  api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .put(died as unknown as ModuleRow);
  return died;
}

/**
 * A filing's premise is that the law in force differs from what its sponsors
 * want. The floor reads that again on the day it takes the bill up, because
 * an act passed since (a bill of its own, or a section another bill carried)
 * may already have made it law or may cut across it. A bill whose every
 * section is settled that way is moot; one with a section still to change
 * goes to its vote.
 */
function mootAtFloor(
  api: CoreAPI,
  bill: BillRow,
): (SettledQuestion & { readonly question: string }) | null {
  if (
    !bill.provisions.length ||
    bill.provisions.some((p) => p.kind !== "policy-question" || !p.question)
  )
    return null;
  const jurisdiction = billJurisdiction(api, bill);
  const settled = bill.provisions.map((p) =>
    questionSettled(api, jurisdiction, p.question!, p.value),
  );
  return settled.every((s) => s !== null)
    ? { question: bill.provisions[0]!.question!, ...settled[0]! }
    : null;
}

/** A moot bill dies unvoted, with the law row it repeats or cuts across on its record. */
function dieMoot(
  api: CoreAPI,
  bill: BillRow,
  moot: NonNullable<BillRow["moot"]>,
): BillRow {
  const died: BillRow = { ...bill, status: "failed", moot };
  api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .put(died as unknown as ModuleRow);
  return died;
}

const senior = (members: readonly TermRow[]) =>
  [...members].sort(
    (a, b) =>
      (a.serviceStart ?? a.startDate).localeCompare(
        b.serviceStart ?? b.startDate,
      ) || a.id.localeCompare(b.id),
  )[0];

function onWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind === "session-open") openSession(api, work);
  if (work.kind === "bill-filing") introduceBill(api, work);
  if (work.kind === "floor-week") floorWeek(api, work);
  if (work.kind === "session-close") closeSession(api, work);
  if (work.kind === "local-meeting") localMeeting(api, work);
  if (work.kind === "outside-enact") outsideEnact(api, work);
}

// ---------------------------------------------------------------------------
// State legislatures and Congress sit through their sessions.

/**
 * When a body sits next, for a bill the player puts on its calendar: a town
 * body's next regular meeting; a legislature's or Congress's next floor week
 * in the session now sitting, or the first of its next session.
 */
function nextSitting(
  api: CoreAPI,
  bodyOfficeId: string,
  after?: string,
): Sitting | null {
  const today = api.state.date;
  // The sitting after a given day, for a town or county body that meets on its
  // own rule: a bill posted too late for the notice law waits for it.
  if (after !== undefined) {
    const held = api
      .moduleState(WORLD_LEGISLATING_MODULE_ID)
      .table("nextMeetings")
      .get(bodyOfficeId);
    const next = held
      ? nextMeeting(api, bodyOfficeId, after, lawChain(api).countyGeoids[0])
      : null;
    return next ? { date: next.date, source: next.rule.source } : null;
  }
  const meeting = api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("nextMeetings")
    .get(bodyOfficeId) as unknown as
    { date: string; source: Source } | undefined;
  if (meeting) return { date: meeting.date, source: meeting.source };
  const office = bodyOf(api, bodyOfficeId);
  if (!office) return null;
  const jurisdiction =
    office.kind.startsWith("us-house") || office.kind === "us-senate"
      ? "US"
      : office.jurisdiction;
  const committee = campaignParameter("sessionCommitteeDays");
  const sitting = legislativeSessionsOf(api).find(
    (r) =>
      r.jurisdiction === jurisdiction &&
      r.conveneAt <= today &&
      r.adjournAt > today,
  );
  if (sitting) {
    const date = nextFloorWeek(sitting, today);
    if (date < sitting.adjournAt)
      return {
        date,
        source: {
          tag: "ESTIMATED",
          citation: "the session's next floor week",
          asOf: today,
          estimatedFrom: sitting.id,
        },
      };
  }
  const w = nextWindow(jurisdiction, today, false);
  return w
    ? {
        date: plusDays(w.conveneAt, committee),
        source: {
          tag: w.tag,
          citation: w.source,
          asOf: today,
          ...(w.tag === "ESTIMATED" ? { estimatedFrom: w.source } : {}),
        },
      }
    : null;
}

/** One window a body sits, with where its dates come from. */
interface Window {
  readonly conveneAt: string;
  readonly adjournAt: string;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly source: string;
}

const CONGRESS = (
  congressSessions as unknown as {
    years: Record<
      string,
      {
        conveneAt: string;
        adjournAt: string;
        tag: "SOURCED" | "ESTIMATED";
        source: string;
      }
    >;
  }
).years;
const CONGRESS_YEARS = Object.keys(CONGRESS).map(Number).sort();

/** A body's session windows in a year: Congress from its table, a state from the session calendar. */
export function windowsIn(
  jurisdiction: string,
  year: number,
): readonly Window[] {
  if (jurisdiction === "US") {
    const row = CONGRESS[String(year)];
    if (row) return [row];
    // Past the table: the latest year's month and day, an estimate.
    const last = CONGRESS[String(CONGRESS_YEARS[CONGRESS_YEARS.length - 1])]!;
    return [
      {
        conveneAt: `${year}${last.conveneAt.slice(4)}`,
        adjournAt: `${year}${last.adjournAt.slice(4)}`,
        tag: "ESTIMATED",
        source: last.source,
      },
    ];
  }
  const row = sessionYear(jurisdiction, year);
  if (!row?.meets) return [];
  return row.windows.map((w) => ({
    conveneAt: w.conveneAt,
    // A legislature that sits the whole year adjourns at its end.
    adjournAt: /^\d{4}-\d{2}-\d{2}$/.test(w.adjournAt)
      ? w.adjournAt
      : `${year}-12-31`,
    tag: row.tag,
    source: row.sourceUrl ?? "state legislative session calendar table",
  }));
}

/** The body's first session window still to sit after a day (or, at the opening, one already sitting). */
function nextWindow(
  jurisdiction: string,
  after: string,
  includeSitting: boolean,
): Window | null {
  const year = Number(after.slice(0, 4));
  for (let y = year - 1; y <= year + 3; y += 1)
    for (const w of [...windowsIn(jurisdiction, y)].sort((a, b) =>
      a.conveneAt.localeCompare(b.conveneAt),
    ))
      if (
        w.adjournAt > after &&
        (w.conveneAt > after || (includeSitting && w.conveneAt <= after))
      )
        return w;
  return null;
}

function scheduleOpening(
  api: CoreAPI,
  jurisdiction: string,
  after: string,
  includeSitting: boolean,
): void {
  const w = nextWindow(jurisdiction, after, includeSitting);
  if (!w) return;
  // A session already sitting when the world opens takes up its work the next day.
  const date =
    w.conveneAt > api.state.date ? w.conveneAt : plusDays(api.state.date, 1);
  api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
    key: `session-open:${jurisdiction}:${w.conveneAt}`,
    date,
    kind: "session-open",
    source: {
      tag: w.tag,
      citation: w.source,
      asOf: api.state.date,
      ...(w.tag === "ESTIMATED" ? { estimatedFrom: w.source } : {}),
    },
    sourceRecordIds: [jurisdiction, w.conveneAt, w.adjournAt],
  });
}

const DAY = 86_400_000;
const plusDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + Math.round(days) * DAY)
    .toISOString()
    .slice(0, 10);
/** A change filed for the session, the day it is introduced, and its bill once it is. */
interface Filing {
  readonly question: string;
  readonly direction: number;
  readonly sponsor: string;
  readonly cosponsors: number;
  readonly introduceOn: string;
  readonly billId: string | null;
}

/** A legislature's session: its dates, its floor leader's calendar and every bill it took up. */
export interface LegislativeSession {
  readonly id: string;
  readonly jurisdiction: string;
  readonly bodyOfficeId: string | null;
  readonly conveneAt: string;
  readonly adjournAt: string;
  readonly leader: string | null;
  /** Bills the floor takes up in a week of sitting. */
  readonly perWeek: number;
  /** The floor's first week; it sits every seven days from it until adjournment. */
  readonly firstFloor: string;
  readonly filings: readonly Filing[];
  readonly bills: readonly (SessionBill & { readonly decidedOn: string })[];
}

const sessionTable = (api: CoreAPI) =>
  api.moduleState(WORLD_LEGISLATING_MODULE_ID).table("legislativeSessions");

export function legislativeSessionsOf(
  api: CoreAPI,
): readonly LegislativeSession[] {
  // The floor readers are registered once for the process; a world that did
  // not install this engine has no sessions.
  if (!api.state.modules.has(WORLD_LEGISLATING_MODULE_ID)) return [];
  return sessionTable(api).rows() as unknown as LegislativeSession[];
}

/**
 * The session convenes: every member files the changes their own reasons
 * favor where the law in force differs (the executive brings what no member
 * files), and the floor leader orders them. Each bill is introduced in its
 * sponsor's own chamber over the session's filing period, the leader's first
 * choices first; the floor sits each week from the end of committee time to
 * adjournment.
 */
function openSession(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const [jurisdiction, conveneAt, adjournAt] = work.sourceRecordIds as [
    string,
    string,
    string,
  ];
  // A session opened already (a sitting one, at the world's opening) is not opened again by its
  // calendar entry the next day.
  if (sessionTable(api).get(`session:${jurisdiction}:${conveneAt}`)) return;
  // Another government's session is simulated from its people and keeps only
  // its results (owner, Nov 5: "generate on demand").
  if (jurisdiction !== "US" && !reachesTown(api, jurisdiction)) {
    openOutsideSession(api, work);
    return;
  }
  const federal = jurisdiction === "US";
  const lower = federal
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
  const filers = federal
    ? [...members(api, FEDERAL_HOUSE), ...members(api, FEDERAL_SENATE)]
    : ["legislature-lower", "legislature-upper", "legislature-unicameral"]
        .map((kind) => chamber(api, jurisdiction, kind))
        .flatMap((c) => c?.members ?? []);
  // stopgapId: SG-GOV-federal-proposal-coverage
  // Federal-only questions still need stances, opening answers and effect readers.
  if (federal) api.stopgap("SG-GOV-federal-proposal-coverage");
  const filed = lower
    ? fileChanges(api, {
        key: work.key,
        jurisdiction,
        body: lower,
        filers,
        leader,
        floorDays: 0,
        billsPerFloorDay: 0,
        needsChange: (question, direction) =>
          needsChange(direction, answerIn(api, jurisdiction, question, true)),
        // A legislature answers only the questions its level may (data).
        allowed: (question, value) =>
          levelMayDecide(
            api,
            federal ? "federal" : "state",
            question,
            value,
            federal ? undefined : jurisdiction,
          ),
        // A new session takes every bill up afresh.
        barred: () => false,
      })
    : [];
  const today = api.state.date;
  const length = Math.max(1, daysBetween(today, adjournAt));
  // A session already sitting spreads its filings from the day it convened, so the bills filed
  // in its first weeks are already on the record when the world opens, dated as they were filed.
  const start = conveneAt < today ? conveneAt : today;
  const period =
    campaignParameter("sessionFilingShare") *
    Math.max(1, daysBetween(start, adjournAt));
  const filings: Filing[] = filed.map((item, i) => ({
    question: item.question,
    direction: item.direction,
    sponsor: item.sponsor.key,
    cosponsors: item.cosponsors,
    introduceOn: item.drafted
      ? today
      : plusDays(start, (i * period) / Math.max(1, filed.length)),
    billId: item.drafted?.id ?? null,
  }));
  const weeks = Math.max(1, length / 7);
  const perWeek = Math.max(
    1,
    Math.round(
      (federal
        ? campaignParameter("congressFloorDaysPerYear") / weeks
        : campaignParameter("legislativeDaysPerWeek")) *
        campaignParameter("floorBillsPerLegislativeDay"),
    ),
  );
  const id = `session:${jurisdiction}:${conveneAt}`;
  const firstFloor = plusDays(today, campaignParameter("sessionCommitteeDays"));
  const row: LegislativeSession = {
    id,
    jurisdiction,
    bodyOfficeId: lower?.id ?? null,
    conveneAt,
    adjournAt,
    leader: leader ? memberKey(leader) : null,
    perWeek,
    firstFloor,
    filings,
    bills: [],
  };
  sessionTable(api).put(row as unknown as ModuleRow);
  const calendar = api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID);
  const source = {
    tag: "ESTIMATED" as const,
    citation: "the session's own calendar",
    asOf: today,
    estimatedFrom: work.key,
  };
  filings.forEach((f, i) => {
    if (f.billId) return;
    if (f.introduceOn <= today) introduce(api, id, i);
    else
      calendar.schedule({
        key: `bill-filing:${id}:${i}`,
        date: f.introduceOn,
        kind: "bill-filing",
        source,
        sourceRecordIds: [id, String(i)],
      });
  });
  if (firstFloor < adjournAt)
    calendar.schedule({
      key: `floor-week:${id}:${firstFloor}`,
      date: firstFloor,
      kind: "floor-week",
      source,
      sourceRecordIds: [id],
    });
  calendar.schedule({
    key: `session-close:${id}`,
    date: adjournAt,
    kind: "session-close",
    source: { ...work.source, asOf: today },
    sourceRecordIds: [id],
  });
}

/**
 * Another government's session (a state the player is not in): its members'
 * and executive's own views decide what passes, from the people there. A
 * change carries when every chamber has more members for it than against it
 * and the executive agrees (or both chambers hold two thirds, which
 * overrides). Nothing is filed, drafted or voted per member and no event is
 * written; each result is one law row, put on a day inside the session, with
 * its counts. The roll call is built when someone asks for it
 * (`rollCallOf`). stopgapId: SG-GOV-outside-session-result-only
 */
function openOutsideSession(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  api.stopgap("SG-GOV-outside-session-result-only");
  const [jurisdiction, conveneAt, adjournAt] = work.sourceRecordIds as [
    string,
    string,
    string,
  ];
  const today = api.state.date;
  const bodies = [
    "legislature-lower",
    "legislature-upper",
    "legislature-unicameral",
  ]
    .map((kind) => chamber(api, jurisdiction, kind))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .filter((c) => c.members.length > 0);
  const id = `session:${jurisdiction}:${conveneAt}`;
  const lower = bodies[0];
  const governor = lower ? executiveOf(api, lower.id).term : undefined;
  const governorKey = governor ? memberKey(governor) : "";
  const keys = bodies.map((b) => b.members.map(memberKey));
  interface Result {
    readonly question: string;
    readonly direction: number;
    readonly counts: readonly { yes: number; no: number }[];
    readonly margin: number;
    readonly decision: "signed" | "overridden";
  }
  const results: Result[] = [];
  // What the session takes up: the questions what moved in the state since its
  // last session carried onto the agenda (sessionAgenda), never every one.
  const agenda = sessionAgenda(api, jurisdiction, keys.flat());
  for (const question of PLATFORM_QUESTIONS) {
    if (!agenda.has(question)) continue;
    let best: Result | null = null;
    for (const direction of [1, -1]) {
      if (!needsChange(direction, answerIn(api, jurisdiction, question, true)))
        continue;
      if (!levelMayDecide(api, "state", question, direction, jurisdiction))
        continue;
      const counts = keys.map((chamberKeys) => {
        let yes = 0;
        let no = 0;
        for (const key of chamberKeys) {
          const lean = (officialStance(api, key, question) ?? 0) * direction;
          if (lean > 0) yes += 1;
          else if (lean < 0) no += 1;
        }
        return { yes, no };
      });
      if (!counts.length || !counts.every((c) => c.yes > c.no)) continue;
      const governorFor = governorKey
        ? (officialStance(api, governorKey, question) ?? 0) * direction > 0
        : true;
      const overrides = counts.every(
        (c, i) => c.yes * 3 >= keys[i]!.length * 2,
      );
      if (!governorFor && !overrides) continue;
      const margin = Math.min(
        ...counts.map((c, i) => (c.yes - c.no) / keys[i]!.length),
      );
      if (!best || margin > best.margin)
        best = {
          question,
          direction,
          counts,
          margin,
          decision: governorFor ? "signed" : "overridden",
        };
    }
    if (best) results.push(best);
  }
  results.sort(
    (a, b) => b.margin - a.margin || a.question.localeCompare(b.question),
  );
  const start = conveneAt > today ? conveneAt : today;
  const length = Math.max(1, daysBetween(start, adjournAt));
  const calendar = api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID);
  const source = {
    tag: "ESTIMATED" as const,
    citation: "the session's own calendar",
    asOf: today,
    estimatedFrom: work.key,
  };
  results.forEach((r, i) => {
    calendar.schedule({
      key: `outside-enact:${id}:${i}`,
      // Never today: the day's work is already done.
      date: plusDays(
        start,
        Math.max(1, Math.floor((length * (i + 1)) / (results.length + 1))),
      ),
      kind: "outside-enact",
      source,
      sourceRecordIds: [
        id,
        jurisdiction,
        r.question,
        String(r.direction),
        r.counts.map((c) => `${c.yes}-${c.no}`).join("/"),
        bodies.map((b) => b.id).join(","),
        r.decision,
        String(i + 1),
        String(r.margin),
        // What carried the question onto the agenda, kept on the law row.
        JSON.stringify(agenda.get(r.question) ?? null),
        // The governor's key is the last record, left out when no one holds the office.
        ...(governorKey ? [governorKey] : []),
      ],
    });
  });
  sessionTable(api).put({
    id,
    jurisdiction,
    bodyOfficeId: lower?.id ?? null,
    conveneAt,
    adjournAt,
    leader: null,
    perWeek: 0,
    // Nothing is taken up bill by bill: no floor week is ever reached.
    firstFloor: adjournAt,
    filings: [],
    bills: [],
  } as unknown as ModuleRow);
  calendar.schedule({
    key: `session-close:${id}`,
    // A one-day session closes tomorrow: today's work is done.
    date: adjournAt > today ? adjournAt : plusDays(today, 1),
    kind: "session-close",
    source: { ...work.source, asOf: today },
    sourceRecordIds: [id],
  });
}

const AGENDA = agendaData as unknown as {
  figures: Readonly<Record<string, { fullChange: number }>>;
  weights: {
    byArea: Readonly<Record<string, Readonly<Record<string, number>>>>;
  };
  newMembers: { weight: number };
  openingYear: { value: number };
};

/** One state's agenda: its pull toward each question, and what it stood at when its last session opened. */
interface AgendaRow {
  readonly id: string;
  readonly pulls: Readonly<Record<string, number>>;
  /** The state's figures at its last session (null before its first). */
  readonly figures: Readonly<Record<string, number>> | null;
  /** Its members at its last session. */
  readonly members: readonly string[];
}

/** What moved a question onto a session's agenda: each figure's move and the new members' share. */
interface AgendaCause {
  readonly moved: Readonly<Record<string, number>>;
  readonly newMembers: number;
  readonly agendaId: string;
  /** The state's first session in the world: the year before the opening carried it. */
  readonly opening: boolean;
}

/** A state's figures today from the country tier: people out of work, prices, pay, and revenue against budget. */
function stateFigures(
  api: CoreAPI,
  jurisdiction: string,
): Record<string, number> | null {
  if (!api.state.modules.has("macro")) return null;
  const state = countryStates(api).find((row) => row.key === jurisdiction);
  const now = state ? countryStateNow(api, state.fips) : undefined;
  if (!state || !now) return null;
  const months = state.ledger.revenueMonths;
  const revenueYear = months.length
    ? (months.reduce((a, b) => a + b, 0) / months.length) *
      api.parameter("monthsPerYear")
    : state.ledger.budgetYear;
  return {
    unemploymentPct: now.now.unemploymentPct,
    prices: now.now.prices,
    hourlyPay: now.now.hourlyPay,
    budgetGap:
      state.ledger.budgetYear > 0 ? revenueYear / state.ledger.budgetYear : 1,
  };
}

/**
 * What a state's session takes up: each question whose pull reaches one
 * whole once this session's moves are added (outside-agenda.json). The pull
 * grows by how far the state's own figures moved since its last session,
 * weighed by the question's area, and by the share of its members who are
 * new; the opening's place along each pull is the world's seeded line. The
 * row is written back with the taken-up questions' pulls less one.
 */
function sessionAgenda(
  api: CoreAPI,
  jurisdiction: string,
  members: readonly string[],
): Map<string, AgendaCause> {
  const table = api.moduleState(WORLD_LEGISLATING_MODULE_ID).table("agendas");
  const id = `agenda:${jurisdiction}`;
  const kept = table.get(id) as unknown as AgendaRow | undefined;
  const figures = stateFigures(api, jurisdiction);
  // How far each figure moved since the last session, against its full change.
  const moved: Record<string, number> = {};
  if (kept?.figures && figures)
    for (const [key, row] of Object.entries(AGENDA.figures)) {
      const then = kept.figures[key];
      const now = figures[key];
      if (then === undefined || now === undefined) continue;
      const change =
        key === "unemploymentPct"
          ? now - then
          : then !== 0
            ? now / then - 1
            : 0;
      moved[key] = Math.abs(change) / row.fullChange;
    }
  const before = new Set(kept?.members ?? members);
  const newMembers = members.length
    ? members.filter((key) => !before.has(key)).length / members.length
    : 0;
  const pulls: Record<string, number> = {};
  const taken = new Map<string, AgendaCause>();
  for (const question of PLATFORM_QUESTIONS) {
    const area = question.slice(question.indexOf(":") + 1).split(".")[0] ?? "";
    const weights = AGENDA.weights.byArea[area] ?? {};
    // Before its first session a pull stands at the world's seeded place along
    // one whole and the year before the opening (openingYear).
    let pull =
      kept?.pulls[question] ??
      seededUnit(api.state.seed, `outside-agenda:${jurisdiction}:${question}`) *
        (1 + AGENDA.openingYear.value);
    for (const [key, size] of Object.entries(moved))
      pull += size * (weights[key] ?? 0);
    pull += newMembers * AGENDA.newMembers.weight;
    if (pull >= 1) {
      taken.set(question, {
        moved: Object.fromEntries(
          Object.entries(moved).filter(([key]) => (weights[key] ?? 0) > 0),
        ),
        newMembers,
        agendaId: id,
        opening: !kept,
      });
      pull -= 1;
    }
    pulls[question] = pull;
  }
  table.put({
    id,
    pulls,
    figures,
    members: [...members],
  } as unknown as ModuleRow);
  return taken;
}

/** The day an outside result passes: the law row, with its counts, and nothing else. */
function outsideEnact(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const [
    sessionId,
    jurisdiction,
    question,
    directionText,
    counts,
    bodyIds,
    decision,
    nth,
    margin,
    agendaCause,
    governorKey,
  ] = work.sourceRecordIds as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string | undefined,
  ];
  const cause = JSON.parse(agendaCause ?? "null") as AgendaCause | null;
  const direction = Number(directionText);
  // The law may have changed since the session opened: then nothing passes.
  if (!needsChange(direction, answerIn(api, jurisdiction, question, true)))
    return;
  const today = api.state.date;
  const rule = stateActEffectiveDate(jurisdiction, today, today);
  if (!rule)
    throw new Error(
      `No effective-date rule for ${jurisdiction} acts (state-effective-dates.json).`,
    );
  const conveneAt = sessionId.slice(sessionId.lastIndexOf(":") + 1);
  enactLaw(api, {
    jurisdiction,
    level: "state",
    series: question,
    value: direction > 0 ? 1 : 0,
    effectiveDate: rule.date,
    measureId: `${conveneAt.slice(0, 4)}-${nth}`,
    citation: `${jurisdiction} legislature, session of ${conveneAt} (effective by ${rule.cite})`,
    terms: {
      session: sessionId,
      chambers: counts,
      bodies: bodyIds,
      direction,
      margin: Number(margin),
      ...(governorKey ? { decidedBy: governorKey } : {}),
      decision,
      // Why this session took it up: the state's figures that moved since its
      // last session (each against its full change) and its new members' share.
      ...(cause
        ? {
            agenda: cause.agendaId,
            moved: Object.entries(cause.moved)
              .map(([key, size]) => `${key}:${size.toFixed(3)}`)
              .join(","),
            newMembers: Number(cause.newMembers.toFixed(3)),
            ...(cause.opening
              ? { carried: "the year before the opening" }
              : {}),
          }
        : {}),
    },
  });
}

/**
 * The roll call of an outside government's law, built when it is asked for
 * and kept once seen: each chamber's members ranked by how much they favor the
 * change, the first `yes` of them voting yes and the last `no` voting no, so
 * the list adds up to the count the law row kept, and the sponsor is the
 * member who favored it most. The same every time.
 */
export function rollCallOf(
  api: CoreAPI,
  lawId: string,
  chamberIndex: number,
): {
  readonly chamber: string;
  readonly yes: readonly string[];
  readonly no: readonly string[];
  readonly sponsor: string | null;
} | null {
  const cache = api.moduleState(WORLD_LEGISLATING_MODULE_ID).table("rollCalls");
  const id = `${lawId}|${chamberIndex}`;
  const seen = cache.get(id) as unknown as
    | {
        chamber: string;
        yes: readonly string[];
        no: readonly string[];
        sponsor: string | null;
      }
    | undefined;
  if (seen) return seen;
  const row = api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as
    LawRowInput | undefined;
  const terms = row?.terms;
  if (!row || typeof terms?.session !== "string") return null;
  const count = String(terms.chambers ?? "").split("/")[chamberIndex];
  const chamberId = String(terms.bodies ?? "").split(",")[chamberIndex];
  if (!count || !chamberId) return null;
  const [yesCount, noCount] = count.split("-").map(Number) as [number, number];
  const direction = Number(terms.direction) || 1;
  const ranked = members(api, chamberId)
    .map((term) => {
      const key = memberKey(term);
      return {
        key,
        lean: (officialStance(api, key, row.series) ?? 0) * direction,
      };
    })
    .sort((a, b) => b.lean - a.lean || a.key.localeCompare(b.key));
  const yes = ranked.slice(0, yesCount).map((m) => m.key);
  const no = ranked
    .slice(Math.max(yesCount, ranked.length - noCount))
    .map((m) => m.key);
  const built = { id, chamber: chamberId, yes, no, sponsor: yes[0] ?? null };
  cache.put(built as unknown as ModuleRow);
  return built;
}

function introduceBill(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  introduce(api, work.sourceRecordIds[0]!, Number(work.sourceRecordIds[1]));
}

/** A filed change becomes a bill in its sponsor's own chamber. */
function introduce(api: CoreAPI, sessionId: string, index: number): void {
  const row = sessionTable(api).get(sessionId) as unknown as
    LegislativeSession | undefined;
  const filing = row?.filings[index];
  if (!row || !filing || filing.billId) return;
  const bodyOfficeId = originChamber(api, row, filing.sponsor);
  if (!bodyOfficeId) return;
  const bill = draftBill(api, {
    bodyOfficeId,
    sponsorId: filing.sponsor,
    provisions: [
      {
        kind: "policy-question",
        question: filing.question,
        value: filing.direction,
      },
    ],
  });
  // A bill filed before the world opened is dated the day it was filed.
  if (filing.introduceOn < api.state.date)
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .put({
        ...bill,
        introduced: filing.introduceOn,
      } as unknown as ModuleRow);
  sessionTable(api).put({
    ...row,
    filings: row.filings.map((f, i) =>
      i === index ? { ...f, billId: bill.id } : f,
    ),
  } as unknown as ModuleRow);
  billIntroduced?.(api, bill.id);
}

/** The chamber a member sits in: a state member's own office, a member of Congress's House or Senate. */
function originChamber(
  api: CoreAPI,
  row: LegislativeSession,
  sponsor: string,
): string | null {
  if (row.jurisdiction === "US") {
    const senator = members(api, FEDERAL_SENATE).some(
      (t) => memberKey(t) === sponsor,
    );
    return senator ? FEDERAL_SENATE : FEDERAL_HOUSE;
  }
  for (const kind of [
    "legislature-lower",
    "legislature-upper",
    "legislature-unicameral",
  ]) {
    const c = chamber(api, row.jurisdiction, kind);
    if (c?.members.some((t) => memberKey(t) === sponsor)) return c.id;
  }
  return row.bodyOfficeId;
}

/** The chambers a session sits for: Congress's two, or the state's. */
function sessionChambers(
  api: CoreAPI,
  row: Pick<LegislativeSession, "jurisdiction">,
): ReadonlySet<string> {
  return new Set(
    row.jurisdiction === "US"
      ? [FEDERAL_HOUSE, FEDERAL_SENATE]
      : ["legislature-lower", "legislature-upper", "legislature-unicameral"]
          .map((kind) => chamber(api, row.jurisdiction, kind)?.id)
          .filter((id): id is string => id !== undefined),
  );
}

/**
 * The bills in one of a session's chambers that its filings do not carry:
 * the player's own, and any drafted during the sitting or before it by
 * another path. A bill whose vote is already set (`scheduleVote`, as a floor
 * leader grants it) keeps that date and is not among them.
 */
function chamberBills(
  api: CoreAPI,
  row: LegislativeSession,
): readonly BillRow[] {
  const chambers = sessionChambers(api, row);
  const filed = new Set(
    row.filings.flatMap((f) => (f.billId ? [f.billId] : [])),
  );
  const calendar = api.moduleCalendar(LEGISLATURE_MODULE_ID);
  return (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter(
      (b) =>
        chambers.has(b.bodyOfficeId) &&
        !filed.has(b.id) &&
        !calendar.get(`meeting:${b.id}`),
    )
    .sort(
      (a, b) =>
        a.introduced.localeCompare(b.introduced) || a.id.localeCompare(b.id),
    );
}

/** What a session's record says of a bill it took up outside its filings. */
function sessionBillOf(
  drafted: BillRow,
): Pick<SessionBill, "question" | "change" | "sponsor" | "cosponsors"> {
  const p = drafted.provisions[0];
  return {
    question: p?.question ?? p?.series ?? p?.line ?? p?.kind ?? "bill",
    change:
      p && p.value <= 0 && p.kind === "policy-question" ? "repeal" : "enact",
    sponsor: drafted.sponsorId,
    cosponsors: 1,
  };
}

/**
 * Whether the chamber's leader refused the sponsor's request to put a bill on
 * the floor and has not since granted it. The office day that keeps the
 * leader's answers registers it (office-day-state `askLeaderForHearing`).
 */
let leaderRefused: ((api: CoreAPI, billId: string) => boolean) | undefined;
export function registerLeaderRefusalReader(
  reader: (api: CoreAPI, billId: string) => boolean,
): void {
  leaderRefused = reader;
}
const refusedByLeader = (api: CoreAPI, billId: string): boolean =>
  leaderRefused?.(api, billId) ?? false;

/** A bill waiting on a session's floor, with the filing that brought it if any. */
interface Queued {
  /** Empty for a filing not yet introduced. */
  readonly id: string;
  readonly introduced: string;
  readonly filing: Filing | null;
}

/**
 * The bills waiting on a session's floor, in the leader's order: the
 * filings (one not yet introduced comes in on its filing day), then the
 * chamber's other bills, oldest first.
 */
function floorQueue(api: CoreAPI, row: LegislativeSession): readonly Queued[] {
  const table = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
  const decided = new Set(row.bills.map((b) => b.number));
  // A bill whose sponsor asked the chamber's leader for the floor and was
  // refused stays off the leader's order until the answer turns
  // (office-day-state `askLeaderForHearing`).
  const waiting = (b: BillRow | undefined): b is BillRow =>
    !!b &&
    b.status === "drafted" &&
    !decided.has(b.number) &&
    !refusedByLeader(api, b.id);
  const today = api.state.date;
  return [
    ...row.filings.flatMap((filing): Queued[] => {
      if (!filing.billId)
        return filing.introduceOn > today
          ? [{ id: "", introduced: filing.introduceOn, filing }]
          : [];
      const b = table.get(filing.billId) as unknown as BillRow | undefined;
      return waiting(b) ? [{ id: b.id, introduced: b.introduced, filing }] : [];
    }),
    ...chamberBills(api, row)
      .filter(waiting)
      .map((b) => ({ id: b.id, introduced: b.introduced, filing: null })),
  ];
}

/**
 * The floor's weeks from `first` to adjournment, each with the bills it
 * takes up: as many as the week allows, each once committee has had it, in
 * the leader's order. The floor week votes the first of them; the floor
 * date and the agenda the members read ahead come from the same weeks.
 */
function* floorWeeks(
  api: CoreAPI,
  row: LegislativeSession,
  first: string,
): Generator<{ readonly date: string; readonly taken: readonly Queued[] }> {
  const committee = campaignParameter("sessionCommitteeDays");
  const queue = floorQueue(api, row);
  const done = new Set<number>();
  for (let date = first; date < row.adjournAt; date = plusDays(date, 7)) {
    const ready = plusDays(date, -committee);
    const taken: Queued[] = [];
    for (const [i, q] of queue.entries()) {
      if (taken.length >= row.perWeek) break;
      if (done.has(i) || q.introduced > ready) continue;
      done.add(i);
      taken.push(q);
    }
    yield { date, taken };
  }
}

/**
 * A week the floor sits: it takes up, in the leader's order, the bills
 * introduced long enough ago for committee to have had them, as many as its
 * days allow; each goes through committee, every chamber and the executive.
 */
function floorWeek(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const id = work.sourceRecordIds[0]!;
  const row = sessionTable(api).get(id) as unknown as
    LegislativeSession | undefined;
  if (!row) return;
  const today = api.state.date;
  const table = api.moduleState(LEGISLATURE_MODULE_ID).table("bills");
  const bills = [...row.bills];
  const week = floorWeeks(api, row, today).next();
  for (const q of week.done ? [] : week.value.taken) {
    const drafted = table.get(q.id) as unknown as BillRow | undefined;
    if (!drafted) continue;
    // A member's filing is read against the law as it stands on the floor day.
    const moot = q.filing ? mootAtFloor(api, drafted) : null;
    const bill = moot ? dieMoot(api, drafted, moot) : holdVote(api, drafted.id);
    bills.push({
      number: bill.number,
      ...(q.filing
        ? {
            question: q.filing.question,
            change: q.filing.direction > 0 ? "enact" : "repeal",
            sponsor: q.filing.sponsor,
            cosponsors: q.filing.cosponsors,
          }
        : sessionBillOf(drafted)),
      status: bill.status,
      fate: moot ? "moot" : "voted",
      ...(moot ? { moot } : {}),
      decidedOn: today,
    });
  }
  sessionTable(api).put({ ...row, bills } as unknown as ModuleRow);
  const next = plusDays(today, 7);
  if (next < row.adjournAt)
    api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
      key: `floor-week:${id}:${next}`,
      date: next,
      kind: "floor-week",
      source: { ...work.source, asOf: today },
      sourceRecordIds: [id],
    });
}

/** The session's first floor week after a day: weekly from the end of committee time after it opened. */
function nextFloorWeek(
  row: Pick<LegislativeSession, "firstFloor">,
  after: string,
): string {
  const weeks = Math.max(
    0,
    Math.ceil((daysBetween(row.firstFloor, after) + 1) / 7),
  );
  return plusDays(row.firstFloor, weeks * 7);
}

/** The legislature now sitting for a bill's chamber, if one is. */
function sittingFor(
  api: CoreAPI,
  bodyOfficeId: string,
): LegislativeSession | undefined {
  const today = api.state.date;
  return legislativeSessionsOf(api).find(
    (r) =>
      r.conveneAt <= today &&
      r.adjournAt > today &&
      sessionChambers(api, r).has(bodyOfficeId),
  );
}

/**
 * The floor week a drafted bill is on the floor leader's calendar for, in
 * the legislature now sitting: a vote already set keeps its date, and
 * otherwise it is the week `floorWeeks` takes it up. Null when the bill is
 * not before a sitting legislature, or the session ends before the floor
 * reaches it.
 */
export function floorDateOf(api: CoreAPI, billId: string): string | null {
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  if (!bill || bill.status !== "drafted") return null;
  const set = api
    .moduleCalendar(LEGISLATURE_MODULE_ID)
    .get(`meeting:${billId}`);
  if (set) return set.date;
  const row = sittingFor(api, bill.bodyOfficeId);
  if (!row) return null;
  for (const week of floorWeeks(api, row, nextFloorWeek(row, api.state.date)))
    if (week.taken.some((q) => q.id === billId)) return week.date;
  return null;
}

/**
 * The bills the sitting legislatures' floors take up on a day ahead, which
 * the members read before the vote (the floor's agenda, the whip's ask, the
 * player's stop on the eve of a vote).
 */
function weeklyFloorOn(api: CoreAPI, date: string): readonly string[] {
  const today = api.state.date;
  if (date <= today) return [];
  return legislativeSessionsOf(api)
    .filter(
      (r) =>
        r.conveneAt <= today &&
        r.adjournAt > date &&
        date >= r.firstFloor &&
        daysBetween(r.firstFloor, date) % 7 === 0,
    )
    .flatMap((row) => {
      for (const week of floorWeeks(api, row, nextFloorWeek(row, today))) {
        if (week.date > date) break;
        if (week.date === date)
          return week.taken.flatMap((q) => (q.id ? [q.id] : []));
      }
      return [];
    });
}

/** Adjournment: a bill the floor never reached dies; the body's next session goes on the calendar. */
function closeSession(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const id = work.sourceRecordIds[0]!;
  const row = sessionTable(api).get(id) as unknown as
    LegislativeSession | undefined;
  if (!row) return;
  const decided = new Set(row.bills.map((b) => b.number));
  const bills = [...row.bills];
  for (const f of row.filings) {
    if (!f.billId) continue;
    const drafted = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .get(f.billId) as unknown as BillRow | undefined;
    if (!drafted || decided.has(drafted.number)) continue;
    // Never reached, or held for want of the power to pass it: it dies.
    if (drafted.status !== "drafted" && drafted.status !== "blocked") continue;
    const dead = dieOnCalendar(api, drafted);
    bills.push({
      number: dead.number,
      question: f.question,
      change: f.direction > 0 ? "enact" : "repeal",
      sponsor: f.sponsor,
      cosponsors: f.cosponsors,
      status: dead.status,
      fate: "not-reached",
      decidedOn: api.state.date,
    });
  }
  for (const drafted of chamberBills(api, row)) {
    if (decided.has(drafted.number)) continue;
    if (drafted.status !== "drafted" && drafted.status !== "blocked") continue;
    const dead = dieOnCalendar(api, drafted);
    bills.push({
      number: dead.number,
      ...sessionBillOf(drafted),
      status: dead.status,
      fate: "not-reached",
      decidedOn: api.state.date,
    });
  }
  sessionTable(api).put({ ...row, bills } as unknown as ModuleRow);
  scheduleOpening(api, row.jurisdiction, row.adjournAt, false);
}

/**
 * A town council or county board's regular meeting: its members file the
 * local policies they want that aren't law for the town at any level, or
 * local ones they want gone, within what the state lets its places do, and
 * the presiding member's agenda takes up what the meeting's time allows.
 */
function localMeeting(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const officeId = work.sourceRecordIds[0]!;
  const meetingDate = work.sourceRecordIds[1] ?? api.state.date;
  // On the eve, a body nobody the player plays sits on files on the day.
  if (meetingDate > api.state.date && !meetingHold?.(api, officeId)) {
    api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
      key: `${work.key}:day`,
      date: makeIsoDate(meetingDate),
      kind: "local-meeting",
      source: work.source,
      sourceRecordIds: [officeId, meetingDate],
    });
    return;
  }
  scheduleMeeting(api, officeId, meetingDate);
  // Held for the player from the moment they take the seat, the meeting day
  // itself included: a meeting still on the books takes its filings onto the
  // agenda (and may stop the player) instead of voting them at once.
  const hold = meetingDate >= api.state.date && !!meetingHold?.(api, officeId);
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
    .get(officeId) as unknown as
    { kind: string; level: OfficeLevel } | undefined;
  // Each body legislates for its own government: a county board for its
  // county, a township board for its township, a council for its place.
  const jurisdiction = bodyJurisdiction(api, officeId);
  holdSession(api, {
    key: work.key,
    jurisdiction,
    body,
    filers: body.members,
    leader,
    ...(hold ? { holdFor: meetingDate } : {}),
    lines: true,
    // One regular meeting: its agenda time at a policy ordinance's hearing
    // and debate.
    floorDays: 1,
    billsPerFloorDay: Math.floor(
      campaignParameter("localMeetingAgendaMinutes") /
        campaignParameter("policyOrdinanceMinutes"),
    ),
    needsChange: (question, direction) =>
      direction > 0
        ? !inForceForTown(api, question)
        : ownRow(api, jurisdiction, question) === 1,
    allowed: (question, value) =>
      levelMayDecide(api, office?.level ?? "city", question, value),
    barred: (question, direction) =>
      recentlyDefeated(api, officeId, question, direction),
  });
}

/** The body's bills by number, as they stand now. */
function liveBills(api: CoreAPI, officeId: string): Map<string, BillRow> {
  return new Map(
    (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[]
    )
      .filter((bill) => bill.bodyOfficeId === officeId)
      .map((bill) => [bill.number, bill] as const),
  );
}

/**
 * Whether the body turned this change down within the wait its rules set
 * before a defeated measure comes back (`defeatedMeasureWaitDays`).
 */
function recentlyDefeated(
  api: CoreAPI,
  officeId: string,
  question: string,
  direction: number,
): boolean {
  const since = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) -
      campaignParameter("defeatedMeasureWaitDays") * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  return (
    api
      .moduleState(WORLD_LEGISLATING_MODULE_ID)
      .table("sessions")
      .rows() as unknown as {
      bodyOfficeId: string | null;
      date: string;
      bills?: SessionBill[];
    }[]
  ).some(
    (s) =>
      s.bodyOfficeId === officeId &&
      s.date >= since &&
      (s.bills ?? []).some((b) => {
        // A filing held for the meeting was drafted when the session was
        // written; its vote since is read from the bill itself.
        const status =
          b.status === "drafted"
            ? (liveBills(api, officeId).get(b.number)?.status ?? b.status)
            : b.status;
        return (
          b.question === question &&
          b.change === (direction > 0 ? "enact" : "repeal") &&
          b.fate === "voted" &&
          status !== "drafted" &&
          status !== "enacted" &&
          status !== "overridden" &&
          status !== "awaiting-signature"
        );
      }),
  );
}

/**
 * The body's next regular meeting, on its own rule (office-day-calendar.ts):
 * the place's size band sets how often it meets, and the same rule puts the
 * meeting on the player's calendar. A body that does not meet as a body (one
 * seat) has no meeting.
 */
function scheduleMeeting(
  api: CoreAPI,
  officeId: string,
  after: string = api.state.date,
): void {
  const next = nextMeeting(api, officeId, after, lawChain(api).countyGeoids[0]);
  const meetings = api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("nextMeetings");
  if (!next) {
    meetings.remove(officeId);
    return;
  }
  meetings.put({
    id: officeId,
    date: next.date,
    source: next.rule.source,
  } as unknown as ModuleRow);
  // The filing is decided on the eve, whoever holds the seat by then: a body
  // the player sits on files that day, so the bills are on the meeting's
  // agenda while its stop can still come; any other body's filing moves on
  // to the meeting day itself (`localMeeting`).
  const eve = addDays(makeIsoDate(next.date), -1);
  const early = eve > api.state.date;
  api.moduleCalendar(WORLD_LEGISLATING_MODULE_ID).schedule({
    key: `local-meeting:${officeId}:${next.date}`,
    date: early ? eve : next.date,
    kind: "local-meeting",
    source: next.rule.source,
    sourceRecordIds: [officeId, next.date],
  });
}

/** One sitting's record: its floor time and every bill it took up. */
export interface SessionRecord {
  readonly id: string;
  readonly stateKey: string;
  readonly bodyOfficeId: string | null;
  readonly date: string;
  readonly leader: string | null;
  readonly floorDays: number;
  /** How many bills the floor's time could take up. */
  readonly floorTime: number;
  readonly bills: readonly SessionBill[];
}

export function sessionsOf(api: CoreAPI): readonly SessionRecord[] {
  return api
    .moduleState(WORLD_LEGISLATING_MODULE_ID)
    .table("sessions")
    .rows() as unknown as SessionRecord[];
}
