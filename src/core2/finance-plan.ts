import { readGeneratedHouseholdSourceBasis } from "./generated-household-source";
/** Internal read-only preparation. It grants no source authority and never writes cash. */
import { daysBetween, makeIsoDate } from "../simulation/dates";
import {
  currentHouseholdPurchaseCalendarBasis,
  nextHouseholdPurchaseDate,
} from "./household-purchase-calendar";
import {
  cashJournalFieldDelete,
  cashJournalFieldWrite,
  cashJournalMapDelete,
  cashJournalMapSet,
  cashJournalSetWrite,
} from "./journal-state";
import type {
  CashJournalMetadataWrite,
  CashJournalRuntime,
} from "./journal-state";
import type {
  CashJournalPosting,
  CashJournalSourceRef,
  ResolvedCashJournalSource,
} from "./journal";
import type {
  CreditFacilityState,
  CreditReceipt,
  FinancePolicyData,
  FinanceReceipt,
  FinanceRuntime,
  FinanceTotals,
  SalesReceiptBudgetPool,
  SalesReceiptPendingBudget,
} from "./finance-types";
import type { CoreState, IsoDate, Source, WorkResult } from "./types";

type OptionalKey<T extends object> = {
  [K in keyof T]-?: Record<never, never> extends Pick<T, K> ? K : never;
}[keyof T];
type FieldRead = {
  kind: "field";
  target: object;
  key: PropertyKey;
  prototype: object | null;
  descriptor: PropertyDescriptor | undefined;
};
type MapRead = {
  kind: "map";
  target: ReadonlyMap<unknown, unknown>;
  key: unknown;
  present: boolean;
  value: unknown;
};
type SetRead = {
  kind: "set";
  target: ReadonlySet<unknown>;
  value: unknown;
  present: boolean;
};
type SizeRead = {
  kind: "set-size";
  target: ReadonlySet<unknown>;
  size: number;
};
type SetContentsRead = {
  kind: "set-contents";
  target: ReadonlySet<unknown>;
  values: readonly unknown[];
};
type MapContentsRead = {
  kind: "map-contents";
  target: ReadonlyMap<unknown, unknown>;
  entries: readonly (readonly [unknown, unknown])[];
};
type KeysRead = {
  kind: "keys";
  target: object;
  keys: readonly PropertyKey[];
};
type Read =
  | FieldRead
  | MapRead
  | SetRead
  | SizeRead
  | SetContentsRead
  | MapContentsRead
  | KeysRead;
const nativeMapHas = Map.prototype.has;
const nativeMapGet = Map.prototype.get;
const nativeMapEntries = Map.prototype.entries;
const nativeSetHas = Set.prototype.has;
const nativeSetValues = Set.prototype.values;
const nativeSetSize = Object.getOwnPropertyDescriptor(
  Set.prototype,
  "size",
)!.get!;

function sameDescriptor(
  a: PropertyDescriptor | undefined,
  b: PropertyDescriptor | undefined,
): boolean {
  return (
    (a === undefined) === (b === undefined) &&
    Object.is(a?.value, b?.value) &&
    a?.writable === b?.writable &&
    a?.enumerable === b?.enumerable &&
    a?.configurable === b?.configurable &&
    a?.get === b?.get &&
    a?.set === b?.set
  );
}

function directRead(
  target: object,
  key: PropertyKey,
): PropertyDescriptor | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (
    (descriptor && !("value" in descriptor)) ||
    (!descriptor && key in target)
  )
    throw new Error(
      "Finance preparation requires direct own data fields or actual absence.",
    );
  return descriptor;
}

function nativeMap(target: ReadonlyMap<unknown, unknown>): void {
  if (Object.getPrototypeOf(target) !== Map.prototype)
    throw new Error("Finance preparation requires the actual native map.");
}

function nativeSet(target: ReadonlySet<unknown>): void {
  if (Object.getPrototypeOf(target) !== Set.prototype)
    throw new Error("Finance preparation requires the actual native set.");
}

/** Explicit substantive reads, separate from shallow writer metadata preimages. */
export class FinanceReadGuard {
  #reads: Read[] = [];
  #fields = new Map<object, Map<PropertyKey, FieldRead>>();
  #maps = new Map<ReadonlyMap<unknown, unknown>, Map<unknown, MapRead>>();
  #sets = new Map<ReadonlySet<unknown>, Map<unknown, SetRead>>();
  #sizes = new Map<ReadonlySet<unknown>, SizeRead>();
  #contents = new Map<ReadonlySet<unknown>, SetContentsRead>();
  #sealed = false;

  #open(): void {
    if (this.#sealed) throw new Error("Finance read snapshot is sealed.");
  }

  field<T extends object, K extends keyof T>(target: T, key: K): T[K] {
    this.#open();
    const fields =
      this.#fields.get(target) ?? new Map<PropertyKey, FieldRead>();
    let read = fields.get(key);
    if (!read) {
      read = {
        kind: "field",
        target,
        key,
        prototype: Object.getPrototypeOf(target),
        descriptor: directRead(target, key),
      };
      fields.set(key, read);
      this.#fields.set(target, fields);
      this.#reads.push(read);
    }
    return read.descriptor?.value as T[K];
  }

  mapGet<K, V>(target: ReadonlyMap<K, V>, key: K): V | undefined {
    this.#open();
    nativeMap(target);
    const entries = this.#maps.get(target) ?? new Map<unknown, MapRead>();
    let read = entries.get(key);
    if (!read) {
      read = {
        kind: "map",
        target,
        key,
        present: nativeMapHas.call(target, key),
        value: nativeMapGet.call(target, key),
      };
      entries.set(key, read);
      this.#maps.set(target, entries);
      this.#reads.push(read);
    }
    return read.value as V | undefined;
  }

  mapHas<K, V>(target: ReadonlyMap<K, V>, key: K): boolean {
    this.mapGet(target, key);
    return this.#maps.get(target)!.get(key)!.present;
  }

  member<T>(target: ReadonlySet<T>, value: T): boolean {
    this.#open();
    nativeSet(target);
    const members = this.#sets.get(target) ?? new Map<unknown, SetRead>();
    let read = members.get(value);
    if (!read) {
      read = {
        kind: "set",
        target,
        value,
        present: nativeSetHas.call(target, value),
      };
      members.set(value, read);
      this.#sets.set(target, members);
      this.#reads.push(read);
    }
    return read.present;
  }

  size<T>(target: ReadonlySet<T>): number {
    this.#open();
    nativeSet(target);
    let read = this.#sizes.get(target);
    if (!read) {
      read = {
        kind: "set-size",
        target,
        size: nativeSetSize.call(target) as number,
      };
      this.#sizes.set(target, read);
      this.#reads.push(read);
    }
    return read.size;
  }

  members<T>(target: ReadonlySet<T>): readonly T[] {
    this.#open();
    nativeSet(target);
    let read = this.#contents.get(target);
    if (!read) {
      read = {
        kind: "set-contents",
        target,
        values: Object.freeze([...nativeSetValues.call(target)]),
      };
      this.#contents.set(target, read);
      this.#reads.push(read);
    }
    return read.values as readonly T[];
  }

  array<T>(target: readonly T[], zero: number, one: number): readonly T[] {
    const length = this.field(target, "length"),
      result: T[] = [];
    for (let index = zero; index < length; index += one) {
      if (!Object.getOwnPropertyDescriptor(target, index))
        throw new Error(
          "Finance input arrays must be dense direct data arrays.",
        );
      result.push(this.field(target, index));
    }
    return Object.freeze(result);
  }

