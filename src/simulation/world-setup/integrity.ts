import { createStableId } from "../ids";
import type { EntityId, EntityKind, World } from "../types";
import type { PartyRecord, WorldConditionRecord } from "./types";

export const WORLD_CONDITION_ID_KIND = "world-condition" as const;
export const PARTY_RECORD_ID_KIND = "party-record" as const;

export function worldConditionRecords(
  world: World,
): readonly WorldConditionRecord[] {
  return world.history.worldConditions ?? [];
}

export function partyRecords(world: World): readonly PartyRecord[] {
  return world.history.partyRecords ?? [];
}

export function worldSetupHistoryRecords(
  world: World,
): readonly { readonly sequence: number }[] {
  return [...worldConditionRecords(world), ...partyRecords(world)];
}

function claim(ids: Set<EntityId>, id: EntityId): void {
  if (ids.has(id)) throw new Error(`Duplicate entity ID: ${id}`);
  ids.add(id);
}

function checkFamily(
  world: World,
  records: readonly {
    readonly id: EntityId;
    readonly stableKey: string;
    readonly sequence: number;
    readonly recordedAt: string;
  }[],
  kind: EntityKind,
  label: string,
  ids: Set<EntityId>,
): void {
  const keys = new Set<string>();
  let previous = -1;
  for (const record of records) {
    if (record.sequence <= previous) {
      throw new Error(`${label} records are not in sequence order.`);
    }
    previous = record.sequence;
    if (keys.has(record.stableKey)) {
      throw new Error(`Duplicate ${label} stable key: ${record.stableKey}`);
    }
    keys.add(record.stableKey);
    if (record.id !== createStableId(kind, `${world.id}:${record.stableKey}`)) {
      throw new Error(
        `${label} ID does not match its stable key: ${record.id}`,
      );
    }
    if (record.recordedAt > world.currentDate) {
      throw new Error(
        `${label} is recorded after the current date: ${record.id}`,
      );
    }
    claim(ids, record.id);
  }
}

function finite(value: number | null, label: string): void {
  if (value !== null && !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number or null.`);
  }
}

export function assertWorldSetupIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const conditions = worldConditionRecords(world);
  checkFamily(
    world,
    conditions,
    WORLD_CONDITION_ID_KIND,
    "World condition",
    ids,
  );
  const singletons = new Set<string>();
  for (const record of conditions) {
    if (singletons.has(record.kind)) {
      throw new Error(`A save has one ${record.kind} record.`);
    }
    singletons.add(record.kind);
    if (record.effectiveDate > world.currentDate) {
      throw new Error(
        `World condition takes effect in the future: ${record.id}`,
      );
    }
    if (record.kind === "political-starting-conditions") {
      finite(record.nationalSwingPp, "National swing");
      for (const seat of record.seats) {
        finite(seat.baselineShare, `Seat ${seat.seatKey} baseline`);
        finite(seat.generatedShare, `Seat ${seat.seatKey} share`);
        finite(seat.seatResidualPp, `Seat ${seat.seatKey} residual`);
      }
    }
    if (record.kind === "macro-starting-conditions") {
      for (const value of [
        ...Object.values(record.latents),
        ...Object.values(record.initial),
        record.volatilityScale,
      ]) {
        finite(value, "Macro starting condition");
      }
    }
  }

  const records = partyRecords(world);
  checkFamily(world, records, PARTY_RECORD_ID_KIND, "Party record", ids);
  const organizationIds = new Set(
    world.history.organizations.map((organization) => organization.id),
  );
  const eventIds = new Set(world.history.events.map((event) => event.id));
  const byId = new Map(records.map((record) => [record.id, record]));
  const units = new Set<EntityId>();
  const organization = (id: EntityId | null, where: string) => {
    if (id !== null && !organizationIds.has(id)) {
      throw new Error(`${where} names a missing organization: ${id}`);
    }
  };
  const person = (id: EntityId, where: string) => {
    if (!world.people[id]) {
      throw new Error(`${where} names a missing person: ${id}`);
    }
  };
  const earlier = (
    id: EntityId,
    kind: PartyRecord["kind"],
    where: string,
    sequence: number,
  ) => {
    const target = byId.get(id);
    if (!target || target.kind !== kind || target.sequence >= sequence) {
      throw new Error(`${where} must name an earlier ${kind}: ${id}`);
    }
  };
  for (const record of records) {
    const where = `Party record ${record.id}`;
    switch (record.kind) {
      case "party-unit":
        organization(record.organizationId, where);
        organization(record.parentOrganizationId, where);
        if (units.has(record.organizationId)) {
          throw new Error(
            `An organization is one party unit: ${record.organizationId}`,
          );
        }
        units.add(record.organizationId);
        if (
          record.jurisdictionId &&
          !world.jurisdictions[record.jurisdictionId]
        ) {
          throw new Error(`${where} names a missing jurisdiction.`);
        }
        break;
      case "party-platform":
        organization(record.organizationId, where);
        if (record.decisionId) {
          earlier(
            record.decisionId,
            "party-body-decision",
            where,
            record.sequence,
          );
        }
        if (record.supersedesPlatformId) {
          earlier(
            record.supersedesPlatformId,
            "party-platform",
            where,
            record.sequence,
          );
        }
        break;
      case "party-body-decision":
        organization(record.organizationId, where);
        for (const id of [
          ...record.participantPersonIds,
          ...record.dissentingPersonIds,
        ]) {
          person(id, where);
        }
        if (
          !record.dissentingPersonIds.every((id) =>
            record.participantPersonIds.includes(id),
          )
        ) {
          throw new Error(`${where}: a dissenter must have taken part.`);
        }
        if (record.publicEventId && !eventIds.has(record.publicEventId)) {
          throw new Error(`${where} names a missing event.`);
        }
        break;
      case "party-initiative":
        person(record.proposerPersonId, where);
        for (const id of record.subjectOrganizationIds) organization(id, where);
        for (const id of record.disputedDecisionIds) {
          earlier(id, "party-body-decision", where, record.sequence);
        }
        if (
          (record.initiativeKind === "split" ||
            record.initiativeKind === "founding") &&
          record.reasonKeys.length === 0
        ) {
          throw new Error(
            `${where}: a founding or split needs its recorded reasons.`,
          );
        }
        if (
          record.initiativeKind === "split" &&
          record.disputedDecisionIds.length === 0
        ) {
          throw new Error(
            `${where}: a split needs an actual disputed decision.`,
          );
        }
        break;
      case "party-initiative-response":
        earlier(
          record.initiativeId,
          "party-initiative",
          where,
          record.sequence,
        );
        person(record.personId, where);
        organization(record.actingForOrganizationId, where);
        break;
      case "party-evolution":
        earlier(
          record.initiativeId,
          "party-initiative",
          where,
          record.sequence,
        );
        for (const id of [
          ...record.fromOrganizationIds,
          ...record.toOrganizationIds,
        ]) {
          organization(id, where);
        }
        for (const id of record.movedPersonIds) person(id, where);
        if (!eventIds.has(record.publicEventId)) {
          throw new Error(`${where} names a missing public event.`);
        }
        if (record.effectiveDate > world.currentDate) {
          throw new Error(`${where} takes effect in the future.`);
        }
        break;
    }
  }
}
