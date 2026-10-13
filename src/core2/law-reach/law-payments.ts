/**
 * Laws that pay (PW-4 step 3): money the law in force moves to the town's
 * people, through the cash journal from a funded account, recorded as a
 * `payment` with the law row as its source.
 *
 * - SNAP: each month, every household in the town whose gross income (pay
 *   and recorded income such as retirement awards) passes the federal test is
 *   paid the allotment the law in force sets for its size, less 30 percent of
 *   its net income (7 U.S.C. 2017(a)), from the program's federal account
 *   outside the town. A named household is paid to its head; counted
 *   households are paid into the place's pooled residents' account, scaled to
 *   the town's recorded population where the counted records hold more.
 *   The benefit slides with income; only the statute's own gross test cuts off.
 * - Unemployment insurance: the state's program terms come from the law in
 *   force (`registerUnemploymentTerms`), and each month the claims paid under
 *   them are recorded as the law's payments.
 */
import params from "../data/laws/law-payments-parameters.json" with { type: "json" };
import type { CoreAPI, CoreState, Source } from "../types";
import { lawChain, lawInForce } from "../modules/laws";
import { residentsRuntime } from "../modules/residents";
import { retirementClaims } from "../modules/retirement-claims";
import { townPopulation } from "./group-b-money";
import {
  registerUnemploymentTerms,
  type UnemploymentTerms,
} from "../jobs-benefits";
import { transferCash } from "../world-transfer";
import {
  povertyLineDollars,
  selectResidents,
  townFacts,
  type HouseholdFacts,
} from "./group-b-people";
import { putLawRecord } from "./law-records";
import type { LawRowInput } from "../laws-starting";

const table = (
  params as unknown as {
    parameters: Record<string, { value: number }>;
  }
).parameters;

export function paymentParameter(key: string): number {
  const row = table[key];
  if (!row) throw new Error(`Unknown law-payment parameter: ${key}`);
  return row.value;
}

const SNAP_KEY = "snap-maximum";
const UI_KEY = "unemployment-insurance";
const JOBS_MODULE = "jobs";

const lawSource = (
  rows: readonly (LawRowInput | null)[],
  date: string,
): Source => {
  const cited = rows.filter((r): r is LawRowInput => r !== null);
  const citation = cited
    .map(
      (r) =>
        `${r.id} (${Array.isArray(r.source) ? r.source.join(" ; ") : String(r.source)})`,
    )
    .join(" ; ");
  return cited.some((r) => r.estimate)
    ? { tag: "ESTIMATED", citation, asOf: date, estimatedFrom: citation }
    : { tag: "SOURCED", citation, asOf: date };
};

// --- unemployment insurance terms from the law in force -----------------------

/** Weeks of pay a state's benefit fraction is stated against, from the law row's own words. */
function baseWeeks(appliesTo: string): number {
  const text = appliesTo.toLowerCase();
  if (text.startsWith("high-quarter"))
    return paymentParameter("highQuarterWeeks");
  if (text.includes("2 highest") || text.includes("2 consecutive"))
    return paymentParameter("twoQuarterWeeks");
  return paymentParameter("basePeriodWeeks");
}

