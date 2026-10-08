import { householdLoansOf } from "../simulation/household-loans";
import { organizationNameAt } from "../simulation/living-world/party-registry";
import { lawPermissionRecords } from "../simulation/law-consequences/permission-records";
import { personName } from "../simulation/people";
import {
  resourceFlowTermsAt,
  resourceFlowsForEndpoint,
  resourceTransferOutcomesForFlow,
  sameEndpoint,
} from "../simulation/resource-queries";
import type {
  DebtStanding,
  EntityId,
  HouseholdLoanKind,
  IsoDate,
  LawPermissionRecord,
  LenderKind,
  MoneyAmount,
  ResourceEndpoint,
  ResourceTransferOutcomeStatus,
  World,
} from "../simulation/types";
import { householdIdFor } from "./person-dossier";

/**
 * What a person and their household pay, are paid and owe, and what a law lets
 * them do, read from the money and law records the simulation already keeps.
 *
 * Every field is a record value (a name, an amount, a date, or the record's own
 * kind, cadence or status word). The module writes no sentence: where the
 * screen would need one, there is no English bank yet, and the audit lists the
 * gap (`docs/ui/see-it-audit.md`). Read-only: it spends no time and writes
 * nothing.
 */

/** The last word of a namespaced record key: `housing:rent` is `rent`. */
export function recordWord(key: string): string {
  return key.split(":").at(-1) ?? key;
}

export interface LastPayment {
  readonly on: IsoDate;
  readonly status: ResourceTransferOutcomeStatus;
  readonly moved: MoneyAmount;
}

export interface MoneyFlowLine {
  readonly flowId: EntityId;
  /** Who is paid (a bill) or who pays (an income), as the record names them. */
  readonly counterparty: string | null;
  readonly kind: string;
  readonly amount: MoneyAmount;
  readonly cadence: string;
  readonly last: LastPayment | null;
}

export interface DebtLine {
  readonly obligationId: EntityId;
  readonly kind: HouseholdLoanKind;
  readonly lenderKind: LenderKind;
  readonly lender: string | null;
  readonly balance: MoneyAmount | null;
  readonly monthlyPayment: MoneyAmount | null;
  /** Percent a year, as a number the record holds in basis points. */
  readonly annualRatePercent: number;
  readonly standing: DebtStanding;
}

export interface PermissionLine {
  readonly recordId: EntityId;
  /** The policy question the law answers, by the catalog's own name. */
  readonly name: string;
  readonly status: LawPermissionRecord["status"];
  readonly since: IsoDate;
}

export interface PersonalObligations {
  readonly income: readonly MoneyFlowLine[];
  readonly bills: readonly MoneyFlowLine[];
  readonly debts: readonly DebtLine[];
  readonly permissions: readonly PermissionLine[];
}

function endpointName(world: World, endpoint: ResourceEndpoint): string | null {
  if (endpoint.kind === "person") {
    const person = world.people[endpoint.personId];
    return person ? personName(person) : null;
  }
  if (endpoint.kind === "household")
    return (
      world.history.households.find((row) => row.id === endpoint.householdId)
        ?.label ?? null
    );
  return organizationNameAt(world, endpoint.organizationId);
}

function lineFor(
  world: World,
  flowId: EntityId,
  counterparty: ResourceEndpoint,
  basisKind: string,
): MoneyFlowLine | null {
  const terms = resourceFlowTermsAt(world, flowId);
  if (!terms || terms.status !== "active") return null;
  const outcome = resourceTransferOutcomesForFlow(world, flowId).at(-1);
  return {
    flowId,
    counterparty: endpointName(world, counterparty),
    kind: recordWord(basisKind),
    amount: terms.amount,
    cadence: recordWord(terms.cadenceKind),
    last: outcome
      ? {
          on: outcome.occurredAt,
          status: outcome.status,
          moved: outcome.transferredAmount,
        }
      : null,
  };
}

/** Income, bills, debts and legal permissions for one person and their home. */
export function projectPersonalObligations(
  world: World,
  personId: EntityId,
): PersonalObligations | null {
  if (!world.people[personId]) return null;
  const householdId = householdIdFor(world, personId);
  const owners: ResourceEndpoint[] = [{ kind: "person", personId }];
  if (householdId) owners.push({ kind: "household", householdId });
  const isOwner = (endpoint: ResourceEndpoint) =>
    owners.some((owner) => sameEndpoint(owner, endpoint));

  const debts: DebtLine[] = [];
  const loanFlowIds = new Set<EntityId>();
  const seenLoans = new Set<EntityId>();
  for (const owner of owners) {
    for (const loan of householdLoansOf(world, owner)) {
      if (seenLoans.has(loan.obligation.id)) continue;
      seenLoans.add(loan.obligation.id);
      loanFlowIds.add(loan.obligation.resourceFlowId);
      const flow = world.history.resourceFlows.find(
        (row) => row.id === loan.obligation.resourceFlowId,
      );
      debts.push({
        obligationId: loan.obligation.id,
        kind: loan.terms.kind,
        lenderKind: loan.terms.lenderKind,
        lender: flow ? endpointName(world, flow.recipient) : null,
        balance: loan.balance,
        monthlyPayment: loan.monthlyPayment,
        annualRatePercent: loan.terms.annualRateBasisPoints / 100,
        standing: loan.standing,
      });
    }
  }

  const income: MoneyFlowLine[] = [];
  const bills: MoneyFlowLine[] = [];
  const seenFlows = new Set<EntityId>();
  for (const owner of owners) {
    for (const flow of resourceFlowsForEndpoint(world, owner)) {
      if (seenFlows.has(flow.id) || loanFlowIds.has(flow.id)) continue;
      seenFlows.add(flow.id);
      const paying = isOwner(flow.source);
      const receiving = isOwner(flow.recipient);
      // A transfer between the person and their own household is not a bill.
      if (paying === receiving) continue;
      const line = lineFor(
        world,
        flow.id,
        paying ? flow.recipient : flow.source,
        flow.basisKind,
      );
      if (line) (paying ? bills : income).push(line);
    }
  }

  const latestByKey = new Map<string, LawPermissionRecord>();
  for (const record of lawPermissionRecords(world)) {
    if (
      record.subject.kind !== "person" ||
      record.subject.id !== personId ||
      record.effectiveAt > world.currentDate ||
      record.recordedAt > world.currentDate
    )
      continue;
    const held = latestByKey.get(record.permissionKey);
    if (
      !held ||
      record.effectiveAt > held.effectiveAt ||
      (record.effectiveAt === held.effectiveAt &&
        record.sequence > held.sequence)
    )
      latestByKey.set(record.permissionKey, record);
  }
  const propositions = Object.values(world.policyCatalog?.propositions ?? {});
  const permissions: PermissionLine[] = [];
  for (const record of latestByKey.values()) {
    // The law's own question names the permission. A record whose stamp names
    // no question the catalog holds has no name a player could read.
    const questionKey = record.lawEffectStamps[0].questionKey;
    const name = propositions.find(
      (row) => row.stableKey === questionKey,
    )?.name;
    if (!name) continue;
    permissions.push({
      recordId: record.id,
      name,
      status: record.status,
      since: record.effectiveAt,
    });
  }
  permissions.sort(
    (left, right) =>
      right.since.localeCompare(left.since) ||
      left.name.localeCompare(right.name),
  );

  return { income, bills, debts, permissions };
}
