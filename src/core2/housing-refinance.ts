/**
 * Refinancing: each month an owner with a mortgage weighs a new loan at
 * today's 30-year rate for what it still owes and the months it has left.
 * The pull is what the lower payment saves over the years they'd expect to
 * keep the loan against the closing costs, which are rolled into the new
 * balance (no cash changes hands at signing). A full household decides through
 * the shared chooser; the wider population by the same reasons, as summed
 * pulls. A refinanced loan pays the same holder; the payment drops from the
 * next due date.
 */
import { chooseAct } from "./choice";
import { strongestPulls } from "./modules/jobs";
import { residentsRuntime } from "./modules/residents";
import { setFlowPart } from "./residents-economy";
import { stopgap } from "./stopgaps";
import type { ModuleTable } from "./module-state";
import type { ActOffer, CoreAPI, CoreState } from "./types";

interface MortgageRow {
  id: string;
  householdId: string;
  holderId: string;
  rate: number;
  balanceMinor: number;
  paymentMinor: number;
  monthsLeft: number;
}

type Offer = (
  refinance: boolean,
  targetId: string,
  reasons: Record<string, number>,
) => ActOffer;

/** The level payment that repays `balance` over `months` at a yearly `rate`. */
export function levelPayment(
  balance: number,
  rate: number,
  months: number,
  monthsPerYear: number,
): number {
  const r = rate / monthsPerYear;
  return r > 0 ? (balance * r) / (1 - (1 + r) ** -months) : balance / months;
}

/** Reviews every open mortgage at today's 30-year rate; returns how many refinanced. */
export function reviewRefinances(
  api: CoreAPI,
  tables: { mortgages: ModuleTable; refinances: ModuleTable },
  marketRate: number,
  offer: Offer,
): number {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key),
    months = p("macroMonthsPerYear");
  const candidates: {
    row: MortgageRow;
    payment: number;
    balance: number;
    score: number;
    gain: number;
  }[] = [];
  for (const row of tables.mortgages.rows() as unknown as MortgageRow[]) {
    if (row.monthsLeft <= 0 || row.balanceMinor <= 0) continue;
    const balance = row.balanceMinor * (1 + p("housingRefinanceCostShare"));
    const payment = levelPayment(balance, marketRate, row.monthsLeft, months);
    const saving = row.paymentMinor - payment;
    // No saving at all: nothing to weigh.
    if (saving <= 0) continue;
    const cost = balance - row.balanceMinor;
    // What the lower payment saves over the years they'd keep the loan, against what closing costs.
    const gain = Math.log(
      (saving * p("housingRefinanceHorizonMonths") + 1) / (cost + 1),
    );
    candidates.push({
      row,
      payment,
      balance,
      gain,
      score:
        p("housingRefinanceBaseline") + p("housingRefinanceGainWeight") * gain,
    });
  }
  const rt = residentsRuntime(c);
  const chosen: typeof candidates = [];
  const counted: ((typeof candidates)[number] & { id: string })[] = [];
  for (const each of candidates) {
    const household = c.households.get(each.row.householdId);
    if (!household) {
      counted.push({ ...each, id: each.row.householdId });
      continue;
    }
    // The household's oldest living member decides for it.
    const head = household.memberIds
      .map((id) => c.people.get(id))
      .filter((row) => row?.alive)
      .sort(
        (a, b) =>
          a!.birthDate.localeCompare(b!.birthDate) ||
          a!.id.localeCompare(b!.id),
      )[0];
    if (!head) continue;
    const yes = offer(true, household.id, {
      baseline: p("housingRefinanceBaseline"),
      gain: p("housingRefinanceGainWeight") * each.gain,
    });
    const result = chooseAct(c, head.id, [offer(false, household.id, {}), yes]);
    if (result.selected!.definition.id === yes.definition.id) chosen.push(each);
  }
  if (counted.length)
    chosen.push(...strongestPulls(api, "housing-refinance", counted));
  let done = 0;
  // The same holder refinances its own loan; no other lender pays it off.
  if (chosen.length) stopgap("SG-WORLD-housing-refinance-same-holder");
  for (const each of chosen) {
    const { row } = each;
    const payment = Math.round(each.payment);
    const contract = c.finance.contracts.get(row.id);
    if (contract && !contract.endedAt)
      api.setStandingContractAmount(row.id, payment);
    else {
      // A counted household's payment is its part of a merged flow, at that flow's own cadence.
      const merged = [...(rt?.flows.values() ?? [])].find(
        (flow) =>
          !flow.endedAt && flow.amountByContract?.[row.id] !== undefined,
      );
      if (!merged) continue;
      setFlowPart(
        c,
        merged.id,
        row.id,
        (merged.amountByContract![row.id]! * payment) / row.paymentMinor,
      );
    }
    tables.mortgages.put({
      ...row,
      rate: marketRate,
      balanceMinor: Math.round(each.balance),
      paymentMinor: payment,
      refinancedAt: c.date,
    });
    tables.refinances.put({
      id: `refinance:${row.householdId}:${c.date}`,
      householdId: row.householdId,
      date: c.date,
      fromRate: row.rate,
      toRate: marketRate,
      balanceMinor: Math.round(each.balance),
      paymentBeforeMinor: row.paymentMinor,
      paymentAfterMinor: payment,
      monthsLeft: row.monthsLeft,
      gain: each.gain,
      decidedAs: c.households.has(row.householdId) ? "full" : "counted",
    });
    done += 1;
  }
  return done;
}
