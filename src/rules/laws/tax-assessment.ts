import { LAWS_PARAMETERS as parameters } from "./parameters";

export interface TaxAssessmentTermsFacts {
  readonly baseKey: string;
  readonly baseUnit?: "vehicle-mile";
  readonly allowanceUnits?: number;
  readonly rateNumerator: number;
  readonly rateDenominator: number;
  readonly exemptBaseKeys: readonly string[];
  readonly allowanceMinorUnits: number;
  readonly currency: string;
}

export type TaxBaseFacts =
  | {
      readonly kind: "money";
      readonly minorUnits: number;
      readonly currency: string;
    }
  | {
      readonly kind: "quantity";
      readonly unit: "vehicle-mile";
      readonly units: number;
    }
  | null;

export type TaxAssessmentResult =
  | {
      readonly status: "unavailable";
      readonly reasonCode: "taxable-base-absent";
    }
  | {
      readonly status: "available";
      readonly taxableAmount:
        | { readonly unit: "vehicle-mile"; readonly units: number }
        | { readonly minorUnits: number; readonly currency: string };
      readonly taxAmount: {
        readonly minorUnits: number;
        readonly currency: string;
      };
      readonly exemptionReason: "excluded-base" | "allowance" | null;
    };

function assertMinorUnits(value: number, description: string): void {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${description} must be exact nonnegative minor units.`);
}

/** Calculate an assessment after tax terms and taxable-base facts are selected. */
export function taxAssessmentFromFacts(
  terms: TaxAssessmentTermsFacts,
  baseKey: string,
  amount: TaxBaseFacts,
): TaxAssessmentResult {
  if (amount === null)
    return { status: "unavailable", reasonCode: "taxable-base-absent" };
  const quantity = amount.kind === "quantity";
  if (
    quantity !== !!terms.baseUnit ||
    (quantity && amount.unit !== terms.baseUnit)
  )
    throw new Error("Taxable base units do not match selected tax terms.");
  const baseUnits = quantity ? amount.units : amount.minorUnits;
  assertMinorUnits(baseUnits, quantity ? "Tax quantity" : "Tax base");
  if (!quantity && amount.currency !== terms.currency)
    throw new Error("Taxable base currency does not match selected tax terms.");
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
  const rounding = BigInt(parameters.halfUpRoundingFactor.value);
  const rounded =
    (numerator * rounding + denominator) / (denominator * rounding);
  const tax = Number(rounded);
  if (!Number.isSafeInteger(tax))
    throw new Error("Assessed tax exceeds exact minor-unit arithmetic.");
  return {
    status: "available",
    taxableAmount: quantity
      ? { unit: amount.unit, units: taxable }
      : { minorUnits: taxable, currency: terms.currency },
    taxAmount: { minorUnits: tax, currency: terms.currency },
    exemptionReason: excluded
      ? "excluded-base"
      : taxable === 0 && baseUnits > 0
        ? "allowance"
        : null,
  };
}
