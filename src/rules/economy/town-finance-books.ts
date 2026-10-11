import cashBuffers from "../../../data/research/money/opening-employer-cash-buffers.json" with { type: "json" };
import { LIFE_PATHS2_CATALOG } from "../../simulation/life-paths2-catalog";
import {
  TOWN_WORKPLACES,
  TOWN_BUSINESS_WORKPLACES,
  type Workplace,
} from "./business-readings";
import { startState } from "./macro-months";
import type {
  workStatusAt as nativeWorkStatus,
  workRoleAt as nativeWorkRole,
} from "../../simulation/life-queries";
import { resourcePositionsOf as ownPositions } from "./cash-positions";
/** Complete retained town business/bank quarterly book and ordered effect closure. Raw life/legal/source receipts stay with their owners; common transport returns recollected facts. No World is written here. */
import townBusinessResearch from "../../../data/research/money/town-business-a71-2026.json" with { type: "json" };
import {
  addDays,
  daysBetween,
  isoDateFromParts,
  yearOf,
} from "../../simulation/dates";
import { countyGeoidsForPlace } from "../../simulation/government-units";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { areaResidents } from "../../simulation/outcome-web/place-outcome-store";
import { FDIC_COUNTY_DEPOSITS } from "../../simulation/living-world/town-deposits.generated";
import {
  FDIC_SMALL_BANK_REPORT_DATE,
  FDIC_SMALL_BANK_SHAPES,
  FDIC_SMALL_BANK_RECORDS,
} from "../../simulation/living-world/town-bank-shapes.generated";
import {
  BANK_FAILED_EVENT,
  BUSINESS_CLOSED_EVENT,
} from "../../simulation/living-world/town-finance-types";
import type {
  TownBankBooks,
  TownBusinessBooks,
  TownFinanceStore,
  TownMarketBooks,
} from "../../simulation/living-world/town-finance-types";
import type {
  CurrencyCode,
  ResourceFlowTermsRecord,
  ResourceTransferOutcome,
  HistoricalCutoff,
  World,
  EntityId,
  IsoDate,
  MoneyAmount,
  WorkRelationship,
  WorkStatusRecord,
} from "../../simulation/types";
import type * as nativeLife from "../../simulation/life";
import type * as nativeResources from "../../simulation/resources";
import type { recordWorldEvent as nativeEvent } from "../../simulation/world";
import type { recordTownJobLoss as nativeJobLoss } from "../../simulation/living-world/town-labor-market";
import type {
  organizationClosingAt as nativeClosing,
  organizationProfileAt as nativeProfile,
} from "../../simulation/life-queries";
import type { privacyInitialOccurrence as nativePrivacy } from "../../simulation/federal-data-privacy-law";
import type { localInstitutionsFor as nativeInstitutions } from "../../simulation/local-institutions";
import { MACRO_CREDIT_POLICY } from "./macro-credit";
import { MACRO_ERA_POLICY } from "./macro-policy";
import { money, makeCurrencyCode } from "./cost-money";
import { recordById, recordsWithFieldValue } from "./raw-record-index";
import {
  otherCostsAtSales as costsOf,
  townBusinessKindBooks as kindBooksOf,
  type BusinessBookSourceFacts,
} from "./business-books";
import {
  currentResourceCutoff as cashCutoff,
  resourcePositionAt as cashPosition,
  resourceFlowsTouching as cashTouching,
  type CashFacts,
} from "./cash-positions";
import { paymentFromDatedCash as cashPayment } from "./dated-cash";
import {
  TOWN_EMPLOYMENT_VERSION,
  TOWN_JOB_END_REASONS,
  jobsLostBy as lostBy,
  type LaborReadingFacts,
} from "./labor-readings";
export interface FinanceFacts extends Pick<
  World,
  | "id"
  | "currentDate"
  | "macroEconomy"
  | "people"
  | "personOrder"
  | "jurisdictions"
  | "townFinances"
> {
  readonly records: World["history"];
  readonly lifeStatuses: ReadonlyMap<
    EntityId,
    ReturnType<typeof nativeWorkStatus>
  >;
  readonly lifeRoles: ReadonlyMap<EntityId, ReturnType<typeof nativeWorkRole>>;
  readonly lifeProfiles: ReadonlyMap<
    EntityId,
    ReturnType<typeof nativeProfile>
  >;
  readonly lifeClosings: ReadonlyMap<
    EntityId,
    ReturnType<typeof nativeClosing>
  >;
  readonly privacy: ReadonlyMap<string, ReturnType<typeof nativePrivacy>>;
  readonly institutions: ReadonlyMap<
    EntityId,
    ReturnType<typeof nativeInstitutions>
  >;
  readonly labor: LaborReadingFacts;
  readonly businessSource: BusinessBookSourceFacts;
}
interface FinanceInputs {
  readonly createResourcePosition: Parameters<
    typeof nativeResources.createResourcePosition
  >[1];
  readonly createResourceFlow: Parameters<
    typeof nativeResources.createResourceFlow
  >[1];
  readonly recordResourceTransferOutcome: Parameters<
    typeof nativeResources.recordResourceTransferOutcome
  >[1];
  readonly recordOrganizationProfile: Parameters<
    typeof nativeLife.recordOrganizationProfile
  >[1];
  readonly recordTownJobLoss: Parameters<typeof nativeJobLoss>[1];
  readonly recordWorldEvent: Parameters<typeof nativeEvent>[1];
  readonly createOrganization: Parameters<
    typeof nativeLife.createOrganization
  >[1];
}
export type FinanceEffectRequest = {
  [K in keyof FinanceInputs]: {
    readonly kind: K;
    readonly input: FinanceInputs[K];
    readonly books: World["townFinances"];
  };
}[keyof FinanceInputs];
function financeEffectRequest<K extends keyof FinanceInputs>(
  kind: K,
  facts: FinanceFacts,
  input: FinanceInputs[K],
): FinanceEffectRequest {
  return { kind, input, books: facts.townFinances } as FinanceEffectRequest;
}
function receipt<V>(map: ReadonlyMap<EntityId, V>, id: EntityId) {
  if (!map.has(id)) throw Error("Missing dated finance source receipt: " + id);
  return map.get(id)!;
}
function organizationClosingAt(facts: FinanceFacts, id: EntityId) {
  return receipt(facts.lifeClosings, id);
}
function organizationProfileAt(facts: FinanceFacts, id: EntityId) {
  return receipt(facts.lifeProfiles, id);
}
function localInstitutionsFor(facts: FinanceFacts, id: EntityId) {
  return receipt(facts.institutions, id);
}
export function privacyReceiptKey(
  id: EntityId,
  date: IsoDate,
  seen: Parameters<typeof nativePrivacy>[3],
) {
  return JSON.stringify([id, date, seen]);
}
function privacyInitialOccurrence(
  facts: FinanceFacts,
  id: EntityId,
  date: IsoDate,
  seen: Parameters<typeof nativePrivacy>[3],
) {
  const key = privacyReceiptKey(id, date, seen);
  if (!facts.privacy.has(key))
    throw Error("Missing finance law-cost receipt: " + key);
  return facts.privacy.get(key)!;
}
function cashFacts(facts: FinanceFacts): CashFacts {
  return { id: facts.id, onDate: facts.currentDate, records: facts.records };
}
function currentResourceCutoff(facts: FinanceFacts) {
  return cashCutoff(cashFacts(facts));
}
function resourcePositionAt(
  facts: FinanceFacts,
  ...args: Parameters<typeof cashPosition> extends [unknown, ...infer R]
    ? R
    : never
) {
  return cashPosition(cashFacts(facts), ...args);
}
function resourceFlowsTouching(
  facts: FinanceFacts,
  ...args: Parameters<typeof cashTouching> extends [unknown, ...infer R]
    ? R
    : never
) {
  return cashTouching(cashFacts(facts), ...args);
}
function paymentFromDatedCash(
  facts: FinanceFacts,
  ...args: Parameters<typeof cashPayment> extends [unknown, ...infer R]
    ? R
    : never
) {
  return cashPayment(cashFacts(facts), ...args);
}
function resourceTransferOutcomesForFlow(
  facts: FinanceFacts,
  id: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): readonly ResourceTransferOutcome[] {
  return facts.records.resourceTransferOutcomes.filter(
    (record) =>
      record.resourceFlowId === id &&
      availableOn(record, record.occurredAt, cutoff),
  );
}
function jobsLostBy(
  facts: FinanceFacts,
  ...args: Parameters<typeof lostBy> extends [unknown, ...infer R] ? R : never
) {
  return lostBy(facts.labor, ...args);
}
function otherCostsAtSales(facts: FinanceFacts, books: TownBusinessBooks) {
  return costsOf(facts.businessSource, books);
}
function townBusinessKindBooks(facts: FinanceFacts, kind: string) {
  return kindBooksOf(facts.businessSource, kind);
}
// STOPGAP: economy.town-finance-native-book-policy

export const TOWN_FINANCES_VERSION = "town-finances-v1" as const;
const TOWN_BUSINESS_RESEARCH = {
  creditLine: townBusinessResearch.answers["small-business-credit-line-size"],
  localSales: townBusinessResearch.answers["local-sales-response-to-town-pay"],
} as const;
export const TOWN_FINANCE_CLOSING_REASONS = {
  ranOutOfCash: "business:ran-out-of-cash",
  bankFailed: "bank:failed",
} as const;
// STOPGAP: economy.finance-bank-job-loss-reason
export const TOWN_BANK_JOB_END_REASON = "labor:bank-failed";
export const TOWN_FINANCE_POLICY = {
  business: {
    cashBufferDays: {
      restaurant: 16,
      repair: 18,
      retail: 19,
      construction: 20,
      "personal-care": 21,
      wholesale: 23,
      manufacturing: 28,
      clinic: 30,
      "care-home": 30,
      professional: 33,
      insurance: 33,
      "building-services": 33,
      "private-school": 33,
      information: 33,
      realty: 47,
      "*": 27,
    } as Readonly<Record<string, number>>,
    creditLineDaysByKind: Object.fromEntries(
      Object.entries(TOWN_BUSINESS_RESEARCH.creditLine.byGameKind).map(
        ([kind, row]) => [kind, row.medianDays],
      ),
    ) as Readonly<Record<string, number>>,
    localDemandElasticity: TOWN_BUSINESS_RESEARCH.localSales.value,
    localDemandHalfLifeDays: 1095,
    newDemandShare: 0,
    crowdingPriceResponse: 0.1,
    priceStepMax: 0.05,
    rivalPriceElasticity: 3,
  },
  bank: {
    capitalRatio: 0.1,
    criticalCapitalRatio: 0.02,
    lendingCapitalRatio: 0.07,
    frightCapitalRatio: 0.05,
    cushionRebuildPerQuarter: 0.25,
    chargeOffDaysPastDue: 120,
    unemploymentBenefitDays: 26 * 7,
  },
} as const;
export const TOWN_KIND_PRICE_ELASTICITY: Readonly<Record<string, number>> = {
  restaurant: 0.81,
};
const DEFAULT_PRICE_ELASTICITY = 0.5;
export interface BankShape {
  readonly state: string | null;
  readonly index: number;
  readonly certificate?: number;
  readonly cushion: number;
  readonly otherAssets: number;
}
interface ShapeRow {
  readonly cushion: number;
  readonly otherAssets: number;
  readonly uninsured: number;
}
function parseShapes(text: string): ShapeRow[] {
  return text.split(";").map((cell) => {
    const [cushion, otherAssets, uninsured] = cell.split(",").map(Number) as [
      number,
      number,
      number,
    ];
    return { cushion, otherAssets, uninsured };
  });
}
let nationalShapes: ShapeRow[] | null = null;
export function uninsuredDepositShare(shape: BankShape): number {
  const own = shape.state ? FDIC_SMALL_BANK_SHAPES[shape.state] : undefined;
  if (own) return parseShapes(own)[shape.index]!.uninsured;
  nationalShapes ??= Object.keys(FDIC_SMALL_BANK_SHAPES)
    .sort()
    .flatMap((key) => parseShapes(FDIC_SMALL_BANK_SHAPES[key]!));
  return nationalShapes[shape.index]!.uninsured;
}
interface ObservedBankShape extends BankShape {
  readonly assetsThousands: number;
  readonly certificate: number;
}
const observedBankPools = new Map<
  string | null,
  readonly ObservedBankShape[]
