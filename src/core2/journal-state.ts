/** Synchronous CASH writer. No caller-supplied source authority or second cash stock. */
import { makeIsoDate } from "../simulation/dates";
import { P } from "./parameters";
import { projectCashJournal } from "./journal";
import type {
  CashAccountSnapshot,
  CashJournalInput,
  CashJournalPosting,
  CashJournalProjection,
  CashJournalSourceRef,
  CashOwnerSnapshot,
  ResolvedCashJournalSource,
} from "./journal";
import type { IsoDate, Source } from "./types";

export interface CashJournalCashOwner {
  id: string;
  liquidMinor: number;
  outsideFlow?: Source;
}

/** Pass the actual core object here, so the final date/focus/owner checks stay live. */
export interface CashJournalHost {
  state: {
    date: IsoDate;
    people: ReadonlyMap<string, CashJournalCashOwner>;
    organizations: ReadonlyMap<string, CashJournalCashOwner>;
    playerId?: string;
    focusPersonIds: ReadonlySet<string>;
    observer: boolean;
  };
  /** Immutable per-world numeric snapshot, not a callback invoked during commit. */
  parameters: Readonly<Record<string, number>>;
}

export interface CashJournalPostedMarker {
  postedJournalSequence?: number;
  /** Current source-owned completion guard; zero cash never creates a journal marker. */
  completedAt?: IsoDate;
}

/** Detached acknowledgement only; the journal runtime retains no noncash receipt. */
export interface CashJournalSourceCompletion {
  sourceRef: CashJournalSourceRef;
  completedAt: IsoDate;
}

/** Exact own-field preimage; absence and a present undefined value are distinct. */
interface CashJournalFieldPreimage {
  target: object;
  key: PropertyKey;
  expectedPresent: boolean;
  expected: unknown;
  expectedWritable: boolean | undefined;
  expectedEnumerable: boolean | undefined;
  expectedConfigurable: boolean | undefined;
}

/** Internal transaction protocol; factories below preserve domain field/map types. */
export type CashJournalMetadataWrite =
  | (CashJournalFieldPreimage & {
      kind: "field";
      next: unknown;
    })
  | (CashJournalFieldPreimage & {
      kind: "field-delete";
    })
  | {
      kind: "map";
      target: Map<unknown, unknown>;
      key: unknown;
      expectedPresent: boolean;
      expected: unknown;
      nextPresent: boolean;
      next: unknown;
    }
  | {
      kind: "set";
      target: Set<unknown>;
      value: unknown;
      expectedPresent: boolean;
      nextPresent: boolean;
    };

export interface CashJournalSourceSlot {
  /** Actual current canonical record projection, resolved by its owning module. */
  resolved: ResolvedCashJournalSource;
  /** The actual writable canonical row, not a copy or a historical used-ID set. */
  marker: CashJournalPostedMarker;
  /** Source-owned statement/open-obligation retention; this grants no authority. */
  retainFull?: boolean;
  /** Fully staged module receipts/counters/indexes; never a commit callback. */
  metadata?: readonly CashJournalMetadataWrite[];
  /** Other genuine current sources completed by this same atomic occurrence. */
  secondaryMarkers?: readonly {
    reference: CashJournalSourceRef;
    marker: CashJournalPostedMarker;
  }[];
}

/** Registered closures adapt module (api, reference) providers to this read-only lookup. */
export type CashJournalSourceProvider = (
  reference: Readonly<CashJournalSourceRef>,
) => CashJournalSourceSlot | undefined;

/** Gross volume includes internal reclassification; it is not consumer spending. */
export interface CashJournalTotals {
  count: number;
  grossDebitMinor: number;
  grossCreditMinor: number;
}

export interface CashJournalExternalFlowTotals {
  netMinor: number;
  outgoingMinor: number;
  incomingMinor: number;
}

export interface CashJournalShortResult {
  id: string;
  date: IsoDate;
  sequence: number;
  sourceRef: CashJournalSourceRef;
  beforeMinor: number;
  afterMinor: number;
  grossDebitMinor: number;
  grossCreditMinor: number;
  outsideNetBeforeMinor?: number;
  outsideNetAfterMinor?: number;
}

export interface CashJournalReceipt extends CashJournalProjection {
  retention: {
    observer: boolean;
    focusOwnerIds: readonly string[];
    requiredBySource: boolean;
  };
}

export interface CashJournalRuntime {
  accounts: Map<string, CashAccountSnapshot>;
  accountsByOwner: Map<string, Set<string>>;
  /** Independent bounded admission count detects a removed portfolio index row. */
  accountCountByOwner: Map<string, number>;
  residualAccountByOwner: Map<string, string>;
  /** Explicit incoming/outgoing boundary flows; never opening spendable money. */
  externalFlowsByOwner: Map<string, CashJournalExternalFlowTotals>;
  sourceProviders: Map<string, CashJournalSourceProvider>;
  nextSequence: number;
  totals: CashJournalTotals;
  totalsByOwner: Map<string, CashJournalTotals>;
  totalsByAccount: Map<string, CashJournalTotals>;
  latestByOwner: Map<string, CashJournalShortResult>;
  latestByAccount: Map<string, CashJournalShortResult>;
  detailedReceipts: Map<string, CashJournalReceipt>;
  /** Only observer/focused owners receive historical journal ID indexes. */
  detailedByOwner: Map<string, Set<string>>;
  /** Only still-required canonical sources occur in this current-source index. */
  requiredBySource: Map<string, Map<string, string>>;
}

const nativeMapSet = Map.prototype.set;
const nativeMapDelete = Map.prototype.delete;
const nativeSetAdd = Set.prototype.add;
const nativeSetDelete = Set.prototype.delete;
const activeWriters = new WeakSet<CashJournalRuntime>();
/** Protection membership only. Weak objects carry no source authority or historical IDs. */
const journalOwnedObjects = new WeakSet<object>();

function protectJournalObjects(...objects: object[]): void {
  for (const object of objects) journalOwnedObjects.add(object);
}

function identity(value: string, field: string): void {
  if (!value || value !== value.trim())
    throw new Error("Empty or unregistered journal identity: " + field);
}

function constants(parameters: Readonly<Record<string, number>>): {
  zero: number;
  one: number;
} {
  const zero = parameters.zero,
    one = parameters.one;
  if (
    zero === undefined ||
    one === undefined ||
    !Number.isSafeInteger(zero) ||
    !Number.isSafeInteger(one) ||
    zero < zero - zero ||
    one <= zero
  )
    throw new Error("Missing registered integer journal constants.");
  return { zero, one };
}

function minor(value: number, zero: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < zero)
    throw new Error("Invalid nonnegative integer journal amount: " + field);
}

function exact(value: bigint, zero: number, field: string): number {
  const result = Number(value);
  minor(result, zero, field);
  if (BigInt(result) !== value)
    throw new Error("Journal amount overflows exact minor units: " + field);
  return result;
}

function plain(target: object): void {
  const prototype = Object.getPrototypeOf(target);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error(
      "Journal direct field writes require ordinary canonical rows.",
    );
}

