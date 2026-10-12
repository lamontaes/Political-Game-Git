import { ECONOMY_RULE_PARAMETERS } from "./parameters";

export interface PayFlowFact {
  readonly flowId: string;
  readonly organizationId: string;
  readonly paydaysPerYear: number | null;
}

export interface PayTransferFact {
  readonly flowId: string;
  readonly occurredAt: string;
  readonly amountMinor: number;
}

export interface QuarterlyPayFacts {
  /** Transfer outcomes in the order they were recorded. */
  readonly transfers: readonly PayTransferFact[];
  readonly flows: readonly PayFlowFact[];
  readonly since: string;
  readonly through: string;
}

function daysBefore(date: string, days: number): string {
  const midnight = Date.parse(`${date}T00:00:00.000Z`);
  return new Date(
    midnight - days * ECONOMY_RULE_PARAMETERS.millisecondsPerDay.value,
  )
    .toISOString()
    .slice(0, 10);
}

/** Sum selected payroll transfers and normalize scheduled pay to a quarter. */
export function quarterlyPayFromFacts(
  facts: QuarterlyPayFacts,
): ReadonlyMap<string, number> {
  const flowById = new Map(facts.flows.map((flow) => [flow.flowId, flow]));
  const totals = new Map<string, number>();
  const paydaysByOrganization = new Map<string, Set<string>>();
  const cadenceByOrganization = new Map<string, number>();
  // STOPGAP: economy.pay-outcome-lookback-days
  const cutoff = daysBefore(
    facts.since,
    ECONOMY_RULE_PARAMETERS.payOutcomeLookbackDays.value,
  );
  const minorUnitsPerDollar = ECONOMY_RULE_PARAMETERS.minorUnitsPerDollar.value;

  for (let index = facts.transfers.length - 1; index >= 0; index -= 1) {
    const transfer = facts.transfers[index]!;
    if (transfer.occurredAt <= facts.since) {
      if (transfer.occurredAt < cutoff) break;
      continue;
    }
    if (transfer.occurredAt > facts.through) continue;

    const flow = flowById.get(transfer.flowId);
    if (!flow) continue;
    totals.set(
      flow.organizationId,
      (totals.get(flow.organizationId) ?? 0) +
        transfer.amountMinor / minorUnitsPerDollar,
    );
    const paydays =
      paydaysByOrganization.get(flow.organizationId) ?? new Set<string>();
    paydays.add(transfer.occurredAt);
    paydaysByOrganization.set(flow.organizationId, paydays);
    if (flow.paydaysPerYear) {
      cadenceByOrganization.set(flow.organizationId, flow.paydaysPerYear);
    }
  }

  const quarterlyPay = new Map<string, number>();
  for (const [organizationId, amount] of totals) {
    const paydays = paydaysByOrganization.get(organizationId)!.size;
    const paydaysPerYear = cadenceByOrganization.get(organizationId);
    quarterlyPay.set(
      organizationId,
      paydaysPerYear && paydays > 0
        ? (amount / paydays) *
            (paydaysPerYear / ECONOMY_RULE_PARAMETERS.quartersPerYear.value)
        : amount,
    );
  }
  return quarterlyPay;
}
