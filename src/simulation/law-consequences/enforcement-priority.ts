import {
  enforcementPriorityForLaw,
  type ExecutiveEnforcementPriority,
} from "../governing/state-governing";
import type { World } from "../types";

export interface EnforcementTarget {
  readonly subjectKey: string;
}

const PRIORITY_RANK: Record<ExecutiveEnforcementPriority, number> = {
  first: 0,
  ordinary: 1,
  lowest: 2,
};

/**
 * Order law-enforcement targets by the executive's recorded priority while
 * preserving the landing engine's existing order within each priority tier.
 */
export function orderEnforcementTargets<T extends EnforcementTarget>(
  targets: readonly T[],
  priorityFor: (subjectKey: string) => ExecutiveEnforcementPriority,
): readonly T[] {
  return targets
    .map((target, index) => ({
      target,
      index,
      rank: PRIORITY_RANK[priorityFor(target.subjectKey)],
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ target }) => target);
}

/** Shared entry point for Session 20's law landing selectors. */
export function orderExecutiveEnforcementTargets<T extends EnforcementTarget>(
  world: World,
  officeKey: string,
  targets: readonly T[],
): readonly T[] {
  return orderEnforcementTargets(targets, (subjectKey) =>
    enforcementPriorityForLaw(world, officeKey, subjectKey),
  );
}
