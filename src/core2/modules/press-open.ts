import { worldLevel } from "../world-draw";
import type { CoreModule } from "../types";
import type { CountedNewsModule } from "./news-listeners";
import { CRIME_EVENT } from "../laws-in-force";
import { registerAdOutlet } from "./campaigns";
import { coreAPI, registerModule } from "../state";
import {
  outletName,
  nationalOutletName,
  hireStaffMember,
} from "../press-staff";
import { openingEmployerCashBufferPrior } from "../opening-capital";
import { giveOutsideSuppliers, enrollBusinessOwner } from "./business";
import { registerEmployer } from "./jobs";
import { type CountedNewsAudience, countedNewsGroups } from "./views";
import type {
  CoreAPI,
  CoreState,
  LocalKind,
  ModuleRow,
  OutletKind,
  OutletRow,
  PlaceNews,
} from "./press-base";
import {
  BASES,
  BUSINESS_MODULE_ID,
  HABIT,
  JOBS_MODULE_ID,
  KINDS,
  NATIONAL,
  NEWS,
  PLATFORM_QUESTIONS,
  STAFF_ROLES,
  adOutlet,
  audienceOfKind,
  bandOf,
  expectedRevenueYearMinor,
  followCache,
  installOutletMoney,
  lawChain,
  leanOf,
  openOfKind,
  outletMoneyDeps,
  outletPayrollYearMinor,
  outletsHere,
  outsideNewsroomYearMinor,
  pressParameter,
  pressStaffChanged,
  scheduleWeek,
  table,
  townOutlet,
  wireItem,
} from "./press-base";
import { PRESS_MODULE_ID } from "./press-ids";
import { checkClaim, printedStoryOf } from "./press-stories";
import { runExposure, tipOff } from "./press-exposure";
import {
  answerInvitation,
  inviteDay,
  keepComment,
  reportConcession,
} from "./press-interviews";
import { pressWeek } from "./press-week";

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

const PRESS_MODULE: CoreModule & CountedNewsModule = {
  id: PRESS_MODULE_ID,
  // A plain field: news reads it off the installed module.
  countedNewsAudience,
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
      // What a person said to a reporter who asked them about a record (the
      // press-interview scene), or that they declined: the paper's story
      // of that record carries it (printed-words, commentFacts).
      comments: {},
      /**
       * A person's own say about an outlet: they follow it, or they dropped it.
       * Read over the week's audiences (followersOf), so a paper a person chose
       * is read by every engine that reads who follows what.
       */
      follows: { indexes: { byPerson: { fields: ["personId"] } } },
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
          /** An outlet's interviews by the day asked: its week read a day at a time. */
          byOutletDate: { fields: ["outletId", "date"] },
          /** A candidate's interviews for one race. */
          byCandidateFiling: { fields: ["candidateId", "filingId"] },
        },
      },
      /** Who was told of a hidden act, by the telling's event: what a leaker knows. */
      told: { indexes: { byCrime: { fields: ["crimeId"] } } },
    },
  },
  onDay: enrollPressEmployers,
  onCalendarWork: (api, work) => {
    if (work.kind === "press-dig") checkClaim(api, work);
    else if (work.kind === "press-run") runExposure(api, work);
    else if (work.kind === "press-invite") inviteDay(api, work);
    else pressWeek(api, work);
  },
  eventKinds: ["*"],
  onEvent(api, event) {
    // The one invited answers in the scene the invitation stages.
    if (event.kind === "scene.reply") {
      answerInvitation(api, event);
      keepComment(api, event);
      reportConcession(api, event);
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
    // Every public record in the town's coverage goes on the wire, and the
    // police log's entries in the town (owner, Oct 29: side stories), which
    // the paper prints as briefs though the crime record itself is kept.
    const policeLog =
      event.kind === CRIME_EVENT && event.placeId === lawChain(api).townPlaceId;
    if (!event.publicRecord && !policeLog) return;
    // An exposure the paper holds for comment goes on the wire when it runs
    // (runExposure), so no desk prints it before the one exposed is asked.
    if (event.kind === "press.exposed" && event.facts?.runsOn) return;
    const chain = lawChain(api);
    const item = wireItem(api, event, {
      placeId: chain.townPlaceId,
      stateKey: chain.stateKey,
    });
    if (item) table(api, "wire").put(item as unknown as ModuleRow);
  },
};

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
    readonly audiencePeople?: number;
  }
  const specs: Spec[] = [];
  // The people each outlet serves: a station its market's (the state's people
  // over its markets), a paper or a radio station its county's, shared with
  // the county's other outlets of its kind. Never fewer than the town's.
  const served = (kind: LocalKind): number =>
    Math.max(
      townPeople,
      kind === "television"
        ? statePeople / Math.max(1, counts?.tvMarkets ?? 1)
        : countyPeople / Math.max(1, Math.min(cap, wanted[kind])),
    );
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
        audiencePeople: Math.round(served(kind)),
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
      ...(spec.audiencePeople === undefined
        ? {}
        : { audiencePeople: spec.audiencePeople }),
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
  // The town's outlet of record, settled once its followers are known.
  const record = townOutlet(api);
  if (record)
    table(api, "outlets").put({
      ...record,
      ofRecord: true,
    } as unknown as ModuleRow);
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
    // Its demand is the revenue it can expect (subscriptions and ads); an actual
    // income anchor prevents manufactured zero demand. Its costs other than its people are not on its books.
    // stopgapId: SG-PEOPLE-press-outlet-other-costs
    api.stopgap("SG-PEOPLE-press-outlet-other-costs");
    api.addBusinessBooks({
      organizationId: outlet.organizationId,
      kindId: "information",
      annualPayrollMinor: payroll,
      annualDemandMinor: outlet.audienceRevenueMinor,
      annualOtherCostsMinor: outsideNewsroomYearMinor(api, outlet, jobs.length),
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
    // Its costs beyond its people are bought from outside suppliers, as every
    // firm's are, so they show in its books as paid.
    if (outlet.kind === "newspaper")
      giveOutsideSuppliers(core, outlet.organizationId, [
        ...(core.finance.businessesByPlace.get(outlet.placeId) ?? []),
      ]);
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
      // The papers sharing its market when its books opened.
      papers: openOfKind(api, outlet.kind),
    });
  }
}

