import type { StatutoryTaxLiabilityRecord } from "../../simulation/tax-types";
/** KEEP ordered withholding protocol. Prepare public identity first, then supply the reread payer cash and account receipt. Writer-issued flow/transfer IDs are filled by the caller after each request. */
import type {
  EntityId,
  IsoDate,
  MoneyAmount,
  ResourceTransferOutcome,
} from "../../simulation/types";
import { money } from "./money-facts";
export interface WithholdingPreparation {
  readonly total: number;
  readonly currency: MoneyAmount["currency"];
  readonly jurisdictionId: EntityId;
  readonly ensureNational: boolean;
}
export function prepareWithholding(
  outcome: ResourceTransferOutcome,
  withheld: readonly StatutoryTaxLiabilityRecord[],
  stateJurisdictionId: EntityId | null,
  federalId: EntityId,
): WithholdingPreparation | null {
  const total = withheld.reduce(
    (sum, row) => sum + row.liability!.minorUnits,
    0,
  );
  if (total === 0) return null;
  return {
    total,
    currency: outcome.transferredAmount.currency,
    jurisdictionId: stateJurisdictionId ?? federalId,
    ensureNational: stateJurisdictionId === null,
  };
}
export interface WithholdingFacts {
  readonly onDate: IsoDate;
  readonly federalId: EntityId;
  readonly accountOrganizationId: EntityId;
  readonly availableMinor: number;
}
export function withholdTo(
  facts: WithholdingFacts,
  personId: EntityId,
  outcome: ResourceTransferOutcome,
  withheld: readonly StatutoryTaxLiabilityRecord[],
  stateJurisdictionId: EntityId | null,
  flowKey: string,
) {
  const preparation = prepareWithholding(
    outcome,
    withheld,
    stateJurisdictionId,
    facts.federalId,
  );
  if (!preparation) return null;
  const { total, currency, jurisdictionId } = preparation;
  const moved = Math.max(0, Math.min(total, facts.availableMinor));
  const flow = {
    stableKey: flowKey,
    source: { kind: "person" as const, personId },
    recipient: {
      kind: "organization" as const,
      organizationId: facts.accountOrganizationId,
    },
    startsAt: facts.onDate,
    amount: money(total, currency),
    cadenceKind: "custom:tax-withholding",
    basisKind: "custom:tax-withholding",
    basisReference: { kind: "general" as const },
    restrictionKind: "purpose:public-general-receipts",
    jurisdictionId,
    provenance: {
      kind: "generated" as const,
      generatorKey: "statutory-tax:payroll-withholding",
    },
  };
  const transfer = {
    stableKey: flowKey + ":transfer",
    periodStartsAt: facts.onDate,
    periodEndsAt: facts.onDate,
    occurredAt: facts.onDate,
    attemptedAmount: money(total, currency),
    transferredAmount: money(moved, currency),
    status:
      moved === total
        ? ("completed" as const)
        : moved === 0
          ? ("blocked" as const)
          : ("partial" as const),
    reasonKind: moved === total ? null : "capacity:insufficient-funds",
    note: stateJurisdictionId
      ? stateWithholdingNote(withheld)
      : "Withheld from pay for federal taxes.",
    provenance: flow.provenance,
  };
  let remaining = moved;
  const payments: {
    stableKey: string;
    liabilityId: EntityId;
    method: "withholding";
    amount: MoneyAmount;
  }[] = [];
  for (const liability of withheld) {
    const amount = Math.min(remaining, liability.liability!.minorUnits);
    if (amount === 0) break;
    remaining -= amount;
    payments.push({
      stableKey: liability.stableKey + ":withholding",
      liabilityId: liability.id,
      method: "withholding",
      amount: money(amount, currency),
    });
  }
  return { preparation, flow, transfer, payments };
}
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
