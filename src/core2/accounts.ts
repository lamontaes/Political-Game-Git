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
import { addDays, makeIsoDate } from "./kernel/dates";
import type { CashJournalPosting } from "./journal";
import type { CashJournalSourceSlot } from "./journal-state";
import type { CoreAPI, CoreModule, CoreState, IsoDate, Source } from "./types";
import { registerWorldMapPart } from "./snapshot";
import { bookkeeping } from "./bookkeeping";

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
  /** Ends every open standing payment into this account (a benefit stops at the payee's death); returns their ids. */
  endObligationsTo(accountId: string): string[];
  /** The open standing payments out of this account (what a dead person's estate owes), by id. */
  obligationsFrom(
    accountId: string,
  ): readonly (Readonly<ObligationState> & { readonly id: string })[];
  /** v21: payments due from now on are this amount (a rent cap, a new benefit level). */
  setObligationAmount(id: string, amountMinor: number, source: Source): void;
}

interface Runtime {
  pending: Map<string, CashJournalSourceSlot>;
  /**
   * Transfer ids used, to refuse a repeat. In play this holds the current
   * month's ids and `transferIdsBefore` the month before's, so a repeat
   * within a month or two still stops the run; with bookkeeping on (tests,
   * proofs) every id is kept. Kept forever in play, it was the largest
   * engine part a long run held (Montpelier, Vermont, Nov 9: 208 MB of a
   * 3,178 MB live heap at year 4).
   */
  transferIds: Set<string>;
  transferIdsBefore?: Set<string>;
  /** The month (yyyy-mm) `transferIds` holds, in play. */
  transferIdsMonth?: string;
  obligations: Map<string, ObligationState>;
  due: Map<IsoDate, Set<string>>;
  deposits: Map<string, BankDeposit>;
  depositsByBank: Map<string, Set<string>>;
  depositTotals: Map<string, number>;
  heldDeposits: Map<string, number>;
  depositsByHolder: Map<string, Set<string>>;
  /**
   * What each followed person paid out, by the transfer's reason, for the
   * month in play and the one before (nothing older). A read for the Money
   * sheet only: no engine reads it, and it moves no money. Present once a
   * followed person has paid anything.
   */
  outflowsByPerson?: Map<string, PersonOutflows>;
}

/** A followed person's outflows by month; the months kept are the last two. */
export interface PersonOutflows {
  /** The first month a payment of theirs was seen; that month may be partial. */
  firstMonth: string;
  months: Map<string, Map<string, OutflowLine>>;
}

/** One reason's payments in one month, citing the last transfer and its journal entry. */
export interface OutflowLine {
  reasonKey: string;
  requestedMinor: number;
  paidMinor: number;
  transferCount: number;
  lastTransferId: string;
  lastJournalSequence: number;
}

/** A claim on a bank, not a second copy of cash in the cash journal. */
export interface BankDeposit {
  id: string;
  bankId: string;
  holderId: string;
  balanceMinor: number;
  paidInMinor: number;
  paidOutMinor: number;
  lastTransferId: string;
  lastJournalSequence?: number;
}

const runtimes = new WeakMap<CoreState, Runtime>();
registerWorldMapPart("core2-accounts", runtimes);

/** Whether a transfer id was already used (in play: this month or last). */
function usedTransferId(rt: Runtime, date: IsoDate, id: string): boolean {
  if (!bookkeeping()) {
    const month = date.slice(0, 7);
    if (rt.transferIdsMonth !== month) {
      if (rt.transferIdsMonth !== undefined) {
        rt.transferIdsBefore = rt.transferIds;
        rt.transferIds = new Set();
      }
      rt.transferIdsMonth = month;
    }
  }
  return rt.transferIds.has(id) || rt.transferIdsBefore?.has(id) === true;
}

/**
 * Keep a followed payer's outflow by reason for the Money sheet. A person who
 * is not followed costs the caller one set lookup and nothing here.
 */
