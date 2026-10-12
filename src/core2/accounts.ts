/**
 * Accounts and postings (M0-09 piece 2). Named accounts belong to a person or
 * organization; every movement of money is one balanced entry in the cash
 * journal (`postJournal`). Engines move money with `transfer` and schedule
 * obligations that come due on their dates; the core settles them, pays what
 * the payer has, and carries the rest as arrears when the terms say so.
 *
 * ```ts
 * const accounts = api.accounts();
 * const roads = accounts.open({ ownerId: cityId, name: "Road fund", source });
 * accounts.transfer({ id, from: accounts.main(cityId), to: roads, amountMinor, reasonKey, source });
 * accounts.addObligation({ id, from, to, amountMinor, firstDueAt, cadence: { kind: "months", every: 1 }, accruesArrears: true, reasonKey, source });
 * accounts.obligation(id); // nextDueAt, arrearsMinor, paidMinor, lastReceipt
 * ```
 */
import { addDays, makeIsoDate } from "../simulation/dates";
import type { CashJournalPosting } from "./journal";
import type { CashJournalSourceSlot } from "./journal-state";
import type { CoreAPI, CoreModule, CoreState, IsoDate, Source } from "./types";

export const ACCOUNTS_MODULE_ID = "core2-accounts-v1";
const SOURCE_KIND = "accounts.transfer";
const DUE_KIND = "accounts.due";

export type AccountCadence =
  { kind: "days"; every: number } | { kind: "months"; every: number };

export interface TransferInput {
  /** Unique per transfer; repeated ids are rejected. */
  id: string;
  from: string;
  to: string;
  amountMinor: number;
  reasonKey: string;
  source: Source;
  /** Pay what the payer has instead of refusing a short transfer. */
  partial?: boolean;
}

export interface TransferReceipt {
  id: string;
  date: IsoDate;
  from: string;
  to: string;
  requestedMinor: number;
  paidMinor: number;
  shortMinor: number;
  reasonKey: string;
  journalSequence?: number;
}

export interface ObligationInput {
  id: string;
  from: string;
  to: string;
  amountMinor: number;
  firstDueAt: IsoDate;
  cadence?: AccountCadence;
  /** Exclusive: no payment falls due on or after this date. */
  endsAt?: IsoDate;
  /** Unpaid amounts are owed at the next due date (a debt), not forgiven (a budget). */
  accruesArrears: boolean;
  reasonKey: string;
  source: Source;
}

export interface ObligationState extends ObligationInput {
  nextDueAt?: IsoDate;
  arrearsMinor: number;
  paidMinor: number;
  lastReceipt?: TransferReceipt;
  endedAt?: IsoDate;
}

export interface Accounts {
  /** The owner's main (residual) account, which holds cash not set aside. */
  main(ownerId: string): string;
  open(input: {
    id?: string;
    ownerId: string;
    name: string;
    source: Source;
  }): string;
  balance(accountId: string): number;
  transfer(input: TransferInput): TransferReceipt;
  addObligation(input: ObligationInput): void;
  obligation(id: string): Readonly<ObligationState> | undefined;
  endObligation(id: string): void;
  /** v21: payments due from now on are this amount (a rent cap, a new benefit level). */
  setObligationAmount(id: string, amountMinor: number, source: Source): void;
}

interface Runtime {
  pending: Map<string, CashJournalSourceSlot>;
  transferIds: Set<string>;
  obligations: Map<string, ObligationState>;
  due: Map<IsoDate, Set<string>>;
}

const runtimes = new WeakMap<CoreState, Runtime>();

function runtime(core: CoreState): Runtime {
  let rt = runtimes.get(core);
  if (!rt) {
    rt = {
      pending: new Map(),
      transferIds: new Set(),
      obligations: new Map(),
      due: new Map(),
    };
    runtimes.set(core, rt);
  }
  return rt;
}

function ownerOf(core: CoreState, accountId: string) {
  const account = core.cashJournal.accounts.get(accountId);
  if (!account) throw new Error(`Unknown account: ${accountId}`);
  const owner =
    core.people.get(account.ownerId) ?? core.organizations.get(account.ownerId);
  if (!owner) throw new Error(`Account has no recorded owner: ${accountId}`);
  return { account, owner };
}

