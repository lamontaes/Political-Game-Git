/**
 * Taxes that already exist in law, assessed on the occurrence that owes them.
 *
 * The owner's decision (September 22, 2026): "Assess everyone; zero can be
 * lawful", and "debt persists under local rules". So a paycheck is assessed
 * under every tax the research knows applies to it; a lawful $0 is recorded as
 * a $0 liability; a tax the research cannot price is recorded as UNKNOWN with
 * no amount. Nobody is assessed for merely existing: the occurrence here is
 * pay that actually moved.
 *
 * Four things are kept apart:
 * 1. liability, one record per tax per paycheck;
 * 2. withholding, the transfer the employer sends on the employee's behalf;
 * 3. payment, one record per liability saying how much of that transfer paid it;
 * 4. unpaid balance, which is liability less payments and is derived rather
 *    than stored, so it cannot drift from the records it summarizes and stays
 *    owed for as long as the save does.
 *
 * Enacted game taxes (`tax-policy.ts`) are a separate route and untouched.
 */
import { createStableId } from "./ids";
import { appendedList, recordById } from "./history-index";
import {
  federalIncomeTaxUnderLaw,
  RAISE_TOP_FEDERAL_RATE_QUESTION,
} from "./federal-top-income-tax-law";
import { lawEffectStamp } from "./law-effect-stamp";
import {
  filingStatusAt,
  payPeriodsPerYear,
  stateIncomeTaxSchedule,
  withholdingForPaycheck,
  type IncomeTaxSchedule,
} from "./income-tax-withholding";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
import { organizationProfileAt } from "./life-queries";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import {
  resourceFlowsTouching,
  resourcePositionAt,
  resourceTransferOutcomesOfFlows,
} from "./resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import {
  FEDERAL_EMPLOYMENT_RULES,
  FEDERAL_UNPRICED_PAYROLL_RULES,
  FIRST_VERIFIED_TAX_YEAR,
  PLACE_EMPLOYER_PAYROLL_RULES,
  isTerritory,
  placeWageIncomeTax,
  type FederalEmploymentRule,
} from "./statutory-tax-rules";
import {
  stateIncomeTaxUnderLaw,
  stateIncomeTaxEffectStamps,
} from "./state-income-tax-law";
import {
  paidLeavePremium,
  premiumOn,
  paidLeavePremiumEffectStamps,
} from "./state-paid-leave-law";
import { ensureTaxPublicAccount, publicOrganizationKey } from "./tax-policy";
import { assertWorldIntegrity, withWorldIntegrityDeferred } from "./world";
import type {
  StatutoryTaxLiabilityRecord,
  StatutoryTaxPaymentRecord,
} from "./tax-types";
import type {
  EntityId,
  MoneyAmount,
  ResourceFlow,
  ResourcePositionOwner,
  ResourceTransferOutcome,
  World,
} from "./types";

export const PAYROLL_WITHHOLDING_BASIS = "custom:tax-withholding" as const;
export const FEDERAL_INCOME_TAX_KEY = "us-federal:income-tax-withholding";
const FEDERAL_INCOME_TAX_SOURCE_URL = "https://www.irs.gov/publications/p15t";

type LiabilityDraft = Omit<
  StatutoryTaxLiabilityRecord,
  "id" | "sequence" | "recordedAt"
>;

/**
 * Assesses one pay transfer. Call it where the pay is recorded, so the
 * employer's withholding leaves on the same day the pay arrives. A transfer
 * that is not pay, moved nothing or is already assessed is left alone, and a
 * pay transfer recorded before this existed is never assessed after the fact.
 */
export function assessPaycheckTaxes(world: World, outcomeId: EntityId): World {
  const outcome = recordById(world.history.resourceTransferOutcomes, outcomeId);
  if (!outcome || outcome.transferredAmount.minorUnits <= 0) return world;
  if (outcome.transferredAmount.currency !== "USD") return world;
  const flow = recordById(world.history.resourceFlows, outcome.resourceFlowId);
  if (
    !flow ||
    flow.basisReference.kind !== "work" ||
    flow.recipient.kind !== "person"
  )
    return world;
  if (
    taxRowIdentity(world.history.statutoryTaxLiabilities ?? []).sources.has(
      outcome.id,
    ) ||
    pendingRows?.identity.sources.has(outcome.id)
  )
    return world;

  const drafts = paycheckLiabilities(world, flow, outcome);
  const next = append(
    world,
    "statutoryTaxLiabilities",
    "statutory-tax-liability",
    drafts,
  );
  const recorded = drafts.length
    ? pendingRows
      ? pendingRows.statutoryTaxLiabilities.slice(-drafts.length)
      : next.history.statutoryTaxLiabilities!.slice(-drafts.length)
    : [];
  return withhold(next, flow.recipient.personId, outcome, recorded);
}

/**
 * Assesses a payday's pay transfers, in order, as `assessPaycheckTaxes` would
 * one after another, and writes the two tax lists once at the end.
 *
 * Every paycheck adds about ten tax rows, and copying the whole list for each
 * one made a payday cost more every year a world ran: after ten years the
 * list holds well over a hundred thousand rows. Each row still takes the
 * sequence number it would have taken, so the lists come out the same. No
 * writer in between reads the tax lists: a paycheck's own rows reach its
 * withholding directly, and the identity checks see the rows held back.
 */