  /** Bounded record shape reads, verified with the same final preflight. */
  keys(target: object): readonly PropertyKey[] {
    this.#open();
    const keys = Object.freeze(Reflect.ownKeys(target));
    this.#reads.push({ kind: "keys", target, keys });
    return keys;
  }

  /** Only a newly detached next-payload graph; never a world or historical graph. */
  payload(
    target: unknown,
    zero: number,
    one: number,
    seen = new WeakSet<object>(),
  ): void {
    this.#open();
    if (target === null || typeof target !== "object" || seen.has(target))
      return;
    seen.add(target);
    if (target instanceof Map) {
      nativeMap(target);
      const entries = Object.freeze(
        [...nativeMapEntries.call(target)].map(([key, value]) =>
          Object.freeze([key, value] as const),
        ),
      );
      this.#reads.push({ kind: "map-contents", target, entries });
      for (const [key, value] of entries) {
        this.payload(key, zero, one, seen);
        this.payload(value, zero, one, seen);
      }
    } else if (target instanceof Set) {
      for (const value of this.members(target))
        this.payload(value, zero, one, seen);
    } else {
      const keys = Object.freeze(Reflect.ownKeys(target));
      this.#reads.push({ kind: "keys", target, keys });
      for (const key of keys) {
        const value = this.field(target as Record<PropertyKey, unknown>, key);
        this.payload(value, zero, one, seen);
      }
    }
  }

  seal(): void {
    this.verify();
    this.#sealed = true;
    Object.freeze(this);
  }

  verify(): void {
    for (const read of this.#reads) {
      if (read.kind === "field") {
        if (
          Object.getPrototypeOf(read.target) !== read.prototype ||
          !sameDescriptor(read.descriptor, directRead(read.target, read.key))
        )
          throw new Error(
            "Stale finance field value, presence, identity or descriptor.",
          );
      } else if (read.kind === "map") {
        nativeMap(read.target);
        if (
          nativeMapHas.call(read.target, read.key) !== read.present ||
          !Object.is(nativeMapGet.call(read.target, read.key), read.value)
        )
          throw new Error("Stale finance map membership or value identity.");
      } else if (read.kind === "set") {
        nativeSet(read.target);
        if (nativeSetHas.call(read.target, read.value) !== read.present)
          throw new Error("Stale finance set membership.");
      } else if (read.kind === "set-size") {
        nativeSet(read.target);
        if (nativeSetSize.call(read.target) !== read.size)
          throw new Error("Stale finance index size.");
      } else if (read.kind === "set-contents") {
        nativeSet(read.target);
        const values = [...nativeSetValues.call(read.target)];
        if (
          values.length !== read.values.length ||
          values.some((value, index) => !Object.is(value, read.values[index]))
        )
          throw new Error("Stale finance set contents or order.");
      } else if (read.kind === "map-contents") {
        nativeMap(read.target);
        const entries = [...nativeMapEntries.call(read.target)];
        if (
          entries.length !== read.entries.length ||
          entries.some(([key, value], index) => {
            const previous = read.entries[index];
            if (!previous) return true;
            const [expectedKey, expectedValue] = previous;
            return (
              !Object.is(key, expectedKey) || !Object.is(value, expectedValue)
            );
          })
        )
          throw new Error("Stale finance next-payload map contents.");
      } else {
        const keys = Reflect.ownKeys(read.target);
        if (
          keys.length !== read.keys.length ||
          keys.some((key, index) => key !== read.keys[index])
        )
          throw new Error("Stale finance next-payload own fields.");
      }
    }
  }
}

function identity(value: string, field: string): void {
  if (!value || value !== value.trim())
    throw new Error("Invalid finance identity: " + field);
}

function minor(value: number, zero: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error("Invalid nonnegative integer finance amount: " + field);
}

function amount(value: number, zero: number, field: string): void {
  if (!Number.isFinite(value) || value < zero)
    throw new Error("Invalid nonnegative finite finance amount: " + field);
}

function exact(value: bigint, zero: number, field: string): number {
  const result = Number(value);
  minor(result, zero, field);
  if (BigInt(result) !== value)
    throw new Error("Finance amount overflows exact minor units: " + field);
  return result;
}

/** Detached data only. Frozen Map/Set contents also get an independent payload snapshot. */
function detach<T>(value: T, copies = new WeakMap<object, object>()): T {
  if (
    typeof value === "number" &&
    (!Number.isFinite(value) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    throw new Error("Invalid number inside prepared finance payload.");
  if (typeof value === "function" || typeof value === "symbol")
    throw new Error(
      "Prepared finance payload cannot contain executable values.",
    );
  if (value === null || typeof value !== "object") return value;
  const prior = copies.get(value);
  if (prior) return prior as T;
  if (value instanceof Map) {
    nativeMap(value);
    const result = new Map();
    copies.set(value, result);
    for (const [key, entry] of nativeMapEntries.call(value))
      result.set(detach(key, copies), detach(entry, copies));
    return Object.freeze(result) as T;
  }
  if (value instanceof Set) {
    nativeSet(value);
    const result = new Set();
    copies.set(value, result);
    for (const entry of nativeSetValues.call(value))
      result.add(detach(entry, copies));
    return Object.freeze(result) as T;
  }
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  )
    throw new Error(
      "Prepared finance payload must contain ordinary data rows.",
    );
  const result: object = Array.isArray(value) ? [] : Object.create(prototype);
  copies.set(value, result);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === "length") continue;
    const descriptor = directRead(value, key)!;
    Object.defineProperty(result, key, {
      value: detach(descriptor.value, copies),
      enumerable: descriptor.enumerable,
      writable: true,
      configurable: true,
    });
  }
  if (Array.isArray(value))
    Object.defineProperty(result, "length", {
      value: directRead(value, "length")!.value,
    });
  return Object.freeze(result) as T;
}

type FieldStage = Extract<
  CashJournalMetadataWrite,
  { kind: "field" | "field-delete" }
>;
type MapStage = Extract<CashJournalMetadataWrite, { kind: "map" }>;
type SetStage = Extract<CashJournalMetadataWrite, { kind: "set" }>;

/** One final operation per original field/map key/set member, with no callback. */
export class FinanceMetadataComposer {
  #fields = new Map<object, Map<PropertyKey, FieldStage>>();
  #maps = new Map<Map<unknown, unknown>, Map<unknown, MapStage>>();
  #sets = new Map<Set<unknown>, Map<unknown, SetStage>>();
  #detached = new WeakSet<object>();
  #sealed = false;
  constructor(
    private readonly reads: FinanceReadGuard,
    private readonly nextReads: FinanceReadGuard,
    private readonly zero: number,
    private readonly one: number,
  ) {}

