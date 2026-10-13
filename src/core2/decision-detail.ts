/**
 * Memory stays small (owner, Oct 12): act records keep their full reasons
 * (every option's score) for `circleDecisionDetailDays`; after that a circle
 * member's act keeps only what the "why" view needs to name the choice. The
 * player's own acts keep everything. Writers queue each record as they keep
 * it, so condensing visits each record once and never scans the log.
 */
import { parameter } from "./parameters";
import type { CoreState, DecisionResult } from "./types";

const queues = new WeakMap<CoreState, [string, string][]>();

/** A kept act record with full reasons, to condense once it ages out. */
export function queueDecisionDetail(
  core: CoreState,
  date: string,
  id: string,
): void {
  let queue = queues.get(core);
  if (!queue) queues.set(core, (queue = []));
  queue.push([date, id]);
}

export function condenseCircleDecisions(core: CoreState): void {
  const queue = queues.get(core);
  if (!queue?.length) return;
  const cutoff = new Date(`${core.date}T00:00:00Z`);
  cutoff.setUTCDate(
    cutoff.getUTCDate() -
      parameter("circleDecisionDetailDays", core.data.parameters),
  );
  const before = cutoff.toISOString().slice(0, 10);
  let done = 0;
  while (done < queue.length && queue[done]![0] < before) {
    const row = core.durableLog.get(queue[done]![1]);
    done++;
    const decision = row?.decision;
    if (!row || !decision || decision.actorId === core.playerId) continue;
    if (decision.scores === undefined) continue;
    const kept: Record<string, unknown> = {
      actorId: decision.actorId,
      date: decision.date,
      reasonKey: decision.reasonKey,
      selectedReasons: decision.selectedReasons,
    };
    const compact = (decision as { compactChoice?: unknown }).compactChoice;
    if (compact !== undefined) kept.compactChoice = compact;
    else kept.selected = decision.selected;
    core.durableLog.set(row.id, {
      ...row,
      decision: kept as unknown as DecisionResult,
    });
  }
  if (done) queue.splice(0, done);
}
