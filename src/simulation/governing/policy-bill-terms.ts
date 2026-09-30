import lobbying from "../../../data/research/laws/lobbying-cooling-off.json" with { type: "json" };
import libraryMaterials from "../../../data/research/laws/library-materials.json" with { type: "json" };
import photoIdentification from "../../../data/research/laws/voter-photo-identification.json" with { type: "json" };
import federalMinimums from "../../../data/research/laws/federal-mandatory-minimums.json" with { type: "json" };
import immigrationAdmissions from "../../../data/research/laws/immigration-admissions.json" with { type: "json" };
import publicLand from "../../../data/research/laws/public-land-access.json" with { type: "json" };
import disasterCostSharing from "../../../data/research/laws/disaster-cost-sharing.json" with { type: "json" };
import congressionalStocks from "../../../data/research/laws/congressional-stock-trading.json" with { type: "json" };
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
        "us-policy-positions:government-operations.ban-lobbying-after-office",
        "us-policy-positions:civil-family-community.local-control-of-library-materials",
        "us-policy-positions:government-operations.require-photo-id-to-vote",
        "us-federal-positions:justice-rights.reduce-mandatory-minimums",
        "us-federal-positions:immigration.admit-more-immigrants",
        "us-federal-positions:education.forgive-student-loans",
        "us-policy-positions:agriculture-natural-resources.expand-public-land-access",
        "us-federal-positions:emergencies.states-share-disaster-costs",
        "us-federal-positions:government.ban-congressional-stock-trading",
      ].includes(questionKey) ||
      answer !== "yes"
    )
      return [];
    const views = sponsorPersonId
      ? principledLeaning(world, sponsorPersonId, propositionId)
      : { score: 0, recordIds: [] };
    const current = lawInForce(world, jurisdictionId, propositionId);
    const strength = Math.max(-1, Math.min(1, views.score / 6));
    const priced = (strength: number): Readonly<Record<string, number>> =>
      questionKey ===
      "us-policy-positions:government-operations.ban-lobbying-after-office"
        ? {
            coolingMonths: Math.round(
              lobbying.proposalCoolingMonths * (1 + strength / 2),
            ),
          }
        : questionKey ===
            "us-policy-positions:civil-family-community.local-control-of-library-materials"
          ? {
              staffReviewHours: Math.round(
                libraryMaterials.staffHoursMean * (1 + strength / 2),
              ),
              staffHourlyCents: libraryMaterials.staffHourlyCents,
              legalReviewHours: libraryMaterials.proposalLegalReviewHours,
            }
          : questionKey ===
              "us-policy-positions:government-operations.require-photo-id-to-vote"
            ? {
                requiresReturnOnly: strength >= 0 ? 1 : 0,
                idProductionCostCents: photoIdentification.idCostCents,
                annualOutreachPerAdultCents: Math.round(
                  photoIdentification.annualOutreachPerAdultCents *
                    (1 + strength / 2),
                ),
                cureDays: Math.max(1, Math.round(7 * (1 - strength / 2))),
              }
            : questionKey ===
                "us-federal-positions:justice-rights.reduce-mandatory-minimums"
              ? {
                  drugMinimumMonths: Math.round(
                    federalMinimums.proposal.drugMonths * (1 - strength / 2),
                  ),
                  higherDrugMinimumMonths: Math.round(
                    federalMinimums.proposal.higherDrugMonths *
                      (1 - strength / 2),
                  ),
                  firearmMinimumMonths: Math.round(
                    federalMinimums.proposal.firearmMonths * (1 - strength / 2),
                  ),
                  retroactive: federalMinimums.proposal.retroactive,
                }
              : questionKey ===
                  "us-federal-positions:immigration.admit-more-immigrants"
                ? {
                    additionalAdmissionsAnnual: Math.round(
                      immigrationAdmissions.proposalAdditionalAdmissions *
                        (1 + strength / 2),
                    ),
                  }
                : questionKey ===
                    "us-federal-positions:government.ban-congressional-stock-trading"
                  ? {
                      deadlineDays: Math.round(
                        congressionalStocks.proposal.deadlineDays *
                          (1 - strength / 2),
                      ),
                      fineCents: Math.round(
                        congressionalStocks.proposal.fineCents *
                          (1 + strength / 2),
                      ),
                    }
                  : questionKey ===
                      "us-federal-positions:emergencies.states-share-disaster-costs"
                    ? {
                        federalShareBasisPoints: Math.round(
                          disasterCostSharing.proposalFederalShareBasisPoints *
                            (1 - strength / 2),
                        ),
                      }
                    : questionKey === CURRICULUM_QUESTION
                      ? {
                          materialsPerPupilCents: Math.round(
                            curriculum.defaults.materialsPerPupilCents *
                              (1 + strength / 2),
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
                              publicLand.proposal
                                .annualManagementCostPerAcreCents *
                                (1 + strength / 2),
                            ),
                          }
                        : {
                            capPerBorrowerCents: Math.round(
                              studentDebt.proposal.capPerBorrowerCents *
                                (1 + strength / 2),
                            ),
                            incomeLimitAnnualCents: Math.round(
                              studentDebt.proposal.incomeLimitAnnualCents *
                                (1 + strength / 2),
                            ),
                          };
    const proposed = priced(strength);
    const neutral = priced(0);
    const currentTerms =
      current?.answer === "yes"
        ? world.history.legislativeMeasures
            ?.find((m) => m.id === current.measureId)
            ?.policyTerms?.find((t) => t.questionKey === questionKey)?.values
        : null;
    const values = Object.fromEntries(
      Object.entries(proposed).map(([key, value]) => {
        const prior = currentTerms?.[key];
        const adjusted =
          prior !== undefined &&
          neutral[key]! > 0 &&
          !["retroactive", "requiresReturnOnly"].includes(key)
            ? Math.round((prior * value) / neutral[key]!)
            : value;
        return [
          key,
          key === "federalShareBasisPoints"
            ? Math.min(10000, adjusted)
            : adjusted,
        ];
      }),
    );
    return [
      {
        questionKey,
        values,
        reason: `Sponsor principle score ${views.score}; current law ${current?.answer ?? "unrecorded"}; numeric terms adjusted from ${currentTerms ? "the controlling bill terms" : "the recorded research benchmark"} using the sponsor's own views.`,
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