export function assessPaychecksTaxes(
  world: World,
  outcomeIds: readonly EntityId[],
): World {
  if (outcomeIds.length < 2 || pendingRows || assessOneByOne())
    return outcomeIds.reduce(assessPaycheckTaxes, world);
  const held: PendingTaxRows = {
    statutoryTaxLiabilities: [],
    statutoryTaxPayments: [],
    identity: { ids: new Set(), keys: new Set(), sources: new Set() },
  };
  pendingRows = held;
  let next = world;
  try {
    next = withWorldIntegrityDeferred(() =>
      outcomeIds.reduce(assessPaycheckTaxes, world),
    );
  } finally {
    pendingRows = null;
  }
  let history = next.history;
  for (const field of [
    "statutoryTaxLiabilities",
    "statutoryTaxPayments",
  ] as const) {
    const rows = held[field];
    if (rows.length === 0) continue;
    const before = history[field] ?? EMPTY_ROWS;
    const after = appendedList<object>(before, rows) as NonNullable<
      World["history"][typeof field]
    >;
    const identity = TAX_ROW_IDENTITIES.get(before);
    if (identity && before !== EMPTY_ROWS) {
      TAX_ROW_IDENTITIES.delete(before);
      for (const row of rows) remember(identity, row);
      TAX_ROW_IDENTITIES.set(after, identity);
    }
    history = { ...history, [field]: after };
  }
  if (history === next.history) return next;
  const result = { ...next, history };
  assertWorldIntegrity(result);
  return result;
}

interface PendingTaxRows {
  readonly statutoryTaxLiabilities: StatutoryTaxLiabilityRecord[];
  readonly statutoryTaxPayments: NonNullable<
    World["history"]["statutoryTaxPayments"]
  >[number][];
  /** Ids, keys and assessed pay of the rows held back. */
  readonly identity: TaxRowIdentity;
}

/** A test sets this to compare a batch with the same paychecks one by one. */
function assessOneByOne(): boolean {
  return (
    (globalThis as { __civicPaycheckTaxesOneByOne?: boolean })
      .__civicPaycheckTaxesOneByOne === true
  );
}

/** While a payday is assessed as one batch, the rows it has written so far. */
let pendingRows: PendingTaxRows | null = null;