>();
function observedBankPool(state: string | null): readonly ObservedBankShape[] {
  const own = state === null ? undefined : FDIC_SMALL_BANK_RECORDS[state];
  const sourceState = own && own.length >= 5 ? state : null;
  const cached = observedBankPools.get(sourceState);
  if (cached) return cached;
  const states =
    sourceState === null
      ? Object.keys(FDIC_SMALL_BANK_SHAPES).sort()
      : [sourceState];
  const rows: ObservedBankShape[] = [];
  let offset = 0;
  for (const key of states) {
    const shapes = parseShapes(FDIC_SMALL_BANK_SHAPES[key]!);
    const records = FDIC_SMALL_BANK_RECORDS[key]!;
    if (records.length !== shapes.length)
      throw new Error(
        "Observed bank metadata must preserve the original ratio rows.",
      );
    records.forEach(([assetsThousands, certificate], index) => {
      const { cushion, otherAssets } = shapes[index]!;
      rows.push({
        state: sourceState,
        index: sourceState === null ? offset + index : index,
        assetsThousands,
        certificate,
        cushion,
        otherAssets,
      });
    });
    offset += shapes.length;
  }
  rows.sort(
    (a, b) =>
      a.assetsThousands - b.assetsThousands || a.certificate - b.certificate,
  );
  const ranked = rows.filter(
    (row, index) =>
      index === 0 || row.assetsThousands !== rows[index - 1]!.assetsThousands,
  );
  observedBankPools.set(sourceState, ranked);
  return ranked;
}
export function recordedBankShape(
  state: string | null,
  depositsDollars: number,
): BankShape {
  if (!Number.isFinite(depositsDollars) || depositsDollars < 0)
    throw new Error(
      "Bank profile selection requires nonnegative recorded deposits.",
    );
  const pool = observedBankPool(state);
  if (pool.length === 0)
    throw new Error("Bank profile selection requires observed records.");
  const target = depositsDollars / 1000;
  let low = 0;
  let high = pool.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (pool[middle]!.assetsThousands < target) low = middle + 1;
    else high = middle;
  }
  const left = pool[Math.max(0, low - 1)]!;
  const right = pool[Math.min(low, pool.length - 1)]!;
  const leftDistance = Math.abs(left.assetsThousands - target);
  const rightDistance = Math.abs(right.assetsThousands - target);
  const chosen =
    leftDistance < rightDistance ||
    (leftDistance === rightDistance && left.certificate < right.certificate)
      ? left
      : right;
  const {
    state: chosenState,
    index,
    certificate,
    cushion,
    otherAssets,
  } = chosen;
  return { state: chosenState, index, certificate, cushion, otherAssets };
}
export function recordedBankShapeForCertificate(
  state: string | null,
  certificate: number,
): BankShape {
  if (!Number.isSafeInteger(certificate) || certificate < 1)
    throw new Error("FDIC bank certificate must be a positive whole number");
  const bank = observedBankPool(state).find(
    (row) => row.certificate === certificate,
  );
  if (!bank)
    throw new Error(
      `No modeled FDIC financial row matches certificate ${certificate}`,
    );
  return {
    state: bank.state,
    index: bank.index,
    certificate: bank.certificate,
    cushion: bank.cushion,
    otherAssets: bank.otherAssets,
  };
}
const round2 = (value: number) => Math.round(value * 100) / 100;
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;
function dollars(amount: MoneyAmount): number {
  return amount.minorUnits / 100;
}
function formatDollars(value: number): string {
  const whole = Math.round(Math.abs(value));
  return `$${whole.toLocaleString("en-US")}`;
}
export const PAYDAYS_A_YEAR: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};
// STOPGAP: economy.finance-pay-history-frontier
function payBetween(
  facts: FinanceFacts,
  organizations: ReadonlySet<EntityId>,
  since: IsoDate,
): Map<EntityId, number> {
  const flowOrg = new Map<
    EntityId,
    {
      org: EntityId;
      perYear: number | null;
    }
  >();
  for (const flow of facts.records.resourceFlows)
    if (
      flow.basisKind === "compensation:work" &&
      flow.source.kind === "organization" &&
      organizations.has(flow.source.organizationId)
    )
      flowOrg.set(flow.id, { org: flow.source.organizationId, perYear: null });
  for (const terms of facts.records.resourceFlowTerms) {
    const flow = flowOrg.get(terms.resourceFlowId);
    const schedule = flow
      ? /^schedule:town-([a-z]+)/.exec(terms.cadenceKind)?.[1]
      : undefined;
    if (flow && schedule && PAYDAYS_A_YEAR[schedule])
      flow.perYear = PAYDAYS_A_YEAR[schedule]!;
  }
  const total = new Map<EntityId, number>();
  const paydays = new Map<EntityId, Set<IsoDate>>();
  const perYear = new Map<EntityId, number>();
  const outcomes = facts.records.resourceTransferOutcomes;
  for (let index = outcomes.length - 1; index >= 0; index -= 1) {
    const outcome = outcomes[index]!;
    if (outcome.occurredAt <= since) {
      if (outcome.occurredAt < addDays(since, -45)) break;
      continue;
    }
    if (outcome.occurredAt > facts.currentDate) continue;
    const flow = flowOrg.get(outcome.resourceFlowId);
    if (!flow) continue;
    total.set(
      flow.org,
      (total.get(flow.org) ?? 0) + dollars(outcome.transferredAmount),
    );
    const days = paydays.get(flow.org) ?? new Set<IsoDate>();
    days.add(outcome.occurredAt);
    paydays.set(flow.org, days);
    if (flow.perYear) perYear.set(flow.org, flow.perYear);
  }
  const pay = new Map<EntityId, number>();
  for (const [org, amount] of total) {
    const seen = paydays.get(org)!.size;
    const yearly = perYear.get(org);
    pay.set(org, yearly && seen > 0 ? (amount / seen) * (yearly / 4) : amount);
  }
  return pay;
}
interface Economy {
  readonly growthGapPct: number;
  readonly trendPct: number;
  readonly inflationPct: number;
  readonly chargeOffPct: number;
  readonly debtRatePct: number;
  readonly lendingGrowthPct: number;
  readonly tightness: number;
  readonly priceIndex: number;
  readonly nationalUnemploymentPct: number | null;
}
function economyOf(facts: FinanceFacts): Economy | null {
  const months = facts.macroEconomy?.months ?? [];
  const national = months
    .filter(
      (month) =>
        month.scope === "national" && month.recordedAt <= facts.currentDate,
    )
    .slice(-3);
  if (national.length === 0) return null;
  const mean = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const growth = mean(national.map((m) => m.growthPct));
  const inflation = mean(national.map((m) => m.inflationPct));
  const credit = national.map((m) => m.credit).filter((c) => c !== undefined);
  const start = MACRO_CREDIT_POLICY.start;
  const trend =
    national.at(-1)!.drivers?.trendPct ?? MACRO_ERA_POLICY.start.trendGrowthPct;
  return {
    growthGapPct: growth - trend,
    trendPct: trend,
    inflationPct: inflation,
    chargeOffPct: credit.length
      ? mean(credit.map((c) => c.chargeOffPct))
      : start.chargeOffPct,
    debtRatePct: credit.length
      ? mean(credit.map((c) => c.debtRatePct))
      : mean(
          national.map(
            (m) => (m.policyRate.lowerPct + m.policyRate.upperPct) / 2,
          ),
        ) + start.spreadPp,
    lendingGrowthPct: credit.length
      ? mean(credit.map((c) => c.lendingGrowthPct))
      : growth + inflation,
    tightness: mean(national.map((m) => m.creditTightness)),
    nationalUnemploymentPct: national.at(-1)!.unemploymentPct,
    priceIndex: national.at(-1)!.priceIndex,
  };
}
export const TOWN_TAXABLE_SALES_KINDS: ReadonlySet<string> = new Set([
  "retail",
  "restaurant",
  "inn",
  "recreation",
  "repair",
  "personal-care",
]);
// STOPGAP: economy.finance-deposit-source-median
let depositsByCounty: ReadonlyMap<string, number> | null = null;
let perResidentByState: ReadonlyMap<string, number> | null = null;
let perResidentNation = 0;
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}
export function townDepositsPerResident(
  facts: FinanceFacts,
  town: EntityId,
): number {
  if (!depositsByCounty) {
    const byCounty = new Map<string, number>();
    const byState = new Map<string, number[]>();
    for (const pair of FDIC_COUNTY_DEPOSITS.split(";")) {
      const [county, thousands] = pair.split(":") as [string, string];
      const residents = areaResidents(county);
      if (!residents) continue;
      const perResident = (Number(thousands) * 1000) / residents;
      byCounty.set(county, perResident);
      const list = byState.get(county.slice(0, 2)) ?? [];
      list.push(perResident);
      byState.set(county.slice(0, 2), list);
    }
    depositsByCounty = byCounty;
    perResidentByState = new Map(
      [...byState].map(([state, values]) => [state, median(values)]),
    );
    perResidentNation = median([...byCounty.values()]);
  }
  const geoid = lifePlaceByJurisdictionId(town)?.sourceGeoid ?? null;
  const county =
    geoid && /^\d{7}$/.test(geoid) ? countyGeoidsForPlace(geoid)[0] : undefined;
  return (
    (county ? depositsByCounty.get(county) : undefined) ??
    (geoid ? perResidentByState!.get(geoid.slice(0, 2)) : undefined) ??
    perResidentNation
  );
}
function townPeople(facts: FinanceFacts, town: EntityId): number {
  const dead = new Set(facts.records.personDeaths.map((row) => row.personId));
  let count = 0;
  for (const personId of facts.personOrder) {
    const person = facts.people[personId];
    if (person?.homeJurisdictionId === town && !dead.has(personId)) count += 1;
  }
  return count;
}
// STOPGAP: economy.finance-bank-profile-source-contract
function openBankBooks(
  facts: FinanceFacts,
  town: EntityId,
  organizationId: EntityId,
  banksInTown: number,
  round: string,
): TownBankBooks {
  const P = TOWN_FINANCE_POLICY.bank;
  const state = facts.jurisdictions[town]?.parentName ?? null;
  const deposits = round2(
    (townDepositsPerResident(facts, town) * townPeople(facts, town)) /
      Math.max(1, banksInTown),
  );
  const organizationName = organizationProfileAt(facts, organizationId)?.name;
  const institution = localInstitutionsFor(facts, town).banks.find(
    (row) => row.name === organizationName,
  );
  const certificate = institution ? Number(institution.sourceId) : NaN;
  const shape = institution
    ? recordedBankShapeForCertificate(state, certificate)
    : recordedBankShape(state, deposits);
  const liquid = round2(deposits * shape.cushion);
  const loans = round2(deposits * shape.otherAssets);
  return {
    organizationId,
    openedAt: facts.currentDate,
    shape,
    deposits,
    liquid,
    loans,
    capital: round2(P.capitalRatio * (liquid + loans)),
    businessLoans: 0,
    lastQuarterLosses: 0,
    runAt: null,
    failed: null,
    lastRound: round,
  };
}
function lenderOf(
  banks: Readonly<Record<EntityId, TownBankBooks>>,
  openBanks: readonly EntityId[],
): EntityId | null {
  let best: EntityId | null = null;
  for (const id of openBanks)
    if (
      best === null ||
      banks[id]!.deposits > banks[best]!.deposits ||
      (banks[id]!.deposits === banks[best]!.deposits && id < best)
    )
      best = id;
  return best;
}
function buildToward(reached: number, target: number, today: IsoDate): number {
  if (!(reached > 0) || !(target > 0)) return target > 0 ? target : reached;
  const left = acuteWeight(
    TOWN_FINANCE_POLICY.business.localDemandHalfLifeDays,
    addDays(today, -91),
    today,
  );
  return reached * (target / reached) ** (1 - left);
}
export function townCreditLineDays(kind: string): number {
  const days = TOWN_FINANCE_POLICY.business.creditLineDaysByKind;
  return days[kind] ?? days["*"]!;
}
export const TOWN_SALES_RECEIPT_BASIS = "custom:town-recorded-sales";
// STOPGAP: economy.finance-sales-aggregate-receipts
export function* recordTownSalesReceipts(
  facts: FinanceFacts,
  town: EntityId,
  periodStartsAt: IsoDate,
  periodEndsAt: IsoDate,
  round: string,
  priceLevel: number,
): Generator<FinanceEffectRequest, FinanceFacts, FinanceFacts> {
  if (!Number.isFinite(priceLevel) || priceLevel <= 0)
    throw new Error(
      "Recorded sales require a positive nominal price conversion.",
    );
  const currency = makeCurrencyCode("USD");
  let next = facts;
  for (const books of Object.values(facts.townFinances?.businesses ?? {})) {
    if (
      (books.lastRound !== round && round !== `opening:${facts.currentDate}`) ||
      organizationProfileAt(facts, books.organizationId)
        ?.locationJurisdictionId !== town
    )
      continue;
    const stableKey = `town-sales:${books.organizationId}:${periodStartsAt}:${periodEndsAt}`;
    if (next.records.resourceFlows.some((flow) => flow.stableKey === stableKey))
      continue;
    const recipient = {
      kind: "organization" as const,
      organizationId: books.organizationId,
    };
    const excluded = resourceFlowsTouching(next, recipient)
      .filter(
        (flow) =>
          flow.recipient.kind === "organization" &&
          flow.recipient.organizationId === books.organizationId &&
          (flow.basisKind === "custom:business-revenue" ||
            flow.basisKind === TOWN_SALES_RECEIPT_BASIS ||
            flow.basisKind === "custom:retail-purchase" ||
            flow.basisKind === "custom:living-costs" ||
            flow.basisKind.startsWith("custom:living-costs.") ||
            flow.basisReference.kind === "public-program" ||
            (flow.source.kind === "organization" &&
              (organizationProfileAt(next, flow.source.organizationId)
                ?.publicGovernmentIdentity !== undefined ||
                organizationProfileAt(
                  next,
                  flow.source.organizationId,
                )?.classification.endsWith(":government") ||
                organizationProfileAt(
                  next,
                  flow.source.organizationId,
                )?.classification.endsWith("-government")))),
      )
      .flatMap((flow) => resourceTransferOutcomesForFlow(next, flow.id))
      .filter(
        (outcome) =>
          (outcome.occurredAt > periodStartsAt ||
            (outcome.occurredAt === periodStartsAt &&
              (periodStartsAt === periodEndsAt ||
                books.openedAt === periodStartsAt)) ||
            (outcome.occurredAt === periodStartsAt &&
              outcome.periodStartsAt === outcome.periodEndsAt &&
              recordById(next.records.resourceFlows, outcome.resourceFlowId)
                ?.basisKind === TOWN_SALES_RECEIPT_BASIS)) &&
          outcome.occurredAt <= periodEndsAt &&
          outcome.transferredAmount.currency === currency &&
          outcome.transferredAmount.minorUnits > 0,
      );
    const grossMinor = Math.round((books.annualRevenue / 4) * priceLevel * 100);
    if (!Number.isSafeInteger(grossMinor) || grossMinor < 0)
      throw new Error(
        "Recorded quarterly sales must be nonnegative safe minor units.",
      );
    const alreadyPaidMinor = excluded.reduce(
      (sum, row) => sum + row.transferredAmount.minorUnits,
      0,
    );
    const amount = money(Math.max(0, grossMinor - alreadyPaidMinor), currency);
    if (amount.minorUnits === 0) continue;
    const customers = yield* aggregateCustomers(next, town, periodStartsAt);
    next = customers.facts;
    const source = {
      kind: "organization" as const,
      organizationId: customers.organizationId,
    };
    const provenance = {
      kind: "authored" as const,
      note: JSON.stringify({
        authority:
          "CTO 2026-10-02 ruling 4: recorded business sales are period receipts",
        organizationId: books.organizationId,
        round,
        openedAt: books.openedAt,
        annualRevenueConstantDollars: books.annualRevenue,
        basePriceIndex: facts.townFinances?.basePriceIndex,
        nominalPriceLevel: priceLevel,
        quartersPerYear: 4,
        grossMinor,
        alreadyPaidMinor,
        excludedOutcomeIds: excluded.map((row) => row.id),
        playerLivingCostsIncludedInSales: true,
      }),
    };
    next = yield financeEffectRequest("createResourceFlow", next, {
      stableKey,
      source,
      recipient,
      startsAt: periodStartsAt,
      amount,
      cadenceKind: "schedule:one-time",
      basisKind: TOWN_SALES_RECEIPT_BASIS,
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: town,
      provenance,
    });
    const flow = next.records.resourceFlows.at(-1)!;
    const tracked = resourcePositionAt(
      next,
      source,
      currency,
      currentResourceCutoff(next),
    );
    const payment = tracked
      ? paymentFromDatedCash(next, source, amount, periodEndsAt)
      : null;
    next = yield financeEffectRequest("recordResourceTransferOutcome", next, {
      stableKey: `${stableKey}:receipt`,
      resourceFlowId: flow.id,
      periodStartsAt,
      periodEndsAt,
      occurredAt: periodEndsAt,
      attemptedAmount: amount,
      transferredAmount: payment?.transferredAmount ?? amount,
      status: payment?.status ?? "completed",
      reasonKind: payment?.reasonKind ?? null,
      note: `Recorded sales for ${periodStartsAt} through ${periodEndsAt}; prior receipts included.`,
      provenance,
    });
  }
  return next;
}
export function openBusinessBooks(
  facts: FinanceFacts,
  organizationId: EntityId,
  kind: string,
  quarterPay: number,
  bankId: EntityId | null,
  round: string,
): TownBusinessBooks {
  const P = TOWN_FINANCE_POLICY.business;
  const yearlyPay = quarterPay * 4;
  const { margin, payShare } = townBusinessKindBooks(facts, kind);
  const annualRevenue = yearlyPay / payShare;
  const annualOtherCosts = Math.max(
    0,
    annualRevenue * (1 - margin) - yearlyPay,
  );
  const bufferDays = P.cashBufferDays[kind] ?? P.cashBufferDays["*"]!;
  return {
    organizationId,
    openedAt: facts.currentDate,
    cash: round2(((yearlyPay + annualOtherCosts) * bufferDays) / 365),
    debt: 0,
    annualRevenue: round2(annualRevenue),
    kind,
    capacity: round2(annualRevenue),
    annualOtherCosts: round2(annualOtherCosts),
    margin: round6(margin),
    ownDemandLog: 0,
    openingShare: 1,
    openingMarketSales: round2(annualRevenue),
    bankId,
    lineLimit: round2((annualRevenue * townCreditLineDays(kind)) / 365),
    lastQuarterNet: 0,
    lastQuarterPay: round2(quarterPay),
    lastRound: round,
  };
}
export interface TownFinanceQuarter {
  readonly facts: FinanceFacts;
  readonly closing: readonly {
    readonly organizationId: EntityId;
    readonly books: TownBusinessBooks;
    readonly why: "no-line" | "bank-refused" | "bank-failed" | "line-used-up";
    readonly share: number;
    readonly marketSales: number;
  }[];
}
function townBanks(facts: FinanceFacts, town: EntityId): EntityId[] {
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:bank:`;
  return facts.records.organizations
    .filter(
      (organization) =>
        organization.stableKey.startsWith(stem) &&
        !organizationClosingAt(facts, organization.id),
    )
    .map((organization) => organization.id)
    .sort();
}
function capitalRatio(bank: TownBankBooks): number {
  const assets = bank.liquid + bank.loans;
  return assets > 0 ? bank.capital / assets : 0;
}
function honorsLine(bank: TownBankBooks | undefined): boolean {
  return (
    !!bank &&
    !bank.failed &&
    capitalRatio(bank) >= TOWN_FINANCE_POLICY.bank.lendingCapitalRatio
  );
}
function lends(bank: TownBankBooks | undefined, economy: Economy): boolean {
  if (!bank || bank.failed) return false;
  return (
    capitalRatio(bank) >= TOWN_FINANCE_POLICY.bank.lendingCapitalRatio &&
    economy.tightness < 0.75
  );
}
// STOPGAP: economy.finance-credit-market-frontiers
export function* stepTownFinances(
  facts: FinanceFacts,
  town: EntityId,
  businesses: readonly {
    readonly organizationId: EntityId;
    readonly kind: string;
    readonly newcomer: boolean;
  }[],
  exempt: ReadonlySet<EntityId>,
  round: string,
): Generator<FinanceEffectRequest, TownFinanceQuarter, FinanceFacts> {
  const economy = economyOf(facts);
  if (!economy) return { facts, closing: [] };
  const store: TownFinanceStore = facts.townFinances ?? {
    version: TOWN_FINANCES_VERSION,
    businesses: {},
    banks: {},
    markets: {},
  };
  const bankIds = townBanks(facts, town);
  const employerStem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:`;
  const all = new Set<EntityId>([
    ...businesses.map((row) => row.organizationId),
    ...bankIds,
    ...facts.records.organizations
      .filter((row) => row.stableKey.startsWith(employerStem))
      .map((row) => row.id),
  ]);
  const since = addDays(facts.currentDate, -91);
  const pay = payBetween(facts, all, since);
  const basePriceIndex = store.basePriceIndex ?? economy.priceIndex;
  const priceLevel = economy.priceIndex / basePriceIndex;
  const townJobs = activeTownJobs(facts, town).length;
  const averagePay =
    townJobs > 0
      ? ([...pay.values()].reduce((sum, value) => sum + value, 0) * 4) /
        townJobs
      : 0;
  for (const [id, value] of pay) pay.set(id, value / priceLevel);
  const townPay = round2(
    [...pay.values()].reduce((sum, value) => sum + value, 0) * 4,
  );
  const banks: Record<EntityId, TownBankBooks> = { ...store.banks };
  const yearlyTownPay =
    [...businesses.map((row) => row.organizationId), ...bankIds].reduce(
      (sum, id) => sum + (pay.get(id) ?? 0),
      0,
    ) * 4;
  for (const bankId of bankIds) {
    if (!banks[bankId] && yearlyTownPay > 0) {
      banks[bankId] = openBankBooks(facts, town, bankId, bankIds.length, round);
    }
  }
  const P = TOWN_FINANCE_POLICY.business;
  const demandGrowth = Math.exp(economy.growthGapPct / 400);
  const realDebtRatePct = Math.max(
    0,
    economy.debtRatePct - economy.inflationPct,
  );
  const books: Record<EntityId, TownBusinessBooks> = { ...store.businesses };
  const markets: Record<string, TownMarketBooks> = { ...store.markets };
  const pendingDefaults = new Map<EntityId, number>();
  const closing: TownFinanceQuarter["closing"][number][] = [];
  const openBanks = bankIds.filter((id) => banks[id] && !banks[id]!.failed);
  const formedAt = new Map(
    facts.records.organizations.map((row) => [row.id, row.formedAt]),
  );
  for (const { organizationId, kind } of businesses) {
    if (books[organizationId]) continue;
    const quarterPay = pay.get(organizationId) ?? 0;
    if (quarterPay <= 0 || (formedAt.get(organizationId) ?? since) > since)
      continue;
    const bankId = lenderOf(banks, openBanks);
    const opened = openBusinessBooks(
      facts,
      organizationId,
      kind,
      quarterPay,
      bankId,
      round,
    );
    books[organizationId] = {
      ...opened,
      lineLimit: lends(bankId ? banks[bankId] : undefined, economy)
        ? opened.lineLimit
        : 0,
      price: round6(priceLevel),
    };
  }
  const prices = new Map<EntityId, number>();
  for (const { organizationId, kind } of businesses) {
    const existing = books[organizationId];
    if (!existing) continue;
    const price = existing.price ?? priceLevel;
    if (
      existing.lastRound === round ||
      existing.openedAt === facts.currentDate
    ) {
      prices.set(organizationId, price);
      continue;
    }
    const market = markets[`${town}:${kind}`];
    const wageGrowth =
      market?.averagePay && averagePay > 0 ? averagePay / market.averagePay : 1;
    const inflation = market?.priceIndexSeen
      ? economy.priceIndex / market.priceIndexSeen
      : 1;
    const yearlyPay = (existing.lastQuarterPay ?? 0) * 4;
    const otherCosts = otherCostsAtSales(facts, existing);
    const payShare =
      yearlyPay + otherCosts > 0 ? yearlyPay / (yearlyPay + otherCosts) : 0;
    const costGrowth = payShare * wageGrowth + (1 - payShare) * inflation;
    const crowding =
      existing.capacity > 0
        ? existing.annualRevenue / existing.capacity - 1
        : 0;
    const step = Math.max(
      -P.priceStepMax,
      Math.min(P.priceStepMax, P.crowdingPriceResponse * crowding),
    );
    prices.set(organizationId, round6(price * costGrowth * Math.exp(step)));
  }
  const realPriceOf = (
    ids: readonly EntityId[],
    price: (id: EntityId) => number,
  ) => {
    const capacity = ids.reduce((sum, id) => sum + books[id]!.capacity, 0);
    return capacity > 0
      ? ids.reduce((sum, id) => sum + books[id]!.capacity * price(id), 0) /
          capacity /
          priceLevel
      : 1;
  };
  const newcomers = new Set(
    businesses.filter((row) => row.newcomer).map((row) => row.organizationId),
  );
  const members = new Map<string, EntityId[]>();
  for (const { organizationId, kind } of businesses)
    if (books[organizationId])
      members.set(kind, [...(members.get(kind) ?? []), organizationId]);
  const kinds = new Set(members.keys());
  for (const market of Object.values(markets))
    if (market.town === town) kinds.add(market.kind);
  const taxableBefore = new Map<string, number>();
  for (const [key, market] of Object.entries(markets))
    if (
      market.town === town &&
      market.lastRound !== round &&
      TOWN_TAXABLE_SALES_KINDS.has(market.kind)
    )
      taxableBefore.set(key, market.annualSales);
  const coverage = new Map<string, number>();
  for (const kind of [...kinds].sort()) {
    const key = `${town}:${kind}`;
    const now = members.get(kind) ?? [];
    const market = markets[key];
    if (!market) {
      markets[key] = {
        town,
        kind,
        openedAt: facts.currentDate,
        annualSales: round2(
          now.reduce((sum, id) => sum + books[id]!.capacity, 0),
        ),
        members: now,
        townJobs,
        townPay,
        townPayReached: townPay,
        townJobsReached: townJobs,
        averagePay: round2(averagePay),
        priceIndexSeen: economy.priceIndex,
        lastRound: round,
      };
      continue;
    }
    if (market.lastRound === round) continue;
    const before = new Set(market.members);
    const current = new Set(now);
    const usePay =
      market.townPay !== undefined && market.townPay > 0 && townPay > 0;
    const reachedBefore = usePay
      ? (market.townPayReached ?? market.townPay!)
      : (market.townJobsReached ?? market.townJobs);
    const reachedNow = buildToward(
      reachedBefore,
      usePay ? townPay : townJobs,
      facts.currentDate,
    );
    const incomeFactor =
      reachedBefore > 0 && reachedNow > 0
        ? (reachedNow / reachedBefore) ** P.localDemandElasticity
        : 1;
    const stayed = now.filter((id) => before.has(id));
    const sinceSeen = market.priceIndexSeen
      ? economy.priceIndex / market.priceIndexSeen
      : 1;
    const lastRealPrice = realPriceOf(stayed, (id) =>
      books[id]!.price !== undefined
        ? books[id]!.price! * sinceSeen
        : priceLevel,
    );
    const elasticity =
      TOWN_KIND_PRICE_ELASTICITY[kind] ?? DEFAULT_PRICE_ELASTICITY;
    const nowRealPrice = realPriceOf(
      stayed,
      (id) => prices.get(id) ?? priceLevel,
    );
    const priceFactor =
      stayed.length > 0 && lastRealPrice > 0
        ? (nowRealPrice / lastRealPrice) ** (1 - elasticity)
        : 1;
    let sales = market.annualSales * demandGrowth * incomeFactor * priceFactor;
    for (const id of now)
      if (!before.has(id)) {
        sales +=
          books[id]!.capacity * (newcomers.has(id) ? P.newDemandShare : 1);
        if (!newcomers.has(id))
          coverage.set(key, (coverage.get(key) ?? 0) + books[id]!.capacity);
      }
    for (const id of market.members)
      if (!current.has(id))
        sales -= (books[id]?.annualRevenue ?? 0) * P.newDemandShare;
    markets[key] = {
      ...market,
      annualSales: round2(Math.max(0, sales)),
      members: now,
      townJobs,
      townPay,
      ...(usePay
        ? { townPayReached: round2(reachedNow) }
        : { townJobsReached: round6(reachedNow) }),
      averagePay: round2(averagePay),
      priceIndexSeen: economy.priceIndex,
      lastRound: round,
    };
  }
  for (const { organizationId, kind } of businesses) {
    const opening = books[organizationId];
    if (!opening || opening.openedAt !== facts.currentDate) continue;
    const market = markets[`${town}:${kind}`]!;
    const capacityOfKind = market.members.reduce(
      (sum, id) => sum + books[id]!.capacity,
      0,
    );
    books[organizationId] = {
      ...opening,
      openingShare: round6(
        capacityOfKind > 0 ? opening.capacity / capacityOfKind : 1,
      ),
      openingMarketSales: market.annualSales,
    };
  }
  for (const { organizationId, kind } of businesses) {
    const existing = books[organizationId];
    if (!existing || existing.lastRound === round) continue;
    const quarterPay = pay.get(organizationId) ?? 0;
    const market = markets[`${town}:${kind}`]!;
    const weightOf = (id: EntityId) =>
      books[id]!.capacity *
      ((prices.get(id) ?? priceLevel) / priceLevel) ** -P.rivalPriceElasticity;
    const weightOfKind = market.members.reduce(
      (sum, id) => sum + weightOf(id),
      0,
    );
    const share =
      weightOfKind > 0 ? weightOf(organizationId) / weightOfKind : 0;
    const annualRevenue = market.annualSales * share;
    const annualOtherCosts = otherCostsAtSales(facts, {
      ...existing,
      annualRevenue,
    });
    const interest = (existing.debt * realDebtRatePct) / 400;
    const privacy = privacyInitialOccurrence(
      facts,
      organizationId,
      facts.currentDate,
      existing.privacyComplianceOccurrences,
    );
    const privacyCost = privacy?.occurrence.initialCostDollars ?? 0;
    const net =
      annualRevenue / 4 -
      annualOtherCosts / 4 -
      quarterPay -
      interest -
      privacyCost;
    let cash = existing.cash + net;
    let debt = existing.debt;
    let bankId = existing.bankId;
    if (!bankId || banks[bankId]?.failed)
      bankId = lenderOf(banks, openBanks) ?? bankId;
    const bank = bankId ? banks[bankId] : undefined;
    const lineLimit =
      existing.lineLimit > 0 || !lends(bank, economy)
        ? existing.lineLimit
        : round2((existing.capacity * townCreditLineDays(kind)) / 365);
    if (cash < 0) {
      const room = Math.max(0, lineLimit - debt);
      if (honorsLine(bank) && room >= -cash) {
        debt += -cash;
        cash = 0;
      }
    } else if (debt > 0 && cash > 0) {
      const repay = Math.min(debt, cash / 2);
      debt -= repay;
      cash -= repay;
    }
    const next: TownBusinessBooks = {
      ...existing,
      cash: round2(cash),
      debt: round2(debt),
      lineLimit,
      annualRevenue: round2(annualRevenue),
      ownDemandLog: 0,
      lastQuarterPay: round2(quarterPay),
      price: prices.get(organizationId) ?? round6(priceLevel),
      bankId,
      lastQuarterNet: round2(net),
      lastQuarterPrivacyCost: round2(privacyCost),
      ...(privacy
        ? {
            privacyComplianceOccurrences: [
              ...(existing.privacyComplianceOccurrences ?? []),
              privacy.occurrence,
            ],
          }
        : {}),
      lawEffectStamps: [
        ...(existing.lawEffectStamps ?? []),
        ...(privacy?.stamps ?? []),
      ],
      lastRound: round,
    };
    books[organizationId] = next;
    if (cash < 0 && !exempt.has(organizationId)) {
      const why = !bank
        ? "no-line"
        : bank.failed
          ? "bank-failed"
          : !honorsLine(bank) || lineLimit === 0
            ? "bank-refused"
            : "line-used-up";
      closing.push({
        organizationId,
        books: next,
        why,
        share,
        marketSales: market.annualSales,
      });
      if (bankId && debt > 0)
        pendingDefaults.set(bankId, (pendingDefaults.get(bankId) ?? 0) + debt);
    }
  }
  const B = TOWN_FINANCE_POLICY.bank;
  const householdDefaults = townHouseholdDefaults(
    facts,
    town,
    bankIds,
    books,
    banks,
  );
  const failing: {
    bankId: EntityId;
    cause: "insolvent" | "depositors-withdrew";
  }[] = [];
  for (const bankId of bankIds) {
    const bank = banks[bankId];
    if (!bank || bank.failed || bank.lastRound === round) continue;
    const businessDefaults = pendingDefaults.get(bankId) ?? 0;
    const households = householdDefaults.get(bankId) ?? {
      personIds: [],
      owed: 0,
    };
    const defaulted = businessDefaults + households.owed;
    const losses = defaulted * MACRO_CREDIT_POLICY.chargeOff.lossGivenDefault;
    const earnings = (bank.loans * MACRO_CREDIT_POLICY.bank.earningsRate) / 4;
    let capital = bank.capital + earnings - losses;
    const businessLoans = Object.values(books)
      .filter((row) => row.bankId === bankId && !pendingClosed(closing, row))
      .reduce((sum, row) => sum + row.debt, 0);
    const lending = lends(bank, economy);
    let loans = bank.loans - defaulted;
    if (lending)
      loans *= Math.exp(
        (economy.lendingGrowthPct - economy.inflationPct - economy.trendPct) /
          400,
      );
    loans = Math.max(0, loans);
    let deposits = bank.deposits * demandGrowth;
    let liquid =
      bank.liquid +
      (deposits - bank.deposits) +
      (bank.shape.cushion * deposits - bank.liquid) *
        B.cushionRebuildPerQuarter;
    let runAt = bank.runAt;
    let cause: "insolvent" | "depositors-withdrew" | null = null;
    const assets = Math.max(0, liquid) + loans;
    const ratio = assets > 0 ? capital / assets : 0;
    if (ratio < B.frightCapitalRatio && runAt === null) {
      const withdrawals = deposits * uninsuredDepositShare(bank.shape);
      runAt = facts.currentDate;
      if (withdrawals > liquid) cause = "depositors-withdrew";
      deposits -= withdrawals;
      liquid -= withdrawals;
    }
    if (cause === null && ratio <= B.criticalCapitalRatio) cause = "insolvent";
    capital = round2(capital);
    banks[bankId] = {
      ...bank,
      deposits: round2(Math.max(0, deposits)),
      liquid: round2(liquid),
      loans: round2(loans),
      capital,
      businessLoans: round2(businessLoans),
      lastQuarterLosses: round2(losses),
      lastQuarterDefaults: {
        businesses: round2(businessDefaults),
        households: households.personIds.length,
        householdsOwed: round2(households.owed),
      },
      chargedOff: [...(bank.chargedOff ?? []), ...households.personIds],
      runAt,
      lastRound: round,
    };
    if (cause) failing.push({ bankId, cause });
  }
  const taxableSales = { ...(store.taxableSales ?? {}) };
  const salesThen = [...taxableBefore.values()].reduce((a, b) => a + b, 0);
  const salesNow = [...taxableBefore.keys()].reduce(
    (sum, key) =>
      sum + (markets[key]?.annualSales ?? 0) - (coverage.get(key) ?? 0),
    0,
  );
  if (taxableSales[town] === undefined) {
    if (Object.values(markets).some((market) => market.town === town))
      taxableSales[town] = 1;
  } else if (salesThen > 0)
    taxableSales[town] = round6((taxableSales[town]! * salesNow) / salesThen);
  let next: FinanceFacts = {
    ...facts,
    townFinances: {
      version: TOWN_FINANCES_VERSION,
      businesses: books,
      banks,
      markets,
      basePriceIndex,
      taxableSales,
    },
  };
  for (const { bankId, cause } of failing)
    next = yield* failTownBank(next, town, bankId, cause);
  next = yield* recordTownSalesReceipts(
    next,
    town,
    since,
    facts.currentDate,
    round,
    priceLevel,
  );
  return { facts: next, closing };
}
function pendingClosed(
  closing: TownFinanceQuarter["closing"],
  row: TownBusinessBooks,
): boolean {
  return closing.some((entry) => entry.organizationId === row.organizationId);
}
const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;
function activeJobsAt(
  facts: FinanceFacts,
  organizationId: EntityId,
): {
  relationshipId: EntityId;
  status: WorkStatusRecord;
}[] {
  const ours = new Set(
    facts.records.workRelationships
      .filter((row) => row.organizationId === organizationId)
      .map((row) => row.id),
  );
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of facts.records.workStatuses)
    if (
      ours.has(status.workRelationshipId) &&
      status.effectiveAt <= facts.currentDate
    )
      latest.set(status.workRelationshipId, status);
  return [...latest]
    .filter(([, status]) => status.status === "active")
    .map(([relationshipId, status]) => ({ relationshipId, status }));
}
function* closeOrganization(
  facts: FinanceFacts,
  organizationId: EntityId,
  stableKey: string,
  reason: string,
  jobReason: string,
): Generator<
  FinanceEffectRequest,
  {
    facts: FinanceFacts;
    jobsLost: number;
  },
  FinanceFacts