/** The state program's terms, read from its law rows; undefined where they don't say. */
export function unemploymentTermsFromLaw(
  api: CoreAPI,
): UnemploymentTerms | undefined {
  const program = lawInForce(api, UI_KEY).governing;
  const maximum = lawInForce(api, "unemployment-weekly-maximum").governing;
  if (!program) return undefined;
  const terms = (program.terms ?? {}) as {
    hasProgram?: boolean;
    weeklyBenefitFraction?: number | null;
    weeklyBenefitAppliesTo?: string | null;
    maxWeeks?: number | null;
    waitingWeek?: boolean | null;
    baseEarnings?: { minimumBasePeriodWages?: number | null } | null;
  };
  const source = lawSource([program, maximum], api.state.date);
  const cents = paymentParameter("centsPerDollar");
  if (terms.hasProgram === false || program.value === 0)
    return {
      hasProgram: false,
      weeklyShare: 0,
      weeklyMaximumMinor: 0,
      maxWeeks: 0,
      waitingWeek: false,
      minimumBasePeriodMinor: 0,
      source,
    };
  if (
    !terms.weeklyBenefitFraction ||
    !terms.weeklyBenefitAppliesTo ||
    !terms.maxWeeks ||
    !maximum?.value
  )
    return undefined; // the jobs engine's national estimate stands in
  return {
    hasProgram: true,
    weeklyShare:
      terms.weeklyBenefitFraction * baseWeeks(terms.weeklyBenefitAppliesTo),
    weeklyMaximumMinor: Math.round(maximum.value * cents),
    maxWeeks: terms.maxWeeks,
    waitingWeek: terms.waitingWeek !== false,
    minimumBasePeriodMinor: Math.round(
      (terms.baseEarnings?.minimumBasePeriodWages ?? 0) * cents,
    ),
    source,
  };
}

let unemploymentRegistered = false;
export function registerLawUnemploymentTerms(): void {
  if (unemploymentRegistered) return;
  unemploymentRegistered = true;
  registerUnemploymentTerms((api) => {
    try {
      return unemploymentTermsFromLaw(api);
    } catch {
      return undefined; // a world without the laws module
    }
  });
}

interface ClaimLike {
  readonly id: string;
  readonly personId: string;
  readonly payeeAccountOwnerId: string;
  readonly paidMinor: number;
}

/** Record the unemployment benefits paid under the law since the last review. */
function recordUnemployment(api: CoreAPI, town: string): void {
  const core = api.state as CoreState;
  if (!core.modules.has(JOBS_MODULE)) return;
  const program = lawInForce(api, UI_KEY).governing;
  if (!program) return;
  const seen = api.moduleState("core2-law-effects-v1").table("paidSoFar");
  for (const claim of api
    .moduleState(JOBS_MODULE)
    .table("claims")
    .rows() as unknown as ClaimLike[]) {
    const before =
      (seen.get(claim.id) as unknown as { minor: number } | undefined)?.minor ??
      0;
    const paid = claim.paidMinor - before;
    if (paid <= 0) continue;
    const named = core.people.get(claim.personId)?.placeId === town;
    putLawRecord(api, {
      id: `payment:${UI_KEY}:${claim.id}:${api.state.date}`,
      kind: "payment",
      lawId: program.id,
      key: UI_KEY,
      date: api.state.date,
      recipientId: named ? claim.personId : claim.payeeAccountOwnerId,
      named,
      households: 1,
      payerId: "state unemployment fund",
      amountMinor: paid,
      transferId: `unemployment-benefit:${claim.personId}`,
      what: "unemployment benefit",
    });
    seen.put({ id: claim.id, minor: claim.paidMinor } as never);
  }
}

// --- SNAP ------------------------------------------------------------------------

const SNAP_PAYER = "organization:outside:snap";

function snapPayer(api: CoreAPI, town: string, source: Source): string {
  if (!api.state.organizations.has(SNAP_PAYER))
    api.addOrganization({
      id: SNAP_PAYER,
      placeId: town,
      name: "Supplemental Nutrition Assistance Program",
      kind: "public-institution",
      liquidMinor: 0,
      outsideFlow: source,
      source,
    });
  return SNAP_PAYER;
}

