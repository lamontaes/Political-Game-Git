import type {
  VoteThresholdRule,
  ThresholdResolution,
  RuleSourceRef,
} from "../../simulation/legislature-rules";
import { PROCEDURE_PARAMETERS } from "./parameters";
export function resolveRequiredVotes(
  rule: VoteThresholdRule,
  denominatorValue: number,
): ThresholdResolution {
  assertThresholdRule(rule);
  if (!Number.isSafeInteger(denominatorValue) || denominatorValue < 0) {
    throw new Error(
      `Vote denominator must be a non-negative integer: ${denominatorValue}`,
    );
  }
  const exact = (denominatorValue * rule.numerator) / rule.denominatorParts;
  const fromFraction =
    rule.rounding === "strictly-greater-than-fraction"
      ? Math.floor(exact) + 1
      : Math.ceil(exact - PROCEDURE_PARAMETERS.voteRoundingTolerance.value);
  // stopgapId: "SG-P14-legislatures-zero-membership-cap"
  const capped = Math.min(Math.max(fromFraction, 0), denominatorValue);
  return {
    denominatorValue,
    requiredVotes: Math.max(capped, rule.minimumVotes ?? 0),
    rule,
  };
}

export function assertThresholdRule(rule: VoteThresholdRule): void {
  if (!rule || typeof rule !== "object") {
    throw new Error("A vote threshold rule must be an object.");
  }
  if (
    !Number.isSafeInteger(rule.numerator) ||
    !Number.isSafeInteger(rule.denominatorParts) ||
    rule.numerator <= 0 ||
    rule.denominatorParts <= 0 ||
    rule.numerator > rule.denominatorParts
  ) {
    throw new Error(
      `Vote threshold fraction is invalid: ${rule.numerator}/${rule.denominatorParts}`,
    );
  }
  if (
    rule.minimumVotes !== undefined &&
    (!Number.isSafeInteger(rule.minimumVotes) || rule.minimumVotes <= 0)
  ) {
    throw new Error(
      `Vote threshold floor is invalid: ${String(rule.minimumVotes)}`,
    );
  }
  if (rule.label.trim().length === 0) {
    throw new Error("A vote threshold rule must carry a plain-language label.");
  }
  assertSourceRef(rule.source, `threshold '${rule.label}'`);
}

export function assertSourceRef(source: RuleSourceRef, label: string): void {
  if (!source || typeof source !== "object") {
    throw new Error(`${label} must cite an institutional source.`);
  }
  if (source.citation.trim().length === 0) {
    throw new Error(`${label} source must carry a citation.`);
  }
  if (source.sourceTitle.trim().length === 0) {
    throw new Error(`${label} source must carry a title.`);
  }
}