> {
  const provenance = {
    kind: "generated" as const,
    generatorKey: TOWN_FINANCES_VERSION,
  };
  const profile = organizationProfileAt(facts, organizationId)!;
  let next = yield financeEffectRequest("recordOrganizationProfile", facts, {
    stableKey: `${stableKey}:closed`,
    organizationId,
    effectiveAt: facts.currentDate,
    name: profile.name,
    classification: profile.classification,
    locationJurisdictionId: profile.locationJurisdictionId,
    provenance,
    supersedesProfileId: profile.id,
    closed: { reason },
  });
  const jobs = activeJobsAt(next, organizationId);
  for (const job of jobs)
    next = yield financeEffectRequest("recordTownJobLoss", next, {
      stableKey: `${stableKey}:job-ended:${job.relationshipId}`,
      workRelationshipId: job.relationshipId,
      effectiveAt: next.currentDate,
      status: "ended",
      reason: jobReason,
      supersedesStatusId: job.status.id,
      provenance,
    });
  return { facts: next, jobsLost: jobs.length };
}
// STOPGAP: economy.finance-household-default-cohort
function townHouseholdDefaults(
  facts: FinanceFacts,
  town: EntityId,
  bankIds: readonly EntityId[],
  books: Readonly<Record<EntityId, TownBusinessBooks>>,
  banks: Readonly<Record<EntityId, TownBankBooks>>,
): Map<
  EntityId,
  {
    personIds: EntityId[];
    owed: number;
  }
