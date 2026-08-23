import { makeIsoDate } from "./dates";
import { lifeEntityExists } from "./life-integrity";
import {
  assertOpenTaxonomyKey,
  LIFE_ELIGIBILITY_ACTION_NAMESPACES,
  LIFE_ELIGIBILITY_REASON_NAMESPACES,
} from "./taxonomy";
import type {
  EntityId,
  LifeEligibilityDecision,
  LifeEligibilityProvider,
  LifeEligibilityRequest,
  World,
} from "./types";

export const allowAllLifeActions: LifeEligibilityProvider = {
  evaluate: () => ({ status: "allowed", reasons: [] }),
};

export function evaluateLifeEligibility(
  world: World,
  requestInput: LifeEligibilityRequest,
  provider: LifeEligibilityProvider = allowAllLifeActions,
): LifeEligibilityDecision {
  const person = world.people[requestInput.actorPersonId];
  if (!person) {
    throw new Error(`Missing eligibility actor: ${requestInput.actorPersonId}`);
  }
  const asOfDate = makeIsoDate(requestInput.asOfDate);
  if (asOfDate < person.birthDate || asOfDate > world.currentDate) {
    throw new Error("Eligibility date is outside the actor's simulated life.");
  }
  assertOpenTaxonomyKey(
    requestInput.actionKey,
    LIFE_ELIGIBILITY_ACTION_NAMESPACES,
    "Life eligibility action",
  );
  if (
    requestInput.jurisdictionId !== null &&
    !world.jurisdictions[requestInput.jurisdictionId]
  ) {
    throw new Error(
      `Missing eligibility jurisdiction: ${requestInput.jurisdictionId}`,
    );
  }
  const contextEntityIds = [...new Set(requestInput.contextEntityIds)].sort();
  for (const id of contextEntityIds) {
    if (!eligibilityEntityExists(world, id)) {
      throw new Error(`Missing eligibility context entity: ${id}`);
    }
  }
  const request: LifeEligibilityRequest = {
    ...requestInput,
    asOfDate,
    contextEntityIds,
  };
  const result = provider.evaluate(world, request);
  if (result.status !== "allowed" && result.status !== "blocked") {
    throw new Error(
      `Invalid life eligibility status: ${String((result as { status?: unknown }).status)}`,
    );
  }
  if (result.status === "blocked" && result.reasons.length === 0) {
    throw new Error("A blocked life action requires at least one reason.");
  }
  const reasonKeys = new Set<string>();
  for (const reason of result.reasons) {
    assertOpenTaxonomyKey(
      reason.key,
      LIFE_ELIGIBILITY_REASON_NAMESPACES,
      "Life eligibility reason",
    );
    if (reason.explanation.trim().length === 0) {
      throw new Error("Life eligibility reason explanation must not be empty.");
    }
    if (reasonKeys.has(reason.key)) {
      throw new Error(`Duplicate life eligibility reason: ${reason.key}`);
    }
    reasonKeys.add(reason.key);
  }
  const reasons = result.reasons
    .map((reason) => ({ ...reason }))
    .sort((left, right) => left.key.localeCompare(right.key));
  if (result.status === "allowed") {
    return { status: "allowed", reasons };
  }
  return {
    status: "blocked",
    reasons: reasons as [
      (typeof reasons)[number],
      ...(typeof reasons)[number][],
    ],
  };
}

function eligibilityEntityExists(world: World, id: EntityId): boolean {
  return (
    id === world.id ||
    !!world.people[id] ||
    !!world.jurisdictions[id] ||
    lifeEntityExists(world, id)
  );
}
