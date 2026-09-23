import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import type { EntityId, World } from "../types";
import { worldIntegrityDeferred } from "../world";
import { validatePressRecords } from "./integrity";
import type {
  PressRecord,
  PressRecordInput,
  PressRecordKind,
  PressRecordOf,
} from "./records";

/** Every record in the family, in append order. Old saves read as empty. */
export function pressRecords(world: World): readonly PressRecord[] {
  return world.history.pressRecords ?? [];
}

/*
 * A read index over one press history array. The family is append-only and
 * every append makes a new array, so an index is keyed by the array itself and
 * can never describe a different history. When the next array starts with the
 * last indexed one, the index is extended in place and moves to it, so a desk
 * sweep that appends one record at a time pays for each record once instead
 * of rescanning the whole family on every lookup.
 */
interface PressIndex {
  length: number;
  readonly byKind: Map<PressRecordKind, PressRecord[]>;
  readonly byId: Map<EntityId, PressRecord>;
  readonly byKey: Map<string, PressRecord>;
  readonly dispositionsByLead: Map<EntityId, PressRecord[]>;
}

const INDEXES = new WeakMap<readonly PressRecord[], PressIndex>();
let lastIndexed: {
  records: readonly PressRecord[];
  index: PressIndex;
} | null = null;

function extendIndex(
  index: PressIndex,
  records: readonly PressRecord[],
): PressIndex {
  for (let at = index.length; at < records.length; at += 1) {
    const record = records[at]!;
    const ofKind = index.byKind.get(record.kind);
    if (ofKind) ofKind.push(record);
    else index.byKind.set(record.kind, [record]);
    index.byId.set(record.id, record);
    index.byKey.set(record.stableKey, record);
    if (record.kind === "story-disposition") {
      const forLead = index.dispositionsByLead.get(record.leadId);
      if (forLead) forLead.push(record);
      else index.dispositionsByLead.set(record.leadId, [record]);
    }
  }
  index.length = records.length;
  return index;
}

function continues(
  records: readonly PressRecord[],
  previous: readonly PressRecord[],
): boolean {
  if (records.length < previous.length) return false;
  for (let at = previous.length - 1; at >= 0; at -= 1) {
    if (records[at] !== previous[at]) return false;
  }
  return true;
}

function pressIndex(world: World): PressIndex {
  const records = pressRecords(world);
  const cached = INDEXES.get(records);
  if (cached) return cached;
  let index: PressIndex;
  if (lastIndexed && continues(records, lastIndexed.records)) {
    // The previous array's index is handed over; that array loses it.
    INDEXES.delete(lastIndexed.records);
    index = extendIndex(lastIndexed.index, records);
  } else {
    index = extendIndex(
      {
        length: 0,
        byKind: new Map(),
        byId: new Map(),
        byKey: new Map(),
        dispositionsByLead: new Map(),
      },
      records,
    );
  }
  INDEXES.set(records, index);
  lastIndexed = { records, index };
  return index;
}

export function pressRecordsOfKind<K extends PressRecordKind>(
  world: World,
  kind: K,
): readonly PressRecordOf<K>[] {
  return [
    ...((pressIndex(world).byKind.get(kind) ?? []) as PressRecordOf<K>[]),
  ];
}

/** Dispositions of one story lead, in append order. */
export function pressDispositionsForLead(
  world: World,
  leadId: EntityId,
): readonly PressRecordOf<"story-disposition">[] {
  return [
    ...((pressIndex(world).dispositionsByLead.get(leadId) ??
      []) as PressRecordOf<"story-disposition">[]),
  ];
}

export function pressRecordById<K extends PressRecordKind>(
  world: World,
  kind: K,
  id: EntityId,
): PressRecordOf<K> | null {
  const record = pressIndex(world).byId.get(id);
  return record && record.kind === kind ? (record as PressRecordOf<K>) : null;
}

export function requirePressRecord<K extends PressRecordKind>(
  world: World,
  kind: K,
  id: EntityId,
): PressRecordOf<K> {
  const record = pressRecordById(world, kind, id);
  if (!record) throw new Error(`Missing ${kind} record: ${id}`);
  return record;
}

export function pressRecordByKey<K extends PressRecordKind>(
  world: World,
  kind: K,
  stableKey: string,
): PressRecordOf<K> | null {
  const record = pressIndex(world).byKey.get(stableKey);
  return record && record.kind === kind ? (record as PressRecordOf<K>) : null;
}

export function pressRecordId(world: World, stableKey: string): EntityId {
  return createStableId("press-record", `${world.id}:${stableKey}`);
}

/**
 * The single append boundary for the family. Identity, sequence and recording
 * date come from the World.
 */
export function appendPressRecord<K extends PressRecordKind>(
  world: World,
  kind: K,
  input: Omit<PressRecordInput<K>, "kind">,
): { readonly world: World; readonly record: PressRecordOf<K> } {
  const stableKey = input.stableKey;
  if (stableKey.trim().length === 0) {
    throw new Error("Press record stable key must not be empty.");
  }
  if (pressIndex(world).byKey.has(stableKey)) {
    throw new Error(`Press record stable key already exists: ${stableKey}`);
  }
  const record = {
    ...input,
    kind,
    id: pressRecordId(world, stableKey),
    sequence: world.history.nextSequence,
    recordedAt: makeIsoDate(world.currentDate),
  } as unknown as PressRecordOf<K>;
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      pressRecords: [...pressRecords(world), record],
    },
  };
  // Inside a clock advance the whole World, this family included, is
  // validated once when the advance ends; elsewhere the family is checked now.
  if (!worldIntegrityDeferred()) {
    validatePressRecords(next, next.history.pressRecords!, new Set());
  }
  return { world: next, record };
}
