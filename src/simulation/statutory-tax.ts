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
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
import { organizationProfileAt } from "./life-queries";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { resourcePositionAt } from "./resource-queries";
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
import { ensureTaxPublicAccount, publicOrganizationKey } from "./tax-policy";
import type { StatutoryTaxLiabilityRecord } from "./tax-types";
import type {
  EntityId,
  MoneyAmount,
  ResourceFlow,
  ResourcePositionOwner,
  ResourceTransferOutcome,
  World,
} from "./types";

export const PAYROLL_WITHHOLDING_BASIS = "custom:tax-withholding" as const;

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
  const outcome = world.history.resourceTransferOutcomes.find(
    (row) => row.id === outcomeId,
  );
  if (!outcome || outcome.transferredAmount.minorUnits <= 0) return world;
  if (outcome.transferredAmount.currency !== "USD") return world;
  const flow = world.history.resourceFlows.find(
    (row) => row.id === outcome.resourceFlowId,
  );
  if (
    !flow ||
    flow.basisReference.kind !== "work" ||
    flow.recipient.kind !== "person"
  )
    return world;
  if (
    (world.history.statutoryTaxLiabilities ?? []).some(
      (row) => row.sourceOutcomeId === outcome.id,
    )
  )
    return world;

  const drafts = paycheckLiabilities(world, flow, outcome);
  let next = world;
  const recorded: StatutoryTaxLiabilityRecord[] = [];
  for (const draft of drafts) {
    next = append(
      next,
      "statutoryTaxLiabilities",
      "statutory-tax-liability",
      draft,
    );
    recorded.push(next.history.statutoryTaxLiabilities!.at(-1)!);
  }
  return withhold(next, flow.recipient.personId, outcome, recorded);
}

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
        rule.side === "employee" ? null : "employment-tax-deposit-schedule",
    });
  }
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
  if (place.status === "not-imposed")
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
  else
    rows.push(
      unknown(
        placeTaxKey,
        stateKey,
        employee,
        "rule-unknown",
        place.status === "imposed"
          ? "state-wage-income-tax-withholding"
          : "state-wage-income-tax-status",
        place.sourceUrl,
      ),
    );
  // The research does not address city or county taxes on wages anywhere.
  rows.push(
    unknown(
      `${stateKey.toLowerCase()}:local-wage-taxes`,
      `${stateKey}:local`,
      employee,
      "rule-unknown",
      "local-wage-taxes-by-place",
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
  return rows;
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
  if (isTerritory(stateKey)) return "federal-employment-tax-in-territories";
  if (employer.kind !== "organization")
    return "household-employer-employment-tax";
  const classification = organizationProfileAt(
    world,
    employer.organizationId,
  )?.classification;
  if (classification === "sector:government")
    return "government-employee-employment-tax-coverage";
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
  for (const row of world.history.resourceTransferOutcomes) {
    if (row.sequence >= outcome.sequence) continue;
    if (row.occurredAt.slice(0, 4) !== year) continue;
    if (row.transferredAmount.currency !== outcome.transferredAmount.currency)
      continue;
    const other = world.history.resourceFlows.find(
      (candidate) => candidate.id === row.resourceFlowId,
    );
    if (
      !other ||
      other.basisReference.kind !== "work" ||
      !sameOwner(other.source, flow.source) ||
      !sameOwner(other.recipient, flow.recipient)
    )
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
  const total = withheld.reduce(
    (sum, row) => sum + row.liability!.minorUnits,
    0,
  );
  if (total === 0) return world;
  const currency = outcome.transferredAmount.currency;
  let next = ensureTaxPublicAccount(
    ensureNationalElectionJurisdiction(world),
    NATIONAL_ELECTION_JURISDICTION.id,
  );
  const account = next.history.organizations.find(
    (row) =>
      row.stableKey ===
      publicOrganizationKey(NATIONAL_ELECTION_JURISDICTION.id),
  )!;
  const payer: ResourcePositionOwner = { kind: "person", personId };
  const available =
    resourcePositionAt(next, payer, currency)?.liquidBalance.minorUnits ?? 0;
  const moved = Math.max(0, Math.min(total, available));
  const flowKey = `statutory-tax:withholding:${outcome.id}`;
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
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
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
    note: "Withheld from pay for Social Security and Medicare.",
    provenance: {
      kind: "generated",
      generatorKey: "statutory-tax:payroll-withholding",
    },
  });
  const transfer = next.history.resourceTransferOutcomes.at(-1)!;
  let remaining = moved;
  for (const liability of withheld) {
    const amount = Math.min(remaining, liability.liability!.minorUnits);
    if (amount === 0) break;
    remaining -= amount;
    next = append(next, "statutoryTaxPayments", "statutory-tax-payment", {
      stableKey: `${liability.stableKey}:withholding`,
      liabilityId: liability.id,
      method: "withholding",
      amount: money(amount, currency),
      resourceOutcomeId: transfer.id,
    });
  }
  return next;
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
    const source = world.history.resourceTransferOutcomes.find(
      (outcome) => outcome.id === row.sourceOutcomeId,
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
    if (row.status === "assessed") {
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
    const transfer = world.history.resourceTransferOutcomes.find(
      (row) => row.id === payment.resourceOutcomeId,
    );
    const flow =
      transfer &&
      world.history.resourceFlows.find(
        (row) => row.id === transfer.resourceFlowId,
      );
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
    const transfer = world.history.resourceTransferOutcomes.find(
      (row) => row.id === outcomeId,
    )!;
    if (transfer.transferredAmount.minorUnits !== paid)
      throw new Error("Tax payments must add up to the withholding transfer.");
  }
  for (const [liabilityId, paid] of byLiability)
    if (paid > liabilities.get(liabilityId)!.liability!.minorUnits)
      throw new Error("A tax payment cannot exceed its liability.");
}

function append<K extends "statutoryTaxLiabilities" | "statutoryTaxPayments">(
  world: World,
  field: K,
  kind: "statutory-tax-liability" | "statutory-tax-payment",
  draft: Omit<
    NonNullable<World["history"][K]>[number],
    "id" | "sequence" | "recordedAt"
  >,
): World {
  const record = {
    ...draft,
    id: createStableId(kind, `${world.id}:${draft.stableKey}`),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  } as NonNullable<World["history"][K]>[number];
  if (
    statutoryTaxHistoryRecords(world).some(
      (row) => row.id === record.id || row.stableKey === record.stableKey,
    )
  )
    throw new Error("Duplicate statutory tax identity.");
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      [field]: [...(world.history[field] ?? []), record],
    },
  };
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
