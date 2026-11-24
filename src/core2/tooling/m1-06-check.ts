/**
 * M1-06 golden-path check, credit and banks, in a played world. Uses
 * GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY from the runner. The drawn place
 * is built as the player gets it (`buildBenchWorld`, every module installed)
 * and plays one game year with the cash journal watched (setJournalTrace),
 * so every posting a loan or credit line made is read as the journal took
 * it. Passes when:
 * (1) every loan the bank made in the year left the lender and reached the
 *     borrower on the journal in one balanced entry for its principal;
 * (2) every payment on the loan record moved from the borrower to the lender
 *     in one balanced journal entry for what the record says was paid;
 * (3) replaying the loan from its principal, its monthly interest and its
 *     recorded payments gives the balance the loan record holds;
 * (4) every credit line's principal is its opening principal plus its draws
 *     less its repayments on the journal, each a balanced entry between the
 *     lender and the borrower;
 * (5) a payment fell short only where the borrower's cash did not cover it
 *     (the cash the bank read is on the payment record), a loan is late only
 *     after such a payment, and a loan is charged off only after the days
 *     past due the credit parameters set, with the cause it records
 *     (no roll: the borrower's cash, job and payment record decide);
 * (6) a missed payment changes something, shown by record id in the first
 *     place where a payment falls short (the runner's, else up to four more
 *     drawn from all 56, each named and held to clauses 1 to 3 on its own
 *     journal): the borrower's credit (the payment and the loan go late, and
 *     a household whose loan is charged off gets no new loan), the lender's
 *     books (the journal paid the bank only what the borrower paid, and the
 *     loan record's balance is the replay that keeps the rest) and the
 *     collection (the next bill is the regular payment plus the unpaid
 *     amount, capped at what the loan owes; the world plays on until that
 *     bill is written).
 * Exits nonzero naming each failed clause.
 */
import { setJournalTrace } from "../journal-state";
import { advanceCore } from "../life";
import creditParameters from "../data/credit/parameters.json" with { type: "json" };
import { createHash } from "node:crypto";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { gameStartDate } from "../game-start";
import { coreAPI } from "../state";
import type { CoreAPI, CoreState } from "../types";
import {
  buildPlayedWorld,
  monthsAfter,
  playYear,
  type PlayedYear,
} from "./m1-played-year";

const world = buildPlayedWorld();
const { api, core } = world;
const failures: string[] = [];
const fail = (text: string) => {
  if (failures.length < 40) failures.push(text);
};

interface Posting {
  owner: string | undefined;
  deltaMinor: number;
}
type Posted = Map<string, Posting[][]>;
const wanted = /^(loan:|loan-payment:|startup-loan:|mortgage-loan:|credit:)/;
/** Watches one world's loan and credit entries as the journal takes them, into `posted`. */
function watchJournal(on: CoreState, posted: Posted = new Map()): Posted {
  setJournalTrace((entry) => {
    const id = entry.sourceRef.id;
    if (!wanted.test(id)) return;
    const rows = entry.postings.map((posting) => ({
      owner: on.cashJournal.accounts.get(posting.accountId)?.ownerId,
      deltaMinor: posting.deltaMinor,
    }));
    const list = posted.get(id) ?? [];
    list.push(rows);
    posted.set(id, list);
  });
  return posted;
}
const posted = watchJournal(core);

const openingPrincipal = new Map<string, number>();
for (const facility of core.finance.facilities.values())
  openingPrincipal.set(facility.id, facility.principalMinor);