/** The audience already counted by the desk, distributed across its groups. */
function countedNewsAudience(
  api: CoreAPI,
  storyId: string,
  namedReaders: number,
): readonly CountedNewsAudience[] {
  const printed = printedStoryOf(api, storyId);
  if (
    !printed ||
    !PLATFORM_QUESTIONS.includes(printed.topic) ||
    printed.receivedNamed <= 0 ||
    printed.receivedCounted <= 0 ||
    namedReaders <= 0
  )
    return [];
  const outlet = table(api, "outlets").get(printed.outletId) as unknown as
    OutletRow | undefined;
  if (!outlet) return [];
  const town = lawChain(api).townPlaceId;
  const national =
    outlet.tier === "national"
      ? NATIONAL.kinds.find((kind) => kind.kind === outlet.kind)
      : undefined;
  const own = Math.max(
    1,
    outletsHere(api).filter((o) => o.kind === outlet.kind).length,
  );
  const groups = countedNewsGroups(api).filter(
    (group) =>
      group.placeId === outlet.placeId || (national && group.placeId === town),
  );
  const followers = (count: number, byAge: ReadonlyMap<number, number>) =>
    national
      ? (count * national.followShare) /
        Math.max(1, national.audienceLeans.length)
      : [...byAge].reduce(
          (sum, [age, mass]) =>
            sum +
            mass *
              (NEWS.habits.byAge[bandOf(age)]?.[
                HABIT[outlet.kind as LocalKind]
              ] ?? 0),
          0,
        ) / own;
  const weighted = groups.map((group) => ({
    group,
    followers: followers(group.count, group.byAge),
    allFollowers: followers(group.audienceCount, group.audienceByAge),
  }));
  const total = weighted.reduce((sum, row) => sum + row.allFollowers, 0);
  if (total <= 0) return [];
  const delivered =
    (printed.receivedCounted * namedReaders) / printed.receivedNamed;
  return weighted
    .filter((row) => row.followers > 0)
    .map(({ group, followers }) => ({
      group,
      reached: (delivered * followers) / total,
    }));
}
