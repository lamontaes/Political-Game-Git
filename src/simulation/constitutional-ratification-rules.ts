import research from "../../data/research/legislature/federal-amendment-ratification-rules-2026.json" with { type: "json" };
import type { VoteThresholdRule } from "./legislature-rules";

/** Only explicit ratification rules without an unimplemented condition are
 * admitted. Ordinary-question inferences and unsourced defaults are research
 * leads, not permission to record a state's ratification. */
export function stateRatificationRule(
  stateKey: string,
  bodyKey: string,
): {
  readonly threshold: VoteThresholdRule;
  readonly quorum: VoteThresholdRule;
} | null {
  const state = research.rows.find((row) => row.stateKey === stateKey);
  if (!state || ("conditions" in state && (state.conditions?.length ?? 0) > 0))
    return null;
  const chamber = state.chambers.find((row) => row.chamber === bodyKey);
  if (!chamber || chamber.ruleKind !== "ratification-specific") return null;
  const citation = chamber.citations[0];
  if (!citation) return null;
  const source = {
    authority: "research-reference" as const,
    citation: citation.text,
    sourceTitle: `${state.state}: ${chamber.name} federal amendment ratification`,
    sourceUrl: citation.url,
    retrievedAt: citation.accessed,
    verification: "verified" as const,
    note: "Explicit ratification requirement in the approved 2026 research corpus.",
  };
  const threshold = chamber.threshold;
  // Additional requirements need their own explicit admission, not a prose
  // interpretation or a silently dropped floor.
  if ("alsoRequires" in threshold) return null;
  const [numerator, denominatorParts] = threshold.fraction
    .split("/")
    .map(Number);
  const [quorumNumerator, quorumDenominator] = chamber.quorum.fraction
    .split("/")
    .map(Number);
  return {
    threshold: {
      numerator: numerator!,
      denominatorParts: denominatorParts!,
      countedAgainst:
        threshold.basis === "elected"
          ? "members-elected"
          : "presentMeans" in threshold &&
              threshold.presentMeans === "members-present"
            ? "members-present"
            : "members-voting",
      rounding: threshold.strictlyGreater
        ? "strictly-greater-than-fraction"
        : "at-least-fraction",
      label: chamber.rounding,
      source,
    },
    quorum: {
      numerator: quorumNumerator!,
      denominatorParts: quorumDenominator!,
      countedAgainst: "members-elected",
      rounding: chamber.quorum.strictlyGreater
        ? "strictly-greater-than-fraction"
        : "at-least-fraction",
      label: chamber.quorum.text,
      source,
    },
  };
}

export function stateRatificationChambers(
  stateKey: string,
): readonly string[] | null {
  const state = research.rows.find((row) => row.stateKey === stateKey);
  if (!state || !state.sameResolutionBothChambers) return null;
  const bodies = state.chambers.map((row) => row.chamber);
  return bodies.every((body) => stateRatificationRule(stateKey, body))
    ? bodies
    : null;
}
