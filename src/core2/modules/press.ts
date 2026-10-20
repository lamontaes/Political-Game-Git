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
import { addDays, makeIsoDate } from "../kernel/dates";
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
import { countedResidents } from "../electorate";
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
import { type Stance as ViewStance } from "./views";
import { candidateStance } from "../campaign-stances";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { JOBS_MODULE_ID, registerEmployer } from "./jobs";
import { BUSINESS_MODULE_ID, ownerOf } from "./business";
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
import { stancesOf, viewOf, VIEWS_MODULE_ID } from "./views";
import { residentCounts, residentsRuntime } from "./residents";
import { openingEmployerCashBufferPrior } from "../opening-capital";
import { employerTaxShareOfWage } from "./employer-taxes";
import { startOutletRevenue } from "../press-money";
import { countedJobsOf } from "../residents-economy";
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
      employerEnrollment: {},
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
    },
  },
  onDay: enrollPressEmployers,
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
    // Its people cost their pay and the employer's payroll taxes on it.
    const payTaxShare = employerTaxShareOfWage(
      api,
      pressParameter("reporterAnnualPayMinor"),
    );
    const capacityMinor = Math.max(
      fromAudience,
      Math.round(
        payroll * (1 + payTaxShare + pressParameter("bureauMarginShare")),
      ),
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
    // SG-PEOPLE-press-employer-enrollment: use the existing records while the
    // shared business API has no entry point for an already named owner.
    api.stopgap("SG-PEOPLE-press-employer-enrollment");
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
      jobs.reduce(
        (sum, job) =>
          sum + (job.hourlyMinor ?? 0) * pressParameter("fullTimeHoursPerYear"),
        0,
      ),
    );
    // SG-PEOPLE-press-outlet-revenue still covers demand and absent supplier
    // contracts. An actual income anchor prevents manufactured zero demand.
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
        citation: `Press payroll and registered revenue estimate; town income anchor from ${anchor.organizationId}.`,
        estimatedFrom: "SG-PEOPLE-press-outlet-revenue",
      },
    });
    business.table("owners").put({
      id: outlet.organizationId,
      isOwner: true,
      ownerId: owner.id,
      since: core.date,
      basis: "press-recorded-owner",
      salesThrough: 0,
      wagesThrough: 0,
      operatingThrough: 0,
      retainedMinor: 0,
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
  let total = 0;
  for (const row of countsThisMonth(api)) {
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
  const adults = new Map<Band, number>();
  for (const voter of countedResidents(api.state as CoreState)) {
    if (voter.placeId !== town) continue;
    const age = ageOn(voter, date);
    if (age < 18) continue;
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
    ? ballot(api, filing.contestId).filter(
        (f) => f.id !== filing.id && f.status === "on-ballot",
      )
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
        Math.max(0, Math.abs(questionAxis(q)) - Math.abs(publicOffset(q))),
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
      filing.status !== "on-ballot"
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
  // stopgapId: SG-PEOPLE-press-interview-conversation
  api.stopgap("SG-PEOPLE-press-interview-conversation");
  const speaker = speakerOf(api, row);
  const given = row.questions.map((question): InterviewAnswer => {
    const answer = answers.find((a) => a.question === question);
    const position =
      answer?.position === null || answer?.position === undefined
        ? null
        : Math.max(-1, Math.min(1, answer.position));
    const move: InterviewMove = answer?.move ?? "plain";
    // The record the answer rests on, or that it contradicts.
    const truth = standingOn(api, speaker, question);
    return {
      question,
      position,
      move,
      recordId: truth.from === "vote" ? truth.recordId : null,
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
 * else (no view and no party) they decline.
 */
export function candidateAnswers(
  api: CoreAPI,
  questions: readonly string[],
  who: FilingRow | Speaker,
): readonly InterviewAnswer[] {
  const { personId, party } = asSpeaker(who);
  const platform = platformOf(api, who);
  return questions.map((question) => {
    const stated = platform.find((s) => s.question === question);
    if (stated) return { question, position: stated.position, move: "plain" };
    // Their own view blended with their party's; none only with neither.
    const stance = candidateStance(api, personId, party, question);
    return {
      question,
      position: stance === null ? null : Math.round(stance * 1000) / 1000,
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

function pressWeek(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "press-week") return;
  scheduleWeek(api, api.state.date);
  refreshPressStaff(api);
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
