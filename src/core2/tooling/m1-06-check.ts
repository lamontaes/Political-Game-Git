/**
 * M1-06 golden-path check, on the whole economy, with the core's bookkeeping
 * on (every posting conserves cash). Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. A drawn town runs two years.
 * Passes when, for every loan the town bank made: (1) its balance replays
 * exactly from its principal, its rate and the payments the ledger moved;
 * (2) a payment fell short only when the borrower's cash before it was less
 * than what was due; (3) a loan was charged off only after its days past due,
 * with its cause; (4) no business line is drawn past its limit; and no
 * deposit goes below zero. Mortgages amortize in the housing engine.
 * Exits nonzero on failure.
 */
import { advanceCore, createLifeCore } from "../life";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { parameter } from "../parameters";
import { coreAPI } from "../state";
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
if (!seed || !placeKey)
  throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
const data = worldCoreData(),
  p = (key: string) => parameter(key, data.parameters);
const failures: string[] = [];
const input = withWorldEconomy(
  generatedOpening({ seed, key: placeKey }, { twoLevel: true }),
);
const core = createLifeCore(input, { data, modules: [...WORLD_MODULES] });
const api = coreAPI(core);
advanceCore(core, input.startedAt);
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 2);
advanceCore(core, end.toISOString().slice(0, 10));

type Loan = {
  id: string;
  kind: string;
  borrowerId: string;
  principalMinor: number;
  balanceMinor: number;
  annualRate: number;
  standing?: string;
  chargedOffAt?: string;
  chargeOffCause?: string;
  firstPastDueAt?: string;
  openedAt: string;
};
type Payment = {
  loanId: string;
  date: string;
  dueMinor: number;
  paidMinor: number;
  cashBeforeMinor: number;
  standing: string;
  payoff?: boolean;
};
const credit = api.moduleState("credit");
const loans = [...credit.table("loans").rows()] as unknown as Loan[];
const months = p("macroMonthsPerYear");
const byKind: Record<string, number> = {},
  standings: Record<string, number> = {};
let short = 0;
for (const loan of loans) {
  byKind[loan.kind] = (byKind[loan.kind] ?? 0) + 1;
  standings[loan.standing ?? "current"] =
    (standings[loan.standing ?? "current"] ?? 0) + 1;
  const payments = [
    ...(credit
      .table("payments")
      .query("byLoan", [loan.id]) as unknown as Payment[]),
  ].sort((a, b) => a.date.localeCompare(b.date));
  // (1) The balance replays from the principal and what was paid.
  let balance = loan.principalMinor;
  for (const row of payments) {
    // A payoff (the home sold) settles the balance that day, with no month's interest.
    const interest = row.payoff ? 0 : (balance * loan.annualRate) / months;
    balance = Math.round(Math.max(0, balance + interest - row.paidMinor));
  }
  if (Math.abs(balance - loan.balanceMinor) > payments.length + 1)
    failures.push(
      `${loan.id}: balance ${loan.balanceMinor} does not replay (${balance})`,
    );
  for (const row of payments) {
    // (2) Short only when the cash wasn't there.
    if (row.paidMinor < Math.floor(row.dueMinor)) {
      short += 1;
      if (row.cashBeforeMinor >= row.dueMinor)
        failures.push(
          `${loan.id} ${row.date}: paid ${row.paidMinor} of ${row.dueMinor} with ${row.cashBeforeMinor} in cash`,
        );
    }
  }
  // (3) A charge-off only after its days past due, with its cause.
  if (loan.standing === "charged-off") {
    const days =
      (Date.parse(loan.chargedOffAt!) - Date.parse(loan.firstPastDueAt!)) /
      86_400_000;
    if (!(days >= p("creditChargeOffDays")) || !loan.chargeOffCause)
      failures.push(`${loan.id}: charged off after ${days} days without cause`);
  }
}
// Business lines at the town bank: what's drawn never exceeds the line or goes below zero.
const bankId = (
  credit.table("banks").get("credit:bank") as unknown as
    { organizationId: string } | undefined
)?.organizationId;
let lines = 0;
for (const row of core.finance.facilities.values()) {
  if (row.lenderId !== bankId) continue;
  lines += 1;
  if (row.principalMinor < 0 || row.principalMinor > row.limitMinor + 1)
    failures.push(
      `${row.id}: drawn ${row.principalMinor} against a ${row.limitMinor} line`,
    );
}
// The bank's deposits: what each household or business holds there never goes below zero.
for (const row of credit.table("depositMoves").rows() as unknown as {
  id: string;
  depositAfterMinor: number;
}[])
  if (row.depositAfterMinor < 0) failures.push(`${row.id}: negative deposit`);
const book = [...credit.table("books").rows()].at(-1) as unknown as
  Record<string, number> | undefined;

console.log(
  JSON.stringify(
    {
      place: input.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      loans: byKind,
      standings,
      shortPayments: short,
      businessLines: lines,
      bank: book && {
        cashDollars: Math.round(book.cash! / 100),
        depositsDollars: Math.round((book.deposits ?? 0) / 100),
        equityDollars: Math.round(book.equity! / 100),
      },
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exit(1);
