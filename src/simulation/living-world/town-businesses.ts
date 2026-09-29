import {
  createOrganization,
  createOrganizationParticipation,
  recordOrganizationParticipationState,
  recordOrganizationProfile,
  recordWorkStatus,
} from "../life";
import { createStableId } from "../ids";
import { lifePlaceByJurisdictionId } from "../life-places";
import {
  activeWorkRelationshipsAt,
  organizationClosingAt,
  organizationProfileAt,
} from "../life-queries";
import { SeededRng } from "../rng";
import type {
  EntityId,
  OrganizationClassification,
  OrganizationParticipationKind,
  OrganizationParticipationRoleKind,
  OrganizationParticipationStateRecord,
  World,
  WorkStatusRecord,
} from "../types";
import {
  TOWN_EMPLOYMENT_VERSION,
  TOWN_WORKPLACES,
  WORKING_AGE_MIN,
  fillTownJobs,
  laborStatus,
  townResidents,
  townWorkplaceWeights,
  writeTownEmployer,
  type Workplace,
} from "./town-employment";
import { TOWN_JOB_END_REASONS } from "./town-labor-market";
import { TOWN_BUSINESS_WORKPLACES } from "./town-business-books";
import { townUnemploymentRate } from "./town-economy-measures";
import {
  closeBusinessesOutOfCash,
  closeBusinessWithNobodyLeft,
  stepTownFinances,
  townUnservedJobs,
  TOWN_FINANCE_CLOSING_REASONS,
} from "./town-finances";

/**
 * The town's businesses open and close.
 *
 * A business is one of the town's private employers (`town-employment.ts`):
 * a farm, a store, a diner, a garage. Each quarter its books run
 * (`town-finances.ts`): one whose cash and credit are both gone closes, and
 * its staff lose their jobs, who then look for work like anyone laid off
 * (`town-labor-market.ts`). New ones open at the approved entry rate, each
 * where the town is shortest of that kind of business, run by a resident
 * who was out of work.
 *
 * A closing is recorded on the organization's profile (`closed`), so its
 * name and history stay and nothing hires there again.
 */
export const TOWN_BUSINESSES_VERSION = "town-businesses-v1";

/**
 * CALIBRATION, approved by Claude CTO on 9/28/2026 as provisional: the share
 * of US establishments that open in a year, 11.6% (Census Business Dynamics
 * Statistics, 2022, as quoted by the Congressional Research Service). Exits
 * are no longer drawn (Build 19): a business closes when its books say so.
 * The published exit rate is a check on a run's closings, never a draw.
 */
export const TOWN_BUSINESS_TURNOVER = {
  entryPerYear: 0.116,
  /** The rate a run's closings are compared with, never drawn. */
  exitPerYearForComparison: 0.116,
} as const;

export { TOWN_BUSINESS_WORKPLACES };

/**
 * GAME ASSUMPTION: a business whose manager is this old when it closes
 * closes because the owner retired. The real share of closings from
 * retirement is not known; 22.8% of employer-business owners are 65 or
 * older (Census Annual Business Survey, as quoted).
 */
export const TOWN_OWNER_RETIREMENT_AGE = 65;

/**
 * Why a business closed, as its closing profile's reason. The first two are
 * on closings recorded before Build 19; since then a business closes when its
 * cash runs out.
 */
export const TOWN_BUSINESS_CLOSING_REASONS = {
  ownerRetired: "business:owner-retired",
  /** Nobody worked there any more, and whoever last did had not retired. */
  nobodyLeft: "business:nobody-left",
  lackOfBusiness: "business:lack-of-business",
  ranOutOfCash: TOWN_FINANCE_CLOSING_REASONS.ranOutOfCash,
} as const;

export interface TownBusiness {
  readonly organizationId: EntityId;
  readonly workplace: Workplace;
  readonly outlet: number;
  readonly name: string;
  /** Active town jobs there today. */
  readonly jobs: readonly {
    readonly relationshipId: EntityId;
    readonly personId: EntityId;
    readonly status: WorkStatusRecord;
    readonly directsOthers: boolean;
  }[];
}

const WORKPLACE_BY_KEY = new Map(
  TOWN_WORKPLACES.map((workplace) => [workplace.key, workplace]),
);

