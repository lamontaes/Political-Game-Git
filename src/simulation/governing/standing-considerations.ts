import {
  readRelationshipStanding,
  type StandingBand,
} from "../relationship-standing";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  World,
} from "../types";

/**
 * How one person's recorded relationship with another weighs on a choice
 * about them: warmth, trust and respect at their strongest band for, tension
 * and adverse readings at theirs against. Nothing recorded, no reason.
 *
 * WEIGHTS (hand-set on the shared decision scale): a slight band weighs
 * "slight", a marked one "moderate", a strong one "strong".
 */
const BAND_IMPORTANCE: Readonly<
  Record<Exclude<StandingBand, "none">, DecisionImportance>
> = { slight: "slight", marked: "moderate", strong: "strong" };

function strongerBand(a: StandingBand, b: StandingBand): StandingBand {
  const order: readonly StandingBand[] = ["none", "slight", "marked", "strong"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

export function relationshipConsiderations(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
  input: {
    readonly optionKey: string;
    /** The key and words for a good history, and for a strained one. */
    readonly fond: { readonly stableKey: string; readonly explanation: string };
    readonly strain: {
      readonly stableKey: string;
      readonly explanation: string;
    };
    /** Which way a good history points; a strained one points the other. */
    readonly fondDirection?: "supports" | "opposes";
  },
): DecisionConsideration[] {
  if (viewerId === subjectId) return [];
  const standing = readRelationshipStanding(world, viewerId, subjectId);
  let good: StandingBand = "none";
  let bad: StandingBand = "none";
  const goodBasis = new Set<EntityId>();
  const badBasis = new Set<EntityId>();
  for (const dimension of ["warmth", "trust", "respect"] as const) {
    const reading = standing.readings[dimension];
    if (reading.band === "none") continue;
    if (reading.adverse) {
      bad = strongerBand(bad, reading.band);
      for (const id of reading.basis) badBasis.add(id);
    } else {
      good = strongerBand(good, reading.band);
      for (const id of reading.basis) goodBasis.add(id);
    }
  }
  const tension = standing.readings.tension;
  if (tension.band !== "none") {
    bad = strongerBand(bad, tension.band);
    for (const id of tension.basis) badBasis.add(id);
  }
  const fondDirection = input.fondDirection ?? "supports";
  const reasons: DecisionConsideration[] = [];
  if (good !== "none")
    reasons.push({
      stableKey: input.fond.stableKey,
      optionKey: input.optionKey,
      sourceType: "social:relationship",
      direction: fondDirection,
      importance: BAND_IMPORTANCE[good],
      confidence: "high",
      explanation: input.fond.explanation,
      sourceRefs: [...goodBasis].map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  if (bad !== "none")
    reasons.push({
      stableKey: input.strain.stableKey,
      optionKey: input.optionKey,
      sourceType: "social:relationship",
      direction: fondDirection === "supports" ? "opposes" : "supports",
      importance: BAND_IMPORTANCE[bad],
      confidence: "high",
      explanation: input.strain.explanation,
      sourceRefs: [...badBasis].map((interactionId) => ({
        kind: "relationship-interaction" as const,
        interactionId,
      })),
    });
  return reasons;
}
