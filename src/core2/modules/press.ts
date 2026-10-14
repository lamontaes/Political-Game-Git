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
import nationalJson from "../data/press/national.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { addDays, makeIsoDate } from "../../simulation/dates";
import { parameter } from "../parameters";
import { decisionLean } from "../trait-decisions";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonState,
} from "../types";
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
  makeStatements,
  touchImpression,
  registerAdOutlet,
  parsePlatform,
  type CampaignRow,
  type ImpressionRow,
} from "./campaigns";
import { promisesOf, votesOf } from "./record";
import { partySide } from "../appointments";
import { deliverSpeech, SPEECH_MODULE_ID } from "./speech";
import { CORRUPTION_MODULE_ID, type CrimeRecord } from "./corruption";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import {
  personLean,
  personStance,
  publicOffset,
  questionAxis,
  type Stance,
} from "../campaign-views";
import { POLICY_QUESTIONS } from "../policy-answers";
import {
  hireStaffMember,
  nationalOutletName,
  outletName,
  STAFF_ROLES,
  type StaffRow,
} from "../press-staff";
import { stancesOf, viewOf, VIEWS_MODULE_ID } from "./views";
import { residentCounts } from "./residents";
import { startOutletRevenue } from "../press-money";
import { isPolicyTopic, wireItem, type WireItem } from "../press-topics";
import {
  closeness,
  grudge,
  printItem,
  regard,
  runDesk,
  slantOf,
  type DeskContext,
  type PrintedStory,
} from "../press-desk";

export const PRESS_MODULE_ID = "core2-press-v1";
/** The change a speech against an outlet asks of its hearers. */
export const DISTRUST = "distrust";

export type LocalKind = "newspaper" | "television" | "radio";
export type NationalKind = "cable" | "magazine" | "online" | "national-paper";
export type OutletKind = LocalKind | NationalKind;
const KINDS: readonly LocalKind[] = ["newspaper", "television", "radio"];

interface NationalKindRow {
  readonly kind: NationalKind;
  readonly followShare: number;
  readonly audienceLeans: readonly number[];
  readonly reporters: number;
  readonly nameWords: readonly string[];
  readonly namePrefix?: string;
  readonly nameSuffix?: string;
}
const NATIONAL = nationalJson as unknown as {
  basedIn: string;
  kinds: readonly NationalKindRow[];
};
const ALL_KINDS: readonly OutletKind[] = [
  ...KINDS,
  ...NATIONAL.kinds.map((row) => row.kind),
];

export interface OutletRow {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: OutletKind;
  /** Which of its kind it is, in the order outlets were recorded. */
  readonly index: number;
  readonly placeId: string;
  /** A town's own outlet, or one of the national tier its people follow. */
  readonly tier?: "local" | "national";
  /** For a national outlet: its kind's real audience lean (Pew 2020). */
  readonly audienceLean?: number;
  /** Its owner: a person who holds it, and whose views and ties read into it. */
  readonly ownerId: string | null;
  /** Its head (publisher or news director), who sets its editorial line. */
  readonly headId: string | null;
  readonly reporterIds: readonly string[];
  /**
   * Its editorial lean, -2 to +2 on the views scale: its head's lean and its
   * audience's, weighted (`outletLeanHeadWeight`).
   */
  readonly lean: number;
  /** Yearly revenue it took from its audience's spending at the opening. */
  readonly audienceRevenueMinor: number;
}

/**
 * How an answer is given, the conversation's moves: plainly, with a further
 * fact from the record, turning it back on a rival, briefly; or the lie, a
 * position the candidate's own record contradicts.
 */
export type InterviewMove = "plain" | "further" | "turn" | "brief" | "lie";

