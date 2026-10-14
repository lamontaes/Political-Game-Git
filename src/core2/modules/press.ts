/**
 * The press (BOARD "next" item 1, campaign interviews). The town's local
 * outlets (newspapers, television stations and news radio) are records sized
 * from its state's real counts, and each adult follows the kinds of outlet
 * people their age follow, the most dutiful and deliberate first.
 *
 * A candidate asks an outlet for an interview, or in the weeks before a
 * general election an outlet asks the candidates on the ballot, the most
 * newsworthy first, as far as its reporter has room. The questions come from
 * the race: a promise the candidate broke, where they differ most from a
 * rival, and the most divisive question in play. Each answer is a statement on
 * the record (a promise); declining a question is recorded too. When the
 * interview runs, its readers or viewers hear the candidate's positions and
 * decide for themselves, with a recorded cause, and the story is a public
 * record the news carries.
 */
import news from "../../../data/research/press/local-news-2026.json" with { type: "json" };
import bases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import rows from "../data/press/parameters.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { addDays, makeIsoDate } from "../../simulation/dates";
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import { lawChain } from "./laws";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  campaignRecognition,
  makeStatements,
  registerAdOutlet,
  parsePlatform,
  type CampaignRow,
  type ImpressionRow,
} from "./campaigns";
import { promisesOf, votesOf } from "./record";
import { VIEWS_MODULE_ID, type Stance as ViewStance } from "./views";
import { candidateStance } from "../campaign-stances";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import {
  PLATFORM_QUESTIONS,
  publicOffset,
  questionAxis,
  type Stance,
} from "../campaign-views";

export const PRESS_MODULE_ID = "core2-press-v1";

export type OutletKind = "newspaper" | "television" | "radio";
const KINDS: readonly OutletKind[] = ["newspaper", "television", "radio"];

export interface OutletRow {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: OutletKind;
  /** Which of its kind it is, in the order outlets were recorded. */
  readonly index: number;
  readonly placeId: string;
}

export interface InterviewAnswer {
  readonly question: string;
  /** The stated position in [-1, 1], or null where the candidate declined. */
  readonly position: number | null;
}

export interface InterviewRow {
  readonly id: string;
  readonly outletId: string;
  readonly candidateId: string;
  readonly filingId: string;
  readonly contestId: string;
  readonly askedBy: "candidate" | "outlet";
  readonly date: string;
  readonly status: "invited" | "declined" | "published";
  /** Why it was declined: by the outlet (room, newsworthiness) or the candidate. */
  readonly reason:
    | "no-room"
    | "not-newsworthy"
    | "already-interviewed"
    | "race-over"
    | "candidate-declined"
    | null;
  readonly questions: readonly string[];
  readonly answers: readonly InterviewAnswer[];
  readonly audience: number;
  readonly newsworthiness: number;
}

