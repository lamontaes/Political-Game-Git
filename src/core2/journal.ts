/** Pure CASH admission. Projection never mutates cash, accounts, receipts or IDs. */
import { makeIsoDate } from "../simulation/dates";
import { P } from "./parameters";
import type { IsoDate, Source } from "./types";

export interface CashJournalSourceRef {
  kind: string;
  id: string;
}

export interface CashJournalPosting {
  id: string;
  accountId: string;
  /** Signed integer cash change: outgoing negative, incoming positive. */
  deltaMinor: number;
}

export interface CashJournalInput {
  id: string;
  date: IsoDate;
  expectedSequence: number;
  sourceRef: CashJournalSourceRef;
  postings: readonly CashJournalPosting[];
}

/** Internal adapter output, resolved from a registered module's canonical record. */
export interface ResolvedCashJournalSource extends CashJournalSourceRef {
  date: IsoDate;
  source: Source;
  /** Exact actual-payment/reclassification lines, never requested/unpaid amounts. */
  expectedPostings: readonly CashJournalPosting[];
  /** A marker on that canonical source replaces a growing used-source ID set. */
  postedJournalSequence?: number;
  /** Required by the canonical module record, never inferred from a citation. */
  requiredRelatedRefs: readonly CashJournalSourceRef[];
  /** Independently resolved act/work/authority records; source citations alone do not resolve them. */
  relatedRecords: readonly {
    kind: string;
    id: string;
    date: IsoDate;
    source: Source;
  }[];
  /** Owning module independently resolves each actual due outside obligation. */
  externalFlowAuthorizations?: readonly {
    accountId: string;
    obligation: CashJournalSourceRef;
  }[];
}

export interface CashAccountSnapshot {
  id: string;
  ownerId: string;
  name: string;
  source: Source;
  /** Undefined is the owner's sole residual account. A number is a fund partition. */
  allocatedMinor?: number;
  /** Outside payments are recorded flows, with no preloaded spendable stock. */
  outsideFlow?: true;
}

export interface CashOwnerSnapshot {
  id: string;
  /** Actual person/organization liquidMinor; no journal opening balance is added. */
  liquidMinor: number;
  /** Complete registered account index for this owner, including every fund. */
  accountIds: readonly string[];
  outsideNetMinor?: number;
}

export interface CashJournalExternalFlowChange {
  ownerId: string;
  beforeNetMinor: number;
  afterNetMinor: number;
  outgoingMinor: number;
  incomingMinor: number;
}

export interface CashJournalContext {
  date: IsoDate;
  nextSequence: number;
  /** The facade resolves these internally; callers cannot supply source authority. */
  resolvedSource: ResolvedCashJournalSource;
  owners: ReadonlyMap<string, CashOwnerSnapshot>;
  /** Complete account rows for the touched owners, built from accountIds; no whole-world scan. */
  accounts: ReadonlyMap<string, CashAccountSnapshot>;
}

export interface CashJournalOwnerChange {
  ownerId: string;
  beforeMinor: number;
  afterMinor: number;
}

export interface CashJournalAccountChange {
  accountId: string;
  ownerId: string;
  beforeMinor: number;
  afterMinor: number;
  /** Present only for funds; residual balances are computed from owner cash. */
  allocatedBeforeMinor?: number;
  allocatedAfterMinor?: number;
}

export interface CashJournalProjection {
  id: string;
  date: IsoDate;
  sequence: number;
  nextSequence: number;
  sourceRef: CashJournalSourceRef;
  source: Source;
  relatedRecords: ResolvedCashJournalSource["relatedRecords"];
  postings: readonly CashJournalPosting[];
  /** Gross posting volume includes internal fund moves; it is not consumer spending. */
  grossDebitMinor: number;
  grossCreditMinor: number;
  owners: ReadonlyMap<string, CashJournalOwnerChange>;
  accounts: ReadonlyMap<string, CashJournalAccountChange>;
  externalFlows: ReadonlyMap<string, CashJournalExternalFlowChange>;
}