function directField(
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

/** Reading an optional marker does not require adding it or making it writable. */
function readableField(
  target: object,
  key: PropertyKey,
): PropertyDescriptor | undefined {
  plain(target);
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (
    (descriptor && !("value" in descriptor)) ||
    (!descriptor && key in target)
  )
    throw new Error(
      "Journal marker requires a direct own data field or actual absence.",
    );
  return descriptor;
}

function deletableField(
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

function fieldPreimage(
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

function sameFieldPreimage(
  left: CashJournalFieldPreimage,
  right: CashJournalFieldPreimage,
): boolean {
  return (
    left.key === right.key &&
    Object.is(left.expected, right.expected) &&
    left.expectedWritable === right.expectedWritable &&
    left.expectedEnumerable === right.expectedEnumerable &&
    left.expectedConfigurable === right.expectedConfigurable
  );
}

function matchesFieldPreimage(
  write: CashJournalFieldPreimage,
  before: PropertyDescriptor | undefined,
): boolean {
  return (
    (before !== undefined) === write.expectedPresent &&
    Object.is(before?.value, write.expected) &&
    before?.writable === write.expectedWritable &&
    before?.enumerable === write.expectedEnumerable &&
    before?.configurable === write.expectedConfigurable
  );
}

function uncompletedMarker(
  marker: CashJournalPostedMarker,
): CashJournalFieldPreimage {
  const before = readableField(marker, "completedAt");
  if (before?.value !== undefined)
    throw new Error(
      "Canonical journal source was already completed without cash.",
    );
  return fieldPreimage(marker, "completedAt", before);
}

function metadataScalar(value: unknown): void {
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

export function emptyCashJournalRuntime(
  parameters: Readonly<Record<string, number>> = P,
): CashJournalRuntime {
  const { zero } = constants(parameters);
  const runtime: CashJournalRuntime = {
    accounts: new Map(),
    accountsByOwner: new Map(),
    accountCountByOwner: new Map(),
    residualAccountByOwner: new Map(),
    externalFlowsByOwner: new Map(),
    sourceProviders: new Map(),
    nextSequence: zero,
    totals: { count: zero, grossDebitMinor: zero, grossCreditMinor: zero },
    totalsByOwner: new Map(),
    totalsByAccount: new Map(),
    latestByOwner: new Map(),
    latestByAccount: new Map(),
    detailedReceipts: new Map(),
    detailedByOwner: new Map(),
    requiredBySource: new Map(),
  };
  protectJournalObjects(
    runtime,
    runtime.totals,
    runtime.accounts,
    runtime.accountsByOwner,
    runtime.accountCountByOwner,
    runtime.residualAccountByOwner,
    runtime.externalFlowsByOwner,
    runtime.sourceProviders,
    runtime.totalsByOwner,
    runtime.totalsByAccount,
    runtime.latestByOwner,
    runtime.latestByAccount,
    runtime.detailedReceipts,
    runtime.detailedByOwner,
    runtime.requiredBySource,
  );
  return runtime;
}

/** Validate all keys before installing any provider. Root also preflights its module registry. */
export function registerCashJournalSourceProviders(
  runtime: CashJournalRuntime,
  providers: Readonly<Record<string, CashJournalSourceProvider>>,
): void {
  if (activeWriters.has(runtime))
    throw new Error("Reentrant journal registration.");
  const rows = Object.entries(providers);
  for (const [kind, provider] of rows) {
    identity(kind, "source provider kind");
    if (typeof provider !== "function" || runtime.sourceProviders.has(kind))
      throw new Error("Invalid or duplicate journal source provider: " + kind);
  }
  for (const [kind, provider] of rows)
    nativeMapSet.call(runtime.sourceProviders, kind, provider);
}

function owner(host: CashJournalHost, id: string): CashJournalCashOwner {
  const person = host.state.people.get(id),
    organization = host.state.organizations.get(id);
  if ((!person && !organization) || (person && organization))
    throw new Error("Cash account owner is absent or ambiguous.");
  const row = person ?? organization!;
  if (row.id !== id)
    throw new Error("Cash account owner identity is inconsistent.");
  directField(row, "liquidMinor");
  return row;
}

function sameSource(left: Source, right: Source): boolean {
  return (
    left.tag === right.tag &&
    left.citation === right.citation &&
    left.asOf === right.asOf &&
    left.estimatedFrom === right.estimatedFrom &&
    left.generationPriorVintage === right.generationPriorVintage
  );
}

function availableSource(source: Source, date: IsoDate): void {
  if (
    !source ||
    !["SOURCED", "ESTIMATED"].includes(source.tag) ||
    !source.citation?.trim() ||
    makeIsoDate(source.asOf) > date
  )
    throw new Error("Cash account requires an available dated source.");
}

/** Metadata only: a new fund is zero-funded; registration never increases owner cash. */
export function registerCashAccount(
  runtime: CashJournalRuntime,
  host: CashJournalHost,
  input: Readonly<CashAccountSnapshot>,
): void {
  if (activeWriters.has(runtime))
    throw new Error("Reentrant cash account registration.");
  const { zero, one } = constants(host.parameters),
    date = makeIsoDate(host.state.date);
  const row: CashAccountSnapshot = { ...input, source: { ...input.source } };
  identity(row.id, "account");
  identity(row.ownerId, "owner");
  identity(row.name, "account name");
  availableSource(row.source, date);
  if (runtime.accounts.has(row.id)) throw new Error("Duplicate cash account.");
  const cash = owner(host, row.ownerId),
    beforeCash = cash.liquidMinor;
  minor(beforeCash, zero, "actual owner cash");
  const outsideSource = cash.outsideFlow;
  if ((row.outsideFlow === true) !== (outsideSource !== undefined))
    throw new Error(
      "Outside flow metadata must match the actual recorded outside owner.",
    );
  if (outsideSource !== undefined) {
    if (
      host.state.organizations.get(row.ownerId) !== cash ||
      host.state.people.has(row.ownerId) ||
      beforeCash !== zero ||
      row.allocatedMinor !== undefined
    )
      throw new Error(
        "An outside organization has zero cash and no local fund partitions.",
      );
    availableSource(outsideSource, date);
    if (runtime.externalFlowsByOwner.has(row.ownerId))
      throw new Error("Outside flow owner is already registered.");
  } else if (runtime.externalFlowsByOwner.has(row.ownerId)) {
    throw new Error(
      "Ordinary cash owner has an unexpected outside-flow ledger.",
    );
  }
  if (row.allocatedMinor !== undefined && row.allocatedMinor !== zero)
    throw new Error("Runtime fund registration must be zero-funded.");
  const priorIndex = runtime.accountsByOwner.get(row.ownerId);
  const priorCount = runtime.accountCountByOwner.get(row.ownerId);
  const residual = runtime.residualAccountByOwner.get(row.ownerId);
  if (
    (priorIndex === undefined) !== (priorCount === undefined) ||
    (priorIndex && priorIndex.size !== priorCount)
  )
    throw new Error("Cash owner account index is incomplete.");
  if (row.allocatedMinor === undefined) {
    if (priorIndex || residual !== undefined)
      throw new Error("Cash owner already has a residual account.");
  } else if (
    !priorIndex ||
    residual === undefined ||
    !priorIndex.has(residual)
  ) {
    throw new Error("Register the owner's residual account before a fund.");
  }
  let funds = BigInt(zero);
  for (const id of priorIndex ?? []) {
    const account = runtime.accounts.get(id);
    if (!account || account.id !== id || account.ownerId !== row.ownerId)
      throw new Error("Cash owner account index is inconsistent.");
    availableSource(account.source, date);
    if (account.allocatedMinor !== undefined) {
      minor(account.allocatedMinor, zero, "existing fund");
      funds += BigInt(account.allocatedMinor);
    } else if (id !== residual) {
      throw new Error("Cash owner has an inconsistent residual account.");
    }
  }
  exact(BigInt(beforeCash) - funds, zero, "existing residual cash");
  const nextCount = exact(
    BigInt(priorCount ?? zero) + BigInt(one),
    zero,
    "account count",
  );
  const nextIndex = new Set(priorIndex);
  nextIndex.add(row.id);
  const outsideTotals =
    outsideSource === undefined
      ? undefined
      : {
          netMinor: zero,
          outgoingMinor: zero,
          incomingMinor: zero,
        };
  protectJournalObjects(row, row.source, nextIndex);
  if (outsideTotals) protectJournalObjects(outsideTotals);
  // Every operation that can reject occurs before this metadata-only commit.
  nativeMapSet.call(runtime.accounts, row.id, row);
  nativeMapSet.call(runtime.accountsByOwner, row.ownerId, nextIndex);
  nativeMapSet.call(runtime.accountCountByOwner, row.ownerId, nextCount);
  if (row.allocatedMinor === undefined)
    nativeMapSet.call(runtime.residualAccountByOwner, row.ownerId, row.id);
  if (outsideTotals)
    nativeMapSet.call(runtime.externalFlowsByOwner, row.ownerId, outsideTotals);
}

interface Portfolio {
  ownerId: string;
  cash: CashJournalCashOwner;
  beforeCash: number;
  index: Set<string>;
  ids: readonly string[];
  count: number;
  residualId: string;
  outsideSource?: Source;
  outsideSourceSnapshot?: Source;
  outsideTotals?: CashJournalExternalFlowTotals;
  outsideTotalsSnapshot?: CashJournalExternalFlowTotals;
  rows: readonly {
    live: CashAccountSnapshot;
    snapshot: CashAccountSnapshot;
    source: Source;
  }[];
}

function portfolios(
  runtime: CashJournalRuntime,
  host: CashJournalHost,
  postings: readonly CashJournalPosting[],
): {
  portfolios: Portfolio[];
  owners: Map<string, CashOwnerSnapshot>;
  accounts: Map<string, CashAccountSnapshot>;
} {
  const touched = new Map<string, Set<string>>();
  for (const posting of postings) {
    const account = runtime.accounts.get(posting.accountId);
    if (!account || account.id !== posting.accountId)
      throw new Error("Cash journal account is not registered.");
    const ids = touched.get(account.ownerId) ?? new Set<string>();
    ids.add(posting.accountId);
    touched.set(account.ownerId, ids);
  }
  const result: Portfolio[] = [],
    owners = new Map<string, CashOwnerSnapshot>();
  const accounts = new Map<string, CashAccountSnapshot>();
  for (const [ownerId, postedIds] of touched) {
    const cash = owner(host, ownerId),
      beforeCash = cash.liquidMinor;
    const index = runtime.accountsByOwner.get(ownerId);
    const count = runtime.accountCountByOwner.get(ownerId);
    const residualId = runtime.residualAccountByOwner.get(ownerId);
    if (
      !index ||
      index.size !== count ||
      residualId === undefined ||
      !index.has(residualId)
    )
      throw new Error(
        "Cash owner complete account index is absent or incomplete.",
      );
    const ids = [...index],
      rows: Portfolio["rows"][number][] = [];
    const outsideSource = cash.outsideFlow;
    const outsideTotals = runtime.externalFlowsByOwner.get(ownerId);
    if ((outsideSource === undefined) !== (outsideTotals === undefined))
      throw new Error("Outside owner and current flow ledger disagree.");
    if (outsideTotals) {
      if (
        host.state.organizations.get(ownerId) !== cash ||
        beforeCash !== host.parameters.zero ||
        ids.length !== host.parameters.one ||
        !Number.isSafeInteger(outsideTotals.netMinor) ||
        !Number.isSafeInteger(outsideTotals.incomingMinor) ||
        outsideTotals.incomingMinor < host.parameters.zero ||
        !Number.isSafeInteger(outsideTotals.outgoingMinor) ||
        outsideTotals.outgoingMinor < host.parameters.zero ||
        BigInt(outsideTotals.netMinor) !==
          BigInt(outsideTotals.incomingMinor) -
            BigInt(outsideTotals.outgoingMinor)
      )
        throw new Error("Outside flow stock/index/totals are inconsistent.");
      availableSource(outsideSource!, host.state.date);
    }
    for (const id of ids) {
      const live = runtime.accounts.get(id);
      if (!live || live.id !== id || live.ownerId !== ownerId)
        throw new Error("Cash owner complete account index is inconsistent.");
      if (
        (live.outsideFlow === true) !== (outsideSource !== undefined) ||
        (outsideSource !== undefined && live.allocatedMinor !== undefined)
      )
        throw new Error(
          "Outside account mode or partition metadata is inconsistent.",
        );
      if (live.allocatedMinor !== undefined)
        directField(live, "allocatedMinor");
      const snapshot = { ...live, source: { ...live.source } };
      accounts.set(id, snapshot);
      rows.push({ live, snapshot, source: live.source });
      if ((id === residualId) !== (live.allocatedMinor === undefined))
        throw new Error("Cash owner residual index is inconsistent.");
    }
    for (const id of postedIds)
      if (!index.has(id))
        throw new Error(
          "Posted account is absent from its owner's complete index.",
        );
    owners.set(ownerId, {
      id: ownerId,
      liquidMinor: beforeCash,
      accountIds: ids,
      ...(outsideTotals ? { outsideNetMinor: outsideTotals.netMinor } : {}),
    });
    result.push({
      ownerId,
      cash,
      beforeCash,
      index,
      ids,
      count: count!,
      residualId,
      rows,
      outsideSource,
      outsideSourceSnapshot: outsideSource ? { ...outsideSource } : undefined,
      outsideTotals,
      outsideTotalsSnapshot: outsideTotals ? { ...outsideTotals } : undefined,
    });
  }
  return { portfolios: result, owners, accounts };
}

function copyResolved(
  source: ResolvedCashJournalSource,
): ResolvedCashJournalSource {
  return {
    kind: source.kind,
    id: source.id,
    date: source.date,
    source: { ...source.source },
    postedJournalSequence: source.postedJournalSequence,
    expectedPostings: source.expectedPostings.map((row) => ({ ...row })),
    requiredRelatedRefs: source.requiredRelatedRefs.map((row) => ({ ...row })),
    relatedRecords: source.relatedRecords.map((row) => ({
      ...row,
      source: { ...row.source },
    })),
    externalFlowAuthorizations: source.externalFlowAuthorizations?.map(
      (row) => ({
        accountId: row.accountId,
        obligation: { ...row.obligation },
      }),
    ),
  };
}

function sameResolved(
  left: ResolvedCashJournalSource,
  right: ResolvedCashJournalSource,
): boolean {
  return (
    left.kind === right.kind &&
    left.id === right.id &&
    left.date === right.date &&
    left.postedJournalSequence === right.postedJournalSequence &&
    sameSource(left.source, right.source) &&
    left.expectedPostings.length === right.expectedPostings.length &&
    left.expectedPostings.every((row, i) => {
      const other = right.expectedPostings[i];
      return (
        other?.id === row.id &&
        other.accountId === row.accountId &&
        other.deltaMinor === row.deltaMinor
      );
    }) &&
    left.requiredRelatedRefs.length === right.requiredRelatedRefs.length &&
    left.requiredRelatedRefs.every((row, i) => {
      const other = right.requiredRelatedRefs[i];
      return other?.id === row.id && other.kind === row.kind;
    }) &&
    left.relatedRecords.length === right.relatedRecords.length &&
    left.relatedRecords.every((row, i) => {
      const other = right.relatedRecords[i];
      return (
        other?.id === row.id &&
        other.kind === row.kind &&
        other.date === row.date &&
        sameSource(row.source, other.source)
      );
    }) &&
    (left.externalFlowAuthorizations ?? []).length ===
      (right.externalFlowAuthorizations ?? []).length &&
    (left.externalFlowAuthorizations ?? []).every((row, index) => {
      const other = right.externalFlowAuthorizations?.[index];
      return (
        other?.accountId === row.accountId &&
        other.obligation.kind === row.obligation.kind &&
        other.obligation.id === row.obligation.id
      );
    })
  );
}

function slotSource(slot: CashJournalSourceSlot): ResolvedCashJournalSource {
  readableField(slot.marker, "postedJournalSequence");
  if (slot.retainFull !== undefined && typeof slot.retainFull !== "boolean")
    throw new Error("Invalid canonical source retention.");
  if (slot.resolved.postedJournalSequence !== slot.marker.postedJournalSequence)
    throw new Error("Canonical source and its direct posted marker disagree.");
  return copyResolved(slot.resolved);
}

interface CapturedSecondaryMarker {
  reference: CashJournalSourceRef;
  marker: CashJournalPostedMarker;
  postedBefore: CashJournalFieldPreimage;
  completedBefore: CashJournalFieldPreimage;
}

/** Only independently resolved, required current sources can share completion. */
function captureSecondaryMarkers(
  slot: CashJournalSourceSlot,
  resolved: ResolvedCashJournalSource,
): CapturedSecondaryMarker[] {
  const seen = new Map<string, Set<string>>();
  const markers = new Set<object>([slot.marker]);
  return (slot.secondaryMarkers ?? []).map(({ reference, marker }) => {
    identity(reference.kind, "secondary source kind");
    identity(reference.id, "secondary source id");
    const ids = seen.get(reference.kind) ?? new Set<string>();
    if (
      ids.has(reference.id) ||
      markers.has(marker) ||
      (reference.kind === resolved.kind && reference.id === resolved.id)
    )
      throw new Error("Duplicate primary or secondary canonical source.");
    ids.add(reference.id);
    seen.set(reference.kind, ids);
    markers.add(marker);
    const related = resolved.relatedRecords.find(
      (row) => row.kind === reference.kind && row.id === reference.id,
    );
    if (
      !related ||
      related.date !== resolved.date ||
      !resolved.requiredRelatedRefs.some(
        (row) => row.kind === reference.kind && row.id === reference.id,
      )
    )
      throw new Error(
        "Secondary completion requires a resolved required current source.",
      );
    const postedBefore = fieldPreimage(
      marker,
      "postedJournalSequence",
      readableField(marker, "postedJournalSequence"),
    );
    if (postedBefore.expected !== undefined)
      throw new Error("Secondary source is already posted.");
    const completedBefore = uncompletedMarker(marker);
    return {
      reference: { ...reference },
      marker,
      postedBefore,
      completedBefore,
    };
  });
}

function sameSecondaryMarkers(
  captured: readonly CapturedSecondaryMarker[],
  slot: CashJournalSourceSlot,
): boolean {
  const current = slot.secondaryMarkers ?? [];
  return (
    current.length === captured.length &&
    captured.every((row, index) => {
      const next = current[index];
      return (
        next?.marker === row.marker &&
        next.reference.kind === row.reference.kind &&
        next.reference.id === row.reference.id
      );
    })
  );
}

function verifySecondaryMarkers(
  captured: readonly CapturedSecondaryMarker[],
): void {
  for (const row of captured) {
    if (
      !matchesFieldPreimage(
        row.postedBefore,
        directField(row.marker, "postedJournalSequence"),
      ) ||
      !matchesFieldPreimage(
        row.completedBefore,
        directField(row.marker, "completedAt"),
      )
    )
      throw new Error("Stale secondary canonical completion marker.");
  }
}

function copyProjection(
  projection: CashJournalProjection,
): CashJournalProjection {
  return {
    ...projection,
    sourceRef: { ...projection.sourceRef },
    source: { ...projection.source },
    postings: projection.postings.map((row) => ({ ...row })),
    relatedRecords: projection.relatedRecords.map((row) => ({
      ...row,
      source: { ...row.source },
    })),
    owners: new Map(
      [...projection.owners].map(([id, row]) => [id, { ...row }]),
    ),
    accounts: new Map(
      [...projection.accounts].map(([id, row]) => [id, { ...row }]),
    ),
    externalFlows: new Map(
      [...projection.externalFlows].map(([id, row]) => [id, { ...row }]),
    ),
  };
}

function plusTotals(
  before: CashJournalTotals | undefined,
  debit: number,
  credit: number,
  zero: number,
  one: number,
): CashJournalTotals {
  if (before)
    for (const value of [
      before.count,
      before.grossDebitMinor,
      before.grossCreditMinor,
    ])
      minor(value, zero, "retained journal totals");
  const next: CashJournalTotals = {
    count: exact(
      BigInt(before?.count ?? zero) + BigInt(one),
      zero,
      "journal count",
    ),
    grossDebitMinor: exact(
      BigInt(before?.grossDebitMinor ?? zero) + BigInt(debit),
      zero,
      "journal debits",
    ),
    grossCreditMinor: exact(
      BigInt(before?.grossCreditMinor ?? zero) + BigInt(credit),
      zero,
      "journal credits",
    ),
  };
  protectJournalObjects(next);
  return next;
}

/** Newly built current detail only; never walk retained history to discover ownership. */
function protectJournalReceipt(receipt: CashJournalReceipt): void {
  protectJournalObjects(
    receipt,
    receipt.sourceRef,
    receipt.source,
    receipt.postings,
    receipt.relatedRecords,
    receipt.owners,
    receipt.accounts,
    receipt.externalFlows,
    receipt.retention,
    receipt.retention.focusOwnerIds,
  );
  for (const posting of receipt.postings) protectJournalObjects(posting);
  for (const row of receipt.relatedRecords)
    protectJournalObjects(row, row.source);
  for (const row of receipt.owners.values()) protectJournalObjects(row);
  for (const row of receipt.accounts.values()) protectJournalObjects(row);
  for (const row of receipt.externalFlows.values()) protectJournalObjects(row);
}

function volumes(
  projection: CashJournalProjection,
  accounts: ReadonlyMap<string, CashAccountSnapshot>,
  zero: number,
): {
  byAccount: Map<string, { debit: number; credit: number }>;
  byOwner: Map<string, { debit: number; credit: number }>;
} {
  const byAccount = new Map<string, { debit: bigint; credit: bigint }>();
  const byOwner = new Map<string, { debit: bigint; credit: bigint }>();
  for (const posting of projection.postings) {
    for (const [map, id] of [
      [byAccount, posting.accountId],
      [byOwner, accounts.get(posting.accountId)!.ownerId],
    ] as const) {
      const sum = map.get(id) ?? { debit: BigInt(zero), credit: BigInt(zero) };
      if (posting.deltaMinor < zero) sum.debit -= BigInt(posting.deltaMinor);
      else sum.credit += BigInt(posting.deltaMinor);
      map.set(id, sum);
    }
  }
  const amounts = (map: typeof byAccount) =>
    new Map(
      [...map].map(([id, row]) => [
        id,
        {
          debit: exact(row.debit, zero, "row gross debits"),
          credit: exact(row.credit, zero, "row gross credits"),
        },
      ]),
    );
  return { byAccount: amounts(byAccount), byOwner: amounts(byOwner) };
}

function sameMetadata(
  left: CashJournalMetadataWrite,
  right: CashJournalMetadataWrite,
): boolean {
  if (
    left.kind !== right.kind ||
    left.target !== right.target ||
    left.expectedPresent !== right.expectedPresent
  )
    return false;
  if (left.kind === "set" && right.kind === "set")
    return (
      Object.is(left.value, right.value) &&
      left.nextPresent === right.nextPresent
    );
  if (left.kind === "field" && right.kind === "field")
    return sameFieldPreimage(left, right) && Object.is(left.next, right.next);
  if (left.kind === "field-delete" && right.kind === "field-delete")
    return sameFieldPreimage(left, right);
  return (
    left.kind === "map" &&
    right.kind === "map" &&
    Object.is(left.key, right.key) &&
    Object.is(left.expected, right.expected) &&
    left.nextPresent === right.nextPresent &&
    Object.is(left.next, right.next)
  );
}

/** Bounded indexed lookups per target; never iterate the world's owner maps. */
function indexedCashOwnerTarget(
  host: CashJournalHost,
  target: object,
): boolean {
  const id = Object.getOwnPropertyDescriptor(target, "id");
  return (
    !!id &&
    "value" in id &&
    typeof id.value === "string" &&
    (host.state.people.get(id.value) === target ||
      host.state.organizations.get(id.value) === target)
  );
}

function checkMetadata(
  writes: readonly CashJournalMetadataWrite[],
  reservedObjects: ReadonlySet<object>,
  cashRows: Set<object>,
  host?: CashJournalHost,
  marker?: CashJournalPostedMarker,
  internalJournalWrites = false,
  secondaryMarkers: ReadonlySet<object> = new Set(),
): void {
  const seen = new Map<object, Set<unknown>>();
  for (const write of writes) {
    if (
      reservedObjects.has(write.target) ||
      (!internalJournalWrites && journalOwnedObjects.has(write.target))
    )
      throw new Error("Source metadata conflicts with journal-owned state.");
    const key = write.kind === "set" ? write.value : write.key;
    const keys = seen.get(write.target) ?? new Set<unknown>();
    if (keys.has(key))
      throw new Error("Duplicate staged journal metadata target.");
    keys.add(key);
    seen.set(write.target, keys);
    if (write.kind === "field" || write.kind === "field-delete") {
      // Keep an identified owner protected through the final provider lookup.
      if (host && indexedCashOwnerTarget(host, write.target))
        cashRows.add(write.target);
      // A corrupt owner ID must not hide an existing authoritative cash field.
      const hasCashField =
        Object.getOwnPropertyDescriptor(write.target, "liquidMinor") !==
        undefined;
      if (
        write.key === "postedJournalSequence" ||
        ((write.target === marker || secondaryMarkers.has(write.target)) &&
          write.key === "completedAt") ||
        ((cashRows.has(write.target) || hasCashField) &&
          (write.key === "liquidMinor" ||
            write.key === "id" ||
            write.key === "outsideFlow"))
      )
        throw new Error(
          "Source metadata conflicts with journal cash/identity/marker.",
        );
      const before =
        write.kind === "field"
          ? directField(write.target, write.key)
          : deletableField(write.target, write.key);
      if (!matchesFieldPreimage(write, before))
        throw new Error("Stale staged journal metadata field.");
      if (write.kind === "field") metadataScalar(write.next);
    } else if (write.kind === "map") {
      const present = Map.prototype.has.call(write.target, write.key);
      if (
        present !== write.expectedPresent ||
        !Object.is(
          Map.prototype.get.call(write.target, write.key),
          write.expected,
        )
      )
        throw new Error("Stale staged journal metadata map.");
      if (!write.nextPresent && !write.expectedPresent)
        throw new Error("Cannot delete absent staged journal metadata.");
      metadataScalar(write.next);
    } else if (write.kind === "set") {
      if (
        Set.prototype.has.call(write.target, write.value) !==
        write.expectedPresent
      )
        throw new Error("Stale staged journal metadata set.");
      if (write.nextPresent === write.expectedPresent)
        throw new Error("Staged journal set must change actual membership.");
    } else {
      throw new Error("Invalid staged journal metadata operation.");
    }
  }
}

/** All original rows are rechecked after the last provider call and before the first write. */
export function postCashJournal(
  runtime: CashJournalRuntime,
  host: CashJournalHost,
  input: Readonly<CashJournalInput>,
): CashJournalProjection {
  if (activeWriters.has(runtime))
    throw new Error("Reentrant cash journal writer.");
  activeWriters.add(runtime);
  try {
    const request: CashJournalInput = {
      id: input.id,
      date: input.date,
      expectedSequence: input.expectedSequence,
      sourceRef: Object.freeze({ ...input.sourceRef }),
      postings: input.postings.map((row) => ({ ...row })),
    };
    const state = host.state,
      parameters = host.parameters;
    const numbers = constants(parameters),
      { zero, one } = numbers;
    const date = makeIsoDate(state.date),
      sequence = runtime.nextSequence;
    directField(runtime, "nextSequence");
    directField(runtime, "totals");
    const runtimeFields = [
      "accounts",
      "accountsByOwner",
      "accountCountByOwner",
      "residualAccountByOwner",
      "externalFlowsByOwner",
      "sourceProviders",
      "totalsByOwner",
      "totalsByAccount",
      "latestByOwner",
      "latestByAccount",
      "detailedReceipts",
      "detailedByOwner",
      "requiredBySource",
    ] as const;
    const originalMaps = runtimeFields.map(
      (key) => [key, runtime[key]] as const,
    );
    const people = state.people,
      organizations = state.organizations;
    const focus = state.focusPersonIds,
      playerId = state.playerId,
      observer = state.observer;
    const provider = runtime.sourceProviders.get(request.sourceRef.kind);
    if (!provider)
      throw new Error("Cash journal source provider is not registered.");
    const sourceSlot = provider(request.sourceRef);
    if (!sourceSlot)
      throw new Error(
        "Actual current canonical cash journal source is absent.",
      );
    const resolved = slotSource(sourceSlot),
      marker = sourceSlot.marker;
    const completionBefore = uncompletedMarker(marker);
    const secondary = captureSecondaryMarkers(sourceSlot, resolved);
    const secondaryObjects = new Set<object>(
      secondary.map((row) => row.marker),
    );
    const markerBefore = marker.postedJournalSequence,
      required = sourceSlot.retainFull === true;
    const moduleWrites = (sourceSlot.metadata ?? []).map((write) => ({
      ...write,
    }));
    const portfolio = portfolios(runtime, host, request.postings);
    const projection = projectCashJournal(
      request,
      {
        date,
        nextSequence: sequence,
        resolvedSource: resolved,
        owners: portfolio.owners,
        accounts: portfolio.accounts,
      },
      numbers,
    );
    const returned = copyProjection(projection);
    const beforeTotals = runtime.totals,
      totalsSnapshot = { ...beforeTotals };
    const nextTotals = plusTotals(
      beforeTotals,
      projection.grossDebitMinor,
      projection.grossCreditMinor,
      zero,
      one,
    );
    const journalWrites: CashJournalMetadataWrite[] = [];
    const sums = volumes(projection, portfolio.accounts, zero);
    const priorCounters: {
      live: CashJournalTotals;
      before: CashJournalTotals;
    }[] = [];
    for (const [ownerId, flow] of projection.externalFlows) {
      const before = runtime.externalFlowsByOwner.get(ownerId)!;
      const next: CashJournalExternalFlowTotals = {
        netMinor: flow.afterNetMinor,
        outgoingMinor: exact(
          BigInt(before.outgoingMinor) + BigInt(flow.outgoingMinor),
          zero,
          "outside outgoing total",
        ),
        incomingMinor: exact(
          BigInt(before.incomingMinor) + BigInt(flow.incomingMinor),
          zero,
          "outside incoming total",
        ),
      };
      protectJournalObjects(next);
      journalWrites.push(
        cashJournalMapSet(runtime.externalFlowsByOwner, ownerId, next),
      );
    }
    for (const [totalsMap, latestMap, changes, values] of [
      [
        runtime.totalsByOwner,
        runtime.latestByOwner,
        projection.owners,
        sums.byOwner,
      ],
      [
        runtime.totalsByAccount,
        runtime.latestByAccount,
        projection.accounts,
        sums.byAccount,
      ],
    ] as const) {
      for (const [id, amount] of values) {
        const before = totalsMap.get(id),
          change = changes.get(id)!;
        if (before) priorCounters.push({ live: before, before: { ...before } });
        journalWrites.push(
          cashJournalMapSet(
            totalsMap,
            id,
            plusTotals(before, amount.debit, amount.credit, zero, one),
          ),
        );
        const next: CashJournalShortResult = {
          id: projection.id,
          date: projection.date,
          sequence: projection.sequence,
          sourceRef: { ...projection.sourceRef },
          beforeMinor: change.beforeMinor,
          afterMinor: change.afterMinor,
          grossDebitMinor: amount.debit,
          grossCreditMinor: amount.credit,
        };
        const outside = projection.externalFlows.get(change.ownerId);
        if (outside) {
          next.outsideNetBeforeMinor = outside.beforeNetMinor;
          next.outsideNetAfterMinor = outside.afterNetMinor;
        }
        protectJournalObjects(next, next.sourceRef);
        journalWrites.push(cashJournalMapSet(latestMap, id, next));
      }
    }
    const focusOwnerIds = [...projection.owners.keys()].filter(
      (id) => people.has(id) && (id === playerId || focus.has(id)),
    );
    const focusedOwners = new Set(focusOwnerIds);
    const indexedOwners = observer
      ? [...projection.owners.keys()]
      : focusOwnerIds;
    const retainedOwnerIndexes: {
      id: string;
      index: Set<string>;
      size: number;
    }[] = [];
    if (observer || focusOwnerIds.length > zero || required) {
      if (runtime.detailedReceipts.has(projection.id))
        throw new Error("Duplicate retained journal receipt.");
      const receipt: CashJournalReceipt = {
        ...copyProjection(projection),
        retention: {
          observer,
          focusOwnerIds: [...focusOwnerIds],
          requiredBySource: required,
        },
      };
      protectJournalReceipt(receipt);
      journalWrites.push(
        cashJournalMapSet(runtime.detailedReceipts, projection.id, receipt),
      );
      for (const id of indexedOwners) {
        const prior = runtime.detailedByOwner.get(id);
        if (prior) {
          retainedOwnerIndexes.push({ id, index: prior, size: prior.size });
          journalWrites.push(
            cashJournalMapSet(runtime.detailedByOwner, id, prior),
          );
          journalWrites.push(cashJournalSetWrite(prior, projection.id, true));
        } else {
          const nextIndex = new Set([projection.id]);
          protectJournalObjects(nextIndex);
          journalWrites.push(
            cashJournalMapSet(runtime.detailedByOwner, id, nextIndex),
          );
        }
      }
      if (required) {
        const byId = runtime.requiredBySource.get(resolved.kind);
        if (byId) {
          if (byId.has(resolved.id))
            throw new Error("Duplicate required canonical source index.");
          journalWrites.push(
            cashJournalMapSet(runtime.requiredBySource, resolved.kind, byId),
          );
          journalWrites.push(
            cashJournalMapSet(byId, resolved.id, projection.id),
          );
        } else {
          const nextIndex = new Map([[resolved.id, projection.id]]);
          protectJournalObjects(nextIndex);
          journalWrites.push(
            cashJournalMapSet(
              runtime.requiredBySource,
              resolved.kind,
              nextIndex,
            ),
          );
        }
      }
    }
    const reservedObjects = new Set<object>([
      runtime,
      host,
      state,
      parameters,
      people,
      organizations,
      focus,
      beforeTotals,
      ...originalMaps.map(([, map]) => map),
      ...portfolio.portfolios.flatMap((row) => [
        row.index,
        ...row.rows.map((account) => account.live),
      ]),
      ...indexedOwners.flatMap((id) => {
        const ids = runtime.detailedByOwner.get(id);
        return ids ? [ids] : [];
      }),
      ...priorCounters.map((row) => row.live),
    ]);
    const requiredIndex = runtime.requiredBySource.get(resolved.kind);
    if (requiredIndex) reservedObjects.add(requiredIndex);
    for (const row of portfolio.portfolios) {
      if (row.outsideTotals) reservedObjects.add(row.outsideTotals);
      if (row.outsideSource) reservedObjects.add(row.outsideSource);
    }
    const cashRows = new Set<object>(
      portfolio.portfolios.map((row) => row.cash),
    );
    checkMetadata(
      moduleWrites,
      reservedObjects,
      cashRows,
      host,
      marker,
      false,
      secondaryObjects,
    );
    // Journal writes are validated against their exact original entries as well.
    checkMetadata(
      journalWrites,
      new Set(),
      new Set(),
      undefined,
      undefined,
      true,
    );
    const cashByOwner = new Map(
      portfolio.portfolios.map((row) => [row.ownerId, row.cash]),
    );
    const cashWrites = [...projection.owners.values()]
      .filter((change) => !projection.externalFlows.has(change.ownerId))
      .map((change) => ({
        row: cashByOwner.get(change.ownerId)!,
        next: change.afterMinor,
      }));
    const fundWrites = portfolio.portfolios.flatMap((row) =>
      row.rows.flatMap((account) => {
        const next = projection.accounts.get(
          account.snapshot.id,
        )!.allocatedAfterMinor;
        return next === undefined ? [] : [{ row: account.live, next }];
      }),
    );
    const combinedWrites = [...moduleWrites, ...journalWrites];
    // This is the last external/module call. It must precede every stale-row check.
    const currentSlot = provider(request.sourceRef);
    if (
      !currentSlot ||
      currentSlot.marker !== marker ||
      !sameSecondaryMarkers(secondary, currentSlot) ||
      (currentSlot.retainFull === true) !== required ||
      !sameResolved(resolved, slotSource(currentSlot)) ||
      (currentSlot.metadata ?? []).length !== moduleWrites.length ||
      !moduleWrites.every((write, i) => {
        const other = currentSlot.metadata?.[i];
        return other !== undefined && sameMetadata(write, other);
      })
    )
      throw new Error(
        "Canonical journal source or its staged metadata changed before commit.",
      );
    if (
      host.state !== state ||
      host.parameters !== parameters ||
      state.date !== date ||
      runtime.nextSequence !== sequence ||
      state.people !== people ||
      state.organizations !== organizations ||
      state.focusPersonIds !== focus ||
      state.playerId !== playerId ||
      state.observer !== observer ||
      parameters.zero !== zero ||
      parameters.one !== one ||
      runtime.sourceProviders.get(request.sourceRef.kind) !== provider ||
      marker.postedJournalSequence !== markerBefore ||
      originalMaps.some(([key, map]) => runtime[key] !== map)
    )
      throw new Error("Stale journal host/date/sequence/source registry.");
    for (const row of portfolio.portfolios) {
      if (
        owner(host, row.ownerId) !== row.cash ||
        row.cash.liquidMinor !== row.beforeCash ||
        row.cash.outsideFlow !== row.outsideSource ||
        (row.outsideSource &&
          !sameSource(row.outsideSource, row.outsideSourceSnapshot!)) ||
        runtime.externalFlowsByOwner.get(row.ownerId) !== row.outsideTotals ||
        (row.outsideTotals &&
          (row.outsideTotals.netMinor !== row.outsideTotalsSnapshot!.netMinor ||
            row.outsideTotals.incomingMinor !==
              row.outsideTotalsSnapshot!.incomingMinor ||
            row.outsideTotals.outgoingMinor !==
              row.outsideTotalsSnapshot!.outgoingMinor)) ||
        runtime.accountsByOwner.get(row.ownerId) !== row.index ||
        row.index.size !== row.ids.length ||
        row.ids.some((id) => !row.index.has(id)) ||
        runtime.accountCountByOwner.get(row.ownerId) !== row.count ||
        runtime.residualAccountByOwner.get(row.ownerId) !== row.residualId
      )
        throw new Error(
          "Stale journal cash owner or complete portfolio index.",
        );
      for (const account of row.rows) {
        const live = account.live,
          before = account.snapshot;
        if (
          runtime.accounts.get(before.id) !== live ||
          live.id !== before.id ||
          live.ownerId !== before.ownerId ||
          live.name !== before.name ||
          live.source !== account.source ||
          !sameSource(live.source, before.source) ||
          live.outsideFlow !== before.outsideFlow ||
          live.allocatedMinor !== before.allocatedMinor
        )
          throw new Error("Stale journal fund/account metadata.");
        if (live.allocatedMinor !== undefined)
          directField(live, "allocatedMinor");
      }
    }
    const sameTotals = (live: CashJournalTotals, before: CashJournalTotals) =>
      live.count === before.count &&
      live.grossDebitMinor === before.grossDebitMinor &&
      live.grossCreditMinor === before.grossCreditMinor;
    if (
      runtime.totals !== beforeTotals ||
      !sameTotals(runtime.totals, totalsSnapshot) ||
      priorCounters.some((row) => !sameTotals(row.live, row.before)) ||
      retainedOwnerIndexes.some(
        (row) =>
          runtime.detailedByOwner.get(row.id) !== row.index ||
          row.index.size !== row.size,
      )
    )
      throw new Error("Stale journal retained counters.");
    for (const id of projection.owners.keys())
      if (
        (people.has(id) && (id === playerId || focus.has(id))) !==
        focusedOwners.has(id)
      )
        throw new Error("Journal focus changed before commit.");
    directField(runtime, "nextSequence");
    directField(runtime, "totals");
    directField(marker, "postedJournalSequence");
    if (
      !matchesFieldPreimage(
        completionBefore,
        readableField(marker, "completedAt"),
      )
    )
      throw new Error(
        "Stale canonical noncash completion marker before cash commit.",
      );
    verifySecondaryMarkers(secondary);
    checkMetadata(
      moduleWrites,
      reservedObjects,
      cashRows,
      host,
      marker,
      false,
      secondaryObjects,
    );
    checkMetadata(
      journalWrites,
      new Set(),
      new Set(),
      undefined,
      undefined,
      true,
    );
    // COMMIT: only captured direct fields and native map/set mutations follow.
    // No lookup, parameter read, serialization, validation, callback or event runs here.
    for (const write of cashWrites) write.row.liquidMinor = write.next;
    for (const write of fundWrites) write.row.allocatedMinor = write.next;
    runtime.nextSequence = projection.nextSequence;
    marker.postedJournalSequence = projection.sequence;
    for (const row of secondary)
      row.marker.postedJournalSequence = projection.sequence;
    runtime.totals = nextTotals;
    for (const write of combinedWrites) {
      if (write.kind === "field")
        (write.target as Record<PropertyKey, unknown>)[write.key] = write.next;
      else if (write.kind === "field-delete")
        delete (write.target as Record<PropertyKey, unknown>)[write.key];
      else if (write.kind === "map") {
        if (write.nextPresent)
          nativeMapSet.call(write.target, write.key, write.next);
        else nativeMapDelete.call(write.target, write.key);
      } else if (write.nextPresent)
        nativeSetAdd.call(write.target, write.value);
      else nativeSetDelete.call(write.target, write.value);
    }
    return returned;
  } finally {
    activeWriters.delete(runtime);
  }
}

function validateNoncashSource(
  reference: Readonly<CashJournalSourceRef>,
  resolved: ResolvedCashJournalSource,
  date: IsoDate,
  zero: number,
): void {
  identity(reference.kind, "noncash source kind");
  identity(reference.id, "noncash source id");
  if (
    resolved.kind !== reference.kind ||
    resolved.id !== reference.id ||
    makeIsoDate(resolved.date) !== date ||
    resolved.postedJournalSequence !== undefined
  )
    throw new Error(
      "Noncash completion requires its unposted current canonical source record.",
    );
  availableSource(resolved.source, date);
  if (resolved.expectedPostings.length !== zero)
    throw new Error(
      "Noncash completion requires no actual or zero-valued cash postings.",
    );
  const relatedIds = new Map<string, Set<string>>();
  for (const row of resolved.relatedRecords) {
    identity(row.kind, "related source kind");
    identity(row.id, "related source id");
    const ids = relatedIds.get(row.kind) ?? new Set<string>();
    if (ids.has(row.id)) throw new Error("Duplicate related noncash source.");
    ids.add(row.id);
    relatedIds.set(row.kind, ids);
    const relatedDate = makeIsoDate(row.date);
    if (relatedDate > date)
      throw new Error("Related noncash source is in the future.");
    availableSource(row.source, relatedDate);
  }
  const requiredIds = new Map<string, Set<string>>();
  for (const row of resolved.requiredRelatedRefs) {
    identity(row.kind, "required source kind");
    identity(row.id, "required source id");
    const ids = requiredIds.get(row.kind) ?? new Set<string>();
    if (ids.has(row.id)) throw new Error("Duplicate required noncash source.");
    ids.add(row.id);
    requiredIds.set(row.kind, ids);
    if (!relatedIds.get(row.kind)?.has(row.id))
      throw new Error(
        "Required act/work/authority noncash source record was not resolved.",
      );
  }
}

/** Complete one real current zero-cash source; no journal record, sequence or totals. */
export function completeCashJournalSource(
  runtime: CashJournalRuntime,
  host: CashJournalHost,
  reference: Readonly<CashJournalSourceRef>,
): CashJournalSourceCompletion {
  if (activeWriters.has(runtime))
    throw new Error("Reentrant canonical noncash completion.");
  activeWriters.add(runtime);
  try {
    const request = Object.freeze({ kind: reference.kind, id: reference.id });
    identity(request.kind, "noncash source kind");
    identity(request.id, "noncash source id");
    const state = host.state,
      parameters = host.parameters;
    const { zero, one } = constants(parameters),
      date = makeIsoDate(state.date);
    const people = state.people,
      organizations = state.organizations;
    const focus = state.focusPersonIds,
      playerId = state.playerId,
      observer = state.observer;
    const sequence = runtime.nextSequence,
      beforeTotals = runtime.totals;
    const totalsSnapshot = { ...beforeTotals };
    const runtimeFields = [
      "accounts",
      "accountsByOwner",
      "accountCountByOwner",
      "residualAccountByOwner",
      "externalFlowsByOwner",
      "sourceProviders",
      "totalsByOwner",
      "totalsByAccount",
      "latestByOwner",
      "latestByAccount",
      "detailedReceipts",
      "detailedByOwner",
      "requiredBySource",
    ] as const;
    const originalMaps = runtimeFields.map(
      (key) => [key, runtime[key]] as const,
    );
    const provider = runtime.sourceProviders.get(request.kind);
    if (!provider)
      throw new Error("Noncash source provider is not registered.");
    const sourceSlot = provider(request);
    if (!sourceSlot)
      throw new Error("Actual current canonical noncash source is absent.");
    const resolved = slotSource(sourceSlot),
      marker = sourceSlot.marker;
    validateNoncashSource(request, resolved, date, zero);
    uncompletedMarker(marker);
    const secondary = captureSecondaryMarkers(sourceSlot, resolved);
    const secondaryObjects = new Set<object>(
      secondary.map((row) => row.marker),
    );
    const completionWrite = cashJournalFieldWrite(marker, "completedAt", date);
    const postedBefore = fieldPreimage(
      marker,
      "postedJournalSequence",
      readableField(marker, "postedJournalSequence"),
    );
    const retainFull = sourceSlot.retainFull;
    const moduleWrites = (sourceSlot.metadata ?? []).map((write) => ({
      ...write,
    }));
    const reservedObjects = new Set<object>([
      runtime,
      host,
      state,
      parameters,
      people,
      organizations,
      focus,
      beforeTotals,
      ...originalMaps.map(([, map]) => map),
    ]);
    const cashRows = new Set<object>();
    checkMetadata(
      moduleWrites,
      reservedObjects,
      cashRows,
      host,
      marker,
      false,
      secondaryObjects,
    );
    const returned: CashJournalSourceCompletion = {
      sourceRef: { ...request },
      completedAt: date,
    };
    // Last module call. No callback, lookup or validation occurs after the first write.
    const currentSlot = provider(request);
    if (
      !currentSlot ||
      currentSlot.marker !== marker ||
      currentSlot.retainFull !== retainFull ||
      !sameSecondaryMarkers(secondary, currentSlot) ||
      !sameResolved(resolved, slotSource(currentSlot)) ||
      (currentSlot.metadata ?? []).length !== moduleWrites.length ||
      !moduleWrites.every((write, i) => {
        const other = currentSlot.metadata?.[i];
        return other !== undefined && sameMetadata(write, other);
      })
    )
      throw new Error(
        "Canonical noncash source or its staged metadata changed before commit.",
      );
    if (
      host.state !== state ||
      host.parameters !== parameters ||
      state.date !== date ||
      state.people !== people ||
      state.organizations !== organizations ||
      state.focusPersonIds !== focus ||
      state.playerId !== playerId ||
      state.observer !== observer ||
      parameters.zero !== zero ||
      parameters.one !== one ||
      runtime.sourceProviders.get(request.kind) !== provider ||
      originalMaps.some(([key, map]) => runtime[key] !== map) ||
      !Object.is(runtime.nextSequence, sequence) ||
      runtime.totals !== beforeTotals ||
      !Object.is(beforeTotals.count, totalsSnapshot.count) ||
      !Object.is(
        beforeTotals.grossDebitMinor,
        totalsSnapshot.grossDebitMinor,
      ) ||
      !Object.is(beforeTotals.grossCreditMinor, totalsSnapshot.grossCreditMinor)
    )
      throw new Error(
        "Stale noncash host/date/parameters/owner maps or journal controls.",
      );
    if (
      !matchesFieldPreimage(
        postedBefore,
        readableField(marker, "postedJournalSequence"),
      ) ||
      !matchesFieldPreimage(completionWrite, directField(marker, "completedAt"))
    )
      throw new Error(
        "Stale canonical noncash direct completion or posted marker.",
      );
    verifySecondaryMarkers(secondary);
    checkMetadata(
      moduleWrites,
      reservedObjects,
      cashRows,
      host,
      marker,
      false,
      secondaryObjects,
    );
    // COMMIT: the primary direct completion field and captured typed operations only.
    marker.completedAt = date;
    for (const row of secondary) row.marker.completedAt = date;
    for (const write of moduleWrites) {
      if (write.kind === "field")
        (write.target as Record<PropertyKey, unknown>)[write.key] = write.next;
      else if (write.kind === "field-delete")
        delete (write.target as Record<PropertyKey, unknown>)[write.key];
      else if (write.kind === "map") {
        if (write.nextPresent)
          nativeMapSet.call(write.target, write.key, write.next);
        else nativeMapDelete.call(write.target, write.key);
      } else if (write.nextPresent)
        nativeSetAdd.call(write.target, write.value);
      else nativeSetDelete.call(write.target, write.value);
    }
    return returned;
  } finally {
    activeWriters.delete(runtime);
  }
}

/** Release only a module's finished source requirement, before that canonical row is pruned. */
export function releaseCashJournalSource(
  runtime: CashJournalRuntime,
  reference: Readonly<CashJournalSourceRef>,
): void {
  if (activeWriters.has(runtime))
    throw new Error("Reentrant journal source release.");
  activeWriters.add(runtime);
  try {
    const request = Object.freeze({ ...reference }),
      zero = P.zero;
    const provider = runtime.sourceProviders.get(request.kind);
    const requiredMap = runtime.requiredBySource,
      detailedMap = runtime.detailedReceipts;
    const byId = requiredMap.get(request.kind),
      id = byId?.get(request.id);
    if (!provider || !byId || id === undefined)
      throw new Error("Required retained canonical source is absent.");
    const sourceSlot = provider(request);
    if (!sourceSlot || sourceSlot.retainFull !== false)
      throw new Error(
        "Canonical source still requires its full journal record.",
      );
    const resolved = slotSource(sourceSlot),
      receipt = detailedMap.get(id);
    if (
      !receipt ||
      resolved.kind !== request.kind ||
      resolved.id !== request.id ||
      sourceSlot.marker.postedJournalSequence !== receipt.sequence ||
      receipt.sourceRef.kind !== request.kind ||
      receipt.sourceRef.id !== request.id ||
      !receipt.retention.requiredBySource
    )
      throw new Error("Required source/journal link is inconsistent.");
    const observer = receipt.retention.observer,
      focused = [...receipt.retention.focusOwnerIds];
    const removeDetail = !observer && focused.length === zero;
    const removeKind = byId.size === zero + P.one;
    const updated: CashJournalReceipt = {
      ...copyProjection(receipt),
      retention: { observer, focusOwnerIds: focused, requiredBySource: false },
    };
    protectJournalReceipt(updated);
    const current = provider(request);
    if (
      !current ||
      current.marker !== sourceSlot.marker ||
      current.retainFull !== false ||
      !sameResolved(resolved, slotSource(current)) ||
      runtime.sourceProviders.get(request.kind) !== provider ||
      runtime.requiredBySource !== requiredMap ||
      runtime.detailedReceipts !== detailedMap ||
      requiredMap.get(request.kind) !== byId ||
      byId.get(request.id) !== id ||
      (byId.size === zero + P.one) !== removeKind ||
      detailedMap.get(id) !== receipt ||
      receipt.retention.observer !== observer ||
      !receipt.retention.requiredBySource ||
      receipt.retention.focusOwnerIds.length !== focused.length ||
      focused.some(
        (ownerId, i) => receipt.retention.focusOwnerIds[i] !== ownerId,
      ) ||
      receipt.sourceRef.kind !== request.kind ||
      receipt.sourceRef.id !== request.id ||
      receipt.sequence !== resolved.postedJournalSequence
    )
      throw new Error("Stale canonical source retention release.");
    // Metadata-only removal uses direct current-source links, without a history scan.
    nativeMapDelete.call(byId, request.id);
    if (removeKind) nativeMapDelete.call(requiredMap, request.kind);
    if (removeDetail) nativeMapDelete.call(detailedMap, id);
    else nativeMapSet.call(detailedMap, id, updated);
  } finally {
    activeWriters.delete(runtime);
  }
}
