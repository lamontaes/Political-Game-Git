import type { IsoDate } from "../../simulation/types";
import { yearOf } from "../../simulation/dates";
export function povertyLineMinor(
  householdSize: number,
  firstPersonMinor: number,
  eachAddedPersonMinor: number,
): number {
  if (householdSize < 1)
    throw new Error("A household has at least one person.");
  return firstPersonMinor + (householdSize - 1) * eachAddedPersonMinor;
}
type Guideline = {
  readonly contiguous: {
    readonly "1": number;
    readonly eachAdditional: number;
  };
} & Readonly<
  Record<
    string,
    {
      readonly "1": number;
    }
  >
>;

const PERIODS_PER_YEAR: Readonly<Record<string, number>> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

export function annualizedRecordedPayMinor(
  amountMinor: number,
  cadenceKind: string,
): number | null {
  const match = /(weekly|biweekly|semimonthly|monthly)/.exec(cadenceKind);
  const perYear = match ? PERIODS_PER_YEAR[match[1]!] : undefined;
  return perYear ? amountMinor * perYear : null;
}
export interface PovertyFacts {
  readonly guidelines: readonly (readonly [number, Guideline])[];
  readonly stateNames: Readonly<Record<string, { readonly name: string }>>;
}
// stopgapId: "economy.poverty-year-region-extrapolation"
export function annualPovertyLineMinor(
  facts: PovertyFacts,
  stateKey: string,
  householdSize: number,
  onDate: IsoDate,
): number {
  const year = yearOf(onDate);
  const guideline = (facts.guidelines.filter(([read]) => read <= year).at(-1) ??
    facts.guidelines[0]!)[1];
  const contiguous = guideline.contiguous;
  const name = facts.stateNames[stateKey.slice(3)]?.name.toLowerCase();
  const own = name && name !== "contiguous" ? guideline[name] : undefined;
  const first = own?.["1"] ?? contiguous["1"];
  const added = own
    ? (contiguous.eachAdditional * own["1"]) / contiguous["1"]
    : contiguous.eachAdditional;
  return Math.round(
    povertyLineMinor(Math.max(1, householdSize), first, added) * 100,
  );
}