/** The month's allotment for a household under the law in force (cents), or 0. */
export function snapAllotmentMinor(
  row: LawRowInput,
  household: Pick<HouseholdFacts, "size" | "incomeDollars">,
  stateKey: string,
): number {
  const p = paymentParameter;
  const cents = p("centsPerDollar");
  const months = p("monthsPerYear");
  const size = Math.max(1, household.size);
  const grossMonthly = household.incomeDollars / months;
  const limit =
    (p("snapGrossIncomeLimitShareOfPoverty") *
      povertyLineDollars(stateKey, size)) /
    months;
  if (grossMonthly > limit) return 0;
  const terms = (row.terms ?? {}) as {
    byHouseholdSize?: Record<string, number>;
    additionalPerson?: number | null;
  };
  const sizes = terms.byHouseholdSize ?? {};
  const largest = Math.max(
    ...Object.keys(sizes).map(Number).filter(Number.isFinite),
    1,
  );
  const maximumDollars =
    sizes[String(Math.min(size, largest))] ?? row.value ?? 0;
  const extra =
    size > largest ? (size - largest) * (terms.additionalPerson ?? 0) : 0;
  const maximumMinor = Math.round((maximumDollars + extra) * cents);
  const deduction =
    size >= p("snapLargeHouseholdFrom")
      ? p("snapStandardDeductionLargeMinor")
      : p("snapStandardDeductionSmallMinor");
  const netMinor = Math.max(
    0,
    grossMonthly * cents * (1 - p("snapEarnedIncomeDeduction")) - deduction,
  );
  const allotment = Math.round(
    maximumMinor - p("snapBenefitReductionRate") * netMinor,
  );
  if (size <= p("snapMinimumBenefitMaxSize"))
    return Math.max(allotment, p("snapMinimumBenefitMinor"));
  return Math.max(0, allotment);
}

/** A household's recorded unearned income a year, in dollars: income contracts and retirement awards. */
function unearnedDollars(
  core: CoreState,
  householdId: string,
  named: boolean,
  memberIds: readonly string[],
): number {
  const cents = paymentParameter("centsPerDollar");
  const months = paymentParameter("monthsPerYear");
  let monthly = 0;
  const add = (c: {
    kind: string;
    amountMinor: number;
    periodMonths: number;
  }) => {
    if (c.kind.startsWith("income.") && c.periodMonths > 0)
      monthly += c.amountMinor / c.periodMonths;
  };
  if (named) {
    const claims = retirementClaims(core);
    for (const id of memberIds) {
      for (const cid of core.finance.incomeContractsByPerson.get(id) ?? []) {
        const c = core.finance.contracts.get(cid);
        if (c && !c.endedAt) add(c);
      }
      monthly += claims.get(id)?.monthlyMinor ?? 0;
    }
  } else {
    const record = residentsRuntime(core)?.households.get(householdId);
    for (const c of record?.contracts ?? []) add(c);
  }
  return (monthly * months) / cents;
}