  #open(): void {
    if (this.#sealed) throw new Error("Finance metadata plan is sealed.");
  }
  #next<T>(value: T): T {
    const next =
      value !== null && typeof value === "object" && this.#detached.has(value)
        ? value
        : detach(value);
    this.nextReads.payload(next, this.zero, this.one);
    if (next !== null && typeof next === "object") this.#detached.add(next);
    return next;
  }

  field<T extends object, K extends keyof T>(target: T, key: K): T[K] {
    this.#open();
    const before = this.reads.field(target, key),
      staged = this.#fields.get(target)?.get(key);
    return staged
      ? ((staged.kind === "field" ? staged.next : undefined) as T[K])
      : before;
  }

  write<T extends object, K extends keyof T>(
    target: T,
    key: K,
    value: T[K],
  ): T[K] {
    this.#open();
    this.reads.field(target, key);
    const next = this.#next(value),
      write = cashJournalFieldWrite(target, key, next);
    const fields =
      this.#fields.get(target) ?? new Map<PropertyKey, FieldStage>();
    fields.set(key, write);
    this.#fields.set(target, fields);
    return next;
  }

  delete<T extends object, K extends OptionalKey<T>>(target: T, key: K): void {
    this.#open();
    this.reads.field(target, key);
    const fields =
      this.#fields.get(target) ?? new Map<PropertyKey, FieldStage>();
    fields.set(key, cashJournalFieldDelete(target, key));
    this.#fields.set(target, fields);
  }

  mapGet<K, V>(target: Map<K, V>, key: K): V | undefined {
    this.#open();
    const before = this.reads.mapGet(target, key),
      staged = this.#maps.get(target as Map<unknown, unknown>)?.get(key);
    return staged
      ? staged.nextPresent
        ? (staged.next as V)
        : undefined
      : before;
  }

  mapHas<K, V>(target: Map<K, V>, key: K): boolean {
    this.mapGet(target, key);
    const staged = this.#maps.get(target as Map<unknown, unknown>)?.get(key);
    return staged ? staged.nextPresent : this.reads.mapHas(target, key);
  }

  mapSet<K, V>(target: Map<K, V>, key: K, value: V): V {
    this.#open();
    this.reads.mapGet(target, key);
    const next = this.#next(value),
      write = cashJournalMapSet(target, key, next);
    const entries =
      this.#maps.get(target as Map<unknown, unknown>) ??
      new Map<unknown, MapStage>();
    entries.set(key, write);
    this.#maps.set(target as Map<unknown, unknown>, entries);
    return next;
  }

  mapDelete<K, V>(target: Map<K, V>, key: K): void {
    this.#open();
    this.reads.mapGet(target, key);
    const entries =
      this.#maps.get(target as Map<unknown, unknown>) ??
      new Map<unknown, MapStage>();
    entries.set(key, cashJournalMapDelete(target, key));
    this.#maps.set(target as Map<unknown, unknown>, entries);
  }

  member<T>(target: Set<T>, value: T): boolean {
    this.#open();
    const before = this.reads.member(target, value),
      staged = this.#sets.get(target as Set<unknown>)?.get(value);
    return staged ? staged.nextPresent : before;
  }

  setMember<T>(target: Set<T>, value: T, nextPresent: boolean): void {
    this.#open();
    this.reads.member(target, value);
    const members =
      this.#sets.get(target as Set<unknown>) ?? new Map<unknown, SetStage>();
    members.set(value, cashJournalSetWrite(target, value, nextPresent));
    this.#sets.set(target as Set<unknown>, members);
  }

  size<T>(target: Set<T>): number {
    this.#open();
    let size = this.reads.size(target);
    for (const write of this.#sets.get(target as Set<unknown>)?.values() ?? [])
      if (write.expectedPresent !== write.nextPresent)
        size += write.nextPresent ? this.one : -this.one;
    return size;
  }

  clear<T>(target: Set<T>): void {
    this.#open();
    for (const value of this.reads.members(target))
      this.setMember(target, value, false);
    for (const write of this.#sets.get(target as Set<unknown>)?.values() ?? [])
      write.nextPresent = false;
  }

  indexAdd<K, V>(target: Map<K, Set<V>>, key: K, value: V): void {
    const index = this.mapGet(target, key);
    if (!index) this.mapSet(target, key, new Set([value]));
    else if (this.#detached.has(index))
      this.mapSet(target, key, new Set([...index, value]));
    else this.setMember(index, value, true);
  }

  indexRemove<K, V>(target: Map<K, Set<V>>, key: K, value: V): void {
    const index = this.mapGet(target, key);
    if (!index) return;
    if (this.#detached.has(index)) {
      const next = new Set(index);
      next.delete(value);
      if (next.size === this.zero) this.mapDelete(target, key);
      else this.mapSet(target, key, next);
    } else {
      this.setMember(index, value, false);
      if (this.size(index) === this.zero) this.mapDelete(target, key);
    }
  }

  finish(): readonly CashJournalMetadataWrite[] {
    this.#open();
    this.reads.verify();
    this.nextReads.verify();
    const result: CashJournalMetadataWrite[] = [];
    for (const fields of this.#fields.values())
      for (const write of fields.values())
        result.push(Object.freeze({ ...write }));
    for (const entries of this.#maps.values())
      for (const write of entries.values())
        if (write.nextPresent || write.expectedPresent)
          result.push(Object.freeze({ ...write }));
    for (const members of this.#sets.values())
      for (const write of members.values())
        if (write.expectedPresent !== write.nextPresent)
          result.push(Object.freeze({ ...write }));
    this.#sealed = true;
    Object.freeze(this);
    return Object.freeze(result);
  }
}

type PlannedCashOwner = {
  id: string;
  residualId: string;
  initialMinor: number;
  currentMinor: number;
  allocatedMinor: number;
  outside: boolean;
  outsideNetMinor: number;
  outsideIncomingMinor: number;
  outsideOutgoingMinor: number;
};

/** Only touched complete portfolios are read; only temporary balances are changed. */
export class FinanceCashPlanner {
  #owners = new Map<string, PlannedCashOwner>();
  #postings: CashJournalPosting[] = [];
  #legIds = new Set<string>();
  #sealed = false;
  #outsideAuthorities = new Map<string, CashJournalSourceRef>();
  constructor(
    private readonly core: CoreState,
    private readonly journal: CashJournalRuntime,
    private readonly reads: FinanceReadGuard,
    private readonly date: IsoDate,
    private readonly zero: number,
    private readonly one: number,
  ) {}

  #owner(id: string): PlannedCashOwner {
    if (this.#sealed) throw new Error("Finance cash plan is sealed.");
    const existing = this.#owners.get(id);
    if (existing) return existing;
    identity(id, "cash owner");
    const people = this.reads.field(this.core, "people"),
      organizations = this.reads.field(this.core, "organizations");
    const person = this.reads.mapGet(people, id),
      organization = this.reads.mapGet(organizations, id);
    const personPresent = this.reads.mapHas(people, id),
      organizationPresent = this.reads.mapHas(organizations, id);
    if (
      personPresent === organizationPresent ||
      (personPresent ? person : organization) === undefined
    )
      throw new Error("Finance cash owner is absent or ambiguous.");
    const row = person ?? organization!;
    if (this.reads.field(row, "id") !== id)
      throw new Error("Finance cash owner identity is inconsistent.");
    const initialMinor = this.reads.field(row, "liquidMinor");
    minor(initialMinor, this.zero, "actual cash");
    const outsideSource = organization
      ? this.reads.field(organization, "outsideFlow")
      : undefined;
    const flowLedger = this.reads.field(this.journal, "externalFlowsByOwner");
    const flow = this.reads.mapGet(flowLedger, id);
    if ((outsideSource === undefined) !== (flow === undefined))
      throw new Error(
        "Finance outside owner and canonical flow ledger disagree.",
      );
    if (outsideSource) readSource(this.reads, outsideSource, this.date);
    const accounts = this.reads.field(this.journal, "accounts"),
      indexes = this.reads.field(this.journal, "accountsByOwner"),
      counts = this.reads.field(this.journal, "accountCountByOwner"),
      residuals = this.reads.field(this.journal, "residualAccountByOwner");
    const index = this.reads.mapGet(indexes, id),
      count = this.reads.mapGet(counts, id),
      residualId = this.reads.mapGet(residuals, id);
    if (!index || count === undefined || residualId === undefined)
      throw new Error("Finance cash owner complete portfolio is absent.");
    minor(count, this.zero, "registered account count");
    const ids = this.reads.members(index);
    if (ids.length !== count || !this.reads.member(index, residualId))
      throw new Error("Finance cash owner complete portfolio is incomplete.");
    let allocated = BigInt(this.zero);
    if (
      outsideSource &&
      (initialMinor !== this.zero || ids.length !== this.one)
    )
      throw new Error("An outside payer has zero stock and one flow account.");
    for (const accountId of ids) {
      identity(accountId, "registered account");
      const account = this.reads.mapGet(accounts, accountId);
      if (
        !account ||
        this.reads.field(account, "id") !== accountId ||
        this.reads.field(account, "ownerId") !== id
      )
        throw new Error("Finance cash owner account row is inconsistent.");
      identity(this.reads.field(account, "name"), "account name");
      readSource(this.reads, this.reads.field(account, "source"), this.date);
      const fund = this.reads.field(account, "allocatedMinor");
      if (
        (this.reads.field(account, "outsideFlow") === true) !==
          (outsideSource !== undefined) ||
        (outsideSource !== undefined && fund !== undefined)
      )
        throw new Error(
          "Finance account mode does not match its actual owner.",
        );
      if ((accountId === residualId) !== (fund === undefined))
        throw new Error("Finance residual account identity is inconsistent.");
      if (fund !== undefined) {
        minor(fund, this.zero, "allocated fund");
        allocated += BigInt(fund);
      }
    }
    const allocatedMinor = exact(allocated, this.zero, "allocated funds");
    exact(BigInt(initialMinor) - allocated, this.zero, "actual residual cash");
    const outsideNetMinor = flow
      ? this.reads.field(flow, "netMinor")
      : this.zero;
    const outsideIncomingMinor = flow
      ? this.reads.field(flow, "incomingMinor")
      : this.zero;
    const outsideOutgoingMinor = flow
      ? this.reads.field(flow, "outgoingMinor")
      : this.zero;
    minor(outsideIncomingMinor, this.zero, "outside incoming total");
    minor(outsideOutgoingMinor, this.zero, "outside outgoing total");
    if (
      !Number.isSafeInteger(outsideNetMinor) ||
      BigInt(outsideNetMinor) !==
        BigInt(outsideIncomingMinor) - BigInt(outsideOutgoingMinor)
    )
      throw new Error("Finance outside signed flow totals are inconsistent.");
    const planned = {
      id,
      residualId,
      initialMinor,
      currentMinor: initialMinor,
      allocatedMinor,
      outside: outsideSource !== undefined,
      outsideNetMinor,
      outsideIncomingMinor,
      outsideOutgoingMinor,
    };
    this.#owners.set(id, planned);
    return planned;
  }

  balance(id: string): number {
    return this.#owner(id).currentMinor;
  }
  available(id: string): number {
    const row = this.#owner(id);
    if (row.outside) {
      if (!this.#outsideAuthorities.has(id))
        throw new Error(
          "Outside payment requires preparation of its actual due obligation.",
        );
      return Number.MAX_SAFE_INTEGER;
    }
    return exact(
      BigInt(row.currentMinor) - BigInt(row.allocatedMinor),
      this.zero,
      "planned residual cash",
    );
  }

  /** A label here grants no authority: the module resolver checks the actual due row. */
  authorizeOutside(ownerId: string, obligation: CashJournalSourceRef): void {
    if (this.#sealed) throw new Error("Finance cash plan is sealed.");
    const owner = this.#owner(ownerId);
    identity(obligation.kind, "outside obligation kind");
    identity(obligation.id, "outside obligation id");
    if (!owner.outside || this.#outsideAuthorities.has(ownerId))
      throw new Error(
        "Outside obligation owner is ordinary cash or already authorized.",
      );
    this.#outsideAuthorities.set(ownerId, Object.freeze({ ...obligation }));
  }

  externalFlowAuthorizations(): NonNullable<
    ResolvedCashJournalSource["externalFlowAuthorizations"]
  > {
    return Object.freeze(
      [...this.#outsideAuthorities].map(([ownerId, obligation]) =>
        Object.freeze({
          accountId: this.#owners.get(ownerId)!.residualId,
          obligation,
        }),
      ),
    );
  }

  move(
    payerId: string,
    payeeId: string,
    requested: number,
    legId: string,
  ): number {
    if (this.#sealed) throw new Error("Finance cash plan is sealed.");
    minor(requested, this.zero, "requested payment");
    identity(legId, "cash leg");
    if (payerId === payeeId || this.#legIds.has(legId))
      throw new Error("Finance cash leg endpoints or identity are invalid.");
    const payer = this.#owner(payerId),
      payee = this.#owner(payeeId);
    const paid = Math.min(requested, this.available(payerId));
    if (payee.outside && !this.#outsideAuthorities.has(payeeId))
      throw new Error(
        "Outside receipt requires preparation of its actual due obligation.",
      );
    const receiving = payee.outside
      ? payee.currentMinor
      : exact(
          BigInt(payee.currentMinor) + BigInt(paid),
          this.zero,
          "intermediate receiving balance",
        );
    const paying = payer.outside
      ? payer.currentMinor
      : exact(
          BigInt(payer.currentMinor) - BigInt(paid),
          this.zero,
          "intermediate paying balance",
        );
    const signed = (value: bigint) => {
      const result = Number(value);
      if (!Number.isSafeInteger(result) || BigInt(result) !== value)
        throw new Error("Intermediate outside net flow overflows.");
      return result;
    };
    const payerNet = payer.outside
      ? signed(BigInt(payer.outsideNetMinor) - BigInt(paid))
      : payer.outsideNetMinor;
    const payerOutgoing = payer.outside
      ? exact(
          BigInt(payer.outsideOutgoingMinor) + BigInt(paid),
          this.zero,
          "outside outgoing total",
        )
      : payer.outsideOutgoingMinor;
    const payeeNet = payee.outside
      ? signed(BigInt(payee.outsideNetMinor) + BigInt(paid))
      : payee.outsideNetMinor;
    const payeeIncoming = payee.outside
      ? exact(
          BigInt(payee.outsideIncomingMinor) + BigInt(paid),
          this.zero,
          "outside incoming total",
        )
      : payee.outsideIncomingMinor;
    payer.outsideNetMinor = payerNet;
    payer.outsideOutgoingMinor = payerOutgoing;
    payee.outsideNetMinor = payeeNet;
    payee.outsideIncomingMinor = payeeIncoming;
    this.#legIds.add(legId);
    payer.currentMinor = paying;
    payee.currentMinor = receiving;
    if (paid > this.zero)
      this.#postings.push(
        { id: legId + ":out", accountId: payer.residualId, deltaMinor: -paid },
        { id: legId + ":in", accountId: payee.residualId, deltaMinor: paid },
      );
    return paid;
  }

  finish(): readonly CashJournalPosting[] {
    if (this.#sealed) throw new Error("Finance cash plan is sealed.");
    this.reads.verify();
    this.#sealed = true;
    Object.freeze(this);
    return Object.freeze(
      this.#postings.map((row) => Object.freeze({ ...row })),
    );
  }
}

function readSource(
  reads: FinanceReadGuard,
  source: Source,
  date: IsoDate,
): Source {
  if (!source) throw new Error("Finance requires a dated source.");
  const copy: Source = {
    tag: reads.field(source, "tag"),
    asOf: reads.field(source, "asOf"),
    citation: reads.field(source, "citation"),
  };
  const estimatedFrom = reads.field(source, "estimatedFrom"),
    vintage = reads.field(source, "generationPriorVintage");
  if (estimatedFrom !== undefined) copy.estimatedFrom = estimatedFrom;
  if (vintage !== undefined) copy.generationPriorVintage = vintage;
  const generatedBasis = readGeneratedHouseholdSourceBasis(reads, source);
  if (generatedBasis !== undefined)
    copy.generatedHouseholdBasis = generatedBasis;
  if (
    !["SOURCED", "ESTIMATED"].includes(copy.tag) ||
    !copy.citation?.trim() ||
    makeIsoDate(copy.asOf) > date
  )
    throw new Error("Finance requires available dated source evidence.");
  return Object.freeze(copy);
}

export class FinancePlanPreflight {
  constructor(
    private readonly core: CoreState,
    private readonly journal: CashJournalRuntime,
    private readonly parameters: Readonly<Record<string, number>>,
    private readonly reads: FinanceReadGuard,
    private readonly nextReads: FinanceReadGuard,
  ) {
    Object.freeze(this);
  }
  /** Last pre-return step of every read-only canonical provider lookup, including the final lookup. */
  verify(
    core: CoreState,
    journal: CashJournalRuntime,
    parameters: Readonly<Record<string, number>>,
  ): void {
    if (
      core !== this.core ||
      journal !== this.journal ||
      parameters !== this.parameters
    )
      throw new Error(
        "Stale finance preparation host, journal or parameter identity.",
      );
    this.reads.verify();
    this.nextReads.verify();
  }
}

export interface PreparedFinancePlan<T> {
  readonly date: IsoDate;
  readonly postings: readonly CashJournalPosting[];
  readonly metadata: readonly CashJournalMetadataWrite[];
  readonly externalFlowAuthorizations: NonNullable<
    ResolvedCashJournalSource["externalFlowAuthorizations"]
  >;
  readonly result: T;
  readonly preflight: FinancePlanPreflight;
}

/** A module-local preparation session, never a public payment/admission API. */
export class FinancePlanningSession {
  readonly reads = new FinanceReadGuard();
  readonly nextReads = new FinanceReadGuard();
  readonly metadata: FinanceMetadataComposer;
  readonly cash: FinanceCashPlanner;
  readonly finance: FinanceRuntime;
  readonly date: IsoDate;
  readonly zero: number;
  readonly one: number;
  #sealed = false;
  constructor(
    readonly core: CoreState,
    readonly journal: CashJournalRuntime,
    readonly parameters: Readonly<Record<string, number>>,
  ) {
    this.date = makeIsoDate(this.reads.field(core, "date"));
    this.finance = this.reads.field(core, "finance");
    this.zero = this.parameter("zero");
    this.one = this.parameter("one");
    if (
      !Number.isSafeInteger(this.zero) ||
      !Number.isSafeInteger(this.one) ||
      this.zero !== this.zero - this.zero ||
      this.one <= this.zero
    )
      throw new Error("Finance requires registered integer zero and one.");
    this.metadata = new FinanceMetadataComposer(
      this.reads,
      this.nextReads,
      this.zero,
      this.one,
    );
    this.cash = new FinanceCashPlanner(
      core,
      journal,
      this.reads,
      this.date,
      this.zero,
      this.one,
    );
    Object.freeze(this);
  }

  parameter(key: string): number {
    const value = this.reads.field(this.parameters, key);
    if (value === undefined || !Number.isFinite(value))
      throw new Error("Missing registered finance parameter: " + key);
    const data = this.reads.field(this.core, "data"),
      registry = this.reads.field(data, "parameters"),
      row = this.reads.field(registry, key);
    if (!row || !Object.is(this.reads.field(row, "value"), value))
      throw new Error(
        "Finance numeric snapshot differs from its actual registered parameter: " +
          key,
      );
    return value;
  }

  map<K extends keyof FinanceRuntime>(key: K): FinanceRuntime[K] {
    return this.reads.field(this.finance, key);
  }
  policy(required = true): FinancePolicyData | undefined {
    const data = this.reads.field(this.core, "data"),
      policy = this.reads.field(data, "finance");
    if (required && !policy)
      throw new Error("Recorded finance requires finance policy.");
    return policy;
  }

  totals(kind: string, changes: Partial<FinanceTotals>): FinanceTotals {
    const map = this.map("totalsByKind"),
      previous = this.metadata.mapGet(map, kind),
      zero = this.zero;
    const result: FinanceTotals = {
      requestedMinor: previous
        ? this.reads.field(previous, "requestedMinor")
        : zero,
      paidMinor: previous ? this.reads.field(previous, "paidMinor") : zero,
      unfundedMinor: previous
        ? this.reads.field(previous, "unfundedMinor")
        : zero,
      borrowedMinor: previous
        ? this.reads.field(previous, "borrowedMinor")
        : zero,
      repaidMinor: previous ? this.reads.field(previous, "repaidMinor") : zero,
    };
    for (const key of Object.keys(result) as (keyof FinanceTotals)[])
      minor(result[key], zero, "prior total:" + kind + ":" + key);
    for (const key of Object.keys(changes) as (keyof FinanceTotals)[]) {
      result[key] = exact(
        BigInt(result[key]) + BigInt(changes[key]!),
        zero,
        "total:" + kind + ":" + key,
      );
    }
    return this.metadata.mapSet(map, kind, result);
  }

  seal<T>(result: T): PreparedFinancePlan<T> {
    if (this.#sealed) throw new Error("Finance preparation session is sealed.");
    const returned = detach(result);
    this.nextReads.payload(returned, this.zero, this.one);
    const postings = this.cash.finish(),
      metadata = this.metadata.finish();
    this.reads.seal();
    this.nextReads.seal();
    this.#sealed = true;
    return Object.freeze({
      date: this.date,
      postings,
      metadata,
      result: returned,
      externalFlowAuthorizations: this.cash.externalFlowAuthorizations(),
      preflight: new FinancePlanPreflight(
        this.core,
        this.journal,
        this.parameters,
        this.reads,
        this.nextReads,
      ),
    });
  }
}

function facility(
  session: FinancePlanningSession,
  id: string,
): CreditFacilityState {
  const row = session.metadata.mapGet(session.map("facilities"), id),
    r = session.reads,
    m = session.metadata;
  if (!row || r.field(row, "id") !== id)
    throw new Error("Recorded credit facility is absent or inconsistent.");
  readSource(r, r.field(row, "source"), session.date);
  minor(m.field(row, "principalMinor"), session.zero, "existing principal");
  minor(r.field(row, "limitMinor"), session.zero, "facility limit");
  session.cash.balance(r.field(row, "borrowerId"));
  session.cash.balance(r.field(row, "lenderId"));
  return row;
}

function accruedInterest(
  session: FinancePlanningSession,
  row: CreditFacilityState,
): number {
  const r = session.reads,
    m = session.metadata,
    data = session.policy()!;
  const elapsed = daysBetween(
    makeIsoDate(m.field(row, "lastAccruedAt")),
    makeIsoDate(session.date),
  );
  const rate = session.parameter(r.field(row, "annualInterestParameter"));
  const days = session.parameter(
    r.field(row, "interestDayCountParameter") ??
      r.field(data, "interestDayCountParameter"),
  );
  const already = m.field(row, "unbilledInterestMinor");
  amount(elapsed, session.zero, "elapsed interest days");
  amount(rate, session.zero, "annual interest rate");
  amount(already, session.zero, "already accrued interest");
  if (!Number.isFinite(days) || days <= session.zero)
    throw new Error("Invalid interest day count.");
  const accrued =
    already + (m.field(row, "principalMinor") * elapsed * rate) / days;
  amount(accrued, session.zero, "accrued interest");
  return accrued;
}

export interface FinanceCreditRequest {
  facilityId: string;
  requestedMinor: number;
  reasonKey: string;
  /** Label from a genuine current root-admitted trigger; this string grants no authority. */
  triggerId: string;
  repayment?: boolean;
}

/** Complete stageCredit extraction: exposure precedes the ordered conserving cash leg. */
export function prepareFinanceCredit(
  session: FinancePlanningSession,
  input: Readonly<FinanceCreditRequest>,
): CreditReceipt {
  const r = session.reads,
    m = session.metadata,
    zero = session.zero;
  const facilityId = r.field(input, "facilityId"),
    requested = r.field(input, "requestedMinor"),
    reasonKey = r.field(input, "reasonKey"),
    triggerId = r.field(input, "triggerId"),
    repayment = r.field(input, "repayment") ?? false;
  identity(facilityId, "facility");
  identity(reasonKey, "credit reason");
  identity(triggerId, "credit trigger");
  minor(requested, zero, "credit request");
  const row = facility(session, facilityId),
    accrued = accruedInterest(session, row),
    principalBeforeMinor = m.field(row, "principalMinor"),
    limit = r.field(row, "limitMinor"),
    active = r.field(row, "active"),
    borrowerId = r.field(row, "borrowerId"),
    lenderId = r.field(row, "lenderId");
  const id = `credit:${session.date}:${facilityId}:${repayment ? "repay" : "draw"}:${triggerId}`;
  const requestIds = session.map("creditRequestIds");
  if (
    m.field(session.finance, "creditRequestsAt") === session.date &&
    m.member(requestIds, id)
  )
    throw new Error("Duplicate credit request.");
  const borrowerBeforeMinor = session.cash.balance(borrowerId),
    lenderBeforeMinor = session.cash.balance(lenderId);
  const bounded = repayment
    ? Math.min(requested, principalBeforeMinor)
    : active
      ? Math.min(requested, Math.max(zero, limit - principalBeforeMinor))
      : zero;
  const transferredMinor = repayment
    ? session.cash.move(borrowerId, lenderId, bounded, id + ":cash")
    : session.cash.move(lenderId, borrowerId, bounded, id + ":cash");
  const principalAfterMinor = exact(
    BigInt(principalBeforeMinor) +
      (repayment ? -BigInt(transferredMinor) : BigInt(transferredMinor)),
    zero,
    "principal after transfer",
  );
  const receipt: CreditReceipt = {
    id,
    facilityId,
    date: session.date,
    reasonKey,
    requestedMinor: requested,
    transferredMinor,
    principalBeforeMinor,
    principalAfterMinor,
    borrowerBeforeMinor,
    borrowerAfterMinor: session.cash.balance(borrowerId),
    lenderBeforeMinor,
    lenderAfterMinor: session.cash.balance(lenderId),
    source: {
      tag: "SOURCED",
      asOf: session.date,
      citation:
        "Actual conserving prototype loan transfer under separately sourced standing facility terms; no inferred approval or new cash.",
    },
  };
  m.write(row, "unbilledInterestMinor", accrued);
  m.write(row, "lastAccruedAt", session.date);
  m.write(row, "principalMinor", principalAfterMinor);
  if (m.field(session.finance, "creditRequestsAt") !== session.date) {
    m.write(session.finance, "creditRequestsAt", session.date);
    m.clear(requestIds);
  }
  m.setMember(requestIds, id, true);
  const stored = m.mapSet(
    session.map("latestCreditByFacility"),
    facilityId,
    receipt,
  );
  session.totals(
    "credit",
    repayment
      ? { repaidMinor: transferredMinor }
      : { borrowedMinor: transferredMinor },
  );
  return stored;
}

function nextDate(
  session: FinancePlanningSession,
  from: string,
  months: number,
  billingDay: number,
): IsoDate {
  const date = new Date(`${makeIsoDate(from)}T00:00:00.000Z`);
  if (!Number.isSafeInteger(months) || months <= session.zero)
    throw new Error(
      "Finance period must be a positive whole calendar month count.",
    );
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth() + months;
  const last = new Date(
    Date.UTC(year, month + session.one, session.zero),
  ).getUTCDate();
  const next = new Date(Date.UTC(year, month, Math.min(billingDay, last)))
    .toISOString()
    .split("T")[session.zero]!;
  if (next <= from) throw new Error("Finance calendar must advance.");
  return makeIsoDate(next);
}

function income(
  session: FinancePlanningSession,
  personId: string,
  kindId: string,
  paid: number,
): void {
  const r = session.reads,
    m = session.metadata,
    people = r.field(session.core, "people"),
    homes = r.field(session.core, "households"),
    person = r.mapGet(people, personId),
    home = person ? r.mapGet(homes, r.field(person, "householdId")) : undefined;
  if (
    !person ||
    !home ||
    !r
      .array(r.field(home, "memberIds"), session.zero, session.one)
      .includes(personId)
  )
    throw new Error(
      "Actual income requires the recipient's recorded household residence.",
    );
  const month = session.date.slice(
    session.zero,
    session.parameter("isoMonthCharacters"),
  );
  const key = `${month}:${r.field(home, "placeId")}`,
    kindKey = `${key}:${kindId}`;
  const totals = session.map("paidIncomeByPlaceMonth"),
    kinds = session.map("paidIncomeByPlaceMonthKind");
  m.mapSet(
    totals,
    key,
    exact(
      BigInt(m.mapGet(totals, key) ?? session.zero) + BigInt(paid),
      session.zero,
      "actual resident paid income",
    ),
  );
  m.mapSet(
    kinds,
    kindKey,
    exact(
      BigInt(m.mapGet(kinds, kindKey) ?? session.zero) + BigInt(paid),
      session.zero,
      "actual resident paid income by kind",
    ),
  );
}

/** Complete settlement preparation; root owns the standing occurrence and composite authority. */
export function prepareFinanceContract(
  session: FinancePlanningSession,
  id: string,
): FinanceReceipt {
  const r = session.reads,
    m = session.metadata,
    zero = session.zero,
    data = session.policy()!,
    row = m.mapGet(session.map("contracts"), id);
  if (
    !row ||
    r.field(row, "id") !== id ||
    r.field(row, "endedAt") ||
    m.field(row, "dueAt") > session.date ||
    m.field(row, "lastSettledAt") === session.date
  )
    throw new Error(
      "Finance contract is absent, retired, not due or already settled.",
    );
  readSource(r, r.field(row, "source"), session.date);
  const endsAt = r.field(row, "endsAt");
  if (endsAt && session.date >= endsAt)
    throw new Error("Finite finance budget has ended.");
  const dueAt = m.field(row, "dueAt"),
    calendarMarker = r.field(row, "householdPurchaseCalendar"),
    nominalDueAt = calendarMarker ? m.field(row, "nominalDueAt") : dueAt;
  if (!nominalDueAt)
    throw new Error(
      "Generated household purchase is missing its nominal monthly date.",
    );
  const nextNominalDueAt = nextDate(
      session,
      nominalDueAt,
      r.field(row, "periodMonths"),
      r.field(row, "billingDay"),
    ),
    followingNominalDueAt = calendarMarker
      ? nextDate(
          session,
          nextNominalDueAt,
          r.field(row, "periodMonths"),
          r.field(row, "billingDay"),
        )
      : undefined,
    currentCalendarBasis = currentHouseholdPurchaseCalendarBasis(session, row),
    nextCalendarBasis = calendarMarker
      ? nextHouseholdPurchaseDate(
          session,
          row,
          nextNominalDueAt,
          followingNominalDueAt!,
        )
      : undefined,
    next = nextCalendarBasis?.effectiveDueAt ?? nextNominalDueAt;
  if (next <= session.date)
    throw new Error(
      "Finance bills must settle chronologically, without skipped periods.",
    );
  const payeeId = r.field(row, "payeeId"),
    payerIds = r.array(r.field(row, "payerIds"), zero, session.one);
  if (payerIds.length <= zero)
    throw new Error("Finance contract has no recorded payer.");
  const before = session.cash.balance(payeeId);
  for (const payerId of payerIds) session.cash.balance(payerId);
  const businesses = session.map("businesses"),
    payerBook = m.mapGet(businesses, payerIds[zero]!),
    operating = payerBook
      ? r
          .array(r.field(payerBook, "costContractIds"), zero, session.one)
          .includes(id)
      : false;
  const interestId = r.field(row, "interestFacilityId"),
    interest = interestId ? facility(session, interestId) : undefined;
  let base = r.field(row, "amountMinor"),
    interestRemainder: number | undefined,
    salesBudget: SalesReceiptBudgetPool | undefined,
    salesBasis: SalesReceiptPendingBudget | undefined;
  if (interest) {
    const accrued =
      accruedInterest(session, interest) +
      m.field(interest, "interestRemainderMinor");
    amount(accrued, zero, "interest terms");
    base = Math.floor(accrued);
    interestRemainder = accrued - base;
  } else if (r.field(row, "salesReceiptBudget")) {
    salesBudget = m.mapGet(
      session.map("salesBudgetPoolsByPayer"),
      payerIds[zero]!,
    );
    const request = salesBudget
      ? r.mapGet(r.field(salesBudget, "requestedByContract"), id)
      : undefined;
    salesBasis = salesBudget
      ? r.mapGet(r.field(salesBudget, "basisByContract"), id)
      : undefined;
    const pending = m.mapGet(session.map("salesPendingBudgetByContract"), id);
    if (
      !operating ||
      !salesBudget ||
      r.field(salesBudget, "date") !== session.date ||
      request === undefined ||
      !salesBasis ||
      (pending ? r.field(pending, "amountMinor") : zero) !== request ||
      r.field(salesBasis, "amountMinor") !== request ||
      r.field(salesBasis, "payerId") !== payerIds[zero]
    )
      throw new Error(
        "Receipt-linked procurement requires its validated frozen dated buyer pool.",
      );
    base = request;
  } else if (r.field(row, "marketAdjusted")) {
    const book = m.mapGet(businesses, payeeId);
    if (book && r.field(book, "anchorAnnualDemandMinor") > zero)
      base = Math.floor(
        (base * r.field(book, "annualDemandMinor")) /
          r.field(book, "anchorAnnualDemandMinor"),
      );
  }
  minor(base, zero, "current due amount");
  const priorArrears = m.field(row, "arrearsMinor"),
    accruesArrears = r.field(row, "accruesArrears");
  minor(priorArrears, zero, "prior arrears");
  const requested = exact(
      BigInt(base) + BigInt(accruesArrears ? priorArrears : zero),
      zero,
      "due including arrears",
    ),
    receiptId = `finance:${session.date}:${id}`,
    creditId = r.field(row, "creditFacilityId");
  let credit: CreditReceipt | undefined;
  if (!interest && creditId) {
    const deficiency = Math.max(
      zero,
      requested - session.cash.available(payerIds[zero]!),
    );
    if (deficiency > zero)
      credit = prepareFinanceCredit(session, {
        facilityId: creditId,
        requestedMinor: deficiency,
        reasonKey: r.field(r.field(data, "reasons"), "borrowing"),
        triggerId: receiptId,
      });
  }
  let remaining = requested,
    legIndex = zero;
  const payments = payerIds.map((payerId) => {
    const payerBeforeMinor = session.cash.balance(payerId),
      requestedMinor = remaining;
    const paidMinor = session.cash.move(
      payerId,
      payeeId,
      remaining,
      receiptId + ":payment:" + legIndex,
    );
    legIndex += session.one;
    remaining -= paidMinor;
    return {
      payerId,
      requestedMinor,
      paidMinor,
      payerBeforeMinor,
      payerAfterMinor: session.cash.balance(payerId),
    };
  });
  const paid = requested - remaining,
    arrears = accruesArrears ? remaining : zero,
    recipient = r.field(row, "recipientIncome"),
    kind = r.field(row, "kind");
  if (recipient)
    income(
      session,
      r.field(recipient, "personId"),
      r.field(recipient, "kindId"),
      paid,
    );
  session.totals(kind, {
    requestedMinor: requested,
    paidMinor: paid,
    unfundedMinor: remaining,
  });
  const payeeBook = m.mapGet(businesses, payeeId),
    salesReceipt = r.field(row, "salesReceipt");
  if (payeeBook)
    m.write(
      payeeBook,
      "receivedMinor",
      exact(
        BigInt(m.field(payeeBook, "receivedMinor")) + BigInt(paid),
        zero,
        "firm receipts",
      ),
    );
  if (payeeBook && salesReceipt)
    m.write(
      payeeBook,
      "salesReceivedMinor",
      exact(
        BigInt(m.field(payeeBook, "salesReceivedMinor")) + BigInt(paid),
        zero,
        "firm sales receipts",
      ),
    );
  if (payerBook && operating)
    m.write(
      payerBook,
      "operatingPaidMinor",
      exact(
        BigInt(m.field(payerBook, "operatingPaidMinor")) + BigInt(paid),
        zero,
        "firm operating payments",
      ),
    );
  const receipt: FinanceReceipt = {
    ...(currentCalendarBasis
      ? { householdPurchaseCalendarBasis: currentCalendarBasis }
      : {}),
    ...(nextCalendarBasis
      ? { nextHouseholdPurchaseCalendarBasis: nextCalendarBasis }
      : {}),
    id: receiptId,
    contractId: id,
    date: session.date,
    kind,
    payeeId,
    requestedMinor: requested,
    paidMinor: paid,
    unfundedMinor: remaining,
    arrearsMinor: arrears,
    payments,
    payeeBeforeMinor: before,
    payeeAfterMinor: session.cash.balance(payeeId),
    creditReceiptId: credit?.id,
    ...(salesBudget
      ? {
          salesBudget: {
            payerId: r.field(salesBudget, "payerId"),
            previousReceivedMinor: r.field(
              salesBudget,
              "previousReceivedMinor",
            ),
            receivedThroughMinor: r.field(salesBudget, "receivedThroughMinor"),
            receiptsMinor: r.field(salesBudget, "receiptsMinor"),
            routeCostShare: r.field(salesBudget, "routeCostShare"),
            allocatedMinor: r.field(salesBudget, "allocatedMinor"),
            allocatedForContractMinor: r.mapGet(
              r.field(salesBudget, "allocatedByContract"),
              id,
            )!,
            pendingBeforeMinor: r.mapGet(
              r.field(salesBudget, "pendingBeforeByContract"),
              id,
            )!,
            consumedBudgetMinor: r.field(salesBasis!, "amountMinor"),
            budgetFirstAllocatedAt: r.field(salesBasis!, "firstAllocatedAt"),
            budgetPreviousReceivedMinor: r.field(
              salesBasis!,
              "previousReceivedMinor",
            ),
            budgetReceivedThroughMinor: r.field(
              salesBasis!,
              "receivedThroughMinor",
            ),
          },
        }
      : {}),
    source: {
      tag: "SOURCED",
      asOf: session.date,
      citation:
        "Actual funded prototype standing-contract settlement; unpaid purchase budgets do not become debts. Separate terms retain their estimate/source provenance.",
    },
  };
  m.write(row, "arrearsMinor", arrears);
  m.write(row, "lastSettledAt", session.date);
  if (salesBudget) m.mapDelete(session.map("salesPendingBudgetByContract"), id);
  if (arrears > zero) {
    if (
      m.field(row, "firstUnpaidAt") === undefined ||
      m.field(row, "firstUnpaidAt") === null
    )
      m.write(row, "firstUnpaidAt", session.date);
  } else m.delete(row, "firstUnpaidAt");
  const due = session.map("contractsDueAt");
  m.indexRemove(due, dueAt, id);
  m.write(row, "dueAt", next);
  if (nextCalendarBasis) {
    m.write(row, "nominalDueAt", nextNominalDueAt);
    m.write(row, "householdPurchaseCalendarBasis", nextCalendarBasis);
  }
  if (!endsAt || next < endsAt) m.indexAdd(due, next, id);
  if (interest) {
    m.write(interest, "interestArrearsMinor", arrears);
    m.write(interest, "interestRemainderMinor", interestRemainder!);
    m.write(interest, "unbilledInterestMinor", zero);
    m.write(interest, "lastAccruedAt", session.date);
    m.write(interest, "lastInterestAt", session.date);
    m.setMember(session.map("repaymentDueFacilityIds"), interestId!, true);
  }
  const stored = m.mapSet(session.map("latestReceiptsByContract"), id, receipt);
  if (accruesArrears && remaining > zero)
    for (const payerId of payerIds)
      if (m.mapHas(businesses, payerId))
        m.mapSet(session.map("unfundedBusinessReceipts"), payerId, {
          date: session.date,
          id: receiptId,
        });
  const observer = r.field(session.core, "observer"),
    player = r.field(session.core, "playerId"),
    focus = r.field(session.core, "focusPersonIds");
  if (
    observer ||
    payerIds.some(
      (payerId) => r.member(focus, payerId) || player === payerId,
    ) ||
    r.member(focus, payeeId) ||
    player === payeeId
  )
    m.mapSet(session.map("detailedReceipts"), receiptId, stored);
  return stored;
}

export interface PreparedWorkFinance {
  receiptId: string;
  organizationId: string;
  personId: string;
  requestedMinor: number;
  /** Residual availability immediately after ordered facility funding, before the wage leg. */
  availableCashMinor: number;
  expectedPaidMinor: number;
  payerCashBeforeMinor: number;
  payerCashAfterMinor: number;
  payeeCashBeforeMinor: number;
  payeeCashAfterMinor: number;
  credits: readonly CreditReceipt[];
}

/** Finance half only: ordered funding plus wage lines, with all finance metadata prepared. */
export function prepareWorkFinancePlan(
  session: FinancePlanningSession,
  organizationId: string,
  personId: string,
  requested: number,
  receiptId: string,
): PreparedWorkFinance {
  const r = session.reads,
    m = session.metadata,
    zero = session.zero;
  identity(receiptId, "work receipt");
  minor(requested, zero, "requested wage");
  const book = m.mapGet(session.map("businesses"), organizationId),
    data = session.policy(false),
    facilityIndex = m.mapGet(
      session.map("facilitiesByBorrower"),
      organizationId,
    ),
    preferred = book ? r.field(book, "creditFacilityId") : undefined;
  const facilityIds = [...(facilityIndex ? r.members(facilityIndex) : [])].sort(
    (a, b) =>
      (a === preferred ? zero : session.one) -
        (b === preferred ? zero : session.one) || a.localeCompare(b),
  );
  let deficiency = Math.max(
    zero,
    requested - session.cash.available(organizationId),
  );
  const credits: CreditReceipt[] = [];
  if (!(book && r.field(book, "closedAt")) && deficiency > zero)
    for (const facilityId of facilityIds) {
      if (deficiency <= zero) break;
      if (!data)
        throw new Error("Recorded employer credit requires finance policy.");
      const terms = m.mapGet(session.map("facilities"), facilityId);
      if (!terms || r.field(terms, "borrowerId") !== organizationId)
        throw new Error("Recorded employer facility index is inconsistent.");
      const credit = prepareFinanceCredit(session, {
        facilityId,
        requestedMinor: deficiency,
        reasonKey: r.field(r.field(data, "reasons"), "borrowing"),
        triggerId: receiptId,
      });
      deficiency -= credit.transferredMinor;
      credits.push(credit);
    }
  const availableCashMinor = session.cash.available(organizationId),
    expectedPaidMinor = Math.min(requested, availableCashMinor),
    payerCashBeforeMinor = session.cash.balance(organizationId),
    payeeCashBeforeMinor = session.cash.balance(personId);
  const actual = session.cash.move(
    organizationId,
    personId,
    requested,
    receiptId + ":wage",
  );
  if (actual !== expectedPaidMinor)
    throw new Error("Prepared wage differs from admitted residual payment.");
  if (book) {
    m.write(
      book,
      "wagesRequestedMinor",
      exact(
        BigInt(m.field(book, "wagesRequestedMinor")) + BigInt(requested),
        zero,
        "business wages:requested",
      ),
    );
    m.write(
      book,
      "wagesPaidMinor",
      exact(
        BigInt(m.field(book, "wagesPaidMinor")) + BigInt(expectedPaidMinor),
        zero,
        "business wages:paid",
      ),
    );
    m.write(
      book,
      "wagesUnpaidMinor",
      exact(
        BigInt(m.field(book, "wagesUnpaidMinor")) +
          BigInt(requested - expectedPaidMinor),
        zero,
        "business wages:unpaid",
      ),
    );
    if (requested - expectedPaidMinor > zero)
      m.mapSet(session.map("unfundedBusinessReceipts"), organizationId, {
        date: session.date,
        id: receiptId,
      });
  }
  const incomeKind = data ? r.field(data, "wageIncomeKindId") : undefined;
  if (incomeKind) income(session, personId, incomeKind, expectedPaidMinor);
  return detach({
    receiptId,
    organizationId,
    personId,
    requestedMinor: requested,
    availableCashMinor,
    expectedPaidMinor,
    payerCashBeforeMinor,
    payerCashAfterMinor: session.cash.balance(organizationId),
    payeeCashBeforeMinor,
    payeeCashAfterMinor: session.cash.balance(personId),
    credits,
  });
}

/** Root must use this before sealing, after it has built the genuine canonical work result. */
export function guardWorkFinanceResult(
  session: FinancePlanningSession,
  receipt: WorkResult,
  projection: PreparedWorkFinance,
): void {
  const r = session.reads;
  if (
    r.field(receipt, "id") !== projection.receiptId ||
    r.field(receipt, "date") !== session.date ||
    r.field(receipt, "organizationId") !== projection.organizationId ||
    r.field(receipt, "personId") !== projection.personId ||
    r.field(receipt, "requestedMinor") !== projection.requestedMinor ||
    r.field(receipt, "paidMinor") !== projection.expectedPaidMinor ||
    r.field(receipt, "shortfallMinor") !==
      projection.requestedMinor - projection.expectedPaidMinor ||
    r.field(receipt, "payerCashBeforeMinor") !==
      projection.payerCashBeforeMinor ||
    r.field(receipt, "payerCashAfterMinor") !==
      projection.payerCashAfterMinor ||
    r.field(receipt, "payeeCashBeforeMinor") !==
      projection.payeeCashBeforeMinor ||
    r.field(receipt, "payeeCashAfterMinor") !== projection.payeeCashAfterMinor
  )
    throw new Error("Work finance receipt differs from admitted payment.");
}
