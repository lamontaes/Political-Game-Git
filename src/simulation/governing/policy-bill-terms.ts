import publicLand from "../../../data/research/laws/public-land-access.json" with { type: "json" };
import studentDebt from "../../../data/research/laws/student-debt-relief.json" with { type: "json" };
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
  return answers.flatMap<PolicyBillTerms>(({ propositionId, answer }) => {
    const questionKey =
      world.policyCatalog.propositions[propositionId]?.stableKey;
    if (
      !questionKey ||
      ![
        CURRICULUM_QUESTION,
        "us-federal-positions:education.forgive-student-loans",
        "us-policy-positions:agriculture-natural-resources.expand-public-land-access",
      ].includes(questionKey) ||
      answer !== "yes"
    )
      return [];
    const views = sponsorPersonId
      ? principledLeaning(world, sponsorPersonId, propositionId)
      : { score: 0, recordIds: [] };
    const current = lawInForce(world, jurisdictionId, propositionId);
    const strength = Math.max(-1, Math.min(1, views.score / 6));
    const values: Readonly<Record<string, number>> =
      questionKey === CURRICULUM_QUESTION
        ? {
            materialsPerPupilCents: Math.round(
              curriculum.defaults.materialsPerPupilCents * (1 + strength / 2),
            ),
            phaseInMonths: Math.round(
              curriculum.defaults.phaseInMonths - strength * 12,
            ),
          }
        : questionKey ===
            "us-policy-positions:agriculture-natural-resources.expand-public-land-access"
          ? {
              accessIncreaseBasisPoints: Math.round(
                publicLand.proposal.accessIncreaseBasisPoints *
                  (1 + strength / 2),
              ),
              annualManagementCostPerAcreCents: Math.round(
                publicLand.proposal.annualManagementCostPerAcreCents *
                  (1 + strength / 2),
              ),
            }
          : {
              capPerBorrowerCents: Math.round(
                studentDebt.proposal.capPerBorrowerCents * (1 + strength),
              ),
              incomeLimitAnnualCents: Math.round(
                studentDebt.proposal.incomeLimitAnnualCents *
                  (1 + strength / 2),
              ),
            };
    return [
      {
        questionKey,
        values,
        reason: `Sponsor principle score ${views.score}; current law ${current?.answer ?? "unrecorded"}; numeric terms priced from the question's recorded research benchmark.`,
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