function noteOutflow(
  rt: Runtime,
  ownerId: string,
  date: IsoDate,
  receipt: TransferReceipt,
): void {
  const month = date.slice(0, 7);
  const byPerson = (rt.outflowsByPerson ??= new Map());
  let person = byPerson.get(ownerId);
  if (!person) {
    person = { firstMonth: month, months: new Map() };
    byPerson.set(ownerId, person);
  }
  let lines = person.months.get(month);
  if (!lines) {
    // Only the last two months are kept: the month in play and the one closed.
    for (const old of person.months.keys())
      if (old < addMonths(month, -1)) person.months.delete(old);
    lines = new Map();
    person.months.set(month, lines);
  }
  const line = lines.get(receipt.reasonKey);
  if (line) {
    line.requestedMinor += receipt.requestedMinor;
    line.paidMinor += receipt.paidMinor;
    line.transferCount += 1;
    line.lastTransferId = receipt.id;
    line.lastJournalSequence = receipt.journalSequence;
  } else
    lines.set(receipt.reasonKey, {
      reasonKey: receipt.reasonKey,
      requestedMinor: receipt.requestedMinor,
      paidMinor: receipt.paidMinor,
      transferCount: 1,
      lastTransferId: receipt.id,
      lastJournalSequence: receipt.journalSequence,
    });
}

/** The previous or following month of a yyyy-mm. */
function addMonths(month: string, by: number): string {
  const index =
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * What a followed person paid out in a closed month, by reason, or nothing
 * when their first month of being watched is that one (a partial month is
 * never shown as the whole). Read by the Money sheet only.
 */
export function personOutflowsForMonth(
  core: CoreState,
  personId: string,
  month: string,
): readonly Readonly<OutflowLine>[] {
  const person = runtimes.get(core)?.outflowsByPerson?.get(personId);
  if (!person || month <= person.firstMonth) return [];
  return [...(person.months.get(month)?.values() ?? [])];
}

/** How many transfer ids the world holds to refuse a repeat (tests and probes). */
export function heldTransferIds(core: CoreState): number {
  const rt = runtimes.get(core);
  return (rt?.transferIds.size ?? 0) + (rt?.transferIdsBefore?.size ?? 0);
}

function runtime(core: CoreState): Runtime {
  let rt = runtimes.get(core);
  if (!rt) {
    rt = {
      pending: new Map(),
      transferIds: new Set(),
      obligations: new Map(),
      due: new Map(),
      deposits: new Map(),
      depositsByBank: new Map(),
      depositTotals: new Map(),
      heldDeposits: new Map(),
      depositsByHolder: new Map(),
    };
    runtimes.set(core, rt);
  }
  return rt;
}

export function depositId(bankId: string, holderId: string): string {
  return `deposit:${bankId}:${holderId}`;
}

export function bankDeposit(
  core: CoreState,
  bankId: string,
  holderId: string,
): Readonly<BankDeposit> | undefined {
  return runtime(core).deposits.get(depositId(bankId, holderId));
}

/** Indexed total, also used when underwriting a new loan. */
export function bankDepositLiability(core: CoreState, bankId: string): number {
  return runtime(core).depositTotals.get(bankId) ?? 0;
}

export function depositsHeld(core: CoreState, holderId: string): number {
  return runtime(core).heldDeposits.get(holderId) ?? 0;
}

/** A spending decision can draw a holder's savings without minting cash. */
export function withdrawSavings(
  core: CoreState,
  api: CoreAPI,
  input: {
    id: string;
    holderId: string;
    customerAccountId: string;
    amountMinor: number;
    source: Source;
  },
): number {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0)
    throw new Error("A savings withdrawal is a nonnegative whole amount.");
  const rt = runtime(core);
  let left = input.amountMinor;
  for (const id of rt.depositsByHolder.get(input.holderId) ?? []) {
    const claim = rt.deposits.get(id)!;
    if (!left || !claim.balanceMinor) continue;
    const receipt = moveBankDeposit(core, api, {
      ...input,
      id: `${input.id}:${claim.bankId}`,
      bankId: claim.bankId,
      direction: "withdraw",
      amountMinor: Math.min(left, claim.balanceMinor),
    });
    left -= receipt.paidMinor;
  }
  return input.amountMinor - left;
}

/**
 * A business's savings are its own money: when its cash falls short of a
 * payment due, it draws what it needs from the deposits it holds at a local
 * bank, before the payment goes unpaid and the firm fails with money in the
 * bank. Returns the amount drawn.
 */
