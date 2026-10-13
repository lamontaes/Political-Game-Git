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
/** Condensed circle acts, to drop once older than circleActRetentionMonths. */
const dropQueues = new WeakMap<CoreState, [string, string][]>();

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

function involvesPlayer(
  core: CoreState,
  row: { actorId?: string; personIds: readonly string[] },
): boolean {
  const player = core.playerId;
  return (
    player !== undefined &&
    (row.actorId === player || row.personIds.includes(player))
  );
}

export function condenseCircleDecisions(core: CoreState): void {
  const queue = queues.get(core);
  if (!queue?.length) return dropOldCircleActs(core);
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
    // Anything the player did or was part of keeps its full record.
    if (!row || involvesPlayer(core, row)) continue;
    const decision = row.decision;
    if (decision && decision.actorId !== core.playerId && decision.scores) {
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
    if (row.kind === "person.acted" && !row.publicRecord && !row.news) {
      let drops = dropQueues.get(core);
      if (!drops) dropQueues.set(core, (drops = []));
      drops.push([row.date, row.id]);
    }
  }
  if (done) queue.splice(0, done);
  dropOldCircleActs(core);
}

/**
 * A circle member's routine act is dropped after circleActRetentionMonths:
 * the people and relationships it changed keep their state; only the old
 * entry goes (the player's own acts, public records and news stay).
 */
function dropOldCircleActs(core: CoreState): void {
  const drops = dropQueues.get(core);
  if (!drops?.length) return;
  const cutoff = new Date(`${core.date}T00:00:00Z`);
  cutoff.setUTCMonth(
    cutoff.getUTCMonth() -
      parameter("circleActRetentionMonths", core.data.parameters),
  );
  const before = cutoff.toISOString().slice(0, 10);
  let done = 0;
  while (done < drops.length && drops[done]![0] < before) {
    const id = drops[done]![1];
    done++;
    const row = core.durableLog.get(id);
    if (!row || involvesPlayer(core, row)) continue;
    core.durableLog.delete(id);
    for (const person of new Set([...row.personIds, ...(row.witnessIds ?? [])]))
      core.logByPerson.get(person)?.delete(id);
    core.logByKind.get(row.kind)?.delete(id);
    core.logByPlace.get(row.placeId)?.delete(id);
  }
  if (done) drops.splice(0, done);
}
