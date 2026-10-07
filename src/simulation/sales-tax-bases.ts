import { applyLawConsequences } from "./enacted-law-effects";
import { recordsByStringField } from "./history-index";
import { householdLocationAt } from "./life-queries";
import { taxReachesPlace } from "./property-tax-bases";
import { effectiveTaxPolicy, recordTaxBase } from "./tax-policy";
import type { EntityId, MoneyAmount, World } from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

export const SALES_BASE_KEY = "tax-base:household-purchases";

/**
 * A city, county or state sales tax reaches what a household actually spends on
 * food and bills in a month, on the day that spending is settled. The base is
 * what was really paid, never the amount owed; the payer is the person who paid;
 * the place is where the household lives. A month the household could not pay
 * for leaves no base, and a world with no sales tax in force does nothing here.
 */
export function recordSalesTaxBases(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly householdId: EntityId | null;
    readonly settledOn: string;
    readonly paid: MoneyAmount;
    readonly sourceKey: string;
  },
): World {
  if (input.paid.minorUnits <= 0 || !input.householdId) return world;
  const proposals = (world.history.taxProposals ?? []).filter(
    (row) =>
      row.terms.instrument === "sales" &&
      (row.publicGovernmentIdentity?.kind === "local-government" ||
        row.power?.level === "STATE"),
  );
  if (proposals.length === 0) return world;
  const today = world.currentDate;
  const place = householdLocationAt(world, input.householdId)?.jurisdictionId;
  if (!place) return world;
  let next = world;
  for (const proposal of proposals) {
    const policy = effectiveTaxPolicy(
      world,
      proposal.jurisdictionId,
      proposal.terms.seriesKey,
      today,
    );
    // Spending settled before the tax took effect is never taxed.
    if (
      !policy ||
      policy.proposalId !== proposal.id ||
      input.settledOn < policy.effectiveAt
    )
      continue;
    if (!taxReachesPlace(world, proposal, place)) continue;
    const stableKey = `sales-base:${proposal.id}:${input.sourceKey}`;
    if (
      recordsByStringField(next.history.taxBases ?? [], "stableKey", stableKey)
        .length > 0
    )
      continue;
    next = recordWorldEvent(next, {
      stableKey: `event:${stableKey}`,
      type: "tax.sales-assessed",
      occurredAt: today,
      recordedAt: today,
      jurisdictionId: proposal.jurisdictionId,
      involvedEntityIds: [input.personId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["tax"],
      summary:
        "A month of household food and bills was assessed for the sales tax.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    next = recordTaxBase(next, {
      stableKey,
      sourceEventId: next.history.events.at(-1)!.id,
      jurisdictionId: proposal.jurisdictionId,
      payer: { kind: "person", personId: input.personId },
      baseKey: SALES_BASE_KEY,
      occurredAt: today,
      amount: input.paid,
      assumptionNote:
        "The food and bills this household actually paid this month, taken as the taxable purchases; real exemptions (such as groceries) are the law's own terms.",
    });
    next = applyLawConsequences(next, {
      onDate: today,
      activity: "assessment",
      activityId: next.history.taxBases!.at(-1)!.id,
      subjectIds: [input.personId],
      governingLawId: proposal.measureId,
    });
  }
  if (next !== world) assertWorldIntegrity(next);
  return next;
}
