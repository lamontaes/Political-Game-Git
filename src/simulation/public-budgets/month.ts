import { stateJurisdictionForKey } from "../life-places";
import { placeOutcomeAt } from "../outcome-web/place-outcome-store";
import { publicOrganizationKey } from "../tax-policy";
import type { EntityId, IsoDate, ResourceFlow, World } from "../types";
import {
  budgetLawReadings,
  firstOfNextMonth,
  fiscalYearContaining,
  nominalEconomyIndex,
  propositionIdFor,
} from "./fiscal";
import { actuarialContribution } from "./opening";
import { pensionFlows, pensionPayment } from "./pension-share";
import { reserveRule } from "./reserve-rule";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import {
  ECONOMY_ELASTICITY,
  FIRST_CUT_SHARE,
  PENSION,
  TAX_QUESTION_EFFECTS,
} from "./rules";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PROTECTED_PROGRAMS,
  stateLocalAidRate,
  sum,
  type AdoptedBudget,
  type BudgetAdjustment,
  type BudgetLawName,
  type BudgetLawReading,
  type BudgetMonthRow,
  type BudgetProgram,
  type BudgetSource,
  type PublicBudgetGovernment,
  type PublicBudgetStore,
} from "./store";

/**
 * THE MONTHLY PASS. On the first of each month every government settles the
 * month just ended:
 *
 * 1. Revenue: each source's adopted twelfth, moved by the economy since
 *    adoption. Income tax from represented people is what their withholding
 *    actually paid into the public account; the modeled part covers only the
 *    rest of the population, since represented people pay no other tax as
 *    records yet. A levy collected under an enacted tax law goes to the source
 *    its power names.
 * 2. Spending: each program's adopted twelfth, less any mid-year cut, interest
 *    on the debt actually outstanding, and every payment made that month under
 *    an enacted appropriation, recorded against its program. The public
 *    account's cash check is unchanged; the budget only records the payments.
 * 3. The laws, read at the government's own jurisdiction on the day
 *    (`law-in-force.ts`): a balanced-budget check each quarter, then at the
 *    year's end deficits, surpluses, the reserve and pensions, and the next
 *    year's budget is adopted.
 */

const CUTTABLE = BUDGET_PROGRAMS.map(
  (program) => !PROTECTED_PROGRAMS.has(program),
);
const INCOME_TAX = BUDGET_SOURCES.indexOf("individualIncomeTax");
const INTEREST = BUDGET_PROGRAMS.indexOf("interest");
const PENSION_PROGRAM = BUDGET_PROGRAMS.indexOf("pensionContribution");
const STATE_AID = BUDGET_SOURCES.indexOf("intergovernmental");
const LOCAL_AID = BUDGET_PROGRAMS.indexOf("localAid");

/** What the history recorded this month, by government key. */
export interface MonthFlows {
  readonly withheld: ReadonlyMap<string, number>;
  readonly represented: ReadonlyMap<string, number>;
  readonly levies: ReadonlyMap<string, readonly number[]>;
  readonly payments: ReadonlyMap<string, readonly number[]>;
}

/** The budget program an appropriation's program key belongs to. */
export function budgetProgramFor(programKey: string): BudgetProgram {
  const key = programKey.toLowerCase();
  if (/transit/.test(key)) return "transit";
  if (/bridge|highway|(^|[^a-z])road/.test(key)) return "highways";
  if (/school|education|teacher/.test(key)) return "schools";
  if (/police|law-enforcement/.test(key)) return "police";
  if (/fire/.test(key)) return "fire";
  if (/prison|correction/.test(key)) return "corrections";
  if (/housing|homeless/.test(key)) return "housing";
  if (/medicaid|assistance|welfare/.test(key)) return "welfareAndMedicaid";
  if (/health|hospital/.test(key)) return "healthAndHospitals";
  if (/park/.test(key)) return "parks";
  if (/water|environment|conservation/.test(key)) return "naturalResources";
  if (/workforce|reporting|agency/.test(key)) return "administration";
  return "otherPrograms";
}

