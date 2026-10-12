/** Full retained household basket/source selection and ordered bill preparation/settlement math. Only raw facts and requests travel; existing writers materialize them. */
import { makeIsoDate } from "../../simulation/dates";
import {
  estimatedMonthlyHouseholdLivingCosts as sourceEstimate,
  type LivingCostFacts,
} from "./living-cost-means";
import {
  resourcePositionAt as cashPosition,
  type CashFacts,
} from "./cash-positions";
import { paymentFromDatedCash as datedPayment } from "./dated-cash";
import { growingIndex, type GrowingIndexKind } from "./raw-record-index";
import type {
  World,
  EntityId,
  IsoDate,
  ResourceFlow,
  ResourceTransferOutcome,
  ResourceEndpoint,
  HistoricalCutoff,
} from "../../simulation/types";
import type * as life from "../../simulation/life";
import type * as resources from "../../simulation/resources";
import type * as eventWrites from "../../simulation/world";
import type * as knowledge from "../../simulation/records";
import type { recordSalesTaxBases as nativeTaxBases } from "../../simulation/sales-tax-bases";
import type * as lifeQueries from "../../simulation/life-queries";
import type { resourceFlowTermsAt as nativeTerms } from "../../simulation/resource-queries";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import type { CensusRegion } from "../../simulation/world-setup/census-regions";
import type { OutcomeLink } from "../../simulation/outcome-web";
import type { LIVING_COSTS_CATEGORY_SOURCES as nativeSources } from "../../simulation/living-costs-category-data";
export interface CostFacts {
  readonly onDate: IsoDate;
  readonly control: World["control"];
  readonly people: World["people"];
  readonly personOrder: World["personOrder"];
  readonly records: Pick<
    World["history"],
    | "nextSequence"
    | "personDeaths"
    | "events"
    | "organizations"
    | "resourceFlows"
    | "resourceTransferOutcomes"
  >;
  readonly cash: CashFacts;
  readonly living: LivingCostFacts;
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly memberships: ReadonlyMap<
    string,
    ReturnType<typeof lifeQueries.householdMembershipsAt>
  >;
  readonly residents: ReadonlyMap<
    string,
    ReturnType<typeof lifeQueries.peopleInHouseholdAt>
  >;
  readonly locations: ReadonlyMap<
    string,
    ReturnType<typeof lifeQueries.householdLocationAt>
  >;
  readonly terms: ReadonlyMap<string, ReturnType<typeof nativeTerms>>;
  readonly outcomeKeys: ReadonlyMap<EntityId, string | null>;
  readonly censusRegions: ReadonlyMap<string, CensusRegion>;
  readonly sourceUrl: string;
  readonly sources: typeof nativeSources;
  readonly sourceAvailableBy: string;
  readonly currency: string;
}
export interface CostWriteInputs {
  createOrganization: Parameters<typeof life.createOrganization>[1];
  createResourcePosition: Parameters<
    typeof resources.createResourcePosition
  >[1];
  createResourceFlow: Parameters<typeof resources.createResourceFlow>[1];
  recordResourceFlowTerms: Parameters<
    typeof resources.recordResourceFlowTerms
  >[1];
  recordResourceTransferOutcome: Parameters<
    typeof resources.recordResourceTransferOutcome
  >[1];
  recordSalesTaxBases: Parameters<typeof nativeTaxBases>[1];
  recordWorldEvent: Parameters<typeof eventWrites.recordWorldEvent>[1];
  recordEventKnowledge: Parameters<typeof knowledge.recordEventKnowledge>[1];
}
export type CostWriteRequest = {
  [K in keyof CostWriteInputs]: {
    readonly op: K;
    readonly input: CostWriteInputs[K];
  };
}[keyof CostWriteInputs];
export type CostProcess = Generator<CostWriteRequest, CostFacts, CostFacts>;
function writeRequest<K extends keyof CostWriteInputs>(
  op: K,
  input: CostWriteInputs[K],
): CostWriteRequest {
  return { op, input } as CostWriteRequest;
}
export function costReceiptKey(id: EntityId, date: IsoDate, sequence: number) {
  return JSON.stringify([id, date, sequence]);
}
function readReceipt<T>(
  map: ReadonlyMap<string, T>,
  key: string,
  label: string,
): T {
  if (!map.has(key)) throw Error("Missing " + label + " receipt: " + key);
  return map.get(key)!;
}
function queryKey(facts: CostFacts, id: EntityId, cutoff?: HistoricalCutoff) {
  return costReceiptKey(
    id,
    cutoff?.asOfDate ?? facts.onDate,
    cutoff?.historySequenceExclusive ?? facts.records.nextSequence,
  );
}
function householdMembershipsAt(
  facts: CostFacts,
  id: EntityId,
  cutoff?: HistoricalCutoff,
) {
  return readReceipt(
    facts.memberships,
    queryKey(facts, id, cutoff),
    "membership",
  );
}
function peopleInHouseholdAt(
  facts: CostFacts,
  id: EntityId,
  cutoff?: HistoricalCutoff,
) {
  return readReceipt(facts.residents, queryKey(facts, id, cutoff), "residents");
}
function householdLocationAt(
  facts: CostFacts,
  id: EntityId,
  cutoff?: HistoricalCutoff,
) {
  return readReceipt(
    facts.locations,
    queryKey(facts, id, cutoff),
    "household location",
  );
}
function resourceFlowTermsAt(
  facts: CostFacts,
  id: EntityId,
  cutoff?: HistoricalCutoff,
) {
  return readReceipt(facts.terms, queryKey(facts, id, cutoff), "flow terms");
}
function resourcePositionAt(
  facts: CostFacts,
  owner: Parameters<typeof cashPosition>[1],
  currency: Parameters<typeof cashPosition>[2],
) {
  return cashPosition(facts.cash, owner, currency);
}
function paymentFromDatedCash(
  facts: CostFacts,
  ...args: Parameters<typeof datedPayment> extends [unknown, ...infer R]
    ? R
    : never
) {
  return datedPayment(facts.cash, ...args);
}
function lifePlaceByJurisdictionId(facts: CostFacts, id: EntityId) {
  return facts.places.get(id) ?? null;
}
import { money } from "./cost-money";
function estimatedMonthlyHouseholdLivingCosts(
  facts: CostFacts,
  region: LivingCostsRegion,
  size: number,
) {
  return sourceEstimate(facts.living, region, size);
}
export type LivingCostsRegion = CensusRegion | "national";
function livingCostsRegionForState(
  facts: CostFacts,
  stateKey: string | null,
): LivingCostsRegion {
  const state = stateKey?.startsWith("US-") ? stateKey.slice(3) : stateKey;
  return state && facts.censusRegions.has(state)
    ? facts.censusRegions.get(state)!
    : "national";
}
export function sameEndpoint(
  left: ResourceEndpoint,
  right: ResourceEndpoint,
): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "person":
      return right.kind === "person" && left.personId === right.personId;
    case "household":
      return (
        right.kind === "household" && left.householdId === right.householdId
      );
    case "organization":
      return (
        right.kind === "organization" &&
        left.organizationId === right.organizationId
      );
  }
}
function endpointKey(endpoint: ResourceEndpoint): string | null {
  switch (endpoint.kind) {
    case "person":
      return `person:${endpoint.personId}`;
    case "household":
      return `household:${endpoint.householdId}`;
    case "organization":
      return `organization:${endpoint.organizationId}`;
  }
  return null;
}
function pushPosition(
  index: Map<string, number[]>,
  key: string,
  position: number,
): void {
  const positions = index.get(key);
  if (positions) positions.push(position);
  else index.set(key, [position]);
}
const FLOW_POSITIONS_BY_ENDPOINT: GrowingIndexKind<Map<string, number[]>> = {
  create: () => new Map(),
  add: (index, record, position) => {
    const flow = record as ResourceFlow;
    const recipient = endpointKey(flow.recipient);
    const source = endpointKey(flow.source);
    if (recipient !== null) pushPosition(index, recipient, position);
    if (source !== null && source !== recipient)
      pushPosition(index, source, position);
  },
};
const OUTCOME_POSITIONS_BY_FLOW: GrowingIndexKind<Map<string, number[]>> = {
  create: () => new Map(),
  add: (index, record, position) =>
    pushPosition(
      index,
      (record as ResourceTransferOutcome).resourceFlowId,
      position,
    ),
};
export function resourceFlowsTouching(
  facts: CostFacts,
  endpoint: ResourceEndpoint,
): ResourceFlow[] {
  const key = endpointKey(endpoint);
  if (key === null) return [];
  const flows = facts.records.resourceFlows;
  const positions =
    growingIndex(FLOW_POSITIONS_BY_ENDPOINT, flows).get(key) ?? [];
  return positions.map((position) => flows[position]!);
}
export function resourceTransferOutcomesOfFlows(
  facts: CostFacts,
  flowIds: Iterable<EntityId>,
): ResourceTransferOutcome[] {
  const outcomes = facts.records.resourceTransferOutcomes;
  const index = growingIndex(OUTCOME_POSITIONS_BY_FLOW, outcomes);
  const positions: number[] = [];
  for (const flowId of flowIds) {
    const found = index.get(flowId);
    if (found) positions.push(...found);
  }
  positions.sort((left, right) => left - right);
  return positions.map((position) => outcomes[position]!);
}
export function drawnLinkSize(
  facts: CostFacts,
  link: Pick<OutcomeLink, "key" | "size" | "range" | "evidence"> &
    Partial<Pick<OutcomeLink, "sizeByPlace">>,
  jurisdictionId: EntityId,
): number {
  const own = link.sizeByPlace
    ? link.sizeByPlace[facts.outcomeKeys.get(jurisdictionId) ?? ""]
    : undefined;
  return own?.size ?? link.size ?? 0;
}
export const LIVING_COSTS_BASIS = "custom:living-costs" as const;
export const HOUSEHOLD_SHORTFALL_TAG = "life.opportunity:household-shortfall";
const SHORTFALL_ANSWER = "adult.household-money-shortfall";
// stopgapId: "economy.household-cost-settlement-cap"
const CATCH_UP_LIMIT_MONTHS = 240;
function flowKey(personId: EntityId): string {
  return `living-costs:${personId}`;
}
export function livingCostsFlowFor(
  facts: CostFacts,
  personId: EntityId,
): ResourceFlow | null {
  const householdId = primaryHouseholdId(facts, personId);
  const bills = householdBills(facts, personId);
  return (
    bills.find(
      (flow) =>
        flow.stableKey.startsWith(`${householdFlowKey(householdId)}:`) &&
        resourceFlowTermsAt(facts, flow.id)?.status === "active",
    ) ??
    bills.find(
      (flow) => resourceFlowTermsAt(facts, flow.id)?.status === "active",
    ) ??
    bills[0] ??
    resourceFlowsTouching(facts, { kind: "person", personId }).find(
      (flow) => flow.stableKey === flowKey(personId),
    ) ??
    null
  );
}
function primaryHouseholdId(
  facts: CostFacts,
  personId: EntityId,
  asOfDate = facts.onDate,
): EntityId | null {
  const homes = householdMembershipsAt(facts, personId, {
    asOfDate,
    historySequenceExclusive: facts.records.nextSequence,
  }).filter((entry) => entry.state.residenceRole === "primary");
  return homes.length === 1 ? homes[0]!.household.id : null;
}
// stopgapId: "economy.household-cost-average-basket"
export function estimatedHouseholdLivingCostsAt(
  facts: CostFacts,
  personId: EntityId,
  asOfDate = facts.onDate,
) {
  const householdId = primaryHouseholdId(facts, personId, asOfDate);
  if (!householdId) return null;
  const cutoff = {
    asOfDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
  const residents = new Set(
    peopleInHouseholdAt(facts, householdId, cutoff).filter(
      (id) =>
        householdMembershipsAt(facts, id, cutoff).some(
          (entry) =>
            entry.household.id === householdId &&
            entry.state.residenceRole === "primary",
        ) &&
        !facts.records.personDeaths.some(
          (death) => death.personId === id && death.diedAt <= asOfDate,
        ),
    ),
  );
  if (!residents.size) return null;
  const locationId =
    householdLocationAt(facts, householdId, cutoff)?.jurisdictionId ??
    facts.people[personId]!.homeJurisdictionId;
  const place = lifePlaceByJurisdictionId(facts, locationId);
  const estimate = estimatedMonthlyHouseholdLivingCosts(
    facts,
    livingCostsRegionForState(facts, place?.stateJurisdictionKey ?? null),
    residents.size,
  );
  const jurisdictionId = place?.context.jurisdiction.id ?? locationId;
  return {
    householdId,
    jurisdictionId,
    ...estimate,
    averageMonthlyMinor: estimate.monthlyMinor,
    monthlyMinor: Math.round(
      drawnLinkSize(
        facts,
        {
          key: `living-costs:household:${householdId}:size:${estimate.sizeColumn}`,
          size: estimate.monthlyMinor,
          evidence: "researched",
        },
        jurisdictionId,
      ),
    ),
  };
}
function livingCostsProvenance(facts: CostFacts) {
  return {
    kind: "source-record" as const,
    reference: `${facts.sources["consumer-unit-size"].url}#Table-1400; ${facts.sourceUrl}#Table-1800; 2024 Consumer Expenditure category means; conservative availability cutoff December 31, 2025. ESTIMATED FROM AVERAGE: household size category times regional/national category ratio, existing stable world spread; not observed household purchases. Missing recorded sellers use the R15 outside-sellers counterparty.`,
    asOf: makeIsoDate(facts.sourceAvailableBy),
  };
}
function householdFlowKey(householdId: EntityId | null): string {
  return `living-costs:household:${householdId}`;
}
function dollars(minor: number): string {
  return (minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
function householdBills(
  facts: CostFacts,
  personId: EntityId,
): readonly ResourceFlow[] {
  const householdId = primaryHouseholdId(facts, personId);
  if (!householdId) return [];
  const categoryBases = new Set(
    Object.keys(facts.living.categories).map(
      (key) => `${LIVING_COSTS_BASIS}.${key.toLowerCase()}`,
    ),
  );
  return resourceFlowsTouching(facts, {
    kind: "household",
    householdId,
  }).filter(
    (flow) =>
      flow.source.kind === "household" &&
      flow.source.householdId === householdId &&
      (flow.basisKind === LIVING_COSTS_BASIS ||
        categoryBases.has(flow.basisKind)) &&
      flow.startsAt <= facts.onDate &&
      resourceFlowTermsAt(facts, flow.id)?.cadenceKind === "schedule:monthly" &&
      !sameEndpoint(flow.source, flow.recipient),
  );
}
function payerIsControlled(facts: CostFacts, personId: EntityId): boolean {
  return (
    facts.control.kind === "person" &&
    facts.control.personId === personId &&
    !!facts.people[personId] &&
    !facts.records.personDeaths.some(
      (death) => death.personId === personId && death.diedAt <= facts.onDate,
    )
  );
}
function* endFlow(
  facts: CostFacts,
  flow: ResourceFlow,
  reason: string,
): CostProcess {
  const terms = resourceFlowTermsAt(facts, flow.id);
  if (!terms || terms.status !== "active") return facts;
  return yield writeRequest("recordResourceFlowTerms", {
    stableKey: `${flow.stableKey}:cutover:${facts.onDate}`,
    resourceFlowId: flow.id,
    effectiveAt: facts.onDate,
    status: "ended",
    amount: terms.amount,
    cadenceKind: terms.cadenceKind,
    reason,
    provenance: terms.provenance,
    supersedesTermsId: terms.id,
  });
}
const HOUSEHOLD_MOVE_REASON =
  "Household moved; outside-seller spending follows its current place prospectively.";
function* prepareHouseholdCosts(
  facts: CostFacts,
  personId: EntityId,
  reprice: boolean,
): CostProcess {
  if (!payerIsControlled(facts, personId)) return facts;
  const estimate = estimatedHouseholdLivingCostsAt(facts, personId);
  if (!estimate || facts.onDate < livingCostsProvenance(facts).asOf)
    return facts;
  let next = facts;
  for (const id of peopleInHouseholdAt(facts, estimate.householdId)) {
    if (primaryHouseholdId(facts, id) !== estimate.householdId) continue;
    const legacy = resourceFlowsTouching(facts, {
      kind: "person",
      personId: id,
    }).find((flow) => flow.stableKey === flowKey(id));
    if (legacy)
      next = yield* endFlow(
        next,
        legacy,
        "Household bills replace the personal nonhousing estimate prospectively.",
      );
  }
  const jurisdictionId = estimate.jurisdictionId;
  const fallbackPrefix = `${householdFlowKey(estimate.householdId)}:`;
  const baseKey = `${fallbackPrefix}${jurisdictionId}`;
  const householdFlows = resourceFlowsTouching(next, {
    kind: "household",
    householdId: estimate.householdId,
  });
  const firstVisit = householdFlows.find((flow) => flow.stableKey === baseKey);
  const firstTerms = firstVisit && resourceFlowTermsAt(next, firstVisit.id);
  const residence = householdLocationAt(next, estimate.householdId);
  const fallbackKey =
    firstVisit &&
    firstTerms?.status === "ended" &&
    firstTerms.reason === HOUSEHOLD_MOVE_REASON &&
    residence &&
    residence.sequence > firstVisit.sequence &&
    residence.effectiveAt >= firstVisit.startsAt
      ? `${baseKey}:residence:${residence.id}`
      : baseKey;
  for (const flow of householdBills(next, personId))
    if (
      flow.stableKey.startsWith(fallbackPrefix) &&
      flow.stableKey !== fallbackKey
    )
      next = yield* endFlow(next, flow, HOUSEHOLD_MOVE_REASON);
  const existing = householdFlows.find(
    (flow) => flow.stableKey === fallbackKey,
  );
  const providers = householdBills(next, personId).filter(
    (flow) =>
      !flow.stableKey.startsWith(fallbackPrefix) &&
      resourceFlowTermsAt(next, flow.id)?.status === "active",
  );
  const bundledProvider = providers.some(
    (flow) => flow.basisKind === LIVING_COSTS_BASIS,
  );
  const missing = bundledProvider
    ? []
    : estimate.categories.filter(
        (row) =>
          !providers.some(
            (flow) =>
              flow.basisKind ===
              `${LIVING_COSTS_BASIS}.${row.key.toLowerCase()}`,
          ),
      );
  if (!missing.length)
    return existing
      ? yield* endFlow(
          next,
          existing,
          "Recorded provider bills cover the nonhousing basket.",
        )
      : next;
  const owner = {
    kind: "household" as const,
    householdId: estimate.householdId,
  };
  const currency = money(0, facts.currency).currency;
  if (!resourcePositionAt(next, owner, currency)) return next;
  const totalAnnual = estimate.categories.reduce(
    (sum, row) => sum + row.annualMeanUsd,
    0,
  );
  const missingAnnual = missing.reduce(
    (sum, row) => sum + row.annualMeanUsd,
    0,
  );
  const amount = money(
    Math.round((estimate.monthlyMinor * missingAnnual) / totalAnnual),
    currency,
  );
  const reason = `ESTIMATED FROM AVERAGE: ${missing.map((row) => row.label).join(", ")}; ${estimate.householdSize} household residents, ${estimate.region}; recorded provider categories are excluded. Housing is paid separately.`;
  if (existing) {
    const terms = resourceFlowTermsAt(next, existing.id);
    if (
      !reprice ||
      !terms ||
      terms.status !== "active" ||
      terms.amount.minorUnits === amount.minorUnits
    )
      return next;
    return yield writeRequest("recordResourceFlowTerms", {
      stableKey: `${fallbackKey}:terms:${next.onDate}`,
      resourceFlowId: existing.id,
      effectiveAt: next.onDate,
      status: "active",
      amount,
      cadenceKind: terms.cadenceKind,
      reason,
      provenance: livingCostsProvenance(facts),
      supersedesTermsId: terms.id,
    });
  }
  const sellerKey = `living-costs:outside-sellers:${jurisdictionId}`;
  let seller = next.records.organizations.find(
    (row) => row.stableKey === sellerKey,
  );
  if (!seller) {
    next = yield writeRequest("createOrganization", {
      stableKey: sellerKey,
      formedAt: next.onDate,
      initialProfile: {
        name: "Sellers outside this town's simulated businesses",
        classification: "custom:outside-sellers",
        locationJurisdictionId: jurisdictionId,
      },
      provenance: {
        kind: "authored",
        note: "CTO R15 Oct 2 06:38: labeled aggregate outside-sellers counterparty for recorded spending leakage; not a named local vendor.",
      },
    });
    seller = next.records.organizations.at(-1)!;
  }
  const recipient = {
    kind: "organization" as const,
    organizationId: seller.id,
  };
  if (!resourcePositionAt(next, recipient, currency))
    next = yield writeRequest("createResourcePosition", {
      stableKey: `${sellerKey}:cash:${currency}`,
      owner: recipient,
      openedAt: next.onDate,
      openingBalance: money(0, currency),
      provenance: seller.provenance,
    });
  return yield writeRequest("createResourceFlow", {
    stableKey: fallbackKey,
    source: owner,
    recipient,
    startsAt: next.onDate,
    amount,
    cadenceKind: "schedule:monthly",
    basisKind: LIVING_COSTS_BASIS,
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId,
    provenance: {
      ...livingCostsProvenance(facts),
      reference: `${livingCostsProvenance(facts).reference} ${reason}`,
    },
  });
}
export function* initializeLivingCostsFlow(
  facts: CostFacts,
  personId: EntityId,
): CostProcess {
  return yield* prepareHouseholdCosts(facts, personId, false);
}
export function* settleLivingCosts(
  facts: CostFacts,
  personId: EntityId,
): CostProcess {
  if (!payerIsControlled(facts, personId)) return facts;
  let next = yield* prepareHouseholdCosts(facts, personId, true);
  const bills = householdBills(next, personId);
  const latest = new Map<EntityId, IsoDate>();
  const ids = new Set(bills.map((flow) => flow.id));
  for (const outcome of resourceTransferOutcomesOfFlows(next, ids))
    if (
      ids.has(outcome.resourceFlowId) &&
      (!latest.has(outcome.resourceFlowId) ||
        latest.get(outcome.resourceFlowId)! < outcome.periodStartsAt)
    )
      latest.set(outcome.resourceFlowId, outcome.periodStartsAt);
  const due: {
    flow: ResourceFlow;
    on: IsoDate;
  }[] = [];
  for (const flow of bills) {
    let on = firstOfNextMonth(latest.get(flow.id) ?? flow.startsAt);
    for (
      let month = 0;
      month < CATCH_UP_LIMIT_MONTHS && on <= next.onDate;
      month++
    ) {
      due.push({ flow, on });
      on = firstOfNextMonth(on);
    }
  }
  due.sort(
    (a, b) => a.on.localeCompare(b.on) || a.flow.sequence - b.flow.sequence,
  );
  for (const payment of due)
    next = yield* settleMonth(next, personId, payment.flow, payment.on);
  return next;
}
function firstOfNextMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}
function monthName(date: IsoDate): string {
  return new Date(`${date}T12:00:00Z`).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}
function* settleMonth(
  facts: CostFacts,
  personId: EntityId,
  flow: ResourceFlow,
  dueOn: IsoDate,
): CostProcess {
  const periodTerms = resourceFlowTermsAt(facts, flow.id, {
    asOfDate: dueOn,
    historySequenceExclusive: facts.records.nextSequence,
  });
  if (!periodTerms || periodTerms.status !== "active") return facts;
  const monthly = periodTerms.amount;
  const payment = paymentFromDatedCash(facts, flow.source, monthly, dueOn);
  if (payment.availableMinor === null) return facts;
  const { status, transferredAmount, reasonKind } = payment;
  const next = yield writeRequest("recordResourceTransferOutcome", {
    stableKey: `${flow.stableKey}:${dueOn}`,
    resourceFlowId: flow.id,
    periodStartsAt: dueOn,
    periodEndsAt: dueOn,
    occurredAt: dueOn,
    status,
    attemptedAmount: monthly,
    transferredAmount,
    reasonKind,
    note: `Food and bills for ${monthName(dueOn)}.`,
    provenance: periodTerms.provenance,
  });
  const taxed = yield writeRequest("recordSalesTaxBases", {
    personId,
    householdId: primaryHouseholdId(next, personId),
    settledOn: dueOn,
    paid: transferredAmount,
    sourceKey: `${flow.stableKey}:${dueOn}`,
  });
  return status === "completed"
    ? taxed
    : yield* recordFirstShortfall(
        taxed,
        personId,
        monthly.minorUnits,
        transferredAmount.minorUnits,
        dueOn,
      );
}
function* recordFirstShortfall(
  facts: CostFacts,
  personId: EntityId,
  owedMinor: number,
  paidMinor: number,
  dueOn: IsoDate,
): CostProcess {
  const costs = "food and bills";
  const already = facts.records.events.some(
    (event) =>
      event.involvedEntityIds.includes(personId) &&
      (event.tags.includes(HOUSEHOLD_SHORTFALL_TAG) ||
        event.tags.includes(SHORTFALL_ANSWER)),
  );
  if (already) return facts;
  const person = facts.people[personId]!;
  const place = lifePlaceByJurisdictionId(facts, person.homeJurisdictionId);
  const jurisdictionId = place?.context.jurisdiction.id ?? null;
  const summary =
    paidMinor > 0
      ? `${monthName(dueOn)}'s ${costs} came to ${dollars(owedMinor)}, and you had ${dollars(paidMinor)} to put toward them. You are ${dollars(owedMinor - paidMinor)} short.`
      : `${monthName(dueOn)}'s ${costs} came to ${dollars(owedMinor)}, and you had nothing left to put toward them.`;
  const stableKey = `living-costs-shortfall:${personId}:${dueOn}`;
  const next = yield writeRequest("recordWorldEvent", {
    stableKey,
    type: "life.living-costs-short",
    occurredAt: facts.onDate,
    recordedAt: facts.onDate,
    jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Could not cover the month" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [HOUSEHOLD_SHORTFALL_TAG],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return yield writeRequest("recordEventKnowledge", {
    stableKey: `${stableKey}:knowledge`,
    personId,
    eventId: next.records.events.at(-1)!.id,
    learnedAt: facts.onDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}
