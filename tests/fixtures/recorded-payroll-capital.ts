import { createOrganization } from "../../src/simulation/life";
import { workRoleAt } from "../../src/simulation/life-queries";
import { weeklyHoursOf } from "../../src/simulation/living-world/town-pay";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
} from "../../src/simulation/resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "../../src/simulation/resources";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { EntityId, World } from "../../src/simulation/types";

/** Explicit capital for wage-law controls, not ordinary generated business cash.
 * The bound uses saved contracts, recorded hours, the control's adopted hourly
 * term and its observation horizon. Actual payments still use the cash cap.
 */
export function fundRecordedPayrollControl(
  world: World,
  days: number,
  adoptedHourlyMinor: number,
): World {
  const budgets = new Map<EntityId, number>();
  for (const flow of world.history.resourceFlows) {
    if (
      !flow.stableKey.startsWith("town-pay-v2:job-pay:") ||
      flow.source.kind !== "organization" ||
      flow.basisReference.kind !== "work"
    )
      continue;
    const role = workRoleAt(world, flow.basisReference.workRelationshipId);
    const terms = resourceFlowTermsAt(world, flow.id);
    if (
      !role ||
      !terms ||
      terms.status !== "active" ||
      terms.amount.currency !== "USD"
    )
      continue;
    // A period is never more than annual pay, and at most one period is due per
    // day. Deliberately overfund this authored control without estimating books.
    const annualFloor = Math.ceil(
      adoptedHourlyMinor * weeklyHoursOf(role) * 52,
    );
    const bound = Math.max(terms.amount.minorUnits, annualFloor) * (days + 1);
    if (!Number.isSafeInteger(bound))
      throw new Error("Payroll control funding must be safe integer cents");
    budgets.set(
      flow.source.organizationId,
      (budgets.get(flow.source.organizationId) ?? 0) + bound,
    );
  }
  if (budgets.size === 0) return world;
  return withWorldIntegrityDeferred(() => {
    const provenance = {
      kind: "authored" as const,
      note: "Explicit wage-law payroll control capital, bounded from saved contracts and adopted terms; not ordinary business wealth.",
    };
    const key = `fixture:payroll-capital:${world.history.nextSequence}`;
    let next = createOrganization(world, {
      stableKey: key,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Payroll control fund",
        classification: "sector:private",
        locationJurisdictionId: null,
      },
    });
    const donorId = next.history.organizations.at(-1)!.id;
    next = createResourcePosition(next, {
      stableKey: `${key}:cash`,
      owner: { kind: "organization", organizationId: donorId },
      openedAt: next.currentDate,
      openingBalance: money(
        [...budgets.values()].reduce((sum, value) => sum + value, 0),
        "USD",
      ),
      provenance,
    });
    for (const [organizationId, amount] of budgets) {
      const owner = { kind: "organization" as const, organizationId };
      if (!resourcePositionAt(next, owner, money(0, "USD").currency))
        next = createResourcePosition(next, {
          stableKey: `${key}:recipient:${organizationId}`,
          owner,
          openedAt: next.currentDate,
          openingBalance: money(0, "USD"),
          provenance,
        });
      next = createResourceFlow(next, {
        stableKey: `${key}:grant:${organizationId}`,
        source: { kind: "organization", organizationId: donorId },
        recipient: owner,
        startsAt: next.currentDate,
        amount: money(amount, "USD"),
        cadenceKind: "schedule:one-off",
        basisKind: "custom:authored-payroll-control-capital",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
      next = recordResourceTransferOutcome(next, {
        stableKey: `${key}:funded:${organizationId}`,
        resourceFlowId: next.history.resourceFlows.at(-1)!.id,
        periodStartsAt: next.currentDate,
        periodEndsAt: next.currentDate,
        occurredAt: next.currentDate,
        status: "completed",
        attemptedAmount: money(amount, "USD"),
        transferredAmount: money(amount, "USD"),
        reasonKind: null,
        note: "Recorded capital for the wage-law payment control.",
        provenance,
      });
    }
    return next;
  });
}