const LEVY_SOURCE: Readonly<Record<string, BudgetSource>> = {
  sales: "generalSalesTax",
  property: "propertyTax",
  "selective-excise": "selectiveSalesTaxes",
};

/**
 * Reads the resource flows and outcomes recorded since the cursor, keeping
 * only what moved into or out of a budget government's public account.
 */
export function readMonthFlows(
  world: World,
  store: PublicBudgetStore,
): { flows: MonthFlows; cursor: PublicBudgetStore["cursor"] } {
  const history = world.history;
  const accountOwner = new Map<EntityId, string>();
  const byStableKey = new Map<string, string>();
  for (const government of store.governments) {
    byStableKey.set(
      publicOrganizationKey(government.jurisdictionId),
      government.key,
    );
    byStableKey.set(
      publicOrganizationKey(government.lawJurisdictionId),
      government.key,
    );
  }
  for (const organization of history.organizations) {
    const key = byStableKey.get(organization.stableKey);
    if (key) accountOwner.set(organization.id, key);
  }
  const relevant = new Map<EntityId, ResourceFlow>();
  for (
    let at = store.cursor.flows;
    at < history.resourceFlows.length;
    at += 1
  ) {
    const flow = history.resourceFlows[at]!;
    const touches =
      (flow.recipient.kind === "organization" &&
        accountOwner.has(flow.recipient.organizationId)) ||
      (flow.source.kind === "organization" &&
        accountOwner.has(flow.source.organizationId));
    if (touches) relevant.set(flow.id, flow);
  }
  const withheld = new Map<string, number>();
  const payers = new Map<string, Set<EntityId>>();
  const levies = new Map<string, number[]>();
  const payments = new Map<string, number[]>();
  for (
    let at = store.cursor.outcomes;
    at < history.resourceTransferOutcomes.length;
    at += 1
  ) {
    const outcome = history.resourceTransferOutcomes[at]!;
    if (outcome.status !== "completed") continue;
    const flow = relevant.get(outcome.resourceFlowId);
    if (!flow) continue;
    const dollars = outcome.transferredAmount.minorUnits / 100;
    if (dollars <= 0) continue;
    const into =
      flow.recipient.kind === "organization"
        ? accountOwner.get(flow.recipient.organizationId)
        : undefined;
    const outOf =
      flow.source.kind === "organization"
        ? accountOwner.get(flow.source.organizationId)
        : undefined;
    if (into && flow.basisKind === "custom:tax-withholding") {
      withheld.set(into, (withheld.get(into) ?? 0) + dollars);
      if (flow.source.kind === "person") {
        const set = payers.get(into) ?? new Set<EntityId>();
        set.add(flow.source.personId);
        payers.set(into, set);
      }
    } else if (into && flow.basisKind === "custom:tax-collection") {
      const source = levySource(world, flow);
      const row = levies.get(into) ?? BUDGET_SOURCES.map(() => 0);
      row[BUDGET_SOURCES.indexOf(source)]! += dollars;
      levies.set(into, row);
    } else if (outOf && !into) {
      const program = paymentProgram(world, flow);
      const row = payments.get(outOf) ?? BUDGET_PROGRAMS.map(() => 0);
      row[BUDGET_PROGRAMS.indexOf(program)]! += dollars;
      payments.set(outOf, row);
    }
  }
  return {
    flows: {
      withheld,
      represented: new Map(
        [...payers].map(([key, set]) => [key, set.size] as const),
      ),
      levies,
      payments,
    },
    cursor: {
      flows: history.resourceFlows.length,
      outcomes: history.resourceTransferOutcomes.length,
    },
  };
}

