/** The same live-law premium rule for full paychecks and counted wages. */
import parameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import { BUDGETS_MODULE_ID, governments } from "./modules/budgets";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import type { CoreAPI } from "./types";

export const PAID_LEAVE_KEY =
  "us-policy-positions:labor-workforce.paid-family-leave";
export interface PaidLeaveProgram {
  readonly lawId: string;
  readonly governmentId: string;
  readonly treasuryId: string;
  readonly townPlaceId: string;
  readonly share: number;
}

export function paidLeaveProgram(api: CoreAPI): PaidLeaveProgram | undefined {
  if (
    !api.state.modules.has(LAWS_MODULE_ID) ||
    !api.state.modules.has(BUDGETS_MODULE_ID)
  )
    return;
  const answer = lawInForce(api, PAID_LEAVE_KEY);
  const govs = governments(api);
  for (const level of ["federal", "state", "county", "city"]) {
    const law = answer.levels.find(
      (row) => row.level === level && !row.setAside && row.row?.value === 1,
    )?.row;
    const gov = govs.find((row) => row.level === level);
    if (!law || !gov) continue;
    // stopgapId: SG-GOV-REACH-A-leave-claims
    api.stopgap("SG-GOV-REACH-A-leave-claims");
    return {
      lawId: law.id,
      governmentId: gov.id,
      treasuryId: gov.organizationId,
      townPlaceId: lawChain(api).townPlaceId,
      share: parameters.parameters.paidLeavePremiumShare.value,
    };
  }
}

/** Whole cents per worker, then the group's worker count; never more than available pay. */
export function paidLeavePremium(
  grossMinor: number,
  availableMinor: number,
  share: number,
  workers = 1,
): number {
  if (grossMinor <= 0 || availableMinor <= 0 || workers <= 0) return 0;
  return Math.min(
    Math.floor(availableMinor),
    Math.round(Math.round((grossMinor / workers) * share) * workers),
  );
}
