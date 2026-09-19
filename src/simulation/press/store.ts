import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import type { EntityId, World } from "../types";
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

export function pressRecordsOfKind<K extends PressRecordKind>(
  world: World,
  kind: K,
): readonly PressRecordOf<K>[] {
  return pressRecords(world).filter(
    (record): record is PressRecordOf<K> => record.kind === kind,
  );
}

export function pressRecordById<K extends PressRecordKind>(
  world: World,
  kind: K,
  id: EntityId,
): PressRecordOf<K> | null {
  const record = pressRecords(world).find((candidate) => candidate.id === id);
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
  const record = pressRecords(world).find(
    (candidate) => candidate.stableKey === stableKey,
  );
  return record && record.kind === kind ? (record as PressRecordOf<K>) : null;
}

export function pressRecordId(world: World, stableKey: string): EntityId {
  return createStableId("press-record", `${world.id}:${stableKey}`);
}

/**
 * The single append boundary for the family. Identity, sequence and recording
 * date come from the World. The family is validated here; the full World check
 * runs at every other writer and after every due-item handler.
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
  if (pressRecords(world).some((record) => record.stableKey === stableKey)) {
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
  validatePressRecords(next, next.history.pressRecords!, new Set());
  return { world: next, record };
}