export interface InterviewAnswer {
  readonly question: string;
  /** The stated position in [-1, 1], or null where the candidate declined. */
  readonly position: number | null;
  /** How it was said (plain where not given). */
  readonly move?: InterviewMove;
  /** The record it rests on: a vote that backs a further fact, or one a lie contradicts. */
  readonly recordId?: string | null;
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
  /** The outlet's reporter who asks: the one closest to the candidate. */
  readonly reporterId?: string | null;
  /** The story the outlet printed from it. */
  readonly storyId?: string | null;
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
const HABIT: Record<LocalKind, HabitKey> = {
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
      staff: { indexes: { byOutlet: { fields: ["outletId"] } } },
      wire: { indexes: { byDate: { fields: ["date"] } } },
      digs: {},
      tips: {},
      stories: {
        indexes: {
          byWire: { fields: ["wireId"] },
          byOutlet: { fields: ["outletId"] },
          byReporter: { fields: ["reporterId"] },
        },
      },
      interviews: {
        indexes: {
          byOutlet: { fields: ["outletId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
    },
  },
  onCalendarWork: (api, work) => {
    if (work.kind === "press-dig") checkClaim(api, work);
    else pressWeek(api, work);
  },
  eventKinds: ["*"],
  onEvent(api, event) {
    // A hidden act someone was just told of may reach a reporter.
    if (event.kind === "crime.told") {
      tipOff(api, event);
      return;
    }
    // Every public record in the town's coverage goes on the wire.
    if (!event.publicRecord) return;
    const chain = lawChain(api);
    const item = wireItem(api, event, {
      placeId: chain.townPlaceId,
      stateKey: chain.stateKey,
    });
    if (item) table(api, "wire").put(item as unknown as ModuleRow);
  },
};

/** A person's lean on the views scale; level where the world keeps no views. */
const leanOf = (api: CoreAPI, id: string): number =>
  api.state.modules.has(VIEWS_MODULE_ID) ? (viewOf(api, id)?.lean ?? 0) : 0;

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
 * Each outlet gets its people (a head and its reporters, named and on its
 * payroll), its lean from its head and its audience, and its revenue from its
 * audience's spending.
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
  const wanted: Record<LocalKind, number> = counts
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
  const staffSource = {
    tag: "ESTIMATED" as const,
    citation:
      "src/core2/data/press/staff.json: an outlet's head and reporters, named at the opening, paid the BLS median for their occupation",
    asOf: api.state.date,
    estimatedFrom: "press-staff",
  };
  const names = new Set<string>();
  const opened: OutletRow[] = [];
  // The town's own outlets, then the national tier its people can follow.
  interface Spec {
    readonly kind: OutletKind;
    readonly index: number;
    readonly id: string;
    readonly organizationId: string;
    readonly name: string;
    readonly basedAt: string;
    readonly ownerLivesAt?: string;
    readonly reporters: number;
    readonly tier: "local" | "national";
    readonly audienceLean?: number;
  }
  const specs: Spec[] = [];
  for (const kind of KINDS)
    for (let index = 0; index < Math.min(cap, wanted[kind]); index += 1) {
      const id = `outlet:${kind}:${index}:${town}`;
      const name = outletName({
        seed: core.seed,
        outletId: id,
        kind,
        townPlaceId: town,
        stateKey: chain.stateKey,
        taken: names,
      });
      names.add(name);
      specs.push({
        kind,
        index,
        id,
        organizationId: `organization:press:${kind}:${index}:${town}`,
        name,
        basedAt: town,
        // A local paper's owner lives in town; a station's, in its state (a
        // station group's).
        ...(kind === "newspaper" ? {} : { ownerLivesAt: chain.stateKey }),
        reporters: pressParameter(
          kind === "newspaper"
            ? "reportersPerNewspaper"
            : "reportersPerStation",
        ),
        tier: "local",
      });
    }
  for (const row of NATIONAL.kinds)
    row.audienceLeans.forEach((audienceLean, index) => {
      const id = `outlet:${row.kind}:${index}:national`;
      const name = nationalOutletName({
        seed: core.seed,
        outletId: id,
        words: row.nameWords,
        prefix: row.namePrefix ?? "",
        suffix: row.nameSuffix ?? "",
        taken: names,
      });
      names.add(name);
      specs.push({
        kind: row.kind,
        index,
        id,
        organizationId: `organization:press:${row.kind}:${index}:national`,
        name,
        basedAt: NATIONAL.basedIn,
        ownerLivesAt: NATIONAL.basedIn,
        reporters: row.reporters,
        tier: "national",
        audienceLean,
      });
    });
  const [ownerRole, headRole, reporterRole] = [
    STAFF_ROLES.find((r) => r.id === "owner")!,
    STAFF_ROLES.find((r) => r.id === "head")!,
    STAFF_ROLES.find((r) => r.id === "reporter")!,
  ];
  for (const spec of specs) {
    const { id, organizationId, basedAt } = spec;
    if (!api.state.organizations.has(organizationId))
      api.addOrganization({
        id: organizationId,
        placeId: basedAt,
        name: spec.name,
        kind: "media",
        liquidMinor: 0,
        source,
      });
    const hire = (
      role: (typeof STAFF_ROLES)[number],
      i: number,
      livesAt?: string,
    ) => {
      const row = hireStaffMember(api, {
        outletId: id,
        organizationId,
        role,
        index: i,
        townPlaceId: town,
        stateKey: spec.tier === "local" ? chain.stateKey : basedAt,
        ...(livesAt ? { livesAt } : {}),
        parameter: pressParameter,
        source: staffSource,
      });
      table(api, "staff").put(row as unknown as ModuleRow);
      return row.id;
    };
    const staffHome = spec.tier === "local" ? undefined : basedAt;
    const ownerId = hire(ownerRole, 0, spec.ownerLivesAt);
    const headId = hire(headRole, 0, staffHome);
    const reporterIds = Array.from({ length: spec.reporters }, (_, i) =>
      hire(reporterRole, i, staffHome),
    );
    // Owner, head and reporters know one another from the first day.
    const people = [ownerId, headId, ...reporterIds];
    for (const one of people)
      for (const other of people)
        if (one < other)
          api.meet(one, other, {
            placeId: basedAt,
            sourceId: organizationId,
            cause: "coworker",
            hours: pressParameter("coworkerHoursAtOpening"),
          });
    opened.push({
      id,
      organizationId,
      kind: spec.kind,
      index: spec.index,
      placeId: basedAt,
      tier: spec.tier,
      ...(spec.audienceLean === undefined
        ? {}
        : { audienceLean: spec.audienceLean }),
      ownerId,
      headId,
      reporterIds,
      lean: 0,
      audienceRevenueMinor: 0,
    });
  }
  // An outlet's lean: its owner's, its head's, and its kind's audience's as
  // a whole.
  const headWeight = pressParameter("outletLeanHeadWeight");
  const ownerWeight = pressParameter("outletLeanOwnerWeight");
  for (const outlet of opened) {
    // A national outlet's audience is the country's, not the town's.
    const audience =
      outlet.audienceLean === undefined ? audienceOfKind(api, outlet.kind) : [];
    const audienceLean =
      outlet.audienceLean ??
      (audience.length
        ? audience.reduce((s, id) => s + leanOf(api, id), 0) / audience.length
        : 0);
    const headLean = outlet.headId ? leanOf(api, outlet.headId) : 0;
    const ownerLean = outlet.ownerId ? leanOf(api, outlet.ownerId) : 0;
    table(api, "outlets").put({
      ...outlet,
      lean:
        ownerWeight * ownerLean +
        headWeight * headLean +
        (1 - ownerWeight - headWeight) * audienceLean,
    } as unknown as ModuleRow);
  }
  followCache.delete(api.state);
  // Revenue: its audience's subscriptions and the advertising they see, from
  // the town's outside customers. A national outlet's money is outside the
  // town's economy.
  for (const outlet of outletsHere(api)) {
    if (outlet.tier === "national") continue;
    const audience = countedAudience(api, outlet);
    const fromAudience = Math.round(
      audience *
        pressParameter(
          outlet.kind === "newspaper"
            ? "newspaperRevenuePerFollowerYear"
            : outlet.kind === "television"
              ? "televisionRevenuePerFollowerYear"
              : "radioRevenuePerFollowerYear",
        ),
    );
    // The outlet in town is its town bureau: where its audience here pays
    // less than its people here cost, the wider area it serves makes up the
    // rest, as a parent funds a location.
    const payroll = [outlet.headId, ...outlet.reporterIds].reduce((sum, id) => {
      const job = id ? core.jobs.get(core.people.get(id)?.jobId ?? "") : null;
      return (
        sum + (job?.hourlyMinor ?? 0) * pressParameter("fullTimeHoursPerYear")
      );
    }, 0);
    const capacityMinor = Math.max(
      fromAudience,
      Math.round(payroll * (1 + pressParameter("bureauMarginShare"))),
    );
    // stopgapId: SG-PEOPLE-press-outlet-revenue
    api.stopgap("SG-PEOPLE-press-outlet-revenue");
    const revenue = startOutletRevenue(api, {
      organizationId: outlet.organizationId,
      placeId: town,
      annualMinor: capacityMinor,
      monthsPerYear: pressParameter("monthsPerYear"),
      daysPerYear: pressParameter("daysPerYear"),
      source: {
        tag: "ESTIMATED",
        citation:
          "src/core2/data/press/parameters.json: an outlet's revenue per follower per year by kind (Pew State of the News Media 2023), at least its town staff's pay and margin",
        asOf: api.state.date,
        estimatedFrom: "revenue per follower",
      },
    });
    table(api, "outlets").put({
      ...outlet,
      audienceRevenueMinor: revenue,
    } as unknown as ModuleRow);
  }
  scheduleWeek(api, api.state.date);
  return outletsHere(api);
}

/**
 * How many of the town's adults, counted and full, follow an outlet: its
 * kind's share of each age band (Pew 2024), split evenly among the kind's
 * outlets.
 */
function countedAudience(api: CoreAPI, outlet: OutletRow): number {
  const town = outlet.placeId;
  const own = outletsHere(api).filter((o) => o.kind === outlet.kind).length;
  let total = 0;
  for (const row of countsThisWeek(api)) {
    if (row.placeId !== town) continue;
    for (const [bandKey, people] of Object.entries(row.byAgeBand ?? {})) {
      const low = Number(bandKey.split("-")[0]);
      if (!Number.isFinite(low) || low < 18) continue;
      total +=
        people *
        (NEWS.habits.byAge[bandOf(low)]?.[HABIT[outlet.kind as LocalKind]] ??
          0);
    }
  }
  total += followersOf(api, outlet.id).length * own;
  return total / Math.max(1, own);
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

/** Each adult's habit, once per rebuild, not once per sort comparison. */
function habitOf(api: CoreAPI, scores: Map<string, number>, p: PersonState) {
  let score = scores.get(p.id);
  if (score === undefined) {
    score = habitScore(p, api.state);
    scores.set(p.id, score);
  }
  return score;
}

/**
 * The town's full adults who follow a kind of local news: in each age band,
 * the share that follows that kind (Pew 2024), its most dutiful and
 * deliberate members first.
 */
function audienceOfKind(
  api: CoreAPI,
  kind: OutletKind,
  scores: Map<string, number> = new Map(),
): readonly string[] {
  const town = lawChain(api).townPlaceId;
  const date = api.state.date;
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
  const habit = (p: PersonState) => habitOf(api, scores, p);
  const followers: PersonState[] = [];
  const national = NATIONAL.kinds.find((row) => row.kind === kind);
  for (const [band, people] of bands) {
    const share = national
      ? national.followShare
      : (NEWS.habits.byAge[band]?.[HABIT[kind as LocalKind]] ?? 0);
    followers.push(
      ...people
        .slice()
        .sort((a, b) => habit(b) - habit(a) || a.id.localeCompare(b.id))
        .slice(0, Math.round(share * people.length)),
    );
  }
  // The ones who follow most closely first: an ad's or a story's first
  // contacts.
  followers.sort((a, b) => habit(b) - habit(a) || a.id.localeCompare(b.id));
  return followers.map((p) => p.id);
}

/**
 * The adults in town who read, watch or listen to an outlet. A kind's
 * audience (`audienceOfKind`) each follows the outlet of that kind whose
 * lean is nearest their own (selective exposure: Stroud 2011).
 */
export function followersOf(api: CoreAPI, outletId: string): readonly string[] {
  // Who follows what is settled once a week (the press's own cycle), or
  // again when something changes it (an attack on an outlet).
  const cached = followCache.get(api.state);
  if (
    cached &&
    cached.date <= api.state.date &&
    api.state.date < addDays(makeIsoDate(cached.date), 7)
  )
    return cached.map.get(outletId) ?? [];
  const map = new Map<string, readonly string[]>();
  const outlets = outletsHere(api);
  const scores = new Map<string, number>();
  for (const kind of ALL_KINDS) {
    const own = outlets.filter((o) => o.kind === kind);
    if (!own.length) continue;
    const lists = new Map<string, string[]>(own.map((o) => [o.id, []]));
    const views = api.state.modules.has(VIEWS_MODULE_ID);
    for (const id of audienceOfKind(api, kind, scores)) {
      const lean = leanOf(api, id);
      // Distrust of an outlet (a speech against it they took in) pushes a
      // follower away from it, on the lean scale.
      const distrust = new Map<string, number>();
      if (views)
        for (const stance of stancesOf(api, id))
          if (stance.desiredChange === DISTRUST)
            distrust.set(stance.topic, stance.strength);
      const distance = (o: OutletRow) =>
        Math.abs((o.lean ?? 0) - lean) +
        pressParameter("distrustDistance") *
          (distrust.get(o.organizationId) ?? 0);
      const nearest = own.reduce((best, o) =>
        distance(o) < distance(best) ? o : best,
      );
      lists.get(nearest.id)!.push(id);
    }
    for (const [id, list] of lists) map.set(id, list);
  }
  followCache.set(api.state, { date: api.state.date, map });
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
        ALL_KINDS.indexOf(b.o.kind) - ALL_KINDS.indexOf(a.o.kind) ||
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
  const known = campaigns
    ? (
        campaigns
          .table("impressions")
          .query("byCandidate", [filing.personId]) as unknown as ImpressionRow[]
      ).filter((i) => i.heardOf).length
    : 0;
  const raised = (f: FilingRow) =>
    (
      campaigns?.table("campaigns").get(f.id) as unknown as
        CampaignRow | undefined
    )?.raisedMinor ?? 0;
  const total = ballot(api, contest.id).reduce((s, f) => s + raised(f), 0);
  return (
    Math.min(1, known / adults) +
    (isIncumbent(api, contest, filing.personId)
      ? pressParameter("incumbentNewsworthiness")
      : 0) +
    (total > 0
      ? (raised(filing) / total) * pressParameter("moneyNewsworthiness")
      : 0)
  );
}

/**
 * Where a candidate stands on a question, as a reporter reads it: what they
 * said in the campaign, else how they last voted on it, else their party's
 * side of it, else the side their own lean puts them on; 0 where none says.
 */
export function standingOn(
  api: CoreAPI,
  filing: FilingRow,
  question: string,
): {
  position: number;
  from: "platform" | "vote" | "party" | "lean" | "none";
  recordId: string | null;
} {
  const stated = platformOf(api, filing).find((s) => s.question === question);
  if (stated)
    return { position: stated.position, from: "platform", recordId: null };
  const vote = votesOf(api, filing.personId)
    .filter((v) => v.stance.question === question)
    .at(-1);
  if (vote)
    return { position: vote.stance.position, from: "vote", recordId: vote.id };
  const side = partySide(filing.party) * Math.sign(questionAxis(question));
  if (side) return { position: side, from: "party", recordId: null };
  const person = api.state.people.get(filing.personId);
  const lean = person
    ? Math.sign(personStance(personLean(api.state.people, person, 0), question))
    : 0;
  return { position: lean, from: lean ? "lean" : "none", recordId: null };
}

/**
 * What the reporter asks, in order: a promise the candidate broke; where
 * their own votes broke with their party; where they stand furthest from what
 * the outlet's readers want, weighted by how much the readers care (so a
 * hostile outlet asks where the candidate is weakest with its audience); the
 * policy the asking reporter is driven on; the question on which they differ
 * most from a rival; and the most divisive
 * question in play (most partisan and most evenly split nationally).
 */
export function interviewQuestions(
  api: CoreAPI,
  filing: FilingRow,
  outlet?:
    | (Pick<OutletRow, "id" | "lean"> & Partial<Pick<OutletRow, "reporterIds">>)
    | null,
): readonly string[] {
  const out: string[] = [];
  const add = (q: string | undefined) => {
    if (q && !out.includes(q)) out.push(q);
  };
  const broken = promisesOf(api, filing.personId)
    .filter((p) => p.status === "broken")
    .sort((a, b) => b.promise.date.localeCompare(a.promise.date));
  add(broken[0]?.promise.stance.question);
  // The candidate's party: a vote against their party's side is news.
  const side = partySide(filing.party);
  if (side) {
    const breaks = votesOf(api, filing.personId)
      .filter(
        (v) =>
          Math.sign(v.stance.position) ===
          -side * Math.sign(questionAxis(v.stance.question)),
      )
      .sort(
        (a, b) =>
          Math.abs(questionAxis(b.stance.question)) -
            Math.abs(questionAxis(a.stance.question)) ||
          b.date.localeCompare(a.date),
      );
    add(breaks[0]?.stance.question);
  }
  const own = platformOf(api, filing);
  const position = (platform: readonly Stance[], q: string) =>
    platform.find((s) => s.question === q)?.position ?? 0;
  const rivals = ballot(api, filing.contestId).filter(
    (f) => f.id !== filing.id && f.status === "on-ballot",
  );
  const inPlay = [
    ...new Set(
      [filing, ...rivals].flatMap((f) =>
        platformOf(api, f).map((s) => s.question),
      ),
    ),
  ];
  const pool = inPlay.length ? inPlay : Object.keys(POLICY_QUESTIONS);
  // The outlet's readers: where the candidate stands furthest from the side
  // the outlet's line takes, on what its followers care about.
  if (outlet) {
    const followers = followersOf(api, outlet.id);
    const care = (q: string) =>
      followers.length
        ? followers.reduce(
            (s, id) => s + Math.abs((leanOf(api, id) / 2) * questionAxis(q)),
            0,
          ) / followers.length
        : 0;
    const candidates = [
      ...new Set([
        ...pool,
        ...votesOf(api, filing.personId).map((v) => v.stance.question),
      ]),
    ];
    const scored = candidates
      .map((q) => {
        const line = Math.sign((outlet.lean / 2) * questionAxis(q));
        const theirs = standingOn(api, filing, q).position;
        return { q, score: care(q) * Math.abs(line - theirs) };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score || a.q.localeCompare(b.q));
    add(scored[0]?.q);
  }
  // The reporter's own cause: a policy question they are driven on.
  const reporterId = outlet?.reporterIds
    ? reporterFor(api, outlet as OutletRow, filing.personId)
    : null;
  const reporter = reporterId ? api.state.people.get(reporterId) : undefined;
  if (reporter)
    add(
      [...reporter.drives.values()]
        .filter((d) => d.kind === "cause" && isPolicyTopic(d.topic))
        .sort(
          (a, b) => b.strength - a.strength || a.topic.localeCompare(b.topic),
        )[0]?.topic,
    );
  let widest: { q: string; gap: number } | null = null;
  for (const rival of rivals) {
    const theirs = platformOf(api, rival);
    for (const q of [
      ...new Set([...own, ...theirs].map((s) => s.question)),
    ].sort()) {
      const gap = Math.abs(position(own, q) - position(theirs, q));
      if (gap > 0 && (!widest || gap > widest.gap)) widest = { q, gap };
    }
  }
  add(widest?.q);
  const divisive = (q: string) =>
    Math.abs(questionAxis(q)) - Math.abs(publicOffset(q));
  for (const q of pool
    .slice()
    .sort((a, b) => divisive(b) - divisive(a) || a.localeCompare(b))) {
    if (out.length >= pressParameter("questionsPerInterview")) break;
    add(q);
  }
  return out.slice(0, pressParameter("questionsPerInterview"));
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
    reporterId: reporterFor(api, outlet, filing.personId),
    storyId: null,
  };
  const declined = (reason: InterviewRow["reason"]) =>
    record(api, { ...base, status: "declined", reason });
  if (contest.electionDate < api.state.date || filing.status !== "on-ballot")
    return declined("race-over");
  if (already(api, outletId, filingId)) return declined("already-interviewed");
  if (weekCount(api, outletId) >= pressParameter("interviewsPerWeek"))
    return declined("no-room");
  if (worth < newsworthyBar(outlet)) return declined("not-newsworthy");
  return record(api, {
    ...base,
    status: "invited",
    reason: null,
    questions: interviewQuestions(api, filing, outlet),
  });
}

/**
 * How newsworthy a candidate must be for an outlet to give them an interview:
 * a national outlet's bar, a television station's, else any candidate.
 */
function newsworthyBar(outlet: OutletRow): number {
  if (outlet.tier === "national") return pressParameter("nationalInterviewBar");
  return outlet.kind === "television" ? pressParameter("televisionBar") : 0;
}

/**
 * Which of an outlet's reporters asks a candidate: the one closest to them
 * (a friend gets the friendly reporter), else its first.
 */
function reporterFor(
  api: CoreAPI,
  outlet: OutletRow,
  candidateId: string,
): string | null {
  const reporters = (outlet.reporterIds ?? []).filter(
    (id) => api.state.people.get(id)?.alive,
  );
  if (!reporters.length) return null;
  // stopgapId: SG-PEOPLE-press-favors-and-leaks
  api.stopgap("SG-PEOPLE-press-favors-and-leaks");
  return reporters
    .map((id) => ({ id, tie: closeness(api, id, candidateId) }))
    .sort((a, b) => b.tie - a.tie || a.id.localeCompare(b.id))[0]!.id;
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
 * to decline it, each said with one of the conversation's moves (plain where
 * not given): plainly, with a further fact from the record, turning it back
 * on a rival, briefly, or the lie (a position the candidate's record
 * contradicts). The interview runs at once and the outlet prints it.
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
  // stopgapId: SG-PEOPLE-press-interview-conversation
  api.stopgap("SG-PEOPLE-press-interview-conversation");
  const filing = filingOf(api, row.filingId);
  const given = row.questions.map((question): InterviewAnswer => {
    const answer = answers.find((a) => a.question === question);
    const position =
      answer?.position === null || answer?.position === undefined
        ? null
        : Math.max(-1, Math.min(1, answer.position));
    const move: InterviewMove = answer?.move ?? "plain";
    // The record the answer rests on, or that it contradicts.
    const truth = standingOn(api, filing, question);
    return {
      question,
      position,
      move,
      recordId: truth.from === "vote" ? truth.recordId : null,
    };
  });
  return publish(api, row, given);
}

function filingOf(api: CoreAPI, filingId: string): FilingRow {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow;
}

const MOVE_WEIGHT: Readonly<Record<InterviewMove, string>> = {
  plain: "moveWeightPlain",
  further: "moveWeightFurther",
  turn: "moveWeightTurn",
  brief: "moveWeightBrief",
  lie: "moveWeightPlain",
};

function publish(
  api: CoreAPI,
  row: InterviewRow,
  answers: readonly InterviewAnswer[],
): InterviewRow {
  const statements: Stance[] = answers.flatMap((a) =>
    a.position === null ? [] : [{ question: a.question, position: a.position }],
  );
  campaignFor(api, row.filingId);
  const outlet = table(api, "outlets").get(
    row.outletId,
  ) as unknown as OutletRow;
  const audience = followersOf(api, row.outletId).filter(
    (id) => id !== row.candidateId,
  );
  const reporterId =
    row.reporterId ?? reporterFor(api, outlet, row.candidateId);
  // The interview is time together: a reporter and a candidate who never
  // met now have, and those who had grow closer.
  if (reporterId && api.state.people.has(row.candidateId)) {
    const hours = pressParameter("interviewHours");
    if (
      !api.meet(reporterId, row.candidateId, {
        placeId: lawChain(api).townPlaceId,
        sourceId: row.id,
        cause: "interview",
        hours,
      })
    )
      api.relationship(
        reporterId,
        row.candidateId,
        "contact",
        hours,
        undefined,
        {
          cause: "interview",
          sourceId: row.id,
        },
      );
  }
  // How it reads in print: the outlet's line, the reporter's and publisher's
  // ties to the candidate and the candidate's ad money at the outlet.
  const said = statements[0];
  const printed = said
    ? slantOf(api, deskContext(api), outlet, reporterId ?? "", {
        topic: said.question,
        desiredChange: said.position > 0 ? "enact" : "repeal",
        subjectIds: [row.candidateId],
      })
    : null;
  const moves = answers.filter((a) => a.position !== null);
  const carry = moves.length
    ? moves.reduce(
        (s, a) => s + pressParameter(MOVE_WEIGHT[a.move ?? "plain"]),
        0,
      ) / moves.length
    : 0;
  // A friendly print carries the candidate's words further, a hostile one
  // less far.
  const weight =
    pressParameter("interviewWeight") *
    carry *
    Math.max(0, 1 + (printed?.slant ?? 0));
  const causes = makeStatements(api, {
    filingId: row.filingId,
    venue: row.outletId,
    statements,
    audienceIds: audience,
    act: "interview",
    weight,
    faceToFace: false,
  });
  let storyId: string | null = null;
  if (said && reporterId && api.state.people.has(reporterId)) {
    const story = printItem(
      api,
      deskContext(api),
      outlet,
      reporterId,
      {
        id: row.id,
        kind: "interview",
        date: api.state.date,
        level: "town",
        topic: said.question,
        desiredChange: said.position > 0 ? "enact" : "repeal",
        ending: false,
        subjectIds: api.state.people.has(row.candidateId)
          ? [row.candidateId]
          : [],
      },
      null,
      {
        interviewId: row.id,
        ...(printed ? { slant: printed } : {}),
        facts: { [`interview:${row.id}:candidate`]: row.candidateId },
      },
    );
    storyId = story.id;
  }
  const done: InterviewRow = {
    ...row,
    status: "published",
    answers,
    audience: causes.length,
    reporterId,
    storyId,
  };
  record(api, done);
  // A position the candidate's own votes contradict: the reporter may check
  // the record and print what they find, weeks later.
  answers.forEach((answer, index) => {
    if (
      answer.position === null ||
      !answer.recordId ||
      !reporterId ||
      answer.move !== "lie"
    )
      return;
    const date = addDays(
      makeIsoDate(api.state.date),
      pressParameter("digDelayDays"),
    );
    api.moduleCalendar(PRESS_MODULE_ID).schedule({
      key: `press-dig:${row.id}:${index}`,
      date,
      kind: "press-dig",
      source: {
        tag: "ESTIMATED",
        citation: "A reporter checks a candidate's claim against the record",
        asOf: api.state.date,
        estimatedFrom: "digDelayDays",
      },
      sourceRecordIds: [row.id, String(index)],
    });
  });
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
    facts: {
      interviewId: row.id,
      outletId: row.outletId,
      candidateId: row.candidateId,
      contestId: row.contestId,
      answered: String(statements.length),
      declined: String(answers.length - statements.length),
      ...(storyId ? { storyId } : {}),
    },
  });
  return done;
}

