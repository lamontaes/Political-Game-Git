import { addDays } from "./dates";
import { livedOutcomesOf } from "./lived-outcomes";
import type { LivedOutcome, LivedOutcomeKind } from "./lived-outcomes";
import type { PoliticalBeliefFormationFactor } from "./political-belief-formation";
import type { DecisionImportance, EntityId, IsoDate, World } from "./types";

/**
 * What a person lived through, as a reason in their view of a policy or an
 * official.
 *
 * A lost job, lost coverage, a rent raise or a crime against them already
 * shapes the principles a person forms (`principles-from-life.ts`), and a
 * principle bears on every policy question it names. The factor here is the
 * nearer thing: while the outcome is recent, it weighs on the person's view
 * of a question it bears on, and on their view of the executive in office
 * when it happened, in its own right. It is read from the saved records
 * (`lived-outcomes.ts`); nothing is drawn.
 *
 * Every size in the table is a PLACEHOLDER until the research request
 * `how-lived-hardship-moves-political-views` is answered. The principle
 * weights for a lost job and a crime are the ones principle formation
 * already uses, so the two passes agree on direction.
 */

export const LIVED_OUTCOME_RESEARCH_QUESTION =
  "how-lived-hardship-moves-political-views";

interface LivedOutcomeFactorRow {
  /** The principles the outcome bears on, with direction and weight. */
  readonly principles: readonly {
    readonly principle: string;
    readonly toward: "endorses" | "rejects";
    readonly weight: number;
  }[];
  /** How much it weighs in a view of a policy question it bears on. */
  readonly policyImportance: DecisionImportance;
  /** How much it weighs against the executive in office when it happened. */
  readonly officialImportance: DecisionImportance;
  readonly label: string;
}

// PLACEHOLDER: every size below waits on
// `how-lived-hardship-moves-political-views`. Directions and the job and crime
// principle weights match `principles-from-life.ts`.
export const LIVED_OUTCOME_FACTORS: Readonly<
  Record<LivedOutcomeKind, LivedOutcomeFactorRow>
> = {
  "job-lost": {
    principles: [
      { principle: "worker-protection", toward: "endorses", weight: 2 },
      { principle: "collective-provision", toward: "endorses", weight: 1 },
    ],
    policyImportance: "moderate",
    officialImportance: "slight",
    label: "lost a job they did not choose to leave",
  },
  "coverage-lost": {
    principles: [
      { principle: "collective-provision", toward: "endorses", weight: 2 },
    ],
    policyImportance: "moderate",
    officialImportance: "slight",
    label: "lost the public health coverage they held",
  },
  "rent-raised": {
    principles: [
      { principle: "collective-provision", toward: "endorses", weight: 1 },
      { principle: "property-rights", toward: "rejects", weight: 1 },
    ],
    policyImportance: "moderate",
    officialImportance: "slight",
    label: "had their rent raised when the lease renewed",
  },
  "crime-against": {
    principles: [{ principle: "public-safety", toward: "endorses", weight: 2 }],
    policyImportance: "moderate",
    officialImportance: "slight",
    label: "had a crime committed against them",
  },
};

// PLACEHOLDER: how long a lived outcome stays near enough to weigh on its own,
// apart from the principles it left behind.
export const LIVED_OUTCOME_RECENT_DAYS = 730;

function recentOutcomes(
  world: World,
  personId: EntityId,
): readonly LivedOutcome[] {
  const since = addDays(world.currentDate, -LIVED_OUTCOME_RECENT_DAYS);
  return livedOutcomesOf(world, personId).filter(
    (outcome) => outcome.on >= since,
  );
}

function principleKeyOf(stableKey: string): string {
  return stableKey.slice(stableKey.lastIndexOf(":") + 1);
}

/**
 * The person's recent lived outcomes as reasons on one policy question: each
 * outcome whose principles the question names leans the person the way those
 * principles lean on it. An outcome the question does not bear on adds
 * nothing.
 */
export function livedPolicyFactors(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  keyPrefix: string,
): readonly PoliticalBeliefFormationFactor[] {
  const proposition = world.policyCatalog.propositions[propositionId];
  if (!proposition?.principles?.length) return [];
  const bearingByKey = new Map<string, number>();
  for (const bearing of proposition.principles) {
    const principle = world.policyCatalog.principles[bearing.principleId];
    if (!principle) continue;
    const weight = bearing.weight ?? 1;
    bearingByKey.set(
      principleKeyOf(principle.stableKey),
      (bearing.bearing === "consistent-with" ? 1 : -1) * weight,
    );
  }
  const factors: PoliticalBeliefFormationFactor[] = [];
  for (const outcome of recentOutcomes(world, personId)) {
    const row = LIVED_OUTCOME_FACTORS[outcome.kind];
    let score = 0;
    for (const pull of row.principles) {
      const bearing = bearingByKey.get(pull.principle);
      if (bearing === undefined) continue;
      score += (pull.toward === "endorses" ? 1 : -1) * pull.weight * bearing;
    }
    if (score === 0) continue;
    factors.push({
      stableKey: `${keyPrefix}:lived:${outcome.recordId}`,
      favors: score > 0 ? "support" : "opposition",
      sourceType: "mind:lived-outcome",
      importance: row.policyImportance,
      confidence: "high",
      explanation: `The person recently ${row.label}, and this question bears on what that taught them.`,
      sourceRefs: [outcome.sourceRef],
    });
  }
  return factors;
}

/**
 * The person's recent lived outcomes as a reason against an executive who
 * signed a law that reached them: hard times since that signing count
 * against the executive, whoever caused them. One factor per outcome, each
 * citing its record.
 */
export function livedOfficialFactors(
  world: World,
  personId: EntityId,
  since: IsoDate,
  keyPrefix: string,
): readonly PoliticalBeliefFormationFactor[] {
  return recentOutcomes(world, personId)
    .filter((outcome) => outcome.on >= since)
    .map((outcome) => {
      const row = LIVED_OUTCOME_FACTORS[outcome.kind];
      return {
        stableKey: `${keyPrefix}:lived:${outcome.recordId}`,
        favors: "opposition" as const,
        sourceType: "mind:lived-outcome" as const,
        importance: row.officialImportance,
        confidence: "high" as const,
        explanation: `The person ${row.label} after this official signed the law.`,
        sourceRefs: [outcome.sourceRef],
      };
    });
}
