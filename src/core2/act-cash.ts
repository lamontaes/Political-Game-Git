/** Actual selected-act admission and typed consequences for one coupled cash occurrence. */
import { makeIsoDate } from "../simulation/dates";
import type { FinancePlanningSession } from "./finance-plan";
import type { CashJournalPostedMarker } from "./journal-state";
import type {
  ActOffer,
  CoreAPI,
  CoreState,
  DecisionResult,
  IsoDate,
  LogRecord,
  Source,
} from "./types";

/** A current module-owned selection, present before its payment; markers record completion. */
export interface CashActSelection extends CashJournalPostedMarker {
  id: string;
  date: IsoDate;
  personId: string;
  actionId: string;
  targetId: string;
  driveId?: string;
  reasonKey: string;
  cashSourceId: string;
  actCountBefore: number;
  actCountAfter: number;
  source: Source;
}

function finite(value: number, field: string): number {
  if (!Number.isFinite(value))
    throw new Error("Non-finite coupled act consequence: " + field);
  return value;
}

function count(value: number, zero: number): number {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error("Coupled act counter is malformed or overflows.");
  return value;
}

/**
 * This writer admits the actual selected choice, rather than citing a future act ID.
 * Only its minimal current selection is installed here. Every actor, aggregate and
 * visible trace change remains staged for the same final cash/noncash transaction.
 */
export function admitSelectedCashAct(
  core: CoreState,
  api: CoreAPI,
  session: FinancePlanningSession,
  actorId: string,
  offer: ActOffer,
  date: IsoDate,
  decision: DecisionResult,
  cashSourceId: string,
): CashActSelection {
  api.validateAct(actorId, offer, date, decision);
  if (
    decision.selected !== offer ||
    !cashSourceId.trim() ||
    makeIsoDate(date) !== core.date
  )
    throw new Error("Coupled cash requires the actual selected current act.");
  const r = session.reads,
    m = session.metadata,
    zero = session.zero,
    one = session.one;
  const people = r.field(core, "people"),
    actor = r.mapGet(people, actorId);
  if (!actor || !r.field(actor, "alive") || r.field(actor, "id") !== actorId)
    throw new Error("Coupled cash act requires its actual living actor.");
  r.payload(offer, zero, one);
  r.payload(decision, zero, one);
  const work = r.field(core, "work"),
    selections = r.field(work, "cashActSelections");
  const before = count(r.field(actor, "actCount"), zero),
    after = count(before + one, zero);
  const actionId = r.field(r.field(offer, "definition"), "id"),
    targetId = r.field(offer, "targetId");
  const id = `act:${date}:${actorId}:${after}`;
  if (selections.has(id))
    throw new Error("Duplicate current cash act selection.");
  const selection: CashActSelection = {
    id,
    date,
    personId: actorId,
    actionId,
    targetId,
    driveId: offer.driveId,
    reasonKey: decision.reasonKey,
    cashSourceId,
    actCountBefore: before,
    actCountAfter: after,
    source: {
      tag: "SOURCED",
      asOf: date,
      citation:
        "Actual shared-score selection admitted before its coupled payment; the canonical completion marker records settlement.",
    },
  };
  selections.set(id, selection);
  try {
    if (r.mapGet(selections, id) !== selection)
      throw new Error("Selected cash act was not admitted.");
    for (const key of [
      "id",
      "date",
      "personId",
      "actionId",
      "targetId",
      "driveId",
      "reasonKey",
      "cashSourceId",
      "actCountBefore",
      "actCountAfter",
      "source",
    ] as const)
      r.field(selection, key);
    r.payload(selection.source, zero, one);
    m.write(actor, "lastChoice", actionId);
    m.write(actor, "lastReason", decision.reasonKey);
    m.write(actor, "actCount", after);
    const byKind = r.field(actor, "actsByKind");
    m.mapSet(
      byKind,
      actionId,
      count((m.mapGet(byKind, actionId) ?? zero) + one, zero),
    );
    const month = date.slice(zero, session.parameter("isoMonthCharacters")),
      totalKey = `${month}:${actionId}`;
    const byMonth = r.field(core, "actsByMonthKind");
    m.mapSet(
      byMonth,
      totalKey,
      count((m.mapGet(byMonth, totalKey) ?? zero) + one, zero),
    );
    const counters = r.field(core, "actCounters"),
      key = `${month}:${actorId}:${actionId}`,
      prior = m.mapGet(counters, key);
    const reasons = decision.selectedReasons;
    m.mapSet(counters, key, {
      month,
      actorId,
      actionId,
      count: count((prior ? r.field(prior, "count") : zero) + one, zero),
      needContribution: finite(
        (prior ? r.field(prior, "needContribution") : zero) +
          (reasons?.need ?? zero),
        "need",
      ),
      goalContribution: finite(
        (prior ? r.field(prior, "goalContribution") : zero) +
          (reasons?.goal ?? zero),
        "goal",
      ),
      driveContribution: finite(
        (prior ? r.field(prior, "driveContribution") : zero) +
          (reasons?.drive ?? zero),
        "drive",
      ),
    });
    m.indexAdd(r.field(core, "actCountersByMonth"), month, key);
    const focused =
      r.field(core, "observer") ||
      r.field(core, "playerId") === actorId ||
      r.member(r.field(core, "focusPersonIds"), actorId);
    if (focused) {
      const logs = r.field(core, "durableLog");
      if (m.mapHas(logs, id))
        throw new Error("Coupled act trace identity already exists.");
      const placeId = r.field(actor, "placeId");
      const record: LogRecord = {
        id,
        date,
        kind: "person.acted",
        personIds: [actorId],
        placeId,
        source: {
          tag: "SOURCED",
          asOf: date,
          citation: "Prototype committed decision result.",
        },
        actorId,
        actionId,
        targetId,
        driveId: offer.driveId,
        reasonKey: decision.reasonKey,
        decision,
        visibility: core.observer ? "observer" : "circle",
      };
      m.mapSet(logs, id, record);
      m.indexAdd(r.field(core, "logByPerson"), actorId, id);
      m.indexAdd(r.field(core, "logByKind"), record.kind, id);
      m.indexAdd(r.field(core, "logByPlace"), placeId, id);
    }
    return selection;
  } catch (error) {
    selections.delete(id);
    throw error;
  }
}

/** The owning cash provider calls this on both lookups, in addition to its sealed read guard. */
export function resolveSelectedCashAct(
  core: CoreState,
  id: string,
  cashSourceId: string,
): CashActSelection {
  const selection = core.work.cashActSelections.get(id),
    actor = selection ? core.people.get(selection.personId) : undefined;
  if (
    !selection ||
    selection.id !== id ||
    selection.cashSourceId !== cashSourceId ||
    selection.date !== core.date ||
    !actor?.alive ||
    actor.actCount !== selection.actCountBefore ||
    selection.postedJournalSequence !== undefined ||
    selection.completedAt !== undefined
  )
    throw new Error("Actual uncompleted selected cash act is absent or stale.");
  return selection;
}

/** No full decision graph or growing quiet act history is stored by this admission layer. */
export function cancelUncompletedCashAct(
  core: CoreState,
  selection: CashActSelection,
): void {
  if (
    selection.postedJournalSequence === undefined &&
    selection.completedAt === undefined &&
    core.work.cashActSelections.get(selection.id) === selection
  )
    core.work.cashActSelections.delete(selection.id);
}
