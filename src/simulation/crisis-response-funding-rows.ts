import { researchRuleTable } from "./research-rule-tables";
import { validatePlaceTable } from "./data-tables";

const table = researchRuleTable("crisisFunding");

export interface StateAdoptedAppropriation {
  readonly amountMinorUnits: number;
  readonly fiscalYear: string;
  readonly availableFrom: string;
  readonly availableThrough: string;
  readonly sourceQuote: string;
}

export interface CrisisFundingRow {
  readonly placeKey: string;
  readonly placeName: string;
  readonly fiscalYearStartsOn: string;
  readonly federalMaxEligibility: {
    readonly maxEligibilityMinorUnits: number;
    readonly basis: "base-award" | "call-share";
    readonly routedCallsFy2021: number | null;
    readonly callShareLabel: string | null;
  };
  readonly state:
    | {
        readonly budgetCycle: string;
        readonly appropriationLine: string | null;
        readonly stateAdoptedAppropriations: readonly StateAdoptedAppropriation[];
        readonly allSourceTotalMinorUnits: number | null;
        readonly allSourceTotalPeriod: string | null;
        readonly summary: string | null;
      }
    | { readonly unreported: string };
}

export const CRISIS_FUNDING_FEDERAL_SOURCE = table.federalSource;
export const CRISIS_FUNDING_STATE_SOURCE = table.stateSource;
export const CRISIS_FUNDING_ROWS = validatePlaceTable(
  "crisis-response funding",
  table.rows as CrisisFundingRow[],
);
