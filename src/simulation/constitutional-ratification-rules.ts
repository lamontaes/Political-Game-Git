import research from "../../data/research/legislature/federal-amendment-ratification-rules-2026.json" with { type: "json" };
import type { VoteThresholdRule } from "./legislature-rules";

/**
 * Every actual state chamber has a disclosed ratification threshold.
 * Explicit, unconditional ratification rules retain their primary-source
 * values. Other chambers use the owner-approved majority-of-elected ESTIMATE;
 * the historical CRS summary supplies context, not proof of that denominator.
 * Unimplemented conditions and extra floors remain disclosed research gaps.
 */
export function stateRatificationRule(
  stateKey: string,
  bodyKey: string,
): {
  readonly threshold: VoteThresholdRule;
  readonly quorum: VoteThresholdRule;
  readonly basis: "sourced" | "estimate";
} | null {
  const state = research.rows.find((row) => row.stateKey === stateKey);
  const chamber = state?.chambers.find((row) => row.chamber === bodyKey);
  if (!state || !chamber) return null;
  const citation = chamber.citations[0];
  const threshold = chamber.threshold;
  const conditions =
    "conditions" in state ? (state.conditions ?? []) : [];
  const exact =
    chamber.ruleKind === "ratification-specific" &&
    !("alsoRequires" in threshold) &&
    citation !== undefined;
  const summary = research.surveyNote.citations[0];
  const gap = [
    `Research classification: ${chamber.ruleKind}.`,
    ...conditions.map((condition) => `Unimplemented condition: ${condition.text}`),
    ...("alsoRequires" in threshold
      ? ["The research records an additional vote floor not admitted here."]
      : []),
  ].join(" ");
  const source = exact
    ? {
        authority: "research-reference" as const,
        citation: citation!.text,
        sourceTitle: `${conditions.length ? "ESTIMATE admission — " : ""}${state.state}: ${chamber.name} federal amendment ratification`,
        sourceUrl: citation!.url,
        retrievedAt: citation!.accessed,
        verification: conditions.length ? ("partial" as const) : ("verified" as const),
        note: conditions.length
          ? `Exact cited voting fraction; ESTIMATE admission because conditions are not implemented. ${gap}`
          : "Explicit ratification requirement in the approved 2026 research corpus.",
      }
    : {
        authority: "research-reference" as const,
        citation: `ESTIMATE: owner-approved majority of elected members; summary context: ${summary!.text}`,
        sourceTitle: `ESTIMATE — ${state.state}: ${chamber.name} federal amendment ratification`,
        sourceUrl: summary!.url,
        retrievedAt: summary!.accessed,
        verification: "partial" as const,
        note: `ESTIMATE, not verified state law. The CRS survey does not establish this chamber's denominator. ${gap} Primary research remains in the corpus; no condition is claimed implemented.`,
      };
  const [numerator, denominatorParts] = (
    exact ? threshold.fraction : "1/2"
  ).split("/").map(Number);
  const [quorumNumerator, quorumDenominator] = chamber.quorum.fraction
    .split("/")
    .map(Number);
  const quorumSource = citation
    ? {
        authority: "research-reference" as const,
        citation: chamber.citations.map((row) => row.text).join("; "),
        sourceTitle: `${state.state}: ${chamber.name} quorum`,
        sourceUrl: citation.url,
        retrievedAt: citation.accessed,
        verification: "partial" as const,
        note: "Quorum value retained from the existing cited research row; not a claim that the ratification threshold is verified.",
      }
    : source;
  return {
    basis: exact && conditions.length === 0 ? "sourced" : "estimate",
    threshold: {
      numerator: numerator!,
      denominatorParts: denominatorParts!,
      countedAgainst:
        !exact || threshold.basis === "elected"
          ? "members-elected"
          : "presentMeans" in threshold &&
              threshold.presentMeans === "members-present"
            ? "members-present"
            : "members-voting",
      rounding: !exact || threshold.strictlyGreater
        ? "strictly-greater-than-fraction"
        : "at-least-fraction",
      label: exact
        ? chamber.rounding
        : "ESTIMATE: strictly more than half of the elected members of this chamber.",
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
      source: exact ? source : quorumSource,
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
