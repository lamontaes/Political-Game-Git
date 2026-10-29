/**
 * The researched starting answers to the recorded policy questions, by state
 * (`data/research/laws/starting-law-2026/`): read by the laws engine as law
 * rows in force at the opening, and by the legislature for authority.
 */
import lawAgricultureNaturalResources from "../../data/research/laws/starting-law-2026/agriculture-natural-resources.json" with { type: "json" };
import lawBusinessCommerce from "../../data/research/laws/starting-law-2026/business-commerce.json" with { type: "json" };
import lawCivilFamilyCommunity from "../../data/research/laws/starting-law-2026/civil-family-community.json" with { type: "json" };
import lawEducation from "../../data/research/laws/starting-law-2026/education.json" with { type: "json" };
import lawEnvironmentEnergy from "../../data/research/laws/starting-law-2026/environment-energy.json" with { type: "json" };
import lawFiscal from "../../data/research/laws/starting-law-2026/fiscal.json" with { type: "json" };
import lawGovernmentOperations from "../../data/research/laws/starting-law-2026/government-operations.json" with { type: "json" };
import lawHealthHumanServices from "../../data/research/laws/starting-law-2026/health-human-services.json" with { type: "json" };
import lawHousingLandUse from "../../data/research/laws/starting-law-2026/housing-land-use.json" with { type: "json" };
import lawJusticePublicSafety from "../../data/research/laws/starting-law-2026/justice-public-safety.json" with { type: "json" };
import lawLaborCommerce from "../../data/research/laws/starting-law-2026/labor-commerce.json" with { type: "json" };
import lawLaborWorkforce from "../../data/research/laws/starting-law-2026/labor-workforce.json" with { type: "json" };
import lawTechnologyPrivacy from "../../data/research/laws/starting-law-2026/technology-privacy.json" with { type: "json" };
import lawTransportationInfrastructure from "../../data/research/laws/starting-law-2026/transportation-infrastructure.json" with { type: "json" };

export type StartingAnswers = Record<
  string,
  {
    source?: string;
    answers: Record<
      string,
      {
        preempts?: boolean;
        answer?: string;
        estimated?: string;
        /** The statute or rule the answer rests on, where the research names one. */
        cite?: string;
      }
    >;
  }
>;

/** Every recorded starting-law policy question, by key. */
export const POLICY_QUESTIONS: StartingAnswers = Object.assign(
  {},
  ...[
    lawAgricultureNaturalResources,
    lawBusinessCommerce,
    lawCivilFamilyCommunity,
    lawEducation,
    lawEnvironmentEnergy,
    lawFiscal,
    lawGovernmentOperations,
    lawHealthHumanServices,
    lawHousingLandUse,
    lawJusticePublicSafety,
    lawLaborCommerce,
    lawLaborWorkforce,
    lawTechnologyPrivacy,
    lawTransportationInfrastructure,
  ].map(
    (file) => (file as unknown as { questions: StartingAnswers }).questions,
  ),
);