> {
  const result = new Map<
    EntityId,
    {
      personIds: EntityId[];
      owed: number;
    }
  >();
  const open = bankIds.filter((id) => banks[id] && !banks[id]!.failed);
  if (open.length === 0) return result;
  const today = facts.currentDate;
  const dueBy = addDays(
    today,
    -(
      TOWN_FINANCE_POLICY.bank.unemploymentBenefitDays +
      TOWN_FINANCE_POLICY.bank.chargeOffDaysPastDue
    ),
  );
  const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:job:`;
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const row of facts.records.workStatuses)
    if (row.effectiveAt <= today) latest.set(row.workRelationshipId, row);
  const working = new Set<EntityId>();
  const relationships = new Map<EntityId, WorkRelationship>();
  for (const row of facts.records.workRelationships) {
    relationships.set(row.id, row);
    if (latest.get(row.id)?.status === "active") working.add(row.personId);
  }
  const lastLost = new Map<
    EntityId,
    {
      at: IsoDate;
      organizationId: EntityId | null;
    }
  >();
  for (const personId of facts.personOrder) {
    if (facts.people[personId]?.homeJurisdictionId !== town) continue;
    for (const status of jobsLostBy(facts, personId, today)) {
      const row = relationships.get(status.workRelationshipId);
      if (!row?.stableKey.startsWith(stem)) continue;
      const before = lastLost.get(personId);
      if (!before || before.at < status.effectiveAt)
        lastLost.set(personId, {
          at: status.effectiveAt,
          organizationId: row.organizationId,
        });
    }
  }
  const charged = new Set(open.flatMap((id) => banks[id]!.chargedOff ?? []));
  const dead = new Set(facts.records.personDeaths.map((row) => row.personId));
  const borrowers = activeTownJobs(facts, town).length;
  const defaulting = [...lastLost]
    .filter(
      ([personId, lost]) =>
        !working.has(personId) &&
        !charged.has(personId) &&
        !dead.has(personId) &&
        facts.people[personId]?.homeJurisdictionId === town &&
        lost.at <= dueBy,
    )
    .sort(([a], [b]) => a.localeCompare(b));
  const everyone = borrowers + defaulting.length;
  if (everyone === 0) return result;
  for (const [personId, lost] of defaulting) {
    const lender =
      (lost.organizationId && books[lost.organizationId]?.bankId) ||
      lenderOf(banks, open)!;
    const bankId = open.includes(lender) ? lender : lenderOf(banks, open)!;
    const bank = banks[bankId]!;
    const householdLoans = Math.max(0, bank.loans - bank.businessLoans);
    const entry = result.get(bankId) ?? { personIds: [], owed: 0 };
    entry.personIds.push(personId);
    entry.owed += householdLoans / everyone;
    result.set(bankId, entry);
  }
  return result;
}
function lossesSentence(bank: TownBankBooks): string {
  const d = bank.lastQuarterDefaults;
  const parts: string[] = [];
  if (d && d.households > 0)
    parts.push(
      `${d.households} ${d.households === 1 ? "household" : "households"} whose earners had been out of work past their unemployment benefits owed it ${formatDollars(d.householdsOwed)}`,
    );
  if (d && d.businesses > 0)
    parts.push(`businesses that closed owed it ${formatDollars(d.businesses)}`);
  return parts.length > 0
    ? `It lost ${formatDollars(bank.lastQuarterLosses)} on loans last quarter: ${parts.join(", and ")}.`
    : `It lost ${formatDollars(bank.lastQuarterLosses)} on loans last quarter.`;
}
// STOPGAP: economy.finance-bank-failure-native-English
function* failTownBank(
  facts: FinanceFacts,
  town: EntityId,
  bankId: EntityId,
  cause: "insolvent" | "depositors-withdrew",
): Generator<FinanceEffectRequest, FinanceFacts, FinanceFacts> {
  const bank = facts.townFinances!.banks[bankId]!;
  const bankDepositsMinor = Math.round(bank.deposits * 100);
  const townDepositsMinor = townBanks(facts, town).reduce((sum, id) => {
    const books = facts.townFinances!.banks[id];
    return (
      sum + (books && !books.failed ? Math.round(books.deposits * 100) : 0)
    );
  }, 0);
  const townJobs = activeTownJobs(facts, town).length;
  const name = organizationProfileAt(facts, bankId)?.name ?? "The town's bank";
  const stableKey = `${TOWN_FINANCES_VERSION}:${town}:bank-failed:${bankId}`;
  const closed = yield* closeOrganization(
    facts,
    bankId,
    stableKey,
    TOWN_FINANCE_CLOSING_REASONS.bankFailed,
    TOWN_BANK_JOB_END_REASON,
  );
  const ratio = capitalRatio(bank);
  const why =
    cause === "depositors-withdrew"
      ? `Its losses left capital of ${(ratio * 100).toFixed(1)} percent of its assets, depositors without insurance asked for more than the ${formatDollars(Math.max(0, bank.liquid + bank.deposits * uninsuredDepositShare(bank.shape)))} it could pay out, and it could not pay them.`
      : `Its losses left capital of ${(ratio * 100).toFixed(1)} percent of its assets, and regulators closed it as the law requires below 2 percent.`;
  const summary = [
    `${name} failed.`,
    why,
    lossesSentence(bank),
    closed.jobsLost
      ? `${closed.jobsLost} people who worked there lost their jobs.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  let next = yield financeEffectRequest("recordWorldEvent", closed.facts, {
    stableKey,
    type: BANK_FAILED_EVENT,
    occurredAt: closed.facts.currentDate,
    recordedAt: closed.facts.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [bankId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      TOWN_FINANCES_VERSION,
      `cause:${cause}`,
      `organization:${bankId}`,
      `capital-ratio:${round6(ratio)}`,
      `losses:${bank.lastQuarterLosses}`,
      "deposit-currency:USD",
      `bank-deposits-minor:${bankDepositsMinor}`,
      `town-deposits-minor:${townDepositsMinor}`,
      `household-defaults:${bank.lastQuarterDefaults?.households ?? 0}`,
      `business-defaults:${bank.lastQuarterDefaults?.businesses ?? 0}`,
      `jobs:${closed.jobsLost}`,
      `town-jobs:${townJobs}`,
      `shape:${bank.shape.state ?? "national"}:${bank.shape.index}:${FDIC_SMALL_BANK_REPORT_DATE}`,
    ],
    summary,
    context: CONTEXT,
  });
  const eventId = next.records.events.at(-1)!.id;
  const store = next.townFinances!;
  next = {
    ...next,
    townFinances: {
      ...store,
      banks: {
        ...store.banks,
        [bankId]: {
          ...store.banks[bankId]!,
          failed: { at: next.currentDate, eventId, cause },
        },
      },
    },
  };
  return next;
}
const percent = (share: number) => `${Math.round(share * 100)}%`;
const KIND_NAMES: Readonly<Record<string, string>> = {
  farm: "farms",
  quarry: "quarries",
  construction: "builders",
  manufacturing: "factories",
  wholesale: "wholesalers",
  retail: "stores",
  trucking: "trucking firms",
  information: "media and tech firms",
  insurance: "insurance agencies",
  realty: "real estate offices",
  professional: "professional offices",
  "building-services": "building services firms",
  "private-school": "private schools",
  clinic: "clinics",
  "care-home": "care homes",
  recreation: "recreation businesses",
  restaurant: "restaurants",
  inn: "inns",
  repair: "repair shops",
  "personal-care": "salons and barbershops",
};
function kindPlural(kind: string): string {
  return KIND_NAMES[kind] ?? "businesses like it";
}
// STOPGAP: economy.finance-business-closing-native-English
export function* closeBusinessesOutOfCash(
  facts: FinanceFacts,
  town: EntityId,
  closing: TownFinanceQuarter["closing"],
  prefix: string,
): Generator<FinanceEffectRequest, FinanceFacts, FinanceFacts> {
  let next = facts;
  const townJobs = activeTownJobs(facts, town).length;
  for (const { organizationId, books, why, share, marketSales } of closing) {
    const name =
      organizationProfileAt(next, organizationId)?.name ?? "A business";
    const stableKey = `${prefix}close:${organizationId}`;
    const closed = yield* closeOrganization(
      next,
      organizationId,
      stableKey,
      TOWN_FINANCE_CLOSING_REASONS.ranOutOfCash,
      TOWN_JOB_END_REASONS.businessClosed,
    );
    const bankName = books.bankId
      ? (organizationProfileAt(next, books.bankId)?.name ?? "its bank")
      : null;
    const credit =
      why === "no-line"
        ? "It had no bank to borrow from."
        : why === "bank-failed"
          ? `${bankName} had failed.`
          : why === "bank-refused"
            ? `${bankName} was not lending.`
            : `It had used up its ${formatDollars(books.lineLimit)} line of credit at ${bankName}.`;
    const spending = marketSales / Math.max(1, books.openingMarketSales) - 1;
    const openingQuarterPay =
      (books.capacity * (1 - books.margin) - books.annualOtherCosts) / 4;
    const payRose =
      books.lastQuarterPay !== undefined && openingQuarterPay > 0
        ? books.lastQuarterPay / openingQuarterPay - 1
        : 0;
    const causes = [
      {
        tag: "competition",
        size: share / Math.max(1e-9, books.openingShare) - 1,
        text: `Other ${kindPlural(books.kind)} in town took its customers: its share of the town's spending on them fell from ${percent(books.openingShare)} to ${percent(share)}.`,
      },
      {
        tag: "town-spending",
        size: spending,
        text: `The town spent ${percent(-spending)} less on ${kindPlural(books.kind)} than when it opened.`,
      },
      {
        tag: "pay-rose",
        size: -payRose,
        text: `Its pay bill had risen ${percent(payRose)} since it opened.`,
      },
    ]
      .filter((cause) => cause.size < -0.03)
      .sort((a, b) => a.size - b.size);
    const summary = [
      `${name} closed after its cash ran out: it spent ${formatDollars(-books.lastQuarterNet)} more than it took in last quarter.`,
      ...causes.map((cause) => cause.text),
      causes.length > 0
        ? ""
        : books.margin <= 0
          ? "It never took in enough to cover its costs."
          : "Its pay and other costs had come to outrun its sales.",
      credit,
      closed.jobsLost
        ? `${closed.jobsLost} ${closed.jobsLost === 1 ? "person" : "people"} lost ${closed.jobsLost === 1 ? "a job" : "their jobs"}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    next = yield financeEffectRequest("recordWorldEvent", closed.facts, {
      stableKey: `${stableKey}:event`,
      type: BUSINESS_CLOSED_EVENT,
      occurredAt: closed.facts.currentDate,
      recordedAt: closed.facts.currentDate,
      jurisdictionId: town,
      involvedEntityIds: [organizationId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        TOWN_FINANCES_VERSION,
        "cause:ran-out-of-cash",
        ...causes.map((cause) => `sales-fell:${cause.tag}`),
        `credit:${why}`,
        `kind:${books.kind}`,
        `organization:${organizationId}`,
        `jobs:${closed.jobsLost}`,
        `town-jobs:${townJobs}`,
        `debt:${books.debt}`,
        ...(books.bankId ? [`bank:${books.bankId}`] : []),
      ],
      summary,
      context: CONTEXT,
    });
  }
  return next;
}
export function* aggregateCustomers(
  facts: FinanceFacts,
  jurisdictionId: EntityId,
  formedAt: IsoDate = facts.currentDate,
): Generator<
  FinanceEffectRequest,
  {
    facts: FinanceFacts;
    organizationId: EntityId;
  },
  FinanceFacts
> {
  const stableKey = `local-customers:${jurisdictionId}`;
  const existing = facts.records.organizations.find(
    (organization) => organization.stableKey === stableKey,
  );
  if (existing) return { facts, organizationId: existing.id };
  const next = yield financeEffectRequest("createOrganization", facts, {
    stableKey,
    formedAt,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "An aggregate counterparty for what a town's customers spend at its businesses. The game has no individual shoppers and does not pretend to model them.",
    },
    initialProfile: {
      name: "Local customers",
      classification: "custom:aggregate-customers",
      locationJurisdictionId: jurisdictionId,
    },
  });
  return { facts: next, organizationId: next.records.organizations.at(-1)!.id };
}
export interface TownJob {
  readonly relationshipId: EntityId;
  readonly personId: EntityId;
  readonly status: WorkStatusRecord;
}
export function activeTownJobs(
  facts: FinanceFacts,
  town: EntityId,
): readonly TownJob[] {
  const prefix = `${TOWN_EMPLOYMENT_VERSION}:${town}:job:`;
  const ours = new Map<EntityId, EntityId>();
  for (const relationship of facts.records.workRelationships)
    if (relationship.stableKey.startsWith(prefix))
      ours.set(relationship.id, relationship.personId);
  if (ours.size === 0) return [];
  const latest = new Map<EntityId, WorkStatusRecord>();
  for (const status of facts.records.workStatuses)
    if (
      ours.has(status.workRelationshipId) &&
      status.effectiveAt <= facts.currentDate
    )
      latest.set(status.workRelationshipId, status);
  const jobs: TownJob[] = [];
  for (const [relationshipId, status] of latest)
    if (status.status === "active")
      jobs.push({
        relationshipId,
        personId: ours.get(relationshipId)!,
        status,
      });
  return jobs;
}
export function acuteWeight(
  halfLifeDays: number,
  happenedAt: IsoDate,
  asOf: IsoDate,
): number {
  const age = daysBetween(happenedAt, asOf);
  return age < 0 ? 0 : Math.pow(0.5, age / halfLifeDays);
}

function workStatusAt(facts: FinanceFacts, id: EntityId) {
  return receipt(facts.lifeStatuses, id);
}
function workRoleAt(facts: FinanceFacts, id: EntityId) {
  return receipt(facts.lifeRoles, id);
}
function resourcePositionsOf(
  facts: FinanceFacts,
  ...args: Parameters<typeof ownPositions> extends [unknown, ...infer R]
    ? R
    : never
) {
  return ownPositions(cashFacts(facts), ...args);
}
const WORKPLACE = new Map(TOWN_WORKPLACES.map((row) => [row.key, row]));
export function townWorkplaceFor(
  organizationStableKey: string,
  classification: string | null,
): Workplace | null {
  const employer = /:employer:([a-z-]+):\d+$/.exec(organizationStableKey);
  if (employer) return WORKPLACE.get(employer[1]!) ?? null;
  return (
    TOWN_WORKPLACES.find(
      (workplace) =>
        workplace.existing && workplace.existing === classification,
    ) ?? null
  );
}
export function resourceFlowTermsHistory(
  facts: FinanceFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): readonly ResourceFlowTermsRecord[] {
  return recordsWithFieldValue(
    facts.records.resourceFlowTerms,
    "resourceFlowId",
    resourceFlowId,
  ).filter((record) => available(record, cutoff));
}

export function resourceFlowTermsAt(
  facts: FinanceFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): ResourceFlowTermsRecord | undefined {
  return resourceFlowTermsHistory(facts, resourceFlowId, cutoff).at(-1);
}

function available(
  record: {
    readonly effectiveAt: string;
    readonly sequence: number;
  },
  cutoff: HistoricalCutoff,
): boolean {
  return availableOn(record, record.effectiveAt, cutoff);
}

function availableOn(
  record: {
    readonly sequence: number;
  },
  date: string,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    date <= cutoff.asOfDate && record.sequence < cutoff.historySequenceExclusive
  );
}
export type OpeningEmployerCashEstimate =
  | {
      readonly status: "blocked";
      readonly reason:
        "missing-employer-profile" | "empty-comparable-cash-cohort";
    }
  | {
      readonly status: "estimated";
      readonly amount: MoneyAmount;
      readonly donors: readonly {
        readonly organizationId: EntityId;
        readonly profileId: EntityId;
        readonly positionId: EntityId;
        readonly outcomeIds: readonly EntityId[];
        readonly spendableMinorUnits: number;
      }[];
      readonly note: string;
    };
export function readOpeningEmployerCashEstimate(
  facts: FinanceFacts,
  organizationId: EntityId,
  currency: CurrencyCode,
): OpeningEmployerCashEstimate {
  const target = organizationProfileAt(facts, organizationId);
  if (!target || target.closed)
    return { status: "blocked", reason: "missing-employer-profile" };
  const employers = new Set(
    facts.records.workRelationships
      .filter(
        (work) =>
          work.compensation === "paid" &&
          work.startedAt <= facts.currentDate &&
          workStatusAt(facts, work.id)?.status === "active",
      )
      .map((work) => work.organizationId),
  );
  const donors = facts.records.organizations.flatMap((organization) => {
    if (
      organization.id === organizationId ||
      organization.formedAt > facts.currentDate ||
      !employers.has(organization.id)
    )
      return [];
    const profile = organizationProfileAt(facts, organization.id);
    if (
      !profile ||
      profile.closed ||
      profile.classification !== target.classification
    )
      return [];
    const cash = resourcePositionAt(
      facts,
      { kind: "organization", organizationId: organization.id },
      currency,
    );
    if (!cash) return [];
    return [
      {
        organizationId: organization.id,
        profileId: profile.id,
        positionId: cash.positionId,
        outcomeIds: cash.outcomeIds,
        spendableMinorUnits: Math.max(0, cash.liquidBalance.minorUnits),
      },
    ];
  });
  if (!donors.length)
    return { status: "blocked", reason: "empty-comparable-cash-cohort" };
  const mean = Math.round(
    donors.reduce(
      (sum, donor) => sum + donor.spendableMinorUnits / donors.length,
      0,
    ),
  );
  return {
    status: "estimated",
    amount: money(mean, currency),
    donors,
    note: `ESTIMATED FROM AVERAGE: ${donors.length} active paid employers with saved classification ${target.classification}; current recorded spendable ${currency} cash, each employer counted once. Negative balances supply zero spendable cash. Source positions: ${donors.map((donor) => donor.positionId).join(", ")}. No cash written or payment recorded.`,
  };
}
// STOPGAP: economy.employer-later-classification-place-mean
function readStaffedPlaceEmployerCashEstimate(
  facts: FinanceFacts,
  organizationId: EntityId,
  currency: CurrencyCode,
): OpeningEmployerCashEstimate {
  const targetProfile = organizationProfileAt(facts, organizationId);
  if (!targetProfile || targetProfile.closed)
    return { status: "blocked", reason: "missing-employer-profile" };
  const activePaid = facts.records.workRelationships.filter(
    (work) =>
      work.organizationId &&
      work.compensation === "paid" &&
      work.startedAt <= facts.currentDate &&
      workStatusAt(facts, work.id)?.status === "active",
  );
  const targetStaff = activePaid.filter(
    (work) => work.organizationId === organizationId,
  );
  const targetPlaces = targetProfile.locationJurisdictionId
    ? [targetProfile.locationJurisdictionId]
    : targetStaff.flatMap((work) => {
        const role = workRoleAt(facts, work.id);
        const jurisdictionId =
          role?.locationJurisdictionId ??
          role?.timeDemand.locationJurisdictionId ??
          facts.people[work.personId]?.homeJurisdictionId ??
          null;
        return jurisdictionId ? [jurisdictionId] : [];
      });
  if (!targetPlaces.length)
    return { status: "blocked", reason: "empty-comparable-cash-cohort" };
  const targetStateKeys = new Set(
    targetPlaces.flatMap((id) => {
      const key = lifePlaceByJurisdictionId(id)?.stateJurisdictionKey;
      return key ? [key] : [];
    }),
  );
  const placeMatches = (candidateId: EntityId | null): boolean => {
    if (!candidateId) return false;
    if (targetPlaces.includes(candidateId)) return true;
    const key = lifePlaceByJurisdictionId(candidateId)?.stateJurisdictionKey;
    return !!key && targetStateKeys.has(key);
  };
  const donorOrganizations = new Set(
    activePaid
      .filter((work) => work.organizationId !== organizationId)
      .map((work) => work.organizationId!),
  );
  const donors = [...donorOrganizations].flatMap((donorId) => {
    const organization = facts.records.organizations.find(
      (row) => row.id === donorId && row.formedAt <= facts.currentDate,
    );
    const profile = organizationProfileAt(facts, donorId);
    if (!organization || !profile || profile.closed) return [];
    const donorWork = activePaid.filter(
      (work) => work.organizationId === donorId,
    );
    const donorPlaces = profile.locationJurisdictionId
      ? [profile.locationJurisdictionId]
      : donorWork.flatMap((work) => {
          const role = workRoleAt(facts, work.id);
          const jurisdictionId =
            role?.locationJurisdictionId ??
            role?.timeDemand.locationJurisdictionId ??
            facts.people[work.personId]?.homeJurisdictionId ??
            null;
          return jurisdictionId ? [jurisdictionId] : [];
        });
    if (!donorPlaces.some(placeMatches)) return [];
    const cash = resourcePositionAt(
      facts,
      { kind: "organization", organizationId: donorId },
      currency,
    );
    if (!cash) return [];
    return [
      {
        organizationId: donorId,
        profileId: profile.id,
        positionId: cash.positionId,
        outcomeIds: cash.outcomeIds,
        spendableMinorUnits: Math.max(0, cash.liquidBalance.minorUnits),
      },
    ];
  });
  if (!donors.length)
    return { status: "blocked", reason: "empty-comparable-cash-cohort" };
  const mean = Math.round(
    donors.reduce(
      (sum, donor) => sum + donor.spendableMinorUnits / donors.length,
      0,
    ),
  );
  const placeDescription = targetProfile.locationJurisdictionId
    ? `recorded employer place ${targetProfile.locationJurisdictionId}`
    : `recorded worker home jurisdiction(s) ${targetPlaces.join(", ")} because the employer worksite is unknown`;
  return {
    status: "estimated",
    amount: money(mean, currency),
    donors,
    note: `ESTIMATED FROM AVERAGE: ${donors.length} active paid employers with saved staff and cash in a comparable place to ${placeDescription}; current recorded spendable ${currency} cash, each employer counted once. Negative balances supply zero spendable cash. Source positions: ${donors.map((donor) => donor.positionId).join(", ")}. No cash written or payment recorded.`,
  };
}
const annualPeriods: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  annual: 1,
};
// STOPGAP: economy.employer-opening-payroll-buffer
export function* ensureEmployerCashPositions(
  facts: FinanceFacts,
  phase: "opening" | "later",
  onlyOrganizations?: ReadonlySet<EntityId>,
): Generator<FinanceEffectRequest, FinanceFacts, FinanceFacts> {
  const USD = makeCurrencyCode("USD");
  const payroll = new Map<
    EntityId,
    {
      annualMinor: number;
      flowIds: EntityId[];
      termsIds: EntityId[];
    }
  >();
  const works = new Map(
    facts.records.workRelationships.map((work) => [work.id, work]),
  );
  for (const flow of facts.records.resourceFlows) {
    if (
      flow.basisKind !== "compensation:work" ||
      flow.basisReference.kind !== "work" ||
      flow.source.kind !== "organization" ||
      flow.startsAt > facts.currentDate
    )
      continue;
    const work = works.get(flow.basisReference.workRelationshipId);
    if (
      !work ||
      work.compensation !== "paid" ||
      workStatusAt(facts, work.id)?.status !== "active"
    )
      continue;
    const terms = resourceFlowTermsAt(facts, flow.id);
    if (
      !terms ||
      terms.status !== "active" ||
      terms.amount.currency !== USD ||
      terms.amount.minorUnits <= 0
    )
      continue;
    const cadence =
      /^schedule:(?:town-)?(weekly|biweekly|semimonthly|monthly|annual)(?:-\d+)?$/.exec(
        terms.cadenceKind,
      );
    let periods = cadence ? annualPeriods[cadence[1]!]! : null;
    if (terms.cadenceKind === "work:completed-shift") {
      const pathId = /^employment:life-paths2-(.+)$/.exec(work.kind)?.[1];
      const role = workRoleAt(facts, work.id);
      const path = pathId
        ? LIFE_PATHS2_CATALOG.find((entry) => entry.id === pathId)
        : null;
      if (role && path?.kind === "work" && path.sessionMinutes > 0) {
        const hours = role.timeDemand.expectedWeekly;
        const weeklyHours = (hours.minimumHours + hours.maximumHours) / 2;
        if (Number.isFinite(weeklyHours) && weeklyHours > 0)
          periods = (weeklyHours / (path.sessionMinutes / 60)) * 52;
      }
    }
    if (periods === null) {
      if (terms.cadenceKind !== "work:completed-shift")
        throw new Error(
          `No recorded calendar conversion for employer payroll cadence ${terms.cadenceKind}.`,
        );
      if (phase === "opening") continue;
    }
    const row = payroll.get(flow.source.organizationId) ?? {
      annualMinor: 0,
      flowIds: [],
      termsIds: [],
    };
    if (periods !== null) row.annualMinor += terms.amount.minorUnits * periods;
    row.flowIds.push(flow.id);
    row.termsIds.push(terms.id);
    payroll.set(flow.source.organizationId, row);
  }
  const year = yearOf(facts.currentDate);
  const daysInYear = daysBetween(
    isoDateFromParts(year, 1, 1),
    isoDateFromParts(year + 1, 1, 1),
  );
  return yield* (function* (): Generator<
    FinanceEffectRequest,
    FinanceFacts,
    FinanceFacts
  > {
    let next = facts;
    for (const [organizationId, pay] of payroll) {
      if (onlyOrganizations && !onlyOrganizations.has(organizationId)) continue;
      const owner = { kind: "organization" as const, organizationId };
      if (
        resourcePositionsOf(facts, owner).some(
          (position) => position.openingBalance.currency === USD,
        )
      )
        continue;
      const organization = facts.records.organizations.find(
        (row) => row.id === organizationId,
      );
      const profile = organizationProfileAt(facts, organizationId);
      if (!organization || !profile || profile.closed) continue;
      let amount: MoneyAmount;
      let note: string;
      if (phase === "later") {
        const classificationPeer = readOpeningEmployerCashEstimate(
          facts,
          organizationId,
          USD,
        );
        const peer =
          classificationPeer.status === "estimated"
            ? classificationPeer
            : classificationPeer.reason === "empty-comparable-cash-cohort"
              ? readStaffedPlaceEmployerCashEstimate(facts, organizationId, USD)
              : classificationPeer;
        if (peer.status === "blocked") continue;
        amount = peer.amount;
        note = `ESTIMATED OPENING STOCK recorded before payroll settlement. ${peer.note.replace("No cash written or payment recorded.", "This estimate records opening stock only; no transfer or payment was recorded.")}`;
      } else {
        const kind =
          townWorkplaceFor(organization.stableKey, profile.classification)
            ?.key ??
          TOWN_WORKPLACES.find(
            (place) => place.classification === profile.classification,
          )?.key ??
          "*";
        const costs = townBusinessKindBooks(facts, kind);
        const annualRevenueMinor = pay.annualMinor / costs.payShare;
        const annualOtherCostsMinor = Math.max(
          0,
          annualRevenueMinor * (1 - costs.margin) - pay.annualMinor,
        );
        const industries: Readonly<Record<string, string>> =
          cashBuffers.industryByClassification;
        const medians: Readonly<Record<string, number>> =
          cashBuffers.medianDaysByIndustry;
        const industry =
          industries[profile.classification] ?? "all-small-businesses";
        const bufferDays = medians[industry]!;
        const minor = Math.round(
          ((pay.annualMinor + annualOtherCostsMinor) / daysInYear) * bufferDays,
        );
        if (!Number.isSafeInteger(minor) || minor <= 0)
          throw new Error(
            `Invalid sourced employer opening cash for ${organizationId}.`,
          );
        amount = money(minor, USD);
        note = `ESTIMATED OPENING STOCK: own recorded monthly payroll ${pay.annualMinor / 12} USD minor units plus estimated monthly other costs ${annualOtherCostsMinor / 12}, multiplied by 12/${daysInYear} calendar days and ${bufferDays} median cash-buffer days (${industry}). ${cashBuffers.source}, ${cashBuffers.citation}; ${cashBuffers.url}. ${cashBuffers.definition} Other costs reuse IRS 2022 Table 5.1 ${costs.industry}: payShare=${costs.payShare}, margin=${costs.margin}. ${industry === "all-small-businesses" ? cashBuffers.fallbackMethod : "Saved classification matches named source industry."} Saved payroll flows ${pay.flowIds.join(", ")}; terms ${pay.termsIds.join(", ")}; profile ${profile.id}. No wage payment, revenue or tax receipt recorded.`;
      }
      next = yield financeEffectRequest("createResourcePosition", next, {
        stableKey: `employer-cash:${organizationId}:USD`,
        owner,
        openedAt: facts.currentDate,
        openingBalance: amount,
        provenance: { kind: "authored", note },
      });
    }
    if (phase === "opening") {
      // STOPGAP: economy.employer-opening-subset-cohort-frontier
      const cohortWorld = next;
      const employers = new Set(
        cohortWorld.records.workRelationships
          .filter(
            (work) =>
              work.compensation === "paid" &&
              work.startedAt <= cohortWorld.currentDate &&
              workStatusAt(cohortWorld, work.id)?.status === "active",
          )
          .map((work) => work.organizationId),
      );
      for (const organizationId of employers) {
        if (!organizationId) continue;
        const owner = { kind: "organization" as const, organizationId };
        if (
          resourcePositionsOf(cohortWorld, owner).some(
            (position) => position.openingBalance.currency === USD,
          )
        )
          continue;
        const peer = readOpeningEmployerCashEstimate(
          cohortWorld,
          organizationId,
          USD,
        );
        if (peer.status === "blocked") continue;
        next = yield financeEffectRequest("createResourcePosition", next, {
          stableKey: `employer-cash:${organizationId}:USD`,
          owner,
          openedAt: cohortWorld.currentDate,
          openingBalance: peer.amount,
          provenance: {
            kind: "authored",
            note: `ESTIMATED OPENING STOCK from the recorded classification cohort. ${peer.note}`,
          },
        });
      }
    }
    return phase === "opening"
      ? yield* ensureTownOpeningBusinessBooks(
          next,
          new Map([...payroll].map(([id, pay]) => [id, pay.annualMinor / 400])),
        )
      : next;
  })();
}
// STOPGAP: economy.employer-opening-book-receipts
export function* ensureTownOpeningBusinessBooks(
  facts: FinanceFacts,
  quarterPayByEmployer: ReadonlyMap<EntityId, number>,
): Generator<FinanceEffectRequest, FinanceFacts, FinanceFacts> {
  const priceIndex =
    facts.macroEconomy?.months
      .filter(
        (row) =>
          row.scope === "national" && row.recordedAt <= facts.currentDate,
      )
      .at(-1)?.priceIndex ??
    (facts.macroEconomy
      ? startState(facts.macroEconomy.start).priceIndex
      : undefined);
  if (priceIndex === undefined) return facts;
  const currency = makeCurrencyCode("USD");
  const store = facts.townFinances;
  const books = { ...(store?.businesses ?? {}) };
  const towns = new Set<EntityId>();
  const round = `opening:${facts.currentDate}`;
  for (const [organizationId, quarterPay] of quarterPayByEmployer) {
    if (!Number.isFinite(quarterPay))
      throw new Error("Opening books require finite recorded quarter-pay.");
    if (quarterPay <= 0) continue;
    const profile = organizationProfileAt(facts, organizationId);
    const organization = recordById(
      facts.records.organizations,
      organizationId,
    );
    if (
      !organization ||
      !profile ||
      profile.closed ||
      !profile.locationJurisdictionId
    )
      continue;
    const kind =
      townWorkplaceFor(organization.stableKey, profile.classification)?.key ??
      TOWN_WORKPLACES.find(
        (row) => row.classification === profile.classification,
      )?.key;
    if (!kind || !TOWN_BUSINESS_WORKPLACES.has(kind)) continue;
    if (!books[organizationId]) {
      const opened = openBusinessBooks(
        facts,
        organizationId,
        kind,
        quarterPay / (priceIndex / (store?.basePriceIndex ?? priceIndex)),
        null,
        round,
      );
      const cash = resourcePositionAt(
        facts,
        { kind: "organization", organizationId },
        currency,
      );
      books[organizationId] = {
        ...opened,
        cash: cash ? cash.liquidBalance.minorUnits / 100 : opened.cash,
      };
    }
    towns.add(profile.locationJurisdictionId);
  }
  if (!towns.size) return facts;
  let next: FinanceFacts = {
    ...facts,
    townFinances: {
      version: TOWN_FINANCES_VERSION,
      banks: store?.banks ?? {},
      markets: store?.markets ?? {},
      ...store,
      businesses: books,
      basePriceIndex: store?.basePriceIndex ?? priceIndex,
    },
  };
  for (const town of towns)
    next = yield* recordTownSalesReceipts(
      next,
      town,
      next.currentDate,
      next.currentDate,
      round,
      priceIndex / next.townFinances!.basePriceIndex!,
    );
  return next;
}
