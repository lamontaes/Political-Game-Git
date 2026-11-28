/**
 * The cash journal's staged metadata writes: the field, map and set writes a
 * post records with what each target held before, and the check that a lifetime
 * sum is a safe amount. They import nothing at run time, so a writer that
 * stages journal metadata takes them without loading the journal's state, and
 * journal-state.ts re-exports each one.
 */
import type {
  CashJournalLifetimeMinor,
  CashJournalMetadataWrite,
} from "./journal-state";

/** Exact own-field preimage; absence and a present undefined value are distinct. */
export interface CashJournalFieldPreimage {
  target: object;
  key: PropertyKey;
  expectedPresent: boolean;
  expected: unknown;
  expectedWritable: boolean | undefined;
  expectedEnumerable: boolean | undefined;
  expectedConfigurable: boolean | undefined;
}

const maxSafeMinor = BigInt(Number.MAX_SAFE_INTEGER);

/** A lifetime sum is a nonnegative safe number, or a bigint only past the safe range. */
export function isCashJournalLifetimeMinor(
  value: unknown,
  zero: number,
): value is CashJournalLifetimeMinor {
  return typeof value === "bigint"
    ? value > maxSafeMinor
    : Number.isSafeInteger(value) && (value as number) >= zero;
}

export function plain(target: object): void {
  const prototype = Object.getPrototypeOf(target);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error(
      "Journal direct field writes require ordinary canonical rows.",
    );
}

export function directField(
  target: object,
  key: PropertyKey,
): PropertyDescriptor | undefined {
  plain(target);
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (descriptor && (!("value" in descriptor) || !descriptor.writable))
    throw new Error("Journal field is not a direct writable data field.");
  if (!descriptor && (key in target || !Object.isExtensible(target)))
    throw new Error("Journal field cannot be added directly.");
  return descriptor;
}

export function deletableField(
  target: object,
  key: PropertyKey,
): PropertyDescriptor | undefined {
  plain(target);
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (descriptor && (!("value" in descriptor) || !descriptor.configurable))
    throw new Error(
      "Journal field deletion requires a configurable direct data field.",
    );
  if (!descriptor && key in target)
    throw new Error(
      "Journal field deletion requires an own field or actual absence.",
    );
  return descriptor;
}

export function fieldPreimage(
  target: object,
  key: PropertyKey,
  before: PropertyDescriptor | undefined,
): CashJournalFieldPreimage {
  return {
    target,
    key,
    expectedPresent: before !== undefined,
    expected: before?.value,
    expectedWritable: before?.writable,
    expectedEnumerable: before?.enumerable,
    expectedConfigurable: before?.configurable,
  };
}

export function metadataScalar(value: unknown): void {
  if (
    typeof value === "number" &&
    (!Number.isFinite(value) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    throw new Error("Non-finite or overflowing staged journal metadata.");
}

export function cashJournalFieldWrite<T extends object, K extends keyof T>(
  target: T,
  key: K,
  next: T[K],
): Extract<CashJournalMetadataWrite, { kind: "field" }> {
  const before = directField(target, key);
  metadataScalar(next);
  return {
    kind: "field",
    ...fieldPreimage(target, key, before),
    next,
  };
}

type OptionalFieldKey<T extends object> = {
  [K in keyof T]-?: Record<never, never> extends Pick<T, K> ? K : never;
}[keyof T];

/** An absent optional field is a guarded no-op, never an assignment of undefined. */
export function cashJournalFieldDelete<
  T extends object,
  K extends OptionalFieldKey<T>,
>(
  target: T,
  key: K,
): Extract<CashJournalMetadataWrite, { kind: "field-delete" }> {
  return {
    kind: "field-delete",
    ...fieldPreimage(target, key, deletableField(target, key)),
  };
}

export function cashJournalMapSet<K, V>(
  target: Map<K, V>,
  key: K,
  next: V,
): Extract<CashJournalMetadataWrite, { kind: "map" }> {
  metadataScalar(next);
  return {
    kind: "map",
    target: target as Map<unknown, unknown>,
    key,
    expectedPresent: Map.prototype.has.call(target, key),
    expected: Map.prototype.get.call(target, key),
    nextPresent: true,
    next,
  };
}

export function cashJournalMapDelete<K, V>(
  target: Map<K, V>,
  key: K,
): Extract<CashJournalMetadataWrite, { kind: "map" }> {
  return {
    kind: "map",
    target: target as Map<unknown, unknown>,
    key,
    expectedPresent: Map.prototype.has.call(target, key),
    expected: Map.prototype.get.call(target, key),
    nextPresent: false,
    next: undefined,
  };
}

export function cashJournalSetWrite<T>(
  target: Set<T>,
  value: T,
  nextPresent: boolean,
): Extract<CashJournalMetadataWrite, { kind: "set" }> {
  return {
    kind: "set",
    target: target as Set<unknown>,
    value,
    expectedPresent: Set.prototype.has.call(target, value),
    nextPresent,
  };
}
