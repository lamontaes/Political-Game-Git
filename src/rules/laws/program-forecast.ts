import type {
  EntityId,
  IsoDate,
  MoneyAmount,
  PublicProgramAppropriationRecord,
  PublicProgramCommitmentRecord,
  PublicProgramCapacityRecord,
  PublicProgramRecord,
  PublicGovernmentIdentity,
  World,
} from "../../simulation/types";
import type { PublicProgramAlternative } from "../../simulation/governing/public-program";
import { money } from "./money-facts";
import {
  publicGovernmentIdentityForRecord,
  samePublicGovernmentIdentity,
} from "./public-identity";
import { addDays as advanceDays } from "../elections/calendar";
function addDays(date: IsoDate, days: number) {
  return advanceDays(date, days) as IsoDate;
}
export interface ProgramForecastFacts {
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly records: readonly PublicProgramRecord[];
  readonly flows: World["history"]["resourceFlows"];
  readonly transfers: World["history"]["resourceTransferOutcomes"];
  readonly positions: ReadonlyMap<
    string,
    { readonly liquidBalance: MoneyAmount }
  >;
}
function programCapacity(
  facts: ProgramForecastFacts,
  key: string,
  identity: PublicGovernmentIdentity,
) {
  return (
    facts.records
      .filter(
        (r): r is PublicProgramCapacityRecord =>
          r.kind === "capacity" &&
          r.programKey === key &&
          samePublicGovernmentIdentity(
            publicGovernmentIdentityForRecord(r),
            identity,
          ),
      )
      .at(-1) ?? null
  );
}
export function appropriationCommittedMinorUnits(
  facts: ProgramForecastFacts,
  appropriation: PublicProgramAppropriationRecord,
  sequenceExclusive = facts.nextSequence,
): number {
  const commitments = (facts.records ?? [])
    .filter(
      (record): record is PublicProgramCommitmentRecord =>
        record.kind === "commitment" &&
        record.appropriationId === appropriation.id &&
        record.sequence < sequenceExclusive,
    )
    .reduce(
      (total, record) =>
        total +
        record.installments.reduce(
          (sum, plan) => sum + plan.amount.minorUnits,
          0,
        ),
      0,
    );
  return (
    commitments +
    appropriationPinnedPaymentsMinorUnits(
      facts,
      appropriation,
      sequenceExclusive,
    )
  );
}

export function appropriationPinnedPaymentsMinorUnits(
  facts: ProgramForecastFacts,
  appropriation: PublicProgramAppropriationRecord,
  sequenceExclusive = facts.nextSequence,
): number {
  if (appropriation.sourceMeasureId === null) return 0;
  const eligibleFlows = new Set<EntityId>(
    facts.flows
      .filter(
        (flow) =>
          flow.sequence < sequenceExclusive &&
          flow.basisReference.kind === "public-funding" &&
          flow.basisReference.mandate.measureId ===
            appropriation.sourceMeasureId &&
          (flow.basisReference.mandate.appropriationId === undefined ||
            flow.basisReference.mandate.appropriationId === appropriation.id) &&
          flow.jurisdictionId === appropriation.jurisdictionId &&
          flow.source.kind === "organization" &&
          flow.source.organizationId === appropriation.accountOrganizationId,
      )
      .map((flow) => flow.id),
  );
  return facts.transfers
    .filter(
      (outcome) =>
        outcome.sequence < sequenceExclusive &&
        outcome.status === "completed" &&
        eligibleFlows.has(outcome.resourceFlowId),
    )
    .reduce((sum, outcome) => sum + outcome.transferredAmount.minorUnits, 0);
}
export function dollars(amount: MoneyAmount): string {
  return (amount.minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: amount.currency,
    maximumFractionDigits: amount.minorUnits % 100 === 0 ? 0 : 2,
  });
}

export interface PublicProgramForecast {
  readonly alternativeKey: string;
  readonly total: MoneyAmount;
  readonly affordable: boolean;
  readonly uncommittedAfter: MoneyAmount;
  readonly cashNow: MoneyAmount | null;
  readonly operatingMonths: string | null;
  readonly unitsRestored: number | null;
  readonly readyOn: IsoDate | null;
  readonly lines: readonly string[];
}