/** Every liability of one paycheck, in a fixed order. */
function paycheckLiabilities(
  world: World,
  flow: ResourceFlow,
  outcome: ResourceTransferOutcome,
): LiabilityDraft[] {
  if (flow.recipient.kind !== "person") return [];
  const employee: ResourcePositionOwner = {
    kind: "person",
    personId: flow.recipient.personId,
  };
  const employer = flow.source;
  const wages = outcome.transferredAmount;
  const taxYear = Number(outcome.occurredAt.slice(0, 4));
  const stateKey = residenceStateKey(world, flow.recipient.personId);
  const base = {
    sourceOutcomeId: outcome.id,
    occurredAt: outcome.occurredAt,
    taxYear,
    wages,
  };
  const key = (taxKey: string) => `statutory-tax:${outcome.id}:${taxKey}`;
  const unknown = (
    taxKey: string,
    authorityKey: string,
    payer: ResourcePositionOwner,
    status: "rule-unknown" | "base-unknown",
    researchQuestionId: string,
    sourceUrl: string | null,
  ): LiabilityDraft => ({
    ...base,
    stableKey: key(taxKey),
    taxKey,
    authorityKey,
    payer,
    taxableAmount: null,
    liability: null,
    status,
    collection: "none",
    dueAt: null,
    sourceUrl,
    researchQuestionId,
  });

  const rows: LiabilityDraft[] = [];
  const coverageGap = federalCoverageGap(world, employer, stateKey, taxYear);
  const paidBefore = coverageGap
    ? 0
    : wagesPaidEarlierThisYear(world, flow, outcome, taxYear);
  for (const rule of FEDERAL_EMPLOYMENT_RULES) {
    const payer = rule.side === "employee" ? employee : employer;
    if (coverageGap) {
      rows.push(
        unknown(
          rule.taxKey,
          "US",
          payer,
          "rule-unknown",
          coverageGap,
          rule.sourceUrl,
        ),
      );
      continue;
    }
    const taxable = taxableWages(rule, paidBefore, wages.minorUnits);
    rows.push({
      ...base,
      stableKey: key(rule.taxKey),
      taxKey: rule.taxKey,
      authorityKey: "US",
      payer,
      taxableAmount: money(taxable, wages.currency),
      liability: money(taxAt(taxable, rule.rateBasisPoints), wages.currency),
      status: "assessed",
      collection:
        rule.side === "employee" ? "withheld-from-pay" : "payable-by-payer",
      // The employee's share leaves with the paycheck. The employer's deposit
      // schedule is not in the research, so its due date is not guessed.
      dueAt: rule.side === "employee" ? outcome.occurredAt : null,
      sourceUrl: rule.sourceUrl,
      researchQuestionId:
        rule.side === "employee"
          ? null
          : "employer-payroll-tax-deposits-and-unemployment",
    });
  }
  const status = filingStatusAt(world, flow.recipient.personId);
  const periods = payPeriodsPerYear(outcome);
  const incomeTax = (
    taxKey: string,
    authorityKey: string,
    schedule: IncomeTaxSchedule,
    law: Pick<
      LiabilityDraft,
      "lawMeasureIds" | "estimatedFromAverage" | "lawEffectStamps"
    > = {},
  ): LiabilityDraft => {
    const { taxableMinor, withheldMinor } = withholdingForPaycheck(
      wages.minorUnits,
      periods,
      schedule,
    );
    return {
      ...base,
      stableKey: key(taxKey),
      taxKey,
      authorityKey,
      payer: employee,
      taxableAmount: money(taxableMinor, wages.currency),
      liability: money(withheldMinor, wages.currency),
      status: "assessed",
      // Withholding, not the final liability: the annual return settles it.
      collection: "withheld-from-pay",
      dueAt: outcome.occurredAt,
      sourceUrl: schedule.sourceUrl,
      researchQuestionId: null,
      ...law,
    };
  };
  // Federal income tax: a 2026 paycheck of a stateside resident, withheld
  // under the filing status's schedule where it has been read. Puerto Rico
  // and the other territories tax their residents' local wages themselves.
  // A law enacted in play that raised the top rate, or put it back
  // (`federal-top-income-tax-law.ts`), governs over the 2026 schedule.
  const federalLaw = federalIncomeTaxUnderLaw(
    world,
    status,
    outcome.occurredAt,
  );
  const federalSchedule = federalLaw.schedule;
  const federalStamp = lawEffectStamp(federalLaw.governingLaw, {
    effectKind: "federal-income-tax-withholding",
    questionKey: RAISE_TOP_FEDERAL_RATE_QUESTION,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    appliedAt: outcome.occurredAt,
    sourceRecordIds: [outcome.id, flow.id],
  });
  const federalGap =
    taxYear < FIRST_VERIFIED_TAX_YEAR
      ? "tax-rules-before-2026"
      : !stateKey
        ? "tax-residence-unrecorded"
        : isTerritory(stateKey)
          ? "territory-federal-income-tax"
          : !federalSchedule
            ? "federal-income-tax-filing-status-schedules-2026"
            : null;
  rows.push(
    federalGap || !federalSchedule
      ? unknown(
          FEDERAL_INCOME_TAX_KEY,
          "US",
          employee,
          "rule-unknown",
          federalGap ?? "federal-income-tax-filing-status-schedules-2026",
          FEDERAL_INCOME_TAX_SOURCE_URL,
        )
      : incomeTax(
          FEDERAL_INCOME_TAX_KEY,
          "US",
          federalSchedule,
          federalLaw.lawMeasureIds.length
            ? {
                lawMeasureIds: federalLaw.lawMeasureIds,
                ...(federalStamp ? { lawEffectStamps: [federalStamp] } : {}),
              }
            : {},
        ),
  );
  for (const rule of FEDERAL_UNPRICED_PAYROLL_RULES) {
    rows.push(
      unknown(
        rule.taxKey,
        "US",
        rule.side === "employee" ? employee : employer,
        rule.status,
        rule.researchQuestionId,
        rule.sourceUrl,
      ),
    );
  }

  if (!stateKey) {
    rows.push(
      unknown(
        "place:wage-income-tax",
        "unrecorded",
        employee,
        "rule-unknown",
        "tax-residence-unrecorded",
        null,
      ),
    );
    return rows;
  }
  // Where the person lives. A job with no recorded work place is taken to be
  // where its worker lives; a rule for tax owed to another state on wages
  // earned there would need that work place, and none is applied.
  const place = placeWageIncomeTax(stateKey);
  const placeTaxKey = `${stateKey.toLowerCase()}:wage-income-tax`;
  // A law enacted in play that repealed, adopted or reshaped the state's tax
  // (`state-income-tax-law.ts`) governs over the tables the state began with.
  const underLaw =
    taxYear >= FIRST_VERIFIED_TAX_YEAR
      ? stateIncomeTaxUnderLaw(world, stateKey, status, outcome.occurredAt)
      : ({ kind: "as-begun" } as const);
  if (underLaw.kind === "repealed")
    rows.push({
      ...base,
      stableKey: key(placeTaxKey),
      taxKey: placeTaxKey,
      authorityKey: stateKey,
      payer: employee,
      taxableAmount: money(0, wages.currency),
      liability: money(0, wages.currency),
      status: "not-imposed",
      collection: "none",
      dueAt: null,
      sourceUrl: null,
      researchQuestionId: null,
      lawMeasureIds: underLaw.lawMeasureIds,
    });
  else if (underLaw.kind === "estimated")
    rows.push(
      incomeTax(placeTaxKey, stateKey, underLaw.schedule, {
        lawMeasureIds: underLaw.lawMeasureIds,
        estimatedFromAverage: underLaw.estimatedFromAverage,
      }),
    );
  else if (place.status === "not-imposed")
    rows.push({
      ...base,
      stableKey: key(placeTaxKey),
      taxKey: placeTaxKey,
      authorityKey: stateKey,
      payer: employee,
      taxableAmount: money(0, wages.currency),
      liability: money(0, wages.currency),
      status: "not-imposed",
      collection: "none",
      dueAt: null,
      sourceUrl: place.sourceUrl,
      researchQuestionId: null,
    });
  else {
    const read =
      place.status === "imposed" && taxYear >= FIRST_VERIFIED_TAX_YEAR
        ? stateIncomeTaxSchedule(stateKey, status, world.seed)
        : null;
    rows.push(
      read?.kind === "schedule"
        ? incomeTax(
            placeTaxKey,
            stateKey,
            read.schedule,
            read.estimatedFromAverage
              ? { estimatedFromAverage: read.estimatedFromAverage }
              : {},
          )
        : unknown(
            placeTaxKey,
            stateKey,
            employee,
            "rule-unknown",
            read?.kind === "unknown"
              ? read.researchQuestionId
              : "state-wage-income-tax-withholding",
            place.sourceUrl,
          ),
    );
  }
  // A state paid family and medical leave program's employee premium
  // (`state-paid-leave-law.ts`), while its law is in force.
  const leave =
    taxYear >= FIRST_VERIFIED_TAX_YEAR
      ? paidLeavePremium(world, stateKey, outcome.occurredAt)
      : ({ kind: "none" } as const);
  const leaveTaxKey = `${stateKey.toLowerCase()}:paid-leave-premium`;
  if (leave.kind === "ended")
    rows.push({
      ...base,
      stableKey: key(leaveTaxKey),
      taxKey: leaveTaxKey,
      authorityKey: stateKey,
      payer: employee,
      taxableAmount: money(0, wages.currency),
      liability: money(0, wages.currency),
      status: "not-imposed",
      collection: "none",
      dueAt: null,
      sourceUrl: null,
      researchQuestionId: null,
      lawMeasureIds: leave.lawMeasureIds,
    });
  else if (leave.kind === "premium") {
    const { taxableMinor, premiumMinor } = premiumOn(
      wages.minorUnits,
      leave.annualWageCapMinor === null
        ? 0
        : wagesPaidEarlierThisYear(world, flow, outcome, taxYear),
      leave,
    );
    // A program whose premium falls on the employer alone owes the
    // employee a lawful $0.
    const employeePays = leave.employeeRatePerMillion > 0;
    rows.push({
      ...base,
      stableKey: key(leaveTaxKey),
      taxKey: leaveTaxKey,
      authorityKey: stateKey,
      payer: employee,
      taxableAmount: money(employeePays ? taxableMinor : 0, wages.currency),
      liability: money(premiumMinor, wages.currency),
      status: employeePays ? "assessed" : "not-imposed",
      collection: employeePays ? "withheld-from-pay" : "none",
      dueAt: employeePays ? outcome.occurredAt : null,
      sourceUrl: leave.sourceUrl,
      researchQuestionId: null,
      lawEffectStamps: paidLeavePremiumEffectStamps(
        world,
        stateKey,
        outcome.occurredAt,
        leave.lawMeasureIds ?? [],
        [outcome.id, flow.id, flow.recipient.personId],
      ),
      ...(leave.lawMeasureIds ? { lawMeasureIds: leave.lawMeasureIds } : {}),
      ...(leave.estimatedFromAverage
        ? { estimatedFromAverage: leave.estimatedFromAverage }
        : {}),
    });
  }
  // The research does not address city or county taxes on wages anywhere.
  rows.push(
    unknown(
      `${stateKey.toLowerCase()}:local-wage-taxes`,
      `${stateKey}:local`,
      employee,
      "rule-unknown",
      "local-income-tax-authority-56-places",
      null,
    ),
  );
  for (const rule of PLACE_EMPLOYER_PAYROLL_RULES[stateKey] ?? [])
    rows.push(
      unknown(
        rule.taxKey,
        stateKey,
        employer,
        rule.status,
        rule.researchQuestionId,
        rule.sourceUrl,
      ),
    );
  return rows.map((row) => {
    if (row.taxKey !== placeTaxKey || row.liability === null) return row;
    const stamps = stateIncomeTaxEffectStamps(
      world,
      stateKey,
      outcome.occurredAt,
      row.lawMeasureIds ?? [],
      [outcome.id, flow.id, flow.recipient.personId],
    );
    return stamps.length
      ? { ...row, lawEffectStamps: [...(row.lawEffectStamps ?? []), ...stamps] }
      : row;
  });
}

