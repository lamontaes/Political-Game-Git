import research from "../../data/research/legislature/federal-amendment-ratification-rules-2026.json" with { type: "json" };
import type { VoteThresholdRule } from "./legislature-rules";

interface Citation {
  readonly text: string;
  readonly url: string;
  readonly accessed: string;
}

/** A cited instrument/procedure bridge is distinct from assuming that the
 * ordinary bill or parliamentary vote applies to ratification. */
function sourcedBridgeCitations(chamber: {
  readonly ruleKind: string;
  readonly citations: readonly Citation[];
  readonly ratificationBridge?: unknown;
}): { readonly threshold: Citation; readonly quorum: Citation } | null {
  if (
    chamber.ruleKind !== "bill-rule-by-reference" &&
    chamber.ruleKind !== "resolution-rule"
  )
    return null;
  const bridge = chamber.ratificationBridge;
  if (
    !bridge ||
    typeof bridge !== "object" ||
    !("kind" in bridge) ||
    bridge.kind !== "sourced-form-and-vote-rule"
  )
    return null;
  let thresholdCitation: Citation | null = null;
  let quorumCitation: Citation | null = null;
  for (const role of [
    "formCitationIndex",
    "procedureCitationIndex",
    "thresholdCitationIndex",
    "quorumCitationIndex",
  ]) {
    const index = (bridge as Record<string, unknown>)[role];
    if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0)
      return null;
    const citation = chamber.citations[index];
    if (
      !citation?.text.trim() ||
      !citation.url.startsWith("https://") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(citation.accessed)
    )
      return null;
    if (role === "thresholdCitationIndex") thresholdCitation = citation;
    if (role === "quorumCitationIndex") quorumCitation = citation;
  }
  return thresholdCitation && quorumCitation
    ? { threshold: thresholdCitation, quorum: quorumCitation }
    : null;
}

/** Explicit ratification rules and source-backed instrument/procedure bridges
 * are admitted without an unimplemented condition. Ordinary-question inferences
 * and unsourced defaults remain research leads, not ratification permission. */
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
  if (!chamber) return null;
  const direct = chamber.ruleKind === "ratification-specific";
  const bridge = direct ? null : sourcedBridgeCitations(chamber);
  const citation = direct ? chamber.citations[0] : bridge?.threshold;
  if (!citation) return null;
  const quorumIndex =
    "citationIndex" in chamber.quorum
      ? chamber.quorum.citationIndex
      : undefined;
  if (
    quorumIndex !== undefined &&
    (typeof quorumIndex !== "number" ||
      !Number.isSafeInteger(quorumIndex) ||
      quorumIndex < 0 ||
      !chamber.citations[quorumIndex])
  )
    return null;
  const quorumCitation =
    typeof quorumIndex === "number"
      ? chamber.citations[quorumIndex]!
      : (bridge?.quorum ?? citation);
  const source = {
    authority: "research-reference" as const,
    citation: citation.text,
    sourceTitle: `${state.state}: ${chamber.name} federal amendment ratification`,
    sourceUrl: citation.url,
    retrievedAt: citation.accessed,
    verification: "verified" as const,
    note: direct
      ? "Explicit ratification requirement in the approved 2026 research corpus."
      : "The cited ratification instrument and procedure apply this sourced vote rule; no ordinary-question inference is admitted.",
  };
  const threshold = chamber.threshold;
  // Additional requirements need their own explicit admission, not a prose
  // interpretation or a silently dropped floor.
  if ("alsoRequires" in threshold) return null;
  const minimumVotes =
    "minimumVotes" in threshold ? threshold.minimumVotes : undefined;
  if (
    minimumVotes !== undefined &&
    (typeof minimumVotes !== "number" ||
      !Number.isSafeInteger(minimumVotes) ||
      minimumVotes < 1)
  )
    return null;
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
      ...(typeof minimumVotes === "number" ? { minimumVotes } : {}),
    },
    quorum: {
      numerator: quorumNumerator!,
      denominatorParts: quorumDenominator!,
      countedAgainst: "members-elected",
      rounding: chamber.quorum.strictlyGreater
        ? "strictly-greater-than-fraction"
        : "at-least-fraction",
      label: chamber.quorum.text,
      source: {
        ...source,
        citation: quorumCitation.text,
        sourceUrl: quorumCitation.url,
        retrievedAt: quorumCitation.accessed,
      },
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
