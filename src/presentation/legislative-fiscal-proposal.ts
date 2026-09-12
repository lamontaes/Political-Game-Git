import type { PortableFiscalAuthorityRecord } from "../fiscal-authority/query";
import type { World } from "../simulation";
import {
  openFiscalAuthorityWork,
  type FiscalAuthorityWorkRequest,
  type FiscalAuthorityWorkResult,
} from "./fiscal-authority-work";

export const LEGISLATIVE_FISCAL_PROPOSAL_INTEGRATION = {
  authorizationOwner: "LEG",
  normalWorkMountOwner: "UI",
  municipalExecutionOwner: "MUNI",
  unaffectedInterfaces: ["EXEC", "ECON"],
} as const;

export type LegislativeFiscalProposalRequest = Omit<
  FiscalAuthorityWorkRequest,
  "action"
>;

/**
 * LEG-owned proposal-analysis entry point for UI to mount in normal Work.
 *
 * Authorization still comes from the canonical active legislative seat. This
 * adapter cannot request the local-authority exercise route and never applies a
 * levy, changes law, touches ECON, or manufactures a fiscal forecast.
 */
export function openLegislativeFiscalProposalAnalysis(
  world: World,
  records: readonly PortableFiscalAuthorityRecord[],
  request: LegislativeFiscalProposalRequest,
): FiscalAuthorityWorkResult {
  return openFiscalAuthorityWork(world, records, {
    ...request,
    action: "propose-authority-change",
  });
}
