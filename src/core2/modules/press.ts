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
import { coreAPI, fillInPerson, registerModule } from "../state";
import { addDays, daysBetweenText, makeIsoDate } from "../kernel/dates";
import { spendLivingCost } from "../official-living";
import { keepsWhy } from "../why-kept";
import {
  decisionLean,
  decisionTraitWeight,
  leanedScore,
  leanedYes,
  reportOutcome,
} from "../trait-decisions";
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
  countedResidents,
  countedResidentsOf,
  engagementOf,
  NATIONAL_ENGAGEMENT,
} from "../electorate";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  standing,
  type ContestRow,
  type FilingRow,
} from "./elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  campaignRecognition,
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
import { familyRelation } from "../closeness";
import {
  awardsOn,
  CONTRACTS_MODULE_ID,
  OWNER_RELATION,
  type ContractAwardRow,
} from "./contracts";
import { type Stance as ViewStance } from "./views";
import { candidateStance } from "../campaign-stances";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { JOBS_MODULE_ID, registerEmployer } from "./jobs";
import { BUSINESS_MODULE_ID, enrollBusinessOwner, ownerOf } from "./business";
import {
  PLATFORM_QUESTIONS,
  publicOffset,
  questionAxis,
  type Stance,
} from "../campaign-views";
import {
  hireStaffMember,
  nationalOutletName,
  outletName,
  STAFF_ROLES,
  type StaffRow,
} from "../press-staff";
import { countedLean, stancesOf, viewOf, VIEWS_MODULE_ID } from "./views";
import { residentCounts, residentsRuntime } from "./residents";
import { openingEmployerCashBufferPrior } from "../opening-capital";
import { employerTaxShareOfWage } from "./employer-taxes";
import {
  adBudgetMonthMinor,
  installOutletMoney,
  outletYearlyRevenue,
  outsideCustomersOf,
  payWiderAudience,
  type OutletMoneyDeps,
} from "../press-money";
import { countedJobHeads, countedJobsOf } from "../residents-economy";
import { pressStaffChanged } from "../press-conflict";
import { isPolicyTopic, wireItem, type WireItem } from "../press-topics";
import {
  archiveItem,
  closeness,
  grudge,
  printItem,
  regard,
  runDesk,
  slantOf,
  type DeskContext,
  type PrintedStory,
} from "../press-desk";
import type { Story } from "./news";
import { worldLevel } from "../world-draw";

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
  /** The race's filing; null for an officeholder between races. */
  readonly filingId: string | null;
  readonly contestId: string | null;
  readonly askedBy: "candidate" | "outlet";
  readonly date: string;
  readonly status: "invited" | "declined" | "published";
  /**
   * Why it was declined: by the outlet (room, newsworthiness, its people's
   * regard and its readers' interest) or the one asked.
   */
  readonly reason:
    | "no-room"
    | "not-newsworthy"
    | "not-interested"
    | "already-interviewed"
    | "race-over"
    | "no-standing"
    | "candidate-declined"
    | null;
  /** How the outlet weighed an ask (`outletInterest`), when one asked it. */
  readonly interest?: OutletInterest | null;
  readonly questions: readonly string[];
  readonly answers: readonly InterviewAnswer[];
  readonly audience: number;
  readonly newsworthiness: number;
  /** The outlet's reporter who asks: the one closest to the candidate. */
  readonly reporterId?: string | null;
  /** The story the outlet printed from it. */
  readonly storyId?: string | null;
  /**
   * Why the candidate accepted or declined, kept where why is kept: the share
   * of the town that follows the outlet, whether they hold the seat, their
   * closeness to the reporter and any grudge, and their trait lean toward
   * accepting before the weight.
   */
  readonly acceptReasons?: {
    readonly reach: number;
    readonly incumbent: boolean;
    readonly closeness: number;
    readonly grudge: number;
    readonly lean: number;
  };
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