/**
 * A reporter checks a candidate's claim against their votes, on the day set
 * when the interview ran. Whether they dig is theirs: their own lean toward
 * digging over letting it go (every trait), their grudge against the
 * candidate, and their closeness to them, which holds them back. When they
 * dig, the outlet prints the record against the claim, and its readers think
 * less of the candidate.
 */
function checkClaim(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const [interviewId, index] = work.sourceRecordIds;
  const row = table(api, "interviews").get(interviewId!) as unknown as
    InterviewRow | undefined;
  const answer = row?.answers[Number(index)];
  const reporter = row?.reporterId
    ? api.state.people.get(row.reporterId)
    : undefined;
  if (!row || !answer?.recordId || !reporter?.alive) return;
  const outlet = table(api, "outlets").get(row.outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) return;
  const lean =
    decisionLean(api.state, reporter, "press.dig", "dig", "let-go") +
    grudge(api, reporter.id, row.candidateId) -
    closeness(api, reporter.id, row.candidateId);
  const dug = lean > 0;
  table(api, "digs").put({
    id: `${interviewId}:${index}`,
    interviewId,
    question: answer.question,
    recordId: answer.recordId,
    reporterId: reporter.id,
    lean,
    dug,
    date: api.state.date,
  } as unknown as ModuleRow);
  if (!dug) return;
  const vote = votesOf(api, row.candidateId).find(
    (v) => v.id === answer.recordId,
  );
  const ctx = deskContext(api);
  const story = printItem(
    api,
    ctx,
    outlet,
    reporter.id,
    {
      id: `claim:${interviewId}:${index}`,
      kind: "claim-checked",
      date: api.state.date,
      level: "town",
      topic: answer.question,
      desiredChange: (vote?.stance.position ?? 0) > 0 ? "enact" : "repeal",
      ending: false,
      subjectIds: api.state.people.has(row.candidateId)
        ? [row.candidateId]
        : [],
    },
    null,
    {
      interviewId: row.id,
      slant: {
        slant: -Math.min(1, lean),
        reasons: {
          lean: 0,
          tie: -Math.min(1, lean),
          publisher: 0,
          advertiser: 0,
        },
      },
      facts: {
        [`claim:${interviewId}:${index}:record`]: answer.recordId,
      },
    },
  );
  // Its readers think less of a candidate whose record belies their word.
  for (const id of ctx.followers(outlet.id))
    if (id !== row.candidateId)
      touchImpression(api, {
        voterId: id,
        officialId: row.candidateId,
        act: "interview",
        target: -1,
        weight: pressParameter("contradictionWeight") * Math.min(1, lean),
        rapport: 0,
      });
  table(api, "digs").put({
    ...(table(api, "digs").get(`${interviewId}:${index}`) as object),
    storyId: story.id,
  } as unknown as ModuleRow);
}

