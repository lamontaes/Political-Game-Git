import { recordFiledProvision } from "../legislative-politics";
import type { EntityId, World } from "../types";
import { juvenileCourtAgeRuleAt } from "./juvenile-court";

const QUESTION =
  "us-policy-positions:justice-public-safety.raise-juvenile-court-age";

/** Persist an ordinary sponsor's selected juvenile policy as an actual age.
 * Reuses the filed-section writer; the amount is the observed same-answer peer
 * mode, labeled as an estimate with its contributors in the saved bill text.
 */
export function recordJuvenileAgeBillTerm(
  world: World,
  measureId: EntityId,
): World {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  if (!measure?.sponsorPersonId || !world.people[measure.sponsorPersonId])
    return world;
  const answer = measure.propositionAnswers?.find(
    (row) =>
      world.policyCatalog.propositions[row.propositionId]?.stableKey ===
      QUESTION,
  );
  if (!answer || (answer.answer !== "yes" && answer.answer !== "no"))
    return world;
  const provisions = (world.history.legislativeProvisions ?? []).filter(
    (row) => row.measureId === measureId,
  );
  if (
    provisions.some((row) =>
      row.lawTerms?.some(
        (term) => term.questionKey === QUESTION && term.key === "age",
      ),
    )
  )
    return world;
  const reference = juvenileCourtAgeRuleAt(
    world,
    measure.jurisdictionId,
    world.currentDate,
    answer.answer,
  );
  if (!reference) return world;
  return recordFiledProvision(world, {
    stableKey: `${measure.stableKey}:juvenile-age`,
    measureId,
    provisionKey: "juvenile-age",
    sectionNumber:
      Math.max(0, ...provisions.map((row) => row.sectionNumber)) + 1,
    heading: "Upper age of juvenile jurisdiction",
    text: `The inclusive upper age of juvenile jurisdiction is ${reference.juvenileCeiling} years. Estimated from the current same-answer peer rule mode: ${reference.contributors.map((row) => `${row.jurisdictionId}=${row.ceiling} years [${row.sourceRecordIds.join(", ")}]`).join("; ")}. This general age does not authorize an individual transfer.`,
    beneficiary: {
      kind: "general-application",
      appliesToLabel:
        "People within the juvenile court's general age jurisdiction",
    },
    applicationScope: {
      jurisdictionId: measure.jurisdictionId,
      segmentKey: null,
    },
    answers: answer,
    lawTerms: [
      {
        questionKey: QUESTION,
        key: "age",
        value: reference.juvenileCeiling,
        unit: "years",
      },
    ],
  });
}
