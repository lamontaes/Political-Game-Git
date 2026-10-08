import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { ageOnDate, makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { recordFiledProvision } from "../legislative-politics";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
} from "../legislation";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../legislation-scenarios";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import {
  legislatureForState,
  seatsForChamber,
} from "../legislature-game-profile";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { applyLawConsequences } from "../enacted-law-effects";
import {
  recordInstitutionOfficeBinding,
  fileRuleChangeProvision,
  enactedRuleChangeAt,
  laborLawOfficeKey,
  type RuleChangeProvisionRecord,
} from "../enacted-rule-changes";
import { organizationProfileAt } from "../life-queries";
import {
  createHousehold,
  createOrganization,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { applyEnactedLawEffects } from "../enacted-law-effects";
import { lawInForce } from "../governing/law-in-force";
import { readFinalEnactedLawTerm } from "../governing/final-law-term-query";
import { createProductionPolicyCatalog } from "../production-catalog";
import { createLightweightPerson, personName } from "../people";
import { isEligibleVoterIn } from "../issue-record";
import { townBusinesses } from "../living-world/town-businesses";
import { concealedCarryPermitRuleAt } from "../crime/offenders";
import { latestLawPermission } from "./permission-records";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { STATES } from "../state-reference";
import { stateJurisdictionForKey } from "../life-places";
import {
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_KIND_TAG,
  SENTENCE_MONTHS_TAG,
  sentencesOf,
} from "../justice/jail-terms";
import { votingStandingOn } from "../justice/voting-standing";
import type {
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";

const QUESTION_KEY =
  "us-policy-positions:government-operations.legislative-term-limits";
const MINIMUM_WAGE_QUESTION_KEY =
  "us-policy-positions:labor-workforce.raise-minimum-wage";
const RESTORE_VOTING_QUESTION_KEY =
  "us-policy-positions:justice-public-safety.restore-voting-after-sentence";
const CONCEALED_CARRY_QUESTION_KEY =
  "us-policy-positions:justice-public-safety.permit-to-carry-concealed";
const CANNABIS_QUESTION_KEY =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";
const DATE = makeIsoDate("2026-01-05");

type LawAnswer = "yes" | "no";

function answerOppositeToStartingLaw(
  world: World,
  jurisdictionId: string,
  propositionId: string,
): LawAnswer {
  return lawInForce(world, jurisdictionId, propositionId, DATE)?.answer ===
    "yes"
    ? "no"
    : "yes";
}

function questionIdFor(world: World, stableKey: string): string {
  return world.policyCatalog.propositionOrder.find(
    (id) => world.policyCatalog.propositions[id]!.stableKey === stableKey,
  )!;
}

function addRightsSubjects(
  start: World,
  usps: string,
  state: World["jurisdictions"][string],
) {
  let world = start;
  const seed = `au2-wire-06-rights:${usps}`;
  let index = world.personOrder.length;
  let voter: ReturnType<typeof createLightweightPerson> | null = null;
  while (!voter && index < world.personOrder.length + 1000) {
    const candidate = createLightweightPerson({
      worldId: world.id,
      worldSeed: seed,
      index: index++,
      currentDate: DATE,
      homeJurisdictionId: state.id,
    });
    const alreadyInWorld = Boolean(world.people[candidate.id]);
    const hasPriorEvents = world.history.events.some(
      (event) =>
        event.involvedEntityIds.includes(candidate.id) ||
        event.participants.some(
          (participant) => participant.personId === candidate.id,
        ),
    );
    if (
      !alreadyInWorld &&
      !hasPriorEvents &&
      ageOnDate(candidate.birthDate, DATE) >= 18
    )
      voter = candidate;
  }
  if (!voter)
    throw new Error(`Could not seed a distinct adult voter for ${usps}.`);
  world = {
    ...world,
    people: { ...world.people, [voter.id]: voter },
    personOrder: [...world.personOrder, voter.id],
  };
  world = createHousehold(world, {
    stableKey: `au2-wire-06:${usps}:voter-home`,
    formedAt: DATE,
    label: "Recorded voter home",
    provenance: {
      kind: "authored",
      note: "Controlled voter and right-permission reader fixture.",
    },
  });
  const household = world.history.households.at(-1)!;
  world = recordHouseholdLocation(world, {
    stableKey: `au2-wire-06:${usps}:voter-home-location`,
    householdId: household.id,
    effectiveAt: DATE,
    jurisdictionId: state.id,
    label: state.name,
    kind: "residence:primary",
    provenance: {
      kind: "authored",
      note: "Controlled voter and right-permission reader fixture.",
    },
    supersedesLocationId: null,
  });
  world = startHouseholdMembership(world, {
    stableKey: `au2-wire-06:${usps}:voter-membership`,
    personId: voter.id,
    householdId: household.id,
    startedAt: DATE,
    residenceRole: "primary",
    kind: "resident:fixture",
    provenance: {
      kind: "authored",
      note: "Controlled voter and right-permission reader fixture.",
    },
  });
  world = recordWorldEvent(world, {
    stableKey: `au2-wire-06:${usps}:expired-felony-sentence`,
    type: PROSECUTION_SENTENCED_EVENT,
    occurredAt: makeIsoDate("2024-01-05"),
    recordedAt: DATE,
    jurisdictionId: state.id,
    involvedEntityIds: [voter.id],
    participants: [
      { personId: voter.id, role: "focus:defendant", detail: null },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [`${SENTENCE_KIND_TAG}jail`, `${SENTENCE_MONTHS_TAG}18`],
    summary: "Controlled expired felony sentence.",
    context: {
      location: null,
      socialContext: "Controlled fixture",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = createOrganization(world, {
    stableKey: `town-employment-v1:${state.id}:employer:retail:0`,
    formedAt: DATE,
    provenance: {
      kind: "authored",
      note: "Controlled retail identity for the cannabis-license reader fixture.",
    },
    initialProfile: {
      name: `${usps} fixture retail shop`,
      classification: "enterprise:retail",
      locationJurisdictionId: state.id,
    },
  });
  return {
    world,
    voterId: voter.id,
    retailerId: world.history.organizations.at(-1)!.id,
  };
}

function questionId(world: World): string {
  return questionIdFor(world, QUESTION_KEY);
}

function voteContext(
  world: World,
  measureId: string,
  pack: NonNullable<ReturnType<typeof legislatureForState>>,
  sponsorPersonId: string,
): LegislativeProcedureContext {
  const sponsor = world.people[sponsorPersonId]!;
  const bodies = pack.chambers.map((chamber, index) => {
    const size = seatsForChamber(pack, chamber.chamberKey)?.seats;
    if (!size) throw new Error(`No playable size for ${chamber.chamberKey}.`);
    return seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      size,
      index === 0 ? [{ personId: sponsor.id, name: personName(sponsor) }] : [],
      false,
    );
  });
  const votePlan: Record<string, { yea: number }> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find(
      (entry) => entry.chamberKey === chamber.chamberKey,
    )!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(body.members.length, committee.appointedMembers),
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  return {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale: "Controlled test signature on the fictional rule bill.",
  };
}

function enactMeasure(
  start: World,
  context: LegislativeProcedureContext,
): World {
  let world = start;
  for (let guard = 0; guard < 80; guard += 1) {
    if (
      !(world.history.legislativeMeasures ?? []).some(
        (measure) => measure.id === context.measureId,
      )
    )
      throw new Error(
        `The measure ${context.measureId} disappeared from ${context.pack.jurisdictionKey} at procedure step ${guard}.`,
      );
    const phase = measurePosition(world, context.measureId).phase;
    if (phase === "awaiting-enactment")
      return recordEnactment(world, {
        stableKey: `au2-wire-06:${context.measureId}:enacted`,
        measureId: context.measureId,
        effectiveAt: world.currentDate,
      });
    if (phase === "awaiting-executive") {
      world = recordExecutiveAction(world, {
        stableKey: `au2-wire-06:${context.measureId}:signed`,
        measureId: context.measureId,
        action: "signed",
        rationale: context.governorRationale,
      });
      continue;
    }
    const step = availableMeasureSteps(world, context.measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `No canonical next step at ${phase} for ${context.pack.packId}.`,
      );
    const result = applyLegislativeStep(context, world, step);
    if (result.world === world)
      throw new Error(
        `Fixture stopped at ${phase} (${step}): ${result.message}`,
      );
    world = result.world;
  }
  throw new Error(
    `The authored rule bill did not enact for ${context.pack.packId}; phase is ${measurePosition(world, context.measureId).phase}.`,
  );
}

function recordControlledEnactment(
  start: World,
  jurisdictionId: string,
  measureId: string,
  measureStableKey: string,
): { world: World; enactmentId: string } {
  const eventWorld = recordWorldEvent(start, {
    stableKey: `${measureStableKey}:enacted-event`,
    type: "legislation.measure-enacted",
    occurredAt: start.currentDate,
    recordedAt: start.currentDate,
    jurisdictionId,
    involvedEntityIds: [measureId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation.enacted", "fixture:territory-rule-boundary"],
    summary: "Controlled enactment activity for a territory reader fixture.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const enactment: LegislativeEnactmentRecord = {
    id: createStableId(
      "legislative-enactment",
      `${measureId}:${measureStableKey}:enactment`,
    ),
    stableKey: `${measureStableKey}:enactment`,
    sequence: eventWorld.history.nextSequence,
    measureId,
    resolvedAt: start.currentDate,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: start.currentDate,
    outcomeEventId: eventWorld.history.events.at(-1)!.id,
  };
  const world = {
    ...eventWorld,
    history: {
      ...eventWorld.history,
      nextSequence: eventWorld.history.nextSequence + 1,
      legislativeEnactments: [
        ...(eventWorld.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
  return { world, enactmentId: enactment.id };
}

function directTerritoryRuleFixture(
  start: World,
  usps: string,
  state: World["jurisdictions"][string],
  personId: string,
  question: string,
  minimumWageQuestion: string,
  rightsAnswers: readonly { propositionId: string; answer: LawAnswer }[],
  rightsSubjects: { voterId: string; retailerId: string },
  initialRightsAnswers: {
    votingAnswer: LawAnswer | null;
    carryAnswer: LawAnswer | null;
    cannabisAnswer: LawAnswer | null;
  },
  adoptedRights: {
    votingAnswer: LawAnswer;
    carryAnswer: LawAnswer;
    cannabisAnswer: LawAnswer;
  },
) {
  let world = start;
  const officeKey = `territory-legislature:${usps}`;
  const minimumWageOfficeKey = laborLawOfficeKey(usps);
  world = createOrganization(world, {
    stableKey: `au2-wire-06:${usps}:institution`,
    formedAt: DATE,
    provenance: {
      kind: "authored",
      note: "Controlled institution identity for jurisdictions without a registered legislative procedure pack.",
    },
    initialProfile: {
      name: `${usps} legislative body fixture`,
      classification: "sector:government",
      locationJurisdictionId: state.id,
    },
  });
  const organization = world.history.organizations.at(-1)!;
  const profile = organizationProfileAt(world, organization.id)!;
  for (const [suffix, office] of [
    ["term", officeKey],
    ["minimum-wage", minimumWageOfficeKey],
  ] as const)
    world = recordInstitutionOfficeBinding(world, {
      stableKey: `au2-wire-06:${usps}:${suffix}-office-binding`,
      officeKey: office,
      jurisdictionId: state.id,
      organizationId: organization.id,
      effectiveAt: DATE,
      supersedesBindingId: null,
      sourceRecordIds: [organization.id, profile.id, state.id],
    });

  function appendMeasure(
    stableKey: string,
    designation: string,
    shortTitle: string,
    summary: string,
    propositionIds: readonly string[],
    propositionAnswers: LegislativeMeasureRecord["propositionAnswers"],
  ): string {
    const id = createStableId(
      "legislative-measure",
      `${world.id}:${stableKey}`,
    );
    const measure: LegislativeMeasureRecord = {
      id,
      stableKey,
      sequence: world.history.nextSequence,
      jurisdictionId: state.id,
      rulePackId: `uncompiled-territory-law:${usps}`,
      designation,
      shortTitle,
      summary,
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: officeKey,
      sponsorPersonId: personId,
      introducedAt: world.currentDate,
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds,
      propositionAnswers,
    };
    world = {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.nextSequence + 1,
        legislativeMeasures: [
          ...(world.history.legislativeMeasures ?? []),
          measure,
        ],
      },
    };
    return id;
  }
  const rightsMeasureStableKey = `au2-wire-06:${usps}:controlled-rights-law`;
  const rightsMeasureId = appendMeasure(
    rightsMeasureStableKey,
    `${usps} controlled rights fixture law`,
    "Controlled rights policy",
    "A controlled final-rights reader fixture.",
    rightsAnswers.map((row) => row.propositionId),
    rightsAnswers,
  );
  const ruleMeasureStableKey = `au2-wire-06:${usps}:controlled-rule-change-law`;
  const ruleMeasureId = appendMeasure(
    ruleMeasureStableKey,
    `${usps} controlled rule-change fixture law`,
    "Controlled institution rule terms",
    "A controlled final-term reader fixture.",
    [question, minimumWageQuestion],
    [
      { propositionId: question, answer: "yes" },
      { propositionId: minimumWageQuestion, answer: "yes" },
    ],
  );
  const clauses: RuleChangeProvisionRecord[] = [
    {
      id: createStableId(
        "rule-change-provision",
        `${world.id}:${ruleMeasureStableKey}:term`,
      ),
      stableKey: `${ruleMeasureStableKey}:term`,
      sequence: world.history.nextSequence,
      measureId: ruleMeasureId,
      stateUsps: usps,
      officeKey,
      field: "term.years",
      value: 4,
      filedAt: DATE,
    },
    {
      id: createStableId(
        "rule-change-provision",
        `${world.id}:${ruleMeasureStableKey}:minimum-wage`,
      ),
      stableKey: `${ruleMeasureStableKey}:minimum-wage`,
      sequence: world.history.nextSequence + 1,
      measureId: ruleMeasureId,
      stateUsps: usps,
      officeKey: minimumWageOfficeKey,
      field: "labor.minimumWage.hourlyCents",
      value: 1500,
      filedAt: DATE,
    },
  ];
  world = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + clauses.length,
      ruleChangeProvisions: [
        ...(world.history.ruleChangeProvisions ?? []),
        ...clauses,
      ],
    },
  };
  world = recordFiledProvision(world, {
    stableKey: `${ruleMeasureStableKey}:final-terms`,
    measureId: ruleMeasureId,
    provisionKey: "controlled-institution-terms",
    sectionNumber: 1,
    heading: "Legislative terms",
    text: "The controlled fixture sets legislative terms to four years and the hourly minimum to 1,500 cents.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "the recorded legislative body and labor office",
    },
    applicationScope: { jurisdictionId: state.id, segmentKey: null },
    lawTerms: [
      {
        questionKey: QUESTION_KEY,
        key: "term.years",
        value: 4,
        unit: "years",
      },
      {
        questionKey: MINIMUM_WAGE_QUESTION_KEY,
        key: "labor.minimumWage.hourlyCents",
        value: 1500,
        unit: "minor/hour",
      },
    ],
  });
  const rightsEnactment = recordControlledEnactment(
    world,
    state.id,
    rightsMeasureId,
    rightsMeasureStableKey,
  );
  const ruleEnactment = recordControlledEnactment(
    rightsEnactment.world,
    state.id,
    ruleMeasureId,
    ruleMeasureStableKey,
  );
  return {
    world: ruleEnactment.world,
    state,
    officeKey,
    minimumWageOfficeKey,
    question,
    minimumWageQuestion,
    rightsMeasureId,
    ruleMeasureId,
    rightsEnactmentId: rightsEnactment.enactmentId,
    ruleEnactmentId: ruleEnactment.enactmentId,
    directFixture: true,
    initialRightsAnswers,
    ...rightsSubjects,
    ...adoptedRights,
  };
}

function fixture(usps: string) {
  const seed = `au2-wire-06-institution:${usps}`;
  const generated = smallWorld({
    place: usps,
    date: DATE,
    people: 3,
    seed,
  });
  const state = generated.world.jurisdictions[generated.stateJurisdictionId]!;
  let world: World = {
    ...generated.world,
    policyCatalog: createProductionPolicyCatalog(),
  };
  const rightsSubjects = addRightsSubjects(world, usps, state);
  world = rightsSubjects.world;
  const question = questionId(world);
  const minimumWageQuestion = world.policyCatalog.propositionOrder.find(
    (id) =>
      world.policyCatalog.propositions[id]!.stableKey ===
      MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const rightsAnswers = [
    RESTORE_VOTING_QUESTION_KEY,
    CONCEALED_CARRY_QUESTION_KEY,
    CANNABIS_QUESTION_KEY,
  ].map((stableKey) => {
    const propositionId = questionIdFor(world, stableKey);
    return {
      propositionId,
      answer: answerOppositeToStartingLaw(world, state.id, propositionId),
    };
  });
  const rightsAnswer = (stableKey: string) =>
    rightsAnswers.find(
      (row) =>
        world.policyCatalog.propositions[row.propositionId]!.stableKey ===
        stableKey,
    )!.answer;
  const votingAnswer = rightsAnswer(RESTORE_VOTING_QUESTION_KEY);
  const carryAnswer = rightsAnswer(CONCEALED_CARRY_QUESTION_KEY);
  const cannabisAnswer = rightsAnswer(CANNABIS_QUESTION_KEY);
  const initialRightsAnswers = {
    votingAnswer:
      lawInForce(
        world,
        state.id,
        questionIdFor(world, RESTORE_VOTING_QUESTION_KEY),
        DATE,
      )?.answer ?? null,
    carryAnswer:
      lawInForce(
        world,
        state.id,
        questionIdFor(world, CONCEALED_CARRY_QUESTION_KEY),
        DATE,
      )?.answer ?? null,
    cannabisAnswer:
      lawInForce(
        world,
        state.id,
        questionIdFor(world, CANNABIS_QUESTION_KEY),
        DATE,
      )?.answer ?? null,
  };
  const pack =
    legislativePackForJurisdiction(state.id) ??
    legislatureForState(`US-${usps}`);
  if (!pack)
    return directTerritoryRuleFixture(
      world,
      usps,
      state,
      generated.personId,
      question,
      minimumWageQuestion,
      rightsAnswers,
      {
        voterId: rightsSubjects.voterId,
        retailerId: rightsSubjects.retailerId,
      },
      initialRightsAnswers,
      { votingAnswer, carryAnswer, cannabisAnswer },
    );
  const chamber = pack.chambers[0]!;
  const officeKey = `${pack.packId}:${chamber.chamberKey}`;
  const minimumWageOfficeKey = laborLawOfficeKey(usps);
  world = createOrganization(world, {
    stableKey: `au2-wire-06:${usps}:institution`,
    formedAt: DATE,
    provenance: {
      kind: "authored",
      note: "Controlled body identity for the all-jurisdictions rule reader proof.",
    },
    initialProfile: {
      name: `${usps} legislative body fixture`,
      classification: "sector:government",
      locationJurisdictionId: state.id,
    },
  });
  const organization = world.history.organizations.at(-1)!;
  const profile = organizationProfileAt(world, organization.id)!;
  world = recordInstitutionOfficeBinding(world, {
    stableKey: `au2-wire-06:${usps}:office-binding`,
    officeKey,
    jurisdictionId: state.id,
    organizationId: organization.id,
    effectiveAt: DATE,
    supersedesBindingId: null,
    sourceRecordIds: [organization.id, profile.id, state.id],
  });
  world = recordInstitutionOfficeBinding(world, {
    stableKey: `au2-wire-06:${usps}:minimum-wage-office-binding`,
    officeKey: minimumWageOfficeKey,
    jurisdictionId: state.id,
    organizationId: organization.id,
    effectiveAt: DATE,
    supersedesBindingId: null,
    sourceRecordIds: [organization.id, profile.id, state.id],
  });
  world = introduceMeasure(world, {
    stableKey: `au2-wire-06:${usps}:rights-bill`,
    jurisdictionId: state.id,
    rulePackId: pack.packId,
    designation: `${usps} fictional rights bill`,
    shortTitle: "Controlled rights policy",
    summary: "Authored all-jurisdictions permission fixture.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: generated.personId,
    originChamberKey: chamber.chamberKey,
    propositionIds: rightsAnswers.map((row) => row.propositionId),
    propositionAnswers: rightsAnswers,
  });
  const rightsMeasureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = introduceMeasure(world, {
    stableKey: `au2-wire-06:${usps}:rule-change-bill`,
    jurisdictionId: state.id,
    rulePackId: pack.packId,
    designation: `${usps} fictional term bill`,
    shortTitle: "Controlled legislative term rule",
    summary: "Authored all-jurisdictions rule application fixture.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: generated.personId,
    originChamberKey: chamber.chamberKey,
    propositionIds: [question, minimumWageQuestion],
    propositionAnswers: [
      { propositionId: question, answer: "yes" },
      { propositionId: minimumWageQuestion, answer: "yes" },
    ],
  });
  const ruleMeasureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = fileRuleChangeProvision(world, {
    stableKey: `au2-wire-06:${usps}:rule-clause`,
    measureId: ruleMeasureId,
    officeKey,
    field: "term.years",
    value: 4,
  });
  world = fileRuleChangeProvision(world, {
    stableKey: `au2-wire-06:${usps}:minimum-wage-rule-clause`,
    measureId: ruleMeasureId,
    officeKey: minimumWageOfficeKey,
    field: "labor.minimumWage.hourlyCents",
    value: 1500,
  });
  world = recordFiledProvision(world, {
    stableKey: `au2-wire-06:${usps}:final-terms`,
    measureId: ruleMeasureId,
    provisionKey: "legislative-term-years",
    sectionNumber: 1,
    heading: "Legislative term length",
    text: "The term for this controlled fixture is four years.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "the recorded legislative body",
    },
    applicationScope: { jurisdictionId: state.id, segmentKey: null },
    lawTerms: [
      {
        questionKey: QUESTION_KEY,
        key: "term.years",
        value: 4,
        unit: "years",
      },
      {
        questionKey: MINIMUM_WAGE_QUESTION_KEY,
        key: "labor.minimumWage.hourlyCents",
        value: 1500,
        unit: "minor/hour",
      },
    ],
  });
  if (
    !(world.history.legislativeMeasures ?? []).some(
      (measure) => measure.id === ruleMeasureId,
    )
  )
    throw new Error(
      `The rule measure ${ruleMeasureId} disappeared while filing final terms for US-${usps}.`,
    );
  const rightsContext = voteContext(
    world,
    rightsMeasureId,
    pack,
    generated.personId,
  );
  const ruleContext = voteContext(
    world,
    ruleMeasureId,
    pack,
    generated.personId,
  );
  if (
    rightsContext.measureId !== rightsMeasureId ||
    ruleContext.measureId !== ruleMeasureId
  )
    throw new Error(
      `A procedure context changed its measure ID for US-${usps}.`,
    );
  return {
    world,
    state,
    pack,
    officeKey,
    question,
    minimumWageQuestion,
    rightsMeasureId,
    ruleMeasureId,
    minimumWageOfficeKey,
    rightsContext,
    ruleContext,
    directFixture: false,
    initialRightsAnswers,
    voterId: rightsSubjects.voterId,
    retailerId: rightsSubjects.retailerId,
    votingAnswer,
    carryAnswer,
    cannabisAnswer,
  };
}

describe("shared institution-rule readers and all-place rule data", () => {
  it("has all 56 state and territory keys", () => {
    expect(Object.keys(STATES)).toHaveLength(56);
  });

  it.each(Object.keys(STATES).sort())(
    "maps institution rule data for US-%s",
    (usps) => {
      const state = stateJurisdictionForKey(`US-${usps}`);
      expect(state, usps).not.toBeNull();
      expect(state?.name, usps).toBe(STATES[usps]!.name);
      expect(laborLawOfficeKey(usps), usps).toBe(
        `us-${usps.toLowerCase()}-labor-law`,
      );
    },
  );

  it("applies final bill answers and typed terms in one seeded place", () => {
    const usps = "CA";
    const f = fixture(usps);
    const subjectIds = [
      ...f.world.personOrder,
      ...f.world.history.organizations.map((row) => row.id),
    ];
    const rightsApplied = f.directFixture
      ? applyLawConsequences(f.world, {
          onDate: f.world.currentDate,
          activity: "effective",
          activityId: f.rightsEnactmentId,
          subjectIds,
          governingLawId: f.rightsMeasureId,
        })
      : applyEnactedLawEffects(
          enactMeasure(f.world, f.rightsContext),
          f.rightsMeasureId,
        );
    const applied = f.directFixture
      ? applyLawConsequences(rightsApplied, {
          onDate: rightsApplied.currentDate,
          activity: "effective",
          activityId: f.ruleEnactmentId,
          subjectIds,
          governingLawId: f.ruleMeasureId,
        })
      : applyEnactedLawEffects(
          enactMeasure(rightsApplied, f.ruleContext),
          f.ruleMeasureId,
        );
    const effectiveDate = applied.currentDate;
    const votingQuestion = questionIdFor(applied, RESTORE_VOTING_QUESTION_KEY);
    const votingLaw = lawInForce(
      applied,
      f.state.id,
      votingQuestion,
      applied.currentDate,
    );
    expect(votingLaw, usps).toMatchObject({
      origin: "enacted",
      measureId: f.rightsMeasureId,
      answer: f.votingAnswer,
    });
    expect(f.votingAnswer, usps).not.toBe(f.initialRightsAnswers.votingAnswer);
    expect(f.carryAnswer, usps).not.toBe(f.initialRightsAnswers.carryAnswer);
    expect(f.cannabisAnswer, usps).not.toBe(
      f.initialRightsAnswers.cannabisAnswer,
    );
    expect(
      latestLawPermission(
        applied,
        { kind: "person", id: f.voterId },
        RESTORE_VOTING_QUESTION_KEY,
      ),
      usps,
    ).toMatchObject({
      status: f.votingAnswer === "yes" ? "permitted" : "prohibited",
      lawEffectStamps: [
        expect.objectContaining({
          effectKind: "right-permission",
          questionKey: RESTORE_VOTING_QUESTION_KEY,
          jurisdictionId: f.state.id,
          governingLawKey: f.rightsMeasureId,
        }),
      ],
    });
    expect(sentencesOf(applied, f.voterId), usps).toHaveLength(1);
    expect(
      votingStandingOn(applied, f.voterId, effectiveDate).standing,
      usps,
    ).toBe(f.votingAnswer === "yes" ? "restored" : "withheld-after-sentence");
    expect(
      isEligibleVoterIn(applied, f.voterId, f.state.id, effectiveDate),
      usps,
    ).toBe(f.votingAnswer === "yes");

    const cannabisQuestion = questionIdFor(applied, CANNABIS_QUESTION_KEY);
    const cannabisLaw = lawInForce(
      applied,
      f.state.id,
      cannabisQuestion,
      applied.currentDate,
    );
    expect(cannabisLaw, usps).toMatchObject({
      origin: "enacted",
      measureId: f.rightsMeasureId,
      answer: f.cannabisAnswer,
    });
    expect(
      latestLawPermission(
        applied,
        { kind: "organization", id: f.retailerId },
        CANNABIS_QUESTION_KEY,
      ),
      usps,
    ).toMatchObject({
      status: f.cannabisAnswer === "yes" ? "permitted" : "prohibited",
      lawEffectStamps: [
        expect.objectContaining({ effectKind: "right-permission" }),
      ],
    });
    expect(
      townBusinesses(applied, f.state.id).find(
        (business) => business.organizationId === f.retailerId,
      )?.cannabisSalesLicensed,
      usps,
    ).toBe(f.cannabisAnswer === "yes");

    const retailOpening = applyLawConsequences(applied, {
      onDate: applied.currentDate,
      activity: "application",
      activityId: f.retailerId,
      subjectIds: [f.retailerId],
      questionKey: CANNABIS_QUESTION_KEY,
      governingLawId: f.rightsMeasureId,
    });
    expect(
      latestLawPermission(
        retailOpening,
        { kind: "organization", id: f.retailerId },
        CANNABIS_QUESTION_KEY,
      ),
      usps,
    ).toMatchObject({
      status: f.cannabisAnswer === "yes" ? "permitted" : "prohibited",
    });

    const carryApplication = recordWorldEvent(applied, {
      stableKey: `au2-wire-06:${usps}:concealed-carry-application`,
      type: "fixture.concealed-carry-application",
      occurredAt: effectiveDate,
      recordedAt: effectiveDate,
      jurisdictionId: f.state.id,
      involvedEntityIds: [f.voterId],
      participants: [
        { personId: f.voterId, role: "agency:actor", detail: null },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["fixture:concealed-carry-application"],
      summary: "Controlled concealed-carry application activity.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const carryApplied = applyLawConsequences(carryApplication, {
      onDate: effectiveDate,
      activity: "application",
      activityId: carryApplication.history.events.at(-1)!.id,
      subjectIds: [f.voterId],
      questionKey: CONCEALED_CARRY_QUESTION_KEY,
      governingLawId: f.rightsMeasureId,
    });
    expect(
      latestLawPermission(
        carryApplied,
        { kind: "person", id: f.voterId },
        CONCEALED_CARRY_QUESTION_KEY,
      ),
      usps,
    ).toMatchObject({
      status: f.carryAnswer === "yes" ? "permitted" : "prohibited",
      lawEffectStamps: [
        expect.objectContaining({
          effectKind: "right-permission",
          questionKey: CONCEALED_CARRY_QUESTION_KEY,
          jurisdictionId: f.state.id,
          governingLawKey: f.rightsMeasureId,
        }),
      ],
    });
    expect(
      concealedCarryPermitRuleAt(
        carryApplied,
        f.voterId,
        f.state.id,
        effectiveDate,
      ),
      usps,
    ).toBe(f.carryAnswer === "yes" ? "permitted" : "prohibited");
    const law = lawInForce(
      applied,
      f.state.id,
      f.question,
      applied.currentDate,
    );
    expect(law, usps).toMatchObject({
      origin: "enacted",
      measureId: f.ruleMeasureId,
      answer: "yes",
    });
    expect(
      readFinalEnactedLawTerm(applied, law!, {
        questionKey: QUESTION_KEY,
        termKey: "term.years",
        unit: "years",
        onDate: applied.currentDate,
      }),
      usps,
    ).toMatchObject({
      value: 4,
      unit: "years",
      measureId: f.ruleMeasureId,
    });
    expect(
      enactedRuleChangeAt(applied, {
        stateUsps: usps,
        officeKey: f.officeKey,
        field: "term.years",
        onDate: applied.currentDate,
      })?.value,
      usps,
    ).toBe(4);
    const minimumWageLaw = lawInForce(
      applied,
      f.state.id,
      f.minimumWageQuestion,
      applied.currentDate,
    );
    expect(minimumWageLaw, usps).toMatchObject({
      origin: "enacted",
      measureId: f.ruleMeasureId,
      answer: "yes",
    });
    expect(
      readFinalEnactedLawTerm(applied, minimumWageLaw!, {
        questionKey: MINIMUM_WAGE_QUESTION_KEY,
        termKey: "labor.minimumWage.hourlyCents",
        unit: "minor/hour",
        onDate: applied.currentDate,
      }),
      usps,
    ).toMatchObject({
      value: 1500,
      unit: "minor/hour",
      measureId: f.ruleMeasureId,
    });
    expect(
      enactedRuleChangeAt(applied, {
        stateUsps: usps,
        officeKey: f.minimumWageOfficeKey,
        field: "labor.minimumWage.hourlyCents",
        onDate: applied.currentDate,
      })?.value,
      usps,
    ).toBe(1500);
    const bindings = applied.history.ruleChangeConsequenceBindings!.filter(
      (record) =>
        record.kind === "law-application" &&
        record.measureId === f.ruleMeasureId,
    );
    expect(bindings, usps).toHaveLength(2);
    expect(bindings, usps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          officeKey: f.officeKey,
          bodyOrganizationId: expect.any(String),
          rowId: "institution-rule:legislative-term-years",
          lawEffectStamps: [
            expect.objectContaining({
              effectKind: "institution-rule",
              questionKey: QUESTION_KEY,
              jurisdictionId: f.state.id,
            }),
          ],
        }),
        expect.objectContaining({
          officeKey: f.minimumWageOfficeKey,
          bodyOrganizationId: expect.any(String),
          rowId: "institution-rule:state-minimum-wage",
          lawEffectStamps: [
            expect.objectContaining({
              effectKind: "institution-rule",
              questionKey: MINIMUM_WAGE_QUESTION_KEY,
              jurisdictionId: f.state.id,
            }),
          ],
        }),
      ]),
    );
    if (!f.directFixture) assertWorldIntegrity(carryApplied);
  });
});
