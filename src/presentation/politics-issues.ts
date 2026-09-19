import type { EntityId, World } from "../simulation";
import { taxPowerEvidenceFor } from "../simulation/tax-policy";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import { projectTransitWork } from "./transit-work";

/**
 * Which Issues and budget sections Politics offers this life.
 *
 * The public budget is for everyone. Transit service and tax work are an
 * office's configuration tools, so the tab strip offers them only to a player
 * whose current office can file them, or who already has such a record to
 * follow (their own filed transit bill, their own or an enacted tax). Nothing
 * is deleted: the mechanics stay exactly where they were.
 */
export interface PoliticsIssueAccess {
  readonly transit: boolean;
  readonly tax: boolean;
}

export function politicsIssueAccess(
  world: World,
  personId: EntityId,
): PoliticsIssueAccess {
  const transit = projectTransitWork(world, personId);
  const entry = resolveLegislativeFilingEntry(world, personId);
  const taxPower =
    entry.kind === "available" &&
    taxPowerEvidenceFor(entry.seat.jurisdictionKey) !== null;
  const taxRecords = (world.history.taxProposals ?? []).some(
    (row) =>
      row.sponsorPersonId === personId ||
      world.history.taxPolicies?.some((policy) => policy.proposalId === row.id),
  );
  return {
    transit: transit.office.kind === "available" || transit.bills.length > 0,
    tax: taxPower || taxRecords,
  };
}

export const ISSUE_WITHHELD = {
  transit:
    "Transit service work opens when you hold an office that can propose a service appropriation.",
  tax: "Tax work opens when you hold an office with power to propose taxes.",
} as const;