/**
 * Why the federal employment rows cannot be priced for this paycheck, or null
 * when they can. Each reason is a question the research left open.
 */
function federalCoverageGap(
  world: World,
  employer: ResourcePositionOwner,
  stateKey: string | null,
  taxYear: number,
): string | null {
  if (taxYear < FIRST_VERIFIED_TAX_YEAR) return "tax-rules-before-2026";
  if (!stateKey) return "tax-residence-unrecorded";
  if (isTerritory(stateKey)) return "employment-tax-coverage-exceptions";
  if (employer.kind !== "organization")
    return "employment-tax-coverage-exceptions";
  const classification = organizationProfileAt(
    world,
    employer.organizationId,
  )?.classification;
  if (classification === "sector:government")
    return "employment-tax-coverage-exceptions";
  return null;
}

/** The place key ("US-NV") of the person's recorded home, or null. */
export function residenceStateKey(
  world: World,
  personId: EntityId,
): string | null {
  const person = world.people[personId];
  if (!person) return null;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  if (place?.stateJurisdictionKey) return place.stateJurisdictionKey;
  const jurisdiction = world.jurisdictions[person.homeJurisdictionId];
  return jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
}

/**
 * Wages this employer already paid this employee this calendar year, read off
 * the canonical pay records, so a cap or floor counts pay recorded before the
 * tax existed as well.
 */
