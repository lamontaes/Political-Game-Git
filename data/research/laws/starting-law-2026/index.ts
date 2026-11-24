import agricultureNaturalResources from "./agriculture-natural-resources.json" with { type: "json" };
import businessCommerce from "./business-commerce.json" with { type: "json" };
import civilFamilyCommunity from "./civil-family-community.json" with { type: "json" };
import education from "./education.json" with { type: "json" };
import environmentEnergy from "./environment-energy.json" with { type: "json" };
import fiscal from "./fiscal.json" with { type: "json" };
import governmentOperations from "./government-operations.json" with { type: "json" };
import healthHumanServices from "./health-human-services.json" with { type: "json" };
import housingLandUse from "./housing-land-use.json" with { type: "json" };
import justicePublicSafety from "./justice-public-safety.json" with { type: "json" };
import laborCommerce from "./labor-commerce.json" with { type: "json" };
import laborWorkforce from "./labor-workforce.json" with { type: "json" };
import metadata from "./metadata.json" with { type: "json" };
import technologyPrivacy from "./technology-privacy.json" with { type: "json" };
import transportationInfrastructure from "./transportation-infrastructure.json" with { type: "json" };
import questionOrder from "./question-order.json" with { type: "json" };

export const startingLawAreaFragments = {
  "agriculture-natural-resources": agricultureNaturalResources.questions,
  "business-commerce": businessCommerce.questions,
  "civil-family-community": civilFamilyCommunity.questions,
  education: education.questions,
  "environment-energy": environmentEnergy.questions,
  fiscal: fiscal.questions,
  "government-operations": governmentOperations.questions,
  "health-human-services": healthHumanServices.questions,
  "housing-land-use": housingLandUse.questions,
  "justice-public-safety": justicePublicSafety.questions,
  "labor-commerce": laborCommerce.questions,
  "labor-workforce": laborWorkforce.questions,
  "technology-privacy": technologyPrivacy.questions,
  "transportation-infrastructure": transportationInfrastructure.questions,
};

const areaQuestions = {
  ...startingLawAreaFragments["health-human-services"],
  ...startingLawAreaFragments["labor-workforce"],
  ...startingLawAreaFragments["business-commerce"],
  ...startingLawAreaFragments["justice-public-safety"],
  ...startingLawAreaFragments["housing-land-use"],
  ...startingLawAreaFragments.education,
  ...startingLawAreaFragments.fiscal,
  ...startingLawAreaFragments["government-operations"],
  ...startingLawAreaFragments["transportation-infrastructure"],
  ...startingLawAreaFragments["environment-energy"],
  ...startingLawAreaFragments["civil-family-community"],
  ...startingLawAreaFragments["technology-privacy"],
  ...startingLawAreaFragments["agriculture-natural-resources"],
  ...startingLawAreaFragments["labor-commerce"],
};

const indexedQuestions = new Map(Object.entries(areaQuestions));
if (
  new Set(questionOrder).size !== questionOrder.length ||
  questionOrder.length !== indexedQuestions.size ||
  questionOrder.some((questionKey) => !indexedQuestions.has(questionKey))
) {
  throw new Error(
    "Starting-law question shards do not match their ordered index.",
  );
}

const orderedQuestions = Object.fromEntries(
  questionOrder.map((questionKey) => [
    questionKey,
    indexedQuestions.get(questionKey)!,
  ]),
) as typeof areaQuestions;

const startingLaw = {
  ...metadata,
  questions: orderedQuestions,
};

export {
  metadata as startingLawMetadata,
  questionOrder as startingLawQuestionOrder,
};
export default startingLaw;