function levySource(world: World, flow: ResourceFlow): BudgetSource {
  const suffix = ":collection:flow";
  if (!flow.stableKey.endsWith(suffix)) return "vehicleAndOtherTaxes";
  const assessmentKey = flow.stableKey.slice(0, -suffix.length);
  const assessment = world.history.taxAssessments?.find(
    (row) => row.stableKey === assessmentKey,
  );
  const policy = assessment
    ? world.history.taxPolicies?.find((row) => row.id === assessment.policyId)
    : undefined;
  const proposal = policy
    ? world.history.taxProposals?.find((row) => row.id === policy.proposalId)
    : undefined;
  return (
    (proposal && LEVY_SOURCE[proposal.power.instrument]) ??
    "vehicleAndOtherTaxes"
  );
}

function paymentProgram(world: World, flow: ResourceFlow): BudgetProgram {
  const reference = flow.basisReference;
  if (reference.kind === "public-funding")
    return budgetProgramFor(reference.mandate.programKey);
  if (reference.kind === "public-program") {
    const commitment = world.history.publicProgramRecords?.find(
      (row) => row.id === reference.commitmentId,
    );
    return commitment
      ? budgetProgramFor(commitment.programKey)
      : "otherPrograms";
  }
  return "otherPrograms";
}

/** The change in a state's borrowing cost since the start, as a rate. */
function borrowingCostChange(
  world: World,
  stateId: EntityId | null,
  asOf: IsoDate,
): number {
  if (!stateId) return 0;
  // Build 5's measure; absent until it lands, and absent is no change.
  const record = placeOutcomeAt(world, "gov.borrowing-cost", stateId, asOf);
  return record ? (record.value - record.base) / 10_000 : 0;
}

function lawNote(
  name: BudgetLawName,
  reading: BudgetLawReading,
): BudgetAdjustment["law"] {
  return { name, reading };
}

function monthsInto(year: AdoptedBudget, month: IsoDate): number {
  const start =
    Number(year.startsOn.slice(0, 4)) * 12 + Number(year.startsOn.slice(5, 7));
  const now = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7));
  return now - start + 1;
}

/**
 * How a state's tax law in force on a date moves a revenue source against
 * the law the state began with (`TAX_QUESTION_EFFECTS`): 1 where nothing
 * changed, where the size is not researched, or for a county or city, whose
 * own taxes these state questions do not set. Income tax is read on January 1
 * of the date's year, the law paychecks withhold under for that tax year
 * (`stateIncomeTaxUnderLaw`), so the budget collects what paychecks withhold.
 */
export function taxLawFactor(
  world: World,
  government: PublicBudgetGovernment,
  source: BudgetSource,
  date: IsoDate,
): number {
  if (government.level !== "state") return 1;
  const onDate =
    source === "individualIncomeTax"
      ? (`${date.slice(0, 4)}-01-01` as IsoDate)
      : date;
  let factor = 1;
  for (const effect of TAX_QUESTION_EFFECTS) {
    if (effect.source !== source) continue;
    if (effect.toYes === null && effect.toNo === null) continue;
    const propositionId = propositionIdFor(world, effect.questionKey);
    if (!propositionId) continue;
    const now = lawInForce(
      world,
      government.lawJurisdictionId,
      propositionId,
      onDate,
    )?.answer;
    const began = lawInForceAtStart(
      world,
      government.lawJurisdictionId,
      propositionId,
      onDate,
    );
    if (began === "no" && now === "yes") factor *= 1 + (effect.toYes ?? 0);
    if (began === "yes" && now === "no") factor *= 1 + (effect.toNo ?? 0);
  }
  return Math.max(0, factor);
}

/**
 * One month of a source at the level the government opened with, under the
 * law it began with, carried to the economy on `economyIndex`. A tax a law
 * ended collected nothing to scale from, so a law that restores it starts
 * again from this level.
 */