export function wagesPaidEarlierThisYear(
  world: World,
  flow: ResourceFlow,
  outcome: ResourceTransferOutcome,
  taxYear: number,
): number {
  const year = String(taxYear);
  let total = 0;
  // The same employer's pay flows to the same worker, looked up by id. Only
  // the worker's own flows and their outcomes are read, by index.
  const same = new Set<EntityId>();
  for (const other of resourceFlowsTouching(world, flow.recipient))
    if (
      other.basisReference.kind === "work" &&
      sameOwner(other.source, flow.source) &&
      sameOwner(other.recipient, flow.recipient)
    )
      same.add(other.id);
  for (const row of resourceTransferOutcomesOfFlows(world, same)) {
    if (row.sequence >= outcome.sequence) continue;
    if (row.occurredAt.slice(0, 4) !== year) continue;
    if (row.transferredAmount.currency !== outcome.transferredAmount.currency)
      continue;
    total += row.transferredAmount.minorUnits;
  }
  return total;
}

export function taxableWages(
  rule: Pick<
    FederalEmploymentRule,
    "annualWageCapMinor" | "annualWageFloorMinor"
  >,
  paidBefore: number,
  wages: number,
): number {
  let taxable = wages;
  if (rule.annualWageCapMinor !== null)
    taxable = Math.min(
      taxable,
      Math.max(0, rule.annualWageCapMinor - paidBefore),
    );
  if (rule.annualWageFloorMinor !== null)
    taxable =
      Math.max(0, paidBefore + wages - rule.annualWageFloorMinor) -
      Math.max(0, paidBefore - rule.annualWageFloorMinor);
  return taxable;
}

/** Half-up to the cent, in exact integer arithmetic. */
export function taxAt(taxableMinor: number, rateBasisPoints: number): number {
  const numerator = BigInt(taxableMinor) * BigInt(rateBasisPoints);
  return Number((numerator * 2n + 10_000n) / 20_000n);
}

/**
 * The employer sends the employee's withheld share to the federal account the
 * day the pay is recorded. It comes out of the pay just received; if the
 * account somehow holds less, only what is there moves and the rest stays
 * owed.
 */
function withhold(
  world: World,
  personId: EntityId,
  outcome: ResourceTransferOutcome,
  liabilities: readonly StatutoryTaxLiabilityRecord[],
): World {
  const withheld = liabilities.filter(
    (row) =>
      row.collection === "withheld-from-pay" &&
      row.liability !== null &&
      row.liability.minorUnits > 0,
  );
  // Each government's share goes to its own account: the federal rows to the
  // United States, a state's income tax to that state.
  let next = world;
  const federal = withheld.filter((row) => row.authorityKey === "US");
  if (federal.length > 0)
    next = withholdTo(
      next,
      personId,
      outcome,
      federal,
      null,
      `statutory-tax:withholding:${outcome.id}`,
    );
  for (const authorityKey of [
    ...new Set(
      withheld
        .map((row) => row.authorityKey)
        .filter((authority) => authority !== "US"),
    ),
  ]) {
    // The state's own jurisdiction identity, registered once, as statewide
    // contests register it; nothing else about the state comes with it.
    const state = chiefExecutiveJurisdiction(authorityKey.slice(3));
    if (!state) continue;
    if (!next.jurisdictions[state.id])
      next = {
        ...next,
        jurisdictions: { ...next.jurisdictions, [state.id]: state },
        jurisdictionOrder: [...next.jurisdictionOrder, state.id],
      };
    next = withholdTo(
      next,
      personId,
      outcome,
      withheld.filter((row) => row.authorityKey === authorityKey),
      state.id,
      `statutory-tax:withholding:${outcome.id}:${authorityKey}`,
    );
  }
  return next;
}

