import type { EntityId, ResourceFlow } from "../../simulation/types";
import type {
  householdMembershipsAt,
  activeWorkRelationshipsAt,
  activeCareResponsibilitiesAt,
  activeOrganizationParticipationsAt,
} from "../../simulation/life-queries";
import type { activeResourceObligationsForOwner } from "../../simulation/resource-queries";
export interface RelationshipLeverageFacts {
  readonly households: ReadonlyMap<
    EntityId,
    ReturnType<typeof householdMembershipsAt>
  >;
  readonly work: ReadonlyMap<
    EntityId,
    ReturnType<typeof activeWorkRelationshipsAt>
  >;
  readonly care: ReadonlyMap<
    EntityId,
    ReturnType<typeof activeCareResponsibilitiesAt>
  >;
  readonly groups: ReadonlyMap<
    EntityId,
    ReturnType<typeof activeOrganizationParticipationsAt>
  >;
  readonly obligations: ReadonlyMap<
    EntityId,
    ReturnType<typeof activeResourceObligationsForOwner>
  >;
  readonly flows: readonly ResourceFlow[];
}
export interface RelationshipDependency {
  readonly reliance: number;
  readonly through: readonly RelianceStrand[];
}

export type RelianceStrand =
  | "shares-their-household"
  | "works-where-they-work"
  | "depends-on-their-care"
  | "belongs-to-their-group"
  | "owes-money";

export interface RelationshipLeverage {
  readonly theirs: RelationshipDependency;
  readonly ours: RelationshipDependency;
  readonly imbalance: number;
}

const STRAND_WEIGHT: Readonly<Record<RelianceStrand, number>> = {
  "shares-their-household": 0.35,
  "works-where-they-work": 0.3,
  "depends-on-their-care": 0.2,
  "owes-money": 0.25,
  "belongs-to-their-group": 0.1,
};

function dependencyOf(
  facts: RelationshipLeverageFacts,
  personId: EntityId,
  otherId: EntityId,
): RelationshipDependency {
  const strands: RelianceStrand[] = [];
  const theirHouseholds = new Set(
    (facts.households.get(otherId) ?? []).map(
      (entry) => entry.membership.householdId,
    ),
  );
  if (
    (facts.households.get(personId) ?? []).some((entry) =>
      theirHouseholds.has(entry.membership.householdId),
    )
  ) {
    strands.push("shares-their-household");
  }
  const theirEmployers = new Set(
    (facts.work.get(otherId) ?? [])
      .filter((entry) => entry.relationship.authority === "directs-others")
      .map((entry) => entry.relationship.organizationId),
  );
  if (
    (facts.work.get(personId) ?? []).some((entry) =>
      theirEmployers.has(entry.relationship.organizationId),
    )
  ) {
    strands.push("works-where-they-work");
  }
  if (
    (facts.care.get(otherId) ?? []).some(
      (entry) => entry.responsibility.recipientPersonId === personId,
    )
  ) {
    strands.push("depends-on-their-care");
  }
  const theirGroups = new Set(
    (facts.groups.get(otherId) ?? [])
      .filter((entry) => entry.state.roleKind?.startsWith("leader:") === true)
      .map((entry) => entry.participation.organizationId),
  );
  if (
    (facts.groups.get(personId) ?? []).some((entry) =>
      theirGroups.has(entry.participation.organizationId),
    )
  ) {
    strands.push("belongs-to-their-group");
  }
  if (
    (facts.obligations.get(personId) ?? []).some((obligation) =>
      facts.flows.some(
        (flow) =>
          flow.id === obligation.resourceFlowId &&
          flow.recipient.kind === "person" &&
          flow.recipient.personId === otherId,
      ),
    )
  ) {
    strands.push("owes-money");
  }
  const reliance = Math.min(
    1,
    strands.reduce((sum, strand) => sum + STRAND_WEIGHT[strand], 0),
  );
  return { reliance, through: strands };
}

export function relationshipLeverage(
  facts: RelationshipLeverageFacts,
  personId: EntityId,
  otherId: EntityId,
): RelationshipLeverage {
  const theirs = dependencyOf(facts, personId, otherId);
  const ours = dependencyOf(facts, otherId, personId);
  return {
    theirs,
    ours,
    imbalance: theirs.reliance - ours.reliance,
  };
}
