import { LAWS_PARAMETERS as parameters } from "./parameters";

/** Calculate a spending offset's share of selected annual GDP facts. */
export function federalDeficitChangePctOfGdpFromFacts(
  cutDollars: number | null,
  aidDollars: number | null,
  nationalGdpDollars: number,
): number | null {
  if (
    cutDollars === null ||
    aidDollars === null ||
    !Number.isFinite(nationalGdpDollars) ||
    nationalGdpDollars <= 0
  )
    return null;
  return (
    (parameters.percentageMultiplier.value * (aidDollars - cutDollars)) /
    nationalGdpDollars
  );
}

/** Apply an adopted spending offset to a selected complete spending base. */
export function federalAidFactorFromFacts(
  cutDollars: number | null,
  annualSpendingBaseDollars: number | null,
): number {
  return cutDollars === null || annualSpendingBaseDollars === null
    ? 1
    : Math.max(0, 1 - cutDollars / annualSpendingBaseDollars);
}