function withholdTo(
  world: World,
  personId: EntityId,
  outcome: ResourceTransferOutcome,
  withheld: readonly StatutoryTaxLiabilityRecord[],
  stateJurisdictionId: EntityId | null,
  flowKey: string,
): World {
  const total = withheld.reduce(
    (sum, row) => sum + row.liability!.minorUnits,
    0,
  );
  if (total === 0) return world;
  const currency = outcome.transferredAmount.currency;
  const jurisdictionId =
    stateJurisdictionId ?? NATIONAL_ELECTION_JURISDICTION.id;
  let next = ensureTaxPublicAccount(
    stateJurisdictionId ? world : ensureNationalElectionJurisdiction(world),
    jurisdictionId,
  );
  const account = next.history.organizations.find(
    (row) => row.stableKey === publicOrganizationKey(jurisdictionId),
  )!;
  const payer: ResourcePositionOwner = { kind: "person", personId };
  const available =
    resourcePositionAt(next, payer, currency)?.liquidBalance.minorUnits ?? 0;
  const moved = Math.max(0, Math.min(total, available));
  next = createResourceFlow(next, {
    stableKey: flowKey,
    source: payer,
    recipient: { kind: "organization", organizationId: account.id },
    startsAt: next.currentDate,
    amount: money(total, currency),
    cadenceKind: "custom:tax-withholding",
    basisKind: PAYROLL_WITHHOLDING_BASIS,
    basisReference: { kind: "general" },
    restrictionKind: "purpose:public-general-receipts",
    jurisdictionId,
    provenance: {
      kind: "generated",
      generatorKey: "statutory-tax:payroll-withholding",
    },
  });
  const flow = next.history.resourceFlows.at(-1)!;
  next = recordResourceTransferOutcome(next, {
    stableKey: `${flowKey}:transfer`,
    resourceFlowId: flow.id,
    periodStartsAt: next.currentDate,
    periodEndsAt: next.currentDate,
    occurredAt: next.currentDate,
    attemptedAmount: money(total, currency),
    transferredAmount: money(moved, currency),
    status: moved === total ? "completed" : moved === 0 ? "blocked" : "partial",
    reasonKind: moved === total ? null : "capacity:insufficient-funds",
    note: stateJurisdictionId
      ? stateWithholdingNote(withheld)
      : "Withheld from pay for federal taxes.",
    provenance: {
      kind: "generated",
      generatorKey: "statutory-tax:payroll-withholding",
    },
  });
  const transfer = next.history.resourceTransferOutcomes.at(-1)!;
  let remaining = moved;
  const payments: StatutoryTaxPaymentDraft[] = [];
  for (const liability of withheld) {
    const amount = Math.min(remaining, liability.liability!.minorUnits);
    if (amount === 0) break;
    remaining -= amount;
    const effectKind = liability.taxKey.endsWith(":wage-income-tax")
      ? "state-income-tax-payment"
      : liability.taxKey.endsWith(":paid-leave-premium")
        ? "paid-leave-premium-payment"
        : null;
    payments.push({
      ...(effectKind && liability.lawEffectStamps?.length
        ? {
            lawEffectStamps: liability.lawEffectStamps.map((stamp) => ({
              ...stamp,
              effectKind,
              appliedAt: next.currentDate,
              sourceRecordIds: [
                ...new Set([
                  liability.id,
                  transfer.id,
                  ...(stamp.sourceRecordIds ?? []),
                ]),
              ],
            })),
          }
        : {}),
      stableKey: `${liability.stableKey}:withholding`,
      liabilityId: liability.id,
      method: "withholding",
      amount: money(amount, currency),
      resourceOutcomeId: transfer.id,
    });
  }
  return append(
    next,
    "statutoryTaxPayments",
    "statutory-tax-payment",
    payments,
  );
}

/** What a state's share of one paycheck's withholding paid for. */
function stateWithholdingNote(
  withheld: readonly StatutoryTaxLiabilityRecord[],
): string {
  const leave = withheld.some((row) =>
    row.taxKey.endsWith(":paid-leave-premium"),
  );
  const income = withheld.some((row) =>
    row.taxKey.endsWith(":wage-income-tax"),
  );
  if (leave && income)
    return "Withheld from pay for state income tax and the state paid leave premium.";
  if (leave) return "Withheld from pay for the state paid leave premium.";
  return "Withheld from pay for state income tax.";
}

export interface StatutoryTaxBalance {
  readonly liability: StatutoryTaxLiabilityRecord;
  readonly paid: MoneyAmount;
  readonly unpaid: MoneyAmount;
  /** Past its due date and not fully paid. */
  readonly overdue: boolean;
}

/**
 * What each priced liability owes now. UNKNOWN rows are left out: an unknown
 * amount is not an unpaid zero. Filter by payer to see one person's or one
 * business's taxes.
 */
export function statutoryTaxBalances(
  world: World,
  payer?: ResourcePositionOwner,
): StatutoryTaxBalance[] {
  const payments = world.history.statutoryTaxPayments ?? [];
  return (world.history.statutoryTaxLiabilities ?? [])
    .filter(
      (row) =>
        row.liability !== null && (!payer || sameOwner(row.payer, payer)),
    )
    .map((liability) => {
      const paid = payments
        .filter((row) => row.liabilityId === liability.id)
        .reduce((sum, row) => sum + row.amount.minorUnits, 0);
      const unpaid = liability.liability!.minorUnits - paid;
      return {
        liability,
        paid: money(paid, liability.liability!.currency),
        unpaid: money(unpaid, liability.liability!.currency),
        overdue:
          unpaid > 0 &&
          liability.dueAt !== null &&
          liability.dueAt < world.currentDate,
      };
    });
}

export function statutoryTaxHistoryRecords(world: World) {
  return [
    ...(world.history.statutoryTaxLiabilities ?? []),
    ...(world.history.statutoryTaxPayments ?? []),
  ];
}

