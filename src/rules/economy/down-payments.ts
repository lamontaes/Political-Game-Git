/** Retained first/repeat buyer selection and completed purchase sample math over raw same-purchase records. */
import type {
  EntityId,
  IsoDate,
  World,
  ResourceFlowTermsRecord,
} from "../../simulation/types";
import type source from "../../../data/research/housing/nar-2025-down-payments.json";
export interface DownPaymentFacts {
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly memberships: World["history"]["householdMemberships"];
  readonly tenures: World["history"]["housingTenures"];
  readonly obligations: World["history"]["resourceObligations"];
  readonly flows: World["history"]["resourceFlows"];
  readonly outcomes: World["history"]["resourceTransferOutcomes"];
  readonly terms: ReadonlyMap<string, ResourceFlowTermsRecord | undefined>;
  readonly source: typeof source;
}
export function downPaymentReceiptKey(
  id: EntityId,
  asOfDate: IsoDate,
  sequence: number,
) {
  return JSON.stringify([id, asOfDate, sequence]);
}
export type HomeBuyerKind = "first-time" | "repeat";
export function homeBuyerKind(
  facts: DownPaymentFacts,
  personId: EntityId | null,
  before = facts.onDate,
): HomeBuyerKind {
  if (!personId) return "first-time";
  const households = new Set(
    facts.memberships
      .filter((row) => row.personId === personId && row.startedAt <= before)
      .map((row) => row.householdId),
  );
  return facts.tenures.some(
    (row) =>
      row.startedAt < before &&
      row.kind.startsWith("ownership:") &&
      ((row.holder.kind === "person" && row.holder.personId === personId) ||
        (row.holder.kind === "household" &&
          households.has(row.holder.householdId))),
  )
    ? "repeat"
    : "first-time";
}
// stopgapId: "economy.down-payment-completed-sample-mean"
export function homeDownPaymentShare(
  facts: DownPaymentFacts,
  buyer: HomeBuyerKind,
): {
  share: number;
  basis: "recorded-game-average" | "sourced-opening-median";
  source: string;
  recordIds: readonly EntityId[];
} {
  const samples: {
    share: number;
    ids: EntityId[];
  }[] = [];
  for (const debt of facts.obligations) {
    if (
      !debt.principal ||
      debt.principal.minorUnits <= 0 ||
      debt.establishedAt > facts.onDate ||
      !debt.housingTenureId ||
      !debt.stableKey.endsWith(":mortgage:debt")
    )
      continue;
    if (
      debt.provenance.kind === "authored" &&
      /placeholder/i.test(debt.provenance.note)
    )
      continue;
    const loan = facts.flows.find((row) => row.id === debt.resourceFlowId);
    if (
      !loan ||
      loan.source.kind !== "person" ||
      homeBuyerKind(facts, loan.source.personId, debt.establishedAt) !== buyer
    )
      continue;
    const borrowerId = loan.source.personId;
    const prefix = debt.stableKey.slice(0, -":mortgage:debt".length);
    const payment = facts.flows.find(
      (row) =>
        row.stableKey === `${prefix}:down-payment` &&
        row.source.kind === "person" &&
        row.source.personId === borrowerId,
    );
    if (!payment) continue;
    const paymentTerms = facts.terms.get(
      downPaymentReceiptKey(payment.id, debt.establishedAt, facts.nextSequence),
    );
    if (
      !paymentTerms ||
      paymentTerms.amount.currency !== debt.principal.currency
    )
      continue;
    const outcomes = facts.outcomes.filter(
      (row) =>
        row.resourceFlowId === payment.id &&
        row.status === "completed" &&
        row.occurredAt <= facts.onDate &&
        row.transferredAmount.currency === debt.principal!.currency,
    );
    const down = outcomes.reduce(
      (sum, row) => sum + row.transferredAmount.minorUnits,
      0,
    );
    const price = down + debt.principal.minorUnits;
    if (down <= 0 || down !== paymentTerms.amount.minorUnits || price <= down)
      continue;
    samples.push({
      share: down / price,
      ids: [debt.id, payment.id, ...outcomes.map((row) => row.id)],
    });
  }
  if (samples.length)
    return {
      share: samples.reduce((sum, row) => sum + row.share, 0) / samples.length,
      basis: "recorded-game-average",
      source:
        "Completed down payments and their same-purchase recorded mortgage principal",
      recordIds: samples.flatMap((row) => row.ids),
    };
  return {
    share:
      buyer === "first-time"
        ? facts.source.firstTime.medianShare
        : facts.source.repeat.medianShare,
    basis: "sourced-opening-median",
    source: facts.source.url,
    recordIds: [],
  };
}
