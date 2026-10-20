/**
 * The baseline SNAP benefit: the federal treasury owes each household that
 * qualifies a monthly payment, the maximum allotment in force for its size
 * less the share of its net income it is expected to spend on food
 * (7 U.S.C. 2017(a); 7 CFR 273.9 and 273.10). A named household is paid on
 * its oldest member; the counted households are paid through the town's
 * residents account, each row standing for as many households as its weight
 * says. The work requirement, where it is law, stops a head it reaches after
 * their own three months in 36 (see `recordDraws`).
 *
 * Shelter, child-care and medical deductions, the asset test, categorical
 * eligibility and the elderly and disabled rules are not modeled (stopgap
 * SG-GOV-REACH-B-assistance-benefits).
 */
import type { CoreAPI, CoreState } from "../types";
import { lawChain, lawInForce, LAWS_MODULE_ID } from "../modules/laws";
import { residentsRuntime } from "../modules/residents";
import type { LawRowInput } from "../laws-starting";
import {
  povertyLineDollars,
  reachParameter,
  selectResidents,
  townFacts,
  type HouseholdFacts,
} from "./group-b-people";
import {
  type AssistanceTimeLimit,
  governmentAt,
  reconcileObligations,
  recordDraws,
  timeLimitedNow,
} from "./group-b-money";

/** The key the baseline benefit's records are kept under. */
export const FOOD_AID_KEY = "snap-baseline";

const STOPGAP = "SG-GOV-REACH-B-assistance-benefits";

/** The standard deduction for a household of this size. */
function standardDeduction(size: number): number {
  if (size <= 3) return reachParameter("snapStandardDeductionSize1To3Dollars");
  if (size === 4) return reachParameter("snapStandardDeductionSize4Dollars");
  if (size === 5) return reachParameter("snapStandardDeductionSize5Dollars");
  return reachParameter("snapStandardDeductionSize6PlusDollars");
}

/**
 * The maximum allotment by household size in force: the governing row's own
 * table, or, where an act changed the one-person amount, the latest table
 * recorded for that tier scaled to the new amount.
 */
function allotments(api: CoreAPI): ((size: number) => number) | null {
  const answer = lawInForce(api, "snap-maximum");
  const governing = answer.governing;
  if (!governing || !answer.value) return null;
  type Table = { byHouseholdSize?: Record<string, number> };
  let table = (governing.terms as Table | undefined)?.byHouseholdSize;
  let factor = 1;
  if (!table) {
    const rows = (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .query("bySeriesOnly", ["snap-maximum"]) as unknown as LawRowInput[]
    )
      .filter(
        (r) =>
          r.jurisdiction === governing.jurisdiction &&
          r.tier === governing.tier &&
          (r.terms as Table | undefined)?.byHouseholdSize &&
          r.effectiveDate <= api.state.date,
      )
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    const base = rows[0];
    if (!base) return null;
    table = (base.terms as Table).byHouseholdSize;
    factor = answer.value / (base.value ?? answer.value);
  }
  const sizes = table!;
  const added =
    (sizes[String(Object.keys(sizes).length)] ?? 0) -
    (sizes[String(Object.keys(sizes).length - 1)] ?? 0);
  return (size) => {
    const top = Object.keys(sizes).length;
    const amount =
      sizes[String(size)] ?? (sizes[String(top)] ?? 0) + added * (size - top);
    return Math.floor(amount * factor);
  };
}

/**
 * One household's monthly benefit in dollars: zero unless its gross income is
 * at or under 130 percent of the poverty line and its net income at or under
 * 100 percent. Retirement benefits are unearned, so only wages take the 20
 * percent earned income deduction.
 */
export function foodAidDollars(
  household: HouseholdFacts,
  povertyAnnual: number,
  allotment: (size: number) => number,
): number {
  const months = reachParameter("monthsPerYear");
  const gross = household.incomeDollars / months;
  if (gross > (reachParameter("snapGrossIncomeShare") * povertyAnnual) / months)
    return 0;
  const earned = gross - (household.retirementDollars ?? 0) / months;
  const net = Math.max(
    0,
    gross -
      reachParameter("snapEarnedIncomeDeductionShare") * Math.max(0, earned) -
      standardDeduction(household.size),
  );
  if (net > (reachParameter("snapNetIncomeShare") * povertyAnnual) / months)
    return 0;
  const benefit = Math.max(
    0,
    allotment(household.size) -
      Math.ceil(reachParameter("snapContributionShare") * net),
  );
  if (household.size > reachParameter("snapMinimumBenefitMaxSize"))
    return benefit;
  return Math.max(
    benefit,
    Math.floor(reachParameter("snapMinimumBenefitShare") * allotment(1)),
  );
}

/**
 * Pay the month's benefit: re-read every household's income and size, owe each
 * qualifying household its amount from the federal treasury, and end what no
 * longer applies. Run at the opening, on each monthly review and when the
 * maximum allotment changes.
 */
export function runFoodAid(
  api: CoreAPI,
  timeLimit: AssistanceTimeLimit | null,
): void {
  const gov = governmentAt(api, "federal");
  if (!gov) return;
  const chain = lawChain(api);
  const facts = townFacts(api, chain.townPlaceId);
  const allotment = allotments(api);
  const want = new Map<string, number>();
  if (allotment) {
    const cents = reachParameter("centsPerDollar");
    const residentsOrg = residentsRuntime(
      api.state as CoreState,
    )?.input.accounts.find((a) => a.placeId === chain.townPlaceId)?.accountId;
    const heads = selectResidents(
      facts,
      { householdHead: true },
      chain.stateKey,
    );
    const limited = timeLimitedNow(api, gov.id, FOOD_AID_KEY, timeLimit);
    const paid: string[] = [];
    let countedMinor = 0;
    for (const head of heads) {
      if (limited.has(head.id)) continue;
      const household = facts.households.get(head.householdId);
      if (!household) continue;
      const dollars = foodAidDollars(
        household,
        povertyLineDollars(chain.stateKey, household.size),
        allotment,
      );
      if (dollars <= 0) continue;
      paid.push(head.id);
      if (head.named) want.set(`${gov.id}|${head.id}`, dollars * cents);
      else countedMinor += dollars * cents * (head.scale ?? 1);
    }
    recordDraws(api, timeLimit, paid);
    if (countedMinor > 0 && residentsOrg)
      want.set(`${gov.id}|${residentsOrg}`, Math.floor(countedMinor));
    if (want.size) api.stopgap(STOPGAP);
  }
  reconcileObligations(api, {
    rowKind: "benefit",
    key: FOOD_AID_KEY,
    want,
    reasonKey: "law-reach:food-aid",
    citation: "7 U.S.C. 2017(a); 7 CFR 273.9 and 273.10",
  });
}
