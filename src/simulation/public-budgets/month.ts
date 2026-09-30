import { stateJurisdictionForKey } from "../life-places";
import { CURRICULUM_QUESTION } from "../education-civil-law-terms";
import { curriculumAdoptionEffect } from "./curriculum-standards";
import { tuitionFreezeRevenueStamps } from "./tuition-freeze-stamps";
import { townTaxableSales } from "../living-world/town-finances";
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
import { ADOPT_STATE_INCOME_TAX_QUESTION } from "../state-income-tax-law";
import { cannabisSalesRevenueChange } from "./cannabis-sales-revenue";
import { CANNABIS_SALES_QUESTION } from "./cannabis-sales-tax";
import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { adoptedIncomeTaxPerYear } from "./income-tax-adoption";
import { actuarialContribution } from "./opening";
import { pensionFlows, pensionPayment } from "./pension-share";
import { reserveRule } from "./reserve-rule";
import { roadChargeFactor } from "./road-usage-charge";
import {
  decideStatehoodCertification,
  statehoodFederalAidFactor,
} from "./statehood-funds";
import { tuitionFreezeFactor } from "./tuition-freeze";
import { federalAidFactor } from "../federal-outlay-laws";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import { principledLeaning } from "../governing/officeholder-principles";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import {
  ECONOMY_ELASTICITY,
  PENSION,
  SPENDING_QUESTION_EFFECTS,
  TAX_QUESTION_EFFECTS,
} from "./rules";
import {
  BUDGET_LAW_KEYS,
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
const SALES_TAX = BUDGET_SOURCES.indexOf("generalSalesTax");
const SELECTIVE_TAX = BUDGET_SOURCES.indexOf("selectiveSalesTaxes");

/**
 * A city's taxable sales today, when its town keeps business books
 * (`living-world/town-finances.ts`); null otherwise.
 */
function citySalesNow(
  world: World,
  government: PublicBudgetGovernment,
): number | null {
  return government.level === "city"
    ? townTaxableSales(world, government.jurisdictionId)
    : null;
}

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
    // A game-profile levy has no sourced instrument; it counts as other taxes.
    (proposal?.power && LEVY_SOURCE[proposal.power.instrument]) ??
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
 * How the tax law in force on a date moves a government's revenue source
 * against the law it began with (`TAX_QUESTION_EFFECTS`): 1 where nothing
 * changed, where the size is not researched, or for a level the question's
 * row does not name (a county's or city's own taxes are not set by a state
 * income tax question). Income tax is read on January 1
 * of the date's year, the law paychecks withhold under for that tax year
 * (`stateIncomeTaxUnderLaw`), so the budget collects what paychecks withhold.
 * A tuition freeze moves charges and fees (`tuition-freeze.ts`). The fuel
 * tax erodes, and a road charge holds it (`road-usage-charge.ts`); given
 * `erodedOn`, the erosion is read on that date instead, so two dates' laws
 * compare over the same fleet.
 */
export function taxLawFactor(
  world: World,
  government: PublicBudgetGovernment,
  source: BudgetSource,
  date: IsoDate,
  erodedOn: IsoDate = date,
  includeCannabis = true,
): number {
  const onDate =
    source === "individualIncomeTax"
      ? (`${date.slice(0, 4)}-01-01` as IsoDate)
      : date;
  let factor =
    source === "individualIncomeTax"
      ? adoptedIncomeTaxFactor(world, government, onDate)
      : source === "selectiveSalesTaxes"
        ? // Cannabis adds its own level; the fuel tax's erosion comes off
          // its own share. Each is measured against the opening level.
          (includeCannabis
            ? cannabisSalesFactor(world, government, onDate)
            : 1) +
          roadChargeFactor(world, government, onDate, erodedOn) -
          1
        : source === "chargesAndFees"
          ? tuitionFreezeFactor(world, government, onDate)
          : source === "federalAid"
            ? federalAidFactor(world, onDate) *
              statehoodFederalAidFactor(government, onDate)
            : 1;
  for (const effect of TAX_QUESTION_EFFECTS) {
    if (effect.source !== source) continue;
    if (!(effect.levels ?? ["state"]).includes(government.level)) continue;
    if (effect.toYes === null && effect.toNo === null) continue;
    const propositionId = propositionIdFor(world, effect.questionKey);
    if (!propositionId) continue;
    const now = lawInForce(
      world,
      government.lawJurisdictionId,
      propositionId,
      onDate,
    )?.answer;
    // No law when the game began counts as "not yes", as in the outcome
    // web: the base revenue was measured without one.
    const began =
      lawInForceAtStart(
        world,
        government.lawJurisdictionId,
        propositionId,
        onDate,
      ) ?? "no";
    if (began === "no" && now === "yes") factor *= 1 + (effect.toYes ?? 0);
    if (began === "yes" && now === "no") factor *= 1 + (effect.toNo ?? 0);
  }
  return Math.max(0, factor);
}

/**
 * What a state's laws cost it to carry out in one month, by program, against
 * the laws it began with (`SPENDING_QUESTION_EFFECTS`): nothing where no law
 * changed, where the cost is not researched, or for a county or city, which
 * these state questions do not bind. A law counts from the day it takes
 * effect, at the government's own population.
 */
export function lawSpendingForMonth(
  world: World,
  government: PublicBudgetGovernment,
  date: IsoDate,
): readonly number[] {
  const spending = BUDGET_PROGRAMS.map(() => 0);
  if (government.level !== "state") return spending;
  for (const effect of SPENDING_QUESTION_EFFECTS) {
    const propositionId = propositionIdFor(world, effect.questionKey);
    if (!propositionId) continue;
    const now = lawInForce(
      world,
      government.lawJurisdictionId,
      propositionId,
      date,
    )?.answer;
    const began = lawInForceAtStart(
      world,
      government.lawJurisdictionId,
      propositionId,
      date,
    );
    const perResident =
      began === "no" && now === "yes"
        ? effect.toYes
        : began === "yes" && now === "no"
          ? effect.toNo
          : null;
    if (perResident === null) continue;
    spending[BUDGET_PROGRAMS.indexOf(effect.program)]! +=
      (perResident * government.population) / 12;
  }
  return spending;
}

/**
 * How a law adopting a wage income tax moves the income tax of a state that
 * began with none (`income-tax-adoption.ts`): 1 for any other state. A state
 * whose income tax collected nothing at the opening reads 0 until a law
 * adopts one and 1 after, against the adopted tax's level
 * (`openingMonthLevel`); a state that collected some, such as a tax on
 * interest and dividends, collects the adopted tax on top of it.
 */
function adoptedIncomeTaxFactor(
  world: World,
  government: PublicBudgetGovernment,
  taxYearStart: IsoDate,
): number {
  const adopted = adoptedIncomeTaxPerYear(
    government.stateKey,
    government.population,
  );
  if (adopted === null) return 1;
  const opening = government.years[0]!.expectedRevenue[INCOME_TAX] ?? 0;
  const propositionId = propositionIdFor(
    world,
    ADOPT_STATE_INCOME_TAX_QUESTION,
  );
  const now = propositionId
    ? lawInForce(
        world,
        government.lawJurisdictionId,
        propositionId,
        taxYearStart,
      )?.answer
    : undefined;
  const began = propositionId
    ? lawInForceAtStart(
        world,
        government.lawJurisdictionId,
        propositionId,
        taxYearStart,
      )
    : undefined;
  const inForce = now === "yes" && began !== "yes";
  if (opening <= 0) return inForce ? 1 : 0;
  return inForce ? (opening + adopted) / opening : 1;
}

/**
 * How a law on legal cannabis sales moves a state's selective sales taxes
 * against the law it began with (`cannabis-sales-tax.ts`): a law making sales
 * legal adds the cannabis tax a resident pays from the first store opening,
 * and a law ending them takes it away the day it takes effect. 1 for any
 * other state or date.
 */
function cannabisSalesFactor(
  world: World,
  government: PublicBudgetGovernment,
  date: IsoDate,
): number {
  const opening = government.years[0]!.expectedRevenue[SELECTIVE_TAX] ?? 0;
  if (opening <= 0) return 1;
  const reading = cannabisSalesRevenueChange(world, government, date);
  return Math.max(0, (opening + reading.annualRevenueDelta) / opening);
}

/**
 * One month of a source at the level the government opened with, under the
 * law it began with, carried to the economy on `economyIndex`. A tax a law
 * ended collected nothing to scale from, so a law that restores it starts
 * again from this level. A state that opened with no income tax at all
 * reads the level of the tax a law adopting one would collect.
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
  const opened =
    source === "individualIncomeTax" && first.expectedRevenue[at]! <= 0
      ? (adoptedIncomeTaxPerYear(government.stateKey, government.population) ??
        0)
      : first.expectedRevenue[at]!;
  return (
    (opened / 12) * Math.max(0, 1 + ECONOMY_ELASTICITY[source] * (since - 1))
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

  // A city whose town keeps business books collects its general sales tax
  // on what those businesses sell: the tax follows their taxable sales from
  // where this budget set it. A budget adopted before the books opened takes
  // the first reading, carried back by the economy since adoption, as where
  // it was set, so the tax does not jump.
  const salesNow = citySalesNow(world, government);
  const salesAtAdoption =
    salesNow === null
      ? null
      : (year.townSalesAtAdoption ?? (economy > 0 ? salesNow / economy : null));
  const townSales =
    salesNow !== null && salesAtAdoption ? salesNow / salesAtAdoption : null;

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
        (at === SALES_TAX && townSales !== null
          ? townSales
          : Math.max(0, 1 + ECONOMY_ELASTICITY[source] * (economy - 1))) *
        (lawNow / lawAtAdoption),
    );
  });
  // A zero opening selective-tax source cannot express an added amount as
  // a factor. Strip the amount already in the adopted forecast before adding
  // this month's amount, so rollover neither doubles it nor blocks repeal.
  const zeroOpeningSelectiveTax =
    (government.years[0]!.expectedRevenue[SELECTIVE_TAX] ?? 0) <= 0;
  const cannabisReading = cannabisSalesRevenueChange(world, government, month);
  const cannabisRevenue = cannabisReading
    ? Math.max(0, Math.round(cannabisReading.annualRevenueDelta / 12))
    : 0;
  if (zeroOpeningSelectiveTax) {
    const adoptedCannabis = Math.max(
      0,
      cannabisSalesRevenueChange(world, government, year.startsOn)
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
          (taxLawFactor(world, government, "selectiveSalesTaxes", month) /
            (taxLawFactor(
              world,
              government,
              "selectiveSalesTaxes",
              year.startsOn,
            ) || 1)),
      ) + cannabisRevenue;
  }
  const previousCannabisRevenue =
    (
      government.months.at(-1) as
        (BudgetMonthRow & { readonly cannabisRevenue?: number }) | undefined
    )?.cannabisRevenue ?? 0;
  // Attribute only the revenue actually removed by the cannabis law from
  // this modeled source. The counterfactual keeps the same adopted budget,
  // economy and every other tax; it does not alter cash or add a new rate.
  let cannabisRevenueLoss = 0;
  if (!zeroOpeningSelectiveTax && cannabisReading.annualRevenueDelta < 0) {
    const atAdoption = taxLawFactor(
      world,
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
      world,
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
  const cannabisProposition = propositionIdFor(world, CANNABIS_SALES_QUESTION);
  const cannabisStamp =
    zeroOpeningSelectiveTax &&
    (cannabisRevenue > 0 || previousCannabisRevenue > 0) &&
    cannabisProposition
      ? lawEffectStamp(
          lawInForce(
            world,
            government.lawJurisdictionId,
            cannabisProposition,
            month,
          ),
          {
            effectKind: "cannabis-selective-tax-revenue",
            questionKey: CANNABIS_SALES_QUESTION,
            jurisdictionId: government.lawJurisdictionId,
            appliedAt: month,
          },
        )
      : null;
  const cannabisCostStamp =
    cannabisRevenueLoss > 0 && cannabisProposition
      ? lawEffectStamp(
          lawInForce(
            world,
            government.lawJurisdictionId,
            cannabisProposition,
            month,
          ),
          {
            effectKind: "state-revenue-loss",
            questionKey: CANNABIS_SALES_QUESTION,
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
  // What the state's laws cost to carry out, on top of its programs; a law
  // that ended a cost the state began with takes it off, never below zero.
  const lawSpending = lawSpendingForMonth(world, government, month);
  for (const [at, value] of lawSpending.entries())
    if (value !== 0)
      spending[at] = Math.max(0, spending[at]! + Math.round(value));

  const curriculum = curriculumAdoptionEffect(world, government, month);
  const curriculumCost = curriculum?.spendingDollars ?? 0;
  if (curriculumCost > 0)
    spending[BUDGET_PROGRAMS.indexOf("schools")]! += curriculumCost;
  const curriculumStamp =
    curriculum && curriculumCost > 0
      ? lawEffectStamp(curriculum.law, {
          effectKind: "state-spending",
          questionKey: CURRICULUM_QUESTION,
          jurisdictionId: government.lawJurisdictionId,
          appliedAt: month,
          sourceRecordIds: curriculum.recipients.flatMap((row) => [
            row.personId,
            ...row.enrollmentIds,
            ...row.organizationIds,
          ]),
        })
      : null;
  const tuitionStamps = tuitionFreezeRevenueStamps(
    world,
    government,
    month,
    revenue[BUDGET_SOURCES.indexOf("chargesAndFees")]!,
  );
  const savedLawStamps = [
    ...cannabisStamps,
    ...tuitionStamps,
    ...(curriculumStamp ? [curriculumStamp] : []),
  ];

  let balance = government.balance + sum(revenue) - sum(spending);
  let reserve = government.reserve;
  let debt = government.debt;
  let interestRate = government.interestRate;
  let cut = government.cut;
  const deposit = Math.round(year.reserveDeposit / 12);
  if (deposit > 0 && balance >= deposit) {
    balance -= deposit;
    reserve += deposit;
  } else if (deposit < 0) {
    // A planned draw on the reserve, as far as it holds.
    const drawnNow = Math.min(-deposit, reserve);
    reserve -= drawnNow;
    balance += drawnNow;
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
    const gap = -(balance + remaining * pace);
    if (gap > 0) {
      const cuttableMonthly = sum(
        BUDGET_PROGRAMS.map((_, at) =>
          CUTTABLE[at] ? (year.appropriations[at]! / 12) * (1 - cut) : 0,
        ),
      );
      const room = cuttableMonthly * remaining;
      // Whether programs are cut before the reserve is drawn, or after, is
      // the governor's decision (`decideShortfallOrder`).
      const order = decideShortfallOrder(world, government);
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
        // When the reserve went first, the cut is what it could not cover.
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
      // Recorded in the order the money moved.
      adjustments.push(...(order.cutFirst ? records : records.reverse()));
    }
  }

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
    ...(zeroOpeningSelectiveTax &&
    (cannabisRevenue > 0 || previousCannabisRevenue > 0)
      ? { cannabisRevenue }
      : {}),
    ...(cannabisRevenueLoss > 0 ? { cannabisRevenueLoss } : {}),
    ...(savedLawStamps.length ? { lawEffectStamps: savedLawStamps } : {}),
  };
  let next: PublicBudgetGovernment = {
    ...government,
    balance,
    reserve,
    debt,
    interestRate,
    cut,
    // The first reading of a city's sales is kept as where its budget set
    // the tax.
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

/**
 * What laws changed between the last budget's adoption and this one gained
 * (positive) or lost (negative) the government a year, in dollars: each
 * source's expected revenue against the same revenue under the tax laws of
 * the last adoption, less what the laws in force now cost to carry out over
 * what they cost then.
 */
export function lawMoneyChange(
  world: World,
  government: PublicBudgetGovernment,
  prior: AdoptedBudget,
  expectedRevenue: readonly number[],
  startsOn: IsoDate,
): number {
  const then = prior.adoptedOn;
  let change = 0;
  for (const [at, source] of BUDGET_SOURCES.entries()) {
    const now = taxLawFactor(world, government, source, startsOn);
    // The fleet's fuel economy is not a law: the laws of both dates are read
    // over the fleet of the new budget.
    const before = taxLawFactor(world, government, source, then, startsOn);
    if (now === before) continue;
    change +=
      now > 0
        ? expectedRevenue[at]! * (1 - before / now)
        : -prior.expectedRevenue[at]!;
  }
  const costNow = sum(lawSpendingForMonth(world, government, startsOn));
  const costThen = sum(lawSpendingForMonth(world, government, then));
  return change - (costNow - costThen) * 12;
}

/** Dollars as a shortfall note says them: "$1.42 million" or "$640,000". */
function shortfallDollars(amount: number): string {
  return amount >= 1_000_000
    ? `$${(amount / 1e6).toFixed(2)} million`
    : `$${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Whether a government facing a shortfall mid-year, under a balanced-budget
 * law, cuts its programs before it draws its reserve or after. A state's
 * governor decides from their own principles: one whose principles lean
 * toward requiring a reserve (fiscal restraint over collective provision)
 * keeps it and cuts first. Otherwise the reserve goes first, as reserves are
 * kept for: "to protect against reducing service levels or raising taxes and
 * fees because of temporary revenue shortfalls" (National Advisory Council on
 * State and Local Budgeting, Recommended Practice 4.1, quoted in the
 * Government Finance Officers Association's Fund Balance Guidelines). A
 * county or city, where no executive is modeled, follows that practice.
 */
export function decideShortfallOrder(
  world: World,
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
      ? currentStateExecutiveHolders(world).find(
          (holder) => `US-${holder.stateUsps}` === government.stateKey,
        )
      : undefined;
  if (!governor)
    return { cutFirst: false, personId: null, recordIds: [], reason: practice };
  const propositionId = propositionIdFor(world, BUDGET_LAW_KEYS.reserve);
  const { score, recordIds } = propositionId
    ? principledLeaning(world, governor.personId, propositionId)
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

/**
 * How a state's governor has the next budget answer money laws gained or
 * lost it since the last budget, decided from their own principles, never
 * drawn. Their lean on requiring a reserve (fiscal restraint for it,
 * collective provision against) decides a gain: saved in the reserve, or
 * spent on programs. Where a law requires a balanced budget, the same lean
 * decides a loss: programs are cut, or the reserve above any required floor
 * (`drawable`) covers it. Where no law requires balance, their lean on a
 * balanced budget decides it: programs are cut, or kept and the gap runs as
 * a deficit. Where nothing the governor holds bears on it, the budget does
 * what it did before this decision existed (spend a gain; cut under a
 * balanced-budget law, keep programs without one) and says so. Null for a
 * county or city, where no executive is modeled, for no change, and where no
 * governor is seated.
 */
export function decideLawMoneyReaction(
  world: World,
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
  const governor = currentStateExecutiveHolders(world).find(
    (holder) => `US-${holder.stateUsps}` === government.stateKey,
  );
  if (!governor) return null;
  const question =
    change < 0 && !balancedLaw
      ? BUDGET_LAW_KEYS.balanced
      : BUDGET_LAW_KEYS.reserve;
  const propositionId = propositionIdFor(world, question);
  const { score, recordIds } = propositionId
    ? principledLeaning(world, governor.personId, propositionId)
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
  const townSalesAtAdoption = citySalesNow(world, government);
  const townSalesNow =
    townSalesAtAdoption !== null && prior.townSalesAtAdoption
      ? townSalesAtAdoption / prior.townSalesAtAdoption
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
    if (
      source === "selectiveSalesTaxes" &&
      (government.years[0]!.expectedRevenue[SELECTIVE_TAX] ?? 0) <= 0
    ) {
      // Cannabis is an additive amount, including months before retail opens.
      // Restate the other taxes through the existing economy/law calculation,
      // then forecast the current cannabis amount exactly once.
      const otherTaxes = rows.map((row) => {
        const cannabis =
          (row as BudgetMonthRow & { readonly cannabisRevenue?: number })
            .cannabisRevenue ?? 0;
        const other = Math.max(0, row.revenue[at]! - cannabis);
        const then = Math.max(
          0,
          1 + ECONOMY_ELASTICITY[source] * (row.economy - 1),
        );
        const now =
          economyNow === null
            ? then
            : Math.max(0, 1 + ECONOMY_ELASTICITY[source] * (economyNow - 1));
        const lawThen = taxLawFactor(world, government, source, row.month);
        const lawNow = taxLawFactor(world, government, source, startsOn);
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
          cannabisSalesRevenueChange(world, government, startsOn)
            .annualRevenueDelta,
        )
      );
    }
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
      // A city's sales tax collected on its town's sales, restated at
      // today's sales.
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
  let reserveDeposit =
    laws.reserve.answer === "yes" && government.reserve < floor
      ? Math.round(
          Math.min(
            floor - government.reserve,
            reserveLaw.depositShare * priorTotal,
          ),
        )
      : 0;
  // What the laws in force cost to carry out comes first, like interest.
  const lawCost = sum(lawSpendingForMonth(world, government, startsOn)) * 12;
  const cuttablePrior = sum(
    base.map((value, at) => (CUTTABLE[at] ? value : 0)),
  );
  // What laws changed since the last budget was adopted gained or lost the
  // state; its governor decides what the budget does with it.
  const lawChange = lawMoneyChange(
    world,
    government,
    prior,
    expectedRevenue,
    startsOn,
  );
  // What the reserve holds above any floor its law keeps there.
  const drawable = Math.max(
    0,
    laws.reserve.answer === "yes"
      ? government.reserve - floor
      : government.reserve,
  );
  const reaction = decideLawMoneyReaction(
    world,
    government,
    lawChange,
    laws.balanced.answer === "yes",
    drawable,
  );
  const beforeSaving = Math.max(
    0,
    sum(expectedRevenue) - interest - pensionPaid - reserveDeposit - lawCost,
  );
  // A governor who saves a law's gain sets it aside in the reserve, out of
  // what is left above last year's programs, never by cutting them. One who
  // draws the reserve for a law's loss takes it out across the year (a
  // negative deposit), up to what the reserve holds above its floor.
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
  // The balance above the reserve target is carried into the year and spent
  // across it. What the reserve still lacks of its target, after this year's
  // deposit, stays in the balance.
  const kept = Math.max(
    0,
    floor - government.reserve - Math.max(0, reserveDeposit),
  );
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
  // A place admitted as a state decides whether to certify, from its books
  // as this budget is adopted.
  const statehoodCertification = decideStatehoodCertification(
    world,
    government,
    startsOn,
  );
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
    ...(statehoodCertification ? { statehoodCertification } : {}),
    ...(townSalesAtAdoption !== null
      ? { townSalesAtAdoption: Math.round(townSalesAtAdoption * 1e6) / 1e6 }
      : {}),
  };
}
