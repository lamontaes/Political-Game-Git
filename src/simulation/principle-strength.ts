/** One recorded source's pull on one principle; identity prevents repeated reads. */
export interface WeightedPrinciplePull {
  readonly evidenceKey: string;
  readonly direction: "endorses" | "rejects";
  /** A pull cannot establish certainty by itself. */
  readonly weight: number;
}

export interface CombinedPrincipleStrength {
  readonly strength: number;
  readonly direction: "endorses" | "rejects" | null;
  readonly supportFor: number;
  readonly supportAgainst: number;
  readonly evidenceKeys: readonly string[];
}

/**
 * CTO September 30, 3:05 a.m.: agreeing recorded pulls combine as
 * 1 - product(1 - weight); subtract opposing support to find direction.
 * This arithmetic supplies no life evidence, authored weights, threshold,
 * calendar decay or outcome draw. The canonical writer owns those inputs.
 */
export function combinePrinciplePulls(
  pulls: readonly WeightedPrinciplePull[],
): CombinedPrincipleStrength {
  const unique = new Map<string, WeightedPrinciplePull>();
  for (const pull of pulls) {
    if (pull.evidenceKey.trim().length === 0)
      throw new Error("A principle pull needs a recorded evidence key.");
    if (!Number.isFinite(pull.weight) || pull.weight < 0 || pull.weight >= 1)
      throw new Error("A principle pull weight must be finite and in [0, 1).");
    if (pull.direction !== "endorses" && pull.direction !== "rejects")
      throw new Error("A principle pull needs a for or against direction.");
    const prior = unique.get(pull.evidenceKey);
    if (
      prior &&
      (prior.direction !== pull.direction || prior.weight !== pull.weight)
    )
      throw new Error("One recorded source cannot carry inconsistent pulls.");
    unique.set(pull.evidenceKey, pull);
  }
  // Stable evidence order also makes floating-point arithmetic reproducible.
  const ordered = [...unique.values()].sort((a, b) =>
    a.evidenceKey < b.evidenceKey ? -1 : a.evidenceKey > b.evidenceKey ? 1 : 0,
  );
  let unpersuadedFor = 1;
  let unpersuadedAgainst = 1;
  for (const pull of ordered) {
    if (pull.direction === "endorses") unpersuadedFor *= 1 - pull.weight;
    else unpersuadedAgainst *= 1 - pull.weight;
  }
  const supportFor = 1 - unpersuadedFor;
  const supportAgainst = 1 - unpersuadedAgainst;
  const net = supportFor - supportAgainst;
  return {
    strength: Math.abs(net),
    direction: net > 0 ? "endorses" : net < 0 ? "rejects" : null,
    supportFor,
    supportAgainst,
    evidenceKeys: ordered.map((pull) => pull.evidenceKey),
  };
}
