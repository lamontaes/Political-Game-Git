/** Bounded own public canonical-effect guard. Its private predicate is compared through native assertPolicySemanticsIntegrity, with all other saved-history guards held valid. */
import type {
  EffectActivationRecord,
  PolicyOperationRecord,
  PolicyEstimatedConsequence,
  PolicyEstimateRecord,
  CausalProcessRecord,
  PolicyRealizationRecord,
} from "../../simulation/types";
import { isCanonicalRealizedPolicyEffect } from "./policy-math";
export function assertCanonicalRealizedPolicyEffect(
  effect: EffectActivationRecord | undefined,
  operation: PolicyOperationRecord,
  expected: PolicyEstimatedConsequence,
  estimate: PolicyEstimateRecord,
  cause: CausalProcessRecord,
  realization: PolicyRealizationRecord,
  item: PolicyRealizationRecord["consequences"][number],
) {
  if (
    !effect ||
    !isCanonicalRealizedPolicyEffect(
      effect,
      operation,
      expected,
      estimate,
      cause,
      realization,
    ) ||
    JSON.stringify(item.realizedChange) !==
      JSON.stringify(expected.estimatedChange)
  )
    throw Error(
      "Policy realization has mismatched Run B effect: " + realization.id,
    );
}