/**
 * Saved records must reconcile: each liability comes after the pay it
 * assesses, a priced row's arithmetic holds, an unknown row carries no amount,
 * and every payment is money a withholding transfer actually moved.
 */
export function assertStatutoryTaxIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const groups = [
    ["statutory-tax-liability", world.history.statutoryTaxLiabilities ?? []],
    ["statutory-tax-payment", world.history.statutoryTaxPayments ?? []],
  ] as const;
  for (const [kind, records] of groups) {
    let previous = -1;
    const keys = new Set<string>();
    for (const row of records) {
      if (
        !row.stableKey.trim() ||
        ids.has(row.id) ||
        row.id !== createStableId(kind, `${world.id}:${row.stableKey}`) ||
        keys.has(row.stableKey) ||
        row.sequence <= previous ||
        row.recordedAt > world.currentDate
      )
        throw new Error("Invalid statutory tax identity, ordering or date.");
      ids.add(row.id);
      keys.add(row.stableKey);
      previous = row.sequence;
    }
  }
  const rules = new Map(
    FEDERAL_EMPLOYMENT_RULES.map((rule) => [rule.taxKey, rule]),
  );
  const liabilities = new Map<EntityId, StatutoryTaxLiabilityRecord>();
  for (const row of world.history.statutoryTaxLiabilities ?? []) {
    liabilities.set(row.id, row);
    const source = recordById(
      world.history.resourceTransferOutcomes,
      row.sourceOutcomeId,
    );
    if (
      !source ||
      source.sequence >= row.sequence ||
      source.occurredAt !== row.occurredAt ||
      JSON.stringify(source.transferredAmount) !== JSON.stringify(row.wages)
    )
      throw new Error("A tax liability must follow the pay it assesses.");
    const priced = row.status === "assessed" || row.status === "not-imposed";
    if (priced !== (row.liability !== null && row.taxableAmount !== null))
      throw new Error(
        "An unknown tax cannot carry an amount, and a known one must.",
      );
    if (row.status === "not-imposed" && row.liability!.minorUnits !== 0)
      throw new Error("A tax the place does not impose owes nothing.");
    if (!priced && row.collection !== "none")
      throw new Error("An unknown tax cannot be collected.");
    const rule = rules.get(row.taxKey);
    const incomeTax =
      row.taxKey === FEDERAL_INCOME_TAX_KEY ||
      row.taxKey.endsWith(":wage-income-tax");
    if (row.status === "assessed" && incomeTax) {
      // Income tax withholding depends on the filing status on payday, which
      // can change later, so the record is checked for bounds, not re-derived:
      // the annualized taxable pay never exceeds the pay, and no rate
      // reaches 100%.
      if (
        row.taxableAmount!.minorUnits > row.wages.minorUnits ||
        row.liability!.minorUnits > row.taxableAmount!.minorUnits + 1 ||
        row.collection !== "withheld-from-pay"
      )
        throw new Error("An income tax withholding is out of bounds.");
    } else if (
      row.status === "assessed" &&
      row.taxKey.endsWith(":paid-leave-premium")
    ) {
      // A paid leave premium's rate comes from the program or its estimate,
      // so the record is checked for bounds: taxed pay never exceeds the pay,
      // and no program's employee share reaches 5% of it.
      if (
        row.taxableAmount!.minorUnits > row.wages.minorUnits ||
        row.liability!.minorUnits * 20 > row.taxableAmount!.minorUnits + 20 ||
        row.collection !== "withheld-from-pay"
      )
        throw new Error("A paid leave premium is out of bounds.");
    } else if (row.status === "assessed") {
      if (
        !rule ||
        row.taxableAmount!.minorUnits > row.wages.minorUnits ||
        row.liability!.minorUnits !==
          taxAt(row.taxableAmount!.minorUnits, rule.rateBasisPoints)
      )
        throw new Error("An assessed tax does not match its rule.");
    }
  }
  const byOutcome = new Map<EntityId, number>();
  const byLiability = new Map<EntityId, number>();
  for (const payment of world.history.statutoryTaxPayments ?? []) {
    const liability = liabilities.get(payment.liabilityId);
    const transfer = recordById(
      world.history.resourceTransferOutcomes,
      payment.resourceOutcomeId,
    );
    const flow =
      transfer &&
      recordById(world.history.resourceFlows, transfer.resourceFlowId);
    if (
      !liability ||
      liability.sequence >= payment.sequence ||
      liability.collection !== "withheld-from-pay" ||
      !transfer ||
      transfer.sequence >= payment.sequence ||
      !flow ||
      flow.basisKind !== PAYROLL_WITHHOLDING_BASIS ||
      !sameOwner(flow.source, liability.payer) ||
      payment.amount.minorUnits <= 0
    )
      throw new Error("A tax payment must be money a withholding moved.");
    byOutcome.set(
      transfer.id,
      (byOutcome.get(transfer.id) ?? 0) + payment.amount.minorUnits,
    );
    byLiability.set(
      liability.id,
      (byLiability.get(liability.id) ?? 0) + payment.amount.minorUnits,
    );
  }
  for (const [outcomeId, paid] of byOutcome) {
    const transfer = recordById(
      world.history.resourceTransferOutcomes,
      outcomeId,
    )!;
    if (transfer.transferredAmount.minorUnits !== paid)
      throw new Error("Tax payments must add up to the withholding transfer.");
  }
  for (const [liabilityId, paid] of byLiability)
    if (paid > liabilities.get(liabilityId)!.liability!.minorUnits)
      throw new Error("A tax payment cannot exceed its liability.");
}

