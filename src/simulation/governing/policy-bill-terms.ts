import curriculum from "../../../data/research/laws/curriculum-adoption.json" with { type: "json" };
import { lawInForce } from "./law-in-force";
import { principledLeaning } from "./officeholder-principles";
import type { EntityId, IsoDate, PolicyBillTerms, World } from "../types";

export const CURRICULUM_QUESTION =
  "us-policy-positions:education.state-curriculum-standards";

/** The sponsor writes terms at introduction; changing views later cannot change a filed bill. */
export function sponsorPolicyTerms(
  world: World,
  jurisdictionId: EntityId,
  sponsorPersonId: EntityId | null,
  answers: readonly { propositionId: EntityId; answer: "yes" | "no" }[],
): readonly PolicyBillTerms[] {
  return answers.flatMap(({ propositionId, answer }) => {
    const questionKey =
      world.policyCatalog.propositions[propositionId]?.stableKey;
    if (questionKey !== CURRICULUM_QUESTION || answer !== "yes") return [];
    const views = sponsorPersonId
      ? principledLeaning(world, sponsorPersonId, propositionId)
      : { score: 0, recordIds: [] };
    const current = lawInForce(world, jurisdictionId, propositionId);
    const strength = Math.max(-1, Math.min(1, views.score / 6));
    return [
      {
        questionKey,
        values: {
          materialsPerPupilCents: Math.round(
            curriculum.defaults.materialsPerPupilCents * (1 + strength / 2),
          ),
          phaseInMonths: Math.round(
            curriculum.defaults.phaseInMonths - strength * 12,
          ),
        },
        reason: `Sponsor principle score ${views.score}; current law ${current?.answer ?? "unrecorded"}; materials and phase-in priced from the recorded adoption appropriation.`,
        principleRecordIds: views.recordIds,
      },
    ];
  });
}

/** Read only the controlling measure's filed terms. A legacy bill has no numeric terms. */
export function policyTermsInForce(
  world: World,
  jurisdictionId: EntityId,
  questionKey: string,
  onDate: IsoDate,
) {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  );
  if (!proposition) return null;
  const law = lawInForce(world, jurisdictionId, proposition.id, onDate);
  if (!law || law.answer !== "yes") return null;
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === law.measureId,
  );
  return {
    law,
    terms:
      measure?.policyTerms?.find((row) => row.questionKey === questionKey) ??
      null,
  };
}
