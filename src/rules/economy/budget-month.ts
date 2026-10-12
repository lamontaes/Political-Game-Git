/** Full retained government monthly settlement, forecast and fiscal rollover math; public parent returns budget records/adjustments, not World writes. */
import { makeIsoDate } from "../../simulation/dates";
import {
  lawInForce as lawOf,
  lawInForceAtStart as startOf,
} from "../laws/dated-law";
import { lawEffectStamp } from "../laws/effect-stamp";
import {
  federalAidFactor as aidOf,
  type OutlayFacts,
} from "../laws/recorded-outlays";
import {
  budgetLawReadings as readingsOf,
  nominalEconomyIndex as nominalOf,
  propositionIdFor as propositionOf,
  budgetObligationPayment,
  fiscalYearContaining,
} from "./budget-fiscal";
import { roadChargeFactor as roadOf } from "./budget-road";
import {
  cannabisSalesRevenueChange as cannabisOf,
  type CannabisBudgetFacts,
} from "./budget-cannabis";
import {
  townTaxableSales as salesOf,
  type FinanceReadingFacts,
} from "./finance-readings";
import { actuarialContribution } from "./budget-pension";
import {
  pensionFlowProfile as pensionOf,
  type OpeningBudgetFacts,
} from "./budget-opening";
import { reserveRule } from "./budget-reserve";
import {
  PENSION,
  BUDGET_LAW_KEYS,
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PROTECTED_PROGRAMS,
  sum,
} from "./budget-policy";
import { TAX_QUESTION_EFFECTS, CANNABIS_TAX_EFFECT } from "./budget-tax-policy";
import {
  ECONOMY_ELASTICITY,
  SPENDING_QUESTION_EFFECTS,
} from "./budget-month-policy";
import type { EntityId, IsoDate } from "../../simulation/types";
import type {
  AdoptedBudget,
  BudgetAdjustment,
  BudgetLawName,
  BudgetLawReading,
  BudgetMonthRow,
  BudgetSource,
  PublicBudgetGovernment,
  FederalBudgetGovernment,
} from "../../simulation/public-budgets/store";
import type { currentStateExecutiveHolders as nativeExecutives } from "../../simulation/nationwide-world/state-executives";
import type { principledLeaning as nativeLeaning } from "../../simulation/governing/officeholder-principles";
import type { placeOutcomeAt as nativeOutcome } from "../../simulation/outcome-web/place-outcome-store";
import type { GOVERNMENT_BUDGET_CATEGORIES as nativeCategories } from "../../simulation/public-budgets/store";
import type {
  LawEffectStamp,
  LawEffectStampedRecord,
} from "../../simulation/law-effect-stamp";
import type { CountyBudgetHearing } from "../../simulation/county-budget-record";
export interface BudgetMonthFacts {
  readonly categories: typeof nativeCategories;
  readonly countyHearings: readonly CountyBudgetHearing[];
  readonly opening: OpeningBudgetFacts;
  readonly cannabis: CannabisBudgetFacts;
  readonly finance: FinanceReadingFacts;
  readonly outlays: OutlayFacts;
  readonly executives: ReturnType<typeof nativeExecutives>;
  readonly principles: ReadonlyMap<string, ReturnType<typeof nativeLeaning>>;
  readonly borrowing: ReadonlyMap<string, ReturnType<typeof nativeOutcome>>;
}
export const budgetMonthReceiptKey = (...args: readonly string[]) =>
  JSON.stringify(args);
