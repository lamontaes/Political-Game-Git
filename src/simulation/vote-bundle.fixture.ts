import { makeIsoDate } from "./dates";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "./character-history";
import {
  bodyForChamber,
  createLegislativeScenario,
  type LegislativeScenario,
  type SeatedMember,
} from "./legislation-scenarios";
import {
  introduceMeasure,
  offerFloorAmendment,
  placeMeasureOnCalendar,
  recordCommitteeDisposition,
  referMeasure,
  takeFloorVote,
} from "./legislation";
import { adoptProvisionRevisions } from "./legislative-politics";
import { chamberByKey } from "./legislature-rules";
import {
  createPolicyDomainDefinition,
  createPolicyIssueDefinition,
  createPolicyPropositionDefinition,
} from "./policy";
import type {
  EntityId,
  LegislativeMemberDisposition,
  LegislativeSubjectClass,
  World,
} from "./types";

/**
 * A one-house legislature with a bill on the floor and two catalog
 * questions, for the Build 25 tests of what a vote was on and who amends a
 * bill. Both questions are authored for the tests and name no real bill.
 */
// Nebraska's one-house legislature keeps the path to a recorded roll call
// short. Both questions are authored for the test and name no real bill.
export const CHAMBER = "legislature";
export const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this test.",
  sourceEntityIds: [] as readonly EntityId[],
};

export interface Setup {
  readonly scenario: LegislativeScenario;
  readonly world: World;
  readonly transitId: EntityId;
  readonly workRuleId: EntityId;
  /** A question in another policy domain than the bill's. */
  readonly offSubjectId: EntityId;
  readonly measureId: EntityId;
  readonly chamberKey: string;
  readonly memberId: EntityId;
  readonly jurisdictionId: EntityId;
}

export function withQuestions(world: World) {
  const domain = createPolicyDomainDefinition(
    "test:public-services",
    "Public services",
    "What the state provides.",
  );
  const transitIssue = createPolicyIssueDefinition(
    "test:rural-transit",
    domain.id,
    "Rural transit",
    "Service where density does not pay for it.",
  );
  const assistanceIssue = createPolicyIssueDefinition(
    "test:assistance",
    domain.id,
    "Public assistance",
    "Who receives help, and on what terms.",
  );
  const transit = createPolicyPropositionDefinition(
    "test:fund-rural-transit",
    transitIssue.id,
    "Fund rural transit",
    "Should the state pay for bus service where fares cannot?",
  );
  const workRule = createPolicyPropositionDefinition(
    "test:work-requirement",
    assistanceIssue.id,
    "Work requirement for assistance",
    "Should adults receiving assistance have to work or look for work?",
  );
  // A question in another domain, for amendments that are off the subject.
  const elections = createPolicyDomainDefinition(
    "test:elections",
    "Elections",
    "How people vote.",
  );
  const registrationIssue = createPolicyIssueDefinition(
    "test:registration",
    elections.id,
    "Voter registration",
    "When and how a person may register to vote.",
  );
  const sameDay = createPolicyPropositionDefinition(
    "test:same-day-registration",
    registrationIssue.id,
    "Same-day voter registration",
    "Should a person be able to register on the day they vote?",
  );
  const catalog = world.policyCatalog;
  return {
    world: {
      ...world,
      policyCatalog: {
        ...catalog,
        domains: {
          ...catalog.domains,
          [domain.id]: domain,
          [elections.id]: elections,
        },
        domainOrder: [...catalog.domainOrder, domain.id, elections.id],
        issues: {
          ...catalog.issues,
          [transitIssue.id]: transitIssue,
          [assistanceIssue.id]: assistanceIssue,
          [registrationIssue.id]: registrationIssue,
        },
        issueOrder: [
          ...catalog.issueOrder,
          transitIssue.id,
          assistanceIssue.id,
          registrationIssue.id,
        ],
        propositions: {
          ...catalog.propositions,
          [transit.id]: transit,
          [workRule.id]: workRule,
          [sameDay.id]: sameDay,
        },
        propositionOrder: [
          ...catalog.propositionOrder,
          transit.id,
          workRule.id,
          sameDay.id,
        ],
      },
    },
    transitId: transit.id,
    workRuleId: workRule.id,
    offSubjectId: sameDay.id,
  };
}