export function forecastProgramAlternative(
  facts: ProgramForecastFacts,
  appropriation: PublicProgramAppropriationRecord,
  alternative: PublicProgramAlternative,
): PublicProgramForecast {
  const identity = publicGovernmentIdentityForRecord(appropriation);
  const capacity = programCapacity(facts, appropriation.programKey, identity);
  const total = alternative.installments.reduce(
    (sum, plan) => sum + plan.amount.minorUnits,
    0,
  );
  const uncommitted =
    appropriation.amount.minorUnits -
    appropriationCommittedMinorUnits(facts, appropriation);
  const position =
    facts.positions.get(
      JSON.stringify([
        appropriation.accountOrganizationId,
        appropriation.amount.currency,
      ]),
    ) ?? null;
  const cashNow = position ? position.liquidBalance : null;
  const operating = alternative.installments
    .filter((plan) => plan.purpose === "operating")
    .reduce((sum, plan) => sum + plan.amount.minorUnits, 0);
  const maintenance = alternative.installments
    .filter((plan) => plan.purpose === "maintenance")
    .reduce((sum, plan) => sum + plan.amount.minorUnits, 0);
  const lines: string[] = [];
  const operatingMonths = capacity
    ? (operating / capacity.monthlyOperatingNeed.minorUnits).toFixed(1)
    : null;
  let unitsRestored: number | null = null;
  if (total === 0) {
    lines.push(
      "Commits nothing. The service keeps what it has now; no new money moves.",
    );
  } else {
    lines.push(
      `Commits ${dollars(money(total, "USD"))} of the ${dollars(money(uncommitted, "USD"))} still uncommitted.`,
    );
    if (capacity && operating > 0)
      lines.push(
        `Covers ${operatingMonths} months of the declared ${dollars(capacity.monthlyOperatingNeed)} monthly operating need, paid as each month falls due.`,
      );
    if (capacity && maintenance > 0) {
      const idle = capacity.unitsTotal - capacity.unitsOperational;
      if (capacity.restorationCostPerUnit) {
        unitsRestored = Math.min(
          idle,
          Math.floor(maintenance / capacity.restorationCostPerUnit.minorUnits),
        );
        lines.push(
          `At the declared ${dollars(capacity.restorationCostPerUnit)} per unit, returns up to ${unitsRestored} of ${idle} idle ${capacity.unitLabel} to service${alternative.deliveryLeadDays ? ` about ${alternative.deliveryLeadDays} days after payment` : ""}.`,
        );
      } else
        lines.push(
          `No restoration cost is declared, so how many idle ${capacity.unitLabel} return is unknown.`,
        );
    }
  }
  if (capacity?.completedPermille !== null && capacity)
    lines.push(
      `Today ${Math.round(capacity.completedPermille! / 10)}% of scheduled trips are reliably completed. No model links money to that share, so it is not forecast.`,
    );
  if (total > uncommitted)
    lines.push("Not affordable: it exceeds the uncommitted appropriation.");
  if (
    cashNow &&
    total > 0 &&
    cashNow.minorUnits < (alternative.installments[0]?.amount.minorUnits ?? 0)
  )
    lines.push(
      "The account does not hold enough cash for the first payment today; it would fail unless receipts arrive.",
    );
  const lead = alternative.deliveryLeadDays;
  return {
    alternativeKey: alternative.key,
    total: money(total, "USD"),
    affordable: total <= uncommitted,
    uncommittedAfter: money(Math.max(0, uncommitted - total), "USD"),
    cashNow,
    operatingMonths,
    unitsRestored,
    readyOn:
      lead !== null && maintenance > 0
        ? addDays(
            facts.onDate,
            lead +
              Math.max(
                0,
                ...alternative.installments
                  .filter((plan) => plan.purpose === "maintenance")
                  .map((plan) => plan.afterDays),
              ),
          )
        : null,
    lines,
  };
}