function currentStateExecutiveHolders(facts: BudgetMonthFacts) {
  return facts.executives;
}
function principledLeaning(
  facts: BudgetMonthFacts,
  id: EntityId,
  question: EntityId,
) {
  const key = budgetMonthReceiptKey(id, question);
  if (!facts.principles.has(key))
    throw Error("Missing principle receipt: " + key);
  return facts.principles.get(key)!;
}
function placeOutcomeAt(
  facts: BudgetMonthFacts,
  key: string,
  id: EntityId,
  date: IsoDate,
) {
  const receipt = budgetMonthReceiptKey(key, id, date);
  if (!facts.borrowing.has(receipt))
    throw Error("Missing outcome source receipt: " + receipt);
  return facts.borrowing.get(receipt)!;
}
function lawInForce(
  facts: BudgetMonthFacts,
  ...args: Parameters<typeof lawOf> extends [unknown, ...infer R] ? R : never
) {
  return lawOf(facts.opening.fiscal.laws, ...args);
}
function lawInForceAtStart(
  facts: BudgetMonthFacts,
  ...args: Parameters<typeof startOf> extends [unknown, ...infer R] ? R : never
) {
  return startOf(facts.opening.fiscal.laws, ...args);
}
function budgetLawReadings(
  facts: BudgetMonthFacts,
  ...args: Parameters<typeof readingsOf> extends [unknown, ...infer R]
    ? R
    : never
) {
  return readingsOf(facts.opening.fiscal, ...args);
}
function nominalEconomyIndex(
  facts: BudgetMonthFacts,
  ...args: Parameters<typeof nominalOf> extends [unknown, ...infer R]
    ? R
    : never
) {
  return nominalOf(facts.opening.fiscal, ...args);
}
function propositionIdFor(facts: BudgetMonthFacts, key: string) {
  return propositionOf(facts.opening.fiscal, key);
}
function roadChargeFactor(
  facts: BudgetMonthFacts,
  ...args: Parameters<typeof roadOf> extends [unknown, ...infer R] ? R : never
) {
  return roadOf(facts.opening.fiscal, ...args);
}
function federalAidFactor(facts: BudgetMonthFacts, date: IsoDate) {
  return aidOf(facts.outlays, date);
}
function cannabisSalesRevenueChange(
  facts: BudgetMonthFacts,
  ...args: Parameters<typeof cannabisOf> extends [unknown, ...infer R]
    ? R
    : never
) {
  return cannabisOf(facts.cannabis, ...args);
}
function townTaxableSales(facts: BudgetMonthFacts, id: EntityId) {
  return salesOf(facts.finance, id);
}
// stopgapId: "economy.monthly-budget-capital-policy"
const CUTTABLE = BUDGET_PROGRAMS.map(
  (program) => !PROTECTED_PROGRAMS.has(program),
);
const INCOME_TAX = BUDGET_SOURCES.indexOf("individualIncomeTax");
const INTEREST = BUDGET_PROGRAMS.indexOf("interest");
const PENSION_PROGRAM = BUDGET_PROGRAMS.indexOf("pensionContribution");
const STATE_AID = BUDGET_SOURCES.indexOf("intergovernmental");
const LOCAL_AID = BUDGET_PROGRAMS.indexOf("localAid");
const SALES_TAX = BUDGET_SOURCES.indexOf("generalSalesTax");
const PROPERTY_TAX = BUDGET_SOURCES.indexOf("propertyTax");
const SELECTIVE_TAX = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");
function citySalesNow(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
): number | null {
  return government.level === "city"
    ? townTaxableSales(facts, government.jurisdictionId)
    : null;
}
export interface MonthFlows {
  readonly withheld: ReadonlyMap<string, number>;
  readonly represented: ReadonlyMap<string, number>;
  readonly levies: ReadonlyMap<string, readonly number[]>;
  readonly payments: ReadonlyMap<string, readonly number[]>;
  readonly cash?: ReadonlyMap<
    string,
    {
      readonly organizationId: EntityId;
      readonly positionId: EntityId;
      readonly balanceMinorUnits: number;
      readonly heldCashBailMinorUnits?: number;
    }
  >;
  readonly recorded?: ReadonlyMap<
    string,
    {
      readonly revenueMinorUnits: readonly number[];
      readonly spendingMinorUnits: readonly number[];
      readonly sourceRecordIds: readonly EntityId[];
      readonly lawEffectStamps: readonly LawEffectStamp[];
    }
  >;
  readonly paidLeavePaymentStamps?: ReadonlyMap<
    string,
    readonly LawEffectStamp[]
  >;
}
function borrowingCostChange(
  facts: BudgetMonthFacts,
  stateId: EntityId | null,
  asOf: IsoDate,
): number {
  if (!stateId) return 0;
  const record = placeOutcomeAt(facts, "gov.borrowing-cost", stateId, asOf);
  return record ? (record.value - record.base) / 10000 : 0;
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
export function taxLawFactor(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
  source: BudgetSource,
  date: IsoDate,
  erodedOn: IsoDate = date,
  includeCannabis = true,
): number {
  const onDate = date;
  let factor =
    source === "selectiveSalesTaxes"
      ? (includeCannabis ? cannabisSalesFactor(facts, government, onDate) : 1) +
        roadChargeFactor(facts, government, onDate, erodedOn) -
        1
      : source === "federalAid"
        ? federalAidFactor(facts, onDate)
        : 1;
  for (const effect of TAX_QUESTION_EFFECTS) {
    if (effect.source !== source) continue;
    if (!(effect.levels ?? ["state"]).includes(government.level)) continue;
    if (effect.toYes === null && effect.toNo === null) continue;
    const propositionId = propositionIdFor(facts, effect.questionKey);
    if (!propositionId) continue;
    const now = lawInForce(
      facts,
      government.lawJurisdictionId,
      propositionId,
      onDate,
    )?.answer;
    const began =
      lawInForceAtStart(
        facts,
        government.lawJurisdictionId,
        propositionId,
        onDate,
      ) ?? "no";
    if (began === "no" && now === "yes") factor *= 1 + (effect.toYes ?? 0);
    if (began === "yes" && now === "no") factor *= 1 + (effect.toNo ?? 0);
  }
  return Math.max(0, factor);
}
export function lawSpendingForMonth(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
  date: IsoDate,
): readonly number[] {
  const spending = BUDGET_PROGRAMS.map(() => 0);
  for (const effect of SPENDING_QUESTION_EFFECTS) {
    if (!(effect.levels ?? ["state"]).includes(government.level)) continue;
    const perResident = lawSpendingPerResident(
      facts,
      government.lawJurisdictionId,
      effect,
      date,
    );
    if (perResident === null) continue;
    spending[BUDGET_PROGRAMS.indexOf(effect.program)]! +=
      (perResident * government.population) / 12;
  }
  return spending;
}
function cannabisSalesFactor(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
  date: IsoDate,
): number {
  const opening = government.years[0]!.expectedRevenue[SELECTIVE_TAX] ?? 0;
  if (opening <= 0) return 1;
  const reading = cannabisSalesRevenueChange(facts, government, date);
  return Math.max(0, (opening + reading.annualRevenueDelta) / opening);
}
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
  const opened = first.expectedRevenue[at]!;
  return (
    (opened / 12) * Math.max(0, 1 + ECONOMY_ELASTICITY[source] * (since - 1))
  );
}
export function settleGovernmentMonth(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment | FederalBudgetGovernment,
  month: IsoDate,
  flows: MonthFlows,
  state: PublicBudgetGovernment | null = null,
): {
  readonly government: PublicBudgetGovernment | FederalBudgetGovernment;
  readonly adjustments: readonly BudgetAdjustment[];
} {
  if (government.months.some((row) => row.month === month))
    return { government, adjustments: [] };
  const publicCash = flows.cash?.get(government.key);
  const heldCash = publicCash?.heldCashBailMinorUnits ?? 0;
  const spendableCash = publicCash
    ? (publicCash.balanceMinorUnits - heldCash) / 100
    : null;
  if (heldCash > 0 && flows.recorded === undefined)
    return { government, adjustments: [] };
  if (government.level === "federal") {
    const cash = publicCash;
    if (!cash || !flows.recorded) return { government, adjustments: [] };
    const paid = flows.recorded.get(government.key);
    const categories = facts.categories.federal;
    const balance = spendableCash!;
    const row = {
      month,
      revenue: categories.receipts.map(
        (_, at) => (paid?.revenueMinorUnits[at] ?? 0) / 100,
      ),
      spending: categories.outlays.map(
        (_, at) => (paid?.spendingMinorUnits[at] ?? 0) / 100,
      ),
      balance,
      reserve: null,
      debt: government.debt,
      cashSettlement: {
        organizationId: cash.organizationId,
        positionId: cash.positionId,
        accountBalanceMinorUnits: cash.balanceMinorUnits,
        heldCashBailMinorUnits: heldCash,
        sourceRecordIds: [...new Set(paid?.sourceRecordIds ?? [])],
      },
      ...(paid?.lawEffectStamps.length
        ? { lawEffectStamps: paid.lawEffectStamps }
        : {}),
    };
    return {
      government: {
        ...government,
        balance,
        ...(!government.publicAccountMigration
          ? {
              publicAccountMigration: {
                onDate: firstOfNextMonth(month),
                organizationId: cash.organizationId,
                positionId: cash.positionId,
                previousBudgetBalance: government.balance,
                previousBudgetReserve: null,
                accountBalanceMinorUnits: cash.balanceMinorUnits,
              },
            }
          : {}),
        months: [...government.months, row],
      },
      adjustments: [],
    };
  }
  const adjustments: BudgetAdjustment[] = [];
  // stopgapId: "economy.budget-unmaterialized-source-government"
  if (flows.recorded === undefined || publicCash === undefined)
    return { government, adjustments: [] };
  const cashSettled = publicCash !== undefined && flows.recorded !== undefined;
  const recorded = flows.recorded?.get(government.key);
  const stateId =
    facts.opening.views.stateJurisdictionForKey(government.stateKey)?.id ??
    null;
  const year = government.years.at(-1)!;
  const asOf = firstOfNextMonth(month);
  const economyNow = stateId ? nominalEconomyIndex(facts, stateId, asOf) : null;
  const economy =
    economyNow !== null && year.economyAtAdoption
      ? economyNow / year.economyAtAdoption
      : 1;
  const salesNow = citySalesNow(facts, government);
  const salesAtAdoption =
    salesNow === null
      ? null
      : (year.townSalesAtAdoption ?? (economy > 0 ? salesNow / economy : null));
  const townSales =
    salesNow !== null && salesAtAdoption ? salesNow / salesAtAdoption : null;
  const represented = flows.represented.get(government.key) ?? 0;
  const revenue = BUDGET_SOURCES.map((source, at) => {
    const lawNow = taxLawFactor(facts, government, source, month);
    const lawAtAdoption = taxLawFactor(
      facts,
      government,
      source,
      year.startsOn,
    );
    if (lawAtAdoption === 0)
      return Math.round(
        openingMonthLevel(government, source, at, economyNow) * lawNow,
      );
    return Math.round(
      (year.expectedRevenue[at]! / 12) *
        (at === SALES_TAX && townSales !== null
          ? townSales
          : Math.max(0, 1 + ECONOMY_ELASTICITY[source] * (economy - 1))) *
        (lawNow / lawAtAdoption),
    );
  });
  const zeroOpeningSelectiveTax =
    (government.years[0]!.expectedRevenue[SELECTIVE_TAX] ?? 0) <= 0;
  const cannabisReading = cannabisSalesRevenueChange(facts, government, month);
  const cannabisRevenue = cannabisReading
    ? Math.max(0, Math.round(cannabisReading.annualRevenueDelta / 12))
    : 0;
  if (zeroOpeningSelectiveTax) {
    const adoptedCannabis = Math.max(
      0,
      cannabisSalesRevenueChange(facts, government, year.startsOn)
        .annualRevenueDelta,
    );
    const nonCannabisBase = Math.max(
      0,
      year.expectedRevenue[SELECTIVE_TAX]! - adoptedCannabis,
    );
    revenue[SELECTIVE_TAX] =
      Math.round(
        (nonCannabisBase / 12) *
          Math.max(
            0,
            1 + ECONOMY_ELASTICITY.selectiveSalesTaxes * (economy - 1),
          ) *
          (taxLawFactor(facts, government, "selectiveSalesTaxes", month) /
            (taxLawFactor(
              facts,
              government,
              "selectiveSalesTaxes",
              year.startsOn,
            ) || 1)),
      ) + cannabisRevenue;
  }
  const previousCannabisRevenue =
    (
      government.months.at(-1) as
        | (BudgetMonthRow & {
            readonly cannabisRevenue?: number;
          })
        | undefined
    )?.cannabisRevenue ?? 0;
  let cannabisRevenueLoss = 0;
  if (!zeroOpeningSelectiveTax && cannabisReading.annualRevenueDelta < 0) {
    const atAdoption = taxLawFactor(
      facts,
      government,
      "selectiveSalesTaxes",
      year.startsOn,
    );
    const beforeLaw =
      atAdoption === 0
        ? openingMonthLevel(
            government,
            "selectiveSalesTaxes",
            SELECTIVE_TAX,
            economyNow,
          )
        : ((year.expectedRevenue[SELECTIVE_TAX]! / 12) *
            Math.max(
              0,
              1 + ECONOMY_ELASTICITY.selectiveSalesTaxes * (economy - 1),
            )) /
          atAdoption;
    const withoutCannabis = taxLawFactor(
      facts,
      government,
      "selectiveSalesTaxes",
      month,
      month,
      false,
    );
    cannabisRevenueLoss = Math.max(
      0,
      Math.round(beforeLaw * withoutCannabis) - revenue[SELECTIVE_TAX]!,
    );
  }
  const cannabisProposition = propositionIdFor(
    facts,
    CANNABIS_TAX_EFFECT.questionKey,
  );
  const cannabisStamp =
    zeroOpeningSelectiveTax &&
    (cannabisRevenue > 0 || previousCannabisRevenue > 0) &&
    cannabisProposition
      ? lawEffectStamp(
          lawInForce(
            facts,
            government.lawJurisdictionId,
            cannabisProposition,
            month,
          ),
          {
            effectKind: "cannabis-selective-tax-revenue",
            questionKey: CANNABIS_TAX_EFFECT.questionKey,
            jurisdictionId: government.lawJurisdictionId,
            appliedAt: month,
          },
        )
      : null;
  const cannabisCostStamp =
    cannabisRevenueLoss > 0 && cannabisProposition
      ? lawEffectStamp(
          lawInForce(
            facts,
            government.lawJurisdictionId,
            cannabisProposition,
            month,
          ),
          {
            effectKind: "state-revenue-loss",
            questionKey: CANNABIS_TAX_EFFECT.questionKey,
            jurisdictionId: government.lawJurisdictionId,
            appliedAt: month,
          },
        )
      : null;
  const cannabisStamps = [cannabisStamp, cannabisCostStamp].filter(
    (stamp): stamp is NonNullable<typeof stamp> => stamp !== null,
  );
  if (government.population > 0)
    revenue[INCOME_TAX] = Math.round(
      (revenue[INCOME_TAX]! *
        Math.max(0, government.population - represented)) /
        government.population,
    );
  revenue[INCOME_TAX]! += Math.round(flows.withheld.get(government.key) ?? 0);
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
  const lawSpending = lawSpendingForMonth(facts, government, month);
  for (const [at, value] of lawSpending.entries())
    if (value !== 0)
      spending[at] = Math.max(0, spending[at]! + Math.round(value));
  if (cashSettled) {
    for (const at of BUDGET_SOURCES.keys())
      revenue[at] = (recorded?.revenueMinorUnits[at] ?? 0) / 100;
    for (const at of BUDGET_PROGRAMS.keys())
      spending[at] = (recorded?.spendingMinorUnits[at] ?? 0) / 100;
  }
  let reserve = publicCash
    ? Math.min(government.reserve, Math.max(0, spendableCash!))
    : government.reserve;
  let balance = publicCash
    ? spendableCash! - reserve
    : government.balance + sum(revenue) - sum(spending);
  let debt = government.debt;
  let interestRate = government.interestRate;
  let cut = government.cut;
  const deposit = Math.round(year.reserveDeposit / 12);
  if (deposit > 0 && balance >= deposit) {
    balance -= deposit;
    reserve += deposit;
  } else if (deposit < 0) {
    const drawnNow = Math.min(-deposit, reserve);
    reserve -= drawnNow;
    balance += drawnNow;
  }
  const laws = budgetLawReadings(
    facts,
    government.lawJurisdictionId,
    asOf,
    government.level !== "state",
  );
  const into = monthsInto(year, month);
  const remaining = 12 - into;
  const yearEnds = asOf > year.endsOn;
  if (
    !yearEnds &&
    into % 3 === 0 &&
    remaining > 0 &&
    laws.balanced.answer === "yes"
  ) {
    const pace = sum(revenue) - sum(spending);
    const gap = -(balance + remaining * pace);
    if (gap > 0) {
      const cuttableMonthly = sum(
        BUDGET_PROGRAMS.map((_, at) =>
          CUTTABLE[at] ? (year.appropriations[at]! / 12) * (1 - cut) : 0,
        ),
      );
      const room = cuttableMonthly * remaining;
      const order = decideShortfallOrder(facts, government);
      let cutTotal = 0;
      let draw = 0;
      if (order.cutFirst) {
        cutTotal = Math.min(gap, room);
        draw = Math.min(gap - cutTotal, reserve);
      } else {
        draw = Math.min(gap, reserve);
        cutTotal = Math.min(gap - draw, room);
      }
      cutTotal = Math.round(cutTotal);
      const decidedBy = order.personId
        ? {
            decidedBy: {
              personId: order.personId,
              principleRecordIds: order.recordIds,
            },
          }
        : {};
      const plannedCuttable = sum(
        BUDGET_PROGRAMS.map((_, at) =>
          CUTTABLE[at] ? year.appropriations[at]! / 12 : 0,
        ),
      );
      const records: BudgetAdjustment[] = [];
      const drawn = Math.round(draw);
      if (cutTotal > 0 && plannedCuttable > 0) {
        cut = Math.min(1, cut + cutTotal / remaining / plannedCuttable);
        const after = order.cutFirst
          ? order.reason
          : `${order.reason} The reserve covered only ${shortfallDollars(drawn)}, so programs were cut for the remaining ${shortfallDollars(cutTotal)}.`;
        records.push({
          governmentKey: government.key,
          on: asOf,
          fiscalYear: year.fiscalYear,
          kind: "mid-year-cut",
          amount: cutTotal,
          law: lawNote("balanced", laws.balanced),
          note: `Collections would leave the year in deficit, so every program except interest and pensions is cut across the board for the rest of the year. ${after}`,
          ...decidedBy,
        });
      }
      if (drawn > 0) {
        reserve -= drawn;
        balance += drawn;
        records.push({
          governmentKey: government.key,
          on: asOf,
          fiscalYear: year.fiscalYear,
          kind: "reserve-draw",
          amount: drawn,
          law: lawNote("balanced", laws.balanced),
          note: `Drawn from the reserve to keep the year balanced. ${order.reason}`,
          ...decidedBy,
        });
      }
      adjustments.push(...(order.cutFirst ? records : records.reverse()));
    }
  }
  const paidLeaveStamps = (
    flows.paidLeavePaymentStamps?.get(government.key) ?? []
  ).map((stamp) => ({ ...stamp, appliedAt: asOf }));
  const row: BudgetMonthRow &
    LawEffectStampedRecord & {
      readonly cannabisRevenue?: number;
      readonly cannabisRevenueLoss?: number;
    } = {
    month,
    revenue,
    spending,
    balance,
    reserve,
    debt,
    economy: Math.round(economy * 10000) / 10000,
    ...(townSales !== null
      ? { townSales: Math.round(townSales * 10000) / 10000 }
      : {}),
    represented,
    ...(cashSettled
      ? {
          cashSettlement: {
            organizationId: publicCash!.organizationId,
            positionId: publicCash!.positionId,
            accountBalanceMinorUnits: publicCash!.balanceMinorUnits,
            heldCashBailMinorUnits: heldCash,
            sourceRecordIds: [...new Set(recorded?.sourceRecordIds ?? [])],
          },
        }
      : {}),
    ...(zeroOpeningSelectiveTax &&
    (cannabisRevenue > 0 || previousCannabisRevenue > 0)
      ? { cannabisRevenue }
      : {}),
    ...(cannabisRevenueLoss > 0 ? { cannabisRevenueLoss } : {}),
    ...(cannabisStamps.length ||
    paidLeaveStamps.length ||
    recorded?.lawEffectStamps.length
      ? {
          lawEffectStamps: [
            ...cannabisStamps,
            ...paidLeaveStamps,
            ...(cashSettled ? (recorded?.lawEffectStamps ?? []) : []),
          ],
        }
      : {}),
  };
  let next: PublicBudgetGovernment = {
    ...government,
    ...(publicCash && !government.publicAccountMigration
      ? {
          publicAccountMigration: {
            onDate: asOf,
            organizationId: publicCash.organizationId,
            positionId: publicCash.positionId,
            previousBudgetBalance: government.balance,
            previousBudgetReserve: government.reserve,
            accountBalanceMinorUnits: publicCash.balanceMinorUnits,
          },
        }
      : {}),
    balance,
    reserve,
    debt,
    interestRate,
    cut,
    years:
      salesAtAdoption !== null && year.townSalesAtAdoption == null
        ? [
            ...government.years.slice(0, -1),
            {
              ...year,
              townSalesAtAdoption: Math.round(salesAtAdoption * 1e6) / 1e6,
            },
          ]
        : government.years,
    months: [...government.months, row],
  };
  if (!yearEnds) return { government: next, adjustments };
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
      government.interestRate + borrowingCostChange(facts, stateId, asOf),
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
  const yearRows = next.months.filter(
    (entry) => entry.month >= year.startsOn && entry.month <= year.endsOn,
  );
  const share = yearRows.length / 12;
  const paid = sum(yearRows.map((entry) => entry.spending[PENSION_PROGRAM]!));
  const required = year.pensionRequired * share;
  const unpaid = Math.round(required - paid);
  const pensionLaw = year.laws.pensions;
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
  const plans = pensionOf(facts.opening, government);
  const benefits = liability * plans.benefitShare * share;
  const pension = {
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
    facts,
    next,
    next.years.at(-1)!,
    yearRows,
    adjustments,
    state,
  );
  return {
    government: { ...next, years: [...next.years, adopted] },
    adjustments,
  };
}
export function lawMoneyChange(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
  prior: AdoptedBudget,
  expectedRevenue: readonly number[],
  startsOn: IsoDate,
): number {
  const then = prior.adoptedOn;
  let change = 0;
  for (const [at, source] of BUDGET_SOURCES.entries()) {
    const now = taxLawFactor(facts, government, source, startsOn);
    const before = taxLawFactor(facts, government, source, then, startsOn);
    if (now === before) continue;
    change +=
      now > 0
        ? expectedRevenue[at]! * (1 - before / now)
        : -prior.expectedRevenue[at]!;
  }
  const costNow = sum(lawSpendingForMonth(facts, government, startsOn));
  const costThen = sum(lawSpendingForMonth(facts, government, then));
  return change - (costNow - costThen) * 12;
}
// stopgapId: "economy.monthly-budget-native-English"
function shortfallDollars(amount: number): string {
  return amount >= 1000000
    ? `$${(amount / 1e6).toFixed(2)} million`
    : `$${Math.round(amount).toLocaleString("en-US")}`;
}
export function decideShortfallOrder(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
): {
  readonly cutFirst: boolean;
  readonly personId: EntityId | null;
  readonly recordIds: readonly EntityId[];
  readonly reason: string;
} {
  const practice =
    "Reserves are kept to protect services through a temporary revenue shortfall, so the reserve went first.";
  const governor =
    government.level === "state"
      ? currentStateExecutiveHolders(facts).find(
          (holder) => `US-${holder.stateUsps}` === government.stateKey,
        )
      : undefined;
  if (!governor)
    return { cutFirst: false, personId: null, recordIds: [], reason: practice };
  const propositionId = propositionIdFor(facts, BUDGET_LAW_KEYS.reserve);
  const { score, recordIds } = propositionId
    ? principledLeaning(facts, governor.personId, propositionId)
    : { score: 0, recordIds: [] as EntityId[] };
  const who = `${governor.title} ${governor.personName}`;
  return score > 0
    ? {
        cutFirst: true,
        personId: governor.personId,
        recordIds,
        reason: `${who}'s principles favor keeping the reserve, so programs were cut before it was drawn.`,
      }
    : {
        cutFirst: false,
        personId: governor.personId,
        recordIds,
        reason:
          score < 0
            ? `${who}'s principles put public programs ahead of holding a reserve, so the reserve went first.`
            : `${who} holds no principle that bears on the reserve. ${practice}`,
      };
}
const REACTION_KIND = {
  save: "law-gain-saved",
  spend: "law-gain-spent",
  cut: "law-loss-cut",
  draw: "law-loss-drawn",
  keep: "law-loss-kept",
} as const;
export function decideLawMoneyReaction(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
  change: number,
  balancedLaw: boolean,
  drawable: number,
): {
  readonly choice: keyof typeof REACTION_KIND;
  readonly personId: EntityId;
  readonly recordIds: readonly EntityId[];
  readonly note: string;
} | null {
  if (government.level !== "state" || Math.round(change) === 0) return null;
  const governor = currentStateExecutiveHolders(facts).find(
    (holder) => `US-${holder.stateUsps}` === government.stateKey,
  );
  if (!governor) return null;
  const question =
    change < 0 && !balancedLaw
      ? BUDGET_LAW_KEYS.balanced
      : BUDGET_LAW_KEYS.reserve;
  const propositionId = propositionIdFor(facts, question);
  const { score, recordIds } = propositionId
    ? principledLeaning(facts, governor.personId, propositionId)
    : { score: 0, recordIds: [] as EntityId[] };
  const who = `${governor.title} ${governor.personName}`;
  const dollars = `$${(Math.abs(change) / 1e6).toFixed(2)} million a year`;
  const decided = (
    choice: keyof typeof REACTION_KIND,
    note: string,
  ): ReturnType<typeof decideLawMoneyReaction> => ({
    choice,
    personId: governor.personId,
    recordIds,
    note,
  });
  if (change > 0)
    return score > 0
      ? decided(
          "save",
          `${who}'s principles favor keeping a reserve over spending more, so the ${dollars} the laws added went to the reserve.`,
        )
      : decided(
          "spend",
          score < 0
            ? `${who}'s principles favor spending on public programs over holding a reserve, so the ${dollars} the laws added went to programs.`
            : `${who} holds no principle that bears on saving or spending, so the ${dollars} the laws added went to programs, as the budget does by default.`,
        );
  if (balancedLaw) {
    if (score < 0 && drawable > 0)
      return decided(
        "draw",
        `The law requires a balanced budget, and ${who}'s principles put public programs ahead of holding a reserve, so the reserve covered the ${dollars} the laws took away.`,
      );
    return decided(
      "cut",
      score > 0
        ? `The law requires a balanced budget, and ${who}'s principles favor keeping the reserve, so programs were cut to meet the ${dollars} the laws took away.`
        : score < 0
          ? `The law requires a balanced budget; ${who} would have drawn the reserve, but it held nothing above what the law keeps there, so programs were cut to meet the ${dollars} the laws took away.`
          : `The law requires a balanced budget and ${who} holds no principle that bears on the reserve, so programs were cut to meet the ${dollars} the laws took away, as the budget does by default.`,
    );
  }
  return score > 0
    ? decided(
        "cut",
        `${who}'s principles call for a balanced budget, so programs were cut to meet the ${dollars} the laws took away.`,
      )
    : decided(
        "keep",
        score < 0
          ? `${who}'s principles put public programs ahead of balancing the budget, so programs were kept and the ${dollars} the laws took away runs as a deficit.`
          : `${who} holds no principle that bears on balancing the budget, so programs were kept and the ${dollars} the laws took away runs as a deficit, as the budget does by default.`,
      );
}
export function proposeNextYearBudget(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
  state: PublicBudgetGovernment | null,
): AdoptedBudget {
  const prior = government.years.at(-1)!;
  const rows = government.months.filter(
    (row) => row.month >= prior.startsOn && row.month <= prior.endsOn,
  );
  return adoptNextYear(facts, government, prior, rows, [], state);
}
function adoptNextYear(
  facts: BudgetMonthFacts,
  government: PublicBudgetGovernment,
  prior: AdoptedBudget,
  rows: readonly BudgetMonthRow[],
  adjustments: BudgetAdjustment[],
  state: PublicBudgetGovernment | null,
): AdoptedBudget {
  const startsOn = firstOfNextMonth(prior.endsOn);
  const year = fiscalYearContaining(startsOn, government.fiscalYearStart);
  const laws = budgetLawReadings(
    facts,
    government.lawJurisdictionId,
    startsOn,
    government.level !== "state",
  );
  const stateId =
    facts.opening.views.stateJurisdictionForKey(government.stateKey)?.id ??
    null;
  const economyAtAdoption = stateId
    ? nominalEconomyIndex(facts, stateId, startsOn)
    : null;
  const townSalesAtAdoption = citySalesNow(facts, government);
  const townSalesNow =
    townSalesAtAdoption !== null && prior.townSalesAtAdoption
      ? townSalesAtAdoption / prior.townSalesAtAdoption
      : null;
  const economyNow =
    economyAtAdoption !== null && prior.economyAtAdoption
      ? economyAtAdoption / prior.economyAtAdoption
      : null;
  const expectedRevenue = BUDGET_SOURCES.map((source, at) => {
    if (rows.length === 0) return prior.expectedRevenue[at]!;
    if (
      source === "selectiveSalesTaxes" &&
      (government.years[0]!.expectedRevenue[SELECTIVE_TAX] ?? 0) <= 0
    ) {
      const otherTaxes = rows.map((row) => {
        const cannabis = row.cashSettlement
          ? 0
          : ((
              row as BudgetMonthRow & {
                readonly cannabisRevenue?: number;
              }
            ).cannabisRevenue ?? 0);
        const other = Math.max(0, row.revenue[at]! - cannabis);
        const then = Math.max(
          0,
          1 + ECONOMY_ELASTICITY[source] * (row.economy - 1),
        );
        const now =
          economyNow === null
            ? then
            : Math.max(0, 1 + ECONOMY_ELASTICITY[source] * (economyNow - 1));
        const lawThen = taxLawFactor(facts, government, source, row.month);
        const lawNow = taxLawFactor(facts, government, source, startsOn);
        return (
          other *
          (then > 0 ? now / then : 1) *
          (lawThen > 0 ? lawNow / lawThen : 1)
        );
      });
      return (
        Math.round((sum(otherTaxes) * 12) / rows.length) +
        Math.max(
          0,
          cannabisSalesRevenueChange(facts, government, startsOn)
            .annualRevenueDelta,
        )
      );
    }
    const elasticity = ECONOMY_ELASTICITY[source];
    const scaleAt = (economy: number) =>
      Math.max(0, 1 + elasticity * (economy - 1));
    const lawNow = taxLawFactor(facts, government, source, startsOn);
    const restated = rows.map((row) => {
      const lawThen = taxLawFactor(facts, government, source, row.month);
      if (lawThen === 0)
        return (
          openingMonthLevel(government, source, at, economyAtAdoption) * lawNow
        );
      const law = lawNow / lawThen;
      if (at === SALES_TAX && row.townSales && townSalesNow !== null)
        return ((row.revenue[at]! * townSalesNow) / row.townSales) * law;
      if (economyNow === null) return row.revenue[at]! * law;
      const then = scaleAt(row.economy);
      return then > 0
        ? (row.revenue[at]! * scaleAt(economyNow) * law) / then
        : row.revenue[at]! * law;
    });
    return Math.round((sum(restated) * 12) / rows.length);
  });
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
  const votedLevy = adoptedCountyLevy(facts, government.key, year.fiscalYear);
  if (votedLevy !== null)
    expectedRevenue[PROPERTY_TAX] = votedLevy.adoptedPropertyTaxLevy!;
  const pensionRequired = actuarialContribution(
    government.pension,
    pensionOf(facts.opening, government).normalCostShare,
  );
  const pensionPaid = budgetObligationPayment(
    pensionRequired,
    government.pension.paidShare,
    laws.pensions,
  );
  const interest = Math.round(government.debt * government.interestRate);
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
  let reserveDeposit =
    laws.reserve.answer === "yes" && government.reserve < floor
      ? Math.round(
          Math.min(
            floor - government.reserve,
            reserveLaw.depositShare * priorTotal,
          ),
        )
      : 0;
  const lawCost = sum(lawSpendingForMonth(facts, government, startsOn)) * 12;
  const cuttablePrior = sum(
    base.map((value, at) => (CUTTABLE[at] ? value : 0)),
  );
  const lawChange = lawMoneyChange(
    facts,
    government,
    prior,
    expectedRevenue,
    startsOn,
  );
  const drawable = Math.max(
    0,
    laws.reserve.answer === "yes"
      ? government.reserve - floor
      : government.reserve,
  );
  const reaction = decideLawMoneyReaction(
    facts,
    government,
    lawChange,
    laws.balanced.answer === "yes",
    drawable,
  );
  const beforeSaving = Math.max(
    0,
    sum(expectedRevenue) - interest - pensionPaid - reserveDeposit - lawCost,
  );
  const saved =
    reaction?.choice === "save"
      ? Math.round(
          Math.min(lawChange, Math.max(0, beforeSaving - cuttablePrior)),
        )
      : 0;
  const drawn =
    reaction?.choice === "draw"
      ? Math.round(Math.min(-lawChange, drawable))
      : 0;
  reserveDeposit += saved - drawn;
  const available = beforeSaving - saved + drawn;
  const fitted = cuttablePrior > 0 ? available / cuttablePrior : 1;
  const scale =
    laws.balanced.answer === "yes" || reaction?.choice === "cut"
      ? fitted
      : Math.max(1, fitted);
  if (reaction) {
    const amount =
      reaction.choice === "save"
        ? saved
        : reaction.choice === "draw"
          ? drawn
          : reaction.choice === "cut"
            ? Math.round(
                Math.min(-lawChange, Math.max(0, cuttablePrior - available)),
              )
            : Math.round(Math.abs(lawChange));
    if (amount > 0)
      adjustments.push({
        governmentKey: government.key,
        on: startsOn,
        fiscalYear: year.fiscalYear,
        kind: REACTION_KIND[reaction.choice],
        amount,
        law: null,
        note: reaction.note,
        decidedBy: {
          personId: reaction.personId,
          principleRecordIds: reaction.recordIds,
        },
      });
  }
  const kept = Math.max(
    0,
    floor - government.reserve - Math.max(0, reserveDeposit),
  );
  const carried =
    cuttablePrior > 0 ? Math.max(0, Math.round(government.balance - kept)) : 0;
  const recurring = cuttablePrior * scale;
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
    basis: votedLevy !== null ? "board-vote" : "automatic",
    ...(votedLevy !== null ? { hearingKey: votedLevy.key } : {}),
    expectedRevenue,
    appropriations,
    reserveDeposit,
    pensionRequired,
    pensionShare: government.pension.paidShare,
    economyAtAdoption,
    laws,
    carriedBalance,
    stateLocalAidAtAdoption,
    ...(townSalesAtAdoption !== null
      ? { townSalesAtAdoption: Math.round(townSalesAtAdoption * 1e6) / 1e6 }
      : {}),
  };
}
export function lawSpendingPerResident(
  facts: BudgetMonthFacts,
  jurisdictionId: EntityId,
  effect: (typeof SPENDING_QUESTION_EFFECTS)[number],
  date: IsoDate,
): number | null {
  const propositionId = propositionIdFor(facts, effect.questionKey);
  if (!propositionId) return null;
  const now = lawInForce(facts, jurisdictionId, propositionId, date)?.answer;
  const began = lawInForceAtStart(facts, jurisdictionId, propositionId, date);
  return began === "no" && now === "yes"
    ? effect.toYes
    : began === "yes" && now === "no"
      ? effect.toNo
      : null;
}
export function firstOfNextMonth(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}
export function stateLocalAidRate(state: PublicBudgetGovernment): number {
  const year = state.years.at(-1);
  if (!year) return 0;
  const planned = year.appropriations[BUDGET_PROGRAMS.indexOf("localAid")] ?? 0;
  return Math.round(planned * (1 - state.cut));
}

function adoptedCountyLevy(facts: BudgetMonthFacts, key: string, year: number) {
  return (
    facts.countyHearings.find(
      (row) =>
        row.governmentKey === key &&
        row.fiscalYear === year &&
        row.stage === "adopted" &&
        row.adoptedPropertyTaxLevy !== null,
    ) ?? null
  );
}
