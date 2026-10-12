import { LAWS_PARAMETERS as parameters } from "./parameters";

export interface LawExposureFeltSizeFacts {
  readonly direction: "gain" | "cost" | "none";
  readonly amountMinor: number | null;
  readonly monthlyPayMinor: number;
}

export type LawExposureFeltSize =
  { readonly share: number; readonly estimated: boolean } | "unmeasured" | null;

export function lawExposureFeltSizeFromFacts(
  facts: LawExposureFeltSizeFacts,
): LawExposureFeltSize {
  if (facts.direction === "none") return null;
  if (facts.amountMinor === null)
    return {
      share: parameters.nonMoneyFeltSizeMonthsOfPay.value,
      estimated: true,
    };
  if (facts.monthlyPayMinor <= 0) return "unmeasured";
  return {
    share: facts.amountMinor / facts.monthlyPayMinor,
    estimated: false,
  };
}
