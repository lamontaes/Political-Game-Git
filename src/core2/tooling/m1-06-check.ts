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
 *     (no roll: the borrower's cash, job and payment record decide).
 * Exits nonzero naming each failed clause.
 */
import { setJournalTrace } from "../journal-state";
import { advanceCore } from "../life";
import creditParameters from "../data/credit/parameters.json" with { type: "json" };
import { buildPlayedWorld, playYear } from "./m1-played-year";

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
const posted = new Map<string, Posting[][]>();
const wanted = /^(loan:|loan-payment:|startup-loan:|mortgage-loan:|credit:)/;
setJournalTrace((entry) => {
  const id = entry.sourceRef.id;
  if (!wanted.test(id)) return;
  const rows = entry.postings.map((posting) => ({
    owner: core.cashJournal.accounts.get(posting.accountId)?.ownerId,
    deltaMinor: posting.deltaMinor,
  }));
  const list = posted.get(id) ?? [];
  list.push(rows);
  posted.set(id, list);
});

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

const credit = api.moduleState("credit");
interface Loan {
  id: string;
  kind: "personal" | "startup" | "mortgage";
  borrowerId: string;
  lenderId: string;
  principalMinor: number;
  balanceMinor: number;
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
const loans = credit.table("loans").rows() as unknown as Loan[];
const payments = credit.table("payments").rows() as unknown as Payment[];
const perLoan = new Map<string, Payment[]>();
for (const row of payments)
  perLoan.set(row.loanId, [...(perLoan.get(row.loanId) ?? []), row]);

/** The money one journal entry moved, and whether it balanced; the lender's and borrower's sides by owner. */
function moved(id: string): {
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
const isCounted = (id: string) =>
  !core.people.has(id as never) && !core.organizations.has(id);
const months = api.parameter("macroMonthsPerYear");
const chargeOffDays = creditParameters.creditChargeOffDays.value;

let disbursed = 0,
  repaid = 0,
  countedBorrowers = 0;
for (const loan of loans) {
  const lendId =
    loan.kind === "startup" ? `startup-loan:${loan.borrowerId}` : loan.id;
  const lend = moved(lendId);
  if (lend.entries !== 1)
    fail(
      `${loan.id}: ${lend.entries} journal entries for its disbursement ${lendId}`,
    );
  else {
    if (!lend.balanced)
      fail(`${loan.id}: its disbursement entry does not balance`);
    if (lend.total !== loan.principalMinor)
      fail(
        `${loan.id}: journal moved ${lend.total}, the loan record says ${loan.principalMinor}`,
      );
    if (lend.outOf.size !== 1 || !lend.outOf.has(loan.lenderId))
      fail(
        `${loan.id}: the money did not leave the lender ${loan.lenderId} alone (${[...lend.outOf.keys()].join(", ")})`,
      );
    if (isCounted(loan.borrowerId)) countedBorrowers += 1;
    else if (lend.into.size !== 1 || !lend.into.has(loan.borrowerId))
      fail(
        `${loan.id}: the money did not reach the borrower ${loan.borrowerId} alone (${[...lend.into.keys()].join(", ")})`,
      );
    disbursed += lend.total;
  }
  const rows = (perLoan.get(loan.id) ?? []).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  let balance = loan.principalMinor;
  for (const payment of rows) {
    const pay = moved(`loan-payment:${loan.id}:${payment.date}`);
    if (payment.paidMinor > 0) {
      if (pay.entries !== 1 || !pay.balanced || pay.total !== payment.paidMinor)
        fail(
          `${payment.id}: record paid ${payment.paidMinor}, journal moved ${pay.total} in ${pay.entries} entries${pay.balanced ? "" : " (unbalanced)"}`,
        );
      else if (!pay.into.has(loan.lenderId) || pay.into.size !== 1)
        fail(
          `${payment.id}: the payment did not reach the lender ${loan.lenderId} alone`,
        );
      else if (
        !isCounted(loan.borrowerId) &&
        (pay.outOf.size !== 1 || !pay.outOf.has(loan.borrowerId))
      )
        fail(
          `${payment.id}: the payment did not leave the borrower ${loan.borrowerId} alone`,
        );
      repaid += pay.total;
    } else if (pay.entries)
      fail(`${payment.id}: record paid nothing, journal moved ${pay.total}`);
    const interest = (balance * loan.annualRate) / months;
    balance = Math.round(Math.max(0, balance + interest - payment.paidMinor));
  }
  if (Math.abs(balance - loan.balanceMinor) > 1)
    fail(
      `${loan.id}: replayed balance ${balance}, record ${loan.balanceMinor}`,
    );
}

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
    sampleLoanIds: loans.slice(0, 5).map((loan) => loan.id),
    chargeOffDaysParameter: chargeOffDays,
  }),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