/**
 * How a candidate who isn't the player answers: their platform's position,
 * else the side their own lean puts them on, else they decline.
 */
export function candidateAnswers(
  api: CoreAPI,
  questions: readonly string[],
  filing: FilingRow,
): readonly InterviewAnswer[] {
  const platform = platformOf(api, filing);
  const person = api.state.people.get(filing.personId);
  return questions.map((question) => {
    const stated = platform.find((s) => s.question === question);
    if (stated) return { question, position: stated.position, move: "plain" };
    if (!person) return { question, position: null };
    const view = personStance(
      personLean(api.state.people, person, 0),
      question,
    );
    return {
      question,
      position: view === 0 ? null : Math.sign(view),
      move: "plain",
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
/** What the reporter's desk reads from the press. */
export function deskContext(api: CoreAPI): DeskContext {
  return {
    parameter: pressParameter,
    followers: (outletId) => followersOf(api, outletId),
    townPlaceId: lawChain(api).townPlaceId,
    adMoney: (outlet, personId) => adMoneyAt(api, outlet, personId),
    rivals: (personId) => rivalsOf(api, personId),
    printed: (wireId, outletId) =>
      (
        table(api, "stories").query("byWire", [
          wireId,
        ]) as unknown as PrintedStory[]
      ).some((s) => s.outletId === outletId),
    save: (story) => table(api, "stories").put(story as unknown as ModuleRow),
    countedFollowers: (outlet) => countedFollowersOf(api, outlet as OutletRow),
  };
}

/**
 * The ad money a person's campaigns spent at an outlet: campaigns buy their
 * ads at the outlet with the widest audience, so it is what their open
 * campaigns spent where this outlet is that one.
 */
function adMoneyAt(
  api: CoreAPI,
  outlet: Pick<OutletRow, "organizationId">,
  personId: string,
): number {
  if (
    !api.state.modules.has(CAMPAIGNS_MODULE_ID) ||
    adOutlet(api)?.organizationId !== outlet.organizationId
  )
    return 0;
  let spent = 0;
  for (const filing of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [personId]) as unknown as FilingRow[]) {
    const contest = contestOf(api, filing.contestId);
    if (!contest || contest.electionDate < api.state.date) continue;
    spent +=
      (
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("campaigns")
          .get(filing.id) as unknown as CampaignRow | undefined
      )?.spentMinor ?? 0;
  }
  return spent;
}

/** Wire items past their freshness go: no reporter can pick them again. */
function forgetOldWire(api: CoreAPI): void {
  const fresh = pressParameter("storyFreshDays");
  // The week that just aged out (the desk runs weekly).
  for (let back = fresh + 1; back <= fresh + 7; back += 1) {
    const date = addDays(makeIsoDate(api.state.date), -back);
    for (const row of table(api, "wire").query("byDate", [date]))
      table(api, "wire").remove(row.id);
  }
}

/**
 * A hidden act surfaces (capability gap U2). Each person who now knows of it
 * (the one told, and the one who told) may take it to a reporter they know,
 * the closest: whether they do reads their own lean toward tipping off over
 * keeping quiet, their closeness to the reporter, and their regard for the
 * official, which holds them back. The reporter decides whether to dig (their
 * lean toward digging, a grudge against the official, closeness holding them
 * back, and the paper trail the act left); the outlet's owner and head decide
 * whether it runs (the reporter's case against their regard for the
 * official). A run is a public record naming the act: its readers learn it
 * and think less of the official, and every other outlet sees it on the wire.
 */
function tipOff(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const key = Object.keys(event.facts ?? {}).find((k) =>
    k.startsWith("crime:"),
  );
  if (!key || !api.state.modules.has(CORRUPTION_MODULE_ID)) return;
  const crimeId = key.slice("crime:".length);
  const crime = api
    .moduleState(CORRUPTION_MODULE_ID)
    .table("crimes")
    .get(crimeId) as unknown as CrimeRecord | undefined;
  if (!crime?.taken || table(api, "tips").get(crimeId)) return;
  const officialId = crime.officialId;
  const staff = new Map<string, OutletRow>();
  for (const outlet of outletsHere(api))
    for (const id of outlet.reporterIds ?? []) staff.set(id, outlet);
  const p = pressParameter;
  for (const knowerId of [...event.personIds, ...(event.witnessIds ?? [])]) {
    const knower = api.state.people.get(knowerId);
    if (!knower?.alive || knowerId === officialId) continue;
    const reporterId = [...staff.keys()]
      .filter((id) => id === knowerId || knower.knownIds.has(id))
      .sort(
        (a, b) =>
          closeness(api, knowerId, b) - closeness(api, knowerId, a) ||
          a.localeCompare(b),
      )[0];
    if (!reporterId) continue;
    const reporter = api.state.people.get(reporterId);
    if (!reporter?.alive) continue;
    const tip =
      reporterId === knowerId
        ? 1
        : decisionLean(api.state, knower, "press.tip", "tip", "keep") +
          closeness(api, knowerId, reporterId) -
          regard(api, p, knowerId, officialId);
    const row: Record<string, unknown> = {
      id: crimeId,
      crimeId,
      knowerId,
      reporterId,
      officialId,
      date: api.state.date,
      tip,
      dig: null,
      run: null,
      storyId: null,
    };
    if (tip <= 0) {
      table(api, "tips").put(row as unknown as ModuleRow);
      continue;
    }
    // The paper trail: the payment is on the cash journal.
    const dig =
      decisionLean(api.state, reporter, "press.dig", "dig", "let-go") +
      grudge(api, reporterId, officialId) -
      closeness(api, reporterId, officialId) +
      p("tipDocumentsWeight");
    row.dig = dig;
    const outlet = staff.get(reporterId)!;
    const run =
      dig -
      p("slantOwnerWeight") *
        (outlet.ownerId ? regard(api, p, outlet.ownerId, officialId) : 0) -
      p("slantPublisherWeight") *
        (outlet.headId ? regard(api, p, outlet.headId, officialId) : 0);
    row.run = dig > 0 ? run : null;
    if (dig > 0 && run > 0) {
      const exposedId = `press.exposed:${crimeId}:${outlet.id}`;
      api.emit({
        id: exposedId,
        date: api.state.date,
        kind: "press.exposed",
        personIds: api.state.people.has(officialId) ? [officialId] : [],
        placeId: outlet.placeId,
        publicRecord: true,
        news: true,
        topic: `conduct:${officialId}`,
        facts: { [`crime:${crimeId}`]: "bribe-taken", outletId: outlet.id },
        source: {
          tag: "SOURCED",
          citation: `A reporter's story on recorded bribe ${crimeId}`,
          asOf: api.state.date,
        },
      });
      const ctx = deskContext(api);
      const story = printItem(
        api,
        ctx,
        outlet,
        reporterId,
        {
          id: exposedId,
          kind: "press.exposed",
          date: api.state.date,
          level: "town",
          topic: `conduct:${officialId}`,
          desiredChange: "remove",
          ending: false,
          subjectIds: api.state.people.has(officialId) ? [officialId] : [],
        },
        null,
        {
          slant: {
            slant: -Math.min(1, run),
            reasons: { lean: 0, tie: 0, publisher: 0, advertiser: 0 },
          },
          facts: { [`crime:${crimeId}`]: "bribe-taken" },
        },
      );
      row.storyId = story.id;
      for (const id of ctx.followers(outlet.id))
        if (id !== officialId)
          touchImpression(api, {
            voterId: id,
            officialId,
            act: "interview",
            target: -1,
            weight: p("exposureWeight") * Math.min(1, run),
            rapport: 0,
          });
    }
    table(api, "tips").put(row as unknown as ModuleRow);
    if (row.storyId) return;
  }
}

/**
 * A magazine's profile: who it writes about is the person the fresh records
 * name most (ties to the outlet's own reporter's closeness, then id), not
 * profiled by it this year; how it reads is the story's framing (the owner's,
 * head's and reporter's regard and the outlet's line). Its readers' view of
 * the person moves toward the framing.
 */
function writeProfile(
  api: CoreAPI,
  ctx: DeskContext,
  outlet: OutletRow,
  wire: readonly WireItem[],
): void {
  const reporterId = (outlet.reporterIds ?? []).find(
    (id) => api.state.people.get(id)?.alive,
  );
  if (!reporterId) return;
  const yearAgo = addDays(makeIsoDate(api.state.date), -365);
  const done = new Set(
    storiesPrinted(api, outlet.id)
      .filter((s) => s.kind === "profile" && s.date >= yearAgo)
      .flatMap((s) => s.subjectIds),
  );
  const named = new Map<string, number>();
  for (const item of wire)
    for (const id of item.subjectIds)
      if (api.state.people.get(id)?.alive && !done.has(id))
        named.set(id, (named.get(id) ?? 0) + 1);
  const subjectId = [...named]
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        closeness(api, reporterId, b[0]) - closeness(api, reporterId, a[0]) ||
        a[0].localeCompare(b[0]),
    )
    .map(([id]) => id)[0];
  if (!subjectId) return;
  const story = printItem(
    api,
    ctx,
    outlet,
    reporterId,
    {
      id: `profile:${outlet.id}:${subjectId}:${api.state.date}`,
      kind: "profile",
      date: api.state.date,
      level: "nation",
      topic: `person:${subjectId}`,
      desiredChange: "profile",
      ending: false,
      subjectIds: [subjectId],
    },
    null,
  );
  for (const id of ctx.followers(outlet.id))
    if (id !== subjectId)
      touchImpression(api, {
        voterId: id,
        officialId: subjectId,
        act: "interview",
        target: story.slant,
        weight: pressParameter("profileWeight"),
        rapport: 0,
      });
}

/**
 * The town's counted residents who follow an outlet: for a town outlet, its
 * share of the town's adults by their age bands' habits less its named
 * followers; for a national one, its kind's share of the town's counted
 * adults, split among the kind's outlets.
 */
function countedFollowersOf(api: CoreAPI, outlet: OutletRow): number {
  // Counted once a week: the count reads every counted household.
  const cached = countedCache.get(api.state);
  if (
    cached &&
    cached.date <= api.state.date &&
    api.state.date < addDays(makeIsoDate(cached.date), 7)
  ) {
    const held = cached.byOutlet.get(outlet.id);
    if (held !== undefined) return held;
  } else
    countedCache.set(api.state, { date: api.state.date, byOutlet: new Map() });
  const value = countedFollowersNow(api, outlet);
  countedCache.get(api.state)!.byOutlet.set(outlet.id, value);
  return value;
}
/** The town's counted residents by place, read at most once a week. */
function countsThisWeek(api: CoreAPI): ReturnType<typeof residentCounts> {
  const held = countsCache.get(api.state);
  if (
    held &&
    held.date <= api.state.date &&
    api.state.date < addDays(makeIsoDate(held.date), 7)
  )
    return held.rows;
  const rows = residentCounts(api.state as CoreState);
  countsCache.set(api.state, { date: api.state.date, rows });
  return rows;
}
const countsCache = new WeakMap<
  object,
  { date: string; rows: ReturnType<typeof residentCounts> }
>();
const countedCache = new WeakMap<
  object,
  { date: string; byOutlet: Map<string, number> }
>();

function countedFollowersNow(api: CoreAPI, outlet: OutletRow): number {
  if (outlet.tier !== "national")
    return Math.max(
      0,
      countedAudience(api, outlet) - followersOf(api, outlet.id).length,
    );
  const row = NATIONAL.kinds.find((k) => k.kind === outlet.kind);
  if (!row) return 0;
  let adults = 0;
  for (const counts of countsThisWeek(api))
    if (
      counts.placeId === outlet.placeId ||
      counts.placeId === lawChain(api).townPlaceId
    )
      adults += counts.adults;
  return (adults * row.followShare) / Math.max(1, row.audienceLeans.length);
}

/** The candidates on the ballot against a person in their open races. */
function rivalsOf(api: CoreAPI, personId: string): readonly string[] {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return [];
  const out = new Set<string>();
  for (const filing of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [personId]) as unknown as FilingRow[]) {
    if (filing.status !== "on-ballot") continue;
    const contest = contestOf(api, filing.contestId);
    if (!contest || contest.electionDate < api.state.date) continue;
    for (const rival of ballot(api, contest.id))
      if (rival.personId !== personId && rival.status === "on-ballot")
        out.add(rival.personId);
  }
  return [...out].sort();
}

/** Fresh items on the wire, oldest first. */
function freshWire(api: CoreAPI): WireItem[] {
  const out: WireItem[] = [];
  const days = pressParameter("storyFreshDays");
  for (let back = days; back >= 0; back -= 1) {
    const date = addDays(makeIsoDate(api.state.date), -back);
    out.push(
      ...(table(api, "wire").query("byDate", [date]) as unknown as WireItem[]),
    );
  }
  return out;
}

/** The stories an outlet printed, newest first. */
export function storiesPrinted(
  api: CoreAPI,
  outletId: string,
): readonly PrintedStory[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return (
    table(api, "stories").query("byOutlet", [
      outletId,
    ]) as unknown as PrintedStory[]
  )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

/** A town outlet's people: its head and reporters, with their roles. */
export function staffOf(api: CoreAPI, outletId: string): readonly StaffRow[] {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return [];
  return table(api, "staff").query("byOutlet", [
    outletId,
  ]) as unknown as StaffRow[];
}

function pressWeek(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "press-week") return;
  scheduleWeek(api, api.state.date);
  // stopgapId: SG-PEOPLE-press-endorsements
  api.stopgap("SG-PEOPLE-press-endorsements");
  // The week's stories: each reporter files from the fresh wire.
  const wire = freshWire(api);
  // A national outlet covers the nation and the town's own state; a town's
  // council is not its beat.
  const wider = wire.filter((i) => i.level === "nation" || i.level === "state");
  const ctx = deskContext(api);
  for (const outlet of outletsHere(api)) {
    const beat = outlet.tier === "national" ? wider : wire;
    runDesk(api, ctx, outlet, beat);
    if (outlet.kind === "magazine") writeProfile(api, ctx, outlet, beat);
  }
  forgetOldWire(api);
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
  const playerId = (api.state as CoreState).playerId;
  // An invitation the player let pass until the race was over is a refusal.
  if (playerId)
    for (const row of interviewsFor(api, playerId))
      if (
        row.status === "invited" &&
        contestOf(api, row.contestId).electionDate < api.state.date
      )
        refuse(api, row);
  if (!contests.length) return;
  const filings = contests
    .flatMap((c) => ballot(api, c.id))
    .filter((f) => f.status === "on-ballot")
    .map((f) => ({ f, worth: newsworthiness(api, f) }));
  for (const outlet of outletsHere(api))
    // Access: a candidate close to the outlet's reporters is asked first.
    for (const { f, worth } of filings
      .map((row) => ({
        ...row,
        access: Math.max(
          0,
          ...(outlet.reporterIds ?? []).map((id) =>
            closeness(api, id, row.f.personId),
          ),
        ),
      }))
      .sort(
        (a, b) =>
          b.worth + b.access - (a.worth + a.access) ||
          a.f.id.localeCompare(b.f.id),
      )) {
      if (weekCount(api, outlet.id) >= pressParameter("interviewsPerWeek"))
        break;
      if (already(api, outlet.id, f.id)) continue;
      if (worth < newsworthyBar(outlet)) continue;
      const row = arrange(api, f.id, outlet.id, "outlet");
      if (row.status !== "invited" || f.personId === playerId) continue;
      const person = api.state.people.get(f.personId);
      const reporter = row.reporterId ?? "";
      const willing = person
        ? // Every trait's lean, on the trait scale the bar was set on, and
          // how they stand with the reporter who asks.
          parameter("traitScale") *
            decisionLean(
              api.state,
              person,
              "press.accept-interview",
              "accept",
              "decline",
            ) +
          closeness(api, person.id, reporter) -
          grudge(api, person.id, reporter)
        : 0;
      if (willing < pressParameter("interviewShyness")) refuse(api, row);
      else publish(api, row, candidateAnswers(api, row.questions, f));
    }
}

/**
 * A candidate refuses an interview: the refusal is on the record, and the
 * outlet's people take it as a snub that their drives may answer with a
 * grudge (the drives engine decides, from each one's traits).
 */
function refuse(api: CoreAPI, row: InterviewRow): InterviewRow {
  const done = record(api, {
    ...row,
    status: "declined",
    reason: "candidate-declined",
  });
  snubbed(api, "press.snubbed", row.outletId, row.candidateId, row.id);
  return done;
}

function snubbed(
  api: CoreAPI,
  kind: "press.snubbed" | "press.attacked",
  outletId: string,
  byId: string,
  sourceId: string,
): void {
  const outlet = table(api, "outlets").get(outletId) as unknown as
    OutletRow | undefined;
  if (!outlet || !api.state.people.has(byId)) return;
  const staff = [
    outlet.ownerId,
    outlet.headId,
    ...(outlet.reporterIds ?? []),
  ].filter((id): id is string => !!id && !!api.state.people.get(id)?.alive);
  if (!staff.length) return;
  api.emit({
    id: `${kind}:${sourceId}`,
    date: api.state.date,
    kind,
    personIds: staff,
    placeId: outlet.placeId,
    // The one who snubbed or attacked them is the responsible party.
    topic: byId,
    desiredChange: kind,
    facts: { outletId, byId },
    source: {
      tag: "SOURCED",
      citation: `${kind === "press.snubbed" ? "Interview refused" : "Speech against the outlet"}: ${sourceId}`,
      asOf: api.state.date,
    },
  });
}

/** The player turns down an interview an outlet offered. */
export function declineInterview(
  api: CoreAPI,
  interviewId: string,
): InterviewRow {
  const row = table(api, "interviews").get(interviewId) as unknown as
    InterviewRow | undefined;
  if (!row || row.status !== "invited")
    throw new Error(`No interview waiting: ${interviewId}`);
  return refuse(api, row);
}

/**
 * A speech against an outlet: those in the room hear it as a speech on the
 * outlet (their stance on it moves toward distrust, nearest the speaker's
 * lean most), and the outlet's people take it as an attack their drives may
 * answer with a grudge. Followers who come to distrust the outlet drift to
 * another of its kind.
 */
export function attackOutlet(
  api: CoreAPI,
  input: {
    readonly speakerId: string;
    readonly outletId: string;
    readonly audienceIds: readonly string[];
  },
): string {
  const outlet = table(api, "outlets").get(input.outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) throw new Error(`No outlet ${input.outletId}`);
  const id = `speech:${input.speakerId}:${api.state.date}:attack:${outlet.organizationId}`;
  if (api.state.modules.has(SPEECH_MODULE_ID))
    deliverSpeech(api, {
      id,
      speakerId: input.speakerId,
      placeId: outlet.placeId,
      topic: outlet.organizationId,
      desiredChange: DISTRUST,
      audienceIds: input.audienceIds,
    });
  snubbed(api, "press.attacked", outlet.id, input.speakerId, id);
  followCache.delete(api.state);
  return id;
}