export function billOnTheFloor(
  subjectClass: LegislativeSubjectClass = "general-policy",
  scenarioKey = "nebraska",
): Setup {
  const scenario = createLegislativeScenario(scenarioKey);
  const chamberKey = scenario.pack.chamberOrder[0]!;
  const {
    world: withCatalog,
    transitId,
    workRuleId,
    offSubjectId,
  } = withQuestions(scenario.world);
  const jurisdictionId = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!.jurisdictionId;
  let world = introduceMeasure(withCatalog, {
    stableKey: "vote-bundle:bill",
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: "LB 902",
    shortTitle: "Rural bus service",
    summary: "Written to exercise what a vote was on.",
    origin: "member-introduction",
    subjectClass,
    originChamberKey: chamberKey,
    propositionIds: [transitId],
    propositionAnswers: [{ propositionId: transitId, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.find(
    (measure) => measure.stableKey === "vote-bundle:bill",
  )!.id;
  const chamber = chamberByKey(scenario.pack, chamberKey);
  const committee = chamber.committees[0]!;
  const body = bodyForChamber(scenario, chamberKey);
  world = referMeasure(world, {
    stableKey: "vote-bundle:referral",
    measureId,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: "vote-bundle:committee",
    measureId,
    recommendation: "favorable",
    dispositions: body.members
      .slice(0, committee.appointedMembers)
      .map((member) => ({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: "yea" as const,
      })),
    rationale: "The committee sent the bill to the floor.",
    provenance: AUTHORED,
  });
  world = placeMeasureOnCalendar(world, {
    stableKey: "vote-bundle:calendar",
    measureId,
  });
  return {
    scenario,
    world,
    transitId,
    workRuleId,
    offSubjectId,
    measureId,
    chamberKey,
    memberId: body.members[0]!.personId!,
    jurisdictionId,
  };
}

export function everyone(
  setup: Setup,
  disposition: LegislativeMemberDisposition,
  theirs: LegislativeMemberDisposition = disposition,
) {
  return bodyForChamber(setup.scenario, setup.chamberKey).members.map(
    (member) => ({
      memberKey: member.memberKey,
      personId: member.personId,
      disposition: member.personId === setup.memberId ? theirs : disposition,
    }),
  );
}

export const WORK_SECTION = (workRuleId: EntityId) => ({
  provisionKey: "work-requirement",
  heading: "Work requirement",
  supersedesProvisionId: null,
  answers: { propositionId: workRuleId, answer: "yes" as const },
});

/** Offers the work-requirement amendment and, if adopted, carries it in. */
export function amend(
  setup: Setup,
  world: World,
  disposition: LegislativeMemberDisposition,
  theirs: LegislativeMemberDisposition = disposition,
): World {
  let next = offerFloorAmendment(world, {
    stableKey: "vote-bundle:amendment",
    measureId: setup.measureId,
    description: "Require adults receiving assistance to work.",
    offeredByLabel: "Senator for District 12",
    dispositions: everyone(setup, disposition, theirs),
    electedMembers: bodyForChamber(setup.scenario, setup.chamberKey).members
      .length,
    provenance: AUTHORED,
    proposedSections: [WORK_SECTION(setup.workRuleId)],
  });
  const amendment = next.history.legislativeAmendments!.at(-1)!;
  if (amendment.status === "adopted")
    next = adoptProvisionRevisions(next, [
      {
        stableKey: "vote-bundle:work-section",
        measureId: setup.measureId,
        amendmentId: amendment.id,
        supersedesProvisionId: null,
        provisionKey: "work-requirement",
        sectionNumber: 1,
        heading: "Work requirement",
        text: "An adult receiving assistance shall work or look for work.",
        beneficiary: {
          kind: "general-application",
          appliesToLabel: "adults receiving public assistance",
        },
        applicationScope: {
          jurisdictionId: setup.jurisdictionId,
          segmentKey: null,
        },
        answers: { propositionId: setup.workRuleId, answer: "yes" },
      },
    ]);
  return next;
}

export function floor(
  setup: Setup,
  world: World,
  theirs: LegislativeMemberDisposition,
): World {
  return takeFloorVote(world, {
    stableKey: "vote-bundle:floor",
    measureId: setup.measureId,
    dispositions: everyone(setup, "yea", theirs),
    electedMembers: bodyForChamber(setup.scenario, setup.chamberKey).members
      .length,
    provenance: AUTHORED,
  });
}

/**
 * The same setup with a person in every seat, so the whole chamber decides
 * for its own reasons. The scenario seats only a few people; the rest are
 * made here as plain context people with no history of their own.
 */
export function seatEveryone(setup: Setup): {
  readonly setup: Setup;
  readonly members: readonly SeatedMember[];
} {
  const body = bodyForChamber(setup.scenario, setup.chamberKey);
  const empty = body.members.filter((member) => member.personId === null);
  const world = createCharacterHistoryContextPeople(
    setup.world,
    empty.map((member, index) => ({
      stableKey: `vote-bundle:seat:${member.memberKey}`,
      givenName: "Member",
      familyName: `Number ${index + 1}`,
      birthDate: makeIsoDate("1970-01-01"),
      homeJurisdictionId: setup.jurisdictionId,
    })),
  );
  const members = body.members.map((member) =>
    member.personId
      ? member
      : {
          ...member,
          personId: characterHistoryContextPersonId(
            world,
            `vote-bundle:seat:${member.memberKey}`,
          ),
        },
  );
  return { setup: { ...setup, world }, members };
}
