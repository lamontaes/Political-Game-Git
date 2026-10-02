import source from "../../data/research/housing/nar-2025-down-payments.json" with { type: "json" };
import { resourceFlowTermsAt } from "./resource-queries";
import type { EntityId, World } from "./types";

export type HomeBuyerKind = "first-time" | "repeat";
/** Prior saved ownership, including a home subsequently sold, makes a repeat buyer. */
export function homeBuyerKind(
  world: World,
  personId: EntityId | null,
  before = world.currentDate,
): HomeBuyerKind {
  if (!personId) return "first-time";
  const households = new Set(
    world.history.householdMemberships
      .filter((row) => row.personId === personId && row.startedAt <= before)
      .map((row) => row.householdId),
  );
  return world.history.housingTenures.some(
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

/** Completed recorded purchases supersede the cited opening median. No fabricated sample. */
export function homeDownPaymentShare(
  world: World,
  buyer: HomeBuyerKind,
): {
  share: number;
  basis: "recorded-game-average" | "sourced-opening-median";
  source: string;
  recordIds: readonly EntityId[];
} {
  const samples: { share: number; ids: EntityId[] }[] = [];
  for (const debt of world.history.resourceObligations) {
    if (
      !debt.principal ||
      debt.principal.minorUnits <= 0 ||
      debt.establishedAt > world.currentDate ||
      !debt.housingTenureId ||
      !debt.stableKey.endsWith(":mortgage:debt")
    )
      continue;
    // Old placeholder purchases are not a sourced or recorded market sample.
    if (
      debt.provenance.kind === "authored" &&
      /placeholder/i.test(debt.provenance.note)
    )
      continue;
    const loan = world.history.resourceFlows.find(
      (row) => row.id === debt.resourceFlowId,
    );
    if (
      !loan ||
      loan.source.kind !== "person" ||
      homeBuyerKind(world, loan.source.personId, debt.establishedAt) !== buyer
    )
      continue;
    const borrowerId = loan.source.personId;
    const prefix = debt.stableKey.slice(0, -":mortgage:debt".length);
    const payment = world.history.resourceFlows.find(
      (row) =>
        row.stableKey === `${prefix}:down-payment` &&
        row.source.kind === "person" &&
        row.source.personId === borrowerId,
    );
    if (!payment) continue;
    const paymentTerms = resourceFlowTermsAt(world, payment.id, {
      asOfDate: debt.establishedAt,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (
      !paymentTerms ||
      paymentTerms.amount.currency !== debt.principal.currency
    )
      continue;
    const outcomes = world.history.resourceTransferOutcomes.filter(
      (row) =>
        row.resourceFlowId === payment.id &&
        row.status === "completed" &&
        row.occurredAt <= world.currentDate &&
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
        ? source.firstTime.medianShare
        : source.repeat.medianShare,
    basis: "sourced-opening-median",
    source: source.url,
    recordIds: [],
  };
}
