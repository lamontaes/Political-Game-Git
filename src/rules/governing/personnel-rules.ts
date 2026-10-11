// STOPGAP(RULES3-GOV-005): see docs/plans/rules3/governing-stopgaps.json.
// Lifted unchanged from src/simulation/civil-personnel-rules.ts; RULES-3, 2026-10-11.
import data from "../../../data/research/civil-personnel-jurisdiction-rules.json" with { type: "json" };
import type {
  PersonnelProcedure,
  PersonnelProcedureKey,
} from "../../simulation/civil-personnel-contract";

export interface PersonnelJurisdictionRule {
  readonly jurisdictionKey: string;
  readonly estimatedFrom: string | null;
  readonly employerLevel: string;
  readonly protectedClass: string;
  readonly protectedTenure: string;
  readonly reviewAgreement: string;
  readonly classifiedProcedureAvailable: boolean;
  readonly boundaryProcedureKey: PersonnelProcedureKey;
  readonly boundaryClass: "unclassified" | "exempt";
  readonly boundaryEstimatedFrom: string | null;
  readonly extraAppealFindingRequired: boolean;
}

export const PERSONNEL_JURISDICTION_RULES =
  data.rows as readonly PersonnelJurisdictionRule[];

export const byJurisdiction = new Map(
  PERSONNEL_JURISDICTION_RULES.map((row) => [row.jurisdictionKey, row]),
);

export function personnelJurisdictionRule(
  jurisdictionKey: string,
): PersonnelJurisdictionRule | null {
  return byJurisdiction.get(jurisdictionKey) ?? null;
}

export function personnelProcedureApplies(
  procedure: PersonnelProcedure,
  jurisdictionKey: string,
  onDate: string,
): boolean {
  const rule = personnelJurisdictionRule(jurisdictionKey);
  return (
    rule !== null &&
    rule.classifiedProcedureAvailable &&
    (rule.estimatedFrom !== null || onDate >= procedure.validity.observedOn)
  );
}
