/** KEEP public assessment math and validation closure. Exact error payloads and ordering retained. */
import type { IsoDate, EntityId } from "../../simulation/types";
import type {
  TaxTerms,
  TaxBaseRecord,
  TaxPolicyRecord,
  TaxProposalRecord,
} from "../../simulation/tax-types";
import { isTaxQuantity } from "../../simulation/tax-types";
import { canonicalJson } from "../../simulation/canonical-json";
import { money } from "./money-facts";
export interface TaxPolicyFacts {
  readonly onDate: IsoDate;
  readonly policies: readonly TaxPolicyRecord[];
  readonly proposals: readonly TaxProposalRecord[];
}
export function effectiveTaxPolicy(
  facts: TaxPolicyFacts,
  jurisdictionId: EntityId,
  seriesKey: string,
  at: IsoDate,
): TaxPolicyRecord | null {
  return (
    facts.policies
      .filter(
        (policy) =>
          requireProposal(facts, policy.proposalId).jurisdictionId ===
            jurisdictionId &&
          requireProposal(facts, policy.proposalId).terms.seriesKey ===
            seriesKey,
      )
      .sort(
        (a, b) =>
          a.effectiveAt.localeCompare(b.effectiveAt) || a.sequence - b.sequence,
      )
      .filter(
        (policy) =>
          policy.effectiveAt <= at && policy.recordedAt <= facts.onDate,
      )
      .at(-1) ?? null
  );
}
function requireProposal(facts: TaxPolicyFacts, id: EntityId) {
  const row = facts.proposals.find((row) => row.id === id);
  if (!row) throw Error("Missing tax proposal.");
  return row;
}

export function previewTax(
  terms: TaxTerms,
  baseKey: string,
  amount: TaxBaseRecord["amount"] | null,
) {
  assertTaxTerms(terms);
  if (amount === null)
    return {
      status: "unavailable" as const,
      reason: "The taxable base is absent.",
    };
  const quantity = isTaxQuantity(amount);
  if (
    quantity !== !!terms.baseUnit ||
    (quantity && amount.unit !== terms.baseUnit)
  )
    throw new Error(
      canonicalJson({
        status: "base-unit-mismatch",
        expectedUnit: terms.baseUnit ?? terms.currency,
        amount,
      }),
    );
  const baseUnits = quantity ? amount.units : amount.minorUnits;
  assertAmount(baseUnits, "Tax base");
  if (!quantity && amount.currency !== terms.currency)
    throw new Error("The tax base uses another currency.");
  const excluded =
    baseKey !== terms.baseKey || terms.exemptBaseKeys.includes(baseKey);
  const taxable = excluded
    ? 0
    : Math.max(
        0,
        baseUnits -
          (quantity ? terms.allowanceUnits! : terms.allowanceMinorUnits),
      );
  const numerator = BigInt(taxable) * BigInt(terms.rateNumerator);
  const denominator = BigInt(terms.rateDenominator);
  const rounded = (numerator * 2n + denominator) / (denominator * 2n);
  const tax = Number(rounded);
  if (!Number.isSafeInteger(tax))
    throw new Error("The assessed tax exceeds exact minor-unit arithmetic.");
  return {
    status: "available" as const,
    taxableAmount: quantity
      ? { unit: amount.unit, units: taxable }
      : money(taxable, terms.currency),
    taxAmount: money(tax, terms.currency),
    exemptionReason: excluded
      ? ("excluded-base" as const)
      : taxable === 0 && baseUnits > 0
        ? ("allowance" as const)
        : null,
  };
}

function assertText(value: string, label: string) {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`${label} is required.`);
}

function assertSemantic(value: string, label: string) {
  if (
    typeof value !== "string" ||
    !/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/.test(value)
  )
    throw new Error(`${label} requires a semantic key.`);
}

function assertAmount(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${label} must be exact nonnegative minor units.`);
}

export function assertTaxTerms(terms: TaxTerms) {
  if (terms.currency !== "USD")
    throw new Error(
      "This bounded settlement route supports USD only; no exchange rate or other-currency public balance is inferred.",
    );
  assertSemantic(terms.seriesKey, "Tax series");
  assertSemantic(terms.baseKey, "Tax base");
  assertText(terms.baseLabel, "Tax base label");
  assertAmount(terms.rateNumerator, "Tax rate numerator");
  if (
    !Number.isSafeInteger(terms.rateDenominator) ||
    terms.rateDenominator <= 0 ||
    (!terms.baseUnit && terms.rateNumerator > terms.rateDenominator)
  )
    throw new Error(
      "The modeled tax share requires a positive exact denominator and a share from zero through one. This is a model bound, not a statutory rate cap.",
    );
  if (terms.baseUnit !== undefined) {
    if (
      terms.baseUnit !== "vehicle-mile" ||
      terms.allowanceMinorUnits !== 0 ||
      terms.instrument
    )
      throw new Error(
        canonicalJson({ status: "quantity-terms-mismatch", terms }),
      );
    assertAmount(terms.allowanceUnits!, "Quantity allowance");
  } else if (terms.allowanceUnits !== undefined) {
    throw new Error(
      canonicalJson({ status: "allowance-unit-mismatch", terms }),
    );
  }
  assertAmount(terms.allowanceMinorUnits, "Tax allowance");
  if (
    terms.effectiveDelayDays !== undefined &&
    (!Number.isSafeInteger(terms.effectiveDelayDays) ||
      terms.effectiveDelayDays < 0 ||
      terms.effectiveDelayDays > 3650)
  )
    throw new Error(
      "The modeled effective-date delay must be an exact nonnegative number of days no greater than ten years.",
    );
  assertAmount(terms.collectionLagDays, "Collection lag");
  if (terms.collectionLagDays < 1)
    throw new Error(
      "This dated due-item route requires a settlement lag of at least one day; same-day settlement is not modeled.",
    );
  if (terms.collectionLagDays > 3650)
    throw new Error(
      "The bounded modeled settlement lag cannot exceed ten years.",
    );
  if (
    terms.legalBaselineAssumption !==
      "carry-forward-acquired-baseline-in-game" &&
    terms.legalBaselineAssumption !== "authored-state-game-profile"
  )
    throw new Error(
      "Tax terms require an explicit source-backed or fictional game-profile legal assumption.",
    );
  money(0, terms.currency);
  assertText(terms.publicPurpose, "Tax public purpose");
  assertText(terms.assumptionNote, "Tax assumptions");
  if (
    canonicalJson(terms.exemptBaseKeys) !==
    canonicalJson([...new Set(terms.exemptBaseKeys)].sort())
  )
    throw new Error("Tax exemption keys must be unique and sorted.");
  for (const key of terms.exemptBaseKeys)
    assertSemantic(key, "Tax exempt base");
}