function balanceOf(core: CoreState, accountId: string): number {
  const { account, owner } = ownerOf(core, accountId);
  if (account.allocatedMinor !== undefined) return account.allocatedMinor;
  let allocated = 0;
  for (const id of core.cashJournal.accountsByOwner.get(account.ownerId) ?? [])
    allocated += core.cashJournal.accounts.get(id)?.allocatedMinor ?? 0;
  return owner.liquidMinor - allocated;
}

function isOutside(core: CoreState, accountId: string): boolean {
  return ownerOf(core, accountId).account.outsideFlow === true;
}

/** One balanced journal entry moving money between two accounts. */
export function transfer(
  core: CoreState,
  api: CoreAPI,
  input: TransferInput,
): TransferReceipt {
  const rt = runtime(core),
    date = makeIsoDate(core.date);
  if (!input.id.trim() || rt.transferIds.has(input.id))
    throw new Error(`Transfer id is empty or reused: ${input.id}`);
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
    throw new Error("A transfer amount is a nonnegative whole amount.");
  if (input.from === input.to)
    throw new Error("A transfer needs two different accounts.");
  if (!input.reasonKey.trim()) throw new Error("A transfer needs a reason.");
  makeIsoDate(input.source.asOf);
  if (input.source.asOf > date)
    throw new Error("A transfer cannot cite a later source.");
  const outside = isOutside(core, input.from);
  if (isOutside(core, input.to) && outside)
    throw new Error("Money cannot move between two outside accounts.");
  const available = outside ? input.amountMinor : balanceOf(core, input.from);
  if (!input.partial && available < input.amountMinor)
    throw new Error(`Insufficient funds in ${input.from} for ${input.id}.`);
  const paid = Math.min(input.amountMinor, Math.max(0, available));
  rt.transferIds.add(input.id);
  const receipt: TransferReceipt = {
    id: input.id,
    date,
    from: input.from,
    to: input.to,
    requestedMinor: input.amountMinor,
    paidMinor: paid,
    shortMinor: input.amountMinor - paid,
    reasonKey: input.reasonKey,
  };
  if (paid === 0) return receipt;
  const postings: CashJournalPosting[] = [
    { id: `${input.id}:out`, accountId: input.from, deltaMinor: -paid },
    { id: `${input.id}:in`, accountId: input.to, deltaMinor: paid },
  ];
  const due = { kind: DUE_KIND, id: input.id };
  const outsideAccount = outside
    ? input.from
    : isOutside(core, input.to)
      ? input.to
      : undefined;
  rt.pending.set(input.id, {
    resolved: {
      kind: SOURCE_KIND,
      id: input.id,
      date,
      source: input.source,
      expectedPostings: postings,
      requiredRelatedRefs: outsideAccount ? [due] : [],
      relatedRecords: outsideAccount
        ? [{ ...due, date, source: input.source }]
        : [],
      ...(outsideAccount
        ? {
            externalFlowAuthorizations: [
              { accountId: outsideAccount, obligation: due },
            ],
          }
        : {}),
    },
    marker: {},
    retainFull: false,
  });
  try {
    receipt.journalSequence = core.cashJournal.nextSequence;
    api.postJournal({
      id: `journal:${date}:${core.cashJournal.nextSequence}`,
      date,
      expectedSequence: core.cashJournal.nextSequence,
      sourceRef: { kind: SOURCE_KIND, id: input.id },
      postings,
    });
  } catch (error) {
    rt.transferIds.delete(input.id);
    throw error;
  } finally {
    rt.pending.delete(input.id);
  }
  return receipt;
}

function nextDue(at: IsoDate, cadence: AccountCadence, anchorDay: number) {
  if (cadence.kind === "days")
    return makeIsoDate(addDays(makeIsoDate(at), cadence.every));
  const date = new Date(`${at}T00:00:00.000Z`);
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth() + cadence.every,
    last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return makeIsoDate(
    new Date(Date.UTC(year, month, Math.min(anchorDay, last)))
      .toISOString()
      .slice(0, 10),
  );
}