// The nation, the bank and the lines open on the first day played.
advanceCore(
  core,
  new Date(Date.parse(`${world.start}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10),
);
for (const facility of core.finance.facilities.values())
  if (!openingPrincipal.has(facility.id))
    openingPrincipal.set(facility.id, facility.principalMinor);
try {
  playYear(world);
} finally {
  setJournalTrace(null);
}

interface Loan {
  id: string;
  kind: "personal" | "startup" | "mortgage" | "medical";
  householdId: string;
  borrowerId: string;
  lenderId: string;
  principalMinor: number;
  balanceMinor: number;
  paymentMinor: number;
  annualRate: number;
  openedAt: string;
  standing: "current" | "late" | "charged-off" | "paid";
  chargedOffAt?: string;
  firstPastDueAt?: string;
  chargeOffCause?: string;
}
interface Payment {
  id: string;
  loanId: string;
  date: string;
  dueMinor: number;
  paidMinor: number;
  cashBeforeMinor: number;
  employed: boolean;
  standing: string;
}
/** One world's loans, their payment records, and each loan's payments in date order. */
function loanBook(read: CoreAPI) {
  const store = read.moduleState("credit");
  // A medical debt is a bill placed for collection, not money lent: it has no disbursement.
  const loans = (store.table("loans").rows() as unknown as Loan[]).filter(
    (loan) => loan.kind !== "medical",
  );
  const payments = store.table("payments").rows() as unknown as Payment[];
  const perLoan = new Map<string, Payment[]>();
  for (const row of [...payments].sort((a, b) => a.date.localeCompare(b.date)))
    perLoan.set(row.loanId, [...(perLoan.get(row.loanId) ?? []), row]);
  return { loans, payments, perLoan };
}

/** The money one journal entry moved, and whether it balanced; the lender's and borrower's sides by owner. */
function moved(
  posted: Posted,
  id: string,
): {
  entries: number;
  balanced: boolean;
  outOf: Map<string, number>;
  into: Map<string, number>;
  total: number;
} {
  const out = {
    entries: 0,
    balanced: true,
    outOf: new Map<string, number>(),
    into: new Map<string, number>(),
    total: 0,
  };
  for (const rows of posted.get(id) ?? []) {
    out.entries += 1;
    let net = 0;
    for (const row of rows) {
      net += row.deltaMinor;
      const side = row.deltaMinor < 0 ? out.outOf : out.into;
      side.set(
        row.owner ?? "?",
        (side.get(row.owner ?? "?") ?? 0) + Math.abs(row.deltaMinor),
      );
      if (row.deltaMinor > 0) out.total += row.deltaMinor;
    }
    if (net !== 0) out.balanced = false;
  }
  return out;
}
const months = api.parameter("macroMonthsPerYear");
const chargeOffDays = creditParameters.creditChargeOffDays.value;

/**
 * Clauses (1) to (3) for one world, on its own journal: each loan's
 * disbursement and payments as the journal took them, and its balance
 * replayed from the record. `label` names the world in each failure.
 */
function checkLoans(on: CoreState, posted: Posted, label: string) {
  const say = (text: string) => fail(label ? `${label}: ${text}` : text);
  const isCounted = (id: string) =>
    !on.people.has(id as never) && !on.organizations.has(id);
  const book = loanBook(coreAPI(on));
  let disbursed = 0,
    repaid = 0,
    countedBorrowers = 0;
  for (const loan of book.loans) {
    const lendId =
      loan.kind === "startup" ? `startup-loan:${loan.borrowerId}` : loan.id;
    const lend = moved(posted, lendId);
    if (lend.entries !== 1)
      say(
        `${loan.id}: ${lend.entries} journal entries for its disbursement ${lendId}`,
      );
    else {
      if (!lend.balanced)
        say(`${loan.id}: its disbursement entry does not balance`);
      if (lend.total !== loan.principalMinor)
        say(
          `${loan.id}: journal moved ${lend.total}, the loan record says ${loan.principalMinor}`,
        );
      if (lend.outOf.size !== 1 || !lend.outOf.has(loan.lenderId))
        say(
          `${loan.id}: the money did not leave the lender ${loan.lenderId} alone (${[...lend.outOf.keys()].join(", ")})`,
        );
      if (isCounted(loan.borrowerId)) countedBorrowers += 1;
      else if (lend.into.size !== 1 || !lend.into.has(loan.borrowerId))
        say(
          `${loan.id}: the money did not reach the borrower ${loan.borrowerId} alone (${[...lend.into.keys()].join(", ")})`,
        );
      disbursed += lend.total;
    }
    let balance = loan.principalMinor;
    for (const payment of book.perLoan.get(loan.id) ?? []) {
      const pay = moved(posted, `loan-payment:${loan.id}:${payment.date}`);
      if (payment.paidMinor > 0) {
        if (
          pay.entries !== 1 ||
          !pay.balanced ||
          pay.total !== payment.paidMinor
        )
          say(
            `${payment.id}: record paid ${payment.paidMinor}, journal moved ${pay.total} in ${pay.entries} entries${pay.balanced ? "" : " (unbalanced)"}`,
          );
        else if (!pay.into.has(loan.lenderId) || pay.into.size !== 1)
          say(
            `${payment.id}: the payment did not reach the lender ${loan.lenderId} alone`,
          );
        else if (
          !isCounted(loan.borrowerId) &&
          (pay.outOf.size !== 1 || !pay.outOf.has(loan.borrowerId))
        )
          say(
            `${payment.id}: the payment did not leave the borrower ${loan.borrowerId} alone`,
          );
        repaid += pay.total;
      } else if (pay.entries)
        say(`${payment.id}: record paid nothing, journal moved ${pay.total}`);
      const interest = (balance * loan.annualRate) / months;
      balance = Math.round(Math.max(0, balance + interest - payment.paidMinor));
    }
    if (Math.abs(balance - loan.balanceMinor) > 1)
      say(
        `${loan.id}: replayed balance ${balance}, record ${loan.balanceMinor}`,
      );
  }
  return { ...book, disbursed, repaid, countedBorrowers };
}

const { loans, payments, perLoan, disbursed, repaid, countedBorrowers } =
  checkLoans(core, posted, "");

// (4) Credit lines.
let lineDraws = 0,
  lineRepays = 0,
  linesChecked = 0;
for (const facility of core.finance.facilities.values()) {
  let draws = 0,
    repays = 0;
  for (const [id, entries] of posted) {
    if (!id.startsWith("credit:") || !id.includes(`:${facility.id}:`)) continue;
    const repay = id.includes(":repay:");
    for (const rows of entries) {
      const net = rows.reduce((sum, row) => sum + row.deltaMinor, 0);
      const into = new Set(
        rows.filter((row) => row.deltaMinor > 0).map((row) => row.owner),
      );
      const from = new Set(
        rows.filter((row) => row.deltaMinor < 0).map((row) => row.owner),
      );
      const lender = repay ? into : from,
        borrower = repay ? from : into;
      if (net !== 0) fail(`${id}: credit entry does not balance`);
      if (
        lender.size !== 1 ||
        !lender.has(facility.lenderId) ||
        borrower.size !== 1 ||
        !borrower.has(facility.borrowerId)
      )
        fail(
          `${id}: credit entry is not between lender ${facility.lenderId} and borrower ${facility.borrowerId}`,
        );
      const sum = rows
        .filter((row) => row.deltaMinor > 0)
        .reduce((s, row) => s + row.deltaMinor, 0);
      if (repay) repays += sum;
      else draws += sum;
    }
  }
  const expected = (openingPrincipal.get(facility.id) ?? 0) + draws - repays;
  // A closed line settles from the borrower's remaining cash and writes off the rest; those are not draws.
  const closed = facility.closedAt !== undefined;
  const open = closed ? 0 : facility.principalMinor;
  if (!closed && Math.abs(expected - open) > 1)
    fail(
      `${facility.id}: principal ${facility.principalMinor}, journal draws less repayments give ${expected}`,
    );
  lineDraws += draws;
  lineRepays += repays;
  linesChecked += 1;
}

// (5) Defaults follow circumstances.
let shortfalls = 0,
  late = 0,
  chargedOff = 0;
for (const loan of loans) {
  const rows = (perLoan.get(loan.id) ?? []).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  for (const payment of rows) {
    if (payment.paidMinor < payment.dueMinor - 1) {
      shortfalls += 1;
      if (payment.cashBeforeMinor >= payment.dueMinor)
        fail(
          `${payment.id}: paid ${payment.paidMinor} of ${payment.dueMinor} while the borrower held ${payment.cashBeforeMinor}`,
        );
    } else if (payment.standing === "late")
      fail(`${payment.id}: marked late though the payment was met`);
  }
  if (loan.standing === "late") {
    late += 1;
    if (!rows.some((payment) => payment.paidMinor < payment.dueMinor - 1))
      fail(`${loan.id}: late with no short payment on record`);
  }
  if (loan.standing === "charged-off") {
    chargedOff += 1;
    if (!loan.firstPastDueAt || !loan.chargedOffAt)
      fail(`${loan.id}: charged off without its past-due and charge-off dates`);
    else {
      const days =
        (Date.parse(loan.chargedOffAt) - Date.parse(loan.firstPastDueAt)) /
        86_400_000;
      if (days < chargeOffDays)
        fail(
          `${loan.id}: charged off after ${days} days past due, the parameter is ${chargeOffDays}`,
        );
    }
    const last = rows.at(-1);
    const expectedCause = last?.employed
      ? "payments-beyond-cash"
      : "income-lost";
    if (!last || loan.chargeOffCause !== expectedCause)
      fail(
        `${loan.id}: charge-off cause ${loan.chargeOffCause}, the last payment record (employed ${last?.employed}) says ${expectedCause}`,
      );
    if (
      !rows.some(
        (payment) =>
          payment.paidMinor < payment.dueMinor - 1 &&
          payment.cashBeforeMinor < payment.dueMinor,
      )
    )
      fail(
        `${loan.id}: charged off with no short payment from short cash on record`,
      );
  }
}
if (!loans.length) fail("no loan was made in the year");

// (6) What a missed payment changes, by record id.
interface Witness {
  where: string;
  payment: string;
  loan: string;
  shortMinor: number;
  standing: string;
  /** The journal entry that paid the lender for the short bill, and what it moved (none when nothing was paid). */
  lenderEntry: string | null;
  paidToLenderMinor: number;
  /** The balance replayed from the record after the short bill, and the loan record's balance, which the full replay matches. */
  balanceAfterMinor: number;
  loanBalanceMinor: number;
  nextBill: string;
  nextDueMinor: number;
  /** The regular payment plus what was left unpaid, capped at what the loan then owed. */
  expectedNextDueMinor: number;
  chargedOffHouseholds: number;
}
/**
 * The first short bill in one world whose consequences all show on its
 * records: marked late, the lender paid on the journal exactly what the
 * borrower paid, the loan's balance the replay that keeps the rest, and a
 * next bill for the regular payment plus the unpaid amount. `waiting` counts
 * short bills whose loan has not billed again yet.
 */
function missedPayments(
  on: CoreState,
  posted: Posted,
  where: string,
): {
  witness: Witness | null;
  problems: string[];
  short: number;
  waiting: number;
} {
  const { loans: book, perLoan: byLoan } = loanBook(coreAPI(on));
  const problems: string[] = [];
  let witness: Witness | null = null,
    short = 0,
    waiting = 0;
  for (const loan of book) {
    const rows = byLoan.get(loan.id) ?? [];
    let balance = loan.principalMinor;
    const after: number[] = [];
    for (const bill of rows) {
      const interest = (balance * loan.annualRate) / months;
      balance = Math.round(Math.max(0, balance + interest - bill.paidMinor));
      after.push(balance);
    }
    const replayHolds = Math.abs(balance - loan.balanceMinor) <= 1;
    rows.forEach((bill, i) => {
      const unpaid = bill.dueMinor - bill.paidMinor;
      if (unpaid <= 1) return;
      short += 1;
      // The borrower's credit: the payment is on the record as late (or the
      // loan charged off), never current.
      const late = bill.standing !== "current";
      if (!late)
        problems.push(
          `${where}: ${bill.id} paid ${bill.paidMinor} of ${bill.dueMinor} and still reads current`,
        );
      // The lender's books: what the journal paid the lender for this bill.
      const entry = `loan-payment:${loan.id}:${bill.date}`;
      const pay = moved(posted, entry);
      const toLender = pay.into.get(loan.lenderId) ?? 0;
      const lenderHolds =
        pay.balanced &&
        toLender === bill.paidMinor &&
        pay.entries === (bill.paidMinor > 0 ? 1 : 0);
      if (!lenderHolds)
        problems.push(
          `${where}: ${entry} paid the lender ${toLender} in ${pay.entries} entries for ${bill.id}, which paid ${bill.paidMinor}`,
        );
      // The collection: the next bill is the regular payment plus what was
      // not paid, never more than the loan then owes, and never other than that.
      const next = rows[i + 1];
      const left = after[i]!;
      const owed = left + (left * loan.annualRate) / months;
      const want = Math.round(Math.min(owed, loan.paymentMinor + unpaid));
      if (!next) {
        if (loan.standing !== "charged-off" && loan.standing !== "paid")
          waiting += 1;
        return;
      }
      const billHolds = Math.abs(next.dueMinor - want) <= 1;
      if (!billHolds)
        problems.push(
          `${where}: ${next.id} bills ${next.dueMinor}, not the ${want} of the regular ${loan.paymentMinor} plus the ${unpaid} left unpaid on ${bill.id}`,
        );
      if (witness || !late || !lenderHolds || !billHolds || !replayHolds)
        return;
      witness = {
        where,
        payment: bill.id,
        loan: loan.id,
        shortMinor: unpaid,
        standing: bill.standing,
        lenderEntry: pay.entries ? entry : null,
        paidToLenderMinor: toLender,
        balanceAfterMinor: left,
        loanBalanceMinor: loan.balanceMinor,
        nextBill: next.id,
        nextDueMinor: next.dueMinor,
        expectedNextDueMinor: want,
        chargedOffHouseholds: 0,
      };
    });
  }
  // A charge-off stays on the household's credit report: no new loan after it.
  const offs = book.filter(
    (loan) => loan.standing === "charged-off" && loan.chargedOffAt,
  );
  for (const off of offs)
    for (const later of book)
      if (
        later.householdId === off.householdId &&
        later.openedAt > off.chargedOffAt!
      )
        problems.push(
          `${where}: ${later.id} lent to ${off.householdId} after ${off.id} was charged off on ${off.chargedOffAt}`,
        );
  if (witness) (witness as Witness).chargedOffHouseholds = offs.length;
  return { witness, problems, short, waiting };
}

/**
 * The witness in one world, its journal watched throughout. Where every short
 * bill still waits for the next one, the world plays on a month at a time (up
 * to two) until the loan bills again, and the world is held to clauses 1 to 3
 * again on the longer journal.
 */
function witnessIn(on: CoreState, seen: Posted, where: string) {
  let found = missedPayments(on, seen, where);
  for (
    let month = 0;
    month < 2 && !found.witness && found.waiting;
    month += 1
  ) {
    watchJournal(on, seen);
    try {
      advanceCore(on, monthsAfter(on.date, 1));
    } finally {
      setJournalTrace(null);
    }
    checkLoans(on, seen, where);
    found = missedPayments(on, seen, where);
  }
  return found;
}

const witnessTried: string[] = [];
let witnessed = witnessIn(
  core,
  posted,
  `${world.placeName}, seed ${world.seed}`,
);
if (!witnessed.witness)
  witnessTried.push(
    `${world.placeName}: ${witnessed.short ? `${witnessed.short} short payments, none with every consequence on record` : "no payment fell short"}`,
  );
for (let draw = 0; draw < 4 && !witnessed.witness; draw += 1) {
  for (const problem of witnessed.problems) fail(problem);
  const place = drawPlace(
    createHash("sha256")
      .update(`${world.seed}:M1-06-default:${draw}`)
      .digest("hex"),
    "M1-06-default",
  );
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const other: PlayedYear = {
    seed: place.seed,
    placeKey: place.key,
    placeName: built.place.displayName,
    placeId: built.placeId,
    stateKey: built.place.stateJurisdictionKey ?? "",
    core: built.core,
    api: coreAPI(built.core),
    start: built.core.date,
  };
  const where = `${other.placeName} (${place.key}), seed ${place.seed}`;
  // The redrawn world's journal is watched like the runner's, and its loans
  // held to the same clauses.
  const seen = watchJournal(other.core);
  try {
    playYear(other);
  } finally {
    setJournalTrace(null);
  }
  checkLoans(other.core, seen, where);
  witnessed = witnessIn(other.core, seen, where);
  if (!witnessed.witness)
    witnessTried.push(
      `${other.placeName}: ${witnessed.short ? `${witnessed.short} short payments, none with every consequence on record` : "no payment fell short"}`,
    );
}
for (const problem of witnessed.problems) fail(problem);
if (!witnessed.witness)
  fail(
    `no short payment with every consequence on record in the runner's place or four more drawn: ${witnessTried.join("; ")}`,
  );

console.log(
  JSON.stringify({
    place: world.placeName,
    placeId: world.placeId,
    seed: world.seed,
    start: world.start,
    loans: loans.length,
    loansByKind: loans.reduce<Record<string, number>>(
      (out, loan) => ({ ...out, [loan.kind]: (out[loan.kind] ?? 0) + 1 }),
      {},
    ),
    countedBorrowers,
    paymentRecords: payments.length,
    journalDisbursedMinor: disbursed,
    journalRepaidMinor: repaid,
    creditLines: linesChecked,
    lineDrawsMinor: lineDraws,
    lineRepaymentsMinor: lineRepays,
    shortPayments: shortfalls,
    loansLate: late,
    loansChargedOff: chargedOff,
    defaultsObserved: late + chargedOff > 0,
    missedPayment: witnessed.witness,
    missedPaymentPassedOver: witnessTried,
    sampleLoanIds: loans.slice(0, 5).map((loan) => loan.id),
    chargeOffDaysParameter: chargeOffDays,
  }),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