export function drawSavingsToCover(
  core: CoreState,
  api: CoreAPI,
  input: {
    id: string;
    holderId: string;
    owedMinor: number;
    asOf: IsoDate;
    reason: string;
  },
): number {
  const held = depositsHeld(core, input.holderId);
  if (held <= 0 || !core.finance.businesses.has(input.holderId)) return 0;
  const account = api.accounts().main(input.holderId);
  const cash = balanceOf(core, account);
  if (cash >= input.owedMinor) return 0;
  return withdrawSavings(core, api, {
    id: input.id,
    holderId: input.holderId,
    customerAccountId: account,
    amountMinor: Math.min(held, Math.ceil(input.owedMinor - cash)),
    source: {
      tag: "ESTIMATED",
      asOf: input.asOf,
      citation:
        "A business's deposits are its own money; it draws them when its cash falls short of a payment due (JPMorgan Chase Institute, Cash is King: Flows, Balances, and Buffer Days, 2016).",
      estimatedFrom: input.reason,
    },
  });
}

export function depositsAtBank(
  core: CoreState,
  bankId: string,
): readonly Readonly<BankDeposit>[] {
  const rt = runtime(core);
  return [...(rt.depositsByBank.get(bankId) ?? [])].map((id) =>
    rt.deposits.get(id)!,
  );
}

/** Cash moves first; only a successful journal posting changes the bank's debt. */
export function moveBankDeposit(
  core: CoreState,
  api: CoreAPI,
  input: {
    id: string;
    bankId: string;
    holderId: string;
    customerAccountId: string;
    direction: "deposit" | "withdraw";
    amountMinor: number;
    source: Source;
  },
): TransferReceipt {
  const bank = core.organizations.get(input.bankId);
  if (!bank || bank.outsideFlow || !input.holderId.trim())
    throw new Error("A deposit needs a recorded local bank and a holder.");
  const bankAccount = api.accounts().main(input.bankId);
  const customer = core.cashJournal.accounts.get(input.customerAccountId);
  if (!customer || customer.ownerId === input.bankId || customer.outsideFlow)
    throw new Error("A deposit needs a distinct recorded customer account.");
  const rt = runtime(core);
  const id = depositId(input.bankId, input.holderId);
  const prior = rt.deposits.get(id);
  if (
    input.direction === "withdraw" &&
    input.amountMinor > (prior?.balanceMinor ?? 0)
  )
    throw new Error("A withdrawal cannot exceed the depositor's claim.");
  const depositing = input.direction === "deposit";
  const receipt = transfer(core, api, {
    id: input.id,
    from: depositing ? input.customerAccountId : bankAccount,
    to: depositing ? bankAccount : input.customerAccountId,
    amountMinor: input.amountMinor,
    partial: true,
    reasonKey: depositing ? "bank-deposit" : "bank-withdrawal",
    source: input.source,
  });
  if (!receipt.paidMinor) return receipt;
  const delta = depositing ? receipt.paidMinor : -receipt.paidMinor;
  rt.deposits.set(id, {
    id,
    bankId: input.bankId,
    holderId: input.holderId,
    balanceMinor: (prior?.balanceMinor ?? 0) + delta,
    paidInMinor:
      (prior?.paidInMinor ?? 0) + (depositing ? receipt.paidMinor : 0),
    paidOutMinor:
      (prior?.paidOutMinor ?? 0) + (depositing ? 0 : receipt.paidMinor),
    lastTransferId: receipt.id,
    lastJournalSequence: receipt.journalSequence,
  });
  const ids = rt.depositsByBank.get(input.bankId) ?? new Set<string>();
  ids.add(id);
  rt.depositsByBank.set(input.bankId, ids);
  const heldIds = rt.depositsByHolder.get(input.holderId) ?? new Set<string>();
  heldIds.add(id);
  rt.depositsByHolder.set(input.holderId, heldIds);
  rt.depositTotals.set(
    input.bankId,
    (rt.depositTotals.get(input.bankId) ?? 0) + delta,
  );
  rt.heldDeposits.set(
    input.holderId,
    (rt.heldDeposits.get(input.holderId) ?? 0) + delta,
  );
  return receipt;
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
  if (!input.id.trim() || usedTransferId(rt, date, input.id))
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
  if (paid === 0) {
    const payer = core.cashJournal.accounts.get(input.from)?.ownerId;
    if (payer !== undefined && core.focusPersonIds.has(payer))
      noteOutflow(rt, payer, date, receipt);
    return receipt;
  }
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
  const payer = core.cashJournal.accounts.get(input.from)?.ownerId;
  if (payer !== undefined && core.focusPersonIds.has(payer))
    noteOutflow(rt, payer, date, receipt);
  return receipt;
}

