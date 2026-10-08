import { lawInForce } from "../governing/law-in-force";
import { recordById } from "../history-index";
import {
  organizationProfileAt,
  workStatusAt,
  workRoleAt,
} from "../life-queries";
import { recordLawExposure } from "../law-exposure";
import type { EntityId, World } from "../types";

const AGRICULTURE_QUESTIONS = [
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal",
  "us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
] as const;
const propositionIdsByCatalog = new WeakMap<
  object,
  ReadonlyMap<string, EntityId>
>();

function propositionIdFor(
  world: World,
  questionKey: string,
): EntityId | undefined {
  const catalog = world.policyCatalog;
  if (!catalog) return undefined;
  let byKey = propositionIdsByCatalog.get(catalog);
  if (!byKey) {
    byKey = new Map(
      Object.values(catalog.propositions).map((row) => [row.stableKey, row.id]),
    );
    propositionIdsByCatalog.set(catalog, byKey);
  }
  return byKey.get(questionKey);
}

/**
 * A saved farm job is the named person's actual contact with an agricultural
 * rule. The law applies to farm work, not to every resident of the state.
 * Place outcome links remain the source of aggregate water and land changes;
 * this records only the rule reaching a person at their recorded farm job.
 */
export function applyLW27AgricultureWorkLanding(
  world: World,
  workRelationshipId: EntityId,
): World {
  const relationship = recordById(
    world.history.workRelationships,
    workRelationshipId,
  );
  if (
    !relationship ||
    !relationship.organizationId ||
    relationship.startedAt > world.currentDate
  )
    return world;
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  if (workStatusAt(world, relationship.id, cutoff)?.status !== "active")
    return world;
  const role = workRoleAt(world, relationship.id, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (
    !role ||
    !["occupation:farmworker", "occupation:farm-manager"].includes(
      role.occupationClassification ?? "",
    )
  )
    return world;
  const profile = organizationProfileAt(world, relationship.organizationId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
  if (
    profile?.classification !== "enterprise:agriculture" ||
    !role.locationJurisdictionId ||
    !world.people[relationship.personId]
  )
    return world;

  let next = world;
  for (const questionKey of AGRICULTURE_QUESTIONS) {
    const propositionId = propositionIdFor(next, questionKey);
    if (!propositionId) continue;
    const law = lawInForce(
      next,
      role.locationJurisdictionId,
      propositionId,
      next.currentDate,
    );
    if (!law || law.answer !== "yes") continue;
    next = recordLawExposure(next, {
      stableKey: `lw27-agriculture-work:${relationship.id}:${questionKey}`,
      personId: relationship.personId,
      measureId: law.measureId,
      channel: "job-rule",
      direction: "none",
      amount: null,
      cadence: null,
      sourceRecordId: relationship.id,
      includeFamily: false,
    });
  }
  return next;
}