type StatutoryTaxPaymentDraft = Omit<
  StatutoryTaxPaymentRecord,
  "id" | "sequence" | "recordedAt"
>;

/**
 * Appends rows to one statutory tax list in order, each with the next
 * sequence number, exactly as appending them one at a time would, but copying
 * the list once. A paycheck writes several rows, and copying a list that
 * grows with every paycheck once per row was most of a late Day's cost.
 */
function append<K extends "statutoryTaxLiabilities" | "statutoryTaxPayments">(
  world: World,
  field: K,
  kind: "statutory-tax-liability" | "statutory-tax-payment",
  drafts: readonly Omit<
    NonNullable<World["history"][K]>[number],
    "id" | "sequence" | "recordedAt"
  >[],
): World {
  if (drafts.length === 0) return world;
  const records = drafts.map(
    (draft, index) =>
      ({
        ...draft,
        id: createStableId(kind, `${world.id}:${draft.stableKey}`),
        sequence: world.history.nextSequence + index,
        recordedAt: world.currentDate,
      }) as NonNullable<World["history"][K]>[number],
  );
  const liabilities = taxRowIdentity(
    world.history.statutoryTaxLiabilities ?? EMPTY_ROWS,
  );
  const payments = taxRowIdentity(
    world.history.statutoryTaxPayments ?? EMPTY_ROWS,
  );
  const batchIds = new Set<EntityId>();
  const batchKeys = new Set<string>();
  for (const record of records) {
    if (
      liabilities.ids.has(record.id) ||
      liabilities.keys.has(record.stableKey) ||
      payments.ids.has(record.id) ||
      payments.keys.has(record.stableKey) ||
      pendingRows?.identity.ids.has(record.id) ||
      pendingRows?.identity.keys.has(record.stableKey) ||
      batchIds.has(record.id) ||
      batchKeys.has(record.stableKey)
    )
      throw new Error("Duplicate statutory tax identity.");
    batchIds.add(record.id);
    batchKeys.add(record.stableKey);
  }
  if (pendingRows) {
    // Held for the payday's single write; only the sequence moves now.
    for (const record of records) {
      (pendingRows[field] as (typeof record)[]).push(record);
      remember(pendingRows.identity, record);
    }
    return {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.nextSequence + records.length,
      },
    };
  }
  const before = world.history[field] ?? EMPTY_ROWS;
  const after = appendedList<object>(before, records) as NonNullable<
    World["history"][K]
  >;
  // The new list inherits the old list's identity index, grown by the new
  // rows. The old list gives it up, so a later look at it builds its own.
  const identity = TAX_ROW_IDENTITIES.get(before);
  if (identity && before !== EMPTY_ROWS) {
    TAX_ROW_IDENTITIES.delete(before);
    for (const record of records) remember(identity, record);
    TAX_ROW_IDENTITIES.set(after, identity);
  }
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + records.length,
      [field]: after,
    },
  };
}

/**
 * The ids, stable keys and assessed pay of one statutory tax list. Every
 * paycheck adds several rows to these lists, and checking each new row
 * against every earlier one made a Day's paydays cost more each year the
 * world ran. A list is never edited once written, so its index is exact; it
 * moves forward to the list an append makes from it.
 */
interface TaxRowIdentity {
  readonly ids: Set<EntityId>;
  readonly keys: Set<string>;
  /** The pay transfers liabilities in this list assess. */
  readonly sources: Set<EntityId>;
}

const TAX_ROW_IDENTITIES = new WeakMap<readonly object[], TaxRowIdentity>();
const EMPTY_ROWS: readonly never[] = [];

function remember(
  identity: TaxRowIdentity,
  row: { readonly id: EntityId; readonly stableKey: string },
): void {
  identity.ids.add(row.id);
  identity.keys.add(row.stableKey);
  const source = (row as { readonly sourceOutcomeId?: EntityId })
    .sourceOutcomeId;
  if (source !== undefined) identity.sources.add(source);
}

function taxRowIdentity(
  rows: readonly { readonly id: EntityId; readonly stableKey: string }[],
): TaxRowIdentity {
  let identity = TAX_ROW_IDENTITIES.get(rows);
  if (!identity) {
    identity = { ids: new Set(), keys: new Set(), sources: new Set() };
    for (const row of rows) remember(identity, row);
    TAX_ROW_IDENTITIES.set(rows, identity);
  }
  return identity;
}

function sameOwner(
  a: ResourcePositionOwner,
  b: ResourcePositionOwner,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "person") return a.personId === (b as typeof a).personId;
  if (a.kind === "household")
    return a.householdId === (b as typeof a).householdId;
  return a.organizationId === (b as typeof a).organizationId;
}
