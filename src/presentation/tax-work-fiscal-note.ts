import { currentMeasureProvisions } from "../simulation";
import type { World } from "../simulation";
import { readFiledTaxContentIdentity } from "../simulation/legislation-tax-identity";
import {
  STATE_WAGE_TAX_BASE_KEY,
  taxRatePercentText,
} from "../simulation/tax-policy";
import type { TaxProposalRecord, TaxTerms } from "../simulation/tax-types";
import type { BillFiscalNote, FiscalNotePart } from "./legislation-analysis";

/** The rate is stated by the levy; a future taxable wage base is not. */
export interface TaxWorkFiscalNote {
  readonly fiscal: BillFiscalNote;
  readonly rateLabel: string;
  readonly baseLabel: string;
  readonly lawfulZero: boolean;
}

function rateNote(
  terms: TaxTerms,
  designation: string,
  status: BillFiscalNote["status"],
  operativeAt: string | null,
  section: Pick<FiscalNotePart, "provisionKey" | "sectionNumber" | "heading">,
): TaxWorkFiscalNote {
  return {
    fiscal: {
      designation,
      status,
      operativeAt,
      endsOn: null,
      parts: [
        {
          ...section,
          lever: "rate",
          affectedLabel: terms.baseLabel,
          payerLabel: null,
          recipientLabel: null,
          statedAmountLabel: null,
          statedAmountMinorUnits: null,
          amountKind: "none",
          forecastMinorUnits: null,
          missingInput:
            "recorded future taxable wages and a comparable current-law receipts baseline",
        },
      ],
    },
    rateLabel: taxRatePercentText(terms),
    baseLabel: terms.baseLabel,
    lawfulZero: terms.rateNumerator === 0,
  };
}

/** An unfiled preview uses the exact terms passed to the canonical tax writer. */
export function draftStateWageTaxFiscalNote(
  terms: TaxTerms,
): TaxWorkFiscalNote {
  return rateNote(terms, "Unfiled state wage-tax rate bill", "draft", null, {
    provisionKey: "tax-levy",
    sectionNumber: 1,
    heading: "State wage-tax rate",
  });
}

/** Read the saved levy, refusing a stale rate when its pinned text changed. */
export function filedStateWageTaxFiscalNote(
  world: World,
  proposal: TaxProposalRecord,
):
  | { readonly kind: "available"; readonly note: TaxWorkFiscalNote }
  | { readonly kind: "unavailable"; readonly reason: string } {
  if (
    proposal.power !== null ||
    !proposal.gameProfileRef ||
    proposal.terms.baseKey !== STATE_WAGE_TAX_BASE_KEY
  )
    return {
      kind: "unavailable",
      reason: "This fiscal note covers saved state wage-tax rate bills only.",
    };
  const identity = readFiledTaxContentIdentity(world, proposal.measureId);
  if (identity.kind !== "available") return identity;
  if (identity.identity.proposalId !== proposal.id)
    return {
      kind: "unavailable",
      reason: "This tax proposal does not match the current pinned levy.",
    };
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === proposal.measureId,
  );
  const section = currentMeasureProvisions(world, proposal.measureId)[0];
  if (!measure || !section)
    return {
      kind: "unavailable",
      reason: "The current tax measure or levy is missing.",
    };
  const policy = world.history.taxPolicies?.find(
    (row) => row.proposalId === proposal.id,
  );
  return {
    kind: "available",
    note: rateNote(
      proposal.terms,
      measure.designation,
      policy ? "enacted" : "filed",
      policy?.effectiveAt ?? null,
      section,
    ),
  };
}
