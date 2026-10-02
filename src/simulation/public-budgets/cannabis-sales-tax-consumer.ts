import { lawInForce } from "../governing/law-in-force";
import { recordById } from "../history-index";
import {
  assessTaxBase,
  effectiveTaxPolicy,
  recordTaxBase,
} from "../tax-policy";
import { recordedCannabisSalesTaxInput } from "./recorded-cannabis-sales";
import type { World } from "../types";

const QUESTION =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";

/** Native sales -> existing base/assessment -> existing scheduled collection.
 * A starting authorization alone supplies no rate; only an actual operative
 * adopted levy may assess this receipt. No receipt or public cash is authored.
 */
export function assessRecordedCannabisSales(world: World): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === QUESTION,
  );
  if (!proposition) return world;
  let next = world;
  for (const outcome of world.history.resourceTransferOutcomes) {
    if (outcome.occurredAt !== world.currentDate) continue;
    const input = recordedCannabisSalesTaxInput(next, outcome.id);
    if (input.kind !== "recorded") continue;
    const law = lawInForce(
      next,
      input.jurisdictionId,
      proposition.id,
      input.occurredAt,
    );
    if (!law || law.origin !== "enacted" || law.answer !== "yes") continue;
    for (const proposal of next.history.taxProposals ?? []) {
      if (
        proposal.measureId !== law.measureId ||
        proposal.jurisdictionId !== input.jurisdictionId
      )
        continue;
      const policy = effectiveTaxPolicy(
        next,
        input.jurisdictionId,
        proposal.terms.seriesKey,
        input.occurredAt,
      );
      if (!policy || policy.proposalId !== proposal.id) continue;
      let base = next.history.taxBases?.find(
        (row) => row.sourceEventId === input.outcomeId,
      );
      if (!base) {
        next = recordTaxBase(next, {
          stableKey: `cannabis-sales:${input.outcomeId}`,
          jurisdictionId: input.jurisdictionId,
          payer: input.payer,
          baseKey: proposal.terms.baseKey,
          occurredAt: input.occurredAt,
          amount: input.amount,
          assumptionNote: input.allocationNote,
          sourceEventId: input.outcomeId,
        });
        base = next.history.taxBases!.at(-1)!;
      }
      const savedProposal = recordById(
        next.history.taxProposals ?? [],
        proposal.id,
      )!;
      if (base.baseKey !== savedProposal.terms.baseKey) continue;
      next = assessTaxBase(next, base.id, proposal.terms.seriesKey, {
        law,
        questionKey: QUESTION,
      });
    }
  }
  return next;
}
