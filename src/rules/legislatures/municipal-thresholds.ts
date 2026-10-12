import type {
  VoteDenominator,
  RuleSourceRef,
  VoteThresholdRule,
} from "../../simulation/legislature-rules";
import type { MunicipalVoteThreshold } from "../../simulation/municipal-government";
export function majorityOf(
  countedAgainst: VoteDenominator,
  label: string,
  source: RuleSourceRef,
): VoteThresholdRule {
  return {
    numerator: 1,
    denominatorParts: 2,
    countedAgainst,
    rounding: "strictly-greater-than-fraction",
    label,
    source,
  };
}

export function fractionOf(
  numerator: number,
  denominatorParts: number,
  countedAgainst: VoteDenominator,
  label: string,
  source: RuleSourceRef,
  minimumVotes?: number,
): VoteThresholdRule {
  return {
    numerator,
    denominatorParts,
    countedAgainst,
    rounding: "at-least-fraction",
    ...(minimumVotes === undefined ? {} : { minimumVotes }),
    label,
    source,
  };
}
export function municipalVoteThresholdRule(
  threshold: MunicipalVoteThreshold,
  label: string,
  source: RuleSourceRef,
): VoteThresholdRule {
  const countedAgainst =
    threshold.denominatorBasis === "MEMBERS_PRESENT_AND_VOTING"
      ? "members-voting"
      : threshold.denominatorBasis === "MEMBERS_PRESENT"
        ? "members-present"
        : "members-elected";
  if (threshold.denominatorBasis === "FIXED_COUNT") {
    const floor = threshold.fixedVotesRequired ?? threshold.numerator;
    return fractionOf(
      threshold.numerator,
      threshold.denominator,
      "members-elected",
      label,
      source,
      floor,
    );
  }
  if (threshold.numerator === 1 && threshold.denominator === 2) {
    return majorityOf(countedAgainst, label, source);
  }
  return fractionOf(
    threshold.numerator,
    threshold.denominator,
    countedAgainst,
    label,
    source,
  );
}