/** Pay the month's SNAP allotments to the town's eligible households. */
function paySnap(api: CoreAPI, town: string): void {
  const answer = lawInForce(api, SNAP_KEY);
  const row = answer.governing;
  if (!row || !row.value) return;
  const core = api.state as CoreState;
  const chain = lawChain(api);
  const facts = townFacts(api, town);
  const heads = selectResidents(
    facts,
    { ageFrom: "adultAge", householdHead: true },
    chain.stateKey,
  );
  const source = lawSource([row], api.state.date);
  // stopgapId: SG-GOV-snap-simplified-test
  api.stopgap("SG-GOV-snap-simplified-test");
  let pooled = 0;
  let pooledHouseholds = 0;
  const payer = () => snapPayer(api, town, source);
  const members = new Map<string, string[]>();
  for (const r of facts.residents)
    members.set(r.householdId, [...(members.get(r.householdId) ?? []), r.id]);
  // Counted records can hold more people than the town's recorded population.
  const counted = facts.residents.filter((r) => !r.named).length;
  const named = facts.residents.length - counted;
  const countedScale =
    counted > 0
      ? Math.min(1, Math.max(0, townPopulation(api) - named) / counted)
      : 0;
  for (const head of heads) {
    const facts0 = facts.households.get(head.householdId);
    if (!facts0) continue;
    const household = {
      size: facts0.size,
      incomeDollars:
        facts0.incomeDollars +
        unearnedDollars(
          core,
          head.householdId,
          head.named,
          members.get(head.householdId) ?? [],
        ),
    };
    const amount = snapAllotmentMinor(row, household, chain.stateKey);
    if (amount <= 0) continue;
    if (!head.named) {
      pooled += amount;
      pooledHouseholds += 1;
      continue;
    }
    const transferId = `snap-benefit:${head.id}:${api.state.date}`;
    const paid = transferCash(
      api,
      transferId,
      payer(),
      head.id,
      amount,
      source,
    );
    if (paid > 0)
      putLawRecord(api, {
        id: `payment:${SNAP_KEY}:${head.id}:${api.state.date}`,
        kind: "payment",
        lawId: row.id,
        key: SNAP_KEY,
        date: api.state.date,
        recipientId: head.id,
        named: true,
        households: 1,
        payerId: SNAP_PAYER,
        amountMinor: paid,
        transferId,
        what: "SNAP allotment",
      });
  }
  const pool = residentsRuntime(core)?.input.accounts.find(
    (a) => a.placeId === town,
  )?.accountId;
  pooled = Math.round(pooled * countedScale);
  pooledHouseholds = Math.round(pooledHouseholds * countedScale);
  if (pooled > 0 && pool) {
    const transferId = `snap-benefit:${pool}:${api.state.date}`;
    const paid = transferCash(api, transferId, payer(), pool, pooled, source);
    if (paid > 0)
      putLawRecord(api, {
        id: `payment:${SNAP_KEY}:${pool}:${api.state.date}`,
        kind: "payment",
        lawId: row.id,
        key: SNAP_KEY,
        date: api.state.date,
        recipientId: pool,
        named: false,
        households: pooledHouseholds,
        payerId: SNAP_PAYER,
        amountMinor: paid,
        transferId,
        what: "SNAP allotments",
      });
  }
}

/**
 * Each person a law paid this month carries the payment as a law effect on
 * their record (since their first payment), ended when the law stops paying
 * them, so their record and the law's "who it reaches" show it.
 */
function markPaid(
  api: CoreAPI,
  key: string,
  what: string,
  enforcer: string,
): void {
  const date = api.state.date;
  const applied = api.moduleState("core2-law-effects-v1").table("applied");
  const paid = new Map<string, string>();
  for (const record of api
    .moduleState("core2-law-effects-v1")
    .table("records")
    .query("byLaw", [lawInForce(api, key).governing?.id ?? ""]) as unknown as {
    kind: string;
    named: boolean;
    date: string;
    recipientId: string;
    lawId: string;
  }[])
    if (record.kind === "payment" && record.named && record.date === date)
      paid.set(record.recipientId, record.lawId);
  const open = applied.query("byQuestion", [key, null]) as unknown as {
    id: string;
    personId: string;
  }[];
  for (const row of open)
    if (!paid.has(row.personId))
      applied.put({ ...row, endedOn: date } as never);
  const holding = new Set(open.map((row) => row.personId));
  for (const [personId, lawId] of paid) {
    if (holding.has(personId)) continue;
    applied.put({
      id: `effect:${lawId}:${personId}:${date}`,
      personId,
      lawId,
      question: key,
      kind: "payment",
      what,
      enforcer,
      penalty: "",
      since: date,
      endedOn: null,
    } as never);
  }
}

/** The month's law payments: SNAP paid, unemployment benefits recorded. */
export function payLaws(api: CoreAPI): void {
  const town = lawChain(api).townPlaceId;
  paySnap(api, town);
  markPaid(api, SNAP_KEY, "SNAP allotment", "the state's SNAP agency");
  recordUnemployment(api, town);
  markPaid(
    api,
    UI_KEY,
    "unemployment benefit",
    "the state's unemployment insurance agency",
  );
}