function openingMonthLevel(
  government: PublicBudgetGovernment,
  source: BudgetSource,
  at: number,
  economyIndex: number | null,
): number {
  const first = government.years[0]!;
  const since =
    economyIndex !== null && first.economyAtAdoption
      ? economyIndex / first.economyAtAdoption
      : 1;
  return (
    (first.expectedRevenue[at]! / 12) *
    Math.max(0, 1 + ECONOMY_ELASTICITY[source] * (since - 1))
  );
}

interface Settled {
  readonly government: PublicBudgetGovernment;
  readonly adjustments: readonly BudgetAdjustment[];
}

/**
 * Settles one government's month, and its year when the month ends one. A
 * county or city takes its state already settled for the same month, so its
 * aid follows what the state spent.
 */
export function settleGovernmentMonth(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
  flows: MonthFlows,
  state: PublicBudgetGovernment | null = null,
): Settled {
  if (government.months.some((row) => row.month === month))
    return { government, adjustments: [] };
  const adjustments: BudgetAdjustment[] = [];
  const stateId = stateJurisdictionForKey(government.stateKey)?.id ?? null;
  const year = government.years.at(-1)!;
  const asOf = firstOfNextMonth(month);
  const economyNow = stateId ? nominalEconomyIndex(world, stateId, asOf) : null;
  const economy =
    economyNow !== null && year.economyAtAdoption
      ? economyNow / year.economyAtAdoption
      : 1;

  // Revenue.
  const represented = flows.represented.get(government.key) ?? 0;
  // A tax law that changed since adoption moves its source from that month.
  const revenue = BUDGET_SOURCES.map((source, at) => {
    const lawNow = taxLawFactor(world, government, source, month);
    const lawAtAdoption = taxLawFactor(
      world,
      government,
      source,
      year.startsOn,
    );
    // A budget adopted while a law had ended the source expects none of it;
    // a law restoring it collects from the level the government opened with.
    if (lawAtAdoption === 0)
      return Math.round(
        openingMonthLevel(government, source, at, economyNow) * lawNow,
      );
    return Math.round(
      (year.expectedRevenue[at]! / 12) *
        Math.max(0, 1 + ECONOMY_ELASTICITY[source] * (economy - 1)) *
        (lawNow / lawAtAdoption),
    );
  });
  if (government.population > 0)
    revenue[INCOME_TAX] = Math.round(
      (revenue[INCOME_TAX]! *
        Math.max(0, government.population - represented)) /
        government.population,
    );
  revenue[INCOME_TAX]! += Math.round(flows.withheld.get(government.key) ?? 0);
  // Aid from the state moves with what the state actually spent on aid to
  // local governments this month, against its rate when this budget was
  // adopted: a state's cut reaches its cities in the same month.
  const aidBase = year.stateLocalAidAtAdoption ?? null;
  const stateRow = state?.months.at(-1);
  if (aidBase !== null && aidBase > 0 && stateRow?.month === month)
    revenue[STATE_AID] = Math.round(
      (year.expectedRevenue[STATE_AID]! / 12) *
        ((stateRow.spending[LOCAL_AID]! * 12) / aidBase),
    );
  const levy = flows.levies.get(government.key);
  if (levy)
    for (const [at, value] of levy.entries()) revenue[at]! += Math.round(value);

  // Spending.
  const payments = flows.payments.get(government.key);
  const spending = BUDGET_PROGRAMS.map((_, at) => {
    const planned = year.appropriations[at]! / 12;
    return Math.round(CUTTABLE[at] ? planned * (1 - government.cut) : planned);
  });
  spending[INTEREST] = Math.round(
    (government.debt * government.interestRate) / 12,
  );
  if (payments)
    for (const [at, value] of payments.entries())
      spending[at]! += Math.round(value);

  let balance = government.balance + sum(revenue) - sum(spending);
  let reserve = government.reserve;
  let debt = government.debt;
  let interestRate = government.interestRate;
  let cut = government.cut;
  const deposit = Math.round(year.reserveDeposit / 12);
  if (deposit > 0 && balance >= deposit) {
    balance -= deposit;
    reserve += deposit;
  }

  const laws = budgetLawReadings(
    world,
    government.lawJurisdictionId,
    asOf,
    government.level !== "state",
  );
  const into = monthsInto(year, month);
  const remaining = 12 - into;
  const yearEnds = asOf > year.endsOn;

  // Balanced-budget check each quarter.
  if (
    !yearEnds &&
    into % 3 === 0 &&
    remaining > 0 &&
    laws.balanced.answer === "yes"
  ) {
    const pace = sum(revenue) - sum(spending);
    let gap = -(balance + remaining * pace);
    if (gap > 0) {
      const cuttableMonthly = sum(
        BUDGET_PROGRAMS.map((_, at) =>
          CUTTABLE[at] ? (year.appropriations[at]! / 12) * (1 - cut) : 0,
        ),
      );
      const room = cuttableMonthly * remaining;
      const first = Math.min(gap, FIRST_CUT_SHARE * room);
      gap -= first;
      const draw = Math.min(gap, reserve);
      gap -= draw;
      const second = Math.min(gap, room - first);
      const cutTotal = Math.round(first + second);
      const plannedCuttable = sum(
        BUDGET_PROGRAMS.map((_, at) =>
          CUTTABLE[at] ? year.appropriations[at]! / 12 : 0,
        ),
      );
      if (cutTotal > 0 && plannedCuttable > 0) {
        cut = Math.min(1, cut + cutTotal / remaining / plannedCuttable);
        adjustments.push({
          governmentKey: government.key,
          on: asOf,
          fiscalYear: year.fiscalYear,
          kind: "mid-year-cut",
          amount: cutTotal,
          law: lawNote("balanced", laws.balanced),
          note: `Collections would leave the year in deficit, so every program except interest and pensions is cut across the board for the rest of the year (${Math.round(first)} first, ${Math.round(second)} after the reserve).`,
        });
      }
      if (draw > 0) {
        reserve -= Math.round(draw);
        balance += Math.round(draw);
        adjustments.push({
          governmentKey: government.key,
          on: asOf,
          fiscalYear: year.fiscalYear,
          kind: "reserve-draw",
          amount: Math.round(draw),
          law: lawNote("balanced", laws.balanced),
          note: "Drawn from the reserve to keep the year balanced, after the first round of cuts.",
        });
      }
    }
  }

  const row: BudgetMonthRow = {
    month,
    revenue,
    spending,
    balance,
    reserve,
    debt,
    economy: Math.round(economy * 10000) / 10000,
    represented,
  };
  let next: PublicBudgetGovernment = {
    ...government,
    balance,
    reserve,
    debt,
    interestRate,
    cut,
    months: [...government.months, row],
  };
  if (!yearEnds) return { government: next, adjustments };

  // The year ends.
  if (balance < 0 && laws.balanced.answer === "yes") {
    const draw = Math.min(-balance, reserve);
    if (draw > 0) {
      reserve -= draw;
      balance += draw;
      adjustments.push({
        governmentKey: government.key,
        on: asOf,
        fiscalYear: year.fiscalYear,
        kind: "reserve-draw",
        amount: draw,
        law: lawNote("balanced", laws.balanced),
        note: "Drawn from the reserve to close the year's deficit.",
      });
    }
  }
  if (balance < 0) {
    const borrowed = -balance;
    const newRate = Math.max(
      0,
      government.interestRate + borrowingCostChange(world, stateId, asOf),
    );
    interestRate =
      debt + borrowed > 0
        ? (debt * interestRate + borrowed * newRate) / (debt + borrowed)
        : interestRate;
    debt += borrowed;
    balance = 0;
    adjustments.push({
      governmentKey: government.key,
      on: asOf,
      fiscalYear: year.fiscalYear,
      kind: "deficit-borrowed",
      amount: borrowed,
      law: lawNote("balanced", laws.balanced),
      note:
        laws.balanced.answer === "yes"
          ? "The cuts and the reserve could not close the year; the rest was borrowed."
          : laws.balanced.answer === "no"
            ? "No law requires a balanced budget, so the deficit was borrowed."
            : "No law in force answers whether the budget must balance, so no requirement applied and the deficit was borrowed.",
    });
  }
  const yearSpending = sum(year.appropriations);
  if (balance > 0 && laws.reserve.answer === "yes") {
    const floor = Math.round(reserveRule(government).floorShare * yearSpending);
    const moved = Math.min(balance, Math.max(0, floor - reserve));
    if (moved > 0) {
      balance -= moved;
      reserve += moved;
      adjustments.push({
        governmentKey: government.key,
        on: asOf,
        fiscalYear: year.fiscalYear,
        kind: "surplus-to-reserve",
        amount: moved,
        law: lawNote("reserve", laws.reserve),
        note: "The year's surplus went to the reserve first, toward the required floor.",
      });
    }
  }

  // Pensions for the year: paid against required, and the plan rolls on. An
  // opening year runs only the months since the world began, so what was
  // required, earned and paid out covers those months, not a whole year.
  const yearRows = next.months.filter(
    (entry) => entry.month >= year.startsOn && entry.month <= year.endsOn,
  );
  const share = yearRows.length / 12;
  const paid = sum(yearRows.map((entry) => entry.spending[PENSION_PROGRAM]!));
  const required = year.pensionRequired * share;
  const unpaid = Math.round(required - paid);
  // The adopted budget set the pension share, so the law read at adoption is
  // the one that decided it; a law enacted later governs the next budget.
  const pensionLaw = year.laws.pensions;
  // Each month's payment rounds to a whole dollar, which can leave up to a
  // dollar a month short even when the whole share is paid; that is not
  // underpaying.
  if (unpaid > Math.max(yearRows.length, required * 0.001))
    adjustments.push({
      governmentKey: government.key,
      on: asOf,
      fiscalYear: year.fiscalYear,
      kind: "pension-underpaid",
      amount: unpaid,
      law: lawNote("pensions", pensionLaw),
      note:
        pensionLaw.answer === "yes"
          ? "The pension payments fell short of the full actuarial contribution the law requires."
          : pensionLaw.answer === "no"
            ? "No law requires the full actuarial contribution; the unpaid part grows the unfunded liability."
            : "No law in force when the budget was adopted answered whether pensions must be funded on schedule, so the government paid its own share (the share its own plans filed, or the median of every plan where they are not listed).",
    });
  const liability = government.pension.liability;
  const plans = pensionFlows(government);
  const benefits = liability * plans.benefitShare * share;
  const pension = {
    // The share stays where it began until budgets pass as bills.
    paidShare: government.pension.paidShare,
    liability: Math.round(
      liability * (1 + PENSION.assumedReturn * share) +
        liability * plans.normalCostShare * share -
        benefits,
    ),
    assets: Math.round(
      government.pension.assets * (1 + PENSION.assumedReturn * share) +
        paid -
        benefits,
    ),
  };

  next = { ...next, balance, reserve, debt, interestRate, pension, cut: 0 };
  const adopted = adoptNextYear(
    world,
    next,
    year,
    yearRows,
    adjustments,
    state,
  );
  return {
    government: { ...next, years: [...next.years, adopted] },
    adjustments,
  };
}

