import { ageOnDate } from "../dates";
import {
  createOrganization,
  createOrganizationParticipation,
  recordOrganizationParticipationState,
  recordOrganizationProfile,
  recordWorkStatus,
} from "../life";
import { createStableId } from "../ids";
import { lifePlaceByJurisdictionId } from "../life-places";
import { organizationClosingAt, organizationProfileAt } from "../life-queries";
import { SeededRng } from "../rng";
import type {
  EntityId,
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

/**
 * The town's businesses open and close.
 *
 * A business is one of the town's private employers (`town-employment.ts`):
 * a farm, a store, a diner, a garage. Each quarter some close and their
 * staff lose their jobs, who then look for work like anyone laid off
 * (`town-labor-market.ts`). About as many open, each where the town is
 * shortest of that kind of business, run by a resident who was out of work.
 *
 * A closing is recorded on the organization's profile (`closed`), so its
 * name and history stay and nothing hires there again.
 */
export const TOWN_BUSINESSES_VERSION = "town-businesses-v1";

/**
 * CALIBRATION, approved by Claude CTO on 9/28/2026 as provisional: the share
 * of US establishments that open in a year, 11.6% (Census Business Dynamics
 * Statistics, 2022, as quoted by the Congressional Research Service). Exits
 * equal entries until the BDS exit rate is read.
 */
export const TOWN_BUSINESS_TURNOVER = {
  entryPerYear: 0.116,
  exitPerYear: 0.116,
} as const;

/**
 * GAME ASSUMPTION: the town workplaces that are businesses which open and
 * close. Utilities, banks, the regional office and the hospital are
 * branches or institutions that rarely close in a town's lifetime; public
 * offices, congregations, unions and parties are not businesses.
 */
export const TOWN_BUSINESS_WORKPLACES: ReadonlySet<string> = new Set([
  "farm",
  "quarry",
  "construction",
  "manufacturing",
  "wholesale",
  "retail",
  "trucking",
  "information",
  "insurance",
  "realty",
  "professional",
  "building-services",
  "private-school",
  "clinic",
  "care-home",
  "recreation",
  "restaurant",
  "inn",
  "repair",
  "personal-care",
]);

/**
 * GAME ASSUMPTION: a business whose manager is this old when it closes
 * closes because the owner retired. The real share of closings from
 * retirement is not known; 22.8% of employer-business owners are 65 or
 * older (Census Annual Business Survey, as quoted).
 */
export const TOWN_OWNER_RETIREMENT_AGE = 65;

/** Why a business closed, as its closing profile's reason. */
export const TOWN_BUSINESS_CLOSING_REASONS = {
  ownerRetired: "business:owner-retired",
  /** Until revenue and cash are modeled, every other closing. */
  lackOfBusiness: "business:lack-of-business",
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
  const rng = new SeededRng(world.seed).fork(prefix);
  const provenance = {
    kind: "generated" as const,
    generatorKey: TOWN_BUSINESSES_VERSION,
  };
  let next = world;

  // Closings.
  for (const business of businesses) {
    if (
      rng.fork(`close:${business.organizationId}`).next() >=
      TOWN_BUSINESS_TURNOVER.exitPerYear / 4
    )
      continue;
    const manager = business.jobs.find((job) => job.directsOthers);
    const managerAge = manager
      ? ageOnDate(next.people[manager.personId]!.birthDate, today)
      : null;
    const profile = organizationProfileAt(next, business.organizationId)!;
    next = recordOrganizationProfile(next, {
      stableKey: `${prefix}close:${business.organizationId}`,
      organizationId: business.organizationId,
      effectiveAt: today,
      name: profile.name,
      classification: profile.classification,
      locationJurisdictionId: profile.locationJurisdictionId,
      provenance,
      supersedesProfileId: profile.id,
      closed: {
        reason:
          managerAge !== null && managerAge >= TOWN_OWNER_RETIREMENT_AGE
            ? TOWN_BUSINESS_CLOSING_REASONS.ownerRetired
            : TOWN_BUSINESS_CLOSING_REASONS.lackOfBusiness,
      },
    });
    for (const job of business.jobs)
      next = recordWorkStatus(next, {
        stableKey: `${prefix}closed:${job.relationshipId}`,
        workRelationshipId: job.relationshipId,
        effectiveAt: today,
        status: "ended",
        reason: TOWN_JOB_END_REASONS.businessClosed,
        supersedesStatusId: job.status.id,
        provenance,
      });
  }

  // Openings: about as many as the approved entry rate gives, each of the
  // kind the town is shortest of against its own mix of jobs.
  const expected =
    (businesses.length * TOWN_BUSINESS_TURNOVER.entryPerYear) / 4;
  const openings =
    Math.floor(expected) +
    (rng.fork("openings").next() < expected - Math.floor(expected) ? 1 : 0);
  if (openings === 0) return next;
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
  for (let n = 0; n < openings; n += 1) {
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
    const [shortest] = weights
      .map(
        ([key, weight]) =>
          [
            key,
            (weight / totalWeight) * totalJobs - (jobsOf.get(key) ?? 0),
          ] as const,
      )
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const workplace = shortest ? WORKPLACE_BY_KEY.get(shortest[0]) : undefined;
    if (!workplace) break;
    const lead =
      workplace.roles.find((entry) => entry.authority === "directs-others")
        ?.minAge ?? WORKING_AGE_MIN;
    // The one who opens it: a resident out of work and old enough to run it.
    const owner = townResidents(next, town)
      .filter(
        (resident) =>
          resident.personId !== playerPersonId &&
          !working.has(resident.personId) &&
          resident.age >= lead &&
          laborStatus(next, resident) !== "retired" &&
          laborStatus(next, resident) !== "student",
      )
      .sort((a, b) => a.personId.localeCompare(b.personId));
    if (owner.length === 0) break;
    const chosen = owner[rng.fork(`owner:${n}`).integer(0, owner.length)]!;
    // A new outlet number, after every one of this kind ever written.
    const written = new Set(
      next.history.organizations.map((organization) => organization.stableKey),
    );
    let outlet = workplace.outlets;
    const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:${workplace.key}:`;
    while (written.has(`${stem}${outlet}`)) outlet += 1;
    next = writeTownEmployer(next, town, workplace, outlet, today);
    const organizationId = townBusinesses(next, town).find(
      (business) =>
        business.workplace.key === workplace.key && business.outlet === outlet,
    )!.organizationId;
    next = fillTownJobs(next, town, [chosen], {
      round: `${round}:opened`,
      into: { workplace: workplace.key, organizationId },
    });
    working.add(chosen.personId);
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
 * CALIBRATION, approved by Claude CTO on 9/28/2026 as provisional: about
 * 4,000 Protestant churches closed and 3,800 opened in 2024 (Lifeway
 * Research), and 1.4% of Southern Baptist congregations closed; inferred as
 * about 1.3% of congregations closing and 1.2% opening a year.
 */
export const TOWN_CONGREGATION_TURNOVER = {
  closingPerYear: 0.013,
  openingPerYear: 0.012,
  /**
   * GAME ASSUMPTION: a congregation with fewer members than this is twice as
   * likely to close, and one opens only where at least this many adults in
   * town belong to none.
   */
  smallMembership: 10,
} as const;

/** GAME ASSUMPTION: names for congregations founded during play. */
const NEW_CONGREGATION_NAMES: readonly ((town: string) => string)[] = [
  (town) => `New Hope Church of ${town}`,
  (town) => `${town} Bible Fellowship`,
  (town) => `Cornerstone Church of ${town}`,
  (town) => `${town} Chapel`,
];

/** Why a congregation closed, as its closing profile's reason. */
export const TOWN_CONGREGATION_CLOSING_REASON = "congregation:disbanded";

/** A town job at a congregation that closed ended for this reason. */
export const CONGREGATION_CLOSED_JOB_REASON = "labor:congregation-closed";

/** The town's open congregations, each with its active members' records. */
function townCongregations(world: World, town: EntityId) {
  const open = world.history.organizations
    .filter((organization) => {
      const profile = organizationProfileAt(world, organization.id);
      return (
        profile?.classification === "community:congregation" &&
        profile.locationJurisdictionId === town &&
        !profile.closed
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
 * One quarterly turn of the town's congregations: a small one is likelier
 * to disband, its members' memberships and its staff's jobs end with it,
 * and now and then a new one is founded by neighbors who belong to none.
 */
export function reviewTownCongregations(
  world: World,
  town: EntityId,
  playerPersonId: EntityId | null,
  round: string,
): World {
  const today = world.currentDate;
  const prefix = `${TOWN_BUSINESSES_VERSION}:${town}:${round}:congregation:`;
  if (
    world.history.organizationProfiles.some((row) =>
      row.stableKey.startsWith(prefix),
    ) ||
    world.history.organizations.some((row) => row.stableKey.startsWith(prefix))
  )
    return world;
  const congregations = townCongregations(world, town);
  const rng = new SeededRng(world.seed).fork(prefix);
  const provenance = {
    kind: "generated" as const,
    generatorKey: TOWN_BUSINESSES_VERSION,
  };
  const T = TOWN_CONGREGATION_TURNOVER;
  let next = world;
  const latestWork = new Map<EntityId, WorkStatusRecord>();
  for (const status of world.history.workStatuses)
    if (status.effectiveAt <= today)
      latestWork.set(status.workRelationshipId, status);

  for (const congregation of congregations) {
    const chance =
      (T.closingPerYear / 4) *
      (congregation.members.length < T.smallMembership ? 2 : 1);
    if (rng.fork(`close:${congregation.organizationId}`).next() >= chance)
      continue;
    const profile = organizationProfileAt(next, congregation.organizationId)!;
    next = recordOrganizationProfile(next, {
      stableKey: `${prefix}close:${congregation.organizationId}`,
      organizationId: congregation.organizationId,
      effectiveAt: today,
      name: profile.name,
      classification: profile.classification,
      locationJurisdictionId: profile.locationJurisdictionId,
      provenance,
      supersedesProfileId: profile.id,
      closed: { reason: TOWN_CONGREGATION_CLOSING_REASON },
    });
    for (const member of congregation.members)
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
      if (relationship.organizationId !== congregation.organizationId) continue;
      const status = latestWork.get(relationship.id);
      if (status?.status !== "active") continue;
      next = recordWorkStatus(next, {
        stableKey: `${prefix}job-ended:${relationship.id}`,
        workRelationshipId: relationship.id,
        effectiveAt: today,
        status: "ended",
        reason: CONGREGATION_CLOSED_JOB_REASON,
        supersedesStatusId: status.id,
        provenance,
      });
    }
  }

  // A founding: at the town's opening rate, where enough adults belong to
  // no congregation.
  const expected = Math.max(1, congregations.length) * (T.openingPerYear / 4);
  if (rng.fork("found").next() >= expected) return next;
  const belonging = new Set(
    townCongregations(next, town).flatMap((entry) =>
      entry.members.map((member) => member.personId),
    ),
  );
  const unaffiliated = townResidents(next, town)
    .filter(
      (resident) =>
        resident.personId !== playerPersonId &&
        !belonging.has(resident.personId),
    )
    .sort((a, b) => a.personId.localeCompare(b.personId));
  if (unaffiliated.length < T.smallMembership) return next;
  const place = lifePlaceByJurisdictionId(town);
  const townName = place?.displayName.split(",")[0]!.trim() ?? "Town";
  const taken = new Set(
    next.history.organizationProfiles
      .filter((profile) => profile.locationJurisdictionId === town)
      .map((profile) => profile.name),
  );
  const name = NEW_CONGREGATION_NAMES.map((named) => named(townName)).find(
    (candidate) => !taken.has(candidate),
  );
  if (!name) return next;
  const stableKey = `${prefix}founded`;
  next = createOrganization(next, {
    stableKey,
    formedAt: today,
    provenance,
    initialProfile: {
      name,
      classification: "community:congregation",
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
    .slice(0, T.smallMembership)
    .map((entry) => entry.resident);
  for (const founder of founders)
    next = createOrganizationParticipation(next, {
      stableKey: `${prefix}member:${founder.personId}`,
      personId: founder.personId,
      organizationId,
      startedAt: today,
      kind: "membership:congregation",
      roleKind: "member:congregant",
      context: null,
      provenance,
    });
  // Its pastor, from those out of work and old enough.
  const working = new Set(
    next.history.workRelationships
      .filter((row) => latestWork.get(row.id)?.status === "active")
      .map((row) => row.personId),
  );
  const pastor = founders.find(
    (founder) =>
      founder.age >= 30 &&
      !working.has(founder.personId) &&
      laborStatus(next, founder) !== "retired",
  );
  if (pastor)
    next = fillTownJobs(next, town, [pastor], {
      round: `${round}:founded`,
      into: { workplace: "congregation", organizationId },
    });
  return next;
}
