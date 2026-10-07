import { applyLawConsequences } from "./enacted-law-effects";
import { recordsByStringField } from "./history-index";
import { organizationProfileAt } from "./life-queries";
import { placeInGovernment } from "./property-tax-bases";
import { recordedPaycheckTaxInput } from "./tax-policy";
import { effectiveTaxPolicy, recordTaxBase } from "./tax-policy";
import type { EntityId, World } from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

export const LOCAL_PAYROLL_BASE_KEY = "tax-base:local-payroll-wages";

/**
 * A city or county payroll tax reaches the paychecks of people who work for an
 * employer inside that government, on the day the paycheck is paid. The base
 * is the wages actually transferred; the payer is the worker. The wage
 * statutory writer, withholding and federal and state liabilities are not
 * touched. A world with no local payroll tax in force does nothing here.
 */
export function recordLocalPayrollTaxBases(
  world: World,
  outcomeIds: readonly EntityId[],
): World {
  const proposals = (world.history.taxProposals ?? []).filter(
    (row) =>
      row.publicGovernmentIdentity?.kind === "local-government" &&
      row.terms.instrument === "payroll",
  );
  if (proposals.length === 0 || outcomeIds.length === 0) return world;
  const today = world.currentDate;
  let next = world;
  for (const proposal of proposals) {
    const identity = proposal.publicGovernmentIdentity;
    if (identity?.kind !== "local-government") continue;
    const policy = effectiveTaxPolicy(
      world,
      proposal.jurisdictionId,
      proposal.terms.seriesKey,
      today,
    );
    if (!policy || policy.proposalId !== proposal.id) continue;
    for (const outcomeId of new Set(outcomeIds)) {
      const paid = recordedPaycheckTaxInput(world, outcomeId);
      if (paid.kind !== "recorded") continue;
      if (paid.occurredAt !== today) continue;
      const workplace = organizationProfileAt(
        world,
        paid.organizationId,
      )?.locationJurisdictionId;
      if (
        !workplace ||
        !placeInGovernment(
          workplace,
          identity.governmentKey,
          identity.jurisdictionId,
        )
      )
        continue;
      const stableKey = `payroll-base:${proposal.id}:${outcomeId}`;
      if (
        recordsByStringField(
          next.history.taxBases ?? [],
          "stableKey",
          stableKey,
        ).length > 0
      )
        continue;
      next = recordWorldEvent(next, {
        stableKey: `event:${stableKey}`,
        type: "tax.payroll-assessed",
        occurredAt: today,
        recordedAt: today,
        jurisdictionId: proposal.jurisdictionId,
        involvedEntityIds: [paid.personId],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: ["tax"],
        summary:
          "A paycheck earned at a local employer was assessed for the local payroll tax.",
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
        payer: { kind: "person", personId: paid.personId },
        baseKey: LOCAL_PAYROLL_BASE_KEY,
        occurredAt: today,
        amount: paid.amount,
        assumptionNote:
          "The wages actually paid in this paycheck at an employer inside the taxing government.",
      });
      next = applyLawConsequences(next, {
        onDate: today,
        activity: "assessment",
        activityId: next.history.taxBases!.at(-1)!.id,
        subjectIds: [paid.personId],
        governingLawId: proposal.measureId,
      });
    }
  }
  if (next !== world) assertWorldIntegrity(next);
  return next;
}
