import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  workRoleAt,
} from "./life-queries";
import { townJobRate } from "./living-world/town-pay";
import { townBusinesses } from "./living-world/town-businesses";
import type {
  EntityId,
  OccupationClassification,
  Organization,
  World,
} from "./types";

export const LOCAL_BUSINESS_PLACEHOLDER = {
  researchQuestionId: "businesses-owners-and-wealth",
  currency: "USD",
  /** PLACEHOLDER: a worker's monthly pay where no published wage covers. */
  monthlyWageMinor: 280_000,
} as const;

/**
 * GAME ASSUMPTION: the percentile of the published wage distribution a
 * business's staff are paid at. Staff have been there for years, so the
 * middle of the distribution.
 */
export const LOCAL_BUSINESS_WAGE_PERCENTILE = 50;

const HOURS_PER_YEAR = 2_080;

/**
 * What one of a business's workers is paid a month in `jurisdictionId`: the
 * BLS Occupational Employment and Wage Statistics wage for the worker's
 * occupation in the town's area, never below the minimum wage. The marked
 * placeholder pay where no wage is published for that occupation and area.
 */
export function localBusinessWageMinor(
  kind: { readonly workerOccupation: OccupationClassification },
  jurisdictionId: EntityId | null,
): { readonly monthlyMinor: number; readonly sourced: boolean } {
  const rate = townJobRate(
    kind.workerOccupation,
    jurisdictionId,
    LOCAL_BUSINESS_WAGE_PERCENTILE,
  );
  return rate
    ? {
        monthlyMinor: Math.round((rate.hourlyMinor * HOURS_PER_YEAR) / 12),
        sourced: true,
      }
    : {
        monthlyMinor: LOCAL_BUSINESS_PLACEHOLDER.monthlyWageMinor,
        sourced: false,
      };
}

/**
 * The local business a grown-up new life works at when the game opens, chosen
 * from the person's own situation rather than first in the town's list.
 *
 * - Only work the person is fit for: the professional roles (legal
 *   assistant, bookkeeper) need schooling no summarized history gives. A
 *   trade is learned on the job, as most builders and mechanics learn it;
 *   an apprenticeship the history records counts as that line of work.
 * - Somebody they know works there or owns it: family and household put a
 *   person forward, as they do in the job market.
 * - Otherwise the line of work they already did: a person who worked a shop
 *   counter at school goes back to a counter.
 * - Otherwise the best-paid of those jobs, at the town's own published pay.
 *
 * Null when the town has no business, or none the person is fit for, and
 * then nobody is hired: the person starts looking for work.
 */
export function adultStartEmployer(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
): {
  organization: Organization;
  kind: {
    readonly workerTitle: string;
    readonly workerOccupation: OccupationClassification;
  };
} | null {
  if (!world.people[personId]) return null;
  const past = world.history.workRelationships.filter(
    (work) => work.personId === personId,
  );
  // Borrow only roles that an actual open town business employs today.
  // A legacy player-only business and its fixed revenue are never candidates.
  const fit = townBusinesses(world, jurisdictionId).flatMap((business) => {
    const organization = world.history.organizations.find(
      (record) => record.id === business.organizationId,
    );
    if (!organization || organization.formedAt > world.currentDate) return [];
    const seen = new Set<string>();
    return business.jobs.flatMap((job) => {
      const work = world.history.workRelationships.find(
        (record) => record.id === job.relationshipId,
      );
      const role = workRoleAt(world, job.relationshipId);
      if (
        !work ||
        work.startedAt > world.currentDate ||
        work.compensation !== "paid" ||
        job.directsOthers ||
        !role ||
        !role.occupationClassification ||
        role.occupationClassification.startsWith("profession:") ||
        role.locationJurisdictionId !== jurisdictionId
      )
        return [];
      const kind = {
        workerTitle: role.title,
        workerOccupation: role.occupationClassification,
      };
      if (!localBusinessWageMinor(kind, jurisdictionId).sourced) return [];
      const key = JSON.stringify(kind);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ organization, kind }];
    });
  });
  if (fit.length === 0) return null;
  const known = new Set<EntityId>();
  for (const kin of kinshipRelationshipsAt(world, personId))
    for (const id of kin.personIds) if (id !== personId) known.add(id);
  const homes = new Set(
    householdMembershipsAt(world, personId).map((entry) => entry.household.id),
  );
  for (const record of world.history.householdMemberships)
    if (record.personId !== personId && homes.has(record.householdId))
      known.add(record.personId);
  const vouched = fit.filter(({ organization }) =>
    [...known].some(
      (id) =>
        world.people[id] &&
        activeWorkRelationshipsAt(world, id).some(
          (entry) => entry.relationship.organizationId === organization.id,
        ),
    ),
  );
  const lines = new Set(
    past.flatMap((work) => {
      const occupation = workRoleAt(world, work.id)?.occupationClassification;
      return occupation ? [occupation.split(":")[0]!] : [];
    }),
  );
  const experienced = fit.filter(({ kind }) =>
    lines.has(kind.workerOccupation.split(":")[0]!),
  );
  const pool =
    vouched.length > 0 ? vouched : experienced.length > 0 ? experienced : fit;
  const pay = (kind: { readonly workerOccupation: OccupationClassification }) =>
    localBusinessWageMinor(kind, jurisdictionId).monthlyMinor;
  return [...pool].sort(
    (left, right) =>
      pay(right.kind) - pay(left.kind) ||
      left.organization.id.localeCompare(right.organization.id),
  )[0]!;
}
