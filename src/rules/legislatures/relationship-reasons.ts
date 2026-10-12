import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
} from "../../simulation/types";
import type {
  StandingBand,
  readRelationshipStanding,
} from "../../simulation/relationship-standing";
type RelationshipStanding = ReturnType<typeof readRelationshipStanding>;
const BAND_IMPORTANCE: Readonly<
  Record<Exclude<StandingBand, "none">, DecisionImportance>
> = { slight: "slight", marked: "moderate", strong: "strong" };

function strongerBand(a: StandingBand, b: StandingBand): StandingBand {
  const order: readonly StandingBand[] = ["none", "slight", "marked", "strong"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

export function relationshipConsiderations(
  standing: RelationshipStanding,
  viewerId: EntityId,
  subjectId: EntityId,
  input: {
    readonly optionKey: string;
    readonly fond: {
      readonly stableKey: string;
      readonly explanation: string;
    };
    readonly strain: {
      readonly stableKey: string;
      readonly explanation: string;
    };
    readonly fondDirection?: "supports" | "opposes";
  },
): DecisionConsideration[] {
  if (viewerId === subjectId) return [];

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

// stopgapId: "SG-P14-legislatures-relationship-vote-weights"