/**
 * The government's own modeled adoption for the next year (automatic; a
 * budget passed as a bill comes later). It expects to collect what it
 * collected last year at today's economy, and a county or city expects its
 * state aid at the state's current rate. It pays interest and the pension
 * share its law requires, sets aside the reserve deposit its law requires,
 * and plans programs to spend the rest (PLACEHOLDER rule). Under a
 * balanced-budget law programs shrink when that is less than last year;
 * without one they are not cut at adoption, and the gap shows up as a
 * deficit. The balance above the reserve target is carried in and spent
 * across the year, once (Claude CTO, 11:54 p.m. ruling of September 28, 2026).
 */
function adoptNextYear(
  world: World,
  government: PublicBudgetGovernment,
  prior: AdoptedBudget,
  rows: readonly BudgetMonthRow[],
  adjustments: BudgetAdjustment[],
  state: PublicBudgetGovernment | null,
): AdoptedBudget {
  const startsOn = firstOfNextMonth(prior.endsOn);
  const year = fiscalYearContaining(startsOn, government.fiscalYearStart);
  const laws = budgetLawReadings(
    world,
    government.lawJurisdictionId,
    startsOn,
    government.level !== "state",
  );
  const stateId = stateJurisdictionForKey(government.stateKey)?.id ?? null;
  const economyAtAdoption = stateId
    ? nominalEconomyIndex(world, stateId, startsOn)
    : null;
  // Last year's collections, each month restated at the economy the new
  // budget is adopted in: a growing economy has already raised the base, so
  // last year's average would understate it.
  const economyNow =
    economyAtAdoption !== null && prior.economyAtAdoption
      ? economyAtAdoption / prior.economyAtAdoption
      : null;
  const expectedRevenue = BUDGET_SOURCES.map((source, at) => {
    if (rows.length === 0) return prior.expectedRevenue[at]!;
    const elasticity = ECONOMY_ELASTICITY[source];
    const scaleAt = (economy: number) =>
      Math.max(0, 1 + elasticity * (economy - 1));
    // Each month is also restated to the tax law in force at adoption, so a
    // law that changed last year counts once, in full.
    const lawNow = taxLawFactor(world, government, source, startsOn);
    const restated = rows.map((row) => {
      const lawThen = taxLawFactor(world, government, source, row.month);
      // A month a law had ended the source collected nothing to restate; it
      // counts at the opening level under today's law.
      if (lawThen === 0)
        return (
          openingMonthLevel(government, source, at, economyAtAdoption) * lawNow
        );
      const law = lawNow / lawThen;
      if (economyNow === null) return row.revenue[at]! * law;
      const then = scaleAt(row.economy);
      return then > 0
        ? (row.revenue[at]! * scaleAt(economyNow) * law) / then
        : row.revenue[at]! * law;
    });
    return Math.round((sum(restated) * 12) / rows.length);
  });
  // A county's or city's aid follows the state's current rate from where the
  // last budget expected it; a first link starts from last year's collections.
  const stateLocalAidAtAdoption =
    government.level !== "state" && state ? stateLocalAidRate(state) : null;
  const priorAidBase = prior.stateLocalAidAtAdoption ?? null;
  if (
    stateLocalAidAtAdoption !== null &&
    priorAidBase !== null &&
    priorAidBase > 0
  )
    expectedRevenue[STATE_AID] = Math.round(
      (prior.expectedRevenue[STATE_AID]! * stateLocalAidAtAdoption) /
        priorAidBase,
    );
  const pensionRequired = actuarialContribution(
    government.pension,
    pensionFlows(government).normalCostShare,
  );
  const pensionPaid = pensionPayment(
    pensionRequired,
    government.pension.paidShare,
    laws.pensions,
  );
  const interest = Math.round(government.debt * government.interestRate);
  // Last year's programs without the one-time balance it carried in: that
  // money was spent once and is not a level the new budget builds on.
  const priorCuttableAll = sum(
    prior.appropriations.map((value, at) => (CUTTABLE[at] ? value : 0)),
  );
  const oneTimeShare =
    priorCuttableAll > 0
      ? Math.min(1, (prior.carriedBalance ?? 0) / priorCuttableAll)
      : 0;
  const base = prior.appropriations.map((value, at) =>
    CUTTABLE[at] ? value * (1 - oneTimeShare) : value,
  );
  const priorTotal = sum(base);
  const reserveLaw = reserveRule(government);
  const floor = reserveLaw.floorShare * priorTotal;
  const reserveDeposit =
    laws.reserve.answer === "yes" && government.reserve < floor
      ? Math.round(
          Math.min(
            floor - government.reserve,
            reserveLaw.depositShare * priorTotal,
          ),
        )
      : 0;
  const available = Math.max(
    0,
    sum(expectedRevenue) - interest - pensionPaid - reserveDeposit,
  );
  const cuttablePrior = sum(
    base.map((value, at) => (CUTTABLE[at] ? value : 0)),
  );
  const fitted = cuttablePrior > 0 ? available / cuttablePrior : 1;
  const scale = laws.balanced.answer === "yes" ? fitted : Math.max(1, fitted);
  // The balance above the reserve target is carried into the year and spent
  // across it. What the reserve still lacks of its target, after this year's
  // deposit, stays in the balance.
  const kept = Math.max(0, floor - government.reserve - reserveDeposit);
  const carried =
    cuttablePrior > 0 ? Math.max(0, Math.round(government.balance - kept)) : 0;
  const recurring = cuttablePrior * scale;
  // Programs revenue cannot pay are paid from the carried balance first;
  // the rest of it is spent on top of this year's programs.
  const carriedBalance = Math.max(
    0,
    carried - Math.max(0, recurring - available),
  );
  const shortfall = Math.round(cuttablePrior * (1 - fitted) - carried);
  if (laws.balanced.answer === "yes" && fitted < 1 && shortfall > 0)
    adjustments.push({
      governmentKey: government.key,
      on: startsOn,
      fiscalYear: year.fiscalYear,
      kind: "balanced-at-adoption",
      amount: shortfall,
      law: { name: "balanced", reading: laws.balanced },
      note: "Expected revenue and the carried balance fell short of last year's programs, so the adopted budget cut them to balance.",
    });
  if (carried > 0)
    adjustments.push({
      governmentKey: government.key,
      on: startsOn,
      fiscalYear: year.fiscalYear,
      kind: "balance-carried",
      amount: carried,
      law: null,
      note: `The balance above what the reserve still lacks of its target (${reserveLaw.floorShare} of a year's spending; ${reserveLaw.basis}) was carried into the new year and is spent across it, once.`,
    });
  if (reserveDeposit > 0)
    adjustments.push({
      governmentKey: government.key,
      on: startsOn,
      fiscalYear: year.fiscalYear,
      kind: "reserve-deposit",
      amount: reserveDeposit,
      law: { name: "reserve", reading: laws.reserve },
      note: `The reserve is below its required floor, so the adopted budget sets a deposit aside: the floor is ${reserveLaw.floorShare} of a year's spending, at most ${reserveLaw.depositShare} a year (${reserveLaw.basis}).`,
    });
  const planned = base.map((value, at) => (CUTTABLE[at] ? value * scale : 0));
  // Spread over this year's programs, or last year's when none is planned.
  const weights =
    recurring > 0
      ? planned
      : base.map((value, at) => (CUTTABLE[at] ? value : 0));
  const weightTotal = sum(weights);
  const appropriations = planned.map((value, at) =>
    Math.round(
      value +
        (weightTotal > 0 ? (carriedBalance * weights[at]!) / weightTotal : 0),
    ),
  );
  appropriations[INTEREST] = interest;
  appropriations[PENSION_PROGRAM] = pensionPaid;
  return {
    fiscalYear: year.fiscalYear,
    startsOn: year.startsOn,
    endsOn: year.endsOn,
    adoptedOn: startsOn,
    basis: "automatic",
    expectedRevenue,
    appropriations,
    reserveDeposit,
    pensionRequired,
    pensionShare: government.pension.paidShare,
    economyAtAdoption,
    laws,
    carriedBalance,
    stateLocalAidAtAdoption,
  };
}