export interface PlaceNews {
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

/**
 * The local outlets of each kind a state's published counts give a town, not
 * yet rounded (Medill 2024, FCC 2025; the state split is estimated):
 * calibration for the world's draw and its checks, never read by play.
 */
export function publishedOutletLevels(
  counts: PlaceNews | undefined,
  countyShare: number,
): Record<LocalKind, number> {
  return counts
    ? {
        newspaper: counts.newspapers * countyShare,
        television: counts.tvStations / Math.max(1, counts.tvMarkets),
        radio:
          counts.radioStations * pressParameter("newsRadioShare") * countyShare,
      }
    : { newspaper: 0, television: 0, radio: 0 };
}

/**
 * How many outlets of each kind this world's town has: the published level
 * moved by the world's own draw, rounded, and never below one where the
 * published count is at least one (owner, Oct 27: realistic, not real).
 */
export function worldOutletCounts(
  seed: string,
  counts: PlaceNews | undefined,
  countyShare: number,
): Record<LocalKind, number> {
  const published = publishedOutletLevels(counts, countyShare);
  const draw = (kind: LocalKind) => {
    const level = Math.round(
      worldLevel(
        published[kind],
        seed,
        `press-world:${kind}`,
        "pressWorldOutletSpreadShare",
      ),
    );
    return Math.round(published[kind]) >= 1 ? Math.max(1, level) : level;
  };
  return {
    newspaper: draw("newspaper"),
    television: draw("television"),
    radio: draw("radio"),
  };
}

export const PRESS_MODULE: CoreModule = {
  id: PRESS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      outlets: {},
      employerEnrollment: {},
      /** Each local outlet's money by month, by who paid it. */
      revenueMonths: { indexes: { byOutlet: { fields: ["outletId"] } } },
      /** The ads the town's businesses bought, with the payment each rode on. */
      adBuys: {
        indexes: {
          byOutlet: { fields: ["outletId"] },
          byAdvertiser: { fields: ["advertiserId"] },
        },
      },
      staff: { indexes: { byOutlet: { fields: ["outletId"] } } },
      wire: { indexes: { byDate: { fields: ["date"] } } },
      digs: {},
      tips: {},
      // Stories the press wrote about the year before day one.
      archive: { indexes: { byOutlet: { fields: ["outletId"] } } },
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
      /** Who was told of a hidden act, by the telling's event: what a leaker knows. */
      told: { indexes: { byCrime: { fields: ["crimeId"] } } },
    },
  },
  onDay: enrollPressEmployers,
  onCalendarWork: (api, work) => {
    if (work.kind === "press-dig") checkClaim(api, work);
    else pressWeek(api, work);
  },
  eventKinds: ["*"],
  onEvent(api, event) {
    // The one invited answers in the scene the invitation stages.
    if (event.kind === "scene.reply") {
      answerInvitation(api, event);
      return;
    }
    // A hidden act someone was just told of may reach a reporter.
    if (event.kind === "crime.told") {
      const crimeKey = Object.keys(event.facts ?? {}).find((k) =>
        k.startsWith("crime:"),
      );
      if (crimeKey)
        table(api, "told").put({
          id: event.id,
          crimeId: crimeKey.slice("crime:".length),
          personIds: [...event.personIds, ...(event.witnessIds ?? [])],
        } as unknown as ModuleRow);
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
 * What an outlet's own open jobs are paid in a year: each full job at its work
 * schedule's weekly hours, and each counted job at its daily wage times the
 * jobs it stands for, as the payroll and wage flows pay them.
 */
function outletPayrollYearMinor(api: CoreAPI, organizationId: string): number {
  const core = api.state as CoreState;
  let total = 0;
  for (const id of core.finance.jobsByOrganization.get(organizationId) ?? []) {
    const job = core.jobs.get(id);
    if (!job || job.endsAt !== undefined) continue;
    for (const commitmentId of core.work.commitmentsByPerson.get(
      job.personId,
    ) ?? []) {
      const commitment = core.work.commitments.get(commitmentId);
      if (commitment?.jobId !== job.id || commitment.endsAt !== undefined)
        continue;
      total +=
        ((commitment.hourlyMinor * commitment.expectedWeeklyMinutes) / 60) *
        pressParameter("weeksPerYear");
    }
  }
  for (const job of countedJobsOf(core, organizationId))
    total +=
      job.wageDailyMinor *
      api.parameter("jobsDaysPerYear") *
      countedJobHeads(core, job);
  return total;
}

/** What an outlet's people in town cost in a month: their pay, the employer's payroll taxes on it and its margin. */
export function outletMonthlyCostMinor(
  api: CoreAPI,
  outlet: OutletRow,
): number {
  const payroll = outletPayrollYearMinor(api, outlet.organizationId);
  const payTaxShare = employerTaxShareOfWage(
    api,
    pressParameter("reporterAnnualPayMinor"),
  );
  return (
    (payroll * (1 + payTaxShare + pressParameter("bureauMarginShare"))) /
    pressParameter("monthsPerYear")
  );
}

/** The counted adults who follow an outlet: its audience less its full followers. */
function countedReadersOf(api: CoreAPI, outlet: OutletRow): number {
  return Math.max(
    0,
    countedAudience(api, outlet) - followersOf(api, outlet.id).length,
  );
}

/**
 * What an outlet can expect to take in a year: its readers' subscriptions and
 * its share of the town's businesses' ads at their cash today, and at least
 * what its people here cost where its wider audience makes up the rest.
 */
function expectedRevenueYearMinor(api: CoreAPI, outlet: OutletRow): number {
  const core = api.state as CoreState;
  const months = pressParameter("monthsPerYear");
  const local = outletsHere(api).filter((o) => o.tier !== "national");
  const audience = (o: OutletRow) => countedAudience(api, o);
  const total = local.reduce((n, o) => n + audience(o), 0);
  const subscriptions =
    outlet.kind === "newspaper"
      ? audience(outlet) *
        pressParameter("newspaperRevenuePerFollowerYear") *
        pressParameter("newspaperCirculationShare")
      : 0;
  let ads = 0;
  if (total > 0)
    for (const id of core.finance.businessesByPlace.get(outlet.placeId) ?? [])
      if (!local.some((o) => o.organizationId === id))
        ads += adBudgetMonthMinor(api, id) * months;
  const town =
    subscriptions + (total > 0 ? (ads * audience(outlet)) / total : 0);
  const floor = outsideCustomersOf(core, outlet.placeId)
    ? outletMonthlyCostMinor(api, outlet) * months
    : 0;
  return Math.round(Math.max(town, floor));
}

/** What the money side reads of the press: its outlets, their audiences and costs. */
function outletMoneyDeps(api: CoreAPI): OutletMoneyDeps {
  // A closed outlet is paid by no one.
  const local = () =>
    outletsHere(api).filter(
      (o) =>
        o.tier !== "national" &&
        !api.state.finance.businesses.get(o.organizationId)?.closedAt,
    );
  return {
    moduleId: PRESS_MODULE_ID,
    townPlaceId: () => lawChain(api).townPlaceId,
    outlets: local,
    followers: (id) => followersOf(api, id),
    countedFollowers: (id) => {
      const outlet = local().find((o) => o.id === id);
      return outlet ? countedReadersOf(api, outlet) : 0;
    },
    subscriptionYearMinor:
      pressParameter("newspaperRevenuePerFollowerYear") *
      pressParameter("newspaperCirculationShare"),
    adShareOfCosts: pressParameter("advertisingShareOfCosts"),
    localNewsShareOfAds: pressParameter("localNewsShareOfAdvertising"),
    monthlyCostMinor: (id) => {
      const outlet = local().find((o) => o.id === id);
      return outlet ? outletMonthlyCostMinor(api, outlet) : 0;
    },
    source: {
      tag: "ESTIMATED",
      citation:
        "src/core2/data/press/parameters.json: a paper's circulation revenue per reader (Pew newspapers fact sheet 2022); businesses' advertising share of costs (IRS SOI 2022 Table 2.1) and the local news share of it (Pew 2022)",
      asOf: api.state.date,
      estimatedFrom: "subscriptions and advertising",
    },
  };
}

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
  const wanted = worldOutletCounts(core.seed, counts, share);
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
    if (!api.state.organizations.has(organizationId)) {
      // A local outlet opens with the cash a small firm holds against its
      // payroll (JPMorgan Chase Institute's buffer days, at this firm's
      // stable startup rank), as the town's generated firms do; otherwise its
      // second payday falls before its first month's revenue arrives.
      const payrollMinor =
        (headRole.payParameter ? pressParameter(headRole.payParameter) : 0) +
        (reporterRole.payParameter
          ? spec.reporters * pressParameter(reporterRole.payParameter)
          : 0);
      const bufferDays =
        spec.tier === "local"
          ? openingEmployerCashBufferPrior(
              core.seed,
              organizationId,
              "all-small-businesses",
            ).bufferDays
          : 0;
      api.addOrganization({
        id: organizationId,
        placeId: basedAt,
        name: spec.name,
        kind: "media",
        liquidMinor: Math.round(
          (bufferDays * payrollMinor) / pressParameter("daysPerYear"),
        ),
        source:
          spec.tier === "local"
            ? {
                tag: "ESTIMATED",
                citation:
                  "JPMorgan Chase Institute, Cash Is King (2016): a small firm's cash buffer in days of outflows, at this outlet's stable startup rank (src/core2/opening-capital.ts), times its planned payroll per day",
                asOf: api.state.date,
                estimatedFrom: "opening employer cash buffer prior",
              }
            : source,
      });
    }
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
    // A station covers a market: its news director works at the station in
    // the market's city (the state, here); its reporter is the one on the
    // town. A local paper's editor works in town.
    const headHome =
      spec.tier === "local" && spec.kind !== "newspaper"
        ? chain.stateKey
        : staffHome;
    const ownerId = hire(ownerRole, 0, spec.ownerLivesAt);
    const headId = hire(headRole, 0, headHome);
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
  pressStaffChanged(api);
  // Revenue: its readers' subscriptions and the town's businesses' ads, each
  // paid from the payer's own account. A national outlet's money is outside
  // the town's economy.
  installOutletMoney(api, outletMoneyDeps(api));
  for (const outlet of outletsHere(api)) {
    if (outlet.tier === "national") continue;
    table(api, "outlets").put({
      ...outlet,
      audienceRevenueMinor: expectedRevenueYearMinor(api, outlet),
    } as unknown as ModuleRow);
  }
  scheduleWeek(api, api.state.date);
  pressStaffChanged(api);
  return outletsHere(api);
}

/** Enroll after the business engine opens, preserving the already recorded publisher. */
function enrollPressEmployers(api: CoreAPI): void {
  const core = api.state as CoreState;
  if (
    !core.modules.has(BUSINESS_MODULE_ID) ||
    !core.modules.has(JOBS_MODULE_ID)
  )
    return;
  const business = api.moduleState(BUSINESS_MODULE_ID);
  if (
    !business.table("state").get("business:state") ||
    !api.moduleState(JOBS_MODULE_ID).table("state").get("jobs:state")
  )
    return;
  const enrolled = table(api, "employerEnrollment");
  for (const outlet of outletsHere(api)) {
    if (outlet.tier === "national" || enrolled.get(outlet.id)) continue;
    const anchor = [
      ...(core.finance.businessesByPlace.get(outlet.placeId) ?? []),
    ]
      .map((id) => core.finance.businesses.get(id)!)
      .find((book) => book.openingTownIncomeMinor > 0);
    const owner = outlet.ownerId ? core.people.get(outlet.ownerId) : undefined;
    if (!anchor || !owner?.alive) continue;
    const jobs = [
      ...(core.finance.jobsByOrganization.get(outlet.organizationId) ?? []),
    ]
      .map((id) => core.jobs.get(id)!)
      .filter((job) => job.endsAt === undefined);
    if (!jobs.length || core.finance.businesses.has(outlet.organizationId))
      continue;
    const payroll = Math.round(
      outletPayrollYearMinor(api, outlet.organizationId),
    );
    // Its demand is the revenue it can expect (subscriptions, ads and its
    // wider audience's part); an actual income anchor prevents manufactured
    // zero demand. Its costs other than its people are not on its books.
    // stopgapId: SG-PEOPLE-press-outlet-other-costs
    api.stopgap("SG-PEOPLE-press-outlet-other-costs");
    api.addBusinessBooks({
      organizationId: outlet.organizationId,
      kindId: "information",
      annualPayrollMinor: payroll,
      annualDemandMinor: outlet.audienceRevenueMinor,
      annualOtherCostsMinor: 0,
      openingTownIncomeMinor: anchor.openingTownIncomeMinor,
      capacityMinor: outlet.audienceRevenueMinor,
      price: api.parameter("one"),
      costContractIds: [],
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: `Press payroll and expected subscription and advertising revenue; town income anchor from ${anchor.organizationId}.`,
        estimatedFrom: "expected revenue",
      },
    });
    enrollBusinessOwner(api, {
      organizationId: outlet.organizationId,
      ownerId: owner.id,
      basis: "press-recorded-owner",
    });
    registerEmployer(api, outlet.organizationId, jobs.length);
    enrolled.put({
      id: outlet.id,
      ownerId: owner.id,
      incomeAnchorRecordId: anchor.organizationId,
      date: core.date,
    });
  }
}

/**
 * How many of the town's adults, counted and full, follow an outlet: its
 * kind's share of each age band (Pew 2024), split evenly among the kind's
 * outlets.
 */
