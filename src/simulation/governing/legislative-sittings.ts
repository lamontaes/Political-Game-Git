import type { ChamberRule, SessionRule } from "../legislature-rules";
import type { EntityId, World } from "../types";

/**
 * The caller supplies the body rules and the already-existing body-specific
 * adapters (member roster, filing, attendance, and executive desk). This
 * routine owns only the common sitting loop and never selects behavior by a
 * level or government name.
 */
export interface LegislativeSittingInput<T> {
  readonly chambers: readonly ChamberRule[];
  readonly session: SessionRule;
  readonly measureIds: readonly EntityId[];
  readonly eligible: (world: World, measureId: EntityId) => boolean;
  readonly takeStep: (world: World, measureId: EntityId) => T;
  readonly applyResult: (world: World, measureId: EntityId, result: T) => World;
}

/** Run each eligible bill once, in caller-provided calendar order. */
export function legislativeSittingHandler<T>(
  world: World,
  body: LegislativeSittingInput<T>,
): World {
  // Touching the rows here makes the contract explicit: every sitting is
  // attached to an admitted body rule set, even where the caller has already
  // selected the pending measures.
  if (body.chambers.length === 0 || !body.session.sessionLabel) return world;
  let next = world;
  for (const measureId of body.measureIds) {
    if (!body.eligible(next, measureId)) continue;
    next = body.applyResult(next, measureId, body.takeStep(next, measureId));
  }
  return next;
}