interface ParameterRow {
  readonly value: number;
}
const PARAMETERS = (
  rows as unknown as { parameters: Record<string, ParameterRow> }
).parameters;
export function pressParameter(key: string): number {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown press parameter: ${key}`);
  return row.value;
}

interface PlaceNews {
  readonly newspapers: number;
  readonly tvStations: number;
  readonly radioStations: number;
  readonly tvMarkets: number;
}
type Band = "18-29" | "30-49" | "50-64" | "65+";
type HabitKey = "localTv" | "localNewspapers" | "localRadio";
const NEWS = news as unknown as {
  places: Record<string, PlaceNews>;
  habits: {
    national: Record<HabitKey, number>;
    byAge: Record<Band, Record<HabitKey, number>>;
  };
};
const BASES = bases as unknown as {
  places: Record<string, { population2024?: number }>;
  countyPopulation2024: Record<string, number>;
};
const HABIT: Record<OutletKind, HabitKey> = {
  newspaper: "localNewspapers",
  television: "localTv",
  radio: "localRadio",
};

export const PRESS_MODULE: CoreModule = {
  id: PRESS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      outlets: {},
      interviews: {
        indexes: {
          byOutlet: { fields: ["outletId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
    },
  },
  onCalendarWork: (api, work) => pressWeek(api, work),
};

const table = (api: CoreAPI, name: string) =>
  api.moduleState(PRESS_MODULE_ID).table(name);
const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);
const bandOf = (age: number): Band =>
  age < 30 ? "18-29" : age < 50 ? "30-49" : age < 65 ? "50-64" : "65+";

/**
 * Register the press and record the town's outlets: its county's share of the
 * state's newspapers and news radio, and the television stations of one of
 * the state's markets, each kind capped at the handful that cover politics.
 */
export function openPress(core: CoreState): readonly OutletRow[] {
  registerAdOutlet(adOutlet);
  if (core.modules.has(PRESS_MODULE_ID)) return outletsHere(coreAPI(core));
  registerModule(core, PRESS_MODULE);
  const api = coreAPI(core);
  const chain = lawChain(api);
  const counts = NEWS.places[chain.stateKey];
  const town = chain.townPlaceId;
  const townPeople =
    Number(api.state.placeMetadata.referencePopulation) || core.people.size;
  const statePeople =
    BASES.places[chain.stateKey]?.population2024 ?? townPeople;
  const county = chain.countyGeoids[0];
  const countyPeople =
    (county ? BASES.countyPopulation2024[county] : undefined) ?? townPeople;
  const share = Math.min(1, countyPeople / Math.max(1, statePeople));
  const cap = pressParameter("maxOutletsPerKind");
  const wanted: Record<OutletKind, number> = counts
    ? {
        newspaper: Math.round(counts.newspapers * share),
        television: Math.round(
          counts.tvStations / Math.max(1, counts.tvMarkets),
        ),
        radio: Math.round(
          counts.radioStations * pressParameter("newsRadioShare") * share,
        ),
      }
    : { newspaper: 0, television: 0, radio: 0 };
  const source = {
    tag: "ESTIMATED" as const,
    citation:
      "data/research/press/local-news-2026.json (Medill 2024 and FCC 2025 totals, state split estimated)",
    asOf: api.state.date,
    estimatedFrom: "local-news-2026",
  };
  // stopgapId: SG-GOV-press-outlet-names
  api.stopgap("SG-GOV-press-outlet-names");
  for (const kind of KINDS)
    for (let index = 0; index < Math.min(cap, wanted[kind]); index += 1) {
      const id = `outlet:${kind}:${index}:${town}`;
      const organizationId = `organization:press:${kind}:${index}:${town}`;
      if (!api.state.organizations.has(organizationId))
        api.addOrganization({
          id: organizationId,
          placeId: town,
          name: kind,
          kind: "media",
          liquidMinor: 0,
          source,
        });
      table(api, "outlets").put({
        id,
        organizationId,
        kind,
        index,
        placeId: town,
      } as unknown as ModuleRow);
    }
  scheduleWeek(api, api.state.date);
  return outletsHere(api);
}

export function outletsHere(api: CoreAPI): readonly OutletRow[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return (table(api, "outlets").rows() as unknown as OutletRow[])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
}

function scheduleWeek(api: CoreAPI, from: string): void {
  const date = addDays(makeIsoDate(from), 7);
  api.moduleCalendar(PRESS_MODULE_ID).schedule({
    key: `press-week:${date}`,
    date,
    kind: "press-week",
    source: {
      tag: "ESTIMATED",
      citation: "A local newsroom plans its week's political coverage",
      asOf: api.state.date,
      estimatedFrom: "interviewsPerWeek",
    },
    sourceRecordIds: [`press-week:${lawChain(api).townPlaceId}`],
  });
}

/** Every trait's lean toward keeping up with the news over letting it go. */
const habitScore = (p: Readonly<PersonState>, core: Pick<CoreState, "data">) =>
  decisionLean(core, p, "press.follow-news", "follow", "skip");

const followCache = new WeakMap<
  object,
  { date: string; map: Map<string, readonly string[]> }
>();

/**
 * The adults in town who read, watch or listen to an outlet. In each age
 * band, the share of adults that follows that kind of local news (Pew 2024)
 * are its most dutiful and deliberate members; a kind's followers split
 * among its outlets in that order.
 */
export function followersOf(api: CoreAPI, outletId: string): readonly string[] {
  const cached = followCache.get(api.state);
  if (cached?.date === api.state.date) return cached.map.get(outletId) ?? [];
  const map = new Map<string, readonly string[]>();
  const outlets = outletsHere(api);
  const town = lawChain(api).townPlaceId;
  const date = api.state.date;
  // Each person's lean once for this rebuild, not once per sort comparison.
  const scores = new Map<string, number>();
  const habit = (p: PersonState) => {
    let score = scores.get(p.id);
    if (score === undefined) {
      score = habitScore(p, api.state);
      scores.set(p.id, score);
    }
    return score;
  };
  const bands = new Map<Band, PersonState[]>();
  for (const id of api.state.peopleByPlace.get(town) ?? []) {
    const p = api.state.people.get(id);
    if (!p?.alive) continue;
    const age = ageOn(p, date);
    if (age < 18) continue;
    const band = bandOf(age);
    const list = bands.get(band) ?? [];
    list.push(p);
    bands.set(band, list);
  }
  for (const kind of KINDS) {
    const own = outlets.filter((o) => o.kind === kind);
    if (!own.length) continue;
    // The ones who follow most closely first: an ad's or a story's first
    // contacts.
    const followers: PersonState[] = [];
    for (const [band, people] of bands) {
      const share = NEWS.habits.byAge[band]?.[HABIT[kind]] ?? 0;
      followers.push(
        ...people
          .slice()
          .sort((a, b) => habit(b) - habit(a) || a.id.localeCompare(b.id))
          .slice(0, Math.round(share * people.length)),
      );
    }
    followers.sort((a, b) => habit(b) - habit(a) || a.id.localeCompare(b.id));
    own.forEach((outlet, i) =>
      map.set(
        outlet.id,
        followers.filter((_, rank) => rank % own.length === i).map((p) => p.id),
      ),
    );
  }
  followCache.set(api.state, { date, map });
  return map.get(outletId) ?? [];
}

/**
 * Where a campaign buys an ad: the outlet with the widest audience in town,
 * television first where audiences tie.
 */
function adOutlet(
  api: CoreAPI,
): { organizationId: string; followerIds: readonly string[] } | null {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return null;
  const best = outletsHere(api)
    .map((o) => ({ o, followers: followersOf(api, o.id) }))
    .sort(
      (a, b) =>
        b.followers.length - a.followers.length ||
        KINDS.indexOf(b.o.kind) - KINDS.indexOf(a.o.kind) ||
        a.o.id.localeCompare(b.o.id),
    )[0];
  return best
    ? { organizationId: best.o.organizationId, followerIds: best.followers }
    : null;
}

function contestOf(api: CoreAPI, contestId: string): ContestRow {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
}

function platformOf(api: CoreAPI, filing: FilingRow): readonly Stance[] {
  const campaign = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? (api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("campaigns")
        .get(filing.id) as unknown as CampaignRow | undefined)
    : undefined;
  return campaign?.platform ?? parsePlatform(filing.platform);
}

function isIncumbent(api: CoreAPI, contest: ContestRow, personId: string) {
  if (!contest.incumbentTermId || !api.state.modules.has(OFFICES_MODULE_ID))
    return false;
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .get(contest.incumbentTermId) as unknown as TermRow | undefined;
  return term?.personId === personId;
}

/**
 * How newsworthy a candidate is to a reporter: how many people in town have
 * heard of them, whether they hold the seat, and their share of the money
 * raised in the race.
 */
export function newsworthiness(api: CoreAPI, filing: FilingRow): number {
  const contest = contestOf(api, filing.contestId);
  const town = lawChain(api).townPlaceId;
  const adults = [...(api.state.peopleByPlace.get(town) ?? [])].length || 1;
  const campaigns = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? api.moduleState(CAMPAIGNS_MODULE_ID)
    : null;
  // How much of the town knows them: the people who've heard of them and
  // the counted households their mail reached (`campaignRecognition`).
  const known = !campaigns
    ? 0
    : campaigns.table("campaigns").get(filing.id)
      ? campaignRecognition(api, filing.id)
      : (
          campaigns
            .table("impressions")
            .query("byCandidate", [
              filing.personId,
            ]) as unknown as ImpressionRow[]
        ).filter((i) => i.heardOf).length / adults;
  const raised = (f: FilingRow) =>
    (
      campaigns?.table("campaigns").get(f.id) as unknown as
        CampaignRow | undefined
    )?.raisedMinor ?? 0;
  const total = ballot(api, contest.id).reduce((s, f) => s + raised(f), 0);
  return (
    Math.min(1, known) +
    (isIncumbent(api, contest, filing.personId)
      ? pressParameter("incumbentNewsworthiness")
      : 0) +
    (total > 0
      ? (raised(filing) / total) * pressParameter("moneyNewsworthiness")
      : 0)
  );
}

/** A candidate's public position on a question: what they've stated, else where they stand. */
function statedPosition(
  api: CoreAPI,
  filing: FilingRow,
  platform: readonly Stance[],
  question: string,
): number {
  return (
    platform.find((s) => s.question === question)?.position ??
    candidateStance(api, filing.personId, filing.party ?? null, question) ??
    0
  );
}

const concernCache = new WeakMap<
  object,
  { date: string; map: Map<string, number> }
>();

/**
 * How much the town cares about a question, 0 to 1: the summed strength of
 * the stances its people hold on it (PEOPLE's views engine) over the town's
 * adults, read once a day.
 */
function townConcern(api: CoreAPI, question: string): number {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return 0;
  const held = concernCache.get(api.state);
  const map =
    held?.date === api.state.date ? held.map : new Map<string, number>();
  if (held?.date !== api.state.date)
    concernCache.set(api.state, { date: api.state.date, map });
  const hit = map.get(question);
  if (hit !== undefined) return hit;
  const adults =
    api.state.peopleByPlace.get(lawChain(api).townPlaceId)?.size || 1;
  const strength = (
    api
      .moduleState(VIEWS_MODULE_ID)
      .table("stances")
      .query("byTopic", [question]) as unknown as ViewStance[]
  ).reduce((sum, row) => sum + row.strength, 0);
  const share = Math.min(1, strength / adults);
  map.set(question, share);
  return share;
}

/**
 * What the reporter asks: the questions the race's record puts in play,
 * scored by every reason a reporter has to ask each one: a promise the
 * candidate broke; the incumbent's recent recorded votes; how far apart the
 * candidates (their stated positions, else their own and their party's)
 * stand; how much the town cares (the stances its people hold); and how
 * divisive the question is nationally. A question this candidate has
 * already been asked on the record counts for less each time, so outlets
 * and weeks ask different things.
 */
export function interviewQuestions(
  api: CoreAPI,
  filing: FilingRow,
): readonly string[] {
  const score = new Map<string, number>();
  const add = (q: string | undefined, weight: number) => {
    if (q) score.set(q, (score.get(q) ?? 0) + weight);
  };
  for (const p of promisesOf(api, filing.personId))
    if (p.status === "broken")
      add(p.promise.stance.question, pressParameter("brokenPromiseNewsWeight"));
  const contest = contestOf(api, filing.contestId);
  if (isIncumbent(api, contest, filing.personId))
    for (const vote of votesOf(api, filing.personId).slice(
      -pressParameter("recordVotesConsidered"),
    ))
      add(vote.stance.question, pressParameter("recordVoteNewsWeight"));
  const own = platformOf(api, filing);
  const rivals = ballot(api, filing.contestId).filter(
    (f) => f.id !== filing.id && f.status === "on-ballot",
  );
  const questions = [
    ...new Set([
      ...PLATFORM_QUESTIONS,
      ...own.map((s) => s.question),
      ...rivals.flatMap((r) => platformOf(api, r).map((s) => s.question)),
    ]),
  ].sort();
  const mine = new Map(
    questions.map((q) => [q, statedPosition(api, filing, own, q)]),
  );
  for (const rival of rivals) {
    const theirs = platformOf(api, rival);
    for (const q of questions)
      add(
        q,
        (pressParameter("partyGapNewsWeight") *
          Math.abs(mine.get(q)! - statedPosition(api, rival, theirs, q))) /
          2,
      );
  }
  for (const q of questions) {
    add(q, pressParameter("townConcernNewsWeight") * townConcern(api, q));
    add(
      q,
      pressParameter("divisiveNewsWeight") *
        Math.max(0, Math.abs(questionAxis(q)) - Math.abs(publicOffset(q))),
    );
  }
  // Asked before, on the record: less to learn from asking again.
  const asked = new Map<string, number>();
  for (const row of table(api, "interviews").query("byCandidate", [
    filing.personId,
  ]) as unknown as InterviewRow[])
    if (row.status !== "declined")
      for (const q of row.questions) asked.set(q, (asked.get(q) ?? 0) + 1);
  for (const [q, times] of asked)
    if (score.has(q))
      score.set(q, score.get(q)! - pressParameter("askedAgainPenalty") * times);
  return [...score]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, pressParameter("questionsPerInterview"))
    .map(([q]) => q);
}

function weekCount(api: CoreAPI, outletId: string): number {
  const since = addDays(makeIsoDate(api.state.date), -6);
  return (
    table(api, "interviews").query("byOutlet", [
      outletId,
    ]) as unknown as InterviewRow[]
  ).filter((i) => i.status !== "declined" && i.date >= since).length;
}

function already(api: CoreAPI, outletId: string, filingId: string) {
  return (
    table(api, "interviews").query("byOutlet", [
      outletId,
    ]) as unknown as InterviewRow[]
  ).some((i) => i.filingId === filingId && i.status !== "declined");
}

function record(api: CoreAPI, row: InterviewRow): InterviewRow {
  table(api, "interviews").put(row as unknown as ModuleRow);
  return row;
}

/**
 * A candidate asks an outlet for an interview. The outlet says yes while its
 * reporter has room this week, and a television station only for a
 * candidate newsworthy enough for airtime. A yes comes with its questions,
 * for the candidate to answer (`answerInterview`).
 */
export function requestInterview(
  api: CoreAPI,
  input: { readonly filingId: string; readonly outletId: string },
): InterviewRow {
  return arrange(api, input.filingId, input.outletId, "candidate");
}

function arrange(
  api: CoreAPI,
  filingId: string,
  outletId: string,
  askedBy: InterviewRow["askedBy"],
): InterviewRow {
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow;
  if (!filing) throw new Error(`No filing ${filingId}`);
  const outlet = table(api, "outlets").get(outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) throw new Error(`No outlet ${outletId}`);
  const contest = contestOf(api, filing.contestId);
  const worth = newsworthiness(api, filing);
  const base = {
    // One row per ask: a second ask the same day never overwrites the first.
    id: `interview:${outletId}:${filingId}:${api.state.date}:${
      (
        table(api, "interviews").query("byOutlet", [
          outletId,
        ]) as unknown as InterviewRow[]
      ).filter((i) => i.filingId === filingId).length
    }`,
    outletId,
    candidateId: filing.personId,
    filingId,
    contestId: filing.contestId,
    askedBy,
    date: api.state.date,
    questions: [] as string[],
    answers: [] as InterviewAnswer[],
    audience: 0,
    newsworthiness: worth,
  };
  const declined = (reason: InterviewRow["reason"]) =>
    record(api, { ...base, status: "declined", reason });
  if (contest.electionDate < api.state.date || filing.status !== "on-ballot")
    return declined("race-over");
  if (already(api, outletId, filingId)) return declined("already-interviewed");
  if (weekCount(api, outletId) >= pressParameter("interviewsPerWeek"))
    return declined("no-room");
  if (outlet.kind === "television" && worth < pressParameter("televisionBar"))
    return declined("not-newsworthy");
  return record(api, {
    ...base,
    status: "invited",
    reason: null,
    questions: interviewQuestions(api, filing),
  });
}

/** Interviews offered to or arranged by a person, newest first. */
export function interviewsFor(
  api: CoreAPI,
  personId: string,
): readonly InterviewRow[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return (
    table(api, "interviews").query("byCandidate", [
      personId,
    ]) as unknown as InterviewRow[]
  )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/**
 * Answer an arranged interview: a position on each question asked, or null
 * to decline it. The interview runs at once; its readers or viewers hear the
 * positions as statements on the record.
 */
export function answerInterview(
  api: CoreAPI,
  interviewId: string,
  answers: readonly InterviewAnswer[],
): InterviewRow {
  const row = table(api, "interviews").get(interviewId) as unknown as
    InterviewRow | undefined;
  if (!row || row.status !== "invited")
    throw new Error(`No interview waiting: ${interviewId}`);
  const given = row.questions.map((question) => {
    const answer = answers.find((a) => a.question === question);
    return {
      question,
      position:
        answer?.position === null || answer?.position === undefined
          ? null
          : Math.max(-1, Math.min(1, answer.position)),
    };
  });
  return publish(api, row, given);
}

function publish(
  api: CoreAPI,
  row: InterviewRow,
  answers: readonly InterviewAnswer[],
): InterviewRow {
  const statements: Stance[] = answers.flatMap((a) =>
    a.position === null ? [] : [{ question: a.question, position: a.position }],
  );
  campaignFor(api, row.filingId);
  const audience = followersOf(api, row.outletId).filter(
    (id) => id !== row.candidateId,
  );
  const causes = makeStatements(api, {
    filingId: row.filingId,
    venue: row.outletId,
    statements,
    audienceIds: audience,
    act: "interview",
    weight: pressParameter("interviewWeight"),
    faceToFace: false,
  });
  const done: InterviewRow = {
    ...row,
    status: "published",
    answers,
    audience: causes.length,
  };
  record(api, done);
  api.emit({
    id: `interview-published:${row.id}`,
    date: api.state.date,
    kind: "interview-published",
    personIds: api.state.people.has(row.candidateId) ? [row.candidateId] : [],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Interview ${row.id}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      interviewId: row.id,
      outletId: row.outletId,
      candidateId: row.candidateId,
      contestId: row.contestId,
      answered: String(statements.length),
      declined: String(answers.length - statements.length),
    },
  });
  return done;
}

/**
 * How a candidate who isn't the player answers: their platform's position,
 * else where their own view and their party's put them (`candidateStance`),
 * else (no view and no party) they decline.
 */
export function candidateAnswers(
  api: CoreAPI,
  questions: readonly string[],
  filing: FilingRow,
): readonly InterviewAnswer[] {
  const platform = platformOf(api, filing);
  return questions.map((question) => {
    const stated = platform.find((s) => s.question === question);
    if (stated) return { question, position: stated.position };
    // Their own view blended with their party's; none only with neither.
    const stance = candidateStance(
      api,
      filing.personId,
      filing.party ?? null,
      question,
    );
    return {
      question,
      position: stance === null ? null : Math.round(stance * 1000) / 1000,
    };
  });
}

/**
 * Each week in the run-up to a general election, every outlet asks the
 * candidates on the ballot it hasn't interviewed, most newsworthy first, as
 * far as its reporter has room. The player's invitations wait for an answer;
 * another candidate accepts unless shy and averse to conflict and risk, and
 * answers from their own positions.
 */
function pressWeek(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "press-week") return;
  scheduleWeek(api, api.state.date);
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return;
  const horizon = addDays(
    makeIsoDate(api.state.date),
    7 * pressParameter("invitationWeeks"),
  );
  const contests = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter(
    (c) => c.electionDate >= api.state.date && c.electionDate <= horizon,
  );
  if (!contests.length) return;
  const playerId = (api.state as CoreState).playerId;
  const filings = contests
    .flatMap((c) => ballot(api, c.id))
    .filter((f) => f.status === "on-ballot")
    .map((f) => ({ f, worth: newsworthiness(api, f) }))
    .sort((a, b) => b.worth - a.worth || a.f.id.localeCompare(b.f.id));
  for (const outlet of outletsHere(api))
    for (const { f, worth } of filings) {
      if (weekCount(api, outlet.id) >= pressParameter("interviewsPerWeek"))
        break;
      if (already(api, outlet.id, f.id)) continue;
      if (
        outlet.kind === "television" &&
        worth < pressParameter("televisionBar")
      )
        continue;
      const row = arrange(api, f.id, outlet.id, "outlet");
      if (row.status !== "invited" || f.personId === playerId) continue;
      const person = api.state.people.get(f.personId);
      const willing = person
        ? // Every trait's lean, on the trait scale the bar was set on.
          parameter("traitScale") *
          decisionLean(
            api.state,
            person,
            "press.accept-interview",
            "accept",
            "decline",
          )
        : 0;
      if (willing < pressParameter("interviewShyness"))
        record(api, {
          ...row,
          status: "declined",
          reason: "candidate-declined",
        });
      else publish(api, row, candidateAnswers(api, row.questions, f));
    }
}
