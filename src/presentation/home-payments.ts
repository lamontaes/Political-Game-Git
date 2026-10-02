import {
  livingCostsFlowFor,
  recordedHouseholdHousingBillsAt,
} from "../simulation/cost-of-living";
import { RENT_BASIS } from "../simulation/living-world/town-rent";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import type { EntityId, World } from "../simulation/types";

/** Saved contracts and actual payment outcomes; reading never settles a bill. */
export function homePayments(world: World, personId: EntityId) {
  const housing =
    recordedHouseholdHousingBillsAt(world, personId, world.currentDate) ?? [];
  const nonhousing = livingCostsFlowFor(world, personId);
  const nonhousingTerms = nonhousing
    ? resourceFlowTermsAt(world, nonhousing.id)
    : null;
  const contracts = [
    ...housing.map((bill) => ({
      ...bill,
      label: bill.flow.basisKind === RENT_BASIS ? "Rent" : "Mortgage",
    })),
    ...(nonhousing && nonhousingTerms?.status === "active"
      ? [
          {
            flow: nonhousing,
            terms: nonhousingTerms,
            label: "Food and other household costs (estimate)",
          },
        ]
      : []),
  ];
  return contracts.map(({ flow, terms, label }) => ({
    flowId: flow.id,
    label,
    amount: terms.amount,
    monthly: terms.cadenceKind === "schedule:monthly",
    payments: world.history.resourceTransferOutcomes
      .filter(
        (outcome) =>
          outcome.resourceFlowId === flow.id &&
          outcome.occurredAt <= world.currentDate &&
          outcome.sequence < world.history.nextSequence,
      )
      .sort(
        (left, right) =>
          right.periodStartsAt.localeCompare(left.periodStartsAt) ||
          right.sequence - left.sequence,
      ),
  }));
}
