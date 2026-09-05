import {
  activeCareResponsibilitiesAt,
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
} from "./life-queries";
import {
  activeResourceObligationsForOwner,
  currentResourceCutoff,
} from "./resource-queries";
import type { EntityId, World } from "./types";

/**
 * Who needs whom more, read out of the world rather than kept as a number.
 *
 * This exists because an offer of help is uncomfortable in proportion to what
 * you would owe for taking it, and the game had no way to notice that. What it
 * is *not* is a leverage meter. There is no stored score, nothing accumulates,
 * nobody's leverage goes up because they were nice to you, and no screen ever
 * shows any of this. Every number below is derived on the spot from records
 * that exist for other reasons, and deleting this file would remove a reading,
 * not a system.
 *
 * The distinction matters because a stored score is a claim the world would
 * have to keep true, and this is only ever an inference about a moment.
 */

export interface RelationshipDependency {
  /**
   * How much of this person's footing is arranged through the other, on
   * [0, 1]. Roof, income, care and belonging — the four things that are
   * awkward to be on the wrong side of.
   */
  readonly reliance: number;
  /** The strands the reliance is actually made of, so it can be explained. */
  readonly through: readonly RelianceStrand[];
}

export type RelianceStrand =
  | "shares-their-household"
  | "works-where-they-work"
  | "depends-on-their-care"
  | "belongs-to-their-group"
  | "owes-money";

export interface RelationshipLeverage {
  /** What the first person relies on the second for. */
  readonly theirs: RelationshipDependency;
  /** And what the second relies on the first for. */
  readonly ours: RelationshipDependency;
  /**
   * The imbalance, on [-1, +1]. Positive means the first person is the more
   * dependent of the two; zero means either mutual reliance or none, and those
   * two are genuinely the same as far as leverage goes.
   */
  readonly imbalance: number;
}

/** How much each strand counts. Roof and income first, because they are. */
const STRAND_WEIGHT: Readonly<Record<RelianceStrand, number>> = {
  "shares-their-household": 0.35,
  "works-where-they-work": 0.3,
  "depends-on-their-care": 0.2,
  "owes-money": 0.25,
  "belongs-to-their-group": 0.1,
};

function dependencyOf(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): RelationshipDependency {
  const lifeCutoff = currentLifeCutoff(world);
  const resourceCutoff = currentResourceCutoff(world);
  const strands: RelianceStrand[] = [];

  const theirHouseholds = new Set(
    householdMembershipsAt(world, otherId, lifeCutoff).map(
      (entry) => entry.membership.householdId,
    ),
  );
  if (
    householdMembershipsAt(world, personId, lifeCutoff).some((entry) =>
      theirHouseholds.has(entry.membership.householdId),
    )
  ) {
    strands.push("shares-their-household");
  }

  const theirEmployers = new Set(
    activeWorkRelationshipsAt(world, otherId, lifeCutoff)
      .filter((entry) => entry.relationship.authority === "directs-others")
      .map((entry) => entry.relationship.organizationId),
  );
  if (
    activeWorkRelationshipsAt(world, personId, lifeCutoff).some((entry) =>
      theirEmployers.has(entry.relationship.organizationId),
    )
  ) {
    strands.push("works-where-they-work");
  }

  if (
    activeCareResponsibilitiesAt(world, otherId, lifeCutoff).some(
      (entry) => entry.responsibility.recipientPersonId === personId,
    )
  ) {
    strands.push("depends-on-their-care");
  }

  const theirGroups = new Set(
    activeOrganizationParticipationsAt(world, otherId, lifeCutoff)
      .filter((entry) => entry.state.roleKind?.startsWith("leader:") === true)
      .map((entry) => entry.participation.organizationId),
  );
  if (
    activeOrganizationParticipationsAt(world, personId, lifeCutoff).some(
      (entry) => theirGroups.has(entry.participation.organizationId),
    )
  ) {
    strands.push("belongs-to-their-group");
  }

  if (
    activeResourceObligationsForOwner(
      world,
      { kind: "person", personId },
      resourceCutoff,
    ).some((obligation) =>
      world.history.resourceFlows.some(
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

/**
 * Which way the dependency runs between two people, right now.
 *
 * Symmetric by construction: reversing the arguments negates the imbalance,
 * because there is only one relationship and two readings of it.
 */
export function relationshipLeverage(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): RelationshipLeverage {
  const theirs = dependencyOf(world, personId, otherId);
  const ours = dependencyOf(world, otherId, personId);
  return {
    theirs,
    ours,
    imbalance: theirs.reliance - ours.reliance,
  };
}

/**
 * Whether asking this person for something would be uncomfortable.
 *
 * True when the asker is meaningfully the more dependent of the two — which is
 * the situation a favour changes, and the reason "just ask them" is not always
 * the free option it looks like.
 */
export function askingWouldCost(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): boolean {
  return relationshipLeverage(world, personId, otherId).imbalance >= 0.3;
}
