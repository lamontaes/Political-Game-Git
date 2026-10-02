import { paidOfficeOf } from "./office-pay";
import { stateJurisdictionForKey } from "./life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { LawConsequencePredicate } from "./law-consequence-types";
import { recordById } from "./history-index";
import { publicTaxAccountForIdentity } from "./tax-policy";
import {
  organizationProfileAt,
  workRelationshipHistoryForOrganization,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import type { EntityId, HistoricalCutoff, World } from "./types";

export { PAY_COVERAGE_PREDICATES } from "./law-consequences/pay-rows";

/** Actual dated payer: the employer, or its recorded government's account. */
export function payPayerAt(
  world: World,
  workId: EntityId,
  cutoff: HistoricalCutoff,
): EntityId | null {
  const work = recordById(world.history.workRelationships, workId);
  if (!work?.organizationId) return null;
  const held = paidOfficeOf(world, work, cutoff);
  if (held) {
    // Reuse the office salary writer's saved office-to-government join.
    const jurisdiction =
      held.state === "US"
        ? NATIONAL_ELECTION_JURISDICTION
        : stateJurisdictionForKey(`US-${held.state}`);
    const account = jurisdiction
      ? publicTaxAccountForIdentity(
          world,
          {
            kind: "jurisdiction",
            jurisdictionId: jurisdiction.id,
          },
          cutoff,
        )
      : null;
    return account?.organizationId ?? work.organizationId;
  }
  const profile = organizationProfileAt(world, work.organizationId, cutoff);
  const identity = profile?.publicGovernmentIdentity;
  return identity
    ? (publicTaxAccountForIdentity(world, identity, cutoff)?.organizationId ??
        null)
    : work.organizationId;
}

/** A workplace from saved, dated work/employer facts, never a home default. */
export function payWorkplaceAt(
  world: World,
  workId: EntityId,
  cutoff: HistoricalCutoff,
): { jurisdictionId: EntityId | null; factRecordIds: EntityId[] } {
  const work = recordById(world.history.workRelationships, workId);
  if (!work?.organizationId)
    throw new Error("Missing pay workplace actual employer");
  const role = workRoleAt(world, workId, cutoff);
  if (!role) throw new Error("Missing pay workplace actual dated role");
  const rolePlace =
    role.locationJurisdictionId ?? role.timeDemand.locationJurisdictionId;
  if (rolePlace) return { jurisdictionId: rolePlace, factRecordIds: [role.id] };
  const profile = organizationProfileAt(world, work.organizationId, cutoff);
  return {
    jurisdictionId: profile?.locationJurisdictionId ?? null,
    factRecordIds: [role.id, ...(profile ? [profile.id] : [])],
  };
}

/** Actual dated facts only; missing exception evidence does not override the standard. */
export function matchPayCoveragePredicates(
  world: World,
  workId: EntityId,
  predicates: readonly LawConsequencePredicate[],
  cutoff: HistoricalCutoff,
): { matches: boolean; factRecordIds: EntityId[] } {
  const work = recordById(world.history.workRelationships, workId);
  if (!work?.organizationId)
    throw new Error("Missing pay coverage actual employer");
  const role = workRoleAt(world, workId, cutoff);
  let matches = true;
  const factRecordIds = [work.id, ...(role ? [role.id] : [])];
  for (const predicate of predicates) {
    switch (predicate.capability) {
      case "pay-not-elective-public-office": {
        if (Object.keys(predicate.parameters).length !== 0)
          throw new Error("Elective office coverage takes no parameters");
        const held = paidOfficeOf(world, work, cutoff);
        matches &&=
          !held ||
          !["governor", "state-legislator", "member-of-congress"].includes(
            held.office,
          );
        break;
      }
      case "pay-occupation":
      case "pay-employer-classification": {
        if (
          Object.keys(predicate.parameters).length !== 1 ||
          typeof predicate.parameters.value !== "string"
        )
          throw new Error("Pay coverage predicate requires one recorded value");
        if (predicate.capability === "pay-occupation") {
          matches &&=
            role?.occupationClassification === predicate.parameters.value;
        } else {
          const profile = organizationProfileAt(
            world,
            work.organizationId,
            cutoff,
          );
          matches &&= profile?.classification === predicate.parameters.value;
          if (profile) factRecordIds.push(profile.id);
        }
        break;
      }
      case "pay-employer-workforce-at-most": {
        const count = predicate.parameters.count;
        if (
          Object.keys(predicate.parameters).length !== 1 ||
          typeof count !== "number" ||
          !Number.isSafeInteger(count) ||
          count < 0
        )
          throw new Error(
            "Pay workforce predicate requires an authored nonnegative count",
          );
        const active = workRelationshipHistoryForOrganization(
          world,
          work.organizationId,
          cutoff,
        ).flatMap((entry) => {
          const status = workStatusAt(world, entry.id, cutoff);
          return status?.status === "active" &&
            (entry.compensation === "paid" || entry.compensation === "mixed")
            ? [{ work: entry, status }]
            : [];
        });
        matches &&=
          new Set(active.map((entry) => entry.work.personId)).size <= count;
        factRecordIds.push(
          ...active.flatMap((entry) => [entry.work.id, entry.status.id]),
        );
        break;
      }
      default:
        throw new Error(
          `Missing pay predicate capability '${predicate.capability}'`,
        );
    }
  }
  return { matches, factRecordIds: [...new Set(factRecordIds)] };
}