/** The town's businesses open today, in stable-key order. */
export function townBusinesses(
  world: World,
  town: EntityId,
): readonly TownBusiness[] {
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:`;
  const found = new Map<
    EntityId,
    { workplace: Workplace; outlet: number; stableKey: string }
  >();
  for (const organization of world.history.organizations) {
    if (!organization.stableKey.startsWith(stem)) continue;
    const [key, outlet] = organization.stableKey.slice(stem.length).split(":");
    const workplace = key ? WORKPLACE_BY_KEY.get(key) : undefined;
    if (!workplace || !TOWN_BUSINESS_WORKPLACES.has(workplace.key)) continue;
    if (organizationClosingAt(world, organization.id)) continue;
    found.set(organization.id, {
      workplace,
      outlet: Number(outlet),
      stableKey: organization.stableKey,
    });
  }
  if (found.size === 0) return [];
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of world.history.workStatuses)
    if (status.effectiveAt <= world.currentDate)
      latest.set(status.workRelationshipId, status);
  const jobs = new Map<EntityId, TownBusiness["jobs"][number][]>();
  for (const relationship of world.history.workRelationships) {
    if (!relationship.organizationId || !found.has(relationship.organizationId))
      continue;
    const status = latest.get(relationship.id);
    if (status?.status !== "active") continue;
    const list = jobs.get(relationship.organizationId) ?? [];
    list.push({
      relationshipId: relationship.id,
      personId: relationship.personId,
      status,
      directsOthers: relationship.authority === "directs-others",
    });
    jobs.set(relationship.organizationId, list);
  }
  return [...found]
    .sort(([, a], [, b]) => a.stableKey.localeCompare(b.stableKey))
    .map(([organizationId, entry]) => ({
      organizationId,
      workplace: entry.workplace,
      outlet: entry.outlet,
      name: organizationProfileAt(world, organizationId)?.name ?? "",
      jobs: jobs.get(organizationId) ?? [],
    }));
}

/**
 * One quarterly turn of the town's businesses, on the world's current date,
 * before its jobs turn over. `round` names the review; a review run twice
 * writes nothing new.
 */
export function reviewTownBusinesses(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
): World {
  const today = world.currentDate;
  const prefix = `${TOWN_BUSINESSES_VERSION}:${town}:${round}:`;
  if (
    world.history.organizationProfiles.some((row) =>
      row.stableKey.startsWith(prefix),
    ) ||
    world.history.workStatuses.some((row) =>
      row.stableKey.startsWith(prefix),
    ) ||
    world.history.workRelationships.some(
      (row) =>
        row.stableKey.endsWith(`:${round}:opened`) &&
        row.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:${town}:job:`),
    )
  )
    return world;
  const businesses = townBusinesses(world, town);
  if (businesses.length === 0) return world;
  const provenance = {
    kind: "generated" as const,
    generatorKey: TOWN_BUSINESSES_VERSION,
  };
  let next = world;

  // Closings. Each business's books run a quarter (`town-finances.ts`), and
  // a business whose cash and credit are both gone closes. A business the
  // player works at stays open for now: the game has no way yet to tell the
  // player their workplace closed.
  const exempt = new Set(
    businesses
      .filter((business) =>
        business.jobs.some((job) => job.personId === playerPersonId),
      )
      .map((business) => business.organizationId),
  );
  // A business nobody works at any more closes: its owner retired, died or
  // left and nobody took over.
  for (const business of businesses)
    if (business.jobs.length === 0)
      next = closeBusinessWithNobodyLeft(
        next,
        town,
        business.organizationId,
        prefix,
        TOWN_BUSINESS_CLOSING_REASONS,
      );
  const running = businesses.filter((business) => business.jobs.length > 0);
  if (running.length === 0) return next;
  const unemployment = townUnemploymentRate(next, town).value;
  const quarter = stepTownFinances(
    next,
    town,
    running.map((business) => ({
      organizationId: business.organizationId,
      kind: business.workplace.key,
      newcomer: business.outlet >= business.workplace.outlets,
    })),
    exempt,
    round,
    unemployment,
  );
  next = closeBusinessesOutOfCash(quarter.world, town, quarter.closing, prefix);

  // Openings, decided by the town's customers: a resident opens a business
  // of a kind whose customers go unserved, the kind whose spending in town
  // runs furthest past what its open businesses can serve, by at least one
  // worker's worth of sales. A kind the town has no market for yet is
  // judged by the town's own mix of jobs. Nothing is drawn.
  const weights = [...townWorkplaceWeights(town)].filter(
    ([key, weight]) => weight > 0 && TOWN_BUSINESS_WORKPLACES.has(key),
  );
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight <= 0) return next;
  const working = new Set<EntityId>();
  const latest = new Map<EntityId, string>();
  for (const row of next.history.workStatuses)
    if (row.effectiveAt <= today)
      latest.set(row.workRelationshipId, row.status);
  for (const relationship of next.history.workRelationships)
    if (latest.get(relationship.id) === "active")
      working.add(relationship.personId);
  const opened = new Set<string>();
  const founders = new Set<EntityId>();
  for (;;) {
    const open = townBusinesses(next, town);
    const jobsOf = new Map<string, number>();
    let totalJobs = 0;
    for (const business of open) {
      jobsOf.set(
        business.workplace.key,
        (jobsOf.get(business.workplace.key) ?? 0) + business.jobs.length,
      );
      totalJobs += business.jobs.length;
    }
    const unserved = townUnservedJobs(next, town);
    const [shortest] = weights
      .filter(([key]) => !opened.has(key))
      .map(
        ([key, weight]) =>
          [
            key,
            unserved.get(key) ??
              (weight / totalWeight) * totalJobs - (jobsOf.get(key) ?? 0),
          ] as const,
      )
      .filter(([, short]) => short >= 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const workplace = shortest ? WORKPLACE_BY_KEY.get(shortest[0]) : undefined;
    if (!workplace) break;
    opened.add(workplace.key);
    const lead =
      workplace.roles.find((entry) => entry.authority === "directs-others")
        ?.minAge ?? WORKING_AGE_MIN;
    // The one who opens it: a resident old enough to run it, out of work if
    // anybody is; otherwise somebody who works for someone else quits to.
    const able = townResidents(next, town)
      .filter(
        (resident) =>
          resident.personId !== playerPersonId &&
          resident.age >= lead &&
          laborStatus(next, resident) !== "retired" &&
          laborStatus(next, resident) !== "student",
      )
      .sort((a, b) => a.personId.localeCompare(b.personId));
    // Nobody leaves a business they run to open another: not whoever
    // directs one, nor a business's one remaining worker.
    const runsOne = new Set<EntityId>();
    for (const business of open)
      for (const job of business.jobs)
        if (business.jobs.length === 1) runsOne.add(job.personId);
    const idle = able.filter(
      (resident) =>
        !working.has(resident.personId) && !founders.has(resident.personId),
    );
    const owner =
      idle.length > 0
        ? idle
        : able.filter(
            (resident) =>
              !founders.has(resident.personId) &&
              !runsOne.has(resident.personId) &&
              activeWorkRelationshipsAt(next, resident.personId).every(
                (job) => job.relationship.authority !== "directs-others",
              ),
          );
    if (owner.length === 0) break;
    // The one who knows the trade opens it: someone who has worked in this
    // kind of business before, then the oldest, then by id.
    const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:${workplace.key}:`;
    const tradeOrgs = new Set(
      next.history.organizations
        .filter((row) => row.stableKey.startsWith(stem))
        .map((row) => row.id),
    );
    const knowsTrade = new Set(
      next.history.workRelationships
        .filter(
          (row) => row.organizationId && tradeOrgs.has(row.organizationId),
        )
        .map((row) => row.personId),
    );
    const chosen = [...owner].sort(
      (a, b) =>
        Number(knowsTrade.has(b.personId)) -
          Number(knowsTrade.has(a.personId)) ||
        b.age - a.age ||
        a.personId.localeCompare(b.personId),
    )[0]!;
    if (idle.length === 0)
      for (const job of activeWorkRelationshipsAt(next, chosen.personId))
        next = recordWorkStatus(next, {
          stableKey: `${prefix}founder-quit:${job.relationship.id}`,
          workRelationshipId: job.relationship.id,
          effectiveAt: today,
          status: "ended",
          reason: TOWN_JOB_END_REASONS.quit,
          supersedesStatusId: job.status.id,
          provenance,
        });
    // A new outlet number, after every one of this kind ever written.
    const written = new Set(
      next.history.organizations.map((organization) => organization.stableKey),
    );
    let outlet = workplace.outlets;
    while (written.has(`${stem}${outlet}`)) outlet += 1;
    next = writeTownEmployer(
      next,
      town,
      workplace,
      outlet,
      today,
      chosen.personId,
    );
    const organizationId = townBusinesses(next, town).find(
      (business) =>
        business.workplace.key === workplace.key && business.outlet === outlet,
    )!.organizationId;
    next = fillTownJobs(next, town, [chosen], {
      round: `${round}:opened`,
      into: { workplace: workplace.key, organizationId },
    });
    working.add(chosen.personId);
    founders.add(chosen.personId);
  }
  return next;
}

/** What the town's businesses did between two dates, for a report or test. */
export interface TownBusinessSummary {
  readonly open: number;
  readonly opened: number;
  readonly closed: number;
  readonly closedOwnerRetired: number;
  /** Jobs that ended because the business closed. */
  readonly jobsLost: number;
}

export function describeTownBusinesses(
  world: World,
  town: EntityId,
  since: string,
): TownBusinessSummary {
  const prefix = `${TOWN_BUSINESSES_VERSION}:${town}:`;
  let closed = 0;
  let closedOwnerRetired = 0;
  for (const profile of world.history.organizationProfiles)
    if (
      profile.closed &&
      profile.stableKey.startsWith(prefix) &&
      profile.effectiveAt >= since
    ) {
      closed += 1;
      if (profile.closed.reason === TOWN_BUSINESS_CLOSING_REASONS.ownerRetired)
        closedOwnerRetired += 1;
    }
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:`;
  let opened = 0;
  for (const organization of world.history.organizations) {
    if (!organization.stableKey.startsWith(stem)) continue;
    const [key, outlet] = organization.stableKey.slice(stem.length).split(":");
    const workplace = key ? WORKPLACE_BY_KEY.get(key) : undefined;
    if (
      workplace &&
      TOWN_BUSINESS_WORKPLACES.has(workplace.key) &&
      Number(outlet) >= workplace.outlets &&
      organization.formedAt >= since
    )
      opened += 1;
  }
  const jobsLost = world.history.workStatuses.filter(
    (row) =>
      row.reason === TOWN_JOB_END_REASONS.businessClosed &&
      row.stableKey.startsWith(prefix) &&
      row.effectiveAt >= since,
  ).length;
  return {
    open: townBusinesses(world, town).length,
    opened,
    closed,
    closedOwnerRetired,
    jobsLost,
  };
}

/**
 * A kind of town group people belong to, which disbands and is founded by
 * its membership: a small one is likelier to disband, and a new one is
 * founded only where enough adults belong to none of its kind.
 */
export interface TownGroupProfile {
  readonly key: string;
  readonly classification: OrganizationClassification;
  readonly participationKind: OrganizationParticipationKind;
  readonly roleKind: OrganizationParticipationRoleKind;
  /** Chance a year that one of them disbands. */
  readonly closingPerYear: number;
  /**
   * Chance a year that one is founded: per group already in town, or, for a
   * kind a town may have none of, for the town as a whole.
   */
  readonly openingPerYear: number;
  readonly openingBasis: "per-group" | "per-town";
  /** Fewer members than this doubles the chance to disband; founding takes this many. */
  readonly smallMembership: number;
  /** The most a town has at once. */
  readonly most: number;
  readonly names: readonly ((town: string) => string)[];
  /** The town workplace whose staff work there, if it has paid staff. */
  readonly staff: {
    readonly workplace: string;
    readonly minAge: number;
  } | null;
  readonly closingReason: string;
  readonly closedJobReason: string;
}

/**
 * CALIBRATION, approved by Claude CTO on 9/28/2026 as provisional: about
 * 4,000 Protestant churches closed and 3,800 opened in 2024 (Lifeway
 * Research), and 1.4% of Southern Baptist congregations closed; inferred as
 * about 1.3% of congregations disbanding and 1.2% founded a year. The
 * doubling for a small congregation, the founding size and the names are
 * game assumptions.
 */
export const TOWN_CONGREGATION_PROFILE: TownGroupProfile = {
  key: "congregation",
  classification: "community:congregation",
  participationKind: "membership:congregation",
  roleKind: "member:congregant",
  closingPerYear: 0.013,
  openingPerYear: 0.012,
  openingBasis: "per-group",
  smallMembership: 10,
  most: 8,
  names: [
    (town) => `New Hope Church of ${town}`,
    (town) => `${town} Bible Fellowship`,
    (town) => `Cornerstone Church of ${town}`,
    (town) => `${town} Chapel`,
  ],
  staff: { workplace: "congregation", minAge: 30 },
  closingReason: "congregation:disbanded",
  closedJobReason: "labor:congregation-closed",
};

/**
 * GAME PROFILE, approved by Claude CTO on 9/28/2026 as a labeled game
 * profile (no official series of club openings and closings was found):
 * a town founds a club about once every four years until it has five, and
 * one disbands about once in ten years; clubs have no paid staff.
 */
export const TOWN_CLUB_PROFILE: TownGroupProfile = {
  key: "club",
  classification: "community:association",
  participationKind: "membership:club",
  roleKind: "member:club-member",
  closingPerYear: 0.1,
  openingPerYear: 0.25,
  openingBasis: "per-town",
  smallMembership: 6,
  most: 5,
  names: [
    (town) => `${town} Garden Club`,
    (town) => `${town} Historical Society`,
    (town) => `${town} Book Club`,
    (town) => `${town} Bowling League`,
    (town) => `${town} Veterans Club`,
    (town) => `${town} Quilting Circle`,
  ],
  staff: null,
  closingReason: "club:disbanded",
  closedJobReason: "labor:club-closed",
};

export const TOWN_GROUP_PROFILES: readonly TownGroupProfile[] = [
  TOWN_CONGREGATION_PROFILE,
  TOWN_CLUB_PROFILE,
];

/** The town's open groups of one kind, each with its active members. */
export function townGroups(
  world: World,
  town: EntityId,
  profile: TownGroupProfile,
) {
  const open = world.history.organizations
    .filter((organization) => {
      const current = organizationProfileAt(world, organization.id);
      return (
        current?.classification === profile.classification &&
        current.locationJurisdictionId === town &&
        !current.closed
      );
    })
    .map((organization) => organization.id);
  const ids = new Set(open);
  const latest = new Map<EntityId, OrganizationParticipationStateRecord>();
  for (const state of world.history.organizationParticipationStates)
    if (state.effectiveAt <= world.currentDate)
      latest.set(state.participationId, state);
  const members = new Map<
    EntityId,
    {
      participationId: EntityId;
      personId: EntityId;
      state: OrganizationParticipationStateRecord;
    }[]
  >();
  for (const participation of world.history.organizationParticipations) {
    if (!ids.has(participation.organizationId)) continue;
    const state = latest.get(participation.id);
    if (state?.status !== "active") continue;
    if (world.people[participation.personId]?.homeJurisdictionId !== town)
      continue;
    const list = members.get(participation.organizationId) ?? [];
    list.push({
      participationId: participation.id,
      personId: participation.personId,
      state,
    });
    members.set(participation.organizationId, list);
  }
  return open.map((organizationId) => ({
    organizationId,
    members: members.get(organizationId) ?? [],
  }));
}

/**
 * One quarterly turn of the town's congregations and clubs. A disbanded
 * group's memberships and its staff's jobs end with it.
 */
export function reviewTownGroups(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
): World {
  let next = world;
  for (const profile of TOWN_GROUP_PROFILES)
    next = reviewTownGroupsOf(next, town, playerPersonId, round, profile);
  return next;
}

function reviewTownGroupsOf(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
  profile: TownGroupProfile,
): World {
  const today = world.currentDate;
  const prefix = `${TOWN_BUSINESSES_VERSION}:${town}:${round}:${profile.key}:`;
  if (
    world.history.organizationProfiles.some((row) =>
      row.stableKey.startsWith(prefix),
    ) ||
    world.history.organizations.some((row) => row.stableKey.startsWith(prefix))
  )
    return world;
  const groups = townGroups(world, town, profile);
  const rng = new SeededRng(world.seed).fork(prefix);
  const provenance = {
    kind: "generated" as const,
    generatorKey: TOWN_BUSINESSES_VERSION,
  };
  let next = world;
  const latestWork = new Map<EntityId, WorkStatusRecord>();
  for (const status of world.history.workStatuses)
    if (status.effectiveAt <= today)
      latestWork.set(status.workRelationshipId, status);

  for (const group of groups) {
    const chance =
      (profile.closingPerYear / 4) *
      (group.members.length < profile.smallMembership ? 2 : 1);
    if (rng.fork(`close:${group.organizationId}`).next() >= chance) continue;
    const current = organizationProfileAt(next, group.organizationId)!;
    next = recordOrganizationProfile(next, {
      stableKey: `${prefix}close:${group.organizationId}`,
      organizationId: group.organizationId,
      effectiveAt: today,
      name: current.name,
      classification: current.classification,
      locationJurisdictionId: current.locationJurisdictionId,
      provenance,
      supersedesProfileId: current.id,
      closed: { reason: profile.closingReason },
    });
    for (const member of group.members)
      next = recordOrganizationParticipationState(next, {
        stableKey: `${prefix}ended:${member.participationId}`,
        participationId: member.participationId,
        effectiveAt: today,
        status: "ended",
        roleKind: member.state.roleKind,
        context: member.state.context,
        provenance,
        supersedesStateId: member.state.id,
      });
    for (const relationship of next.history.workRelationships) {
      if (relationship.organizationId !== group.organizationId) continue;
      const status = latestWork.get(relationship.id);
      if (status?.status !== "active") continue;
      next = recordWorkStatus(next, {
        stableKey: `${prefix}job-ended:${relationship.id}`,
        workRelationshipId: relationship.id,
        effectiveAt: today,
        status: "ended",
        reason: profile.closedJobReason,
        supersedesStatusId: status.id,
        provenance,
      });
    }
  }

  // A founding, where enough adults belong to none of this kind.
  const still = townGroups(next, town, profile);
  if (still.length >= profile.most) return next;
  const expected =
    profile.openingBasis === "per-group"
      ? Math.max(1, groups.length) * (profile.openingPerYear / 4)
      : profile.openingPerYear / 4;
  if (rng.fork("found").next() >= expected) return next;
  const belonging = new Set(
    still.flatMap((entry) => entry.members.map((member) => member.personId)),
  );
  const unaffiliated = townResidents(next, town)
    .filter(
      (resident) =>
        resident.personId !== playerPersonId &&
        !belonging.has(resident.personId),
    )
    .sort((a, b) => a.personId.localeCompare(b.personId));
  if (unaffiliated.length < profile.smallMembership) return next;
  const place = lifePlaceByJurisdictionId(town);
  const townName = place?.displayName.split(",")[0]!.trim() ?? "Town";
  const taken = new Set(
    next.history.organizationProfiles
      .filter((row) => row.locationJurisdictionId === town)
      .map((row) => row.name),
  );
  const name = profile.names
    .map((named) => named(townName))
    .find((candidate) => !taken.has(candidate));
  if (!name) return next;
  const stableKey = `${prefix}founded`;
  next = createOrganization(next, {
    stableKey,
    formedAt: today,
    provenance,
    initialProfile: {
      name,
      classification: profile.classification,
      locationJurisdictionId: town,
    },
  });
  const organizationId = createStableId(
    "organization",
    `${next.id}:${stableKey}`,
  );
  // Founders drawn by a seeded key each, so the draw does not depend on order.
  const founders = unaffiliated
    .map((resident) => ({
      resident,
      key: rng.fork(`founder:${resident.personId}`).next(),
    }))
    .sort((a, b) => a.key - b.key)
    .slice(0, profile.smallMembership)
    .map((entry) => entry.resident);
  for (const founder of founders)
    next = createOrganizationParticipation(next, {
      stableKey: `${prefix}member:${founder.personId}`,
      personId: founder.personId,
      organizationId,
      startedAt: today,
      kind: profile.participationKind,
      roleKind: profile.roleKind,
      context: null,
      provenance,
    });
  if (!profile.staff) return next;
  // Its leader, from the founders out of work and old enough.
  const working = new Set(
    next.history.workRelationships
      .filter((row) => latestWork.get(row.id)?.status === "active")
      .map((row) => row.personId),
  );
  const minAge = profile.staff.minAge;
  const leader = founders.find(
    (founder) =>
      founder.age >= minAge &&
      !working.has(founder.personId) &&
      laborStatus(next, founder) !== "retired",
  );
  if (leader)
    next = fillTownJobs(next, town, [leader], {
      round: `${round}:${profile.key}:founded`,
      into: { workplace: profile.staff.workplace, organizationId },
    });
  return next;
}
