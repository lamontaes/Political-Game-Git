import {
  organizationParticipationHistoryForPerson,
  organizationParticipationStateHistory,
  organizationProfileAt,
} from "./life-queries";
import { currentLifeCutoff } from "./life-queries";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  OrganizationParticipationStateRecord,
  World,
} from "./types";

/**
 * A faith affiliation read from the person's own recorded congregation
 * membership. This is not a belief, religious identity, or a conclusion drawn
 * from relatives or household context.
 */
export interface FaithRecordEntry {
  readonly organizationId: EntityId;
  readonly congregationName: string | null;
  readonly startedAt: IsoDate;
  readonly states: readonly OrganizationParticipationStateRecord[];
}

/**
 * The recorded congregations a person belonged to, including inactive and
 * ended memberships. Old saves and people with no membership have an empty
 * record; no faith is inferred to fill the gap.
 */
export function faithRecordForPerson(
  world: World,
  personId: EntityId,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): readonly FaithRecordEntry[] {
  return organizationParticipationHistoryForPerson(world, personId, cutoff)
    .filter((participation) => participation.kind === "membership:congregation")
    .map((participation) => ({
      organizationId: participation.organizationId,
      congregationName:
        organizationProfileAt(world, participation.organizationId, cutoff)
          ?.name ?? null,
      startedAt: participation.startedAt,
      states: organizationParticipationStateHistory(
        world,
        participation.id,
        cutoff,
      ),
    }))
    .sort(
      (left, right) =>
        left.startedAt.localeCompare(right.startedAt) ||
        String(left.organizationId).localeCompare(String(right.organizationId)),
    );
}
