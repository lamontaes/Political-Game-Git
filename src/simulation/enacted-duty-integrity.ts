import { createStableId } from "./ids";
import { eventById } from "./event-index";
import type {
  EnactedDutyRecord,
  EnactedDutyRuleRecord,
  EntityId,
  World,
} from "./types";

/**
 * The integrity half of enacted duties. It depends only on types and ids so
 * world validation can call it without an import cycle.
 */

export const ENACTED_DUTY_EVENT_PREFIX = "enacted-duty.";

export function enactedDutyRecords(world: World): readonly EnactedDutyRecord[] {
  return world.history.enactedDutyRecords ?? [];
}

export function enactedDutyRecordId(world: World, stableKey: string): EntityId {
  return createStableId("enacted-duty-record", `${world.id}:${stableKey}`);
}

/** Runs on every write. Records are append-only and reference only earlier ones. */
export function assertEnactedDutyIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const duties = new Map<EntityId, EnactedDutyRuleRecord>();
  const keys = new Set<string>();
  const findings = new Set<string>();
  let prior = -1;
  const fail = (record: EnactedDutyRecord, message: string): never => {
    throw new Error(`Enacted duty record ${record.stableKey}: ${message}`);
  };
  for (const record of enactedDutyRecords(world)) {
    if (record.sequence <= prior) fail(record, "records are not in order.");
    prior = record.sequence;
    if (keys.has(record.stableKey)) fail(record, "duplicate stable key.");
    keys.add(record.stableKey);
    if (ids.has(record.id)) fail(record, "duplicate identity.");
    ids.add(record.id);
    if (record.id !== enactedDutyRecordId(world, record.stableKey))
      fail(record, "identity does not match its stable key.");
    if (record.recordedAt > world.currentDate)
      fail(record, "is recorded after the current date.");
    const event = eventById(world, record.eventId);
    if (
      !event ||
      event.type !== `${ENACTED_DUTY_EVENT_PREFIX}${record.kind}` ||
      event.occurredAt !== record.recordedAt ||
      event.sequence > record.sequence
    )
      fail(record, "lacks its paired ordinary event.");
    if (record.kind === "duty") {
      if (!world.jurisdictions[record.jurisdictionId])
        fail(record, "names a missing jurisdiction.");
      if (
        !(world.history.legislativeProvisions ?? []).some(
          (provision) =>
            provision.id === record.provisionId &&
            provision.measureId === record.measureId &&
            provision.provisionKey === record.provisionKey &&
            provision.sequence < record.sequence,
        )
      )
        fail(record, "does not name an earlier section of its measure.");
      if (record.complyBy < record.operativeAt)
        fail(record, "falls due before the law takes effect.");
      if (!record.coverage.coveredLabel.trim())
        fail(record, "does not say whom it covers.");
      duties.set(record.id, record);
      continue;
    }
    const duty = duties.get(record.dutyId);
    if (!duty) fail(record, "does not reference an earlier duty.");
    if (record.recordedAt < duty!.operativeAt)
      fail(record, "is recorded before the duty took effect.");
    if (
      !world.history.organizations.some((o) => o.id === record.organizationId)
    )
      fail(record, "names a missing organization.");
    const pair = `${record.dutyId}\n${record.organizationId}`;
    if (findings.has(pair)) fail(record, "repeats a finding for one body.");
    findings.add(pair);
    if (!record.reason.trim()) fail(record, "gives no reason.");
  }
}