function schedule(rt: Runtime, row: ObligationState): void {
  if (!row.nextDueAt) return;
  const ids = rt.due.get(row.nextDueAt) ?? new Set<string>();
  ids.add(row.id);
  rt.due.set(row.nextDueAt, ids);
}

function settleObligations(api: CoreAPI): void {
  const core = api.state as CoreState,
    rt = runtimes.get(core);
  const ids = rt?.due.get(core.date);
  if (!rt || !ids) return;
  rt.due.delete(core.date);
  for (const id of [...ids].sort()) {
    const row = rt.obligations.get(id);
    if (!row || row.endedAt || row.nextDueAt !== core.date) continue;
    if (row.endsAt && core.date >= row.endsAt) {
      row.endedAt = core.date;
      row.nextDueAt = undefined;
      continue;
    }
    const requested =
      row.amountMinor + (row.accruesArrears ? row.arrearsMinor : 0);
    const receipt = transfer(core, api, {
      id: `${row.id}@${core.date}`,
      from: row.from,
      to: row.to,
      amountMinor: requested,
      reasonKey: row.reasonKey,
      source: row.source,
      partial: true,
    });
    row.paidMinor += receipt.paidMinor;
    row.arrearsMinor = row.accruesArrears ? receipt.shortMinor : 0;
    row.lastReceipt = receipt;
    row.nextDueAt = row.cadence
      ? nextDue(core.date, row.cadence, Number(row.firstDueAt.slice(8, 10)))
      : undefined;
    if (!row.nextDueAt && row.arrearsMinor === 0) row.endedAt = core.date;
    schedule(rt, row);
  }
}

export function accountsFacade(core: CoreState, api: CoreAPI): Accounts {
  if (!core.modules.has(ACCOUNTS_MODULE_ID))
    throw new Error("The accounts module is not registered on this core.");
  const rt = runtime(core);
  return {
    main(ownerId) {
      const id = core.cashJournal.residualAccountByOwner.get(ownerId);
      if (!id) throw new Error(`No recorded cash owner: ${ownerId}`);
      return id;
    },
    open({ id, ownerId, name, source }) {
      const accountId = id ?? `account:${ownerId}:${name}`;
      api.registerCashAccount({
        id: accountId,
        ownerId,
        name,
        source,
        allocatedMinor: 0,
      });
      return accountId;
    },
    balance: (accountId) => balanceOf(core, accountId),
    transfer: (input) => transfer(core, api, input),
    addObligation(input) {
      if (rt.obligations.has(input.id))
        throw new Error(`Duplicate obligation: ${input.id}`);
      if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
        throw new Error("An obligation amount is a nonnegative whole amount.");
      ownerOf(core, input.from);
      ownerOf(core, input.to);
      const first = makeIsoDate(input.firstDueAt);
      if (first <= core.date)
        throw new Error(
          "An obligation's first due date must be in the future.",
        );
      if (
        input.cadence &&
        (!Number.isSafeInteger(input.cadence.every) || input.cadence.every <= 0)
      )
        throw new Error("An obligation cadence must be a positive whole step.");
      const row: ObligationState = {
        ...input,
        source: { ...input.source },
        nextDueAt: first,
        arrearsMinor: 0,
        paidMinor: 0,
      };
      rt.obligations.set(row.id, row);
      schedule(rt, row);
    },
    obligation: (id) => rt.obligations.get(id),
    endObligation(id) {
      const row = rt.obligations.get(id);
      if (!row) throw new Error(`Unknown obligation: ${id}`);
      row.endedAt = core.date;
      row.nextDueAt = undefined;
    },
    setObligationAmount(id, amountMinor, source) {
      const row = rt.obligations.get(id);
      if (!row) throw new Error(`Unknown obligation: ${id}`);
      if (!Number.isSafeInteger(amountMinor) || amountMinor < 0)
        throw new Error("An obligation amount is a nonnegative whole amount.");
      row.amountMinor = amountMinor;
      row.source = { ...source };
    },
  };
}

export const ACCOUNTS_MODULE: CoreModule = {
  id: ACCOUNTS_MODULE_ID,
  onDay: settleObligations,
  journalSourceProviders: {
    [SOURCE_KIND]: (api, reference) =>
      runtimes.get(api.state as CoreState)?.pending.get(reference.id),
  },
};