/**
 * One balanced journal entry over several accounts (one payer and many
 * payees, or many payers and one payee): signed lines that sum to zero, at
 * most one of them an outside account. A local account paying out must hold
 * what its line takes; the caller sizes lines to what each can pay.
 */
export function transferSplit(
  core: CoreState,
  api: CoreAPI,
  input: {
    id: string;
    lines: readonly { accountId: string; deltaMinor: number }[];
    reasonKey: string;
    source: Source;
  },
): void {
  const rt = runtime(core),
    date = makeIsoDate(core.date);
  if (!input.id.trim() || usedTransferId(rt, date, input.id))
    throw new Error(`Transfer id is empty or reused: ${input.id}`);
  if (!input.reasonKey.trim()) throw new Error("A transfer needs a reason.");
  if (input.source.asOf > date)
    throw new Error("A transfer cannot cite a later source.");
  const merged = new Map<string, number>();
  for (const line of input.lines) {
    if (!Number.isSafeInteger(line.deltaMinor))
      throw new Error("A transfer line is a whole amount.");
    if (line.deltaMinor)
      merged.set(
        line.accountId,
        (merged.get(line.accountId) ?? 0) + line.deltaMinor,
      );
  }
  let sum = 0,
    outsideAccount: string | undefined;
  for (const [accountId, delta] of merged) {
    sum += delta;
    if (isOutside(core, accountId)) {
      if (outsideAccount)
        throw new Error("A split transfer has at most one outside account.");
      outsideAccount = accountId;
    } else if (delta < 0 && balanceOf(core, accountId) < -delta)
      throw new Error(`Insufficient funds in ${accountId} for ${input.id}.`);
  }
  if (sum !== 0) throw new Error(`A split transfer must balance: ${input.id}`);
  const postings: CashJournalPosting[] = [...merged]
    .filter(([, delta]) => delta !== 0)
    .map(([accountId, deltaMinor], index) => ({
      id: `${input.id}:${index}`,
      accountId,
      deltaMinor,
    }));
  if (postings.length < 2) return;
  rt.transferIds.add(input.id);
  const due = { kind: DUE_KIND, id: input.id };
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
  const sequence = core.cashJournal.nextSequence;
  try {
    api.postJournal({
      id: `journal:${date}:${sequence}`,
      date,
      expectedSequence: sequence,
      sourceRef: { kind: SOURCE_KIND, id: input.id },
      postings,
    });
  } catch (error) {
    rt.transferIds.delete(input.id);
    throw error;
  } finally {
    rt.pending.delete(input.id);
  }
  for (const posting of postings) {
    if (posting.deltaMinor >= 0) continue;
    const payer = core.cashJournal.accounts.get(posting.accountId)?.ownerId;
    if (payer !== undefined && core.focusPersonIds.has(payer))
      noteOutflow(rt, payer, date, {
        id: input.id,
        date,
        from: posting.accountId,
        to: "",
        requestedMinor: -posting.deltaMinor,
        paidMinor: -posting.deltaMinor,
        shortMinor: 0,
        reasonKey: input.reasonKey,
        journalSequence: sequence,
      });
  }
}

export function nextDue(
  at: IsoDate,
  cadence: AccountCadence,
  anchorDay: number,
) {
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
    endObligationsTo(accountId) {
      const ended: string[] = [];
      for (const [id, row] of rt.obligations)
        if (row.to === accountId && row.endedAt === undefined) {
          row.endedAt = core.date;
          row.nextDueAt = undefined;
          ended.push(id);
        }
      return ended;
    },
    obligationsFrom(accountId) {
      return [...rt.obligations]
        .filter(
          ([, row]) => row.from === accountId && row.endedAt === undefined,
        )
        .map(([id, row]) => ({ ...row, id }))
        .sort((a, b) => a.id.localeCompare(b.id));
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

/** Drops every kept outflow (tests prove nothing in play reads them). */
export function clearPersonOutflows(core: CoreState): void {
  runtimes.get(core)?.outflowsByPerson?.clear();
}
