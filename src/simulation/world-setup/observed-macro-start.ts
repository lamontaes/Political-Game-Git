import referenceJson from "./macro-opening-reference.generated.json" with { type: "json" };
import { canonicalJson } from "../canonical-json";
import { sha256Hex } from "../sha256";
import { CRUNCH46_PROVISIONAL_POLICY } from "../macro-economy/policy";
import { roundMacro } from "../macro-economy/kernel";
import { detLog, logistic } from "./deterministic-math";

/** Dated real observations calibrate the fictional start; never past releases. */
export function observedMacroStartingDraft() {
  const value = (field: string) => {
    const row = referenceJson.observations.find((item) => item.field === field);
    if (!row || !Number.isFinite(row.value))
      throw new Error(`Missing macro source field: ${field}`);
    return row.value;
  };
  const supplyUnits = value("supplyUnits");
  const demandHouseholds = value("occupiedHouseholds");
  return {
    kind: "macro-starting-conditions" as const,
    stableKey: "world-setup:observed-macro-start:v2",
    contractVersion: "observed-macro-start/v2" as const,
    regime: null,
    volatilityScale: null,
    latents: null,
    reference: {
      basis: "estimated-from-observed-reference" as const,
      asOfDate: referenceJson.asOfDate,
      sourceSha256: sha256Hex(canonicalJson(referenceJson)),
      housingBasis: "total-stock-per-occupied-household" as const,
      creditBasis: "nfci-through-existing-credit-logit" as const,
      observations: referenceJson.observations.map((row) => ({ ...row })),
    },
    initial: {
      realGrowthAnnualPct: roundMacro(
        100 * detLog(1 + value("realGrowthAnnualPct") / 100),
      ),
      unemploymentPct: value("unemploymentPct"),
      inflation12mPct: roundMacro(
        100 * detLog(1 + value("inflation12mPct") / 100),
      ),
      housingSupplyDemandRatio: roundMacro(supplyUnits / demandHouseholds),
      creditTightness: roundMacro(
        logistic(
          CRUNCH46_PROVISIONAL_POLICY.startup.creditLogisticCoefficient *
            value("creditConditionsIndex"),
        ),
      ),
    },
    initialHousingCounts: { supplyUnits, demandHouseholds },
    initialPolicyRate: {
      lowerPct: value("policyRateLowerPct"),
      upperPct: value("policyRateUpperPct"),
    },
  };
}