function identity(value: string, field: string): void {
  if (!value || value !== value.trim())
    throw new Error(`Unregistered or empty journal identity: ${field}`);
}

function datedSource(source: Source, at: IsoDate): void {
  if (
    !source ||
    !["SOURCED", "ESTIMATED"].includes(source.tag) ||
    !source.citation?.trim() ||
    makeIsoDate(source.asOf) > at
  )
    throw new Error("Journal source is missing, undated or a future fact.");
}

/** One atomic admission result; the owner supplies the separate synchronous writer. */
export function projectCashJournal(
  input: Readonly<CashJournalInput>,
  context: Readonly<CashJournalContext>,
  parameters: Readonly<Record<string, number>> = P,
): CashJournalProjection {
  const p = (key: string) => {
    const value = parameters[key];
    if (value === undefined || !Number.isFinite(value))
      throw new Error(`Missing registered journal parameter: ${key}`);
    return value;
  };
  const zero = p("zero"),
    one = p("one"),
    zeroExact = BigInt(zero);
  const minor = (value: number, field: string) => {
    if (!Number.isSafeInteger(value) || value < zero)
      throw new Error(`Invalid nonnegative integer journal amount: ${field}`);
  };
  const exactMinor = (value: bigint, field: string) => {
    const result = Number(value);
    minor(result, field);
    if (BigInt(result) !== value)
      throw new Error(`Journal amount overflows exact minor units: ${field}`);
    return result;
  };
  const exactSignedMinor = (value: bigint, field: string) => {
    const result = Number(value);
    if (!Number.isSafeInteger(result) || BigInt(result) !== value)
      throw new Error(
        `Journal signed flow overflows exact minor units: ${field}`,
      );
    return result;
  };
  const at = makeIsoDate(context.date),
    date = makeIsoDate(input.date);
  if (date !== at)
    throw new Error("Journal posting must use the actual current date.");
  minor(context.nextSequence, "next sequence");
  if (input.expectedSequence !== context.nextSequence)
    throw new Error("Duplicate or stale journal sequence.");
  const nextSequence = context.nextSequence + one;
  minor(nextSequence, "next sequence");
  if (nextSequence <= context.nextSequence)
    throw new Error("Journal sequence must advance.");
  if (input.id !== `journal:${at}:${context.nextSequence}`)
    throw new Error(
      "Journal identity must match its canonical current sequence.",
    );
  for (const [field, value] of Object.entries(input.sourceRef))
    identity(value, field);
  const cause = context.resolvedSource;
  if (
    !cause ||
    cause.kind !== input.sourceRef.kind ||
    cause.id !== input.sourceRef.id ||
    makeIsoDate(cause.date) !== at ||
    cause.postedJournalSequence !== undefined
  )
    throw new Error(
      "Journal requires its unposted current canonical source record.",
    );
  datedSource(cause.source, at);
  const relatedIds = new Map<string, Set<string>>();
  for (const row of cause.relatedRecords) {
    identity(row.kind, "related source kind");
    identity(row.id, "related source id");
    const ids = relatedIds.get(row.kind) ?? new Set<string>();
    if (ids.has(row.id)) throw new Error("Duplicate related journal source.");
    ids.add(row.id);
    relatedIds.set(row.kind, ids);
    if (makeIsoDate(row.date) > at)
      throw new Error("Related journal source is in the future.");
    datedSource(row.source, makeIsoDate(row.date));
  }
  const requiredIds = new Map<string, Set<string>>();
  for (const row of cause.requiredRelatedRefs) {
    identity(row.kind, "required source kind");
    identity(row.id, "required source id");
    const ids = requiredIds.get(row.kind) ?? new Set<string>();
    if (ids.has(row.id)) throw new Error("Duplicate required journal source.");
    ids.add(row.id);
    requiredIds.set(row.kind, ids);
    if (!relatedIds.get(row.kind)?.has(row.id))
      throw new Error(
        "Required act/work/authority source record was not resolved.",
      );
  }
  if (input.postings.length <= zero)
    throw new Error(
      "An unfilled budget without actual cash is not a cash journal posting.",
    );
  const expected = new Map<string, CashJournalPosting>();
  for (const row of cause.expectedPostings) {
    identity(row.id, "source posting");
    if (expected.has(row.id))
      throw new Error("Duplicate canonical source posting.");
    expected.set(row.id, row);
  }
  const ids = new Set<string>(),
    touchedOwners = new Set<string>();
  const deltas = new Map<string, bigint>();
  let credits = zeroExact,
    debits = zeroExact,
    sum = zeroExact;
  for (const row of input.postings) {
    identity(row.id, "posting");
    identity(row.accountId, "account");
    if (ids.has(row.id)) throw new Error("Duplicate cash journal posting.");
    ids.add(row.id);
    if (!Number.isSafeInteger(row.deltaMinor) || row.deltaMinor === zero)
      throw new Error("Cash postings require nonzero integer actual amounts.");
    const recorded = expected.get(row.id);
    if (
      !recorded ||
      recorded.accountId !== row.accountId ||
      recorded.deltaMinor !== row.deltaMinor
    )
      throw new Error(
        "Journal amount/account differs from its resolved actual source posting.",
      );
    const account = context.accounts.get(row.accountId);
    if (!account) throw new Error("Cash journal account is not registered.");
    touchedOwners.add(account.ownerId);
    const delta = BigInt(row.deltaMinor);
    deltas.set(row.accountId, (deltas.get(row.accountId) ?? zeroExact) + delta);
    sum += delta;
    if (delta > zeroExact) credits += delta;
    else debits -= delta;
  }
  if (ids.size !== expected.size)
    throw new Error("Journal omitted a canonical actual source posting.");
  if (sum !== zeroExact || credits !== debits)
    throw new Error("Cash journal postings must balance exactly.");
  const grossCreditMinor = exactMinor(credits, "gross credits"),
    grossDebitMinor = exactMinor(debits, "gross debits");
  // The internal adapter supplies only complete indexed portfolios for touched
  // owners. This rejects hidden fund rows without scanning the whole world.
  for (const [id, account] of context.accounts) {
    if (!touchedOwners.has(account.ownerId))
      throw new Error(
        "Journal context includes an unrelated owner's accounts.",
      );
    if (!context.owners.get(account.ownerId)?.accountIds.includes(id))
      throw new Error(
        "Registered account is missing from the complete owner index.",
      );
  }
  const owners = new Map<string, CashJournalOwnerChange>();
  const accounts = new Map<string, CashJournalAccountChange>();
  const externalFlows = new Map<string, CashJournalExternalFlowChange>();
  for (const ownerId of touchedOwners) {
    const owner = context.owners.get(ownerId);
    if (!owner || owner.id !== ownerId)
      throw new Error("Registered cash account owner is absent.");
    identity(owner.id, "cash owner");
    minor(owner.liquidMinor, "owner cash");
    const accountIds = new Set(owner.accountIds);
    if (accountIds.size !== owner.accountIds.length)
      throw new Error("Duplicate registered owner account index.");
    if (owner.outsideNetMinor !== undefined) {
      if (
        owner.liquidMinor !== zero ||
        accountIds.size !== one ||
        !Number.isSafeInteger(owner.outsideNetMinor)
      )
        throw new Error(
          "An outside account has zero opening stock and one flow account.",
        );
      const id = owner.accountIds[zero]!,
        account = context.accounts.get(id);
      if (
        !account ||
        account.id !== id ||
        account.ownerId !== ownerId ||
        account.outsideFlow !== true ||
        account.allocatedMinor !== undefined
      )
        throw new Error("Outside flow owner/account metadata is inconsistent.");
      identity(account.name, "external account name");
      datedSource(account.source, at);
      const authorities = (cause.externalFlowAuthorizations ?? []).filter(
        (row) => row.accountId === id,
      );
      if (authorities.length !== one)
        throw new Error(
          "Outside payment requires one independently resolved due obligation.",
        );
      const obligation = authorities[zero]!.obligation;
      const related = cause.relatedRecords.find(
        (row) => row.kind === obligation.kind && row.id === obligation.id,
      );
      if (
        !cause.requiredRelatedRefs.some(
          (row) => row.kind === obligation.kind && row.id === obligation.id,
        ) ||
        !related ||
        related.date !== at
      )
        throw new Error(
          "Outside flow requires its actual current required obligation record.",
        );
      let outgoing = zeroExact,
        incoming = zeroExact;
      for (const row of input.postings)
        if (row.accountId === id) {
          const delta = BigInt(row.deltaMinor);
          if (delta < zeroExact) outgoing -= delta;
          else incoming += delta;
        }
      const afterNetMinor = exactSignedMinor(
        BigInt(owner.outsideNetMinor) + incoming - outgoing,
        "outside net flow",
      );
      externalFlows.set(ownerId, {
        ownerId,
        beforeNetMinor: owner.outsideNetMinor,
        afterNetMinor,
        outgoingMinor: exactMinor(outgoing, "outside outgoing flow"),
        incomingMinor: exactMinor(incoming, "outside incoming flow"),
      });
      owners.set(ownerId, { ownerId, beforeMinor: zero, afterMinor: zero });
      accounts.set(id, {
        accountId: id,
        ownerId,
        beforeMinor: zero,
        afterMinor: zero,
      });
      continue;
    }
    let residualId: string | undefined,
      fundsBefore = zeroExact,
      fundsAfter = zeroExact,
      ownerDelta = zeroExact;
    for (const id of owner.accountIds) {
      const account = context.accounts.get(id);
      if (!account || account.id !== id || account.ownerId !== ownerId)
        throw new Error("Owner account index is absent or inconsistent.");
      if (account.outsideFlow !== undefined)
        throw new Error("Ordinary cash cannot use outside flow authority.");
      identity(account.id, "registered account");
      identity(account.name, "account name");
      datedSource(account.source, at);
      const delta = deltas.get(id) ?? zeroExact;
      ownerDelta += delta;
      if (account.allocatedMinor === undefined) {
        if (residualId !== undefined)
          throw new Error("Cash owner requires exactly one residual account.");
        residualId = id;
      } else {
        minor(account.allocatedMinor, "fund allocation");
        const after = exactMinor(
          BigInt(account.allocatedMinor) + delta,
          "fund after",
        );
        fundsBefore += BigInt(account.allocatedMinor);
        fundsAfter += BigInt(after);
        accounts.set(id, {
          accountId: id,
          ownerId,
          beforeMinor: account.allocatedMinor,
          afterMinor: after,
          allocatedBeforeMinor: account.allocatedMinor,
          allocatedAfterMinor: after,
        });
      }
    }
    if (residualId === undefined)
      throw new Error("Cash owner requires exactly one residual account.");
    for (const row of input.postings)
      if (
        context.accounts.get(row.accountId)!.ownerId === ownerId &&
        !accountIds.has(row.accountId)
      )
        throw new Error(
          "Posted account is missing from the owner's complete fund index.",
        );
    const ownerAfter = exactMinor(
      BigInt(owner.liquidMinor) + ownerDelta,
      "owner after",
    );
    const residualBefore = exactMinor(
        BigInt(owner.liquidMinor) - fundsBefore,
        "residual before",
      ),
      residualAfter = exactMinor(
        BigInt(ownerAfter) - fundsAfter,
        "residual after",
      );
    accounts.set(residualId, {
      accountId: residualId,
      ownerId,
      beforeMinor: residualBefore,
      afterMinor: residualAfter,
    });
    owners.set(ownerId, {
      ownerId,
      beforeMinor: owner.liquidMinor,
      afterMinor: ownerAfter,
    });
  }
  return {
    id: input.id,
    date,
    sequence: context.nextSequence,
    nextSequence,
    sourceRef: { ...input.sourceRef },
    source: { ...cause.source },
    relatedRecords: cause.relatedRecords.map((row) => ({
      ...row,
      source: { ...row.source },
    })),
    postings: input.postings.map((row) => ({ ...row })),
    grossDebitMinor,
    grossCreditMinor,
    owners,
    accounts,
    externalFlows,
  };
}