function countedAudience(api: CoreAPI, outlet: OutletRow): number {
  const town = outlet.placeId;
  const own = outletsHere(api).filter((o) => o.kind === outlet.kind).length;
  const adultAge = api.parameter("votingAge");
  let total = 0;
  for (const row of countsThisMonth(api)) {
    if (row.placeId !== town) continue;
    for (const [bandKey, people] of Object.entries(row.byAgeBand ?? {})) {
      const low = Number(bandKey.split("-")[0]);
      if (!Number.isFinite(low) || low < adultAge) continue;
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

/**
 * The outlet that carries the town's public record: the town's own
 * newspaper, else its first local outlet. Null where no press is installed.
 */
export function townOutlet(api: CoreAPI): OutletRow | null {
  const local = outletsHere(api).filter((o) => o.tier === "local");
  return (
    local.find((o) => o.kind === "newspaper" && o.index === 0) ??
    local[0] ??
    null
  );
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

/**
 * How much a person keeps up with the news: how closely they follow politics
 * (their view's engagement, against the nation's) plus every trait's lean
 * toward keeping up over letting it go, at the decision's weight.
 */
export const habitScore = (p: Readonly<PersonState>, core: CoreState) => {
  const engaged =
    (engagementOf(core, p) ?? NATIONAL_ENGAGEMENT) - NATIONAL_ENGAGEMENT;
  const lean = decisionLean(core, p, "press.follow-news", "follow", "skip");
  const term = decisionTraitWeight(core, "press.follow-news") * lean;
  // The audit's probe (off in play) sees the habit with and without the trait term.
  reportOutcome("press.follow-news", p.id, lean, "size", (withTerm) =>
    withTerm ? engaged + term : engaged,
  );
  return engaged + term;
};

const followCache = new WeakMap<
  object,
  { date: string; map: Map<string, readonly string[]> }
>();

/**
 * Each adult's habit, worked out once and kept: a person's engagement and
 * traits do not change after they are built, and the audiences are rebuilt
 * every week and sorted by it.
 */
const habitScores = new WeakMap<object, Map<string, number>>();
function habitOf(api: CoreAPI, p: PersonState) {
  let scores = habitScores.get(api.state);
  if (!scores) habitScores.set(api.state, (scores = new Map()));
  let score = scores.get(p.id);
  if (score === undefined) {
    score = habitScore(p, api.state as CoreState);
    scores.set(p.id, score);
  }
  return score;
}

/**
 * The town's full adults who follow a kind of local news: in each age band,
 * the share that follows that kind (Pew 2024), its most dutiful and
 * deliberate members first.
 */
function audienceOfKind(api: CoreAPI, kind: OutletKind): readonly string[] {
  const town = lawChain(api).townPlaceId;
  const date = api.state.date;
  const adultAge = api.parameter("votingAge");
  const bands = new Map<Band, PersonState[]>();
  for (const id of api.state.peopleByPlace.get(town) ?? []) {
    const p = api.state.people.get(id);
    if (!p?.alive) continue;
    const age = ageOn(p, date);
    if (age < adultAge) continue;
    const band = bandOf(age);
    const list = bands.get(band) ?? [];
    list.push(p);
    bands.set(band, list);
  }
  const habit = (p: PersonState) => habitOf(api, p);
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
  for (const kind of ALL_KINDS) {
    const own = outlets.filter((o) => o.kind === kind);
    if (!own.length) continue;
    const lists = new Map<string, string[]>(own.map((o) => [o.id, []]));
    const views = api.state.modules.has(VIEWS_MODULE_ID);
    for (const id of audienceOfKind(api, kind)) {
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
 * Where a campaign buys an ad: the town's own outlet with the widest
 * audience, television first where audiences tie. A national outlet's
 * audience in town is not sold to a town's race.
 */
function adOutlet(api: CoreAPI): {
  organizationId: string;
  followerIds: readonly string[];
  countedFollowers: number;
} | null {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return null;
  const best = outletsHere(api)
    .filter((o) => o.tier !== "national")
    .map((o) => ({ o, followers: followersOf(api, o.id) }))
    .sort(
      (a, b) =>
        b.followers.length - a.followers.length ||
        ALL_KINDS.indexOf(b.o.kind) - ALL_KINDS.indexOf(a.o.kind) ||
        a.o.id.localeCompare(b.o.id),
    )[0];
  return best
    ? {
        organizationId: best.o.organizationId,
        followerIds: best.followers,
        countedFollowers: countedFollowers(api, best.o.id),
      }
    : null;
}

/**
 * The town's counted adults by age band, counted once a week: the count walks
 * every counted resident, and a campaign asks for an outlet's audience many
 * times a day while the adults change slowly (the same week the followers of
 * an outlet are held, `countedFollowersOf`).
 */
function townAdultsByBand(api: CoreAPI): ReadonlyMap<Band, number> {
  const held = adultsCache.get(api.state);
  if (
    held &&
    held.date <= api.state.date &&
    api.state.date < addDays(makeIsoDate(held.date), 7)
  )
    return held.adults;
  const town = lawChain(api).townPlaceId;
  const date = api.state.date;
  const adultAge = api.parameter("votingAge");
  const adults = new Map<Band, number>();
  for (const voter of countedResidentsOf(api.state as CoreState, town)) {
    const age = ageOn(voter, date);
    if (age < adultAge) continue;
    const band = bandOf(age);
    adults.set(band, (adults.get(band) ?? 0) + voter.weight);
  }
  adultsCache.set(api.state, { date, adults });
  return adults;
}
const adultsCache = new WeakMap<
  object,
  { date: string; adults: ReadonlyMap<Band, number> }
>();

/**
 * The counted adults in town who follow an outlet: the same rule as the full
 * people (in each age band the share that follows its kind, Pew 2024), times
 * each counted household's weight, and the outlet's slice of its kind's
 * followers is the slice the full people's choice gives it (selective
 * exposure), so one rule reads both tiers.
 */
export function countedFollowers(api: CoreAPI, outletId: string): number {
  const outlet = table(api, "outlets").get(outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) return 0;
  const national = NATIONAL.kinds.find((row) => row.kind === outlet.kind);
  const adults = townAdultsByBand(api);
  let ofKind = 0;
  for (const [band, count] of adults) {
    const share = national
      ? national.followShare
      : (NEWS.habits.byAge[band]?.[HABIT[outlet.kind as LocalKind]] ?? 0);
    ofKind += Math.round(share * count);
  }
  const same = outletsHere(api).filter((o) => o.kind === outlet.kind);
  const all = same.reduce((sum, o) => sum + followersOf(api, o.id).length, 0);
  const slice = all
    ? followersOf(api, outletId).length / all
    : 1 / Math.max(1, same.length);
  return Math.round(ofKind * slice);
}

function contestOf(api: CoreAPI, contestId: string): ContestRow {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
}

/**
 * Who an interview is with: a candidate on the ballot (their filing) or an
 * officeholder between races (no filing; their party from the seat they
 * hold).
 */
export interface Speaker {
  readonly personId: string;
  readonly party: string | null;
  readonly filing: FilingRow | null;
}

function asSpeaker(who: FilingRow | Speaker): Speaker {
  return "filing" in who
    ? who
    : { personId: who.personId, party: who.party ?? null, filing: who };
}

function servingTerms(api: CoreAPI, personId: string): readonly TermRow[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [personId]) as unknown as TermRow[]
  ).filter((t) => t.status === "serving");
}

/** An officeholder as a speaker, or null for someone who holds no seat. */
export function officeholderSpeaker(
  api: CoreAPI,
  personId: string,
): Speaker | null {
  const term = servingTerms(api, personId)[0];
  return term ? { personId, party: term.party ?? null, filing: null } : null;
}

function platformOf(api: CoreAPI, who: FilingRow | Speaker): readonly Stance[] {
  const filing = asSpeaker(who).filing;
  // Between races there is no platform; the record and their views speak.
  if (!filing) return [];
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
 * How much of the town knows a candidate: the people who've heard of them and
 * the counted households their mail reached (`campaignRecognition`).
 */
function knownShare(api: CoreAPI, filing: FilingRow): number {
  if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return 0;
  const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
  if (campaigns.table("campaigns").get(filing.id))
    return campaignRecognition(api, filing.id);
  const adults =
    [...(api.state.peopleByPlace.get(lawChain(api).townPlaceId) ?? [])]
      .length || 1;
  return (
    (
      campaigns
        .table("impressions")
        .query("byCandidate", [filing.personId]) as unknown as ImpressionRow[]
    ).filter((i) => i.heardOf).length / adults
  );
}

/**
 * A candidate's case for accepting an interview, before temperament: a base,
 * the share of the town the outlet reaches, less a sitting official's
 * reluctance, and how they stand with the reporter who asks.
 */
export function acceptCase(reasons: {
  readonly reach: number;
  readonly incumbent: boolean;
  readonly closeness: number;
  readonly grudge: number;
}): number {
  return (
    pressParameter("interviewAcceptBase") +
    pressParameter("interviewReachWeight") * Math.min(1, reasons.reach) -
    (reasons.incumbent ? pressParameter("interviewIncumbentReluctance") : 0) +
    reasons.closeness -
    reasons.grudge
  );
}

/**
 * How newsworthy a candidate is to a reporter: how many people in town have
 * heard of them, whether they hold the seat, and their share of the money
 * raised in the race.
 */
export function newsworthiness(api: CoreAPI, who: FilingRow | Speaker): number {
  const speaker = asSpeaker(who);
  const filing = speaker.filing;
  const officeWorth = servingTerms(api, speaker.personId).reduce(
    (highest, term) => {
      const office = api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(term.officeId) as unknown as
        { kind: string; level: string } | undefined;
      if (!office) return highest;
      const key = `officeNewsworthiness:${office.kind}`;
      const fallback = `officeNewsworthiness:${office.level}`;
      return Math.max(
        highest,
        pressParameter(key in PARAMETERS ? key : fallback),
      );
    },
    0,
  );
  if (!filing) {
    // An officeholder between races: who has heard of them, and the seat.
    const campaigns = api.state.modules.has(CAMPAIGNS_MODULE_ID)
      ? api.moduleState(CAMPAIGNS_MODULE_ID)
      : null;
    const adults =
      api.state.peopleByPlace.get(lawChain(api).townPlaceId)?.size || 1;
    // Each voter once, across the races they were met in.
    const known = campaigns
      ? new Set(
          (
            campaigns
              .table("impressions")
              .query("byCandidate", [
                speaker.personId,
              ]) as unknown as ImpressionRow[]
          )
            .filter((i) => i.heardOf)
            .map((i) => i.voterId),
        ).size / adults
      : 0;
    return (
      officeWorth +
      Math.min(1, known) +
      (servingTerms(api, speaker.personId).length
        ? pressParameter("incumbentNewsworthiness")
        : 0)
    );
  }
  const contest = contestOf(api, filing.contestId);
  const campaigns = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? api.moduleState(CAMPAIGNS_MODULE_ID)
    : null;
  const known = knownShare(api, filing);
  const raised = (f: FilingRow) =>
    (
      campaigns?.table("campaigns").get(f.id) as unknown as
        CampaignRow | undefined
    )?.raisedMinor ?? 0;
  const total = ballot(api, contest.id).reduce((s, f) => s + raised(f), 0);
  return (
    officeWorth +
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
  who: FilingRow | Speaker,
  platform: readonly Stance[],
  question: string,
): number {
  const { personId, party } = asSpeaker(who);
  return (
    platform.find((s) => s.question === question)?.position ??
    candidateStance(api, personId, party, question) ??
    0
  );
}

const concernCache = new WeakMap<
  object,
  { date: string; map: Map<string, number> }
>();

/**
 * Where a candidate stands on a question, as a reporter reads it: what they
 * said in the campaign, else how they last voted on it, else their own view
 * blended with their party's; 0 where none says.
 */
export function standingOn(
  api: CoreAPI,
  who: FilingRow | Speaker,
  question: string,
): {
  position: number;
  from: "platform" | "vote" | "party" | "none";
  recordId: string | null;
} {
  const { personId, party } = asSpeaker(who);
  const stated = platformOf(api, who).find((s) => s.question === question);
  if (stated)
    return { position: stated.position, from: "platform", recordId: null };
  const vote = votesOf(api, personId)
    .filter((v) => v.stance.question === question)
    .at(-1);
  if (vote)
    return { position: vote.stance.position, from: "vote", recordId: vote.id };
  // Their own view blended with their party's (GOV's campaign stances).
  const stance = candidateStance(api, personId, party, question);
  return stance === null
    ? { position: 0, from: "none", recordId: null }
    : { position: stance, from: "party", recordId: null };
}

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
 * and weeks ask different things. The press adds its own reads: a vote
 * that broke with the candidate's party, how far the candidate stands from
 * the asking outlet's line on what its readers care about (a hostile outlet
 * asks where the candidate is weakest with its audience), and the cause the
 * asking reporter is driven on.
 */
export function interviewQuestions(
  api: CoreAPI,
  who: FilingRow | Speaker,
  outlet?:
    | (Pick<OutletRow, "id" | "lean"> & Partial<Pick<OutletRow, "reporterIds">>)
    | null,
): readonly string[] {
  const score = new Map<string, number>();
  const add = (q: string | undefined, weight: number) => {
    if (q) score.set(q, (score.get(q) ?? 0) + weight);
  };
  const speaker = asSpeaker(who);
  const filing = speaker.filing;
  const personId = speaker.personId;
  for (const p of promisesOf(api, personId))
    if (p.status === "broken")
      add(p.promise.stance.question, pressParameter("brokenPromiseNewsWeight"));
  // The seat's record: the race's incumbent, or an officeholder between races.
  const holds = filing
    ? isIncumbent(api, contestOf(api, filing.contestId), personId)
    : servingTerms(api, personId).length > 0;
  if (holds)
    for (const vote of votesOf(api, personId).slice(
      -pressParameter("recordVotesConsidered"),
    ))
      add(vote.stance.question, pressParameter("recordVoteNewsWeight"));
  // The candidate's party: a recorded vote against their party's side.
  const side = partySide(speaker.party);
  if (side)
    for (const v of votesOf(api, personId))
      if (
        Math.sign(v.stance.position) ===
        -side * Math.sign(questionAxis(v.stance.question))
      )
        add(v.stance.question, pressParameter("partyBreakNewsWeight"));
  const own = platformOf(api, speaker);
  const rivals = filing
    ? ballot(api, filing.contestId).filter((f) => f.id !== filing.id)
    : [];
  const questions = [
    ...new Set([
      ...PLATFORM_QUESTIONS,
      ...own.map((s) => s.question),
      ...rivals.flatMap((r) => platformOf(api, r).map((s) => s.question)),
    ]),
  ].sort();
  const mine = new Map(
    questions.map((q) => [q, statedPosition(api, speaker, own, q)]),
  );
  // The asking outlet's readers: how far the candidate stands from the side
  // the outlet's line takes, on what its followers care about.
  if (outlet) {
    const followers = followersOf(api, outlet.id);
    for (const q of questions) {
      const care = followers.length
        ? followers.reduce(
            (s, id) => s + Math.abs((leanOf(api, id) / 2) * questionAxis(q)),
            0,
          ) / followers.length
        : 0;
      const line = Math.sign((outlet.lean / 2) * questionAxis(q));
      add(
        q,
        (pressParameter("outletReadersNewsWeight") *
          care *
          Math.abs(line - standingOn(api, speaker, q).position)) /
          2,
      );
    }
  }
  // The asking reporter's own causes on a policy question.
  const reporterId = outlet?.reporterIds
    ? reporterFor(
        api,
        outlet as OutletRow,
        personId,
        asSpeaker(who).filing?.contestId ?? null,
      )
    : null;
  const reporter = reporterId ? api.state.people.get(reporterId) : undefined;
  if (reporter)
    for (const d of reporter.drives.values())
      if (d.kind === "cause" && isPolicyTopic(d.topic))
        add(d.topic, pressParameter("reporterCauseNewsWeight") * d.strength);
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
        Math.max(
          0,
          Math.abs(questionAxis(q)) - Math.abs(publicOffset(q, api.state.seed)),
        ),
    );
  }
  // Asked before, on the record: less to learn from asking again.
  const asked = new Map<string, number>();
  for (const row of table(api, "interviews").query("byCandidate", [
    personId,
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

/** Whether an outlet talked with this person within the last stretch. */
function talkedLately(api: CoreAPI, outletId: string, personId: string) {
  const since = addDays(
    makeIsoDate(api.state.date),
    -pressParameter("interviewAgainDays"),
  );
  return (
    table(api, "interviews").query("byCandidate", [
      personId,
    ]) as unknown as InterviewRow[]
  ).some(
    (i) =>
      i.outletId === outletId && i.status !== "declined" && i.date >= since,
  );
}

function record(api: CoreAPI, row: InterviewRow): InterviewRow {
  table(api, "interviews").put(row as unknown as ModuleRow);
  return row;
}

/** How an outlet weighs someone asking it for an interview. */
export interface OutletInterest {
  /** How newsworthy they are (`newsworthiness`). */
  readonly worth: number;
  /** The editor's regard for them, weighted. */
  readonly head: number;
  /** The owner's regard for them, weighted. */
  readonly owner: number;
  /** The share of the outlet's followers who have heard of them, weighted. */
  readonly readers: number;
  readonly total: number;
}

/**
 * How much an outlet wants to talk with someone who asks: how newsworthy
 * they are, its editor's and owner's regard for them (closeness, a grudge,
 * how near their views sit), and how many of its followers know who they
 * are.
 */
export function outletInterest(
  api: CoreAPI,
  outlet: OutletRow,
  speaker: Speaker,
): OutletInterest {
  const p = pressParameter;
  const regardOf = (id: string | null) =>
    id && api.state.people.get(id)?.alive
      ? regard(api, p, id, speaker.personId)
      : 0;
  const worth = newsworthiness(api, speaker);
  const head = p("interestHeadWeight") * regardOf(outlet.headId);
  const owner = p("slantOwnerWeight") * regardOf(outlet.ownerId);
  const followers = followersOf(api, outlet.id);
  const heard =
    followers.length && api.state.modules.has(CAMPAIGNS_MODULE_ID)
      ? new Set(
          (
            api
              .moduleState(CAMPAIGNS_MODULE_ID)
              .table("impressions")
              .query("byCandidate", [
                speaker.personId,
              ]) as unknown as ImpressionRow[]
          )
            .filter((i) => i.heardOf)
            .map((i) => i.voterId),
        )
      : new Set<string>();
  const readers =
    p("interestReadersWeight") *
    (followers.length
      ? followers.filter((id) => heard.has(id)).length / followers.length
      : 0);
  return { worth, head, owner, readers, total: worth + head + owner + readers };
}

/**
 * A candidate or an officeholder asks an outlet for an interview, at any
 * time. A candidate asks with their filing; an officeholder between races
 * with no filing. The outlet decides by its reads: a reporter with room this
 * week, and its interest (`outletInterest`: how newsworthy they are, its
 * editor's and owner's regard, its followers who know them) over its bar.
 * A refusal is a record like a yes. A yes comes with its questions, for the
 * one asked to answer (`answerInterview`).
 */
export function requestInterview(
  api: CoreAPI,
  input: {
    readonly outletId: string;
    readonly filingId?: string | null;
    readonly personId?: string;
  },
): InterviewRow {
  if (input.filingId)
    return arrange(api, input.filingId, input.outletId, "candidate");
  if (!input.personId)
    throw new Error("An interview needs a filing or a person");
  const speaker = officeholderSpeaker(api, input.personId) ?? {
    personId: input.personId,
    party: null,
    filing: null,
  };
  return arrangeWith(api, speaker, input.outletId, "candidate");
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
  return arrangeWith(api, asSpeaker(filing), outletId, askedBy);
}

function arrangeWith(
  api: CoreAPI,
  speaker: Speaker,
  outletId: string,
  askedBy: InterviewRow["askedBy"],
): InterviewRow {
  const outlet = table(api, "outlets").get(outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) throw new Error(`No outlet ${outletId}`);
  const filing = speaker.filing;
  const worth = newsworthiness(api, speaker);
  const key = filing?.id ?? speaker.personId;
  const base = {
    // One row per ask: a second ask the same day never overwrites the first.
    id: `interview:${outletId}:${key}:${api.state.date}:${
      (
        table(api, "interviews").query("byOutlet", [
          outletId,
        ]) as unknown as InterviewRow[]
      ).filter((i) => (i.filingId ?? i.candidateId) === key).length
    }`,
    outletId,
    candidateId: speaker.personId,
    filingId: filing?.id ?? null,
    contestId: filing?.contestId ?? null,
    askedBy,
    date: api.state.date,
    questions: [] as string[],
    answers: [] as InterviewAnswer[],
    audience: 0,
    newsworthiness: worth,
    reporterId: reporterFor(
      api,
      outlet,
      speaker.personId,
      filing?.contestId ?? null,
    ),
    storyId: null,
  };
  const declined = (
    reason: InterviewRow["reason"],
    interest: OutletInterest | null = null,
  ) => record(api, { ...base, status: "declined", reason, interest });
  if (filing) {
    if (
      contestOf(api, filing.contestId).electionDate < api.state.date ||
      !standing(filing)
    )
      return declined("race-over");
    if (already(api, outletId, filing.id))
      return declined("already-interviewed");
  } else {
    // Between races, only one who holds a seat has a record to be asked on.
    if (!servingTerms(api, speaker.personId).length)
      return declined("no-standing");
    if (talkedLately(api, outletId, speaker.personId))
      return declined("already-interviewed");
  }
  if (weekCount(api, outletId) >= pressParameter("interviewsPerWeek"))
    return declined("no-room");
  // One who asks is weighed by the outlet's people and readers (a friend of
  // the owner may get airtime their name alone would not); an outlet's own
  // invitation was already its choice.
  const bar = newsworthyBar(outlet);
  const interest =
    askedBy === "candidate" ? outletInterest(api, outlet, speaker) : null;
  if (interest && interest.total < bar)
    return declined(
      worth < bar ? "not-newsworthy" : "not-interested",
      interest,
    );
  if (!interest && worth < bar) return declined("not-newsworthy");
  return record(api, {
    ...base,
    status: "invited",
    reason: null,
    interest,
    questions: interviewQuestions(api, speaker, outlet),
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
 * (a friend gets the friendly reporter), else its first. A reporter never
 * covers themself or a race they are in (the outlet recuses them from the
 * records), so a paper whose only reporter is the candidate has none to send.
 */
function reporterFor(
  api: CoreAPI,
  outlet: OutletRow,
  candidateId: string,
  contestId: string | null = null,
): string | null {
  const rivals = new Set(
    contestId ? ballot(api, contestId).map((f) => f.personId) : [],
  );
  const reporters = (outlet.reporterIds ?? []).filter(
    (id) =>
      api.state.people.get(id)?.alive && id !== candidateId && !rivals.has(id),
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
  const speaker = speakerOf(api, row);
  const given = row.questions.map((question): InterviewAnswer => {
    const answer = answers.find((a) => a.question === question);
    const position =
      answer?.position === null || answer?.position === undefined
        ? null
        : Math.max(-1, Math.min(1, answer.position));
    const move: InterviewMove = answer?.move ?? "plain";
    // The record the answer rests on, or that it contradicts: the one the
    // answer names (a vote the sitting's further fact or lie is about), else
    // the vote their stand rests on.
    const truth = standingOn(api, speaker, question);
    return {
      question,
      position,
      move,
      recordId:
        answer?.recordId ?? (truth.from === "vote" ? truth.recordId : null),
    };
  });
  return publish(api, row, given);
}

/** Who an interview row is with: the filing's candidate, else the officeholder. */
function speakerOf(api: CoreAPI, row: InterviewRow): Speaker {
  if (row.filingId) {
    const filing = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .get(row.filingId) as unknown as FilingRow;
    return asSpeaker(filing);
  }
  return (
    officeholderSpeaker(api, row.candidateId) ?? {
      personId: row.candidateId,
      party: null,
      filing: null,
    }
  );
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
  if (row.filingId) campaignFor(api, row.filingId);
  const outlet = table(api, "outlets").get(
    row.outletId,
  ) as unknown as OutletRow;
  const audience = followersOf(api, row.outletId).filter(
    (id) => id !== row.candidateId,
  );
  const reporterId =
    row.reporterId ?? reporterFor(api, outlet, row.candidateId, row.contestId);
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
  // A candidate's words reach the race's voters as campaign statements;
  // an officeholder's between races reach readers through the story alone.
  const causes = row.filingId
    ? makeStatements(api, {
        filingId: row.filingId,
        venue: row.outletId,
        statements,
        audienceIds: audience,
        act: "interview",
        weight,
        faceToFace: false,
      })
    : [];
  let storyId: string | null = null;
  let reached = causes.length;
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
    if (!row.filingId) reached = story.receivedNamed;
  }
  const done: InterviewRow = {
    ...row,
    status: "published",
    answers,
    audience: reached,
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
      ...(row.contestId ? { contestId: row.contestId } : {}),
      answered: String(statements.length),
      declined: String(answers.length - statements.length),
      // Whether the candidate sat for it: the sitting is the interview's
      // scene, so the director stages no second one after it.
      sat: api.state.durableLog.has(`${INTERVIEW_ACCEPTED_EVENT}:${row.id}`)
        ? "yes"
        : "no",
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
 * else where their own view and their party's put them (`candidateStance`),
 * else (no view and no party) they decline. A candidate who has voted on the
 * question answers from the vote, or shades the answer toward where the town
 * stands (`shadesAnswer`); a shaded answer names the vote it contradicts,
 * which a reporter may check.
 */
export function candidateAnswers(
  api: CoreAPI,
  questions: readonly string[],
  who: FilingRow | Speaker,
): readonly InterviewAnswer[] {
  const { personId, party } = asSpeaker(who);
  const platform = platformOf(api, who);
  // An officeholder known only by their record weighs it with no lean.
  const person = api.state.people.get(personId) ?? { traits: {} };
  const votes = votesOf(api, personId);
  const round = (x: number) => Math.round(x * 1000) / 1000;
  return questions.map((question): InterviewAnswer => {
    const stated = platform.find((s) => s.question === question);
    if (stated) return { question, position: stated.position, move: "plain" };
    const vote = votes.filter((v) => v.stance.question === question).at(-1);
    if (!vote) {
      // Their own view blended with their party's; none only with neither.
      const stance = candidateStance(api, personId, party, question);
      return {
        question,
        position: stance === null ? null : round(stance),
        move: "plain",
      };
    }
    const town = townStand(api, question);
    // The candidate weighs the town's stand against how far towns stand at
    // the furthest: a town that far reads as half way to an end.
    const felt = Math.max(
      -0.5,
      Math.min(0.5, (town / pressParameter("townStandReach")) * 0.5),
    );
    return shadesAnswer(api, person, felt, vote.stance.position)
      ? { question, position: round(town), move: "lie", recordId: vote.id }
      : {
          question,
          position: round(vote.stance.position),
          move: "plain",
          recordId: vote.id,
        };
  });
}

/**
 * Whether a candidate shades an answer about their own vote toward where the
 * town stands rather than owning the vote: the further apart the two stand
 * (half the distance, 0 to 1; the town as the candidate weighs it, half way
 * to an end at the furthest a town stands), the more the vote costs with the
 * people listening, and their own lean toward bending the truth over owning
 * it (every trait).
 */
export function shadesAnswer(
  api: CoreAPI,
  person: Pick<PersonState, "traits"> & { id?: string },
  town: number,
  voted: number,
): boolean {
  return leanedYes(
    api.state,
    person,
    "press.shade-answer",
    "shade",
    "own",
    pressParameter("shadeBase") +
      (pressParameter("shadeGapWeight") * Math.abs(town - voted)) / 2,
  );
}

const standCache = new WeakMap<
  object,
  { key: string; map: Map<string, number> }
>();

/**
 * Where the town's adults stand on a question, -1 to 1: the mean of where
 * each one's lean puts them on its axis (as the press reads an outlet's
 * readers), each counted record weighed by the people it stands for. Read
 * once a day, and again after a fill-in.
 */
export function townStand(api: CoreAPI, question: string): number {
  const core = api.state as CoreState;
  const key = `${core.date}|${core.people.size}|${residentsRuntime(core)?.store.membersVersion ?? 0}`;
  const held = standCache.get(core);
  const map = held?.key === key ? held.map : new Map<string, number>();
  if (held?.key !== key) standCache.set(core, { key, map });
  const hit = map.get(question);
  if (hit !== undefined) return hit;
  const town = lawChain(api).townPlaceId;
  const views = core.modules.has(VIEWS_MODULE_ID);
  const adultAge = api.parameter("votingAge");
  let sum = 0;
  let adults = 0;
  for (const id of core.peopleByPlace.get(town) ?? []) {
    const p = core.people.get(id);
    if (!p?.alive || ageOn(p, core.date) < adultAge) continue;
    sum += leanOf(api, id) / 2;
    adults += 1;
  }
  for (const voter of countedResidents(core)) {
    if (voter.placeId !== town || ageOn(voter, core.date) < adultAge) continue;
    sum += ((views ? countedLean(api, voter) : 0) / 2) * voter.weight;
    adults += voter.weight;
  }
  const stand = adults ? (sum / adults) * questionAxis(question) : 0;
  map.set(question, stand);
  return stand;
}

/**
 * Each week in the run-up to a general election, every outlet asks the
 * candidates on the ballot it hasn't interviewed, most newsworthy first, as
 * far as its reporter has room. The player's invitations wait for an answer;
 * another candidate accepts unless shy and averse to conflict and risk, and
 * answers from their own positions.
 */
/**
 * The press writes a story about a record from before day one for the news
 * archive: the record becomes a wire item by the same rule as a live public
 * record, and the town's paper slants and frames it. Null where no press is
 * installed, or the record is outside the town's coverage.
 */
export function writeArchiveStory(
  api: CoreAPI,
  record: Readonly<CoreEventInput>,
): Story | null {
  const outlet = townOutlet(api);
  if (!outlet) return null;
  const chain = lawChain(api);
  const item = wireItem(api, record, {
    placeId: chain.townPlaceId,
    stateKey: chain.stateKey,
  });
  if (!item) return null;
  const reporterId =
    (outlet.reporterIds ?? []).find((id) => api.state.people.get(id)?.alive) ??
    null;
  const written = archiveItem(api, deskContext(api), outlet, reporterId, item, {
    recordId: record.id,
    ...(record.facts ?? {}),
  });
  if (written.printed)
    table(api, "archive").put(written.printed as unknown as ModuleRow);
  return written.story;
}

/** What the reporter's desk reads from the press. */
export function deskContext(api: CoreAPI): DeskContext {
  // Read once per desk run: a race's rivals and a campaign's ad money hold
  // for the day's stories.
  const rivals = new Map<string, readonly string[]>();
  const ads = new Map<string, number>();
  return {
    parameter: pressParameter,
    followers: (outletId) => followersOf(api, outletId),
    townPlaceId: lawChain(api).townPlaceId,
    adMoney: (outlet, personId) => {
      const key = `${outlet.organizationId}|${personId}`;
      let held = ads.get(key);
      if (held === undefined) {
        held = adMoneyAt(api, outlet, personId);
        ads.set(key, held);
      }
      return held;
    },
    rivals: (personId) => {
      let held = rivals.get(personId);
      if (!held) {
        held = rivalsOf(api, personId);
        rivals.set(personId, held);
      }
      return held;
    },
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
  const staff = reportersHere(api);
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
    const row = weighTip(api, {
      act: bribeAct(crimeId),
      officialId,
      knowerId,
      reporterId,
      staff,
      leak: false,
    });
    if (row?.storyId) return;
  }
}

/** The town's outlets' reporters, each with the outlet they file for. */
function reportersHere(api: CoreAPI): Map<string, OutletRow> {
  const staff = new Map<string, OutletRow>();
  for (const outlet of outletsHere(api))
    for (const id of outlet.reporterIds ?? []) staff.set(id, outlet);
  return staff;
}

/**
 * An act the press can expose, named on the tip, the exposure and the story:
 * the id the tip is kept under, the fact that names the act and says what it
 * was, any more facts the exposure carries, the citation, and the fields that
 * name the act on the tip's row.
 */
interface ExposableAct {
  readonly id: string;
  readonly fact: readonly [key: string, word: string];
  readonly facts?: Readonly<Record<string, string>>;
  readonly citation: string;
  readonly row: Readonly<Record<string, unknown>>;
}

/** A bribe an official took: the crime record on the cash journal. */
const bribeAct = (crimeId: string): ExposableAct => ({
  id: crimeId,
  fact: [`crime:${crimeId}`, "bribe-taken"],
  citation: `A reporter's story on recorded bribe ${crimeId}`,
  row: { crimeId },
});

/**
 * One person's tip of a hidden act to a reporter, weighed in order: whether
 * the one who knows takes it (their lean toward tipping off over keeping
 * quiet, their closeness to the reporter, their regard for the official; a
 * leak is a tip the person chose to make), whether the reporter digs, and
 * whether the outlet's owner and head let it run. A run is a public record
 * and a story its readers take in. Returns the tip's row, or null when the
 * reporter is no longer there.
 */
function weighTip(
  api: CoreAPI,
  input: {
    readonly act: ExposableAct;
    readonly officialId: string;
    readonly knowerId: string;
    readonly reporterId: string;
    readonly staff: ReadonlyMap<string, OutletRow>;
    readonly leak: boolean;
  },
): Record<string, unknown> | null {
  const { act, officialId, knowerId, reporterId, staff } = input;
  const knower = api.state.people.get(knowerId);
  const reporter = api.state.people.get(reporterId);
  const outlet = staff.get(reporterId);
  if (!knower?.alive || !reporter?.alive || !outlet) return null;
  const p = pressParameter;
  const tip =
    reporterId === knowerId || input.leak
      ? 1
      : // Taking it to the nearest reporter, weighed against how they regard
        // the official, with the knower's temperament at its calibrated weight.
        leanedScore(
          api.state,
          knower,
          "press.tip",
          "tip",
          "keep",
          closeness(api, knowerId, reporterId) -
            regard(api, p, knowerId, officialId),
        );
  const row: Record<string, unknown> = {
    id: act.id,
    ...act.row,
    knowerId,
    reporterId,
    officialId,
    date: api.state.date,
    tip,
    dig: null,
    run: null,
    storyId: null,
    ...(input.leak ? { leaked: true } : {}),
  };
  if (tip <= 0) {
    table(api, "tips").put(row as unknown as ModuleRow);
    return row;
  }
  // The paper trail: the payment is on the cash journal, the award on the
  // government's books.
  const dig =
    decisionLean(api.state, reporter, "press.dig", "dig", "let-go") +
    grudge(api, reporterId, officialId) -
    closeness(api, reporterId, officialId) +
    p("tipDocumentsWeight");
  row.dig = dig;
  const run =
    dig -
    p("slantOwnerWeight") *
      (outlet.ownerId ? regard(api, p, outlet.ownerId, officialId) : 0) -
    p("slantPublisherWeight") *
      (outlet.headId ? regard(api, p, outlet.headId, officialId) : 0);
  row.run = dig > 0 ? run : null;
  if (dig > 0 && run > 0) {
    const exposedId = `press.exposed:${act.id}:${outlet.id}`;
    api.emit({
      id: exposedId,
      date: api.state.date,
      kind: "press.exposed",
      personIds: api.state.people.has(officialId) ? [officialId] : [],
      placeId: outlet.placeId,
      publicRecord: true,
      news: true,
      topic: `conduct:${officialId}`,
      facts: {
        [act.fact[0]]: act.fact[1],
        ...act.facts,
        outletId: outlet.id,
      },
      source: {
        tag: "SOURCED",
        citation: act.citation,
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
        facts: { [act.fact[0]]: act.fact[1] },
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
  return row;
}

/**
 * The week's conflicts of interest reach the desk. An award a government
 * made in the last week whose record names a member who chose a firm they
 * own, or a relative or housemate owns (contracts.ts `conflicts`), is public
 * business the local reporters can read: the award on the government's books
 * is the paper trail. Each reporter of the town's local outlets, in outlet and
 * id order, weighs it as they weigh a tip they came to themself (nobody to
 * take it to): whether to dig, then whether the outlet's owner and head let
 * it run. The first to run it prints it and the others see it on the wire. A
 * reporter never covers themself, the firm's owner or either one's relatives.
 * Every conflict the desk weighs keeps a tip row under its award and member;
 * nothing rolls.
 */
function conflictBeat(api: CoreAPI): void {
  if (!api.state.modules.has(CONTRACTS_MODULE_ID)) return;
  // stopgapId: SG-PEOPLE-press-conflict-beat
  const local = outletsHere(api).filter((o) => o.tier !== "national");
  const staff = new Map<string, OutletRow>();
  for (const outlet of local)
    for (const id of outlet.reporterIds ?? []) staff.set(id, outlet);
  if (!staff.size) return;
  // Awards made since the desk last sat (it sits weekly; a conflict already
  // weighed keeps its tip row and is not weighed again).
  const awards = new Map<string, ContractAwardRow>();
  for (let back = 0; back <= api.parameter("daysPerWeek"); back += 1)
    for (const award of awardsOn(
      api,
      addDays(makeIsoDate(api.state.date), -back),
    ))
      if (award.conflicts.length) awards.set(award.id, award);
  for (const award of [...awards.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  ))
    for (const conflict of award.conflicts) {
      const act = conflictAct(award, conflict);
      if (
        !api.state.people.has(conflict.memberId) ||
        table(api, "tips").get(act.id)
      )
        continue;
      const reporters = local
        .flatMap((o) => [...(o.reporterIds ?? [])].sort())
        .filter(
          (id) =>
            ![conflict.memberId, conflict.ownerId].some(
              (party) =>
                id === party || familyRelation(api.state, id, party) !== null,
            ),
        );
      for (const reporterId of reporters) {
        api.stopgap("SG-PEOPLE-press-conflict-beat");
        const row = weighTip(api, {
          act,
          officialId: conflict.memberId,
          knowerId: reporterId,
          reporterId,
          staff,
          leak: false,
        });
        if (row?.storyId) break;
      }
    }
}

/** A member's vote for a firm their family owns, as an act the press can expose. */
function conflictAct(
  award: ContractAwardRow,
  conflict: ContractAwardRow["conflicts"][number],
): ExposableAct {
  return {
    id: `${award.id}:${conflict.memberId}`,
    fact: [`award:${award.id}`, "conflict-of-interest"],
    facts: {
      memberId: conflict.memberId,
      organizationId: conflict.organizationId,
      ownerId: conflict.ownerId,
      relation: conflict.relation,
    },
    citation: `A reporter's story on contract award ${award.id}: ${conflict.memberId} chose a firm owned by ${conflict.relation === OWNER_RELATION ? "themself" : `their ${conflict.relation}`}.`,
    row: {
      awardId: award.id,
      memberId: conflict.memberId,
      organizationId: conflict.organizationId,
      relation: conflict.relation,
    },
  };
}

/**
 * A person who knows of a hidden act takes it to a reporter on purpose (a
 * leak): the tip is theirs to give,
 * so the first step is not weighed; the reporter still decides to dig and the
 * outlet's owner and head still decide to run it. The leaker is named on the
 * tip and in what the reporter knows, and the two spend time together. A tip
 * already in print is not leaked again. Returns the tip.
 */
export function leakToReporter(
  api: CoreAPI,
  input: {
    readonly leakerId: string;
    readonly reporterId: string;
    readonly crimeId: string;
  },
): Record<string, unknown> {
  const crime = api.state.modules.has(CORRUPTION_MODULE_ID)
    ? (api
        .moduleState(CORRUPTION_MODULE_ID)
        .table("crimes")
        .get(input.crimeId) as unknown as CrimeRecord | undefined)
    : undefined;
  if (!crime?.taken) throw new Error(`No hidden act to leak: ${input.crimeId}`);
  if (input.leakerId === crime.officialId)
    throw new Error("The official cannot leak their own act.");
  // They can leak only what they know: they were told of it, or they told it.
  const told = (
    table(api, "told").query("byCrime", [input.crimeId]) as unknown as {
      personIds: readonly string[];
    }[]
  ).some((row) => row.personIds.includes(input.leakerId));
  if (!told && input.leakerId !== crime.offererId)
    throw new Error(`${input.leakerId} does not know of ${input.crimeId}.`);
  const staff = reportersHere(api);
  if (!staff.has(input.reporterId))
    throw new Error(`${input.reporterId} reports for no outlet here.`);
  const had = table(api, "tips").get(input.crimeId) as unknown as
    Record<string, unknown> | undefined;
  if (had?.storyId) return had;
  const row = weighTip(api, {
    act: bribeAct(input.crimeId),
    officialId: crime.officialId,
    knowerId: input.leakerId,
    reporterId: input.reporterId,
    staff,
    leak: true,
  })!;
  // The reporter knows who gave it to them, and the two have spent time together.
  api.observe(input.reporterId, {
    key: `leak:${input.crimeId}`,
    value: input.leakerId,
    learnedAt: api.state.date,
    sourceId: `leak:${input.crimeId}`,
    access: "told",
  });
  api.relationship(input.leakerId, input.reporterId, "contact", 0.5);
  return row;
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
/**
 * The town's counted residents by place, read at most once a month: the
 * count walks every counted household, and an outlet's audience moves slowly.
 */
function countsThisMonth(api: CoreAPI): ReturnType<typeof residentCounts> {
  const held = countsCache.get(api.state);
  if (
    held &&
    held.date <= api.state.date &&
    api.state.date <
      addDays(makeIsoDate(held.date), pressParameter("audienceRecountDays"))
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
  for (const counts of countsThisMonth(api))
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
    if (!standing(filing)) continue;
    const contest = contestOf(api, filing.contestId);
    if (!contest || contest.electionDate < api.state.date) continue;
    for (const rival of ballot(api, contest.id))
      if (rival.personId !== personId) out.add(rival.personId);
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

/** One printed story by its id (what a reader remembers it by), or undefined. */
export function printedStoryOf(
  api: CoreAPI,
  storyId: string,
): PrintedStory | undefined {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return undefined;
  return table(api, "stories").get(storyId) as unknown as
    PrintedStory | undefined;
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

/**
 * Whether a person holds a job today: a full person's own job, or a job in
 * the counted workforce that the person was hired into (a hire from the
 * counts becomes a named person on the desk but keeps the counted job, and
 * may hold another job as well).
 */
function holdsJob(core: CoreState, personId: string, jobId: string): boolean {
  const job = core.jobs.get(jobId) ?? residentsRuntime(core)?.jobs.get(jobId);
  return (
    !!job &&
    job.personId === personId &&
    job.endsAt === undefined &&
    (core.people.get(personId)?.jobId === jobId || !core.jobs.has(jobId))
  );
}

/** Why one of an outlet's people left: death, a move, or the jobs engine's record. */
function whyLeft(api: CoreAPI, row: StaffRow): string {
  const person = api.state.people.get(row.id);
  if (!person?.alive) return "died";
  if (!row.jobId) return "unknown";
  if (!api.state.modules.has(JOBS_MODULE_ID)) return "left-job";
  const changes = api.moduleState(JOBS_MODULE_ID).table("changes");
  // The departure fell within the week since the last check.
  for (let back = 0; back < 7; back += 1) {
    const date = addDays(makeIsoDate(api.state.date), -back);
    for (const kind of ["layoff", "quit", "left-work", "closure"])
      if (changes.get(`job-change:${date}:${row.jobId}:${kind}`)) return kind;
  }
  return person.placeId === lawChain(api).townPlaceId ? "left-job" : "moved";
}

/**
 * Refresh the masthead from employment records. The jobs engine alone fills
 * vacancies; a reporter hired from the counts becomes a named person when
 * they join the desk. Off-town staff have no modeled payroll yet, so a death
 * leaves that role vacant rather than manufacturing another person.
 */
export function refreshPressStaff(api: CoreAPI): void {
  const core = api.state as CoreState;
  for (const outlet of outletsHere(api)) {
    const rows = [...staffOf(api, outlet.id)];
    for (const row of rows) {
      if (row.role === "owner" || row.leftOn) continue;
      const person = core.people.get(row.id);
      if (
        person?.alive &&
        (row.jobId === null || holdsJob(core, person.id, row.jobId))
      )
        continue;
      table(api, "staff").put({
        ...row,
        leftOn: core.date,
        leftBecause: whyLeft(api, row),
      } as unknown as ModuleRow);
    }
    // Indexed employer jobs, plus the very same jobs held by counted people.
    const jobs = [
      ...[...(core.finance.jobsByOrganization.get(outlet.organizationId) ?? [])]
        .map((id) => core.jobs.get(id)!)
        .filter((job) => job && job.endsAt === undefined),
      ...countedJobsOf(core, outlet.organizationId),
    ].sort((a, b) => a.id.localeCompare(b.id));
    for (const job of jobs) {
      const role = STAFF_ROLES.find(
        (row) => row.payParameter !== null && row.title === job.title,
      );
      if (!role) continue;
      const previous = table(api, "staff").get(job.personId) as
        StaffRow | undefined;
      if (previous?.jobId === job.id && !previous.leftOn) continue;
      const person = fillInPerson(core, job.personId);
      if (!person.alive || !holdsJob(core, person.id, job.id)) continue;
      table(api, "staff").put({
        id: person.id,
        outletId: outlet.id,
        role: role.id,
        jobId: job.id,
        hiredOn: core.work.commitmentsByPerson.get(person.id)
          ? ([...core.work.commitmentsByPerson.get(person.id)!]
              .map((id) => core.work.commitments.get(id)!)
              .find((row) => row.jobId === job.id)?.startsAt ?? core.date)
          : core.date,
      } as unknown as ModuleRow);
    }
    const active = staffOf(api, outlet.id).filter((row) => !row.leftOn);
    const heads = active.filter((row) => row.role === "head");
    const headId =
      heads.find((row) => row.id === outlet.headId)?.id ?? heads[0]?.id ?? null;
    const reporterIds = active
      .filter((row) => row.role === "reporter")
      .map((row) => row.id);
    table(api, "outlets").put({
      ...outlet,
      ownerId: ownerOf(api, outlet.organizationId) ?? outlet.ownerId,
      headId,
      reporterIds,
    } as unknown as ModuleRow);
  }
  pressStaffChanged(api);
}

/**
 * Each press week the outlets' wider audience pays its part of the coming
 * week; the first press week of each month, each outlet's yearly revenue is
 * last month's, times twelve.
 */
function reviewOutletRevenue(api: CoreAPI, monthStart: boolean): void {
  const deps = outletMoneyDeps(api);
  // A restored world has no money hooks until the press puts them back.
  installOutletMoney(api, deps);
  const core = api.state as CoreState;
  payWiderAudience(
    api,
    deps,
    outsideCustomersOf(core, lawChain(api).townPlaceId),
    api.parameter("daysPerWeek"),
  );
  if (!monthStart) return;
  const last = addDays(makeIsoDate(`${core.date.slice(0, 7)}-01`), -1).slice(
    0,
    7,
  );
  const yearly = outletYearlyRevenue(api, deps, last);
  for (const outlet of outletsHere(api)) {
    const revenue = yearly.get(outlet.organizationId);
    if (revenue === undefined || revenue === outlet.audienceRevenueMinor)
      continue;
    table(api, "outlets").put({
      ...outlet,
      audienceRevenueMinor: revenue,
    } as unknown as ModuleRow);
  }
}

/** Owners given a household cost spend what it came to since last week out of what they hold. */
function ownersLive(api: CoreAPI): void {
  for (const raw of table(api, "staff").rows()) {
    const row = raw as unknown as StaffRow;
    if (!row.livedThrough || row.livedThrough >= api.state.date) continue;
    spendLivingCost(
      api,
      row.id,
      daysBetweenText(row.livedThrough, api.state.date),
    );
    table(api, "staff").put({
      ...row,
      livedThrough: api.state.date,
    } as unknown as ModuleRow);
  }
}

function pressWeek(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "press-week") return;
  scheduleWeek(api, api.state.date);
  refreshPressStaff(api);
  // Revenue: the week's wider-audience part, and each month's yearly rate.
  reviewOutletRevenue(
    api,
    Number(api.state.date.slice(8, 10)) <= api.parameter("daysPerWeek"),
  );
  ownersLive(api);
  conflictBeat(api);
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
        row.contestId &&
        contestOf(api, row.contestId).electionDate < api.state.date
      )
        refuse(api, row);
  if (!contests.length) return;
  const filings = contests
    .flatMap((c) => ballot(api, c.id))
    .map((f) => ({ f, worth: newsworthiness(api, f) }));
  // The player's invitations this week, put to them as one.
  const invitedThisWeek = new Map<string, InterviewRow[]>();
  const townAdults =
    api.state.peopleByPlace.get(lawChain(api).townPlaceId)?.size || 1;
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
      if (row.status === "invited" && f.personId === playerId)
        invitedThisWeek.set(row.candidateId, [
          ...(invitedThisWeek.get(row.candidateId) ?? []),
          row,
        ]);
      if (row.status !== "invited" || f.personId === playerId) continue;
      const person = api.state.people.get(f.personId);
      const reporter = row.reporterId ?? "";
      // The voters the outlet would put them before (the share of the town
      // that follows it), whether they hold the seat (a sitting official needs
      // the coverage least and risks their record), how they stand with the
      // reporter who asks, and every trait's lean toward accepting.
      const reasons = person && {
        reach: followersOf(api, outlet.id).length / townAdults,
        incumbent: isIncumbent(api, contestOf(api, f.contestId), f.personId),
        closeness: closeness(api, person.id, reporter),
        grudge: grudge(api, person.id, reporter),
      };
      const accepts =
        person && reasons
          ? leanedYes(
              api.state,
              person,
              "press.accept-interview",
              "accept",
              "decline",
              acceptCase(reasons),
            )
          : true;
      const weighed =
        person && reasons && keepsWhy(api.state as CoreState, person.id)
          ? record(api, {
              ...row,
              acceptReasons: {
                ...reasons,
                lean: decisionLean(
                  api.state,
                  person,
                  "press.accept-interview",
                  "accept",
                  "decline",
                ),
              },
            })
          : row;
      if (!accepts) refuse(api, weighed);
      else publish(api, weighed, candidateAnswers(api, row.questions, f));
    }
  // Those still waiting on the player's answer reach them as one call.
  if (playerId) {
    const open = (invitedThisWeek.get(playerId) ?? []).filter(
      (row) =>
        (table(api, "interviews").get(row.id) as unknown as InterviewRow)
          ?.status === "invited",
    );
    if (open.length) invited(api, open);
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

/** The kind of an outlet's invitation to a candidate to sit for an interview. */
export const INTERVIEW_INVITED_EVENT = "interview-invited";
/**
 * The kind of the record that a candidate said yes to an outlet's invitation:
 * the sitting is waiting. It names the candidate and the reporter who will
 * ask; the director stages the sitting from it (`interview-sitting`), and the
 * candidate's answers, said there, publish the interview (`answerInterview`).
 */
export const INTERVIEW_ACCEPTED_EVENT = "interview-accepted";
/** The replies in an invitation's scene that accept it. */
export const ACCEPTING_MOVES: ReadonlySet<string> = new Set([
  "agree",
  "relent",
]);
/** The replies in an invitation's scene that turn it down. */
export const REFUSING_MOVES: ReadonlySet<string> = new Set(["decline"]);

/**
 * The outlets' invitations of the week to the player, on the record as one
 * for the candidate and the first outlet's reporter who asks: the director
 * stages it as a call from that reporter, and the answer there is read back
 * here for every outlet that asked (`answerInvitation`).
 */
function invited(api: CoreAPI, rows: readonly InterviewRow[]): void {
  const row = rows[0]!;
  const ids = [row.candidateId, row.reporterId ?? ""].filter((id) =>
    api.state.people.has(id),
  );
  if (!ids.includes(row.candidateId)) return;
  const contest = row.contestId ? contestOf(api, row.contestId) : null;
  // The outlet by its organization, as the press's other records name it.
  const outlet = outletsHere(api).find((o) => o.id === row.outletId);
  api.emit({
    id: `${INTERVIEW_INVITED_EVENT}:${row.id}`,
    date: api.state.date,
    kind: INTERVIEW_INVITED_EVENT,
    personIds: ids,
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Interviews ${rows.map((r) => r.id).join(", ")}`,
      asOf: api.state.date,
    },
    facts: {
      interviewId: row.id,
      // Every outlet that asked this week; the answer goes to each.
      interviewIds: rows.map((r) => r.id).join(" "),
      outlets: String(rows.length),
      invitedId: row.candidateId,
      outletId: outlet?.organizationId ?? row.outletId,
      ...(row.reporterId ? { reporterId: row.reporterId } : {}),
      ...(row.contestId ? { contestId: row.contestId } : {}),
      ...(contest ? { office: contest.title } : {}),
    },
  });
}

/**
 * A candidate's own answers to a sitting's questions (an interview, a
 * debate): what their filed platform states, and no answer where it states
 * nothing. The engine never answers for them.
 */
export function platformAnswers(
  api: CoreAPI,
  filingId: string | null,
  questions: readonly string[],
): readonly InterviewAnswer[] {
  const filing = filingId
    ? (api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .get(filingId) as unknown as FilingRow | undefined)
    : undefined;
  const platform = filing ? platformOf(api, filing) : [];
  return questions.map((question): InterviewAnswer => {
    const stated = platform.find((s) => s.question === question);
    return {
      question,
      position: stated ? stated.position : null,
      move: "plain",
    };
  });
}

/**
 * The answer to an outlet's invitation, said in its scene: a yes puts the
 * sitting on the record (`interview-accepted`, one for each outlet that
 * asked) and the interview waits for the candidate to sit for it, answering
 * each question as a line of their own; a no is a refusal on the record (the
 * outlet's people may take it as a snub); and anything else leaves it open
 * until the race is over.
 */
function answerInvitation(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  const cause = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (cause?.kind !== INTERVIEW_INVITED_EVENT) return;
  const move = String(facts.move);
  for (const id of String(cause.facts?.interviewIds ?? "").split(" ")) {
    const row = table(api, "interviews").get(id) as unknown as
      InterviewRow | undefined;
    if (row?.status !== "invited" || !event.personIds.includes(row.candidateId))
      continue;
    if (ACCEPTING_MOVES.has(move)) accepted(api, row, event.id);
    else if (REFUSING_MOVES.has(move)) refuse(api, row);
  }
}

/**
 * A candidate said yes to an outlet's invitation: the sitting is on the
 * record, with the reporter who will ask, for the director to stage. Said
 * once for an invitation; the interview stays invited until it is sat.
 */
function accepted(api: CoreAPI, row: InterviewRow, replyId: string): void {
  const id = `${INTERVIEW_ACCEPTED_EVENT}:${row.id}`;
  if (api.state.durableLog.has(id)) return;
  const ids = [row.candidateId, row.reporterId ?? ""].filter((who) =>
    api.state.people.has(who),
  );
  if (ids.length < 2) return;
  const outlet = outletsHere(api).find((o) => o.id === row.outletId);
  const contest = row.contestId ? contestOf(api, row.contestId) : null;
  api.emit({
    id,
    date: api.state.date,
    kind: INTERVIEW_ACCEPTED_EVENT,
    personIds: ids,
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Interview ${row.id}, accepted in ${replyId}`,
      asOf: api.state.date,
    },
    facts: {
      interviewId: row.id,
      invitedId: row.candidateId,
      outletId: outlet?.organizationId ?? row.outletId,
      reporterId: row.reporterId ?? "",
      ...(row.contestId ? { contestId: row.contestId } : {}),
      ...(contest ? { office: contest.title } : {}),
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
