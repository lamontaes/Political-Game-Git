/**
 * Memory stays small (owner, Oct 12): act records keep their full reasons
 * (every option's score) for `circleDecisionDetailDays`; after that a circle
 * member's act keeps only what the "why" view needs to name the choice. The
 * player's own routine acts keep everything for `playerDecisionDetailDays`
 * (owner, Oct 20: after a year keep the summary and the reasons, not every
 * option's score); their public records and news keep everything. Writers
 * queue each record as they keep it, so condensing visits each record once
 * and never scans the log.
 */
import { parameter } from "./parameters";
import type { CoreState, DecisionResult } from "./types";
import { registerWorldMapPart } from "./snapshot";
import { forgetOldExperiences } from "./knowledge-retention";

const queues = new WeakMap<CoreState, [string, string][]>();
registerWorldMapPart("core2-decision-detail-queue", queues);
/** Condensed circle acts, to drop once older than circleActRetentionMonths. */
const dropQueues = new WeakMap<CoreState, [string, string][]>();
registerWorldMapPart("core2-decision-detail-drop-queue", dropQueues);

/** The player's own routine acts, with their full scores, to condense once a year old. */
const playerQueues = new WeakMap<CoreState, [string, string][]>();
registerWorldMapPart("core2-decision-detail-player-queue", playerQueues);

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

/** The decision with only the chosen reasons: what the "why" view needs to name the choice. */
function condenseDecision(core: CoreState, id: string): void {
  const row = core.durableLog.get(id);
  const decision = row?.decision;
  if (!row || !decision?.scores) return;
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

const daysAgo = (core: CoreState, days: number): string => {
  const cutoff = new Date(`${core.date}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff.toISOString().slice(0, 10);
};

export function condenseCircleDecisions(core: CoreState): void {
  dropOldReceiptDetail(core);
  forgetOldExperiences(core);
  condensePlayerDecisions(core);
  const queue = queues.get(core);
  if (!queue?.length) return dropOldCircleActs(core);
  const before = daysAgo(
    core,
    parameter("circleDecisionDetailDays", core.data.parameters),
  );
  let done = 0;
  while (done < queue.length && queue[done]![0] < before) {
    const row = core.durableLog.get(queue[done]![1]);
    done++;
    if (!row) continue;
    if (involvesPlayer(core, row)) {
      // The player's own routine act keeps its scores a year longer; anything
      // public or in the news, or an act by someone else, keeps its full record.
      if (
        row.kind === "person.acted" &&
        row.actorId === core.playerId &&
        !row.publicRecord &&
        !row.news
      ) {
        let waiting = playerQueues.get(core);
        if (!waiting) playerQueues.set(core, (waiting = []));
        waiting.push([row.date, row.id]);
      }
      continue;
    }
    if (row.decision && row.decision.actorId !== core.playerId)
      condenseDecision(core, row.id);
    if (row.kind === "person.acted" && !row.publicRecord && !row.news) {
      let drops = dropQueues.get(core);
      if (!drops) dropQueues.set(core, (drops = []));
      drops.push([row.date, row.id]);
    }
  }
  if (done) queue.splice(0, done);
  dropOldCircleActs(core);
}

/** The player's own routine decisions keep their summary and reasons after a year, not every option's score. */
function condensePlayerDecisions(core: CoreState): void {
  const waiting = playerQueues.get(core);
  if (!waiting?.length) return;
  const before = daysAgo(
    core,
    parameter("playerDecisionDetailDays", core.data.parameters),
  );
  let done = 0;
  while (done < waiting.length && waiting[done]![0] < before) {
    condenseDecision(core, waiting[done]![1]);
    done++;
  }
  if (done) waiting.splice(0, done);
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

/**
 * The finance engine's detailed receipt for a circle member's payment (who
 * paid what, balances before and after), and each of their shifts' attendance
 * detail, is kept circleDecisionDetailDays,
 * like the circle's decision detail; the player's own stay. The money itself
 * is in the balances and the journal, which the screens read.
 */
function dropOldReceiptDetail(core: CoreState): void {
  const receipts = core.finance.detailedReceipts;
  if (!receipts.size) return;
  const cutoff = new Date(`${core.date}T00:00:00Z`);
  cutoff.setUTCDate(
    cutoff.getUTCDate() -
      parameter("circleDecisionDetailDays", core.data.parameters),
  );
  const before = cutoff.toISOString().slice(0, 10);
  const player = core.playerId;
  // Receipts are kept in the order they were written, so the old ones lead.
  for (const [id, receipt] of receipts) {
    if (receipt.date >= before) break;
    if (
      player &&
      (receipt.payeeId === player ||
        receipt.payments.some((row) => row.payerId === player))
    )
      continue;
    Map.prototype.delete.call(receipts, id);
  }
  // Each shift's attendance detail likewise (the latest per job stays in
  // lastAttendanceByJob, which pay reads).
  const shifts = core.work.detailedAttendance;
  for (const [id, shift] of shifts) {
    if (shift.date >= before) break;
    if (shift.personId === player) continue;
    Map.prototype.delete.call(shifts, id);
  }
  if (core.date.endsWith("-01")) dropOldPayrollSources(core, before);
}

/**
 * Old payroll settlement records go too, monthly, except the ones pay still
 * reads (each ledger's last payroll and each job's latest) and the player's.
 */
function dropOldPayrollSources(core: CoreState, before: string): void {
  const work = core.work;
  const sources = work.payrollCashSources;
  if (!sources.size) return;
  const kept = new Set<string>();
  for (const ledger of work.payrollLedgerByCommitment.values())
    if (ledger.lastPayrollReceiptId) kept.add(ledger.lastPayrollReceiptId);
  for (const latest of work.latestPayrollByJob.values()) {
    kept.add(latest.id);
    const group = (latest as { groupReceiptId?: string }).groupReceiptId;
    if (group) kept.add(group);
  }
  const player = core.playerId;
  for (const [id, source] of sources) {
    if (source.date >= before) break;
    if (kept.has(id)) continue;
    if (player && JSON.stringify(source.result).includes(player)) continue;
    Map.prototype.delete.call(sources, id);
  }
}
