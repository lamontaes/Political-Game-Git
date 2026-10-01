import type { LawConsequencePredicate } from "./law-consequence-types";
import { recordById } from "./history-index";
import {
  organizationProfileAt,
  workRelationshipHistoryForOrganization,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import type { EntityId, HistoricalCutoff, World } from "./types";

export const PAY_COVERAGE_PREDICATES = [
  "pay-occupation",
  "pay-employer-classification",
  "pay-employer-workforce-at-most",
] as const;

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
        matches &&= active.length <= count;
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
