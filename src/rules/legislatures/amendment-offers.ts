import type {
  EntityId,
  PolicyCatalog,
  LegislativeAmendmentRecord,
  LegislativeProvisionRecord,
} from "../../simulation/types";
import type {
  AmendmentAuthorsInput,
  AmendmentPlan,
} from "../../simulation/governing/amendment-authors";
import type { InstitutionStepPlan } from "./institution-context";
import {
  planFloorAmendment,
  amendmentQuestion,
  partKey,
  AMENDMENT_AUTHORS_VERSION,
  type AmendmentPlanningFacts,
} from "./amendment-plans";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
export interface AmendmentOfferFacts extends AmendmentPlanningFacts {
  readonly amendments: readonly LegislativeAmendmentRecord[];
  readonly provisions: readonly LegislativeProvisionRecord[];
  readonly policyCatalog: PolicyCatalog;
  readonly jurisdictionNames: ReadonlyMap<EntityId, string>;
  readonly prepared: boolean;
  readonly adoptedPlan: AmendmentPlan | null;
  readonly voteFacts: ChamberDecisionFacts | null;
}
export type AmendmentOfferPlan = InstitutionStepPlan & {
  readonly resumePlan?: AmendmentPlan;
};
export function offerPlannedAmendment(
  facts: AmendmentOfferFacts,
  input: AmendmentAuthorsInput,
): InstitutionStepPlan {
  const stableKey = `${input.stableKey}:${AMENDMENT_AUTHORS_VERSION}`;
  if (
    !facts.adoptedPlan &&
    facts.amendments.some((record) => record.stableKey === stableKey)
  )
    return { kind: "idle" };
  if (!facts.prepared)
    return {
      kind: "prepare",
      commands: [{ command: "formAmendmentAuthorsViews", input }],
    };
  const plan = facts.adoptedPlan ?? planFloorAmendment(facts, input);
  if (!plan) return { kind: "idle" };
  const proposition = facts.policyCatalog.propositions[plan.part.propositionId];
  if (!proposition) return { kind: "idle" };
  const author = input.members.find(
    (member) => member.personId === plan.authorPersonId,
  )!;
  const heading = proposition.name;
  if (!facts.adoptedPlan) {
    const dispositions = decideChamberVote(facts.voteFacts!, {
      stableKey: `${stableKey}:vote`,
      question: amendmentQuestion(
        input,
        plan.part,
        stableKey,
        plan.authorPersonId,
        undefined,
      ),
      members: input.members,
      nonpartisan: input.nonpartisan ?? false,
      playerPersonId: facts.playerPersonId,
      playerBallot: null,
    });
    const offer = {
      stableKey,
      measureId: input.measureId,
      description:
        plan.part.answer === "yes"
          ? `Adds a section: ${heading}.`
          : `Adds a section barring: ${heading}.`,
      offeredByPersonId: plan.authorPersonId,
      offeredByLabel: author.name,
      dispositions,
      presentMembers: dispositions.filter(
        (row) => row.disposition !== "absent" && row.disposition !== "excused",
      ).length,
      electedMembers: input.members.length,
      provenance: {
        method: "member-decisions",
        note: `Members' recorded decisions on an amendment offered for this reason: ${plan.reasoning}`,
        sourceEntityIds: [plan.authorPersonId],
      },
      proposedSections: [
        {
          provisionKey: partKey(plan.part),
          heading,
          supersedesProvisionId: null,
          answers: plan.part,
        },
      ],
      authorMotive: plan.motive,
    };
    return {
      kind: "applied",
      commands: [{ command: "offerFloorAmendment", input: offer }],
      resumePlan: plan,
    } as AmendmentOfferPlan;
  }
  const amendment = facts.amendments.find(
    (record) => record.stableKey === stableKey,
  );
  if (amendment?.status !== "adopted") return { kind: "idle" };
  const measure = facts.measure;
  const sectionNumber =
    Math.max(0, ...facts.provisions.map((record) => record.sectionNumber)) + 1;
  const revisions = [
    {
      stableKey: `${stableKey}:section`,
      measureId: measure.id,
      amendmentId: amendment.id,
      supersedesProvisionId: null,
      provisionKey: partKey(plan.part),
      sectionNumber,
      heading,
      text:
        plan.part.answer === "yes"
          ? `This section enacts the following: ${proposition.question} Yes.`
          : `This section enacts the following: ${proposition.question} No.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: `everyone within ${facts.jurisdictionNames.get(measure.jurisdictionId) ?? "the jurisdiction"} the question reaches`,
      },
      applicationScope: {
        jurisdictionId: measure.jurisdictionId,
        segmentKey: null,
      },
      answers: plan.part,
    },
  ];
  return {
    kind: "applied",
    commands: [{ command: "adoptProvisionRevisions", input: revisions }],
  };
}

// stopgapId: "SG-P14-legislatures-amendment-offer-text"
